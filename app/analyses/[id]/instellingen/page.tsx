import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import type { BrandDna, Prompt } from "@/lib/types/database";
import { BrandDnaEditor } from "./brand-dna-editor";
import { PromptsManager } from "./prompts-manager";
import { ConfirmBar } from "./confirm-bar";
import { TrackingToggle } from "./tracking-toggle";

/**
 * Instellingen = het concept-/review-scherm (abcplan.md §3.6) de EERSTE keer
 * (status concept_klaar, met verplichte ConfirmBar), en daarna de doorlopende
 * beheerplek (§3.5, zonder verplichting — CRUD blijft, de bevestig-knop niet).
 */
export default async function InstellingenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const supabase = await createClient();
  const [{ data: dnaRow }, { data: promptRows }] = await Promise.all([
    supabase.from("brand_dna").select("*").eq("analysis_id", id).maybeSingle(),
    supabase.from("prompts").select("*").eq("analysis_id", id).order("created_at"),
  ]);

  const dna = dnaRow as BrandDna | null;
  const prompts = (promptRows ?? []) as Prompt[];
  const isReviewGate = analysis.status === "concept_klaar";

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <span className="mono-label">Analyse</span>
        <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
          <span className="text-secondary">Website</span>
          <span className="font-medium">{analysis.url}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-secondary">Onderwerp</span>
          <span className="font-medium">{analysis.topic ?? "Hele website"}</span>
        </div>
        <p className="text-sm text-muted">
          Website en onderwerp liggen na de start vast. Wil je een andere scope? Start dan een
          nieuwe analyse.
        </p>
      </div>

      {isReviewGate && (
        <div className="card" style={{ borderColor: "rgba(165,120,240,0.4)" }}>
          <p className="text-secondary">
            Dit is automatisch afgeleid uit je website. Controleer en pas aan waar nodig, en
            bevestig daarna onderaan om de meting te starten.
          </p>
        </div>
      )}

      {dna ? (
        <BrandDnaEditor analysisId={id} initial={dna} />
      ) : (
        <div className="card">
          <p className="text-secondary">Brand DNA wordt nog voorbereid…</p>
        </div>
      )}

      {prompts.length > 0 && <PromptsManager analysisId={id} initial={prompts} />}

      <TrackingToggle analysisId={id} initial={analysis.tracking_enabled} />

      {isReviewGate && <ConfirmBar analysisId={id} />}
    </div>
  );
}
