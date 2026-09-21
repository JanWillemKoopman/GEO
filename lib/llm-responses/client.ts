import "server-only";

/**
 * De aanroep naar DataForSEO's `gemini/llm_responses/live`, met de herkansing
 * erin. Zelfde opzet als `lib/ai-overview/client.ts`, andere endpoint.
 *
 * ── HET VERSCHIL MET DE CHATGPT-KANT, BEWUST NIET GLADGESTREKEN ─────────────
 *
 * Gemini kent geen `web_search_country_iso_code` en geen `force_web_search`
 * (hoofdstuk 3.1 van het plan, tegen de documentatie van 20 september 2026
 * nagelezen). Ze meesturen zou een fout op de hele taak opleveren. Bij ChatGPT
 * zou dat verschil wél gelden, maar deze bron bestaat alleen voor Gemini.
 */
import { llmResponseCredentials } from "@/lib/llm-responses/registry";
import { leesLlmResponse } from "@/lib/llm-responses/parse";
import {
  LLM_RESPONSE_GEMINI_MODEL,
  LLM_RESPONSE_POGINGEN,
  type LlmResponseResultaat,
} from "@/lib/llm-responses/types";

const ENDPOINT = "https://api.dataforseo.com/v3/ai_optimization/gemini/llm_responses/live";

/** Een respons die er niet komt binnen deze tijd is een mislukking, geen hangende meting. */
const TIMEOUT_MS = 120_000;

const MAX_OUTPUT_TOKENS = 2048;

/**
 * Haal één Gemini-antwoord op voor één vraag.
 *
 * Gooit niet bij een mislukte aanroep: de uitkomst is dan `mislukt`, met de
 * kosten erbij. De aanroeper beslist wat dat betekent. Alleen een ontbrekende
 * schakelaar of sleutel is een programmeerfout en gooit wel.
 */
export async function haalLlmResponse(vraag: string, systeem: string): Promise<LlmResponseResultaat> {
  const creds = llmResponseCredentials();
  if (!creds) {
    throw new Error(
      "Gemini-via-DataForSEO-bron is niet beschikbaar: zet DATAFORSEO_LLM_ENABLED=true en zorg voor " +
        "DATAFORSEO_LOGIN en DATAFORSEO_PASSWORD.",
    );
  }

  const auth = Buffer.from(`${creds.login}:${creds.password}`).toString("base64");
  const body = JSON.stringify([
    {
      user_prompt: vraag,
      model_name: LLM_RESPONSE_GEMINI_MODEL,
      system_message: systeem,
      web_search: true,
      max_output_tokens: MAX_OUTPUT_TOKENS,
    },
  ]);

  let laatste: LlmResponseResultaat = {
    status: "mislukt",
    tekst: "",
    aantalBronvermeldingen: 0,
    kostenUsd: 0,
    melding: "geen poging gedaan",
  };

  for (let poging = 1; poging <= LLM_RESPONSE_POGINGEN; poging++) {
    const uitkomst = await eenPoging(auth, body);

    // Zelfde regel als bij AI Overview: de kosten van een mislukte poging
    // tellen op bij die van de volgende, want een herkansing is niet gratis.
    const kostenTotaal = laatste.kostenUsd + uitkomst.kostenUsd;
    laatste = { ...uitkomst, kostenUsd: kostenTotaal };

    // Alleen een echte mislukking verdient een herkansing. "Leeg" is een
    // antwoord dat DataForSEO daadwerkelijk teruggaf, en dat wordt bij een
    // tweede poging niet vanzelf anders (het kán, maar dan is het een nieuwe
    // meting en geen herkansing van dezelfde).
    if (uitkomst.status !== "mislukt") return laatste;

    if (poging < LLM_RESPONSE_POGINGEN) {
      console.warn(
        `Gemini-via-DataForSEO poging ${poging} mislukt (${uitkomst.melding ?? "onbekend"}), nog één keer proberen.`,
      );
    }
  }

  return laatste;
}

async function eenPoging(auth: string, body: string): Promise<LlmResponseResultaat> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        status: "mislukt",
        tekst: "",
        aantalBronvermeldingen: 0,
        kostenUsd: 0,
        melding: `HTTP ${res.status}`,
      };
    }

    return leesLlmResponse(await res.json());
  } catch (err) {
    return {
      status: "mislukt",
      tekst: "",
      aantalBronvermeldingen: 0,
      kostenUsd: 0,
      melding: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}
