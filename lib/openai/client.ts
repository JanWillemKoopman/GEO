import "server-only";

/**
 * Officiële OpenAI Node-SDK, één gedeelde instance (abcplan.md §2).
 * Server-only: de API-key mag nooit naar de browser.
 */
import OpenAI from "openai";
import { serverEnv } from "@/lib/env";

let cached: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!cached) {
    cached = new OpenAI({ apiKey: serverEnv.openaiApiKey });
  }
  return cached;
}
