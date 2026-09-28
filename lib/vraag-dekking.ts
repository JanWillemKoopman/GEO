/**
 * Is deze vraag aan de klant al beantwoord, of staat hij er al?
 *
 * ── WAAROM (kwaliteitsdoorlichting 24 september 2026, punt 35 en 36) ───────
 *
 * Punt 35: bij de installateur vroeg de app onder "Vragen over je merk" hoeveel
 * eigen monteurs er werken en of hij onderhoudscontracten aanbiedt. Beide stonden
 * in het gesprek ("Twaalf monteurs in dienst", "Meer dan 1.800
 * onderhoudscontracten"). De vragen waren om 21:41 gemaakt, het gesprek om 22:00
 * opgeslagen, en niets sloot een vraag die het gesprek beantwoordde. De klant
 * typt dan opnieuw wat hij net vertelde, en leest daaruit dat er niet geluisterd
 * is.
 *
 * Punt 36: elk rapport zette zijn eigen vragen klaar, met een unieke sleutel op
 * de letterlijke tekst. Na drie rapportversies had de installateur vier varianten
 * van "welke controles doet u bij een woningbezoek".
 *
 * ── WAAROM DETERMINISTISCH EN STRENG ────────────────────────────────────────
 *
 * Een vraag ten onrechte sluiten is erger dan hem laten staan: dan mist de
 * schrijver een feit en weet niemand het. Daarom telt een vraag alleen als
 * gedekt als ELK inhoudswoord van de vraag in één gespreksfeit terugkomt.
 * "Hoeveel monteurs hebben een F-gassencertificaat?" wordt dus niet gesloten door
 * "Twaalf monteurs in dienst". De prijs: "Kunnen klanten buiten kantoortijden een
 * storing melden?" blijft open naast "binnen 24 uur bij een storing, ook in het
 * weekend". Liever één vraag te veel dan één feit te weinig (conventie 3).
 *
 * Puur, zonder `server-only`, testbaar vanuit `scripts/test-unit.ts` (conventie 2).
 */

/**
 * Woorden die in bijna elke vraag staan en dus niets zeggen over WAT er
 * gevraagd wordt. Vier letters of meer, want kortere woorden tellen toch niet
 * mee. "kost", "lang" en "duur" staan er bewust niet in: "wat kost een
 * warmtepomp" en "hoe lang gaat een warmtepomp mee" zijn twee vragen.
 */
const VRAAGWOORDEN = new Set([
  "hoeveel", "momenteel", "bedrijf", "bedrijven", "werken", "werkt", "klanten", "klant",
  "aanbieden", "bieden", "biedt", "bied", "jullie", "gebruikelijk", "gebruikelijke", "doorgaans",
  "ongeveer", "precies", "specifiek", "specifieke", "kunnen", "welke", "welk", "hebben", "eerste",
  "gemiddeld", "gemiddelde", "verschillende", "belangrijk", "belangrijkste", "noemen", "vertellen",
  "concreet", "concrete", "voorbeeld", "voorbeelden", "waarom", "wanneer", "waarmee", "daarnaast",
  "tijdens", "zouden", "worden", "wordt", "andere", "daarbij", "bijvoorbeeld", "opdrachten",
  "mensen", "buiten", "binnen", "naast", "zijn", "hebt", "heeft", "voor", "door", "naar", "over",
  "onze", "jouw", "gaat", "doen", "doet", "kunt", "moet", "deze", "niet", "geen", "meer", "veel",
  "alle", "elke", "eigen", "hier", "daar", "waar", "zelf", "want", "maar", "even", "toch", "echt",
  "beide", "zowel", "elkaar", "nemen", "neemt", "zo'n", "iets", "soms", "vaak", "altijd", "nooit",
  "standaard", "daadwerkelijk", "actuele", "actueel", "graag",
]);

/** Kortste woord dat meetelt. */
const MIN_LENGTE = 4;

function stam(w: string): string {
  if (w.length > 7 && w.endsWith("en")) return w.slice(0, -2);
  if (w.length > 6 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/** De inhoudswoorden van een tekst: vier letters of meer, gestamd, zonder vraagwoorden. */
export function inhoudswoorden(tekst: string): Set<string> {
  const uit = new Set<string>();
  for (const ruw of tekst.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (ruw.length < MIN_LENGTE || VRAAGWOORDEN.has(ruw)) continue;
    uit.add(stam(ruw));
  }
  return uit;
}

function woordGedekt(w: string, in_: Set<string>): boolean {
  for (const x of in_) if (x.includes(w) || w.includes(x)) return true;
  return false;
}

/** Een vraag naar het werkgebied: "in welke plaatsen", "welke regio", "werkgebied". */
const PLAATSVRAAG =
  /\bwerkgebied\b|\bwelke\s+(plaatsen|plaats|regio'?s?|gemeenten|dorpen|steden)\b/i;

/** Woorden die bij een vraag naar het werkgebied horen en er niets aan toevoegen. */
const PLAATSWOORDEN = new Set(["plaatsen", "plaats", "regio", "regio's", "gemeenten", "dorpen", "steden", "werkgebied", "gebied"]);

export interface GespreksVelden {
  offline_proof: string[] | null | undefined;
  service_regions: string[] | null | undefined;
  growth_regions: string[] | null | undefined;
}

/**
 * Het antwoord uit het gesprek op deze vraag, of `null` als het gesprek hem
 * niet (zeker) beantwoordt.
 */
export function gesprekBeantwoordt(vraag: string, velden: GespreksVelden): string | null {
  const werk = (velden.service_regions ?? []).map((s) => s.trim()).filter(Boolean);
  const groei = (velden.growth_regions ?? []).map((s) => s.trim()).filter(Boolean);

  // Alleen een KALE plaatsvraag: "In welke plaatsen, en tot hoeveel kilometer
  // vanaf Eindhoven?" vraagt ook naar de afstand, en die staat niet in het
  // gesprek. Blijft er na de plaatsnamen en plaatswoorden iets over, dan open.
  const plaatsnamen = inhoudswoorden([...werk, ...groei].join(" "));
  const rest = [...inhoudswoorden(vraag)].filter(
    (w) => !PLAATSWOORDEN.has(w) && !plaatsnamen.has(w),
  );
  if (PLAATSVRAAG.test(vraag) && werk.length > 0 && rest.length === 0) {
    return (
      `Werkt nu in ${werk.join(", ")}` +
      (groei.length > 0 ? `, wil groeien in ${groei.join(", ")}` : "") +
      "."
    );
  }

  const woorden = inhoudswoorden(vraag);
  if (woorden.size === 0) return null;
  for (const feit of velden.offline_proof ?? []) {
    if (!feit?.trim()) continue;
    const feitWoorden = inhoudswoorden(feit);
    if ([...woorden].every((w) => woordGedekt(w, feitWoorden))) return feit.trim();
  }
  return null;
}

/**
 * Vraagt deze vraag hetzelfde als een die er al staat?
 *
 * Ja als de inhoudswoorden van de kortste helemaal in de langste zitten (en dat
 * minstens twee woorden zijn), of als minstens drie en vier vijfde ervan erin
 * zitten. De echte gevallen uit de doorlichting: "wachttijd voor een eerste
 * gesprek" tegenover "wachttijd voor een eerste gesprek en voor de start van
 * tuinaanleg" (helemaal), en twee keer "welke merken en modellen hybride
 * warmtepompen" met een ander slot (drie van de vier). Eén gedeeld woord is te
 * weinig: "Wat kost een warmtepomp?" en "Hoe lang gaat een warmtepomp mee?"
 * zijn twee vragen.
 */
export function zelfdeVraag(a: string, b: string): boolean {
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;
  const wa = inhoudswoorden(a);
  const wb = inhoudswoorden(b);
  if (wa.size === 0 || wb.size === 0) return false;
  const [klein, groot] = wa.size <= wb.size ? [wa, wb] : [wb, wa];
  const gedekt = [...klein].filter((w) => woordGedekt(w, groot)).length;
  if (gedekt === klein.size && klein.size >= 2) return true;
  return gedekt >= 3 && gedekt / klein.size >= 0.8;
}
