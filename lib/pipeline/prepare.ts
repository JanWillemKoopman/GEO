import "server-only";

/**
 * Orchestratie van halte 1'+2 (abcplan.md §6 A1'/A2, na de klantprofiel-refactor):
 * onderwerp-onderzoek → prompts. Het bedrijfsbrede onderzoek (merknaam, branche,
 * tone-of-voice, persona's) gebeurt niet meer hier maar eenmalig in het
 * klantprofiel (lib/pipeline/prepare-profile.ts) — deze analyse hangt daaraan
 * via analyses.profile_id en moet dus een profiel met status 'klaar' hebben.
 *
 * Draait met de service-role client (schrijven, §5/§12.20). Idempotent en
 * resumebaar: elke stap checkt of z'n resultaat al bestaat, zodat een refresh of
 * retry geen dubbel werk of dubbele kosten oplevert. Faalt er iets, dan gaat de
 * analyse naar 'mislukt' (retry-knop in Mijn analyses).
 *
 * ── WAAROM DIT TWEE TAKEN IS ────────────────────────────────────────────────
 *
 * Dit was één taak (`prepare_analysis`) die drie ronden AI-aanroepen achter
 * elkaar deed: onderwerp-onderzoek → drie parallelle prompt-calls →
 * volume-kalibratie. Bij elkaar past dat niet binnen de zestig seconden die de
 * werker-route van het platform krijgt. De functie werd dan middenin afgekapt,
 * de taak bleef als 'running' in de wachtrij staan tot de reaper hem tien
 * minuten later terugzette, en de volgende poging liep tegen exact dezelfde
 * muur aan — want tussen het opslaan van het onderwerp-onderzoek en het
 * wegschrijven van de prompts wordt niets tussentijds bewaard. Vier pogingen
 * lang leek het scherm gewoon te werken ("nog minder dan een minuut"), waarna
 * de analyse alsnog op 'mislukt' viel.
 *
 * Nu is het opgeknipt volgens het principe dat elders in de wachtrij al geldt
 * (lib/jobs/types.ts: één taak = hooguit één zware AI-ronde): `prepare_analysis`
 * doet alleen het onderwerp-onderzoek en ketent naar `generate_prompts`. Beide
 * passen ruim binnen één aanroep, en het tussenresultaat staat op schijf.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateTopicResearch } from "@/lib/pipeline/topic-research";
import { generatePrompts, type BrandContext } from "@/lib/pipeline/prompts";
import { bandFromEstimate } from "@/lib/pipeline/volume";
import type { Analysis, AnalysisStatus, Profile, ProfilePage } from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * Gedeelde voorwaarden van beide fasen: bestaat de analyse, is er nog werk te
 * doen, en is het profiel klaar? Geeft `null` terug als er niets te doen valt
 * (met de status die de aanroeper dan moet melden).
 */
async function loadPreparable(
  admin: Admin,
  id: string,
): Promise<{ analysis: Analysis; profile: Profile } | { done: AnalysisStatus }> {
  const { data: analysisRow } = await admin.from("analyses").select("*").eq("id", id).single();
  if (!analysisRow) throw new Error(`Analyse ${id} niet gevonden.`);
  const analysis = analysisRow as Analysis;

  // Al voorbij de conceptfase? Niets te doen (voorkomt herverwerking).
  if (analysis.status !== "bezig" && analysis.status !== "mislukt") {
    return { done: analysis.status };
  }

  // 'mislukt' kan ook een mislukte MÉTING zijn (halte 3, na confirm) — die
  // draait pas nadat A1'+A2 al succesvol prompts hebben aangemaakt. Als die er
  // al zijn, is dit dus geen mislukte voorbereiding: niet aankomen, anders zou
  // deze functie een mislukte meting stilletjes terugzetten naar 'concept_klaar'.
  if (analysis.status === "mislukt") {
    const { count } = await admin
      .from("prompts")
      .select("*", { count: "exact", head: true })
      .eq("analysis_id", id);
    if (count) return { done: "mislukt" };
  }

  const { data: profileRow } = await admin
    .from("profiles")
    .select("*")
    .eq("id", analysis.profile_id)
    .single();
  if (!profileRow) throw new Error(`Klantprofiel ${analysis.profile_id} niet gevonden.`);
  const profile = profileRow as Profile;
  if (profile.status !== "klaar") {
    throw new Error(`Klantprofiel "${profile.name}" is nog niet klaar met onderzoek.`);
  }

  return { analysis, profile };
}

/**
 * Fase 1 (A1'): onderwerp-onderzoek. Eén gegrondde AI-aanroep; het resultaat
 * gaat meteen naar `topic_research`, zodat een nieuwe poging deze stap overslaat.
 *
 * Geeft terug of de promptgeneratie nog moet gebeuren — de handler ketent daar
 * dan naartoe.
 */
export async function prepareTopicResearch(id: string): Promise<{ needsPrompts: boolean }> {
  const admin = createAdminClient();

  const loaded = await loadPreparable(admin, id);
  if ("done" in loaded) return { needsPrompts: false };
  const { analysis, profile } = loaded;

  try {
    const { data: existingResearch } = await admin
      .from("topic_research")
      .select("id")
      .eq("analysis_id", id)
      .maybeSingle();

    if (!existingResearch) {
      const { data: pageRows } = await admin
        .from("profile_pages")
        .select("*")
        .eq("profile_id", profile.id);
      const research = await generateTopicResearch({
        analysisId: id,
        topic: analysis.topic,
        pages: (pageRows ?? []) as ProfilePage[],
        profile,
        contentBrief: analysis.content_brief,
      });
      const r = research.parsed;

      await admin.from("topic_research").upsert(
        {
          analysis_id: id,
          content_summary: r.contentSummary,
          competitors: r.competitors,
          raw_json: research.raw as never, // volledige ruwe OpenAI-output (§5)
        },
        { onConflict: "analysis_id" },
      );
    }

    return { needsPrompts: true };
  } catch (err) {
    await admin.from("analyses").update({ status: "mislukt" }).eq("id", id);
    throw err;
  }
}

/**
 * Fase 2 (A2): promptgeneratie + volume-kalibratie, en daarna de poort naar
 * klant-goedkeuring. Draait als losse taak zodat deze ronde AI-aanroepen de
 * tijdslimiet van één werker-aanroep niet deelt met het onderwerp-onderzoek.
 */
export async function generateAnalysisPrompts(id: string): Promise<AnalysisStatus> {
  const admin = createAdminClient();

  const loaded = await loadPreparable(admin, id);
  if ("done" in loaded) return loaded.done;
  const { analysis, profile } = loaded;

  try {
    // Het onderwerp-onderzoek van fase 1 is de input voor de prompts. Ontbreekt
    // het, dan is deze taak buiten de keten om gestart — dan is falen met een
    // duidelijke melding beter dan prompts zonder context genereren.
    const { data: research } = await admin
      .from("topic_research")
      .select("competitors")
      .eq("analysis_id", id)
      .maybeSingle();
    if (!research) {
      throw new Error(`Analyse ${id}: onderwerp-onderzoek ontbreekt, prompts kunnen niet volgen.`);
    }
    const topicCompetitors: string[] = research.competitors ?? [];

    // Skip als er al prompts zijn (idempotent bij een nieuwe poging).
    const { count } = await admin
      .from("prompts")
      .select("*", { count: "exact", head: true })
      .eq("analysis_id", id);

    if (!count) {
      const brand: BrandContext = {
        brandName: profile.brand_name,
        industry: profile.industry,
        products: profile.products,
        // Gededupliceerde unie: onderwerp-specifieke concurrenten eerst, aangevuld
        // met de algemene bedrijfsconcurrenten uit het profiel.
        competitors: Array.from(new Set([...topicCompetitors, ...profile.competitors])),
        toneOfVoice: profile.tone_of_voice,
        summary: profile.summary,
        serviceScope: profile.service_scope,
        serviceRegions: profile.service_regions,
        marketLanguage: profile.market_language,
      };

      const prompts = await generatePrompts({
        analysisId: id,
        url: profile.url,
        topic: analysis.topic,
        brand,
        contentBrief: analysis.content_brief,
      });
      const rows = prompts.map((p) => ({
        analysis_id: id,
        text: p.text,
        category: p.category, // funnelfase
        intent: p.intent,
        intent_type: p.intentType,
        specificity: p.specificity,
        purchase_intent: p.purchaseIntent,
        cluster: p.cluster,
        // De ruwe schatting bewaren als audit-trail, maar wegen en tonen doen we
        // over de band (optimalisatie.md 2.6).
        volume_estimate: p.volumeEstimate,
        volume_band: bandFromEstimate(p.volumeEstimate),
        volume_source: "geschat" as const,
        active: true,
        created_by: "system" as const,
        source_raw_json: p.sourceRawJson as never,
      }));
      // Foutcontrole is hier geen formaliteit: mislukt deze insert stil, dan
      // gaat de analyse hieronder naar 'concept_klaar' ZONDER vragen, en loopt
      // hij na het bevestigen vast op een meting die niets te meten heeft.
      const { error: insertError } = await admin.from("prompts").insert(rows);
      if (insertError) {
        throw new Error(`Vragen opslaan mislukt voor analyse ${id}: ${insertError.message}`);
      }
    }

    // ── Klaar → wacht op klant-goedkeuring (review-gate, Sprint 3) ─────────
    // Laatste controle vóór de poort: er MOET minstens één vraag staan. Zonder
    // dat is 'concept_klaar' een belofte die de meting niet kan waarmaken.
    const { count: finalCount } = await admin
      .from("prompts")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", id);
    if (!finalCount) {
      throw new Error(`Analyse ${id} heeft geen vragen; de meting zou niets te meten hebben.`);
    }

    await admin.from("analyses").update({ status: "concept_klaar" }).eq("id", id);
    return "concept_klaar";
  } catch (err) {
    await admin.from("analyses").update({ status: "mislukt" }).eq("id", id);
    throw err;
  }
}
