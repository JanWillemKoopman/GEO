import { Icon } from "@/components/icon";
import { FASEN, type PaginaStand } from "@/lib/pagina-stand";

/**
 * De standbalk: vijf stappen, niet acht (`docs/tasks/contentflow-een-lijn.md` §4.6).
 *
 * Acht standen als bolletjes is op een telefoon een rij stippen die niemand
 * leest. Vijf woorden die de klant zelf gebruikt (Vragen, Schrijven,
 * Goedkeuren, Live, Effect) passen op 390 pixels breed en zeggen genoeg; de
 * precieze stand staat in de zin eronder.
 *
 * Status is kleur plus vorm (`docs/designsystem.md` §11 regel 4): een afgeronde
 * stap krijgt een vinkje, de huidige een gevulde stip, een latere een lege.
 */
export function Standbalk({ stand }: { stand: PaginaStand }) {
  if (stand.fase === null) return null;
  const huidig = stand.fase;
  const klaar = stand.sleutel === "effect_bekend";

  return (
    <ol className="standbalk" aria-label="Waar deze pagina staat">
      {FASEN.map((fase, i) => {
        const gedaan = i < huidig || (klaar && i === huidig);
        const nu = i === huidig && !klaar;
        return (
          <li
            key={fase}
            className="standbalk-stap"
            data-stand={gedaan ? "gedaan" : nu ? "nu" : "later"}
            aria-current={nu ? "step" : undefined}
          >
            <span className="standbalk-punt" aria-hidden>
              {gedaan ? <Icon naam="klaar" size={12} /> : null}
            </span>
            <span className="standbalk-label">{fase}</span>
          </li>
        );
      })}
    </ol>
  );
}
