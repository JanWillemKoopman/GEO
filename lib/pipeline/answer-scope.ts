/**
 * Hoort dit antwoord van de klant bij deze pagina?
 * (contentronde-gasservice-brabant-1-september-2026.md, verbetering 1)
 *
 * ── WAT ER MIS WAS ──────────────────────────────────────────────────────────
 *
 * De briefing stelt vragen met drie reikwijdtes: `merk`, `analyse` en `pagina`
 * (`briefing-select.ts`). De twee plekken die antwoorden inlezen, `factbase.ts`
 * en `content.ts`, kenden allebei dezelfde regel: merkbreed telt altijd,
 * analyse-breed telt bij deze analyse, en al het andere valt weg. Het
 * commentaar zei erbij dat een pagina-antwoord "daar apart mee gaat", maar dat
 * gebeurde nergens: `fact_requests.content_piece_ids` werd alleen gebruikt om
 * vragen op het scherm te groeperen en om openstaande vragen te tellen.
 *
 * Gemeten in de contentronde van 1 september 2026 (Gasservice Brabant): 9 van
 * de 16 briefingvragen hadden reikwijdte `pagina`, en van de 8 gegeven
 * antwoorden bereikten er 4 de feitenkaart. Het antwoord "Werken jullie
 * momenteel in Tilburg en plaatsen jullie daar hybride warmtepompen: ja" stond
 * als `beantwoord` in de database terwijl de pagina die eruit kwam schreef:
 * "Gasservice Brabant kan daarom momenteel niet als aantoonbare specialist in
 * Tilburg worden aanbevolen."
 *
 * ── DE REGEL, OP ÉÉN PLEK ───────────────────────────────────────────────────
 *
 * Drie lagen, elk met een eigen `return`, net als in `getOwnedProfile`. Een
 * samengestelde voorwaarde met `||` is hier precies zo gevaarlijk: hij bepaalt
 * welk feit een pagina wel en niet mag gebruiken.
 *
 * Bewust ZONDER `server-only` (conventie 2): pure beslissing, testbaar vanuit
 * `scripts/test-unit.ts`.
 */

/** De velden van een `fact_requests`-rij die de reikwijdte bepalen. */
export interface AnswerScopeRow {
  scope: string | null;
  analysis_id: string | null;
  /** De pagina's waaraan de claim-audit deze vraag hing. */
  content_piece_ids?: string[] | null;
}

/**
 * Mag dit antwoord op de feitenkaart van deze pagina staan?
 *
 * `contentPieceIds` is de pagina (of de pagina's) waarvoor de kaart gebouwd
 * wordt. Leeg meegeven betekent: er is nog geen pagina, en dan kan een
 * pagina-antwoord per definitie niet bij de juiste horen. Dat is de veilige
 * kant: liever een feit missen dan het bij de verkeerde pagina zetten, precies
 * de zorg waarvoor de oude regel bestond.
 */
export function answerBelongsHere(
  row: AnswerScopeRow,
  analysisId: string,
  contentPieceIds: readonly string[] = [],
): boolean {
  const scope = (row.scope ?? "").trim();

  // 1. Merkbreed: geldt voor élke analyse en élke pagina van deze klant.
  if (scope === "merk") return true;

  // 2. Analyse-breed: alleen binnen deze analyse.
  if (scope === "analyse") return row.analysis_id === analysisId;

  // 3. Paginagebonden: alleen bij de pagina waaraan de vraag hing.
  if (scope === "pagina") {
    if (contentPieceIds.length === 0) return false;
    const gekoppeld = row.content_piece_ids ?? [];
    return gekoppeld.some((id) => contentPieceIds.includes(id));
  }

  // Onbekende reikwijdte: niet gebruiken. Een nieuwe waarde toevoegen zonder
  // hier na te denken hoort niet stilletjes overal door te lekken.
  return false;
}
