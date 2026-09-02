import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { activeOnly } from "@/lib/archive";
import { LibraryView } from "./library-view";
import type { LibraryRow } from "@/lib/library";
import { displayTitle } from "@/lib/pipeline/slug";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bibliotheek" };

/**
 * DE MERKBREDE BIBLIOTHEEK: alles wat ORBIT ENGINE voor dit merk schreef.
 *
 * ── WAAROM DIT SCHERM ER MOEST KOMEN ────────────────────────────────────────
 *
 * Content stond per cluster in een eigen bibliotheek. Een klant met vier
 * clusters had dus vier bibliotheken en nergens een overzicht van wat hij
 * gekocht heeft, terwijl dit het eindproduct is waar hij voor betaalt
 * (besluit 5, 17 augustus 2026).
 *
 * De bibliotheek per cluster (`/analyses/[id]/bibliotheek`) blijft bestaan als
 * doorklik vanuit het dossier. Dit is de verzamelplek, niet de vervanging, en
 * de twee horen hetzelfde aantal te tonen.
 *
 * ⚠️ Alleen de HUIDIGE versie per pagina. Oudere versies blijven bewaard en zijn
 * te bereiken vanaf de detailpagina; ze horen niet in een overzicht dat de vraag
 * "wat heb ik?" moet beantwoorden.
 */
export default async function BibliotheekPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();
  await requireUser();

  const supabase = await createClient();

  // Eerst de clusters van dit merk, dan de pagina's eronder. Twee query's en
  // geen join: de clusternaam komt uit `analyses` en die tabel filtert ook op
  // gearchiveerd (`lib/archive.ts`), wat in een geneste select niet meegaat.
  const { data: analysisRows } = await activeOnly(
    supabase.from("analyses").select("id, name").eq("profile_id", id),
  );
  const clusters = (analysisRows ?? []) as { id: string; name: string }[];

  let rows: LibraryRow[] = [];
  if (clusters.length > 0) {
    const naamVan = new Map(clusters.map((c) => [c.id, c.name]));
    const { data: pieceRows } = await supabase
      .from("content_pieces")
      .select(
        "id, analysis_id, title, meta_title, type, status, needs_review, geo_score, published_url, created_at",
      )
      .in(
        "analysis_id",
        clusters.map((c) => c.id),
      )
      .eq("is_current", true)
      .order("created_at", { ascending: false });

    rows = ((pieceRows ?? []) as Record<string, unknown>[]).map((p) => ({
      id: p.id as string,
      analysisId: p.analysis_id as string,
      cluster: naamVan.get(p.analysis_id as string) ?? "Onbekend cluster",
      // De paginatitel, niet de aanbevelingstitel (doorloop-huyberts.md punt 3).
      title: displayTitle({ title: p.title as string, meta_title: (p.meta_title as string | null) ?? null }),
      type: p.type as string,
      status: p.status as string,
      needsReview: Boolean(p.needs_review),
      geoScore: (p.geo_score as number | null) ?? null,
      publishedUrl: (p.published_url as string | null) ?? null,
      createdAt: p.created_at as string,
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Strategie"
        title="Bibliotheek"
        description="Alles wat ORBIT ENGINE voor dit merk schreef, over je clusters heen."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Je bibliotheek is nog leeg"
          action={{ href: `/merk/${id}/strategie/clusters`, label: "Naar je clusters" }}
        >
          Zodra ORBIT ENGINE de eerste pagina schrijft, staat hij hier. In hoofdstuk 03 van een
          cluster kies je welke pagina&apos;s aan de beurt zijn, met per pagina de vragen die hij
          moet winnen.
        </EmptyState>
      ) : (
        <LibraryView rows={rows} />
      )}
    </div>
  );
}
