import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { prepareAnalysis } from "@/lib/pipeline/prepare";
import { describeError } from "@/lib/errors";

/**
 * POST /api/analyses/[id]/prepare — draait halte 1+2 (crawl → Brand DNA → prompts).
 * Synchroon; kan enkele tientallen seconden duren.
 */
export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  // Ownership-check vóór we iets doen (§5/§12.20).
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
    const status = await prepareAnalysis(id);
    return NextResponse.json({ status });
  } catch (err) {
    console.error(`prepareAnalysis(${id}) mislukt:`, err);
    // ⚠️ Tijdelijk: detail meesturen voor debugging tijdens de bouwfase (app is
    // nog dicht voor publiek, zie SIGNUPS_ENABLED). Voor productie weer weghalen.
    return NextResponse.json(
      { status: "mislukt", error: "Voorbereiden mislukt.", detail: describeError(err) },
      { status: 500 },
    );
  }
}
