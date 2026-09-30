/**
 * De grenzen van een handmatige upload, op een eigen plek zodat het scherm ze kan
 * lezen zonder de controle (`upload-verify.ts`) in de browser te laden.
 */

/** Zoals het merkdossier (`MAX_DOCUMENT_CHARS`) maar ruimer: een brochure is langer dan een tarievenpagina. */
export const MAX_UPLOAD_CHARS = 30_000;
/** Daaronder valt er geen gegeven uit te halen. */
export const MIN_UPLOAD_CHARS = 40;
/** Een serverless functie op Vercel weigert een verzoek boven 4,5 MB al voordat onze code draait. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
