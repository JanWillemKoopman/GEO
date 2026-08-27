import type { PlanMonthStatus, PlannedPageStatus } from "@/lib/types/database";

/**
 * De leesweergave van het contentplan: welke maanden de klant ziet, en wat er
 * van hem gevraagd wordt.
 *
 * ── WAAROM DE KLANT EEN ANDER SCHERM KRIJGT ─────────────────────────────────
 *
 * Het planscherm is een sleepbord: een voorraadkolom met zoekveld en filters,
 * twaalf maanden, een publicatiedatum per regel, volgordeknoppen en een menu
 * per pagina. Dat is het werkblad van de consultant, en het is goed in wat het
 * doet. Maar het vroeg de zwaarste bediening van de hele app van de gebruiker
 * die er het minst mee doet: de klant plant niet, hij wil weten wat er deze
 * maand voor hem geschreven wordt en wat hij zelf moet doen.
 *
 * De uitleg bovenaan het scherm zei intussen tegen iedereen "sleep beschikbare
 * content items naar de maand waarin ze geschreven moeten worden". Dat is de
 * kortste samenvatting van het probleem.
 *
 * ── WAT DE KLANT WÉL ZELF DOET ──────────────────────────────────────────────
 *
 * Een maand vrijgeven, sinds 27 augustus 2026 (`lib/cost-rules.ts`). Dat is de
 * enige knop die het plan in beweging zet, en de enige die in deze weergave
 * hoort. Alles wat de indeling verandert blijft op het bord.
 *
 * ── WAAROM TWEE MAANDEN EN NIET TWAALF ──────────────────────────────────────
 *
 * Twaalf maanden onder elkaar is een jaarplanning, en daar kijkt niemand
 * maandelijks naar. Deze maand is waar het werk zit, volgende maand is wat
 * eraan komt, en de rest is naslag. Dat is dezelfde keuze als op het overzicht:
 * eerst wat er nu speelt, dan pas de omvang van het programma.
 */

export interface LeesMaand {
  id: string;
  monthNumber: number;
  status: PlanMonthStatus;
}

/**
 * Welke maand is "deze maand", en welke is "volgende maand"?
 *
 * ⚠️ De kalender is leidend en niet de status. Een klant die op 3 september
 * inlogt hoort september te zien, ook als hij augustus nooit heeft vrijgegeven.
 * Zou de status leidend zijn, dan blijft hij naar een maand kijken die al
 * voorbij is, en dan ziet hij zijn eigen achterstand aan voor de stand van nu.
 *
 * Loopt de kalender voorbij het einde van het plan, dan valt de keuze terug op
 * de laatste maand die er is: een leeg scherm is geen antwoord.
 */
export function leesMaandKeuze(
  maanden: LeesMaand[],
  lopendeMaandNummer: number | null,
): { deze: LeesMaand | null; volgende: LeesMaand | null; rest: LeesMaand[] } {
  if (maanden.length === 0) return { deze: null, volgende: null, rest: [] };

  const opNummer = [...maanden].sort((a, b) => a.monthNumber - b.monthNumber);

  const deze =
    (lopendeMaandNummer !== null
      ? opNummer.find((m) => m.monthNumber === lopendeMaandNummer)
      : undefined) ?? opNummer[opNummer.length - 1];

  const volgende = opNummer.find((m) => m.monthNumber === deze.monthNumber + 1) ?? null;

  const getoond = new Set([deze.id, volgende?.id]);
  return {
    deze,
    volgende,
    rest: opNummer.filter((m) => !getoond.has(m.id)),
  };
}

export interface StapInput {
  /** De status van de maand die de klant nu bekijkt. */
  maandStatus: PlanMonthStatus;
  /** Hoeveel pagina's er in die maand staan, reserve niet meegeteld. */
  paginas: number;
  /** Teksten die op zijn akkoord wachten, over het hele plan. */
  terGoedkeuring: number;
  /** Teksten die goedgekeurd zijn maar nog niet live staan. */
  teplaatsen: number;
}

/**
 * Eén zin: wat wordt er nu van de klant gevraagd?
 *
 * De volgorde is de volgorde waarin het werk vastloopt als hij het niet doet.
 * Een tekst die klaarstaat en niet gepubliceerd wordt, levert per definitie
 * nul op; dat is dus dringender dan een maand die nog vrijgegeven moet worden,
 * want daar is nog niets voor betaald.
 *
 * ⚠️ Nooit "je bent klaar". Wie leest dat hij klaar is, komt niet terug.
 */
export function planStap(input: StapInput): string {
  if (input.teplaatsen > 0) {
    return input.teplaatsen === 1
      ? "Eén tekst staat klaar om te publiceren. Zolang hij niet op je site staat, verandert er niets aan je zichtbaarheid."
      : `${input.teplaatsen} teksten staan klaar om te publiceren. Zolang ze niet op je site staan, verandert er niets aan je zichtbaarheid.`;
  }
  if (input.terGoedkeuring > 0) {
    return input.terGoedkeuring === 1
      ? "Eén tekst wacht op je akkoord."
      : `${input.terGoedkeuring} teksten wachten op je akkoord.`;
  }
  if (input.paginas === 0) {
    return "Er staat voor deze maand nog niets ingepland. Je consultant vult hem samen met jou.";
  }
  if (input.maandStatus !== "goedgekeurd") {
    return "Deze maand wacht op jouw vrijgave. Daarna begint ORBIT ENGINE te schrijven.";
  }
  return "Je hoeft nu niets. ORBIT ENGINE schrijft door en legt elke tekst aan je voor.";
}

/**
 * De regel onder een maandkop: hoeveel er staat en wanneer de eerste live moet.
 *
 * Geen datum als er niets gepland staat, want dan is er niets om een datum aan
 * te hangen. Onbekend is een betere waarde dan een verkeerde (conventie 3).
 */
export function maandRegel(input: {
  paginas: number;
  geplaatst: number;
  eersteDatum: string | null;
}): string {
  if (input.paginas === 0) return "Nog niets ingepland.";

  const kop =
    input.paginas === 1 ? "Eén pagina deze maand" : `${input.paginas} pagina's deze maand`;

  if (input.geplaatst >= input.paginas) {
    return `${kop}, allemaal live.`;
  }
  if (input.geplaatst > 0) {
    return `${kop}, waarvan ${input.geplaatst} live.`;
  }
  return input.eersteDatum ? `${kop}, de eerste op ${input.eersteDatum}.` : `${kop}.`;
}

/** Telt de statussen die de klantzin nodig heeft. Puur, dus testbaar. */
export function telStatussen(
  paginas: { status: PlannedPageStatus; is_buffer: boolean }[],
): { terGoedkeuring: number; teplaatsen: number; geplaatst: number; echt: number } {
  const echt = paginas.filter((p) => !p.is_buffer);
  return {
    terGoedkeuring: echt.filter((p) => p.status === "ter_goedkeuring").length,
    teplaatsen: echt.filter((p) => p.status === "goedgekeurd").length,
    geplaatst: echt.filter((p) => p.status === "geplaatst").length,
    echt: echt.length,
  };
}
