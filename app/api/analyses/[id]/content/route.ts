import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { dedupe } from "@/lib/jobs/queue";

/**
 * GET /api/analyses/[id]/content?title=…, is deze pagina al geschreven?
 *
 * Nodig sinds contentgeneratie op de achtergrond draait (optimalisatie.md 1.4):
 * de knop krijgt geen pagina meer terug maar een bevestiging dat het werk is
 * ingepland, en pollt daarna hierop.
 *
 * `draft` betekent: stap 1 (schrijven) is klaar, stap 2 (herschrijven) loopt
 * nog. Voor de klant is dat nog steeds "bezig".
 *
 * ⚠️ `briefing` is GEEN geschreven pagina. Vóór R5.1 bestond die status niet en
 * gold hier "alles wat geen `draft` is, is klaar". Sinds een pagina begint als
 * `briefing` (de klant moet eerst de feitenvragen beantwoorden, zie
 * `/api/analyses/[id]/briefing`) telde dat scherm zich binnen vier seconden na
 * de klik op "Laat ORBIT ENGINE deze pagina schrijven" als `ready: true`, met
 * een lege pagina in de bibliotheek als gevolg. Vandaar de expliciete
 * uitzondering hieronder, naast `draft`.
 *
 * ── WAAROM `failed` ZO NAUW AFGEBAKEND IS ───────────────────────────────────
 *
 * Dit telde eerst álle mislukte content-taken van de HELE analyse. Eén pagina
 * die ooit was misgelopen liet daardoor bij ELKE andere pagina binnen vier
 * seconden "het schrijven is misgelopen" verschijnen, terwijl het schrijven
 * gewoon net begonnen was. En omdat een mislukte taak blijft staan, sloeg ook
 * "Opnieuw proberen" op dezelfde pagina meteen weer om in diezelfde fout.
 *
 * Daarom nu twee afbakeningen:
 *  • Op DEZE pagina, via de dedupe-sleutels van het schrijven en het
 *    herschrijven, niet op taaksoort over de hele analyse.
 *  • Alleen als er GEEN openstaande taak met dezelfde sleutel is. Staat die er
 *    wel, dan is er nieuw werk onderweg en mag een oude mislukking niet over de
 *    huidige poging heen gaan.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const title = new URL(request.url).searchParams.get("title")?.trim();
  if (!title) return NextResponse.json({ error: "Titel ontbreekt." }, { status: 400 });

  // `is_current` erbij sinds versiebeheer (optimalisatie.md 4.7): met meerdere
  // versies onder dezelfde titel zou `maybeSingle()` een fout opleveren zodra
  // iemand voor de tweede keer laat schrijven.
  const { data: piece } = await admin
    .from("content_pieces")
    .select("id, status")
    .eq("analysis_id", id)
    .eq("title", title)
    .eq("is_current", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Het schrijven hangt aan de titel, het herschrijven aan de pagina die daaruit
  // ontstond. Vandaar twee sleutels, waarvan de tweede pas bestaat zodra stap 1
  // een pagina heeft opgeleverd.
  const keys = [dedupe.contentDraft(id, title)];
  if (piece?.id) keys.push(dedupe.contentRevise(piece.id as string));

  const { data: jobRows } = await admin
    .from("jobs")
    .select("status")
    .eq("analysis_id", id)
    .in("dedupe_key", keys);

  const jobs = (jobRows ?? []) as { status: string }[];
  const hasOpen = jobs.some((j) => j.status === "queued" || j.status === "running");
  const hasFailed = jobs.some((j) => j.status === "failed");

  return NextResponse.json({
    ready: Boolean(piece && piece.status !== "draft" && piece.status !== "briefing"),
    contentPieceId: piece?.id ?? null,
    failed: hasFailed && !hasOpen,
  });
}
