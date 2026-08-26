import { notFound } from "next/navigation";
import Link from "next/link";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { BriefingForm, type BriefingQuestionView } from "./briefing-form";
import { contradictionsFromSnapshot } from "@/lib/pipeline/briefing";

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
 * Dan is er ook geen scherm nodig. Heeft de claim-audit geen gaten gevonden, of
 * staan alle antwoorden al in de kennisbank van een eerdere analyse. Dan is de
 * enige zinnige actie "schrijven". Dat is precies wat de kennisbank op termijn
 * moet opleveren: bij de derde analyse van dezelfde klant is deze stap leeg.
 */
/**
 * Het tegenspraakblok. Bewust boven de vragen en bewust geen blokkade: de klant
 * hoeft er niets mee te doen, maar hij hoort het wél te weten voordat er een
 * pagina op gebouwd wordt.
 */
function Tegenspraken({ regels }: { regels: string[] }) {
  if (regels.length === 0) return null;
  return (
    <div className="card flex flex-col gap-2">
      <span className="mono-label">Dit is veranderd sinds de vorige keer</span>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-secondary">
        {regels.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        ORBIT ENGINE gebruikt altijd het nieuwste antwoord. Klopt dat niet? Pas het hieronder aan.
      </p>
    </div>
  );
}

export default async function BriefingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const supabase = await createClient();

  const [{ data: pieceRows }, { data: questionRows }] = await Promise.all([
    supabase
      .from("content_pieces")
      .select("id, title, briefing_snapshot_json")
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

  // ── Wat er sinds de vorige keer omging (S8) ───────────────────────────────
  //
  // De feitenbank merkt het wanneer twee uitspraken over hetzelfde onderwerp
  // elkaar uitsluiten. Vóór migratie 0036 belandden die allebei op de kaart en
  // koos het model welke het aanhaalde; nu wint de nieuwste en hoort de klant
  // dát er iets omging. De lijst is analysebreed en staat op elke pagina van de
  // batch gelijk, vandaar de Set.
  const tegenspraken = Array.from(
    new Set(pieces.flatMap((p) => contradictionsFromSnapshot(p.briefing_snapshot_json))),
  );

  // Alleen vragen die bij de pagina's horen die nú op schrijven wachten. Een
  // vraag uit een eerdere batch die toen is overgeslagen hoort hier niet
  // opnieuw. Dat is dezelfde vraag twee keer stellen, en dat is precies wat
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
        action={{ href: `/analyses/${id}#werk`, label: "Kies wat ORBIT ENGINE gaat schrijven" }}
      >
        Zodra je in hoofdstuk 03 pagina&apos;s kiest, stelt ORBIT ENGINE hier de vragen die het nodig heeft
        om te schrijven zonder ook maar iets te verzinnen.
      </EmptyState>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="card card-success flex flex-col gap-3">
        <h1 className="text-xl font-semibold">ORBIT ENGINE weet genoeg</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Voor{" "}
          {pieces.length === 1
            ? `"${pieces[0].title as string}"`
            : `deze ${pieces.length} pagina's`}{" "}
          staan er geen vragen open: alles wat nodig is, staat al in je merkdossier of is bij een
          eerder cluster beantwoord.
        </p>
        <Tegenspraken regels={tegenspraken} />
        <BriefingForm analysisId={id} questions={[]} pageCount={pieces.length} />
        <Link href={`/analyses/${id}/bibliotheek`} className="mono-label">
          Naar de bibliotheek
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Tegenspraken regels={tegenspraken} />
      <BriefingForm analysisId={id} questions={questions} pageCount={pieces.length} />
    </div>
  );
}
