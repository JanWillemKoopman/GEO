/**
 * Eén plek voor getallen, datums en relatieve tijd (H.60/H.61/H.62).
 *
 * Vóór dit bestand stonden er negentien losse `toLocaleDateString`-aanroepen
 * verspreid over de app, met vier verschillende resultaten voor dezelfde soort
 * datum: "6-8-2026" (geen opties), "6 aug" (kort), "6 augustus" (lang, geen
 * jaar) en "6 augustus 2026" (lang, met jaar). Geen inconsistentie was ooit
 * bewust gekozen, ze ontstonden gewoon één voor één.
 *
 * Twee vaste vormen, niet één: een label in een tabel ("6 aug") en een datum in
 * lopende tekst ("6 augustus 2026") zijn verschillende contexten, en het
 * schrijfstijl-document zelf maakt dat onderscheid ook (kort in een chip, lang
 * in een zin). Wat verdwijnt is de sluipende derde en vierde variant.
 *
 * Bewust ZONDER `server-only`: pure functies, geen database, testbaar vanuit
 * scripts/test-unit.ts.
 */

/** "6 aug", voor tabellen, chips en kaartjes. Geen jaar: de context is altijd recent. */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

/** "6 augustus 2026", voor lopende tekst en waar het jaar ertoe doet. */
export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * "3 dagen geleden" / "vandaag" / "gisteren" (H.62).
 *
 * Val terug op `formatDateLong` zodra het langer dan ~5 weken geleden is: "37
 * dagen geleden" is niet sneller te lezen dan een datum, en "2 maanden
 * geleden" is voor iets dat wél op de dag nauwkeurig gemeten is minder precies
 * dan nodig.
 */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return formatDateLong(iso); // een datum in de toekomst, geen relatieve claim
  if (diffDays === 0) return "vandaag";
  if (diffDays === 1) return "gisteren";
  if (diffDays < 7) return `${diffDays} dagen geleden`;
  if (diffDays < 35) {
    const weken = Math.round(diffDays / 7);
    return weken === 1 ? "1 week geleden" : `${weken} weken geleden`;
  }
  return formatDateLong(iso);
}

/** Nederlandse duizendtalscheiding: 1248 → "1.248". */
export function formatNumber(n: number): string {
  return n.toLocaleString("nl-NL");
}

/**
 * "$1,70": een dollarbedrag in de Nederlandse schrijfwijze, komma als
 * decimaalteken.
 *
 * ── WAAROM DOLLARS EN GEEN EURO'S, EN WAAROM DIT HIER STAAT ─────────────────
 *
 * Voorheen `euro()` in `lib/prompt-mix.ts`, een naam die niet klopte met wat
 * de functie toont: de meetkosten lopen via de OpenAI-rekening en die is in
 * dollars, dus `$0,72` en niet `€0,72`. Verplaatst naar hier op 31 augustus
 * 2026 (punt 9 van docs/tasks/opdracht-bevindingen-5-tot-9.md), toen bleek
 * dat elke plek die een bedrag naar een scherm stuurde zijn EIGEN
 * `.toFixed(2)` deed: op het scherm "Verdeling aanpassen" stond in één zin
 * "ongeveer $1.70 per maand" met een punt naast "±10,7 punten" met een komma.
 * Twee schrijfwijzen voor een getal in dezelfde zin is precies wat een klant
 * opvalt, ook als hij niet kan zeggen waarom de tekst onzorgvuldig aanvoelt.
 *
 * ⚠️ Alleen voor bedragen die de klant of de beheerder op een scherm ziet.
 * Bedragen in `console.warn`/`console.error`-logregels blijven met een punt:
 * die zijn voor de ontwikkelaar, en daar is een punt gebruikelijker.
 */
export function formatUsd(usd: number): string {
  return `$${usd.toFixed(2).replace(".", ",")}`;
}

/**
 * Enkelvoud of meervoud, op basis van het aantal. Eén hulpstuk in plaats van
 * een losse `aantal === 1 ? "..." : "..."` op elke plek waar een getal een
 * woord meesleept.
 *
 * Die keuze stond al los uitgeschreven op minstens drie plekken (bijvoorbeeld
 * `restWachtrij === 1 ? "punt" : "punten"` in `app/(app)/merk/[id]/page.tsx`),
 * en op twee ervan verkeerd: een letterlijke haakjesvorm "punt(en)" in de
 * klanttekst van het briefingscherm, en dezelfde vorm bij "gegeven(s)" en
 * "bewering(en)" in de reputatiesamenvatting en de redactienotitie (punt 9
 * van docs/tasks/opdracht-bevindingen-5-tot-9.md). Die vorm hoort nooit in
 * tekst die een klant leest: het is notatie, geen lopende zin.
 */
export function enkelOfMeervoud(aantal: number, enkelvoud: string, meervoud: string): string {
  return aantal === 1 ? enkelvoud : meervoud;
}
