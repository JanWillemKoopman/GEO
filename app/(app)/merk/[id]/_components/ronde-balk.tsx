import { Icon } from "@/components/icon";
import type { RondeMaand } from "@/lib/ronde";

/**
 * "Je september": de maand, bovenaan het overzicht.
 *
 * ── WAAROM DIT HET EERSTE BLOK VAN DE APP IS ────────────────────────────────
 *
 * Het beantwoordt "wat is er deze maand gedaan, en wat moet er nog gebeuren",
 * in de volgorde van het product zelf. Het menu zegt dat niet: dat zijn vier
 * laden (Overzicht, Strategie, Analytics, Merkprofiel) die de klant zelf tot
 * één maandelijkse ronde zou moeten optellen.
 *
 * ── WAT ER OP 23 SEPTEMBER 2026 VERANDERDE ─────────────────────────────────
 *
 * De kop was "Zo werkt je maand", met een vaste zin die op elk bezoek hetzelfde
 * zei, en zes stappen die de hele looptijd telden. Nu staat de maand in de
 * kop, telt elke stap alleen deze maand (`lib/ronde.ts`), en zegt de regel
 * rechtsboven wanneer er iets nieuws komt.
 *
 * Bewust weggelaten:
 *
 *   • Geen knoppen en geen klikbare stappen. Direct hieronder staat "Wat er op
 *     je wacht", en bovenin "openstaande vragen". Een knop hier zou de derde
 *     plek zijn die zegt wat je moet doen. Dit blok zegt waar je staat.
 *   • Geen balk die vult. Een vullende balk belooft een einde, en na hermeten
 *     begint de volgende maand.
 *   • "jij" alleen bij de stap die nu aan de beurt is. Het stond ook bij stappen
 *     die al klaar waren, en dan zag de klant twee keer "jij" zonder te weten
 *     welke telde.
 */
export function RondeBalk({ ronde }: { ronde: RondeMaand }) {
  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="type-section">Je {ronde.maand}</h2>
          {ronde.periode && <span className="text-sm text-muted">{ronde.periode}</span>}
        </span>
        <span className="text-sm text-muted">{ronde.volgende}</span>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ronde.fases.map((fase) => (
          <li
            key={fase.id}
            aria-current={fase.actief ? "step" : undefined}
            className="flex min-w-0 flex-col gap-1 rounded-[var(--radius-lg)] px-3 py-2.5"
            style={{
              // ⚠️ De stap van nu krijgt een eigen vlak. Een ander icoontje en
              // iets dikkere letters (tot 23 september 2026) vielen tussen vijf
              // andere stappen niet op.
              background: fase.actief ? "var(--interactive-hover)" : undefined,
            }}
          >
            <span className="flex items-center gap-1.5">
              {/* De kleur zit op de ouder, want een icoon erft `currentColor`
                  (`docs/designsystem.md` §6b.2). Een afgeronde stap krijgt een
                  rondje in de groene oppervlaktetint, zodat "gedaan" het eerste
                  is wat de rij laat zien. */}
              <span
                className="flex shrink-0 items-center justify-center rounded-[var(--radius-pill)]"
                style={{
                  width: fase.klaar ? 18 : undefined,
                  height: fase.klaar ? 18 : undefined,
                  background: fase.klaar ? "var(--trend-up-surface)" : undefined,
                  color: fase.klaar
                    ? "var(--trend-up-text)"
                    : fase.actief
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                }}
              >
                <Icon
                  naam={fase.klaar ? "klaar" : fase.actief ? "loopt" : "open"}
                  size={fase.klaar ? 13 : 15}
                />
              </span>
              <span
                className={`min-w-0 truncate text-sm ${
                  fase.klaar || fase.actief ? "font-medium" : "text-muted"
                }`}
              >
                {fase.label}
              </span>
            </span>

            <span className="mono-label truncate">{fase.stand}</span>
            {fase.detail && <span className="text-sm text-muted">{fase.detail}</span>}

            {fase.actief && (
              <span className="chip chip-attention mt-1 w-fit">
                {fase.aanZet === "jij"
                  ? "jij, nu"
                  : fase.aanZet === "consultant"
                    ? "je consultant, nu"
                    : "ORBIT ENGINE, nu"}
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-1 border-t border-[var(--border-subtle)] pt-3">
        <p className="text-sm text-secondary">{ronde.zin}</p>
        {ronde.vorigeMaand && <p className="text-sm text-muted">{ronde.vorigeMaand}</p>}
      </div>
    </div>
  );
}
