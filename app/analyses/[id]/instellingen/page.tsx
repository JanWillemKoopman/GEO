import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import type { Profile, TopicResearch, Prompt } from "@/lib/types/database";
import { TopicResearchEditor } from "./topic-research-editor";
import { ContentBriefEditor } from "./content-brief-editor";
import { PromptsManager } from "./prompts-manager";
import { ConfirmBar } from "./confirm-bar";
import { TrackingToggle } from "./tracking-toggle";

/**
 * Instellingen = het concept-/review-scherm (abcplan.md §3.6) de EERSTE keer
 * (status concept_klaar, met verplichte ConfirmBar), en daarna de doorlopende
 * beheerplek (§3.5, zonder verplichting — CRUD blijft, de bevestig-knop niet).
 * Het bedrijfsbrede Brand DNA leeft nu in het klantprofiel (zie ProfielKaart
 * hieronder, alleen-lezen met link naar Profielen om te bewerken).
 */
export default async function InstellingenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const supabase = await createClient();
  const [{ data: profileRow }, { data: researchRow }, { data: promptRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", analysis.profile_id).maybeSingle(),
    supabase.from("topic_research").select("*").eq("analysis_id", id).maybeSingle(),
    supabase.from("prompts").select("*").eq("analysis_id", id).order("created_at"),
  ]);

  const profile = profileRow as Profile | null;
  const research = researchRow as TopicResearch | null;
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
          <span className="font-medium">{analysis.topic}</span>
        </div>
        <p className="text-sm text-muted">
          Website en onderwerp liggen na de start vast. Wil je een andere scope? Start dan een
          nieuwe analyse.
        </p>
      </div>

      {isReviewGate && (
        <div className="card" style={{ borderColor: "rgba(165,120,240,0.4)" }}>
          <p className="text-secondary">
            Dit is automatisch afgeleid uit je klantprofiel en de website. Controleer en pas aan
            waar nodig, en bevestig daarna onderaan om de meting te starten.
          </p>
        </div>
      )}

      {profile ? (
        <div className="card flex flex-col gap-3">
          <span className="mono-label">Klantprofiel</span>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{profile.name}</p>
              <p className="text-sm text-secondary">
                Branche: {profile.industry ?? "onbekend"} · Concurrenten:{" "}
                {profile.competitors.join(", ") || "onbekend"}
              </p>
            </div>
            <Link href={`/profielen/${profile.id}`} className="btn-outline w-fit">
              Bewerk profiel
            </Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="text-secondary">Klantprofiel niet gevonden.</p>
        </div>
      )}

      {research ? (
        <TopicResearchEditor analysisId={id} initial={research} />
      ) : (
        <div className="card">
          <p className="text-secondary">Onderwerp-onderzoek wordt nog voorbereid…</p>
        </div>
      )}

      <ContentBriefEditor analysisId={id} initial={analysis.content_brief} />

      {prompts.length > 0 && <PromptsManager analysisId={id} initial={prompts} />}

      <TrackingToggle analysisId={id} initial={analysis.tracking_enabled} />

      {isReviewGate && <ConfirmBar analysisId={id} />}
    </div>
  );
}
