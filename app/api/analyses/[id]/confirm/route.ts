import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";

/**
 * POST /api/analyses/[id]/confirm — de review-gate (abcplan.md §3.6/A2c).
 * De klant heeft Brand DNA + prompts gezien en (evt.) aangepast; dit is de
 * enige plek waar status concept_klaar → meten mag. Halte A3 (de meting zelf)
 * wordt in Sprint 4 gebouwd — deze route zet alleen de status.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  if (analysis.status !== "concept_klaar") {
    return NextResponse.json(
      { error: "Deze analyse staat niet klaar om bevestigd te worden." },
      { status: 409 },
    );
  }

  const { error } = await admin.from("analyses").update({ status: "meten" }).eq("id", id);
  if (error) return NextResponse.json({ error: "Bevestigen mislukt." }, { status: 500 });

  return NextResponse.json({ status: "meten" });
}
