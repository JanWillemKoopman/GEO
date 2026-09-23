import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import type { Profile, TopicResearch, Prompt } from "@/lib/types/database";
import { TopicResearchEditor } from "../_editors/topic-research-editor";
import { ContentBriefEditor } from "../_editors/content-brief-editor";
import { PromptsManager } from "../_editors/prompts-manager";
import { ConfirmBar } from "../_editors/confirm-bar";
import { PrepareProgress } from "../prepare-progress";
import { determineStage } from "@/lib/pipeline/stage";

export const metadata = { title: "Concept beoordelen" };

/**
 * Het conceptscherm, de enige stap waarop de app op de klant staat te wachten.
 *
 * ── WAAROM DIT EEN EIGEN SCHERM IS ──────────────────────────────────────────
 *
 * Dit stond onderaan het tabblad "Instellingen", na de analyse-gegevens, een
 * profielkaart, het onderwerp-onderzoek, de content-brief, de vragenlijst en de
 * tracking-schakelaar. Zes blokken scrollen voor de enige handeling die de
 * meting kan starten, op de plek die in elke applicatie ter wereld "hier hoef
 * je niet te zijn" betekent. Dat is geen vindbaarheidsprobleem maar een
 * conversieprobleem.
 *
 * Nu: één scherm, één taak, geen tabbladen die afleiden. Wat je hier ziet is
 * precies wat er gemeten gaat worden, in de volgorde waarin je het beoordeelt,
 * eerst waar het over gaat, dan wat we gevonden hebben, dan de vragen zelf.
 * De goedkeuringsbalk blijft onderaan in beeld staan.
 *
 * ── HET WACHTEN OP HET CONCEPT HOORT OOK HIER (22 september 2026) ──────────
 *
 * Het opstellen van het onderzoek en de vragen duurt een paar minuten, en dat
 * wachtscherm stond op `/analyses/[id]`. Dat adres verwijst sinds vandaag door
 * naar het clusteroverzicht
 * (`docs/tasks/clusterresultaat-zonder-eigen-scherm.md`), dus het wachten
 * verhuist naar het scherm waar het over gaat: je wacht op het concept, dus je
 * wacht op deze pagina.
 *
 * ⚠️ Dit is het ENIGE wachtscherm dat overblijft, en dat is met opzet: hier
 * wacht je op iets wat jíj daarna moet doen. Op de meting daarna wacht je
 * nergens op, die loopt door op de server en meldt zichzelf
 * (`components/cluster-melder.tsx`).
 */
export default async function ConceptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  // Het concept wordt nog opgesteld (of dat liep vast): dan is dít scherm de
  // wachtkamer, want dit is waar je op wacht.
  //
  // ⚠️ Bij 'mislukt' eerst uitzoeken wélke fase struikelde. Een cluster dat in
  // de MÉTING vastliep hoort hier niet te wachten op een concept dat allang
  // klaar is; dat hoort op het clusteroverzicht te staan, met de knop om
  // opnieuw te proberen.
  if (analysis.status === "bezig" || analysis.status === "mislukt") {
    const supabaseVoorFase = await createClient();
    const fase = await determineStage(supabaseVoorFase, id);
    if (fase === "prepare") {
      return <PrepareProgress analysisId={id} initialStatus={analysis.status} />;
    }
    redirect(`/merk/${analysis.profile_id}/strategie/clusters`);
  }

  // Al bevestigd? Dan is dit scherm klaar met z'n werk. Het beheer van dezelfde
  // gegevens gaat daarna via Instellingen, zonder de verplichting.
  if (analysis.status !== "concept_klaar") {
    redirect(`/merk/${analysis.profile_id}/strategie/clusters`);
  }

  const supabase = await createClient();
  const [{ data: profileRow }, { data: researchRow }, { data: promptRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", analysis.profile_id).maybeSingle(),
        // ⚠️ Kolommen bij naam en geen `*`. `topic_research.raw_json` is de ruwe
    // modeloutput van de onderzoeksstap; die hoort op Admin (besluit 4), en met
    // een `*` reist hij mee naar de browser ook al rendert dit scherm hem niet.
    supabase
      .from("topic_research")
      .select("id, analysis_id, content_summary, competitors, edited_by_user, updated_at")
      .eq("analysis_id", id)
      .maybeSingle(),
    supabase.from("prompts").select("*").eq("analysis_id", id).order("created_at"),
  ]);

  const profile = profileRow as Profile | null;
  const research = researchRow as TopicResearch | null;
  const prompts = (promptRows ?? []) as Prompt[];
  const activeCount = prompts.filter((p) => p.active).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="card card-rail flex flex-col gap-3">
        <span className="mono-label">Klaar om te starten</span>
        <h2 className="type-title">Dit gaat ORBIT ENGINE meten</h2>
        <p className="text-secondary">
          ORBIT ENGINE heeft je website en je merkdossier doorgenomen en daaruit dit meetplan afgeleid. Loop
          het door, pas aan wat niet klopt, en bevestig onderaan. Pas dan gaan deze vragen naar de
          AI-assistenten.
        </p>
        <p className="text-sm text-muted">
          Klopt het? Dan hoef je niets te veranderen. Bevestigen is genoeg.
        </p>
      </div>

      <div className="card flex flex-col gap-3">
        <span className="mono-label">Waar het over gaat</span>
        <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
          <span className="text-secondary">Website</span>
          <span className="break-url font-medium">{analysis.url}</span>
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
                      vergeleken wordt. Dat komt uit de meting zelf. Hij dient nog
                      één doel: deze namen blijven uit de vragen, zodat we neutraal
                      meten. Vandaar het eerlijke label. */}
                  Deze merken blijven uit de vragen:{" "}
                  {profile.competitors.join(", ") || "onbekend"}
                </p>
              </>
            )}
          </div>
          {profile && (
            <Link href={`/merk/${profile.id}/merkprofiel/bewerken`} className="btn-outline w-fit">
              Merk bewerken
            </Link>
          )}
        </div>
      </div>

      {research ? (
        <TopicResearchEditor analysisId={id} initial={research} />
      ) : (
        <div className="card">
          <p className="text-secondary">ORBIT ENGINE is het onderwerp nog aan het uitzoeken…</p>
        </div>
      )}

      <ContentBriefEditor analysisId={id} initial={analysis.content_brief} />

      {prompts.length > 0 && <PromptsManager analysisId={id} initial={prompts} />}

      {/* De poort mag alleen open als er iets te meten valt. Zonder actieve
          vragen zou de meting nul taken inplannen en zou de analyse blijven
          hangen op een voortgangsscherm dat nooit verder komt. Dus zeggen we
          hier wat er moet gebeuren in plaats van een knop aan te bieden die
          doodloopt. */}
      {activeCount > 0 ? (
        <ConfirmBar analysisId={id} profileId={analysis.profile_id} activeCount={activeCount} />
      ) : (
        <div className="card card-danger">
          <p className="text-secondary">
            Er staat nu geen enkele vraag aan. Zet er hierboven minstens één aan, want zonder vragen
            valt er niets te meten en kan ORBIT ENGINE niet starten.
          </p>
        </div>
      )}
    </div>
  );
}
