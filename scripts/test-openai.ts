/**
 * Sprint 1 rooktest (abcplan.md §11.1): verifieert dat beide modellen werken met
 * structured output, dat de web_search-tool draait, en, sinds de overstap naar
 * GPT-5.6. Dat de parametercombinaties die de pijplijn verstuurt daadwerkelijk
 * geaccepteerd worden.
 *
 * Draaien:
 *   1. Zet OPENAI_API_KEY in .env.local
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
// script standalone draait zonder tsconfig-path-resolutie). `volume` en
// `quality` wijzen sinds GPT-5.6 naar hetzelfde model; het verschil zit in de
// redeneerinspanning, en die testen we hieronder apart.
const LUNA = "gpt-5.6-luna";
const SOL = "gpt-5.6-sol";

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

/**
 * Eén structured-output-call met exact de parameters die `resolveTuning()` voor
 * dit soort werk oplevert. De cast op `reasoning` is dezelfde als in
 * lib/openai/structured.ts: de vastgezette SDK kent `none` nog niet als
 * effort-waarde, de API wel.
 */
async function testStructured(
  client: OpenAI,
  model: string,
  tuning: { label: string; effort: string; temperature?: number },
) {
  const res = await client.responses.parse({
    model,
    input: [
      { role: "system", content: "Je antwoordt uitsluitend in het gevraagde JSON-schema." },
      { role: "user", content: 'Zet ok op true en echo op de tekst "GEO".' },
    ],
    temperature: tuning.temperature,
    reasoning: { effort: tuning.effort } as unknown as OpenAI.Reasoning,
    text: { format: zodTextFormat(Ping, "ping") },
  });
  const parsed = res.output_parsed;
  if (!parsed?.ok || parsed.echo !== "GEO") {
    throw new Error(`onverwachte output: ${JSON.stringify(parsed)}`);
  }
  console.log(`✅ ${tuning.label} werkt op ${model} → ${JSON.stringify(parsed)}`);
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

  console.log("── ORBIT ENGINE · OpenAI rooktest ─────────────────────────────");
  console.log(`   volume/quality-model: ${LUNA}`);
  console.log(`   content-model       : ${SOL}\n`);

  // De combinatie die het meest kan breken: temperatuur mag alleen mee bij
  // effort `none`. Faalt dit met een unsupported-parameter-fout, dan valt de app
  // in productie terug op géén temperatuur (het vangnet in
  // lib/openai/structured.ts), maar dan wil je dat hier zien, niet daar.
  await testStructured(client, LUNA, {
    label: "structured output (deterministic: effort none + temp 0)",
    effort: "none",
    temperature: 0,
  });
  await testStructured(client, LUNA, {
    label: "structured output (analytical: effort low)",
    effort: "low",
  });
  await testStructured(client, SOL, {
    label: "structured output (content: effort high)",
    effort: "high",
  });
  await testWebSearch(client, LUNA);

  console.log("\n🎉 Alle checks geslaagd. De pipeline-fundamenten werken.");
}

main().catch((err) => {
  console.error("\n❌ Rooktest mislukt:", err instanceof Error ? err.message : err);
  console.error(
    "\nTip: controleer de modelnamen, of de web_search-tool op jouw account/SDK-versie " +
      "'web_search_preview' heet (anders 'web_search', zie lib/openai/structured.ts), " +
      "en of `temperature` bij effort `none` nog geaccepteerd wordt.",
  );
  process.exit(1);
});
