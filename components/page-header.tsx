/**
 * De kop van een pagina, één vorm. Gebruikt op 34 schermen, dus is dit de
 * hoogste hefboom van stap 10: één wijziging hier verandert bijna de hele app.
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
 *
 * ── DE TITEL IS SINDS STAP 10 30PX EN GEEN 24 ───────────────────────────────
 *
 * GEMETEN bij OKX (`redesign2026.md` §8.9): een paginakop is `heading-lg`, een
 * eigen, grotere trede dan een kop binnen een dialoog of een kaart
 * (`.type-title`, heading-md, 24px). Tot stap 10 gebruikte deze kop nog
 * `.type-title`, dezelfde maat als een dialoogkop: dat is precies het soort
 * verschil dat een app "plat" laat voelen in plaats van een duidelijke
 * hiërarchie te tonen. `.type-heading-lg` bestaat al sinds stap 8 (de
 * inlogroute); dit is de tweede aanroeper.
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
          <h1 className="type-heading-lg mt-1">{title}</h1>
          {description && (
            <p className="type-compact mt-1 max-w-[40rem] text-[var(--text-tertiary)]">{description}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}
