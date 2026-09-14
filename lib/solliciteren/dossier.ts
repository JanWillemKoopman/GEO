/**
 * Het dossier: jouw materiaal, los van welke vacature dan ook.
 *
 * ── DE OMKERING VAN MIGRATIE 0096 ──────────────────────────────────────────
 *
 * Tot 0096 stonden het CV en de eerdere brieven op het gesprek, naast de
 * vacature. Wie op vijf vacatures reageerde plakte zijn loopbaan vijf keer. Nu
 * hangt het materiaal aan de persoon en de vacature aan het gesprek, en is een
 * nieuwe brief: vacature plakken, knop.
 *
 * ── HET SOORT IS GEEN ORDENING MAAR EEN FUNCTIE ────────────────────────────
 *
 * Een `brief` is het materiaal waar `lib/solliciteren/stem.ts` de schrijfstijl
 * uit meet. Een `cv` is het materiaal waar de sleutelwoordvergelijking tegenaan
 * legt. Die twee door elkaar halen zou de gemeten stem vervuilen met
 * opsommingen en jaartallen, en dat is precies het register dat een brief niet
 * moet hebben. Vandaar dat het soort in de database staat (0096) en niet alleen
 * als kopje op het scherm.
 *
 * Pure module zonder `server-only` (conventie 2).
 */
import type { SollicitatieDocumentSoort } from "@/lib/types/database";

/** Eén stuk uit het dossier, zoals het scherm en de aanroep hem nodig hebben. */
export interface Dossierstuk {
  id: string;
  soort: SollicitatieDocumentSoort;
  titel: string;
  inhoud: string;
}

interface Soortbeschrijving {
  id: SollicitatieDocumentSoort;
  /** Enkelvoud, voor de keuzelijst. */
  naam: string;
  /** Meervoud, voor het kopje boven de groep. */
  groep: string;
  /** Eén regel: wat dit soort materiaal doet. */
  waarvoor: string;
}

/**
 * De volgorde hieronder is ook de volgorde op het scherm en in de aanroep, en
 * die is niet willekeurig: het CV eerst, want dat is het skelet, dan de
 * brieven, want daar komt de toon vandaan, dan de rest.
 */
export const SOORTEN: readonly Soortbeschrijving[] = [
  {
    id: "cv",
    naam: "CV",
    groep: "Je CV",
    waarvoor: "Het skelet: opleiding, werk, jaartallen, resultaten.",
  },
  {
    id: "brief",
    naam: "Eerdere brief",
    groep: "Eerdere brieven",
    waarvoor: "Hier wordt je schrijfstijl aan gemeten. Hoe meer je er zet, hoe scherper dat wordt.",
  },
  {
    id: "motivatie",
    naam: "Motivatie",
    groep: "Motivaties",
    waarvoor: "Waarom je dit werk doet. Levert de argumenten, niet de toon.",
  },
  {
    id: "project",
    naam: "Project",
    groep: "Projecten",
    waarvoor: "Wat je concreet hebt gedaan. Dit is waar een brief zijn bewijs vandaan haalt.",
  },
  { id: "overig", naam: "Overig", groep: "Overig", waarvoor: "Alles wat verder van pas kan komen." },
] as const;

export function isGeldigeSoort(waarde: unknown): waarde is SollicitatieDocumentSoort {
  return SOORTEN.some((s) => s.id === waarde);
}

export function vindSoort(id: SollicitatieDocumentSoort): Soortbeschrijving {
  return SOORTEN.find((s) => s.id === id) ?? SOORTEN[SOORTEN.length - 1];
}

/**
 * Hoeveel tekens er per stuk meegaan.
 *
 * Ruim: een CV is zelden langer dan 8.000 tekens en een projectbeschrijving
 * zelden langer dan 5.000. 60.000 is dus geen beperking op normaal gebruik maar
 * een grens tegen een ongeluk, bijvoorbeeld een heel jaarverslag dat per
 * ongeluk in een veld belandt.
 */
export const MAX_DOCUMENT_TEKENS = 60_000;

/**
 * Hoe lang de naam van een stuk mag zijn. Hij staat in een lijst naast zijn
 * soort en zijn omvang, dus kort genoeg om op één regel te passen.
 */
export const MAX_TITEL = 120;

/**
 * Hoeveel tekens het hele dossier hoogstens meeneemt.
 *
 * Het dossier gaat bij ELK bericht voluit mee, dus dit getal bepaalt wat een
 * vervolgvraag kost. 240.000 tekens is ongeveer 60.000 tokens, ruim tien keer
 * een normaal dossier (een CV, vijf brieven en vijf projecten komen samen rond
 * de 25.000 tekens). Wordt het toch groter, dan vallen de laatste stukken eraf
 * en zegt het scherm welke: stil afkappen zou een brief laten schrijven zonder
 * materiaal waarvan je denkt dat het meegaat.
 */
export const MAX_DOSSIER_TEKENS = 240_000;

export interface Dossieromvang {
  stukken: number;
  tekens: number;
  /** Ruwe schatting, ongeveer vier tekens per token bij Nederlandse tekst. */
  tokens: number;
  /** Stukken die niet meer binnen `MAX_DOSSIER_TEKENS` pasten. */
  afgevallen: string[];
}

/** Sorteer op soort in de volgorde van `SOORTEN`, daarbinnen op titel. */
export function sorteerDossier(stukken: readonly Dossierstuk[]): Dossierstuk[] {
  const rang = new Map(SOORTEN.map((s, i) => [s.id, i]));
  return [...stukken].sort(
    (a, b) =>
      (rang.get(a.soort) ?? 99) - (rang.get(b.soort) ?? 99) ||
      a.titel.localeCompare(b.titel, "nl"),
  );
}

/**
 * Welke stukken passen er binnen de grens, en welke vallen af.
 *
 * Op volgorde, dus het CV en de brieven vallen als laatste af. Dat is de goede
 * volgorde: zonder CV is er geen brief, zonder het zesde project wel.
 */
export function pasDossierIn(stukken: readonly Dossierstuk[]): {
  mee: Dossierstuk[];
  omvang: Dossieromvang;
} {
  const gesorteerd = sorteerDossier(stukken);
  const mee: Dossierstuk[] = [];
  const afgevallen: string[] = [];
  let tekens = 0;

  for (const stuk of gesorteerd) {
    const inhoud = stuk.inhoud.trim().slice(0, MAX_DOCUMENT_TEKENS);
    if (!inhoud) continue;
    if (tekens + inhoud.length > MAX_DOSSIER_TEKENS) {
      afgevallen.push(stuk.titel);
      continue;
    }
    mee.push({ ...stuk, inhoud });
    tekens += inhoud.length;
  }

  return {
    mee,
    omvang: { stukken: mee.length, tekens, tokens: Math.round(tekens / 4), afgevallen },
  };
}

/**
 * Het dossier als één blok tekst voor de aanroep.
 *
 * Elk stuk krijgt zijn soort en zijn titel mee, zodat het model kan verwijzen
 * naar "je project bij Van Dijk" in plaats van naar "het bronmateriaal". Geeft
 * `null` als er niets ligt: een leeg blok meesturen zou het model laten denken
 * dat er een dossier is dat niets zegt, en dan gaat het invullen.
 */
export function bouwDossierblok(stukken: readonly Dossierstuk[]): string | null {
  const { mee } = pasDossierIn(stukken);
  if (mee.length === 0) return null;

  const delen: string[] = [
    "Dit is het dossier van deze persoon. Alles wat je over hem schrijft komt hiervandaan.",
  ];

  for (const stuk of mee) {
    delen.push("", `=== ${vindSoort(stuk.soort).naam.toUpperCase()}: ${stuk.titel} ===`, stuk.inhoud);
  }

  return delen.join("\n");
}

/** De eerdere brieven, waar `stem.ts` de schrijfstijl aan meet. */
export function brievenUit(stukken: readonly Dossierstuk[]): string[] {
  return stukken.filter((s) => s.soort === "brief" && s.inhoud.trim()).map((s) => s.inhoud);
}

/**
 * Alles wat feiten over de loopbaan bevat, als één tekst.
 *
 * Voor de sleutelwoordvergelijking: die legt de vacature naast wat je kúnt, en
 * dat staat net zo goed in een projectbeschrijving als in het CV. De eerdere
 * brieven horen er niet bij, want die gaan over eerdere vacatures en zouden de
 * vergelijking laten slagen op woorden die niets met jou te maken hebben.
 */
export function feitenmateriaalUit(stukken: readonly Dossierstuk[]): string {
  return stukken
    .filter((s) => s.soort === "cv" || s.soort === "project" || s.soort === "motivatie")
    .map((s) => s.inhoud)
    .join("\n\n");
}
