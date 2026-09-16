/**
 * Wat ORBIT ENGINE tot nu toe oplevert, voor het analytics-overzicht
 * (docs/tasks/zoekdata-in-de-keten.md, hoofdstuk 7).
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS, NAAST metrics.ts ────────────────────────
 *
 * `metrics.ts` rekent het zoekverkeerscherm uit: alle kerncijfers van onze
 * pagina's, en "de rest van de site" als brede, ruwe vergelijking (bewust
 * inclusief alles, ook wat er al vóór ons stond). Deze module beantwoordt een
 * andere vraag: wat mag ORBIT ENGINE zich toerekenen, en hoeveel daarvan is
 * aantoonbaar méér dan wat de rest van de site toch al deed. Dat is een
 * strengere, kleinere claim dan het zoekverkeerscherm doet, en dat is precies
 * het punt (§7.3 van het plan): Nova's "Search click growth since you
 * started" is sitebreed en claimt daarmee ook andermans werk. Deze module
 * claimt uitsluitend wat ORBIT ENGINE zelf schreef.
 *
 * ⚠️ **"De rest" betekent hier iets anders dan op het zoekverkeerscherm.**
 * Daar is het een ruwe vergelijking, hier is het de controlegroep: alle
 * pagina's MINUS onze eigen pagina's. Twee schermen die "de rest van de
 * site" zeggen en iets anders bedoelen is precies de valkuil die deze module
 * moet voorkomen door zelf helder te zijn over welk cijfer hij teruggeeft.
 * Beide blijven bestaan, met een eigen naam per vraag.
 *
 * Puur en zonder `server-only` (conventie 2): dit bepaalt het opbrengstcijfer
 * dat de klant als bewijs krijgt.
 */
import {
  normaliseerUrl,
  vergelijk,
  vergelijkingsvenster,
  VERGELIJKINGSVENSTER_DAGEN,
  type GscDag,
  type Vergelijking,
} from "@/lib/search-console/metrics";

/** Eén pagina die ORBIT ENGINE publiceerde. */
export interface OpbrengstPagina {
  /** Het live adres, zoals `content_pieces.published_url`. */
  page: string;
  /** ISO-datum of -tijdstip. `null` mag niet voorkomen bij een gepubliceerde pagina, maar conventie 3: liever overslaan dan gokken. */
  publishedAt: string | null;
}

export interface Opbrengst {
  paginasLive: number;
  paginasGepland: number;
  /**
   * Klikken sinds elke pagina zijn eigen publicatiedatum, opgeteld. Geen
   * cijfer over de hele site en geen cijfer sinds `gsc_first_day`: dat is het
   * begin van de DATA, niet het begin van het programma (§7.4d). `null` als
   * er geen pagina's met een publicatiedatum zijn.
   */
  klikkenSindsStart: number | null;
  /** De laatste 28 dagen tegenover de 28 daarvoor, alleen onze pagina's. */
  vergelijkingOns: Vergelijking | null;
  /**
   * Dezelfde vergelijking voor de controlegroep: alle vertoningen die niet
   * van onze pagina's zijn. `null` zonder genoeg historie of zonder cijfers
   * buiten onze eigen pagina's.
   */
  vergelijkingControlegroep: Vergelijking | null;
  /**
   * Pagina's die korter dan het vergelijkingsvenster geleden gepubliceerd
   * zijn. Zij horen niet meegeteld te worden als "presteert slecht": Google
   * heeft dagen tot weken nodig om een nieuwe pagina serieus te tonen
   * (§7.4b).
   */
  jongePaginas: number;
}

/**
 * Rekent de opbrengst uit.
 *
 * `rijen` is het VOLLEDIGE `search_console_days`-bereik van het profiel
 * (niet alleen onze pagina's): de controlegroep heeft de rijen buiten onze
 * eigen adressen net zo hard nodig als het "onze pagina's"-cijfer de rijen
 * erbinnen.
 */
export function berekenOpbrengst(
  paginas: OpbrengstPagina[],
  rijen: GscDag[],
  paginasGepland: number,
  now: Date = new Date(),
): Opbrengst {
  const onzeUrls = new Set(paginas.map((p) => normaliseerUrl(p.page)));
  const publicatiedatumPerUrl = new Map(
    paginas
      .filter((p): p is OpbrengstPagina & { publishedAt: string } => Boolean(p.publishedAt))
      .map((p) => [normaliseerUrl(p.page), p.publishedAt.slice(0, 10)]),
  );

  const onzeRijen = rijen.filter((r) => onzeUrls.has(normaliseerUrl(r.page)));
  const controleRijen = rijen.filter((r) => !onzeUrls.has(normaliseerUrl(r.page)));

  // ── §7.4a: elke pagina telt vanaf zijn eigen publicatiedatum ──────────────
  let klikkenSindsStart: number | null = null;
  if (publicatiedatumPerUrl.size > 0) {
    klikkenSindsStart = 0;
    for (const r of onzeRijen) {
      const vanaf = publicatiedatumPerUrl.get(normaliseerUrl(r.page));
      if (!vanaf || r.day < vanaf) continue;
      klikkenSindsStart += r.clicks;
    }
  }

  const vensterOns = vergelijkingsvenster(onzeRijen);
  const vergelijkingOns = vensterOns ? vergelijk(onzeRijen, vensterOns) : null;

  const vensterControle = vergelijkingsvenster(controleRijen);
  const vergelijkingControlegroep = vensterControle ? vergelijk(controleRijen, vensterControle) : null;

  // ── §7.4b: een jonge pagina is geen slecht presterende pagina ─────────────
  const vandaag = now.toISOString().slice(0, 10);
  let jongePaginas = 0;
  for (const [, datum] of publicatiedatumPerUrl) {
    const dagenOud = dagenTussenDatums(datum, vandaag);
    if (dagenOud < VERGELIJKINGSVENSTER_DAGEN) jongePaginas += 1;
  }

  return {
    paginasLive: paginas.length,
    paginasGepland,
    klikkenSindsStart,
    vergelijkingOns,
    vergelijkingControlegroep,
    jongePaginas,
  };
}

function dagenTussenDatums(start: string, eind: string): number {
  const ms = new Date(`${eind}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime();
  return Math.round(ms / 86400000);
}
