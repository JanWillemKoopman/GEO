"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";

export interface ConflictWeergave {
  id: string;
  soort: string;
  blokkerend: boolean;
  uitleg: string | null;
  voorstel: string | null;
  voorstelFeitId: string | null;
  status: string;
  gekozenFeitId: string | null;
  oplossing: string | null;
  feiten: { id: string; tekst: string; bron: string; datum: string }[];
}

/** Datum zoals de adviseur hem leest: "24 sep 2026". */
function datum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

const OPLOSSING: Record<string, string> = {
  adviseur: "door een medewerker gekozen",
  automatisch: "vanzelf: het antwoord van de klant gaat vóór de site",
  vraag: "door de ondernemer gekozen",
};

/**
 * De drie knoppen per conflict (§8.3). Schrijven gaat via de API-route, nooit
 * rechtstreeks naar de database (conventie 6).
 */
export function ConflictLijst({
  profileId,
  conflicten,
  nogIndelen,
}: {
  profileId: string;
  conflicten: ConflictWeergave[];
  nogIndelen: number;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState<string | null>(null);
  const [probleem, setProbleem] = useState<UserFacingError | null>(null);
  const [gestart, setGestart] = useState(false);

  const open = conflicten.filter((c) => c.status === "open" || c.status === "gevraagd");
  const opgelost = conflicten.filter((c) => c.status === "opgelost");

  async function kies(conflictId: string, body: Record<string, unknown>) {
    setBezig(conflictId);
    setProbleem(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/fact-conflicts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictId, ...body }),
      });
      if (!res.ok) {
        setProbleem(problemFromResponse(await res.json().catch(() => null)));
        return;
      }
      router.refresh();
    } catch (err) {
      setProbleem(networkProblem(err));
    } finally {
      setBezig(null);
    }
  }

  async function nalopen() {
    setProbleem(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/fact-conflicts`, { method: "POST" });
      if (!res.ok) {
        setProbleem(problemFromResponse(await res.json().catch(() => null)));
        return;
      }
      setGestart(true);
    } catch (err) {
      setProbleem(networkProblem(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {probleem && <ErrorNotice error={probleem} />}

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-secondary">
          {nogIndelen > 0
            ? `${nogIndelen} feiten zijn nog niet nagelopen op tegenspraak.`
            : "Alle feiten van dit merk zijn nagelopen op tegenspraak."}
        </p>
        <button type="button" className="btn-outline btn-sm" onClick={nalopen} disabled={gestart}>
          {gestart ? "Wordt nagelopen" : "Opnieuw nalopen"}
        </button>
      </div>

      {open.length === 0 ? (
        <p className="text-sm text-muted">Er staat geen tegenstrijdig feit open.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {open.map((c) => (
            <li key={c.id} className="card flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mono-label">{c.soort}</span>
                {c.blokkerend && (
                  <span className="text-xs text-secondary">
                    Houdt een pagina tegen als dit feit daar nodig is
                  </span>
                )}
              </div>
              {c.uitleg && <p className="text-sm">{c.uitleg}</p>}
              <ul className="flex flex-col gap-2">
                {c.feiten.map((f) => (
                  <li key={f.id} className="vlak flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">&ldquo;{f.tekst}&rdquo;</span>
                      <span className="text-xs text-muted">
                        {f.bron}, vastgelegd {datum(f.datum)}
                        {c.voorstelFeitId === f.id ? ". Voorstel: dit klopt waarschijnlijk" : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-outline btn-sm shrink-0"
                      disabled={bezig === c.id || c.status === "gevraagd"}
                      onClick={() => kies(c.id, { feitId: f.id })}
                    >
                      Dit geldt
                    </button>
                  </li>
                ))}
              </ul>
              {c.voorstel && <p className="text-xs text-muted">{c.voorstel}</p>}
              {c.status === "gevraagd" ? (
                <p className="text-sm text-secondary">Aan de ondernemer gevraagd, wacht op het antwoord.</p>
              ) : (
                <button
                  type="button"
                  className="btn-ghost btn-sm w-fit"
                  disabled={bezig === c.id}
                  onClick={() => kies(c.id, { vraag: true })}
                >
                  Vraag het de ondernemer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {opgelost.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
          <span className="text-sm font-medium">Opgelost</span>
          <ul className="flex flex-col gap-2">
            {opgelost.map((c) => {
              const gekozen = c.feiten.find((f) => f.id === c.gekozenFeitId);
              return (
                <li key={c.id} className="text-sm text-secondary">
                  {gekozen ? <>&ldquo;{gekozen.tekst}&rdquo; geldt</> : "Geen van beide geldt"}
                  {c.oplossing ? `, ${OPLOSSING[c.oplossing] ?? c.oplossing}.` : "."}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
