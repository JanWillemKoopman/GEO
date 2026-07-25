import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAnalysis } from "@/lib/analyses";
import { StatusBadge } from "@/components/status-badge";
import { AnalysisTabs } from "./tabs";

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/analyses" className="mono-label transition-colors hover:text-[var(--text-primary)]">
          ← Mijn analyses
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{analysis.name}</h1>
          <StatusBadge status={analysis.status} />
        </div>
      </div>

      <AnalysisTabs analysisId={id} />

      <div>{children}</div>
    </div>
  );
}
