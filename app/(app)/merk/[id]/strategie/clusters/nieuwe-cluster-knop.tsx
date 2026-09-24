"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog, DialogKnoppen } from "@/components/dialog";
import { COST_DENIED } from "@/lib/cost-rules";

/**
 * De knop "Nieuw cluster" rechtsboven op het clustersscherm.
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
        Nieuw cluster
      </Link>
    );
  }

  return (
    <>
      {/* Voor de klant een rustige knop die zegt wat hij doet (UX-audit 23
          september 2026, P1.3). Hij was de accentknop "Nieuwe cluster", en die
          beloofde een cluster dat de klant niet zelf mag starten: pas na de
          klik hoorde hij dat de consultant dat doet. */}
      <button type="button" className="btn-outline" onClick={() => setOpen(true)}>
        Nieuw cluster aanvragen
      </button>
      {open && (
        <Dialog label="Een nieuw cluster aanvragen" onSluit={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <h2 className="type-title">Een nieuw cluster aanvragen</h2>
            {/* De melding van de kostenpoort zelf, zodat de klant hier precies
                leest wat hij bij een geweigerde aanvraag ook zou lezen. */}
            <p className="text-secondary">{COST_DENIED.analyse_starten}</p>
            <DialogKnoppen>
              <button type="button" className="btn-outline" onClick={() => setOpen(false)}>
                Sluiten
              </button>
            </DialogKnoppen>
          </div>
        </Dialog>
      )}
    </>
  );
}
