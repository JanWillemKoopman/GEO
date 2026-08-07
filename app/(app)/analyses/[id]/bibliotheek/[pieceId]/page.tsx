import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAnalysis } from "@/lib/analyses";
import { formatDateLong } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/markdown";
import { ContentActions } from "./content-actions";
import { ReviseBox } from "./revise-box";
import { ContentEditor } from "./content-editor";
import { PublishGuide } from "@/components/publish-guide";
import { PublishBox } from "./publish-box";
import type { PublishCheck } from "@/lib/pipeline/publish-check";
import { GeoScorecard } from "@/components/geo-scorecard";
import { ReleasePanel, type ReleaseClaim, type ReleaseFact } from "./release-panel";
import { factsFromSnapshot } from "@/lib/pipeline/briefing";
import { detectClaimSentences, claimMatchesSentence } from "@/lib/pipeline/claim-extract";
import { isSupported, type WrittenClaim } from "@/lib/pipeline/factcard";
import type { ContentPiece, ContentPieceTarget } from "@/lib/types/database";

interface Faq {
  q: string;
  a: string;
}

/**
 * A.4: deze route heeft geen `layout.tsx` boven zich die de titel al zet, dus
 * elke paginaweergave haalt de titel zelf op. Eigen `select("title")` in
 * plaats van de volle rij, dit hoeft niet dezelfde query als de pagina zelf
 * te zijn: een tabbladtitel heeft geen `body_markdown` nodig.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; pieceId: string }>;
}): Promise<Metadata> {
  const { pieceId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_pieces")
    .select("title")
    .eq("id", pieceId)
    .maybeSingle();
  return { title: (data as { title: string } | null)?.title ?? "Contentpagina" };
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
  // Bewust ongetypeerd doorgegeven: `geoRegels()` in de scorekaart kent twee
  // vormen (de zelfrapportage van vóór R8.7 en de deterministische controle
  // erna) en normaliseert ze allebei.
  const geo = piece.geo_json as Record<string, unknown> | null;

  // ── Wat het vrijgavepaneel toont (S6) ─────────────────────────────────────
  //
  // Alle drie de stukken bestonden al in de database en waren voor de klant
  // onzichtbaar: de feitenkaart alleen in `briefing_snapshot_json`, de
  // uitspraken-zonder-bron alleen als getal in `source_coverage`, en de
  // openstaande verplichte vragen alleen in `fact_requests`.
  //
  // De zinnen worden hier opnieuw gedetecteerd in plaats van opgeslagen. Dat is
  // met opzet: dan klopt het paneel ook nadat de klant de tekst zelf bijgewerkt
  // heeft (`edited_by_user`), en er is geen tweede kolom die uit de pas kan lopen
  // met de tekst waar hij over gaat.
  const releaseFacts: ReleaseFact[] = factsFromSnapshot(piece.briefing_snapshot_json).map((f) => ({
    ref: f.ref || "geen bron",
    text: f.text,
    source: f.source,
    // Achtergrond zonder F-nummer is geen bron; die hoort hier niet als
    // "bevestigd feit" te staan, en ook niet als verbod.
    allowed: f.allowed && f.citable,
  }));
  const alleFeiten = factsFromSnapshot(piece.briefing_snapshot_json);
  const verbodenFeiten: ReleaseFact[] = alleFeiten
    .filter((f) => !f.allowed)
    .map((f) => ({ ref: f.ref || "geen bron", text: f.text, source: f.source, allowed: false }));

  // De merknaam komt van het profiel, niet van de analyse: `detectClaimSentences`
  // herkent een zin als bewering onder andere aan die naam, en met de kale URL
  // als terugval zou geen enkele zin matchen.
  const { data: profielRij } = await supabase
    .from("profiles")
    .select("brand_name")
    .eq("id", analysis.profile_id)
    .maybeSingle();
  const merknaam = (profielRij?.brand_name as string | null) ?? analysis.url;

  const getagd = ((piece.claims_json ?? []) as WrittenClaim[]).filter((c) => c?.claim?.trim());
  const releaseClaims: ReleaseClaim[] = detectClaimSentences(
    { bodyMarkdown: piece.body_markdown ?? "", faq },
    merknaam,
  ).map((d) => {
    const dekkend = getagd.find(
      (c) => claimMatchesSentence(c.claim, d.sentence) && isSupported(c.factRef, alleFeiten, c.quote ?? null),
    );
    return { sentence: d.sentence, factRef: dekkend?.factRef ?? null };
  });

  const { data: openVragen } = await supabase
    .from("fact_requests")
    .select("question")
    .eq("profile_id", analysis.profile_id)
    .eq("required", true)
    .in("status", ["open", "overgeslagen"]);
  const unansweredRequired = (openVragen ?? []).map((v) => v.question as string);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/analyses/${id}/bibliotheek`}
        className="mono-label transition-colors hover:text-[var(--text-primary)]"
      >
        ← Bibliotheek
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
              href={`/analyses/${id}?runs=${targets
                .map((t) => t.tracking_run_id)
                .filter(Boolean)
                .join(",")}`}
              className="mono-label w-fit underline transition-colors hover:text-[var(--text-primary)]"
            >
              Zie wat de AI hier nu antwoordt
            </Link>
          )}
        </div>
      )}

      {/* "Check nodig" uitleggen (optimalisatie.md 4.13). Het gele label zei
          niet WÁT er gecheckt moest worden; die punten stonden alleen in de ruwe
          API-respons, en die laat je een klant niet lezen. */}
      {piece.needs_review && piece.review_notes.length > 0 && (
        <div className="card card-warning flex flex-col gap-2">
          <span className="mono-label">Kijk hier even naar</span>
          <p className="text-sm text-secondary">
            De eindredactie van Aura twijfelt over deze punten. Schaaf de tekst zelf bij, of vraag
            hieronder om een nieuwe versie.
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-secondary">
            {piece.review_notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {geo && <GeoScorecard geo={geo} score={piece.geo_score} />}

      {/* Het vrijgavepaneel (S6). Toont waarop deze pagina gebouwd is, en maakt
          van "klaar" een handeling in plaats van een restwaarde. */}
      <ReleasePanel
        analysisId={id}
        pieceId={pieceId}
        needsReview={piece.needs_review}
        reviewedAt={piece.reviewed_at}
        facts={[...releaseFacts.filter((f) => f.allowed), ...verbodenFeiten]}
        claims={releaseClaims}
        unansweredRequired={unansweredRequired}
      />

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
        {/* Bronnendekking (contentbriefing.md §9, R5.3). Bewust náást de
            redactionele kwaliteit en niet in plaats daarvan: die twee meten
            iets anders. Een tekst kan prachtig geschreven zijn én beweringen
            bevatten die nergens vandaan komen. Dat was precies de uitkomst van
            de praktijktest, waar de redactionele score voor alle drie de
            pagina's 100 gaf terwijl er vijf feiten verzonnen waren. */}
        {piece.source_coverage != null && (
          <span className="text-sm">
            <span className="text-muted">Onderbouwd met jouw feiten: </span>
            <span className="font-medium">{Math.round(piece.source_coverage)}%</span>
            {piece.source_coverage < 100 && (
              <span className="text-muted">, de rest is algemene uitleg of niet herleidbaar</span>
            )}
          </span>
        )}
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
                  {formatDateLong(v.created_at)}
                </span>
                {v.revision_note && (
                  <span className="text-secondary">op jouw verzoek: &ldquo;{v.revision_note}&rdquo;</span>
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
