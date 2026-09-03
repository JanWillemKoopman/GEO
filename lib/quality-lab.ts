import "server-only";

/**
 * HET KWALITEITSLAB: de data eronder
 * (docs/tasks/contentkwaliteit-framework.md §6, punt 12 en 25 van de opdracht)
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Voor de meting bestaat een evaluatieset (`npm run eval:mention`). Voor het
 * schrijven, het duurste en belangrijkste onderdeel van de app, bestond niets.
 * Elke wijziging aan de schrijfinstructie was daardoor een gok met een
 * overtuigend verhaal eromheen (herstelplan T2).
 *
 * Dit is de leeslaag onder dat lab: welke pagina's zijn beoordeeld, wat vond de
 * app ervan, wat vond een mens ervan, en waar lopen die twee uit elkaar. Dat
 * laatste is het punt: een AI-beoordelaar die structureel milder is dan een
 * mens, is een beoordelaar die niets bewaakt.
 *
 * ── GEEN APARTE BENCHMARKSTRUCTUUR ──────────────────────────────────────────
 *
 * Merk is `profiles`, cluster is `analyses`, pagina is `content_pieces`. Een
 * benchmark van twintig pagina's is een LABEL op bestaande rijen
 * (`content_quality_reviews.benchmark_set`), geen vierde structuur ernaast.
 * Twintig pagina's of duizend maakt daarmee geen verschil.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentQualityReview, ContentType } from "@/lib/types/database";

/** Eén pagina zoals het lab hem toont. */
export interface LabPagina {
  pieceId: string;
  analysisId: string;
  profileId: string | null;
  merk: string;
  cluster: string;
  titel: string;
  type: ContentType;
  status: string;
  /** Het gewogen cijfer uit het raamwerk. `null` = beoordeeld vóór migratie 0091. */
  score: number | null;
  confidence: number | null;
  verdict: "pass" | "repair" | "block" | null;
  /** De redactionele score, voor de vergelijking met de oude reeks. */
  redactioneel: number | null;
  bronherleidbaarheid: number | null;
  kritiekeDekking: number | null;
  woorden: number | null;
  rondes: number;
  aangemaakt: string;
  /** De menselijke beoordeling, als die er is. */
  review: ContentQualityReview | null;
}

/** De velden die het lab van een pagina nodig heeft. */
const PIECE_VELDEN =
  "id, analysis_id, title, type, status, quality_score, quality_confidence, quality_verdict, " +
  "source_coverage, critical_evidence_coverage, word_count, repair_round, created_at, quality_json";

/**
 * De beoordeelde pagina's, nieuwste eerst.
 *
 * `benchmarkSet` filtert op de pagina's die aan één benchmark hangen. Leeg
 * betekent alles, en dat is de normale weergave: het lab is ook bruikbaar
 * zonder dat er ooit een benchmark is aangemaakt.
 */
export async function loadLabPaginas(
  admin: SupabaseClient,
  opties: { limit?: number; benchmarkSet?: string | null } = {},
): Promise<LabPagina[]> {
  const { limit = 100, benchmarkSet = null } = opties;

  // Bij een benchmarkfilter beginnen we bij de beoordelingen: die bepalen dan
  // welke pagina's in beeld komen, en dat is een veel kleinere verzameling dan
  // alle geschreven pagina's.
  let pieceIds: string[] | null = null;
  if (benchmarkSet) {
    const { data } = await admin
      .from("content_quality_reviews")
      .select("content_piece_id")
      .eq("benchmark_set", benchmarkSet);
    pieceIds = [...new Set((data ?? []).map((r) => r.content_piece_id as string))];
    if (pieceIds.length === 0) return [];
  }

  let query = admin
    .from("content_pieces")
    .select(PIECE_VELDEN)
    .eq("is_current", true)
    .not("body_markdown", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (pieceIds) query = query.in("id", pieceIds);

  const { data, error } = await query;
  // Bewust via `unknown` gecast: de Supabase-typen leiden bij een selectstring
  // met veertien kolommen geen rijvorm meer af en vallen terug op een foutunie.
  // Dezelfde constructie als elders in de app waar een brede select nodig is.
  const rijen = (data ?? []) as unknown as Record<string, unknown>[];
  if (error || rijen.length === 0) return [];

  const ids = rijen.map((r) => r.id as string);
  const analyseIds = [...new Set(rijen.map((r) => r.analysis_id as string).filter(Boolean))];

  const [{ data: analyses }, { data: reviews }] = await Promise.all([
    admin.from("analyses").select("id, topic, profile_id").in("id", analyseIds),
    admin
      .from("content_quality_reviews")
      .select("*")
      .in("content_piece_id", ids)
      .order("created_at", { ascending: false }),
  ]);

  const profielIds = [...new Set((analyses ?? []).map((a) => a.profile_id as string).filter(Boolean))];
  const { data: profielen } = profielIds.length
    ? await admin.from("profiles").select("id, name, brand_name").in("id", profielIds)
    : { data: [] as { id: string; name: string; brand_name: string | null }[] };

  const analysePerId = new Map(
    (analyses ?? []).map((a) => [a.id as string, a as { id: string; topic: string; profile_id: string }]),
  );
  const profielPerId = new Map(
    (profielen ?? []).map((p) => [
      p.id as string,
      ((p.brand_name as string | null) ?? (p.name as string)) || "onbekend merk",
    ]),
  );
  // De NIEUWSTE beoordeling per pagina wint: de query staat aflopend op datum,
  // dus de eerste die we tegenkomen is de meest recente.
  const reviewPerPiece = new Map<string, ContentQualityReview>();
  for (const review of (reviews ?? []) as ContentQualityReview[]) {
    if (!reviewPerPiece.has(review.content_piece_id)) {
      reviewPerPiece.set(review.content_piece_id, review);
    }
  }

  return rijen.map((rij) => {
    const analyse = analysePerId.get(rij.analysis_id as string);
    const kwaliteit = (rij.quality_json ?? null) as { score?: number | null } | null;
    return {
      pieceId: rij.id as string,
      analysisId: rij.analysis_id as string,
      profileId: analyse?.profile_id ?? null,
      merk: analyse?.profile_id ? (profielPerId.get(analyse.profile_id) ?? "onbekend merk") : "onbekend merk",
      cluster: analyse?.topic ?? "",
      titel: (rij.title as string) ?? "",
      type: (rij.type as ContentType) ?? "article",
      status: (rij.status as string) ?? "",
      score: kwaliteit?.score ?? null,
      confidence: rij.quality_confidence === null ? null : Number(rij.quality_confidence),
      verdict: (rij.quality_verdict as LabPagina["verdict"]) ?? null,
      redactioneel: rij.quality_score === null ? null : Number(rij.quality_score),
      bronherleidbaarheid: rij.source_coverage === null ? null : Number(rij.source_coverage),
      kritiekeDekking:
        rij.critical_evidence_coverage === null ? null : Number(rij.critical_evidence_coverage),
      woorden: rij.word_count === null ? null : Number(rij.word_count),
      rondes: Number(rij.repair_round) || 0,
      aangemaakt: (rij.created_at as string) ?? "",
      review: reviewPerPiece.get(rij.id as string) ?? null,
    };
  });
}

/** De benchmarklabels die er zijn, met hoeveel pagina's eraan hangen. */
export async function loadBenchmarkSets(
  admin: SupabaseClient,
): Promise<{ naam: string; paginas: number }[]> {
  const { data } = await admin
    .from("content_quality_reviews")
    .select("benchmark_set, content_piece_id")
    .not("benchmark_set", "is", null);
  const perSet = new Map<string, Set<string>>();
  for (const rij of data ?? []) {
    const naam = (rij.benchmark_set as string)?.trim();
    if (!naam) continue;
    const bestaand = perSet.get(naam) ?? new Set<string>();
    bestaand.add(rij.content_piece_id as string);
    perSet.set(naam, bestaand);
  }
  return [...perSet.entries()]
    .map(([naam, ids]) => ({ naam, paginas: ids.size }))
    .sort((a, b) => b.paginas - a.paginas || a.naam.localeCompare(b.naam));
}
