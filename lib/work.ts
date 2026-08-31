import "server-only";

/**
 * Eén werkmodel voor de hele app.
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * "Werk" bestond in vijf vormen die niets van elkaar wisten: de acties op het
 * dashboard, de aanbevelingen in het rapport, de off-site taken onderaan dat
 * rapport, het oordeel per pagina in de bibliotheek en de feitenvragen op de
 * profielpagina. Vijf statusmachines voor één begrip, elk met eigen woorden,
 * eigen kleuren en een eigen volgorde.
 *
 * Voor de klant betekende dat: zes soorten werk op zes bestemmingen, verspreid
 * over vier schermen en twee secties van de app. Het dashboard was de enige
 * plek die het bij elkaar bracht, en zodra je erop klikte, spatte je uiteen.
 *
 * Hier staat het één keer. Eén type, één statusmachine, één volgorde.
 *
 * ── DE GROEPERING IS DE STAAT, NIET DE SOORT ────────────────────────────────
 *
 * Een klant groepeert niet naar "is dit off-site of on-site". Dat is onze
 * indeling, niet de zijne. Hij groepeert naar "moet ik hier iets?". Vandaar
 * `WorkState` als hoofdas en `WorkKind` alleen als etiket.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUS_META } from "@/lib/analysis-status";
import type { WorkKind } from "@/lib/work-kind";
import type { AuditCheck } from "@/lib/audit/technical";
import type { Analysis, ContentPiece, FactRequest, OffsiteTask } from "@/lib/types/database";
import { activeOnly } from "@/lib/archive";
import { formatDateShort } from "@/lib/format";

type Db = SupabaseClient;

/**
 * De soort werk, het etiket, de tint en de tekening staan in `lib/work-kind.ts`
 * en worden hier onveranderd doorgegeven. Ze horen daar omdat ze puur zijn en
 * dit bestand `server-only` is: conventie 2, anders is er geen unittest op te
 * schrijven.
 */
export {
  WORK_KIND_LABEL,
  workChipTone,
  workKindIcon,
  type WorkKind,
} from "@/lib/work-kind";

/**
 * Waar het werk staat. Dit bepaalt de volgorde op het scherm.
 *
 * `nu`: er wordt iets van de klant verwacht.
 * `loopt`, wij zijn ermee bezig; de klant hoeft niets.
 * `wacht`, gedaan, maar het resultaat is er nog niet (hermeting duurt weken).
 * `klaar`, afgerond.
 */
export type WorkState = "nu" | "loopt" | "wacht" | "klaar";

export const WORK_STATES: WorkState[] = ["nu", "loopt", "wacht", "klaar"];

export const WORK_STATE_LABEL: Record<WorkState, string> = {
  nu: "Nu doen",
  loopt: "ORBIT ENGINE is bezig",
  wacht: "Wacht op hermeting",
  klaar: "Klaar",
};

export interface WorkItem {
  /** Stabiel over renders heen: `${kind}:${bron-id}`. */
  id: string;
  kind: WorkKind;
  state: WorkState;
  title: string;
  /** Eén zin: waarom dit ertoe doet. Geen uitleg over hoe het systeem werkt. */
  why: string;
  /** Lager = eerder, binnen dezelfde staat. */
  urgency: number;
  /** Waar de klant heen gaat om het te doen. */
  href: string;
  /** Wat de knop zegt. Weglaten als de titel al de actie is. */
  actionLabel?: string;
  /** Korte terzijde: "sinds 3 juli", "hermeting rond 17 juli". */
  meta?: string;
  analysisId: string;
  analysisName: string;
}

/**
 * Volgorde binnen een staat. De nummering laat ruimte tussen de stappen zodat
 * er later iets tussen kan zonder alles te herschikken.
 *
 * De volgorde loopt van "hier ligt alles stil zonder jou" naar "hier valt iets
 * te winnen". Wie van boven naar beneden werkt, doet automatisch het juiste
 * eerst.
 */
export const URGENCY = {
  blokkade: 10,
  goedkeuring: 20,
  herstel: 30,
  publiceren: 40,
  nakijken: 45,
  offsite: 50,
  feit: 60,
  schrijven: 70,
  gemeten: 80,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Ophalen
// ─────────────────────────────────────────────────────────────────────────────

/** De ruwe rijen waaruit werk wordt afgeleid. Eén vorm, twee schaalniveaus. */
interface WorkSources {
  analyses: Analysis[];
  pieces: PieceRow[];
  offsite: OffsiteTask[];
  facts: Pick<FactRequest, "id" | "profile_id" | "question" | "reason">[];
  /** Per profiel de blokkades uit de nieuwste audit. */
  blockersByProfile: Map<string, { checks: AuditCheck[]; since: string | null }>;
  /** content_piece_id's waarvoor al een effect berekend is. */
  measuredPieceIds: Set<string>;
}

type PieceRow = Pick<
  ContentPiece,
  "id" | "analysis_id" | "title" | "status" | "needs_review" | "published_at" | "created_at"
>;

const PIECE_COLUMNS = "id, analysis_id, title, status, needs_review, published_at, created_at";

/** Het werk van één analyse, voor hoofdstuk 03 van het dossier. */
export async function loadWork(db: Db, analysis: Analysis): Promise<WorkItem[]> {
  const sources = await fetchSources(db, [analysis]);
  return deriveWork(sources);
}

/**
 * Al het werk binnen ÉÉN merk.
 *
 * Lezen loopt via RLS (SELECT-only, gefilterd op eigenaar en account); de
 * expliciete filters hieronder zijn een tweede slot op dezelfde deur.
 *
 * ── WAAROM HET MERK EEN VERPLICHT ARGUMENT IS ───────────────────────────────
 *
 * Deze functie heette tot 27 augustus 2026 `loadWorkAcross` en haalde élke
 * analyse van de gebruiker op, over al zijn merken heen. De twee schermen die
 * hem aanriepen filterden daarna zelf op het merk waar de klant naar keek.
 *
 * Dat werkte, en dat is precies het probleem: filteren is een intentie, de
 * query is de garantie (conventie 1). Eén vergeten filter op een nieuw scherm
 * en de klant ziet cijfers van een ander merk in zijn eigen overzicht. Bij een
 * bureau met drie merken in één account is dat geen theorie.
 *
 * De regel is sinds vandaag hard: een klant ziet nooit gegevens van meer dan
 * één merk tegelijk. Het merk is daarom een argument zonder standaardwaarde en
 * gaat mee de database in. Wie een nieuw scherm bouwt, moet van de compiler een
 * merk kiezen in plaats van er stilzwijgend alles bij te krijgen.
 */
export async function loadBrandWork(
  db: Db,
  userId: string,
  profileId: string,
): Promise<{
  analyses: Analysis[];
  work: WorkItem[];
}> {
  // Gearchiveerde analyses tellen nergens mee, niet in de lijst, niet in de
  // werkitems, niet in de kaartcijfers (migratie 0044).
  const { data } = await activeOnly(
    db.from("analyses").select("*").eq("user_id", userId).eq("profile_id", profileId),
  ).order("created_at", { ascending: false });

  const analyses = (data ?? []) as Analysis[];
  if (analyses.length === 0) return { analyses, work: [] };

  const sources = await fetchSources(db, analyses);
  return { analyses, work: deriveWork(sources) };
}

async function fetchSources(db: Db, analyses: Analysis[]): Promise<WorkSources> {
  const ids = analyses.map((a) => a.id);
  const profileIds = Array.from(new Set(analyses.map((a) => a.profile_id)));

  const [
    { data: pieceRows },
    { data: offsiteRows },
    { data: factRows },
    { data: auditRows },
    { data: impactRows },
  ] = await Promise.all([
    // Alleen de HUIDIGE versie per pagina: een vervangen versie is geen werk.
    db.from("content_pieces").select(PIECE_COLUMNS).in("analysis_id", ids).eq("is_current", true),
    db.from("offsite_tasks").select("*").in("analysis_id", ids).order("priority"),
    db
      .from("fact_requests")
      .select("id, profile_id, question, reason")
      .in("profile_id", profileIds)
      .eq("status", "open"),
    // Meerdere audits per profiel, aflopend: de nieuwste telt, de rest dient om
    // te bepalen sinds wanneer een blokkade er onafgebroken staat.
    db
      .from("technical_audits")
      .select("profile_id, checked_at, checks_json")
      .in("profile_id", profileIds)
      .order("checked_at", { ascending: false })
      .limit(24 * profileIds.length),
    db.from("content_impact").select("content_piece_id").in("analysis_id", ids),
  ]);

  return {
    analyses,
    pieces: (pieceRows ?? []) as PieceRow[],
    offsite: (offsiteRows ?? []) as OffsiteTask[],
    facts: (factRows ?? []) as WorkSources["facts"],
    blockersByProfile: blockersPerProfile(
      (auditRows ?? []) as { profile_id: string; checked_at: string; checks_json: unknown }[],
    ),
    measuredPieceIds: new Set((impactRows ?? []).map((r) => r.content_piece_id as string)),
  };
}

/**
 * Per profiel: de blokkades uit de nieuwste audit, plus sinds wanneer ze er
 * onafgebroken staan.
 *
 * Dat laatste is geen luxe. "Dit is nieuw sinds vorige maand" wijst naar een
 * recente aanpassing en is een concreet gesprek met de webbouwer; "dit staat er
 * al een jaar" betekent dat de klant al een jaar onzichtbaar is zonder het te
 * weten. Dezelfde blokkade, een heel ander gesprek.
 */
function blockersPerProfile(
  rows: { profile_id: string; checked_at: string; checks_json: unknown }[],
): Map<string, { checks: AuditCheck[]; since: string | null }> {
  const byProfile = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byProfile.get(row.profile_id) ?? [];
    list.push(row);
    byProfile.set(row.profile_id, list);
  }

  const result = new Map<string, { checks: AuditCheck[]; since: string | null }>();
  for (const [profileId, audits] of byProfile) {
    // De query gaf aflopend terug, maar niet gegarandeerd per profiel gegroepeerd.
    const sorted = [...audits].sort((a, b) => b.checked_at.localeCompare(a.checked_at));
    const latest = (sorted[0].checks_json ?? []) as AuditCheck[];
    const blockers = latest.filter((c) => c.severity === "blocker");
    if (blockers.length === 0) {
      result.set(profileId, { checks: [], since: null });
      continue;
    }

    const blockerIds = new Set(blockers.map((b) => b.id));
    let since = sorted[0].checked_at;
    for (const older of sorted.slice(1)) {
      const checks = (older.checks_json ?? []) as AuditCheck[];
      const stillBlocked = checks.some((c) => blockerIds.has(c.id) && c.severity === "blocker");
      if (!stillBlocked) break; // de reeks is hier gebroken
      since = older.checked_at;
    }
    result.set(profileId, { checks: blockers, since });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Afleiden
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure functie: ruwe rijen in, werk uit. Geen database, geen React, zodat het
 * te testen is en zodat het dashboard en het dossier gegarandeerd hetzelfde
 * zeggen over hetzelfde item.
 */
export function deriveWork(sources: WorkSources): WorkItem[] {
  const items: WorkItem[] = [];
  const { analyses, blockersByProfile, measuredPieceIds } = sources;

  // Eén blokkade-item per PROFIEL, niet per analyse: dezelfde site drie keer
  // aanmelden als kapot is geen overzicht. Het item hangt aan de eerste analyse
  // van dat profiel, puur om ergens naartoe te kunnen wijzen.
  const seenProfiles = new Set<string>();

  for (const analysis of analyses) {
    const name = analysis.name;

    if (!seenProfiles.has(analysis.profile_id)) {
      seenProfiles.add(analysis.profile_id);
      const blocked = blockersByProfile.get(analysis.profile_id);
      if (blocked && blocked.checks.length > 0) {
        const n = blocked.checks.length;
        items.push({
          id: `blokkade:${analysis.profile_id}`,
          kind: "blokkade",
          state: "nu",
          title:
            n === 1
              ? "Je website houdt AI-assistenten buiten"
              : `Je website houdt AI-assistenten buiten (${n} blokkades)`,
          why: "Zolang dit zo staat, kan geen enkele pagina die je publiceert door een AI geciteerd worden. Alles hieronder levert pas iets op als dit opgelost is.",
          urgency: URGENCY.blokkade,
          href: `/merk/${analysis.profile_id}/analytics`,
          actionLabel: "Bekijk wat er mis is",
          meta: blocked.since ? `Onveranderd sinds ${formatDateShort(blocked.since)}` : undefined,
          analysisId: analysis.id,
          analysisName: name,
        });
      }
    }

    if (STATUS_META[analysis.status].actionRequired) {
      items.push({
        id: `goedkeuring:${analysis.id}`,
        kind: "goedkeuring",
        state: "nu",
        title: "Bekijk en bevestig het concept",
        why: "Het onderzoek en de vragen staan klaar. Jij geeft akkoord, ORBIT ENGINE begint te meten.",
        urgency: URGENCY.goedkeuring,
        href: `/analyses/${analysis.id}/concept`,
        actionLabel: "Naar het concept",
        analysisId: analysis.id,
        analysisName: name,
      });
    }

    if (analysis.status === "mislukt") {
      items.push({
        id: `herstel:${analysis.id}`,
        kind: "herstel",
        state: "nu",
        title: "Er is iets misgegaan",
        why: "Open het cluster om te zien waar het spaak liep en het opnieuw te proberen.",
        urgency: URGENCY.herstel,
        href: `/analyses/${analysis.id}`,
        actionLabel: "Bekijk wat er misging",
        analysisId: analysis.id,
        analysisName: name,
      });
    }

    if (analysis.status === "bezig" || analysis.status === "meten") {
      items.push({
        id: `loopt:${analysis.id}`,
        kind: "goedkeuring",
        state: "loopt",
        title: analysis.status === "meten" ? "De meting draait" : "Het onderzoek draait",
        why: "ORBIT ENGINE werkt op de achtergrond door, ook als je de browser sluit. Jij hoeft niets.",
        urgency: URGENCY.goedkeuring,
        href: `/analyses/${analysis.id}`,
        analysisId: analysis.id,
        analysisName: name,
      });
    }
  }

  const byAnalysis = new Map(analyses.map((a) => [a.id, a]));

  // ── Pagina's ───────────────────────────────────────────────────────────────
  // De staat van een pagina IS zijn plek in de lijst. Dat is precies wat er
  // ontbrak: `content_pieces.status` bestond al, maar was versiering op een
  // kaartje in plaats van de as waarlangs alles staat.
  for (const piece of sources.pieces) {
    const analysis = byAnalysis.get(piece.analysis_id);
    if (!analysis) continue;
    const href = `/analyses/${piece.analysis_id}/bibliotheek/${piece.id}`;

    if (piece.published_at) {
      const measured = measuredPieceIds.has(piece.id);
      items.push({
        id: `pagina:${piece.id}`,
        kind: "pagina",
        state: measured ? "klaar" : "wacht",
        title: piece.title,
        why: measured
          ? "Gepubliceerd en hermeten. Het resultaat staat in hoofdstuk 04."
          : "Gepubliceerd. ORBIT ENGINE hermeet na twee en na vier weken. AI-assistenten pikken nieuwe content niet dezelfde dag op.",
        urgency: URGENCY.gemeten,
        href,
        meta: measured
          ? `Gepubliceerd ${formatDateShort(piece.published_at)}`
          : `Hermeting rond ${formatDateShort(addDays(piece.published_at, 14))}`,
        analysisId: piece.analysis_id,
        analysisName: analysis.name,
      });
      continue;
    }

    // ⚠️ De briefingfase MOET vóór de val naar "klaar" hieronder staan.
    //
    // Gevonden op 31 augustus 2026, in de eerste live doorloop van de hele
    // klantreis. Sinds R5.1 begint een pagina niet meer bij `draft` maar bij
    // `briefing`: de klant kiest een aanbeveling, ORBIT ENGINE bouwt de
    // feitenkaart, en pas na "Schrijf mijn pagina" gaat er een schrijftaak de
    // rij in. Die vijfde status is toen niet aan dit bestand toegevoegd, en
    // omdat alles wat geen `draft` en niet gepubliceerd is doorvalt naar de
    // tak "klaar of gearchiveerd", kreeg de klant een pagina zonder één woord
    // tekst voorgeschoteld als "de tekst is klaar om te publiceren", met een
    // knop Publiceren ernaast. Precies in het scherm dat hoort te vertellen
    // wat er zonder hem stilligt.
    //
    // De urgentie is die van een feitenvraag en niet die van publiceren: dit
    // is uitvragen, geen afronden. Hij staat wel apart van de merkbrede
    // feitenkaart hierboven, want die wijst naar de vragenpagina van het merk
    // en deze naar de briefing van déze pagina, waar de knop staat die het
    // schrijven daadwerkelijk in gang zet.
    if (piece.status === "briefing") {
      items.push({
        id: `pagina:${piece.id}`,
        kind: "pagina",
        state: "nu",
        title: piece.title,
        why: "De briefing staat klaar. Vul aan wat ORBIT ENGINE niet van je website kan halen, dan schrijft het de pagina.",
        urgency: URGENCY.feit,
        href: `/analyses/${piece.analysis_id}/briefing`,
        actionLabel: "Briefing invullen",
        analysisId: piece.analysis_id,
        analysisName: analysis.name,
      });
      continue;
    }

    if (piece.status === "draft") {
      items.push({
        id: `pagina:${piece.id}`,
        kind: "pagina",
        state: "loopt",
        title: piece.title,
        why: "ORBIT ENGINE schrijft dit nu. Zodra de tekst klaar is, staat hij hier om na te kijken.",
        urgency: URGENCY.schrijven,
        href,
        analysisId: piece.analysis_id,
        analysisName: analysis.name,
      });
      continue;
    }

    // ready of archived, nog niet gepubliceerd → er wordt iets van de klant verwacht.
    items.push({
      id: `pagina:${piece.id}`,
      kind: "pagina",
      state: "nu",
      title: piece.title,
      why: piece.needs_review
        ? "De tekst is klaar, maar de eindredactie zag nog iets. Kijk het na en publiceer daarna."
        : "De tekst is klaar om te publiceren. Zolang hij niet op je site staat, beweegt je zichtbaarheid niet.",
      urgency: piece.needs_review ? URGENCY.nakijken : URGENCY.publiceren,
      href,
      actionLabel: piece.needs_review ? "Nakijken" : "Publiceren",
      analysisId: piece.analysis_id,
      analysisName: analysis.name,
    });
  }

  // ── Off-site ───────────────────────────────────────────────────────────────
  for (const task of sources.offsite) {
    const analysis = byAnalysis.get(task.analysis_id);
    if (!analysis) continue;

    const state: WorkState =
      task.status === "open" ? "nu" : task.status === "bezig" ? "loopt" : "klaar";

    items.push({
      id: `offsite:${task.id}`,
      kind: "offsite",
      state,
      title: task.title,
      why: task.why,
      urgency: URGENCY.offsite,
      // Off-site werk vink je af in het blok onderaan hetzelfde hoofdstuk.
      href: `/analyses/${task.analysis_id}?hoofdstuk=werk#offsite`,
      meta: task.domain ?? undefined,
      analysisId: task.analysis_id,
      analysisName: analysis.name,
    });
  }

  // ── Feitenvragen ───────────────────────────────────────────────────────────
  // Eén item per profiel, niet per vraag: acht regels over hetzelfde onderwerp
  // is geen overzicht. Ze staan bij het PROFIEL in de database, maar het is
  // werk dat déze analyse beter maakt, dus hoort het hier, niet weggestopt op
  // een merkscherm.
  const factsByProfile = new Map<string, number>();
  for (const fact of sources.facts) {
    factsByProfile.set(fact.profile_id, (factsByProfile.get(fact.profile_id) ?? 0) + 1);
  }
  for (const [profileId, count] of factsByProfile) {
    const analysis = analyses.find((a) => a.profile_id === profileId);
    if (!analysis) continue;
    items.push({
      id: `feit:${profileId}`,
      kind: "feit",
      state: "nu",
      title: count === 1 ? "Eén vraag over je bedrijf" : `${count} vragen over je bedrijf`,
      why: "Concrete cijfers en jaartallen zijn precies wat een AI-assistent aanhaalt. Eén keer invullen, en élke pagina die ORBIT ENGINE daarna schrijft wordt citeerbaarder.",
      urgency: URGENCY.feit,
      href: `/merk/${profileId}/strategie/vragen`,
      actionLabel: "Beantwoorden",
      analysisId: analysis.id,
      analysisName: analysis.name,
    });
  }

  return sortWork(items);
}

/** Eerst op staat, dan op urgentie, dan op titel, stabiel over renders heen. */
export function sortWork(items: WorkItem[]): WorkItem[] {
  const stateOrder = new Map(WORK_STATES.map((s, i) => [s, i]));
  return [...items].sort((a, b) => {
    const byState = (stateOrder.get(a.state) ?? 9) - (stateOrder.get(b.state) ?? 9);
    if (byState !== 0) return byState;
    if (a.urgency !== b.urgency) return a.urgency - b.urgency;
    return a.title.localeCompare(b.title, "nl");
  });
}

/** Groepeert op staat, met lege groepen eruit. */
export function groupWork(items: WorkItem[]): { state: WorkState; items: WorkItem[] }[] {
  return WORK_STATES.map((state) => ({
    state,
    items: items.filter((i) => i.state === state),
  })).filter((g) => g.items.length > 0);
}

/** Hoeveel er nú van de klant wordt verwacht, het getal voor badges. */
export function countNow(items: WorkItem[]): number {
  return items.filter((i) => i.state === "nu").length;
}



function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
