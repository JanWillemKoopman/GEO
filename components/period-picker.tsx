import Link from "next/link";
import type { PeriodOption } from "@/lib/pipeline/periods";

/**
 * Terugkijken naar een eerdere meting.
 *
 * Dit zat verstopt bovenaan het rapport-tabblad en gold alleen daar. Nu staat
 * het bij de kop van hoofdstuk 01 en geldt het voor de hele pagina: score,
 * bewijs en rapport tonen dezelfde periode. De klant wil kunnen zien wat er
 * stond toen hij een beslissing nam, niet twee periodes door elkaar.
 *
 * Verschijnt alleen zodra er iets te kiezen valt: één meting heeft geen kiezer
 * nodig.
 */
export function PeriodPicker({
  analysisId,
  periods,
  selected,
}: {
  analysisId: string;
  periods: PeriodOption[];
  selected: number | null;
}) {
  if (periods.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mono-label">Meting van</span>
      {periods.map((p) => {
        const active = p.weekNo === selected;
        return (
          <Link
            key={p.weekNo}
            href={`/analyses/${analysisId}?periode=${p.weekNo}`}
            aria-current={active ? "true" : undefined}
            className="chip"
            style={
              active
                ? undefined
                : {
                    background: "transparent",
                    color: "var(--text-muted)",
                    borderColor: "var(--border-subtle)",
                  }
            }
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
