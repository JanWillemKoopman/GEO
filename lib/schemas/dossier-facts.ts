import { z } from "zod";

/**
 * Het merkdossier: aangeleverd materiaal omzetten naar bevestigde feiten
 * (implementatieplan.md S5, contentbriefing.md §7/§8).
 *
 * ── WAAROM VRAAG/ANTWOORD EN GEEN LOSSE ZINNEN ──────────────────────────────
 *
 * De atomiseerstap voor sitetekst (S1) levert letterlijke zinnen op, en dat is
 * daar het juiste: die tekst staat al publiek en de zin ís de bron. Voor
 * aangeleverd materiaal ligt het anders. Een tarievenpagina zegt "Zitting
 * manuele therapie 30 min. — € 45,00"; dat is pas bruikbaar als er ook staat
 * wélke vraag het beantwoordt.
 *
 * Een vraag/antwoord-paar past bovendien exact op de kennisbank die er al is
 * (`fact_requests.question` + `answer`, contentbriefing.md §7). Dat is wat het
 * dossier duurzaam maakt: dezelfde feiten voeden de volgende analyse zonder dat
 * er ook maar iets opnieuw gevraagd wordt, en `buildFactBase()` pikt ze op via
 * het pad dat er al ligt — geen nieuwe kolom, geen migratie.
 *
 * ── HET MODEL MAG NIETS TOEVOEGEN ───────────────────────────────────────────
 *
 * `answer` moet LETTERLIJK in het aangeleverde materiaal staan, en
 * `sourceSentence` is de zin waar het uit komt. Beide worden in code nagetrokken
 * (`dossier-verify.ts`). Een afgerond bedrag, een samengevatte voorwaarde of een
 * "ongeveer" dat er niet stond, valt weg — dat is geen strengheid om de
 * strengheid maar de enige manier waarop deze feiten net zo betrouwbaar zijn als
 * een antwoord dat de klant zelf intikte.
 */
export const DossierFact = z.object({
  /** Waar dit feit antwoord op geeft, in de woorden van een klant. */
  question: z.string(),
  /** Het antwoord. Moet letterlijk in het aangeleverde materiaal staan. */
  answer: z.string(),
  /** De letterlijke zin of regel waar het antwoord uit komt. */
  sourceSentence: z.string(),
  /**
   * Verloopt dit feit? Prijzen, looptijden, tarieven en openingstijden wel;
   * "wij bestaan sinds 1998" niet.
   *
   * Zet `verify_after` (contentbriefing.md §7). Die kolom bestaat sinds migratie
   * `0024` en werd tot nu toe nergens gevuld — hierdoor gaat de veroudering van
   * de kennisbank voor het eerst iets doen.
   */
  perishable: z.boolean(),
});

export const DossierFacts = z.object({
  facts: z.array(DossierFact),
});

export type DossierFact = z.infer<typeof DossierFact>;
export type DossierFacts = z.infer<typeof DossierFacts>;
