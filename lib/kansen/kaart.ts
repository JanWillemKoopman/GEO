/**
 * WAT DE CONSULTANT OP DE KAART IN HET PLAN ZIET (V8 punt 2, V19 punt 2 en
 * V20 punt 2 van `docs/tasks/pijplijnanalyse-contentketen.md`, besluit B-j).
 *
 * Tot 29 september 2026 stond hier het kennisgat ("Nog niet bekend: prijs,
 * werkwijze en voorbeeld"). Dat lijstje was in ronde 1 bij bijna elke kaart
 * hetzelfde en hielp niemand kiezen. Nu drie signalen die wél iets zeggen:
 *
 *   - voorrang van de klant: een dienst die de klant in het gesprek voorrang
 *     gaf, staat letterlijk in de kans (`kansen.commerciele_waarde`, B32). Een
 *     hulp bij het opstellen van het plan, geen automatische rangorde;
 *   - rust op één meetvraag: een dunne kans, die de consultant bewust kiest;
 *   - de kernvraag: beantwoord, nog open of overgeslagen. Overgeslagen houdt
 *     niets tegen (B5), maar de consultant kan de kaart wisselen of de klant
 *     nog even bellen.
 *
 * Puur, zonder `server-only` (conventie 2).
 */

export type KernStand = "beantwoord" | "open" | "overgeslagen";

export interface KaartInvoer {
  commercieleWaarde: string | null;
  /** Rust de kans op precies één meetvraag? (`rustOpEenVraag()`) */
  eenVraag: boolean;
  /** De stand van de kernvraag van de pagina, of `null` als er (nog) geen is. */
  kern: KernStand | null;
}

/** De zin op de kaart, of `null` als er niets te melden is. */
export function kaartZin(k: KaartInvoer): string | null {
  const delen: string[] = [];
  if (k.commercieleWaarde === "voorrang") delen.push("Voorrang van de klant.");
  if (k.eenVraag) delen.push("Rust op één meetvraag.");
  if (k.kern === "overgeslagen") delen.push("Kernvraag niet beantwoord.");
  else if (k.kern === "open") delen.push("Kernvraag wacht op antwoord.");
  else if (k.kern === "beantwoord") delen.push("Kernvraag beantwoord.");
  return delen.length > 0 ? delen.join(" ") : null;
}
