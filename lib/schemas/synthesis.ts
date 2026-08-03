import { z } from "zod";

/**
 * De synthese van het klantprofiel (docs/tasks/onboarding-2.0.md, blok B fase 5).
 *
 * ── DRIE UITKOMSTEN, EN DE DERDE IS DE BELANGRIJKSTE ────────────────────────
 *
 * `dossier` is wat een mens leest. `gaps` is de gespreksagenda. En `facts` is
 * waar de investering terugkomt: citeerbare feiten die in `brand_facts` landen
 * en straks de contentbriefing voeden.
 *
 * Die briefing stelt nu tot acht vragen aan de klant omdat de feitenkaart leeg
 * is. Over vijf testklanten leverde dat 21 beantwoorde vragen op, waarvan 8
 * praktisch bruikbaar (zie `dossier`-route). Elk feit dat hier al uit de site
 * komt, is een vraag die de klant niet hoeft te beantwoorden.
 */
export const ProfileSynthesis = z.object({
  /**
   * Het profiel in gewone taal, voor een ondernemer zonder vakjargon. Vier tot
   * acht zinnen: wat dit bedrijf doet, voor wie, wat het onderscheidt en waar
   * het staat.
   */
  dossier: z.string(),
  /**
   * Wat we NIET hebben kunnen vaststellen maar wel hadden willen weten. Dit
   * wordt de agenda van het gesprek, dus concreet en beantwoordbaar — geen
   * "meer informatie over de doelgroep" maar "hoeveel behandelkamers zijn er?".
   */
  gaps: z.array(z.string()),
  /**
   * Citeerbare feiten over dit bedrijf. Harde gegevens: aantallen, jaartallen,
   * termijnen, garanties, specialisaties, keurmerken.
   */
  facts: z.array(
    z.object({
      /** Het feit in één zin, zoals het op een feitenkaart komt te staan. */
      text: z.string(),
      /** De pagina waar het vandaan komt. Moet een gecrawlde pagina zijn. */
      sourceUrl: z.string(),
      /**
       * Een LETTERLIJK fragment van die pagina dat dit feit draagt. Wordt in
       * code nagelopen — wat niet letterlijk voorkomt, vervalt.
       */
      quote: z.string(),
    }),
  ),
});

export type ProfileSynthesis = z.infer<typeof ProfileSynthesis>;
