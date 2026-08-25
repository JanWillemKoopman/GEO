"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  MONTH_STATUS_META,
  PLAN_STATUS_META,
  planRunningDate,
} from "@/lib/plan-status";
import { contentHref } from "@/lib/plan-overview";
import {
  monthCalendar,
  isRunningMonth,
  isPastMonth,
  formatDagNL,
} from "@/lib/plan-schedule";
import {
  filterBacklog,
  clusterCounts,
  potentieLabel,
  raaktLabel,
  ongemetenClusters,
  LEGE_BACKLOG_FILTERS,
  type BacklogItem,
  type BacklogFilters,
} from "@/lib/plan-backlog";
import {
  writeDecision,
  writeBlockNotice,
  type TopicWritingState,
} from "@/lib/plan-writing";
import { canMove } from "@/lib/plan-order";
import type {
  ContentPlan,
  FunnelStage,
  PlanMonth,
  PlannedPage,
} from "@/lib/types/database";
import { Icon } from "@/components/icon";

/**
 * Het contentplan: een voorraad links, twaalf maanden rechts.
 *
 * ── WAT ER OP 25 AUGUSTUS 2026 IS OMGEDRAAID ────────────────────────────────
 *
 * Dit scherm toonde een jaarplan dat de machine had verdeeld: twaalf maanden,
 * tien pagina's per maand, klaar. Bij Gasservice Brabant stonden er 120 rijen,
 * opgebouwd uit 28 unieke titels (zeven clusters × vier funnelfasen), dus elke
 * titel kwam vier tot vijf keer terug. En van die 120 waren er 17 te schrijven:
 * zes van de zeven clusters zijn nooit gemeten, en zonder meting heeft de
 * schrijfstap geen briefing.
 *
 * Het scherm loog dus twee keer tegelijk. Het beloofde variatie die er niet was,
 * en werk dat niet kon beginnen. Wat het niet deed, was de enige vraag
 * beantwoorden die de gebruiker heeft: wat laat ik volgende maand schrijven?
 *
 * ── DE OMKERING ─────────────────────────────────────────────────────────────
 *
 * Links staat wat er beschikbaar is: gemeten kansen, elk met zijn cluster, zijn
 * potentie en de reden waarom hij een kans is. Rechts staan twaalf maanden die
 * beginnen zoals de gebruiker ze laat beginnen. Ertussen zit slepen.
 *
 * ⚠️ Slepen is hier nieuw, en het spreekt `lib/plan-order.ts` tegen: dat bestand
 * legt uit waarom volgorde met kNOPPEN werkt en niet met slepen (HTML5-drag doet
 * niets op een telefoon, en de eerste klacht van dit traject ging over mobiel).
 * Die redenering staat nog steeds, en daarom is slepen hier niet de enige weg:
 * elke kaart draagt óók een keuzelijst "Plan in", en die werkt met een vinger,
 * met een toetsenbord en met een schermlezer. Slepen is de snelle weg voor wie
 * een muis heeft, geen voorwaarde om het scherm te kunnen gebruiken.
 *
 * De rekenkunde staat in `lib/plan-backlog.ts` en `lib/plan-schedule.ts`, allebei
 * puur en getest (conventie 2).
 */

/** Wat er op dit moment onder de muis hangt. */
interface Sleep {
  pageId: string;
  titel: string;
  /** De maand waar de kaart vandaan komt. `null` = uit de voorraad. */
  uitMaand: string | null;
}

export function PlanView({
  profileId,
  plan,
  months,
  pages,
  backlog,
  metKansen,
  funnels,
  topics,
  staff,
}: {
  profileId: string;
  plan: ContentPlan;
  months: PlanMonth[];
  pages: PlannedPage[];
  backlog: BacklogItem[];
  metKansen: string[];
  funnels: FunnelStage[];
  topics: TopicWritingState[];
  /** Besluit 18: alleen de beheerder zet betaald werk in gang. */
  staff: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [postDialog, setPostDialog] = useState<PlannedPage | null>(null);
  const [postUrl, setPostUrl] = useState("");
  const [monthDialog, setMonthDialog] = useState<PlanMonth | null>(null);
  const [bulkDialog, setBulkDialog] = useState<PlanMonth | null>(null);
  const [removeDialog, setRemoveDialog] = useState<PlannedPage | null>(null);
  const [filters, setFilters] = useState<BacklogFilters>(LEGE_BACKLOG_FILTERS);
  const [sleep, setSleep] = useState<Sleep | null>(null);
  const [sleepDoel, setSleepDoel] = useState<string | null>(null);
  const [dicht, setDicht] = useState<Record<string, boolean>>({});
  const [opnieuwDialog, setOpnieuwDialog] = useState(false);

  const funnelNaam = useMemo(
    () => new Map(funnels.map((f) => [f.id, f.label])),
    [funnels],
  );
  const maandVan = useMemo(() => new Map(months.map((m) => [m.id, m])), [months]);
  const onderwerp = useMemo(
    () => new Map(topics.map((t) => [t.topicId, t])),
    [topics],
  );

  /** Waarom staat deze pagina stil? Null = er is niets aan de hand. */
  function blokkade(page: PlannedPage) {
    if (page.status !== "gepland") return null;
    const maand = maandVan.get(page.plan_month_id ?? "");
    if (!maand) return null;
    const besluit = writeDecision(
      page,
      maand.status,
      page.topic_id
        ? {
            analysis_id: onderwerp.get(page.topic_id)?.analysisId ?? null,
            analysis_status: onderwerp.get(page.topic_id)?.analysisStatus ?? null,
          }
        : null,
    );
    return besluit.schrijven ? null : writeBlockNotice(besluit.reden);
  }

  const echt = useMemo(() => pages.filter((p) => !p.is_buffer), [pages]);

  const zichtbareVoorraad = useMemo(
    () => filterBacklog(backlog, filters),
    [backlog, filters],
  );
  const clusters = useMemo(() => clusterCounts(backlog), [backlog]);

  const ongemeten = useMemo(
    () => ongemetenClusters(topics, new Set(metKansen)),
    [topics, metKansen],
  );

  /** Alles wat een maandkop moet weten, in één keer uitgerekend. */
  const maanden = useMemo(
    () =>
      months.map((month) => {
        const inhoud = echt
          .filter((p) => p.plan_month_id === month.id)
          .sort((a, b) => a.sort_order - b.sort_order);
        return {
          month,
          inhoud,
          kalender: monthCalendar(plan.started_on, month.month_number)?.label ?? null,
          lopend: isRunningMonth(plan.started_on, month.month_number),
          voorbij: isPastMonth(plan.started_on, month.month_number),
        };
      }),
    [months, echt, plan.started_on],
  );

  const eerstvolgende = useMemo(() => {
    const vandaag = new Date().toISOString().slice(0, 10);
    return echt
      .filter((p) => p.scheduled_for && p.status !== "geplaatst" && p.scheduled_for >= vandaag)
      .map((p) => p.scheduled_for as string)
      .sort()[0] ?? null;
  }, [echt]);

  // ── Handelingen ──────────────────────────────────────────────────────────

  async function stuur(
    pageId: string,
    body: Record<string, unknown>,
    melding: { titel: string; tekst?: string } | null,
  ): Promise<boolean> {
    setBusy(pageId);
    try {
      const res = await fetch(`/api/profiles/${profileId}/plan/pages/${pageId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json().catch(() => null)) as
        | { error?: string; bufferUsed?: boolean }
        | null;
      if (!res.ok) {
        toast({
          intent: "fout",
          title: "Dat lukte niet",
          description: j?.error ?? "Probeer het opnieuw.",
        });
        return false;
      }
      if (melding) {
        toast({ intent: "succes", title: melding.titel, description: melding.tekst ?? "" });
      }
      router.refresh();
      return true;
    } catch {
      toast({
        intent: "fout",
        title: "Geen verbinding",
        description: "Controleer je internet en probeer het opnieuw.",
      });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function inplannen(pageId: string, titel: string, maandId: string, index: number | null) {
    const maand = maandVan.get(maandId);
    const kalender = maand
      ? (monthCalendar(plan.started_on, maand.month_number)?.label ?? `maand ${maand.month_number}`)
      : "de maand";
    await stuur(
      pageId,
      { actie: "inplannen", maandId, index },
      { titel: `Ingepland in ${kalender}`, tekst: `"${titel}"` },
    );
  }

  async function naarVoorraad(pageId: string, titel: string) {
    await stuur(
      pageId,
      { actie: "naar_voorraad" },
      {
        titel: "Terug in de voorraad",
        tekst: `"${titel}" staat weer beschikbaar en wordt niet geschreven.`,
      },
    );
  }

  async function paginaActie(
    page: PlannedPage,
    actie: "goedkeuren" | "afwijzen" | "geplaatst",
    url?: string,
  ) {
    const ok = await stuur(page.id, { actie, url }, null);
    if (ok) {
      toast({
        intent: actie === "afwijzen" ? "info" : "succes",
        title:
          actie === "goedkeuren"
            ? "Tekst goedgekeurd"
            : actie === "geplaatst"
              ? "Gemarkeerd als geplaatst"
              : "Definitief verwijderd",
        description:
          actie === "afwijzen"
            ? `"${page.title}" komt niet terug in de voorraad.`
            : `"${page.title}"`,
      });
    }
    setPostDialog(null);
    setRemoveDialog(null);
    setPostUrl("");
  }

  async function verplaats(page: PlannedPage, richting: "omhoog" | "omlaag") {
    await stuur(page.id, { actie: "verplaats", richting }, null);
  }

  async function maandActie(month: PlanMonth, actie: "goedkeuren" | "afwijzen") {
    setBusy(month.id);
    try {
      const res = await fetch(`/api/profiles/${profileId}/plan/months/${month.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actie }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        toast({
          intent: "fout",
          title: "Dat lukte niet",
          description: j?.error ?? "Probeer het opnieuw.",
        });
        return;
      }
      toast({
        intent: actie === "goedkeuren" ? "succes" : "info",
        title:
          actie === "goedkeuren"
            ? `Maand ${month.month_number} vrijgegeven`
            : `Maand ${month.month_number} afgewezen`,
        description:
          actie === "goedkeuren"
            ? "ORBIT ENGINE begint tien dagen voor elke publicatiedatum met schrijven."
            : "De pagina's blijven staan; je kunt de maand opnieuw samenstellen.",
      });
      router.refresh();
    } finally {
      setBusy(null);
      setMonthDialog(null);
    }
  }

  /**
   * "Markeer alles als geplaatst" voor één maand.
   *
   * Kwaliteitslat K5: alleen de server weet welke pagina's het haalden, dus die
   * stelt de melding samen (`lib/plan-bulk.ts`, getest). Dit scherm toont hem en
   * verzint er niets bij.
   */
  async function alsGeplaatstMarkeren(month: PlanMonth) {
    setBusy(month.id);
    try {
      const res = await fetch(`/api/profiles/${profileId}/plan/months/${month.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actie: "alles_geplaatst" }),
      });
      const j = (await res.json().catch(() => null)) as {
        error?: string;
        melding?: { intent: "succes" | "waarschuwing" | "fout"; title: string; description: string };
      } | null;
      if (!res.ok || !j?.melding) {
        toast({
          intent: "fout",
          title: "Dat lukte niet",
          description: j?.error ?? "Probeer het opnieuw.",
        });
        return;
      }
      toast(j.melding);
      router.refresh();
    } catch {
      toast({
        intent: "fout",
        title: "Geen verbinding",
        description: "Controleer je internet en probeer het opnieuw.",
      });
    } finally {
      setBusy(null);
      setBulkDialog(null);
    }
  }

  /**
   * Het plan opnieuw opzetten.
   *
   * ⚠️ Dit ontbrak, en dat was een gat: zodra er één plan stond, was er geen weg
   * terug. De enige uitweg was een maand afwijzen, en dat zette niets in gang
   * (het scherm beloofde "ORBIT ENGINE stelt een nieuw voorstel op" en er
   * gebeurde niets). Nu zet deze knop twaalf verse maanden neer met een voorzet
   * in maand 1.
   *
   * Wat er NIET gebeurt: iets weggooien. Het oude plan gaat op `gestopt` en
   * blijft met al zijn pagina's in de database staan (conventie 8).
   */
  async function planOpnieuw() {
    setBusy("plan");
    try {
      const res = await fetch(`/api/profiles/${profileId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast({
          intent: "fout",
          title: "Opnieuw opzetten lukte niet",
          description: j?.error ?? "Probeer het opnieuw.",
        });
        return;
      }
      toast({
        intent: "succes",
        title: "Het plan staat opnieuw klaar",
        description: "Twaalf lege maanden, met de sterkste kansen alvast in maand 1.",
      });
      router.refresh();
    } catch {
      toast({
        intent: "fout",
        title: "Geen verbinding",
        description: "Controleer je internet en probeer het opnieuw.",
      });
    } finally {
      setBusy(null);
      setOpnieuwDialog(false);
    }
  }

  const maandKeuzes = maanden.map((m) => ({
    id: m.month.id,
    label: `Maand ${m.month.month_number}${m.kalender ? ` · ${m.kalender}` : ""}`,
    voorbij: m.voorbij,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* ── De feiten van het plan ───────────────────────────────────────── */}
      <div className="card flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="mono-label">
          pakket {plan.pages_per_month} pagina&apos;s per maand · plan {plan.version}
        </span>
        <span className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-secondary">
            {echt.length} ingepland · {backlog.length} in de voorraad
            {eerstvolgende && ` · volgende publicatie ${formatDagNL(eerstvolgende)}`}
          </span>
          {/* Besluit 18: opnieuw opzetten raakt het hele jaar, dus alleen de
              beheerder. De klant ziet de knop niet, want hij zou een 403 geven. */}
          {staff && (
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={() => setOpnieuwDialog(true)}
              disabled={busy === "plan"}
            >
              Opnieuw opzetten
            </button>
          )}
        </span>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* ── Links: de voorraad ─────────────────────────────────────────── */}
        <div
          className="flex flex-col gap-3 lg:sticky lg:top-4"
          onDragOver={(e) => {
            if (sleep?.uitMaand) {
              e.preventDefault();
              setSleepDoel("voorraad");
            }
          }}
          onDragLeave={() => setSleepDoel(null)}
          onDrop={(e) => {
            e.preventDefault();
            setSleepDoel(null);
            if (sleep?.uitMaand) void naarVoorraad(sleep.pageId, sleep.titel);
            setSleep(null);
          }}
          style={
            sleepDoel === "voorraad"
              ? {
                  outline: "2px dashed var(--intent-intelligence-border)",
                  outlineOffset: "6px",
                  borderRadius: "var(--radius-lg)",
                }
              : undefined
          }
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Beschikbaar om te schrijven</h2>
            <p className="text-sm text-secondary">
              Kansen die ORBIT ENGINE uit je metingen haalde. Sleep er een naar een maand, of
              gebruik de keuzelijst op de kaart.
            </p>
          </div>

          {/* ── Filters ──────────────────────────────────────────────────── */}
          {backlog.length > 0 && (
            <div className="flex flex-col gap-2">
              <input
                className="field"
                value={filters.zoek}
                onChange={(e) => setFilters((f) => ({ ...f, zoek: e.target.value }))}
                placeholder="Zoek in titel, reden of cluster"
                aria-label="Zoek in de voorraad"
              />
              {clusters.length > 1 && (
                <select
                  className="field"
                  value={filters.cluster}
                  onChange={(e) => setFilters((f) => ({ ...f, cluster: e.target.value }))}
                  aria-label="Filter op cluster"
                >
                  <option value="">Alle clusters ({backlog.length})</option>
                  {clusters.map((c) => (
                    <option key={c.naam} value={c.naam}>
                      {c.naam} ({c.aantal})
                    </option>
                  ))}
                </select>
              )}
              <div className="flex flex-wrap gap-2">
                <Segment
                  actief={filters.handeling === ""}
                  aantal={backlog.length}
                  onClick={() => setFilters((f) => ({ ...f, handeling: "" }))}
                >
                  Alles
                </Segment>
                <Segment
                  actief={filters.handeling === "nieuw"}
                  aantal={backlog.filter((b) => b.handeling === "nieuw").length}
                  onClick={() => setFilters((f) => ({ ...f, handeling: "nieuw" }))}
                >
                  Nieuw
                </Segment>
                <Segment
                  actief={filters.handeling === "verbeteren"}
                  aantal={backlog.filter((b) => b.handeling === "verbeteren").length}
                  onClick={() => setFilters((f) => ({ ...f, handeling: "verbeteren" }))}
                >
                  Verbeteren
                </Segment>
              </div>
            </div>
          )}

          {/* ── De kaarten ───────────────────────────────────────────────── */}
          {backlog.length === 0 ? (
            <div className="card flex flex-col gap-1">
              <span className="mono-label">De voorraad is leeg</span>
              <p className="text-sm text-secondary">
                ORBIT ENGINE vult deze lijst met kansen uit je metingen. Zolang er geen cluster
                gemeten is, is er niets om op te schrijven: de schrijfstap heeft de gemiste
                vragen uit een meting nodig als briefing.
              </p>
            </div>
          ) : zichtbareVoorraad.length === 0 ? (
            <div className="card flex flex-col gap-1">
              <span className="mono-label">Niets in deze selectie</span>
              <button
                type="button"
                className="w-fit text-sm text-secondary hover:underline"
                onClick={() => setFilters(LEGE_BACKLOG_FILTERS)}
              >
                Toon alle {backlog.length} kansen
              </button>
            </div>
          ) : (
            <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
              {zichtbareVoorraad.map((item) => (
                <BacklogKaart
                  key={item.id}
                  item={item}
                  maanden={maandKeuzes}
                  busy={busy === item.id}
                  onSleepStart={() =>
                    setSleep({ pageId: item.id, titel: item.title, uitMaand: null })
                  }
                  onSleepEinde={() => {
                    setSleep(null);
                    setSleepDoel(null);
                  }}
                  onKies={(maandId) => void inplannen(item.id, item.title, maandId, null)}
                />
              ))}
            </ul>
          )}

          {/* ── Wat de voorraad kan laten groeien ────────────────────────── */}
          {ongemeten.length > 0 && (
            <div className="card flex flex-col gap-2">
              <span className="mono-label">Nog geen kansen uit deze clusters</span>
              <p className="text-sm text-secondary">
                {ongemeten.length === 1
                  ? "Dit cluster is nog niet gemeten, dus ORBIT ENGINE weet nog niet waar hier iets te winnen valt."
                  : `Deze ${ongemeten.length} clusters zijn nog niet gemeten, dus ORBIT ENGINE weet nog niet waar daar iets te winnen valt.`}
              </p>
              <ul className="flex flex-col gap-1">
                {ongemeten.map((c) => (
                  <li key={c.topicId} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="min-w-0 truncate">{c.title}</span>
                    {c.loopt ? (
                      <span className="chip chip-neutral">meting loopt</span>
                    ) : c.analysisId ? (
                      <Link
                        href={`/analyses/${c.analysisId}`}
                        className="text-secondary hover:underline"
                      >
                        Naar het cluster
                      </Link>
                    ) : (
                      <Link
                        href={`/merk/${profileId}/strategie/clusters`}
                        className="text-secondary hover:underline"
                      >
                        Start de meting
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Rechts: de twaalf maanden ──────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {maanden.map(({ month, inhoud, kalender, lopend, voorbij }) => {
            const meta = MONTH_STATUS_META[month.status];
            const open = !(dicht[month.id] ?? (voorbij && inhoud.length === 0));
            const overVol = inhoud.length > plan.pages_per_month;
            return (
              <section
                key={month.id}
                className="flex flex-col gap-2 rounded-[var(--radius-lg)] p-2 transition-colors"
                style={
                  sleepDoel === month.id
                    ? {
                        outline: "2px dashed var(--intent-intelligence-border)",
                        background: "var(--intent-intelligence-surface)",
                      }
                    : undefined
                }
                onDragOver={(e) => {
                  if (!sleep) return;
                  e.preventDefault();
                  setSleepDoel(month.id);
                }}
                onDragLeave={(e) => {
                  // Alleen loslaten als de muis de hele sectie verlaat, niet bij
                  // elke kaart die eronder langsgaat.
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setSleepDoel((d) => (d === month.id ? null : d));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setSleepDoel(null);
                  if (sleep) void inplannen(sleep.pageId, sleep.titel, month.id, null);
                  setSleep(null);
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex min-w-0 flex-wrap items-baseline gap-2">
                    {/* Besluit 7: "maand 4 sinds de start", nooit "van 12". De
                        kalendermaand komt uit de startdatum van het plan, niet
                        meer uit de publicatiedata: een lege maand hoort ook een
                        naam te hebben. */}
                    <h2 className="text-lg font-semibold">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setDicht((d) => ({ ...d, [month.id]: open }))}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Icon naam={open ? "openen" : "verder"} size={14} />
                        Maand {month.month_number}
                      </button>
                    </h2>
                    {kalender && <span className="mono-label text-muted">{kalender}</span>}
                    {lopend && <span className="chip chip-info">Deze maand</span>}
                    <span className="mono-label text-muted">
                      {inhoud.length === 0
                        ? "leeg"
                        : `${inhoud.length} ${inhoud.length === 1 ? "pagina" : "pagina's"}`}
                    </span>
                    {/* Besluit: geen enkele grens aan het aantal per maand. Het
                        scherm zegt wél wat het pakket is, want een maand die
                        stilzwijgend het dubbele schrijft is een rekening die de
                        klant niet zag aankomen. */}
                    {overVol && (
                      <span className="chip chip-warning">
                        {inhoud.length - plan.pages_per_month} boven je pakket
                      </span>
                    )}
                    <span
                      className={
                        month.status === "goedgekeurd"
                          ? "chip chip-success"
                          : month.status === "ter_goedkeuring"
                            ? "chip chip-warning"
                            : "chip chip-neutral"
                      }
                    >
                      {meta.label}
                    </span>
                  </span>

                  <span className="flex flex-wrap items-center gap-2">
                    {inhoud.some((p) => p.status === "goedgekeurd") && (
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        onClick={() => setBulkDialog(month)}
                        disabled={busy === month.id}
                      >
                        Markeer alles als geplaatst
                      </button>
                    )}

                    {month.status !== "goedgekeurd" &&
                      inhoud.length > 0 &&
                      (staff ? (
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => setMonthDialog(month)}
                          disabled={busy === month.id}
                        >
                          Maand vrijgeven
                        </button>
                      ) : (
                        // Besluit 18. De klant ziet wél dat er iets van hem
                        // gevraagd wordt, en bij wie hij daarvoor moet zijn.
                        <span className="text-sm text-secondary">
                          Laat je consultant deze maand vrijgeven
                        </span>
                      ))}
                  </span>
                </div>

                {open &&
                  (inhoud.length === 0 ? (
                    <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] px-4 py-6 text-center text-sm text-muted">
                      Sleep hier een kans uit de voorraad naartoe
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {inhoud.map((page, index) => (
                        <PageRow
                          key={page.id}
                          page={page}
                          profileId={profileId}
                          href={contentHref(
                            page.content_piece_id,
                            page.topic_id
                              ? (onderwerp.get(page.topic_id)?.analysisId ?? null)
                              : null,
                          )}
                          funnel={
                            page.funnel_stage_id
                              ? (funnelNaam.get(page.funnel_stage_id) ?? null)
                              : null
                          }
                          blokkade={blokkade(page)}
                          kanOmhoog={canMove(inhoud, page.id, "omhoog")}
                          kanOmlaag={canMove(inhoud, page.id, "omlaag")}
                          onMove={(richting) => void verplaats(page, richting)}
                          busy={busy === page.id}
                          maanden={maandKeuzes}
                          huidigeMaand={month.id}
                          onSleepStart={() =>
                            setSleep({
                              pageId: page.id,
                              titel: page.title,
                              uitMaand: month.id,
                            })
                          }
                          onSleepEinde={() => {
                            setSleep(null);
                            setSleepDoel(null);
                          }}
                          onDropHier={() => {
                            if (sleep) void inplannen(sleep.pageId, sleep.titel, month.id, index);
                            setSleep(null);
                            setSleepDoel(null);
                          }}
                          onKies={(maandId) =>
                            void inplannen(page.id, page.title, maandId, null)
                          }
                          onNaarVoorraad={() => void naarVoorraad(page.id, page.title)}
                          onApprove={() => void paginaActie(page, "goedkeuren")}
                          onPost={() => {
                            setPostDialog(page);
                            setPostUrl(page.url_path ?? "");
                          }}
                          onRemove={() => setRemoveDialog(page)}
                        />
                      ))}
                    </ul>
                  ))}
              </section>
            );
          })}
        </div>
      </div>

      {/* ── Markeren als geplaatst ──────────────────────────────────────── */}
      <ConfirmDialog
        open={postDialog !== null}
        title="Markeer als geplaatst"
        body={`Bevestig het pad waar "${postDialog?.title ?? ""}" nu live staat. ORBIT ENGINE gebruikt dat adres om te meten wat de pagina oplevert.`}
        irreversible={{
          title: "Dit kun je niet terugdraaien",
          description:
            "De pagina telt vanaf nu als gepubliceerd, en ORBIT ENGINE begint hem te volgen op dit adres.",
        }}
        confirmLabel="Markeer als geplaatst"
        confirmingLabel="Bezig…"
        busy={busy === postDialog?.id}
        onCancel={() => setPostDialog(null)}
        onConfirm={() => postDialog && void paginaActie(postDialog, "geplaatst", postUrl)}
      >
        <input
          className="field"
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
          placeholder="/diensten/cv-ketel-onderhoud"
          aria-label="Het pad waar de pagina live staat"
        />
      </ConfirmDialog>

      {/* ── Definitief verwijderen ──────────────────────────────────────────
          Iets anders dan terugleggen in de voorraad, en het scherm zegt dat
          verschil hardop: teruggelegd kun je morgen alsnog inplannen,
          verwijderd niet. */}
      <ConfirmDialog
        open={removeDialog !== null}
        title="Definitief verwijderen"
        body={`"${removeDialog?.title ?? ""}" verdwijnt uit het plan én uit de voorraad. Wil je hem alleen uit deze maand halen, gebruik dan "terug naar de voorraad".`}
        irreversible={{
          title: "Dit kun je niet terugdraaien",
          description:
            "Deze kans komt niet vanzelf terug, ook niet als het cluster opnieuw gemeten wordt.",
        }}
        confirmLabel="Definitief verwijderen"
        confirmingLabel="Bezig…"
        danger
        busy={busy === removeDialog?.id}
        onCancel={() => setRemoveDialog(null)}
        onConfirm={() => removeDialog && void paginaActie(removeDialog, "afwijzen")}
      />

      {/* ── Alles van een maand als geplaatst markeren ──────────────────── */}
      <ConfirmDialog
        open={bulkDialog !== null}
        title="Markeer alles als geplaatst"
        body={`Je markeert ${
          echt.filter((p) => p.plan_month_id === bulkDialog?.id && p.status === "goedgekeurd")
            .length
        } goedgekeurde pagina's van maand ${bulkDialog?.month_number ?? ""} als live, elk op het adres dat in het plan staat. Pagina's zonder adres of zonder akkoord blijven staan, en je krijgt te horen welke.`}
        irreversible={{
          title: "Dit kun je niet terugdraaien",
          description:
            "Deze pagina's tellen vanaf nu als gepubliceerd, en ORBIT ENGINE begint ze te volgen op die adressen.",
        }}
        confirmLabel="Markeer alles als geplaatst"
        confirmingLabel="Bezig…"
        busy={busy === bulkDialog?.id}
        onCancel={() => setBulkDialog(null)}
        onConfirm={() => bulkDialog && void alsGeplaatstMarkeren(bulkDialog)}
      />

      {/* ── Maand vrijgeven ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={monthDialog !== null}
        title={`Maand ${monthDialog?.month_number ?? ""} vrijgeven`}
        body={`Je geeft ${
          echt.filter((p) => p.plan_month_id === monthDialog?.id).length
        } pagina's in één keer vrij om geschreven te worden. ORBIT ENGINE begint tien dagen voor elke publicatiedatum, en legt elke tekst daarna aan jou voor.`}
        irreversible={{
          title: "Dit zet het schrijven in gang",
          description:
            "Elke pagina die geschreven wordt kost geld. Haal pagina's terug naar de voorraad als ze er nog niet in horen.",
        }}
        confirmLabel="Vrijgeven"
        confirmingLabel="Bezig…"
        busy={busy === monthDialog?.id}
        onCancel={() => setMonthDialog(null)}
        onConfirm={() => monthDialog && void maandActie(monthDialog, "goedkeuren")}
      />

      {/* ── Het plan opnieuw opzetten ───────────────────────────────────── */}
      <ConfirmDialog
        open={opnieuwDialog}
        title="Het plan opnieuw opzetten"
        body={`Je krijgt twaalf lege maanden terug, met de sterkste kansen uit je voorraad alvast in maand 1. Alles wat je nu hebt ingepland (${echt.length} ${echt.length === 1 ? "pagina" : "pagina's"}) verdwijnt uit dit scherm.`}
        irreversible={{
          title: "Wat er blijft en wat er weggaat",
          description:
            "Geschreven teksten blijven in je bibliotheek staan en pagina's die live staan blijven live. Het oude plan blijft bewaard, maar je ziet het hier niet meer terug.",
        }}
        confirmLabel="Opnieuw opzetten"
        confirmingLabel="Bezig…"
        danger
        busy={busy === "plan"}
        onCancel={() => setOpnieuwDialog(false)}
        onConfirm={() => void planOpnieuw()}
      />
    </div>
  );
}

interface MaandKeuze {
  id: string;
  label: string;
  voorbij: boolean;
}

/**
 * De keuzelijst die naast het slepen staat.
 *
 * ⚠️ Dit is geen extraatje maar de gelijkwaardige weg. Zie de toelichting
 * bovenaan: HTML5-slepen doet niets op een telefoon en niets met een
 * toetsenbord, en `lib/plan-order.ts` legt uit waarom dat hier zwaar weegt. Een
 * kale `select` is daarvoor het juiste gereedschap: hij werkt overal, hij is
 * bedienbaar met een schermlezer, en hij vraagt geen enkele bibliotheek.
 */
function MaandKiezer({
  maanden,
  huidige,
  busy,
  label,
  onKies,
}: {
  maanden: MaandKeuze[];
  huidige?: string;
  busy: boolean;
  label: string;
  onKies: (maandId: string) => void;
}) {
  return (
    <select
      className="field w-fit text-sm"
      value=""
      disabled={busy}
      aria-label={label}
      onChange={(e) => {
        const gekozen = e.target.value;
        e.target.value = "";
        if (gekozen) onKies(gekozen);
      }}
    >
      <option value="">{label}</option>
      {maanden
        .filter((m) => m.id !== huidige)
        .map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
            {m.voorbij ? " (voorbij)" : ""}
          </option>
        ))}
    </select>
  );
}

/** Eén kans in de voorraad. */
function BacklogKaart({
  item,
  maanden,
  busy,
  onSleepStart,
  onSleepEinde,
  onKies,
}: {
  item: BacklogItem;
  maanden: MaandKeuze[];
  busy: boolean;
  onSleepStart: () => void;
  onSleepEinde: () => void;
  onKies: (maandId: string) => void;
}) {
  const potentie = potentieLabel(item);
  const raakt = raaktLabel(item);

  return (
    <li
      className="card flex cursor-grab flex-col gap-2 active:cursor-grabbing"
      draggable={!busy}
      onDragStart={onSleepStart}
      onDragEnd={onSleepEinde}
      style={busy ? { opacity: 0.5 } : undefined}
    >
      <div className="flex flex-col gap-1">
        <span className="font-medium">{item.title}</span>
        <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {item.cluster && <span className="chip chip-neutral">{item.cluster}</span>}
          {item.handeling === "verbeteren" ? (
            <span className="chip chip-info">verbeteren</span>
          ) : (
            <span className="chip chip-neutral">nieuw</span>
          )}
          {/* Conventie 3: bij een onbekende potentie staat er geen getal, ook
              geen nul. Dit getal bepaalt wat iemand als eerste laat schrijven. */}
          {potentie && <span className="chip chip-success">{potentie}</span>}
        </span>
        {raakt && <span className="text-sm text-secondary">{raakt}</span>}
      </div>

      {item.why && (
        <p className="text-sm text-secondary" style={{ lineHeight: 1.5 }}>
          {item.why}
        </p>
      )}

      {item.existingUrl && (
        <span className="truncate text-sm text-muted" title={item.existingUrl}>
          Werkt aan {item.existingUrl}
        </span>
      )}

      <MaandKiezer maanden={maanden} busy={busy} label="Plan in…" onKies={onKies} />
    </li>
  );
}

function Segment({
  actief,
  aantal,
  onClick,
  children,
}: {
  actief: boolean;
  aantal: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actief}
      className="flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--wash-hover)]"
      style={{
        borderColor: actief ? "var(--intent-intelligence-border)" : "var(--border-subtle)",
        background: actief ? "var(--intent-intelligence-surface)" : undefined,
        color: actief ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      {children}
      <span className="chip chip-neutral">{aantal}</span>
    </button>
  );
}

/** Eén ingeplande pagina. De drie statuslagen staan er alle drie op. */
function PageRow({
  page,
  profileId,
  href,
  funnel,
  blokkade,
  kanOmhoog,
  kanOmlaag,
  onMove,
  busy,
  maanden,
  huidigeMaand,
  onSleepStart,
  onSleepEinde,
  onDropHier,
  onKies,
  onNaarVoorraad,
  onApprove,
  onPost,
  onRemove,
}: {
  page: PlannedPage;
  profileId: string;
  /** Waar de geschreven tekst staat. `null` = er is nog niets geschreven. */
  href: string | null;
  funnel: string | null;
  /** Waarom ORBIT ENGINE deze pagina niet kan schrijven. `null` = er is niets aan de hand. */
  blokkade: { text: string; whoseTurn: "klant" | "orbit_engine" | null } | null;
  kanOmhoog: boolean;
  kanOmlaag: boolean;
  onMove: (richting: "omhoog" | "omlaag") => void;
  busy: boolean;
  maanden: MaandKeuze[];
  huidigeMaand: string;
  onSleepStart: () => void;
  onSleepEinde: () => void;
  onDropHier: () => void;
  onKies: (maandId: string) => void;
  onNaarVoorraad: () => void;
  onApprove: () => void;
  onPost: () => void;
  onRemove: () => void;
}) {
  const meta = PLAN_STATUS_META[page.status];
  const wanneer = planRunningDate(page);
  // ⚠️ Er is één pad waarbij een pagina om akkoord vraagt zonder gekoppelde
  // tekst: schreef de pijplijn eerder al iets met dezelfde titel onder deze
  // analyse, dan zet de cron alleen de status om (`alreadyDone` in
  // `app/api/cron/plan/route.ts`) en blijft `content_piece_id` leeg.
  const losseTekst = href === null && page.status === "ter_goedkeuring";
  // Alleen wat nog niet in beweging is, mag terug of verhuizen. Een geschreven
  // tekst terugleggen is betaald werk weggooien.
  const magVerhuizen = page.status === "gepland";

  return (
    <li
      className="card flex flex-wrap items-center justify-between gap-3"
      draggable={magVerhuizen && !busy}
      onDragStart={onSleepStart}
      onDragEnd={onSleepEinde}
      onDrop={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onDropHier();
      }}
      style={busy ? { opacity: 0.5 } : undefined}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {href ? (
          <Link href={href} className="font-medium hover:underline">
            {page.title}
          </Link>
        ) : (
          <span className="font-medium">{page.title}</span>
        )}
        <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="chip chip-neutral">{page.page_type}</span>
          {funnel && <span>{funnel}</span>}
          {wanneer && <span>· {wanneer}</span>}
        </span>
        {/* De reden staat ONDER de regel en niet als chip ernaast: het is een
            zin, geen etiket. */}
        {blokkade && (
          <span
            className="text-sm"
            style={{
              color:
                blokkade.whoseTurn === "klant"
                  ? "var(--intent-warning-text)"
                  : "var(--text-secondary)",
            }}
          >
            {blokkade.text}
          </span>
        )}
        {losseTekst && (
          <span className="text-sm text-secondary">
            De tekst hangt niet aan deze regel.{" "}
            <Link
              href={`/merk/${profileId}/strategie/bibliotheek`}
              className="hover:underline"
            >
              Zoek hem in de bibliotheek
            </Link>
          </span>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {(kanOmhoog || kanOmlaag) && (
          <span className="flex items-center">
            <button
              type="button"
              className="rounded-[var(--radius-md)] px-2 py-1 text-secondary transition-colors hover:bg-[var(--bg-muted)] disabled:opacity-40"
              onClick={() => onMove("omhoog")}
              disabled={busy || !kanOmhoog}
              aria-label={`"${page.title}" een plek eerder publiceren`}
            >
              <Icon naam="omhoog" size={14} />
            </button>
            <button
              type="button"
              className="rounded-[var(--radius-md)] px-2 py-1 text-secondary transition-colors hover:bg-[var(--bg-muted)] disabled:opacity-40"
              onClick={() => onMove("omlaag")}
              disabled={busy || !kanOmlaag}
              aria-label={`"${page.title}" een plek later publiceren`}
            >
              <Icon naam="omlaag" size={14} />
            </button>
          </span>
        )}

        <span
          className={
            meta.tone === "wacht"
              ? "chip chip-warning"
              : meta.tone === "klaar"
                ? "chip chip-success"
                : meta.tone === "fout"
                  ? "chip chip-danger"
                  : "chip chip-neutral"
          }
        >
          {meta.running}
        </span>

        {magVerhuizen && (
          <MaandKiezer
            maanden={maanden}
            huidige={huidigeMaand}
            busy={busy}
            label="Verplaats naar…"
            onKies={onKies}
          />
        )}

        {/* Het TWEEDE akkoord: over de geschreven tekst, niet over de maand. */}
        {page.status === "ter_goedkeuring" && href && (
          <Link href={href} className="btn-outline btn-sm">
            Lezen
          </Link>
        )}
        {page.status === "ter_goedkeuring" && (
          <button type="button" className="btn-primary btn-sm" onClick={onApprove} disabled={busy}>
            Tekst goedkeuren
          </button>
        )}
        {page.status === "goedgekeurd" && (
          <button type="button" className="btn-primary btn-sm" onClick={onPost} disabled={busy}>
            Ik heb hem geplaatst
          </button>
        )}
        {magVerhuizen && (
          <button
            type="button"
            className="text-sm text-secondary hover:underline"
            onClick={onNaarVoorraad}
            disabled={busy}
          >
            Terug naar voorraad
          </button>
        )}
        {(page.status === "gepland" || page.status === "ter_goedkeuring") && (
          <button
            type="button"
            className="text-sm text-muted hover:underline"
            onClick={onRemove}
            disabled={busy}
          >
            Verwijderen
          </button>
        )}
      </div>
    </li>
  );
}
