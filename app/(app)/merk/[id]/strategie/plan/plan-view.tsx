"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  MONTH_STATUS_META,
  PLAN_STATUS_META,
  countActionRequired,
  planRunningDate,
} from "@/lib/plan-status";
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
 * Het contentplan: twaalf maanden, per maand goed te keuren.
 *
 * ── DE INDELING KOMT VAN NOVA, DE TAAL NIET ─────────────────────────────────
 *
 * Nova groepeert per maand met een segmentfilter erboven ("Awaiting your
 * approval", "Approved") en dat is hier overgenomen: bij 132 rijen is een platte
 * lijst onbruikbaar, en de vraag die iemand heeft is bijna altijd "wat moet ik
 * nú".
 *
 * Wat NIET is overgenomen is hun teller. Bij hen staat overal "contract month 4
 * of 12"; hier is het "maand 4 sinds de start" (besluit 7: doorlopend
 * opzegbaar). Een teller die zegt hoeveel je nog tegoed hebt suggereert een
 * contract dat er niet is.
 */
type Filter = "actie" | "alles" | "gepland" | "live";

export function PlanView({
  profileId,
  plan,
  months,
  pages,
  funnels,
  topics,
  staff,
}: {
  profileId: string;
  plan: ContentPlan;
  months: PlanMonth[];
  pages: PlannedPage[];
  funnels: FunnelStage[];
  topics: TopicWritingState[];
  /** Besluit 18: alleen de beheerder zet betaald werk in gang. */
  staff: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("actie");
  const [busy, setBusy] = useState<string | null>(null);
  const [postDialog, setPostDialog] = useState<PlannedPage | null>(null);
  const [postUrl, setPostUrl] = useState("");
  const [monthDialog, setMonthDialog] = useState<PlanMonth | null>(null);
  const [bulkDialog, setBulkDialog] = useState<PlanMonth | null>(null);

  const funnelNaam = useMemo(
    () => new Map(funnels.map((f) => [f.id, f.label])),
    [funnels],
  );

  const maandVan = useMemo(() => new Map(months.map((m) => [m.id, m])), [months]);
  const onderwerp = useMemo(
    () => new Map(topics.map((t) => [t.topicId, t])),
    [topics],
  );

  /**
   * Waarom staat deze pagina stil?
   *
   * Alleen voor pagina's die nog niets gedaan hebben; bij een geschreven pagina
   * is de status zelf het antwoord. `writeBlockNotice()` geeft `null` terug voor
   * de blokkades die géén probleem zijn (nog niet aan de beurt), zodat er geen
   * melding staat bij iets wat gewoon goed gaat.
   */
  function blokkade(page: PlannedPage) {
    if (page.status !== "gepland") return null;
    const maand = maandVan.get(page.plan_month_id);
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

  // Buffers horen niet in de lijst: ze zijn reserve, geen belofte. Ze tellen
  // ook niet mee in het maandtotaal dat de klant afneemt.
  const echt = useMemo(() => pages.filter((p) => !p.is_buffer), [pages]);
  const teDoen = countActionRequired(echt);

  const zichtbaar = useMemo(() => {
    if (filter === "alles") return echt;
    if (filter === "actie")
      return echt.filter((p) => PLAN_STATUS_META[p.status].actionRequired);
    if (filter === "live") return echt.filter((p) => p.status === "geplaatst");
    return echt.filter((p) => p.status === "gepland" || p.status === "schrijven");
  }, [echt, filter]);

  async function paginaActie(
    page: PlannedPage,
    actie: "goedkeuren" | "afwijzen" | "geplaatst",
    url?: string,
  ) {
    setBusy(page.id);
    try {
      const res = await fetch(
        `/api/profiles/${profileId}/plan/pages/${page.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actie, url }),
        },
      );
      const j = (await res.json().catch(() => null)) as
        | { error?: string; bufferUsed?: boolean }
        | null;
      if (!res.ok) {
        toast({
          intent: "fout",
          title: "Dat lukte niet",
          description: j?.error ?? "Probeer het opnieuw.",
        });
        return;
      }
      toast({
        intent: "succes",
        title:
          actie === "goedkeuren"
            ? "Goedgekeurd"
            : actie === "geplaatst"
              ? "Gemarkeerd als geplaatst"
              : "Uit het plan gehaald",
        description:
          actie === "afwijzen"
            ? j?.bufferUsed
              ? "Een reservepagina van dezelfde maand is ervoor in de plaats gekomen."
              : "Er was geen reserve meer voor deze maand, dus het maandtotaal is één lager."
            : `"${page.title}"`,
      });
      router.refresh();
    } finally {
      setBusy(null);
      setPostDialog(null);
      setPostUrl("");
    }
  }

  /**
   * Een pagina een plek omhoog of omlaag binnen zijn maand.
   *
   * Bewust knoppen en geen slepen: HTML5-drag werkt niet op een telefoon, en de
   * eerste klacht van dit traject ging over mobiel. Zie `lib/plan-order.ts`.
   */
  async function verplaats(page: PlannedPage, richting: "omhoog" | "omlaag") {
    setBusy(page.id);
    try {
      const res = await fetch(`/api/profiles/${profileId}/plan/pages/${page.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actie: "verplaats", richting }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        toast({
          intent: "fout",
          title: "Verplaatsen lukte niet",
          description: j?.error ?? "Probeer het opnieuw.",
        });
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function maandActie(month: PlanMonth, actie: "goedkeuren" | "afwijzen") {
    setBusy(month.id);
    try {
      const res = await fetch(
        `/api/profiles/${profileId}/plan/months/${month.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actie }),
        },
      );
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
            ? `Maand ${month.month_number} goedgekeurd`
            : `Maand ${month.month_number} afgewezen`,
        description:
          actie === "goedkeuren"
            ? "ORBIT ENGINE begint tien dagen voor elke publicatiedatum met schrijven."
            : "ORBIT ENGINE stelt een nieuw voorstel op voor deze maand.",
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
   * ── WAAROM DE MELDING VAN DE SERVER KOMT ──────────────────────────────────
   *
   * Kwaliteitslat K5: een bulkactie is eerlijk over gedeeltelijk succes. Alleen
   * de server weet welke pagina's het haalden en welke niet, dus stelt die de
   * melding samen (`lib/plan-bulk.ts`, getest). Dit scherm toont hem en verzint
   * er niets bij: "gelukt" tonen terwijl er twee bleven staan is precies de
   * fout die K5 moet voorkomen.
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

  return (
    <div className="flex flex-col gap-6">
      {/* ── De kop ────────────────────────────────────────────────────────
          Nova's overzicht opent met een mededeling en niet met een titel
          ("NOVA schrijft je content"). Dat werkt: het zegt wat er gebeurt in
          plaats van hoe het scherm heet. */}
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="mono-label">
            {plan.pages_per_month} pagina&apos;s per maand · plan {plan.version}
          </span>
          <p className="text-secondary">
            {teDoen === 0
              ? "Er wacht niets op jou. ORBIT ENGINE werkt het plan af."
              : teDoen === 1
                ? "Er wacht 1 pagina op jou."
                : `Er wachten ${teDoen} pagina's op jou.`}
          </p>
        </div>
      </div>

      {/* ── Segmenten ─────────────────────────────────────────────────────
          Nova's `strategy.segments`. Vier standen, en "wat moet ik nu" staat
          vooraan omdat dat de vraag is waarmee iemand inlogt. */}
      <nav className="flex flex-wrap gap-2" aria-label="Filter">
        <Segment actief={filter === "actie"} onClick={() => setFilter("actie")}>
          Wacht op jou {teDoen > 0 && <span className="chip chip-warning">{teDoen}</span>}
        </Segment>
        <Segment actief={filter === "gepland"} onClick={() => setFilter("gepland")}>
          Staat gepland
        </Segment>
        <Segment actief={filter === "live"} onClick={() => setFilter("live")}>
          Staat live
        </Segment>
        <Segment actief={filter === "alles"} onClick={() => setFilter("alles")}>
          Alles ({echt.length})
        </Segment>
      </nav>

      {zichtbaar.length === 0 ? (
        <div className="card flex flex-col gap-1">
          <span className="mono-label">Niets te zien hier</span>
          <p className="text-secondary">
            {filter === "actie"
              ? "Er wacht op dit moment niets op jou. Zodra ORBIT ENGINE een pagina heeft geschreven, staat hij hier."
              : filter === "live"
                ? "Er staat nog niets live. Zodra je een pagina publiceert en hier afvinkt, verschijnt hij in deze lijst."
                : "Geen pagina's in deze selectie."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {months
            .filter((m) => zichtbaar.some((p) => p.plan_month_id === m.id))
            .map((month) => {
              const maandPaginas = zichtbaar.filter(
                (p) => p.plan_month_id === month.id,
              );
              // ⚠️ Verplaatsen rekent op de VOLLEDIGE maand en niet op wat er
              // door het filter heen komt. Staat het filter op "vraagt actie",
              // dan zijn de buren van een pagina meestal onzichtbaar, en een pijl
              // die rekent op de zichtbare lijst laat hem over die buren heen
              // springen, met de datum van de verkeerde pagina.
              const heleMaand = echt.filter((p) => p.plan_month_id === month.id);
              const meta = MONTH_STATUS_META[month.status];
              return (
                <section key={month.id} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-baseline gap-2">
                      {/* Besluit 7: "maand 4 sinds de start", nooit "van 12". */}
                      <h2 className="text-lg font-semibold tracking-tight">
                        Maand {month.month_number}
                      </h2>
                      <span className="mono-label text-muted">
                        {maandPaginas.length} pagina&apos;s
                      </span>
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
                      {/* Bulkactie (17 augustus 2026). Alleen zichtbaar als er
                          iets te markeren valt: een knop die altijd staat maar
                          meestal niets doet leert de klant hem te negeren.
                          Besluit 8: zowel de klant als de beheerder mag dit,
                          dus geen `staff`-voorwaarde. */}
                      {heleMaand.some((p) => !p.is_buffer && p.status === "goedgekeurd") && (
                        <button
                          type="button"
                          className="btn-outline btn-sm"
                          onClick={() => setBulkDialog(month)}
                          disabled={busy === month.id}
                        >
                          Markeer alles als geplaatst
                        </button>
                      )}

                      {month.status === "ter_goedkeuring" &&
                        (staff ? (
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            onClick={() => setMonthDialog(month)}
                            disabled={busy === month.id}
                          >
                            Deze maand goedkeuren
                          </button>
                        ) : (
                          // Besluit 18. De klant ziet wél dat er iets van hem
                          // gevraagd wordt, en bij wie hij daarvoor moet zijn.
                          <span className="text-sm text-secondary">
                            Loop deze maand door en geef je consultant akkoord
                          </span>
                        ))}
                    </span>
                  </div>

                  <ul className="flex flex-col gap-2">
                    {maandPaginas.map((page) => (
                      <PageRow
                        key={page.id}
                        page={page}
                        funnel={
                          page.funnel_stage_id
                            ? (funnelNaam.get(page.funnel_stage_id) ?? null)
                            : null
                        }
                        blokkade={blokkade(page)}
                        kanOmhoog={canMove(heleMaand, page.id, "omhoog")}
                        kanOmlaag={canMove(heleMaand, page.id, "omlaag")}
                        onMove={(richting) => void verplaats(page, richting)}
                        busy={busy === page.id}
                        onApprove={() => void paginaActie(page, "goedkeuren")}
                        onPost={() => {
                          setPostDialog(page);
                          setPostUrl(page.url_path ?? "");
                        }}
                        onRemove={() => void paginaActie(page, "afwijzen")}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
        </div>
      )}

      {/* ── Markeren als geplaatst ────────────────────────────────────────
          Nova zet hier een `cannotBeUndone`-blok bij, en terecht: dit legt vast
          dat de pagina live staat op dit adres. */}
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
        onConfirm={() =>
          postDialog && void paginaActie(postDialog, "geplaatst", postUrl)
        }
      >
        <input
          className="field"
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
          placeholder="/diensten/auto-financieren"
          aria-label="Het pad waar de pagina live staat"
        />
      </ConfirmDialog>

      {/* ── Alles van een maand als geplaatst markeren ──────────────────────
          K4: onomkeerbaar wordt vooraf benoemd, in een eigen blok. Het aantal
          staat in de vraag zelf, want "alles" is bij een bulkactie geen getal
          dat de klant paraat heeft. */}
      <ConfirmDialog
        open={bulkDialog !== null}
        title="Markeer alles als geplaatst"
        body={`Je markeert ${
          echt.filter(
            (p) => p.plan_month_id === bulkDialog?.id && p.status === "goedgekeurd",
          ).length
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

      {/* ── Maand goedkeuren ──────────────────────────────────────────────── */}
      <ConfirmDialog
        open={monthDialog !== null}
        title={`Maand ${monthDialog?.month_number ?? ""} goedkeuren`}
        body={`Je keurt ${echt.filter((p) => p.plan_month_id === monthDialog?.id).length} pagina's in één keer goed. ORBIT ENGINE begint tien dagen voor elke publicatiedatum met schrijven.`}
        irreversible={{
          title: "Dit zet het schrijven in gang",
          description:
            "Elke pagina die geschreven wordt kost geld. Wijs de maand af als de onderwerpen niet kloppen; ORBIT ENGINE maakt dan een nieuw voorstel.",
        }}
        confirmLabel="Goedkeuren"
        confirmingLabel="Bezig…"
        busy={busy === monthDialog?.id}
        onCancel={() => setMonthDialog(null)}
        onConfirm={() => monthDialog && void maandActie(monthDialog, "goedkeuren")}
      >
        <button
          type="button"
          className="w-fit text-sm text-secondary hover:underline"
          onClick={() => monthDialog && void maandActie(monthDialog, "afwijzen")}
          disabled={busy === monthDialog?.id}
        >
          Of wijs deze maand af, dan stelt ORBIT ENGINE iets nieuws voor
        </button>
      </ConfirmDialog>
    </div>
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
      className="flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors"
      style={{
        borderColor: actief ? "var(--intent-intelligence-border)" : "var(--border-subtle)",
        background: actief ? "var(--intent-intelligence-surface)" : "var(--bg-surface)",
        color: actief ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

/** Eén regel in het plan. De drie statuslagen staan er alle drie op. */
function PageRow({
  page,
  funnel,
  blokkade,
  kanOmhoog,
  kanOmlaag,
  onMove,
  busy,
  onApprove,
  onPost,
  onRemove,
}: {
  page: PlannedPage;
  funnel: string | null;
  /** Waarom ORBIT ENGINE deze pagina niet kan schrijven. `null` = er is niets aan de hand. */
  blokkade: { text: string; whoseTurn: "klant" | "orbit_engine" | null } | null;
  kanOmhoog: boolean;
  kanOmlaag: boolean;
  onMove: (richting: "omhoog" | "omlaag") => void;
  busy: boolean;
  onApprove: () => void;
  onPost: () => void;
  onRemove: () => void;
}) {
  const meta = PLAN_STATUS_META[page.status];
  const wanneer = planRunningDate(page);

  return (
    <li className="card flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-medium">{page.title}</span>
        <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="chip chip-neutral">{page.page_type}</span>
          {funnel && <span>{funnel}</span>}
          {wanneer && <span>· {wanneer}</span>}
        </span>
        {/* De reden staat ONDER de regel en niet als chip ernaast: het is een
            zin, geen etiket, en een zin die je moet lezen hoort op zijn eigen
            regel te staan. */}
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
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {/* Verplaatsen wisselt de plek én de publicatiedatum met de buurman:
            alleen de plek zou een lijst opleveren waarin de bovenste pagina
            later verschijnt dan de onderste, en dan is het geen agenda meer. */}
        {(kanOmhoog || kanOmlaag) && (
          <span className="flex items-center">
            <button
              type="button"
              className="rounded-[var(--radius-md)] px-2 py-1 text-secondary transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-40"
              onClick={() => onMove("omhoog")}
              disabled={busy || !kanOmhoog}
              aria-label={`"${page.title}" een plek eerder publiceren`}
            >
              <Icon naam="omhoog" size={14} />
            </button>
            <button
              type="button"
              className="rounded-[var(--radius-md)] px-2 py-1 text-secondary transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-40"
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

        {page.status === "ter_goedkeuring" && (
          <button type="button" className="btn-primary btn-sm" onClick={onApprove} disabled={busy}>
            Goedkeuren
          </button>
        )}
        {page.status === "goedgekeurd" && (
          <button type="button" className="btn-primary btn-sm" onClick={onPost} disabled={busy}>
            Ik heb hem geplaatst
          </button>
        )}
        {(page.status === "gepland" || page.status === "ter_goedkeuring") && (
          <button
            type="button"
            className="text-sm text-secondary hover:underline"
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
