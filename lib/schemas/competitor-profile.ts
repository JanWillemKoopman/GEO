import { z } from "zod";

/**
 * R4.2 — waaróm wordt een concurrent genoemd? (implementatieplan.md)
 *
 * Model `gpt-4.1-mini`, geen web_search, temperatuur 0 — dit is een
 * DESTILLATIE van bestaande tekst, geen creatieve taak. Het model mag niets
 * toevoegen wat niet in de meegegeven antwoorden staat.
 */

/**
 * De eigenschappen waarop een aanbieder genoemd kan worden.
 *
 * Bewust een gesloten lijst en geen vrije tekst. Bij de promptgeneratie liep het
 * vrije `cluster`-veld uit de hand — daar kwam één cluster per vraag uit plus
 * modelruis als "volumeEstimate: 75" in het veld. Een vaste set houdt de
 * uitkomsten vergelijkbaar tussen concurrenten én tussen periodes; dát is wat
 * een klant nodig heeft om te zien of hij terrein wint.
 */
export const COMPETITOR_ATTRIBUTES = [
  "prijs",
  "locatie",
  "specialisme",
  "assortiment",
  "snelheid",
  "beschikbaarheid",
  "service",
  "reputatie",
  "ervaring",
  "duurzaamheid",
] as const;

export type CompetitorAttribute = (typeof COMPETITOR_ATTRIBUTES)[number];

export const CompetitorProfileSet = z.object({
  competitors: z.array(
    z.object({
      /** Exact de naam zoals hij in de invoer stond, zodat terugkoppelen lukt. */
      name: z.string(),
      attributes: z.array(
        z.object({
          attribute: z.enum(COMPETITOR_ATTRIBUTES),
          /**
           * Een LETTERLIJK fragment uit de meegegeven antwoorden dat deze
           * eigenschap aantoont. Geen parafrase: net als bij het bewijsdossier
           * (R1) geldt dat wat niet na te trekken is, niet gezegd mag worden.
           */
          evidence: z.string(),
        }),
      ),
      /** Eén zin voor de klant, in gewone taal, zonder jargon. */
      summary: z.string(),
    }),
  ),
});

export type CompetitorProfileSet = z.infer<typeof CompetitorProfileSet>;
