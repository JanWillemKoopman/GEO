import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { measureAnalysis } from "@/lib/pipeline/measure";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST /api/analyses/[id]/measure — draait de nulmeting (halte A3, week 0).
 * Synchroon; met ~10 actieve prompts in de bouwfase duurt dit doorgaans
 * enkele tientallen seconden (elke prompt: web_search + classificatie, parallel).
 */
export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const { data: analysis } = await admin
    .from("analyses")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!analysis || analysis.user_id !== user.id) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  try {
    const status = await measureAnalysis(id, 0);
    return NextResponse.json({ status });
  } catch (err) {
    console.error(`measureAnalysis(${id}) mislukt:`, err);
    // ⚠️ Tijdelijk: detail meesturen voor debugging tijdens de bouwfase (zie prepare/route.ts).
    return NextResponse.json(
      { status: "mislukt", error: "Meting mislukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
