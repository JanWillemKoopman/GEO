/**
 * Een afgekapte bedrijfsnaam in de metatitel herstellen.
 *
 * Het schema staat hoogstens 60 tekens toe (Google kapt daar af), en het model
 * houdt zich daaraan door midden in de naam te stoppen. Gezien bij de nameting
 * van fase 1 (25 september 2026): "Cv-ketel vervangen in Geldrop | Wesley Keeris
 * InstallatieteO", precies 60 tekens. Een halve naam in de zoekresultaten is
 * erger dan een kortere: we houden de hele woorden van de naam die er goed
 * staan en laten de rest weg ("... | Wesley Keeris").
 *
 * Alleen als het stuk na de laatste "|" met het eerste woord van de naam begint;
 * een andere titel blijft onaangeroerd. Puur (conventie 2).
 */
export function heelMetatitel(titel: string, bedrijfsnaam: string): string {
  const scheiding = titel.lastIndexOf("|");
  const naam = bedrijfsnaam.trim();
  if (scheiding < 0 || !naam) return titel;
  const staart = titel.slice(scheiding + 1).trim();
  if (staart.toLowerCase() === naam.toLowerCase()) return titel;
  const woordenNaam = naam.split(/\s+/);
  const woordenStaart = staart.split(/\s+/);
  if (woordenStaart[0]?.toLowerCase() !== woordenNaam[0].toLowerCase()) return titel;
  const heel: string[] = [];
  for (let i = 0; i < woordenStaart.length && i < woordenNaam.length; i++) {
    if (woordenStaart[i].toLowerCase() !== woordenNaam[i].toLowerCase()) break;
    heel.push(woordenNaam[i]);
  }
  if (heel.length === woordenStaart.length) return titel;
  return `${titel.slice(0, scheiding).trimEnd()} | ${heel.join(" ")}`;
}
