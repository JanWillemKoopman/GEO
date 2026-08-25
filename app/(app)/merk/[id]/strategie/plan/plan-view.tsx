"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MONTH_STATUS_META, PLAN_STATUS_META, planRunningDate } from "@/lib/plan-status";
import { contentHref, sharedNotice } from "@/lib/plan-overview";
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
import { writeDecision, writeBlockNotice, type TopicWritingState } from "@/lib/plan-writing";
import { canMove } from "@/lib/plan-order";
import type { ContentPlan, FunnelStage, PlanMonth, PlannedPage } from "@/lib/types/database";
import { Icon } from "@/components/icon";

/**
 * Het contentplan: een voorraad links, twaalf maanden rechts.
 *
 * ── WAT ER OP 25 AUGUSTUS 2026 IS OMGEDRAAID ────────────────────────────────
 *
 * Dit scherm toonde een jaarplan dat de machine had verdeeld: 120 rijen uit 28
 * unieke titels, waarvan er 17 te schrijven waren. Nu staat links wat
 * beschikbaar is (gemeten kansen, met cluster, potentie en reden) en rechts
 * twaalf maanden die de gebruiker zelf vult. De achtergrond staat in
 * `docs/logbook.md`.
 *
 * ── WAT ER OP 26 AUGUSTUS UIT IS GESLOOPT, EN WAAROM ────────────────────────
 *
 * De eerste versie van deze indeling was functioneel compleet en visueel
 * onleesbaar. Eén regel van maand 1 besloeg VIJF regels tekst en droeg zeven
 * bedieningen:
 *
 *   Verbeter de pagina over geen warm water voor Midden-Brabant
 *   [dienst]  Stond gepland voor 1 augustus
 *   ORBIT ENGINE schrijft pas als deze maand is vrijgegeven
 *   [↑] [↓]  [ORBIT ENGINE schrijft dit later]
 *   [ Verplaats naar…                                    ▾ ]
 *   Terug naar voorraad   Verwijderen
 *
 * Tien van die blokken onder elkaar, elk in een eigen kaart met eigen rand,
 * binnen de kaart van de maand. Vier ingrepen:
 *
 *   1. **De keuzelijst is een menu geworden.** `.field` is 40 pixels hoog, over
 *      de volle breedte, met een dikke rand: op elke regel stond de bediening
 *      dus zwaarder in beeld dan de titel. Nu zit alles wat een regel kan achter
 *      één knop met drie puntjes. Slepen blijft de snelle weg, het menu blijft
 *      de weg die op een telefoon en met een toetsenbord werkt.
 *   2. **De herhaalde zin staat nog één keer, boven de maand.** "ORBIT ENGINE
 *      schrijft pas als deze maand is vrijgegeven" is een eigenschap van de
 *      MAAND en stond tien keer. `sharedNotice()` bepaalt wat alle regels delen;
 *      alleen wat per regel verschilt blijft per regel staan.
 *   3. **Geen kaart in een kaart.** De maand is de kaart, de regels zijn platte
 *      rijen met een scheidingslijn. Dat scheelt per regel twee randen, twintig
 *      pixels marge en een schaduwvlak.
 *   4. **De statuschip verdwijnt bij de normale gang van zaken.** "ORBIT ENGINE
 *      schrijft dit later" stond op elke geplande regel en zei niets wat de
 *      datum ernaast niet al zei. Een chip verschijnt nu alleen als de regel
 *      iets anders doet dan wachten.
 *
 * Wat NIET is overgenomen uit de aangeleverde review: die noemt velden die dit
 * scherm niet heeft (Vraagsoort, Thema, Basisinstellingen, Bewaar akkoord) en
 * vraagt om een statuschip naast de maandtitel en een primaire knop rechts in de
 * maandkop, en die stonden er allebei al.
 *
 * De rekenkunde staat in `lib/plan-backlog.ts`, `lib/plan-schedule.ts` en
 * `lib/plan-overview.ts`, alle drie puur en getest (conventie 2).
 */

/** Wat er op dit moment onder de muis hangt. */
interface Sleep {
  pageId: string;
  titel: string;
  /** De maand waar de kaart vandaan komt. `null` = uit de voorraad. */
  uitMaand: string | null;
}

interface MaandKeuze {
  id: string;
  label: string;
  voorbij: boolean;
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
  const [removeKans, setRemoveKans] = useState<BacklogItem | null>(null);
  const [opnieuwDialog, setOpnieuwDialog] = useState(false);
  const [filters, setFilters] = useState<BacklogFilters>(LEGE_BACKLOG_FILTERS);
  const [sleep, setSleep] = useState<Sleep | null>(null);
  const [sleepDoel, setSleepDoel] = useState<string | null>(null);
  const [dicht, setDicht] = useState<Record<string, boolean>>({});
  const [uitgeklapt, setUitgeklapt] = useState<Record<string, boolean>>({});

  const funnelNaam = useMemo(() => new Map(funnels.map((f) => [f.id, f.label])), [funnels]);
  const maandVan = useMemo(() => new Map(months.map((m) => [m.id, m])), [months]);
  const onderwerp = useMemo(() => new Map(topics.map((t) => [t.topicId, t])), [topics]);

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
  const zichtbareVoorraad = useMemo(() => filterBacklog(backlog, filters), [backlog, filters]);
  const clusters = useMemo(() => clusterCounts(backlog), [backlog]);
  const ongemeten = useMemo(
    () => ongemetenClusters(topics, new Set(metKansen)),
    [topics, metKansen],
  );

  /** Alles wat een maand moet weten, in één keer uitgerekend. */
  const maanden = useMemo(
    () =>
      months.map((month) => {
        const inhoud = echt
          .filter((p) => p.plan_month_id === month.id)
          .sort((a, b) => a.sort_order - b.sort_order);
        // ⚠️ De melding die ALLE regels delen hoort bij de maand, niet bij de
        // regels. Zie `sharedNotice()`.
        const gedeeld = sharedNotice(inhoud.map((p) => blokkade(p)?.text ?? null));
        return {
          month,
          inhoud,
          gedeeld,
          kalender: monthCalendar(plan.started_on, month.month_number)?.label ?? null,
          lopend: isRunningMonth(plan.started_on, month.month_number),
          voorbij: isPastMonth(plan.started_on, month.month_number),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [months, echt, plan.started_on, maandVan, onderwerp],
  );

  const eerstvolgende = useMemo(() => {
    const vandaag = new Date().toISOString().slice(0, 10);
    return (
      echt
        .filter((p) => p.scheduled_for && p.status !== "geplaatst" && p.scheduled_for >= vandaag)
        .map((p) => p.scheduled_for as string)
        .sort()[0] ?? null
    );
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
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
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
    page: { id: string; title: string },
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
    setRemoveKans(null);
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
   * "Markeer alles als geplaatst" voor één maand. Kwaliteitslat K5: alleen de
   * server weet welke pagina's het haalden, dus die stelt de melding samen
   * (`lib/plan-bulk.ts`, getest). Dit scherm toont hem en verzint er niets bij.
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
   * Het plan opnieuw opzetten. Twaalf verse maanden met een voorzet in maand 1;
   * het oude plan gaat op `gestopt` en blijft bewaard (conventie 8).
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

  const maandKeuzes: MaandKeuze[] = maanden.map((m) => ({
    id: m.month.id,
    label: `Maand ${m.month.month_number}${m.kalender ? ` · ${m.kalender}` : ""}`,
    voorbij: m.voorbij,
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* ── De feiten van het plan, één regel ────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-sm text-secondary">
          <span className="mono-label">pakket {plan.pages_per_month} per maand</span>
          <span className="mx-2 text-muted">·</span>
          {echt.length} ingepland
          <span className="mx-2 text-muted">·</span>
          {backlog.length} in de voorraad
          {eerstvolgende && (
            <>
              <span className="mx-2 text-muted">·</span>
              volgende publicatie {formatDagNL(eerstvolgende)}
            </>
          )}
        </span>
        {/* Besluit 18: opnieuw opzetten raakt het hele jaar, dus alleen de
            beheerder. De klant ziet de knop niet, want hij zou een 403 geven. */}
        {staff && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setOpnieuwDialog(true)}
            disabled={busy === "plan"}
          >
            Opnieuw opzetten
          </button>
        )}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
        {/* ── Links: de voorraad ─────────────────────────────────────────── */}
        <div
          className="flex flex-col gap-4 lg:sticky lg:top-4"
          onDragOver={(e) => {
            if (sleep?.uitMaand) {
              e.preventDefault();
              setSleepDoel("voorraad");
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setSleepDoel(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setSleepDoel(null);
            if (sleep?.uitMaand) void naarVoorraad(sleep.pageId, sleep.titel);
            setSleep(null);
          }}
        >
          <section
            className="card flex flex-col overflow-hidden"
            style={{
              padding: 0,
              maxHeight: "calc(100vh - 8rem)",
              ...(sleepDoel === "voorraad"
                ? { borderColor: "var(--intent-intelligence-border)", background: "var(--intent-intelligence-surface)" }
                : {}),
            }}
          >
            <div className="flex flex-col gap-2 px-4 pb-3 pt-4">
              <div className="flex items-baseline justify-between gap-2">
                {/* ⚠️ NIET `text-base`. In dit project maakt `--color-base` van `text-base`
                    een KLEURklasse (`color: var(--bg-base)`), en dan staat de kop in de
                    donkere stand bijna onzichtbaar in de kleur van de paginagrond. De
                    typografie loopt via de `type-`-klassen uit `app/globals.css`. */}
                <h2 className="type-body-emphasis">Beschikbaar</h2>
                <span className="mono-label text-muted">
                  {zichtbareVoorraad.length === backlog.length
                    ? `${backlog.length}`
                    : `${zichtbareVoorraad.length} van ${backlog.length}`}
                </span>
              </div>

              {backlog.length > 0 && (
                <>
                  <input
                    className="field"
                    style={{ height: 34, fontSize: "0.875rem" }}
                    value={filters.zoek}
                    onChange={(e) => setFilters((f) => ({ ...f, zoek: e.target.value }))}
                    placeholder="Zoeken"
                    aria-label="Zoek in de voorraad"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {clusters.length > 1 && (
                      <select
                        className="field"
                        style={{ height: 30, width: "auto", fontSize: "0.8125rem", paddingRight: 28 }}
                        value={filters.cluster}
                        onChange={(e) => setFilters((f) => ({ ...f, cluster: e.target.value }))}
                        aria-label="Filter op cluster"
                      >
                        <option value="">Alle clusters</option>
                        {clusters.map((c) => (
                          <option key={c.naam} value={c.naam}>
                            {c.naam} ({c.aantal})
                          </option>
                        ))}
                      </select>
                    )}
                    <Segment
                      actief={filters.handeling === ""}
                      onClick={() => setFilters((f) => ({ ...f, handeling: "" }))}
                    >
                      Alles
                    </Segment>
                    <Segment
                      actief={filters.handeling === "nieuw"}
                      onClick={() => setFilters((f) => ({ ...f, handeling: "nieuw" }))}
                    >
                      Nieuw
                    </Segment>
                    <Segment
                      actief={filters.handeling === "verbeteren"}
                      onClick={() => setFilters((f) => ({ ...f, handeling: "verbeteren" }))}
                    >
                      Verbeteren
                    </Segment>
                  </div>
                </>
              )}
            </div>

            {backlog.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-secondary">
                ORBIT ENGINE vult deze lijst met kansen uit je metingen. Zolang er geen cluster
                gemeten is, is er niets om op te schrijven.
              </p>
            ) : zichtbareVoorraad.length === 0 ? (
              <div className="flex flex-col items-start gap-1 px-4 pb-4">
                <span className="text-sm text-secondary">Niets in deze selectie.</span>
                <button
                  type="button"
                  className="text-sm text-secondary hover:underline"
                  onClick={() => setFilters(LEGE_BACKLOG_FILTERS)}
                >
                  Toon alle {backlog.length} kansen
                </button>
              </div>
            ) : (
              <ul className="flex-1 overflow-y-auto">
                {zichtbareVoorraad.map((item) => (
                  <BacklogRij
                    key={item.id}
                    item={item}
                    maanden={maandKeuzes}
                    busy={busy === item.id}
                    open={uitgeklapt[item.id] ?? false}
                    onToggle={() =>
                      setUitgeklapt((u) => ({ ...u, [item.id]: !(u[item.id] ?? false) }))
                    }
                    onSleepStart={() =>
                      setSleep({ pageId: item.id, titel: item.title, uitMaand: null })
                    }
                    onSleepEinde={() => {
                      setSleep(null);
                      setSleepDoel(null);
                    }}
                    onKies={(maandId) => void inplannen(item.id, item.title, maandId, null)}
                    onVerwijder={() => setRemoveKans(item)}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* ── Wat de voorraad kan laten groeien ─────────────────────────── */}
          {ongemeten.length > 0 && (
            <section className="flex flex-col gap-2">
              <span className="mono-label text-muted">Nog niet gemeten</span>
              <p className="text-sm text-secondary">
                {ongemeten.length === 1
                  ? "Dit cluster levert nog geen kansen op."
                  : `Deze ${ongemeten.length} clusters leveren nog geen kansen op.`}
              </p>
              <ul className="flex flex-col">
                {ongemeten.map((c) => (
                  <li
                    key={c.topicId}
                    className="flex items-center justify-between gap-3 border-t py-2 text-sm"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <span className="min-w-0 truncate text-secondary">{c.title}</span>
                    {c.loopt ? (
                      <span className="shrink-0 text-xs text-muted">meting loopt</span>
                    ) : (
                      <Link
                        href={
                          c.analysisId
                            ? `/analyses/${c.analysisId}`
                            : `/merk/${profileId}/strategie/clusters`
                        }
                        className="shrink-0 text-xs text-secondary hover:underline"
                      >
                        Meten
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ── Rechts: de twaalf maanden ──────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {maanden.map(({ month, inhoud, gedeeld, kalender, lopend, voorbij }) => {
            const meta = MONTH_STATUS_META[month.status];
            // Een lege maand die niet loopt, begint dicht: twaalf lege
            // dropzones onder elkaar zijn twaalf keer dezelfde uitnodiging.
            const open = !(dicht[month.id] ?? (inhoud.length === 0 && !lopend));
            const overVol = inhoud.length > plan.pages_per_month;
            const isDoel = sleepDoel === month.id;
            // ⚠️ Een lege, dichtgeklapte maand krijgt géén kaartrand. Er staan er
            // tien onder elkaar zodra een plan net begint, en tien even zware
            // kaders met alleen het woord "leeg" erin vullen het halve scherm met
            // niets. Ze blijven wel een sleepdoel, en zodra je iets boven ze
            // houdt licht de rand alsnog op.
            const stil = inhoud.length === 0 && !open && !isDoel;
            return (
              <section
                key={month.id}
                className={stil ? "overflow-hidden" : "card overflow-hidden transition-colors"}
                style={{
                  padding: 0,
                  ...(isDoel
                    ? {
                        borderColor: "var(--intent-intelligence-border)",
                        boxShadow: "0 0 0 1px var(--intent-intelligence-border)",
                      }
                    : {}),
                }}
                onDragOver={(e) => {
                  if (!sleep) return;
                  e.preventDefault();
                  setSleepDoel(month.id);
                }}
                onDragLeave={(e) => {
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
                {/* ── De maandkop, op een eigen vlak ───────────────────── */}
                <div
                  className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 ${
                    stil ? "py-1.5" : "py-2.5"
                  }`}
                  style={{
                    background: isDoel
                      ? "var(--intent-intelligence-surface)"
                      : stil
                        ? "transparent"
                        : "var(--bg-muted)",
                  }}
                >
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setDicht((d) => ({ ...d, [month.id]: open }))}
                      className="flex items-center gap-2 text-sm font-semibold hover:underline"
                    >
                      <Icon naam={open ? "openen" : "verder"} size={13} />
                      {/* Besluit 7: "maand 4 sinds de start", nooit "van 12". */}
                      Maand {month.month_number}
                    </button>
                    {kalender && <span className="mono-label text-muted">{kalender}</span>}
                    {lopend && <span className="chip chip-info">Deze maand</span>}
                    {/* ⚠️ Bij een lege, dichtgeklapte maand geen chip. "Concept"
                        was daar het zwaarste element van de regel terwijl het
                        niets toevoegde: dat de maand leeg is, staat er al. */}
                    {!stil && (
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
                    )}
                    <span className="text-xs text-muted">
                      {inhoud.length === 0
                        ? "leeg"
                        : `${inhoud.length} ${inhoud.length === 1 ? "pagina" : "pagina's"}`}
                    </span>
                    {/* Besluit: geen grens aan het aantal per maand. Het scherm
                        zegt wél wanneer je erboven zit, want een maand die
                        stilzwijgend het dubbele schrijft is een rekening die de
                        klant niet zag aankomen. */}
                    {overVol && (
                      <span className="chip chip-warning">
                        {inhoud.length - plan.pages_per_month} boven pakket
                      </span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {inhoud.some((p) => p.status === "goedgekeurd") && (
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => setBulkDialog(month)}
                        disabled={busy === month.id}
                      >
                        Alles geplaatst
                      </button>
                    )}
                    {month.status !== "goedgekeurd" &&
                      inhoud.length > 0 &&
                      (staff ? (
                        // ⚠️ Alleen de maand die aan de beurt is, krijgt de zware
                        // knop. Stonden er twee even witte knoppen onder elkaar,
                        // dan trok een maand die pas over een halfjaar speelt
                        // evenveel aandacht als de maand van deze week.
                        <button
                          type="button"
                          className={
                            month.status === "ter_goedkeuring" || lopend
                              ? "btn-primary btn-sm"
                              : "btn-ghost btn-sm"
                          }
                          onClick={() => setMonthDialog(month)}
                          disabled={busy === month.id}
                        >
                          Vrijgeven
                        </button>
                      ) : (
                        // Besluit 18. De klant ziet wél dat er iets van hem
                        // gevraagd wordt, en bij wie hij daarvoor moet zijn.
                        <span className="text-xs text-secondary">
                          Je consultant geeft deze maand vrij
                        </span>
                      ))}
                  </div>
                </div>

                {/* ⚠️ Eén keer per maand in plaats van tien keer per regel. */}
                {open && gedeeld && (
                  <p
                    className="border-t px-4 py-2 text-xs"
                    style={{
                      borderColor: "var(--border-subtle)",
                      color: "var(--intent-warning-text)",
                    }}
                  >
                    {gedeeld}
                  </p>
                )}

                {open &&
                  (inhoud.length === 0 ? (
                    <p
                      className="border-t px-4 py-5 text-center text-xs text-muted"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      Sleep hier een kans uit de voorraad naartoe
                    </p>
                  ) : (
                    <ul>
                      {inhoud.map((page, index) => (
                        <PageRij
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
                            page.funnel_stage_id ? (funnelNaam.get(page.funnel_stage_id) ?? null) : null
                          }
                          blokkade={blokkade(page)}
                          gedeeld={gedeeld}
                          kanOmhoog={canMove(inhoud, page.id, "omhoog")}
                          kanOmlaag={canMove(inhoud, page.id, "omlaag")}
                          onMove={(richting) => void verplaats(page, richting)}
                          busy={busy === page.id}
                          maanden={maandKeuzes}
                          huidigeMaand={month.id}
                          onSleepStart={() =>
                            setSleep({ pageId: page.id, titel: page.title, uitMaand: month.id })
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
                          onKies={(maandId) => void inplannen(page.id, page.title, maandId, null)}
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

      {/* ── Definitief verwijderen, uit een maand of uit de voorraad ─────
          Iets anders dan terugleggen, en het scherm zegt dat verschil hardop:
          teruggelegd kun je morgen alsnog inplannen, verwijderd niet. */}
      <ConfirmDialog
        open={removeDialog !== null || removeKans !== null}
        title="Definitief verwijderen"
        body={`"${removeDialog?.title ?? removeKans?.title ?? ""}" verdwijnt uit het plan én uit de voorraad.${
          removeDialog ? ' Wil je hem alleen uit deze maand halen, kies dan "terug naar de voorraad".' : ""
        }`}
        irreversible={{
          title: "Dit kun je niet terugdraaien",
          description:
            "Deze kans komt niet vanzelf terug, ook niet als het cluster opnieuw gemeten wordt.",
        }}
        confirmLabel="Definitief verwijderen"
        confirmingLabel="Bezig…"
        danger
        busy={busy === (removeDialog?.id ?? removeKans?.id)}
        onCancel={() => {
          setRemoveDialog(null);
          setRemoveKans(null);
        }}
        onConfirm={() => {
          const doel = removeDialog ?? removeKans;
          if (doel) void paginaActie(doel, "afwijzen");
        }}
      />

      {/* ── Alles van een maand als geplaatst markeren ──────────────────── */}
      <ConfirmDialog
        open={bulkDialog !== null}
        title="Markeer alles als geplaatst"
        body={`Je markeert ${
          echt.filter((p) => p.plan_month_id === bulkDialog?.id && p.status === "goedgekeurd").length
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

/**
 * Het menu achter de drie puntjes.
 *
 * ── WAAROM DIT GEEN KEUZELIJST MEER IS ──────────────────────────────────────
 *
 * Er stond een `<select class="field">` op elke regel: 40 pixels hoog, volle
 * breedte, met de dikkere veldrand. Bij tien regels onder elkaar waren dat tien
 * grijze balken die zwaarder in beeld stonden dan de titels ernaast, terwijl je
 * ze bijna nooit gebruikt. Een menu kost één klik meer en negen regels ruis
 * minder.
 *
 * ⚠️ Het blijft de toegankelijke weg naast slepen (`lib/plan-order.ts`): echte
 * knoppen, bereikbaar met tab, sluitend met Escape. Slepen is de snelle weg voor
 * wie een muis heeft, dit is de weg die overal werkt.
 */
function RijMenu({
  label,
  busy,
  children,
}: {
  label: string;
  busy: boolean;
  children: (sluit: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function buiten(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", toets);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={wrap}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        className="rounded-[var(--radius-md)] p-1.5 text-muted transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
      >
        <Icon naam="meer" size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 flex max-h-80 w-60 flex-col overflow-y-auto rounded-[var(--radius-md)] py-1"
          style={{
            background: "var(--bg-surface)",
            border: "var(--border-width-xs) solid var(--border-subtle)",
            boxShadow: "var(--shadow-overlay)",
          }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuKnop({
  onClick,
  danger = false,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-[var(--bg-muted)]"
      style={danger ? { color: "var(--intent-danger-text)" } : undefined}
    >
      {children}
    </button>
  );
}

function MenuKop({ children }: { children: React.ReactNode }) {
  return <span className="mono-label px-3 pb-1 pt-2 text-muted">{children}</span>;
}

function MenuScheiding() {
  return <span className="my-1 border-t" style={{ borderColor: "var(--border-subtle)" }} />;
}

/** Eén kans in de voorraad: titel, herkomst en cijfer, meer niet. */
function BacklogRij({
  item,
  maanden,
  busy,
  open,
  onToggle,
  onSleepStart,
  onSleepEinde,
  onKies,
  onVerwijder,
}: {
  item: BacklogItem;
  maanden: MaandKeuze[];
  busy: boolean;
  open: boolean;
  onToggle: () => void;
  onSleepStart: () => void;
  onSleepEinde: () => void;
  onKies: (maandId: string) => void;
  onVerwijder: () => void;
}) {
  const potentie = potentieLabel(item);
  const raakt = raaktLabel(item);

  return (
    <li
      className="group flex cursor-grab items-start gap-2 border-t px-4 py-2.5 transition-colors hover:bg-[var(--bg-muted)] active:cursor-grabbing"
      style={{ borderColor: "var(--border-subtle)", ...(busy ? { opacity: 0.5 } : {}) }}
      draggable={!busy}
      onDragStart={onSleepStart}
      onDragEnd={onSleepEinde}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="text-left text-sm font-medium leading-snug hover:underline"
        >
          {item.title}
        </button>
        {/* Eén meta-regel in plaats van drie chips: de herkomst, wat het
            oplevert en wat voor werk het is. Conventie 3: bij een onbekende
            potentie staat er geen getal, ook geen nul. */}
        <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
          {item.cluster && <span className="truncate">{item.cluster}</span>}
          {item.cluster && potentie && <span>·</span>}
          {potentie && <span>{potentie}</span>}
          <span>·</span>
          <span>{item.handeling === "verbeteren" ? "verbeteren" : "nieuw"}</span>
        </span>
        {open && (
          <div className="flex flex-col gap-1 pt-1">
            {raakt && <span className="text-xs text-secondary">{raakt}</span>}
            {item.why && (
              <p className="text-xs text-secondary" style={{ lineHeight: 1.5 }}>
                {item.why}
              </p>
            )}
            {item.existingUrl && (
              <span className="truncate text-xs text-muted" title={item.existingUrl}>
                {item.existingUrl}
              </span>
            )}
          </div>
        )}
      </div>

      <RijMenu label={`Wat wil je met "${item.title}" doen?`} busy={busy}>
        {(sluit) => (
          <>
            <MenuKop>Plan in</MenuKop>
            {maanden.map((m) => (
              <MenuKnop
                key={m.id}
                onClick={() => {
                  sluit();
                  onKies(m.id);
                }}
              >
                {m.label}
                {m.voorbij ? " (voorbij)" : ""}
              </MenuKnop>
            ))}
            <MenuScheiding />
            <MenuKnop
              danger
              onClick={() => {
                sluit();
                onVerwijder();
              }}
            >
              Definitief verwijderen
            </MenuKnop>
          </>
        )}
      </RijMenu>
    </li>
  );
}

function Segment({
  actief,
  onClick,
  children,
}: {
  actief: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actief}
      className="rounded-[var(--radius-md)] border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--wash-hover)]"
      style={{
        borderColor: actief ? "var(--intent-intelligence-border)" : "var(--border-subtle)",
        background: actief ? "var(--intent-intelligence-surface)" : undefined,
        color: actief ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

/**
 * Eén ingeplande pagina, als platte rij.
 *
 * In de normale gang van zaken is dat ÉÉN regel: greep, titel, funnelfase,
 * datum, menu. Alles wat daar bij komt, komt er alleen bij als het iets zegt:
 * een statuschip zodra de regel niet meer gewoon staat te wachten, een reden
 * zodra die van de rest van de maand afwijkt, en een knop zodra er iets van de
 * klant gevraagd wordt.
 */
function PageRij({
  page,
  profileId,
  href,
  funnel,
  blokkade,
  gedeeld,
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
  blokkade: { text: string; whoseTurn: "klant" | "orbit_engine" | null } | null;
  /** De melding die de hele maand al draagt. Die staat boven, niet hier. */
  gedeeld: string | null;
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
  const magVerhuizen = page.status === "gepland";
  // ⚠️ Alleen de reden die AFWIJKT van de maand. Staat hij al boven de maand,
  // dan is hij hier ruis (zie `sharedNotice()`).
  const eigenBlokkade = blokkade && blokkade.text !== gedeeld ? blokkade : null;
  // Bij `gepland` zegt de datum alles; de chip zei daar tien keer per maand
  // hetzelfde. Bij elke andere status draagt de chip wél iets.
  const toonStatus = page.status !== "gepland";
  // ⚠️ Twee dingen die hetzelfde zeggen, naast elkaar op één regel: de chip
  // "Tekst klaar voor akkoord" stond naast de zin "Publiceert zodra je akkoord
  // geeft". Waar de chip het antwoord al draagt, blijft alleen de chip staan; de
  // datum verschijnt alleen als hij een échte datum is.
  const datum =
    page.status === "gepland" && page.scheduled_for
      ? formatDagNL(page.scheduled_for)
      : page.status === "schrijven" || page.status === "geplaatst"
        ? planRunningDate(page)
        : null;
  // Er is één pad waarbij een pagina om akkoord vraagt zonder gekoppelde tekst:
  // schreef de pijplijn eerder al iets met dezelfde titel, dan zet de cron alleen
  // de status om (`alreadyDone` in `app/api/cron/plan/route.ts`).
  const losseTekst = href === null && page.status === "ter_goedkeuring";

  return (
    <li
      className="group flex items-center gap-2.5 border-t px-4 py-2 transition-colors hover:bg-[var(--bg-muted)]"
      style={{ borderColor: "var(--border-subtle)", ...(busy ? { opacity: 0.5 } : {}) }}
      draggable={magVerhuizen && !busy}
      onDragStart={onSleepStart}
      onDragEnd={onSleepEinde}
      onDrop={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onDropHier();
      }}
    >
      {/* De greep verschijnt pas bij aanwijzen: op elke regel een altijd
          zichtbaar sleepteken is twaalf keer een teken dat niets doet. */}
      <span
        className="shrink-0 cursor-grab text-muted opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      >
        <Icon naam="versleep" size={14} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-baseline gap-x-2">
          {href ? (
            <Link href={href} className="truncate text-sm font-medium hover:underline">
              {page.title}
            </Link>
          ) : (
            <span className="truncate text-sm font-medium">{page.title}</span>
          )}
          {/* De funnelfase mag wegvallen als de titel de ruimte nodig heeft: hij
              is context, geen inhoud. `hidden sm:inline` in plaats van afkappen. */}
          {funnel && <span className="hidden shrink-0 text-xs text-muted sm:inline">{funnel}</span>}
        </div>
        {eigenBlokkade && (
          <span
            className="text-xs"
            style={{
              color:
                eigenBlokkade.whoseTurn === "klant"
                  ? "var(--intent-warning-text)"
                  : "var(--text-secondary)",
            }}
          >
            {eigenBlokkade.text}
          </span>
        )}
        {losseTekst && (
          <span className="text-xs text-secondary">
            De tekst hangt niet aan deze regel.{" "}
            <Link href={`/merk/${profileId}/strategie/bibliotheek`} className="hover:underline">
              Zoek hem in de bibliotheek
            </Link>
          </span>
        )}
      </div>

      {datum && <span className="shrink-0 text-xs text-muted">{datum}</span>}

      {toonStatus && (
        <span
          className={
            meta.tone === "wacht"
              ? "chip chip-warning shrink-0"
              : meta.tone === "klaar"
                ? "chip chip-success shrink-0"
                : meta.tone === "fout"
                  ? "chip chip-danger shrink-0"
                  : "chip chip-neutral shrink-0"
          }
        >
          {meta.label}
        </span>
      )}

      {/* De twee handelingen die om de klant vragen, blijven zichtbaar: dit is
          waar het scherm voor bestaat. */}
      {page.status === "ter_goedkeuring" && href && (
        <Link href={href} className="btn-ghost btn-sm shrink-0">
          Lezen
        </Link>
      )}
      {page.status === "ter_goedkeuring" && (
        <button
          type="button"
          className="btn-primary btn-sm shrink-0"
          onClick={onApprove}
          disabled={busy}
        >
          Goedkeuren
        </button>
      )}
      {page.status === "goedgekeurd" && (
        <button
          type="button"
          className="btn-primary btn-sm shrink-0"
          onClick={onPost}
          disabled={busy}
        >
          Geplaatst
        </button>
      )}

      {(magVerhuizen || page.status === "ter_goedkeuring") && (
        <RijMenu label={`Wat wil je met "${page.title}" doen?`} busy={busy}>
          {(sluit) => (
            <>
              {magVerhuizen && (kanOmhoog || kanOmlaag) && (
                <>
                  {kanOmhoog && (
                    <MenuKnop
                      onClick={() => {
                        sluit();
                        onMove("omhoog");
                      }}
                    >
                      Een plek eerder
                    </MenuKnop>
                  )}
                  {kanOmlaag && (
                    <MenuKnop
                      onClick={() => {
                        sluit();
                        onMove("omlaag");
                      }}
                    >
                      Een plek later
                    </MenuKnop>
                  )}
                  <MenuScheiding />
                </>
              )}
              {magVerhuizen && (
                <>
                  <MenuKop>Verplaats naar</MenuKop>
                  {maanden
                    .filter((m) => m.id !== huidigeMaand)
                    .map((m) => (
                      <MenuKnop
                        key={m.id}
                        onClick={() => {
                          sluit();
                          onKies(m.id);
                        }}
                      >
                        {m.label}
                        {m.voorbij ? " (voorbij)" : ""}
                      </MenuKnop>
                    ))}
                  <MenuScheiding />
                  <MenuKnop
                    onClick={() => {
                      sluit();
                      onNaarVoorraad();
                    }}
                  >
                    Terug naar de voorraad
                  </MenuKnop>
                </>
              )}
              <MenuKnop
                danger
                onClick={() => {
                  sluit();
                  onRemove();
                }}
              >
                Definitief verwijderen
              </MenuKnop>
            </>
          )}
        </RijMenu>
      )}
    </li>
  );
}
