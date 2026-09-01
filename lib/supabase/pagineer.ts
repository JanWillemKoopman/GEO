/**
 * Alle rijen ophalen, en niet de eerste duizend.
 *
 * ── WAAROM DIT BESTAAT (1 september 2026) ───────────────────────────────────
 *
 * Een `select()` zonder bereik geeft standaard maximaal duizend rijen terug, en
 * hij zegt er niets bij. Bij de eerste echte marktmeting (43 bedrijven maal 40
 * antwoorden is 1720 vermeldingen) betekende dat: DBS Installatietechniek werd
 * in een antwoord genoemd, het fragment stond opgeslagen, en op het scherm en in
 * het openbare rapport stond hij op "0 van de 40". De vermelding stond op rij
 * 1652 en viel buiten de eerste duizend.
 *
 * Dat is de ergste soort fout die dit product kan maken: geen storing, geen
 * melding, gewoon een cijfer dat te laag is. Een verkoper vertelt een
 * ondernemer dat hij nul keer genoemd wordt, terwijl ons eigen systeem het
 * tegendeel heeft opgeslagen.
 *
 * Het patroon stond al in `lib/spend-limit.ts`, waar dezelfde grens de
 * kostenrem liet lekken. Deze functie maakt er één plek van, zodat de volgende
 * tabel die over duizend rijen groeit niet opnieuw stil te laag telt.
 *
 * Bewust ZONDER `server-only` en zonder Supabase-import (conventie 2): hij
 * krijgt een functie die een pagina ophaalt, dus `scripts/test-unit.ts` kan hem
 * nalezen met een nagemaakte bron en zonder database.
 */

/** Wat een pagina teruggeeft: precies de vorm van een Supabase-antwoord. */
export interface PaginaAntwoord<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/** De standaardgrens van PostgREST. Hier één keer benoemd, nergens geraden. */
export const PAGINA_GROOTTE = 1000;

/**
 * Roept `haalPagina` net zolang aan tot er een pagina terugkomt die niet vol
 * is, en plakt alles achter elkaar.
 *
 * ⚠️ Een fout wordt gegooid en niet ingeslikt. Een halve lijst is hier erger
 * dan een mislukte taak: een mislukte taak probeert het opnieuw en is zichtbaar,
 * een halve lijst wordt een cijfer waar niemand meer aan twijfelt.
 */
export async function alleRijen<T>(
  haalPagina: (van: number, tot: number) => PromiseLike<PaginaAntwoord<T>>,
  paginaGrootte: number = PAGINA_GROOTTE,
): Promise<T[]> {
  const alles: T[] = [];
  let van = 0;

  for (;;) {
    const { data, error } = await haalPagina(van, van + paginaGrootte - 1);
    if (error) throw new Error(error.message);

    const rijen = data ?? [];
    alles.push(...rijen);

    if (rijen.length < paginaGrootte) return alles;
    van += paginaGrootte;
  }
}
