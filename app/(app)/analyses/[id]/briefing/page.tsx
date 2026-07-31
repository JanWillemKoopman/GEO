import { notFound } from "next/navigation";
import Link from "next/link";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { BriefingForm, type BriefingQuestionView } from "./briefing-form";

export const metadata = { title: "Contentbriefing" };

/**
 * De contentbriefing (contentbriefing.md §8, implementatieplan.md R5.2).
 *
 * Dit scherm is de tweede bewuste stop in de app. De eerste is de review-gate
 * tussen halte 2 en 3, waar de klant de vragen goedkeurt vóórdat er gemeten
 * wordt; deze is het equivalent voor FASE C: de klant vult de feiten aan
 * vóórdat er geschreven wordt.
 *
 * ── WAT ER GEBEURT ALS ER NIETS TE VRAGEN IS ────────────────────────────────
 *
 * Dan is er ook geen scherm nodig. Heeft de claim-audit geen gaten gevonden — of
 * staan alle antwoorden al in de kennisbank van een eerdere analyse — dan is de
 * enige zinnige actie "schrijven". Dat is precies wat de kennisbank op termijn
 * moet opleveren: bij de derde analyse van dezelfde klant is deze stap leeg.
 */
export default async function BriefingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const supabase = await createClient();

  const [{ data: pieceRows }, { data: questionRows }] = await Promise.all([
    supabase
      .from("content_pieces")
      .select("id, title")
      .eq("analysis_id", id)
      .eq("status", "briefing")
      .eq("is_current", true),
    // Merkbrede vragen (scope 'merk') hebben geen analysis_id maar horen hier
    // wél bij: het telefoonnummer van de vestiging is één keer vragen, voor
    // altijd. Vandaar het filter op profiel plus analyse in plaats van alleen
    // op analyse.
    supabase
      .from("fact_requests")
      .select(
        "id, question, reason, kind, answer_type, options, suggested_answer, required, answer, status, content_piece_ids, analysis_id",
      )
      .eq("profile_id", analysis.profile_id)
      .in("status", ["open", "beantwoord", "overgeslagen"])
      .order("required", { ascending: false }),
  ]);

  const pieces = pieceRows ?? [];
  const titleById = new Map(pieces.map((p) => [p.id as string, p.title as string]));
  const pieceIds = new Set(pieces.map((p) => p.id as string));

  // Alleen vragen die bij de pagina's horen die nú op schrijven wachten. Een
  // vraag uit een eerdere batch die toen is overgeslagen hoort hier niet
  // opnieuw — dat is dezelfde vraag twee keer stellen, en dat is precies wat
  // contentbriefing.md §4 verbiedt.
  const questions: BriefingQuestionView[] = (questionRows ?? [])
    .filter((q) => {
      const gekoppeld = (q.content_piece_ids as string[] | null) ?? [];
      return gekoppeld.some((pid) => pieceIds.has(pid));
    })
    .map((q) => ({
      id: q.id as string,
      question: q.question as string,
      reason: (q.reason as string | null) ?? "",
      kind: (q.kind as string | null) ?? "aanvulling",
      answerType: (q.answer_type as string | null) ?? "tekst_kort",
      options: (q.options as string[] | null) ?? [],
      suggestedAnswer: (q.suggested_answer as string | null) ?? null,
      required: Boolean(q.required),
      answer: (q.answer as string | null) ?? null,
      status: (q.status as string | null) ?? "open",
      affects: ((q.content_piece_ids as string[] | null) ?? [])
        .map((pid) => titleById.get(pid))
        .filter((t): t is string => Boolean(t)),
    }));

  if (pieces.length === 0) {
    return (
      <EmptyState
        title="Er wacht geen pagina op je input"
        action={{ href: `/analyses/${id}#werk`, label: "Kies wat we gaan schrijven" }}
      >
        Zodra je in hoofdstuk 03 pagina&apos;s kiest, stellen we hier de vragen die nodig zijn om
        ze te kunnen schrijven zonder iets te verzinnen.
      </EmptyState>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="card card-success flex flex-col gap-3">
        <h1 className="text-xl font-semibold">We weten genoeg</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Voor{" "}
          {pieces.length === 1
            ? `"${pieces[0].title as string}"`
            : `deze ${pieces.length} pagina's`}{" "}
          hebben we geen open vragen: alles wat nodig is staat al in je profiel of is bij een
          eerdere analyse beantwoord.
        </p>
        <BriefingForm analysisId={id} questions={[]} pageCount={pieces.length} />
        <Link href={`/analyses/${id}/bibliotheek`} className="mono-label">
          Naar de bibliotheek
        </Link>
      </div>
    );
  }

  return <BriefingForm analysisId={id} questions={questions} pageCount={pieces.length} />;
}
