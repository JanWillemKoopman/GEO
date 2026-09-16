"use client";

import { useState } from "react";
import { ProfileReadinessPanel } from "./profile-readiness-panel";
import { RerunResearchButton } from "./rerun-research-button";

/**
 * De statuskaart per merk plus de knop om opnieuw te onderzoeken, samen op één
 * plek (blok B punt 9 en 12, `docs/tasks/nova-vergelijking-verbeterpunten.md`).
 *
 * Beide bestonden al: `ProfileReadinessPanel` (Nova's `brand.card`, vijf
 * toestanden via `assessReadiness()`) stond tot nu toe alleen in de
 * onboardingsessie, en `RerunResearchButton` wist niet dat er een statuskaart
 * naast hem stond. Dit bestand voegt alleen de schakel toe die ze nodig hadden
 * om samen op het merkdossier te staan: `ronde` als `key` dwingt
 * `ProfileReadinessPanel` te hermonteren zodra een nieuw onderzoek start, want
 * die stopt met pollen zodra hij één keer "niets meer te doen" zag en zou
 * anders een tweede ronde niet opmerken.
 */
export function DossierStatus({
  profileId,
  brandName,
}: {
  profileId: string;
  brandName: string;
}) {
  const [ronde, setRonde] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <ProfileReadinessPanel key={ronde} profileId={profileId} brandName={brandName} />
      <RerunResearchButton profileId={profileId} onStarted={() => setRonde((r) => r + 1)} />
    </div>
  );
}
