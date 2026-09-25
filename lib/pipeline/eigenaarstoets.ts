/**
 * Van het oordeel van de eigenaarstoets (L10) naar bevindingen voor de keuring
 * en de reparatie (WP9 van docs/tasks/contentpijplijn-publicatiewaardig.md).
 *
 * ── WAAROM ──────────────────────────────────────────────────────────────────
 *
 * Tot 25 september 2026 werd de kwaliteit van een pagina alleen achteraf
 * gemeten, met de blinde lezer van de doorlichting. Binnen de pijplijn letten
 * de controles op feiten en op formuleringen, niet op wat die lezer bij beide
 * nagemeten pagina's als eerste noemde: herhaling ("De prijsband hierboven is
 * onze gebruikelijke indicatie"), holle alinea's ("In het algemeen kan een
 * aanlegprijs betrekking hebben op ...") en een kop die iets anders belooft dan
 * de tekst eronder. Een lijst met formuleringen vangt de volgende ronde niet;
 * een lezer met dezelfde vragen als de blinde lezer wel, en die stuurt nu de
 * reparatie.
 *
 * ── DE REGELS IN CODE (conventie 1) ─────────────────────────────────────────
 *
 *   • "nee" houdt de pagina tegen: dan volgt een reparatie met de eerste
 *     wijziging als opdracht. Na de laatste ronde blijft de pagina tegengehouden
 *     (§12.1, WP9: twee keer "niet publiceren" is een blokkade).
 *   • Een probleem telt alleen als het citaat letterlijk in de tekst staat. Een
 *     model dat een zin verzint of samenvat, stuurt de reparatie anders naar een
 *     zin die er niet is.
 *   • Hoogstens zes problemen: meer is geen redactie meer maar een herschrijving.
 *
 * Puur (conventie 2).
 */
import type { Eigenaarstoets, EigenaarProbleem } from "@/lib/schemas/eigenaarstoets";
import type { QualityDimension } from "@/lib/pipeline/quality-dimensions";

export const MAX_EIGENAAR_PROBLEMEN = 6;

export interface EigenaarBevinding {
  dimension: QualityDimension;
  blocking: boolean;
  section: string | null;
  finding: string;
  evidence: string | null;
  recommendation: string;
}

/** Waar elk soort probleem in het raamwerk thuishoort. */
const DIMENSIE: Record<EigenaarProbleem, QualityDimension> = {
  herhaling: "leesbaarheid",
  hol: "specificiteit",
  kop_past_niet: "structuur",
  toon: "toon",
  ontbrekend_bewijs: "bewijs",
  onduidelijk: "leesbaarheid",
  anders: "overtuiging",
};

const LABEL: Record<EigenaarProbleem, string> = {
  herhaling: "Deze zin herhaalt wat er al staat",
  hol: "Deze zin zegt niets",
  kop_past_niet: "Deze kop past niet bij de tekst eronder",
  toon: "Dit klinkt niet als het bedrijf",
  ontbrekend_bewijs: "Hier mist het bewijs dat het bedrijf heeft",
  onduidelijk: "Dit is onduidelijk",
  anders: "Dit zou de ondernemer veranderen",
};

function normaal(t: string): string {
  return t
    .toLowerCase()
    .replace(/[*_#>`"“”„'’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Staat dit citaat in de tekst? Kop of zin, zonder opmaak, hoofdletterongevoelig. */
export function citaatStaatErin(citaat: string, tekst: string): boolean {
  const c = normaal(citaat).replace(/[.!?]+$/, "");
  if (c.length < 8) return false;
  return normaal(tekst).includes(c);
}

export function eigenaarBevindingen(oordeel: Eigenaarstoets | null, tekst: string): EigenaarBevinding[] {
  if (!oordeel) return [];
  const uit: EigenaarBevinding[] = [];
  const eerste = oordeel.eersteWijziging;
  const eersteCitaat = eerste.citaat?.trim() && citaatStaatErin(eerste.citaat, tekst) ? eerste.citaat.trim() : null;

  if (oordeel.publiceert === "nee") {
    uit.push({
      dimension: "overtuiging",
      blocking: true,
      section: eerste.sectie?.trim() || null,
      finding: `De ondernemer zou deze pagina niet publiceren: ${oordeel.waarom.trim()}`,
      evidence: eersteCitaat,
      recommendation: eerste.wat.trim(),
    });
  } else if (eerste.wat?.trim()) {
    uit.push({
      dimension: "overtuiging",
      blocking: false,
      section: eerste.sectie?.trim() || null,
      finding: `De ondernemer zou dit als eerste veranderen: ${eerste.wat.trim()}`,
      evidence: eersteCitaat,
      recommendation: eerste.wat.trim(),
    });
  }

  const gezien = new Set<string>();
  for (const p of oordeel.problemen) {
    if (uit.length > MAX_EIGENAAR_PROBLEMEN) break;
    if (!p.citaat?.trim() || !citaatStaatErin(p.citaat, tekst)) continue;
    const sleutel = normaal(p.citaat);
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    uit.push({
      dimension: DIMENSIE[p.soort] ?? "overtuiging",
      blocking: false,
      section: null,
      finding: `${LABEL[p.soort] ?? LABEL.anders}: "${p.citaat.trim()}"`,
      evidence: p.citaat.trim(),
      recommendation: p.voorstel.trim(),
    });
  }
  return uit;
}

/** Wat er van het oordeel bij een versie bewaard wordt (`quality_json.eigenaar`). */
export interface EigenaarSamenvatting {
  publiceert: "ja" | "met_aanpassingen" | "nee";
  /** Het aantal bevindingen van de eigenaarstoets die de code liet staan. */
  problemen: number;
}

const RANG: Record<EigenaarSamenvatting["publiceert"], number> = { ja: 0, met_aanpassingen: 1, nee: 2 };

/** Zoveel problemen minder telt als echt beter; één verschil is ruis van de lezer. */
export const EIGENAAR_MARGE = 2;

/**
 * Welke van twee versies vindt de eigenaarstoets beter? Eerst of hij zou
 * publiceren, dan het aantal problemen met een echt citaat. `null` als een van
 * beide geen oordeel heeft, of het verschil binnen de marge valt: dan beslist
 * de bestaande regel (`nietSlechterDan`).
 *
 * Waarom: bij de nameting van 25 september 2026 besliste de score van de
 * redactiebeoordelaar welke versie bleef, terwijl de eigenaarstoets als enige
 * dezelfde zinnen aanwees als de blinde lezer.
 */
export function eigenaarVoorkeur(
  huidig: EigenaarSamenvatting | null | undefined,
  nieuw: EigenaarSamenvatting | null | undefined,
): "huidig" | "nieuw" | null {
  if (!huidig || !nieuw || !(huidig.publiceert in RANG) || !(nieuw.publiceert in RANG)) return null;
  if (RANG[nieuw.publiceert] !== RANG[huidig.publiceert]) {
    return RANG[nieuw.publiceert] < RANG[huidig.publiceert] ? "nieuw" : "huidig";
  }
  if (Math.abs(nieuw.problemen - huidig.problemen) < EIGENAAR_MARGE) return null;
  return nieuw.problemen < huidig.problemen ? "nieuw" : "huidig";
}
