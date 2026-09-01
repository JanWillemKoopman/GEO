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
 * hij alleen te toetsen zijn door de app te starten en vijftien adressen met de
 * hand aan te klikken, en dat is precies het soort controle dat één keer
 * gebeurt en daarna nooit meer.
 *
 * ── ELKE VERWIJZING WIJST NAAR HET EINDADRES ────────────────────────────────
 *
 * Alle vijftien zijn **permanent (308)**, en dat is alleen eerlijk als het doel
 * ook echt het eindadres is. Twee schermen die later samengevoegd worden wijzen
 * daarom nu al naar het samengevoegde adres, en niet naar een tussenstation dat
 * een fase later weer verdwijnt. Een 308 blijft in de browsercache staan; een
 * verkeerde is niet terug te nemen.
 *
 *   • `/profielgegevens` en `/merkprofiel`  → `/merkprofiel/bewerken`
 *   • `/aanvullen` en `/toevoegingen`       → `/strategie/vragen`
 *   • `/producten`                          → `/admin/aanbodboom` (was blok Aanbod)
 *   • `/techniek`                           → `/analytics` (blok Technische diagnose)
 *
 * ⚠️ **`/merk/:id/merkprofiel` wijst sinds 1 september 2026 zelf ook door.**
 * Het leesscherm dat daar stond (het merkdossier) is opgesplitst en naar Admin
 * verhuisd, als "0-meting" en "Aanbodboom". Wie het oude adres nog had staan,
 * komt terecht op wat er van dat scherm voor een klant is overgebleven:
 * `/merkprofiel/bewerken`, nu "Merkdossier".
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
    destination: "/merk/:id/strategie/vragen",
    permanent: true,
  },
  {
    source: "/profielen/:id/toevoegingen",
    destination: "/merk/:id/strategie/vragen",
    permanent: true,
  },
  {
    source: "/profielen/:id/producten",
    destination: "/merk/:id/admin/aanbodboom",
    permanent: true,
  },

  // ⚠️ "Vraagt jouw input" verhuisde op 28 augustus 2026 van Merkprofiel naar
  // Strategie en heet nu "Openstaande vragen". Dit adres stond in de werklijst
  // op de startpagina, in de onboardingsessie en in de leesbevestiging van het
  // merkprofiel, dus het is niet zomaar een bladwijzer: het staat in mails die
  // al verstuurd zijn.
  {
    source: "/merk/:id/merkprofiel/input",
    destination: "/merk/:id/strategie/vragen",
    permanent: true,
  },

  // Het merkdossier zelf is op 1 september 2026 opgesplitst en naar Admin
  // verhuisd. Wat voor een klant overblijft op dit adres staat op
  // `/merkprofiel/bewerken`, nu "Merkdossier".
  {
    source: "/merk/:id/merkprofiel",
    destination: "/merk/:id/merkprofiel/bewerken",
    permanent: true,
  },
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
  // niet gevangen is. Wijst sinds 1 september 2026 naar de 0-meting onder
  // Admin, waar dat leesscherm naartoe verhuisde.
  { source: "/profielen/:id", destination: "/merk/:id/admin/0-meting", permanent: true },

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
