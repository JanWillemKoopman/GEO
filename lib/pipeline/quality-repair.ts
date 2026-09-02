/**
 * DE REPARATIEOPDRACHT: niet "maak dit beter" maar wat, waarom en waarmee
 * (docs/tasks/contentkwaliteit-framework.md §5, punt 17 van de opdracht)
 *
 * ── WAT HET MODEL VROEGER KREEG ─────────────────────────────────────────────
 *
 * Een lijst losse zinnen onder de kop "TE REPAREREN", plus de hele pagina per
 * sectie eronder. Het moest zelf uitzoeken welke regel bij welke kop hoorde, wat
 * er in de plaats moest komen, en welk bewijs het daarvoor mocht gebruiken.
 *
 * Gemeten op productie is dat misgegaan. De vier pagina's van 1 september kregen
 * samen elf reparatierondes en gingen er gemiddeld op achteruit: 78 → 52,
 * 68 → 36, 48 → 48. De rondes kostten $0,78 van de $1,08 per pagina.
 *
 * ── WAT HET NU KRIJGT ───────────────────────────────────────────────────────
 *
 * Per sectie een blok met vijf dingen, precies zoals de opdracht ze noemt:
 *
 *   PROBLEEM            wat er mis is, uit de bevinding
 *   WAT ER MOET STAAN   het succescriterium of de deelvraag uit het contract
 *   TOEGESTAAN BEWIJS   alleen de F-nummers die bij DEZE sectie horen
 *   ONTBREKEND BEWIJS   waar geen feit voor is, met de instructie om te nuanceren
 *                       of weg te laten in plaats van te verzinnen
 *   VERBODEN            wat de klant expliciet niet beweerd wil hebben
 *
 * Dat laatste is de belangrijkste toevoeging en de reden dat de rondes vroeger
 * niets opleverden: het model kreeg een gat aangewezen en had niets om het mee
 * te vullen, dus vulde het het met een zin die om het gat heen praat. Over de
 * vier pagina's van 1 september stonden er tachtig van zulke zinnen.
 *
 * Bewust ZONDER `server-only` (conventie 2): pure tekstopbouw, testbaar vanuit
 * `scripts/test-unit.ts`.
 */
import type { ContentContract, ContractSection } from "@/lib/schemas/content-contract";
import { splitRefs, type FactItem } from "@/lib/pipeline/factcard";
import {
  issueUitTekst,
  issuesPerSectie,
  prioriteerIssues,
  type QualityIssue,
} from "@/lib/pipeline/quality-issue";

export { prioriteerIssues };

/**
 * Bevindingen die als tekst binnenkomen omzetten naar het type.
 *
 * Nodig omdat de reparatietaak zijn bevindingen als `string[]` in de payload
 * krijgt (`lib/jobs/types.ts`): een taak die vóór een deploy in de wachtrij
 * stond, moet erna nog werken. Staan de getypeerde bevindingen er wél, dan
 * winnen die, want die dragen de sectie, het bewijs en de verwachting.
 */
export function issuesUitTekstOfType(
  getypeerd: readonly QualityIssue[] | null | undefined,
  teksten: readonly string[],
): QualityIssue[] {
  if (getypeerd && getypeerd.length > 0) return [...getypeerd];
  return teksten.filter((t) => t?.trim()).map(issueUitTekst);
}

/** De feiten die bij één sectie horen, opgezocht via de F-nummers uit het contract. */
export function feitenVanSectie(
  sectie: ContractSection | undefined,
  facts: readonly FactItem[],
): FactItem[] {
  if (!sectie) return [];
  const nummers = new Set(
    (sectie.factRefs ?? []).flatMap((ref) => splitRefs(ref)).map((r) => r.toUpperCase()),
  );
  if (nummers.size === 0) return [];
  return facts.filter((f) => f.ref && nummers.has(f.ref.toUpperCase()));
}

/** De sectie uit het contract die bij deze kop hoort. Op kop, want dat is wat de bevinding draagt. */
function sectieBijKop(contract: ContentContract | null, kop: string): ContractSection | undefined {
  if (!contract || !kop) return undefined;
  const genormaliseerd = kop.trim().toLowerCase();
  return contract.sections.find((s) => s.heading?.trim().toLowerCase() === genormaliseerd);
}

export interface ReparatieOpdrachtInput {
  issues: readonly QualityIssue[];
  contract: ContentContract | null;
  facts: readonly FactItem[];
  /** Wat de klant expliciet NIET beweerd wil hebben (`allowed: false` op de kaart). */
  verboden?: readonly string[];
}

/**
 * De opdracht per sectie, als tekstblok voor het reparatiemodel.
 *
 * Bevindingen zonder sectie komen onderaan onder "OVER DE HELE PAGINA": ze
 * gelden voor de tekst als geheel en horen niet stilzwijgend bij de laatste
 * sectie te belanden.
 */
export function bouwReparatieOpdracht(input: ReparatieOpdrachtInput): string {
  const { issues, contract, facts, verboden = [] } = input;
  if (issues.length === 0) {
    return "Geen concrete bevindingen; laat de pagina dan ongewijzigd en geef een lege sectielijst terug.";
  }

  const perSectie = issuesPerSectie(issues);
  const blokken: string[] = [];

  for (const [kop, lijst] of perSectie) {
    if (!kop) continue;
    const sectie = sectieBijKop(contract, kop);
    const bewijs = feitenVanSectie(sectie, facts);
    const ontbreekt = lijst.filter((i) => i.dimension === "bewijs" || i.bron === "bewijsdekking");

    blokken.push(
      [
        `\n▸ SECTIE "${kop}"`,
        `  PROBLEEM:`,
        ...lijst.map((i) => `   - ${i.finding}${i.evidence ? ` (${i.evidence})` : ""}`),
        sectie?.successCriterion?.trim() || sectie?.subQuestion?.trim()
          ? `  WAT ER MOET STAAN: ${sectie?.successCriterion?.trim() || `een antwoord op "${sectie?.subQuestion?.trim()}"`}`
          : "",
        bewijs.length > 0
          ? `  TOEGESTAAN BEWIJS (gebruik ALLEEN dit, met het F-nummer erbij):\n${bewijs
              .map((f) => `   ${f.ref}: ${f.text}`)
              .join("\n")}`
          : "  TOEGESTAAN BEWIJS: geen. Er is voor deze sectie geen bevestigd feit.",
        ontbreekt.length > 0 || bewijs.length === 0
          ? "  ONTBREKEND BEWIJS: verzin hier niets bij. Kan de bewering niet verantwoord onderbouwd " +
            "worden, nuanceer hem of laat hem weg. Schrijf ook NIET dat iets niet bekend is en vraag " +
            "de lezer niet om contact op te nemen om het na te vragen: dat is geen antwoord."
          : "",
        lijst
          .filter((i) => i.recommendation?.trim())
          .map((i) => `  DOE DIT: ${i.recommendation.trim()}`)
          .join("\n"),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const paginaBreed = perSectie.get("") ?? [];
  if (paginaBreed.length > 0) {
    blokken.push(
      [
        "\n▸ OVER DE HELE PAGINA",
        ...paginaBreed.map(
          (i) =>
            `   - ${i.finding}${i.expected ? ` Verwacht: ${i.expected}` : ""}${
              i.recommendation?.trim() ? ` ${i.recommendation.trim()}` : ""
            }`,
        ),
      ].join("\n"),
    );
  }

  if (verboden.length > 0) {
    blokken.push(
      `\n▸ VERBODEN AANNAMES (dit heeft de klant expliciet uitgesloten):\n${verboden
        .map((v) => `   - ${v}`)
        .join("\n")}`,
    );
  }

  return blokken.join("\n");
}

/**
 * De blokkerende bevindingen als losse waarschuwing bovenaan de opdracht.
 *
 * Bovenaan en niet tussen de rest, want dit is wat publicatie tegenhoudt: is
 * hier na deze ronde nog iets van over, dan gaat de pagina niet mee naar de
 * klant als "klaar". Dat weegt zwaarder dan elk verbeterpunt eronder.
 */
export function bouwBlokkadeKop(issues: readonly QualityIssue[]): string {
  const blokkades = issues.filter((i) => i.blocking);
  if (blokkades.length === 0) return "";
  return [
    "▸ DIT HOUDT PUBLICATIE TEGEN. Los dit eerst op, vóór alle andere punten:",
    ...blokkades.map((i) => `   - ${i.finding} ${i.recommendation}`.trim()),
    "",
  ].join("\n");
}
