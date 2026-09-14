"use client";

import { useMemo, useState } from "react";
import { zoekCliches } from "@/lib/solliciteren/cliches";
import {
  controleerAntwoord,
  splitsAntwoord,
  stripVerwijzingen,
  type Feit,
} from "@/lib/solliciteren/feiten";
import { isGeldigModel, vindModel } from "@/lib/solliciteren/modellen";
import { toetsStem, type Stemprofiel } from "@/lib/solliciteren/stem";

/**
 * Eén bericht in het gesprek.
 *
 * ── DE TEKST WORDT NIET OPGEMAAKT ──────────────────────────────────────────
 *
 * Geen markdown-omzetting. Een sollicitatiebrief gaat straks in een tekstvak of
 * een e-mail, en dan is wat hier op het scherm staat precies wat je plakt. Een
 * brief die er hier mooier uitziet dan na het kopiëren, is een brief die je twee
 * keer moet opmaken.
 *
 * ── TWEE VANGNETTEN ONDER ÉÉN ANTWOORD ─────────────────────────────────────
 *
 * Allebei zijn ze conventie 1: een promptinstructie krijgt een controle in
 * code, want een instructie is een verzoek en geen garantie.
 *
 * De cliché-strook telt de standaardzinnen die de prompt bij naam verbiedt
 * (`lib/solliciteren/cliches.ts`). De stemtoets legt de brief naast de maten
 * die aan jouw eigen eerdere brieven zijn gemeten
 * (`lib/solliciteren/stem.ts`): zinslengte, lange zinnen, aanspreekvorm. En de
 * feitencontrole (`lib/solliciteren/feiten.ts`) rekent na of de brief alleen
 * beweert wat op je feitenkaart staat, en of hij doet wat zijn eigen
 * schrijfopdracht beloofde.
 *
 * ── DE NUMMERS STAAN IN DE TEKST EN NIET IN DE KOPIE ───────────────────────
 *
 * De brief draagt zijn verwijzingen ([F12]) omdat dat de enige manier is om per
 * zin te kunnen nakijken waar hij op steunt. In de mail aan de werkgever horen
 * ze niet, dus de kopieerknop haalt ze eruit. Zelfde tekst, één ding minder.
 *
 * Er wordt niets weggehaald en niets herschreven. Of "met veel enthousiasme" in
 * jouw brief een cliché is of gewoon waar, bepaal jij, en of een langere zin
 * hier juist goed valt ook.
 */
export function Bericht({
  rol,
  inhoud,
  model,
  stand,
  kosten,
  fout,
  stem,
  feiten,
  bezig,
}: {
  rol: "gebruiker" | "assistent";
  inhoud: string;
  model: string | null;
  stand: string | null;
  kosten: number | null;
  fout: string | null;
  /** De gemeten stem van deze persoon, of null als er te weinig brieven liggen. */
  stem: Stemprofiel | null;
  /** De feitenkaart waartegen dit antwoord wordt nagerekend. */
  feiten: readonly Feit[];
  /** Staat dit antwoord nog te komen? Dan geen telling, die is dan nog niet af. */
  bezig?: boolean;
}) {
  const [gekopieerd, setGekopieerd] = useState(false);
  const cliches = useMemo(
    () => (rol === "assistent" && !bezig ? zoekCliches(inhoud) : []),
    [rol, inhoud, bezig],
  );
  const woorden = useMemo(
    () => (inhoud.trim() ? inhoud.trim().split(/\s+/).length : 0),
    [inhoud],
  );
  const stemafwijkingen = useMemo(
    () => (rol === "assistent" && !bezig ? toetsStem(splitsAntwoord(inhoud).brief || inhoud, stem) : []),
    [rol, inhoud, stem, bezig],
  );
  const feitcontrole = useMemo(
    () => (rol === "assistent" && !bezig ? controleerAntwoord(inhoud, feiten) : null),
    [rol, inhoud, feiten, bezig],
  );
  // De stemtoets hoort over de BRIEF te gaan en niet over de analyse erboven:
  // een opsomming van vacature-eisen heeft nu eenmaal andere zinnen dan een
  // brief, en die als stijlafwijking aanwijzen zou de meting onbruikbaar maken.
  const brief = useMemo(() => splitsAntwoord(inhoud).brief, [inhoud]);

  async function kopieer() {
    try {
      // Alleen de brief als het antwoord er een heeft, en zonder de nummers:
      // dat is wat je in de mail plakt.
      await navigator.clipboard.writeText(stripVerwijzingen(brief || inhoud));
      setGekopieerd(true);
      window.setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      // Zonder rechten op het klembord (of zonder https) lukt dit niet. Dan is
      // selecteren en zelf kopiëren de uitweg, en een foutmelding daarover
      // helpt niemand verder.
    }
  }

  const modelnaam =
    model && isGeldigModel(model) ? vindModel(model).naam.split(",")[0] : (model ?? null);

  return (
    <article className={`sol-bericht sol-bericht--${rol}`}>
      <header className="sol-bericht__kop">
        <span className="sol-bericht__wie">{rol === "gebruiker" ? "Jij" : "Assistent"}</span>
        {modelnaam ? (
          <span className="sol-bericht__meta">
            {modelnaam}
            {stand ? `, redeneerstand ${stand}` : ""}
            {typeof kosten === "number" && kosten > 0
              ? `, ${(kosten * 100).toFixed(2).replace(".", ",")} dollarcent`
              : ""}
          </span>
        ) : null}
      </header>

      {fout ? (
        <p className="sol-fout">Dit antwoord is niet gelukt. Reden: {fout}</p>
      ) : (
        <div className="sol-bericht__tekst">{inhoud}</div>
      )}

      {rol === "assistent" && !bezig && inhoud ? (
        <footer className="sol-bericht__voet">
          <button type="button" className="sol-knop sol-knop--stil" onClick={kopieer}>
            {gekopieerd ? "Gekopieerd" : brief ? "Kopieer de brief" : "Kopieer"}
          </button>
          <span className="sol-bericht__meta">{woorden} woorden</span>
          {cliches.length === 0 ? (
            <span className="sol-bericht__meta sol-bericht__meta--goed">Geen standaardzinnen</span>
          ) : (
            <span className="sol-bericht__meta sol-bericht__meta--let-op">
              {cliches.length === 1 ? "1 standaardzin" : `${cliches.length} standaardzinnen`}
            </span>
          )}
          {feitcontrole && feiten.length > 0 ? (
            feitcontrole.bevindingen.length === 0 && feitcontrole.gebruikt.length > 0 ? (
              <span className="sol-bericht__meta sol-bericht__meta--goed">
                {feitcontrole.gebruikt.length} feiten, allemaal van je kaart
              </span>
            ) : feitcontrole.bevindingen.some((b) => b.ernst === "blokkerend") ? (
              <span className="sol-bericht__meta sol-bericht__meta--fout">Onbewezen bewering</span>
            ) : null
          ) : null}
          {stem ? (
            stemafwijkingen.length === 0 ? (
              <span className="sol-bericht__meta sol-bericht__meta--goed">Klinkt als jij</span>
            ) : (
              <span className="sol-bericht__meta sol-bericht__meta--let-op">
                {stemafwijkingen.length === 1
                  ? "1 afwijking van je stijl"
                  : `${stemafwijkingen.length} afwijkingen van je stijl`}
              </span>
            )
          ) : null}
        </footer>
      ) : null}

      {feitcontrole && feitcontrole.bevindingen.length > 0 ? (
        <ul className={`sol-cliches${feitcontrole.bevindingen.some((b) => b.ernst === "blokkerend") ? " sol-cliches--fout" : ""}`}>
          {feitcontrole.bevindingen.map((bevinding) => (
            <li key={bevinding.melding}>{bevinding.melding}</li>
          ))}
        </ul>
      ) : null}

      {stemafwijkingen.length > 0 ? (
        <ul className="sol-cliches">
          {stemafwijkingen.map((afwijking) => (
            <li key={afwijking.wat}>
              <strong>{afwijking.wat}</strong>: {afwijking.deze}, jij schrijft {afwijking.jij}.
            </li>
          ))}
        </ul>
      ) : null}

      {cliches.length > 0 ? (
        <ul className="sol-cliches">
          {cliches.slice(0, 4).map((vondst) => (
            <li key={vondst.gevonden}>
              <strong>{vondst.gevonden}</strong>
              {vondst.aantal > 1 ? ` (${vondst.aantal}x)` : ""}: {vondst.waarom}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
