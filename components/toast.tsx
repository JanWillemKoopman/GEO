"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Broodroostermeldingen.
 *
 * ── WAAROM DIT ER MOEST KOMEN ───────────────────────────────────────────────
 *
 * De app kende maar één manier om iets te melden: een kaart die ergens in de
 * pagina verschijnt. Dat werkt voor een uitslag, niet voor een gebeurtenis. Het
 * merkonderzoek duurt ~7,5 minuut, en juist het moment waarop het klaar is ging
 * ongemarkeerd voorbij: de panelen ploften erin na een `router.refresh()` en wie
 * net even wegkeek zag alleen dat het scherm veranderd was.
 *
 * ── DE VORM KOMT VAN NOVA ───────────────────────────────────────────────────
 *
 * Overgenomen uit de gecompileerde CSS van nova.inspace.io (geanalyseerd op
 * 10 augustus 2026), zodat een melding hier hetzelfde aanvoelt als daar:
 *
 *   toast-in        0,15s ease-out, van translateX(1rem) + opacity 0
 *   toast-out       0,12s ease-in, alleen opacity
 *   toast-progress  scaleX(1) → scaleX(0), lineair, over de hele levensduur
 *
 * Die laatste is het detail dat het af maakt: een streepje dat leegloopt zegt
 * "deze melding gaat vanzelf weg" zonder één woord uitleg. Nova zet hem onder
 * elke toast, en het is de reden dat je er niet op hoeft te klikken.
 *
 * Titel én omschrijving, altijd, ook dat is Nova (`updateSuccessTitle` +
 * `updateSuccessDescription` in hun i18n). De titel zegt wát er gebeurde, de
 * regel eronder wat het voor jou betekent. Eén regel alleen leest als een
 * systeemmelding.
 *
 * Bewust met de hand geschreven en niet Radix erbij: dit is de enige overlay
 * die de app nodig heeft, en hij is ~120 regels.
 */

export type ToastIntent = "succes" | "fout" | "info";

export interface ToastInput {
  title: string;
  /** Eén regel: wat betekent dit voor de gebruiker? */
  description?: string;
  intent?: ToastIntent;
  /** Milliseconden. Een fout blijft standaard staan tot je hem wegklikt. */
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
  duration: number;
  leaving: boolean;
}

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
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const remove = useCallback((id: number) => {
    // Eerst de uitloop-animatie (0,12s), dan pas uit de lijst. Anders klapt de
    // rij eronder omhoog vóórdat de melding zelf verdwenen is.
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    const t = setTimeout(() => {
      setItems((list) => list.filter((x) => x.id !== id));
      timers.current.delete(id);
    }, 120);
    timers.current.set(id, t);
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = volgendeId++;
      const duration = input.duration ?? (input.intent === "fout" ? 0 : 6000);
      setItems((list) => [...list, { ...input, id, duration, leaving: false }]);
      if (duration > 0) {
        const t = setTimeout(() => remove(id), duration);
        timers.current.set(id, t);
      }
    },
    [remove],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* `aria-live="polite"` op de regio, niet op de losse melding: een
          schermlezer leest dan elke nieuwe melding voor zonder dat we per
          melding een live-regio aan- en uitzetten. */}
      <div
        className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:top-0 sm:items-end"
        role="region"
        aria-label="Meldingen"
        aria-live="polite"
      >
        {items.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const RAND: Record<ToastIntent, string> = {
  succes: "var(--intent-growth-border)",
  fout: "var(--intent-danger-border)",
  info: "var(--intent-intelligence-border)",
};

const STREEP: Record<ToastIntent, string> = {
  succes: "var(--intent-growth-solid)",
  fout: "var(--intent-danger-solid)",
  info: "var(--intent-intelligence-solid)",
};

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const intent = toast.intent ?? "info";

  return (
    <div
      className="toast-card pointer-events-auto w-full max-w-sm"
      data-leaving={toast.leaving ? "" : undefined}
      style={{ borderColor: RAND[intent] }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description && (
            <p className="text-sm text-secondary">{toast.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-m-1 shrink-0 rounded-[var(--radius-sm)] p-1 text-muted transition-colors hover:text-[var(--text-primary)]"
          aria-label="Melding sluiten"
        >
          ✕
        </button>
      </div>

      {toast.duration > 0 && (
        <span
          className="toast-progress"
          style={{
            background: STREEP[intent],
            animationDuration: `${toast.duration}ms`,
          }}
          aria-hidden
        />
      )}
    </div>
  );
}
