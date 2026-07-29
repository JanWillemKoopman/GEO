import "server-only";

/**
 * Ontdekte merken classificeren (migratie 0026).
 *
 * Sinds de meting puur ontdekt (zie lib/openai/mention-prompt.ts) komt élk merk
 * uit een AI-antwoord binnen als entiteit. Bij een autobedrijf zijn dat naast
 * echte concurrenten ook AutoScout24, Marktplaats, Gaspedaal en de ANWB. Zonder
 * deze stap zouden die als "concurrent" in de grafiek staan en het aandeel van
 * de klant drukken — precies de vervuiling waar de oude handmatige
 * bevestigingspoort voor bedoeld was, maar dan zonder dat de klant per analyse
 * een lijst moet afvinken.
 *
 * Draait tijdens de aggregatie (3c), vóór de uitsplitsing wordt opgebouwd, en
 * alleen over entiteiten die nog op `role_source = 'onbepaald'` staan. Een
 * oordeel van de klant (`'handmatig'`) wordt nooit overschreven.
 *
 * Model `quality`: dit is een oordeel met marktkennis erin ("is Gaspedaal een
 * concurrent van een Volkswagen-dealer of een vergelijker?"), en het draait
 * hooguit een paar keer per analyse in plaats van per meting.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS, TEMPERATURES } from "@/lib/openai/models";
import { EntityClassification } from "@/lib/schemas/entity-classification";
import { normalizeEntityName } from "@/lib/entities/normalize";
import type { Entity } from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * Hoeveel merken we in één aanroep laten beoordelen. Ruim genoeg voor een
 * normale analyse (30 vragen leveren zelden meer dan enkele tientallen namen op)
 * en klein genoeg om het antwoord scherp te houden.
 */
const BATCH_SIZE = 40;

const SYSTEM =
  "Je bepaalt per merk welke ROL het speelt ten opzichte van één specifiek bedrijf. " +
  "Wees streng en feitelijk: 'concurrent' is alleen een bedrijf dat in de kern hetzelfde " +
  "aanbiedt aan dezelfde klantgroep, en dat die klant dus in plaats van het eigen merk kan kiezen.";

export interface ClassifyContext {
  /** Het merk van de klant zelf. */
  brandName: string;
  /** Branche/vakgebied, geeft het model houvast bij twijfel. */
  industry: string | null;
  /** Waar de analyse over gaat, bv. 'Skoda private lease'. */
  topic: string | null;
  /** Merken/producten die de klant zélf voert — die zijn nooit concurrent. */
  ownProducts: string[];
}

function buildUser(names: string[], ctx: ClassifyContext): string {
  return [
    `Eigen merk: ${ctx.brandName}`,
    ctx.industry ? `Branche: ${ctx.industry}` : "",
    ctx.topic ? `Onderwerp van de analyse: ${ctx.topic}` : "",
    ctx.ownProducts.length
      ? `Merken/producten die ${ctx.brandName} ZELF voert of verkoopt (nooit 'concurrent', ` +
        `gebruik 'eigen_product'): ${ctx.ownProducts.join(", ")}`
      : "",
    "",
    "Kies per merk hieronder precies één rol:",
    `- concurrent: biedt in de kern hetzelfde aan dezelfde klant als ${ctx.brandName}, en is dus een alternatief.`,
    `- eigen_merk: is ${ctx.brandName} zelf, in een andere schrijfwijze.`,
    `- eigen_product: een merk of product dat ${ctx.brandName} zelf voert, verkoopt of vertegenwoordigt.`,
    "- brancheorganisatie: branchevereniging, keurmerk, kennisinstituut of belangenorganisatie.",
    "- vergelijker: marktplaats, vergelijkingssite, portal of platform waar meerdere aanbieders op staan.",
    "- niet_relevant: al het overige — leverancier, media, software, of een naam die geen bedrijf is.",
    "",
    "Bij twijfel tussen 'concurrent' en iets anders: kies het andere. Een merk dat onterecht als " +
      "concurrent telt, vervuilt het cijfer van de klant.",
    "",
    "Geef voor ELK merk hieronder een rij terug, met de naam exact zoals hij hier staat:",
    ...names.map((n) => `- ${n}`),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Classificeert alle nog onbepaalde entiteiten van een profiel.
 *
 * Faalt deze stap, dan blijven de entiteiten op 'onbepaald' staan en probeert de
 * volgende aggregatie het opnieuw. De aggregatie zelf mag er niet op stuklopen:
 * een cijfer dat een periode later compleet is, is beter dan geen cijfer.
 */
export async function classifyPendingEntities(
  admin: Admin,
  profileId: string,
  ctx: ClassifyContext,
  /** Voor de kostenregistratie (optimalisatie.md 0.6). */
  analysisId: string,
): Promise<{ classified: number }> {
  const { data } = await admin
    .from("entities")
    .select("*")
    .eq("profile_id", profileId)
    .eq("role_source", "onbepaald");

  const pending = (data ?? []) as Entity[];
  if (pending.length === 0) return { classified: 0 };

  // Het eigen merk hoeft niet langs het model: dat weten we zelf. Scheelt een
  // aanroep én voorkomt dat het model z'n eigen merk als concurrent bestempelt.
  const ownNormalized = new Set(
    [ctx.brandName, ...ctx.ownProducts].map(normalizeEntityName).filter(Boolean),
  );

  let classified = 0;
  const toAsk: Entity[] = [];

  for (const e of pending) {
    if (normalizeEntityName(e.canonical_name) === normalizeEntityName(ctx.brandName)) {
      await admin
        .from("entities")
        .update({
          entity_role: "eigen_merk",
          role_source: "ai",
          exclude_reason: "Dit is het eigen merk.",
        })
        .eq("id", e.id);
      classified++;
      continue;
    }
    if (ownNormalized.has(normalizeEntityName(e.canonical_name))) {
      await admin
        .from("entities")
        .update({
          entity_role: "eigen_product",
          role_source: "ai",
          exclude_reason: `Merk dat ${ctx.brandName} zelf voert.`,
        })
        .eq("id", e.id);
      classified++;
      continue;
    }
    toAsk.push(e);
  }

  for (let i = 0; i < toAsk.length; i += BATCH_SIZE) {
    const batch = toAsk.slice(i, i + BATCH_SIZE);
    const result = await callStructured({
      model: MODELS.quality,
      system: SYSTEM,
      user: buildUser(
        batch.map((e) => e.canonical_name),
        ctx,
      ),
      schema: EntityClassification,
      schemaName: "entity_classification",
      webSearch: false,
      temperature: TEMPERATURES.deterministic,
      meta: { kind: "classify_entities", analysisId, profileId },
    });

    // Terugkoppelen op genormaliseerde naam: het model geeft de naam soms net
    // anders terug dan we hem aanleverden.
    const byNormalized = new Map(
      result.parsed.entities.map((r) => [normalizeEntityName(r.name), r]),
    );

    for (const e of batch) {
      const verdict = byNormalized.get(normalizeEntityName(e.canonical_name));
      // Geen oordeel gekregen? Dan blijft de entiteit 'onbepaald' staan en
      // probeert de volgende aggregatie het opnieuw. Hem stilzwijgend op
      // 'concurrent' laten staan zou precies de vervuiling opleveren die deze
      // stap moet voorkomen.
      if (!verdict) continue;

      await admin
        .from("entities")
        .update({
          entity_role: verdict.role,
          role_source: "ai",
          exclude_reason: verdict.role === "concurrent" ? null : verdict.reason,
        })
        .eq("id", e.id);
      classified++;
    }
  }

  return { classified };
}
