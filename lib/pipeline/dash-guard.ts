/**
 * Gedachtestreepjes uit tekst die de klant ziet (herstelplan na audit, T8.8).
 *
 * `docs/schrijfstijl.md` §10 verbiedt `—` en `–` in lopende tekst, met vier
 * uitzonderingen (koppeltekens in samenstellingen, paden/breuken, en
 * getalbereiken zoals "5–8 onderwerpen"). De schrijfprompt draagt het model al
 * op om ze weg te laten (regel 9), maar dat is een belofte en geen garantie
 * (conventie 1): een concurrentnaam weghalen (`redactCompetitors`) kan een
 * gedachtestreepje uit de ORIGINELE zin van het model onaangeroerd laten staan.
 *
 * Gemeten op productie: een briefingvraag las "...met argumenten als 'een
 * andere aanbieder – Noordwijkerhout — heeft een speciale angsttandarts'...".
 * De naam was weg, de streepjes en de plaatsnaam niet: een onleesbare zin mét
 * precies het leesteken dat richtlijn 10 verbiedt.
 *
 * ── DE HEURISTIEK ────────────────────────────────────────────────────────────
 *
 * Vervangt alleen een streepje MET SPATIES ERomheen (" — " of " – "): dat is de
 * bijzin-vorm die richtlijn 10 verbiedt. Een getalbereik heeft nooit spaties om
 * het streepje ("5–8", niet "5 – 8"), dus die blijft met opzet ongemoeid.
 *
 * ⚠️ Alleen HORIZONTALE witruimte (spatie/tab) collabeert, nooit `\s` in het
 * algemeen: dat matcht ook regeleinden, en dit draait op de hele pagina inclusief
 * de lege regels tussen alinea's en koppen. Een bevinding uit de ketentest: met
 * `\s` verdwenen alle `\n\n` uit `body_markdown`, waarna `splitSections()` geen
 * enkele `### kop` meer herkende (die staat aan het begin van een regel).
 */
export function stripProseDashes(text: string): string {
  if (!text) return text;
  return text
    .replace(/[ \t]+[—–][ \t]+/g, ", ")
    // Twee bijzinnen na elkaar geknipt kan een dubbele komma opleveren
    // ("iets, , heeft"); dat trekken we recht.
    .replace(/,[ \t]*,/g, ",")
    .replace(/[ \t]+([,.;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
