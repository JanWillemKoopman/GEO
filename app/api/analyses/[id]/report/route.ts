import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReport } from "@/lib/pipeline/report";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST /api/analyses/[id]/report — draait B1 (gap-analyse) + B2 (rapport),
 * abcplan.md §7. Synchroon; twee mini-calls zonder web_search, doorgaans snel.
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
    const status = await generateReport(id, 0);
    return NextResponse.json({ status });
  } catch (err) {
    console.error(`generateReport(${id}) mislukt:`, err);
    return NextResponse.json(
      { status: "mislukt", error: "Rapport opstellen mislukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
