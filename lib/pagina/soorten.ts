/**
 * DE SOORTEN PAGINA (besluiten B33 en B34 in `docs/tasks/contentketen-opnieuw.md` §2).
 *
 * Eén keten voor elke soort: dezelfde brief, dezelfde schrijver, dezelfde
 * controle. Wat per soort verschilt, staat hier en nergens anders:
 *
 *   - `label`: de soort in woorden, voor de opdracht aan het model;
 *   - `keuze`: de soort zoals de consultant hem in een keuzemenu ziet;
 *   - `beschrijving`: wat de lezer van deze soort pagina wil, in een paar zinnen,
 *     voor de brief en de schrijver. Beschrijft de lezer, nooit een opbouw,
 *     lengte of verplichte onderdelen (§3 regel 4);
 *   - `onderzoek`: of de brief naast zijn eigen zoektocht op het web ook de
 *     echte Google-resultaten krijgt (`lib/pagina/zoekresultaten.ts`).
 *
 * ── WAAROM DE DIENSTPAGINA NIETS KRIJGT ─────────────────────────────────────
 *
 * De dienstpagina werkt (eigenaar, 29 september 2026) en mag niet veranderen:
 * geen beschrijving en geen zoekresultaten, dus letter voor letter dezelfde
 * invoer voor brief en schrijver als vóór dit register. Een test in
 * `scripts/test-unit.ts` bewaakt dat. Ook de dienstpagina zoekt, net als
 * vóór dit register, zelf op het web: 34 van de 36 dienstpagina's op productie
 * hadden op 29 september 2026 vakkennis uit de brief.
 *
 * ── EEN NIEUWE SOORT ────────────────────────────────────────────────────────
 *
 * Eén regel hier, de waarde in de enum `content_type` en in de constraint op
 * `planned_pages.content_type` (zoals migratie 0130 voor `gids`), en de soort in
 * `CONTENT_TYPES` (`lib/plan-writing.ts`). Geen nieuwe taak, geen nieuwe stap.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import type { ContentType } from "@/lib/types/database";

export type Onderzoeksniveau = "web" | "web_en_zoekresultaten";

export interface Paginasoort {
  label: string;
  keuze: string;
  beschrijving: string | null;
  onderzoek: Onderzoeksniveau;
}

export const SOORTEN: Record<ContentType, Paginasoort> = {
  landing: {
    label: "dienstpagina",
    keuze: "Dienst- of productpagina",
    beschrijving: null,
    onderzoek: "web",
  },
  article: {
    label: "artikel met uitleg",
    keuze: "Artikel of blog",
    beschrijving:
      "Een artikel beantwoordt een vraag die iemand heeft terwijl hij zich oriënteert, vaak nog voordat hij een bedrijf zoekt. De lezer wil het onderwerp begrijpen en een goed antwoord krijgen. Het bedrijf komt aan het woord waar het iets eigens te zeggen heeft, niet in elke alinea.",
    onderzoek: "web_en_zoekresultaten",
  },
  gids: {
    label: "gids",
    keuze: "Gids",
    beschrijving:
      "Een gids helpt de lezer iets van begin tot eind te doen of te beslissen. Hij wil weten wat erbij komt kijken, wat hij eerst doet en waar hij op moet letten, zodat hij daarna zelf verder kan. Het bedrijf komt aan het woord waar het iets eigens te zeggen heeft, niet in elke alinea.",
    onderzoek: "web_en_zoekresultaten",
  },
  faq: {
    label: "pagina met veelgestelde vragen",
    keuze: "Veelgestelde vragen",
    beschrijving:
      "Een pagina met veelgestelde vragen beantwoordt de vragen die mensen echt over dit onderwerp stellen. De lezer zoekt één antwoord en wil het meteen vinden: elke vraag krijgt een kort, direct antwoord dat ook los gelezen klopt.",
    onderzoek: "web_en_zoekresultaten",
  },
  comparison: {
    label: "vergelijkingspagina",
    keuze: "Vergelijking",
    beschrijving:
      "Een vergelijking helpt de lezer kiezen tussen mogelijkheden: soorten, oplossingen of aanpakken. Hij wil de verschillen eerlijk naast elkaar zien en weten wat bij zijn situatie past. Vergelijk nooit met andere bedrijven bij naam.",
    onderzoek: "web_en_zoekresultaten",
  },
};

/** De soort van een pagina; een onbekende waarde telt als dienstpagina, de ongewijzigde route. */
export function soortVan(type: string | null | undefined): Paginasoort {
  return SOORTEN[(type ?? "") as ContentType] ?? SOORTEN.landing;
}
