import { REPUTATION_CRITERIA, CRITERION_LABEL } from "@/lib/types/database";
import type { ReputationRank } from "@/lib/types/database";

/**
 * De vier criteria als hoofdbeeld (plan analytics-herontwerp.md, R1).
 *
 * Dit is letterlijk het antwoord op "hoe positioneert AI mij tegenover mijn
 * concurrenten", en het stond weggeklapt achter "Naast je concurrenten
 * gelegd" (`rival-table.tsx`, die de volledige vergelijking blijft tonen op
 * niveau 3). Hier vier assen, elk het eigen criterium: de plaats als getal,
 * de concurrenten als namen eronder op volgorde.
 */
export function ReputationCriteria({ ranks }: { ranks: ReputationRank[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {REPUTATION_CRITERIA.map((criterium) => (
        <CriteriumAs key={criterium} criterium={criterium} ranks={ranks.filter((r) => r.criterion === criterium)} />
      ))}
    </div>
  );
}

function CriteriumAs({
  criterium,
  ranks,
}: {
  criterium: (typeof REPUTATION_CRITERIA)[number];
  ranks: ReputationRank[];
}) {
  // ⚠️ Meerdere antwoorden per criterium zijn normaal (herhaalde vragen voor
  // betrouwbaarheid, net als bij de zwaarste zichtbaarheidsvragen). Eén rij
  // pakken zou de uitkomst laten afhangen van de toevallige volgorde waarin
  // de rijen terugkomen; het gemiddelde is de stabiele plaats, zoals
  // `rival-table.tsx` ook al doet.
  const eigenRijen = ranks.filter((r) => r.is_own_brand && r.position !== null);
  const eigenPlaats =
    eigenRijen.length > 0
      ? Math.round(eigenRijen.reduce((s, r) => s + r.position!, 0) / eigenRijen.length)
      : null;
  const ofParties = eigenRijen.length > 0 ? Math.max(...eigenRijen.map((r) => r.of_parties)) : null;

  const concurrenten = ranks
    .filter((r) => !r.is_own_brand && r.known && r.position !== null)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return (
    <div className="card flex flex-col gap-2">
      <span className="mono-label">{CRITERION_LABEL[criterium]}</span>
      {eigenPlaats !== null && ofParties !== null ? (
        <>
          <span className="stat-value text-3xl">
            {eigenPlaats} <span className="text-lg text-muted">van {ofParties}</span>
          </span>
          {concurrenten.length > 0 && (
            <p className="type-caption text-muted">
              {[...new Set(concurrenten.filter((c) => (c.position ?? 0) < eigenPlaats).map((c) => c.party_name))]
                .slice(0, 3)
                .join(", ") || "Niemand vóór je"}
            </p>
          )}
        </>
      ) : (
        <p className="type-compact text-secondary">hier had ChatGPT geen oordeel over</p>
      )}
    </div>
  );
}
