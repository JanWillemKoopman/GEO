import Link from "next/link";
import { InfoHint } from "@/components/info-hint";
import {
  groupWork,
  workKindIcon,
  WORK_KIND_LABEL,
  WORK_STATE_LABEL,
  type WorkItem,
  type WorkState,
} from "@/lib/work";
import { Icon } from "@/components/icon";

/**
 * De werklijst, één vorm voor al het werk in de app.
 *
 * Voorheen had elk soort werk zijn eigen weergave op zijn eigen scherm: de
 * aanbevelingen in het rapport, de off-site taken eronder, de bibliotheek als
 * vierde tabblad, de feitenvragen op de profielpagina. Dezelfde vraag ("moet ik
 * hier iets?") kreeg vier verschillende antwoordvormen.
 *
 * Hier is het één lijst, gegroepeerd op STAAT en niet op soort. Een klant
 * groepeert niet naar "is dit off-site of on-site". Dat is onze indeling. Hij
 * groepeert naar "moet ik hier iets?".
 */

/** Chip-tint per staat, de klassen uit het design system, geen losse kleuren. */
const STATE_CHIP: Record<WorkState, string> = {
  nu: "chip",
  loopt: "chip chip-neutral",
  wacht: "chip chip-warning",
  klaar: "chip chip-success",
};

/**
 * Eén regel werk.
 *
 * `emphasis` is voor de eerste regel van de lijst: één duidelijke volgende stap,
 * visueel dominant. Twee even zware regels naast elkaar is geen advies maar een
 * keuzemenu, en de volgorde is hier juist het advies.
 */
export function WorkRow({
  item,
  emphasis = false,
  showAnalysis = false,
}: {
  item: WorkItem;
  emphasis?: boolean;
  /** Op het dashboard staat werk van meerdere analyses door elkaar. */
  showAnalysis?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className="group flex gap-3 rounded-[var(--radius-md)] border p-4 transition-all"
      style={{
        borderColor: emphasis ? "var(--intent-intelligence-border)" : "var(--border-subtle)",
        background: "var(--bg-elevated)",
        // Gekleurde gloed i.p.v. Een hardere rand, de InSpace-manier om nadruk
        // te leggen (designsystem.md §A3: "de gloed doet het werk").
      }}
    >
      {/* Dezelfde tekening als op het overzicht (`workKindIcon`): een regel over
          een feitenvraag ziet er in de hele app hetzelfde uit, of hij nu in de
          werklijst van één cluster staat of in de wachtrij op de startpagina.
          In de leeskleur, nooit in de merkkleur. */}
      <span className="pt-0.5 text-secondary">
        <Icon naam={workKindIcon(item.kind)} size={18} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-semibold">{item.title}</span>
          <span className="mono-label shrink-0" style={{ fontSize: "0.62rem" }}>
            {showAnalysis ? item.analysisName : WORK_KIND_LABEL[item.kind]}
          </span>
        </span>

        <span className="text-sm text-secondary">{item.why}</span>

        {(item.meta || item.actionLabel) && (
          <span className="mt-1 flex flex-wrap items-center gap-3">
            {item.actionLabel && (
              <span className="mono-label inline-flex items-center gap-1 transition-colors group-hover:text-[var(--text-primary)]">
                {item.actionLabel}
                <Icon naam="naar" size={12} />
              </span>
            )}
            {item.meta && (
              <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                {item.meta}
              </span>
            )}
          </span>
        )}
      </span>
    </Link>
  );
}

/**
 * De volledige werklijst van één analyse, gegroepeerd op staat.
 *
 * "Klaar" staat er wél bij maar ingeklapt: wat af is hoort niet bovenaan mee te
 * scrollen, maar het moet ook niet lijken alsof het verdwenen is. Dat is
 * precies waar het gevoel "waar is mijn spullen gebleven" vandaan komt.
 */
export function WorkList({ items }: { items: WorkItem[] }) {
  const groups = groupWork(items);

  if (groups.length === 0) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Niets te doen · ORBIT ENGINE draait door</span>
        <p className="text-secondary">
          Er ligt niets op jou te wachten. ORBIT ENGINE meet maandelijks door en laat het weten zodra er
          iets beweegt.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const collapsed = group.state === "klaar";
        const body = (
          <ul className="flex flex-col gap-2">
            {group.items.map((item, i) => (
              <li key={item.id}>
                <WorkRow item={item} emphasis={group.state === "nu" && i === 0} />
              </li>
            ))}
          </ul>
        );

        return (
          <div key={group.state} className="card flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="mono-label flex items-center gap-1.5">
                {group.state === "loopt" && <span className="live-dot" />}
                {WORK_STATE_LABEL[group.state]}
                {group.state === "nu" && (
                  <InfoHint label="Volgorde">
                    Op volgorde van belang. Bovenaan staat wat zonder jou stilligt, daaronder waar
                    het meeste te winnen valt.
                  </InfoHint>
                )}
              </span>
              <span className={STATE_CHIP[group.state]}>{group.items.length}</span>
            </div>

            {collapsed ? (
              <details>
                <summary className="mono-label cursor-pointer transition-colors hover:text-[var(--text-primary)]">
                  Toon wat al afgerond is
                </summary>
                <div className="mt-3">{body}</div>
              </details>
            ) : (
              body
            )}
          </div>
        );
      })}
    </div>
  );
}
