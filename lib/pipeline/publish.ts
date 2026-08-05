import "server-only";

/**
 * Publiceren vastleggen (optimalisatie.md 5.1/5.2).
 *
 * De statuswaarde `published` bestond al sinds de eerste migratie en werd
 * nergens gezet, er was geen enkele manier om te zeggen "deze staat live". En
 * daarmee ook geen manier om te weten of er ooit iets met de content gebeurde,
 * laat staan of het werkte.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkPublication, type PublishCheck } from "@/lib/pipeline/publish-check";
import { planImpactWaves } from "@/lib/pipeline/impact";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import type { ContentPiece } from "@/lib/types/database";

type Admin = SupabaseClient;

export interface PublishResult {
  publishedAt: string;
  wavesPlanned: number;
}

/**
 * Markeert een pagina als gepubliceerd en zet de vervolgstappen klaar.
 *
 * De CONTROLE draait bewust als aparte taak en niet hier: die haalt een externe
 * pagina op, en dat mag de klant niet laten wachten op een formulier, laat
 * staan dat een trage website zijn publicatie zou laten mislukken. Hij krijgt
 * meteen bevestiging; de uitslag van de controle verschijnt even later.
 */
export async function markPublished(
  admin: Admin,
  args: { analysisId: string; contentPieceId: string; url: string },
): Promise<PublishResult> {
  const publishedAt = new Date();

  const { error } = await admin
    .from("content_pieces")
    .update({
      status: "published" as const,
      published_at: publishedAt.toISOString(),
      published_url: args.url,
      // Een eerdere controle hoort niet bij deze URL; wissen zodat er geen oude
      // uitslag naast een nieuw adres blijft staan.
      publish_check_json: null,
      publish_checked_at: null,
    })
    .eq("id", args.contentPieceId)
    .eq("analysis_id", args.analysisId);

  if (error) throw new Error(`Publicatie vastleggen mislukt: ${error.message}`);

  await enqueue(admin, {
    type: "verify_publication",
    payload: { contentPieceId: args.contentPieceId },
    analysisId: args.analysisId,
    dedupeKey: dedupe.verifyPublication(args.contentPieceId),
  });

  const { planned } = await planImpactWaves(admin, {
    analysisId: args.analysisId,
    contentPieceId: args.contentPieceId,
    publishedAt,
  });

  return { publishedAt: publishedAt.toISOString(), wavesPlanned: planned };
}

/**
 * Haalt de gepubliceerde pagina op en kijkt of de tekst er echt staat.
 *
 * Dit is wat een `verify_publication`-taak doet. Faalt de controle inhoudelijk
 * (pagina onbereikbaar, tekst niet gevonden), dan is dat GEEN mislukte taak
 * maar een bevinding: hij wordt opgeslagen en aan de klant getoond. Een taak die
 * faalt zou opnieuw geprobeerd worden en uiteindelijk de analyse op 'mislukt'
 * zetten, voor een typefout in een URL is dat een absurde uitkomst.
 */
export async function verifyPublication(admin: Admin, contentPieceId: string): Promise<PublishCheck | null> {
  const { data } = await admin
    .from("content_pieces")
    .select("published_url, body_markdown, schema_jsonld")
    .eq("id", contentPieceId)
    .maybeSingle();

  const piece = data as Pick<ContentPiece, "published_url" | "body_markdown" | "schema_jsonld"> | null;
  if (!piece?.published_url) {
    console.warn(`Pagina ${contentPieceId} heeft geen publicatie-URL; controle overgeslagen.`);
    return null;
  }

  const check = await checkPublication({
    url: piece.published_url,
    bodyMarkdown: piece.body_markdown ?? "",
    schemaJsonLd: piece.schema_jsonld,
  });

  await admin
    .from("content_pieces")
    .update({ publish_check_json: check as never, publish_checked_at: check.checkedAt })
    .eq("id", contentPieceId);

  return check;
}

/** Publicatie terugdraaien, de klant heeft zich vergist of de pagina is offline. */
export async function markUnpublished(
  admin: Admin,
  args: { analysisId: string; contentPieceId: string },
): Promise<void> {
  await admin
    .from("content_pieces")
    .update({
      status: "ready" as const,
      published_at: null,
      published_url: null,
      publish_check_json: null,
      publish_checked_at: null,
    })
    .eq("id", args.contentPieceId)
    .eq("analysis_id", args.analysisId);

  // De geplande hermetingen weghalen: meten wat een pagina doet die er niet
  // staat, is geld uitgeven aan ruis. Alleen wat nog niet gedraaid heeft,
  // metingen die er al zijn, blijven staan als historie.
  await admin
    .from("jobs")
    .delete()
    .eq("analysis_id", args.analysisId)
    .eq("status", "queued")
    .in("type", ["measure_impact", "compute_impact"])
    .contains("payload_json", { contentPieceId: args.contentPieceId });
}
