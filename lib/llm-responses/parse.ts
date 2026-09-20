/**
 * De respons van DataForSEO's `gemini/llm_responses/live` uitpakken tot een
 * meetbaar antwoord.
 *
 * ── DE VORM VAN DE RESPONS (nagemeten op 20 september 2026, zie het plan) ───
 *
 * `tasks[0].result[0].items[]` bevat blokken met `type: "message"`. Zo'n blok
 * heeft `sections[]`, elk met `type: "text"` en een `text`-veld; de tekst van
 * het antwoord is de aaneenschakeling daarvan. Een sectie kan `annotations[]`
 * hebben met bronvermeldingen; alleen het AANTAL daarvan is nagemeten
 * (`scripts/probe-dataforseo-ai.ts`, 20 september 2026), de vorm van één
 * annotatie niet, dus deze module telt ze en verzint geen velden erin. De
 * werkelijke kosten staan in `money_spent` op het resultaat, niet (alleen) in
 * `cost` op de taak: dat laatste kan 0 zijn terwijl `money_spent` de echte
 * uitgave toont (nagemeten bij `gemini-3.6-flash`, 20 september 2026).
 *
 * Conventie 2: puur en zonder netwerk, dus regel voor regel testbaar. Een fout
 * hier verlaagt stilletjes de score van een merk doordat een leeg antwoord als
 * "niet genoemd" gelezen wordt in plaats van als niet-meting.
 */
import type { LlmResponseResultaat } from "@/lib/llm-responses/types";
import { MIN_ANTWOORD_TEKENS } from "@/lib/llm-responses/types";

/** DataForSEO's statuscode voor "alles goed". Alle andere zijn een mislukking. */
export const DFS_OK = 20000;

interface DfsSection {
  type?: unknown;
  text?: unknown;
  /** Vorm niet nagemeten, alleen het aantal telt hier mee. */
  annotations?: unknown[] | null;
}

interface DfsItem {
  type?: unknown;
  sections?: DfsSection[] | null;
}

interface DfsResult {
  money_spent?: unknown;
  items?: DfsItem[] | null;
}

interface DfsTask {
  status_code?: unknown;
  status_message?: unknown;
  cost?: unknown;
  result?: DfsResult[] | null;
}

export interface DfsLlmResponse {
  tasks?: DfsTask[] | null;
}

/**
 * Pak één respons uit. Gooit nooit: elke onverwachte vorm wordt een
 * `mislukt`-resultaat, want een uitzondering hier zou een hele meetronde
 * kunnen afbreken op één rare respons.
 */
export function leesLlmResponse(body: unknown): LlmResponseResultaat {
  const leeg = { tekst: "", aantalBronvermeldingen: 0 };

  const response = (body ?? {}) as DfsLlmResponse;
  const taak = response.tasks?.[0];
  if (!taak) {
    return { status: "mislukt", ...leeg, kostenUsd: 0, melding: "geen taak in de respons" };
  }

  // ⚠️ `cost` op de taak is niet altijd de werkelijke uitgave; `money_spent` op
  // het resultaat is dat wel (nagemeten 20 september 2026). Bij een mislukte
  // taak is er geen resultaat en valt dit terug op `cost` (meestal 0 bij een
  // directe statusfout, maar niet aangenomen).
  const taakKosten = typeof taak.cost === "number" ? taak.cost : 0;

  if (taak.status_code !== DFS_OK) {
    const melding =
      typeof taak.status_message === "string" ? taak.status_message : `status ${String(taak.status_code)}`;
    return { status: "mislukt", ...leeg, kostenUsd: taakKosten, melding };
  }

  const resultaat = taak.result?.[0];
  const kostenUsd = typeof resultaat?.money_spent === "number" ? resultaat.money_spent : taakKosten;

  let tekst = "";
  let aantalBronvermeldingen = 0;
  for (const item of resultaat?.items ?? []) {
    if (item?.type !== "message") continue;
    for (const sectie of item.sections ?? []) {
      if (typeof sectie?.text === "string") tekst += sectie.text;
      if (Array.isArray(sectie?.annotations)) aantalBronvermeldingen += sectie.annotations.length;
    }
  }
  tekst = tekst.trim();

  if (tekst.length < MIN_ANTWOORD_TEKENS) {
    return {
      status: "leeg",
      tekst,
      aantalBronvermeldingen,
      kostenUsd,
      melding: `antwoord te kort om een meting te zijn (${tekst.length} tekens)`,
    };
  }

  return { status: "gemeten", tekst, aantalBronvermeldingen, kostenUsd, melding: null };
}
