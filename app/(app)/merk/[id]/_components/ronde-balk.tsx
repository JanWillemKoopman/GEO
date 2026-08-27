import { Icon } from "@/components/icon";
import type { RondeFase } from "@/lib/ronde";

/**
 * De ronde, bovenaan het overzicht.
 *
 * ── WAAROM DIT HET EERSTE BLOK VAN DE APP IS ────────────────────────────────
 *
 * Dit is het antwoord op "hoe werkt dit product". Het stond nergens. De klant
 * kreeg vier menugroepen die opslagplaatsen zijn (Overzicht, Strategie,
 * Analytics, Merkprofiel) en moest zelf bedenken dat die samen één maandelijkse
 * ronde vormen. Wie dat zelf moet tekenen, tekent het niet.
 *
 * ── WAAROM ZES BLOKJES EN GEEN VOORTGANGSBALK ───────────────────────────────
 *
 * Een balk die vult, suggereert een einde. Dit heeft geen einde: na hermeten
 * begint de volgende meting. Zes stappen naast elkaar, met de stand eronder,
 * zeggen wél waar je staat en niet dat je er bijna bent.
 *
 * ⚠️ Het getal onder elke stap is de stand van nu en geen doel. Er staat dus
 * "3 teksten", nooit "3 van de 10": een doel dat de klant niet zelf gesteld
 * heeft, is een verwijt zodra hij het niet haalt.
 */
export function RondeBalk({ fases, zin }: { fases: RondeFase[]; zin: string }) {
  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="mono-label">Zo werkt je maand</span>
        <span className="text-sm text-muted">
          Elke stap voedt de volgende. Na de laatste begint de eerste opnieuw.
        </span>
      </div>

      <ol className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
        {fases.map((fase) => (
          <li key={fase.id} className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-1.5">
              {/* De tekening draagt de stand: gezet, aan de beurt, of nog niet
                  aan de orde. De kleur zit op de ouder, want een icoon erft
                  altijd `currentColor` (`docs/designsystem.md` §6b.2). */}
              <span
                className="flex shrink-0"
                style={{
                  color: fase.klaar
                    ? "var(--intent-growth-text)"
                    : fase.actief
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                }}
              >
                <Icon naam={fase.klaar ? "klaar" : fase.actief ? "loopt" : "open"} size={15} />
              </span>
              <span
                className={`min-w-0 truncate text-sm ${
                  fase.actief ? "font-semibold" : fase.klaar ? "font-medium" : "text-muted"
                }`}
              >
                {fase.label}
              </span>
            </span>

            <span className="mono-label truncate" title={fase.wat}>
              {fase.stand}
            </span>

            {/* ⚠️ Alleen op de twee stappen die op de klant wachten. Dit is de
                enige plek in de app waar de arbeidsverdeling in één oogopslag
                staat: vier stappen doet ORBIT ENGINE, twee doet hij zelf. */}
            {fase.vanJou && <span className="chip chip-neutral w-fit">jij</span>}
          </li>
        ))}
      </ol>

      <p className="border-t border-[var(--border-subtle)] pt-3 text-sm text-secondary">{zin}</p>
    </div>
  );
}
