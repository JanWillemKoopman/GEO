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
  // Alleen de HUIDIGE versie per pagina (optimalisatie.md 4.7). Oudere versies
  // blijven bewaard en zijn te bereiken vanaf de detailpagina; ze horen niet in
  // een overzicht dat de vraag "wat kan ik publiceren?" moet beantwoorden.
  const { data } = await supabase
    .from("content_pieces")
    .select("*")
    .eq("analysis_id", id)
    .eq("is_current", true)
    .order("created_at", { ascending: false });

  const pieces = (data ?? []) as ContentPiece[];

  if (pieces.length === 0) {
    return (
      <EmptyState
        title="Je bibliotheek is nog leeg"
        action={{ href: `/analyses/${id}#werk`, label: "Kies wat Aura gaat schrijven" }}
      >
        In hoofdstuk 03 van je analyse staat welke pagina&apos;s Aura voor je kan schrijven, met per
        pagina de vragen die hij moet winnen. Alles wat geschreven is, staat hier klaar — om te
        lezen, te bewerken, te kopiëren en te downloaden.
      </EmptyState>
    );
  }

  return <LibraryList analysisId={id} pieces={pieces} />;
}
