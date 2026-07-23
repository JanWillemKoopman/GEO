import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";

/**
 * Instellingen-tab. In Sprint 3 wordt dit het concept-/review-scherm (Brand DNA
 * + prompts bewerkbaar + "Bevestig en start meting"). Nu tonen we alvast de
 * read-only basisgegevens (website + onderwerp — niet wijzigbaar na start, §3.3).
 */
export default async function InstellingenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-4">
        <span className="mono-label">Analyse</span>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
            <span className="text-secondary">Website</span>
            <span className="font-medium">{analysis.url}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-secondary">Onderwerp</span>
            <span className="font-medium">{analysis.topic ?? "Hele website"}</span>
          </div>
        </div>
        <p className="text-sm text-muted">
          Website en onderwerp liggen na de start vast. Wil je een andere scope? Start dan een
          nieuwe analyse.
        </p>
      </div>

      <div className="card flex flex-col gap-2">
        <span className="mono-label">Brand DNA &amp; prompts</span>
        <p className="text-secondary">
          Zodra de analyse is voorbereid, verschijnen hier het automatisch afgeleide Brand DNA en
          de 30 prompts — volledig leesbaar en bewerkbaar — met de knop{" "}
          <span className="font-medium text-[var(--text-primary)]">
            &quot;Bevestig en start meting&quot;
          </span>
          .
        </p>
      </div>
    </div>
  );
}
