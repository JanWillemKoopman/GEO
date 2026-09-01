"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";
import { PACKAGE_SIZES, packageLabel } from "@/lib/package-sizes";

/**
 * Het contentpakket van de klant instellen, alleen voor de beheerder.
 *
 * ── WAAROM DIT SCHERM BESTAAT ───────────────────────────────────────────────
 *
 * ⚠️ Gevonden op 31 augustus 2026, in de eerste live doorloop van de hele
 * klantreis. Het planscherm blokkeerde op "Er is nog geen pakket gekozen. Kies
 * eerst 10, 20 of 40 pagina's per maand", en er was in de hele app geen scherm
 * waar dat te kiezen viel. De doorloop kwam alleen verder doordat de waarde met
 * de hand in de database is gezet.
 *
 * Het pakket wordt sindsdien al in de pre-boardingwizard gevraagd; dit blok is
 * waar de beheerder hem daarna aanpast, bijvoorbeeld als een klant opschaalt.
 *
 * ── WAAROM HIJ BIJ TOEWIJZEN STAAT ──────────────────────────────────────────
 *
 * Het pakket hangt aan het ACCOUNT en niet aan het merk (besluit 10: een klant
 * kan meerdere merken hebben en koopt één pakket). Toewijzen is het scherm waar
 * het merk aan een account gekoppeld wordt, dus dat is de plek waar die twee
 * dingen bij elkaar horen. Zonder account is er niets te kiezen, en dat zegt
 * het blok dan ook in plaats van een keuzelijst te tonen die nergens landt.
 */
export function PackageBox({
  accountId,
  accountName,
  current,
}: {
  /** `null` als dit merk nog aan geen enkel account hangt. */
  accountId: string | null;
  accountName: string | null;
  current: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [maat, setMaat] = useState<number | "">(current ?? "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<UserFacingError | null>(null);

  if (!accountId) {
    return (
      <section className="card flex flex-col gap-2">
        <h2 className="type-heading">Contentpakket</h2>
        <p className="text-sm text-secondary">
          Dit merk hangt nog aan geen enkel account. Koppel het hierboven aan een klant, dan kun je
          het pakket kiezen.
        </p>
      </section>
    );
  }

  async function bewaar() {
    if (maat === "") return;
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_pages_per_month: Number(maat) }),
      });
      if (!res.ok) {
        setProblem(problemFromResponse(await res.json().catch(() => null)));
        return;
      }
      toast({
        title: "Pakket opgeslagen",
        description: `ORBIT ENGINE schrijft nu ${packageLabel(Number(maat))} voor deze klant.`,
        intent: "succes",
      });
      router.refresh();
    } catch (err) {
      setProblem(networkProblem(err));
    } finally {
      setBusy(false);
    }
  }

  const gewijzigd = maat !== "" && Number(maat) !== current;

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="type-heading">Contentpakket</h2>
        <p className="text-sm text-secondary">
          Hoeveel pagina&apos;s ORBIT ENGINE per maand schrijft voor{" "}
          {accountName ?? "dit account"}. Alleen jij stelt dit in; de klant ziet het aantal terug in
          zijn contentplan.
        </p>
        <p className="text-sm text-secondary">
          Zet dit vóór het eerste contentplan: zonder pakket blokkeert dat scherm voor de klant.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Pagina&apos;s per maand</span>
        <select
          className="field w-fit"
          value={maat}
          onChange={(e) => setMaat(e.target.value === "" ? "" : Number(e.target.value))}
          disabled={busy}
        >
          <option value="">Nog geen pakket gekozen</option>
          {PACKAGE_SIZES.map((m) => (
            <option key={m} value={m}>
              {m} pagina&apos;s per maand
            </option>
          ))}
        </select>
      </label>

      {problem && <ErrorNotice error={problem} />}

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-primary w-fit disabled:opacity-60"
          onClick={() => void bewaar()}
          disabled={busy || !gewijzigd}
        >
          {busy ? "Bezig…" : "Pakket opslaan"}
        </button>
        <span className="text-sm text-muted">Nu: {packageLabel(current)}</span>
      </div>
    </section>
  );
}

