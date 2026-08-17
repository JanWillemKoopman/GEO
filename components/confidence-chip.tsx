import { confidenceLevel } from "@/lib/pipeline/field-merge";

/**
 * Zekerheid als kleur, niet als kommagetal (docs/tasks/onboarding-2.0.md §8).
 *
 * "0.62" zegt niemand iets. Drie niveaus met een label wél, en het label staat
 * er altijd bij, want kleur mag nooit het enige signaal zijn (designsystem.md
 * §C, principe 5).
 *
 * `zeker` toont NIETS. Een profiel waarin naast elk veld een groen vinkje staat,
 * leest als een formulier dat gecontroleerd moet worden; de bedoeling is juist
 * dat alleen het twijfelgeval opvalt.
 */
export function ConfidenceChip({
  confidence,
}: {
  confidence: number | null | undefined;
}) {
  const level = confidenceLevel(confidence);
  if (level === "zeker") return null;

  return level === "onzeker" ? (
    <span
      className="chip chip-warning"
      title="ORBIT ENGINE heeft dit afgeleid, niet hard gevonden."
    >
      onzeker
    </span>
  ) : (
    <span
      className="chip chip-neutral"
      title="Hierover kreeg ORBIT ENGINE geen uitsluitsel."
    >
      niet vastgesteld
    </span>
  );
}
