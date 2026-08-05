import Link from "next/link";

/**
 * De kop van een pagina, één vorm.
 *
 * Er waren er vier: twee lijstpagina's met een mono-eyebrow boven een `text-3xl`
 * kop die op beide "Overzicht" zei, een instellingenpagina met een `mt-3` die
 * een terug-link compenseerde die daar niet stond, en een analysekop op
 * `text-2xl`. Drie terug-links in drie bewoordingen ("← Mijn analyses",
 * "← Terug naar Mijn analyses", "← Terug naar Klantprofielen").
 *
 * Dat soort verschillen ziet niemand bewust, maar bij elkaar zijn ze precies
 * waarom een app "rommelig" voelt zonder dat je kunt aanwijzen waarom.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  /** De sectienaam zelf, het pijltje en het woord "terug" komen hiervandaan. */
  backLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      {backHref && (
        <Link
          href={backHref}
          className="mono-label mb-3 w-fit transition-colors hover:text-[var(--text-primary)]"
        >
          ← {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && <span className="mono-label">{eyebrow}</span>}
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-2 max-w-xl text-secondary">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
