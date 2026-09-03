import { z } from "zod";

/**
 * De claim-audit (contentbriefing.md §3.2, implementatieplan.md R5.1).
 *
 * In plaats van meteen een artikel te schrijven, vragen we het model eerst welke
 * BEWERINGEN de pagina nodig heeft om z'n doelvraag geloofwaardig te
 * beantwoorden. Dus een skelet van claims, geen proza. Elke claim die de
 * feitenkaart niet dekt, wordt een vraag aan de klant.
 *
 * ── WAAROM DIT WERKT — GETOETST, NIET AANGENOMEN ────────────────────────────
 *
 * De audit is handmatig uitgevoerd op de echte gegenereerde pagina uit de
 * praktijktest. Van de 16 beweringen markeerde hij precies de zes verzonnen
 * claims als onbewezen, plus een feitelijk onjuiste rij in een vergelijkingstabel
 * die bij de handmatige controle pas als laatste opviel.
 *
 * ── HET MODEL BEOORDEELT ZICHZELF NIET ──────────────────────────────────────
 *
 * `supported` en `sourceRef` zijn een VOORSTEL van het model, geen oordeel. De
 * code controleert of `sourceRef` daadwerkelijk naar een feit op de kaart wijst
 * (`isSupported` in lib/pipeline/factcard.ts); wijst hij nergens naar, dan geldt
 * de claim als onbewezen. Anders zou een optimistisch model zich uit de audit
 * kunnen kletsen en verdwijnt juist de vraag die het gat moest dichten.
 */

/** Hoe de klant deze vraag beantwoordt, bepaalt het invoerveld in het scherm. */
export const ANSWER_TYPES = [
  "ja_nee",
  "bedrag",
  "getal",
  "tekst_kort",
  "tekst_lang",
  "keuze",
  "url",
  "lijst",
] as const;

/**
 * De zes vraagsoorten (contentbriefing.md §5). Ze worden in het scherm
 * gegroepeerd, want dat maakt invullen sneller.
 *
 * `onderscheid` is de meest waardevolle en de meest verwaarloosde: het is de
 * enige informatie die principieel niet uit een crawl of web_search te halen is.
 * `grenzen` is de rem, wat de klant juist NIET beweerd wil hebben.
 */
export const QUESTION_KINDS = [
  "verificatie",
  "aanvulling",
  "onderscheid",
  "bewijs",
  "praktisch",
  "grenzen",
] as const;

export type AnswerType = (typeof ANSWER_TYPES)[number];
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const AuditedClaim = z.object({
  /** De bewering zelf. "Het maandbedrag is all-in vanaf €419." */
  claim: z.string(),
  /** Welke doelvraag deze bewering helpt beantwoorden. */
  neededFor: z.string(),
  /** Voorstel van het model; de code beslist (zie de kop van dit bestand). */
  supported: z.boolean(),
  /** Het F-nummer van de feitenkaart dat dit zou dekken, of null. */
  sourceRef: z.string().nullable(),
  /**
   * Het LETTERLIJKE fragment uit dat feit dat de bewering dekt (citaatplicht).
   *
   * Zonder deze eis bleek `sourceRef` waardeloos: bij de eerste echte briefing
   * wezen 6 van de 7 beweringen naar hetzelfde blok sitetekst. Het nummer
   * bestond, dus alles gold als onderbouwd en er werd geen enkele vraag gesteld.
   * De code controleert nu of dit fragment écht in dat feit voorkomt.
   */
  supportQuote: z.string().nullable(),
  /** kern = zonder dit feit is de pagina waardeloos voor z'n doelvraag. */
  importance: z.enum(["kern", "ondersteunend"]),
  /**
   * Welk SOORT bewering dit is (punt 7 van de opdracht).
   *
   * ── WAAROM DIT NAAST `importance` STAAT ─────────────────────────────────
   *
   * `importance` zegt hoe zwaar de bewering weegt voor DEZE pagina. Deze zegt
   * of er überhaupt klantspecifiek bewijs voor nodig is, en dat is een andere
   * vraag. "Een warmtepomp werkt het zuinigst bij lage aanvoertemperatuur" is
   * belangrijk voor de pagina én algemene kennis: daar hoeft de ondernemer
   * niets voor aan te leveren.
   *
   * Zonder dat onderscheid gaat de app vragen stellen over algemene kennis, en
   * dat is precies de geloofwaardigheid die `contentbriefing.md` §4 regel 6
   * beschermt: een vraag waarvan het antwoord op internet staat, kost meer
   * vertrouwen dan hij oplevert.
   *
   *   `bedrijfsspecifiek` = alleen dit bedrijf kan dit bevestigen. Vraag erom.
   *   `controleerbaar`    = feitelijk na te gaan, maar niet bij de klant (een
   *                         norm, een wettelijke termijn). Onderbouw met een bron.
   *   `algemeen`          = vakkennis. Geen bewijs van de klant nodig.
   */
  claimClass: z.enum(["bedrijfsspecifiek", "controleerbaar", "algemeen"]),
  /** De vraag die dit gat dicht. Null als de claim al gedekt is. */
  questionIfMissing: z.string().nullable(),
  /** In gewone taal: wat levert het antwoord op? Geen jargon. */
  reason: z.string(),
  kind: z.enum(QUESTION_KINDS),
  answerType: z.enum(ANSWER_TYPES),
  /** Alleen bij answerType 'keuze'. */
  options: z.array(z.string()),
  /** Ons beste voorstel uit bekende data, bevestigen is goedkoper dan formuleren. */
  suggestedAnswer: z.string().nullable(),
  /**
   * Op welk niveau het antwoord herbruikbaar is (contentbriefing.md §7).
   * Bij twijfel wint de bredere scope: liever één keer te veel hergebruiken dan
   * één keer te veel vragen.
   */
  scope: z.enum(["merk", "analyse", "pagina"]),
  /**
   * De sectie van het contentcontract waar deze bewering bij hoort, zoals hij in
   * de opdracht staat: "P2-s5" (docs/tasks/vragen-voor-het-schrijven.md §5).
   *
   * ── WAAROM DIT ER IS ────────────────────────────────────────────────────────
   *
   * Het maakt de vraag concreet en de reden zichtbaar. Vergelijk:
   *
   *   nu:     "Wat is de richtprijs voor een hybride warmtepomp inclusief
   *            installatie in Oss en welke onderdelen zitten daarin?"
   *   straks: "Voor de sectie 'Wat kost het inclusief installatie' heb ik een
   *            bedrag nodig. Zonder dat blijft die sectie leeg."
   *
   * En het is wat OVERSLAAN een zichtbare prijs geeft: zonder deze koppeling is
   * een overgeslagen vraag niet aan een sectie te verbinden, verdwijnt het gat
   * uit beeld en blijft alleen een dunne pagina over waarvan niemand meer weet
   * waarom hij dun is.
   *
   * ── WAAROM MET EEN PAGINAVOORVOEGSEL ────────────────────────────────────────
   *
   * Elke pagina nummert zijn eigen secties vanaf s1, dus "s5" alleen wijst
   * nergens heen zodra er meer dan één pagina in de batch zit. De P-nummers in
   * de opdracht zijn dezelfde als bij "PAGINA 1", "PAGINA 2".
   *
   * Null is normaal: een bewering die niet uit een sectie komt (of een pagina
   * zonder contract) heeft er geen. De koppeling valt dan terug op `neededFor`.
   */
  sectionId: z.string().nullable(),
});

/**
 * Een term die algemene uitleg nodig heeft, geen bewering over dit bedrijf
 * (geo-toelichting, gesprek van 1 september).
 *
 * ── WAAROM DIT EEN EIGEN TYPE IS EN GEEN AuditedClaim ───────────────────────
 *
 * Een aanbeveling kan een pagina voorstellen die leunt op iets dat wél op de
 * site van de klant staat (een keurmerk, een norm) maar waarvan de BETEKENIS
 * nergens staat. Zo'n uitleg is geen bewering over de klant en heeft dus geen
 * F-nummer, geen `sourceRef`, geen `supportQuote`: die velden van AuditedClaim
 * zouden hier allemaal leeg of onwaar zijn. Vandaar een eigen, kleiner type.
 *
 * ── WAAROM PER PAGINA EN NIET VOOR HET HELE CLUSTER ─────────────────────────
 *
 * De aanbevelingen in één analyse lopen soms sterk uiteen van onderwerp (het
 * ene stuk over levertijden, het andere over certificeringen). Eén
 * clusterbrede achtergrondtekst zou voor de helft van die pagina's ruis zijn
 * in plaats van versterking. `neededFor` gebruikt daarom dezelfde koppeling
 * als `AuditedClaim.neededFor`: de tekst van de doelvraag die dit item
 * aanvult, waarmee `paginaVanClaim()` in `briefing.ts` het aan precies de
 * juiste pagina('s) toewijst.
 */
export const GeneralContextGap = z.object({
  /** De term of het begrip dat uitleg nodig heeft, bv. "ISO 9001" of "het Keurmerk Stichting X". */
  term: z.string(),
  /** Welke doelvraag dit item aanvult, zelfde koppeling als AuditedClaim.neededFor. */
  neededFor: z.string(),
  /** In gewone taal: waarom maakt uitleg van deze term de pagina sterker? */
  reason: z.string(),
});

export const ClaimAudit = z.object({
  claims: z.array(AuditedClaim),
  /** Termen die algemene, niet-bedrijfsspecifieke uitleg nodig hebben (S9). Leeg is de norm. */
  generalContextGaps: z.array(GeneralContextGap),
});

export type AuditedClaim = z.infer<typeof AuditedClaim>;
export type GeneralContextGap = z.infer<typeof GeneralContextGap>;
export type ClaimAudit = z.infer<typeof ClaimAudit>;
