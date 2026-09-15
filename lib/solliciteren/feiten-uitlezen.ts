import "server-only";

/**
 * De uitleesronde: van dossier naar feitenkaart.
 *
 * ── DIT IS EEN EIGEN TAAK, EN DAAROM EEN EIGEN AANROEP ─────────────────────
 *
 * Conventie 7 zegt: één taak is hooguit één zware AI-aanroep, en een nieuwe
 * zware stap wordt een eigen stap. Dat is hier geen tegenspraak met de keuze om
 * een brief in één keer te schrijven: het uitlezen van je dossier is iets wat je
 * één keer doet en daarna maanden gebruikt, en het schrijven van een brief is
 * iets wat je per vacature doet. Twee taken, twee aanroepen, en de tweede wordt
 * er niet trager of duurder van.
 *
 * ── HET MODEL KENT ZICHZELF GEEN NUMMERS TOE ───────────────────────────────
 *
 * Het schema vraagt niet om een F-nummer. Die worden in de route toegekend,
 * oplopend en vast per persoon. Een model dat zijn eigen nummers verzint, geeft
 * er bij een tweede ronde andere, en dan verwijst een bewaarde brief ineens naar
 * een ander feit. Dat is precies het soort stille verschuiving die niemand
 * terugvindt.
 *
 * ── DE BRONZIN IS DE HELE CONTROLE ─────────────────────────────────────────
 *
 * Elk feit moet een zin uit het dossier LETTERLIJK citeren. `zeefFeiten()` in
 * `lib/solliciteren/feiten.ts` gooit elk feit weg waarvan die zin niet in het
 * dossier terug te vinden is. Zonder dat vangnet mag het model zijn bron
 * samenvatten, en dan bewijst de bron niets meer (conventie 1).
 */
import { callStructured } from "@/lib/openai/structured";
import { bouwDossierblok, type Dossierstuk } from "@/lib/solliciteren/dossier";
import { Feitenoogst, MAX_FEITEN_PER_RONDE, zeefFeiten, type UitgelezenFeitType } from "@/lib/solliciteren/feiten";
import type { SollicitatieModelId } from "@/lib/solliciteren/modellen";

const SYSTEEM = [
  "Je leest het dossier van één persoon uit tot een feitenkaart: een genummerde lijst met alles wat",
  "een sollicitatiebrief over hem zou mogen beweren.",
  "",
  "WAT EEN FEIT IS",
  "Eén controleerbare bewering, in één zin, in gewone taal. Zo concreet mogelijk.",
  "Goed: \"bracht de doorlooptijd van offertes terug van negen naar vijf dagen\".",
  "Slecht: \"is resultaatgericht\". Dat is een oordeel en geen feit.",
  "Een getal, een jaartal, een aantal of een naam maakt een feit bruikbaar. Neem ze mee als ze er staan.",
  "",
  "DE BRONZIN",
  "Bij elk feit citeer je LETTERLIJK de zin uit het dossier waar het op steunt. Overschrijven, niet",
  "samenvatten en niet mooier maken. Staat het er in twee zinnen, neem dan de zin die het feit draagt.",
  "Kun je geen letterlijke zin aanwijzen, dan is het geen feit en laat je het weg.",
  "",
  "WAT JE NIET DOET",
  "Je verzint niets en je leidt niets af. Staat er \"2019 tot 2026 bij Van Dijk\", dan is \"zeven jaar",
  "ervaring\" een afleiding en geen feit: neem de periode over zoals hij er staat.",
  "Je oordeelt niet over de persoon. Geen \"sterke communicator\", geen \"ervaren\".",
  `Je levert hoogstens ${MAX_FEITEN_PER_RONDE} feiten. Bij meer materiaal kies je de concreetste.`,
  "",
  "CATEGORIE",
  "werk: waar, in welke rol, hoe lang. resultaat: wat er veranderde, liefst met een getal.",
  "vaardigheid: wat hij kan en waaruit dat blijkt. opleiding: diploma's en cursussen.",
  "drijfveer: waarom hij dit werk doet. overig: de rest.",
].join("\n");

export interface Uitleesresultaat {
  feiten: UitgelezenFeitType[];
  /** Hoeveel het model er aanleverde, vóór de controle op de bronzin. */
  aangeleverd: number;
  costUsd: number;
  raw: unknown;
}

/**
 * Leest het dossier uit tot een feitenkaart.
 *
 * Draait op het model dat de gebruiker heeft gekozen. Dit is geen goedkope
 * voorbereidingsstap die stiekem op een kleiner model wordt gezet: de kwaliteit
 * van deze lijst bepaalt de kwaliteit van elke brief die erna komt, en een
 * gemist resultaat op de kaart is een zin die nooit in een brief terechtkomt.
 */
export async function leesDossierUit(opts: {
  dossier: readonly Dossierstuk[];
  model: SollicitatieModelId;
}): Promise<Uitleesresultaat> {
  const blok = bouwDossierblok(opts.dossier);
  if (!blok) return { feiten: [], aangeleverd: 0, costUsd: 0, raw: null };

  const resultaat = await callStructured({
    model: opts.model,
    system: SYSTEEM,
    user: blok,
    schema: Feitenoogst,
    schemaName: "sollicitatie_feitenkaart",
    webSearch: false,
    // Uitzoekwerk met echte redeneertijd, en een lage temperatuur: twee keer
    // hetzelfde dossier uitlezen hoort niet twee verschillende kaarten op te
    // leveren. Zie lib/openai/sampling.ts voor de tabel.
    work: "analytical",
    // Geen `meta`: dit hoort niet in `ai_calls`. Zie de toelichting in
    // lib/solliciteren/gesprek.ts, die daar dezelfde keuze uitlegt.
  });

  const aangeleverd = resultaat.parsed.feiten.length;
  // Het vangnet: alles zonder aanwijsbare bronzin gaat eruit, hoe overtuigend
  // het ook klinkt.
  const feiten = zeefFeiten(resultaat.parsed.feiten, blok);

  return { feiten, aangeleverd, costUsd: resultaat.costUsd, raw: resultaat.raw };
}
