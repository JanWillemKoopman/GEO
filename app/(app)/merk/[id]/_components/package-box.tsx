"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";
import { PACKAGE_SIZES, packageLabel } from "@/lib/package-sizes";
import { afspraakGaten } from "@/lib/verkoopafspraak";

/**
 * De verkoopafspraak van de klant: het contentpakket en de startdatum.
 *
 * ── WAAROM DIT SCHERM BESTAAT ───────────────────────────────────────────────
 *
 * ⚠️ Gevonden op 31 augustus 2026, in de eerste live doorloop van de hele
 * klantreis. Het planscherm blokkeerde op "Er is nog geen pakket gekozen. Kies
 * eerst 10, 20 of 40 pagina's per maand", en er was in de hele app geen scherm
 * waar dat te kiezen viel. De doorloop kwam alleen verder doordat de waarde met
 * de hand in de database is gezet.
 *
 * ⚠️ **De startdatum kwam er op 16 september 2026 bij, om precies dezelfde
 * reden.** Nagerekend: `accounts.started_at` werd door geen enkele regel in de
 * app geschreven, alleen gelezen door `monthsSinceStart()`. "Maand 4 sinds de
 * start" stond daardoor bij elke echte klant leeg. Hij wordt nu vanzelf gezet
 * bij het toewijzen; dit is de plek waar je hem corrigeert voor een klant die
 * eerder begon dan zijn merk werd overgedragen.
 *
 * ── WAAROM HIJ BIJ TOEWIJZEN STAAT ──────────────────────────────────────────
 *
 * Allebei de waarden hangen aan het ACCOUNT en niet aan het merk (besluit 10:
 * een klant kan meerdere merken hebben en koopt één pakket). Toewijzen is het
 * scherm waar het merk aan een account gekoppeld wordt, dus dat is de plek waar
 * die dingen bij elkaar horen. Zonder account is er niets te kiezen, en dat zegt
 * het blok dan ook in plaats van een keuzelijst te tonen die nergens landt.
 *
 * ── ELK GAT NOEMT ZIJN GEVOLG ───────────────────────────────────────────────
 *
 * Wat er ontbreekt staat bovenaan met de gevolgen erbij, niet als rode
 * sterretjes bij lege velden. Dezelfde regel als op het onboardingscherm: "pakket
 * ontbreekt" zegt een consultant niets, "het contentplan blokkeert voor de klant"
 * wel. De lijst zelf komt uit `lib/verkoopafspraak.ts`, met tests.
 */
export function PackageBox({
  accountId,
  accountName,
  current,
  startedAt,
}: {
  /** `null` als dit merk nog aan geen enkel account hangt. */
  accountId: string | null;
  accountName: string | null;
  current: number | null;
  /** De startdatum van het abonnement, als ISO-tijdstempel. */
  startedAt: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [maat, setMaat] = useState<number | "">(current ?? "");
  // Het invoerveld werkt met `YYYY-MM-DD`; de database bewaart een tijdstempel.
  const [start, setStart] = useState(startedAt ? startedAt.slice(0, 10) : "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<UserFacingError | null>(null);

  if (!accountId) {
    return (
      <section className="card flex flex-col gap-2">
        <h2 className="type-section">Verkoopafspraak</h2>
        <p className="text-sm text-secondary">
          Dit merk hangt nog aan geen enkel account. Koppel het hierboven aan een klant, dan kun je
          het pakket en de startdatum vastleggen.
        </p>
      </section>
    );
  }

  async function bewaar() {
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(maat !== "" ? { package_pages_per_month: Number(maat) } : {}),
          started_at: start === "" ? null : start,
        }),
      });
      if (!res.ok) {
        setProblem(problemFromResponse(await res.json().catch(() => null)));
        return;
      }
      toast({
        title: "Verkoopafspraak opgeslagen",
        description:
          maat !== ""
            ? `ORBIT ENGINE schrijft ${packageLabel(Number(maat))} voor deze klant.`
            : "De startdatum staat bij.",
        intent: "succes",
      });
      router.refresh();
    } catch (err) {
      setProblem(networkProblem(err));
    } finally {
      setBusy(false);
    }
  }

  const gaten = afspraakGaten({ pakket: current, startdatum: startedAt });
  const gewijzigd =
    (maat !== "" && Number(maat) !== current) || start !== (startedAt ? startedAt.slice(0, 10) : "");

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="type-section">Verkoopafspraak</h2>
        <p className="text-sm text-secondary">
          Wat er met {accountName ?? "deze klant"} is afgesproken. Alleen jij stelt dit in; de klant
          ziet het terug in zijn contentplan en op zijn instellingenscherm.
        </p>
      </div>

      {gaten.length > 0 && (
        <ul className="flex flex-col gap-2">
          {gaten.map((gat) => (
            <li key={gat.veld} className="flex flex-col gap-0.5 border-l-2 border-[var(--status-warning)] pl-3">
              <span className="text-sm font-medium">{gat.wat}</span>
              <span className="text-sm text-secondary">{gat.gevolg}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Pagina&apos;s per maand</span>
          <select
            className="field field-select"
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

        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Gestart op</span>
          <input
            className="field"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            disabled={busy}
          />
        </label>
      </div>

      <p className="text-sm text-muted">
        De startdatum wordt vanzelf gezet zodra je dit merk aan een klant toewijst. Begon de klant
        eerder, zet hem dan hier terug: alles wat met &ldquo;sinds de start&rdquo; rekent gaat mee.
      </p>

      {problem && <ErrorNotice error={problem} />}

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-primary w-fit"
          onClick={() => void bewaar()}
          disabled={busy || !gewijzigd}
        >
          {busy ? "Bezig…" : "Afspraak opslaan"}
        </button>
        <span className="text-sm text-muted">Nu: {packageLabel(current)}</span>
      </div>
    </section>
  );
}
