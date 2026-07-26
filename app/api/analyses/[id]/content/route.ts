import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";

/**
 * GET /api/analyses/[id]/content?title=… — is deze pagina al geschreven?
 *
 * Nodig sinds contentgeneratie op de achtergrond draait (optimalisatie.md 1.4):
 * de knop krijgt geen pagina meer terug maar een bevestiging dat het werk is
 * ingepland, en pollt daarna hierop.
 *
 * `draft` betekent: stap 1 (schrijven) is klaar, stap 2 (herschrijven) loopt
 * nog. Voor de klant is dat nog steeds "bezig".
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const title = new URL(request.url).searchParams.get("title")?.trim();
  if (!title) return NextResponse.json({ error: "Titel ontbreekt." }, { status: 400 });

  const [{ data: piece }, { count: failedJobs }] = await Promise.all([
    // `is_current` erbij sinds versiebeheer (optimalisatie.md 4.7): met meerdere
    // versies onder dezelfde titel zou `maybeSingle()` een fout opleveren zodra
    // iemand voor de tweede keer laat schrijven.
    admin
      .from("content_pieces")
      .select("id, status")
      .eq("analysis_id", id)
      .eq("title", title)
      .eq("is_current", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", id)
      .eq("status", "failed")
      .in("type", ["content_draft", "content_revise"]),
  ]);

  return NextResponse.json({
    ready: Boolean(piece && piece.status !== "draft"),
    contentPieceId: piece?.id ?? null,
    failed: (failedJobs ?? 0) > 0,
  });
}
