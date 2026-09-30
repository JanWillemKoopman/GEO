"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { useNotificatiePaneel } from "@/components/notificatie-paneel";
import type { NotificatieKleur } from "@/lib/notificaties";

/**
 * Broodroostermeldingen: het kleine blokje rechtsonder.
 *
 * ── WAAROM HET ER IS ────────────────────────────────────────────────────────
 *
 * De app kende tot augustus 2026 maar één manier om iets te melden: een kaart
 * ergens in de pagina. Dat werkt voor een uitslag, niet voor een gebeurtenis.
 * Het merkonderzoek duurt ~7,5 minuut, en juist het moment waarop het klaar is
 * ging ongemarkeerd voorbij.
 *
 * ── DE VORM SINDS 29 SEPTEMBER 2026 ─────────────────────────────────────────
 *
 * Tot die dag stond hier een blok van minstens 451 pixels breed rechtsboven,
 * met een titel én een omschrijving. De eigenaar vond het te groot en te
 * nadrukkelijk. Nu:
 *
 *   - rechtsonder op een breed scherm, onderaan boven de onderbalk op een
 *     telefoon;
 *   - één regel: de titel. Klikbaar als er een pagina is die er meer over zegt;
 *   - daaronder "Bekijk alle notificaties", dat de lijst rechts opent
 *     (`components/notificaties.tsx`);
 *   - drie kleuren, als stip vóór de titel en als streep die leegloopt:
 *     groen gelukt, oranje goed om te weten, rood mis of actie nodig;
 *   - verdwijnt altijd vanzelf. Rood blijft langer staan (8 tegen 4,5
 *     seconden), en met de muis erop staat de klok stil zodat de link te
 *     halen is.
 *
 * `description` bestaat nog in de invoer, want ruim zestig aanroepen geven er
 * een mee, vaak met de reden van een fout van de server. Hij staat niet meer in
 * beeld maar als tekst bij het aanwijzen, en voor een schermlezer.
 *
 * Bewust met de hand geschreven en niet Radix erbij: dit is één overlay van
 * ongeveer 150 regels.
 */

/**
 * Vier namen voor drie kleuren. "info" en "waarschuwing" zijn allebei oranje:
 * beide betekenen "goed om te weten", en een vierde kleur maakt het verschil
 * tussen de drie die ertoe doen alleen maar vager. De namen blijven omdat ruim
 * zestig aanroepen ze gebruiken.
 */
export type ToastIntent = "succes" | "fout" | "info" | "waarschuwing";

export interface ToastInput {
  title: string;
  /** Niet meer in beeld; wel bij het aanwijzen en voor een schermlezer. */
  description?: string;
  intent?: ToastIntent;
  /** Waar een klik op de titel naartoe gaat, zo precies mogelijk. */
  href?: string | null;
  /** Milliseconden. Standaard 4,5 seconden, bij een fout 8. */
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
  duration: number;
  leaving: boolean;
}

const KLEUR_VAN: Record<ToastIntent, NotificatieKleur> = {
  succes: "groen",
  fout: "rood",
  info: "oranje",
  waarschuwing: "oranje",
};

/** Omgekeerd, voor meldingen uit de notificatielijst. */
export function intentVoorKleur(kleur: NotificatieKleur): ToastIntent {
  return kleur === "groen" ? "succes" : kleur === "rood" ? "fout" : "waarschuwing";
}

const DUUR_STANDAARD = 4500;
const DUUR_FOUT = 8000;
/** Meer dan drie tegelijk is een muur, geen melding. De oudste gaat eerst weg. */
const MAX_IN_BEELD = 3;

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

/**
 * Meldingen tonen vanuit elke client-component.
 *
 * Geeft een no-op terug als er geen provider boven zit. Dat is expres: een
 * component die een melding wil doen mag daar nooit op crashen, en in tests
 * staat de provider er niet.
 */
export function useToast(): (t: ToastInput) => void {
  const ctx = useContext(ToastContext);
  return ctx ?? noop;
}

function noop() {
  /* geen provider: melden is niet kritiek genoeg om voor te vallen */
}

let volgendeId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const uitloop = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const remove = useCallback((id: number) => {
    // Eerst de uitloop-animatie (0,12s), dan pas uit de lijst. Anders klapt de
    // rij erboven omlaag vóórdat de melding zelf verdwenen is.
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    if (uitloop.current.has(id)) return;
    const t = setTimeout(() => {
      setItems((list) => list.filter((x) => x.id !== id));
      uitloop.current.delete(id);
    }, 120);
    uitloop.current.set(id, t);
  }, []);

  const push = useCallback((input: ToastInput) => {
    const id = volgendeId++;
    const duration = input.duration && input.duration > 0 ? input.duration : input.intent === "fout" ? DUUR_FOUT : DUUR_STANDAARD;
    setItems((list) => [...list, { ...input, id, duration, leaving: false }].slice(-MAX_IN_BEELD));
  }, []);

  useEffect(() => {
    const map = uitloop.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* `aria-live="polite"` op de regio, niet op de losse melding: een
          schermlezer leest dan elke nieuwe melding voor zonder dat we per
          melding een live-regio aan- en uitzetten. */}
      <div className="toast-regio no-print" role="region" aria-label="Meldingen" aria-live="polite">
        {items.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const kleur = KLEUR_VAN[toast.intent ?? "info"];
  const { openen } = useNotificatiePaneel();
  const [stil, setStil] = useState(false);
  const resterend = useRef(toast.duration);

  // De klok per melding, zodat hij kan stilstaan zolang de muis erop staat.
  useEffect(() => {
    if (stil || toast.leaving) return;
    const start = Date.now();
    const t = setTimeout(onClose, resterend.current);
    return () => {
      clearTimeout(t);
      resterend.current = Math.max(0, resterend.current - (Date.now() - start));
    };
  }, [stil, toast.leaving, onClose]);

  return (
    <div
      className="toast-card"
      data-kleur={kleur}
      data-leaving={toast.leaving ? "" : undefined}
      onMouseEnter={() => setStil(true)}
      onMouseLeave={() => setStil(false)}
      onFocus={() => setStil(true)}
      onBlur={() => setStil(false)}
      title={toast.description}
    >
      <span className="toast-stip" aria-hidden />
      <div className="toast-tekst">
        {toast.href ? (
          <Link href={toast.href} className="toast-titel toast-titel-link" onClick={onClose}>
            {toast.title}
          </Link>
        ) : (
          <p className="toast-titel">{toast.title}</p>
        )}
        {toast.description && <span className="sr-only">{toast.description}</span>}
        <button
          type="button"
          className="toast-alles"
          onClick={() => {
            onClose();
            openen();
          }}
        >
          Bekijk alle notificaties
        </button>
      </div>
      <button type="button" onClick={onClose} className="toast-sluit" aria-label="Melding sluiten">
        <Icon naam="sluiten" size={14} />
      </button>
      <span
        className="toast-progress"
        style={{
          animationDuration: `${toast.duration}ms`,
          animationPlayState: stil ? "paused" : "running",
        }}
        aria-hidden
      />
    </div>
  );
}
