/**
 * Typen van de schrijfingang die ook een pure module nodig heeft
 * (`indeling.ts`), zonder `server-only` van `vastleggen.ts` mee te trekken.
 */
import type { Klantkennis } from "@/lib/types/database";

/** Wat de indeling van een sitefeit oplevert (K8 deel 2, besluit V18). */
export interface Indeling {
  domein: Klantkennis["domein"];
  soort: string;
  waarde: unknown | null;
  bewijskracht: Klantkennis["bewijskracht"];
  geldtVoor: string[];
  /** De uitvoer van de indeling, bewaard in `ruw.indeling` (conventie 8). */
  ruw: unknown;
}
