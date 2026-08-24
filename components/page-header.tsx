/**
 * De kop van een pagina, één vorm.
 *
 * Er waren er vier: twee lijstpagina's met een mono-eyebrow boven een `text-3xl`
 * kop die op beide "Overzicht" zei, een instellingenpagina met een `mt-3` die
 * een terug-link compenseerde die daar niet stond, en een analysekop op
 * `text-2xl`.
 *
 * Dat soort verschillen ziet niemand bewust, maar bij elkaar zijn ze precies
 * waarom een app "rommelig" voelt zonder dat je kunt aanwijzen waarom.
 *
 * ⚠️ **Zonder terug-link** (24 augustus 2026). Die stond er eerst bij, met een
 * pijltje en een sectienaam, op vrijwel elke pagina. De zijbalk wijst al naar
 * dezelfde bestemming, dus het was een tweede weg terug voor iets wat de balk
 * al deed.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && <span className="mono-label">{eyebrow}</span>}
          <h1 className="type-title mt-1">{title}</h1>
          {description && <p className="mt-2 max-w-xl text-secondary">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
