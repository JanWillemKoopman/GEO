"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { MONTHS_AHEAD } from "@/lib/plan-constants";
import { Icon } from "@/components/icon";

/**
 * Er is nog geen plan.
 *
 * ── WAAROM DIT EEN SCHERM IS EN GEEN LEGE LIJST ─────────────────────────────
 *
 * `docs/ux-design.md` §4: een paneel dat niets te tonen heeft, verdwijnt niet.
 * Het toont waaróm het leeg is en wat de volgende stap is. Hier zijn er twee
 * voorwaarden (een pakket en onderwerpen), en die staan er alle twee bij mét
 * hun stand, zodat je niet op een knop klikt die faalt.
 *
 * Nova doet dit ook zo: hun generatiedialoog blokkeert tot funnels, talen en
 * strategiedetails er zijn (`admin.errors.strategyInputsRequired`), en de knop
 * legt zelf uit waarom hij niet mag.
 */
export function CreatePlanBox({
  profileId,
  staff,
  quota,
  kansCount,
  accountName,
}: {
  profileId: string;
  /** Besluit 18: het plan opstellen kost geld en doet de beheerder. */
  staff: boolean;
  quota: number | null;
  /** Het aantal gemeten kansen dat klaarstaat om ingepland te worden. */
  kansCount: number;
  accountName: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const mag = staff && Boolean(quota) && kansCount > 0;

  async function maak() {
    setBusy(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyNote: note }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast({
          intent: "fout",
          title: "Het plan kon niet worden opgesteld",
          description: j?.error ?? "Probeer het opnieuw.",
        });
        return;
      }
      toast({
        intent: "succes",
        title: "Het contentplan staat klaar",
        description: `${MONTHS_AHEAD} maanden, ${quota} pagina's per maand. Maand 1 wacht op vrijgave.`,
      });
      router.refresh();
    } catch {
      toast({
        intent: "fout",
        title: "Geen verbinding",
        description: "Controleer je internet en probeer het opnieuw.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <span className="mono-label">Nog geen contentplan</span>
        <p className="text-secondary">
          Een contentplan geeft je {MONTHS_AHEAD} maanden om zelf in te vullen.
          ORBIT ENGINE zet de kansen uit je metingen klaar in een voorraad en vult
          alvast de eerste maand met de sterkste; de rest bepaal jij. Je geeft per
          maand vrij, en ORBIT ENGINE begint tien dagen voor elke publicatiedatum
          met schrijven.
        </p>

        {!staff && (
          // K1: een leeg scherm zegt waaróm het leeg is. Voor de klant is dat
          // niet "er ontbreekt iets" maar "je consultant is aan zet".
          <p className="text-sm text-muted">
            Je consultant stelt het plan op. Zodra het klaarstaat, zie je hier de
            twaalf maanden en keur je ze maand voor maand samen met hem goed.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          <Voorwaarde
            klaar={Boolean(quota)}
            label={
              quota
                ? `Pakket: ${quota} pagina's per maand`
                : "Er is nog geen pakket gekozen"
            }
            uitleg={
              quota
                ? null
                : `Kies eerst 10, 20 of 40 pagina's per maand voor ${accountName ?? "dit account"}. Dat bepaalt hoeveel er in het plan komt.`
            }
          />
          {/* ⚠️ Dit was tot 25 augustus 2026 "er zijn onderwerpen". Dat is een
              te lage lat: een onderwerp zonder meting levert een pagina op die
              nooit geschreven kan worden, want de schrijfstap gebruikt de
              gemiste vragen uit de meting als briefing. Bij Gasservice Brabant
              stonden er daardoor 103 van de 120 pagina's te wachten op iets
              wat niemand gestart had. */}
          <Voorwaarde
            klaar={kansCount > 0}
            label={
              kansCount > 0
                ? `${kansCount} gemeten ${kansCount === 1 ? "kans" : "kansen"} om in te plannen`
                : "Er is nog geen cluster gemeten"
            }
            uitleg={
              kansCount > 0 ? null : (
                <>
                  ORBIT ENGINE haalt de kansen uit het rapport van een gemeten cluster. Start
                  eerst een meting op{" "}
                  <Link href={`/merk/${profileId}/strategie/clusters`} className="underline">
                    Clusters
                  </Link>
                  .
                </>
              )
            }
          />
        </ul>
      </div>

      {mag && (
        <div className="card flex flex-col gap-3">
          <label htmlFor="notitie" className="mono-label">
            Iets wat ORBIT ENGINE moet weten (mag leeg)
          </label>
          <p className="text-sm text-muted">
            Bijvoorbeeld: een nieuwe vestiging, een product dat eruit gaat, een
            seizoen dat telt. Dit gaat mee als context bij het opstellen.
          </p>
          <textarea
            id="notitie"
            className="field"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Vanaf november openen we in Breda"
          />
          <button
            type="button"
            className="btn-primary btn-lg w-fit"
            onClick={() => void maak()}
            disabled={busy}
          >
            {busy ? "Bezig met opstellen…" : "Stel het contentplan op"}
          </button>
        </div>
      )}
    </div>
  );
}

function Voorwaarde({
  klaar,
  label,
  uitleg,
}: {
  klaar: boolean;
  label: string;
  uitleg: React.ReactNode | null;
}) {
  return (
    <li className="flex flex-col gap-0.5">
      <span className="flex items-center gap-2 text-sm">
        <span
          style={{
            color: klaar ? "var(--intent-growth-text)" : "var(--intent-warning-text)",
          }}
        >
          <Icon naam={klaar ? "klaar" : "open"} size={14} />
        </span>
        <span className={klaar ? "" : "font-medium"}>{label}</span>
      </span>
      {uitleg && <span className="pl-6 text-sm text-muted">{uitleg}</span>}
    </li>
  );
}
