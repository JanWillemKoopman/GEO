import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { AnalysisNav } from "./tabs";

export default async function AnalysisLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  // Zolang het concept nog bevestigd moet worden, is er maar één taak. Dan
  // hoort er geen navigatie te staan die daarvan afleidt en die toch nergens
  // heen kan. Alle andere routes sturen in die toestand door naar /concept.
  const awaitingApproval = analysis.status === "concept_klaar";

  // Het aantal geschreven pagina's staat bij de bibliotheek in de navigatie:
  // het eindproduct verdient een teller, niet alleen een woord.
  let libraryCount = 0;
  if (!awaitingApproval) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("content_pieces")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", id)
      .eq("is_current", true);
    libraryCount = count ?? 0;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/analyses"
          className="mono-label transition-colors hover:text-[var(--text-primary)]"
        >
          ← Mijn analyses
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{analysis.name}</h1>
          <StatusBadge status={analysis.status} />
        </div>
      </div>

      {!awaitingApproval && <AnalysisNav analysisId={id} libraryCount={libraryCount} />}

      <div>{children}</div>
    </div>
  );
}
