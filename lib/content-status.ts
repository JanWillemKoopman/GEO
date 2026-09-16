/**
 * De statustaal van een contentpagina, in klanttaal. Eén plek, want de
 * bibliotheek (`library-view.tsx`) en het clusterdossier (`_chapters/inhoud.tsx`)
 * lieten tot 16 september 2026 elk hun eigen vertaling van `content_pieces.status`
 * zien; een pagina die daar "Concept" heette en hier iets anders zou hetzelfde
 * feit met twee gezichten tonen (CLAUDE.md: "één feit heeft één eigenaar").
 */
export const STATUS_LABEL: Record<string, string> = {
  briefing: "Wacht op jouw input",
  draft: "Concept",
  ready: "Klaar om te publiceren",
  published: "Staat live",
  archived: "Gearchiveerd",
};

export const STATUS_CHIP: Record<string, string> = {
  briefing: "chip chip-warning",
  draft: "chip chip-neutral",
  ready: "chip chip-info",
  published: "chip chip-success",
  archived: "chip chip-neutral",
};
