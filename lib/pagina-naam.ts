/**
 * EÉN NAAM PER PAGINA (`docs/tasks/contentflow-een-lijn.md` §4.6a, uitgangspunt 1).
 *
 * Op 23 september 2026 had één pagina van Van den Udenhout drie namen: de
 * actiebalk toonde de opdracht ("Maak één duidelijke pagina over de all-in
 * maandprijs..."), de bibliotheek de zoektitel met merknaam ("Bedrijfswagen
 * leasen vanaf € 359 p/m | Van den Udenhout"), het canvas weer de opdracht.
 *
 * De regel:
 *   • is er een paginatitel die het model schreef (`meta_title`), dan is dat de
 *     naam, zonder het merk-achtervoegsel na de laatste " | ": op een scherm
 *     binnen dít merk zegt die merknaam niets;
 *   • anders de titel van de aanbeveling, zoals hij is.
 *
 * ⚠️ Bewust geen herschrijving van de opdracht naar een kop ("Maak van de
 * werkplaatsplanner een pagina voor bedrijfswagenparken" wordt met een
 * vuistregel "Bedrijfswagenparken"). Een verkeerde naam is erger dan een
 * lange (conventie 3); de opdracht is tot het schrijven de eerlijkste naam.
 *
 * Puur (conventie 2).
 */
export function paginaNaam(p: { title: string; meta_title?: string | null }): string {
  const meta = p.meta_title?.trim();
  if (meta) {
    const deel = meta.lastIndexOf(" | ");
    const zonderMerk = deel > 0 ? meta.slice(0, deel).trim() : meta;
    if (zonderMerk) return zonderMerk;
  }
  return p.title.trim() || "Pagina zonder titel";
}
