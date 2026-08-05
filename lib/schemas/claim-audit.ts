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
});

export const ClaimAudit = z.object({
  claims: z.array(AuditedClaim),
});

export type AuditedClaim = z.infer<typeof AuditedClaim>;
export type ClaimAudit = z.infer<typeof ClaimAudit>;
