import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAnalysis } from "@/lib/analyses";
import { formatDateLong } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { renderMarkdown, extractHeadings } from "@/lib/markdown";
import { TableOfContents } from "@/components/table-of-contents";
import { ContentActions } from "./content-actions";
import { ReviseBox } from "./revise-box";
import { eindpoort } from "@/lib/content-final-gate";
import { countBlockingQuestions } from "@/lib/open-questions";
import { ContentEditor } from "./content-editor";
import { PublishGuide } from "@/components/publish-guide";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PublishBox } from "./publish-box";
import type { PublishCheck } from "@/lib/pipeline/publish-check";
import { GeoScorecard } from "@/components/geo-scorecard";
import { ReleasePanel, type ReleaseClaim, type ReleaseFact } from "./release-panel";
import { factsFromSnapshot } from "@/lib/pipeline/briefing";
import { detectClaimSentences, claimMatchesSentence } from "@/lib/pipeline/claim-extract";
import { isSupported, type WrittenClaim } from "@/lib/pipeline/factcard";
import { versionReasonOf } from "@/lib/pipeline/version-reason";
import { resolvedContentUrl, displayTitle } from "@/lib/pipeline/slug";
import { ExternalLink } from "@/components/external-link";
import { WhyThisPage } from "@/components/why-this-page";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadContentPotential } from "@/lib/potential-data";
import { SearchPreview } from "@/components/search-preview";
import { VersionDiff } from "@/components/version-diff";
import { ImprovementList } from "@/components/improvement-list";
import { describeImprovements, describeImprovementCount } from "@/lib/pipeline/contract-format";
import { bruikbareOpdracht } from "@/lib/schrijfopdracht";
import type { WriterBrief } from "@/lib/schemas/writer-brief";
import type { ContentContract } from "@/lib/schemas/content-contract";
import { buildTemplateExport } from "@/lib/pipeline/content-export";
import type { SiteTemplateProfile } from "@/lib/pipeline/template-detect";
import { leesHerkomst, terugLink } from "@/lib/origin";
import type { ContentPiece, ContentPieceTarget } from "@/lib/types/database";
import { Icon } from "@/components/icon";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import {
  QualityPanel,
  QualityInternalPanel,
  leesQualityJson,
} from "@/components/quality-panel";
import { klantOordeel } from "@/lib/pipeline/quality-score";
import { issuesUitJson } from "@/lib/pipeline/quality-issue";

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
    .select("title, meta_title")
    .eq("id", pieceId)
    .maybeSingle();
  const piece = data as { title: string; meta_title: string | null } | null;
  return { title: piece ? displayTitle(piece) : "Contentpagina" };
}

export default async function ContentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; pieceId: string }>;
  searchParams: Promise<{ van?: string }>;
}) {
  const { id, pieceId } = await params;
  // Waar kwam je vandaan? Bepaalt waar de terugknop heen wijst, zie
  // `lib/origin.ts`. Zonder parameter is het clusterdossier de veilige terugval.
  const herkomst = leesHerkomst((await searchParams).van);
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const gebruiker = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_pieces")
    .select("*")
    .eq("id", pieceId)
    .eq("analysis_id", id)
    .maybeSingle();

  if (!data) notFound();
  const piece = data as ContentPiece;
  // De paginatitel die de klant en Google te zien krijgen (doorloop-huyberts.md
  // punt 3), niet de aanbevelingstitel uit content_pieces.title zelf: die
  // blijft de dedupe-sleutel van de schrijftaak (content.ts) en wordt daarom
  // hieronder bewust NIET vervangen door `kop` bij de versie-lookup en het
  // bewerkveld.
  const kop = displayTitle(piece);
  const bodyHtml = renderMarkdown(piece.body_markdown ?? "");
  const headings = extractHeadings(piece.body_markdown ?? "");
  const faq = (piece.faq_json ?? []) as Faq[];

  // Waar deze pagina voor gemaakt is (optimalisatie.md 4.1) en welke versies er
  // eerder waren (4.7).
  const admin = createAdminClient();
  const [
    { data: targetRows },
    { data: versionRows },
    potentie,
    { data: templateFacet },
    { data: kwaliteitsRondes },
    magInterneCijfersZien,
  ] = await Promise.all([
    supabase.from("content_piece_targets").select("*").eq("content_piece_id", pieceId),
    supabase
      .from("content_pieces")
      .select("id, version, created_at, is_current, revision_note, edited_by_user")
      .eq("analysis_id", id)
      .eq("title", piece.title)
      .order("version", { ascending: false }),
    loadContentPotential(admin, pieceId),
    // Het sjabloon van de site (discover.ts): welk CMS, FAQ-accordions,
    // citaatblokken. Bepaalt of ContentActions een extra downloadknop toont.
    supabase
      .from("profile_facets")
      .select("raw_json")
      .eq("profile_id", analysis.profile_id)
      .eq("facet", "sjabloon")
      .maybeSingle(),
    // De kwaliteitsrondes van deze pagina (migratie 0091). Via de admin-client:
    // `content_quality_runs` heeft nul policies, net als `jobs`, want dit is
    // afgeleide data die alleen intern gelezen wordt (conventie 6).
    admin
      .from("content_quality_runs")
      .select("repair_round, score, verdict, blocking_count, retained")
      .eq("content_piece_id", pieceId)
      .order("repair_round", { ascending: true }),
    isStaff(gebruiker.id),
  ]);

  // ── Het kwaliteitsraamwerk (migratie 0091) ────────────────────────────────
  //
  // De klant leest één zin en de blokkades; de adviseur ziet de dimensies, de
  // zekerheid, de ketenfase waar de problemen ontstonden en welke versie
  // behouden is. Staat er niets in `quality_json` (een pagina van vóór deze
  // migratie), dan renderen beide blokken niets en blijven de bestaande kaarten
  // eronder het beeld bepalen (conventie 3).
  const kwaliteit = leesQualityJson(piece.quality_json);
  const rondes = (kwaliteitsRondes ?? []).map((rij) => ({
    ronde: Number(rij.repair_round) || 0,
    score: rij.score === null ? null : Number(rij.score),
    verdict: (rij.verdict as string | null) ?? null,
    blokkades: Number(rij.blocking_count) || 0,
    retained: rij.retained === true,
  }));
  const klantzin = kwaliteit?.verdict
    ? klantOordeel(
        {
          score: kwaliteit.score ?? null,
          dimensies: kwaliteit.dimensies ?? {},
          confidence: kwaliteit.confidence ?? 0,
          verdict: kwaliteit.verdict,
          blokkades: issuesUitJson(kwaliteit.issues).filter((i) => i.blocking),
          redenen: kwaliteit.redenen ?? [],
          onderDeMaat: [],
          profiel: piece.quality_profile ?? piece.type,
        },
        kwaliteit.dekking?.gewogen ?? kwaliteit.dekking?.graad ?? null,
      )
    : "";

  const templateProfile = (templateFacet?.raw_json as SiteTemplateProfile | null) ?? null;
  const templateExport = buildTemplateExport(
    { title: kop, bodyMarkdown: piece.body_markdown ?? "", faq },
    templateProfile,
  );

  const targets = (targetRows ?? []) as ContentPieceTarget[];
  const versions = (versionRows ?? []) as Pick<
    ContentPiece,
    "id" | "version" | "created_at" | "is_current" | "revision_note" | "edited_by_user"
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

  // ── Wat de eindpoort tegenhoudt (28 augustus 2026) ───────────────────────
  //
  // Andere telling dan `unansweredRequired` hierboven, en dat is opzet: die
  // lijst gaat over VERPLICHTE vragen over het hele merk en staat in het
  // vrijgavepaneel als "dit ontbreekt in de tekst". Dit getal gaat over wat het
  // afronden blokkeert: de open vragen van dít cluster plus die aan déze pagina
  // hangen (`lib/open-questions.ts`). Eén telling voor de knop en voor de route,
  // want twee tellingen voor één poort lopen uit elkaar.
  const blokkerend = await countBlockingQuestions(supabase, id, pieceId);
  const poort = eindpoort(blokkerend);

  // Content-editie, onderdeel 2: welke URL toon je in het zoekresultaat-
  // voorbeeld? Eenmalig hier bepaald (verandert niet tijdens het bewerken),
  // en doorgegeven aan zowel de statische preview hieronder als de live
  // preview binnen ContentEditor.
  const previewUrl = resolvedContentUrl({
    publishedUrl: piece.published_url,
    action: piece.action,
    existingUrl: piece.existing_url,
    siteUrl: analysis.url,
    title: kop,
    type: piece.type,
  });

  const terug = terugLink(herkomst, id, analysis.profile_id);

  // Het verbeterplan uit het contract (O5). Puur afgeleid, geen extra query: de
  // contractkolom staat al op de rij die hierboven is opgehaald. Leeg bij een
  // nieuwe pagina en bij pagina's van vóór 2 september 2026, en dan verdwijnt
  // het blok vanzelf.
  // De schrijfopdracht (migratie 0094). Puur afgeleid uit een kolom die al
  // opgehaald is; `bruikbareOpdracht()` levert `null` zodra hij niet compleet
  // is, en dan verdwijnt het blok in plaats van half te vullen.
  const verbeteringen = describeImprovements(
    (piece.contract_json ?? null) as ContentContract | null,
  );

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={terug.href}
        className="mono-label flex w-fit items-center gap-1.5 transition-colors hover:text-[var(--text-primary)]"
      >
        <Icon naam="terug" size={14} />
        {terug.label}
      </Link>

      <div className="flex flex-col gap-3">
        <h1 className="type-title">{kop}</h1>
        <span className="chip w-fit">
          {piece.action === "verbeteren" ? (
            <>
              Verbetert bestaande pagina
              {piece.existing_url && (
                <>
                  {": "}
                  <ExternalLink href={piece.existing_url}>{piece.existing_url}</ExternalLink>
                </>
              )}
            </>
          ) : (
            "Nieuwe pagina"
          )}
        </span>
        <ContentActions
          title={kop}
          markdown={piece.body_markdown ?? ""}
          html={bodyHtml}
          schemaJsonLd={piece.schema_jsonld}
          templateExport={templateExport}
        />

        {!piece.is_current && (
          <p className="text-sm text-secondary">
            Dit is een <span className="font-medium">oudere versie</span> (versie {piece.version}).
            Er is inmiddels een nieuwere.
          </p>
        )}
      </div>

      {/* ── Publiceren, en dus bovenaan ──────────────────────────────────────
          ⚠️ Dit blok stond tot 27 augustus 2026 helemaal onderaan, onder de
          tekst, de FAQ, de GEO-score, het vrijgavepaneel, de editor, het
          herschrijfvak en de versiegeschiedenis. Acht blokken lager dus, terwijl
          dit de enige handeling op deze pagina is die het cijfer van de klant
          beweegt: een geschreven pagina die niet online staat, levert per
          definitie nul op. Dat is niet theoretisch, er is een herinneringsmail
          voor gebouwd omdat teksten bleven liggen (`app/api/cron/reminders`).

          De volgorde is nu: wat is dit, zet het live, en pas daarna alles wat
          je kunt controleren en bijschaven. De handleiding staat ingeklapt
          eronder, want wie voor de tweede keer publiceert heeft hem niet meer
          nodig. */}
      <PublishBox
        analysisId={id}
        pieceId={pieceId}
        publishedAt={piece.published_at}
        publishedUrl={piece.published_url}
        check={(piece.publish_check_json as PublishCheck | null) ?? null}
        checkedAt={piece.publish_checked_at}
      />

      {!piece.published_at && (
        <CollapsibleSection title="Hoe zet je dit op je site?" defaultOpen={false}>
          <PublishGuide
            title={kop}
            type={piece.type}
            action={piece.action}
            existingUrl={piece.existing_url}
            siteUrl={analysis.url}
            hasSchema={Boolean(piece.schema_jsonld?.trim())}
          />
        </CollapsibleSection>
      )}

      {/* Context: waarom deze pagina (optimalisatie.md 4.1/4.11, content-editie
          onderdeel 5). Zonder dit blok is een gegenereerde tekst een tekst; mét
          dit blok is het een antwoord op een vraag waarop de klant nu niet
          genoemd wordt. */}
      <WhyThisPage
        analysisId={id}
        targets={targets}
        targetIntent={piece.target_intent}
        cluster={piece.cluster}
        action={piece.action}
        existingUrl={piece.existing_url}
        potentie={potentie}
        opdracht={bruikbareOpdracht(
          (piece.writer_brief_json ?? null) as Partial<WriterBrief> | null,
        )}
      />

      {/* Wat er aan de bestaande pagina verandert (O5). Alleen bij een
          verbetering, en alleen als het contract die vergelijking bevat: bij een
          nieuwe pagina valt er niets te vergelijken, en dan is een lege lijst
          eerlijker dan een lijst met "niet van toepassing". */}
      <ImprovementList
        improvements={verbeteringen}
        samenvatting={describeImprovementCount(verbeteringen)}
        existingUrl={piece.existing_url}
        analysisId={id}
        pieceId={pieceId}
        heeftHuidigeTekst={Boolean(piece.existing_page_text?.trim())}
      />

      {/* Kan deze pagina naar de site van de klant? Eén alinea, de blokkades en
          de dekking (punt 24 en 30 van de opdracht). Bewust bovenaan: dat is de
          vraag waarmee iemand dit scherm opent. */}
      <QualityPanel quality={kwaliteit} klantzin={klantzin} />

      {/* "Check nodig" uitleggen (optimalisatie.md 4.13). Het gele label zei
          niet WÁT er gecheckt moest worden; die punten stonden alleen in de ruwe
          API-respons, en die laat je een klant niet lezen. */}
      {piece.needs_review && piece.review_notes.length > 0 && (
        <div className="card card-warning flex flex-col gap-2">
          <span className="mono-label">Kijk hier even naar</span>
          <p className="text-sm text-secondary">
            De eindredactie van ORBIT ENGINE twijfelt over deze punten. Schaaf de tekst zelf bij, of vraag
            hieronder om een nieuwe versie.
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-secondary">
            {piece.review_notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Wat er nu staat: het zoekresultaat-voorbeeld (content-editie,
          onderdeel 2), en daarna het artikel zelf. */}
      <SearchPreview
        title={piece.title}
        metaTitle={piece.meta_title ?? ""}
        metaDescription={piece.meta_description ?? ""}
        url={previewUrl.url}
        isReal={previewUrl.isReal}
      />

      <TableOfContents headings={headings} />

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

      {/* Kwaliteitscontrole: de GEO-score, het vrijgavepaneel en de
          redactionele samenvatting, als groep vóór het bewerken. */}
      {geo && <GeoScorecard geo={geo} score={piece.geo_score} />}

      {/* De interne analyse. Alleen voor een beheerder, en dus automatisch weg
          zodra hij de klantweergave aanzet (`lib/staff.ts`): die cookie kan
          rechten wegnemen en nooit geven. */}
      {magInterneCijfersZien && (
        <QualityInternalPanel
          quality={kwaliteit}
          rondes={rondes}
          bronherleidbaarheid={piece.source_coverage}
        />
      )}

      <ReleasePanel
        analysisId={id}
        pieceId={pieceId}
        needsReview={piece.needs_review}
        reviewedAt={piece.reviewed_at}
        facts={[...releaseFacts.filter((f) => f.allowed), ...verbodenFeiten]}
        claims={releaseClaims}
        unansweredRequired={unansweredRequired}
        poort={poort}
        vragenHref={`/merk/${analysis.profile_id}/strategie/vragen`}
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

      {/* Bewerken: tekst, titel, meta, FAQ, met een live voorbeeld. */}
      <ContentEditor
        analysisId={id}
        pieceId={pieceId}
        initial={{
          title: piece.title,
          bodyMarkdown: piece.body_markdown ?? "",
          metaTitle: piece.meta_title ?? "",
          metaDescription: piece.meta_description ?? "",
          faq,
        }}
        previewUrl={previewUrl}
      />

      <ReviseBox
        analysisId={id}
        pieceId={pieceId}
        poort={poort}
        vragenHref={`/merk/${analysis.profile_id}/strategie/vragen`}
      />

      {/* Geschiedenis en vergelijken. */}
      {versions.length > 1 && (
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Eerdere versies</span>
          <ul className="flex flex-col gap-1.5">
            {versions.map((v, i) => {
              // C.24: waarom deze versie bestaat, in mensentaal. Voorheen stond
              // hier alleen iets bij een revision_note; een automatische
              // herschrijving na de eigen kritiekronde van ORBIT ENGINE (geen notitie,
              // geen klant-bewerking) toonde niets, alsof er zomaar een nieuwe
              // versie verscheen.
              const reason = versionReasonOf({
                version: v.version,
                revisionNote: v.revision_note,
                editedByUser: v.edited_by_user,
              });
              const vorige = versions[i + 1];
              return (
                <li key={v.id} className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-2 text-sm">
                    {v.id === pieceId ? (
                      <span className="font-medium">Versie {v.version} (je bekijkt deze)</span>
                    ) : (
                      <Link href={`/analyses/${id}/bibliotheek/${v.id}`} className="underline">
                        Versie {v.version}
                      </Link>
                    )}
                    <span className="text-muted">{formatDateLong(v.created_at)}</span>
                    <span className="text-secondary">{reason.label}</span>
                  </div>
                  {vorige && <VersionDiff analysisId={id} pieceId={v.id} previousId={vorige.id} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

    </div>
  );
}
