/**
 * De kop boven een sectie op een scherm.
 *
 * ── ⚠️ WAAROM DIT BESTAAT (25 AUGUSTUS 2026) ────────────────────────────────
 *
 * Op de startpagina deed `mono-label` zeven verschillende taken tegelijk:
 * paginakop ("OVERZICHT"), sectiekop ("WAAR BEGIN JE"), kaartlabel
 * ("ZICHTBAARHEID IN AI"), metadata onder een titel
 * ("HTTPS://GASSERVICE-BRABANT.NL · CV-KETEL ONDERHOUD"), teller ("0 VAN DE 28
 * GEPLAATST"), legenda, en de doorkliklink onderaan een lijst. Een sectiekop en
 * een regel metadata ín een kaart waren typografisch niet te onderscheiden.
 *
 * Daardoor las het scherm als een rij losse blokken zonder skelet: nergens was
 * zichtbaar waar een hoofdstuk begon. Dat is de goedkoopste oorzaak van "het
 * voelt rommelig" die er is.
 *
 * Deze kop is `type-section` in de leeskleur en in gewone zinsvorm. Het
 * mono-hoofdletterlabel houdt één taak over: metadata en labels bínnen een
 * kaart.
 *
 * ── ⚠️ EEN ECHTE KOP, GEEN OPGEMAAKTE SPAN ──────────────────────────────────
 *
 * Het was een `<span>`. Daarmee had de startpagina precies één kop (`h1`) en
 * daaronder acht naamloze blokken, dus wie met een schermlezer door de koppen
 * springt, sprong van de merknaam meteen naar het einde van de pagina. Nu is
 * elke sectie een `h2`.
 *
 * Servercomponent: er valt niets te klikken behalve wat de aanroeper in
 * `action` meegeeft.
 */
export function SectionHeading({
  title,
  meta,
  action,
  id,
}: {
  title: string;
  /** Korte terzijde rechts van de kop: een teller, een datum, een aantal. */
  meta?: string;
  /** Eén link of knop, uiterst rechts. Geen tweede primaire actie. */
  action?: React.ReactNode;
  /** Voor `aria-labelledby` als de sectie er een nodig heeft. */
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id={id} className="type-section">
        {title}
      </h2>
      {meta && !action && <span className="mono-label">{meta}</span>}
      {action}
    </div>
  );
}
