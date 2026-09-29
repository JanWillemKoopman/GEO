/**
 * DE CONTACTGEGEVENS VAN HET BEDRIJF, uit wat het onderzoek van de site oogstte
 * (`profile_facets` met facet `techniek`, veld `facts`).
 *
 * Twee afnemers: de gestructureerde gegevens (V23) en het vaste contactblok in
 * blok A voor de schrijver (V3). In ronde 1 stond in de invoer van de schrijver
 * bij nul van de achttien pagina's een telefoonnummer, terwijl de crawler het
 * wel vond; twee beoordelingen meldden precies dat gemis
 * (`docs/tasks/pijplijnanalyse-contentketen.md`).
 *
 * Het eerste gevonden gegeven per soort wint: de oogst zet de canonieke waarde
 * (homepage en contactpagina) al vooraan (`mergeTextFacts()`).
 *
 * Puur en zonder `server-only` (conventie 2).
 */

export interface Contactgegevens {
  telefoon: string | null;
  email: string | null;
  adres: string | null;
}

export function contactUitFeiten(feiten: readonly { key?: string; value?: string }[]): Contactgegevens {
  const eerste = (sleutel: string) => {
    const f = feiten.find((x) => x?.key === sleutel && typeof x.value === "string" && x.value.trim());
    return f?.value?.trim() ?? null;
  };
  return { telefoon: eerste("telefoon"), email: eerste("email"), adres: eerste("adres") };
}

/** Het contactblok als tekst voor de schrijver, of null als er niets bekend is. */
export function contactBlok(c: Contactgegevens): string | null {
  const regels = [
    c.telefoon ? `- Telefoon: ${c.telefoon}` : null,
    c.email ? `- E-mail: ${c.email}` : null,
    c.adres ? `- Adres: ${c.adres}` : null,
  ].filter(Boolean);
  return regels.length > 0 ? `Contact:\n${regels.join("\n")}` : null;
}
