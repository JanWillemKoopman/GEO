import "server-only";

/**
 * ÉÉN GEPLANDE PAGINA AAN HET SCHRIJVEN KRIJGEN.
 *
 * ── WAAROM DIT UIT DE CRON GETILD IS (22 september 2026) ───────────────────
 *
 * Deze stappen stonden alleen in `/api/cron/plan`: beslissen of er geschreven
 * mag worden, de briefing samenstellen, de doelvragen bij de kans zoeken, de
 * schrijftaak inplannen en de pagina op `schrijven` zetten. Sinds de beheerder
 * een pagina met de hand nu kan laten schrijven (het menu achter de drie
 * puntjes in het contentplan) zijn er twee aanroepers, en twee kopieën van deze
 * vijf stappen lopen gegarandeerd uit elkaar. Die van de cron zou dan wel de
 * doelvragen meesturen en die van de knop niet, en dan mist de effectmeting bij
 * precies de pagina's die iemand met spoed liet schrijven.
 *
 * ── HET VERSCHIL TUSSEN DE CRON EN DE KNOP ─────────────────────────────────
 *
 * Alleen `negeerPlanning`. De cron wacht op twee dingen die samen zeggen "de
 * klant wil dit en het is bijna zover": een goedgekeurde maand en een
 * publicatiedatum binnen tien dagen. De knop is een beheerder die nu iets wil,
 * expliciet, met zijn eigen hand, achter de kostenrem van besluit 18. Die twee
 * wachtregels gelden dan niet; alle andere wél. Een pagina zonder gemeten
 * cluster blijft ongeschreven, ook met de knop, want zonder meting schrijft het
 * model iets algemeens over het onderwerp en dat is precies de tekst waarvoor
 * niemand betaalt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { planContentDraft } from "@/lib/jobs/content-jobs";
import { writeDecision, planBriefing, type WriteBlock } from "@/lib/plan-writing";
import { targetsFromSourceRef } from "@/lib/plan-backlog-data";
import type { AnalysisStatus, PageType, PlanMonthStatus, PlannedPageStatus } from "@/lib/types/database";

type Admin = SupabaseClient;

/** De kolommen die deze module nodig heeft, inclusief de joins. */
export interface TeSchrijvenPagina {
  id: string;
  profile_id: string;
  title: string;
  page_type: PageType;
  status: PlannedPageStatus;
  scheduled_for: string | null;
  is_buffer: boolean;
  topic_id: string | null;
  source: string | null;
  why: string | null;
  target_intent: string | null;
  recommendation_action: string | null;
  existing_url: string | null;
  related_url: string | null;
  source_ref: string | null;
  plan_months: { month_number: number; status: PlanMonthStatus } | null;
  profile_funnel_stages: { label: string } | null;
  profile_topics: {
    title: string;
    analysis_id: string | null;
    analyses: { status: AnalysisStatus; user_id: string } | null;
  } | null;
}

/** De selectie die bij `TeSchrijvenPagina` hoort. Eén plek, twee aanroepers. */
export const SCHRIJFPAGINA_KOLOMMEN = `id, profile_id, title, page_type, status, scheduled_for, is_buffer, topic_id,
   source, why, target_intent, recommendation_action, existing_url, related_url, source_ref,
   plan_months!inner(month_number, status),
   profile_funnel_stages(label),
   profile_topics(title, analysis_id, analyses(status, user_id))`;

export type SchrijfUitkomst =
  /** De schrijftaak staat in de wachtrij en de pagina staat op 'schrijven'. */
  | { uitkomst: "ingepland" }
  /** De taak stond al in de rij van een eerdere ronde. Geen tweede taak. */
  | { uitkomst: "al_bezig" }
  /** Er stond al een afgeronde tekst met deze titel onder dit cluster. */
  | { uitkomst: "al_klaar" }
  /** Er mag (nog) niet geschreven worden, met de reden erbij. */
  | { uitkomst: "geblokkeerd"; reden: WriteBlock }
  | { uitkomst: "mislukt" };

/**
 * ⚠️ `negeerPlanning` slaat ALLEEN de twee wachtregels over: de goedkeuring van
 * de maand en het tiendaagse venster. Alles wat over de inhoud gaat (is er een
 * onderwerp, hangt er een gemeten cluster aan, staat de pagina nog op 'gepland')
 * blijft staan, want daar komt anders een lege tekst uit.
 */
export async function startPaginaSchrijven(
  admin: Admin,
  pagina: TeSchrijvenPagina,
  nu: Date,
  opties: { negeerPlanning?: boolean } = {},
): Promise<SchrijfUitkomst> {
  const maand = pagina.plan_months;
  if (!maand) return { uitkomst: "geblokkeerd", reden: "geen_datum" };

  const topic = pagina.profile_topics;
  const besluit = writeDecision(
    {
      status: pagina.status,
      // Met de knop telt de datum niet mee. Een datum verzinnen zou een
      // publicatiedatum vervalsen; daarom wordt de regel overgeslagen en niet
      // de waarde vervangen.
      scheduled_for: opties.negeerPlanning ? nu.toISOString().slice(0, 10) : pagina.scheduled_for,
      is_buffer: pagina.is_buffer,
      topic_id: pagina.topic_id,
    },
    opties.negeerPlanning ? "goedgekeurd" : maand.status,
    topic
      ? { analysis_id: topic.analysis_id, analysis_status: topic.analyses?.status ?? null }
      : null,
    nu,
  );

  if (!besluit.schrijven) return { uitkomst: "geblokkeerd", reden: besluit.reden };

  // De EIGENAAR van de analyse schrijft, niet de cron en niet de beheerder: de
  // contentpijplijn legt `user_id` vast bij de pagina, en die moet van de klant
  // zijn. Zonder deze regel komt een pagina op naam van niemand te staan.
  const userId = topic?.analyses?.user_id;
  if (!userId) return { uitkomst: "geblokkeerd", reden: "geen_analyse" };

  // ── DE BRIEFING KOMT UIT DE KANS ZELF ALS DIE ER IS ──────────────────────
  //
  // Een voorraaditem draagt de reden, de doelgroep en het adres van de
  // aanbeveling mee (migratie 0065). Die zijn geschreven op basis van gemiste
  // vragen uit een echte meting en dus scherper dan wat `planBriefing()` uit een
  // onderwerp en een funnelfase kan afleiden.
  //
  // ⚠️ En het verschil is niet cosmetisch: bij een kans met handeling
  // "verbeteren" hoort de schrijfstap een BESTAANDE pagina aan te vullen. Tot 25
  // augustus 2026 stond er onvoorwaardelijk `action: "nieuw"`, dus vier van de
  // zeven kansen van Gasservice Brabant zouden een tweede pagina hebben
  // opgeleverd naast de pagina die ze hadden moeten verbeteren.
  const briefing = planBriefing({
    title: pagina.title,
    pageType: pagina.page_type,
    topicTitle: topic?.title ?? null,
    funnelLabel: pagina.profile_funnel_stages?.label ?? null,
    monthNumber: maand.month_number,
  });
  const uitKans = pagina.source === "aanbeveling";

  // `source_ref` wijst als "<rapport-id>#<volgnummer>" rechtstreeks naar de
  // aanbeveling met de doelvragen. Zonder dit blijft `targets` leeg, schrijft
  // `saveTargets()` nul rijen en slaat `planImpactWaves()` de effectmeting over
  // met "geen doelvragen". Fase 5 bestaat dan niet voor deze pagina.
  const { reportId, targets } = uitKans
    ? await targetsFromSourceRef(admin, pagina.source_ref)
    : { reportId: null, targets: [] };

  try {
    const { created, alreadyDone } = await planContentDraft(admin, {
      analysisId: besluit.analysisId,
      userId,
      plannedPageId: pagina.id,
      recommendation: {
        ...briefing,
        why: uitKans && pagina.why ? pagina.why : briefing.why,
        targetIntent: uitKans && pagina.target_intent ? pagina.target_intent : briefing.targetIntent,
        action: pagina.recommendation_action === "verbeteren" ? "verbeteren" : "nieuw",
        existingUrl: pagina.recommendation_action === "verbeteren" ? pagina.existing_url : null,
        // Migratie 0083: bij een nieuwe pagina de bestaande pagina die het
        // onderwerp al raakt, zodat de waarschuwing niet verdwijnt op de route
        // die de meeste pagina's afleggen.
        relatedUrl: pagina.recommendation_action === "verbeteren" ? null : pagina.related_url,
        reportId,
        targets,
      },
    });

    if (alreadyDone) {
      await admin
        .from("planned_pages")
        .update({ status: "ter_goedkeuring" })
        .eq("id", pagina.id)
        .eq("status", "gepland");
      return { uitkomst: "al_klaar" };
    }

    if (!created) return { uitkomst: "al_bezig" };

    await admin
      .from("planned_pages")
      .update({ status: "schrijven" })
      .eq("id", pagina.id)
      .eq("status", "gepland");
    return { uitkomst: "ingepland" };
  } catch (err) {
    console.error(`Schrijftaak voor pagina ${pagina.id} mislukte:`, err);
    return { uitkomst: "mislukt" };
  }
}

/**
 * Waarom er niet geschreven kan worden, in de taal van het scherm.
 *
 * Nova's wie-is-aan-zet-taal: niet "geblokkeerd" maar wat er moet gebeuren. Een
 * beheerder die op de knop drukt hoort te lezen wat hem tegenhoudt, niet een
 * sleutelwoord uit de code.
 */
export const SCHRIJFBLOKKADE_TEKST: Record<WriteBlock, string> = {
  maand_niet_goedgekeurd: "Deze maand is nog niet vrijgegeven.",
  nog_niet_aan_de_beurt: "Deze pagina is nog niet aan de beurt.",
  is_buffer: "Dit is een reservepagina; zet hem eerst in een maand.",
  geen_datum: "Deze pagina heeft nog geen publicatiedatum.",
  al_onderweg: "Deze pagina wordt al geschreven of is al klaar.",
  geen_onderwerp: "Deze pagina hangt nog aan geen enkel onderwerp.",
  geen_analyse: "Er is nog geen cluster gestart voor dit onderwerp, dus er is niets om op te schrijven.",
  meting_nog_niet_klaar:
    "De meting van dit cluster loopt nog. Zonder meting schrijft ORBIT ENGINE iets algemeens.",
};
