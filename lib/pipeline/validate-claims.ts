/**
 * De CLAIMVALIDATOR: het laatste vangnet onder het rapport
 * (implementatieplan.md R1.3).
 *
 * ── WAAROM EEN VANGNET, ER IS TOCH EEN BEWIJSDOSSIER? ───────────────────────
 *
 * R1.1 geeft het model per gemiste vraag precies welke bedrijven er in dát
 * antwoord stonden, en R1.2 zegt met zoveel woorden dat het er geen mag
 * bijhalen. Dat maakt de fout onwaarschijnlijk, niet onmogelijk — een
 * taalmodel blijft een taalmodel, en dit is precies de bewering waarop een
 * klant het product afrekent ("jullie zeggen dat concurrent X hier wint; ik
 * zie hem nergens").
 *
 * Daarom controleert deze module deterministisch na: elke concurrentnaam in
 * een `why`- of `problem`-veld moet voorkomen in het bewijs van de vraag
 * waaraan dat veld hangt. Zo niet, dan gaat de zin eruit.
 *
 * Wat er gestript wordt, wordt bewaard (`reports.stripped_claims_json`). Dat
 * is niet alleen een audit-trail: blijft die lijst structureel gevuld, dan is
 * dat het signaal dat de instructie uit R1.2 nog niet streng genoeg is.
 *
 * Bewust ZONDER `server-only`: pure tekstbewerking, testbaar in een kaal
 * script (scripts/test-unit.ts).
 */
import { splitByTerms } from "@/lib/highlight";

/** Eén verwijderde bewering, voor de audit-trail. */
export interface StrippedClaim {
  /** Waar de zin stond: 'aanbeveling' of 'gap', plus de titel/cluster. */
  where: string;
  /** De verwijderde zin, letterlijk. */
  sentence: string;
  /** De naam die niet onderbouwd was. */
  unsupportedName: string;
  /** Welke namen er volgens het bewijs wél bij deze vraag hoorden. */
  supportedNames: string[];
}

export interface ClaimCheckResult {
  /** De tekst met de niet-onderbouwde zinnen eruit. */
  text: string;
  stripped: StrippedClaim[];
}

/**
 * Splitst op zinsgrenzen, met de interpunctie en de witruimte eraan vast.
 *
 * Een punt telt alleen als zinseinde wanneer er WITRUIMTE of het einde van de
 * tekst op volgt. Dat is geen finesse maar noodzaak: de eerste versie splitste
 * naïef op elke punt, en daardoor viel "Bol.com" uiteen in "Bol." en "com". Geen
 * van beide helften bevatte de merknaam nog, dus de validator zag hem niet en
 * liet de onjuiste bewering staan — precies het geval dat hij moest vangen
 * (gevonden bij de verificatie op de echte rapporttekst van Coolblue).
 *
 * Domeinnamen en getallen als "3.5" blijven nu heel. Afkortingen met een punt
 * gevolgd door een spatie ("bijv. ") splitsen nog steeds ten onrechte; dat is
 * hier het lichtste kwaad, want een zin te veel verwijderen is minder erg dan
 * een onjuiste bewering laten staan.
 */
function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    if (!".!?".includes(text[i])) continue;

    // Doorlopende interpunctie meenemen ("…", "?!").
    let end = i;
    while (end + 1 < text.length && ".!?".includes(text[end + 1])) end++;

    const next = text[end + 1];
    if (next !== undefined && !/\s/.test(next)) {
      i = end; // geen zinseinde: midden in "Bol.com" of "3.5"
      continue;
    }

    let after = end + 1;
    while (after < text.length && /\s/.test(text[after])) after++;

    out.push(text.slice(start, after));
    start = after;
    i = after - 1;
  }

  if (start < text.length) out.push(text.slice(start));
  return out.filter((s) => s.trim().length > 0);
}

/**
 * Welke namen komen in deze tekst voor? Leunt op dezelfde matcher als de
 * tekstmarkering en de redactie (lib/highlight.ts): langste naam eerst,
 * woordgrenzen op letters/cijfers. Dat laatste doet ertoe — zonder zou "Spaces"
 * ook in "Spacesworks" matchen en zouden we de verkeerde zin strippen.
 */
function namesIn(text: string, names: string[]): string[] {
  const found = new Set<string>();
  for (const part of splitByTerms(text, names)) {
    if (part.term) found.add(part.term);
  }
  return Array.from(found);
}

/**
 * Controleert één tekstveld tegen de namen die het bewijs toestaat.
 *
 * `allowedNames` is de vereniging van alle bedrijven die in de antwoorden van de
 * gekoppelde vragen voorkwamen. `knownNames` is het volledige entiteitenregister
 * van dit profiel — dat is waarnaar we zoeken. Een naam die wél in de tekst
 * staat maar niet in `allowedNames`, is een bewering die het bewijs niet draagt.
 *
 * Een zin met twee namen waarvan er één onderbouwd is, gaat er in z'n geheel
 * uit. Dat kost een correcte mededeling, maar de zin bevat óók een onjuiste, en
 * die twee zijn niet te scheiden zonder de zin te herschrijven — wat dit stukje
 * code niet moet willen.
 */
export function stripUnsupportedClaims(
  text: string,
  args: { knownNames: string[]; allowedNames: string[]; where: string },
): ClaimCheckResult {
  const { knownNames, allowedNames, where } = args;
  if (!text.trim() || knownNames.length === 0) return { text, stripped: [] };

  const allowedLower = new Set(allowedNames.map((n) => n.trim().toLowerCase()));
  const stripped: StrippedClaim[] = [];

  const kept = splitSentences(text).filter((sentence) => {
    const unsupported = namesIn(sentence, knownNames).filter(
      (n) => !allowedLower.has(n.trim().toLowerCase()),
    );
    if (unsupported.length === 0) return true;

    stripped.push({
      where,
      sentence: sentence.trim(),
      unsupportedName: unsupported[0],
      supportedNames: allowedNames,
    });
    return false;
  });

  return { text: kept.join("").trim(), stripped };
}

/**
 * Wat er overblijft als élke zin gestript is.
 *
 * Een leeg `why`-veld zou het rapportscherm een kale aanbeveling laten tonen
 * zonder uitleg. Deze terugval zegt eerlijk wat er aan de hand is, in plaats van
 * te doen alsof er niets stond.
 */
export const NEUTRAL_FALLBACK =
  "Op deze vraag noemt de AI op dit moment geen enkele aanbieder — een kans om de eerste te zijn.";

/** `stripUnsupportedClaims`, met de terugval erin voor een leeggelopen veld. */
export function validateField(
  text: string,
  args: { knownNames: string[]; allowedNames: string[]; where: string },
): ClaimCheckResult {
  const result = stripUnsupportedClaims(text, args);
  return {
    text: result.text || (result.stripped.length > 0 ? NEUTRAL_FALLBACK : result.text),
    stripped: result.stripped,
  };
}
