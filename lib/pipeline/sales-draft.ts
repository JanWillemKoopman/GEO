import "server-only";

/**
 * Stap 13: de conceptmail en de gespreksvoorbereiding
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 16)
 *
 * ── DE APP ZET KLAAR, DE MENS VERSTUURT ─────────────────────────────────────
 *
 * Plan 16.3, en het is een vaste regel: er staat in dit bestand geen regel die
 * een verbinding maakt met een mailserver, en die komt er ook niet. Wat hier
 * gebeurt is één ding: een concept schrijven dat de medewerker leest, aanpast en
 * zelf verstuurt vanuit zijn eigen mailbox.
 *
 * ── EN ELKE ZIN WORDT GECONTROLEERD ─────────────────────────────────────────
 *
 * De mail én de gespreksvoorbereiding gaan door dezelfde getallencontrole als de
 * haak (`lib/sales/mail.ts`). Klopt een getal niet, dan valt het alternatief in;
 * klopt dat ook niet, dan komt er een sjabloonconcept te staan dat saai is en
 * waar. Een verkoper die een verzonnen cijfer voorleest, staat er net zo hard
 * naast als wanneer het in de mail stond.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { SalesOutreachDraft } from "@/lib/schemas/sales";
import { beoordeelBudget, besteedAanMarkt } from "@/lib/sales/budget";
import {
  bouwMailVraag,
  controleerConcept,
  controleerVoorbereiding,
  sjabloonConcept,
  type Gespreksvoorbereiding,
  type MailConcept,
} from "@/lib/sales/mail";
import { beoordeelPlafond, type DagCijfers } from "@/lib/sales/workflow";
import type { Kans } from "@/lib/sales/opportunity";

type Admin = SupabaseClient;

export interface ConceptUitkomst {
  skipped: boolean;
  melding: string | null;
  /** Kwam het bericht uit het model of uit het sjabloon? */
  bron: "model" | "sjabloon" | null;
}

export async function schrijfConcept(admin: Admin, outreachId: string): Promise<ConceptUitkomst> {
  const { data } = await admin
    .from("sales_outreach")
    .select(
      "id, company_id, opportunity_id, market_id, owner_user_id, body_draft, " +
        "sales_companies(name), sales_markets(label, slug, is_public), " +
        "sales_opportunities(type, evidence, hook_text)",
    )
    .eq("id", outreachId)
    .maybeSingle();

  type Rij = {
    id: string;
    company_id: string;
    opportunity_id: string | null;
    market_id: string | null;
    owner_user_id: string | null;
    body_draft: string | null;
    sales_companies: { name: string } | null;
    sales_markets: { label: string; slug: string; is_public: boolean } | null;
    sales_opportunities: {
      type: string;
      evidence: { cijfers?: Record<string, number>; vragen?: string[]; antwoorden?: string[] } | null;
      hook_text: string | null;
    } | null;
  };

  const rij = data as unknown as Rij | null;
  if (!rij) throw new Error(`Outreach ${outreachId} bestaat niet.`);
  if (rij.body_draft) {
    return { skipped: true, melding: "Het concept stond er al.", bron: null };
  }
  if (!rij.sales_opportunities || !rij.market_id) {
    throw new Error(`Outreach ${outreachId} hangt niet aan een kans.`);
  }

  // ── Het verzendplafond, en het remt de AANVOER ───────────────────────────
  //
  // Plan 16.6: omdat de medewerker zelf verstuurt kan de app het versturen niet
  // tegenhouden, maar wel het klaarzetten. Boven het plafond komt er geen
  // concept en staat erbij waarom.
  if (rij.owner_user_id) {
    const cijfers = await cijfersVanVandaag(admin, rij.owner_user_id);
    const plafond = beoordeelPlafond(cijfers);
    if (!plafond.ok) return { skipped: true, melding: plafond.melding, bron: null };
  }

  const oordeel = beoordeelBudget(await besteedAanMarkt(admin, rij.market_id), "draft");
  if (!oordeel.ok) return { skipped: true, melding: oordeel.melding, bron: null };

  const kans: Kans = {
    type: rij.sales_opportunities.type as Kans["type"],
    vragen: rij.sales_opportunities.evidence?.vragen ?? [],
    antwoorden: rij.sales_opportunities.evidence?.antwoorden ?? [],
    cijfers: rij.sales_opportunities.evidence?.cijfers ?? {},
  };

  const bedrijf = rij.sales_companies?.name ?? "dit bedrijf";
  const markt = rij.sales_markets?.label ?? "deze markt";
  const haak = rij.sales_opportunities.hook_text ?? "";
  const afzender = await afzenderNaam(admin, rij.owner_user_id);

  // De publieke link gaat alleen mee als de markt daadwerkelijk gepubliceerd is
  // (plan 16.2, punt 3). Een link naar een pagina die nog niet bestaat is de
  // snelste manier om het vertrouwen kwijt te raken dat de mail net won.
  const publiekeLink =
    rij.sales_markets?.is_public && rij.sales_markets.slug
      ? `orbitengine.nl/markt/${rij.sales_markets.slug}`
      : null;

  const r = await callStructured({
    model: MODELS.quality,
    system:
      "Je schrijft de openingsmail van een verkoper aan een ondernemer, op basis van een meting. " +
      "Je gebruikt uitsluitend de cijfers die je krijgt en verzint er nooit één bij. Je legt niets " +
      "uit over AI of over ons bedrijf: de mail gaat over hen. Antwoord in het Nederlands.",
    user: bouwMailVraag(kans, bedrijf, markt, haak, afzender, publiekeLink),
    schema: SalesOutreachDraft,
    schemaName: "sales_outreach_draft",
    webSearch: false,
    work: "analytical",
    meta: { kind: "sales_outreach_draft", salesMarketId: rij.market_id },
  });

  // ── De controle, en de terugval ──────────────────────────────────────────
  const kandidaten: MailConcept[] = [
    { onderwerp: r.parsed.onderwerp, tekst: r.parsed.bericht },
    { onderwerp: r.parsed.onderwerp, tekst: r.parsed.alternatief_bericht },
  ];

  let concept: MailConcept | null = null;
  for (const kandidaat of kandidaten) {
    if (controleerConcept(kandidaat, kans).ok) {
      concept = kandidaat;
      break;
    }
  }
  const bron: "model" | "sjabloon" = concept ? "model" : "sjabloon";
  if (!concept) concept = sjabloonConcept(kans, bedrijf, markt, haak, afzender);

  // De voorbereiding gaat door dezelfde controle. Haalt hij hem niet, dan wordt
  // hij niet opgeslagen: een halve voorbereiding met één fout cijfer erin is
  // erger dan geen voorbereiding, want de verkoper leest hem voor.
  const prep: Gespreksvoorbereiding = {
    cijfers: r.parsed.cijfers ?? [],
    openingen: r.parsed.openingen ?? [],
    bezwaren: r.parsed.bezwaren ?? [],
    nietZeggen: r.parsed.niet_zeggen ?? [],
  };
  const prepOordeel = controleerVoorbereiding(prep, kans);

  await admin
    .from("sales_outreach")
    .update({
      subject: concept.onderwerp,
      body_draft: concept.tekst,
      call_prep: prepOordeel.ok ? (prep as unknown as Record<string, unknown>) : null,
      notes: prepOordeel.ok
        ? null
        : `De gespreksvoorbereiding is niet opgeslagen: ${prepOordeel.bezwaren.join(" ")}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", outreachId);

  return { skipped: false, melding: null, bron };
}

/** Wat er vandaag al uit is gegaan bij deze medewerker. */
async function cijfersVanVandaag(admin: Admin, userId: string): Promise<DagCijfers> {
  const vandaag = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("sales_send_stats")
    .select("verstuurd, bounces, klachten, afmeldingen")
    .eq("user_id", userId)
    .eq("dag", vandaag)
    .maybeSingle();

  return {
    verstuurd: Number(data?.verstuurd ?? 0),
    bounces: Number(data?.bounces ?? 0),
    klachten: Number(data?.klachten ?? 0),
    afmeldingen: Number(data?.afmeldingen ?? 0),
  };
}

/**
 * De naam waarmee de mail ondertekend wordt.
 *
 * ⚠️ Het mailadres van de medewerker is het enige wat we hebben; een echte naam
 * staat nergens in de app. Er wordt daarom geen naam verzonnen: er staat wat we
 * weten, en de verkoper vult zijn eigen naam in voordat hij verstuurt. Dat is
 * conventie 3 in zijn kleinste vorm, en het scheelt een mail die ondertekend is
 * met een verkeerde naam.
 */
async function afzenderNaam(admin: Admin, userId: string | null): Promise<string> {
  if (!userId) return "[jouw naam]";
  const { data } = await admin.auth.admin.getUserById(userId);
  const email = data?.user?.email ?? "";
  return email ? `[jouw naam] (${email})` : "[jouw naam]";
}
