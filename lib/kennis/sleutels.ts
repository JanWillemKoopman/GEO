/**
 * DE ONTDUBBELSLEUTELS OPNIEUW UITREKENEN, na een wijziging van
 * `kennisSleutel()` (besluit V19, 26 september 2026). Hier en niet in het
 * script, omdat alleen `lib/kennis/` in de kennislaag schrijft (§4 regel 3);
 * `scripts/kennis-sleutels-herberekenen.ts` voert het uit.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { kennisSleutel } from "@/lib/kennis/samenvoegen";

export const SLEUTELS_EXPORT_SQL = `select coalesce(jsonb_agg(jsonb_build_object(
  'id', id, 'domein', domein, 'soort', soort, 'bewering', bewering,
  'analysis_id', analysis_id, 'content_piece_id', content_piece_id, 'sleutel', sleutel)), '[]') as rijen
from public.klantkennis where sleutel is not null;`;

export interface SleutelRij {
  id: string;
  domein: string;
  soort: string | null;
  bewering: string;
  analysis_id: string | null;
  content_piece_id: string | null;
  sleutel: string;
}

function sqlTekst(t: string): string {
  return `'${t.replace(/'/g, "''")}'`;
}

export function sleutelUpdateSql(rijen: readonly SleutelRij[]): { sql: string; aantal: number } {
  const anders = rijen
    .map((r) => ({ id: r.id, nieuw: kennisSleutel(r) }))
    .filter((r, i) => r.nieuw && r.nieuw !== rijen[i].sleutel);
  if (anders.length === 0) return { sql: "", aantal: 0 };
  const waarden = anders.map((r) => `(${sqlTekst(r.id)}::uuid, ${sqlTekst(r.nieuw!)})`).join(",\n  ");
  return {
    aantal: anders.length,
    sql: `update public.klantkennis k set sleutel = v.sleutel, updated_at = now()\nfrom (values\n  ${waarden}\n) as v(id, sleutel)\nwhere k.id = v.id;`,
  };
}
