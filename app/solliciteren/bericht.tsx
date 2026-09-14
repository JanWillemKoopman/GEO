"use client";

import { useMemo, useState } from "react";
import { zoekCliches } from "@/lib/solliciteren/cliches";
import { splitsAntwoord } from "@/lib/solliciteren/feiten";
import { zoekOnvindbaar } from "@/lib/solliciteren/herkomst";
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
 * (`lib/solliciteren/stem.ts`). En de herkomstcontrole
 * (`lib/solliciteren/herkomst.ts`) zoekt elk getal en elke naam uit de brief op
 * in je dossier en de vacature.
 *
 * ── ALLE DRIE WIJZEN AAN EN VERANDEREN NIETS ───────────────────────────────
 *
 * Tot 15 september 2026 stond de feitenkaart als GESLOTEN lijst in de prompt:
 * wat er niet op stond mocht de brief niet beweren. Dat is teruggedraaid, want
 * het kostte de schrijver meer dan het opleverde. De controle is verhuisd naar
 * hier, ná het schrijven, waar hij aanwijst zonder iets te verbieden. Of een
 * langere zin hier juist goed valt, of "met veel enthousiasme" in jouw brief
 * waar is, of dat getal klopt: dat bepaal jij, en jij leest de brief toch.
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
  bronnen,
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
  /** Je dossier plus de vacature, als één tekst: waar getallen en namen in opgezocht worden. */
  bronnen: string;
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
  // De controles horen over de BRIEF te gaan en niet over de analyse erboven:
  // een opsomming van vacature-eisen heeft nu eenmaal andere zinnen dan een
  // brief, en de eisen uit de vacature citeren is geen verzinsel.
  const brief = useMemo(() => splitsAntwoord(inhoud).brief, [inhoud]);
  const onvindbaar = useMemo(
    () => (rol === "assistent" && !bezig ? zoekOnvindbaar(brief || inhoud, bronnen) : []),
    [rol, brief, inhoud, bronnen, bezig],
  );

  async function kopieer() {
    try {
      // Alleen de brief als het antwoord er een heeft: dat is wat je plakt.
      await navigator.clipboard.writeText(brief || inhoud);
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
          {bronnen.trim() ? (
            onvindbaar.length === 0 ? (
              <span className="sol-bericht__meta sol-bericht__meta--goed">
                Alle getallen en namen staan in je materiaal
              </span>
            ) : (
              <span className="sol-bericht__meta sol-bericht__meta--fout">
                {onvindbaar.length === 1
                  ? "1 getal of naam om na te kijken"
                  : `${onvindbaar.length} getallen of namen om na te kijken`}
              </span>
            )
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

      {onvindbaar.length > 0 ? (
        <ul className="sol-cliches sol-cliches--fout">
          {onvindbaar.map((vondst) => (
            <li key={`${vondst.soort}-${vondst.waarde}`}>
              <strong>{vondst.waarde}</strong> staat niet in je dossier of de vacature. Klopt dit?
            </li>
          ))}
          <li className="sol-cliches__voetnoot">
            Deze controle zoekt cijfers en namen op. Een getal dat voluit geschreven staat, zoals
            {" "}
            <q>van negen naar vijf</q>, vindt hij niet.
          </li>
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
