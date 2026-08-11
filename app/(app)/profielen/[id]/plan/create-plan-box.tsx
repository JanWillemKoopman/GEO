"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { MONTHS_AHEAD } from "@/lib/pipeline/plan-build";

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
  quota,
  topicCount,
  accountName,
}: {
  profileId: string;
  quota: number | null;
  topicCount: number;
  accountName: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const mag = Boolean(quota) && topicCount > 0;

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
        description: `${MONTHS_AHEAD} maanden, ${quota} pagina's per maand. Maand 1 wacht op je akkoord.`,
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
          Een contentplan zet {MONTHS_AHEAD} maanden vooruit welke pagina&apos;s
          Aura schrijft, verdeeld over je onderwerpen en de fasen van je
          klantreis. Je keurt per maand goed, en Aura begint tien dagen voor elke
          publicatiedatum met schrijven.
        </p>

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
          <Voorwaarde
            klaar={topicCount > 0}
            label={
              topicCount > 0
                ? `${topicCount} onderwerpen om over te schrijven`
                : "Er zijn nog geen onderwerpen"
            }
            uitleg={
              topicCount > 0 ? null : (
                <>
                  Aura stelt onderwerpen voor tijdens het merkonderzoek. Kijk op{" "}
                  <Link href={`/profielen/${profileId}#onderwerpen`} className="underline">
                    het merkdossier
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
            Iets wat Aura moet weten (mag leeg)
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
          aria-hidden
          style={{
            color: klaar ? "var(--intent-growth-text)" : "var(--intent-warning-text)",
          }}
        >
          {klaar ? "✓" : "○"}
        </span>
        <span className={klaar ? "" : "font-medium"}>{label}</span>
      </span>
      {uitleg && <span className="pl-6 text-sm text-muted">{uitleg}</span>}
    </li>
  );
}
