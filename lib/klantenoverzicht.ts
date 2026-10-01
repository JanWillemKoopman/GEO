/**
 * Het klantenoverzicht voor de beheerder: één regel per klant, met alles wat
 * er over die klant te weten valt in één tabel (1 oktober 2026).
 *
 * ── WAT HET IS EN WAT HET NIET IS ───────────────────────────────────────────
 *
 * Naast "Alle merken" (`lib/csm.ts`). Dat scherm is operationeel: per merk,
 * gesorteerd op waar het vastloopt. Dit scherm is het register: per klant
 * (account), met de cijfers ernaast. Een klant kan meerdere merken hebben; de
 * tellers tellen dan op, en waar optellen niet kan (zichtbaarheid, de stand
 * van een koppeling) staat hieronder per kolom wat er gebeurt.
 *
 * ── WAAROM PUUR ─────────────────────────────────────────────────────────────
 *
 * Conventie 2. De databasefunctie `beheer_klantcijfers` (migratie 0139) telt;
 * hier staat wat er met die tellingen gebeurt: verschillen, achterstand op het
 * pakket, welke koppeling als stand van de klant geldt, filteren en de export.
 * Dat bepaalt wat de beheerder ziet en hoort onder test. Geen `server-only`.
 *
 * ⚠️ Onbekend is `null`, nooit 0 (conventie 3). Een klant zonder meting heeft
 * geen zichtbaarheid van 0%, maar géén zichtbaarheid.
 */
import { CSM_SEGMENTS, CSM_SEGMENT_META, type CsmSegment } from "@/lib/csm";
import { brandScorePerPeriod, type BrandScoreRow } from "@/lib/brand-score";
import { koppelStatus } from "@/lib/search-console/koppelstatus";
import { VERTRAGING_DAGEN } from "@/lib/search-console/window";
import { isSuperuserEmail } from "@/lib/roles";

// ── Invoer ──────────────────────────────────────────────────────────────────

/** Eén regel uit `beheer_klantcijfers()`. Getallen kunnen als tekst binnenkomen (numeric, bigint). */
export interface KlantCijfers {
  account_id: string;
  clusters_goedgekeurd: number;
  clusters_voorgesteld: number;
  vragen_actief: number;
  concurrenten: number;
  meetplannen: number;
  laatste_meting: string | null;
  kansen_open: number;
  kansen_opgepakt: number;
  kansen_vervallen: number;
  paginas_in_plan: number;
  paginas_geschreven: number;
  paginas_gepubliceerd: number;
  geschreven_deze_maand: number;
  laatst_geschreven: string | null;
  gsc_klikken: number | string;
  gsc_vertoningen: number | string;
  gsc_klikken_vorige: number | string;
  gsc_vertoningen_vorige: number | string;
  kosten_maand_usd: number | string;
  kosten_totaal_usd: number | string;
  mislukte_taken: number;
}

export interface MerkInvoer {
  id: string;
  naam: string;
  url: string | null;
  isDemo: boolean;
  /** 0 tot 1: hoeveel van de velden van het merkdossier gevuld zijn. */
  dossierVoortgang: number;
  openVragen: number;
  /** Status van het merk in "Alle merken". `null` als het merk daar niet staat. */
  segment: CsmSegment | null;
  /** Staat het onderzoek nog open (taken in de wachtrij, of profiel niet klaar)? */
  onderzoekLoopt: boolean;
  /** Is het onderzoek zelf niet gelukt, of staan er taken die nooit alsnog lukten? */
  onderzoekVastgelopen: boolean;
  /** Pagina's die op akkoord van de klant wachten. */
  paginasTerGoedkeuring: number;
  /** Maanden in het plan die op akkoord van de klant wachten. */
  maandenTerGoedkeuring: number;
  gsc: {
    property: string | null;
    verifiedAt: string | null;
    lastError: string | null;
    lastSyncAt: string | null;
    firstDay: string | null;
  };
  /** Alle rijen uit `visibility_scores` van de analyses van dit merk. */
  zichtbaarheid: BrandScoreRow[];
}

export interface KlantInvoer {
  account: {
    id: string;
    name: string | null;
    created_at: string;
    started_at: string | null;
    cancelled_at: string | null;
    package_pages_per_month: number | null;
  };
  leden: { email: string | null; laatsteInlog: string | null }[];
  openUitnodigingen: number;
  merken: MerkInvoer[];
  /** `null` als de databasefunctie deze klant niet teruggaf: alles telt dan als onbekend. */
  cijfers: KlantCijfers | null;
}

// ── Uitvoer ─────────────────────────────────────────────────────────────────

export type KlantStand = "klant" | "voor_verkoop" | "opgezegd" | "geen_merk";
export type OnderzoekStand = "klaar" | "loopt" | "vastgelopen" | "geen_merk";
export type GscStand = "gekoppeld" | "deels" | "fout" | "niet_gekoppeld" | "geen_merk";

export interface KlantRij {
  id: string;
  naam: string;
  merken: { id: string; naam: string; url: string | null }[];
  /** Kleine letters, voor het filter op e-mailadres. */
  emails: string[];

  // Klant en account (1 tot 6)
  lidSinds: string;
  klantSinds: string | null;
  gebruikers: number;
  openUitnodigingen: number;
  laatsteInlog: string | null;
  pakket: number | null;
  stand: KlantStand;
  demoMerken: number;

  // Onderzoek en dossier (7 tot 11)
  onderzoek: OnderzoekStand;
  /** 0 tot 100, van het minst complete merk. `null` zonder merk. */
  dossierCompleet: number | null;
  openVragen: number;
  clusters: number | null;
  clustersVoorgesteld: number | null;
  vragen: number | null;
  concurrenten: number | null;

  // Meten (12 tot 15)
  meetplannen: number | null;
  laatsteMeting: string | null;
  zichtbaarheid: number | null;
  zichtbaarheidVorige: number | null;
  genoemd: number | null;
  /** Hoeveel merken meetellen in de zichtbaarheid. Bij meer dan één is het een gemiddelde. */
  gemetenMerken: number;

  // Ideeën en pagina's (16 tot 22)
  kansenOpen: number | null;
  kansenOpgepakt: number | null;
  kansenVervallen: number | null;
  paginasInPlan: number | null;
  paginasGeschreven: number | null;
  wachtOpAkkoord: number;
  maandenWachtOpAkkoord: number;
  paginasGepubliceerd: number | null;
  geschrevenDezeMaand: number | null;
  /** Ligt de klant achter op het afgesproken aantal pagina's van deze maand? `null` zonder pakket. */
  achterOpPakket: boolean | null;
  laatstGeschreven: string | null;

  // Search Console (23 tot 26)
  gsc: GscStand;
  gscGekoppeld: number;
  gscFout: string | null;
  gscLaatsteOphaling: string | null;
  gscSinds: string | null;
  klikken: number | null;
  klikkenVorige: number | null;
  vertoningen: number | null;
  vertoningenVorige: number | null;

  // Kosten en gezondheid (27 tot 30)
  kostenMaand: number | null;
  kostenTotaal: number | null;
  mislukteTaken: number | null;
  segment: CsmSegment | null;
}

// ── Vensters ────────────────────────────────────────────────────────────────

export interface KlantcijferVensters {
  maandStart: string;
  foutenSinds: string;
  gscVan: string;
  gscTot: string;
  gscVorigeVan: string;
  gscVorigeTot: string;
}

/** Hoeveel dagen het zoekverkeer beslaat. 28 = vier hele weken, dus elke weekdag even vaak. */
export const GSC_VENSTER_DAGEN = 28;
/** Hoe ver "mislukte taken" terugkijkt. */
export const FOUTEN_VENSTER_DAGEN = 7;

const DAG_MS = 86_400_000;
const isoDag = (d: Date) => d.toISOString().slice(0, 10);

/**
 * De datums die de databasefunctie meekrijgt.
 *
 * ⚠️ Het zoekverkeer eindigt `VERTRAGING_DAGEN` vóór vandaag: Google levert de
 * laatste twee dagen nog niet volledig, en een venster dat tot vandaag loopt
 * vergelijkt een halve week met een hele en toont dan elke maandag een daling.
 */
export function klantcijferVensters(nu: Date): KlantcijferVensters {
  const vandaag = Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), nu.getUTCDate());
  const tot = vandaag - VERTRAGING_DAGEN * DAG_MS;
  const van = tot - (GSC_VENSTER_DAGEN - 1) * DAG_MS;
  const vorigeTot = van - DAG_MS;
  const vorigeVan = vorigeTot - (GSC_VENSTER_DAGEN - 1) * DAG_MS;
  return {
    maandStart: isoDag(new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), 1))),
    foutenSinds: new Date(nu.getTime() - FOUTEN_VENSTER_DAGEN * DAG_MS).toISOString(),
    gscVan: isoDag(new Date(van)),
    gscTot: isoDag(new Date(tot)),
    gscVorigeVan: isoDag(new Date(vorigeVan)),
    gscVorigeTot: isoDag(new Date(vorigeTot)),
  };
}

// ── Opbouw ──────────────────────────────────────────────────────────────────

function getal(waarde: number | string | null | undefined): number | null {
  if (waarde === null || waarde === undefined) return null;
  const n = typeof waarde === "number" ? waarde : Number(waarde);
  return Number.isFinite(n) ? n : null;
}

function nieuwste(waarden: (string | null)[]): string | null {
  let beste: string | null = null;
  for (const w of waarden) if (w && (!beste || w > beste)) beste = w;
  return beste;
}

function oudste(waarden: (string | null)[]): string | null {
  let beste: string | null = null;
  for (const w of waarden) if (w && (!beste || w < beste)) beste = w;
  return beste;
}

/**
 * Ligt de klant achter op zijn pakket?
 *
 * Naar rato van de maand: bij een pakket van 8 pagina's en dag 15 van 30 zijn er
 * 4 verwacht. Achter = minder dan het hele aantal dat er nu had moeten zijn. Op
 * dag 1 is dat 0, dus niemand staat de eerste dagen van de maand al rood.
 */
export function achterOpPakket(pakket: number | null, geschreven: number | null, nu: Date): boolean | null {
  if (!pakket || pakket <= 0 || geschreven === null) return null;
  const dagenInMaand = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() + 1, 0)).getUTCDate();
  const verwacht = Math.floor((pakket * nu.getUTCDate()) / dagenInMaand);
  return geschreven < verwacht;
}

/**
 * De zichtbaarheid van één merk: de laatste en de vorige meetperiode.
 *
 * Via `brandScorePerPeriod`, dezelfde som als Resultaten, zodat de beheerder
 * hetzelfde getal ziet als de klant. `genoemd` is dezelfde som op de
 * ongewogen kolom: het aandeel vragen waarin het merk genoemd werd, zonder
 * weging naar zoekvolume.
 */
export function zichtbaarheidVanMerk(rijen: BrandScoreRow[]): {
  nu: number | null;
  vorige: number | null;
  genoemd: number | null;
} {
  const gewogen = brandScorePerPeriod(rijen);
  const ongewogen = brandScorePerPeriod(rijen.map((r) => ({ ...r, weighted_score: null, weighted_stderr: null })));
  const laatste = gewogen.at(-1);
  const vorige = gewogen.at(-2);
  return {
    nu: laatste ? laatste.score : null,
    vorige: vorige ? vorige.score : null,
    genoemd: ongewogen.at(-1)?.score ?? null,
  };
}

function gemiddelde(waarden: (number | null)[]): number | null {
  const echt = waarden.filter((w): w is number => w !== null);
  if (echt.length === 0) return null;
  return echt.reduce((a, b) => a + b, 0) / echt.length;
}

/**
 * De stand van Search Console voor de hele klant.
 *
 * Eén fout weegt zwaarder dan alles wat werkt: een beheerder die "Gekoppeld"
 * leest terwijl één van de twee merken al een week niets ophaalt, kijkt niet
 * meer. Daarna: alles gekoppeld, een deel, of niets.
 */
export function gscStandVan(
  merken: Pick<MerkInvoer, "gsc">[],
  sleutelIngesteld: boolean,
): { stand: GscStand; gekoppeld: number; fout: string | null } {
  if (merken.length === 0) return { stand: "geen_merk", gekoppeld: 0, fout: null };
  let gekoppeld = 0;
  let fout: string | null = null;
  let metProperty = 0;
  for (const m of merken) {
    const s = koppelStatus({
      property: m.gsc.property,
      verifiedAt: m.gsc.verifiedAt,
      lastError: m.gsc.lastError,
      sleutelIngesteld,
    });
    if (s.staat !== "niet_gekoppeld") metProperty++;
    if (s.goed) gekoppeld++;
    else if (s.staat !== "niet_gekoppeld" && !fout) fout = m.gsc.lastError?.trim() || s.label;
  }
  if (fout) return { stand: "fout", gekoppeld, fout };
  if (metProperty === 0) return { stand: "niet_gekoppeld", gekoppeld, fout: null };
  if (gekoppeld === merken.length) return { stand: "gekoppeld", gekoppeld, fout: null };
  return { stand: "deels", gekoppeld, fout: null };
}

/** Het dringendste segment van de merken, in de volgorde van `CSM_SEGMENTS`. */
export function dringendsteSegment(segmenten: (CsmSegment | null)[]): CsmSegment | null {
  let beste: number | null = null;
  for (const s of segmenten) {
    if (!s) continue;
    const i = CSM_SEGMENTS.indexOf(s);
    if (beste === null || i < beste) beste = i;
  }
  return beste === null ? null : CSM_SEGMENTS[beste];
}

export function bouwKlantRij(invoer: KlantInvoer, nu: Date, sleutelIngesteld: boolean): KlantRij {
  const { account, merken, cijfers: c } = invoer;
  const aantalMerken = merken.length;
  // ⚠️ De beheerder is sinds migratie 0134 lid van élk account, zodat hij de
  // klantweergave kan gebruiken. Zonder dit filter telde hij overal als
  // gebruiker mee, was zijn eigen inlog de "laatste inlog" van iedere klant, en
  // gaf het filter op zijn e-mailadres alle klanten terug.
  const leden = invoer.leden.filter((l) => !isSuperuserEmail(l.email));

  const stand: KlantStand = account.cancelled_at
    ? "opgezegd"
    : aantalMerken === 0
      ? "geen_merk"
      : !account.started_at || merken.every((m) => m.isDemo)
        ? "voor_verkoop"
        : "klant";

  const onderzoek: OnderzoekStand =
    aantalMerken === 0
      ? "geen_merk"
      : merken.some((m) => m.onderzoekVastgelopen)
        ? "vastgelopen"
        : merken.some((m) => m.onderzoekLoopt)
          ? "loopt"
          : "klaar";

  const perMerk = merken.map((m) => zichtbaarheidVanMerk(m.zichtbaarheid));
  const gemeten = perMerk.filter((z) => z.nu !== null);
  const gsc = gscStandVan(merken, sleutelIngesteld);
  const gekoppeldeMerken = merken.filter((m) => m.gsc.property?.trim());

  const geschrevenDezeMaand = c ? c.geschreven_deze_maand : null;

  return {
    id: account.id,
    naam: account.name?.trim() || "Naamloze klant",
    merken: merken.map((m) => ({ id: m.id, naam: m.naam, url: m.url })),
    emails: [
      ...new Set(
        leden.map((l) => l.email?.trim().toLowerCase()).filter((e): e is string => Boolean(e)),
      ),
    ].sort(),

    lidSinds: account.created_at,
    klantSinds: account.started_at,
    gebruikers: leden.length,
    openUitnodigingen: invoer.openUitnodigingen,
    laatsteInlog: nieuwste(leden.map((l) => l.laatsteInlog)),
    pakket: account.package_pages_per_month,
    stand,
    demoMerken: merken.filter((m) => m.isDemo).length,

    onderzoek,
    dossierCompleet:
      aantalMerken === 0 ? null : Math.round(Math.min(...merken.map((m) => m.dossierVoortgang)) * 100),
    openVragen: merken.reduce((s, m) => s + m.openVragen, 0),
    clusters: c ? c.clusters_goedgekeurd : null,
    clustersVoorgesteld: c ? c.clusters_voorgesteld : null,
    vragen: c ? c.vragen_actief : null,
    concurrenten: c ? c.concurrenten : null,

    meetplannen: c ? c.meetplannen : null,
    laatsteMeting: c?.laatste_meting ?? null,
    zichtbaarheid: gemiddelde(perMerk.map((z) => z.nu)),
    // De vorige alleen als élk gemeten merk er een heeft: anders vergelijk je
    // het gemiddelde van twee merken met dat van één.
    zichtbaarheidVorige:
      gemeten.length > 0 && gemeten.every((z) => z.vorige !== null)
        ? gemiddelde(gemeten.map((z) => z.vorige))
        : null,
    genoemd: gemiddelde(perMerk.map((z) => z.genoemd)),
    gemetenMerken: gemeten.length,

    kansenOpen: c ? c.kansen_open : null,
    kansenOpgepakt: c ? c.kansen_opgepakt : null,
    kansenVervallen: c ? c.kansen_vervallen : null,
    paginasInPlan: c ? c.paginas_in_plan : null,
    paginasGeschreven: c ? c.paginas_geschreven : null,
    wachtOpAkkoord: merken.reduce((s, m) => s + m.paginasTerGoedkeuring, 0),
    maandenWachtOpAkkoord: merken.reduce((s, m) => s + m.maandenTerGoedkeuring, 0),
    paginasGepubliceerd: c ? c.paginas_gepubliceerd : null,
    geschrevenDezeMaand,
    achterOpPakket: achterOpPakket(account.package_pages_per_month, geschrevenDezeMaand, nu),
    laatstGeschreven: c?.laatst_geschreven ?? null,

    gsc: gsc.stand,
    gscGekoppeld: gsc.gekoppeld,
    gscFout: gsc.fout,
    // De oudste ophaling van de gekoppelde merken: dat is het merk dat het
    // langst niets nieuws heeft.
    gscLaatsteOphaling: gekoppeldeMerken.length
      ? gekoppeldeMerken.some((m) => !m.gsc.lastSyncAt)
        ? null
        : oudste(gekoppeldeMerken.map((m) => m.gsc.lastSyncAt))
      : null,
    gscSinds: oudste(merken.map((m) => m.gsc.firstDay)),
    // Zonder enige koppeling is nul klikken geen nul maar onbekend.
    klikken: gekoppeldeMerken.length && c ? getal(c.gsc_klikken) : null,
    klikkenVorige: gekoppeldeMerken.length && c ? getal(c.gsc_klikken_vorige) : null,
    vertoningen: gekoppeldeMerken.length && c ? getal(c.gsc_vertoningen) : null,
    vertoningenVorige: gekoppeldeMerken.length && c ? getal(c.gsc_vertoningen_vorige) : null,

    kostenMaand: c ? getal(c.kosten_maand_usd) : null,
    kostenTotaal: c ? getal(c.kosten_totaal_usd) : null,
    mislukteTaken: c ? c.mislukte_taken : null,
    segment: dringendsteSegment(merken.map((m) => m.segment)),
  };
}

// ── Weergave ────────────────────────────────────────────────────────────────

export const KLANT_STAND_LABEL: Record<KlantStand, string> = {
  klant: "Klant",
  voor_verkoop: "Voor de verkoop",
  opgezegd: "Opgezegd",
  geen_merk: "Nog geen merk",
};

export const ONDERZOEK_LABEL: Record<OnderzoekStand, string> = {
  klaar: "Klaar",
  loopt: "Loopt",
  vastgelopen: "Vastgelopen",
  geen_merk: "Nog geen merk",
};

export const GSC_LABEL: Record<GscStand, string> = {
  gekoppeld: "Gekoppeld",
  deels: "Deels gekoppeld",
  fout: "Ophalen niet gelukt",
  niet_gekoppeld: "Niet gekoppeld",
  geen_merk: "Nog geen merk",
};

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** "3 okt 2026". Vast en zonder `toLocaleDateString`, zodat server en browser hetzelfde tonen. */
export function datumKort(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MAANDEN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "vandaag", "gisteren", "5 dagen geleden", daarna de datum. */
export function hoeLangGeleden(iso: string | null, nu: Date): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dag = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  const dagen = Math.round((dag(nu) - dag(d)) / DAG_MS);
  if (dagen <= 0) return "vandaag";
  if (dagen === 1) return "gisteren";
  if (dagen < 30) return `${dagen} dagen geleden`;
  return datumKort(iso);
}

export function bedrag(usd: number | null): string {
  if (usd === null) return "";
  return `$${usd.toFixed(2).replace(".", ",")}`;
}

function heel(n: number): string {
  return Math.round(n).toLocaleString("nl-NL");
}

/** Een verschil tegenover de vorige periode, als tekst en richting. */
export interface Verschil {
  tekst: string;
  richting: "omhoog" | "omlaag" | "vlak";
}

/** Procentueel verschil. `null` als de vorige periode nul of onbekend is: dan is er geen percentage. */
export function procentVerschil(nu: number | null, vorige: number | null): Verschil | null {
  if (nu === null || vorige === null || vorige === 0) return null;
  const p = Math.round(((nu - vorige) / vorige) * 100);
  if (p === 0) return { tekst: "gelijk", richting: "vlak" };
  return { tekst: `${p > 0 ? "+" : ""}${p}%`, richting: p > 0 ? "omhoog" : "omlaag" };
}

/** Verschil in procentpunten, voor de zichtbaarheid (die al een percentage is). */
export function puntenVerschil(nu: number | null, vorige: number | null): Verschil | null {
  if (nu === null || vorige === null) return null;
  const p = Math.round(nu - vorige);
  if (p === 0) return { tekst: "gelijk", richting: "vlak" };
  return { tekst: `${p > 0 ? "+" : ""}${p} ${Math.abs(p) === 1 ? "punt" : "punten"}`, richting: p > 0 ? "omhoog" : "omlaag" };
}

// ── De kolommen ─────────────────────────────────────────────────────────────

export const KOLOM_GROEPEN = [
  "klant",
  "onderzoek",
  "meten",
  "paginas",
  "zoekverkeer",
  "kosten",
] as const;
export type KolomGroep = (typeof KOLOM_GROEPEN)[number];

export const GROEP_LABEL: Record<KolomGroep, string> = {
  klant: "Klant en account",
  onderzoek: "Onderzoek en dossier",
  meten: "Meten",
  paginas: "Ideeën en pagina's",
  zoekverkeer: "Search Console",
  kosten: "Kosten en gezondheid",
};

/** Hoe een cel eruitziet. De tabel kiest per toon een chip; zonder toon is het gewone tekst. */
export type CelToon = "goed" | "let_op" | "fout" | "neutraal";

export interface Kolom {
  sleutel: string;
  groep: KolomGroep;
  label: string;
  /** De uitleg bij de kop: wat het getal betekent. */
  uitleg: string;
  /** Rechts uitlijnen: een getal. */
  getal?: boolean;
  /** De waarde waarop gesorteerd wordt. `null` staat altijd onderaan. */
  sorteer: (r: KlantRij) => number | string | null;
  /** De tekst in de cel én in de export. Leeg = onbekend. */
  tekst: (r: KlantRij, nu: Date) => string;
  /** Een kleine tweede regel onder de tekst. */
  bijschrift?: (r: KlantRij, nu: Date) => string;
  verschil?: (r: KlantRij) => Verschil | null;
  toon?: (r: KlantRij) => CelToon | null;
}

const tijd = (iso: string | null) => (iso ? new Date(iso).getTime() : null);
const telling = (n: number | null) => (n === null ? "" : heel(n));

export const KOLOMMEN: Kolom[] = [
  // ── Klant en account ──────────────────────────────────────────────────────
  {
    sleutel: "lidSinds",
    groep: "klant",
    label: "Lid sinds",
    uitleg: "Wanneer het account is aangemaakt",
    sorteer: (r) => tijd(r.lidSinds),
    tekst: (r) => datumKort(r.lidSinds),
  },
  {
    sleutel: "gebruikers",
    groep: "klant",
    label: "Gebruikers",
    uitleg: "Mensen met toegang, en uitnodigingen die nog openstaan",
    getal: true,
    sorteer: (r) => r.gebruikers,
    tekst: (r) => heel(r.gebruikers),
    bijschrift: (r) =>
      r.openUitnodigingen === 0
        ? ""
        : r.openUitnodigingen === 1
          ? "1 uitnodiging open"
          : `${r.openUitnodigingen} uitnodigingen open`,
  },
  {
    sleutel: "laatsteInlog",
    groep: "klant",
    label: "Laatst ingelogd",
    uitleg: "De laatste keer dat iemand van deze klant inlogde",
    sorteer: (r) => tijd(r.laatsteInlog),
    tekst: (r, nu) => (r.laatsteInlog ? hoeLangGeleden(r.laatsteInlog, nu) : "Nooit"),
  },
  {
    sleutel: "pakket",
    groep: "klant",
    label: "Pakket",
    uitleg: "Hoeveel pagina's per maand er zijn afgesproken",
    getal: true,
    sorteer: (r) => r.pakket,
    tekst: (r) => (r.pakket === null ? "Geen pakket" : `${r.pakket} per maand`),
  },
  {
    sleutel: "stand",
    groep: "klant",
    label: "Stand",
    uitleg: "Betalende klant, nog in de verkoopfase, of opgezegd",
    sorteer: (r) => KLANT_STAND_LABEL[r.stand],
    tekst: (r) => KLANT_STAND_LABEL[r.stand],
    bijschrift: (r) =>
      r.stand === "klant" && r.klantSinds
        ? `Sinds ${datumKort(r.klantSinds)}`
        : r.demoMerken > 0
          ? r.demoMerken === 1
            ? "1 voorbeeldmerk"
            : `${r.demoMerken} voorbeeldmerken`
          : "",
    toon: (r) => (r.stand === "klant" ? "goed" : r.stand === "opgezegd" ? "fout" : "neutraal"),
  },

  // ── Onderzoek en dossier ──────────────────────────────────────────────────
  {
    sleutel: "onderzoek",
    groep: "onderzoek",
    label: "Onderzoek",
    uitleg: "Of het onderzoek naar de merken klaar is, nog loopt of is vastgelopen",
    sorteer: (r) => ONDERZOEK_LABEL[r.onderzoek],
    tekst: (r) => ONDERZOEK_LABEL[r.onderzoek],
    toon: (r) =>
      r.onderzoek === "klaar" ? "goed" : r.onderzoek === "vastgelopen" ? "fout" : r.onderzoek === "loopt" ? "let_op" : null,
  },
  {
    sleutel: "dossierCompleet",
    groep: "onderzoek",
    label: "Dossier compleet",
    uitleg: "Hoeveel van het merkdossier is ingevuld. Bij meer merken: het minst complete",
    getal: true,
    sorteer: (r) => r.dossierCompleet,
    tekst: (r) => (r.dossierCompleet === null ? "" : `${r.dossierCompleet}%`),
  },
  {
    sleutel: "openVragen",
    groep: "onderzoek",
    label: "Open vragen",
    uitleg: "Vragen die op een antwoord van de klant wachten",
    getal: true,
    sorteer: (r) => r.openVragen,
    tekst: (r) => heel(r.openVragen),
  },
  {
    sleutel: "clusters",
    groep: "onderzoek",
    label: "Clusters",
    uitleg: "Goedgekeurde clusters, met eronder hoeveel er nog als voorstel klaarstaan",
    getal: true,
    sorteer: (r) => r.clusters,
    tekst: (r) => telling(r.clusters),
    bijschrift: (r) => (r.clustersVoorgesteld ? `${r.clustersVoorgesteld} voorgesteld` : ""),
  },
  {
    sleutel: "vragen",
    groep: "onderzoek",
    label: "AI-vragen",
    uitleg: "Hoeveel vragen ORBIT ENGINE bij elke meting aan de AI-modellen stelt",
    getal: true,
    sorteer: (r) => r.vragen,
    tekst: (r) => telling(r.vragen),
  },
  {
    sleutel: "concurrenten",
    groep: "onderzoek",
    label: "Concurrenten",
    uitleg: "Concurrenten die in AI-antwoorden opduiken en niet zijn weggehaald",
    getal: true,
    sorteer: (r) => r.concurrenten,
    tekst: (r) => telling(r.concurrenten),
  },

  // ── Meten ─────────────────────────────────────────────────────────────────
  {
    sleutel: "meetplannen",
    groep: "meten",
    label: "Metingen",
    uitleg: "Pagina's waarvan ORBIT ENGINE het effect volgt",
    getal: true,
    sorteer: (r) => r.meetplannen,
    tekst: (r) => telling(r.meetplannen),
  },
  {
    sleutel: "laatsteMeting",
    groep: "meten",
    label: "Laatste meetronde",
    uitleg: "Wanneer er voor het laatst gemeten is. Een oude datum betekent verouderde cijfers",
    sorteer: (r) => tijd(r.laatsteMeting),
    tekst: (r, nu) => (r.laatsteMeting ? hoeLangGeleden(r.laatsteMeting, nu) : "Nog niet gemeten"),
  },
  {
    sleutel: "zichtbaarheid",
    groep: "meten",
    label: "Zichtbaarheid",
    uitleg: "Hetzelfde cijfer als in Resultaten, met het verschil tegenover de vorige meting",
    getal: true,
    sorteer: (r) => r.zichtbaarheid,
    tekst: (r) => (r.zichtbaarheid === null ? "" : `${Math.round(r.zichtbaarheid)}%`),
    bijschrift: (r) => (r.gemetenMerken > 1 ? `gemiddelde van ${r.gemetenMerken} merken` : ""),
    verschil: (r) => puntenVerschil(r.zichtbaarheid, r.zichtbaarheidVorige),
  },
  {
    sleutel: "genoemd",
    groep: "meten",
    label: "Genoemd",
    uitleg: "In hoeveel procent van de AI-antwoorden het merk genoemd werd, zonder weging naar zoekvolume",
    getal: true,
    sorteer: (r) => r.genoemd,
    tekst: (r) => (r.genoemd === null ? "" : `${Math.round(r.genoemd)}%`),
  },

  // ── Ideeën en pagina's ────────────────────────────────────────────────────
  {
    sleutel: "kansenOpen",
    groep: "paginas",
    label: "Ideeën open",
    uitleg: "Kansen waar nog niets mee gedaan is",
    getal: true,
    sorteer: (r) => r.kansenOpen,
    tekst: (r) => telling(r.kansenOpen),
  },
  {
    sleutel: "kansenOpgepakt",
    groep: "paginas",
    label: "Opgepakt",
    uitleg: "Kansen die ingepland, geschreven of live zijn",
    getal: true,
    sorteer: (r) => r.kansenOpgepakt,
    tekst: (r) => telling(r.kansenOpgepakt),
  },
  {
    sleutel: "kansenVervallen",
    groep: "paginas",
    label: "Vervallen",
    uitleg: "Kansen die niet meer gelden",
    getal: true,
    sorteer: (r) => r.kansenVervallen,
    tekst: (r) => telling(r.kansenVervallen),
  },
  {
    sleutel: "paginasInPlan",
    groep: "paginas",
    label: "In het plan",
    uitleg: "Pagina's in het contentplan, zonder reserves",
    getal: true,
    sorteer: (r) => r.paginasInPlan,
    tekst: (r) => telling(r.paginasInPlan),
  },
  {
    sleutel: "paginasGeschreven",
    groep: "paginas",
    label: "Geschreven",
    uitleg: "Pagina's waarvan een tekst klaarstaat",
    getal: true,
    sorteer: (r) => r.paginasGeschreven,
    tekst: (r) => telling(r.paginasGeschreven),
  },
  {
    sleutel: "wachtOpAkkoord",
    groep: "paginas",
    label: "Wacht op akkoord",
    uitleg: "Pagina's die op een akkoord van de klant wachten",
    getal: true,
    sorteer: (r) => r.wachtOpAkkoord,
    tekst: (r) => heel(r.wachtOpAkkoord),
    bijschrift: (r) =>
      r.maandenWachtOpAkkoord === 0
        ? ""
        : r.maandenWachtOpAkkoord === 1
          ? "en 1 maand"
          : `en ${r.maandenWachtOpAkkoord} maanden`,
    toon: (r) => (r.wachtOpAkkoord + r.maandenWachtOpAkkoord > 0 ? "let_op" : null),
  },
  {
    sleutel: "paginasGepubliceerd",
    groep: "paginas",
    label: "Live",
    uitleg: "Pagina's die op de website van de klant staan",
    getal: true,
    sorteer: (r) => r.paginasGepubliceerd,
    tekst: (r) => telling(r.paginasGepubliceerd),
  },
  {
    sleutel: "dezeMaand",
    groep: "paginas",
    label: "Deze maand",
    uitleg: "Nieuw geschreven pagina's deze maand, tegenover het pakket",
    getal: true,
    sorteer: (r) => r.geschrevenDezeMaand,
    tekst: (r) =>
      r.geschrevenDezeMaand === null
        ? ""
        : r.pakket
          ? `${r.geschrevenDezeMaand} van ${r.pakket}`
          : heel(r.geschrevenDezeMaand),
    bijschrift: (r) => (r.achterOpPakket ? "loopt achter" : ""),
    toon: (r) => (r.achterOpPakket === true ? "let_op" : null),
  },
  {
    sleutel: "laatstGeschreven",
    groep: "paginas",
    label: "Laatst geschreven",
    uitleg: "Wanneer er voor het laatst een pagina is geschreven",
    sorteer: (r) => tijd(r.laatstGeschreven),
    tekst: (r, nu) => (r.laatstGeschreven ? hoeLangGeleden(r.laatstGeschreven, nu) : "Nog niets"),
  },

  // ── Search Console ────────────────────────────────────────────────────────
  {
    sleutel: "gsc",
    groep: "zoekverkeer",
    label: "Koppeling",
    uitleg: "Of ORBIT ENGINE het zoekverkeer van de klant kan ophalen",
    sorteer: (r) => GSC_LABEL[r.gsc],
    tekst: (r) => GSC_LABEL[r.gsc],
    bijschrift: (r) =>
      r.gsc === "fout" ? (r.gscFout ?? "") : r.gsc === "deels" ? `${r.gscGekoppeld} van ${r.merken.length} merken` : "",
    toon: (r) => (r.gsc === "gekoppeld" ? "goed" : r.gsc === "fout" ? "fout" : r.gsc === "deels" ? "let_op" : "neutraal"),
  },
  {
    sleutel: "gscLaatsteOphaling",
    groep: "zoekverkeer",
    label: "Laatst opgehaald",
    uitleg: "Wanneer het zoekverkeer voor het laatst is opgehaald. Bij meer merken: het oudste",
    sorteer: (r) => tijd(r.gscLaatsteOphaling),
    tekst: (r, nu) => hoeLangGeleden(r.gscLaatsteOphaling, nu),
  },
  {
    sleutel: "gscSinds",
    groep: "zoekverkeer",
    label: "Gegevens sinds",
    uitleg: "De eerste dag waarvan zoekverkeer binnen is",
    sorteer: (r) => tijd(r.gscSinds),
    tekst: (r) => datumKort(r.gscSinds),
  },
  {
    sleutel: "klikken",
    groep: "zoekverkeer",
    label: "Klikken",
    uitleg: `Klikken vanuit Google in de laatste ${GSC_VENSTER_DAGEN} dagen, tegenover de ${GSC_VENSTER_DAGEN} dagen daarvoor`,
    getal: true,
    sorteer: (r) => r.klikken,
    tekst: (r) => telling(r.klikken),
    verschil: (r) => procentVerschil(r.klikken, r.klikkenVorige),
  },
  {
    sleutel: "vertoningen",
    groep: "zoekverkeer",
    label: "Vertoningen",
    uitleg: `Keren dat de website in Google verscheen in de laatste ${GSC_VENSTER_DAGEN} dagen, tegenover de ${GSC_VENSTER_DAGEN} dagen daarvoor`,
    getal: true,
    sorteer: (r) => r.vertoningen,
    tekst: (r) => telling(r.vertoningen),
    verschil: (r) => procentVerschil(r.vertoningen, r.vertoningenVorige),
  },

  // ── Kosten en gezondheid ──────────────────────────────────────────────────
  {
    sleutel: "kostenMaand",
    groep: "kosten",
    label: "AI-kosten deze maand",
    uitleg: "Wat de AI-aanroepen voor deze klant deze maand kostten, in dollars",
    getal: true,
    sorteer: (r) => r.kostenMaand,
    tekst: (r) => bedrag(r.kostenMaand),
  },
  {
    sleutel: "kostenTotaal",
    groep: "kosten",
    label: "AI-kosten totaal",
    uitleg: "Wat de AI-aanroepen voor deze klant sinds de start kostten, in dollars",
    getal: true,
    sorteer: (r) => r.kostenTotaal,
    tekst: (r) => bedrag(r.kostenTotaal),
  },
  {
    sleutel: "mislukteTaken",
    groep: "kosten",
    label: "Niet gelukte taken",
    uitleg: `Taken die in de laatste ${FOUTEN_VENSTER_DAGEN} dagen na vier pogingen nog steeds niet lukten`,
    getal: true,
    sorteer: (r) => r.mislukteTaken,
    tekst: (r) => telling(r.mislukteTaken),
    toon: (r) => (r.mislukteTaken ? "fout" : null),
  },
  {
    sleutel: "segment",
    groep: "kosten",
    label: "Waar ligt de bal",
    uitleg: "De stand uit Alle merken. Bij meer merken: het merk dat het eerst aandacht vraagt",
    sorteer: (r) => (r.segment ? CSM_SEGMENTS.indexOf(r.segment) : null),
    tekst: (r) => (r.segment ? CSM_SEGMENT_META[r.segment].label : ""),
    toon: (r) =>
      r.segment === null
        ? null
        : r.segment === "loopt"
          ? "goed"
          : r.segment === "vastgelopen"
            ? "fout"
            : CSM_SEGMENT_META[r.segment].actie
              ? "let_op"
              : "neutraal",
  },
];

// ── Filteren, sorteren, exporteren ──────────────────────────────────────────

export interface KlantFilter {
  /** Zoekt in de klantnaam en de namen en adressen van de merken. */
  zoek: string;
  /** Eén klant uit de keuzelijst, of leeg voor allemaal. */
  klantId: string;
  /** Een (deel van een) e-mailadres van een gebruiker. */
  email: string;
}

export function filterKlanten(rijen: KlantRij[], filter: KlantFilter): KlantRij[] {
  const zoek = filter.zoek.trim().toLowerCase();
  const email = filter.email.trim().toLowerCase();
  return rijen.filter((r) => {
    if (filter.klantId && r.id !== filter.klantId) return false;
    if (email && !r.emails.some((e) => e.includes(email))) return false;
    if (zoek) {
      const hooiberg = [r.naam, ...r.merken.flatMap((m) => [m.naam, m.url ?? ""])].join(" ").toLowerCase();
      if (!hooiberg.includes(zoek)) return false;
    }
    return true;
  });
}

/** Sorteert op één kolom. Onbekend staat altijd onderaan, welke kant je ook op sorteert. */
export function sorteerKlanten(
  rijen: KlantRij[],
  sorteer: (r: KlantRij) => number | string | null,
  richting: "op" | "af",
): KlantRij[] {
  const teken = richting === "op" ? 1 : -1;
  return [...rijen].sort((a, b) => {
    const x = sorteer(a);
    const y = sorteer(b);
    if (x === null && y === null) return a.naam.localeCompare(b.naam, "nl");
    if (x === null) return 1;
    if (y === null) return -1;
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "nl");
    return c === 0 ? a.naam.localeCompare(b.naam, "nl") : c * teken;
  });
}

function csvCel(waarde: string): string {
  return /[";\n]/.test(waarde) ? `"${waarde.replace(/"/g, '""')}"` : waarde;
}

/**
 * Alle kolommen van alle groepen, met puntkomma's: zo opent Excel met
 * Nederlandse instellingen het bestand meteen in kolommen.
 */
export function klantenCsv(rijen: KlantRij[], nu: Date): string {
  const kop = ["Klant", "Merken", "Gebruikers (e-mail)", ...KOLOMMEN.map((k) => k.label)];
  const regels = rijen.map((r) => [
    r.naam,
    r.merken.map((m) => m.naam).join(", "),
    r.emails.join(", "),
    ...KOLOMMEN.map((k) => {
      const tekst = k.tekst(r, nu);
      const verschil = k.verschil?.(r);
      return verschil ? `${tekst} (${verschil.tekst})` : tekst;
    }),
  ]);
  return [kop, ...regels].map((regel) => regel.map(csvCel).join(";")).join("\r\n");
}
