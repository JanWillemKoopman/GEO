/**
 * De toelichting bij een aanbeveling, ontdaan van onze eigen notatie.
 *
 * ── HET PROBLEEM, LETTERLIJK VAN PRODUCTIE ──────────────────────────────────
 *
 * Het rapportmodel krijgt de gemiste vragen aangeleverd als V1, V2, V3, elk met
 * het bevroren gewicht erbij (volume × koopwaarde, 0,02 tot 1,0). Dat is nodig
 * om te kunnen prioriteren, maar het model neemt die notatie mee in de zin die
 * de klant leest. Bij Van den Udenhout stond op het overzichtsscherm van de
 * klant letterlijk: "Dit is de belangrijkste gemiste groep vragen: V1 en V2
 * hebben gewicht 0,60." Vijf van de zes aanbevelingen begonnen zo.
 *
 * `docs/ux-design.md` §1 verbiedt jargon op een klantscherm, en "gewicht 0,60"
 * is jargon van de ergste soort: het is óns rekenmodel, de klant kan er niets
 * mee, en het maakt de rest van de zin ook nog onleesbaar.
 *
 * ── WAAROM EEN HELE ZIN WEG EN NIET ALLEEN HET GETAL ────────────────────────
 *
 * Een vraagcode is meestal het ONDERWERP van de zin ("V5 is een belangrijke
 * lokale koopvraag met gewicht 0,50"). Haal je alleen de code en het getal weg,
 * dan blijft er "is een belangrijke lokale koopvraag met" over, en dat is
 * slechter dan niets. De hele zin weg laten werkt wél: op alle zes de
 * aanbevelingen van Van den Udenhout blijft er dan precies de zin staan die
 * zegt wat de klant moet maken.
 *
 * ── EN ALS ER NIETS OVERBLIJFT ──────────────────────────────────────────────
 *
 * Dan `null`, en het scherm laat de regel weg. Conventie 3: onbekend is een
 * betere waarde dan een verkeerde. De titel en de handeling staan er dan nog
 * steeds, dus de kans blijft te volgen. Een half afgebroken zin zou de klant
 * laten denken dat er iets stuk is.
 *
 * ⚠️ Dit is het vangnet, niet de oplossing (conventie 1). De schrijfopdracht in
 * `lib/pipeline/report.ts` verbiedt de notatie óók, maar een promptinstructie is
 * een intentie en dit is de garantie. Bij de mention-classificatie vulde het
 * model ondanks een expliciete instructie bij 10 van de 27 niet-genoemde merken
 * tóch een rol in; dezelfde soort fout, dezelfde oplossing.
 *
 * Puur, dus testbaar (conventie 2). Geen `server-only`.
 */

/**
 * Een vraagcode zoals het rapport ze nummert: V1, V12, v3. Alleen als los woord,
 * anders sneuvelt "V6-motor" of een modelnaam als "V60" in een merktekst.
 */
const VRAAGCODE = /\bv\d{1,3}\b/i;

/** Ons gewicht, in beide notaties die het model gebruikt: 0,60 en 0.60. */
const GEWICHT = /\bgewicht(en)?\b/i;

/**
 * Splitst op zinseinde. De punt van "0,60." hoort bij de zin ervoor, dus het
 * scheidingsteken blijft aan de linkerkant staan.
 */
function zinnen(tekst: string): string[] {
  return tekst
    .split(/(?<=[.!?])\s+/)
    .map((z) => z.trim())
    .filter((z) => z.length > 0);
}

/**
 * Eén uitzondering op "de hele zin weg": een staartclausule achter een
 * puntkomma.
 *
 * "Combineer acties met een eenvoudige uitleg van kopen, financieren en private
 * lease; dit ondersteunt vooral V2 en ook de keuzevragen V8 en V9." Hier draagt
 * de kop van de zin de hele raad en staat de notatie in het staartje. De zin
 * schrappen zou de enige bruikbare instructie van die aanbeveling weggooien.
 *
 * Alleen bij een puntkomma, bewust niet bij een komma: een puntkomma scheidt in
 * het Nederlands twee zelfstandige zinnen, dus wat ervóór staat blijft een hele
 * zin. Bij een komma is dat lang niet altijd zo.
 */
function knipStaartclausule(zin: string): string {
  const scheiding = zin.indexOf(";");
  if (scheiding === -1) return zin;

  const staart = zin.slice(scheiding + 1);
  if (!VRAAGCODE.test(staart) && !GEWICHT.test(staart)) return zin;

  const kop = zin.slice(0, scheiding).trim();
  // Zit de notatie ook in de kop, dan valt de hele zin hierna alsnog af.
  if (kop.length === 0 || VRAAGCODE.test(kop) || GEWICHT.test(kop)) return zin;

  return /[.!?]$/.test(kop) ? kop : `${kop}.`;
}

/**
 * De toelichting zoals de klant hem mag zien, of `null` als er niets
 * overblijft dat zonder onze notatie te volgen is.
 */
export function leesbaarWaarom(tekst: string | null | undefined): string | null {
  if (!tekst) return null;

  const bruikbaar = zinnen(tekst)
    .map(knipStaartclausule)
    .filter((z) => !VRAAGCODE.test(z) && !GEWICHT.test(z));
  if (bruikbaar.length === 0) return null;

  return bruikbaar.join(" ");
}
