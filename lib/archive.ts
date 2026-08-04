/**
 * Wat is er zichtbaar in de app, en wat ligt er alleen nog in de database?
 * (migratie 0044)
 *
 * ── WAAROM DIT ÉÉN PLEK IS ──────────────────────────────────────────────────
 *
 * Er zijn zes query's die merken of analyses opsommen: de merkenlijst, de
 * analysenlijst, de telling die bepaalt of "+ Nieuwe analyse" verschijnt, het
 * werkmodel, de maandelijkse meetronde en de herinneringsmail. Vergeet je het
 * filter op één daarvan, dan verschijnt een gearchiveerd merk daar alsnog — en
 * bij de meetronde kost dat bovendien geld.
 *
 * Eén functie die de kolomnaam kent, en zes aanroepplekken die hem gebruiken.
 * Zo is "wat telt als actief" één beslissing in plaats van zes.
 *
 * ── ARCHIVEREN IS GEEN RECHTENKWESTIE ───────────────────────────────────────
 *
 * Dit staat bewust NIET in de RLS-policies. Een gearchiveerd merk hoort voor de
 * eigenaar bereikbaar te blijven via zijn directe URL — het is een back-up, geen
 * verwijdering. Alleen de lijsten en tellingen laten hem weg.
 */

/**
 * Voegt `archived_at is null` toe aan een Supabase-query.
 *
 * Getypeerd als een doorgeefluik: de query komt eruit zoals hij erin ging, met
 * één filter erbij. Dat houdt de aanroepplek leesbaar —
 * `activeOnly(db.from("analyses").select("*"))` zegt precies wat het doet.
 */
export function activeOnly<T extends { is(column: string, value: null): T }>(
  query: T,
): T {
  return query.is("archived_at", null);
}

/** Is deze rij zichtbaar in de app? Voor filteren in geheugen. */
export function isActive(row: { archived_at?: string | null }): boolean {
  return !row.archived_at;
}
