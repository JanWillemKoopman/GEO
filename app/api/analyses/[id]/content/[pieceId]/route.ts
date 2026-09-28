import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { laadOrganisatie } from "@/lib/pagina/organisatie";
import { validateOrRebuildJsonLd, bestaandeDatePublished } from "@/lib/schema-jsonld";
import { FaqEdit } from "@/lib/schemas/content-piece";

/**
 * PATCH: de klant schaaft de tekst zelf bij (optimalisatie.md 4.12, content-
 * editie onderdeel 3/4).
 *
 * Tot nu toe kon hij alleen kopiëren of downloaden. Een tekst die je niet kunt
 * bijschaven, publiceer je niet. Dan blijft hij in de bibliotheek liggen en
 * gebeurt er niets, hoe goed hij ook is.
 *
 * Geen nieuwe versie: dit is de klant die zíjn tekst aanpast, niet de app die
 * iets nieuws schrijft. Wel `edited_by_user`, zodat zichtbaar is dat de tekst
 * niet meer één-op-één is wat het model opleverde.
 */
const EDITABLE_FIELDS = ["body_markdown", "meta_title", "meta_description", "title"] as const;

export async function PATCH(
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  // ── Punt 17: wie bewerkt dit op dit moment? ──────────────────────────────
  //
  // De editor laadt de pagina en stuurt terug wanneer hij dat deed
  // (`updated_at`). Ontbreekt dat, dan draait er een oudere clientversie die
  // dit nooit meestuurt, en is er niets om tegen te vergelijken: vernieuwen
  // is dan de veilige vraag in plaats van blind opslaan.
  if (typeof body.updated_at !== "string") {
    return NextResponse.json(
      { error: "Vernieuw de pagina en probeer het opnieuw." },
      { status: 400 },
    );
  }

  // Eén keer ophalen: nodig voor de deterministische controles (punt 14, de
  // huidige waarden van velden die niet meegestuurd worden), voor het
  // FAQ/schema.org-blok hieronder, en om zo meteen "bestaat dit nog" te weten.
  const { data: pieceRow } = await admin
    .from("content_pieces")
    .select(
      "type, title, body_markdown, meta_title, meta_description, cluster, schema_jsonld, published_url, created_at, updated_at",
    )
    .eq("id", pieceId)
    .eq("analysis_id", id)
    .maybeSingle();
  if (!pieceRow) {
    return NextResponse.json({ error: "Deze pagina bestaat niet meer." }, { status: 404 });
  }

  const update: Record<string, unknown> = { edited_by_user: true };
  for (const field of EDITABLE_FIELDS) {
    if (typeof body[field] === "string") update[field] = (body[field] as string).trim();
  }

  // FAQ zit niet in EDITABLE_FIELDS: het is een array, geen string, en komt
  // dus niet door de lus hierboven. Eigen validatie via het zod-schema dat
  // ook het invoerformulier gebruikt, zodat client en server exact dezelfde
  // grenzen hanteren.
  if (Array.isArray(body.faq_json)) {
    const parsed = FaqEdit.safeParse(body.faq_json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "De FAQ kon niet worden opgeslagen: controleer de vragen en antwoorden." },
        { status: 400 },
      );
    }
    update.faq_json = parsed.data;
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "Niets om op te slaan." }, { status: 400 });
  }

  // Alleen wat een pagina onbruikbaar maakt: een lege titel of een lege tekst.
  // Geen controle op stijl of inhoud (`docs/tasks/contentketen-opnieuw.md` §3).
  const titel = ((update.title as string) ?? pieceRow.title ?? "").trim();
  const tekst = ((update.body_markdown as string) ?? pieceRow.body_markdown ?? "").trim();
  if (!titel || !tekst) {
    return NextResponse.json(
      { error: !titel ? "De titel mag niet leeg zijn." : "De tekst mag niet leeg zijn." },
      { status: 422 },
    );
  }

  // Het woordental meteen bijwerken: anders staat er in de bibliotheek een
  // getal dat niet meer klopt met de tekst die eronder staat.
  if (typeof update.body_markdown === "string") {
    update.word_count = (update.body_markdown as string).trim().split(/\s+/).filter(Boolean).length;
  }

  // ── FAQ gewijzigd op een FAQ-pagina: schema.org meebewegen ────────────────
  //
  // `validateOrRebuildJsonLd()` zet FAQ-items alleen in `mainEntity` als
  // `type === "faq"` (zie `buildPageNode()` in lib/schema-jsonld.ts), dus dat
  // typeveld is het exacte signaal, geen stringmatch op de opgeslagen
  // JSON-LD-tekst nodig. Zonder deze stap zou de klant een vraag kunnen
  // aanpassen terwijl de gestructureerde data die AI-crawlers lezen de oude
  // vraag blijft tonen, precies het soort verrassing dat conventie 1 wil
  // voorkomen.
  if (update.faq_json && pieceRow.type === "faq") {
    const [{ data: profileRow }, schemaOrg] = await Promise.all([
      admin.from("profiles").select("business_model").eq("id", analysis.profile_id).maybeSingle(),
      laadOrganisatie(admin, analysis.profile_id),
    ]);
    update.schema_jsonld = validateOrRebuildJsonLd(pieceRow.schema_jsonld, {
      type: "faq",
      title: (update.title as string) ?? pieceRow.title,
      description: (update.meta_description as string) ?? pieceRow.meta_description ?? "",
      url: pieceRow.published_url ?? analysis.url,
      faq: update.faq_json as { q: string; a: string }[],
      businessModel: profileRow?.business_model ?? null,
      organization: schemaOrg,
      datePublished: bestaandeDatePublished(pieceRow.schema_jsonld) ?? pieceRow.created_at,
      dateModified: new Date().toISOString(),
    });
  }

  update.updated_at = new Date().toISOString();

  // ⚠️ Punt 17: de voorwaardelijke `WHERE updated_at = ...` bepaalt zelf of de
  // opslag lukt, niet een lezing ervoor (zelfde patroon als `removePage()` in
  // lib/plans.ts). Matcht hij geen rij, dan wijzigde iemand anders de pagina
  // tussen het laden en dit moment, en is er niets overschreven.
  const { data: opgeslagen, error } = await admin
    .from("content_pieces")
    .update(update)
    .eq("id", pieceId)
    .eq("analysis_id", id)
    .eq("updated_at", pieceRow.updated_at)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(`Opslaan van pagina ${pieceId} mislukt:`, error.message);
    return NextResponse.json(
      { error: "Opslaan is niet gelukt door een tijdelijke storing. Er is niets veranderd, probeer het opnieuw." },
      { status: 500 },
    );
  }
  if (!opgeslagen) {
    return NextResponse.json(
      {
        error:
          "Iemand anders heeft deze pagina ondertussen gewijzigd. Vernieuw de pagina om de nieuwste versie te zien; je eigen tekst is niet opgeslagen, kopieer hem eerst als je hem wilt bewaren.",
      },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, updatedAt: update.updated_at });
}
