import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { markPublished, markUnpublished } from "@/lib/pipeline/publish";
import { checkUrlFormat, isOnBrandDomain } from "@/lib/url";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST/DELETE /api/analyses/[id]/content/[pieceId]/publish, de klant zegt dat
 * de pagina live staat (optimalisatie.md 5.1/5.2/5.3).
 *
 * Dit is het scharnierpunt van fase 5. Vanaf hier weet de app dat er iets te
 * volgen valt: hij controleert of de pagina er echt staat, en plant twee
 * hermetingen van precies de vragen waarvoor deze pagina gemaakt is.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { id, pieceId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const raw = typeof body.url === "string" ? body.url.trim() : "";
  if (!raw) return NextResponse.json({ error: "Geef de link naar de gepubliceerde pagina." }, { status: 400 });

  // Zelfde vormcontrole als bij het aanmaken van een profiel (0.12): een
  // typefout hier kost de klant weken wachten op een effect dat nooit komt.
  const format = checkUrlFormat(raw);
  if (!format.ok) return NextResponse.json({ error: format.message }, { status: 400 });

  const url = raw.startsWith("http") ? raw : `https://${raw}`;

  const { data: piece } = await admin
    .from("content_pieces")
    .select("id, status, needs_review")
    .eq("id", pieceId)
    .eq("analysis_id", id)
    .maybeSingle();
  if (!piece) return NextResponse.json({ error: "Pagina niet gevonden." }, { status: 404 });

  // ── T3.3: geen publicatie zolang de eindredactie nog iets zag ────────────
  //
  // Dit is de andere kant van T1: een pagina met `needs_review = true` is niet
  // "af" in de zin die vrijgeven vereist (zie de toelichting bij de
  // approve-route, §S6). Publiceren zonder eerst na te kijken zou de klant een
  // niet-gecontroleerde tekst op zijn eigen site laten zetten.
  if (piece.needs_review) {
    return NextResponse.json(
      {
        error:
          "Deze tekst moet eerst nagekeken worden voordat hij gepubliceerd kan worden. " +
          "Kijk de openstaande opmerkingen na en geef de pagina vrij.",
      },
      { status: 409 },
    );
  }

  // ── T3.1: alleen publiceren op het domein van het merk ───────────────────
  //
  // Op 2 september 2026 gaf deze route een 202 voor `https://www.example.com/`,
  // een adres dat niets met het merk te maken had. Alleen de VORM van het adres
  // werd gecontroleerd, nooit of het bij het merk hoort.
  const { data: profile } = analysis.profile_id
    ? await admin.from("profiles").select("url").eq("id", analysis.profile_id).maybeSingle()
    : { data: null };
  const brandUrl = (profile?.url as string | null) ?? null;
  if (!brandUrl || !isOnBrandDomain(url, brandUrl)) {
    return NextResponse.json(
      {
        error: brandUrl
          ? `Dit adres staat niet op het domein van dit merk (${brandUrl}). Publiceer je op een ander ` +
            "domein, bijvoorbeeld een partnersite? Neem dan contact op met je customer success manager."
          : "Van dit merk is geen webadres bekend, dus we kunnen niet controleren of dit adres erbij hoort.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await markPublished(admin, { analysisId: id, contentPieceId: pieceId, url });
    return NextResponse.json(result, { status: 202 });
  } catch (err) {
    console.error(`publicatie vastleggen mislukt voor pagina ${pieceId}:`, err);
    return NextResponse.json(
      { error: "Opslaan is niet gelukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { id, pieceId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  if (!(await getOwnedAnalysis(admin, id, user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  await markUnpublished(admin, { analysisId: id, contentPieceId: pieceId });
  return NextResponse.json({ ok: true });
}
