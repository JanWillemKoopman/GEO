/**
 * DE BEWIJSLADDER (M4 van `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Zeven tredes, van "gepubliceerd" tot "omzet". Per trede één van vier
 * standen: **bewezen**, **geen verandering**, **te weinig gegevens**, of
 * **geen gegevens**. Dat laatste is geen nul (conventie 3): een merk zonder
 * Search Console-koppeling of zonder CRM heeft geen "0% conversie", het heeft
 * gewoon geen meting.
 *
 * ── WAAROM GEEN STATISTIEK OP DE SEARCH CONSOLE-CIJFERS ─────────────────────
 *
 * "Genoemd door AI" (`lib/pipeline/impact-math.ts`) vergelijkt een STEEKPROEF
 * van AI-antwoorden vóór en na publicatie, en heeft daarom een foutmarge nodig
 * (twee keer dezelfde 30 vragen stellen geeft al een ander getal). Vertoningen
 * en klikken uit Search Console zijn geen steekproef: het zijn de echte
 * tellingen van Google zelf. Een nieuwe pagina had daarvoor geen vertoningen
 * (de URL bestond nog niet), dus is er ook geen "vóór" nodig: de vraag is
 * alleen of Google hem inmiddels laat zien, na genoeg dagen om dat te kunnen
 * weten.
 *
 * ── GEEN DUBBELE WAARHEID ────────────────────────────────────────────────────
 *
 * Deze module rekent niets zelf uit wat elders al bestaat: "genoemd door AI"
 * en "geciteerd door AI" lezen een bestaande `content_impact`-rij
 * (`lib/pipeline/impact-math.ts`, M3), de tekst bij "genoemd door AI" komt uit
 * `lib/impact-uitleg.ts`. Deze module beslist alleen welke van de vier
 * standen daarbij hoort, en voegt de twee tredes toe die nog nergens stonden
 * (zichtbaar in Google, verkeer) en de twee die nooit gemeten worden binnen
 * dit plan (conversie, omzet, §5 van het plan: geen Analytics- of
 * CRM-koppeling).
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { impactUitleg, type ImpactCijfers } from "@/lib/impact-uitleg";
import { formatDateLong } from "@/lib/format";

export type TredeStatus = "bewezen" | "geen_verandering" | "te_weinig_gegevens" | "geen_gegevens";

export const TREDE_SLEUTELS = [
  "publicatie",
  "zichtbaarheid",
  "vermelding",
  "citatie",
  "verkeer",
  "conversie",
  "omzet",
] as const;
export type TredeSleutel = (typeof TREDE_SLEUTELS)[number];

export const TREDE_LABEL: Record<TredeSleutel, string> = {
  publicatie: "Gepubliceerd en gecontroleerd",
  zichtbaarheid: "Zichtbaar in Google",
  vermelding: "Genoemd door AI",
  citatie: "Geciteerd door AI",
  verkeer: "Verkeer",
  conversie: "Conversie",
  omzet: "Omzet",
};

export interface Trede {
  sleutel: TredeSleutel;
  label: string;
  status: TredeStatus;
  /** Kort genoeg voor een tabelcel, `null` zonder cijfer om te tonen. */
  cijfer: string | null;
  /** De uitleg in gewone taal, voor het detailpaneel. */
  uitleg: string;
}

/**
 * Hoeveel dagen na publicatie Google genoeg tijd heeft gehad om een nieuwe
 * pagina te laten zien in de zoekresultaten. Dezelfde grens als de eerste
 * meetgolf van de AI-effectmeting (`IMPACT_WAVES` in `impact-math.ts`): geen
 * tweede eigen getal voor "vroeg genoeg om iets te kunnen zeggen".
 */
export const MIN_DAGEN_ZOEKMACHINE = 14;

/** Vertoningen of klikken sinds publicatie, met hoeveel dagen dat al meet. */
export interface AantalSindsPublicatie {
  aantal: number;
  dagenSindsPublicatie: number;
}

export interface BewijsladderInvoer {
  /** `null` = nog niet live. */
  gepubliceerdOp: string | null;
  /** Vertoningen uit Search Console. `null` = geen koppeling of geen data. */
  zoekmachine: AantalSindsPublicatie | null;
  /** De laatste gemeten golf van de AI-effectmeting (M1/M3). `null` = nog geen golf gemeten. */
  vermelding: ImpactCijfers | null;
  /** Dezelfde golf als `vermelding`, alleen het citatieveld (M3). `null` = geen golf, of geen adres bekend. */
  eigenSiteGeciteerd: boolean | null;
  /** Klikken uit Search Console. `null` = geen koppeling of geen data. */
  verkeer: AantalSindsPublicatie | null;
}

function tredePublicatie(gepubliceerdOp: string | null): Trede {
  const label = TREDE_LABEL.publicatie;
  if (!gepubliceerdOp) {
    return { sleutel: "publicatie", label, status: "geen_gegevens", cijfer: null, uitleg: "Deze pagina staat nog niet op de site." };
  }
  return {
    sleutel: "publicatie",
    label,
    status: "bewezen",
    cijfer: formatDateLong(gepubliceerdOp),
    uitleg: `Gepubliceerd op ${formatDateLong(gepubliceerdOp)}, na de redactionele controle.`,
  };
}

/** Gedeelde regel voor "zichtbaarheid" en "verkeer": een echte telling, geen steekproef. */
function tredeAantal(
  sleutel: "zichtbaarheid" | "verkeer",
  eenheid: "vertoning" | "klik",
  gepubliceerdOp: string | null,
  cijfer: AantalSindsPublicatie | null,
): Trede {
  const label = TREDE_LABEL[sleutel];
  const meervoud = eenheid === "vertoning" ? "vertoningen" : "klikken";
  if (!gepubliceerdOp) {
    return { sleutel, label, status: "geen_gegevens", cijfer: null, uitleg: "Deze pagina staat nog niet op de site." };
  }
  if (!cijfer) {
    return {
      sleutel,
      label,
      status: "geen_gegevens",
      cijfer: null,
      uitleg: "Search Console is niet gekoppeld, dus hier is geen cijfer over.",
    };
  }
  if (cijfer.dagenSindsPublicatie < MIN_DAGEN_ZOEKMACHINE) {
    return {
      sleutel,
      label,
      status: "te_weinig_gegevens",
      cijfer: null,
      uitleg: `Pas ${MIN_DAGEN_ZOEKMACHINE} dagen geleden gepubliceerd. Google heeft nog niet genoeg tijd gehad.`,
    };
  }
  if (cijfer.aantal > 0) {
    return {
      sleutel,
      label,
      status: "bewezen",
      cijfer: `${cijfer.aantal.toLocaleString("nl-NL")} ${cijfer.aantal === 1 ? eenheid : meervoud}`,
      uitleg: `${cijfer.aantal.toLocaleString("nl-NL")} ${cijfer.aantal === 1 ? eenheid : meervoud} sinds publicatie.`,
    };
  }
  return {
    sleutel,
    label,
    status: "geen_verandering",
    cijfer: `0 ${meervoud}`,
    uitleg: `Nog geen enkele ${eenheid} sinds publicatie, ondanks ${cijfer.dagenSindsPublicatie} dagen.`,
  };
}

const VERDICT_STATUS: Record<ImpactCijfers["verdict"], TredeStatus> = {
  gestegen: "bewezen",
  gelijk: "geen_verandering",
  gedaald: "geen_verandering",
  te_weinig_data: "te_weinig_gegevens",
};

function tredeVermelding(vermelding: ImpactCijfers | null): Trede {
  const label = TREDE_LABEL.vermelding;
  if (!vermelding) {
    return { sleutel: "vermelding", label, status: "geen_gegevens", cijfer: null, uitleg: "Nog geen meting na publicatie." };
  }
  const u = impactUitleg(vermelding);
  return { sleutel: "vermelding", label, status: VERDICT_STATUS[vermelding.verdict], cijfer: u.kort, uitleg: u.conclusie };
}

function tredeCitatie(vermelding: ImpactCijfers | null, eigenSiteGeciteerd: boolean | null): Trede {
  const label = TREDE_LABEL.citatie;
  // Een golf is nodig om een citatie te kunnen zien; zonder golf is er niets
  // gemeten (geen_gegevens), niet "nee" (conventie 3).
  if (!vermelding || eigenSiteGeciteerd === null) {
    return { sleutel: "citatie", label, status: "geen_gegevens", cijfer: null, uitleg: "Nog geen meting die citaties meeneemt." };
  }
  return eigenSiteGeciteerd
    ? { sleutel: "citatie", label, status: "bewezen", cijfer: "geciteerd", uitleg: "AI citeerde deze pagina als bron in het antwoord." }
    : { sleutel: "citatie", label, status: "geen_verandering", cijfer: "niet geciteerd", uitleg: "AI noemde het merk, maar citeerde deze pagina niet als bron." };
}

/** Geen Analytics- of CRM-koppeling in dit plan (§5): altijd geen gegevens. */
function tredeZonderBron(sleutel: "conversie" | "omzet", reden: string): Trede {
  return { sleutel, label: TREDE_LABEL[sleutel], status: "geen_gegevens", cijfer: null, uitleg: reden };
}

/**
 * De hele ladder, in vaste volgorde. Geen enkele trede beïnvloedt een andere:
 * elke trede leest zijn eigen invoer, en een gat in de ene trede (bijvoorbeeld
 * geen Search Console) laat de andere ongemoeid.
 */
export function bewijsladder(invoer: BewijsladderInvoer): Trede[] {
  return [
    tredePublicatie(invoer.gepubliceerdOp),
    tredeAantal("zichtbaarheid", "vertoning", invoer.gepubliceerdOp, invoer.zoekmachine),
    tredeVermelding(invoer.vermelding),
    tredeCitatie(invoer.vermelding, invoer.eigenSiteGeciteerd),
    tredeAantal("verkeer", "klik", invoer.gepubliceerdOp, invoer.verkeer),
    tredeZonderBron("conversie", "ORBIT ENGINE is niet gekoppeld aan je boekhouding of CRM, dus hier is geen cijfer over."),
    tredeZonderBron("omzet", "ORBIT ENGINE is niet gekoppeld aan je boekhouding of CRM, dus hier is geen cijfer over."),
  ];
}

/**
 * De verst bereikte trede, voor een compacte samenvatting (een tabelkolom die
 * niet alle zeven regels kan tonen). `null` als geen enkele trede bewezen is.
 * Niet per se aaneengesloten: een latere trede kan bewezen zijn terwijl een
 * eerdere "geen verandering" is (bijvoorbeeld genoemd zonder dat Google al
 * genoeg tijd had). Dat is geen bug: elke trede meet zijn eigen ding.
 */
export function hoogsteBewezenTrede(ladder: readonly Trede[]): Trede | null {
  let hoogste: Trede | null = null;
  for (const trede of ladder) {
    if (trede.status === "bewezen") hoogste = trede;
  }
  return hoogste;
}
