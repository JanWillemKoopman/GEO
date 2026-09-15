/**
 * De feitenkaart: het concreetste materiaal uit je dossier, uitgelicht.
 *
 * ── DEZE KAART IS OP 15 SEPTEMBER 2026 VAN ROL VERANDERD ───────────────────
 *
 * Hij begon als GESLOTEN lijst, overgenomen uit `lib/pipeline/factcard.ts`:
 * alles wat er niet op stond mocht een brief niet beweren. Daar is dat juist,
 * want die tekst gaat zonder tussenkomst naar de site van een klant. Hier niet:
 * de schrijver is zelf het onderwerp en leest elke brief na. De grens kocht dus
 * weinig en kostte veel. Wat de uitleesronde miste was voor de brief weg, de
 * kaart mocht niets afleiden dus de brief ook niet, en een model dat per zin
 * moet verantwoorden schrijft vlakker. Daar komt bij dat het volledige dossier
 * er toch al naast meeging, dus de instructie verbood materiaal dat er lag.
 *
 * Wat de kaart nu is, en waarom hij blijft bestaan:
 *
 * 1. **Een spiegel op je dossier.** Komen er na een uitleesronde drie punten
 *    met een getal uit, dan weet je dat je dossier je te weinig munitie geeft.
 *    Dat is informatie over jou, geen beperking van het model.
 * 2. **Een zetje in de prompt.** Hij gaat mee als "dit is het concreetste
 *    materiaal, gebruik het waar het past", naast het volledige dossier en
 *    zonder verbod op de rest.
 *
 * De controle op verzinsels is verhuisd naar `lib/solliciteren/herkomst.ts`, die
 * ná het schrijven opzoekt of de getallen en namen uit de brief ergens in je
 * materiaal staan. Aanwijzen achteraf kost geen creativiteit; verbieden vooraf
 * wel.
 *
 * Pure module zonder `server-only` (conventie 2).
 */
import { z } from "zod";
import { splitsInZinnen } from "@/lib/solliciteren/woorden";

/** De zes soorten feiten. Puur ordening op het scherm en in de prompt. */
export const CATEGORIEEN = [
  { id: "werk", naam: "Werk", waarvoor: "Waar je hebt gewerkt, in welke rol, hoe lang." },
  { id: "resultaat", naam: "Resultaat", waarvoor: "Wat er veranderde doordat jij er was. Liefst met een getal." },
  { id: "vaardigheid", naam: "Vaardigheid", waarvoor: "Wat je kunt, en waaruit dat blijkt." },
  { id: "opleiding", naam: "Opleiding", waarvoor: "Diploma's, cursussen, certificaten." },
  { id: "drijfveer", naam: "Drijfveer", waarvoor: "Waarom je dit werk doet. Dit draagt de motivatie." },
  { id: "overig", naam: "Overig", waarvoor: "Wat verder waar is en van pas kan komen." },
] as const;

export type Feitcategorie = (typeof CATEGORIEEN)[number]["id"];

export function isGeldigeCategorie(waarde: unknown): waarde is Feitcategorie {
  return CATEGORIEEN.some((c) => c.id === waarde);
}

export function vindCategorie(id: Feitcategorie) {
  return CATEGORIEEN.find((c) => c.id === id) ?? CATEGORIEEN[CATEGORIEEN.length - 1];
}

/** Eén feit, zoals het scherm en de prompt hem nodig hebben. */
export interface Feit {
  id: string;
  /** Het vaste F-nummer. Verschuift nooit, ook niet als een ander feit weggaat. */
  nummer: number;
  categorie: Feitcategorie;
  tekst: string;
  periode: string | null;
  /** De zin uit het dossier waar dit feit op steunt. */
  bronzin: string;
  /** Door een mens gezet of gecorrigeerd? Dan blijft hij bij een nieuwe ronde staan. */
  handmatig: boolean;
}

/** Het label waarmee de brief naar dit feit verwijst. */
export function refVan(feit: Pick<Feit, "nummer">): string {
  return `F${feit.nummer}`;
}

/* ─────────────────────────────────────────────────────────────────────────
   HET SCHEMA VAN DE UITLEESRONDE
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Wat de uitleesronde teruggeeft. Bewust zonder nummer: de nummers worden in de
 * route toegekend, niet door het model. Een model dat zijn eigen nummers
 * verzint, geeft er bij een tweede ronde andere, en dan verwijst een bewaarde
 * brief naar het verkeerde feit.
 *
 * `bronzin` is verplicht en mag niet leeg: dat is de hele reden dat een feit na
 * te trekken is. Een feit zonder bronzin wordt in `zeefFeiten()` weggegooid, ook
 * al zegt het model dat het klopt.
 */
export const UitgelezenFeit = z.object({
  categorie: z.enum(["werk", "resultaat", "vaardigheid", "opleiding", "drijfveer", "overig"]),
  tekst: z.string(),
  periode: z.string().nullable(),
  bronzin: z.string(),
});

export const Feitenoogst = z.object({
  feiten: z.array(UitgelezenFeit),
});

export type UitgelezenFeitType = z.infer<typeof UitgelezenFeit>;

/** Hoeveel feiten een ronde hoogstens oplevert. Meer is geen kaart maar het dossier nog een keer. */
export const MAX_FEITEN_PER_RONDE = 60;

/**
 * Gooit weg wat niet bruikbaar is: een feit zonder tekst, zonder bronzin, of met
 * een bronzin die niet in het dossier voorkomt.
 *
 * Die laatste is het deterministische vangnet onder de instructie "citeer
 * letterlijk" (conventie 1). Zonder deze controle kan het model een bronzin
 * samenvatten of net iets mooier maken, en dan bewijst de bronzin niets meer.
 * De vergelijking gaat op genormaliseerde witruimte, want een PDF levert
 * regelafbrekingen op plekken waar geen regel hoort.
 */
export function zeefFeiten(
  uitgelezen: readonly UitgelezenFeitType[],
  dossiertekst: string,
): UitgelezenFeitType[] {
  const dossier = normaliseer(dossiertekst);
  const gezien = new Set<string>();
  const uit: UitgelezenFeitType[] = [];

  for (const feit of uitgelezen) {
    const tekst = feit.tekst.trim();
    const bronzin = feit.bronzin.trim();
    if (!tekst || !bronzin) continue;
    if (!dossier.includes(normaliseer(bronzin))) continue;

    // Twee keer hetzelfde feit is geen twee feiten, en op de kaart zou het de
    // schrijver laten denken dat hij twee dingen te melden heeft.
    const sleutel = tekst.toLowerCase();
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);

    uit.push({ ...feit, tekst, bronzin, periode: feit.periode?.trim() || null });
    if (uit.length >= MAX_FEITEN_PER_RONDE) break;
  }

  return uit;
}

function normaliseer(tekst: string): string {
  return tekst.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * De kaart als blok voor de prompt.
 *
 * ⚠️ ZONDER de F-nummers, sinds 15 september 2026. Die stonden erin omdat de
 * brief per zin naar een nummer moest verwijzen, en dat is precies wat er is
 * afgeschaft. Ze in het blok laten staan zou het model uitnodigen ze alsnog in
 * de brief te plakken. Op het scherm blijft het nummer wél staan: daar is het
 * een handvat om een feit aan te wijzen, en daar leest geen model mee.
 */
export function bouwFeitenblok(feiten: readonly Feit[]): string | null {
  if (feiten.length === 0) return null;

  const regels: string[] = [
    "De concreetste punten uit het dossier van deze persoon, uitgelicht. Geen afgesloten lijst:",
    "het dossier zelf blijft de bron en alles daaruit mag gebruikt worden.",
    "",
  ];

  for (const categorie of CATEGORIEEN) {
    const groep = feiten.filter((f) => f.categorie === categorie.id);
    if (groep.length === 0) continue;
    regels.push(`${categorie.naam.toUpperCase()}`);
    for (const feit of [...groep].sort((a, b) => a.nummer - b.nummer)) {
      const periode = feit.periode ? ` (${feit.periode})` : "";
      regels.push(`- ${feit.tekst}${periode}`);
    }
    regels.push("");
  }

  return regels.join("\n").trim();
}

/* ─────────────────────────────────────────────────────────────────────────
   DE VORM VAN HET ANTWOORD
   ───────────────────────────────────────────────────────────────────────── */

/** De drie kopjes die een antwoord heeft. Zie `bouwSysteemprompt()`. */
export const KOP_VACATURE = "## Vacature";
export const KOP_OPDRACHT = "## Schrijfopdracht";
export const KOP_BRIEF = "## Brief";

export interface Antwoorddelen {
  vacature: string;
  opdracht: string;
  /** Leeg als het antwoord geen briefkopje had. */
  brief: string;
}

/**
 * Knipt een antwoord in zijn drie delen.
 *
 * Werkt op de kopjes en niet op de betekenis: staat er geen `## Brief`, dan is
 * de brief leeg en zegt het scherm dat, in plaats van de hele analyse als brief
 * aan te zien en er vervolgens van alles over te beweren. De controles die
 * alleen over de BRIEF mogen gaan (de schrijfstijl, de herkomst van getallen)
 * gebruiken dit: een opsomming van vacature-eisen heeft nu eenmaal andere
 * zinnen dan een brief.
 */
export function splitsAntwoord(antwoord: string): Antwoorddelen {
  const pak = (kop: string, volgende: string[]): string => {
    const start = antwoord.indexOf(kop);
    if (start < 0) return "";
    const na = start + kop.length;
    const eindes = volgende.map((k) => antwoord.indexOf(k, na)).filter((i) => i >= 0);
    const eind = eindes.length > 0 ? Math.min(...eindes) : antwoord.length;
    return antwoord.slice(na, eind).trim();
  };

  return {
    vacature: pak(KOP_VACATURE, [KOP_OPDRACHT, KOP_BRIEF]),
    opdracht: pak(KOP_OPDRACHT, [KOP_BRIEF]),
    brief: pak(KOP_BRIEF, []),
  };
}
