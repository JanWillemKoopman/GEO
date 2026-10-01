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
import type { DemoTekst } from "@/lib/demo/runx/teksten/type";
import { LOOPANALYSE } from "@/lib/demo/runx/teksten/loopanalyse";
import { LOOPANALYSE_2 } from "@/lib/demo/runx/teksten/loopanalyse-2";
import { STAD } from "@/lib/demo/runx/teksten/stad";
import { BEGINNEN } from "@/lib/demo/runx/teksten/beginnen";
import { SCHOENEN } from "@/lib/demo/runx/teksten/schoenen";
import { BLESSURES } from "@/lib/demo/runx/teksten/blessures";
import { WEDSTRIJD } from "@/lib/demo/runx/teksten/wedstrijd";
import { TRAIL, HYROX } from "@/lib/demo/runx/teksten/trail";

export type { DemoTekst };

export const TEKSTEN: Record<string, DemoTekst> = {
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
