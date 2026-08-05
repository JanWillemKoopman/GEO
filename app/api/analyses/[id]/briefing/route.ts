import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { planContentDraft } from "@/lib/jobs/content-jobs";
import { recommendationFromSnapshot } from "@/lib/pipeline/briefing";
import { describeError, classifyError } from "@/lib/errors";
import type { RecommendationPayload } from "@/lib/jobs/types";
import type { ContentAction, ContentType } from "@/lib/types/database";

/**
 * POST /api/analyses/[id]/briefing, antwoorden opslaan en (optioneel) het
 * schrijven starten (contentbriefing.md §6/§8/§10, implementatieplan.md R5.2).
 *
 * ── DE ROUTE MAG WEINIG, EN DAT IS HET PUNT ─────────────────────────────────
 *
 * Uitsluitend `answer`, `status` en `answered_at`. Nooit `question`, `required`,
 * `claim_key` of `fact_ref` (contentbriefing.md §10). De vraag zelf is door de
 * claim-audit bepaald op basis van wat de pagina nodig heeft; als de client die
 * kon herschrijven, zou de klant een antwoord kunnen geven op een andere vraag
 * dan de kaart straks aanhaalt, en dan verwijst een F-nummer naar iets anders
 * dan er in de tekst staat. Precies de traceerbaarheid die R5 moet opleveren.
 *
 * ── ER IS ALTIJD EEN UITWEG ─────────────────────────────────────────────────
 *
 * `action: "write"` werkt ook met openstaande vragen. De klant kan altijd door
 * (README.md §2); wat hij overslaat kost hem geen pagina maar een passage. Die
 * consequentie wordt bij het schrijven afgedwongen (R5.3), niet hier, hier
 * wordt alleen vastgelegd dat hij de vraag bewust liet liggen.
 */

interface AnswerInput {
  id: string;
  answer?: string;
  /** true = bewust overslaan. De bewering vervalt dan; hij wordt niet verzonnen. */
  skip?: boolean;
}

/** Antwoorden uit de aanvraag lezen, defensief: dit komt van de client. */
function readAnswers(value: unknown): AnswerInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((a) => {
      const input = (a ?? {}) as Partial<AnswerInput>;
      return {
        id: typeof input.id === "string" ? input.id : "",
        answer: typeof input.answer === "string" ? input.answer : undefined,
        skip: input.skip === true,
      };
    })
    .filter((a) => a.id.length > 0);
}

/** De aanbeveling terughalen: uit de bevroren snapshot, anders uit de rij zelf. */
function recommendationFor(piece: {
  title: string;
  type: string;
  action: string;
  existing_url: string | null;
  report_id: string | null;
  brief_instruction: string | null;
  target_intent: string | null;
  briefing_snapshot_json: unknown;
}): RecommendationPayload {
  const bevroren = recommendationFromSnapshot(piece.briefing_snapshot_json);
  if (bevroren) return bevroren;

  // Terugval voor pagina's van vóór R5.1 of een briefing die halverwege
  // strandde. Levert een pagina zonder doelvragen op, minder goed, niet kapot.
  return {
    title: piece.title,
    type: piece.type as ContentType,
    targetIntent: piece.target_intent ?? "",
    why: piece.brief_instruction ?? "",
    action: piece.action as ContentAction,
    existingUrl: piece.existing_url,
    reportId: piece.report_id,
    targets: [],
    revisionNote: null,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: { answers?: unknown; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const answers = readAnswers(body.answers);
  const wilSchrijven = body.action === "write";

  try {
    // ── 1. Antwoorden opslaan ───────────────────────────────────────────────
    //
    // Elke vraag wordt eerst gecontroleerd op eigenaarschap. De id's komen van
    // de client, en zonder deze controle zou iemand met een geldige sessie een
    // vraag van een ánder profiel kunnen beantwoorden, de reden dat alle
    // schrijfacties via een route met service role én expliciete
    // eigenaarscontrole lopen in plaats van via RLS (abcplan.md §5).
    let opgeslagen = 0;
    if (answers.length > 0) {
      const { data: eigen } = await admin
        .from("fact_requests")
        .select("id")
        .eq("profile_id", analysis.profile_id)
        .in(
          "id",
          answers.map((a) => a.id),
        );
      const toegestaan = new Set((eigen ?? []).map((r) => r.id as string));

      for (const antwoord of answers) {
        if (!toegestaan.has(antwoord.id)) continue;
        const tekst = (antwoord.answer ?? "").trim();

        // Drie toestanden, geen twee. 'overgeslagen' is iets anders dan 'open':
        // de klant heeft de vraag gezien en bewust laten liggen. Dat betekent
        // dat de bewering vervalt, en dat we hem niet bij elke volgende batch
        // opnieuw moeten stellen.
        const status = antwoord.skip ? "overgeslagen" : tekst ? "beantwoord" : "open";

        const { error } = await admin
          .from("fact_requests")
          .update({
            answer: status === "beantwoord" ? tekst : null,
            status,
            answered_at: status === "open" ? null : new Date().toISOString(),
          })
          .eq("id", antwoord.id);
        if (!error) opgeslagen++;
      }
    }

    if (!wilSchrijven) {
      return NextResponse.json({ saved: opgeslagen, queued: 0 });
    }

    // ── 2. Het schrijven starten ────────────────────────────────────────────
    const { data: pieces } = await admin
      .from("content_pieces")
      .select(
        "id, title, type, action, existing_url, report_id, brief_instruction, target_intent, briefing_snapshot_json",
      )
      .eq("analysis_id", id)
      .eq("status", "briefing")
      .eq("is_current", true);

    const wachtend = pieces ?? [];
    if (wachtend.length === 0) {
      return NextResponse.json({ saved: opgeslagen, queued: 0, nothingToWrite: true });
    }

    let queued = 0;
    for (const piece of wachtend) {
      const { created } = await planContentDraft(admin, {
        analysisId: id,
        userId: user.id,
        recommendation: recommendationFor(piece as never),
      });
      if (created) queued++;
    }

    return NextResponse.json({ saved: opgeslagen, queued, pages: wachtend.length }, { status: 202 });
  } catch (err) {
    console.error(`briefing verwerken mislukt voor ${id}:`, err);
    return NextResponse.json(
      { error: "De briefing kon niet worden opgeslagen.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
