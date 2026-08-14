import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import type { Profile, TopicResearch, Prompt } from "@/lib/types/database";
import { TopicResearchEditor } from "../_editors/topic-research-editor";
import { ContentBriefEditor } from "../_editors/content-brief-editor";
import { PromptsManager } from "../_editors/prompts-manager";
import { TrackingToggle } from "./tracking-toggle";

export const metadata = { title: "Instellingen" };

/**
 * Instellingen = de doorlopende beheerplek (abcplan.md §3.5).
 *
 * Deze pagina deed tot nu toe twee dingen tegelijk: configuratie én de
 * verplichte goedkeuring van het concept. Die tweede rol is verhuisd naar een
 * eigen scherm (`/concept`), een blokkerende stap in de gebruikersreis hoort
 * niet vermomd te gaan als een configuratiescherm, want "Instellingen" betekent
 * in elke applicatie ter wereld "hier hoef je niet te zijn".
 *
 * Wat hier overblijft is precies wat de naam belooft: dingen die je kúnt
 * aanpassen, niet dingen die je móet doen.
 */
export default async function InstellingenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  // Nog niet bevestigd? Dan hoort de klant op het conceptscherm te zijn. Daar
  // staat dezelfde inhoud, mét de stap die de meting start.
  if (analysis.status === "concept_klaar") redirect(`/analyses/${id}/concept`);

  const supabase = await createClient();
  const [{ data: profileRow }, { data: researchRow }, { data: promptRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", analysis.profile_id).maybeSingle(),
    supabase.from("topic_research").select("*").eq("analysis_id", id).maybeSingle(),
    supabase.from("prompts").select("*").eq("analysis_id", id).order("created_at"),
  ]);

  const profile = profileRow as Profile | null;
  const research = researchRow as TopicResearch | null;
  const prompts = (promptRows ?? []) as Prompt[];

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <span className="mono-label">Cluster</span>
        <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
          <span className="text-secondary">Website</span>
          <span className="break-url font-medium">{analysis.url}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-secondary">Onderwerp</span>
          <span className="font-medium">{analysis.topic}</span>
        </div>
        <p className="text-sm text-muted">
          Website en onderwerp liggen na de start vast, anders is de trend niet meer te lezen. Wil je
          een andere afbakening? Start een nieuw cluster.
        </p>
      </div>

      {profile ? (
        <div className="card flex flex-col gap-3">
          <span className="mono-label">Merk</span>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{profile.name}</p>
              <p className="text-sm text-secondary">
                Branche: {profile.industry ?? "onbekend"}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {/* Deze lijst bepaalt sinds migratie 0026 NIET meer waar je tegen
                    vergeleken wordt. Dat komt uit de meting zelf. Hij dient nog
                    één doel: deze namen blijven uit de vragen, zodat we neutraal
                    meten. Vandaar het eerlijke label. */}
                Deze merken blijven uit de vragen:{" "}
                {profile.competitors.join(", ") || "onbekend"}
              </p>
            </div>
            <Link href={`/profielen/${profile.id}`} className="btn-outline w-fit">
              Merk bewerken
            </Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="text-secondary">Het merkdossier bij dit cluster is niet gevonden.</p>
        </div>
      )}

      {research && <TopicResearchEditor analysisId={id} initial={research} />}

      <ContentBriefEditor analysisId={id} initial={analysis.content_brief} />

      {prompts.length > 0 && <PromptsManager analysisId={id} initial={prompts} />}

      <TrackingToggle analysisId={id} initial={analysis.tracking_enabled} />
    </div>
  );
}
