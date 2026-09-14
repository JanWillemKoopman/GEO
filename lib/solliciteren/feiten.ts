/**
 * De feitenkaart: de gesloten lijst beweringen die een brief mag doen.
 *
 * ── HET PATROON, EN WAAROM HET ER IS ───────────────────────────────────────
 *
 * Overgenomen van `lib/pipeline/factcard.ts`, waar de aanleiding meetbaar was:
 * van 16 beweringen op een gegenereerde pagina waren er 5 verzonnen. Een model
 * verzint niet willekeurig, het verzint precies daar waar de tekst een concreet
 * feit nodig heeft en het materiaal het niet levert. Een sollicitatiebrief is
 * die tekst bij uitstek: "ik bracht de doorlooptijd van negen naar vijf dagen"
 * is de zin die werkt, en het is ook de zin die een model invult als hij er niet
 * staat.
 *
 * Het dossier meegeven met "gebruik dit waar het past" is een uitnodiging, geen
 * grens. Een genummerde lijst met de opdracht "verwijs per bewering naar een
 * nummer" is wél een grens, want die is na te rekenen. Dat narekenen staat
 * hieronder, en is het halve punt van deze module: zonder controle is de
 * verwijzing zelf ook maar een belofte van het model.
 *
 * ── WAT DE CONTROLE WEL EN NIET KAN ────────────────────────────────────────
 *
 * Wel: of een genoemd nummer bestaat, of de feiten die de schrijfopdracht
 * uitkoos ook echt in de brief terugkomen, en hoeveel verschillende feiten de
 * brief draagt. Niet: of de zin die naar F7 verwijst ook echt over F7 gaat. Dat
 * laatste kan code niet zien, en daarom staat de bronzin per feit op het scherm:
 * de controle die een mens in twee seconden doet, hoeft de code niet te kunnen.
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
 * De kaart als blok voor de prompt. Gesloten lijst, genummerd, met de periode
 * erbij waar die er is.
 */
export function bouwFeitenblok(feiten: readonly Feit[]): string | null {
  if (feiten.length === 0) return null;

  const regels: string[] = [
    "Dit is de feitenkaart van deze persoon: de VOLLEDIGE lijst van wat je over hem mag beweren.",
    "Alles wat hier niet op staat, bestaat voor deze brief niet.",
    "",
  ];

  for (const categorie of CATEGORIEEN) {
    const groep = feiten.filter((f) => f.categorie === categorie.id);
    if (groep.length === 0) continue;
    regels.push(`${categorie.naam.toUpperCase()}`);
    for (const feit of [...groep].sort((a, b) => a.nummer - b.nummer)) {
      const periode = feit.periode ? ` (${feit.periode})` : "";
      regels.push(`${refVan(feit)}: ${feit.tekst}${periode}`);
    }
    regels.push("");
  }

  return regels.join("\n").trim();
}

/* ─────────────────────────────────────────────────────────────────────────
   HET ANTWOORD NAREKENEN
   ───────────────────────────────────────────────────────────────────────── */

/** De drie kopjes die een antwoord moet hebben. Zie `bouwSysteemprompt()`. */
export const KOP_VACATURE = "## Vacature";
export const KOP_OPDRACHT = "## Schrijfopdracht";
export const KOP_BRIEF = "## Brief";

export interface Antwoorddelen {
  vacature: string;
  opdracht: string;
  /** Leeg als het antwoord geen briefkopje had. Dan is er niets om na te rekenen. */
  brief: string;
}

/**
 * Knipt een antwoord in zijn drie delen.
 *
 * Werkt op de kopjes en niet op de betekenis: staat er geen `## Brief`, dan is
 * de brief leeg en zegt de controle dat, in plaats van de hele analyse als brief
 * aan te zien en er vervolgens van alles over te beweren.
 */
export function splitsAntwoord(antwoord: string): Antwoorddelen {
  const pak = (kop: string, volgende: string[]): string => {
    const start = antwoord.indexOf(kop);
    if (start < 0) return "";
    const na = start + kop.length;
    const eindes = volgende
      .map((k) => antwoord.indexOf(k, na))
      .filter((i) => i >= 0);
    const eind = eindes.length > 0 ? Math.min(...eindes) : antwoord.length;
    return antwoord.slice(na, eind).trim();
  };

  return {
    vacature: pak(KOP_VACATURE, [KOP_OPDRACHT, KOP_BRIEF]),
    opdracht: pak(KOP_OPDRACHT, [KOP_BRIEF]),
    brief: pak(KOP_BRIEF, []),
  };
}

/** Alle F-nummers die in een tekst genoemd worden, op volgorde en zonder dubbele. */
export function leesVerwijzingen(tekst: string): number[] {
  const gevonden = [...tekst.matchAll(/\[?\bF(\d{1,3})\b\]?/g)].map((m) => Number(m[1]));
  return [...new Set(gevonden)];
}

/** Hoe een bevinding weegt. `blokkerend` betekent: dit moet je nakijken. */
export type Feitbevinding = {
  ernst: "blokkerend" | "let-op";
  melding: string;
};

export interface Feitcontrole {
  /** De feiten die de brief daadwerkelijk gebruikt. */
  gebruikt: number[];
  /** Nummers waar de brief naar verwijst en die niet bestaan. */
  onbekend: number[];
  /** Feiten die de schrijfopdracht uitkoos maar die de brief niet gebruikt. */
  beloofdNietGebruikt: number[];
  /** Zinnen in de brief zonder enige verwijzing, als aandeel van het geheel. */
  zinnenZonderFeit: number;
  totaalZinnen: number;
  bevindingen: Feitbevinding[];
}

/**
 * Hoeveel verschillende feiten een brief minstens hoort te dragen.
 *
 * Vier: minder betekent dat de brief het over houding heeft in plaats van over
 * wat je gedaan hebt, en dat is precies de brief die op een stapel van zestig
 * niet opvalt. Geen hard verbod maar een melding, want een korte brief op een
 * open sollicitatie kan er terecht minder hebben.
 */
export const MINIMUM_FEITEN_IN_BRIEF = 4;

/**
 * Legt een antwoord naast de feitenkaart.
 *
 * ⚠️ Dit oordeelt niet over de tekst en verandert er niets aan. Het wijst aan
 * wat een mens anders zin voor zin zou moeten natellen: verwijst de brief naar
 * iets dat niet bestaat, en doet hij wat zijn eigen schrijfopdracht beloofde.
 */
export function controleerAntwoord(antwoord: string, feiten: readonly Feit[]): Feitcontrole {
  const delen = splitsAntwoord(antwoord);
  const bestaande = new Set(feiten.map((f) => f.nummer));
  const bevindingen: Feitbevinding[] = [];

  // Zonder briefkopje valt er niets na te rekenen. Dat is zelf de bevinding:
  // het antwoord volgde de afgesproken vorm niet.
  if (!delen.brief) {
    return {
      gebruikt: [],
      onbekend: [],
      beloofdNietGebruikt: [],
      zinnenZonderFeit: 0,
      totaalZinnen: 0,
      bevindingen:
        feiten.length === 0
          ? []
          : [{ ernst: "let-op", melding: "Dit antwoord heeft geen apart briefdeel, dus er valt niets tegen je feitenkaart na te rekenen." }],
    };
  }

  const gebruikt = leesVerwijzingen(delen.brief);
  const onbekend = gebruikt.filter((n) => !bestaande.has(n));
  const beloofd = leesVerwijzingen(delen.opdracht);
  const beloofdNietGebruikt = beloofd.filter((n) => bestaande.has(n) && !gebruikt.includes(n));

  const zinnen = splitsInZinnen(delen.brief);
  const zonderFeit = zinnen.filter((zin) => leesVerwijzingen(zin).length === 0).length;

  if (onbekend.length > 0) {
    bevindingen.push({
      ernst: "blokkerend",
      melding: `De brief verwijst naar ${onbekend.map((n) => `F${n}`).join(", ")}, en dat staat niet op je feitenkaart. Die zin steunt dus nergens op.`,
    });
  }

  if (feiten.length > 0 && gebruikt.length === 0) {
    bevindingen.push({
      ernst: "blokkerend",
      melding: "De brief verwijst naar geen enkel feit. Alles wat erin staat is dus onbewezen.",
    });
  } else if (gebruikt.length > 0 && gebruikt.length < MINIMUM_FEITEN_IN_BRIEF) {
    bevindingen.push({
      ernst: "let-op",
      melding: `De brief draagt op ${gebruikt.length} ${gebruikt.length === 1 ? "feit" : "feiten"}. Onder de ${MINIMUM_FEITEN_IN_BRIEF} gaat een brief meestal over houding in plaats van over wat je gedaan hebt.`,
    });
  }

  if (beloofdNietGebruikt.length > 0) {
    bevindingen.push({
      ernst: "let-op",
      melding: `De schrijfopdracht koos ${beloofdNietGebruikt.map((n) => `F${n}`).join(", ")} uit, maar de brief gebruikt die niet.`,
    });
  }

  return {
    gebruikt,
    onbekend,
    beloofdNietGebruikt,
    zinnenZonderFeit: zonderFeit,
    totaalZinnen: zinnen.length,
    bevindingen,
  };
}

/**
 * De brief zonder de verwijzingen, klaar om te plakken.
 *
 * De markering staat in de tekst omdat dat de enige manier is om per zin te
 * kunnen nakijken waar hij op steunt. Maar in de e-mail aan de werkgever hoort
 * hij niet, dus de kopieerknop gebruikt deze versie. Zelfde tekst, één ding
 * minder.
 */
export function stripVerwijzingen(tekst: string): string {
  return tekst
    .replace(/\s*\[F\d{1,3}(?:\s*,\s*F?\d{1,3})*\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .trim();
}

/** Welke feiten van de kaart zijn in deze brief niet gebruikt? */
export function ongebruikteFeiten(feiten: readonly Feit[], gebruikt: readonly number[]): Feit[] {
  const set = new Set(gebruikt);
  return feiten.filter((f) => !set.has(f.nummer));
}
