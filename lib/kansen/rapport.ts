/**
 * VAN AANBEVELING NAAR KANS (N2 van `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Het rapport levert aanbevelingen als JSON (`reports.recommendations_json`,
 * blijft de ruwe uitvoer, conventie 8). Deze module zet één aanbeveling om in
 * een kans met bewijs per bron, en zegt voor welke kennisitems hij geldt. Puur,
 * zonder `server-only` (conventie 2); het ophalen en wegschrijven staat in
 * `uit-rapport.ts`.
 *
 * ── HET BEWIJS: DEZELFDE TELLING ALS HET RAPPORT ────────────────────────────
 *
 * Per bron (ChatGPT, AI Overview, Gemini) telt het bewijs de doelvragen van de
 * aanbeveling: bij hoeveel is het merk in die bron gemeten, en bij hoeveel
 * genoemd. "Genoemd" volgt de meerderheid over de herhalingen van die bron,
 * precies zoals `bepaalGemisteVragen()` het voor het rapport doet (bij gelijke
 * stand wint genoemd). Een andere regel zou een kans opleveren die "ChatGPT
 * noemt je bij 1 van de 4" zegt, terwijl het rapport diezelfde vraag gemist
 * noemde.
 *
 * Een doelvraag is gemist volgens alle bronnen samen; in één bron kan het merk
 * er wél genoemd zijn. Daarom telt het bewijs per bron opnieuw, en staat er geen
 * vaste 0.
 *
 * ── WAARVOOR DE KANS GELDT ──────────────────────────────────────────────────
 *
 * Dienst: de diensten van het onderwerp (`profile_topics.offering_ids`), via het
 * kennisitem dat uit die aanbodknoop kwam (`herkomst_tabel = profile_offerings`).
 * Regio: een werkgebied uit de kennislaag waarvan de naam letterlijk in de
 * titel, de lezer of een doelvraag staat. Letterlijk en niet "lijkt op": een
 * kans die stil aan de verkeerde plaats hangt, is erger dan een kans die aan
 * geen plaats hangt (conventie 3).
 */
import type { CommercieleWaarde, KansBewijs, KansBron, KansHandeling } from "@/lib/kansen/prioriteit";

/** Een aanbeveling zoals hij in `reports.recommendations_json` staat; alles kan ontbreken. */
export interface RuweAanbeveling {
  title?: unknown;
  why?: unknown;
  type?: unknown;
  action?: unknown;
  existingUrl?: unknown;
  relatedUrl?: unknown;
  targetIntent?: unknown;
  targets?: unknown;
}

export interface Doelvraag {
  promptId: string | null;
  weight: number | null;
  text: string | null;
}

/** De kans zoals hij uit één aanbeveling volgt, nog zonder bewijs. */
export interface KansUitAanbeveling {
  sleutel: string;
  titel: string;
  lezer: string | null;
  handeling: KansHandeling;
  bestaandeUrl: string | null;
  doelvragen: Doelvraag[];
  ruw: RuweAanbeveling;
}

export function tekst(waarde: unknown): string | null {
  return typeof waarde === "string" && waarde.trim() ? waarde.trim() : null;
}

/**
 * ⚠️ `existingUrl` is niet te vertrouwen: in het rapport van Gasservice Brabant
 * stond bij twee van de zeven aanbevelingen letterlijk `":"`, en op productie
 * staat bij Pompert de tekst `"null"`. Zelfde regel als de voorraad altijd al
 * hanteerde (`lib/plan-backlog-data.ts`).
 */
export function schoonAdres(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const schoon = url.trim();
  if (schoon.length < 8) return null;
  if (!schoon.startsWith("http") && !schoon.startsWith("/")) return null;
  return schoon;
}

export function doelvragenVan(targets: unknown): Doelvraag[] {
  if (!Array.isArray(targets)) return [];
  return (targets as Record<string, unknown>[]).map((t) => ({
    promptId: typeof t?.promptId === "string" ? t.promptId : null,
    weight: typeof t?.weight === "number" ? t.weight : null,
    text: tekst(t?.text),
  }));
}

/**
 * De sleutel van een kans uit een rapport: "<rapport-id>#<volgnummer>". Gelijk
 * aan `planned_pages.source_ref`, zodat elke kaart die al in de voorraad stond
 * zijn kans terugvindt. Het volgnummer hoort erin: twee aanbevelingen uit één
 * rapport kunnen dezelfde titel dragen.
 */
export function kansSleutel(rapportId: string, volgnummer: number): string {
  return `${rapportId}#${volgnummer}`;
}

/**
 * Eén aanbeveling als kans, of `null` zonder titel.
 *
 * Verbeteren zonder bruikbaar adres wordt een nieuwe pagina: de database
 * weigert een verbetering zonder adres (migratie 0118), en "verbeter :" is geen
 * handeling. Op productie had op 26 september 2026 elke verbetering een adres
 * (8 van de 8).
 */
export function kansUitAanbeveling(rapportId: string, volgnummer: number, ruw: RuweAanbeveling): KansUitAanbeveling | null {
  const titel = tekst(ruw?.title);
  if (!titel) return null;
  const adres = schoonAdres(ruw?.existingUrl);
  const verbeteren = ruw?.action === "verbeteren" && adres !== null;
  return {
    sleutel: kansSleutel(rapportId, volgnummer),
    titel,
    lezer: tekst(ruw?.targetIntent),
    handeling: verbeteren ? "pagina_verbeteren" : "nieuwe_pagina",
    bestaandeUrl: verbeteren ? adres : null,
    doelvragen: doelvragenVan(ruw?.targets),
    ruw,
  };
}

// ── Het bewijs ───────────────────────────────────────────────────────────────

/** Eén beoordeelde meting van een doelvraag. */
export interface MetingVoorBewijs {
  runId: string;
  promptId: string;
  /** `tracking_runs.engine`; leeg is de hoofdbron (ChatGPT), zoals in het rapport. */
  engine: string | null;
  /** Is het eigen merk in deze meting genoemd? */
  genoemd: boolean;
  /** De andere aanbieders die in deze meting genoemd werden. */
  concurrenten: readonly string[];
}

/** `tracking_runs.engine` naar de bron van een kans. Een onbekende bron levert geen bewijs. */
export function bronVanEngine(engine: string | null): KansBron | null {
  switch (engine ?? "openai") {
    case "openai":
      return "chatgpt";
    case "google_ai_overview":
      return "ai_overview";
    case "gemini":
      return "gemini";
    default:
      return null;
  }
}

/**
 * De versie van de regel waarmee het bewijs geteld is; staat in `kans_bewijs.ruw.regel`.
 * Verandert de telling, dan gaat dit getal omhoog en telt `legKansenVast()` het
 * bewijs van open kansen opnieuw.
 *
 *   1  26 september 2026, N2: elke andere genoemde aanbieder telde als concurrent.
 *   2  26 september 2026: alleen wie aanbevolen wordt. Op productie stond bij de
 *      faalangstpagina van Pompert het CBR als concurrent; dat wordt in de
 *      antwoorden alleen terloops genoemd (`zijdelings`, 982 van de 1852
 *      vermeldingen van andere namen).
 */
export const BEWIJS_REGEL = 2;

/**
 * Telt deze vermelding als concurrent? Alleen een naam die het antwoord
 * aanbeveelt (`eerste_aanbeveling`, `een_van_meerdere`). Een naam die terloops
 * voorbijkomt als bron, voorbeeld of instantie (`zijdelings`) neemt de plek van
 * het merk niet in. Een oude meting zonder rol telt mee: onbekend is daar geen
 * reden om een concurrent te verzwijgen.
 */
export function isConcurrent(v: { is_own_brand: boolean; mentioned: boolean; mention_role: string | null }): boolean {
  return !v.is_own_brand && v.mentioned && v.mention_role !== "zijdelings";
}

/** Hooguit zoveel concurrenten per bron: genoeg voor de uitleg, geen lijst. */
export const MAX_CONCURRENTEN = 5;

export interface BewijsUitMeting extends KansBewijs {
  runIds: string[];
}

/**
 * Het bewijs per bron voor deze doelvragen. Een bron zonder meting van een
 * doelvraag levert geen rij: niet gemeten is geen bewijs (conventie 3).
 */
export function bewijsUitMetingen(doelvragen: readonly Doelvraag[], metingen: readonly MetingVoorBewijs[]): BewijsUitMeting[] {
  const vragen = new Set(doelvragen.map((d) => d.promptId).filter((id): id is string => !!id));
  const perBron = new Map<KansBron, Map<string, MetingVoorBewijs[]>>();
  for (const m of metingen) {
    if (!vragen.has(m.promptId)) continue;
    const bron = bronVanEngine(m.engine);
    if (!bron) continue;
    const perVraag = perBron.get(bron) ?? new Map<string, MetingVoorBewijs[]>();
    perVraag.set(m.promptId, [...(perVraag.get(m.promptId) ?? []), m]);
    perBron.set(bron, perVraag);
  }

  const uit: BewijsUitMeting[] = [];
  for (const bron of ["chatgpt", "ai_overview", "gemini"] as const) {
    const perVraag = perBron.get(bron);
    if (!perVraag || perVraag.size === 0) continue;
    let genoemd = 0;
    const telling = new Map<string, number>();
    const runIds: string[] = [];
    for (const lijst of perVraag.values()) {
      // Meerderheid binnen de bron, gelijke stand wint genoemd (`bepaalGemisteVragen()`).
      const gemist = lijst.filter((m) => !m.genoemd).length;
      const vraagGenoemd = !(gemist * 2 > lijst.length);
      if (vraagGenoemd) genoemd++;
      for (const m of lijst) {
        runIds.push(m.runId);
        // Alleen waar het merk ontbrak: dat zijn de concurrenten die de plek innemen.
        if (m.genoemd) continue;
        for (const naam of new Set(m.concurrenten.map((c) => c.trim()).filter(Boolean))) {
          telling.set(naam, (telling.get(naam) ?? 0) + 1);
        }
      }
    }
    const concurrenten = [...telling.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"))
      .slice(0, MAX_CONCURRENTEN)
      .map(([naam]) => naam);
    uit.push({ bron, vragenGemeten: perVraag.size, vragenGenoemd: genoemd, concurrenten, runIds });
  }
  return uit;
}

// ── Commerciële waarde ───────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLocaleLowerCase("nl").replace(/\s+/g, " ").trim();
}

/**
 * Voorrang als een dienst van het onderwerp bij de voorrang van het merk hoort,
 * minder als hij alleen bij "minder voorrang" hoort, gewoon als het merk wel
 * prioriteiten heeft maar deze dienst er niet in staat. Zonder enige opgave van
 * het merk: `null`, want dan weten we het niet (conventie 3).
 */
export function commercieleWaardeVan(args: {
  diensten: readonly string[];
  voorrang: readonly string[];
  minder: readonly string[];
}): CommercieleWaarde | null {
  const voorrang = new Set(args.voorrang.map(norm).filter(Boolean));
  const minder = new Set(args.minder.map(norm).filter(Boolean));
  if (voorrang.size === 0 && minder.size === 0) return null;
  const diensten = args.diensten.map(norm);
  if (diensten.some((d) => voorrang.has(d))) return "voorrang";
  if (diensten.some((d) => minder.has(d))) return "minder";
  return "gewoon";
}

// ── Waarvoor de kans geldt ───────────────────────────────────────────────────

/** Het deel van een kennisitem dat nodig is om een kans eraan te hangen. */
export interface KennisVoorKans {
  id: string;
  soort: string | null;
  bewering: string;
  herkomstTabel: string | null;
  herkomstId: string | null;
}

function bevatPlaats(tekstIn: string, plaats: string): boolean {
  const p = plaats.trim();
  if (p.length < 2) return false;
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(tekstIn);
}

/**
 * De kennisitems waarvoor deze kans geldt: de diensten van het onderwerp en de
 * werkgebieden die letterlijk in de kans voorkomen. Elk id één keer, in de
 * volgorde van de kennis.
 */
export function geldtVoorVan(args: {
  kans: Pick<KansUitAanbeveling, "titel" | "lezer" | "doelvragen">;
  dienstIds: readonly string[];
  kennis: readonly KennisVoorKans[];
}): string[] {
  const diensten = new Set(args.dienstIds);
  const teksten = [args.kans.titel, args.kans.lezer ?? "", ...args.kans.doelvragen.map((d) => d.text ?? "")].join("\n");
  const uit: string[] = [];
  for (const k of args.kennis) {
    // Alleen het item dat de dienst zelf is, niet zijn prijs of doelgroep: die
    // hangen al aan de dienst, en een kans geldt voor de dienst.
    const isDienst =
      (k.soort === "dienst" || k.soort === "categorie") &&
      k.herkomstTabel === "profile_offerings" &&
      k.herkomstId !== null &&
      diensten.has(k.herkomstId);
    const isRegio = k.soort === "werkgebied" && bevatPlaats(teksten, k.bewering);
    if ((isDienst || isRegio) && !uit.includes(k.id)) uit.push(k.id);
  }
  return uit;
}
