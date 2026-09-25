/**
 * Onzekerheid en bronpraat nagerekend in de tekst
 * (docs/tasks/contentpijplijn-publicatiewaardig.md §7 en §12, WP6).
 *
 * ── WAAROM ──────────────────────────────────────────────────────────────────
 *
 * Voor een ontbrekend feit kreeg de schrijver tot 25 september 2026
 * tegenstrijdige opdrachten, en de enige uitweg was het gat opschrijven (§1.2,
 * O2): "Welke controles standaard tijdens een ketelbezoek plaatsvinden (...) is
 * niet vastgelegd", "Welke van deze punten tijdens een ketelbezoek worden
 * bekeken, staat niet als vaste werkwijze vast", "De beschikbare
 * prijsinformatie benoemt niet welke werkzaamheden standaard in de
 * installatieprijs zitten". Een ruwe telling vond gemiddeld zes zulke
 * formuleringen per pagina.
 *
 * Sinds de paginastrategie (WP3) heeft elke onzekerheid een bestemming: A
 * (vraag aan de ondernemer, de pagina zwijgt), B (één keer uitleggen, met een
 * reden uit §7.2) of C (weglaten). Deze module rekent na of de tekst zich daaraan
 * houdt, en vangt de gatzinnen als vorm. Een gatzin en een A- of C-punt in de
 * tekst zijn blokkades (§12.1); een voorbehoud direct na een bewijsstuk is een
 * waarschuwing (§12.2).
 *
 * ⚠️ Een lijst formuleringen vangt de volgende ronde niet, zolang de opdracht
 * die het gat afdwingt blijft staan (§1.2). Die opdracht is weg (WP4); deze
 * patronen zijn het vangnet eronder, en daarom vormen en geen losse zinnen.
 *
 * Puur (conventie 2).
 */
import type { PageStrategy } from "@/lib/schemas/page-strategy";
import { topicTerms, scoreTermOverlap } from "@/lib/pipeline/page-relevance";

/**
 * Zinnen over wat WIJ niet weten, of over onze bronnen. Het vierde patroon
 * dekt de hele familie "de beschikbare/aangeleverde (prijs)informatie ...".
 */
export const GATPATRONEN: RegExp[] = [
  // "is niet vastgelegd", "zijn niet bekend", "staat niet vast"
  /\b(?:is|zijn|staat|staan|wordt|worden)\s+(?:hier\s+)?niet\s+(?:vastgelegd|vastgesteld|bekend|beschikbaar|genoemd|gespecificeerd|bevestigd)\b/i,
  // "staat niet als vaste werkwijze vast"
  /\bniet\s+als\s+vaste?\s+\w+\s+vast\b/i,
  // "valt niet af te leiden", "is niet af te leiden"
  /\b(?:valt|is)\s+niet\s+af\s+te\s+leiden\b/i,
  // "de beschikbare informatie", "de aangeleverde prijsinformatie", "beschikbare gegevens"
  /\b(?:de\s+)?(?:beschikbare|aangeleverde|bekende)\s+(?:\w*informatie|gegevens|bronnen)\b/i,
  // "wordt hier niet genoemd", "noemt deze pagina niet"
  /\b(?:hier|op deze pagina|in deze tekst)\s+(?:niet|geen)\s+(?:genoemd|vermeld|bevestigd)/i,
  // "Deze pagina geeft geen bevestigde lokale eis"
  /\bdeze\s+pagina\s+(?:geeft|noemt|bevat)\s+geen\b/i,
  // "geen toezegging over documenten die wij standaard verstrekken"
  /\bgeen\s+toezegging\s+over\b/i,
];

/** Een voorbehoud direct achter een bewijsstuk: het bewijs weer afzwakken. */
export const VOORBEHOUD_NA_BEWIJS: RegExp[] = [
  /\bmaar\s+(?:dat|dit)\s+zegt\s+(?:op\s+zichzelf\s+)?(?:niets|weinig)\b/i,
  /\b(?:die|dat|dit)\s+zegt\s+op\s+zichzelf\s+niets\b/i,
  /\b(?:dat|dit)\s+is\s+(?:een\s+eerste\s+(?:beeld|houvast|indicatie)|geen\s+(?:garantie|offerte|toezegging))\b/i,
  /\bgeen\s+garantie\s+voor\s+(?:iedere|elke)\b/i,
];

function zinnen(tekst: string): string[] {
  return (tekst ?? "")
    .replace(/^#{1,6} .*$/gm, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((z) => z.trim())
    .filter(Boolean);
}

/** De zinnen die over onze kennis of onze bronnen gaan. Blokkerend (§12.1). */
export function gatzinnen(tekst: string): string[] {
  return zinnen(tekst).filter((z) => GATPATRONEN.some((p) => p.test(z)));
}

/** Een voorbehoud direct na een bewijsstuk. Waarschuwing (§12.2). */
export function voorbehoudNaBewijs(tekst: string): string[] {
  return zinnen(tekst).filter((z) => VOORBEHOUD_NA_BEWIJS.some((p) => p.test(z)));
}

/**
 * Een toezegging van het bedrijf, in de gesloten definitie die de
 * feitelijkheidsbeoordelaar sinds WP6 volgt: een zin in de wij-vorm of met de
 * bedrijfsnaam. Algemene uitleg zonder die vorm leest niemand als belofte, en
 * de beoordelaar liet er tot WP6 de schrijver een voorbehoud achter zetten.
 */
export function isToezegging(zin: string, brandName: string): boolean {
  const laag = zin.toLowerCase();
  if (brandName.trim() && laag.includes(brandName.trim().toLowerCase())) return true;
  return /\b(?:wij|we|ons|onze|bij ons)\b/i.test(zin);
}

/** Vanaf deze fractie van de kernwoorden gaat een zin over het punt. */
export const PUNT_DREMPEL = 0.6;

export interface BestemmingUitslag {
  /** Punten met bestemming A of C die toch als zin in de tekst staan. Blokkerend. */
  aOfCInTekst: { punt: string; bestemming: "A" | "C"; zin: string }[];
  /** Een toegestaan voorbehoud (B) dat vaker dan één keer staat. Waarschuwing. */
  bVaker: { formulering: string; aantal: number }[];
}

/**
 * Staat een punt met bestemming A of C toch in de tekst? Alleen bij minstens
 * twee kernwoorden in het punt: een punt van één woord ("prijs") zou elke zin
 * over de prijs raken, ook de goede.
 */
export function checkBestemmingen(strategie: PageStrategy, tekst: string): BestemmingUitslag {
  const alle = zinnen(tekst);
  const aOfCInTekst: BestemmingUitslag["aOfCInTekst"] = [];
  for (const o of strategie.onzekerheden) {
    if (o.bestemming !== "A" && o.bestemming !== "C") continue;
    const termen = topicTerms(o.punt);
    if (termen.length < 2) continue;
    const zin = alle.find((z) => scoreTermOverlap(z, termen) / termen.length >= PUNT_DREMPEL);
    if (zin) aOfCInTekst.push({ punt: o.punt, bestemming: o.bestemming, zin });
  }
  const bVaker: BestemmingUitslag["bVaker"] = [];
  const laag = (tekst ?? "").toLowerCase();
  for (const o of strategie.onzekerheden) {
    if (o.bestemming !== "B" || !o.formulering?.trim()) continue;
    const kern = o.formulering.trim().toLowerCase().replace(/[.!?]+$/, "");
    const aantal = kern ? laag.split(kern).length - 1 : 0;
    if (aantal > 1) bVaker.push({ formulering: o.formulering, aantal });
  }
  return { aOfCInTekst, bVaker };
}
