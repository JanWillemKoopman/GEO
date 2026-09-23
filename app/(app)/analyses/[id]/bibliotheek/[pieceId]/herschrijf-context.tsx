"use client";

import { createContext, useContext } from "react";

/**
 * De opdracht die vanuit de kwaliteitsrail in het herschrijfvak belandt.
 *
 * ── ⚠️ WAAROM DIT EEN CONTEXT IS EN GEEN PROP (22 september 2026) ───────────
 *
 * De eerste versie van dit scherm gaf `ReviseBox` door als FUNCTIE:
 * `herschrijven={({ opdracht, bezig }) => <ReviseBox ... />}`. Dat werkt in
 * TypeScript, het bouwt zonder klacht, en het valt om zodra de pagina echt
 * gerenderd wordt. `page.tsx` is een servercomponent en `ContentWerkblad` een
 * clientcomponent, en React kan geen functie over die grens sturen: hij moet
 * alles wat hij doorgeeft kunnen serialiseren, en een functie kan dat niet.
 *
 * In productie levert dat een scherm op dat zegt "Deze pagina kon niet geladen
 * worden", met alleen een digest erbij, want Next verbergt de echte melding om
 * geen details te lekken. De vier controles zien het niet: `tsc` keurt het type
 * goed, en `build` rendert deze route niet vooraf (hij staat op `ƒ`, dynamisch
 * per aanvraag), dus de fout ontstaat pas bij de eerste echte bezoeker.
 *
 * Wat wél mag over die grens: een KANT-EN-KLAAR ELEMENT. `page.tsx` maakt
 * `<ReviseBox />` dus zelf aan en geeft hem als gewone inhoud door;
 * `ContentWerkblad` zet er deze context omheen, en `ReviseBox` leest hem aan de
 * clientkant. Alles wat er over de grens gaat is daarmee weer data.
 *
 * `sleutel` is het tijdstip van de klik: twee keer dezelfde bevinding
 * aanklikken moet het vak twee keer aanvullen, en op de tekst alleen zou de
 * tweede klik niets doen.
 */
export interface Herschrijfopdracht {
  tekst: string;
  sleutel: number;
}

export interface Herschrijfstand {
  /** De aanbeveling die in het vak gezet moet worden. `null` = niets te doen. */
  opdracht: Herschrijfopdracht | null;
  /** Er loopt al een schrijfronde voor deze pagina. */
  bezig: boolean;
  /**
   * De punten die de klant in het puntenvenster aan ORBIT ENGINE gaf
   * (`lib/puntenronde.ts`). Ze gaan mee in dezelfde schrijfronde als wat er in
   * het vak getypt wordt, zodat er één knop is en niet twee.
   */
  lijst: { sleutel: string; tekst: string }[];
  /** Haal één punt van de lijst. */
  onVanLijst: (sleutel: string) => void;
  /** De schrijfronde is gestart: de lijst is verwerkt. */
  onVerstuurd: () => void;
}

/**
 * De standaardwaarde is de stille stand: geen opdracht, niets bezig. Zo werkt
 * `ReviseBox` ook zonder provider, bijvoorbeeld als hij ooit op een ander
 * scherm hergebruikt wordt.
 */
const HerschrijfContext = createContext<Herschrijfstand>({
  opdracht: null,
  bezig: false,
  lijst: [],
  onVanLijst: () => undefined,
  onVerstuurd: () => undefined,
});

export const HerschrijfProvider = HerschrijfContext.Provider;

export function useHerschrijfstand(): Herschrijfstand {
  return useContext(HerschrijfContext);
}
