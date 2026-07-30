import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import type { Profile, TopicResearch, Prompt } from "@/lib/types/database";
import { TopicResearchEditor } from "../_editors/topic-research-editor";
import { ContentBriefEditor } from "../_editors/content-brief-editor";
import { PromptsManager } from "../_editors/prompts-manager";
import { ConfirmBar } from "../_editors/confirm-bar";

/**
 * Het conceptscherm — de enige stap waarop de app op de klant staat te wachten.
 *
 * ── WAAROM DIT EEN EIGEN SCHERM IS ──────────────────────────────────────────
 *
 * Dit stond onderaan het tabblad "Instellingen", na de analyse-gegevens, een
 * profielkaart, het onderwerp-onderzoek, de content-brief, de vragenlijst en de
 * tracking-schakelaar. Zes blokken scrollen voor de enige handeling die de
 * meting kan starten — op de plek die in elke applicatie ter wereld "hier hoef
 * je niet te zijn" betekent. Dat is geen vindbaarheidsprobleem maar een
 * conversieprobleem.
 *
 * Nu: één scherm, één taak, geen tabbladen die afleiden. Wat je hier ziet is
 * precies wat er gemeten gaat worden, in de volgorde waarin je het beoordeelt —
 * eerst waar het over gaat, dan wat we gevonden hebben, dan de vragen zelf.
 * De goedkeuringsbalk blijft onderaan in beeld staan.
 */
export default async function ConceptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  // Al bevestigd? Dan is dit scherm klaar met z'n werk. Het beheer van dezelfde
  // gegevens gaat daarna via Instellingen, zonder de verplichting.
  if (analysis.status !== "concept_klaar") redirect(`/analyses/${id}`);

  const supabase = await createClient();
  const [{ data: profileRow }, { data: researchRow }, { data: promptRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", analysis.profile_id).maybeSingle(),
    supabase.from("topic_research").select("*").eq("analysis_id", id).maybeSingle(),
    supabase.from("prompts").select("*").eq("analysis_id", id).order("created_at"),
  ]);

  const profile = profileRow as Profile | null;
  const research = researchRow as TopicResearch | null;
  const prompts = (promptRows ?? []) as Prompt[];
  const activeCount = prompts.filter((p) => p.active).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3" style={{ borderColor: "rgba(133,17,217,0.3)" }}>
        <span className="mono-label" style={{ color: "var(--accent-purple)" }}>
          Klaar om te starten
        </span>
        <h2 className="text-2xl font-bold tracking-tight">
          Dit gaan we <span className="brand-gradient-text">meten</span>
        </h2>
        <p className="text-secondary">
          We hebben je website en je merkprofiel doorgenomen en hieruit een meetplan afgeleid.
          Loop het door, pas aan wat niet klopt, en bevestig onderaan. Daarna stellen we deze
          vragen aan de AI-assistenten en meten we of jij genoemd wordt.
        </p>
        <p className="text-sm text-muted">
          Je hoeft niets te veranderen als het klopt — bevestigen is genoeg.
        </p>
      </div>

      <div className="card flex flex-col gap-3">
        <span className="mono-label">Waar het over gaat</span>
        <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
          <span className="text-secondary">Website</span>
          <span className="font-medium">{analysis.url}</span>
        </div>
        <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
          <span className="text-secondary">Onderwerp</span>
          <span className="font-medium">{analysis.topic}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-secondary">Merk</span>{" "}
            <span className="font-medium">{profile?.name ?? "onbekend"}</span>
            {profile && (
              <>
                <p className="mt-0.5 text-sm text-muted">
                  Branche: {profile.industry ?? "onbekend"}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {/* Deze lijst bepaalt sinds migratie 0026 NIET meer waar je tegen
                      vergeleken wordt — dat komt uit de meting zelf. Hij dient nog
                      één doel: deze namen blijven uit de vragen, zodat we neutraal
                      meten. Vandaar het eerlijke label. */}
                  Deze merken houden we uit de vragen:{" "}
                  {profile.competitors.join(", ") || "onbekend"}
                </p>
              </>
            )}
          </div>
          {profile && (
            <Link href={`/profielen/${profile.id}`} className="btn-outline w-fit">
              Merk bewerken
            </Link>
          )}
        </div>
      </div>

      {research ? (
        <TopicResearchEditor analysisId={id} initial={research} />
      ) : (
        <div className="card">
          <p className="text-secondary">Onderwerp-onderzoek wordt nog voorbereid…</p>
        </div>
      )}

      <ContentBriefEditor analysisId={id} initial={analysis.content_brief} />

      {prompts.length > 0 && <PromptsManager analysisId={id} initial={prompts} />}

      {/* De poort mag alleen open als er iets te meten valt. Zonder actieve
          vragen zou de meting nul taken inplannen en zou de analyse blijven
          hangen op een voortgangsscherm dat nooit verder komt — dus zeggen we
          hier wat er moet gebeuren in plaats van een knop aan te bieden die
          doodloopt. */}
      {activeCount > 0 ? (
        <ConfirmBar analysisId={id} />
      ) : (
        <div className="card" style={{ borderColor: "rgba(211,58,63,0.4)" }}>
          <p className="text-secondary">
            Er staat op dit moment geen enkele vraag aan. Zet minstens één vraag aan hierboven —
            zonder vragen valt er niets te meten en kan de meting niet starten.
          </p>
        </div>
      )}
    </div>
  );
}
