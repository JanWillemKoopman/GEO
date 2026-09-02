/**
 * Het contentcontract opschonen en als opdracht formuleren
 * (docs/tasks/contentpijplijn-herontwerp.md A2).
 *
 * Bewust GESCHEIDEN van `content-contract.ts`, dat het contract laat opstellen
 * en daarom `server-only` is. Wat hier staat bepaalt de uitkomst (welke secties
 * overleven, en hoe de opdracht in de schrijfprompt terechtkomt) en hoort dus
 * puur en testbaar te zijn vanuit `scripts/test-unit.ts` (conventie 2). Zelfde
 * scheiding als tussen `factcard.ts` (puur) en `factbase.ts` (server-only).
 */
import type { ContentContract, ContractSection } from "@/lib/schemas/content-contract";
import { scoreTermOverlap, topicTerms } from "@/lib/pipeline/page-relevance";

/**
 * Het contract opschonen vóór opslag.
 *
 * Twee dingen die het model soms laat liggen en die de dekkingspoort scheef
 * zouden zetten: een sectie zonder id (dan kan een bevinding er niet naar
 * wijzen) en een richtlengte van 0 of onzinnig hoog. Het vangnet in code hoort
 * bij de instructie in de prompt (conventie 1).
 */
export function normaliseerContract(
  contract: ContentContract,
  /**
   * De tekst van de bestaande pagina, als deze pagina er een verbetert (O4).
   * Zonder deze tekst kan het oordeel per sectie niet kloppen, en dan wordt het
   * ook niet bewaard.
   */
  existingText: string | null = null,
): ContentContract {
  const bestaand = (existingText ?? "").trim();
  return {
    ...contract,
    sections: contract.sections
      .filter((s) => s.heading?.trim() && s.subQuestion?.trim())
      .map((s, i) => ({
        ...s,
        id: s.id?.trim() || `s${i + 1}`,
        targetWords: Number.isFinite(s.targetWords)
          ? Math.min(Math.max(Math.round(s.targetWords), 40), 400)
          : 120,
        factRefs: (s.factRefs ?? []).filter((f) => f?.trim()),
        explainerTerms: (s.explainerTerms ?? []).filter((t) => t?.trim()),
        mustCover: (s.mustCover ?? []).filter((m) => m?.trim()),
        ...beoordeelSectie(s, bestaand),
      })),
    faqQuestions: (contract.faqQuestions ?? []).filter((v) => v?.trim()),
  };
}

/**
 * Het vangnet onder het sectie-oordeel (conventie 1).
 *
 * Twee regels, allebei deterministisch:
 *
 * 1. **Geen bestaande pagina, geen oordeel.** Dan staat er `niet_van_toepassing`
 *    en is `whatToChange` leeg, wat het model ook teruggaf. Een uitspraak over
 *    wat er "al op de pagina staat" terwijl die pagina niet bestaat, is precies
 *    de gefabriceerde bewering die conventie 3 verbiedt.
 *
 * 2. **"Staat er al" moet in de tekst terug te vinden zijn.** Zegt het model dat
 *    een sectie er volledig op staat, terwijl geen enkel kernwoord uit de kop en
 *    de deelvraag in de bestaande tekst voorkomt, dan kan dat niet kloppen en
 *    wordt het `ontbreekt`. Bewust deze kant op en niet andersom: een sectie ten
 *    onrechte als ontbrekend aanmerken kost de klant een alinea die hij al had,
 *    een sectie ten onrechte als aanwezig aanmerken kost hem het gat waarvoor hij
 *    betaalt.
 *
 * De grens ligt op nul: één term is genoeg om het model te geloven. Strenger
 * meten zou een pagina die hetzelfde in andere woorden zegt onterecht afkeuren,
 * en dat oordeel hoort bij het model, dat de tekst wél gelezen heeft.
 */
function beoordeelSectie(
  s: ContractSection,
  bestaand: string,
): Pick<ContractSection, "presentOnExisting" | "whatToChange"> {
  if (bestaand.length === 0) {
    return { presentOnExisting: "niet_van_toepassing", whatToChange: "" };
  }

  const gegeven = s.presentOnExisting ?? "ontbreekt";
  const wijziging = (s.whatToChange ?? "").trim();

  if (gegeven === "aanwezig") {
    const termen = topicTerms(s.heading, s.subQuestion);
    if (termen.length > 0 && scoreTermOverlap(bestaand, termen) === 0) {
      return {
        presentOnExisting: "ontbreekt",
        whatToChange:
          wijziging ||
          `Deze sectie staat nog niet op de pagina: voeg "${s.heading}" toe.`,
      };
    }
    return { presentOnExisting: "aanwezig", whatToChange: wijziging };
  }

  // Een sectie die ontbreekt of half aanwezig is zonder één woord uitleg is voor
  // de klant onbruikbaar. Dan schrijven we de zin zelf, uit de kop.
  return {
    presentOnExisting: gegeven === "niet_van_toepassing" ? "ontbreekt" : gegeven,
    whatToChange:
      wijziging ||
      (gegeven === "deels"
        ? `Vul "${s.heading}" aan, want de pagina beantwoordt nu niet volledig: ${s.subQuestion}`
        : `Voeg "${s.heading}" toe, want de pagina beantwoordt nu niet: ${s.subQuestion}`),
  };
}

/** Het contract als opdracht in de schrijfprompt. */
export function formatContract(contract: ContentContract | null): string {
  if (!contract || contract.sections.length === 0) return "";
  return [
    `DIT IS HET CONTRACT VOOR DEZE PAGINA. Alles wat hier staat MOET erop komen, in deze volgorde. ` +
      `Wij rekenen na of dat gelukt is, sectie voor sectie.`,
    `OPENING (de eerste twee zinnen van de pagina, vóór elke inleiding): "${contract.openingAnswer}"`,
    ...contract.sections.map((s, i) =>
      [
        // Geen kastlijntje: `docs/schrijfstijl.md` §10 geldt ook voor prompts, en
        // een prompt die het teken zelf gebruikt is een slecht voorbeeld voor een
        // model dat het niet mag gebruiken.
        `SECTIE ${i + 1}, kop: "${s.heading}" (ongeveer ${s.targetWords} woorden)`,
        `  beantwoordt: ${s.subQuestion}`,
        s.mustCover.length ? `  moet behandelen: ${s.mustCover.join("; ")}` : "",
        s.factRefs.length ? `  gebruik hier deze feiten: ${s.factRefs.join(", ")}` : "",
        s.explainerTerms.length ? `  leg hier kort uit: ${s.explainerTerms.join(", ")}` : "",
        // Wat er op de bestaande pagina al staat (O4). De schrijver moet weten
        // waar hij moet aanvullen en waar hij moet overnemen: dat is het verschil
        // tussen verbeteren en overschrijven.
        s.presentOnExisting === "aanwezig"
          ? `  staat AL op de bestaande pagina: neem dit over in je eigen woorden en verlies de inhoud niet`
          : s.presentOnExisting === "deels"
            ? `  staat HALF op de bestaande pagina: ${s.whatToChange || "vul aan"}`
            : s.presentOnExisting === "ontbreekt"
              ? `  ONTBREEKT op de bestaande pagina: ${s.whatToChange || "voeg toe"}`
              : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    contract.faqQuestions.length
      ? `FAQ (zet deze vragen in het veld faq, in de woorden van de lezer):\n- ${contract.faqQuestions.join("\n- ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Eén regel van de verbeterlijst die de klant leest. */
export interface Improvement {
  sectionId: string;
  heading: string;
  stand: "aanwezig" | "deels" | "ontbreekt";
  /** Wat er moet veranderen, in gewone taal. Leeg bij een sectie die er al staat. */
  wat: string;
}

/**
 * Wat er aan de bestaande pagina verandert (O5).
 *
 * Dit is het antwoord op de vraag die de klant tot 2 september 2026 niet kreeg:
 * hij zag een vervangende tekst en de instructie om zijn pagina te overschrijven,
 * en nergens stond wat er nu eigenlijk aan schortte. Puur afgeleid uit het
 * contract, dus er is geen vierde plek die kan verouderen.
 *
 * Secties die er al volledig op staan gaan mee in de lijst, met stand
 * `aanwezig`. Dat lijkt overbodig en is het niet: "deze zes dingen blijven zoals
 * ze zijn" is precies de geruststelling die iemand nodig heeft voordat hij zijn
 * eigen pagina overschrijft.
 */
export function describeImprovements(contract: ContentContract | null): Improvement[] {
  if (!contract) return [];
  return contract.sections
    .filter((s) => s.presentOnExisting && s.presentOnExisting !== "niet_van_toepassing")
    .map((s) => ({
      sectionId: s.id,
      heading: s.heading,
      stand: s.presentOnExisting as "aanwezig" | "deels" | "ontbreekt",
      wat: (s.whatToChange ?? "").trim(),
    }));
}

/**
 * De telling onder de lijst, in gewone taal.
 *
 * Met de noemer erbij, zoals overal in dit product: "4 van de 7 secties" zegt
 * hoe groot de ingreep is, "4 secties" niet.
 */
export function describeImprovementCount(improvements: Improvement[]): string {
  if (improvements.length === 0) return "";
  const nieuw = improvements.filter((i) => i.stand === "ontbreekt").length;
  const aangevuld = improvements.filter((i) => i.stand === "deels").length;
  const blijft = improvements.filter((i) => i.stand === "aanwezig").length;

  const delen: string[] = [];
  if (nieuw > 0) delen.push(nieuw === 1 ? "1 onderdeel is nieuw" : `${nieuw} onderdelen zijn nieuw`);
  if (aangevuld > 0) {
    delen.push(aangevuld === 1 ? "1 wordt aangevuld" : `${aangevuld} worden aangevuld`);
  }
  if (blijft > 0) {
    delen.push(blijft === 1 ? "1 blijft zoals hij is" : `${blijft} blijven zoals ze zijn`);
  }
  if (delen.length === 0) return "";

  const opsomming =
    delen.length === 1
      ? delen[0]
      : `${delen.slice(0, -1).join(", ")} en ${delen[delen.length - 1]}`;
  return `Van de ${improvements.length} onderdelen op deze pagina: ${opsomming}.`;
}
