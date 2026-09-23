import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { formatDateLong } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { extractHeadings } from "@/lib/markdown";
import { TableOfContents } from "@/components/table-of-contents";
import { ContentActions } from "./content-actions";
import { ReviseBox } from "./revise-box";
import { eindpoort } from "@/lib/content-final-gate";
import { countBlockingQuestions } from "@/lib/open-questions";
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
import { VersionDiff } from "@/components/version-diff";
import { ImprovementList } from "@/components/improvement-list";
import { describeImprovements, describeImprovementCount } from "@/lib/pipeline/contract-format";
import { bruikbareOpdracht } from "@/lib/schrijfopdracht";
import type { WriterBrief } from "@/lib/schemas/writer-brief";
import type { ContentContract } from "@/lib/schemas/content-contract";
import { buildTemplateExport } from "@/lib/pipeline/content-export";
import type { SiteTemplateProfile } from "@/lib/pipeline/template-detect";
import type { ContentPiece, ContentPieceTarget } from "@/lib/types/database";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { QualityInternalPanel, leesQualityJson } from "@/components/quality-panel";
import { klantOordeel } from "@/lib/pipeline/quality-score";
import { issuesUitJson, type QualityIssue } from "@/lib/pipeline/quality-issue";
import {
  groepeerBevindingen,
  beschrijfPogingen,
  type Keuringsronde,
} from "@/lib/pipeline/quality-groups";
import { renderMarkdown } from "@/lib/markdown";
import { leesGeaccepteerd, zonderGeaccepteerd } from "@/lib/geaccepteerde-zinnen";
import { ContentWerkblad } from "./content-werkblad";
import { TekstAanZet } from "@/components/pagina/tekst-aan-zet";
import type { PaginaStand } from "@/lib/pagina-stand";

interface Faq {
  q: string;
  a: string;
}

/**
 * De contentpagina: beoordelen, bijschaven, live zetten.
 *
 * ── ⚠️ DRIE ZONES, EN WAAROM (22 september 2026) ────────────────────────────
 *
 * Dit bestand was 587 regels met twintig blokken onder elkaar. De tekst begon
 * bij blok 12, het bewerken bij blok 18, en dezelfde tekst stond twee keer op
 * het scherm: als opgemaakt artikel en nog eens als tekstvak. Wie bij bevinding
 * 31 las dat een sectie te vaag was, moest elf blokken verder scrollen om hem
 * aan te passen.
 *
 * Nu: een balk met de handeling, een canvas met de tekst, en een rail met de
 * context. Het volledige waarom staat in
 * `docs/tasks/herontwerp-contentpagina.md`. De queries hieronder zijn niet
 * veranderd op één na: `content_quality_runs` levert nu ook `issues_json` mee,
 * want daarmee is exact af te leiden welke bevindingen de reparatie ooit
 * meekreeg (`lib/pipeline/quality-groups.ts`).
 */
export async function ContentDetail({
  id,
  pieceId,
  terug,
  paginaKop,
  stand,
  leesTitel,
}: {
  id: string;
  pieceId: string;
  terug: { href: string; label: string };
  /**
   * De kop van het paginascherm (23 september 2026). Met `stand` erbij bouwt
   * dit scherm zelf de kaart "Aan zet" eronder, want die heeft het adresveld
   * nodig dat hier gebouwd wordt en het aantal punten dat publicatie tegenhoudt.
   */
  paginaKop?: React.ReactNode;
  stand?: PaginaStand;
  leesTitel?: string;
}) {
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
  // hieronder bewust NIET vervangen door `kop` bij de versie-lookup.
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
      .select("id, version, created_at, is_current, revision_note, edited_by_user, geaccepteerde_zinnen")
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
    //
    // ⚠️ `issues_json` en `herkeuring` staan er sinds 22 september 2026 bij, en
    // dat is geen kostenpost zonder doel: daarmee weet het scherm exact welke
    // bevindingen de reparatie meekreeg, in plaats van dat te moeten schatten.
    admin
      .from("content_quality_runs")
      .select("repair_round, score, verdict, blocking_count, retained, issues_json, herkeuring")
      .eq("content_piece_id", pieceId)
      .order("repair_round", { ascending: true }),
    isStaff(gebruiker.id),
  ]);

  // ── Het kwaliteitsraamwerk (migratie 0091) ────────────────────────────────
  //
  // De klant leest één zin en de blokkades; de adviseur ziet de dimensies, de
  // zekerheid, de ketenfase waar de problemen ontstonden en welke versie
  // behouden is. Staat er niets in `quality_json` (een pagina van vóór deze
  // migratie), dan blijft de bevindingenlijst leeg en toont de rail alleen wat
  // er wél is (conventie 3).
  const kwaliteit = leesQualityJson(piece.quality_json);
  const rondes = (kwaliteitsRondes ?? []).map((rij) => ({
    ronde: Number(rij.repair_round) || 0,
    score: rij.score === null ? null : Number(rij.score),
    verdict: (rij.verdict as string | null) ?? null,
    blokkades: Number(rij.blocking_count) || 0,
    retained: rij.retained === true,
  }));

  // ── Wat heeft de app al geprobeerd? (herontwerp §6.1) ─────────────────────
  //
  // De reparatie krijgt met opzet hooguit tien bevindingen mee. De rest is
  // nooit aan het model voorgelegd, en dat is precies wat de klant moet weten
  // om te begrijpen wat hij voor zich heeft. De groepering is puur en getest.
  // Zinnen zonder bron die de klant bewust laat staan (migratie 0110). Uit
  // alle versies van deze pagina samen: een herschrijving die de zin letterlijk
  // laat staan, hoort hem niet opnieuw als punt te tonen. Gefilterd vóór het
  // groeperen, zodat de rail, de kaart "Aan zet" en de publiceerstap hetzelfde
  // aantal noemen.
  const geaccepteerd = [
    ...leesGeaccepteerd(piece.geaccepteerde_zinnen),
    ...(versionRows ?? []).flatMap((v) => leesGeaccepteerd((v as { geaccepteerde_zinnen?: unknown }).geaccepteerde_zinnen)),
  ];
  const { issues: huidigeIssues, weggelaten: bewustLatenStaan } = zonderGeaccepteerd(
    issuesUitJson(kwaliteit?.issues),
    geaccepteerd,
  );
  const eerdereRondes: Keuringsronde[] = (kwaliteitsRondes ?? []).map((rij) => ({
    ronde: Number(rij.repair_round) || 0,
    issues: issuesUitJson(rij.issues_json) as QualityIssue[],
    herkeuring: rij.herkeuring === true,
  }));
  const groepen = groepeerBevindingen(huidigeIssues, eerdereRondes);
  const pogingen = beschrijfPogingen(groepen);

  const klantzin = kwaliteit?.verdict
    ? klantOordeel(
        {
          score: kwaliteit.score ?? null,
          dimensies: kwaliteit.dimensies ?? {},
          confidence: kwaliteit.confidence ?? 0,
          verdict: kwaliteit.verdict,
          blokkades: huidigeIssues.filter((i) => i.blocking),
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
      (c) =>
        claimMatchesSentence(c.claim, d.sentence) &&
        isSupported(c.factRef, alleFeiten, c.quote ?? null),
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

  // De merkbrede notitie voor de schrijver (blok D punt 22, Nova's
  // "Content-creation note"): bewerkbaar vanuit "opnieuw schrijven", zie
  // `revise-box.tsx`. `null` als er nog geen plan is; dan is er niets om aan te
  // hangen en verschijnt de notitie-editor niet.
  const { data: planRij } = await supabase
    .from("content_plans")
    .select("strategy_note, updated_at")
    .eq("profile_id", analysis.profile_id)
    .neq("status", "gestopt")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

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
  // en doorgegeven aan het canvas.
  const previewUrl = resolvedContentUrl({
    publishedUrl: piece.published_url,
    action: piece.action,
    existingUrl: piece.existing_url,
    siteUrl: analysis.url,
    title: kop,
    type: piece.type,
  });


  // Het verbeterplan uit het contract (O5). Puur afgeleid, geen extra query: de
  // contractkolom staat al op de rij die hierboven is opgehaald. Leeg bij een
  // nieuwe pagina en bij pagina's van vóór 2 september 2026, en dan verdwijnt
  // het blok vanzelf.
  const verbeteringen = describeImprovements(
    (piece.contract_json ?? null) as ContentContract | null,
  );

  // De nieuwere versie, voor "bekijk het verschil" als je naar een oude kijkt.
  const nieuwere = versions.find((v) => v.is_current && v.id !== pieceId) ?? null;

  // De dekking als één regel in de kop van "Waarop dit rust": de twee zinnen
  // zonder bron zijn wat iemand zoekt, niet de twaalf die goed zijn.
  const onderbouwd = releaseClaims.filter((c) => c.factRef).length;
  const onderbouwingBadge =
    releaseClaims.length > 0 ? `${onderbouwd}/${releaseClaims.length}` : undefined;

  const publiceren = (
    <PublishBox
      analysisId={id}
      pieceId={pieceId}
      publishedAt={piece.published_at}
      publishedUrl={piece.published_url}
      check={(piece.publish_check_json as PublishCheck | null) ?? null}
      checkedAt={piece.publish_checked_at}
      /* Uit dezelfde bron als de kwaliteitsrail, zodat de bevestigingsstap
         en de lijst ernaast nooit een ander aantal noemen. */
      blokkades={groepen.blokkades.length}
    />
  );

  return (
    <ContentWerkblad
      kop={
        paginaKop && stand ? (
          <div className="flex flex-col gap-4">
            {paginaKop}
            <TekstAanZet
              stand={stand}
              analysisId={id}
              pieceId={pieceId}
              blokkades={groepen.blokkades.length}
              publiceren={publiceren}
            />
          </div>
        ) : undefined
      }
      leesTitel={leesTitel}
      analysisId={id}
      pieceId={pieceId}
      terug={terug}
      initieel={{
        title: piece.title,
        bodyMarkdown: piece.body_markdown ?? "",
        metaTitle: piece.meta_title ?? "",
        metaDescription: piece.meta_description ?? "",
        faq,
        updatedAt: piece.updated_at,
      }}
      previewUrl={previewUrl}
      isCurrent={piece.is_current}
      publishedAt={piece.published_at}
      liveSinds={piece.published_at ? formatDateLong(piece.published_at) : null}
      poortOpen={poort.mag}
      groepen={groepen}
      pogingen={pogingen}
      klantzin={klantzin}
      bewustLatenStaan={bewustLatenStaan}
      score={kwaliteit?.score ?? piece.quality_score ?? null}
      kwaliteitBadge={groepen.blokkades.length > 0 ? String(groepen.blokkades.length) : undefined}
      onderbouwingBadge={onderbouwingBadge}
      versieBadge={`v${piece.version}`}
      verschilHref={nieuwere ? `/analyses/${id}/bibliotheek/${nieuwere.id}` : null}
      menu={
        <ContentActions
          title={kop}
          markdown={piece.body_markdown ?? ""}
          html={bodyHtml}
          schemaJsonLd={piece.schema_jsonld}
          templateExport={templateExport}
          handleiding={
            // Alleen zolang de pagina nog niet gepubliceerd is: wie voor de
            // tweede keer publiceert heeft de handleiding niet meer nodig.
            piece.published_at ? null : (
              <CollapsibleSection title="Hoe zet je dit op je site?" defaultOpen={false} compact>
                <PublishGuide
                  title={kop}
                  type={piece.type}
                  action={piece.action}
                  existingUrl={piece.existing_url}
                  siteUrl={analysis.url}
                  hasSchema={Boolean(piece.schema_jsonld?.trim())}
                />
              </CollapsibleSection>
            )
          }
        />
      }
      publiceren={publiceren}
      inhoud={<TableOfContents headings={headings} />}
      onderbouwing={
        <div className="flex flex-col gap-4">
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
          {geo && <GeoScorecard geo={geo} score={piece.geo_score} />}
          <Kerncijfers piece={piece} dekking={kwaliteit?.dekking ?? null} />
        </div>
      }
      waarom={
        <div className="flex flex-col gap-4">
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
          <WhyThisPage
            analysisId={id}
            profileId={analysis.profile_id}
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
          <ImprovementList
            improvements={verbeteringen}
            samenvatting={describeImprovementCount(verbeteringen)}
            existingUrl={piece.existing_url}
            analysisId={id}
            pieceId={pieceId}
            heeftHuidigeTekst={Boolean(piece.existing_page_text?.trim())}
          />
        </div>
      }
      versies={<Versies versions={versions} analysisId={id} pieceId={pieceId} />}
      intern={
        // Alleen voor een beheerder, en dus automatisch weg zodra hij de
        // klantweergave aanzet (`lib/staff.ts`): die cookie kan rechten
        // wegnemen en nooit geven.
        magInterneCijfersZien ? (
          <CollapsibleSection title="Kwaliteitsanalyse (intern)" defaultOpen={false} compact>
            <QualityInternalPanel
              quality={kwaliteit}
              rondes={rondes}
              bronherleidbaarheid={piece.source_coverage}
            />
          </CollapsibleSection>
        ) : null
      }
      /* ⚠️ Een kant-en-klaar element en geen functie die er een maakt: deze
         pagina is een servercomponent en `ContentWerkblad` een clientcomponent,
         en over die grens gaat alleen wat te serialiseren is. Zie
         `herschrijf-context.tsx` voor de fout die dat opleverde. */
      herschrijfvak={
        <ReviseBox
          analysisId={id}
          pieceId={pieceId}
          poort={poort}
          vragenHref={`/merk/${analysis.profile_id}/strategie/vragen`}
          profileId={analysis.profile_id}
          strategyNote={
            planRij
              ? {
                  note: planRij.strategy_note as string | null,
                  updatedAt: planRij.updated_at as string,
                }
              : null
          }
        />
      }
    />
  );
}

/**
 * De cijfers die eerst als losse regel onder de tekst stonden.
 *
 * Redactionele kwaliteit en bronnendekking meten iets anders, en dat is de
 * reden dat ze naast elkaar staan en niet in plaats van elkaar. Een tekst kan
 * prachtig geschreven zijn én beweringen bevatten die nergens vandaan komen.
 * Dat was precies de uitkomst van de praktijktest, waar de redactionele score
 * voor alle drie de pagina's 100 gaf terwijl er vijf feiten verzonnen waren.
 */
function Kerncijfers({
  piece,
  dekking,
}: {
  piece: ContentPiece;
  /**
   * De dekkingscijfers uit `quality_json`. Stonden tot 22 september 2026 in
   * `QualityPanel`, dat met de kwaliteitsrail is komen te vervallen. Ze horen
   * bij de onderbouwing en niet bij het oordeel, dus staan ze nu hier.
   */
  dekking: { graad?: number | null; gewogen?: number | null; kritiek?: number | null } | null;
}) {
  const compleet = dekking?.gewogen ?? dekking?.graad ?? null;

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {compleet !== null && (
        <span>
          <span className="text-muted">Informatie compleet: </span>
          <span className="font-medium tabular">{Math.round(compleet)}%</span>
        </span>
      )}
      {dekking?.kritiek !== null && dekking?.kritiek !== undefined && (
        <span>
          <span className="text-muted">Belangrijkste punten gecontroleerd: </span>
          <span className="font-medium tabular">{Math.round(dekking.kritiek)}%</span>
        </span>
      )}
      {piece.source_coverage != null && (
        <span>
          <span className="text-muted">Onderbouwd met jouw feiten: </span>
          <span className="font-medium">{Math.round(piece.source_coverage)}%</span>
          {piece.source_coverage < 100 && (
            <span className="text-muted">, de rest is algemene uitleg of niet herleidbaar</span>
          )}
        </span>
      )}
      {piece.word_count != null && (
        <span className="text-muted">{piece.word_count} woorden</span>
      )}
      {piece.edited_by_user && <span className="text-muted">door jou bewerkt</span>}
    </div>
  );
}

function Versies({
  versions,
  analysisId,
  pieceId,
}: {
  versions: Pick<
    ContentPiece,
    "id" | "version" | "created_at" | "is_current" | "revision_note" | "edited_by_user"
  >[];
  analysisId: string;
  pieceId: string;
}) {
  if (versions.length <= 1) {
    return <p className="text-sm text-muted">Dit is de enige versie van deze pagina.</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {versions.map((v, i) => {
        // C.24: waarom deze versie bestaat, in mensentaal. Voorheen stond hier
        // alleen iets bij een revision_note; een automatische herschrijving na
        // de eigen kritiekronde van ORBIT ENGINE (geen notitie, geen
        // klant-bewerking) toonde niets, alsof er zomaar een nieuwe versie
        // verscheen.
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
                <Link href={`/analyses/${analysisId}/bibliotheek/${v.id}`} className="link">
                  Versie {v.version}
                </Link>
              )}
              <span className="text-muted">{formatDateLong(v.created_at)}</span>
              <span className="text-secondary">{reason.label}</span>
            </div>
            {vorige && <VersionDiff analysisId={analysisId} pieceId={v.id} previousId={vorige.id} />}
          </li>
        );
      })}
    </ul>
  );
}
