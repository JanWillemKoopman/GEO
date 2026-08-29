import "server-only";

/**
 * Stap 5: de vragen die deze markt gaat meten
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 10, het kruis van de twee assen)
 *
 * ── DE VERDELING IS EEN REKENSOM, DE TEKST IS TAALWERK ──────────────────────
 *
 * `lib/sales/intents.ts` bepaalt welke plekken er te vullen zijn: veertig
 * vragen, verdeeld over de intenties, en binnen elke intentie over de vier
 * fases van de klantreis. Het model vult alleen de tekst van die plekken in.
 *
 * Dat is conventie 1 op zijn scherpst. Vraag je een model "verdeel veertig
 * vragen over zes intenties en vier fases", dan krijg je zesendertig vragen, of
 * veertig waarvan er elf over dezelfde intentie gaan. Niet uit slordigheid: het
 * is een telopdracht in een taalgesprek. De kostenraming bij poort 2 en de
 * noemer van elke score hangen aan dat aantal, dus het wordt geteld en niet
 * gevraagd.
 *
 * ── EN DE VRAGEN ZELF ZIJN DE HELE MEETLAT ──────────────────────────────────
 *
 * Wat hier gevraagd wordt, bepaalt wat er gemeten wordt, wat er als kans uit
 * komt en wat er in de mail staat. Vandaar dat het model op één ding gedrukt
 * wordt: schrijf de vraag zoals een echte klant hem stelt. Geen vraag met de
 * naam van een bedrijf erin (dan meet je of de AI die naam herhaalt), en geen
 * vraag met "beste" of "top 10" erin tenzij een klant dat echt zo typt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { SalesMarketQuestions } from "@/lib/schemas/sales";
import { beoordeelBudget, besteedAanMarkt } from "@/lib/sales/budget";
import { verdeelVragen, type Intentie } from "@/lib/sales/intents";
import {
  koppelVragen,
  bouwVragenVraag,
  type GegenereerdeVraag,
} from "@/lib/sales/questions";

type Admin = SupabaseClient;

export interface VragenUitkomst {
  vragen: GegenereerdeVraag[];
  /** Wat er niet gelukt is, in gewone taal. Komt bij poort 2 op het scherm. */
  melding: string | null;
  skipped: boolean;
}

export async function genereerVragen(
  admin: Admin,
  marketId: string,
  intenties: Intentie[],
  aantal: number,
): Promise<VragenUitkomst> {
  const plekken = verdeelVragen(intenties, aantal);
  if (plekken.length === 0) {
    return { vragen: [], melding: "Er zijn geen intenties om vragen over te stellen.", skipped: true };
  }

  const besteed = await besteedAanMarkt(admin, marketId);
  const oordeel = beoordeelBudget(besteed, "questions");
  if (!oordeel.ok) return { vragen: [], melding: oordeel.melding, skipped: true };

  const { data } = await admin
    .from("sales_markets")
    .select("label, industry, location, radius_km")
    .eq("id", marketId)
    .maybeSingle();
  if (!data) throw new Error(`Markt ${marketId} bestaat niet.`);

  const r = await callStructured({
    model: MODELS.quality,
    system:
      "Je schrijft de vragen die echte klanten aan een AI-assistent stellen als ze een " +
      "aanbieder zoeken. Je schrijft ze zoals iemand ze typt: kort, in gewone taal, zonder " +
      "vakjargon. Je noemt nooit een bedrijfsnaam in een vraag. " +
      "Antwoord in het Nederlands.",
    user: bouwVragenVraag(
      {
        label: data.label as string,
        industry: data.industry as string,
        location: data.location as string,
        radius_km: data.radius_km as number,
      },
      intenties,
      plekken,
    ),
    schema: SalesMarketQuestions,
    schemaName: "sales_market_questions",
    webSearch: false,
    work: "analytical",
    meta: { kind: "sales_market_questions", salesMarketId: marketId },
  });

  return { ...koppelVragen(plekken, r.parsed.vragen), skipped: false };
}
