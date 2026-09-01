import "server-only";

/**
 * Stap 12: wie mailen we bij dit bedrijf?
 * (`docs/tasks/geo-prospect-engine.md` 9.4 en §8.2b)
 *
 * ── DEZE STAP DRAAIT PAS BIJ TOEWIJZING, EN DAT IS EEN ONTWERPKEUZE ─────────
 *
 * Plan §8.2b: "Voor dertig bedrijven een contactpersoon uitzoeken terwijl er
 * acht benaderd worden, is werk en geld dat niemand gebruikt." Daarmee is de
 * opportunitydetectie goedkoop en is de outreach precies zo duur als het aantal
 * gesprekken dat je echt voert.
 *
 * ── EN WAT ER GEBEURT ALS ER NIEMAND GEVONDEN WORDT ─────────────────────────
 *
 * Dan blijft het leeg, en dat is zichtbaar. Plan 9.4, regel 2: "Liever geen
 * contact dan de verkeerde." Er wordt niet stiekem naar `info@` gemaild en er
 * wordt geen adres gegokt dat er niet is. De kans komt op een lijst voor
 * handwerk, en de verkoper zoekt zelf iemand op of belt gewoon.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { SalesContactFinding } from "@/lib/schemas/sales";
import { beoordeelBudget, besteedAanMarkt } from "@/lib/sales/budget";
import {
  rolPast,
  magOntvangerZijn,
  bouwContactVraag,
  type Contactpersoon,
} from "@/lib/sales/contact";

type Admin = SupabaseClient;

export interface ContactUitkomst {
  gevonden: number;
  /** Is er iemand die daadwerkelijk gemaild mag worden? */
  bruikbaar: boolean;
  melding: string | null;
  skipped: boolean;
}

export async function zoekContact(
  admin: Admin,
  marketId: string,
  companyId: string,
  /** De outreach waar de gevonden persoon aan gehangen wordt, als die er is. */
  outreachId: string | null = null,
): Promise<ContactUitkomst> {
  const { data: bedrijf } = await admin
    .from("sales_companies")
    .select("id, name, domain, city, crawl_summary")
    .eq("id", companyId)
    .maybeSingle();
  if (!bedrijf) throw new Error(`Bedrijf ${companyId} bestaat niet.`);

  // Idempotent (conventie 9): staat er al iemand, dan is deze stap gedaan.
  const { count } = await admin
    .from("sales_contacts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  if ((count ?? 0) > 0) {
    return { gevonden: 0, bruikbaar: true, melding: "Er stond al een contactpersoon.", skipped: true };
  }

  const oordeel = beoordeelBudget(await besteedAanMarkt(admin, marketId), "contact");
  if (!oordeel.ok) return { gevonden: 0, bruikbaar: false, melding: oordeel.melding, skipped: true };

  const r = await callStructured({
    model: MODELS.quality,
    system:
      "Je zoekt op wie er bij een bedrijf over de commercie gaat. Je noemt alleen mensen die je " +
      "echt op een pagina hebt gevonden, met de vindplaats erbij. Je verzint nooit een naam en " +
      "nooit een mailadres: een leeg veld is bruikbaar, een verzonnen veld niet. " +
      "Antwoord in het Nederlands.",
    user: bouwContactVraag({
      naam: bedrijf.name as string,
      domein: (bedrijf.domain as string | null) ?? null,
      plaats: (bedrijf.city as string | null) ?? null,
    }),
    schema: SalesContactFinding,
    schemaName: "sales_contact_finding",
    webSearch: true,
    work: "analytical",
    meta: { kind: "sales_contact_find", salesMarketId: marketId },
  });

  // ⚠️ HET VANGNET (conventie 1). Het model levert wat het vond; deze regels
  // bepalen wie er in de tabel komt en met welk etiket.
  const kandidaten: Contactpersoon[] = r.parsed.personen
    .filter((p) => (p.naam ?? "").trim().length > 2)
    .map((p) => ({
      naam: p.naam.trim(),
      rol: p.rol?.trim() || null,
      email: schoonAdres(p.email, bedrijf.domain as string | null),
      // Wat het model levert heet `gevonden`: het beweert het op een pagina
      // gezien te hebben. Afleiden doen wij zelf, elders, en dan zetten wij het
      // etiket. Zou het model zelf mogen zeggen dat een adres "gevonden" is
      // terwijl het geraden is, dan is het onderscheid waardeloos.
      //
      // ⚠️ MET ÉÉN UITZONDERING: bij een bedrijf ZONDER bekend webadres is er
      // niets om het adres tegen af te zetten. Dan kan het net zo goed het adres
      // van een vergelijkingssite of een branchevereniging zijn. Zo'n adres
      // krijgt daarom het etiket `afgeleid` en gaat pas de deur uit nadat een
      // mens hem bevestigd heeft (plan 9.4, regel 1). Dat is precies de prospect
      // die deze module zoekt, dus hem weggooien zou het verkeerde zijn.
      emailKind: bedrijf.domain ? ("gevonden" as const) : ("afgeleid" as const),
      telefoon: p.telefoon?.trim() || null,
      bron: /^https?:\/\//i.test((p.bron_url ?? "").trim()) ? p.bron_url.trim() : null,
      // Zonder vindplaats is het een gerucht, en dat zegt de zekerheid.
      zekerheid: (p.bron_url ?? "").trim() ? ("middel" as const) : ("laag" as const),
    }))
    // Regel 3: de juiste rol. Wie niet past, komt er niet in: hij zou anders bij
    // gebrek aan beter alsnog de ontvanger worden.
    .filter((p) => rolPast(p.rol));

  if (kandidaten.length === 0) {
    return {
      gevonden: 0,
      bruikbaar: false,
      skipped: false,
      melding:
        "Er is niemand gevonden die over de commercie gaat. Zoek zelf iemand op, of bel het " +
        "bedrijf: ORBIT ENGINE mailt niet naar een algemeen adres en gokt geen naam.",
    };
  }

  const { data: opgeslagen, error } = await admin
    .from("sales_contacts")
    .insert(
      kandidaten.map((p) => ({
        company_id: companyId,
        name: p.naam,
        role: p.rol,
        email: p.email,
        email_kind: p.emailKind,
        phone: p.telefoon,
        source_url: p.bron,
        confidence: p.zekerheid,
      })),
    )
    .select("id, name, role, email, email_kind");
  if (error) throw new Error(`Opslaan van de contactpersonen mislukt: ${error.message}`);

  const bruikbaar = kandidaten.some((p) => magOntvangerZijn(p, bedrijf.name as string).ok);

  // ⚠️ DE GEVONDEN PERSOON WORDT AAN DE OUTREACH GEHANGEN (1 september 2026).
  //
  // Zonder deze regel bleef `contact_id` leeg, ook als er iemand gevonden was,
  // en begon de conceptmail met "Beste,". Dat is precies de mail die deze hele
  // module niet wil zijn: plan 9.4 opent met "de hele module draait om een
  // persoonlijk eerste contact, en een mail aan info@ is dat niet".
  //
  // Alleen wie de controle van `magOntvangerZijn()` haalt, komt hier terecht.
  // Iemand die hem niet haalt, blijft wel staan op het dossier (met de reden
  // erbij), want om te bellen is hij prima.
  const rijen = (opgeslagen ?? []) as {
    id: string;
    name: string;
    role: string | null;
    email: string | null;
    email_kind: string | null;
  }[];
  const ontvanger = rijen.find(
    (r) =>
      magOntvangerZijn(
        {
          naam: r.name,
          rol: r.role,
          email: r.email,
          emailKind: (r.email_kind as "gevonden" | "afgeleid") ?? "afgeleid",
          zekerheid: "middel" as const,
          verifiedAt: null,
        },
        bedrijf.name as string,
      ).ok,
  );
  if (ontvanger && outreachId) {
    await admin.from("sales_outreach").update({ contact_id: ontvanger.id }).eq("id", outreachId);
  }

  return {
    gevonden: kandidaten.length,
    bruikbaar,
    skipped: false,
    melding: bruikbaar
      ? null
      : "Er staat wel iemand, maar zonder bruikbaar mailadres. Vul er zelf een in of bel.",
  };
}

/**
 * Een adres opschonen, of `null`.
 *
 * ⚠️ Een adres op een ander domein dan het bedrijf wordt geweigerd. Dat is
 * precies het geval waarin een model het adres van de webbouwer, de
 * brancheverenging of een vergelijkingssite oppikt, en dan gaat de openingsmail
 * naar iemand die niets met dit bedrijf te maken heeft.
 */
function schoonAdres(ruw: string | undefined, domein: string | null): string | null {
  const email = (ruw ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)) return null;
  if (!domein) return email;
  const host = domein.toLowerCase().replace(/^www\./, "");
  return email.endsWith(`@${host}`) ? email : null;
}
