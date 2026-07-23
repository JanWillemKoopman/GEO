import { z } from "zod";

/**
 * Halte 1 — Brand DNA (abcplan.md §6 A1). Topic-aware; model gpt-4.1-mini.
 * Contract letterlijk uit het plan — niet illustratief.
 */
export const BrandDNA = z.object({
  /** Canonieke merknaam zoals klanten die kennen (bv. "Golden Fingers"), niet het domein. */
  brandName: z.string(),
  industry: z.string(),
  products: z.array(z.string()),
  toneOfVoice: z.string(),
  personas: z.array(
    z.object({
      name: z.string(),
      needs: z.array(z.string()),
    }),
  ),
  valueProps: z.array(z.string()),
  competitors: z.array(z.string()),
  summary: z.string(),
});

export type BrandDNA = z.infer<typeof BrandDNA>;
