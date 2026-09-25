/**
 * FEITBEHOUD: een nieuwe versie van een pagina houdt de feiten van de vorige
 * (punt 50 en 62 van de kwaliteitsdoorlichting, reparatieplan blok H,
 * 25 september 2026).
 *
 * ── WAT ER MISGING ──────────────────────────────────────────────────────────
 *
 * "Laat ORBIT ENGINE ze alle 5 in één keer oplossen" schrijft een VOLLEDIG
 * nieuwe versie (`regenerate: true`), en de schrijver kreeg daarbij alleen de
 * lijst met punten mee, niet de vorige tekst. Bij de pagina "Vergelijk een
 * nieuwe ketel met een hybride warmtepomp" van de installateur stonden in
 * versie 1 zeventien beweringen met een feit; in versie 2 ontbraken er drie
 * die geen van de vijf punten raakten: "twaalf monteurs in dienst", de levertijd
 * van twee tot vier weken en het jaarlijkse onderhoudscontract. De klant gaf
 * die zelf, en ze verdwenen zonder melding.
 *
 * ── TWEE REPARATIES, NIET ÉÉN ───────────────────────────────────────────────
 *
 *   1. De schrijver krijgt de feiten van de vorige versie mee, met de harde
 *      opdracht ze te behouden (`behoudblok()`, in `content.ts`).
 *   2. Na het schrijven telt de code na of ze er nog staan
 *      (`vindVerlorenFeiten()`). Ontbreekt er een, dan wordt dat een eigen
 *      bevinding in de keuring, geen stilzwijgend verlies (conventie 1).
 *
 * ── WAT "GEMELD" IS ─────────────────────────────────────────────────────────
 *
 * Een feit waar de revisienota zelf over gaat, mag weg: de klant vroeg erom,
 * of de keuring wees de zin aan. Gemeld is een bewering als een geciteerde zin
 * uit de nota hem draagt (`claimMatchesSentence()`), of als de nota ALLE
 * herkenningswoorden en getallen van het feit noemt ("haal de twaalf
 * monteurs in dienst weg").
 *
 * ⚠️ Niet ruimer, en dat is nagerekend: de nota van punt 62 bestaat uit vijf
 * standaardregels ("Deze zin zegt iets over je bedrijf zonder bron ...
 * Onderbouw hem") rond vijf geciteerde zinnen over warmtepompen en ketels.
 * Met "twee gedeelde kernwoorden" gold het onderhoudscontract daardoor als
 * gemeld ("ketel", "warmtepomp", "onder" uit "Onderbouw"), en dat was juist
 * een van de drie feiten die verdwenen. Wat hier niet lukt: een klant die in
 * eigen woorden om het weghalen van een feit vraagt en daarbij niet alle
 * herkenningswoorden noemt, krijgt een bevinding "feit verdwenen" die hij
 * zelf kan wegklikken.
 *
 * Bewust ZONDER `server-only`: pure tekstbewerking, testbaar in `test-unit.ts`.
 */
import { splitSentences, stripMarkdown } from "@/lib/pipeline/sentences";
import { claimMatchesSentence, getallenIn } from "@/lib/pipeline/claim-extract";
import { normalizeForQuote, type FactItem, type WrittenClaim } from "@/lib/pipeline/factcard";

/**
 * De woorden waaraan je een feit terugherkent: hele woorden van vijf letters of
 * meer, zonder meervouds-s of -en ("monteurs" en "monteur" zijn hetzelfde).
 *
 * ⚠️ Niet `kernwoorden()` uit `claim-extract.ts`: die kapt af op vijf letters,
 * en dan is "onder meer" hetzelfde als "onderhoud". Op de echte versie 2 van
 * punt 62 gold het verdwenen onderhoudscontract daardoor als nog aanwezig.
 */
function herkenningswoorden(tekst: string): Set<string> {
  return new Set(
    normalizeForQuote(tekst)
      .split(" ")
      .filter((w) => w.length >= 5)
      .map((w) => {
        const stam = w.replace(/(en|s)$/, "");
        return stam.length >= 4 ? stam : w;
      }),
  );
}

/**
 * Een woord dat in minstens dit deel van de zinnen van de nieuwe tekst staat,
 * is het onderwerp van de pagina en bewijst niet dat een bepaald feit er nog
 * staat. Op de pagina van punt 62 stonden "ketel" en "warmtepomp" in bijna
 * elke alinea; zonder deze grens gold het onderhoudscontract als aanwezig
 * omdat de openingszin "cv-ketel" en "warmtepomp" noemt.
 */
const ONDERWERP_AANDEEL = 0.2;

export interface TeBehoudenFeit {
  factId: string;
  /** Het F-nummer op de HUIDIGE kaart, zodat de schrijver het kan aanhalen. */
  ref: string;
  /** Het feit zelf. */
  tekst: string;
  /** Hoe de vorige versie het zei. */
  vorigeZin: string;
  /** De herkenningswoorden die zin en feit delen: daaraan herken je het feit terug. */
  kern: string[];
  /** De getallen die zin en feit delen. */
  getallen: string[];
}

/** De zinnen tussen aanhalingstekens in een revisienota: de gemelde punten. */
function geciteerd(notitie: string): string[] {
  return [...notitie.matchAll(/["“„]([^"”]{8,})["”]/g)].map((m) => m[1]);
}

function isGemeld(claim: string, kern: string[], getallen: string[], notitie: string | null): boolean {
  if (!notitie?.trim()) return false;
  if (geciteerd(notitie).some((zin) => claimMatchesSentence(claim, zin))) return true;
  if (kern.length < 2) return false;
  const woorden = herkenningswoorden(notitie);
  const cijfers = new Set(getallenIn(notitie));
  return kern.every((w) => woorden.has(w)) && getallen.every((g) => cijfers.has(g));
}

/**
 * Welke feiten van de vorige versie moet de nieuwe houden?
 *
 * Alleen beweringen met een feit-id dat nog op de kaart staat en gebruikt mag
 * worden: een feit dat de klant intussen ontkende, hoort juist weg. En alleen
 * als zin en feit iets gemeenschappelijks hebben om aan terug te herkennen;
 * zonder kern valt er niets na te tellen, en dan vraagt de code het ook niet.
 */
export function bepaalTeBehouden(args: {
  vorigeClaims: readonly WrittenClaim[] | null | undefined;
  facts: readonly FactItem[];
  notitie: string | null;
  /**
   * De zichtbare tekst van de vorige versie. Een bewering die daar niet in
   * terug te vinden is, stond alleen in de gegevens voor zoekmachines ("Het
   * adres in de gestructureerde gegevens is ...") en hoeft niet in de tekst
   * terug te komen. Weglaten: dan telt elke bewering.
   */
  vorigeTekst?: { bodyMarkdown: string; faq?: { q: string; a: string }[] } | null;
}): TeBehoudenFeit[] {
  const uit: TeBehoudenFeit[] = [];
  const gezien = new Set<string>();
  for (const c of args.vorigeClaims ?? []) {
    const id = c.factId ?? null;
    if (!id || gezien.has(id) || !c.claim?.trim()) continue;
    const feit = args.facts.find((f) => f.id === id);
    if (!feit || !feit.allowed || !feit.citable) continue;
    const feitWoorden = herkenningswoorden(feit.text);
    const kern = [...herkenningswoorden(c.claim)].filter((w) => feitWoorden.has(w));
    const feitGetallen = new Set(getallenIn(feit.text));
    const getallen = getallenIn(c.claim).filter((g) => feitGetallen.has(g));
    if (kern.length === 0 && getallen.length === 0) continue;
    if (isGemeld(c.claim, kern, getallen, args.notitie)) continue;
    gezien.add(id);
    uit.push({ factId: id, ref: feit.ref, tekst: feit.text, vorigeZin: c.claim.trim(), kern, getallen });
  }
  if (!args.vorigeTekst) return uit;
  // Dezelfde herkenning als straks bij de nieuwe versie, zonder de feit-ids:
  // de vraag is hier of een lezer het feit in de vorige versie kon zien.
  const nietZichtbaar = new Set(
    vindVerlorenFeiten({ teBehouden: uit, ...args.vorigeTekst, claims: [] }).map((f) => f.factId),
  );
  return uit.filter((f) => !nietZichtbaar.has(f.factId));
}

/**
 * Welke te behouden feiten staan niet meer in de nieuwe tekst?
 *
 * Een feit staat er nog als de nieuwe versie een bewering met hetzelfde
 * feit-id heeft, of als één zin alle gedeelde getallen bevat en minstens de
 * helft van de herkenningswoorden die niet het onderwerp van de pagina zijn. Per zin en niet over de hele tekst: een
 * pagina over warmtepompen noemt "warmtepomp" overal, en dat bewijst niet dat
 * de levertijd er nog staat.
 */
export function vindVerlorenFeiten(args: {
  teBehouden: readonly TeBehoudenFeit[];
  bodyMarkdown: string;
  faq?: { q: string; a: string }[];
  claims?: readonly WrittenClaim[] | null;
}): TeBehoudenFeit[] {
  if (args.teBehouden.length === 0) return [];
  const ids = new Set((args.claims ?? []).map((c) => c.factId).filter(Boolean));
  const zinnen = [
    stripMarkdown(args.bodyMarkdown ?? ""),
    ...(args.faq ?? []).map((f) => stripMarkdown(f.a ?? "")),
  ].flatMap((stuk) => splitSentences(stuk));
  const perZin = zinnen.map((z) => ({ woorden: herkenningswoorden(z), getallen: new Set(getallenIn(z)) }));
  const onderwerp = (w: string) =>
    perZin.length > 0 && perZin.filter((z) => z.woorden.has(w)).length / perZin.length >= ONDERWERP_AANDEEL;

  return args.teBehouden.filter((feit) => {
    if (ids.has(feit.factId)) return false;
    // Alleen de woorden die dit feit onderscheiden; zijn het allemaal
    // onderwerpwoorden, dan moeten ze er allemaal staan.
    const eigen = feit.kern.filter((w) => !onderwerp(w));
    const kern = eigen.length > 0 ? eigen : feit.kern;
    const nodig = eigen.length > 0 ? Math.ceil(kern.length / 2) : kern.length;
    const staatErNog = perZin.some(
      (z) =>
        feit.getallen.every((g) => z.getallen.has(g)) &&
        kern.filter((w) => z.woorden.has(w)).length >= nodig,
    );
    return !staatErNog;
  });
}

/**
 * Het blok voor de schrijver: deze feiten stonden in de vorige versie en
 * blijven staan. Leeg als er niets te behouden is.
 */
export function behoudblok(teBehouden: readonly TeBehoudenFeit[]): string {
  if (teBehouden.length === 0) return "";
  return [
    "",
    "── WAT ER IN DE VORIGE VERSIE STOND EN MOET BLIJVEN ──",
    "Dit is een nieuwe versie van een bestaande pagina. De vorige versie noemde de feiten hieronder, en " +
      "geen daarvan hoort bij de punten die de klant of de controle wil veranderen. Neem ELK van deze " +
      "feiten over in de nieuwe versie, met hetzelfde getal en dezelfde strekking, en verwijs naar het " +
      "F-nummer. Je mag de zin anders schrijven en hem naar een andere sectie verplaatsen, maar je laat " +
      "geen van deze feiten weg. Na het schrijven telt de controle na of ze er nog staan.",
    ...teBehouden.map((f) => `- ${f.ref}: ${f.tekst}  (vorige versie: "${f.vorigeZin}")`),
  ].join("\n");
}
