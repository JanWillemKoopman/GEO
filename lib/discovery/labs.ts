import "server-only";

/**
 * DataForSEO Labs voor Clusters ontdekken (docs/tasks/clusters-ontdekken.md).
 *
 * ── WAAROM EEN EIGEN MODULE EN NIET `lib/search-demand/` ────────────────────
 *
 * `lib/search-demand/` is de geparkeerde zoekvolumelaag (logboek 20 september
 * 2026 (2)): die schreef volumes in de potentiescore, en precies daar ontstonden
 * twee fouten. Deze module schrijft nergens heen; hij haalt op en geeft terug,
 * en de ontdekkingsronde bewaart het in zijn eigen tabel. Een eigen schakelaar
 * (`CLUSTER_DISCOVERY_ENABLED`) zorgt dat het aanzetten van de één de ander
 * niet meesleept, dezelfde les als bij `SEARCH_DEMAND_ENABLED` en
 * `DATAFORSEO_LLM_ENABLED`.
 *
 * ── GEVERIFIEERD (conventie 10) ─────────────────────────────────────────────
 *
 * Alle vier de eindpunten zijn op 23 september 2026 tegen het echte account
 * gedraaid op udenhout.nl (`scripts/probe-clusters-ontdekken.ts` plus een
 * vervolg). Prijs nagerekend: $0,012 per aanroep plus $0,00012 per resultaat.
 * `keyword_ideas` staat hier bewust NIET in: 10% van zijn uitvoer raakte het
 * aanbod ("weer amsterdam"), tegen ruim 80% bij `keyword_suggestions`.
 */
import { logAiCall } from "@/lib/openai/ledger";

const BASIS = "https://api.dataforseo.com/v3/dataforseo_labs/google";

/** Nederland, Nederlands. Zelfde code als `lib/search-demand/dataforseo.ts`. */
const LOCATIE_NL = 2528;
const TAAL_NL = "nl";

/** Engine-naam in `ai_calls`, zodat het plafond per account deze kosten meetelt. */
export const LABS_ENGINE = "dataforseo_labs";

/**
 * Staat het DataForSEO-deel van de ontdekkingsronde aan? Alleen de letterlijke
 * waarde `true`, en alleen met beide sleutels. Uit betekent: de ronde draait op
 * Search Console, de onboarding en ChatGPT, en het scherm zegt welke bron er
 * ontbrak.
 */
export function labsBeschikbaar(): boolean {
  if (process.env.CLUSTER_DISCOVERY_ENABLED?.trim().toLowerCase() !== "true") return false;
  return Boolean(process.env.DATAFORSEO_LOGIN?.trim() && process.env.DATAFORSEO_PASSWORD?.trim());
}

export interface LabsAntwoord {
  ok: boolean;
  /** In gewone taal als het misging. */
  melding: string | null;
  costUsd: number;
  items: Record<string, unknown>[];
  /** Het hele antwoord, voor `cluster_discovery_runs.dataforseo_raw` (conventie 8). */
  raw: unknown;
}

async function roep(
  pad: string,
  body: Record<string, unknown>,
  profileId: string,
): Promise<LabsAntwoord> {
  const login = process.env.DATAFORSEO_LOGIN?.trim() ?? "";
  const password = process.env.DATAFORSEO_PASSWORD?.trim() ?? "";
  let raw: unknown = null;
  try {
    const res = await fetch(`${BASIS}/${pad}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ location_code: LOCATIE_NL, language_code: TAAL_NL, ...body }]),
    });
    raw = await res.json().catch(() => null);
    const taak = (raw as { tasks?: { status_code?: number; status_message?: string; cost?: number; result?: { items?: unknown[] }[] }[] } | null)?.tasks?.[0];
    const costUsd = typeof taak?.cost === "number" ? taak.cost : 0;

    // Ook een mislukte aanroep kan geld kosten; loggen wat DataForSEO rekent,
    // zelfde regel als bij de AI Overview-meting.
    await logAiCall(
      { kind: `discovery_${pad.split("/")[0]}`, profileId, engine: LABS_ENGINE },
      {
        model: `dataforseo/labs-${pad.split("/")[0]}`,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        webSearch: false,
        costUsd,
        responseId: null,
        input: { request: { pad, ...body } },
      },
    );

    if (!res.ok || !taak || taak.status_code !== 20000) {
      return {
        ok: false,
        melding: `DataForSEO gaf geen antwoord (${taak?.status_message ?? `HTTP ${res.status}`}).`,
        costUsd,
        items: [],
        raw,
      };
    }
    const items = (taak.result?.[0]?.items ?? []) as Record<string, unknown>[];
    return { ok: true, melding: null, costUsd, items: Array.isArray(items) ? items : [], raw };
  } catch (err) {
    return { ok: false, melding: `DataForSEO was niet bereikbaar (${String(err)}).`, costUsd: 0, items: [], raw };
  }
}

/** Waarop een domein in Google staat, met volume en positie. */
export function rankedKeywords(domein: string, limit: number, profileId: string) {
  return roep(
    "ranked_keywords/live",
    { target: domein, limit, order_by: ["keyword_data.keyword_info.search_volume,desc"] },
    profileId,
  );
}

/** Wie in Google met dit domein overlapt, met omvang en overlap. */
export function competitorsDomain(domein: string, limit: number, profileId: string) {
  return roep("competitors_domain/live", { target: domein, limit }, profileId);
}

/** Zoektermen die de beginterm letterlijk bevatten. */
export function keywordSuggestions(term: string, limit: number, profileId: string) {
  return roep(
    "keyword_suggestions/live",
    { keyword: term, limit, order_by: ["keyword_info.search_volume,desc"] },
    profileId,
  );
}

// ── Uitlezen, defensief (conventie 3: onbekend wordt null) ──────────────────

function getal(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

export interface RangItem {
  keyword: string;
  volume: number | null;
  positie: number | null;
  url: string | null;
}

export function leesRangItems(items: Record<string, unknown>[]): RangItem[] {
  return items
    .map((it) => {
      const kd = it.keyword_data as { keyword?: unknown; keyword_info?: { search_volume?: unknown } } | undefined;
      const serp = (it.ranked_serp_element as { serp_item?: { rank_absolute?: unknown; url?: unknown } } | undefined)?.serp_item;
      return {
        keyword: typeof kd?.keyword === "string" ? kd.keyword : "",
        volume: getal(kd?.keyword_info?.search_volume),
        positie: getal(serp?.rank_absolute),
        url: typeof serp?.url === "string" ? serp.url : null,
      };
    })
    .filter((r) => r.keyword);
}

export function leesSuggesties(items: Record<string, unknown>[]): { keyword: string; volume: number | null }[] {
  return items
    .map((it) => ({
      keyword: typeof it.keyword === "string" ? it.keyword : "",
      volume: getal((it.keyword_info as { search_volume?: unknown } | undefined)?.search_volume),
    }))
    .filter((r) => r.keyword);
}

export function leesConcurrenten(items: Record<string, unknown>[]): { domein: string; omvang: number | null; overlap: number | null }[] {
  return items
    .map((it) => {
      const organic = (it.full_domain_metrics as { organic?: { count?: unknown } } | undefined)?.organic;
      return {
        domein: typeof it.domain === "string" ? it.domain : "",
        omvang: getal(organic?.count),
        overlap: getal(it.intersections),
      };
    })
    .filter((c) => c.domein);
}

/** De eigen omvang staat in hetzelfde antwoord, als rij voor het eigen domein. */
export function eigenOmvang(
  concurrenten: { domein: string; omvang: number | null }[],
  eigenDomein: string,
): number | null {
  const kaal = eigenDomein.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  return concurrenten.find((c) => c.domein.toLowerCase().replace(/^www\./, "") === kaal)?.omvang ?? null;
}
