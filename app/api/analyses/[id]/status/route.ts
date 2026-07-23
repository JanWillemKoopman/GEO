import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/analyses/[id]/status — lichte poll-endpoint voor het voortgangsscherm.
 * Leest via de user-sessie (RLS = ownership). Geeft de status + coarse voortgang
 * (bestaat Brand DNA al? hoeveel prompts?) zodat de UI server-state-gedreven is
 * (abcplan.md §3.7), niet client-animatie.
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const [{ count: dnaCount }, { count: promptCount }] = await Promise.all([
    supabase.from("brand_dna").select("id", { count: "exact", head: true }).eq("analysis_id", id),
    supabase.from("prompts").select("id", { count: "exact", head: true }).eq("analysis_id", id),
  ]);

  return NextResponse.json({
    status: analysis.status,
    hasBrandDna: (dnaCount ?? 0) > 0,
    promptCount: promptCount ?? 0,
  });
}
