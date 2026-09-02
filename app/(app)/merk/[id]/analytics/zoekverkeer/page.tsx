import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { PagesTrafficChart } from "@/components/pages-traffic-chart";
import { ZoekverkeerPaginas, type OnzePaginaRij } from "@/components/zoekverkeer-paginas";
import { AnalyticsFilters } from "@/components/analytics-filters";
import { InfoHint } from "@/components/info-hint";
import { activeOnly } from "@/lib/archive";
import {
  clustersVoorFilter,
  leesClusterfilter,
  leesLabelfilter,
} from "@/lib/analytics-filters";
import { sorteerLabels } from "@/lib/cluster-labels";
import {
  ctr,
  gewogenPositie,
  normaliseerUrl,
  perDag,
  vergelijk,
  volledigVenster,
  type GscDag,
} from "@/lib/search-console/metrics";
import type { ClusterLabel, ImpactVerdict } from "@/lib/types/database";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zoekverkeer" };

/**
 * ZOEKVERKEER: levert de content die ORBIT ENGINE publiceerde bezoekers op uit
 * Google? (plan analytics-herontwerp.md, V1 tot en met V8)
 *
 * ── DE KERNVERANDERING VAN 2 SEPTEMBER 2026 ─────────────────────────────────
 *
 * Dit scherm mat de hele website: het grootste deel daarvan bestond al vóórdat
 * ORBIT ENGINE begon, en de kliklijn naast losse zichtbaarheidspunten
 * suggereerde een verband dat met één meetpunt niet te tonen is. Het scherm
 * gaat nu over onze eigen pagina's; de rest van de site staat er nog wel,
 * maar ingeklapt en met de nadruk erbij dat het een vergelijking is en geen
 * resultaat.
 *
 * ⚠️ **Wat er in `search_console_days` zit bepaalt wat hier kan staan.** Geen
 * zoekopdrachten, apparaten of landen. De rekenkant staat in
 * `lib/search-console/metrics.ts`, met tests.
 */
export default async function ZoekverkeerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ label?: string; cluster?: string }>;
}) {
  const { id } = await params;
  const { label: labelUitAdres, cluster: clusterUitAdres } = await searchParams;
  const profile = await getProfile(id);
  if (!profile) notFound();
  const user = await requireUser();
  const staff = await isStaff(user.id);

  const admin = createAdminClient();
  const { data: dagRijen } = await admin
    .from("search_console_days")
    .select("day, page, clicks, impressions, position")
    .eq("profile_id", id)
    .order("day");

  const rijen = (dagRijen ?? []) as GscDag[];

  // ── Geen koppeling: geen lege grafiek maar uitleg ────────────────────────
  if (!profile.gsc_property || rijen.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Kop />
        <div className="card flex flex-col gap-3">
          <span className="mono-label">
            {profile.gsc_property ? "Nog geen cijfers binnen" : "Nog niet gekoppeld"}
          </span>
          <p className="text-secondary">
            Koppel je Google Search Console en ORBIT ENGINE laat zien of de pagina&apos;s die hij
            publiceerde ook bezoekers opleveren.
          </p>
          {profile.gsc_last_error && (
            <p className="text-sm text-[var(--status-error)]">
              De laatste synchronisatie liep vast: {profile.gsc_last_error}
            </p>
          )}
          {staff ? (
            <Link href="/instellingen/koppelingen" className="btn-primary w-fit">
              Naar de koppeling
            </Link>
          ) : (
            <p className="text-sm text-muted">
              Je consultant legt de koppeling voor je. Laat weten dat je hem wilt, dan staat je
              zoekverkeer hier binnen een dag.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── F2: labels en clusters, voor de filterbalk (V2) ─────────────────────
  const [{ data: clusterRijen }, { data: labelRijen }] = await Promise.all([
    activeOnly(admin.from("analyses").select("id, name, label_id").eq("profile_id", id)),
    admin.from("cluster_labels").select("*").eq("profile_id", id),
  ]);
  const clusters = (clusterRijen ?? []) as { id: string; name: string; label_id: string | null }[];
  const labels = sorteerLabels((labelRijen ?? []) as ClusterLabel[]);
  const clusterIds = clusters.map((c) => c.id);

  const labelfilter = leesLabelfilter(labelUitAdres, labels);
  const clustersBijLabel = clustersVoorFilter(clusters, labelfilter);
  const clusterfilter = leesClusterfilter(clusterUitAdres, clustersBijLabel);
  const zichtbareClusterIds = new Set(
    (clusterfilter === "alles" ? clustersBijLabel : clustersBijLabel.filter((c) => c.id === clusterfilter)).map(
      (c) => c.id,
    ),
  );

  // ── V1, V2: de pagina's die ORBIT ENGINE publiceerde ──────────────────────
  // De koppeling loopt via het cluster: een gepubliceerde pagina hangt via
  // `content_pieces.analysis_id` aan zijn cluster en daarmee aan zijn label.
  const [{ data: pieceRijen }, { data: planRijen }] = await Promise.all([
    clusterIds.length > 0
      ? admin
          .from("content_pieces")
          .select("id, analysis_id, published_url, published_at, type")
          .in("analysis_id", clusterIds)
          .not("published_url", "is", null)
      : Promise.resolve({ data: [] }),
    admin.from("planned_pages").select("page_type, url_path, posted_url").eq("profile_id", id),
  ]);

  const alleStukken = (pieceRijen ?? []) as {
    id: string;
    analysis_id: string;
    published_url: string;
    published_at: string | null;
    type: string;
  }[];
  const stukken = alleStukken.filter((p) => zichtbareClusterIds.has(p.analysis_id));

  // ── V3: content_impact ernaast, de laatste golf per pagina ────────────────
  const stukIds = stukken.map((s) => s.id);
  const { data: impactRijen } =
    stukIds.length > 0
      ? await admin
          .from("content_impact")
          .select("content_piece_id, wave, verdict")
          .in("content_piece_id", stukIds)
      : { data: [] };
  const verdictPerStuk = new Map<string, { wave: number; verdict: ImpactVerdict }>();
  for (const r of (impactRijen ?? []) as { content_piece_id: string; wave: number; verdict: ImpactVerdict }[]) {
    const bestaand = verdictPerStuk.get(r.content_piece_id);
    if (!bestaand || r.wave > bestaand.wave) verdictPerStuk.set(r.content_piece_id, r);
  }

  const typePerUrl = new Map<string, string>();
  for (const p of (planRijen ?? []) as { page_type: string; url_path: string | null; posted_url: string | null }[]) {
    const adres = p.posted_url ?? p.url_path;
    if (adres) typePerUrl.set(normaliseerUrl(adres), p.page_type);
  }

  // ── V7: de lege staat is de normale staat ─────────────────────────────────
  if (stukken.length === 0) {
    const totaalGepland = (planRijen ?? []).length;
    return (
      <div className="flex flex-col gap-6">
        <Kop />
        <AnalyticsFilters
          periodes={[]}
          labels={labels}
          clustersBijLabel={clustersBijLabel}
          periodefilter="actueel"
          labelfilter={labelfilter}
          clusterfilter={clusterfilter}
        />
        <div className="card flex flex-col gap-1">
          <span className="mono-label">Nog geen pagina&apos;s live</span>
          <p className="text-secondary">
            {totaalGepland > 0
              ? `Er ${totaalGepland === 1 ? "staat 1 pagina" : `staan ${totaalGepland} pagina's`} in je contentplan. Zodra de eerste live gaat, staat het verkeer erop hier.`
              : "Er staat nog niets in je contentplan."}
          </p>
        </div>
      </div>
    );
  }

  const onzeUrlPerStuk = new Map(stukken.map((s) => [normaliseerUrl(s.published_url), s]));
  const rijenVoorOns = rijen.filter((r) => onzeUrlPerStuk.has(normaliseerUrl(r.page)));

  // ── V1: vier kerncijfers, alleen over onze pagina's, V5-bewust ───────────
  const vensterOns = volledigVenster(rijenVoorOns);
  const vergelijkingOns = vensterOns ? vergelijk(rijenVoorOns, vensterOns) : null;
  const dagenOns = perDag(rijenVoorOns);
  const publicatiedata = [...new Set(stukken.map((s) => s.published_at?.slice(0, 10)).filter((d): d is string => !!d))];

  // ── V3, V6, V8: per pagina ─────────────────────────────────────────────
  const perUrl = new Map<string, GscDag[]>();
  for (const r of rijenVoorOns) {
    const lijst = perUrl.get(r.page) ?? [];
    lijst.push(r);
    perUrl.set(r.page, lijst);
  }
  const onzePaginas: OnzePaginaRij[] = [...onzeUrlPerStuk.entries()].map(([, stuk]) => {
    const eigenRijen = perUrl.get(stuk.published_url) ?? [];
    const totClicks = eigenRijen.reduce((s, r) => s + r.clicks, 0);
    const totImpr = eigenRijen.reduce((s, r) => s + r.impressions, 0);
    const sindsPublicatie = stuk.published_at
      ? eigenRijen
          .filter((r) => r.day >= stuk.published_at!.slice(0, 10))
          .sort((a, b) => a.day.localeCompare(b.day))
          .map((r) => ({ day: r.day, clicks: r.clicks }))
      : [];
    return {
      page: stuk.published_url,
      clicks: totClicks,
      impressions: totImpr,
      ctr: ctr(totClicks, totImpr),
      position: gewogenPositie(eigenRijen),
      type: typePerUrl.get(normaliseerUrl(stuk.published_url)) ?? null,
      effectOpAi: verdictPerStuk.get(stuk.id)?.verdict ?? null,
      sindsPublicatie,
      publishedAt: stuk.published_at,
    };
  });

  // ── De rest van de site, ter vergelijking (V1, ingeklapt) ────────────────
  const vensterHeleSite = volledigVenster(rijen)!;
  const vergelijkingHeleSite = vergelijk(rijen, vensterHeleSite);

  return (
    <div className="flex flex-col gap-6">
      <Kop />

      <AnalyticsFilters
        periodes={[]}
        labels={labels}
        clustersBijLabel={clustersBijLabel}
        periodefilter="actueel"
        labelfilter={labelfilter}
        clusterfilter={clusterfilter}
      />

      {/* ── 1. Onze pagina's bovenaan (V1) ──────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">Wat ORBIT ENGINE publiceerde</span>
        {vergelijkingOns ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Cijfer label="Klikken" waarde={vergelijkingOns.nu.clicks.toLocaleString("nl-NL")} delta={vergelijkingOns.verschil.clicks} beterIsHoger />
              <Cijfer label="Vertoningen" waarde={vergelijkingOns.nu.impressions.toLocaleString("nl-NL")} delta={vergelijkingOns.verschil.impressions} beterIsHoger />
              <Cijfer
                label="Doorklikratio"
                waarde={procent(vergelijkingOns.nu.ctr)}
                delta={vergelijkingOns.verschil.ctr === null ? null : Number((vergelijkingOns.verschil.ctr * 100).toFixed(1))}
                eenheid="pp"
                beterIsHoger
              />
              <Cijfer
                label="Gemiddelde positie"
                waarde={vergelijkingOns.nu.position === null ? "-" : vergelijkingOns.nu.position.toFixed(1)}
                delta={vergelijkingOns.verschil.position === null ? null : Number(vergelijkingOns.verschil.position.toFixed(1))}
                beterIsHoger={false}
              />
            </div>
            {/* ── V5: geen delta bij een onvolledig eerste venster ────────── */}
            <p className="text-sm text-muted">
              {vergelijkingOns.vergelijkbaar
                ? `Vergeleken met de ${dagenIn(vensterOns!.start, vensterOns!.eind)} dagen daarvóór. De laatste twee dagen zijn nog niet definitief.`
                : `Eerste volledige periode, vanaf ${new Date(vensterOns!.start).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} vergelijkbaar.`}
            </p>
          </>
        ) : (
          <p className="text-secondary">Nog geen klikken gemeten op onze pagina&apos;s.</p>
        )}
      </div>

      {/* ── 2. Levensloop, geen kalender (V4) ─────────────────────────────── */}
      <PagesTrafficChart dagen={dagenOns} publicatiedata={publicatiedata} />

      {/* ── 3, 6, 8. Onze pagina's als tabel ─────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="mono-label flex items-center gap-1">
          Onze pagina&apos;s ({onzePaginas.length})
          <InfoHint label="Wat is 'Effect op AI'?">
            {"content_impact"} vergelijkt hoe vaak AI je noemde vóór en ná publicatie, tegen een
            controlegroep clusters die niets veranderde. Het enige cijfer op dit scherm dat oorzaak
            en gevolg verbindt.
          </InfoHint>
        </span>
        <ZoekverkeerPaginas rows={onzePaginas} />
      </div>

      {/* ── De rest van de site, ingeklapt (V1) ─────────────────────────── */}
      <details className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
        <summary className="cursor-pointer text-sm text-secondary">De rest van je site, ter vergelijking</summary>
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-sm text-muted">
            De hele website in Google, inclusief pagina&apos;s die er al stonden vóór ORBIT ENGINE.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Cijfer label="Klikken" waarde={vergelijkingHeleSite.nu.clicks.toLocaleString("nl-NL")} delta={vergelijkingHeleSite.verschil.clicks} beterIsHoger />
            <Cijfer label="Vertoningen" waarde={vergelijkingHeleSite.nu.impressions.toLocaleString("nl-NL")} delta={vergelijkingHeleSite.verschil.impressions} beterIsHoger />
            <Cijfer
              label="Doorklikratio"
              waarde={procent(vergelijkingHeleSite.nu.ctr)}
              delta={vergelijkingHeleSite.verschil.ctr === null ? null : Number((vergelijkingHeleSite.verschil.ctr * 100).toFixed(1))}
              eenheid="pp"
              beterIsHoger
            />
            <Cijfer
              label="Gemiddelde positie"
              waarde={vergelijkingHeleSite.nu.position === null ? "-" : vergelijkingHeleSite.nu.position.toFixed(1)}
              delta={vergelijkingHeleSite.verschil.position === null ? null : Number(vergelijkingHeleSite.verschil.position.toFixed(1))}
              beterIsHoger={false}
            />
          </div>
          {!vergelijkingHeleSite.vergelijkbaar && (
            <p className="text-sm text-muted">
              Eerste volledige periode, vanaf {new Date(vensterHeleSite.start).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} vergelijkbaar.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}

function Kop() {
  return (
    <PageHeader
      eyebrow="Analytics"
      title="Zoekverkeer"
      description="Levert de content die ORBIT ENGINE publiceerde ook bezoekers op uit Google?"
    />
  );
}

function Cijfer({
  label,
  waarde,
  delta,
  eenheid,
  beterIsHoger,
}: {
  label: string;
  waarde: string;
  delta: number | null;
  eenheid?: string;
  beterIsHoger: boolean;
}) {
  const beter = delta === null || delta === 0 ? null : beterIsHoger ? delta > 0 : delta < 0;
  return (
    <div className="card flex flex-col gap-1">
      <span className="mono-label">{label}</span>
      <span className="stat-value text-2xl">{waarde}</span>
      {delta === null || delta === 0 ? (
        <span className="mono-label text-muted">{delta === 0 ? "gelijk" : "geen vergelijking"}</span>
      ) : (
        <span className="mono-label" style={{ color: beter ? "var(--intent-growth-text)" : "var(--intent-danger-text)" }}>
          <Icon naam={delta > 0 ? "stijging" : "daling"} size={12} />
          {Math.abs(delta).toLocaleString("nl-NL")}
          {eenheid ? ` ${eenheid}` : ""}
        </span>
      )}
    </div>
  );
}

/** Conventie 3: onbekend is een koppelteken, nooit een 0%. */
function procent(waarde: number | null): string {
  return waarde === null ? "-" : `${(waarde * 100).toFixed(1)}%`;
}

function dagenIn(start: string, eind: string): number {
  const ms = new Date(`${eind}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime();
  return Math.round(ms / 86400000) + 1;
}
