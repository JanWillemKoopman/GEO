/**
 * De namen van alle iconen, los van de tekeningen in `lib/icons.ts`.
 *
 * Waarom een eigen bestand: `lib/icons.ts` importeert de iconenset, en een test
 * die alleen wil weten of een naam bestaat, hoeft geen React-set te laden
 * (het vorige pakket, Solar, was alleen ESM en brak `scripts/test-unit.ts`).
 * `ICONEN` is getypt als `Record<IcoonNaam, …>`, dus deze lijst en de tekeningen
 * kunnen niet uit elkaar lopen: `tsc` faalt bij een naam zonder tekening.
 *
 * Toelichting per betekenis: zie `lib/icons.ts`.
 */
export const ICOON_NAMEN = [
  // ── De zeven hoofdstukken van de zijbalk ────────────────────────────────
  "overzicht",
  "taken",
  "clusters",
  "strategie",
  "analytics",
  "merkprofiel",
  "instellingen",
  "admin",
  // ── Bediening ───────────────────────────────────────────────────────────
  "menu",
  "sluiten",
  "toevoegen",
  "uitklappen",
  "inklappen",
  "openen",
  "verder",
  "terug",
  "naar",
  "omhoog",
  "omlaag",
  "extern",
  "kopieer",
  "downloaden",
  "profiel",
  "help",
  "meer",
  "versleep",
  "label",
  "prullenbak",
  "bewerken",
  // ── Standen ─────────────────────────────────────────────────────────────
  "klaar",
  "loopt",
  "open",
  "mislukt",
  "letop",
  "info",
  "nvt",
  "stijging",
  "daling",
  // ── Soorten werk en kansen ──────────────────────────────────────────────
  "nieuwepagina",
  "paginabijwerken",
  "publiceren",
  "meten",
  "goedkeuring",
  "feit",
  "herstel",
  "offsite",
  // ── Onderwerpen in de Support-handleiding ────────────────────────────────
  // Eén tekening per bestemming uit de zijbalk, zodat een lijst van tien
  // uitlegblokken niet leest als tien keer hetzelfde blok met een andere
  // titel (`docs/designsystem.md` §6b.3, regel 5: een icoon zodra de SOORT
  // verschilt). Vier bestemmingen lenen het icoon van hun eigen hoofdstuk
  // (`overzicht`, `analytics`, `merkprofiel`, en `meten` voor Clusters), de
  // rest krijgt hier zijn eerste tekening.
  "zoekmachine",
  "opnieuw",
  "plannen",
  "bibliotheek",
  "concurrenten",
  "reputatie",
  // ── Zijbalk (29 september 2026) ─────────────────────────────────────────
  "ontdekken",
  "koppeling",
  "uitloggen",
  // ── De weergave van de app zelf ─────────────────────────────────────────
  "licht",
  "donker",
  // Alleen zichtbaar voor staf: wisselen naar wat een klant ziet
  // (`components/preview-toggle.tsx`).
  "klantweergave",
  "eigenweergave",
  // ── De onderbalk op een telefoon (17 september 2026) ────────────────────
  // Drie nieuwe betekenissen voor de Sales-onderbalk (de onderbalk is op 30 september 2026 weg,
  // redesign2026.md §8.12.4). De sidebar geeft alleen zijn zeven hoofdstukken
  // een icoon (regel 4 hierboven), maar een tabbalk van vijf posities werkt
  // zoals overal elders zo'n balk werkt: elke positie draagt er zelf een, want
  // zonder tekening is een tabblad alleen een woord op 22 pixels afstand van
  // het volgende. "Overzicht" en "Vragen" en "Plan" lenen hun tekening van hun
  // hoofdstuk of van een bestaande betekenis hierboven; deze drie zijn nieuw.
  "markten",
  "bedrijven",
  "verstuurd",
  // ── Het inlogtoneel (17 september 2026, stap 8) ──────────────────────────
  // De wachtwoordwissel in een veld: een open oog voor "toon", een
  // doorgestreept oog voor "verberg". Bewust dezelfde tekening als
  // `klantweergave`/`eigenweergave` hierboven, met een eigen naam: dat is
  // een universele conventie en geen eigen keuze, en de twee functies staan
  // nooit naast elkaar op een scherm, dus er is niets om te verwarren.
  "wachtwoordtonen",
  "wachtwoordverbergen",
  // ── Notificaties (29 september 2026) ────────────────────────────────────
  // Het belletje rechtsboven dat de lijst met meldingen opent
  // (`components/notificaties.tsx`). Een bel is de conventie; een eigen
  // tekening zou alleen uitleg kosten.
  "notificaties",
] as const;

export type IcoonNaam = (typeof ICOON_NAMEN)[number];
