import "server-only";

/**
 * Leest de canonieke merknaam uit de opgeslagen ruwe Brand-DNA-output (§5).
 * We bewaren geen aparte kolom (geen migratie nodig): de merknaam zit in
 * `raw_json.output_parsed.brandName`. Defensief — bij een oude analyse zonder
 * dit veld geeft 'ie null terug (aanroepers vallen dan terug op het domein).
 */
export function brandNameFromRawJson(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = (raw as { output_parsed?: { brandName?: unknown } }).output_parsed;
  const name = parsed?.brandName;
  return typeof name === "string" && name.trim().length > 0 ? name.trim() : null;
}
