/**
 * DE RESULTATENPAGINA VAN GOOGLE UITPAKKEN, voor de content brief (besluit B34).
 *
 * Naast `leesAiOverview()` (`parse.ts`), die alleen het AI-overzicht leest en
 * daarmee de meting voedt. De brief wil drie dingen meer: de bovenste
 * resultaten (wie staat er, en wat zegt zijn fragment), de vragen die Google
 * onder "Andere mensen vroegen ook" zet, en de gerelateerde zoekopdrachten.
 *
 * ── DE VORM VAN DE RESPONS ──────────────────────────────────────────────────
 *
 * `tasks[0].result[0].items[]`, elk blok met een `type`:
 *   • `organic`: `rank_group`, `title`, `url`, `domain`, `description`;
 *   • `people_also_ask`: `items[]` met per vraag `title`, en soms
 *     `expanded_element[]` met een `description` en `url` (het antwoord);
 *   • `related_searches`: `items[]`, gewone teksten;
 *   • `ai_overview`: zie `parse.ts`, dat hier hergebruikt wordt.
 *
 * ⚠️ Het AI-overzicht en de statuscode zijn op 20 september 2026 tegen het echte
 * account nagemeten (`parse.ts`). De velden van `organic`, `people_also_ask` en
 * `related_searches` komen uit de documentatie van DataForSEO en zijn nog niet
 * tegen een bewaarde respons gecontroleerd (conventie 10): de eerste brief met
 * zoekresultaten op productie is die controle. Daarom leest deze module elk
 * veld voorzichtig; een onverwachte vorm levert een lege lijst op, nooit een fout.
 *
 * Puur, zonder `server-only` (conventie 2).
 */
import { DFS_OK, leesAiOverview, type DfsResponse } from "@/lib/ai-overview/parse";

export interface OrganischResultaat {
  positie: number;
  titel: string;
  url: string;
  domein: string;
  fragment: string;
}

export interface GesteldeVraag {
  vraag: string;
  /** Het antwoord dat Google toont, als het er is. */
  antwoord: string | null;
  bronUrl: string | null;
}

export interface Resultatenpagina {
  organisch: OrganischResultaat[];
  vragen: GesteldeVraag[];
  gerelateerd: string[];
  /** Het AI-overzicht, of null als Google er geen toonde. */
  aiOverzicht: { tekst: string; bronnen: string[] } | null;
}

/** Hoeveel organische resultaten meegaan. Tien is wat de aanroep ophaalt. */
export const MAX_ORGANISCH = 10;

function tekst(waarde: unknown): string {
  return typeof waarde === "string" ? waarde.replace(/\s+/g, " ").trim() : "";
}

function domeinVan(url: string, domein: unknown): string {
  const d = tekst(domein).toLowerCase().replace(/^www\./, "");
  if (d) return d;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

interface RuwBlok {
  type?: unknown;
  rank_group?: unknown;
  title?: unknown;
  url?: unknown;
  domain?: unknown;
  description?: unknown;
  items?: unknown;
  expanded_element?: unknown;
}

/**
 * Pak één respons uit. Een respons zonder geldige taak geeft een lege pagina:
 * de aanroeper heeft de status al bekeken (`haalZoekresultatenpagina()`).
 */
export function leesZoekresultaten(body: unknown): Resultatenpagina {
  const leeg: Resultatenpagina = { organisch: [], vragen: [], gerelateerd: [], aiOverzicht: null };
  const taak = ((body ?? {}) as DfsResponse).tasks?.[0];
  if (!taak || taak.status_code !== DFS_OK) return leeg;
  const blokken = ((taak.result?.[0]?.items ?? []) as unknown[]).filter(
    (b): b is RuwBlok => typeof b === "object" && b !== null,
  );

  const organisch: OrganischResultaat[] = [];
  const vragen: GesteldeVraag[] = [];
  const gerelateerd: string[] = [];

  for (const b of blokken) {
    if (b.type === "organic") {
      const url = tekst(b.url);
      const titel = tekst(b.title);
      if (!url || !titel) continue;
      organisch.push({
        positie: typeof b.rank_group === "number" ? b.rank_group : organisch.length + 1,
        titel,
        url,
        domein: domeinVan(url, b.domain),
        fragment: tekst(b.description),
      });
    } else if (b.type === "people_also_ask" && Array.isArray(b.items)) {
      for (const v of b.items as RuwBlok[]) {
        const vraag = tekst(v?.title);
        if (!vraag) continue;
        const uitgeklapt = Array.isArray(v.expanded_element) ? (v.expanded_element[0] as RuwBlok | undefined) : undefined;
        vragen.push({
          vraag,
          antwoord: tekst(uitgeklapt?.description) || null,
          bronUrl: tekst(uitgeklapt?.url) || null,
        });
      }
    } else if (b.type === "related_searches" && Array.isArray(b.items)) {
      for (const r of b.items) {
        const t = tekst(r);
        if (t) gerelateerd.push(t);
      }
    }
  }

  const overzicht = leesAiOverview(body);
  return {
    organisch: organisch.sort((a, b) => a.positie - b.positie).slice(0, MAX_ORGANISCH),
    vragen,
    gerelateerd,
    aiOverzicht: overzicht.status === "gemeten" ? { tekst: overzicht.tekst, bronnen: overzicht.bronnen } : null,
  };
}
