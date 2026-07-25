import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { LibraryList } from "./library-list";
import type { ContentPiece } from "@/lib/types/database";

/**
 * Content Bibliotheek (abcplan.md §8): de opleverplek per analyse. Vult zich
 * verder zodra de klant vanuit het Rapport pagina's laat genereren.
 */
export default async function BibliotheekPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("content_pieces")
    .select("*")
    .eq("analysis_id", id)
    .order("created_at", { ascending: false });

  const pieces = (data ?? []) as ContentPiece[];

  if (pieces.length === 0) {
    return (
      <EmptyState title="Je bibliotheek is nog leeg">
        Ga naar het Rapport en kies welke pagina&apos;s je wilt laten schrijven. De gegenereerde
        content verschijnt hier als kaarten die je kunt lezen, kopiëren of downloaden.
      </EmptyState>
    );
  }

  return <LibraryList analysisId={id} pieces={pieces} />;
}
