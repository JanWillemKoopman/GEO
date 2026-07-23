import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/markdown";
import { ContentActions } from "./content-actions";
import type { ContentPiece } from "@/lib/types/database";

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
        <ContentActions
          title={piece.title}
          markdown={piece.body_markdown ?? ""}
          html={bodyHtml}
          schemaJsonLd={piece.schema_jsonld}
        />
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
