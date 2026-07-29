import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/markdown";
import { ContentActions } from "./content-actions";
import { ReviseBox } from "./revise-box";
import { ContentEditor } from "./content-editor";
import { PublishGuide } from "@/components/publish-guide";
import { PublishBox } from "./publish-box";
import type { PublishCheck } from "@/lib/pipeline/publish-check";
import { GeoScorecard } from "@/components/geo-scorecard";
import type { GeoCriteria } from "@/lib/schemas/critique";
import type { ContentPiece, ContentPieceTarget } from "@/lib/types/database";

interface Faq {
  q: string;
  a: string;
}

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string; pieceId: string }>;
}) {
  const { id, pieceId } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("content_pieces")
    .select("*")
    .eq("id", pieceId)
    .eq("analysis_id", id)
    .maybeSingle();

  if (!data) notFound();
  const piece = data as ContentPiece;
  const bodyHtml = renderMarkdown(piece.body_markdown ?? "");
  const faq = (piece.faq_json ?? []) as Faq[];

  // Waar deze pagina voor gemaakt is (optimalisatie.md 4.1) en welke versies er
  // eerder waren (4.7).
  const [{ data: targetRows }, { data: versionRows }] = await Promise.all([
    supabase.from("content_piece_targets").select("*").eq("content_piece_id", pieceId),
    supabase
      .from("content_pieces")
      .select("id, version, created_at, is_current, revision_note")
      .eq("analysis_id", id)
      .eq("title", piece.title)
      .order("version", { ascending: false }),
  ]);

  const targets = (targetRows ?? []) as ContentPieceTarget[];
  const versions = (versionRows ?? []) as Pick<
    ContentPiece,
    "id" | "version" | "created_at" | "is_current" | "revision_note"
  >[];
  const geo = piece.geo_json as GeoCriteria | null;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/analyses/${id}/bibliotheek`}
        className="mono-label transition-colors hover:text-[var(--text-primary)]"
      >
        ← Content Bibliotheek
      </Link>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{piece.title}</h1>
        <span className="chip w-fit">
          {piece.action === "verbeteren" ? (
            <>
              Verbetert bestaande pagina
              {piece.existing_url && (
                <>
                  {": "}
                  <a href={piece.existing_url} target="_blank" rel="noopener noreferrer" className="underline">
                    {piece.existing_url}
                  </a>
                </>
              )}
            </>
          ) : (
            "Nieuwe pagina"
          )}
        </span>
        <ContentActions
          title={piece.title}
          markdown={piece.body_markdown ?? ""}
          html={bodyHtml}
          schemaJsonLd={piece.schema_jsonld}
        />

        {!piece.is_current && (
          <p className="text-sm text-secondary">
            Dit is een <span className="font-medium">oudere versie</span> (versie {piece.version}).
            Er is inmiddels een nieuwere.
          </p>
        )}
      </div>

      {/* Waar deze pagina voor gemaakt is (optimalisatie.md 4.1/4.11). Zonder dit
          blok is een gegenereerde tekst een tekst; mét dit blok is het een
          antwoord op een vraag waarop de klant nu niet genoemd wordt. */}
      {targets.length > 0 && (
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Deze pagina moet deze vragen winnen</span>
          <ul className="flex flex-col gap-1">
            {targets.map((t) => (
              <li key={t.id} className="text-sm text-secondary">
                &ldquo;{t.prompt_text}&rdquo;
              </li>
            ))}
          </ul>
          {targets.some((t) => t.tracking_run_id) && (
            <Link
              href={`/analyses/${id}/antwoorden?runs=${targets
                .map((t) => t.tracking_run_id)
                .filter(Boolean)
                .join(",")}`}
              className="mono-label w-fit underline transition-colors hover:text-[var(--text-primary)]"
            >
              Bekijk wat de AI hier nu antwoordt
            </Link>
          )}
        </div>
      )}

      {/* "Check nodig" uitleggen (optimalisatie.md 4.13). Het gele label zei
          niet WÁT er gecheckt moest worden; die punten stonden alleen in de ruwe
          API-respons, en die laat je een klant niet lezen. */}
      {piece.needs_review && piece.review_notes.length > 0 && (
        <div className="card flex flex-col gap-2" style={{ borderColor: "rgba(240,180,60,0.45)" }}>
          <span className="mono-label">Kijk hier even naar</span>
          <p className="text-sm text-secondary">
            De eindredacteur twijfelt over de volgende punten. Je kunt de tekst zelf bijschaven, of
            hieronder om een nieuwe versie vragen.
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-secondary">
            {piece.review_notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {geo && <GeoScorecard geo={geo} score={piece.geo_score} />}

      <div className="card flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-sm">
          <span className="text-muted">Redactionele kwaliteit: </span>
          <span className="font-medium">
            {piece.needs_review ? "even nakijken" : "klaar om te publiceren"}
          </span>
          {piece.quality_score != null && (
            <span className="text-muted"> ({Math.round(piece.quality_score)}/100)</span>
          )}
        </span>
        {piece.word_count != null && (
          <span className="text-sm text-muted">{piece.word_count} woorden</span>
        )}
        {piece.edited_by_user && <span className="text-sm text-muted">door jou bewerkt</span>}
      </div>

      {(piece.meta_title || piece.meta_description) && (
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Meta</span>
          {piece.meta_title && (
            <p className="text-sm">
              <span className="text-muted">Title: </span>
              <span className="text-secondary">{piece.meta_title}</span>
            </p>
          )}
          {piece.meta_description && (
            <p className="text-sm">
              <span className="text-muted">Description: </span>
              <span className="text-secondary">{piece.meta_description}</span>
            </p>
          )}
        </div>
      )}

      <article className="card prose max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      <PublishBox
        analysisId={id}
        pieceId={pieceId}
        publishedAt={piece.published_at}
        publishedUrl={piece.published_url}
        check={(piece.publish_check_json as PublishCheck | null) ?? null}
        checkedAt={piece.publish_checked_at}
      />

      <PublishGuide
        title={piece.title}
        type={piece.type}
        action={piece.action}
        existingUrl={piece.existing_url}
        siteUrl={analysis.url}
        hasSchema={Boolean(piece.schema_jsonld?.trim())}
      />

      <ContentEditor
        analysisId={id}
        pieceId={pieceId}
        initial={{
          bodyMarkdown: piece.body_markdown ?? "",
          metaTitle: piece.meta_title ?? "",
          metaDescription: piece.meta_description ?? "",
        }}
      />

      <ReviseBox analysisId={id} pieceId={pieceId} />

      {versions.length > 1 && (
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Eerdere versies</span>
          <ul className="flex flex-col gap-1.5">
            {versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                {v.id === pieceId ? (
                  <span className="font-medium">Versie {v.version} (je bekijkt deze)</span>
                ) : (
                  <Link href={`/analyses/${id}/bibliotheek/${v.id}`} className="underline">
                    Versie {v.version}
                  </Link>
                )}
                <span className="text-muted">
                  {new Date(v.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                </span>
                {v.revision_note && (
                  <span className="text-secondary">— op jouw verzoek: &ldquo;{v.revision_note}&rdquo;</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {faq.length > 0 && (
        <div className="card flex flex-col gap-4">
          <span className="mono-label">FAQ</span>
          <div className="flex flex-col gap-3">
            {faq.map((item, i) => (
              <div key={i} className="border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0">
                <p className="font-medium">{item.q}</p>
                <p className="mt-1 text-secondary">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
