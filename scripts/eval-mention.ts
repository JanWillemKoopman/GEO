/**
 * Evaluatie van de mention-classificatie (optimalisatie.md 0.7).
 *
 * WAAROM DIT BESTAAT: het bepalen van "wordt dit merk genoemd, op welke plek,
 * met welke toon" is het fundament onder élk cijfer in de app, de score, de
 * gap-analyse, de aanbevelingen, de content die daaruit volgt. Dat werk draaide
 * op het goedkoopste model zonder dat iemand ooit gemeten heeft of het klopt.
 * Een systematische fout daar corrumpeert stil het hele product.
 *
 * Draaien:
 *   npm run eval:mention              # test het productiemodel (gpt-5.6-luna)
 *   npm run eval:mention -- --compare # vergelijkt Luna tegen Terra
 *
 * ⚠️ Dit maakt ECHTE, betaalde OpenAI-calls. Met de startset (15 gevallen) is
 * dat een fractie van een cent op Luna; met --compare loopt dat op, want Terra
 * kost tienmaal zoveel per token.
 *
 * De testset staat in scripts/mention-goldenset.json en is bewust klein en
 * met de hand geschreven rond bekende faalpatronen. Vul hem aan met echte
 * antwoorden uit tracking_runs.raw_response, zie de _readme in dat bestand.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { Mention } from "../lib/schemas/mention";
import { MENTION_SYSTEM, buildMentionUser } from "../lib/openai/mention-prompt";

loadEnv({ path: ".env.local", override: true });

// Bron van waarheid: lib/openai/models.ts. Hier als losse constanten zodat het
// script standalone draait zonder padalias-resolutie (zelfde keuze als
// scripts/test-openai.ts). De PROMPT wordt wél geïmporteerd. Die mag nooit
// afwijken van productie, anders test je iets anders dan er draait.
const PRODUCTION_MODEL = "gpt-5.6-luna";
// De naasthogere tier van dezelfde generatie. Was `gpt-4.1-mini` toen productie
// nog op nano draaide; nu volume én quality op Luna staan, is Terra het model
// waar je naartoe zou wijken als de classificatie tekortschiet.
const COMPARISON_MODEL = "gpt-5.6-terra";

// Precies zoals productie deze call verstuurt (WORK.deterministic in
// lib/openai/sampling.ts): geen redeneertijd, temperatuur 0. Meet je met andere
// instellingen, dan meet je niet wat er draait.
const EFFORT = "none";
const TEMPERATURE = 0;

interface ExpectedEntity {
  /** "own" voor het eigen merk, anders de exacte concurrentnaam. */
  entity: string;
  mentioned: boolean;
  position?: number;
  role?: "eerste_aanbeveling" | "een_van_meerdere" | "zijdelings" | null;
}

interface GoldenCase {
  id: string;
  why: string;
  ownLabel: string;
  ownAliases: string[];
  answer: string;
  expect: ExpectedEntity[];
}

interface Mismatch {
  caseId: string;
  entity: string;
  field: string;
  expected: unknown;
  actual: unknown;
}

function loadCases(): GoldenCase[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(join(here, "mention-goldenset.json"), "utf8");
  return (JSON.parse(raw) as { cases: GoldenCase[] }).cases;
}

/**
 * Zoekt het oordeel over één verwachte entiteit terug in de modeluitvoer.
 * "own" matcht op de isOwnBrand-vlag; een concurrent op naam (los van
 * hoofdletters en spaties, want daar draait deze test niet om).
 */
function findActual(
  mentions: { entity: string; isOwnBrand: boolean; mentioned: boolean; position: number | null; role: string | null }[],
  expected: ExpectedEntity,
) {
  if (expected.entity === "own") {
    // Meerdere eigen-merk-rijen: pas dezelfde samenvoegregel toe als de pijplijn
    // (measure.ts, optimalisatie.md 0.3), genoemd wint van niet-genoemd.
    const own = mentions.filter((m) => m.isOwnBrand);
    if (own.length === 0) return null;
    return own.find((m) => m.mentioned) ?? own[0];
  }
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  return mentions.find((m) => norm(m.entity) === norm(expected.entity)) ?? null;
}

async function runModel(model: string, cases: GoldenCase[]): Promise<{
  checks: number;
  correct: number;
  mismatches: Mismatch[];
  errors: string[];
}> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 3 });
  const mismatches: Mismatch[] = [];
  const errors: string[] = [];
  let checks = 0;
  let correct = 0;

  for (const c of cases) {
    let parsed;
    try {
      const response = await openai.responses.parse({
        model,
        input: [
          { role: "system", content: MENTION_SYSTEM },
          {
            role: "user",
            content: buildMentionUser({
              ownLabel: c.ownLabel,
              ownAliases: c.ownAliases,
              rawResponse: c.answer,
            }),
          },
        ],
        temperature: TEMPERATURE,
        // Cast zoals in lib/openai/structured.ts: de vastgezette SDK kent
        // `none` nog niet als effort-waarde, de API wel.
        reasoning: { effort: EFFORT } as unknown as OpenAI.Reasoning,
        text: { format: zodTextFormat(Mention, "mention") },
      });
      parsed = response.output_parsed;
    } catch (err) {
      errors.push(`${c.id}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    if (!parsed) {
      errors.push(`${c.id}: geen geldige uitvoer`);
      continue;
    }

    for (const exp of c.expect) {
      const actual = findActual(parsed.mentions, exp);

      // Ontbrekende entiteit is zelf een fout. Sinds migratie 0026 ontdekt de
      // prompt puur, dus de testset verwacht alleen nog het eigen merk (altijd)
      // en merken die ECHT in het antwoord staan. Precies wat er terug moet komen.
      if (!actual) {
        checks++;
        mismatches.push({ caseId: c.id, entity: exp.entity, field: "aanwezig", expected: true, actual: false });
        continue;
      }

      checks++;
      if (actual.mentioned === exp.mentioned) correct++;
      else
        mismatches.push({
          caseId: c.id,
          entity: exp.entity,
          field: "mentioned",
          expected: exp.mentioned,
          actual: actual.mentioned,
        });

      // Positie en rol alleen controleren waar de testset ze vastlegt:
      // niet elk geval heeft een eenduidig juist antwoord op die velden.
      if (exp.position !== undefined) {
        checks++;
        if (actual.position === exp.position) correct++;
        else
          mismatches.push({
            caseId: c.id,
            entity: exp.entity,
            field: "position",
            expected: exp.position,
            actual: actual.position,
          });
      }
      if (exp.role !== undefined) {
        checks++;
        if (actual.role === exp.role) correct++;
        else
          mismatches.push({
            caseId: c.id,
            entity: exp.entity,
            field: "role",
            expected: exp.role,
            actual: actual.role,
          });
      }
    }
  }

  return { checks, correct, mismatches, errors };
}

function report(model: string, result: Awaited<ReturnType<typeof runModel>>) {
  const pct = result.checks > 0 ? ((result.correct / result.checks) * 100).toFixed(1) : "0.0";
  console.log(`\n── ${model} ────────────────────────────────`);
  console.log(`   ${result.correct}/${result.checks} controles correct (${pct}%)`);

  if (result.errors.length > 0) {
    console.log(`\n   ⚠️  ${result.errors.length} aanroep(en) mislukt:`);
    for (const e of result.errors) console.log(`      ${e}`);
  }

  if (result.mismatches.length > 0) {
    console.log(`\n   Afwijkingen:`);
    for (const m of result.mismatches) {
      console.log(
        `      [${m.caseId}] ${m.entity} · ${m.field}: verwacht ${JSON.stringify(m.expected)}, ` +
          `kreeg ${JSON.stringify(m.actual)}`,
      );
    }
  } else {
    console.log(`   Geen afwijkingen.`);
  }
  return Number(pct);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY ontbreekt. Zet 'm in .env.local en probeer opnieuw.");
    process.exit(1);
  }

  const compare = process.argv.includes("--compare");
  const cases = loadCases();
  console.log(`Testset: ${cases.length} gevallen, ${cases.reduce((n, c) => n + c.expect.length, 0)} entiteiten.`);

  const prodScore = report(PRODUCTION_MODEL, await runModel(PRODUCTION_MODEL, cases));

  if (compare) {
    const compScore = report(COMPARISON_MODEL, await runModel(COMPARISON_MODEL, cases));
    console.log(`\n── Vergelijking ──────────────────────────`);
    console.log(`   ${PRODUCTION_MODEL}: ${prodScore}%`);
    console.log(`   ${COMPARISON_MODEL}: ${compScore}%`);
    const diff = compScore - prodScore;
    if (diff > 5) {
      console.log(
        `\n   → ${COMPARISON_MODEL} scoort ${diff.toFixed(1)} punten beter. Overweeg MODELS.volume\n` +
          `     in lib/openai/models.ts om te zetten: de classificatie is het fundament\n` +
          `     onder elk cijfer, en het prijsverschil is klein t.o.v. de web_search-kosten\n` +
          `     ($0,010 per zoekactie tegen enkele tienden van een cent aan tokens).`,
      );
    } else {
      console.log(`\n   → Geen doorslaggevend verschil. ${PRODUCTION_MODEL} volstaat.`);
    }
  }

  // Faal hard bij een lage score, zodat dit script bruikbaar is als poort vóór
  // een release en niet alleen als informatief lijstje.
  const THRESHOLD = 90;
  if (prodScore < THRESHOLD) {
    console.error(`\n❌ Onder de drempel van ${THRESHOLD}%. De meting is niet betrouwbaar genoeg.`);
    process.exit(1);
  }
  console.log(`\n✅ Boven de drempel van ${THRESHOLD}%.`);
}

void main();
