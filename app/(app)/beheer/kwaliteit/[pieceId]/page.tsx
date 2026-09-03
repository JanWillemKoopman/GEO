import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { renderMarkdown } from "@/lib/markdown";
import { QualityInternalPanel, leesQualityJson } from "@/components/quality-panel";
import { diffContent } from "@/lib/pipeline/content-diff";
import { ReviewForm } from "./review-form";
import type { ContentPiece, ContentQualityReview } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pagina beoordelen" };

/**
 * ÉÉN PAGINA IN HET KWALITEITSLAB
 * (docs/tasks/contentkwaliteit-framework.md §6, punt 13 en 25 van de opdracht)
 *
 * ── DRIE DINGEN NAAST ELKAAR ────────────────────────────────────────────────
 *
 *   1. wat ORBIT ENGINE schreef
 *   2. wat ORBIT ENGINE ervan vond, tot en met de ketenfase waar de problemen
 *      ontstonden
 *   3. wat een mens ervan vindt, en optioneel hoe hij hem zelf geschreven zou
 *      hebben
 *
 * Dat derde is de GOUDEN REFERENTIE. Hij is nadrukkelijk geen norm en zeker geen
 * "enige juiste tekst": het is een meetlat waarmee te onderzoeken valt welke
 * kwaliteitsverschillen er zijn, welke fouten de app maakt, welke dimensies de
 * AI-beoordelaars missen, en hoeveel menselijke correctie er nodig is.
 *
 * ⚠️ Alleen voor beheerders, en bij een gewone gebruiker een 404 en geen 403.
 */
export default async function LabPaginaDetail({
  params,
}: {
  params: Promise<{ pieceId: string }>;
}) {
  const { pieceId } = await params;
  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  const admin = createAdminClient();
  const { data } = await admin.from("content_pieces").select("*").eq("id", pieceId).maybeSingle();
  if (!data) notFound();
  const piece = data as ContentPiece;

  const [{ data: rondeRijen }, { data: reviewRijen }, { data: analyse }] = await Promise.all([
    admin
      .from("content_quality_runs")
      .select("repair_round, score, verdict, blocking_count, retained")
      .eq("content_piece_id", pieceId)
      .order("repair_round", { ascending: true }),
    admin
      .from("content_quality_reviews")
      .select("*")
      .eq("content_piece_id", pieceId)
      .order("created_at", { ascending: false }),
    admin.from("analyses").select("id, topic, profile_id").eq("id", piece.analysis_id).maybeSingle(),
  ]);

  const rondes = (rondeRijen ?? []).map((rij) => ({
    ronde: Number(rij.repair_round) || 0,
    score: rij.score === null ? null : Number(rij.score),
    verdict: (rij.verdict as string | null) ?? null,
    blokkades: Number(rij.blocking_count) || 0,
    retained: rij.retained === true,
  }));

  const reviews = (reviewRijen ?? []) as ContentQualityReview[];
  // De beoordeling van DEZE gebruiker vult het formulier; de rest staat eronder.
  const eigen = reviews.find((r) => r.reviewer_id === user.id) ?? null;
  const anderen = reviews.filter((r) => r.reviewer_id !== user.id);

  const kwaliteit = leesQualityJson(piece.quality_json);
  const bodyHtml = renderMarkdown(piece.body_markdown ?? "");

  // De gouden referentie naast de AI-versie. Alleen tonen als er een referentie
  // is: een verschilweergave tegen een lege tekst zegt alleen dat alles nieuw is.
  const referentie = reviews.find((r) => r.reference_markdown?.trim())?.reference_markdown ?? null;
  const verschil = referentie
    // Op alineaniveau en niet woord voor woord: twee onafhankelijk geschreven
    // teksten delen alleen hun kleine woorden, en dan wordt het verschil ruis
    // die precisie suggereert die er niet is (zie `content-diff.ts`).
    ? diffContent(referentie, piece.body_markdown ?? "", undefined, "alinea")
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Kwaliteitslab"
        title={piece.title}
        description={`${analyse?.topic ?? ""} · ${piece.type} · versie ${piece.version}`}
      />

      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/beheer/kwaliteit" className="text-secondary">
          Terug naar het lab
        </Link>
        <Link href={`/analyses/${piece.analysis_id}/bibliotheek/${pieceId}`} className="text-secondary">
          Bekijk zoals de klant hem ziet
        </Link>
      </div>

      <QualityInternalPanel
        quality={kwaliteit}
        rondes={rondes}
        bronherleidbaarheid={piece.source_coverage}
      />

      <div className="card flex flex-col gap-3">
        <span className="mono-label">Wat ORBIT ENGINE schreef</span>
        <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </div>

      {verschil && (
        <div className="card flex flex-col gap-3">
          <span className="mono-label">Naast de referentieversie</span>
          <p className="text-sm text-secondary">
            Links wat een mens schreef, rechts wat ORBIT ENGINE schreef. De referentie is geen norm
            maar een meetlat: waar hij afwijkt, staat de vraag waarom.
          </p>
          <div className="flex flex-col gap-1 text-sm">
            {verschil.ops.slice(0, 60).map((op, i) => (
              <p
                key={i}
                className={
                  op.type === "gelijk"
                    ? "text-muted"
                    : op.type === "toegevoegd"
                      ? "text-secondary"
                      : "text-secondary line-through"
                }
              >
                {op.type === "toegevoegd" ? "+ " : op.type === "verwijderd" ? "- " : "  "}
                {op.text.slice(0, 400)}
              </p>
            ))}
          </div>
        </div>
      )}

      <ReviewForm pieceId={pieceId} bestaand={eigen} />

      {anderen.length > 0 && (
        <div className="card flex flex-col gap-3">
          <span className="mono-label">Wat anderen ervan vonden</span>
          {anderen.map((review) => (
            <div key={review.id} className="border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-medium">{review.reviewer_name ?? "onbekend"}</p>
              <p className="text-sm text-secondary">
                {review.would_send === true
                  ? "Zou deze tekst zo versturen."
                  : review.would_send === false
                    ? "Zou deze tekst niet zo versturen."
                    : "Geen oordeel over versturen."}
                {review.first_thing_to_change ? ` Eerst veranderen: ${review.first_thing_to_change}` : ""}
              </p>
              {review.notes && <p className="text-sm text-muted">{review.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
