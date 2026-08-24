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
import {
  contentHref,
  filterCounts,
  formatDagNL,
  isCurrentMonth,
  matchesFilter,
  monthCalendarLabel,
  nextPublication,
  openMonthIds,
  type PlanFilter,
} from "@/lib/plan-overview";
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
 * Het contentplan: twaalf maanden, per maand vrij te geven.
 *
 * ── DE INDELING KOMT VAN NOVA, DE TAAL NIET ─────────────────────────────────
 *
 * Nova groepeert per maand met een segmentfilter erboven ("Awaiting your
 * approval", "Approved") en dat is hier overgenomen: bij 120 rijen is een platte
 * lijst onbruikbaar, en de vraag die iemand heeft is bijna altijd "wat moet ik
 * nú".
 *
 * Wat NIET is overgenomen is hun teller. Bij hen staat overal "contract month 4
 * of 12"; hier is het "maand 4 sinds de start" (besluit 7: doorlopend
 * opzegbaar). Een teller die zegt hoeveel je nog tegoed hebt suggereert een
 * contract dat er niet is.
 *
 * ── WAT DE UX-REVIEW VAN 24 AUGUSTUS 2026 VERANDERDE ────────────────────────
 *
 * Zes dingen, en de eerste twee zijn de zwaarste:
 *
 *   1. **Je kon niet lezen wat je goedkeurde.** De rij toonde een knop
 *      "Goedkeuren" en nergens de geschreven tekst, terwijl de verwijzing er
 *      wél lag (`content_piece_id`) en het leesscherm ook bestond. De titel is
 *      nu een link, met `?van=plan` zodat de terugknop hierheen wijst.
 *   2. **Twee verschillende dingen heetten allebei "goedkeuren".** Een maand
 *      vrijgeven zet betaald schrijfwerk in gang; een tekst goedkeuren zegt dat
 *      hij gepubliceerd mag worden. Ze delen geen woord meer, want een groene
 *      maandchip "Goedgekeurd" met amberkleurige rijen "Wacht op jouw akkoord"
 *      eronder las als een tegenspraak.
 *   3. **De maandkop telde het filter en niet de maand** ("Maand 1 · 2
 *      pagina's" bij een plan van tien per maand). Nu staat het maandtotaal er,
 *      en het filterresultaat ernaast.
 *   4. **Twaalf koppen "Maand N" zonder kalender, en 120 kaarten van gelijk
 *      gewicht.** De maanden dragen nu hun echte kalendermaand en staan dicht,
 *      behalve de lopende en alles wat iets van de klant vraagt.
 *   5. **De kopkaart herhaalde het filter** en de tabbladen droegen geen
 *      aantal, dus "Staat live" was een leeg scherm dat je pas na een klik zag.
 *   6. **"Verwijderen" liep zonder één vraag door**, terwijl "markeer als
 *      geplaatst" een volledige bevestiging kreeg. De rem zat op de verkeerde
 *      knop.
 *
 * De rekenkunde erachter staat in `lib/plan-overview.ts`, puur en getest
 * (conventie 2).
 */

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
  const [filter, setFilter] = useState<PlanFilter>("actie");
  const [busy, setBusy] = useState<string | null>(null);
  const [postDialog, setPostDialog] = useState<PlannedPage | null>(null);
  const [postUrl, setPostUrl] = useState("");
  const [monthDialog, setMonthDialog] = useState<PlanMonth | null>(null);
  const [bulkDialog, setBulkDialog] = useState<PlanMonth | null>(null);
  const [removeDialog, setRemoveDialog] = useState<PlannedPage | null>(null);
  /**
   * Wat de klant zelf open- of dichtklapte, bovenop de standaard hieronder.
   * Een los overzicht in plaats van gesynchroniseerde state: de standaard mag
   * meebewegen met het filter zonder de klik van de klant te overschrijven.
   */
  const [handmatig, setHandmatig] = useState<Record<string, boolean>>({});

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
  const tellers = useMemo(() => filterCounts(echt), [echt]);
  const teDoen = tellers.actie;
  const volgende = useMemo(() => nextPublication(echt), [echt]);

  /**
   * Alles wat een maandkop moet weten, in één keer uitgerekend.
   *
   * ⚠️ `heleMaand` is de VOLLEDIGE maand en niet wat er door het filter komt.
   * Twee dingen hangen daaraan: de teller in de kop (die stond fout, zie punt 3
   * hierboven) en het verplaatsen (staat het filter op "wacht op jou", dan zijn
   * de buren van een pagina meestal onzichtbaar, en een pijl die rekent op de
   * zichtbare lijst laat hem over die buren heen springen, met de datum van de
   * verkeerde pagina).
   */
  const maanden = useMemo(
    () =>
      months.map((month) => {
        const heleMaand = echt.filter((p) => p.plan_month_id === month.id);
        const zichtbaar = heleMaand.filter((p) => matchesFilter(p, filter));
        return {
          month,
          heleMaand,
          zichtbaar,
          kalender: monthCalendarLabel(heleMaand),
          lopend: isCurrentMonth(heleMaand),
          vraagtActie: zichtbaar.some((p) => PLAN_STATUS_META[p.status].actionRequired),
        };
      }),
    [months, echt, filter],
  );

  const standaardOpen = useMemo(
    () =>
      new Set(
        openMonthIds(
          maanden.map((m) => ({
            id: m.month.id,
            zichtbaar: m.zichtbaar.length,
            vraagtActie: m.vraagtActie,
            isLopend: m.lopend,
          })),
        ),
      ),
    [maanden],
  );

  const metInhoud = maanden.filter((m) => m.zichtbaar.length > 0);

  function wisselFilter(nieuw: PlanFilter) {
    setFilter(nieuw);
    // Een ander filter is een andere vraag, dus de maanden gaan terug naar wat
    // bij díé vraag hoort. Anders blijft een maand dicht die de klant nu juist
    // zoekt, omdat hij hem twee filters geleden dichtklapte.
    setHandmatig({});
  }

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
            ? "Tekst goedgekeurd"
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
      setRemoveDialog(null);
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
            ? `Maand ${month.month_number} vrijgegeven`
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
      {/* ── De feiten van het plan ─────────────────────────────────────────
          Eén regel, geen kaart om één zin. Hiervoor stond hier "Er wachten 2
          pagina's op jou" terwijl het filter eronder óók al "2" zei, en de
          vragen die wél openstonden (hoeveel staat er in totaal, wanneer komt
          de eerstvolgende) werden nergens beantwoord. */}
      <div className="card flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="mono-label">
          {plan.pages_per_month} pagina&apos;s per maand · plan {plan.version}
        </span>
        <span className="text-sm text-secondary">
          {echt.length} pagina&apos;s in dit plan
          {volgende && ` · volgende publicatie ${formatDagNL(volgende)}`}
        </span>
      </div>

      {/* ── Segmenten ─────────────────────────────────────────────────────
          Nova's `strategy.segments`. Vier standen, en "wat moet ik nu" staat
          vooraan omdat dat de vraag is waarmee iemand inlogt. Alle vier dragen
          hun aantal: zonder getal is een leeg tabblad pas leeg ná de klik. */}
      <nav className="flex flex-wrap gap-2" aria-label="Filter">
        <Segment
          actief={filter === "actie"}
          aantal={tellers.actie}
          nadruk={tellers.actie > 0}
          onClick={() => wisselFilter("actie")}
        >
          Wacht op jou
        </Segment>
        <Segment
          actief={filter === "gepland"}
          aantal={tellers.gepland}
          onClick={() => wisselFilter("gepland")}
        >
          Staat gepland
        </Segment>
        <Segment
          actief={filter === "live"}
          aantal={tellers.live}
          onClick={() => wisselFilter("live")}
        >
          Staat live
        </Segment>
        <Segment
          actief={filter === "alles"}
          aantal={tellers.alles}
          onClick={() => wisselFilter("alles")}
        >
          Alles
        </Segment>
      </nav>

      {metInhoud.length === 0 ? (
        <div className="card flex flex-col gap-1">
          <span className="mono-label">Niets te zien hier</span>
          <p className="text-secondary">
            {filter === "actie"
              ? "Er wacht op dit moment niets op jou. Zodra ORBIT ENGINE een pagina heeft geschreven, staat hij hier."
              : filter === "live"
                ? "Er staat nog niets live. Zodra je een pagina publiceert en hier afvinkt, verschijnt hij in deze lijst."
                : "Geen pagina's in deze selectie."}
          </p>
          <button
            type="button"
            className="w-fit text-sm text-secondary hover:underline"
            onClick={() => wisselFilter("alles")}
          >
            Bekijk het hele plan ({tellers.alles} pagina&apos;s)
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {metInhoud.map(({ month, heleMaand, zichtbaar, kalender, lopend, vraagtActie }) => {
            const meta = MONTH_STATUS_META[month.status];
            const open = handmatig[month.id] ?? standaardOpen.has(month.id);
            const gefilterd = zichtbaar.length !== heleMaand.length;
            return (
              <section key={month.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex min-w-0 flex-wrap items-baseline gap-2">
                    {/* Besluit 7: "maand 4 sinds de start", nooit "van 12". De
                        kalendermaand ernaast komt uit de publicatiedata zelf
                        (`monthCalendarLabel`); het plan slaat hem niet op. */}
                    <h2 className="text-lg font-semibold">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() =>
                          setHandmatig((h) => ({ ...h, [month.id]: !open }))
                        }
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Icon naam={open ? "openen" : "verder"} size={14} />
                        Maand {month.month_number}
                      </button>
                    </h2>
                    {kalender && <span className="mono-label text-muted">{kalender}</span>}
                    {lopend && <span className="chip chip-info">Deze maand</span>}
                    {/* ⚠️ Het maandtotaal, niet het filterresultaat. */}
                    <span className="mono-label text-muted">
                      {heleMaand.length} pagina&apos;s
                      {gefilterd && ` · ${zichtbaar.length} in deze selectie`}
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
                    {!open && vraagtActie && (
                      <span className="chip chip-warning">Vraagt iets van jou</span>
                    )}
                  </span>

                  <span className="flex flex-wrap items-center gap-2">
                    {/* Bulkactie (17 augustus 2026). Alleen zichtbaar als er
                        iets te markeren valt: een knop die altijd staat maar
                        meestal niets doet leert de klant hem te negeren.
                        Besluit 8: zowel de klant als de beheerder mag dit,
                        dus geen `staff`-voorwaarde. */}
                    {heleMaand.some((p) => p.status === "goedgekeurd") && (
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
                          Maand vrijgeven
                        </button>
                      ) : (
                        // Besluit 18. De klant ziet wél dat er iets van hem
                        // gevraagd wordt, en bij wie hij daarvoor moet zijn.
                        <span className="text-sm text-secondary">
                          Loop deze maand door en laat je consultant hem vrijgeven
                        </span>
                      ))}
                  </span>
                </div>

                {open && (
                  <ul className="flex flex-col gap-2">
                    {zichtbaar.map((page) => (
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
                        kanOmhoog={canMove(heleMaand, page.id, "omhoog")}
                        kanOmlaag={canMove(heleMaand, page.id, "omlaag")}
                        onMove={(richting) => void verplaats(page, richting)}
                        busy={busy === page.id}
                        onApprove={() => void paginaActie(page, "goedkeuren")}
                        onPost={() => {
                          setPostDialog(page);
                          setPostUrl(page.url_path ?? "");
                        }}
                        onRemove={() => setRemoveDialog(page)}
                      />
                    ))}
                  </ul>
                )}
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

      {/* ── Een pagina uit het plan halen ──────────────────────────────────
          Stond hiervoor als kale tekstlink die meteen doorliep, náást een knop
          die wél een volledige bevestiging kreeg. De rem hoort op de handeling
          die iets weggooit, niet op de handeling die iets vastlegt. */}
      <ConfirmDialog
        open={removeDialog !== null}
        title="Uit het plan halen"
        body={`"${removeDialog?.title ?? ""}" verdwijnt uit het plan en ORBIT ENGINE schrijft hem niet.`}
        irreversible={{
          title: "Dit kun je niet terugdraaien",
          description:
            "Is er nog een reservepagina in deze maand, dan schuift die ervoor in de plaats. Zo niet, dan doet ORBIT ENGINE deze maand één pagina minder.",
        }}
        confirmLabel="Uit het plan halen"
        confirmingLabel="Bezig…"
        danger
        busy={busy === removeDialog?.id}
        onCancel={() => setRemoveDialog(null)}
        onConfirm={() => removeDialog && void paginaActie(removeDialog, "afwijzen")}
      />

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

      {/* ── Maand vrijgeven ────────────────────────────────────────────────
          Het EERSTE van de twee akkoorden: je gaat akkoord met de onderwerpen
          en zet daarmee betaald schrijfwerk in gang. Het tweede akkoord zit per
          rij en gaat over de geschreven tekst. */}
      <ConfirmDialog
        open={monthDialog !== null}
        title={`Maand ${monthDialog?.month_number ?? ""} vrijgeven`}
        body={`Je geeft ${echt.filter((p) => p.plan_month_id === monthDialog?.id).length} pagina's in één keer vrij om geschreven te worden. ORBIT ENGINE begint tien dagen voor elke publicatiedatum, en legt elke tekst daarna aan jou voor.`}
        irreversible={{
          title: "Dit zet het schrijven in gang",
          description:
            "Elke pagina die geschreven wordt kost geld. Wijs de maand af als de onderwerpen niet kloppen; ORBIT ENGINE maakt dan een nieuw voorstel.",
        }}
        confirmLabel="Vrijgeven"
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
  aantal,
  nadruk = false,
  onClick,
  children,
}: {
  actief: boolean;
  aantal: number;
  /** Amber in plaats van grijs: alleen bij het aantal dat om een handeling vraagt. */
  nadruk?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actief}
      // De hover staat in een klasse en het actieve vlak in een inline-stijl:
      // die laatste wint, dus de gekozen filterknop negeert de hover vanzelf.
      // Zonder dit beloofde `transition-colors` een overgang die nergens heen
      // ging.
      className="flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--wash-hover)]"
      style={{
        borderColor: actief ? "var(--intent-intelligence-border)" : "var(--border-subtle)",
        background: actief ? "var(--intent-intelligence-surface)" : undefined,
        color: actief ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      {children}
      <span className={nadruk ? "chip chip-warning" : "chip chip-neutral"}>{aantal}</span>
    </button>
  );
}

/** Eén regel in het plan. De drie statuslagen staan er alle drie op. */
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
  onApprove: () => void;
  onPost: () => void;
  onRemove: () => void;
}) {
  const meta = PLAN_STATUS_META[page.status];
  const wanneer = planRunningDate(page);
  // ⚠️ Er is één pad waarbij een pagina om akkoord vraagt zonder gekoppelde
  // tekst: schreef de pijplijn eerder al iets met dezelfde titel onder deze
  // analyse, dan zet de cron alleen de status om (`alreadyDone` in
  // `app/api/cron/plan/route.ts`) en blijft `content_piece_id` leeg. Dan is
  // zeggen waar de tekst wél staat eerlijker dan een knop zonder uitweg.
  const losseTekst = href === null && page.status === "ter_goedkeuring";

  return (
    <li className="card flex flex-wrap items-center justify-between gap-3">
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
        {/* Verplaatsen wisselt de plek én de publicatiedatum met de buurman:
            alleen de plek zou een lijst opleveren waarin de bovenste pagina
            later verschijnt dan de onderste, en dan is het geen agenda meer. */}
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

        {/* Het TWEEDE akkoord: over de geschreven tekst, niet over de maand.
            "Lezen" staat ervóór, want goedkeuren wat je niet gelezen hebt was
            precies wat dit scherm vroeg. */}
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
