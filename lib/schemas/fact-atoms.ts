import { z } from "zod";

/**
 * Sitetekst opknippen tot losse, citeerbare feiten
 * (strategie-contentkwaliteit-vervolgstappen.md S1).
 *
 * ── WAAROM DIT SCHEMA ZO KAAL IS ────────────────────────────────────────────
 *
 * R5 maakte alle sitetekst NIET-citeerbaar, en met reden: bij de eerste echte
 * briefing verwezen 6 van de 7 beweringen naar hetzelfde blok van 400 tekens.
 * Eén alibi dat alles dekte, dus nul vragen aan de klant.
 *
 * Maar die reparatie had een prijs die pas op 31 juli zichtbaar werd: er bleven
 * over vijf analyses 24 citeerbare feiten over, allemaal merkbreed
 * (proof_points), en géén enkele over het onderwerp. De schrijver had niets
 * concreets om op te staan en werd dus generiek. Precies de andere manier om de
 * lat niet te halen.
 *
 * De oplossing is niet de regel versoepelen maar het blok opknippen. Een zin van
 * twaalf woorden die letterlijk op de site staat, is wél na te trekken. Vandaar
 * dat dit schema maar twee dingen vraagt en er niets bij mag verzinnen:
 *
 *   • `sentence`, de LETTERLIJKE zin uit de aangeleverde tekst. Niet
 *     samengevat, niet netter gemaakt, niet aangevuld. De code controleert dat
 *     hij er echt in staat (`atomiseSitePages`), en gooit hem weg zo niet.
 *   • `pageIndex`, uit welke van de aangeleverde pagina's hij komt, zodat de
 *     bron-URL klopt.
 *
 * Er is bewust GEEN veld waarin het model mag uitleggen, samenvatten of
 * beoordelen. Elk zo'n veld is een uitnodiging om iets te schrijven dat niet op
 * de site staat, en dan zijn we terug bij het probleem dat de feitenkaart moest
 * oplossen.
 */
export const FactAtom = z.object({
  /** De letterlijke zin uit de brontekst. Wordt in code nagetrokken. */
  sentence: z.string(),
  /** 1-gebaseerde index van de pagina waaruit deze zin komt. */
  pageIndex: z.number(),
});

export const FactAtoms = z.object({
  atoms: z.array(FactAtom),
});

export type FactAtom = z.infer<typeof FactAtom>;
export type FactAtoms = z.infer<typeof FactAtoms>;
