"use client";

import { MAX_CONTEXT_TEKENS } from "@/lib/solliciteren/prompt";

/**
 * De drie bronteksten, en de knop die ze aan het gesprek koppelt.
 *
 * ── WAAROM KOPPELEN EEN EIGEN HANDELING IS ─────────────────────────────────
 *
 * De teksten gaan bij ELK bericht opnieuw mee de aanroep in. Zou het vak bij
 * elke toetsaanslag opslaan, dan zou half geplakte tekst meteen meetellen in het
 * volgende antwoord. Vandaar één knop, één moment, en een regel eronder die
 * zegt of wat er nu in de vakken staat hetzelfde is als wat de assistent kent.
 */
export function Contextpaneel({
  cv,
  brieven,
  vacature,
  gewijzigd,
  gekoppeldOp,
  bezig,
  onWijzig,
  onKoppel,
}: {
  cv: string;
  brieven: string;
  vacature: string;
  /** Staat er iets in de vakken dat de assistent nog niet kent? */
  gewijzigd: boolean;
  gekoppeldOp: string | null;
  bezig: boolean;
  onWijzig: (veld: "cv" | "brieven" | "vacature", waarde: string) => void;
  onKoppel: () => void;
}) {
  const velden = [
    {
      sleutel: "cv" as const,
      label: "Huidig CV",
      uitleg: "Plak hem als platte tekst. Opleiding, werk, resultaten.",
      waarde: cv,
      regels: 10,
    },
    {
      sleutel: "brieven" as const,
      label: "Eerdere brieven en achtergrond",
      uitleg: "Waar de assistent je eigen woorden en toon uit haalt.",
      waarde: brieven,
      regels: 7,
    },
    {
      sleutel: "vacature" as const,
      label: "Vacaturetekst",
      uitleg: "De volledige tekst, inclusief de eisen.",
      waarde: vacature,
      regels: 10,
    },
  ];

  return (
    <section className="sol-kaart sol-paneel">
      <h2 className="sol-kaart__titel">Bronmateriaal</h2>
      <p className="sol-kaart__tekst sol-kaart__tekst--klein">
        Alles wat de assistent schrijft komt hiervandaan. Staat er iets niet in, dan laat hij een
        gat open in plaats van iets te verzinnen.
      </p>

      {velden.map((veld) => (
        <div className="sol-veld" key={veld.sleutel}>
          <label className="sol-veld__label" htmlFor={`sol-${veld.sleutel}`}>
            {veld.label}
          </label>
          <p className="sol-veld__uitleg">{veld.uitleg}</p>
          <textarea
            id={`sol-${veld.sleutel}`}
            className="sol-invoer sol-invoer--tekstvak"
            rows={veld.regels}
            value={veld.waarde}
            maxLength={MAX_CONTEXT_TEKENS}
            onChange={(e) => onWijzig(veld.sleutel, e.target.value)}
            placeholder="Plak hier je tekst"
          />
          <p className="sol-veld__teller">
            {veld.waarde.length === 0
              ? "nog leeg"
              : `${veld.waarde.length.toLocaleString("nl-NL")} tekens`}
          </p>
        </div>
      ))}

      <div className="sol-paneel__voet">
        <button
          type="button"
          className="sol-knop"
          onClick={onKoppel}
          disabled={bezig || !gewijzigd}
        >
          {bezig ? "Bezig met koppelen" : "Koppel aan dit gesprek"}
        </button>
        <p className="sol-veld__teller">
          {gewijzigd
            ? "De assistent kent deze versie nog niet."
            : gekoppeldOp
              ? `Gekoppeld op ${new Date(gekoppeldOp).toLocaleString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}.`
              : "Nog niets gekoppeld."}
        </p>
      </div>
    </section>
  );
}
