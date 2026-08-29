/**
 * De sales hook: één reden om te bellen, met bewijs
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 14).
 *
 * ── HET MODEL KIEST NIET WAT DE HAAK IS, HET FORMULEERT ALLEEN ─────────────
 *
 * "Het primaire type bepaalt de vorm; de meetdata vult hem; een model schrijft
 * er één leesbare zin van." Dat onderscheid is conventie 1 in zijn zuiverste
 * vorm, en het is hier belangrijker dan waar ook in de app: deze zin gaat in een
 * mail naar een ondernemer die zijn eigen markt kent.
 *
 * ── EN DAARNA CONTROLEERT CODE ELK GETAL ────────────────────────────────────
 *
 * Plan hoofdstuk 14: "Voordat een hook opgeslagen wordt, controleert code of elk
 * getal in de zin voorkomt in de onderliggende meetdata. Klopt een getal niet,
 * dan wordt de hook verworpen en opnieuw gegenereerd, en na twee mislukte
 * pogingen valt hij terug op een sjabloonzin die alleen gecontroleerde waarden
 * bevat."
 *
 * Dat is hetzelfde patroon als de claimvalidator in de contentpijplijn
 * (`lib/pipeline/validate-claims.ts`), en om dezelfde reden: een model dat een
 * zin mooier maakt, rondt onderweg een getal af. "Vier keer vaker" wordt "vijf
 * keer vaker", en dat is precies het soort detail dat een prospect naleest.
 *
 * Bewust ZONDER `server-only`: dit is rekenwerk en tekstwerk, geen databasewerk
 * (conventie 2).
 */
import type { Kans, KansType } from "@/lib/sales/opportunity";
import { KANS_LABEL } from "@/lib/sales/opportunity";

/** Hoeveel keer een hook opnieuw geschreven mag worden vóór het sjabloon wint. */
export const MAX_HOOK_POGINGEN = 2;

/**
 * Welke getallen mogen in de zin staan?
 *
 * De cijfers uit de kans zelf, plus hun afgeleide vormen: een aandeel van 0,18
 * mag als "18" of "18%" in de zin staan, en een verhouding van 4 mag als "4".
 * Alles wat daar niet in zit, is een getal dat het model erbij bedacht heeft.
 */
export function toegestaneGetallen(kans: Kans): Set<number> {
  const uit = new Set<number>();
  for (const waarde of Object.values(kans.cijfers)) {
    if (!Number.isFinite(waarde)) continue;
    uit.add(afgerond(waarde));
    // Een breuk mag ook als percentage geschreven worden.
    if (waarde > 0 && waarde <= 1) {
      uit.add(Math.round(waarde * 100));
    }
  }
  // Het aantal vragen en antwoorden waar de kans op rust, mag genoemd worden.
  uit.add(kans.vragen.length);
  uit.add(kans.antwoorden.length);

  // De verhouding tussen eigen en concurrent, want dat is de zin die het vaakst
  // geschreven wordt: "wordt vier keer vaker genoemd".
  const eigen = kans.cijfers.eigen_aandeel;
  const rivaal = kans.cijfers.concurrent_aandeel;
  if (typeof eigen === "number" && typeof rivaal === "number" && eigen > 0) {
    uit.add(Math.round(rivaal / eigen));
    uit.add(afgerond(rivaal / eigen));
  }
  return uit;
}

/** Elk getal uit een zin, inclusief percentages en decimalen met een komma. */
export function getallenInZin(zin: string): number[] {
  const treffers = zin.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return treffers.map((t) => Number(t.replace(",", ".")));
}

export interface HookOordeel {
  ok: boolean;
  /** De getallen die nergens uit de meetdata te herleiden zijn. */
  onbekend: number[];
}

/**
 * Klopt elk getal in deze zin met de meetdata?
 *
 * ⚠️ **De controle is op het getal en niet op de betekenis.** Een zin die zegt
 * "wordt 4 keer vaker genoemd" terwijl 4 nergens uit de data volgt, wordt
 * afgekeurd. Een zin die zegt "wordt vaker genoemd" zonder getal, komt er
 * gewoon door. Dat is bewust: getallen zijn wat een prospect naleest, en het is
 * het enige stuk van een zin dat een machine hard kan toetsen.
 *
 * Er is bewust geen uitzondering voor kleine getallen. Zo'n uitzondering klinkt
 * onschuldig en zou "3 keer vaker" toestaan op grond van niets. Wie een getal
 * noemt, moet het kunnen aanwijzen.
 */
export function controleerHook(zin: string, kans: Kans): HookOordeel {
  const toegestaan = toegestaneGetallen(kans);
  const onbekend = getallenInZin(zin).filter(
    (g) => !toegestaan.has(afgerond(g)) && !toegestaan.has(Math.round(g)),
  );
  return { ok: onbekend.length === 0, onbekend };
}

/**
 * De sjabloonzin per type: wat er staat als het model het niet beter kan.
 *
 * ⚠️ Deze zinnen zijn het vangnet en niet het doel. Ze bevatten uitsluitend
 * gecontroleerde waarden, ze zijn saai, en ze zijn waar. Een saaie ware zin
 * verslaat een mooie zin met een verzonnen getal erin, want die tweede kost het
 * hele gesprek.
 */
export function sjabloonHook(kans: Kans, naam: string, rivaalNaam?: string | null): string {
  const c = kans.cijfers;
  const pct = (waarde: number | undefined) =>
    typeof waarde === "number" ? `${Math.round(waarde * 100)}%` : "onbekend";

  switch (kans.type) {
    case "onzichtbaar":
      return (
        `${naam} wordt bij ${c.vermeldingen ?? 0} van de ${c.vragen ?? 0} gemeten vragen genoemd ` +
        `door de AI-assistenten in deze markt.`
      );
    case "concurrent_gap":
      return (
        `${rivaalNaam ?? "Een concurrent"} wordt in deze markt bij ${pct(c.concurrent_aandeel)} van ` +
        `de vragen genoemd, ${naam} bij ${pct(c.eigen_aandeel)}.`
      );
    case "intent_gap":
      return (
        `${naam} wordt in deze markt genoemd, maar bij de vragen over één van de eigen diensten ` +
        `vrijwel niet, terwijl die dienst wel op de website staat.`
      );
    case "engine_gap":
      return (
        `De ene AI-assistent noemt ${naam} bij ${pct(c.hoogste_aandeel)} van de vragen, de andere ` +
        `bij ${pct(c.laagste_aandeel)}.`
      );
    case "information_gap":
      return `Een AI-antwoord zet ${naam} in een andere plaats dan waar het bedrijf gevestigd is.`;
    case "source_gap":
      return (
        `De bronnen die deze markt bepalen noemen ${naam} niet, terwijl ` +
        `${c.concurrenten_in_die_bronnen ?? 0} concurrenten er wel in staan.`
      );
    case "sterk_met_zwakke_plek":
      return (
        `${naam} staat op plek ${c.positie ?? 0} in deze markt, maar mist één dienst waar ` +
        `concurrenten wel genoemd worden.`
      );
    case "verlies":
      return (
        `${naam} werd bij de vorige meting bij ${pct(c.eerder)} van de vragen genoemd en nu bij ` +
        `${pct(c.nu)}.`
      );
  }
}

/**
 * De opdracht aan het model. Apart, zodat `scripts/test-unit.ts` hem kan nalezen.
 *
 * Wat er in moet, en waarom:
 *
 * - **De gecontroleerde cijfers**, met hun naam erbij. Het model mag alleen deze
 *   getallen gebruiken, en de controle achteraf dwingt dat af.
 * - **De sjabloonzin.** Niet als voorbeeld van stijl maar als ondergrens van
 *   waarheid: dit staat er als jij het niet beter kunt.
 * - **Eén zin.** Niet vijf, niet een samenvatting. De haak is de ene beste reden
 *   om vandaag te bellen (plan hoofdstuk 14).
 */
export function bouwHookVraag(
  kans: Kans,
  naam: string,
  rivaalNaam: string | null,
  markt: string,
): string {
  const cijfers = Object.entries(kans.cijfers)
    .map(([sleutel, waarde]) => `- ${sleutel}: ${formatteerCijfer(sleutel, waarde)}`)
    .join("\n");

  return [
    `Markt: ${markt}`,
    `Bedrijf: ${naam}`,
    rivaalNaam ? `De concurrent die het verschil maakt: ${rivaalNaam}` : "",
    `Soort kans: ${KANS_LABEL[kans.type]}`,
    "",
    "De gemeten cijfers:",
    cijfers || "- geen",
    "",
    "Dit staat er als je het niet beter kunt:",
    sjabloonHook(kans, naam, rivaalNaam),
    "",
    "Schrijf één zin die een verkoper aan de telefoon zou gebruiken als opening.",
    "Regels:",
    "- Gebruik alleen de cijfers hierboven. Verzin geen enkel getal, ook geen afronding.",
    "- Schrijf wat er gemeten is, niet wat het betekent. Geen advies, geen aanbod.",
    "- Geen verkooptaal, geen superlatieven, geen uitroepteken.",
    "- Eén zin, hooguit dertig woorden.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Een cijfer leesbaar maken voor het model.
 *
 * Aandelen worden percentages, want zo staan ze straks ook in de zin. Zou het
 * model 0,18 zien en er "0,18" van maken, dan staat er een breuk in een
 * verkoopmail waar een percentage hoort.
 */
function formatteerCijfer(sleutel: string, waarde: number): string {
  if (sleutel.includes("aandeel") || sleutel === "nu" || sleutel === "eerder" || sleutel === "daling") {
    return `${Math.round(waarde * 100)}%`;
  }
  return String(afgerond(waarde));
}

function afgerond(waarde: number): number {
  return Number(waarde.toFixed(2));
}

/** De vorm van de haak zoals hij wordt opgeslagen. */
export interface Hook {
  type: KansType;
  tekst: string;
  /** Uit het model, of teruggevallen op het sjabloon? Dit wordt bewaard. */
  bron: "model" | "sjabloon";
  /** Hoeveel pogingen er nodig waren. Nul is de eerste keer raak. */
  pogingen: number;
}

/**
 * Kies de haak: het model als hij klopt, anders het sjabloon.
 *
 * ⚠️ De uitkomst zegt WELKE van de twee het werd, en dat wordt opgeslagen. Zonder
 * dat veld is niet te zien hoe vaak het model getallen verzint, en dan is de
 * kwaliteit van de haken alleen te achterhalen door ze allemaal na te lezen.
 */
export function kiesHook(
  kandidaten: string[],
  kans: Kans,
  naam: string,
  rivaalNaam: string | null,
): Hook {
  let pogingen = 0;
  for (const zin of kandidaten) {
    const schoon = zin.trim();
    pogingen++;
    if (schoon.length < 10) continue;
    if (controleerHook(schoon, kans).ok) {
      return { type: kans.type, tekst: schoon, bron: "model", pogingen };
    }
  }
  return {
    type: kans.type,
    tekst: sjabloonHook(kans, naam, rivaalNaam),
    bron: "sjabloon",
    pogingen,
  };
}
