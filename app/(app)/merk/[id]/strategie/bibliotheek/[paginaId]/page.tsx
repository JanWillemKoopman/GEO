import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getOwnedProfile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { laadPagina } from "@/lib/pagina-data";
import { leesHerkomst } from "@/lib/origin";
import { formatDag, heeftEigenScherm } from "@/lib/pagina-stand";
import { schrijfdatum } from "@/lib/pagina/schrijfpoort";
import { PaginaKop } from "@/components/pagina/pagina-kop";
import { AanZet } from "@/components/pagina/aan-zet";
import { Vragenlijst, type Vraag } from "@/components/pagina/vragenlijst";
import { Goedkeuren } from "@/components/pagina/goedkeuren";
import { PublishBox } from "@/components/pagina/publish-box";
import { Opleveren } from "@/components/pagina/opleveren";
import { PublishGuide } from "@/components/publish-guide";
import { buildTemplateExport } from "@/lib/pipeline/content-export";
import type { SiteTemplateProfile } from "@/lib/pipeline/template-detect";
import type { ContentAction, ContentType } from "@/lib/types/database";
import { nogGeel } from "@/lib/pagina/goedkeuren";
import { faqRijen, type ControleJson } from "@/lib/pagina/controle-regels";
import type { PublishCheck } from "@/lib/pipeline/publish-check";
import { resolvedContentUrl, type ResolvedUrl } from "@/lib/pipeline/slug";
import { siteLinksVoorOnderwerp, zusterPaginas, type LinkVoorstel } from "@/lib/oplevering";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; paginaId: string }>;
}): Promise<Metadata> {
  const { id, paginaId } = await params;
  const gebruiker = await requireUser();
  const admin = createAdminClient();
  if (!(await getOwnedProfile(admin, id, gebruiker.id))) return {};
  const rij = await laadPagina(admin, id, paginaId);
  return { title: rij?.naam ?? "Pagina" };
}

/**
 * HET PAGINASCHERM: één adres per pagina, van gepland tot effect
 * (`docs/tasks/contentflow-een-lijn.md` §4.6 en §4.6a, 23 september 2026).
 *
 * Tot die dag had een pagina pas een scherm zodra er tekst was, en dat scherm
 * hing onder het cluster: in het menu lichtte "Clusters" op terwijl je uit de
 * Bibliotheek kwam. Een pagina die op vragen wachtte, toonde een leeg wit vlak
 * met "Er staan geen opmerkingen meer open" en de knop "Zet deze pagina live".
 *
 * Nu heeft elke pagina vanaf het moment dat hij in het plan staat dit ene
 * adres. Bovenaan staan altijd de naam, de standbalk en de kaart "Aan zet", met
 * hooguit één hoofdknop. Daaronder volgt per stand een eigen, gevulde
 * weergave. Nooit een leeg vlak zonder uitleg.
 *
 * Later op 23 september 2026 viel een deel weer weg. Bij "Wordt voorbereid",
 * "Wordt geschreven", "Alle vragen gedaan" en "Nog niet ingepland" liet dit
 * scherm een laadbalk of één zin zien, met daaronder de opdracht die ook in het
 * contentplan staat: de eigenaar vond dat het niets toevoegde. Die standen
 * sturen nu door naar het contentplan (`heeftEigenScherm()`), tenzij er
 * beantwoorde vragen zijn om nog aan te passen, en geen lijst linkt er nog naartoe. Het adres blijft bestaan voor de standen waar de klant
 * iets moet doen of iets kan lezen.
 *
 * `paginaId` is het id van de plan-pagina, of het id van de tekst.
 *
 * Een geschreven tekst: lezen, gele zinnen nalopen, goedkeuren, en daarna op
 * de site zetten (§6.9 van `docs/tasks/contentketen-opnieuw.md`).
 */
export default async function PaginaScherm({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; paginaId: string }>;
  searchParams: Promise<{ van?: string }>;
}) {
  const { id, paginaId } = await params;
  const herkomst = leesHerkomst((await searchParams).van);
  const gebruiker = await requireUser();
  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, gebruiker.id);
  if (!profile) notFound();

  const rij = await laadPagina(admin, id, paginaId);
  if (!rij) notFound();

  const terug =
    herkomst === "plan"
      ? { href: `/merk/${id}/strategie/plan`, label: "Contentplan" }
      : herkomst === "taken"
        ? { href: `/merk/${id}/strategie/vragen`, label: "Openstaande vragen" }
        : { href: `/merk/${id}/strategie/bibliotheek`, label: "Bibliotheek" };

  const kop = (
    <PaginaKop
      terug={terug}
      naam={rij.naam}
      soort={rij.soort}
      cluster={rij.cluster}
      datum={rij.datum}
      stand={rij.stand}
    />
  );

  // ── Er is tekst ─────────────────────────────────────────────────────────
  const metTekst = ["goedkeuren", "live_zetten", "effect_meten", "effect_bekend"].includes(rij.stand.sleutel);
  if (metTekst && rij.pieceId) {
    const tekst = await laadTekst(admin, rij.pieceId, profile.id);
    if (tekst) {
      // De sjabloonexport (WordPress-blokken, FAQ als uitklapblok) als het
      // onderzoek de opbouw van de site herkende; anders null en geen knop.
      const templateExport = buildTemplateExport(
        { title: tekst.titel, bodyMarkdown: tekst.body, faq: tekst.faq },
        tekst.sjabloon,
      );
      const links = await laadInterneLinks(admin, {
        profileId: profile.id,
        pieceId: rij.pieceId,
        plannedPageId: rij.plannedPageId,
        siteUrl: profile.url,
        titel: tekst.titel,
        type: tekst.type,
        action: tekst.action,
        existingUrl: tekst.existingUrl,
        publishedUrl: tekst.publishedUrl,
      });
      // De publicatieknop staat in "Aan zet", bovenaan (1 oktober 2026). Hij
      // stond los onderaan, onder vier opleverkaarten en een handleiding: de
      // enige handeling die na goedkeuren nog telt, zat het verst weg. "Aan
      // zet" is volgens zijn eigen afspraak de plek van de hoofdknop.
      const publiceren = !tekst.needsReview ? (
        <PublishBox
          analysisId={tekst.analysisId}
          pieceId={rij.pieceId}
          publishedAt={tekst.publishedAt}
          publishedUrl={tekst.publishedUrl}
          check={tekst.check}
          checkedAt={tekst.checkedAt}
          blokkades={0}
        />
      ) : undefined;
      return (
        <div className="flex flex-col gap-6">
          {kop}
          <AanZet stand={rij.stand} actie={publiceren} />
          <Goedkeuren
            profileId={id}
            analysisId={tekst.analysisId}
            pieceId={rij.pieceId}
            tekst={tekst.body}
            updatedAt={tekst.updatedAt}
            geel={tekst.geel}
            bevestigd={tekst.bevestigd}
            notitie={tekst.notitie}
            punten={tekst.punten}
            verdwenen={tekst.verdwenen}
            goedgekeurd={!tekst.needsReview}
            aanpassingLoopt={tekst.aanpassingLoopt}
          />
          <Opleveren
            titel={tekst.titel}
            tekst={tekst.body}
            metaTitel={tekst.metaTitel}
            metaBeschrijving={tekst.metaBeschrijving}
            faq={tekst.faq}
            schemaJsonLd={tekst.schemaJsonLd}
            templateExport={templateExport}
            goedgekeurd={!tekst.needsReview}
            geel={tekst.geel}
            bevestigd={tekst.bevestigd}
            adres={links.adres}
            naarDeze={links.naarDeze}
            vanDeze={links.vanDeze}
          />
          {!tekst.needsReview && !tekst.publishedAt && (
            <PublishGuide
              title={tekst.titel}
              type={tekst.type}
              action={tekst.action}
              existingUrl={tekst.existingUrl}
              siteUrl={profile.url}
              hasSchema={Boolean(tekst.schemaJsonLd?.trim())}
            />
          )}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-6">
        {kop}
        <AanZet stand={rij.stand} />
      </div>
    );
  }

  // ── Nog geen tekst: het voortraject ───────────────────────────────────────
  const voortraject = await laadVoortraject(admin, rij.pieceId, rij.plannedPageId);
  // Zonder eigen scherm en zonder vragen valt er hier niets te zien of te doen.
  // Met gegeven antwoorden wel: wie net de laatste vraag beantwoordde, blijft
  // op dit scherm (de lijst ververst na elk antwoord) en kan een antwoord nog
  // aanpassen tot het schrijven begint.
  if (!heeftEigenScherm(rij.stand.sleutel) && voortraject.vragen.length === 0) {
    redirect(`/merk/${id}/strategie/plan`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="wil-lezen" hidden />
      {kop}
      <AanZet
        stand={rij.stand}
        actie={
          rij.stand.sleutel === "vragen" ? (
            <a href="#vragen" className="btn-primary">
              {rij.stand.handeling}
            </a>
          ) : undefined
        }
      />

      {voortraject.vragen.length > 0 && (
        <section id="vragen" className="scroll-mt-24">
          <Vragenlijst
            profileId={id}
            vragen={voortraject.vragen}
            naAfronden={
              rij.datum && schrijfdatum(rij.datum) > new Date().toISOString().slice(0, 10)
                ? `Alles gedaan. ORBIT ENGINE schrijft deze pagina vanaf ${formatDag(schrijfdatum(rij.datum))}.`
                : "Alles gedaan. ORBIT ENGINE begint nu met schrijven."
            }
          />
        </section>
      )}

      <WatDezePaginaDoet why={voortraject.why} voorWie={voortraject.voorWie} />
    </div>
  );
}

function WatDezePaginaDoet({ why, voorWie }: { why: string | null; voorWie: string | null }) {
  if (!why && !voorWie) return null;
  return (
    <section className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-6">
      <h2 className="type-section">Waarom deze pagina</h2>
      {why && <p className="type-body text-secondary">{why}</p>}
      {voorWie && (
        <p className="type-body">
          <span className="text-muted">Voor wie: </span>
          {voorWie}
        </p>
      )}
    </section>
  );
}

/** Wat het goedkeuringsscherm nodig heeft. */
async function laadTekst(admin: ReturnType<typeof createAdminClient>, pieceId: string, profileId: string) {
  const [{ data }, { data: lopend }, { data: sjabloon }] = await Promise.all([
    admin
      .from("content_pieces")
      .select(
        "analysis_id, title, type, action, existing_url, body_markdown, meta_title, meta_description, faq_json, schema_jsonld, " +
          "updated_at, controle_json, raw_json, needs_review, published_at, published_url, publish_check_json, publish_checked_at",
      )
      .eq("id", pieceId)
      .maybeSingle(),
    admin
      .from("jobs")
      .select("id")
      .eq("type", "pagina_herschrijven")
      .in("status", ["queued", "running"])
      .contains("payload_json", { pieceId })
      .limit(1),
    // Hoe de site van de klant is opgebouwd (`discover.ts`), voor de sjabloonexport.
    admin.from("profile_facets").select("raw_json").eq("profile_id", profileId).eq("facet", "sjabloon").maybeSingle(),
  ]);
  const r = data as unknown as {
    analysis_id: string;
    title: string;
    type: ContentType;
    action: ContentAction | null;
    existing_url: string | null;
    body_markdown: string | null;
    meta_title: string | null;
    meta_description: string | null;
    faq_json: unknown;
    schema_jsonld: string | null;
    updated_at: string;
    controle_json: ControleJson | null;
    raw_json: { notitie_voor_ondernemer?: string | null; uitvoer?: { titel?: string } } | null;
    needs_review: boolean;
    published_at: string | null;
    published_url: string | null;
    publish_check_json: unknown;
    publish_checked_at: string | null;
  } | null;
  if (!r?.body_markdown) return null;
  const controle = r.controle_json;
  const faq = faqRijen(r.faq_json);
  return {
    analysisId: r.analysis_id,
    // De titel van de schrijver; `title` zelf is de titel uit het plan.
    titel: r.raw_json?.uitvoer?.titel?.trim() || r.title,
    type: r.type,
    action: (r.action ?? "nieuw") as ContentAction,
    existingUrl: r.existing_url,
    metaTitel: r.meta_title,
    metaBeschrijving: r.meta_description,
    faq,
    schemaJsonLd: r.schema_jsonld,
    sjabloon: ((sjabloon as { raw_json?: unknown } | null)?.raw_json ?? null) as SiteTemplateProfile | null,
    body: r.body_markdown,
    updatedAt: r.updated_at,
    geel: nogGeel(r.body_markdown, controle, r.meta_description, faq),
    bevestigd: controle?.bevestigd ?? [],
    notitie: r.raw_json?.notitie_voor_ondernemer ?? null,
    // Na een herschrijving zijn de punten van de eindredacteur verwerkt; dan
    // horen ze niet meer als "wat we nog zien" op het scherm.
    punten: controle && !controle.herschreven ? (controle.beoordeling?.punten ?? []) : [],
    // V21 punt 3 (besluit B-h): wat van de huidige pagina niet in de nieuwe tekst staat.
    verdwenen: controle?.verdwenen ?? [],
    needsReview: r.needs_review,
    aanpassingLoopt: (lopend ?? []).length > 0,
    publishedAt: r.published_at,
    publishedUrl: r.published_url,
    check: (r.publish_check_json as PublishCheck | null) ?? null,
    checkedAt: r.publish_checked_at,
  };
}

/**
 * Het voorgestelde adres, en een voorstel voor interne links (C2,
 * `van-pijplijn-naar-kennissysteem.md`): deterministisch uit de pagina's van
 * de site en de andere goedgekeurde pagina's van het merk over dezelfde
 * dienst (de kruising van `kansen.geldt_voor`). Geen kans achter deze pagina
 * (een pagina van vóór N1, of een handmatige zonder dienst): geen voorstel,
 * alleen het adres.
 */
async function laadInterneLinks(
  admin: ReturnType<typeof createAdminClient>,
  args: {
    profileId: string;
    pieceId: string;
    plannedPageId: string | null;
    siteUrl: string;
    titel: string;
    type: ContentType;
    action: ContentAction;
    existingUrl: string | null;
    publishedUrl: string | null;
  },
): Promise<{ adres: ResolvedUrl; naarDeze: LinkVoorstel[]; vanDeze: LinkVoorstel[] }> {
  const adres = resolvedContentUrl({
    publishedUrl: args.publishedUrl,
    action: args.action,
    existingUrl: args.existingUrl,
    siteUrl: args.siteUrl,
    title: args.titel,
    type: args.type,
  });
  const leeg = { adres, naarDeze: [], vanDeze: [] };
  if (!args.plannedPageId) return leeg;

  const { data: planRij } = await admin.from("planned_pages").select("kans_id").eq("id", args.plannedPageId).maybeSingle();
  const kansId = (planRij as { kans_id: string | null } | null)?.kans_id ?? null;
  if (!kansId) return leeg;

  const { data: kansRij } = await admin.from("kansen").select("geldt_voor").eq("id", kansId).maybeSingle();
  const geldtVoor = ((kansRij as { geldt_voor: string[] | null } | null)?.geldt_voor ?? []) as string[];
  if (geldtVoor.length === 0) return leeg;

  const [{ data: dienstRijen }, { data: pagRijen }, { data: kansenRijen }] = await Promise.all([
    admin.from("klantkennis").select("soort, bewering").in("id", geldtVoor).is("afgewezen_op", null),
    admin.from("profile_pages").select("url, title").eq("profile_id", args.profileId).limit(500),
    admin.from("kansen").select("id, geldt_voor").eq("profile_id", args.profileId),
  ]);
  const dienstNamen = (dienstRijen ?? []) as { soort: string | null; bewering: string }[];
  const onderwerp =
    dienstNamen.find((d) => d.soort === "dienst")?.bewering ??
    dienstNamen.find((d) => d.soort === "categorie")?.bewering ??
    dienstNamen[0]?.bewering ??
    null;

  const zusterKansen = ((kansenRijen ?? []) as { id: string; geldt_voor: string[] | null }[]).filter(
    (k) => k.id !== kansId && (k.geldt_voor ?? []).some((g) => geldtVoor.includes(g)),
  );
  const zusterKansIds = zusterKansen.map((k) => k.id);
  let kandidaten: { id: string; titel: string; url: string; geldtVoor: string[] }[] = [];
  if (zusterKansIds.length > 0) {
    const { data: planRijen2 } = await admin.from("planned_pages").select("content_piece_id, kans_id").in("kans_id", zusterKansIds);
    const pieceVanKans = new Map<string, string>();
    for (const p of (planRijen2 ?? []) as { content_piece_id: string | null; kans_id: string }[]) {
      if (p.content_piece_id) pieceVanKans.set(p.content_piece_id, p.kans_id);
    }
    const pieceIds = [...pieceVanKans.keys()].filter((id) => id !== args.pieceId);
    if (pieceIds.length > 0) {
      const { data: pieceRijen } = await admin
        .from("content_pieces")
        .select("id, title, meta_title, type, action, existing_url, published_url, is_current, needs_review")
        .in("id", pieceIds);
      const geldtVoorVanKans = new Map(zusterKansen.map((k) => [k.id, k.geldt_voor ?? []]));
      kandidaten = ((pieceRijen ?? []) as {
        id: string;
        title: string;
        meta_title: string | null;
        type: ContentType;
        action: ContentAction | null;
        existing_url: string | null;
        published_url: string | null;
        is_current: boolean | null;
        needs_review: boolean | null;
      }[])
        .filter((p) => p.is_current !== false && p.needs_review === false)
        .map((p) => ({
          id: p.id,
          titel: p.meta_title?.trim() || p.title,
          url: resolvedContentUrl({
            publishedUrl: p.published_url,
            action: p.action ?? "nieuw",
            existingUrl: p.existing_url,
            siteUrl: args.siteUrl,
            title: p.meta_title?.trim() || p.title,
            type: p.type,
          }).url,
          geldtVoor: geldtVoorVanKans.get(pieceVanKans.get(p.id) ?? "") ?? [],
        }));
    }
  }

  const siblings = zusterPaginas(args.pieceId, geldtVoor, kandidaten);
  const siteLinks = siteLinksVoorOnderwerp((pagRijen ?? []) as { url: string; title: string | null }[], onderwerp, adres.isReal ? adres.url : null);
  // Dedup op adres: een pagina die al als zusterpagina meekomt, hoeft niet
  // nog eens als sitepagina.
  const gezien = new Set(siblings.map((s) => s.url));
  const vanDeze = [...siblings, ...siteLinks.filter((s) => !gezien.has(s.url))];
  return { adres, naarDeze: siblings, vanDeze };
}

/** Wat het voortraject van een pagina nodig heeft: de vragen en het waarom. */
async function laadVoortraject(
  admin: ReturnType<typeof createAdminClient>,
  pieceId: string | null,
  plannedPageId: string | null,
): Promise<{ vragen: Vraag[]; why: string | null; voorWie: string | null }> {
  const [{ data: piece }, { data: plan }, { data: vraagRijen }] = await Promise.all([
    pieceId
      ? admin.from("content_pieces").select("target_intent").eq("id", pieceId).maybeSingle()
      : Promise.resolve({ data: null }),
    plannedPageId
      ? admin.from("planned_pages").select("why, target_intent").eq("id", plannedPageId).maybeSingle()
      : Promise.resolve({ data: null }),
    pieceId
      ? admin
          .from("fact_requests")
          .select("id, question, reason, kind, answer_type, options, required, status, answer, content_piece_ids, open_vraag, created_at")
          .contains("content_piece_ids", [pieceId])
          .in("status", ["open", "beantwoord", "overgeslagen"])
          .order("created_at")
      : Promise.resolve({ data: [] }),
  ]);

  const rijen = (vraagRijen ?? []) as {
    id: string;
    question: string;
    reason: string | null;
    kind: string | null;
    answer_type: string | null;
    options: string[] | null;
    required: boolean | null;
    status: string;
    answer: string | null;
    content_piece_ids: string[] | null;
    open_vraag: boolean | null;
  }[];

  const vragen: Vraag[] = rijen.map((r) => ({
    id: r.id,
    question: r.question,
    reason: r.reason,
    kind: r.kind,
    answer_type: r.answer_type,
    options: r.options,
    required: r.required,
    status: r.status,
    answer: r.answer,
    onderdelen: [],
    paginas: (r.content_piece_ids ?? []).length,
    open_vraag: Boolean(r.open_vraag),
  }));
  // Eerst wat nog open staat: daar begint de klant, en een beantwoorde vraag
  // bovenaan laat de lijst langer lijken dan het werk is.
  vragen.sort((a, b) => Number(a.status !== "open") - Number(b.status !== "open"));

  return {
    vragen,
    why: (plan?.why as string | null) ?? null,
    voorWie: (plan?.target_intent as string | null) ?? (piece?.target_intent as string | null) ?? null,
  };
}
