/**
 * Het jaar van RunX, uitgerekend: wanneer elke pagina live ging, welke vragen
 * hij raakt, wat het effect was, en welke status hij vandaag heeft.
 *
 * Plan: `docs/tasks/demo-account-runx.md` §3, §6 en §8. Puur en
 * deterministisch (conventie 2); de loader (`laden.ts`) schrijft dit weg, en de
 * unittests rekenen het verhaal hier na.
 *
 * ── DE SAMENHANG DIE HIER WORDT GEMAAKT ─────────────────────────────────────
 *
 * Een pagina raakt de vragen die kort na zijn publicatie voor het eerst
 * gewonnen worden. Daarmee kloppen drie schermen met elkaar zonder dat iets
 * verzonnen hoeft te worden: de meting laat de vraag omslaan, het effect van
 * de pagina zegt "gestegen", en het antwoord van ChatGPT citeert de pagina.
 * Een pagina waarvan de vragen niet omslaan, krijgt eerlijk "gelijk".
 */

import type { ImpactVerdict, PlannedPageStatus } from "@/lib/types/database";
import { CLUSTERS, type DemoCluster } from "@/lib/demo/runx/vragen";
import { PAGINAS, MAANDSTATUS, type DemoPagina } from "@/lib/demo/runx/plan";
import { MERK } from "@/lib/demo/runx/merk";
import {
  dagIn,
  demoId,
  genoemdOp,
  meetmomenten,
  promptsVan,
  toeval,
  type DemoPrompt,
  type Meetmoment,
} from "@/lib/demo/runx/rekenen";

const DAG = 86_400_000;
/** De dagen waarop de tien pagina's van een maand live gaan. */
const PUBLICATIEDAGEN = [3, 5, 8, 10, 13, 15, 18, 21, 24, 27];

export interface ClusterJaar {
  cluster: DemoCluster;
  analysisId: string;
  topicId: string;
  prompts: DemoPrompt[];
  momenten: Meetmoment[];
  /** Per meetmoment (weekNo) de indexen van de vragen waar RunX in staat. */
  genoemd: Map<number, Set<number>>;
  /** Per vraag-index het eerste meetmoment waarop RunX genoemd werd, of null. */
  eersteGenoemd: Map<number, number | null>;
}

export interface PaginaJaar {
  pagina: DemoPagina;
  id: string;
  /** Publicatiedatum (`planned_pages.scheduled_for`). */
  datum: Date;
  status: PlannedPageStatus;
  /** Doelvragen: indexen in de vragen van het cluster. */
  doelvragen: number[];
  /** Het meetmoment (weekNo) waarvan het rapport deze pagina aanbeval. */
  rapportWeek: number;
  /** Volgnummer binnen de aanbevelingen van dat rapport. */
  volgnummer: number;
  url: string;
  /** Effect na 14 en 28 dagen, alleen voor geplaatste pagina's die zo oud zijn. */
  effect: { golf: 1 | 2; oordeel: ImpactVerdict; voor: number; na: number; totaal: number }[];
}

export interface Jaar {
  nu: Date;
  clusters: ClusterJaar[];
  paginas: PaginaJaar[];
}

export function clusterJaar(cluster: DemoCluster, nu: Date): ClusterJaar {
  const prompts = promptsVan(cluster);
  const momenten = meetmomenten(cluster, nu);
  const laatste = momenten[momenten.length - 1].weekNo;
  const genoemd = new Map<number, Set<number>>();
  for (const m of momenten) genoemd.set(m.weekNo, genoemdOp(cluster, prompts, m.weekNo, laatste));
  const eersteGenoemd = new Map<number, number | null>();
  for (const p of prompts) {
    const eerste = momenten.find((m) => genoemd.get(m.weekNo)?.has(p.index));
    eersteGenoemd.set(p.index, eerste ? eerste.weekNo : null);
  }
  return {
    cluster,
    analysisId: demoId(`analyse:${cluster.sleutel}`),
    topicId: demoId(`onderwerp:${cluster.sleutel}`),
    prompts,
    momenten,
    genoemd,
    eersteGenoemd,
  };
}

/**
 * De status van een pagina op de dag van inladen, uit zijn publicatiedatum.
 * Zo werkt ORBIT ENGINE: tien dagen voor de datum begint het schrijven
 * (`/api/cron/plan`), dan goedkeuren, dan plaatst de klant hem zelf.
 */
export function statusOp(datum: Date, nu: Date, maandStatus: "goedgekeurd" | "ter_goedkeuring" | "voorbij"): PlannedPageStatus {
  const dagen = (datum.getTime() - nu.getTime()) / DAG;
  if (dagen < 0) return "geplaatst";
  if (maandStatus === "ter_goedkeuring") return "gepland";
  if (dagen < 3) return "goedgekeurd";
  if (dagen < 7) return "ter_goedkeuring";
  if (dagen < 11) return "schrijven";
  return "gepland";
}

/** Woorden die er niet toe doen bij het koppelen van een pagina aan zijn vragen. */
const STOP = new Set(
  "de het een en of in op van voor met bij je jij jouw wat hoe welke waar is zijn zo naar te dat die er niet ook om als aan wel".split(" "),
);
function woorden(t: string): Set<string> {
  return new Set(
    t
      .toLowerCase()
      .replace(/[^a-z0-9à-ÿ\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}
function overlap(a: string, b: string): number {
  const wa = woorden(a);
  let n = 0;
  for (const w of woorden(b)) if (wa.has(w)) n++;
  return n;
}

export function bouwJaar(nu: Date): Jaar {
  const clusters = CLUSTERS.map((c) => clusterJaar(c, nu));
  const perCluster = new Map(clusters.map((c) => [c.cluster.sleutel, c]));
  const geclaimd = new Map<string, Set<number>>();

  const paginas: PaginaJaar[] = [];
  const perMaand = new Map<number, DemoPagina[]>();
  for (const p of PAGINAS) perMaand.set(p.maand, [...(perMaand.get(p.maand) ?? []), p]);

  for (const [maand, lijst] of [...perMaand.entries()].sort((a, b) => a[0] - b[0])) {
    lijst.forEach((pagina, i) => {
      const cj = perCluster.get(pagina.cluster);
      if (!cj) throw new Error(`Pagina ${pagina.sleutel} hangt aan een onbekend cluster: ${pagina.cluster}`);
      const datum = dagIn(nu, maand, PUBLICATIEDAGEN[i] ?? 28, 8);
      const maandStatus = maand < 0 ? "voorbij" : MAANDSTATUS[maand] ?? "goedgekeurd";
      const status = statusOp(datum, nu, maandStatus);

      // Het rapport dat deze pagina aanbeval: het laatste dat minstens vijf
      // dagen vóór de publicatie klaar was, en anders het eerste.
      const rapport =
        [...cj.momenten].reverse().find((m) => m.op.getTime() <= datum.getTime() - 5 * DAG) ?? cj.momenten[0];

      // De doelvragen: vragen die bij publicatie nog niet gewonnen waren, bij
      // voorkeur die kort daarna omslaan, en die inhoudelijk passen.
      const claim = geclaimd.get(pagina.cluster) ?? new Set<number>();
      const momentNa = (dagen: number) =>
        cj.momenten.find((m) => m.op.getTime() >= datum.getTime() + dagen * DAG)?.weekNo ?? null;
      const binnenTwee = [momentNa(0), momentNa(32)].filter((w): w is number => w !== null);
      const kandidaten = cj.prompts
        .filter((p) => !p.zonderMerken)
        .map((p) => {
          const eerste = cj.eersteGenoemd.get(p.index) ?? null;
          const alGewonnen = eerste !== null && eerste <= rapport.weekNo;
          const slaatOm = eerste !== null && binnenTwee.includes(eerste);
          return {
            p,
            alGewonnen,
            score:
              overlap(pagina.titel, p.tekst) * 2 +
              (slaatOm ? (pagina.pronk ? 8 : 3) : 0) +
              (claim.has(p.index) ? -3 : 0) +
              toeval(`${pagina.sleutel}:${p.index}`),
          };
        })
        .filter((k) => !k.alGewonnen)
        .sort((a, b) => b.score - a.score);
      const doelvragen = kandidaten.slice(0, 2).map((k) => k.p.index);
      for (const d of doelvragen) claim.add(d);
      geclaimd.set(pagina.cluster, claim);

      paginas.push({
        pagina,
        id: demoId(`pagina:${pagina.sleutel}`),
        datum,
        status,
        doelvragen,
        rapportWeek: rapport.weekNo,
        volgnummer: 0,
        url: `${MERK.url}${pagina.pad}`,
        effect: status === "geplaatst" ? effectVan(cj, doelvragen, datum, nu) : [],
      });
    });
  }

  // Volgnummers per rapport, in de volgorde van publicatie.
  const teller = new Map<string, number>();
  for (const p of paginas) {
    const k = `${p.pagina.cluster}:${p.rapportWeek}`;
    p.volgnummer = teller.get(k) ?? 0;
    teller.set(k, p.volgnummer + 1);
  }

  return { nu, clusters, paginas };
}

/**
 * Het effect van een pagina na 14 en 28 dagen: hoeveel van zijn doelvragen
 * RunX noemden vóór en na. Dezelfde maat als `content_impact`, maar dan uit de
 * metingen van het jaar in plaats van uit een hermeting.
 */
function effectVan(cj: ClusterJaar, doelvragen: number[], datum: Date, nu: Date): PaginaJaar["effect"] {
  const uit: PaginaJaar["effect"] = [];
  const voorMoment = [...cj.momenten].reverse().find((m) => m.op.getTime() <= datum.getTime()) ?? cj.momenten[0];
  const genoemdBij = (weekNo: number) => doelvragen.filter((i) => cj.genoemd.get(weekNo)?.has(i)).length;
  for (const golf of [1, 2] as const) {
    const dagen = golf === 1 ? 14 : 28;
    if (nu.getTime() < datum.getTime() + dagen * DAG) break;
    // Het eerste meetmoment na de golf, of het laatste als er nog geen is.
    const na =
      cj.momenten.find((m) => m.op.getTime() >= datum.getTime() + dagen * DAG) ?? cj.momenten[cj.momenten.length - 1];
    const voor = genoemdBij(voorMoment.weekNo);
    const naGenoemd = genoemdBij(na.weekNo);
    const oordeel: ImpactVerdict =
      doelvragen.length === 0 ? "te_weinig_data" : naGenoemd > voor ? "gestegen" : naGenoemd < voor ? "gedaald" : "gelijk";
    uit.push({ golf, oordeel, voor, na: naGenoemd, totaal: doelvragen.length });
  }
  return uit;
}

/** De pagina waar de open vraag van §7 aan hangt: de eerste die op goedkeuring wacht. */
export function paginaVoorOpenVraag(jaar: Jaar): PaginaJaar | null {
  return (
    jaar.paginas.find((p) => p.status === "ter_goedkeuring") ??
    jaar.paginas.find((p) => p.status === "goedgekeurd") ??
    null
  );
}
