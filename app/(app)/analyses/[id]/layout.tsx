import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { AnalysisNav } from "./tabs";
import { Icon } from "@/components/icon";

/**
 * A.4: elk scherm een eigen tabbladtitel. Deze laag zet de analysenaam als
 * `%s`-sjabloon neer, elke subpagina hoeft alleen zijn eigen kort woord op te
 * geven (`export const metadata = { title: "Bibliotheek" }`) en Next.js vult
 * het patroon aan tot "Bibliotheek · Acme B.V. · ORBIT ENGINE". Ontbreekt die
 * subtitel, dan valt het terug op de analysenaam alleen (`default`).
 * `getAnalysis` is gememoïseerd (lib/analyses.ts) dus dit is geen tweede query
 * naast de layout zelf.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) return {};
  return {
    title: {
      template: `%s · ${analysis.name} · ORBIT ENGINE`,
      default: `${analysis.name} · ORBIT ENGINE`,
    },
  };
}

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
          <Icon naam="terug" size={14} />
          Mijn clusters
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="type-title">{analysis.name}</h1>
          <StatusBadge status={analysis.status} showWhoseTurn />
        </div>
      </div>

      {!awaitingApproval && <AnalysisNav analysisId={id} libraryCount={libraryCount} />}

      <div>{children}</div>
    </div>
  );
}
