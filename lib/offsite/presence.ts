import "server-only";

/**
 * Staat de klant op de bronnen die zijn markt bepalen? (optimalisatie.md 7.2)
 *
 * Dit is de vraag die het off-site advies concreet maakt. "Bij zes van je twaalf
 * vragen citeert de AI dit platform, je concurrent staat erop en jij niet" is
 * een uitspraak waar iemand morgen iets mee doet. Zonder deze controle blijft
 * het bij "misschien moet je eens naar reviewplatforms kijken".
 *
 * ── WAAROM EEN GEGROUNDDE AI-AANROEP EN GEEN EIGEN CONTROLE ────────────────
 *
 * Er is geen algemene manier om te controleren of een bedrijf op een willekeurig
 * platform staat: elk platform heeft z'n eigen URL-structuur, en de meeste
 * verstoppen hun zoekfunctie achter JavaScript. Een eigen scraper zou per
 * platform onderhouden moeten worden en breekt bij elke redesign.
 *
 * Dus vragen we het met web-zoeken aan, één keer voor alle domeinen samen. Dat
 * kost één web-zoekactie in plaats van tien, en het model mag 'onbekend'
 * antwoorden — dat is de belangrijkste van de drie mogelijke uitkomsten.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { SourcePresence } from "@/lib/schemas/source-presence";
import { webSearchEnabled } from "@/lib/config";
import type { SourceLandscapeRow } from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * Hoeveel domeinen we controleren. De staart van de lijst levert nauwelijks
 * bruikbaar advies op, en elk extra domein maakt de aanroep onnauwkeuriger.
 */
const MAX_TO_CHECK = 8;

/** Opnieuw controleren na deze periode; platforms veranderen niet wekelijks. */
const RECHECK_AFTER_DAYS = 30;

const SYSTEM =
  "Je controleert of een specifiek bedrijf voorkomt op een aantal websites. Gebruik web search. " +
  "Per website: heeft dit bedrijf daar een eigen vermelding, profiel, bedrijfspagina of " +
  "productplaatsing? Antwoord 'ja' ALLEEN als je een concrete pagina vindt die over dit bedrijf " +
  "gaat, en geef dan de URL. Antwoord 'nee' als je vaststelt dat het bedrijf er niet op staat. " +
  "Antwoord 'onbekend' als je het niet betrouwbaar kunt vaststellen — dat is een geldig en vaak " +
  "het juiste antwoord, en veel beter dan een gok. Een gok kost de ondernemer een middag werk aan " +
  "iets wat al geregeld was, of laat hem denken dat iets geregeld is terwijl dat niet zo is. " +
  "Verwar het bedrijf niet met gelijknamige bedrijven in een andere plaats of branche. " +
  "Antwoord in het Nederlands.";

export interface PresenceResult {
  checked: number;
  found: number;
}

export async function checkPresence(
  admin: Admin,
  args: {
    analysisId: string;
    profileId: string;
    brandName: string;
    siteUrl: string;
    regions: string[];
    industry: string | null;
    rows: SourceLandscapeRow[];
  },
): Promise<PresenceResult> {
  if (!webSearchEnabled) {
    // Zonder grounding is deze controle zinloos: het model zou uit z'n
    // trainingsdata moeten raden of een lokale ondernemer op een platform staat,
    // en dat antwoord is altijd fout. Dan liever niets weten dan iets verzinnen.
    console.log("Grounding staat uit — aanwezigheidscontrole overgeslagen.");
    return { checked: 0, found: 0 };
  }

  const cutoff = Date.now() - RECHECK_AFTER_DAYS * 86_400_000;
  const todo = args.rows
    .filter((r) => !r.checked_at || new Date(r.checked_at).getTime() < cutoff)
    .slice(0, MAX_TO_CHECK);

  if (todo.length === 0) return { checked: 0, found: 0 };

  const context = [
    `Bedrijf: ${args.brandName}`,
    `Website: ${args.siteUrl}`,
    args.industry ? `Branche: ${args.industry}` : "",
    args.regions.length ? `Werkgebied: ${args.regions.join(", ")}` : "",
    "",
    "Controleer per website of dit bedrijf er een vermelding heeft:",
    ...todo.map((r) => `- ${r.domain}`),
  ]
    .filter(Boolean)
    .join("\n");

  let parsed: SourcePresence;
  try {
    const result = await callStructured({
      model: MODELS.quality,
      system: SYSTEM,
      user: context,
      schema: SourcePresence,
      schemaName: "source_presence",
      webSearch: true,
      work: "deterministic",
      meta: { kind: "source_presence", analysisId: args.analysisId, profileId: args.profileId },
    });
    parsed = result.parsed;
  } catch (err) {
    // Faalt zacht: de scan mag niet stuklopen op deze ene stap. Zonder uitslag
    // blijft `own_present` gewoon null, en dat toont de UI als "niet
    // gecontroleerd" in plaats van als "staat er niet op".
    console.warn(`Aanwezigheidscontrole mislukt voor analyse ${args.analysisId}:`, err);
    return { checked: 0, found: 0 };
  }

  const byDomain = new Map(parsed.results.map((r) => [r.domain.toLowerCase().replace(/^www\./, ""), r]));
  const now = new Date().toISOString();
  let found = 0;

  for (const row of todo) {
    const hit = byDomain.get(row.domain);
    if (!hit) continue;

    const present = hit.present === "ja" ? true : hit.present === "nee" ? false : null;
    if (present) found++;

    await admin
      .from("source_landscape")
      .update({
        own_present: present,
        own_url: present && hit.url?.startsWith("http") ? hit.url : null,
        checked_at: now,
      })
      .eq("id", row.id);
  }

  return { checked: todo.length, found };
}
