"use client";

import { useState } from "react";
import Link from "next/link";
import { KLANT_ZONDER_CLUSTERS } from "@/lib/cluster-start";

/**
 * De knop "Nieuwe cluster" rechtsboven op het clustersscherm.
 *
 * ── WAAROM DIT EEN CLIENT COMPONENT IS EN GEEN LINK MET EEN `staff`-CHECK ────
 *
 * Vastgesteld 21 september 2026: de knop moet voor iedereen zichtbaar zijn,
 * niet alleen voor de consultant. Het echte slot blijft ongewijzigd op de
 * server staan (`analyse_starten` in `STAFF_ONLY_ACTIONS`,
 * `lib/cost-rules.ts`): een cluster starten kost geld en blijft beheerderswerk.
 *
 * Zonder deze component zou "zichtbaar voor iedereen" betekenen dat een klant
 * naar `/analyses/new` linkt, waar hij op een 404 landt of (mocht die route
 * ooit zijn 404 verliezen) op een knop die na de klik alsnog afwijst. Dat is
 * letterlijk de bug die op 16 september 2026 al is gerepareerd
 * (`app/(app)/analyses/new/page.tsx`). Een klant krijgt hier dus dezelfde
 * knop te zien, maar een klik opent de uitleg die ook op het lege
 * clusterscherm staat (`KLANT_ZONDER_CLUSTERS`) in plaats van te navigeren.
 */
export function NieuweClusterKnop({ merkId, staff }: { merkId: string; staff: boolean }) {
  const [open, setOpen] = useState(false);

  if (staff) {
    return (
      <Link href={`/analyses/new?merk=${merkId}`} className="btn-actie">
        Nieuwe cluster
      </Link>
    );
  }

  return (
    <>
      <button type="button" className="btn-actie" onClick={() => setOpen(true)}>
        Nieuwe cluster
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="modal-overlay absolute inset-0"
            aria-label="Sluiten"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={KLANT_ZONDER_CLUSTERS.titel}
            className="modal-panel relative w-full max-w-md"
          >
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-medium">{KLANT_ZONDER_CLUSTERS.titel}</h2>
              <p className="text-secondary">{KLANT_ZONDER_CLUSTERS.uitleg}</p>
              <div className="flex justify-end pt-1">
                <button type="button" className="btn-outline" onClick={() => setOpen(false)}>
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
