import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { issuesUitJson } from "@/lib/pipeline/quality-issue";
import {
  haalWeg,
  isAccepteerbaar,
  leesGeaccepteerd,
  voegToe,
  zinSleutel,
} from "@/lib/geaccepteerde-zinnen";

/**
 * POST /api/analyses/[id]/content/[pieceId]/zinnen, de klant laat een zin
 * zonder bron bewust staan (migratie 0110), of maakt dat ongedaan.
 *
 * ── WAT DEZE ROUTE MAG ──────────────────────────────────────────────────────
 *
 * Alleen `geaccepteerde_zinnen` bijwerken. Nooit de tekst, nooit
 * `quality_json`: wat de keuring vond blijft staan voor de audit-trail
 * (conventie 8), het scherm filtert. Service role plus een expliciete
 * eigenaarschapscontrole (conventie 6).
 *
 * ⚠️ De route controleert zelf of elke zin echt een punt "zonder bron" van déze
 * tekst is (conventie 1). Anders kan een aanroep willekeurige tekst als
 * "geaccepteerd" wegschrijven, en dat leest later als een besluit van de klant.
 */
const Invoer = z.object({
  zinnen: z.array(z.string().trim().min(1).max(1000)).min(1).max(50),
  ongedaan: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { id, pieceId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const invoer = Invoer.safeParse(await request.json().catch(() => null));
  if (!invoer.success) {
    return NextResponse.json({ error: "Er is geen zin meegegeven." }, { status: 400 });
  }

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const { data: piece } = await admin
    .from("content_pieces")
    .select("id, quality_json, geaccepteerde_zinnen")
    .eq("id", pieceId)
    .eq("analysis_id", id)
    .maybeSingle();
  if (!piece) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const bestaand = leesGeaccepteerd(piece.geaccepteerde_zinnen);
  let nieuw;
  if (invoer.data.ongedaan) {
    nieuw = haalWeg(bestaand, invoer.data.zinnen);
  } else {
    const issues = issuesUitJson((piece.quality_json as { issues?: unknown } | null)?.issues);
    const toegestaan = new Set(
      issues.filter(isAccepteerbaar).map((i) => zinSleutel(i.evidence ?? "")),
    );
    const onbekend = invoer.data.zinnen.filter((zin) => !toegestaan.has(zinSleutel(zin)));
    if (onbekend.length > 0) {
      return NextResponse.json(
        { error: "Deze zin staat niet als punt zonder bron bij deze tekst. Ververs de pagina en probeer het opnieuw." },
        { status: 422 },
      );
    }
    nieuw = voegToe(bestaand, invoer.data.zinnen, user.id, new Date().toISOString());
  }

  const { error } = await admin
    .from("content_pieces")
    .update({ geaccepteerde_zinnen: nieuw })
    .eq("id", pieceId)
    .eq("analysis_id", id);
  if (error) {
    return NextResponse.json({ error: "Opslaan is niet gelukt. Probeer het opnieuw." }, { status: 500 });
  }

  return NextResponse.json({ geaccepteerd: nieuw.length });
}
