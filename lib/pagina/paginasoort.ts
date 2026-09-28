/**
 * De soort pagina in woorden, voor de opdracht aan het model. Puur (conventie 2).
 */
import type { ContentType } from "@/lib/types/database";

export const SOORT_LABEL: Record<ContentType, string> = {
  article: "artikel met uitleg",
  faq: "pagina met veelgestelde vragen",
  landing: "dienstpagina",
  comparison: "vergelijkingspagina",
};
