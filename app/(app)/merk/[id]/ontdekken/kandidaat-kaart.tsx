"use client";

import { useState } from "react";
import Link from "next/link";
import { useRefresh } from "@/components/use-refresh";
import { AFWIJSREDENEN } from "@/lib/cluster-discovery";

/** Eén zoekterm onder "Toon bewijs", al klaar voor het scherm. */
export interface BewijsRegel {
  keyword: string;
  volume: string | null;
  positie: string | null;
  concurrent: string | null;
}

export interface KandidaatWeergave {
  id: string;
  title: string;
  rationale: string | null;
  soortLabel: string;
  feiten: string[];
  diensten: string[];
  overlap: string | null;
  /** `aangevraagd` bestaat nog in de database (0109) maar wordt niet meer gezet. */
  status: "nieuw" | "aangevraagd" | "toegevoegd" | "afgewezen";
  reden: string | null;
  bewijs: BewijsRegel[];
}

/**
 * Eén kandidaat-cluster. Iedereen die bij het merk hoort kan hem toevoegen
 * aan Mijn clusters, ook de klant zelf (23 september 2026 (4)). Afwijzen,
 * met een reden in één klik, is van de consultant: die reden stuurt de
 * volgende betaalde ronde.
 *
 * ⚠️ Het bedrag van een meting staat alleen bij de consultant. Een klant
 * start zelf geen meting, en een bedrag hoort niet op een klantscherm.
 *
 * Toevoegen start geen meting. Het onderwerp komt bij Voorgesteld op Mijn
 * clusters, en daar staat de bestaande startknop met de verdeling en de
 * clustervelden. Eén manier om een cluster te starten, niet twee.
 */
export function KandidaatKaart({
  merkId,
  kandidaat,
  staff,
  kostenPerMaand,
}: {
  merkId: string;
  kandidaat: KandidaatWeergave;
  staff: boolean;
  /** "ongeveer $0,82 per maand": wat meten van één cluster kost. */
  kostenPerMaand: string;
}) {
  const { refresh, refreshing } = useRefresh();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [afwijzen, setAfwijzen] = useState(false);
  const [bewijsOpen, setBewijsOpen] = useState(false);
  const wacht = bezig || refreshing;

  async function doe(actie: string, reden?: string) {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/profiles/${merkId}/discovery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: kandidaat.id, actie, reden }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFout(json.error ?? "Dat lukte niet.");
        setBezig(false);
        return;
      }
      setAfwijzen(false);
      setBezig(false);
      refresh();
    } catch {
      setFout("Dat lukte niet. Controleer je verbinding.");
      setBezig(false);
    }
  }

  const besloten = kandidaat.status === "toegevoegd" || kandidaat.status === "afgewezen";

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="type-body-emphasis">{kandidaat.title}</h3>
        <span className="chip chip-outline">{kandidaat.soortLabel}</span>
        {kandidaat.status === "toegevoegd" && <span className="chip chip-success">Toegevoegd</span>}
        {kandidaat.status === "afgewezen" && (
          <span className="chip chip-neutral">Afgewezen{kandidaat.reden ? `: ${kandidaat.reden}` : ""}</span>
        )}
      </div>

      {kandidaat.overlap && (
        <p className="text-sm text-secondary">
          Lijkt op &ldquo;{kandidaat.overlap}&rdquo;, dat al bij je clusters staat. Kijk of dit echt iets anders
          meet voor je het toevoegt.
        </p>
      )}

      {kandidaat.rationale && <p className="text-secondary">{kandidaat.rationale}</p>}

      {kandidaat.feiten.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {kandidaat.feiten.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      {kandidaat.diensten.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mono-label">Past bij</span>
          {kandidaat.diensten.map((d) => (
            <span key={d} className="chip chip-neutral">
              {d}
            </span>
          ))}
        </div>
      )}

      <div>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setBewijsOpen((o) => !o)} aria-expanded={bewijsOpen}>
          {bewijsOpen ? "Verberg bewijs" : `Toon bewijs (${kandidaat.bewijs.length} zoektermen)`}
        </button>
        {bewijsOpen && (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="mono-label py-1 pr-3">Zoekterm</th>
                <th className="mono-label py-1 pr-3 text-right">Per maand</th>
                <th className="mono-label py-1 pr-3 text-right">Jij</th>
                <th className="mono-label py-1">Concurrent</th>
              </tr>
            </thead>
            <tbody>
              {kandidaat.bewijs.map((b) => (
                <tr key={b.keyword} className="border-t border-[var(--line-muted)]">
                  <td className="py-1 pr-3">{b.keyword}</td>
                  <td className="tabular py-1 pr-3 text-right">{b.volume ?? "onbekend"}</td>
                  <td className="tabular py-1 pr-3 text-right">{b.positie ?? "niet gevonden"}</td>
                  <td className="py-1 text-secondary">{b.concurrent ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!besloten && (
        <div className="flex flex-col gap-2">
          {staff ? (
            afwijzen ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-secondary">Waarom niet?</span>
                {AFWIJSREDENEN.map((r) => (
                  <button key={r} type="button" className="btn-outline btn-sm" disabled={wacht} onClick={() => doe("afwijzen", r)}>
                    {r}
                  </button>
                ))}
                <button type="button" className="btn-ghost btn-sm" disabled={wacht} onClick={() => setAfwijzen(false)}>
                  Annuleren
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn-actie btn-sm" disabled={wacht} onClick={() => doe("toevoegen")}>
                  Toevoegen aan Mijn clusters
                </button>
                <button type="button" className="btn-outline btn-sm" disabled={wacht} onClick={() => setAfwijzen(true)}>
                  Niet relevant
                </button>
                <span className="text-sm text-muted">Meten kost daarna {kostenPerMaand}.</span>
              </div>
            )
          ) : (
            <div>
              <button type="button" className="btn-actie btn-sm" disabled={wacht} onClick={() => doe("toevoegen")}>
                Toevoegen aan Mijn clusters
              </button>
            </div>
          )}
        </div>
      )}

      {kandidaat.status === "toegevoegd" && (
        <p className="text-sm text-secondary">
          Staat nu bij Voorgesteld op{" "}
          <Link href={`/merk/${merkId}/strategie/clusters`} className="underline">
            Mijn clusters
          </Link>
          .{" "}
          {staff
            ? "Daar start je de meting."
            : "Je consultant start daar de meting, zodat je gaat zien of AI-assistenten je hierop noemen."}
        </p>
      )}

      {fout && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {fout}
        </p>
      )}
    </div>
  );
}
