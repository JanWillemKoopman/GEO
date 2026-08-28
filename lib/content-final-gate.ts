/**
 * De eindpoort: geen definitieve versie zolang er vragen open staan.
 *
 * ── WAAROM DEZE POORT ER KOMT (28 AUGUSTUS 2026) ────────────────────────────
 *
 * Besluit van de eigenaar: de kwaliteit van een pagina hangt op de feiten die
 * de klant aanlevert. Een tekst zonder die feiten is algemene uitleg, en
 * algemene uitleg is precies wat een AI-assistent niet citeert. Dat is niet met
 * een betere prompt op te lossen, want het model kan een cijfer dat nergens
 * staat alleen verzinnen (en dat mag het niet, zie `lib/pipeline/content.ts`).
 *
 * ── ⚠️ EN WAAROM HIJ NIET VÓÓR HET EERSTE CONCEPT STAAT ─────────────────────
 *
 * Omdat de scherpste vragen pas ONTSTAAN tijdens het schrijven. De claim-audit
 * leest wat de tekst beweert en vraagt precies dát na (`lib/pipeline/briefing.ts`).
 * Een poort vóór het eerste concept zou dus vragen om antwoorden op vragen die
 * nog niet bestaan, en dan komt de klant nooit bij de vragen die er echt toe
 * doen. Eerst schrijven, dan de vragen die het schrijven oplevert, dan pas de
 * versie die af is.
 *
 * ── ⚠️ DIT SPREEKT EEN VASTGELEGD BESLUIT TEGEN, EN DAT IS BEWUST ───────────
 *
 * `release-panel.tsx` zei tot vandaag: "Geen muur. Een gate die je niet kunt
 * passeren is een muur, en muren leveren afgehaakte klanten op in plaats van
 * betere content." Dat argument geldt nog steeds voor alles behalve de
 * eindstap: de tekst blijft leesbaar, kopieerbaar en bewerkbaar, en de klant
 * kan zelf publiceren wat hij wil. Wat op slot gaat is dat ORBIT ENGINE hem
 * afrondt. En de uitweg is één klik: overslaan telt als antwoord.
 *
 * ── WELKE VRAGEN TEGENHOUDEN ────────────────────────────────────────────────
 *
 * Alleen vragen met status `open` die bij dit cluster horen, plus de vragen die
 * expliciet aan deze pagina gekoppeld zijn. **Niet** de merkbrede vragen die
 * niets met deze pagina te maken hebben: één onbeantwoorde vraag uit de
 * onboarding zou anders élke pagina van élk cluster voorgoed dichtzetten, en
 * dan is de poort geen kwaliteitsmaatregel maar een slot.
 *
 * Puur en zonder `server-only` (conventie 2): de route gebruikt hem als
 * garantie, de knop als melding, en `scripts/test-unit.ts` kan erbij.
 */

export interface PoortOordeel {
  /** Mag de definitieve versie er komen? */
  mag: boolean;
  /** Hoeveel vragen het tegenhouden. 0 zodra `mag` waar is. */
  open: number;
  /**
   * Wat de klant leest. Altijd gevuld, ook als het mag: dan staat er wat er
   * gebeurd is, en niet niets.
   */
  melding: string;
}

/**
 * Mag deze pagina afgerond worden?
 *
 * `open` is het aantal openstaande vragen van dit cluster plus de vragen die aan
 * deze pagina hangen. De aanroeper telt ze, want die weet welke rijen erbij
 * horen; deze functie beslist en schrijft de zin.
 */
export function eindpoort(open: number): PoortOordeel {
  if (open <= 0) {
    return {
      mag: true,
      open: 0,
      melding: "Alle vragen zijn behandeld. ORBIT ENGINE kan deze pagina afronden.",
    };
  }

  // ⚠️ De melding noemt de uitweg in dezelfde zin als de blokkade. Een melding
  // die alleen zegt wat niet mag, is een dood einde (`docs/ux-design.md` §4), en
  // de klant weet dan niet dat "weet ik niet" ook een antwoord is.
  const aantal =
    open === 1 ? "Er staat nog één vraag open" : `Er staan nog ${open} vragen open`;
  return {
    mag: false,
    open,
    melding:
      `${aantal}. ORBIT ENGINE schrijft de definitieve versie pas als je ze behandeld hebt: ` +
      "een pagina zonder jouw cijfers blijft algemeen, en algemene tekst wordt niet geciteerd. " +
      "Weet je iets niet, sla de vraag dan over, dat telt ook als antwoord.",
  };
}

/**
 * Dezelfde beslissing, maar dan wat de API terugstuurt.
 *
 * Conventie 1: de knop is een intentie, de route is de garantie. Beide lezen
 * dezelfde functie, zodat de melding op het scherm en de melding uit de route
 * nooit uit elkaar lopen.
 */
export const EINDPOORT_STATUS = 409;
