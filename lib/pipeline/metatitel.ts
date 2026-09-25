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

/** Google toont hoogstens zoveel tekens van de beschrijving; het schema staat er niet meer toe. */
export const MAX_METABESCHRIJVING = 160;

/**
 * Een afgekapte metabeschrijving herstellen, met hetzelfde idee als de titel.
 *
 * Gezien bij de nameting van fase 1 (25 september 2026), precies 160 tekens:
 * "... de kosten van het aangeboden onderhoudscontract bij Wesley Keeris
 * Installatietechnh". Het model stopt midden in een woord en zet er een rare
 * letter achter. Een beschrijving die op een halve naam eindigt, staat zo in
 * de zoekresultaten.
 *
 * Eindigt hij op een leesteken, dan is hij af en blijft hij staan. Anders:
 * eindigt hij op een deel van de bedrijfsnaam, dan komt de hele naam terug als
 * die past, en anders alleen de hele woorden ervan. Staat hij tegen de grens
 * zonder naam aan het eind, dan valt het laatste (afgekapte) woord weg. Er komt
 * een punt achter. Puur (conventie 2).
 */
export function heelMetabeschrijving(tekst: string, bedrijfsnaam: string): string {
  const t = tekst.trim();
  if (!t || /[.!?…)"”']$/.test(t)) return tekst;
  const af = (s: string) => `${s.replace(/[\s,;:|-]+$/, "")}.`;

  const naam = bedrijfsnaam.trim();
  const woordenNaam = naam ? naam.split(/\s+/) : [];
  const woorden = t.split(/\s+/);
  if (woordenNaam.length > 0) {
    // Waar begint de naam in de laatste woorden? Zoek het eerste naamwoord vanaf achteren.
    for (let begin = Math.max(0, woorden.length - woordenNaam.length); begin < woorden.length; begin++) {
      if (woorden[begin].toLowerCase() !== woordenNaam[0].toLowerCase()) continue;
      const staart = woorden.slice(begin);
      const heel: string[] = [];
      for (let i = 0; i < staart.length && i < woordenNaam.length; i++) {
        if (staart[i].toLowerCase() !== woordenNaam[i].toLowerCase()) break;
        heel.push(woordenNaam[i]);
      }
      if (heel.length === woordenNaam.length && heel.length === staart.length) return af(t);
      const ervoor = woorden.slice(0, begin).join(" ");
      const volledig = `${ervoor} ${naam}.`;
      if (volledig.length <= MAX_METABESCHRIJVING) return volledig;
      return af(`${ervoor} ${heel.join(" ")}`);
    }
  }
  // Geen naam aan het eind. Staat hij tegen de grens, dan is het laatste woord afgekapt.
  if (t.length >= MAX_METABESCHRIJVING - 2 && woorden.length > 1) return af(woorden.slice(0, -1).join(" "));
  return t.length < MAX_METABESCHRIJVING ? af(t) : tekst;
}
