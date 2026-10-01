/**
 * De teksten van de pagina's van het voorbeeldaccount RunX, per sleutel uit
 * `plan.ts`. Geschreven in Claude Code-sessies, niet via de OpenAI-API van de
 * app: het voorbeeldaccount kost niets (`docs/tasks/demo-account-runx.md` §6.4).
 *
 * De afspraken voor elke tekst: `docs/schrijfstijl.md`, je en jij, de stem uit
 * het merkprofiel (deskundig zonder te verkopen), geen prijzen, geen garanties,
 * geen superlatieven over RunX, en bij klachten altijd de grens van de winkel:
 * geen diagnose, wel doorverwijzen. Een pagina zonder tekst hier blijft bij het
 * inladen op "gepland" staan (`laden.ts`); een unittest eist dat er geen is.
 */
import type { DemoTekst, Uitbreiding } from "@/lib/demo/runx/teksten/type";
import { UITBREIDING_PRONK } from "@/lib/demo/runx/teksten/uitbreiding-pronk";
import { UITBREIDING_LOOPANALYSE_STAD } from "@/lib/demo/runx/teksten/uitbreiding-loopanalyse-stad";
import { UITBREIDING_BEGINNEN_SCHOENEN } from "@/lib/demo/runx/teksten/uitbreiding-beginnen-schoenen";
import { UITBREIDING_OVERIG } from "@/lib/demo/runx/teksten/uitbreiding-overig";
import { UITBREIDING_RONDE_2 } from "@/lib/demo/runx/teksten/uitbreiding-ronde-2";
import { LOOPANALYSE } from "@/lib/demo/runx/teksten/loopanalyse";
import { LOOPANALYSE_2 } from "@/lib/demo/runx/teksten/loopanalyse-2";
import { STAD } from "@/lib/demo/runx/teksten/stad";
import { BEGINNEN } from "@/lib/demo/runx/teksten/beginnen";
import { SCHOENEN } from "@/lib/demo/runx/teksten/schoenen";
import { BLESSURES } from "@/lib/demo/runx/teksten/blessures";
import { WEDSTRIJD } from "@/lib/demo/runx/teksten/wedstrijd";
import { TRAIL, HYROX } from "@/lib/demo/runx/teksten/trail";

export type { DemoTekst };

const BASIS: Record<string, DemoTekst> = {
  ...LOOPANALYSE,
  ...LOOPANALYSE_2,
  ...STAD,
  ...BEGINNEN,
  ...SCHOENEN,
  ...BLESSURES,
  ...WEDSTRIJD,
  ...TRAIL,
  ...HYROX,
};

const UITBREIDINGEN: Record<string, Uitbreiding>[] = [
  UITBREIDING_PRONK,
  UITBREIDING_LOOPANALYSE_STAD,
  UITBREIDING_BEGINNEN_SCHOENEN,
  UITBREIDING_OVERIG,
  UITBREIDING_RONDE_2,
];

/** Een afsluitende sectie: over de winkel, aansluiten of passen. Extra secties komen daarvóór. */
const AFSLUITER = /^## .*(winkel|passen|aansluiten|samen|praktisch|bereid|op de dag|in zaandam|aanmelden|probeer|laat je|twijfel|grens|nakijken)/i;

/**
 * Voegt extra secties in vóór de afsluitende sectie van een tekst, of erachter
 * als er geen is. Zo eindigt een pagina nog steeds met de oproep of de grens,
 * en niet met een losse uitweiding.
 */
export function uitbreiden(basis: DemoTekst, extra: Uitbreiding | undefined): DemoTekst {
  if (!extra) return basis;
  const delen = basis.tekst.split(/\n(?=## )/);
  const laatste = delen.length > 1 && AFSLUITER.test(delen[delen.length - 1]) ? delen.length - 1 : delen.length;
  const tekst = [...delen.slice(0, laatste), extra.tekst.trim(), ...delen.slice(laatste)].join("\n");
  return { ...basis, tekst, faq: [...basis.faq, ...(extra.faq ?? [])] };
}

export const TEKSTEN: Record<string, DemoTekst> = Object.fromEntries(
  Object.entries(BASIS).map(([sleutel, tekst]) => [
    sleutel,
    UITBREIDINGEN.map((u) => u[sleutel]).reduce<DemoTekst>((t, extra) => uitbreiden(t, extra), tekst),
  ]),
);
