"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Notificatie } from "@/lib/notificaties";

/**
 * De gedeelde stand van de notificaties: welke er zijn, hoeveel ongelezen, en
 * of de lijst rechts open staat.
 *
 * Een eigen bestand omdat drie onderdelen hem nodig hebben die elkaar verder
 * niet kennen: het belletje in de bovenbalk (teller, openen), de kleine melding
 * rechtsonder ("Bekijk alle notificaties") en de lijst zelf
 * (`components/notificaties.tsx`). Zonder deze laag zou `toast.tsx` de lijst
 * moeten importeren en de lijst `toast.tsx`, en dan hangen ze in een kring.
 */

interface PaneelStand {
  open: boolean;
  openen: () => void;
  sluiten: () => void;
  meldingen: Notificatie[];
  ongelezen: number;
  /** Tot wanneer alles gezien was vóór de lijst deze keer openging: wat
   *  daarna kwam krijgt in de lijst een stip. */
  gezienTot: string | null;
  zetStand: (s: { meldingen: Notificatie[]; ongelezen: number; gezienTot: string | null }) => void;
}

const PaneelContext = createContext<PaneelStand | null>(null);

export function NotificatiePaneelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ meldingen: Notificatie[]; ongelezen: number; gezienTot: string | null }>({
    meldingen: [],
    ongelezen: 0,
    gezienTot: null,
  });

  const openen = useCallback(() => setOpen(true), []);
  const sluiten = useCallback(() => setOpen(false), []);

  const waarde = useMemo<PaneelStand>(
    () => ({ open, openen, sluiten, ...data, zetStand: setData }),
    [open, openen, sluiten, data],
  );

  return <PaneelContext.Provider value={waarde}>{children}</PaneelContext.Provider>;
}

/**
 * Geeft een stand zonder meldingen terug als er geen provider boven zit. Zelfde
 * afspraak als `useToast`: een onderdeel dat de lijst wil openen mag daar nooit
 * op crashen, en in tests staat de provider er niet.
 */
export function useNotificatiePaneel(): PaneelStand {
  return useContext(PaneelContext) ?? LEEG;
}

const LEEG: PaneelStand = {
  open: false,
  openen: () => {},
  sluiten: () => {},
  meldingen: [],
  ongelezen: 0,
  gezienTot: null,
  zetStand: () => {},
};
