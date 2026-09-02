import "server-only";

/**
 * Orchestratie van halte 1'+2 (abcplan.md §6 A1'/A2, na de klantprofiel-refactor):
 * onderwerp-onderzoek → prompts. Het bedrijfsbrede onderzoek (merknaam, branche,
 * tone-of-voice, persona's) gebeurt niet meer hier maar eenmalig in het
 * klantprofiel (lib/pipeline/prepare-profile.ts). Deze analyse hangt daaraan
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
 * muur aan. Want tussen het opslaan van het onderwerp-onderzoek en het
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
import { generatePromptsForStage, calibrateVolumes, type BrandContext } from "@/lib/pipeline/prompts";
import { duplicatePromptIds } from "@/lib/pipeline/prompt-dedupe";
import { resolveMix, DEFAULT_STAGE_COUNT, type FunnelStage } from "@/lib/prompt-mix";
import { bandFromEstimate } from "@/lib/pipeline/volume";
import { PROMPT_CATEGORIES } from "@/lib/types/database";
import type { Analysis, AnalysisStatus, Profile, ProfilePage } from "@/lib/types/database";
import { requireCount } from "@/lib/require-count";

type Admin = SupabaseClient;

/**
 * Gedeelde voorwaarden van beide fasen: bestaat de analyse, is er nog werk te
 * doen, en is het profiel klaar? Geeft `null` terug als er niets te doen valt
 * (met de status die de aanroeper dan moet melden).
 */
async function loadPreparable(
  admin: Admin,
  id: string,
  /**
   * Een bewuste herdraai na het gesprek (onboarding 3.0, fase 4). Dan mag een
   * analyse die al op 'concept_klaar' staat wél opnieuw vragen krijgen: hij
   * wacht op goedkeuring van de klant, er is nog niets gemeten, en de
   * vraagstelling is net veranderd. De bijwerkroute laat alles wat verder is
   * dan dat er bewust buiten, want daar zou een nieuwe vragenset de trendlijn
   * breken.
   */
  regenerate = false,
): Promise<{ analysis: Analysis; profile: Profile } | { done: AnalysisStatus }> {
  const { data: analysisRow } = await admin.from("analyses").select("*").eq("id", id).single();
  if (!analysisRow) throw new Error(`Analyse ${id} niet gevonden.`);
  const analysis = analysisRow as Analysis;

  // Al voorbij de conceptfase? Niets te doen (voorkomt herverwerking).
  const mag =
    analysis.status === "bezig" ||
    analysis.status === "mislukt" ||
    (regenerate && analysis.status === "concept_klaar");
  if (!mag) return { done: analysis.status };

  // 'mislukt' kan ook een mislukte MÉTING zijn (halte 3, na confirm). Die
  // draait pas nadat A1'+A2 al succesvol prompts hebben aangemaakt. Als die er
  // al zijn, is dit dus geen mislukte voorbereiding: niet aankomen, anders zou
  // deze functie een mislukte meting stilletjes terugzetten naar 'concept_klaar'.
  //
  // ⚠️ "Zijn er al vragen" is sinds de splitsing per funnelfase (12 augustus
  // 2026) niet meer het juiste criterium. Slaagt fase één en mislukt fase twee,
  // dan ZIJN er vragen en zou de herkansing van fase twee hier afketsen. De
  // analyse blijft dan voorgoed op 'mislukt' staan met een derde van zijn
  // vragen. De vraag is dus niet "zijn er vragen" maar "is de voorbereiding
  // compleet": heeft elke fase die vragen hóórt te hebben, ze ook?
  if (analysis.status === "mislukt") {
    const mix = resolveMix(analysis);
    const gevraagd = PROMPT_CATEGORIES.filter((fase) => mix[fase] > 0);

    const perFase = await Promise.all(
      gevraagd.map(async (fase) =>
        requireCount(
          await admin
            .from("prompts")
            .select("*", { count: "exact", head: true })
            .eq("analysis_id", id)
            .eq("category", fase),
          `de vragen van de fase "${fase}"`,
        ),
      ),
    );
    const compleet = gevraagd.length > 0 && perFase.every((n) => n > 0);
    if (compleet) return { done: "mislukt" };
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
 * Geeft terug of de promptgeneratie nog moet gebeuren, de handler ketent daar
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
 * Fase 2 (A2): de vragen van ÉÉN funnelfase opstellen.
 *
 * ⚠️ Sinds 12 augustus 2026 één taak per fase, en niet meer drie fasen in één
 * taak. De gezamenlijke taak liep op productie één keer 228 seconden van de 300
 * die hij heeft, en sinds de verdeling per analyse instelbaar is (migratie 0054)
 * kan het aantal vragen omhoog. Drie taken van ~76 seconden houdt ruimte over;
 * één taak van 228 seconden niet. Dat is ook conventie 7: één taak doet hooguit
 * één zware AI-aanroep.
 *
 * De poort naar klant-goedkeuring zit NIET hier maar in `finishPromptGeneration`,
 * die pas draait als alle drie de fasen klaar zijn. Anders zou de analyse al op
 * `concept_klaar` staan terwijl er nog twee fasen aan het genereren zijn.
 */
export async function generateAnalysisPrompts(
  id: string,
  category: string,
  /**
   * De vragen van deze fase opnieuw opstellen, ook als er al vragen staan
   * (onboarding 3.0, fase 4). Alleen gezet door de bijwerkroute na het gesprek,
   * en daar alleen voor analyses waar nog geen meting op gedraaid heeft.
   *
   * ⚠️ De oude vragen worden op INACTIEF gezet en niet verwijderd. Een `delete`
   * zou via de foreign key de metingen meenemen, en dan is de trendlijn weg om
   * een correctie op de vraagstelling. Zelfde aanpak als spoor R, waar 55
   * landelijke vragen van Van den Udenhout zijn uitgezet in plaats van
   * weggegooid.
   */
  regenerate = false,
): Promise<AnalysisStatus> {
  const admin = createAdminClient();

  const loaded = await loadPreparable(admin, id, regenerate);
  if ("done" in loaded) return loaded.done;
  const { analysis, profile } = loaded;

  try {
    // Het onderwerp-onderzoek van fase 1 is de input voor de prompts. Ontbreekt
    // het, dan is deze taak buiten de keten om gestart. Dan is falen met een
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

    // Idempotent per FASE (conventie 9). Dit was een controle over álle vragen
    // van de analyse; sinds de splitsing zou dat betekenen dat fase twee en drie
    // overgeslagen worden zodra fase één klaar is.
    //
    // ⚠️ En hij staat nu op `requireCount`. Deze controle werd op 12 augustus
    // 2026 over het hoofd gezien in de stille-fout-ronde (F5), terwijl het exact
    // het patroon is dat die ronde moest uitroeien: gaat de telling stuk, dan is
    // `count` null, luidt de conclusie "er staat nog niets" en wordt een hele
    // funnelfase opnieuw gegenereerd en betaald.
    const count = requireCount(
      await admin
        .from("prompts")
        .select("*", { count: "exact", head: true })
        .eq("analysis_id", id)
        .eq("category", category),
      `de vragen van de fase "${category}"`,
    );

    if (regenerate && count > 0) {
      const { error: uitError } = await admin
        .from("prompts")
        .update({ active: false })
        .eq("analysis_id", id)
        .eq("category", category)
        .eq("active", true);
      if (uitError) {
        throw new Error(
          `Oude vragen uitzetten mislukt voor analyse ${id}: ${uitError.message}`,
        );
      }
      console.info(
        `Analyse ${id}: ${count} vragen van de fase "${category}" op inactief gezet, ` +
          `er komen nieuwe voor in de plaats (gesprekswijziging).`,
      );
    }

    if (count === 0 || regenerate) {
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
        // Waar het merk heen wil (migratie 0060). Levert extra vragen op in een
        // gebied waar het vandaag nog niet gevonden wordt.
        growthRegions: profile.growth_regions,
      };

      const mix = resolveMix(analysis);
      const prompts = await generatePromptsForStage({
        analysisId: id,
        url: profile.url,
        topic: analysis.topic,
        brand,
        contentBrief: analysis.content_brief,
        category,
        count: mix[category as FunnelStage] ?? DEFAULT_STAGE_COUNT,
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

    // De poort naar klant-goedkeuring staat NIET hier. Deze taak weet niet of
    // hij de laatste van de drie fasen is; de wachtrij weet dat wel. Zie
    // `finishPromptGeneration` hieronder.
    return "bezig";
  } catch (err) {
    await admin.from("analyses").update({ status: "mislukt" }).eq("id", id);
    throw err;
  }
}

/**
 * De poort naar klant-goedkeuring, na de laatste fasetaak.
 *
 * Staat los van `generateAnalysisPrompts` omdat een fasetaak niet weet of hij de
 * laatste is. De wachtrij weet dat wel: `handlers.ts` telt hoeveel fasetaken er
 * nog openstaan en roept dit pas aan als dat er nul zijn.
 */
export async function finishPromptGeneration(id: string): Promise<AnalysisStatus> {
  const admin = createAdminClient();

  // ── T8.1: ontdubbelen over de funnelfasen heen ────────────────────────────
  //
  // `generateForFunnelStage()` dedupliceert alleen BINNEN één fase; de drie
  // fasen draaien parallel als eigen taken en delen geen geheugen. Dit is de
  // ene plek die gegarandeerd pas draait als alle drie klaar zijn (zie de
  // telling in `lib/jobs/handlers.ts`), dus hier en niet daar. Er is op dit
  // moment nog geen meting geweest (die begint pas na goedkeuring door de
  // klant), dus een duplicaat verwijderen raakt geen opgeslagen resultaat.
  const { data: alleVragen } = await admin
    .from("prompts")
    .select("id, text, created_at")
    .eq("analysis_id", id)
    .eq("active", true);
  const duplicaten = duplicatePromptIds(
    (alleVragen ?? []).map((r) => ({
      id: r.id as string,
      text: r.text as string,
      // `new Date(...).toISOString()` in plaats van een kale cast: de echte
      // Supabase-client geeft hier een ISO-string terug, de testshim in
      // scripts/test-chain.ts (rechtstreeks op de Postgres-driver) een
      // `Date`-object. Dit normaliseert allebei naar dezelfde, sorteerbare vorm.
      createdAt: new Date(r.created_at as string | Date).toISOString(),
    })),
  );
  if (duplicaten.length > 0) {
    const { error: verwijderError } = await admin.from("prompts").delete().in("id", duplicaten);
    if (verwijderError) {
      throw new Error(`Dubbele vragen opruimen mislukt voor analyse ${id}: ${verwijderError.message}`);
    }
    console.info(
      `Analyse ${id}: ${duplicaten.length} dubbele ${duplicaten.length === 1 ? "vraag" : "vragen"} over de funnelfasen heen verwijderd.`,
    );
  }

  // Laatste controle vóór de poort: er MOET minstens één vraag staan. Zonder
  // dat is 'concept_klaar' een belofte die de meting niet kan waarmaken.
  // `requireCount` en niet `!finalCount`: allebei stoppen ze, maar met een
  // andere melding. "Deze analyse heeft geen vragen" stuurt iemand op zoek
  // naar een lege vragenlijst, terwijl de telling misschien gewoon niet
  // antwoordde. Een verkeerde diagnose kost meer tijd dan geen diagnose.
  const finalCount = requireCount(
    await admin
      .from("prompts")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", id),
    "de vragen van deze analyse",
  );
  if (finalCount === 0) {
    await admin.from("analyses").update({ status: "mislukt" }).eq("id", id);
    throw new Error(`Analyse ${id} heeft geen vragen; de meting zou niets te meten hebben.`);
  }

  await admin.from("analyses").update({ status: "concept_klaar" }).eq("id", id);
  return "concept_klaar";
}

/**
 * Fase 3 (nabewerking): het geschatte zoekvolume relatief kalibreren over alle
 * vragen van de analyse (abcplan.md §6 A2), consistenter dan losse schattingen
 * per vraag.
 *
 * Bewust ná de poort naar 'concept_klaar' en als eigen taak. Twee redenen:
 *
 *  • Het is een verfijning, geen voorwaarde. De vragen staan er al, mét een
 *    bruikbare band ('midden'); de klant hoeft daar niet op te wachten.
 *  • Het scheelt een derde ronde AI-aanroepen in `generate_prompts`, die het
 *    daardoor niet binnen één werker-aanroep haalde.
 *
 * Mislukt dit, dan blijft elke vraag op de neutrale 50 / band 'midden' staan,
 * exact de terugval die er altijd al was. Daarom raakt een fout hier de status
 * van de analyse NIET: 'mislukt' tonen voor een cosmetische verfijning zou de
 * klant een probleem melden dat hij niet heeft.
 */
export async function calibratePromptVolumes(id: string): Promise<void> {
  const admin = createAdminClient();

  // Vaste volgorde: de kalibratie geeft haar antwoorden terug op invoervolgorde.
  const { data: promptRows } = await admin
    .from("prompts")
    .select("id, text")
    .eq("analysis_id", id)
    .eq("created_by", "system")
    .order("created_at")
    .order("id");

  const prompts = (promptRows ?? []) as { id: string; text: string }[];
  if (prompts.length === 0) return;

  const volumes = await calibrateVolumes(
    prompts.map((p) => p.text),
    id,
  );

  // Eén update per vraag. Het zijn er dertig en het is puur database-werk;
  // een bulk-upsert zou hier alleen de kans op een halve schrijfactie
  // introduceren zonder merkbare winst.
  await Promise.all(
    prompts.map((p, i) =>
      admin
        .from("prompts")
        .update({ volume_estimate: volumes[i], volume_band: bandFromEstimate(volumes[i]) })
        .eq("id", p.id),
    ),
  );
}
