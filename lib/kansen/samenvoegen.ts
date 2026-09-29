/**
 * ÉÉN KAART PER PAGINA: EEN NIEUWE KANS DIE AL BESTAAT, WORDT BEWIJS
 * (V7 punt 1 en 2 en V20 van `docs/tasks/pijplijnanalyse-contentketen.md`).
 *
 * In ronde 1 van de contentkwaliteit (29 september 2026) wezen drie rapporten
 * van hetzelfde merk naar dezelfde pagina, en stonden er twee vervangingen voor
 * één adres in het plan. Elk rapport kijkt alleen naar zijn eigen cluster; de
 * set van het merk zag niemand.
 *
 * Deze module beslist, zonder AI, of een nieuwe kans bij een open kans van
 * hetzelfde merk hoort. Drie regels, in deze volgorde:
 *
 *   1. het rapport wees zelf een open kans aan (`bijKans`, V7 punt 1);
 *   2. beide verbeteren dezelfde bestaande pagina (V7 punt 2, V20 punt 1);
 *   3. de nieuwe kans is een nieuwe pagina die op één meetvraag rust, en een
 *      open kans heeft die vraag ook als doelvraag (V20 punt 2).
 *
 * `bestaande` zijn de kansen van vóór dit rapport. Binnen één rapport regelen
 * `mergeOverlappingRecommendations()` en `eenVerbeteringPerAdres()` de overlap
 * al; daar nog eens overheen zou een bewuste keuze van het rapport ongedaan
 * maken.
 *
 * Past hij nergens bij, dan wordt hij gewoon een kans. Het samenvoegen zelf
 * telt het bewijs op: alleen van doelvragen die de open kans nog niet had, zodat
 * één vraag nooit twee keer meetelt.
 *
 * Puur, zonder `server-only` (conventie 2); het wegschrijven staat in
 * `uit-rapport.ts`.
 */
import { canonicalKey } from "@/lib/crawl-urls";
import type { KansBron, KansHandeling } from "@/lib/kansen/prioriteit";

/**
 * De statussen waarin een kans nog een kaart is in de voorraad of het plan, en
 * dus nog bewijs kan krijgen. Geschreven en gepubliceerd zijn af: een nieuwe
 * ronde voor zo'n pagina is een eigen, latere beslissing.
 */
export const OPEN_KANS_STATUSSEN = ["open", "ingepland", "in_voorbereiding", "te_herzien"] as const;

/** Hooguit zoveel open kansen in de invoer van het rapport: genoeg voor een merk, geen lijst zonder eind. */
export const OPEN_KANSEN_MAX = 40;

/** Een open kans van het merk zoals het rapport hem ziet (V7). */
export interface OpenKans {
  code: string;
  id: string;
  titel: string;
  rol: string | null;
  bestaandeUrl: string | null;
}

/** De open kansen van het merk als blok in de invoer van het rapport. */
export function openKansenBlok(kansen: readonly OpenKans[]): string {
  if (kansen.length === 0) return "Open kansen van dit merk: (nog geen)";
  return [
    "Open kansen van dit merk (al voorgesteld, uit dit en andere clusters):",
    ...kansen.map(
      (k) =>
        `- ${k.code}: ${k.titel}${k.rol ? `. Rol: ${k.rol}` : ""}${k.bestaandeUrl ? ` (verbetert ${k.bestaandeUrl})` : ""}`,
    ),
  ].join("\n");
}

/** Een open kans van het merk, zoals de samenvoegregel hem nodig heeft. */
export interface BestaandeKans {
  id: string;
  handeling: KansHandeling;
  bestaandeUrl: string | null;
  /** De meetvragen waar het bewijs van deze kans al op rust. */
  promptIds: readonly string[];
}

/** De nieuwe kans, zoals hij uit het rapport komt. */
export interface NieuweKans {
  handeling: KansHandeling;
  bestaandeUrl: string | null;
  doelvragen: readonly { promptId: string | null }[];
  /** Het id van de open kans die het rapport aanwees (V7 punt 1), of `null`. */
  bijKans: string | null;
}

export type SamenvoegReden = "aangewezen" | "zelfde_pagina" | "zelfde_meetvraag";

function sleutelVan(url: string | null): string | null {
  return url ? canonicalKey(url) : null;
}

/**
 * Bij welke open kans hoort deze nieuwe kans, of `null`. `bestaande` bevat
 * alleen kansen van hetzelfde merk in een van de `OPEN_KANS_STATUSSEN`.
 */
export function kiesDoelKans(
  nieuw: NieuweKans,
  bestaande: readonly BestaandeKans[],
): { id: string; reden: SamenvoegReden } | null {
  if (nieuw.bijKans) {
    const aangewezen = bestaande.find((b) => b.id === nieuw.bijKans);
    if (aangewezen) return { id: aangewezen.id, reden: "aangewezen" };
  }
  const adres = nieuw.handeling === "pagina_verbeteren" ? sleutelVan(nieuw.bestaandeUrl) : null;
  if (adres) {
    const zelfde = bestaande.find((b) => b.handeling === "pagina_verbeteren" && sleutelVan(b.bestaandeUrl) === adres);
    if (zelfde) return { id: zelfde.id, reden: "zelfde_pagina" };
  }
  // Alleen een nieuwe pagina: een verbetering heeft een eigen, concrete pagina
  // en wordt niet opgeslokt door een kans die toevallig dezelfde vraag raakt.
  const vragen = [...new Set(nieuw.doelvragen.map((d) => d.promptId).filter((id): id is string => !!id))];
  if (nieuw.handeling === "nieuwe_pagina" && vragen.length === 1) {
    const deelt = bestaande.find((b) => b.promptIds.includes(vragen[0]!));
    if (deelt) return { id: deelt.id, reden: "zelfde_meetvraag" };
  }
  return null;
}

/** Het bewijs van één bron zoals het in `kans_bewijs` staat. */
export interface OpgeslagenBewijs {
  bron: KansBron;
  vragenGemeten: number | null;
  vragenGenoemd: number | null;
  concurrenten: readonly string[];
  runIds: readonly string[];
}

/** Hooguit zoveel concurrenten per bron, zoals bij het tellen (`MAX_CONCURRENTEN`). */
const MAX_CONCURRENTEN = 5;

/**
 * Het bewijs van de open kans plus het bewijs van de nieuwe. Het nieuwe bewijs
 * is al beperkt tot doelvragen die de open kans nog niet had (zie de aanroeper),
 * dus de aantallen tellen gewoon op. Een bron die alleen in het nieuwe bewijs
 * staat, komt erbij.
 */
export function telBewijsOp(oud: readonly OpgeslagenBewijs[], nieuw: readonly OpgeslagenBewijs[]): OpgeslagenBewijs[] {
  const uit = new Map<KansBron, OpgeslagenBewijs>(oud.map((o) => [o.bron, { ...o }]));
  for (const n of nieuw) {
    const o = uit.get(n.bron);
    if (!o) {
      uit.set(n.bron, { ...n });
      continue;
    }
    uit.set(n.bron, {
      bron: n.bron,
      vragenGemeten: (o.vragenGemeten ?? 0) + (n.vragenGemeten ?? 0),
      vragenGenoemd: (o.vragenGenoemd ?? 0) + (n.vragenGenoemd ?? 0),
      concurrenten: [...new Set([...o.concurrenten, ...n.concurrenten])].slice(0, MAX_CONCURRENTEN),
      runIds: [...new Set([...o.runIds, ...n.runIds])],
    });
  }
  return [...uit.values()];
}

/**
 * Rust deze kans op één meetvraag? Dat staat op de kaart (V20 punt 2): een
 * pagina op één vraag is een dunne gok, en de consultant hoort dat te zien.
 */
export function rustOpEenVraag(doelvragen: readonly { promptId: string | null }[] | null | undefined): boolean {
  const ids = new Set((doelvragen ?? []).map((d) => d.promptId).filter((id): id is string => !!id));
  return ids.size === 1;
}
