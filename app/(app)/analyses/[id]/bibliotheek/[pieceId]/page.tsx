import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { displayTitle } from "@/lib/pipeline/slug";
import { leesHerkomst, terugLink } from "@/lib/origin";
import { requireUser } from "@/lib/auth";
import { paginaHref } from "@/lib/pagina-data";
import { ContentDetail } from "./content-detail";

/**
 * A.4: deze route heeft geen `layout.tsx` boven zich die de titel al zet, dus
 * elke paginaweergave haalt de titel zelf op.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; pieceId: string }>;
}): Promise<Metadata> {
  const { pieceId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_pieces")
    .select("title, meta_title")
    .eq("id", pieceId)
    .maybeSingle();
  const piece = data as { title: string; meta_title: string | null } | null;
  return { title: piece ? displayTitle(piece) : "Contentpagina" };
}

/**
 * Het oude adres van een pagina, onder het cluster.
 *
 * ── WAAROM DIT NU DOORSTUURT (23 september 2026) ───────────────────────────
 *
 * Een klik op een pagina in de bibliotheek landde hier, en dan lichtte in het
 * menu "Clusters" op terwijl je vanuit de Bibliotheek kwam. Een pagina heeft nu
 * één eigen adres onder de Bibliotheek (`/merk/[id]/strategie/bibliotheek/[paginaId]`,
 * `docs/tasks/contentflow-een-lijn.md` §4.6). De huidige versie van een pagina
 * stuurt daarom door. Een OUDERE versie blijft hier staan: die hoort bij de
 * versiegeschiedenis en heeft geen stand, geen vragen en geen hoofdknop.
 */
export default async function OudContentAdres({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; pieceId: string }>;
  searchParams: Promise<{ van?: string }>;
}) {
  const { id, pieceId } = await params;
  const van = (await searchParams).van;
  const herkomst = leesHerkomst(van);
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();
  await requireUser();

  const supabase = await createClient();
  const { data } = await supabase
    .from("content_pieces")
    .select("id, is_current")
    .eq("id", pieceId)
    .eq("analysis_id", id)
    .maybeSingle();
  if (!data) notFound();

  if (data.is_current && analysis.profile_id) {
    const { data: plan } = await supabase
      .from("planned_pages")
      .select("id")
      .eq("content_piece_id", pieceId)
      .limit(1)
      .maybeSingle();
    const doel = paginaHref(
      analysis.profile_id,
      (plan?.id as string | undefined) ?? pieceId,
      herkomst === "plan" || herkomst === "taken" || herkomst === "bibliotheek" ? herkomst : undefined,
    );
    redirect(doel);
  }

  return <ContentDetail id={id} pieceId={pieceId} terug={terugLink(herkomst, id, analysis.profile_id)} />;
}
