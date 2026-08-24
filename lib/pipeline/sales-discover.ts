import "server-only";

/**
 * Stap 1: welke bedrijven vormen deze markt?
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 9)
 *
 * ── DIT IS DE STAP WAAR HET OUDE PLAN HET ZWAKST WAS ────────────────────────
 *
 * "Als we alleen de bedrijven verzamelen die ChatGPT en Gemini noemen, missen we
 * precies de bedrijven met het grootste GEO-probleem. Het systeem zou dan per
 * definitie blind zijn voor zijn eigen beste prospects."
 *
 * Vandaar dat deze stap NIET vraagt wie er aanbevolen wordt. Hij vraagt wie er
 * bestaat. Dat is een ander soort vraag, met een ander soort bron: ledenlijsten,
 * gemeentegidsen, vergelijkingssites. Het verschil met de meting uit sprint 3 is
 * het hele punt van de module.
 *
 * ── ÉÉN ZWARE AANROEP, EN DE OPBRENGST IS TWEEDELIG ────────────────────────
 *
 * Conventie 7: één taak is hooguit één zware AI-aanroep. Die ene aanroep levert
 * bedrijven op én de bronpagina's waar ze vandaan komen. Dat tweede is het
 * waardevolst: `sales-verify.ts` leest die pagina's daarna gratis uit met de
 * eigen crawler, en dát is de bron die niet door een model heen is gegaan.
 *
 * ⚠️ **Twee gratis bronnen, niet vier** (besluit 24 augustus 2026). Het
 * kaartenregister en het handelsregister uit 9.1 kosten geld per opvraging en
 * staan nog uit. Wat we vandaag missen: een bedrijf dat op geen enkele lijst
 * staat én geen website heeft. Dat staat als kanttekening bij poort 1 en wordt
 * niet weggemoffeld.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { SalesMarketDiscovery } from "@/lib/schemas/sales";
import { beoordeelBudget, besteedAanMarkt } from "@/lib/sales/budget";
import { bouwOntdekVraag, type Kandidaat, type MarktRij } from "@/lib/sales/discovery";

type Admin = SupabaseClient;

export interface OntdekUitkomst {
  kandidaten: Kandidaat[];
  bronpaginas: { url: string; wat: string }[];
  kanttekening: string;
  /** Overgeslagen omdat het plafond per markt vol zat. */
  skipped: boolean;
  melding: string | null;
}

/**
 * De marktontdekking voor één markt.
 *
 * Idempotent (conventie 9): staat de markt al voorbij `concept`, dan is deze
 * stap al gedaan en kost een tweede poging geen tweede aanroep. Het plafond
 * wordt geteld vóór de aanroep en niet erna, want daarna is het geld op.
 */
export async function ontdekMarkt(admin: Admin, marketId: string): Promise<OntdekUitkomst> {
  const leeg: OntdekUitkomst = {
    kandidaten: [],
    bronpaginas: [],
    kanttekening: "",
    skipped: true,
    melding: null,
  };

  const { data } = await admin
    .from("sales_markets")
    .select("id, label, industry, location, radius_km, country, status")
    .eq("id", marketId)
    .maybeSingle();
  const markt = data as MarktRij | null;
  if (!markt) throw new Error(`Markt ${marketId} bestaat niet.`);

  // ── Idempotentie ────────────────────────────────────────────────────────
  //
  // Een markt die al bedrijven heeft, is al ontdekt. Opnieuw draaien zou een
  // tweede betaalde web-zoekactie doen voor een lijst die er al staat.
  const { count } = await admin
    .from("sales_market_companies")
    .select("id", { count: "exact", head: true })
    .eq("market_id", marketId);
  if ((count ?? 0) > 0) {
    return { ...leeg, melding: "De bedrijvenlijst bestond al." };
  }

  // ── Het plafond per markt ───────────────────────────────────────────────
  const besteed = await besteedAanMarkt(admin, marketId);
  const oordeel = beoordeelBudget(besteed, "discover");
  if (!oordeel.ok) {
    await admin
      .from("sales_markets")
      .update({ status: "mislukt", failure_reason: oordeel.melding })
      .eq("id", marketId);
    return { ...leeg, melding: oordeel.melding };
  }

  const r = await callStructured({
    model: MODELS.quality,
    system:
      "Je brengt een lokale markt in kaart voor een onderzoek naar zichtbaarheid in AI-antwoorden. " +
      "Je zoekt op het web en somt bedrijven op die er echt zijn. " +
      "Volledigheid is belangrijker dan bekendheid: een klein bedrijf zonder website telt net zo " +
      "zwaar als een groot bedrijf. " +
      "Verzin nooit een bedrijfsnaam en verzin nooit een webadres. Weet je een webadres niet, " +
      "laat het veld dan leeg. Een leeg veld is bruikbaar, een verzonnen veld niet. " +
      "Antwoord in het Nederlands.",
    user: bouwOntdekVraag(markt),
    schema: SalesMarketDiscovery,
    schemaName: "sales_market_discovery",
    webSearch: true,
    work: "analytical",
    meta: { kind: "sales_market_discover", salesMarketId: marketId },
  });

  // ⚠️ HET VANGNET (conventie 1). De prompt zegt "verzin geen webadres", en dat
  // is een intentie. Deze regels zijn de garantie: een bedrijf zonder naam valt
  // weg, en de rest wordt in `lib/sales/discovery.ts` genormaliseerd, waar een
  // onbruikbaar adres `null` wordt in plaats van een gok.
  const kandidaten: Kandidaat[] = r.parsed.bedrijven
    .filter((b) => (b.naam ?? "").trim().length > 1)
    .map((b) => ({
      name: b.naam.trim(),
      domain: b.website?.trim() || null,
      city: b.plaats?.trim() || null,
      bron: "ai_websearch" as const,
      naamHerkomst: "ai" as const,
      evidenceUrl: b.bron_url?.trim() || null,
    }));

  const bronpaginas = r.parsed.bronpaginas
    .filter((p) => /^https?:\/\//i.test((p.url ?? "").trim()))
    .map((p) => ({ url: p.url.trim(), wat: (p.wat ?? "").trim() }));

  return {
    kandidaten,
    bronpaginas,
    kanttekening: (r.parsed.kanttekening ?? "").trim(),
    skipped: false,
    melding: null,
  };
}
