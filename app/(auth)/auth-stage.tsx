/**
 * De ondergrond achter de inlogschermen: één rustig vlak.
 *
 * ── WAAROM HIER GEEN DECOR MEER STAAT ───────────────────────────────────────
 *
 * Tot 24 augustus 2026 stond hier een hemel met twee banen, drie planeten en
 * wat stof. Die is er op verzoek van de eigenaar uit: het inlogscherm is nu
 * één gecentreerde kaart, en alles wat daarnaast beweegt of gloeit trekt het
 * oog weg van het enige wat hier gebeuren moet. Het merk zit in de kaart, in
 * het logo en in de knopkleur, niet in de achtergrond.
 *
 * De vorm zit in `app/globals.css` onder "HET INLOGTONEEL", met dezelfde
 * afspraak erbij: alles begint met `.auth-` en niets ervan reist mee naar een
 * dashboardscherm.
 */
export function AuthStage() {
  return <div aria-hidden="true" className="auth-stage" />;
}
