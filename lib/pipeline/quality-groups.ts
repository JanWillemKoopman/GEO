/**
 * WAT DE APP AL GEPROBEERD HEEFT, en wat nooit aan de beurt kwam.
 *
 * ── HET PROBLEEM ────────────────────────────────────────────────────────────
 *
 * De contentpagina toont `review_notes` als één platte lijst. Gemeten op
 * productie (22 september 2026, 25 pagina's): gemiddeld 49,1 regels per pagina
 * en 78 op de langste. In die ene bak staan drie soorten punten door elkaar:
 *
 *   1. Wat publicatie tegenhoudt.
 *   2. Wat de reparatie geprobeerd heeft en niet opgelost kreeg.
 *   3. Wat nooit aan de beurt kwam, omdat het onder plek tien stond.
 *
 * Die derde groep bestaat omdat de reparatie met opzet hooguit tien bevindingen
 * meekrijgt (`MAX_BEVINDINGEN_PER_RONDE`, `content.ts` r.2285): met 119
 * opdrachten over 25 secties raakt het model vrijwel elke sectie aan en is er
 * niets gerichts meer aan een sectiereparatie. Op de gemeten reeks liep de
 * kwaliteitsscore 67, 74, 68, 48 zodra elke ronde alles tegelijk probeerde.
 *
 * Voor de lezer is het verschil tussen 2 en 3 het verschil tussen "hier liep de
 * machine op stuk, waarschijnlijk omdat er informatie ontbreekt die alleen jij
 * hebt" en "dit heeft nog niemand aangeraakt, en het is vaak in dertig seconden
 * zelf opgelost". Dat onderscheid stond nergens op het scherm.
 *
 * ── WAAROM DIT EXACT KAN EN GEEN SCHATTING IS ───────────────────────────────
 *
 * `content_quality_runs.issues_json` bewaart per ronde de VOLLEDIGE getypeerde
 * bevindingenlijst (migratie 0091), en de reparatie kiest daaruit met
 * `prioriteerIssues(issues, 10)`, een pure functie. Dezelfde functie op dezelfde
 * opgeslagen lijst levert dus precies de tien op die het model destijds
 * meekreeg. Geen nieuwe kolom, geen migratie, geen gok.
 *
 * ⚠️ De vergelijking loopt over `sectie|bevinding` en niet over een id: een
 * bevinding krijgt bij elke keuring een nieuw object, en alleen de tekst is
 * stabiel tussen rondes. Gemeten op de langste pagina in productie
 * (f3a175b5, drie rondes): van de 78 bevindingen in de laatste ronde kwamen er
 * 32 ook in een eerdere ronde voor en 46 niet. Die 46 zijn dus nieuw ontstaan of
 * pas later gezien, en horen bij groep 3 en niet bij groep 2.
 *
 * Bewust ZONDER `server-only` (conventie 2): pure groepering, testbaar vanuit
 * `scripts/test-unit.ts`.
 */
import { prioriteerIssues, type QualityIssue } from "@/lib/pipeline/quality-issue";
import { MAX_BEVINDINGEN_PER_RONDE } from "@/lib/pipeline/content-issues";

/**
 * Eén eerdere keuringsronde, zoals `content_quality_runs` hem bewaart.
 *
 * `herkeuring` telt niet als reparatiepoging: dat is dezelfde tekst die opnieuw
 * beoordeeld is (migratie 0092), er is niets herschreven om tussen te kiezen.
 */
export interface Keuringsronde {
  ronde: number;
  issues: QualityIssue[];
  herkeuring: boolean;
}

export type Herkomst = "geprobeerd" | "niet-geprobeerd" | "onbekend";

export interface GegroepeerdeBevinding {
  issue: QualityIssue;
  herkomst: Herkomst;
  /** De eerste reparatieronde waarin deze bevinding aan het model is meegegeven. */
  aangebodenInRonde: number | null;
}

export interface Bevindingengroepen {
  /** Houdt publicatie tegen. Staat altijd open, hoeveel het er ook zijn. */
  blokkades: GegroepeerdeBevinding[];
  /** Meegegeven aan de reparatie, en staat er nog steeds. */
  geprobeerd: GegroepeerdeBevinding[];
  /** Nooit meegegeven: stond onder plek tien, of ontstond pas later. */
  nietGeprobeerd: GegroepeerdeBevinding[];
  /** Hoeveel reparatierondes er echt gedraaid hebben. 0 = niets te vertellen. */
  reparatierondes: number;
  /** Hoeveel bevindingen de reparatie in totaal meekreeg, over alle rondes. */
  aangeboden: number;
}

/**
 * De sleutel waarop twee bevindingen uit verschillende rondes dezelfde zijn.
 *
 * Sectie plus bevinding, want dezelfde zin ("deze alinea is te dun") kan in twee
 * secties tegelijk staan en dat zijn twee verschillende problemen. Witruimte
 * wordt genormaliseerd omdat de beoordelaars hun regels niet altijd identiek
 * afbreken.
 */
export function issueSleutel(issue: QualityIssue): string {
  const sectie = (issue.section ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const bevinding = (issue.finding ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${sectie}|${bevinding}`;
}

/**
 * De bevindingen die de reparatie van één ronde heeft meegekregen.
 *
 * Exact dezelfde aanroep als `content.ts` doet, zodat dit scherm niet zijn eigen
 * waarheid verzint over wat het model gezien heeft.
 */
export function aangebodenAanReparatie(
  ronde: Keuringsronde,
  max: number = MAX_BEVINDINGEN_PER_RONDE,
): QualityIssue[] {
  return prioriteerIssues(ronde.issues, max);
}

/**
 * De huidige bevindingen in drie groepen, met per bevinding of de app hem al
 * geprobeerd heeft.
 *
 * `eerdereRondes` mag leeg zijn. Dan is er niets bekend over eerdere pogingen en
 * krijgt elke bevinding `onbekend`: het scherm hoort dan niets te beweren over
 * wat er wel of niet geprobeerd is (conventie 3). Alles wat niet blokkeert komt
 * in dat geval in `nietGeprobeerd` terecht, zodat er nog steeds één lijst
 * overblijft die ingeklapt kan.
 */
export function groepeerBevindingen(
  huidige: readonly QualityIssue[],
  eerdereRondes: readonly Keuringsronde[],
  max: number = MAX_BEVINDINGEN_PER_RONDE,
): Bevindingengroepen {
  // Alleen echte reparatierondes tellen: een herkeuring beoordeelt dezelfde
  // tekst opnieuw en heeft het model dus niets te repareren gegeven.
  const reparaties = eerdereRondes
    .filter((r) => !r.herkeuring)
    .slice()
    .sort((a, b) => a.ronde - b.ronde);

  // Per sleutel de EERSTE ronde waarin hij aan het model is meegegeven. De
  // eerste en niet de laatste: dat is het moment waarop de app het probleem
  // voor het eerst onder ogen kreeg, en dat is wat de zin op het scherm zegt.
  const aangebodenIn = new Map<string, number>();
  for (const ronde of reparaties) {
    for (const issue of aangebodenAanReparatie(ronde, max)) {
      const sleutel = issueSleutel(issue);
      if (!aangebodenIn.has(sleutel)) aangebodenIn.set(sleutel, ronde.ronde);
    }
  }

  const blokkades: GegroepeerdeBevinding[] = [];
  const geprobeerd: GegroepeerdeBevinding[] = [];
  const nietGeprobeerd: GegroepeerdeBevinding[] = [];

  // Ontdubbelen: twee beoordelaars kunnen dezelfde bevinding aanleveren, en de
  // klant hoort hem één keer te lezen. `issueTeksten()` doet dit al voor de
  // platte lijst; hier gebeurt het op dezelfde sleutel.
  const gezien = new Set<string>();

  for (const issue of huidige) {
    const sleutel = issueSleutel(issue);
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);

    const ronde = aangebodenIn.get(sleutel) ?? null;
    const herkomst: Herkomst =
      reparaties.length === 0 ? "onbekend" : ronde === null ? "niet-geprobeerd" : "geprobeerd";
    const item: GegroepeerdeBevinding = { issue, herkomst, aangebodenInRonde: ronde };

    if (issue.blocking) blokkades.push(item);
    else if (herkomst === "geprobeerd") geprobeerd.push(item);
    else nietGeprobeerd.push(item);
  }

  return {
    blokkades,
    geprobeerd,
    nietGeprobeerd,
    reparatierondes: reparaties.length,
    aangeboden: aangebodenIn.size,
  };
}

/**
 * De zin boven de bevindingen, in de taal van iemand die geen pijplijn kent.
 *
 * Bewust niet "2 reparatierondes uitgevoerd": dat is de taal van het systeem.
 * Wat de lezer moet weten is dat er al aan gewerkt is en dat wat hij hier ziet
 * de rest is. Leeg als er niets te vertellen valt, want een zin die zegt dat er
 * nul rondes waren, voegt niets toe aan een lijst die er gewoon staat.
 */
export function beschrijfPogingen(groepen: Bevindingengroepen): string {
  if (groepen.reparatierondes === 0) return "";

  const keer = groepen.reparatierondes === 1 ? "één keer" : `${groepen.reparatierondes} keer`;
  const rest = groepen.blokkades.length + groepen.geprobeerd.length + groepen.nietGeprobeerd.length;
  if (rest === 0) {
    return `ORBIT ENGINE heeft deze pagina zelf ${keer} bijgewerkt. Er bleef niets over.`;
  }
  return `ORBIT ENGINE heeft deze pagina zelf ${keer} bijgewerkt. Dit bleef staan.`;
}

/**
 * Een bevinding zoals een mens hem hoort te lezen.
 *
 * ── WAAROM DIT NODIG IS ─────────────────────────────────────────────────────
 *
 * De beoordelaars schrijven hun bevindingen in gewone taal, maar ze zetten er
 * geregeld markdown-nadruk in: "**Bovenste introductie:** Beantwoord alle drie
 * de doelvragen". Gemeten op productie (22 september 2026) bevat 135 van de
 * 1227 opgeslagen bevindingen een `**`, oftewel 11%. In een lijst die als
 * platte tekst gerenderd wordt, ziet de lezer dus sterretjes.
 *
 * Dat was ook zo toen deze regels nog als `review_notes` op het scherm stonden,
 * dus dit is geen regressie maar een oude oneffenheid die nu opvalt omdat de
 * rail de plek is waar deze zinnen echt gelezen worden.
 *
 * ⚠️ Bewust alleen de NADRUK-tekens, en niet de volledige `stripMarkdown()` uit
 * `content-gate.ts`. Die is gemaakt om tekst te kunnen beoordelen en haalt
 * onder andere koppen en opsommingstekens weg; hier gaat het om één zin waarin
 * alleen de opmaakstreepjes storen. Een citaat met een sterretje erin (een
 * maatvoering, een voetnoot) blijft dus staan zolang het geen paar is.
 */
export function leesbareBevinding(tekst: string): string {
  return (tekst ?? "")
    // Vet en cursief in één keer: `**zo**`, `__zo__`, `*zo*`, `_zo_`. De inhoud
    // blijft staan, alleen de tekens eromheen verdwijnen.
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/(^|[\s(])_([^_\n]+?)_(?=[\s).,;:!?]|$)/g, "$1$2")
    .trim();
}

/**
 * Bevindingen van dezelfde soort als één bundel (`docs/tasks/contentflow-een-lijn.md` §4.6a).
 *
 * Op 23 september 2026 stond op een pagina van Van den Udenhout vijf keer
 * dezelfde zin onder elkaar ("Deze zin zegt iets over je bedrijf zonder bron:
 * ..."), elk met twee eigen knoppen. Dat is één probleem op vijf plekken, en
 * zo hoort het er ook te staan: één kop met de telling, de vijf plekken
 * eronder, één knop om ze samen te laten oplossen.
 *
 * De soort is het deel vóór de eerste dubbele punt, en telt alleen als minstens
 * twee bevindingen hem delen. Een bevinding zonder dubbele punt of met een
 * unieke aanhef blijft alleen staan: een vuistregel die iets samenvoegt wat
 * niet bij elkaar hoort, is erger dan een lijst die iets langer is.
 *
 * Puur (conventie 2). De volgorde van de eerste bevinding per soort blijft.
 */
export interface Bundel {
  /** De gedeelde aanhef, of null bij een losse bevinding. */
  kop: string | null;
  items: GegroepeerdeBevinding[];
  /** Per item het deel ná de dubbele punt (bij een bundel), anders de hele zin. */
  details: string[];
}

function aanhef(tekst: string): string | null {
  const i = tekst.indexOf(":");
  if (i < 8 || i > 90) return null;
  return tekst.slice(0, i).trim();
}

export function bundelOpSoort(items: GegroepeerdeBevinding[]): Bundel[] {
  const telling = new Map<string, number>();
  for (const it of items) {
    const a = aanhef(leesbareBevinding(it.issue.finding));
    if (a) telling.set(a.toLowerCase(), (telling.get(a.toLowerCase()) ?? 0) + 1);
  }

  const bundels: Bundel[] = [];
  const opKop = new Map<string, Bundel>();
  for (const it of items) {
    const zin = leesbareBevinding(it.issue.finding);
    const a = aanhef(zin);
    if (a && (telling.get(a.toLowerCase()) ?? 0) >= 2) {
      const sleutel = a.toLowerCase();
      let b = opKop.get(sleutel);
      if (!b) {
        b = { kop: a, items: [], details: [] };
        opKop.set(sleutel, b);
        bundels.push(b);
      }
      b.items.push(it);
      b.details.push(zin.slice(zin.indexOf(":") + 1).trim());
    } else {
      bundels.push({ kop: null, items: [it], details: [zin] });
    }
  }
  return bundels;
}
