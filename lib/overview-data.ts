import "server-only";

/**
 * De tellingen onder de vier cijfers van de startpagina.
 *
 * De rekenkant staat in `lib/overview.ts`, zonder `server-only` (conventie 2).
 * Hier staat alleen het ophalen.
 *
 * ── ⚠️ DIT VERVANGT `lib/milestones-data.ts` (26 AUGUSTUS 2026) ─────────────
 *
 * Het opbrengstblok ("Actief sinds", "+30 punten", "1 pagina gepubliceerd") is
 * van de startpagina gehaald. Van die drie getallen blijft er één over, en die
 * staat nu bovenaan tussen de vier programmacijfers. De rest van dat blok, plus
 * de waarde per vermelding uit besluit 16, staat in de git-historie; zie
 * `docs/logbook.md` voor waarom het er ooit stond.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { activeOnly } from "@/lib/archive";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Hoeveel pagina's van dit merk staan live?
 *
 * ⚠️ Uit `content_pieces.published_at` en niet uit `planned_pages.posted_at`.
 * Dat zijn twee verschillende verzamelingen: een pagina die geschreven is
 * vóórdat het contentplan bestond, hangt aan geen enkele planregel. Het
 * contentplan telt zijn eigen pagina's en benoemt het verschil
 * (`lib/overview.ts`, `planRegels`).
 */
export async function loadGepubliceerd(admin: Admin, profileId: string): Promise<number> {
  const { data: analysisRows } = await activeOnly(
    admin.from("analyses").select("id").eq("profile_id", profileId),
  );
  const analysisIds = ((analysisRows ?? []) as { id: string }[]).map((a) => a.id);
  if (analysisIds.length === 0) return 0;

  const { count } = await admin
    .from("content_pieces")
    .select("id", { count: "exact", head: true })
    .in("analysis_id", analysisIds)
    .not("published_at", "is", null);

  return count ?? 0;
}

/**
 * De drie contenttotalen van dit merk, over de hele looptijd.
 *
 * ── ⚠️ WAAROM DIT SINDS 28 AUGUSTUS 2026 DRIE GETALLEN ZIJN ─────────────────
 *
 * Tot vandaag haalde de startpagina hier alleen "hoeveel staat er live" op, en
 * kwamen de twee cijfers ernaast uit de kansenlijst: voorgestelde pagina's, dus
 * werk dat nog niet gedaan was. De rij las als opbrengst en telde voornemens.
 * Nu telt hij wat er gemaakt is (`lib/overview.ts`, `overzichtCijfers`).
 *
 * Drie filters die er alle drie toe doen:
 *
 *   • `status <> 'briefing'`: een pagina die nog op antwoorden wacht is niet
 *     geschreven. Zonder dit filter loopt de teller op het moment van klikken
 *     op, en telt het scherm voornemens in plaats van teksten.
 *   • `is_current`: sinds versiebeheer (migratie 0019) kan één pagina meerdere
 *     rijen hebben. Zonder dit filter telt een herschreven pagina twee keer.
 *   • alleen actieve analyses: een gearchiveerd cluster telt nergens mee
 *     (migratie 0044, `lib/archive.ts`).
 *
 * ⚠️ Ook `gepubliceerd` draagt nu `is_current`. Dat deed `loadGepubliceerd` niet,
 * en een pagina die in versie 2 opnieuw gepubliceerd werd telde daardoor dubbel.
 * Bij Gasservice Brabant viel dat niet op, want daar staat één pagina live; bij
 * de eerste herschrijving van een gepubliceerde pagina wel.
 */
export interface ContentTotalen {
  /** Nieuwe pagina's die geschreven zijn, ongeacht of ze live staan. */
  geschreven: number;
  /** Verbeteringen aan bestaande pagina's, ongeacht of ze live staan. */
  geoptimaliseerd: number;
  /** Wat daarvan live staat. Nooit meer dan de twee hierboven samen. */
  gepubliceerd: number;
  /** Wanneer het programma van dit merk begon: de oudste actieve analyse. */
  start: string | null;
}

export async function loadContentTotalen(
  admin: Admin,
  profileId: string,
): Promise<ContentTotalen> {
  const { data: analysisRows } = await activeOnly(
    admin.from("analyses").select("id, created_at").eq("profile_id", profileId),
  );
  const analyses = (analysisRows ?? []) as { id: string; created_at: string }[];
  const analysisIds = analyses.map((a) => a.id);

  // De oudste analyse is de start van het programma. Geen aparte query: deze
  // rijen zijn er toch al.
  const start = analyses
    .map((a) => a.created_at)
    .filter(Boolean)
    .sort()[0] ?? null;

  if (analysisIds.length === 0) {
    return { geschreven: 0, geoptimaliseerd: 0, gepubliceerd: 0, start };
  }

  // Eén query, drie tellingen. Drie losse `count`-queries zouden hetzelfde
  // opleveren maar drie keer over dezelfde index lopen, en dit scherm doet er
  // al genoeg.
  const { data: pieceRows } = await admin
    .from("content_pieces")
    .select("action, published_at")
    .in("analysis_id", analysisIds)
    .eq("is_current", true)
    .neq("status", "briefing");

  const pieces = (pieceRows ?? []) as { action: string | null; published_at: string | null }[];

  return {
    geschreven: pieces.filter((p) => p.action !== "verbeteren").length,
    geoptimaliseerd: pieces.filter((p) => p.action === "verbeteren").length,
    gepubliceerd: pieces.filter((p) => p.published_at !== null).length,
    start,
  };
}
