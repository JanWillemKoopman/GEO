"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { ExternalLink } from "@/components/external-link";

/**
 * Poort 1 op het scherm (`docs/tasks/geo-prospect-engine.md` §8.1).
 *
 * ── WAT DIT SCHERM MOET KUNNEN, EN WAAROM ───────────────────────────────────
 *
 * De admin moet per bedrijf kunnen zien waaróm het in deze lijst staat, en dat
 * kunnen controleren. "Zekerheid: laag" zonder uitleg is een oordeel dat je moet
 * geloven. Vandaar dat elke regel de herkomst in gewone taal draagt én de
 * vindplaatsen als aanklikbare links: de admin gelooft ons niet, hij kijkt.
 *
 * Dat is plan hoofdstuk 15 in het klein: geen bewijs is geen claim. En het is
 * de goedkoopste plek om die regel te leren, want hier kost een fout alleen nog
 * een verkeerd gemeten bedrijf en nog geen verkeerd gebeld bedrijf.
 */
export interface BedrijfRegel {
  companyId: string;
  naam: string;
  domein: string | null;
  plaats: string | null;
  zekerheid: string;
  included: boolean | null;
  herkomst: string | null;
  vindplaatsen: string[];
  uitgesloten: string | null;
  /** Staat dit bedrijf op de uitsluitingslijst uit 9.5? Dan mag niemand hem terugzetten. */
  geblokkeerd: boolean;
  crawlStatus: string;
}

const ZEKERHEID_CHIP: Record<string, string> = {
  hoog: "chip chip-success",
  middel: "chip chip-neutral",
  laag: "chip chip-warning",
};

/** Wat de crawl opleverde, in gewone taal. Alleen tonen als er iets te melden is. */
function crawlTekst(status: string): string | null {
  if (status === "gelukt") return null;
  if (status === "geen_website") return "geen website";
  if (status === "niet_gelukt") return "site niet te lezen";
  return null;
}

export function Bedrijvenlijst({
  marketId,
  bedrijven,
  magBewerken,
  magGoedkeuren,
}: {
  marketId: string;
  bedrijven: BedrijfRegel[];
  magBewerken: boolean;
  magGoedkeuren: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [bezig, setBezig] = useState<string | null>(null);
  const [keurBezig, setKeurBezig] = useState(false);

  async function zet(companyId: string, included: boolean) {
    setBezig(companyId);
    try {
      const res = await fetch(`/api/sales/markets/${marketId}/companies`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, included }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: "Niet gelukt", description: data.error, intent: "fout" });
        return;
      }
      router.refresh();
    } catch {
      toast({ title: "De verbinding viel weg", intent: "fout" });
    } finally {
      setBezig(null);
    }
  }

  async function keurGoed() {
    setKeurBezig(true);
    try {
      const res = await fetch(`/api/sales/markets/${marketId}/approve`, { method: "POST" });
      const data = (await res.json()) as { error?: string; bedrijven?: number };
      if (!res.ok) {
        toast({ title: "Niet gelukt", description: data.error, intent: "fout" });
        return;
      }
      toast({
        title: "Lijst goedgekeurd",
        description: `ORBIT ENGINE leest nu de site van ${data.bedrijven} bedrijven uit. Dat kost niets.`,
        intent: "succes",
      });
      router.refresh();
    } catch {
      toast({ title: "De verbinding viel weg", intent: "fout" });
    } finally {
      setKeurBezig(false);
    }
  }

  const meegenomen = bedrijven.filter((b) => b.included !== false).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">De bedrijven in deze markt</h2>
          <p className="mt-1 text-secondary">
            {meegenomen} van de {bedrijven.length} gaan mee. Haal weg wat er niet in hoort, en
            klik op een vindplaats om te controleren waar een bedrijf vandaan komt.
          </p>
        </div>
        {magGoedkeuren && (
          <button type="button" className="btn-primary" onClick={keurGoed} disabled={keurBezig}>
            {keurBezig ? "Bezig" : "Lijst goedkeuren"}
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {bedrijven.map((b) => (
          <li
            key={b.companyId}
            className={`card flex flex-col gap-2 ${b.included === false ? "opacity-60" : ""}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{b.naam}</span>
                {b.domein ? (
                  <ExternalLink href={`https://${b.domein}`}>{b.domein}</ExternalLink>
                ) : (
                  <span className="text-sm text-muted">geen website</span>
                )}
                {b.plaats && <span className="text-sm text-muted">{b.plaats}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className={ZEKERHEID_CHIP[b.zekerheid] ?? "chip chip-neutral"}>
                  zekerheid {b.zekerheid}
                </span>
                {crawlTekst(b.crawlStatus) && (
                  <span className="chip chip-neutral">{crawlTekst(b.crawlStatus)}</span>
                )}
              </div>
            </div>

            {b.herkomst && <p className="text-sm text-secondary">{b.herkomst}</p>}

            {b.vindplaatsen.length > 0 && (
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {b.vindplaatsen.slice(0, 4).map((u) => (
                  <ExternalLink key={u} href={u}>
                    {new URL(u).hostname.replace(/^www\./, "")}
                  </ExternalLink>
                ))}
              </p>
            )}

            {b.included === false && b.uitgesloten && (
              <p className="text-sm text-[var(--intent-warning-text)]">{b.uitgesloten}</p>
            )}

            {magBewerken && !b.geblokkeerd && (
              <div>
                <button
                  type="button"
                  className="btn-outline btn-sm"
                  disabled={bezig === b.companyId}
                  onClick={() => zet(b.companyId, b.included === false)}
                >
                  {b.included === false ? "Toch meenemen" : "Weghalen"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
