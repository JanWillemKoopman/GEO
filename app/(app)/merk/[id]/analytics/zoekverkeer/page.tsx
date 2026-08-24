import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { TrafficChart, type ScorePunt } from "@/components/traffic-chart";
import { InfoHint } from "@/components/info-hint";
import { ExternalLink } from "@/components/external-link";
import { activeOnly } from "@/lib/archive";
import {
  besteEnZwakste,
  klikkenPerType,
  normaliseerUrl,
  perDag,
  perPagina,
  vergelijk,
  volledigVenster,
  type GscDag,
} from "@/lib/search-console/metrics";
import type { VisibilityScore } from "@/lib/types/database";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zoekverkeer" };

/**
 * ZOEKVERKEER: de klikken uit Google naast de zichtbaarheid in AI-antwoorden.
 *
 * Besluit 4: AI-zichtbaarheid is het verhaal, Google is het bewijsstuk. Besluit
 * 3b: dit scherm wordt volledig gebouwd, ook zolang de Google-sleutel er nog
 * niet is. Die sleutel is een losse to-do en blokkeert de bouw niet.
 *
 * ⚠️ **Wat er in de tabel zit bepaalt wat hier kan staan.** `search_console_days`
 * heeft `day`, `page`, `clicks`, `impressions` en `position`. Géén
 * zoekopdrachten, apparaten of landen. Een zoekwoordgrafiek is dus geen
 * schermwerk maar een uitbreiding van de koppeling met een nieuwe tabel.
 *
 * De rekenkant staat in `lib/search-console/metrics.ts`, met tests. Alles op dit
 * scherm is een getal dat de klant als bewijs voorgeschoteld krijgt, en een fout
 * daarin is niet zichtbaar op het scherm maar alleen in het gesprek waarin
 * iemand hem gelooft.
 */
export default async function ZoekverkeerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();
  await requireUser();

  const admin = createAdminClient();
  const { data: dagRijen } = await admin
    .from("search_console_days")
    .select("day, page, clicks, impressions, position")
    .eq("profile_id", id)
    .order("day");

  const rijen = (dagRijen ?? []) as GscDag[];

  // ── Geen koppeling: geen lege grafiek maar uitleg ────────────────────────
  //
  // Twee verschillende situaties, en de klant hoort te weten welke van de twee
  // hij heeft. Op productie stonden ze op 17 augustus 2026 allebei in de
  // database: het ene merk had geen property, het andere had er wel een en een
  // foutmelding erbij.
  if (!profile.gsc_property || rijen.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Kop id={id} />
        <div className="card flex flex-col gap-3">
          <span className="mono-label">
            {profile.gsc_property ? "Nog geen cijfers binnen" : "Nog niet gekoppeld"}
          </span>
          <p className="text-secondary">
            Koppel je Google Search Console en ORBIT ENGINE zet de klikken uit Google naast je
            zichtbaarheid in AI-antwoorden. Dat is het enige beeld dat laat zien of genoemd worden
            ook bezoekers oplevert.
          </p>
          {profile.gsc_last_error && (
            <p className="text-sm text-[var(--status-error)]">
              De laatste synchronisatie liep vast: {profile.gsc_last_error}
            </p>
          )}
          <Link href="/instellingen/koppelingen" className="btn-primary w-fit">
            Naar de koppeling
          </Link>
        </div>
      </div>
    );
  }

  // ── De vensters ──────────────────────────────────────────────────────────
  const venster = volledigVenster(rijen)!;
  const vergelijking = vergelijk(rijen, venster);
  const dagen = perDag(rijen);

  // ── De pagina's die ORBIT ENGINE schreef, en hun paginatype ──────────────
  //
  // Twee bronnen: `content_pieces.published_url` zegt wélke pagina's van ons
  // zijn, `planned_pages` zegt welk type ze hebben. Het type komt bewust uit het
  // plan en niet uit `content_pieces.type`, zie de waarschuwing in
  // `lib/search-console/metrics.ts` bij `klikkenPerType`.
  const { data: clusterRijen } = await activeOnly(
    admin.from("analyses").select("id").eq("profile_id", id),
  );
  const clusterIds = ((clusterRijen ?? []) as { id: string }[]).map((c) => c.id);

  const [{ data: pieceRijen }, { data: planRijen }, { data: scoreRijen }] = await Promise.all([
    clusterIds.length > 0
      ? admin
          .from("content_pieces")
          .select("published_url")
          .in("analysis_id", clusterIds)
          .not("published_url", "is", null)
      : Promise.resolve({ data: [] }),
    admin
      .from("planned_pages")
      .select("page_type, url_path, posted_url")
      .eq("profile_id", id),
    clusterIds.length > 0
      ? admin
          .from("visibility_scores")
          .select("analysis_id, week_no, score, weighted_score, computed_at")
          .in("analysis_id", clusterIds)
          .order("week_no")
      : Promise.resolve({ data: [] }),
  ]);

  const onzeUrls = new Set(
    ((pieceRijen ?? []) as { published_url: string }[]).map((p) => normaliseerUrl(p.published_url)),
  );

  const typePerUrl = new Map<string, string>();
  for (const p of (planRijen ?? []) as {
    page_type: string;
    url_path: string | null;
    posted_url: string | null;
  }[]) {
    const adres = p.posted_url ?? p.url_path;
    if (adres) typePerUrl.set(normaliseerUrl(adres), p.page_type);
  }

  const paginas = perPagina(rijen, onzeUrls);
  const { beste, zwakste } = besteEnZwakste(paginas);
  const perType = klikkenPerType(paginas, typePerUrl);

  // De metingen als losse punten op de tijdlijn, gemiddeld per meetmoment over
  // de clusters heen. Bewust punten en geen dagcurve: er is tussen twee
  // metingen niets gemeten.
  const scorePunten = meetpunten((scoreRijen ?? []) as ScoreRij[]);

  return (
    <div className="flex flex-col gap-6">
      <Kop id={id} />

      {/* ── 1. Vier kerncijfers ────────────────────────────────────────────
          Elk met de verandering ten opzichte van het vorige, even lange
          venster. Nova's regel: nooit een kaal getal (`schrijfstijl.md` 7). */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cijfer
          label="Klikken"
          waarde={vergelijking.nu.clicks.toLocaleString("nl-NL")}
          delta={vergelijking.verschil.clicks}
          beterIsHoger
        />
        <Cijfer
          label="Vertoningen"
          waarde={vergelijking.nu.impressions.toLocaleString("nl-NL")}
          delta={vergelijking.verschil.impressions}
          beterIsHoger
        />
        <Cijfer
          label="Doorklikratio"
          waarde={procent(vergelijking.nu.ctr)}
          delta={
            vergelijking.verschil.ctr === null
              ? null
              : Number((vergelijking.verschil.ctr * 100).toFixed(1))
          }
          eenheid="pp"
          beterIsHoger
        />
        <Cijfer
          label="Gemiddelde positie"
          waarde={vergelijking.nu.position === null ? "-" : vergelijking.nu.position.toFixed(1)}
          delta={
            vergelijking.verschil.position === null
              ? null
              : Number(vergelijking.verschil.position.toFixed(1))
          }
          // ⚠️ Bij de positie is lager beter: van 14,6 naar 9,2 is een
          // verbetering en hoort een pijl omhoog te krijgen.
          beterIsHoger={false}
        />
      </div>
      <p className="text-sm text-muted">
        Vergeleken met de {dagenIn(venster.start, venster.eind)} dagen daarvóór. De laatste twee
        dagen zijn nog niet definitief: Google corrigeert die na.
      </p>

      {/* ── 2 en 3. Verloop, met de zichtbaarheidslijn erdoorheen ───────────
          Eén grafiek en niet twee: het verloop van de klikken en de lijn van de
          metingen naast elkaar is precies het beeld dat het verhaal vertelt. */}
      <TrafficChart dagen={dagen} scores={scorePunten} />

      {/* ── 4. Beste en zwakste pagina ─────────────────────────────────────
          De zwakste is de actiegerichte helft: dat is de pagina die een
          herschrijving verdient. */}
      {(beste || zwakste) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {beste && (
            <PaginaKaart
              titel="Beste pagina"
              uitleg="De pagina die de meeste klikken uit Google haalt."
              pagina={beste}
              accent="card-success"
            />
          )}
          {zwakste ? (
            <PaginaKaart
              titel="Zwakste pagina"
              uitleg="Veel gezien, weinig geklikt. Dit is de pagina waar een herschrijving het meeste oplevert."
              pagina={zwakste}
              accent="card-warning"
            />
          ) : (
            <div className="card flex flex-col gap-1">
              <span className="mono-label">Zwakste pagina</span>
              <p className="text-secondary">
                Nog geen pagina met genoeg vertoningen om iets over te zeggen. Onder de vijftig
                vertoningen is een lage doorklikratio toeval, geen signaal.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 5. Klikken per paginatype ──────────────────────────────────────
          Het cijfer dat het contentplan van volgend jaar hoort te sturen. */}
      <div className="flex flex-col gap-2">
        <span className="mono-label flex items-center gap-1">
          Klikken per paginatype
          <InfoHint label="Welke types zijn dit?">
            De indeling uit je contentplan: informatief, categorie en dienst. Dat is de as waarop
            het plan zelf verdeelt, dus een conclusie hier levert meteen een bijstelling op.
            Pagina&apos;s die niet in je plan staan tellen niet mee.
          </InfoHint>
        </span>
        {perType.length === 0 ? (
          <div className="card flex flex-col gap-1">
            <span className="mono-label">Nog niets te verdelen</span>
            <p className="text-secondary">
              Zodra er pagina&apos;s uit je contentplan live staan en Google er verkeer op meet,
              staat hier welk soort content het meeste oplevert.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {perType.map((t) => {
              const totaalKlikken = perType.reduce((s, x) => s + x.clicks, 0);
              const aandeel = totaalKlikken > 0 ? (t.clicks / totaalKlikken) * 100 : 0;
              return (
                <li key={t.type} className="card flex flex-col gap-2">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium capitalize">{t.type}</span>
                    <span className="mono-label">
                      {t.clicks.toLocaleString("nl-NL")} klikken over{" "}
                      {t.paginas === 1 ? "1 pagina" : `${t.paginas} pagina's`}
                    </span>
                  </span>
                  <span
                    className="h-2 w-full overflow-hidden rounded-[var(--radius-pill)]"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <span
                      className="block h-full rounded-[var(--radius-pill)]"
                      style={{ width: `${aandeel}%`, background: "var(--chart-2)" }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── 6. Alle pagina's ───────────────────────────────────────────────
          Op mobiel gestapelde kaarten en geen tabel met vijf kolommen
          (`docs/ux-design.md` §7). */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">Alle pagina&apos;s ({paginas.length})</span>
        <ul className="flex flex-col gap-2">
          {paginas.map((p) => (
            <li
              key={p.page}
              className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0 flex-1">
                <ExternalLink href={p.page} className="break-url text-sm hover:underline">
                  {p.page}
                </ExternalLink>
                {p.vanOns && (
                  <span className="chip chip-info ml-2 align-middle">door ORBIT ENGINE</span>
                )}
              </span>
              <span className="flex shrink-0 flex-wrap gap-4">
                <Kolom label="klikken" waarde={p.clicks.toLocaleString("nl-NL")} />
                <Kolom label="vertoningen" waarde={p.impressions.toLocaleString("nl-NL")} />
                <Kolom label="ctr" waarde={procent(p.ctr)} />
                <Kolom
                  label="positie"
                  waarde={p.position === null ? "-" : p.position.toFixed(1)}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Kop({ id }: { id: string }) {
  return (
    <PageHeader
      eyebrow="Analytics"
      title="Zoekverkeer"
      description="De klikken uit Google naast je zichtbaarheid in AI-antwoorden. Het bewijsstuk onder het verhaal."
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
  // Richting én kleur, nooit kleur alleen (`docs/ux-design.md` §2 regel 4).
  const beter = delta === null || delta === 0 ? null : beterIsHoger ? delta > 0 : delta < 0;
  return (
    <div className="card flex flex-col gap-1">
      <span className="mono-label">{label}</span>
      <span className="stat-value text-2xl">{waarde}</span>
      {delta === null || delta === 0 ? (
        <span className="mono-label text-muted">{delta === 0 ? "gelijk" : "geen vergelijking"}</span>
      ) : (
        <span
          className="mono-label"
          style={{
            color: beter ? "var(--intent-growth-text)" : "var(--intent-danger-text)",
          }}
        >
          <Icon naam={delta > 0 ? "stijging" : "daling"} size={12} />
          {Math.abs(delta).toLocaleString("nl-NL")}
          {eenheid ? ` ${eenheid}` : ""}
        </span>
      )}
    </div>
  );
}

function PaginaKaart({
  titel,
  uitleg,
  pagina,
  accent,
}: {
  titel: string;
  uitleg: string;
  pagina: { page: string; clicks: number; impressions: number; ctr: number | null };
  accent: string;
}) {
  return (
    <div className={`card ${accent} flex flex-col gap-2`}>
      <span className="mono-label">{titel}</span>
      <ExternalLink href={pagina.page} className="break-url text-sm font-medium hover:underline">
        {pagina.page}
      </ExternalLink>
      <p className="text-sm text-muted">{uitleg}</p>
      <span className="mono-label">
        {pagina.clicks.toLocaleString("nl-NL")} klikken uit{" "}
        {pagina.impressions.toLocaleString("nl-NL")} vertoningen · {procent(pagina.ctr)}
      </span>
    </div>
  );
}

function Kolom({ label, waarde }: { label: string; waarde: string }) {
  return (
    <span className="flex flex-col">
      <span className="mono-label">{label}</span>
      <span className="stat-value text-sm">{waarde}</span>
    </span>
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

interface ScoreRij {
  analysis_id: string;
  week_no: number;
  score: number;
  weighted_score: number | null;
  computed_at: string | null;
}

/**
 * De metingen als punten op de tijdlijn: per meetmoment het gemiddelde over de
 * clusters die op dat moment gemeten zijn.
 *
 * Bewust op de dag van meten en niet op periodenummer: de kliklijn loopt op
 * kalenderdagen, en twee tijdschalen in één grafiek werken alleen als ze
 * dezelfde as delen. Een meting zonder datum valt weg, want die kun je nergens
 * neerzetten (conventie 3).
 */
function meetpunten(rijen: ScoreRij[]): ScorePunt[] {
  const perDag = new Map<string, number[]>();
  for (const r of rijen) {
    if (!r.computed_at) continue;
    const day = r.computed_at.slice(0, 10);
    perDag.set(day, [...(perDag.get(day) ?? []), r.weighted_score ?? r.score]);
  }
  return [...perDag.entries()]
    .map(([day, waarden]) => ({
      day,
      score: waarden.reduce((s, v) => s + v, 0) / waarden.length,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
}
