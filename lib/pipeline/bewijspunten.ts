/**
 * BEWIJSPUNTEN: is een feit omgezet naar een argument? (V9 uit
 * `docs/tasks/contentkwaliteit-copywriterronde.md`, migratie 0093)
 *
 * ── HET VERSCHIL MET `claims` ───────────────────────────────────────────────
 *
 * `claims_json` beantwoordt: MAG deze zin hier staan, en welk feit dekt hem.
 * Dit beantwoordt: is dat feit omgezet van bedrijfsgegeven naar reden om te
 * bellen. Twee verschillende vragen, en op de twaalf pagina's van 3 september
 * 2026 liepen ze het verst uiteen van alle maten: bronherleidbaarheid 23 tot
 * 92 procent, overtuigingskracht 2,6 van 5 volgens de externe copywriter.
 *
 * Zijn tweede aanbeveling van drie, met zijn eigen voorbeelden:
 *
 *   "Vaste ploeg van vier eigen dakdekkers"   →  "u weet wie er op uw dak komt"
 *   "Extra werk alleen na toestemming"        →  "geen onverwachte werkzaamheden
 *                                                 zonder dat u eerst akkoord geeft"
 *   "Gratis inspectie met fotorapport"        →  "u ziet zelf wat we aantreffen"
 *
 * ── WAT DE CODE NAREKENT ────────────────────────────────────────────────────
 *
 * Drie dingen, en geen van drieën is een smaakoordeel:
 *
 * 1. Zijn er genoeg? Onder de drie is er geen keuze gemaakt.
 * 2. Bestaat het F-nummer? Een bewijspunt op een verzonnen feit is geen bewijs.
 * 3. Staat de betekeniszin ook echt in de tekst? Een model dat een mooie zin
 *    aanlevert en hem niet opschrijft, heeft het werk niet gedaan.
 *
 * Puur en zonder `server-only` (conventie 2).
 */

/** Wat het model aanlevert: een feit en wat het voor de lezer betekent. */
export interface Bewijspunt {
  factRef: string;
  betekenis: string;
  /**
   * Waarom die betekenis voor DEZE lezer telt (optimalisatie 7).
   *
   * Optioneel, want een pagina van vóór 4 september 2026 heeft dit veld niet en
   * mag daar niet op afgerekend worden.
   */
  relevantie?: string;
}

/** Hoeveel bewijspunten een pagina minstens hoort te hebben. */
export const MIN_BEWIJSPUNTEN = 3;

/**
 * Hoeveel van de betekeniswoorden in de tekst moeten voorkomen.
 *
 * 0,6, dezelfde drempel als `claimMatchesSentence()` in `claim-extract.ts`, en
 * om dezelfde reden: een schrijver mag zijn eigen zin herformuleren, maar niet
 * vervangen. Eén getal voor twee controles die hetzelfde meten.
 */
export const OVERLAP_DREMPEL = 0.6;

/** Woorden die niets onderscheiden en de overlap dus zouden opblazen. */
const STOPWOORDEN = new Set([
  "de", "het", "een", "en", "of", "van", "voor", "met", "in", "op", "te", "dat", "die", "is",
  "zijn", "wordt", "worden", "u", "uw", "je", "jouw", "we", "wij", "ons", "onze", "er", "bij",
  "aan", "naar", "als", "ook", "niet", "geen", "dan", "maar", "om", "over", "tot", "wat", "wie",
]);

function betekenisWoorden(zin: string): string[] {
  return (zin ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9àâéèêëîïôûùüÿç\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWOORDEN.has(w));
}

/** Staat deze zin, of een herformulering ervan, in de tekst? */
export function betekenisStaatInTekst(betekenis: string, tekst: string): boolean {
  const woorden = betekenisWoorden(betekenis);
  if (woorden.length === 0) return false;
  const laag = (tekst ?? "").toLowerCase();
  const gevonden = woorden.filter((w) => laag.includes(w)).length;
  return gevonden / woorden.length >= OVERLAP_DREMPEL;
}

export interface BewijspuntenResult {
  /** Hoeveel er aangeleverd zijn. */
  aantal: number;
  /** Punten die naar een F-nummer wijzen dat niet bestaat. */
  onbekend: Bewijspunt[];
  /** Punten waarvan de betekeniszin niet in de tekst staat. */
  nietGeschreven: Bewijspunt[];
  issues: string[];
}

/**
 * Reken de bewijspunten na.
 *
 * `factRefs` is de lijst geldige F-NUMMERS van de feitenkaart, dus wat het model
 * in de prompt ziet staan. Leeg betekent "geen kaart bekend", en dan wordt de
 * F-nummercontrole overgeslagen in plaats van alles af te keuren: dezelfde
 * afspraak als bij `claimIsOnderbouwd`.
 *
 * ⚠️ Het heette `factIds` en de aanroep in `quality-run.ts` gaf inderdaad de
 * IDENTITEITEN uit de feitenbank mee (uuids), terwijl een bewijspunt naar "F3"
 * verwijst. Daardoor gold op productie elk bewijspunt als een verwijzing naar
 * een niet-bestaand feit, en kreeg elke pagina tot drie bevindingen die nergens
 * op sloegen. De unittest gaf F-nummers mee en dekte de fout dus toe. Gevonden
 * op 4 september 2026, zie het logboek. De naam is nu `factRefs`, zodat de
 * volgende aanroeper de vergissing niet herhaalt.
 */
export function checkBewijspunten(input: {
  punten: readonly Bewijspunt[] | undefined;
  tekst: string;
  factRefs: readonly string[];
}): BewijspuntenResult {
  // ⚠️ Ontbreekt het veld helemaal, dan is dit een pagina van vóór migratie
  // 0093 en verandert er niets aan zijn oordeel (conventie 3).
  if (input.punten === undefined) {
    return { aantal: 0, onbekend: [], nietGeschreven: [], issues: [] };
  }

  const punten = input.punten.filter((p) => p?.factRef?.trim() && p?.betekenis?.trim());
  const geldig = new Set(input.factRefs.map((f) => f.trim().toUpperCase()));

  const onbekend =
    geldig.size > 0
      ? punten.filter((p) => !geldig.has(p.factRef.trim().toUpperCase()))
      : [];
  const nietGeschreven = punten.filter((p) => !betekenisStaatInTekst(p.betekenis, input.tekst));

  const issues: string[] = [];

  if (punten.length < MIN_BEWIJSPUNTEN) {
    issues.push(
      `Deze pagina zet ${punten.length} van de beschikbare feiten om naar een reden om te bellen, ` +
        `en dat horen er minstens ${MIN_BEWIJSPUNTEN} te zijn. Kies de feiten die voor DEZE lezer ` +
        `het meeste betekenen en schrijf per feit op wat hij eraan heeft.`,
    );
  }

  for (const p of onbekend.slice(0, 3)) {
    issues.push(
      `Het bewijspunt "${p.betekenis}" verwijst naar ${p.factRef}, en dat feit staat niet op de ` +
        `kaart. Kies een feit dat er wel staat.`,
    );
  }

  for (const p of nietGeschreven.slice(0, 3)) {
    issues.push(
      `"${p.betekenis}" is als bewijspunt aangeleverd maar staat niet in de tekst. Schrijf hem op ` +
        `de plek waar de lezer dit argument nodig heeft.`,
    );
  }

  return { aantal: punten.length, onbekend, nietGeschreven, issues };
}

/**
 * Het promptblok.
 *
 * Bewust met de voorbeelden van de copywriter erin: een instructie als "maak van
 * feiten voordelen" levert marketingtaal op, en drie voorbeelden van een echte
 * omzetting laten zien dat het om een gevolg voor de lezer gaat en niet om een
 * bijvoeglijk naamwoord.
 */
export function bewijspuntenblok(): string {
  return (
    `\nBEWIJSPUNTEN. Kies ${MIN_BEWIJSPUNTEN} tot 5 feiten van de kaart die voor DEZE lezer het ` +
    `meeste betekenen, en schrijf per feit één zin die zegt wat hij eraan heeft. Niet het feit zelf ` +
    `herhalen, maar het gevolg ervan:\n` +
    `- "vaste ploeg van vier eigen dakdekkers" wordt "u weet wie er op uw dak komt"\n` +
    `- "extra werk alleen na toestemming" wordt "geen onverwachte werkzaamheden zonder dat u eerst ` +
    `akkoord geeft"\n` +
    `- "gratis inspectie met fotorapport" wordt "u ziet zelf wat we aantreffen en wat er eerst moet ` +
    `gebeuren"\n` +
    `Die zinnen zet je ook echt IN de tekst, op de plek waar de lezer dat argument nodig heeft, en ` +
    `je vult ze daarnaast in \`proofPoints\` met het F-nummer erbij. Kies er niet meer dan vijf: van ` +
    `twintig feiten er twintig noemen is geen keuze maken.\n` +
    // ── Optimalisatie 7 (4 september 2026): de derde stap ──────────────────
    //
    // De externe AI-expert wees erop dat feit naar betekenis één stap te kort
    // is: "u weet wie er op uw dak komt" is betekenis, maar waarom dat voor
    // DEZE lezer iets uitmaakt staat er nergens. Een bewijsstuk zegt "dit is
    // aantoonbaar waar"; een argument zegt "en daarom telt het voor u".
    `Vul per bewijspunt ook \`relevantie\` in: waarom telt dit voor JUIST DEZE lezer, gezien zijn ` +
    `situatie en zijn vraag? Heeft hij haast, dan telt dat wij er binnen 24 uur zijn; is hij bang ` +
    `voor onverwachte kosten, dan telt dat hij vooraf een bedrag hoort. Kun je die vraag voor een ` +
    `feit niet beantwoorden, kies dan een ander feit: dan is het wel waar, maar niet van belang.`
  );
}

/**
 * Het promptblok voor de REPARATIERONDE: deze zinnen blijven staan.
 *
 * ⚠️ Toegevoegd op 4 september 2026 (optimalisatie 4). De reparatieopdracht
 * kreeg tot dan alleen de feitenkaart, het contract en de bevindingen. De
 * bewijspunten zaten er niet bij, terwijl de keuring er wél op controleert of de
 * betekeniszin nog in de tekst staat. Een reparatie die zo'n zin herschrijft,
 * levert dus een nieuwe bevinding op in de ronde erna, en die ronde weet nog
 * steeds niet dat hij van die zin af moet blijven. Dat is een lus die niet
 * afloopt en die per ronde $0,083 kost.
 *
 * Leeg bij een pagina zonder bewijspunten (van vóór migratie 0093): dan valt
 * het blok weg in plaats van een lege kop op te leveren.
 */
export function bewijspuntenBehoudblok(punten: readonly Bewijspunt[] | undefined): string {
  const bruikbaar = (punten ?? []).filter((p) => p?.betekenis?.trim());
  if (bruikbaar.length === 0) return "";
  return (
    `\nDEZE ZINNEN BLIJVEN STAAN. Dit zijn de bewijspunten van deze pagina: feiten die al zijn ` +
    `omgezet naar een reden voor de lezer. Raak ze niet aan, tenzij een bevinding er zelf over ` +
    `gaat. Herschrijf je de sectie waarin zo'n zin staat, neem hem dan mee in vrijwel dezelfde ` +
    `woorden:\n` +
    bruikbaar.map((p) => `- "${p.betekenis.trim()}" (${p.factRef.trim()})`).join("\n")
  );
}
