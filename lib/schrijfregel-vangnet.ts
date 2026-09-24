/**
 * Het vangnet onder de schrijfregels voor tekst die rechtstreeks uit een model
 * naar de klant gaat (`docs/schrijfstijl.md` §10, conventie 1).
 *
 * Gevonden in de kwaliteitsdoorlichting (punt 37, 24 september 2026): een vraag
 * aan de rijschool eindigde op "faalangst, ADD, ADHD" met "en" en "of" en een
 * schuine streep ertussen voor "autisme". De prompts verbieden dat, maar een
 * verbod in een prompt is een intentie; dit is de garantie.
 *
 * Bewust smal:
 *  - "en" + schuine streep + "of" wordt "of" (de lezer kiest toch één van
 *    beide, en "of" sluit "beide" in het Nederlands niet uit);
 *  - een kastlijntje MET spaties eromheen wordt een komma. Een bereik zonder
 *    spaties ("5–8 lessen", "§2–§3") is notatie en blijft staan, precies de
 *    uitzondering uit §10.
 *
 * Bewust ZONDER `server-only`: testbaar vanuit `scripts/test-unit.ts`.
 */
export function pasSchrijfregelsToe(tekst: string): string {
  return tekst
    .replace(/\ben\s*\/\s*of\b/gi, "of")
    .replace(/\s+[—–]\s+/g, ", ")
    .replace(/,\s*,/g, ",");
}
