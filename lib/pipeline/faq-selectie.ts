import "server-only";

/**
 * L6: de FAQ-SELECTIE (docs/tasks/contentpijplijn-publicatiewaardig.md §5 L6 en §11, WP7).
 *
 * Een eigen aanroep binnen `content_strategy`, na de strategie. Luna is licht
 * genoeg om naast de ene zware aanroep te passen (conventie 7). Kiest nul tot
 * vijf vragen die echt iets toevoegen; de code past de criteria daarna opnieuw
 * toe (`pasFaqSelectieToe()`).
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { FaqSelection } from "@/lib/schemas/faq-selection";
import type { PageStrategy } from "@/lib/schemas/page-strategy";
import type { FaqKandidaat } from "@/lib/pipeline/faq-criteria";

const SYSTEM =
  "Je kiest de veelgestelde vragen onder één webpagina van een lokale ondernemer. Een vraag blijft " +
  "alleen als hij aan ALLE VIER voldoet: (1) een echte lezer van deze pagina stelt hem, in de fase " +
  "waarin hij is; (2) de tekst beantwoordt hem niet al (zie de gekozen onderwerpen); (3) het antwoord " +
  "rust op een feit van de FEITENKAART (noem de F-nummers) of op vaste vakkennis die niemand betwist " +
  "(geef die in één zin); (4) het antwoord helpt de lezer richting dit bedrijf of neemt een drempel " +
  "weg. Een vraag over iets dat dit bedrijf niet doet, sneuvelt op 4. Een vraag waarop alleen 'dat " +
  "hangt ervan af' of 'dat is niet bekend' te antwoorden is, sneuvelt op 3. Nul vragen is een goede " +
  "uitkomst als er geen vraag aan alle vier voldoet; kies er hoogstens vijf. Beoordeel ELKE kandidaat " +
  "met zijn nummer. Antwoord in het Nederlands.";

export async function selecteerFaq(args: {
  strategie: PageStrategy;
  kandidaten: FaqKandidaat[];
  kaart: { ref: string; text: string }[];
  analysisId: string;
  profileId: string;
  contentPieceId: string | null;
}): Promise<FaqSelection | null> {
  if (args.kandidaten.length === 0) return { kandidaten: [] };
  const s = args.strategie;
  const user = [
    `LEZER: ${s.lezer} (fase: ${s.fase})`,
    `DOEL VAN DE PAGINA: ${s.paginadoel}`,
    `GEKOZEN ONDERWERPEN (die beantwoordt de tekst al): ${s.onderwerpen
      .filter((o) => o.besluit === "opnemen")
      .map((o) => o.onderwerp)
      .join(" | ")}`,
    "",
    "FEITENKAART:",
    ...args.kaart.map((f) => `${f.ref}  ${f.text}`),
    "",
    "KANDIDAATVRAGEN (bron tussen haakjes):",
    ...args.kandidaten.map((k, i) => `${i + 1}. ${k.vraag} (${k.bron})`),
  ].join("\n");
  try {
    const res = await callStructured({
      model: MODELS.quality,
      system: SYSTEM,
      user,
      schema: FaqSelection,
      schemaName: "faq_selection",
      webSearch: false,
      work: "judging",
      meta: { kind: "faq_selection", analysisId: args.analysisId, profileId: args.profileId, contentPieceId: args.contentPieceId },
    });
    return res.parsed;
  } catch (err) {
    // Geen selectie is geen reden om de pagina tegen te houden; zonder oordeel
    // valt elke kandidaat af en komt er geen FAQ (nul is een geldige uitkomst).
    console.warn(`FAQ-selectie mislukt, de pagina krijgt geen FAQ: ${String(err)}`);
    return null;
  }
}
