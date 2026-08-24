/**
 * Het decor achter de inlogschermen: een verlopende hemel, twee banen, drie
 * planeten en wat stof.
 *
 * ── WAAROM DIT HIER MAG EN NERGENS ANDERS ───────────────────────────────────
 *
 * `docs/designsystem.md` §9b beschrijft de spanning tussen het vlakke
 * dashboardsysteem en de merkstrategie. Dit scherm is de plek waar die
 * spanning naar de merkkant valt: het is het eerste beeld dat een klant ziet
 * en niemand zit er een uur in. De vorm zit in `app/globals.css` onder "HET
 * INLOGTONEEL", met dezelfde afspraak erbij: alles begint met `.auth-` en
 * niets ervan reist mee naar een dashboardscherm.
 *
 * Bewust zonder beweging. Een draaiende baan achter een wachtwoordveld trekt
 * het oog weg van het enige wat hier gebeuren moet, en `prefers-reduced-motion`
 * hoeft dan ook niets uit te zetten.
 */
export function AuthBackground() {
  return (
    <div aria-hidden="true" className="auth-sky">
      <div className="auth-orbit-line auth-orbit-line-outer" />
      <div className="auth-orbit-line auth-orbit-line-inner" />

      <div className="auth-planet auth-planet-green" />
      <div className="auth-planet auth-planet-white" />
      <div className="auth-planet auth-planet-purple" />

      {/* Vier stofpunten, twee links en twee rechts, zodat het beeld niet naar
          één kant kantelt. Op een telefoon vallen ze weg: daar is de ruimte
          naast de kaart te smal om er iets in te zetten. */}
      <span
        className="auth-dust hidden w-[7px] sm:block"
        style={{ top: "37%", left: "9%", backgroundColor: "#37941c", opacity: 0.5 }}
      />
      <span
        className="auth-dust hidden w-[6px] sm:block"
        style={{ top: "56%", left: "8.8%", backgroundColor: "#8511d9", opacity: 0.4 }}
      />
      <span
        className="auth-dust hidden w-[6px] sm:block"
        style={{ top: "47%", right: "8.5%", backgroundColor: "#8511d9", opacity: 0.4 }}
      />
      <span
        className="auth-dust hidden w-[5px] sm:block"
        style={{ top: "62%", right: "4.8%", backgroundColor: "#8511d9", opacity: 0.3 }}
      />
    </div>
  );
}
