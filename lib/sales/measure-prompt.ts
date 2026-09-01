/**
 * De twee prompts van de marktmeting, apart van de pijplijn.
 *
 * ── WAAROM APART ────────────────────────────────────────────────────────────
 *
 * Dezelfde reden als bij `lib/openai/mention-prompt.ts`, en die reden geldt hier
 * nog scherper. Deze twee teksten bepalen wat er gemeten wordt en wie er als
 * genoemd geldt, en daar hangt elke opportunity, elke hook en elke verkoopmail
 * aan. Een prompt die alleen in een `server-only`-bestand staat, is niet te
 * lezen vanuit `scripts/test-unit.ts`, en dan is de enige controle erop dat
 * iemand hem toevallig naleest.
 *
 * Bewust ZONDER `server-only` en zonder imports (conventie 2).
 */

/**
 * Wat de engine te horen krijgt bij het stellen van de vraag.
 *
 * ⚠️ Bewust bijna identiek aan `SIMULATE_SYSTEM` in `lib/pipeline/measure.ts`:
 * we meten wat een AI-assistent een echte gebruiker antwoordt, en dat antwoord
 * mag niet afhangen van hoe wij de vraag inkleden. Zou deze instructie sturen op
 * "noem zoveel mogelijk bedrijven", dan meet je de instructie en niet de markt,
 * en is elk cijfer dat eruit komt onvergelijkbaar met de klantmeting.
 */
export const SIMULATIE_SYSTEM =
  "Je bent een behulpzame AI-assistent (zoals ChatGPT) die vragen van gebruikers beantwoordt. " +
  "Gebruik web search om actuele, feitelijke informatie te vinden. Noem concrete bedrijven of " +
  "bronnen waar dat relevant is voor het antwoord. Antwoord in het Nederlands, zoals je dat voor " +
  "een echte gebruiker zou doen die deze vraag stelt.";

/** Wat het beoordelende model te horen krijgt. Kort, want de opdracht is smal. */
export const BEOORDEEL_SYSTEM =
  "Je leest een AI-antwoord en somt op welke bedrijven erin genoemd worden. Werk secuur en " +
  "feitelijk: je baseert je uitsluitend op wat er in de tekst staat. Je voegt nooit een bedrijf " +
  "toe dat er niet in staat, ook niet als je het kent.";

/** De beoordelingsvraag. Apart, zodat `scripts/test-unit.ts` hem kan nalezen. */
export function bouwBeoordeelVraag(vraag: string, antwoord: string): string {
  return [
    `De gestelde vraag: ${vraag}`,
    "",
    "Het antwoord:",
    antwoord,
    "",
    "Som op welke bedrijven in dit antwoord genoemd worden, in de volgorde waarin ze voorkomen.",
    "Per bedrijf:",
    "- de naam precies zoals hij in de tekst staat",
    "- het webadres als de tekst er een noemt, anders leeg",
    "- de hoeveelste genoemde partij het is, 1 is de eerste",
    "- hoe prominent het staat: eerste_aanbeveling, een_van_meerdere of zijdelings",
    "- het stukje tekst waarin het bedrijf voorkomt, hooguit twee zinnen",
    "",
    "Noem alleen bedrijven die er echt staan. Voeg nooit een bedrijf toe dat je zelf kent maar dat " +
      "niet in de tekst voorkomt.",
    "Vergelijkingssites, brancheverenigingen en overheidsinstanties zijn geen bedrijven in deze " +
      "zin: die horen bij de bronnen.",
    "",
    "Geef daarnaast de brondomeinen die het antwoord aanhaalt, bijvoorbeeld funda.nl.",
  ].join("\n");
}
