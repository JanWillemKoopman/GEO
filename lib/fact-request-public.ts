/**
 * Wat het scherm van een feitenvraag mag zien (herstelplan na audit, T8.9).
 *
 * `fact_requests.raw_json` is getypeerd als een klein herkomst-object
 * (`{ bron?: string }`, zie `FactRequest` in lib/types/database.ts), maar
 * bevat in werkelijkheid het complete ruwe antwoord van OpenAI, inclusief het
 * antwoord-id: conventie 8 laat elke AI-call zijn volledige ruwe JSON bewaren
 * voor de audit-trail. Dat hoort de browser nooit te bereiken.
 *
 * Twee plekken stuurden de rij ongefilterd door: `PATCH
 * /api/profiles/[id]/facts` (`.select("*")` in de respons) en de "Werk"-tab
 * van een cluster, die `fact_requests.select("*")` als prop aan een
 * client-component gaf. Elders in de app wordt hetzelfde soort kolom al bewust
 * bij naam geselecteerd in plaats van met `*` (`instellingen/page.tsx`,
 * `analytics/page.tsx`); deze twee plekken deden dat nog niet.
 *
 * Puur, dus zonder `server-only`: bruikbaar vanuit zowel een API-route als een
 * server component, en testbaar vanuit scripts/test-unit.ts (conventie 2).
 */
import type { FactRequest } from "@/lib/types/database";

export function publicFactRequest(row: Record<string, unknown>): FactRequest {
  const { raw_json: _rawJson, section_id: _sectionId, section_refs: _sectionRefs, ...rest } = row;
  return rest as unknown as FactRequest;
}
