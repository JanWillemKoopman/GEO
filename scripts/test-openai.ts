/**
 * Sprint 1 rooktest (abcplan.md §11.1): verifieert dat beide modellen werken met
 * structured output, en dat de web_search-tool draait.
 *
 * Draaien:
 *   1. Zet OPENAI_API_KEY (+ optioneel OPENAI_MODEL_VOLUME/QUALITY) in .env.local
 *   2. npm run test:openai
 *
 * ⚠️ Dit maakt ECHTE, betaalde OpenAI-calls (incl. één web_search-call). Klein
 * bedrag (paar cent), maar het is geen mock.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import OpenAI from "openai";

// .env.local heeft voorrang op .env (zoals Next.js dat ook doet).
loadEnv({ path: ".env.local", override: true });

// Bron van waarheid: lib/openai/models.ts (hier bewust gedupliceerd zodat het
// script standalone draait zonder tsconfig-path-resolutie).
const VOLUME = "gpt-4.1-nano";
const QUALITY = "gpt-4.1-mini";

function assertKey() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY ontbreekt. Zet 'm in .env.local en probeer opnieuw.");
    process.exit(1);
  }
}

const Ping = z.object({
  ok: z.boolean(),
  echo: z.string(),
});

async function testStructured(client: OpenAI, model: string) {
  const res = await client.responses.parse({
    model,
    input: [
      { role: "system", content: "Je antwoordt uitsluitend in het gevraagde JSON-schema." },
      { role: "user", content: 'Zet ok op true en echo op de tekst "GEO".' },
    ],
    text: { format: zodTextFormat(Ping, "ping") },
  });
  const parsed = res.output_parsed;
  if (!parsed?.ok || parsed.echo !== "GEO") {
    throw new Error(`onverwachte output: ${JSON.stringify(parsed)}`);
  }
  console.log(`✅ structured output werkt op ${model} → ${JSON.stringify(parsed)}`);
}

async function testWebSearch(client: OpenAI, model: string) {
  const res = await client.responses.create({
    model,
    input: "Noem in één zin wat OpenAI is. Gebruik web search.",
    tools: [{ type: "web_search_preview" }],
  });
  const text = res.output_text?.trim();
  if (!text) throw new Error("web_search gaf geen tekst terug");
  console.log(`✅ web_search werkt op ${model} → "${text.slice(0, 80)}…"`);
}

async function main() {
  assertKey();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log("── GEO Tracker · OpenAI rooktest ─────────────────────────");
  console.log(`   volume-model : ${VOLUME}`);
  console.log(`   quality-model: ${QUALITY}\n`);

  await testStructured(client, VOLUME);
  await testStructured(client, QUALITY);
  await testWebSearch(client, VOLUME);

  console.log("\n🎉 Alle checks geslaagd — de pipeline-fundamenten werken.");
}

main().catch((err) => {
  console.error("\n❌ Rooktest mislukt:", err instanceof Error ? err.message : err);
  console.error(
    "\nTip: controleer de modelnamen en of de web_search-tool op jouw account/SDK-versie " +
      "'web_search_preview' heet (anders 'web_search' — zie lib/openai/structured.ts).",
  );
  process.exit(1);
});
