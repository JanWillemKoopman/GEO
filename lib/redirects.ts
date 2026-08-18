/**
 * DE OUDE MERKADRESSEN BLIJVEN WERKEN.
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS EN GEEN BLOK IN DE CONFIG ────────────────
 *
 * Besluit 8 van 17 augustus 2026 zette elk merkscherm onder `/merk/[id]/` in
 * plaats van onder `/profielen/[id]/`. Er staan bladwijzers naar die oude
 * adressen, en de eigenaar deelt ze in demogesprekken, dus een dood adres kost
 * hier een gesprek en niet alleen een klik.
 *
 * Deze lijst bepaalt dus een uitkomst, en dan hoort hij in een pure module die
 * `scripts/test-unit.ts` kan importeren (conventie 2). In `next.config.ts` zou
 * hij alleen te toetsen zijn door de app te starten en dertien adressen met de
 * hand aan te klikken, en dat is precies het soort controle dat één keer
 * gebeurt en daarna nooit meer.
 *
 * ── ELKE VERWIJZING WIJST NAAR HET EINDADRES ────────────────────────────────
 *
 * Alle dertien zijn **permanent (308)**, en dat is alleen eerlijk als het doel
 * ook echt het eindadres is. Twee schermen die later samengevoegd worden wijzen
 * daarom nu al naar het samengevoegde adres, en niet naar een tussenstation dat
 * een fase later weer verdwijnt. Een 308 blijft in de browsercache staan; een
 * verkeerde is niet terug te nemen.
 *
 *   • `/profielgegevens` en `/merkprofiel`  → `/merkprofiel/bewerken`
 *   • `/aanvullen` en `/toevoegingen`       → `/merkprofiel/input`
 *   • `/producten`                          → `/merkprofiel` (blok Aanbod)
 *   • `/techniek`                           → `/analytics` (blok Technische diagnose)
 *
 * ⚠️ **De volgorde in deze lijst telt.** Next.js loopt hem van boven naar
 * beneden af, en `/profielen/:id` zou anders zowel het woord "nieuw" als elke
 * subpagina vangen. Statische paden staan daarom bovenaan en `/profielen/:id`
 * onderaan.
 */

export interface Doorverwijzing {
  source: string;
  destination: string;
  permanent: boolean;
  has?: { type: "query"; key: string; value: string }[];
}

export const DOORVERWIJZINGEN: Doorverwijzing[] = [
  // Statisch vóór dynamisch, anders vangt `:id` het woord "nieuw".
  { source: "/profielen/nieuw", destination: "/merk/nieuw", permanent: true },
  { source: "/profielen", destination: "/merk", permanent: true },

  // De tien subpagina's van het oude merkdossier.
  {
    source: "/profielen/:id/merkprofiel",
    destination: "/merk/:id/merkprofiel/bewerken",
    permanent: true,
  },
  {
    source: "/profielen/:id/profielgegevens",
    destination: "/merk/:id/merkprofiel/bewerken",
    permanent: true,
  },
  {
    source: "/profielen/:id/aanvullen",
    destination: "/merk/:id/merkprofiel/input",
    permanent: true,
  },
  {
    source: "/profielen/:id/toevoegingen",
    destination: "/merk/:id/merkprofiel/input",
    permanent: true,
  },
  { source: "/profielen/:id/producten", destination: "/merk/:id/merkprofiel", permanent: true },
  { source: "/profielen/:id/plan", destination: "/merk/:id/strategie/plan", permanent: true },
  { source: "/profielen/:id/techniek", destination: "/merk/:id/analytics", permanent: true },
  {
    source: "/profielen/:id/concurrenten",
    destination: "/merk/:id/analytics/concurrenten",
    permanent: true,
  },
  {
    source: "/profielen/:id/search-console",
    destination: "/merk/:id/analytics/zoekverkeer",
    permanent: true,
  },
  { source: "/profielen/:id/beheer", destination: "/merk/:id/admin/toewijzen", permanent: true },

  // Het merkdossier zelf, als laatste: `:id` matcht alles wat hierboven nog
  // niet gevangen is.
  { source: "/profielen/:id", destination: "/merk/:id/merkprofiel", permanent: true },

  // Voorgestelde clusters hingen aan een querystring in plaats van aan het pad,
  // en zijn sinds fase 3 het derde blok op de clusterlijst zelf (besluit 6: twee
  // menu-items voor twee toestanden van hetzelfde ding). Mét merk verwijst hij
  // door naar die lijst; zonder merk naar het clusteroverzicht, want dan is er
  // geen merk om naartoe te wijzen.
  {
    source: "/analyses/aanbevolen",
    has: [{ type: "query", key: "merk", value: "(?<merkId>.*)" }],
    destination: "/merk/:merkId/strategie/clusters",
    permanent: true,
  },
  { source: "/analyses/aanbevolen", destination: "/analyses", permanent: true },
];
