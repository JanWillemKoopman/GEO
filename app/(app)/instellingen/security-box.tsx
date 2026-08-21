"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
import { passwordRules } from "@/lib/invite-rules";
import { Icon } from "@/components/icon";

/**
 * E-mailadres en wachtwoord wijzigen (fase 7, naar het model van Nova).
 *
 * ── TWEE HANDELINGEN, TWEE KNOPPEN ──────────────────────────────────────────
 *
 * Bewust geen één formulier met alles erin. Ze hebben een andere uitkomst: het
 * adres wijzigen levert een bevestigingsmail op en verandert nog niets, het
 * wachtwoord wijzigen is meteen klaar. Eén knop voor twee verschillende beloftes
 * is precies hoe iemand denkt dat hij iets deed wat hij niet deed.
 *
 * De wachtwoordregels staan live onder het veld, dezelfde drie als bij de
 * uitnodiging (`passwordRules`). Twee verschillende sterktes voor hetzelfde
 * wachtwoord is een verschil dat niemand kan uitleggen.
 */
export function SecurityBox({ email }: { email: string }) {
  const toast = useToast();
  const [nieuwAdres, setNieuwAdres] = useState("");
  const [huidig, setHuidig] = useState("");
  const [nieuwWachtwoord, setNieuwWachtwoord] = useState("");
  const [busy, setBusy] = useState<"email" | "wachtwoord" | null>(null);

  const regels = passwordRules(nieuwWachtwoord);

  async function verstuur(actie: "email" | "wachtwoord") {
    setBusy(actie);
    try {
      const res = await fetch("/api/account/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          actie === "email"
            ? { actie, email: nieuwAdres }
            : { actie, huidig, nieuw: nieuwWachtwoord },
        ),
      });
      const j = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; message?: string }
        | null;

      if (!res.ok || !j?.ok) {
        toast({
          intent: "fout",
          title: actie === "email" ? "Het adres is niet gewijzigd" : "Het wachtwoord is niet gewijzigd",
          description: j?.error ?? "Probeer het opnieuw.",
        });
        return;
      }

      toast({
        intent: "succes",
        title: actie === "email" ? "Bevestig je nieuwe adres" : "Gelukt",
        description: j.message ?? "",
      });
      if (actie === "email") setNieuwAdres("");
      else {
        setHuidig("");
        setNieuwWachtwoord("");
      }
    } catch {
      toast({
        intent: "fout",
        title: "Geen verbinding",
        description: "Controleer je internet en probeer het opnieuw.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card flex flex-col gap-5">
      <span className="mono-label">Inloggegevens</span>

      {/* ── E-mailadres ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="flex flex-wrap justify-between gap-2 text-sm">
          <span className="text-secondary">Je e-mailadres</span>
          <span className="break-url font-medium">{email}</span>
        </span>
        <label htmlFor="nieuw-adres" className="text-sm text-secondary">
          Nieuw e-mailadres
        </label>
        <input
          id="nieuw-adres"
          className="field"
          type="email"
          value={nieuwAdres}
          onChange={(e) => setNieuwAdres(e.target.value)}
          placeholder="naam@bedrijf.nl"
        />
        {/* ⚠️ Dit is de zin die een tikfout onschadelijk maakt. Zonder deze
            belofte durft niemand zijn inlogadres te wijzigen. */}
        <p className="text-sm text-muted">
          Je krijgt een bevestiging op het nieuwe adres. Tot je die opent, blijft
          je huidige adres gewoon werken.
        </p>
        <button
          type="button"
          className="btn-primary btn-sm w-fit"
          onClick={() => void verstuur("email")}
          disabled={busy !== null || nieuwAdres.trim().length === 0}
        >
          {busy === "email" ? "Bezig…" : "Wijzig mijn e-mailadres"}
        </button>
      </div>

      <div className="border-t border-[var(--border-subtle)]" />

      {/* ── Wachtwoord ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <label htmlFor="huidig-ww" className="text-sm text-secondary">
          Je huidige wachtwoord
        </label>
        <input
          id="huidig-ww"
          className="field"
          type="password"
          autoComplete="current-password"
          value={huidig}
          onChange={(e) => setHuidig(e.target.value)}
        />

        <label htmlFor="nieuw-ww" className="pt-2 text-sm text-secondary">
          Je nieuwe wachtwoord
        </label>
        <input
          id="nieuw-ww"
          className="field"
          type="password"
          autoComplete="new-password"
          value={nieuwWachtwoord}
          onChange={(e) => setNieuwWachtwoord(e.target.value)}
        />

        {nieuwWachtwoord.length > 0 && (
          <ul className="flex flex-col gap-0.5 pt-1">
            {regels.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <span
                  style={{
                    color: r.ok ? "var(--intent-growth-text)" : "var(--text-muted)",
                  }}
                >
                  <Icon naam={r.ok ? "klaar" : "open"} size={14} />
                </span>
                <span className={r.ok ? "text-muted" : ""}>{r.label}</span>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="btn-primary btn-sm mt-1 w-fit"
          onClick={() => void verstuur("wachtwoord")}
          disabled={
            busy !== null || huidig.length === 0 || regels.some((r) => !r.ok)
          }
        >
          {busy === "wachtwoord" ? "Bezig…" : "Wijzig mijn wachtwoord"}
        </button>
      </div>
    </div>
  );
}
