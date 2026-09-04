/**
 * DE SCHRIJFOPDRACHT als promptblok en als controle
 * (optimalisatie 5 en 6 uit docs/tasks/optimalisaties-expertronde-4-september-2026.md,
 * migratie 0094).
 *
 * ── WAAROM DEZE MODULE PUUR IS ──────────────────────────────────────────────
 *
 * De AI-aanroep die de opdracht MAAKT staat in `lib/pipeline/writer-brief.ts`
 * en heeft `server-only`. Alles wat daarna met die opdracht gebeurt, staat hier:
 * of hij bruikbaar is, hoe hij de prompt in gaat, en of de schrijver hem
 * gevolgd heeft. Dat is rekenwerk zonder database, dus het hoort testbaar te
 * zijn vanuit `scripts/test-unit.ts` (conventie 2).
 *
 * ── HET VANGNET IS HET BELANGRIJKSTE DEEL ───────────────────────────────────
 *
 * Een opdracht die het schrijfmodel negeert, is een negentiende promptblok en
 * dus precies het probleem dat beide experts aanwezen. Daarom rekent code na of
 * de opdracht is uitgevoerd:
 *
 *   1. de gekozen KERNFEITEN komen terug in de beweringen of de bewijspunten;
 *   2. het KERNANTWOORD staat in de eerste alinea;
 *   3. de KEUZEREDEN staat in de eerste twintig procent van de pagina;
 *   4. een opdracht met een leeg veld vervalt in zijn geheel.
 *
 * Regel 4 is conventie 3 (onbekend is beter dan verkeerd): een halve opdracht
 * die tóch de prompt in gaat, stuurt de pagina op een half argument.
 */
import { betekenisStaatInTekst } from "@/lib/pipeline/bewijspunten";
import { bepaalLezersopdracht } from "@/lib/lezersopdracht";
import type { WriterBrief } from "@/lib/schemas/writer-brief";

/**
 * Hoeveel feiten deze pagina minstens moet dragen.
 *
 * Drie, gelijk aan `MIN_BEWIJSPUNTEN`, en om dezelfde reden: onder de drie is
 * er geen keuze gemaakt. Boven de vijf ook niet, want dan is het de hele kaart.
 */
export const MIN_KERNFEITEN = 3;
export const MAX_KERNFEITEN = 5;

/**
 * Waar "vroeg in de pagina" ophoudt.
 *
 * Regel 4 van de externe copywriter: "noem het belangrijkste onderscheidende
 * voordeel binnen de eerste 20 procent van de pagina". Dat is zijn getal en
 * niet het onze, en het staat hier als constante zodat het bij te stellen is
 * zodra er een ronde ligt om het op te ijken.
 */
export const VROEG_DEEL = 0.2;

/** Hoeveel tekens er minstens meegenomen worden als de pagina heel kort is. */
const VROEG_MINIMUM = 400;

/**
 * Is dit een bruikbare opdracht?
 *
 * Alles of niets. Een opdracht zonder lezer stuurt niets, een opdracht zonder
 * kernantwoord stuurt de opening niet, en een opdracht zonder keuzereden mist
 * precies het veld waarvoor hij gebouwd is. Twee lijsten mogen wél leeg zijn:
 * "wat moet erin" en "wat niet" zijn prioriteiten, en een lege lijst is daar
 * een geldig antwoord (zelfde afspraak als bij het itemdossier).
 */
export function bruikbareOpdracht(brief: Partial<WriterBrief> | null | undefined): WriterBrief | null {
  if (!brief || typeof brief !== "object") return null;

  const tekst = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const lezer = tekst(brief.lezer);
  const hoofdvraag = tekst(brief.hoofdvraag);
  const kernantwoord = tekst(brief.kernantwoord);
  const waaromDezePagina = tekst(brief.waaromDezePagina);
  const blijftHangen = tekst(brief.blijftHangen);

  // De lezer wordt met dezelfde meetlat gemeten als het veld `targetIntent`
  // (V7): een onderwerp met een plaatsnaam erachter is geen lezer, en
  // "onbekend" al helemaal niet.
  const lezerOordeel = bepaalLezersopdracht({ targetIntent: lezer });
  if (lezerOordeel.bron !== "klant") return null;
  // Optimalisatie 10: een doelgroep zonder situatie is geen lezer, en een
  // situatie zonder persoon ook niet. Eén van de twee is het minimum, en dat is
  // ruimer dan de opdracht vraagt: de prompt vraagt om allebei, de code houdt
  // alleen het onbruikbare tegen.
  if (!lezerOordeel.noemtPersoon && !lezerOordeel.noemtSituatie) return null;

  const kernfeiten = (brief.kernfeiten ?? [])
    .map((f) => tekst(f).toUpperCase())
    .filter(Boolean)
    .slice(0, MAX_KERNFEITEN);
  const keuzeredenen = (brief.keuzeredenen ?? [])
    .filter((k) => tekst(k?.factRef) && tekst(k?.reden))
    .map((k) => ({ factRef: tekst(k.factRef).toUpperCase(), reden: tekst(k.reden) }))
    .slice(0, 3);

  if (!hoofdvraag || !kernantwoord || !waaromDezePagina || !blijftHangen) return null;
  if (kernfeiten.length < MIN_KERNFEITEN) return null;
  if (keuzeredenen.length === 0) return null;

  return {
    lezer,
    hoofdvraag,
    kernantwoord,
    waaromDezePagina,
    kernfeiten,
    keuzeredenen,
    eigenWoorden: tekst(brief.eigenWoorden),
    moetErIn: (brief.moetErIn ?? []).map(tekst).filter(Boolean),
    nietDoen: (brief.nietDoen ?? []).map(tekst).filter(Boolean),
    blijftHangen,
  };
}

/**
 * Het promptblok voor de schrijver.
 *
 * Staat bovenaan de opdracht, boven de feitenkaart: dit is de hiërarchie, en
 * wat bovenaan een prompt staat wordt het best gevolgd. De kaart blijft er
 * compleet onder staan, want minder informatie was juist niet het advies.
 */
export function opdrachtblok(opdracht: WriterBrief | null): string {
  if (!opdracht) return "";

  const regels = [
    "DE SCHRIJFOPDRACHT VOOR DEZE PAGINA. Dit is de redactionele keuze die vóór jou gemaakt is. " +
      "Alles hieronder in deze prompt is materiaal; dit is de opdracht.",
    "",
    `1. VOOR WIE: ${opdracht.lezer}`,
    `2. ZIJN VRAAG: ${opdracht.hoofdvraag}`,
    `3. WAT HIJ MOET BEGRIJPEN, ook als hij alleen de eerste alinea leest: ${opdracht.kernantwoord}`,
    `4. WAAROM DEZE PAGINA BESTAAT: ${opdracht.waaromDezePagina}`,
    `5. DE FEITEN DIE DEZE PAGINA DRAGEN: ${opdracht.kernfeiten.join(", ")}. De hele feitenkaart ` +
      `blijft geldig, maar dit zijn de feiten waar deze pagina op staat of valt. Zet ze om naar ` +
      `wat de lezer eraan heeft en vul ze in \`proofPoints\`.`,
    "6. WAAROM DEZE LEZER JUIST DIT BEDRIJF ZOU KIEZEN. Dit is het antwoord dat de pagina moet " +
      "geven, en het hoort in de eerste twintig procent van de tekst te staan:",
    ...opdracht.keuzeredenen.map((k) => `   - ${k.reden} (${k.factRef})`),
  ];

  if (opdracht.eigenWoorden) {
    regels.push(
      `7. WAT ALLEEN DEZE ONDERNEMER KAN ZEGGEN, en wat een concurrent dus niet kan kopiëren: ` +
        `"${opdracht.eigenWoorden}"`,
    );
  }
  if (opdracht.moetErIn.length > 0) {
    regels.push(`8. WAT ER ABSOLUUT IN MOET: ${opdracht.moetErIn.join("; ")}`);
  }
  if (opdracht.nietDoen.length > 0) {
    regels.push(
      `9. WAT JE OP DEZE PAGINA JUIST NIET DOET (naast de algemene regels): ` +
        `${opdracht.nietDoen.join("; ")}`,
    );
  }

  regels.push(
    "",
    `WAT DE LEZER NA AFLOOP MOET DENKEN: ${opdracht.blijftHangen}`,
    "Een pagina die alle vragen beantwoordt en die gedachte niet achterlaat, heeft zijn werk niet " +
      "gedaan. Laat weg wat daar niet aan bijdraagt, ook als het klopt en ook als het op de " +
      "feitenkaart staat.",
  );

  return `\n${regels.join("\n")}`;
}

/** Het begin van de pagina, waar het onderscheidende voordeel hoort te staan. */
export function vroegeDeel(bodyMarkdown: string): string {
  const tekst = (bodyMarkdown ?? "").trim();
  if (!tekst) return "";
  const grens = Math.max(VROEG_MINIMUM, Math.round(tekst.length * VROEG_DEEL));
  return tekst.slice(0, grens);
}

export interface OpdrachtResult {
  /** Kernfeiten die nergens in de beweringen of bewijspunten terugkomen. */
  ongebruikteFeiten: string[];
  /** Staat het kernantwoord in de eerste alinea? `null` = geen opdracht. */
  kernantwoordInOpening: boolean | null;
  /** Staat er een keuzereden vroeg in de pagina? `null` = geen opdracht. */
  keuzeredenVroeg: boolean | null;
  issues: string[];
}

/**
 * Is de schrijfopdracht uitgevoerd?
 *
 * `eersteAlinea` komt van buiten (uit `paginavorm.ts`) zodat deze module puur
 * blijft en er één definitie van "de eerste alinea" bestaat in plaats van twee.
 */
export function checkSchrijfopdracht(input: {
  opdracht: WriterBrief | null;
  bodyMarkdown: string;
  eersteAlinea: string;
  claims: readonly { factRef?: string }[];
  proofPoints: readonly { factRef?: string }[] | undefined;
}): OpdrachtResult {
  const { opdracht } = input;
  // Geen opdracht: geen oordeel. Een pagina van vóór migratie 0094 verandert
  // niet van uitkomst (conventie 3).
  if (!opdracht) {
    return { ongebruikteFeiten: [], kernantwoordInOpening: null, keuzeredenVroeg: null, issues: [] };
  }

  const gebruikt = new Set(
    [...(input.claims ?? []), ...(input.proofPoints ?? [])]
      .map((c) => (c?.factRef ?? "").trim().toUpperCase())
      .filter(Boolean),
  );
  const ongebruikteFeiten = opdracht.kernfeiten.filter((f) => !gebruikt.has(f));

  const kernantwoordInOpening = betekenisStaatInTekst(opdracht.kernantwoord, input.eersteAlinea);
  const vroeg = vroegeDeel(input.bodyMarkdown);
  const keuzeredenVroeg = opdracht.keuzeredenen.some((k) => betekenisStaatInTekst(k.reden, vroeg));

  const issues: string[] = [];

  // Eén ontbrekend feit van de vijf is een keuze van de schrijver; alle drie
  // ontbreken betekent dat de opdracht niet gevolgd is. De grens ligt op de
  // helft, en dat is een gekozen getal: er is nog geen ronde om hem op te
  // ijken, net als bij de zeven drempels van 3 september.
  if (ongebruikteFeiten.length > opdracht.kernfeiten.length / 2) {
    issues.push(
      `De schrijfopdracht wees ${opdracht.kernfeiten.join(", ")} aan als de feiten waar deze pagina ` +
        `op staat of valt, en ${ongebruikteFeiten.join(", ")} komt nergens in de tekst terug. ` +
        `Gebruik die feiten, of zeg waarom ze hier niet passen.`,
    );
  }

  if (!kernantwoordInOpening) {
    issues.push(
      `De eerste alinea geeft niet het antwoord dat de lezer moet meenemen: ` +
        `"${opdracht.kernantwoord}". Zet dat antwoord in de opening, want een AI-assistent en een ` +
        `haastige lezer lezen de rest niet.`,
    );
  }

  if (!keuzeredenVroeg) {
    issues.push(
      `De pagina zegt niet vroeg genoeg waarom deze lezer juist dit bedrijf zou kiezen: ` +
        `"${opdracht.keuzeredenen[0]?.reden ?? ""}". Zet die reden in de eerste twintig procent ` +
        `van de tekst.`,
    );
  }

  return { ongebruikteFeiten, kernantwoordInOpening, keuzeredenVroeg, issues };
}
