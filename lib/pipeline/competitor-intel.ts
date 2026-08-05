import "server-only";

/**
 * R4.2, waaróm wordt een concurrent genoemd? (implementatieplan.md)
 *
 * ── HET GAT DAT DIT VULT ────────────────────────────────────────────────────
 *
 * De klant zag per concurrent één ding: een aantal vermeldingen. Bij HEMA stonden
 * er 34 "concurrenten" in de vergelijking, waarvan 24 met precies één
 * vermelding. Dat is geen concurrentiebeeld maar een lijst toevalligheden, en
 * nergens stond waaróm die ander wél genoemd wordt.
 *
 * Dat gemis raakt twee doelen tegelijk. De klant kan niet zien waarop hij
 * verliest (doel 2), en de schrijver in Fase C krijgt het winnende antwoord
 * alleen als lap tekst mee, niet de gedestilleerde reden, terwijl dát de lat is
 * waar zijn pagina overheen moet (doel 3).
 *
 * ── HOE ─────────────────────────────────────────────────────────────────────
 *
 * Eén aanroep per analyse over de antwoordfragmenten waarin de belangrijkste
 * concurrenten voorkomen. Het model DESTILLEERT: het kiest per concurrent
 * eigenschappen uit een vaste lijst en levert bij elke eigenschap een letterlijk
 * citaat als bewijs. Zelfde principe als het bewijsdossier (R1): wat niet na te
 * trekken is, mag niet gezegd worden.
 *
 * De naam van een concurrent gaat NOOIT mee naar de contentstap, alleen de
 * eigenschap. De harde regel dat klantcontent geen concurrenten noemt blijft
 * onverkort gelden (lib/pipeline/content.ts).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { CompetitorProfileSet } from "@/lib/schemas/competitor-profile";
import { normalizeEntityName } from "@/lib/entities/normalize";
import type { CompetitorBreakdown } from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * Hoeveel concurrenten we profileren.
 *
 * Acht is ruim genoeg voor een beeld van de markt en houdt de aanroep scherp.
 * Wie daaronder valt is per definitie een randverschijnsel: bij HEMA had de
 * nummer negen precies één vermelding.
 */
const MAX_COMPETITORS = 8;

/**
 * Onder hoeveel vermeldingen we een concurrent niet meer profileren.
 *
 * Eén vermelding is geen patroon maar een toevalstreffer. Daar een eigenschap
 * uit destilleren zou het model dwingen betekenis te geven aan ruis.
 */
const MIN_MENTIONS = 2;

/** Hoeveel antwoordfragmenten per concurrent meegaan als bewijsmateriaal. */
const MAX_FRAGMENTS_PER_COMPETITOR = 3;
const FRAGMENT_CHARS = 600;

const SYSTEM =
  "Je analyseert AI-antwoorden om te bepalen WAAROM bepaalde aanbieders daarin genoemd worden. " +
  "Je DESTILLEERT alleen wat er staat: kies per aanbieder de eigenschappen die uit de fragmenten " +
  "blijken, en geef bij elke eigenschap een LETTERLIJK citaat uit die fragmenten als bewijs. " +
  "Verzin geen eigenschap die er niet uit blijkt, en citeer niets wat er niet letterlijk staat. " +
  "Kun je voor een aanbieder geen enkele eigenschap onderbouwen, geef dan een lege lijst. Dat is " +
  "een geldig antwoord. Schrijf de samenvatting in gewone taal, zonder jargon, in het Nederlands.";

/**
 * Verzamelt per concurrent de fragmenten waarin hij voorkomt.
 *
 * Uit de al opgeslagen `raw_response` van de metingen. Geen nieuwe meting, geen
 * web_search, dus alleen de kosten van de destillatie-aanroep zelf.
 */
async function collectFragments(
  admin: Admin,
  analysisId: string,
  weekNo: number,
  names: string[],
): Promise<Map<string, string[]>> {
  const { data: runRows } = await admin
    .from("tracking_runs")
    .select("id, raw_response")
    .eq("analysis_id", analysisId)
    .eq("week_no", weekNo)
    .eq("purpose", "periodic");

  const answers = ((runRows ?? []) as { id: string; raw_response: string | null }[]).filter(
    (r) => r.raw_response,
  );

  const perName = new Map<string, string[]>();
  for (const name of names) {
    const needle = name.toLowerCase();
    const fragments: string[] = [];

    for (const run of answers) {
      if (fragments.length >= MAX_FRAGMENTS_PER_COMPETITOR) break;
      const text = run.raw_response ?? "";
      const at = text.toLowerCase().indexOf(needle);
      if (at < 0) continue;

      // Rond de vermelding knippen in plaats van vanaf het begin: de reden dat
      // een aanbieder genoemd wordt staat naast zijn naam, niet in de inleiding.
      const from = Math.max(0, at - FRAGMENT_CHARS / 3);
      fragments.push(text.slice(from, from + FRAGMENT_CHARS).trim());
    }

    if (fragments.length > 0) perName.set(name, fragments);
  }

  return perName;
}

function buildUser(perName: Map<string, string[]>): string {
  const blocks: string[] = [];
  for (const [name, fragments] of perName) {
    blocks.push(
      [
        `AANBIEDER: ${name}`,
        ...fragments.map((f, i) => `  fragment ${i + 1}: "${f}"`),
      ].join("\n"),
    );
  }
  return (
    `Hieronder per aanbieder de fragmenten uit AI-antwoorden waarin hij genoemd wordt. ` +
    `Bepaal per aanbieder op welke eigenschappen hij genoemd wordt, met een letterlijk citaat ` +
    `uit díe fragmenten als bewijs.\n\n${blocks.join("\n\n")}`
  );
}

export interface CompetitorIntelResult {
  profiled: number;
}

/**
 * Profileert de belangrijkste concurrenten van één analyse/periode.
 *
 * Dit is wat een `profile_competitors`-taak doet. Faalt hij, dan houdt de klant
 * gewoon zijn cijfers, het profiel is verrijking, geen voorwaarde. Vandaar dat
 * de handler de fout logt maar de keten niet breekt.
 */
export async function profileCompetitors(
  admin: Admin,
  analysisId: string,
  weekNo: number,
): Promise<CompetitorIntelResult> {
  const { data: rows } = await admin
    .from("competitor_breakdown")
    .select("*")
    .eq("analysis_id", analysisId)
    .eq("week_no", weekNo)
    .order("mentions_count", { ascending: false })
    .limit(MAX_COMPETITORS);

  const breakdown = ((rows ?? []) as CompetitorBreakdown[]).filter(
    (c) => c.mentions_count >= MIN_MENTIONS,
  );
  if (breakdown.length === 0) return { profiled: 0 };

  const perName = await collectFragments(
    admin,
    analysisId,
    weekNo,
    breakdown.map((c) => c.competitor_name),
  );
  if (perName.size === 0) return { profiled: 0 };

  const { data: analysisRow } = await admin
    .from("analyses")
    .select("profile_id")
    .eq("id", analysisId)
    .maybeSingle();

  const result = await callStructured({
    model: MODELS.quality,
    system: SYSTEM,
    user: buildUser(perName),
    schema: CompetitorProfileSet,
    schemaName: "competitor_profiles",
    webSearch: false,
    work: "deterministic",
    meta: {
      kind: "competitor_intel",
      analysisId,
      profileId: (analysisRow?.profile_id as string | undefined) ?? undefined,
    },
  });

  // Terugkoppelen op genormaliseerde naam: het model geeft de naam soms net
  // anders terug dan we hem aanleverden (zelfde patroon als classify-entities).
  const byNormalized = new Map(
    result.parsed.competitors.map((c) => [normalizeEntityName(c.name), c]),
  );

  let profiled = 0;
  for (const row of breakdown) {
    const match = byNormalized.get(normalizeEntityName(row.competitor_name));
    if (!match) continue;

    const { error } = await admin
      .from("competitor_breakdown")
      .update({
        attributes_json: match.attributes as never,
        why_summary: match.summary,
      })
      .eq("id", row.id);

    if (error) {
      console.warn(`Concurrentprofiel opslaan mislukt voor ${row.competitor_name}: ${error.message}`);
      continue;
    }
    profiled++;
  }

  return { profiled };
}
