import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { diffContent } from "@/lib/pipeline/content-diff";

/** De waarde van `?met=` die "vergelijk met de site van de klant" betekent. */
const HUIDIGE_PAGINA = "huidige-pagina";

/**
 * GET .../content/[pieceId]/diff?met=<versionId>, het verschil tussen deze
 * versie en een eerdere (content-editie, onderdeel 1: versiediff).
 *
 * `met=huidige-pagina` vergelijkt met de tekst die op het moment van plannen op
 * de site van de klant stond (O3, `content_pieces.existing_page_text`). Dat is
 * de vergelijking die er bij een verbetering het meest toe doet: de app vraagt
 * de klant zijn eigen pagina te vervangen, en hij hoort te zien wat er dan
 * verdwijnt. Tot 2 september 2026 kon deze route alleen twee door ons geschreven
 * versies naast elkaar leggen.
 *
 * Een eigen, lichte route in plaats van `body_markdown` aan de bestaande
 * versiegeschiedenis-query toe te voegen: die query is bewust smal
 * (`select("id, version, created_at, is_current, revision_note,
 * edited_by_user")`, zonder tekst) zodat één paginaweergave niet de volle
 * tekst van alle versies meestuurt. "Bekijk verschil" is een opt-in
 * handeling, dus de kosten vallen pas op het moment dat erom gevraagd wordt.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { id, pieceId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  if (!(await getOwnedAnalysis(admin, id, user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  const met = new URL(request.url).searchParams.get("met");
  if (!met) return NextResponse.json({ error: "Met welke versie vergelijken?" }, { status: 400 });

  const { data: pieceRow } = await admin
    .from("content_pieces")
    .select("title, body_markdown, existing_page_text, existing_page_fetched_at")
    .eq("id", pieceId)
    .eq("analysis_id", id)
    .maybeSingle();
  if (!pieceRow) return NextResponse.json({ error: "Pagina niet gevonden." }, { status: 404 });

  // Dezelfde bescherming als de versiegeschiedenis-query op de pagina zelf:
  // niet alleen op RLS vertrouwen, expliciet binden aan dezelfde analyse ÉN
  // dezelfde titelgroep, zodat een geraden UUID nooit de tekst van een andere
  // pagina of een andere klant kan opleveren.
  // De pagina zoals hij op de site van de klant staat, in plaats van een eerdere
  // versie van onze eigen tekst.
  if (met === HUIDIGE_PAGINA) {
    const bestaand = (pieceRow.existing_page_text ?? "").trim();
    if (!bestaand) {
      return NextResponse.json(
        { error: "De tekst van je bestaande pagina is niet opgehaald, dus er valt niets te vergelijken." },
        { status: 404 },
      );
    }
    return NextResponse.json({
      ...diffContent(bestaand, pieceRow.body_markdown ?? ""),
      // ⚠️ De klant moet weten dat de linkerkant een MOMENTOPNAME is. Heeft hij
      // zijn pagina sindsdien zelf aangepast, dan toont dit scherm een verschil
      // met een versie die niet meer bestaat, en dan is "dit verdwijnt" onjuist.
      gemetenOp: pieceRow.existing_page_fetched_at ?? null,
    });
  }

  const { data: metRow } = await admin
    .from("content_pieces")
    .select("body_markdown")
    .eq("id", met)
    .eq("analysis_id", id)
    .eq("title", pieceRow.title)
    .maybeSingle();
  if (!metRow) return NextResponse.json({ error: "Vorige versie niet gevonden." }, { status: 404 });

  const result = diffContent(metRow.body_markdown ?? "", pieceRow.body_markdown ?? "");
  return NextResponse.json(result);
}
