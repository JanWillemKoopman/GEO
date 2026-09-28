/**
 * SEARCH CONSOLE ALS KANSBRON (N3 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * ── WAT HIER STAAT EN WAT NIET ───────────────────────────────────────────────
 *
 * Deze module bepaalt welke zoekopdrachten (`search_console_queries`) bij een
 * bestaande kans horen, en telt ze op tot het bewijs dat `kans_bewijs` al kent
 * (migratie 0118: vertoningen, klikken, positie, periode, zoekopdrachten).
 * Puur en zonder `server-only` (conventie 2): het ophalen en wegschrijven staat
 * in `uit-search-console.ts`.
 *
 * **Bewust nog niet gebouwd**: een gloednieuwe kans puur uit zoekverkeer, zonder
 * dat er al een kans voor bestaat. Dat vergt een titel en een lezer afleiden uit
 * kale zoektermen zonder model (§4, P4), en dat is precies de stap die
 * `docs/tasks/zoekdata-in-de-keten.md` zelf al "de moeilijkste stap" noemt voor
 * hetzelfde vraagstuk bij het schrijven. Bewijs bij een bestaande kans is de
 * bruikbare eerste helft: dat dekt het "klaar als" van N3 (minstens één kans
 * met Search Console-bewijs) zonder die stap te forceren.
 *
 * ── HOE EEN ZOEKOPDRACHT AAN EEN KANS HANGT ──────────────────────────────────
 *
 * Dezelfde regel als `geldtVoorVan()` in `rapport.ts` gebruikt voor een
 * werkgebied: letterlijk, als heel woord, en niet "lijkt op". Een kans "geldt
 * voor" een dienst of een werkgebied uit de kennislaag (`kansen.geldt_voor`);
 * een zoekopdracht hoort bij de kans als zijn tekst een van die kennistermen
 * als heel woord bevat. Staat er geen kennisterm bij de kans (bijvoorbeeld een
 * handmatige kans zonder dienst), dan is er niets om op te matchen en levert
 * deze module geen bewijs.
 */
import { bevatHeelWoord } from "@/lib/kansen/rapport";
import type { KansBewijs } from "@/lib/kansen/prioriteit";

export interface ZoekopdrachtRij {
  query: string;
  clicks: number;
  impressions: number;
  position: number | null;
}

/** Welke zoekopdrachten bij deze kennistermen horen (dienst- of werkgebiednamen). */
export function matchendeZoekopdrachten(
  zoekopdrachten: readonly ZoekopdrachtRij[],
  kennistermen: readonly string[],
): ZoekopdrachtRij[] {
  if (kennistermen.length === 0) return [];
  return zoekopdrachten.filter((r) => kennistermen.some((term) => bevatHeelWoord(r.query, term)));
}

export type ZoekverkeerBewijs = Pick<
  KansBewijs,
  "vertoningen" | "klikken" | "positie" | "periodeDagen"
> & { zoekopdrachten: string[] };

/**
 * Telt de matchende zoekopdrachten op tot bewijs, of `null` als er niets
 * matchte. Positie is gewogen op vertoningen, dezelfde regel als
 * `gewogenPositie()` in `lib/search-console/metrics.ts` (een dag zonder
 * vertoningen mag de positie niet naar voren trekken).
 *
 * De getoonde zoekopdrachten zijn de twintig met de meeste vertoningen: genoeg
 * om te geloven, te veel is een export en geen bewijszin.
 */
export function zoekverkeerBewijsVan(
  matches: readonly ZoekopdrachtRij[],
  periodeDagen: number,
): ZoekverkeerBewijs | null {
  if (matches.length === 0) return null;

  const perQuery = new Map<string, { impressions: number; clicks: number }>();
  let som = 0;
  let gewicht = 0;
  for (const r of matches) {
    const bestaand = perQuery.get(r.query) ?? { impressions: 0, clicks: 0 };
    perQuery.set(r.query, { impressions: bestaand.impressions + r.impressions, clicks: bestaand.clicks + r.clicks });
    if (r.position !== null && r.impressions > 0) {
      som += r.position * r.impressions;
      gewicht += r.impressions;
    }
  }

  const vertoningen = matches.reduce((s, r) => s + r.impressions, 0);
  const klikken = matches.reduce((s, r) => s + r.clicks, 0);
  const zoekopdrachten = [...perQuery.entries()]
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .slice(0, 20)
    .map(([query]) => query);

  return {
    vertoningen,
    klikken,
    positie: gewicht > 0 ? som / gewicht : null,
    periodeDagen,
    zoekopdrachten,
  };
}
