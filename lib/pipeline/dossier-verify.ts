/**
 * Het vangnet onder het merkdossier (implementatieplan.md S5).
 *
 * ── EEN PROMPTINSTRUCTIE IS EEN INTENTIE, CODE IS EEN GARANTIE ──────────────
 *
 * De extractieprompt zegt "neem het antwoord letterlijk over". Deze module is de
 * garantie eronder: staat het antwoord niet woordelijk in het aangeleverde
 * materiaal, dan valt het feit weg.
 *
 * Dat is geen theoretisch risico. Het hele merkdossier bestaat omdat een
 * ondernemer zijn tarieven en voorwaarden al ergens heeft staan, en juist bij
 * dat soort materiaal is de verleiding om af te ronden of samen te vatten het
 * grootst — "vanaf ongeveer €45" is een andere belofte dan "€ 45,00", en de
 * klant is degene die daarop afgerekend wordt. Onbekend is beter dan verkeerd.
 *
 * Deze feiten komen bovendien op de feitenkaart terecht als door de klant
 * bevestigd, met de hoogste betrouwbaarheid van alle bronnen (`SOURCE_ORDER`).
 * Precies daarom mag hier niets doorheen glippen dat niet is aangeleverd.
 *
 * Bewust ZONDER `server-only`: pure controle, testbaar in een kaal script —
 * zelfde patroon als `atom-verify.ts`, `position.ts` en `validate-claims.ts`.
 */
import { normalizeForQuote, claimKey, topicKey } from "@/lib/pipeline/factcard";
import type { AnswerType } from "@/lib/schemas/claim-audit";

/** Eén gecontroleerd feit, klaar om als beantwoorde `fact_request` weg te schrijven. */
export interface VerifiedDossierFact {
  question: string;
  answer: string;
  answerType: AnswerType;
  claimKey: string;
  /** De letterlijke bronzin, voor de traceerbaarheid in `raw_json`. */
  sourceSentence: string;
  /** ISO-datum waarop dit feit opnieuw bevestigd moet worden, of `null`. */
  verifyAfter: string | null;
}

/**
 * Hoeveel feiten er per aangeleverd document doorkomen.
 *
 * Niet uit kostenoverweging — die zit in de aanroep — maar omdat de klant de
 * lijst moet kunnen nalopen. Veertig feiten in één keer is geen bevestiging
 * meer maar een muur tekst, en dan klikt hij hem weg zonder te lezen. Dat is
 * precies het risico dat deze stap moet vermijden: deze feiten gelden straks als
 * door de klant bevestigd.
 */
export const MAX_DOSSIER_FACTS = 30;

/** Onder deze lengte is een vraag of antwoord geen feit maar een fragment. */
const MIN_ANSWER_CHARS = 2;
const MIN_QUESTION_CHARS = 8;

/** Boven deze lengte is het geen atomair feit meer maar een alinea. */
const MAX_ANSWER_CHARS = 200;
const MAX_QUESTION_CHARS = 160;

/**
 * Hoe lang een verlopend feit geldig blijft (contentbriefing.md §7).
 *
 * Zes maanden, en dat is een compromis: prijzen veranderen sneller, maar een
 * verificatievraag die elke maand terugkomt voelt als zeuren. Het is bovendien
 * geen harde vervaldatum — een verlopen feit wordt een verificatievraag mét het
 * oude antwoord als voorstel, dus één klik.
 */
const VERIFY_AFTER_MONTHS = 6;

/**
 * Het antwoordtype afleiden uit het antwoord zelf.
 *
 * Bepaalt het invoerveld waarin de klant dit feit later kan bijstellen
 * (contentbriefing.md §8). Deterministisch en niet aan het model gevraagd: dit
 * is af te lezen, en elk veld dat het model mág invullen is een veld dat het
 * verkeerd kan invullen.
 */
export function answerTypeOf(answer: string): AnswerType {
  const a = answer.trim();
  if (/^https?:\/\//i.test(a)) return "url";
  if (/[€$]|\beur\b|\beuro\b/i.test(a)) return "bedrag";
  if (/^[\d.,\s]+$/.test(a)) return "getal";
  if (a.length > 80) return "tekst_lang";
  return "tekst_kort";
}

/**
 * Houdt alleen de feiten over die écht in het aangeleverde materiaal staan.
 *
 * Wat er afvalt, en waarom:
 *   • antwoord niet in de brontekst — samengevat of afgerond, dus niet na te
 *     trekken. Dit is de belangrijkste regel van deze module.
 *   • bronzin niet in de brontekst — het model wijst een zin aan die er niet
 *     staat; dan is de herkomst van het antwoord onbekend.
 *   • antwoord niet in de bronzin — de zin dekt het antwoord niet, en dan zegt
 *     de verwijzing niets (dezelfde fout als een F-nummer dat bestaat maar niet
 *     dekt, R5-verificatie 31 juli).
 *   • te kort of te lang — een fragment of een alinea, geen atomair feit.
 *   • dubbel — twee formuleringen van hetzelfde levert twee feiten op die elkaar
 *     op de kaart kunnen tegenspreken.
 */
export function verifyDossierFacts(
  facts: { question: string; answer: string; sourceSentence: string; perishable: boolean }[],
  documentText: string,
  now: Date = new Date(),
): VerifiedDossierFact[] {
  const bron = normalizeForQuote(documentText);
  if (bron.length === 0) return [];

  const gezien = new Set<string>();
  const uitkomst: VerifiedDossierFact[] = [];

  for (const feit of facts) {
    const vraag = (feit.question ?? "").trim().replace(/\s+/g, " ");
    const antwoord = (feit.answer ?? "").trim().replace(/\s+/g, " ");
    const zin = (feit.sourceSentence ?? "").trim().replace(/\s+/g, " ");

    if (vraag.length < MIN_QUESTION_CHARS || vraag.length > MAX_QUESTION_CHARS) continue;
    if (antwoord.length < MIN_ANSWER_CHARS || antwoord.length > MAX_ANSWER_CHARS) continue;

    const antwoordNorm = normalizeForQuote(antwoord);
    const zinNorm = normalizeForQuote(zin);
    if (antwoordNorm.length === 0) continue;

    // De drie controles, in volgorde van hoe erg het is als ze falen.
    if (!bron.includes(antwoordNorm)) continue;
    if (zinNorm.length === 0 || !bron.includes(zinNorm)) continue;
    if (!zinNorm.includes(antwoordNorm)) continue;

    // Ontdubbelen op ONDERWERP, niet op formulering (dezelfde afweging als
    // R8.4). Eén tarievenpagina levert makkelijk "wat kost een zitting manuele
    // therapie?" én "wat kost manuele therapie per zitting?" op; dat zijn twee
    // sleutels voor één feit, en twee keer hetzelfde op de kaart betekent dat
    // het model mag kiezen welke het aanhaalt.
    //
    // De sleutel die WEGGESCHREVEN wordt is nog steeds `claimKey`: die is fijner
    // en dient de unieke index in de database. `topicKey` is alleen de
    // groepering binnen dit ene document.
    const onderwerp = topicKey(vraag);
    const sleutel = claimKey(vraag);
    if (!sleutel) continue;
    const groep = onderwerp || sleutel;
    if (gezien.has(groep)) continue;
    gezien.add(groep);

    uitkomst.push({
      question: vraag,
      answer: antwoord,
      answerType: answerTypeOf(antwoord),
      claimKey: sleutel,
      sourceSentence: zin,
      verifyAfter: feit.perishable ? verlooptOp(now) : null,
    });

    if (uitkomst.length >= MAX_DOSSIER_FACTS) break;
  }

  return uitkomst;
}

/** De datum waarop een verlopend feit opnieuw bevestigd moet worden. */
function verlooptOp(now: Date): string {
  const d = new Date(now.getTime());
  d.setMonth(d.getMonth() + VERIFY_AFTER_MONTHS);
  return d.toISOString().slice(0, 10);
}
