"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

/**
 * Google Search Console koppelen (fase 5, migratie 0052).
 *
 * ── DIT IS HET EERSTE DAT ORBIT ENGINE ÉCHT VAN DE KLANT VRAAGT ─────────────────────
 *
 * Elke andere stap draait op een webadres zonder dat iemand iets hoeft te doen.
 * Hier moet een geverifieerde eigenaar van de property ons adres toevoegen. Het
 * onderzoeksdocument noemt dat het échte werk van deze fase, en dus staat de
 * instructie hier voluit in plaats van in een handleiding die niemand opent:
 * het adres met een kopieerknop, de drie stappen, en het benodigde recht.
 *
 * ⚠️ De zin over AI Overviews staat er met opzet bij. Google levert klikken uit
 * AI-antwoorden ongesplitst in `web`; er is geen dimensie voor. Dat is precies
 * het cijfer waarvan een klant aanneemt dat het erin zit, en een product dat
 * AI-zichtbaarheid meet kan die verwarring niet laten bestaan.
 */
export function SearchConsoleBox({
  profileId,
  property,
  verifiedAt,
  lastError,
  serviceAccountEmail,
  dagen,
}: {
  profileId: string;
  property: string | null;
  verifiedAt: string | null;
  lastError: string | null;
  /** Het adres dat de klant moet toevoegen. Null zolang de sleutel niet is ingesteld. */
  serviceAccountEmail: string | null;
  /** Hoeveel dagen aan cijfers er al binnen zijn. */
  dagen: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [waarde, setWaarde] = useState(property ?? "");
  const [busy, setBusy] = useState(false);
  const [gekopieerd, setGekopieerd] = useState(false);

  async function koppel() {
    setBusy(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}/search-console`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property: waarde }),
      });
      const j = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; reason?: string; rijen?: number }
        | null;

      if (!res.ok || !j?.ok) {
        toast({
          intent: "fout",
          title: "ORBIT ENGINE kan de cijfers nog niet ophalen",
          description: j?.error ?? j?.reason ?? "Probeer het opnieuw.",
        });
        router.refresh();
        return;
      }

      toast({
        intent: "succes",
        title: "Search Console is gekoppeld",
        description: `ORBIT ENGINE haalde ${j.rijen ?? 0} regels op en werkt de cijfers voortaan elke dag bij.`,
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

  async function kopieer() {
    if (!serviceAccountEmail) return;
    try {
      await navigator.clipboard.writeText(serviceAccountEmail);
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      // Kopiëren mag mislukken: het adres staat gewoon leesbaar in beeld.
    }
  }

  const gekoppeld = Boolean(property && verifiedAt);

  return (
    <div className="flex flex-col gap-4">
      {gekoppeld ? (
        <p className="text-secondary">
          ORBIT ENGINE leest {property} en heeft {dagen} {dagen === 1 ? "dag" : "dagen"} aan
          cijfers binnen. De volgende ronde draait vannacht.
        </p>
      ) : (
        <p className="text-secondary">
          Koppel Search Console en ORBIT ENGINE zet de klikken uit Google naast je
          zichtbaarheid in AI-antwoorden. Dat is het bewijsstuk onder het verhaal.
        </p>
      )}

      {lastError && (
        <p
          className="card text-sm"
          style={{
            background: "var(--intent-warning-surface)",
            borderColor: "var(--intent-warning-border)",
          }}
        >
          {lastError}
        </p>
      )}

      {/* ── Stap 1: het adres ────────────────────────────────────────────── */}
      {serviceAccountEmail ? (
        <div className="flex flex-col gap-2">
          <span className="mono-label">1. Geef ORBIT ENGINE leestoegang</span>
          <p className="text-sm text-muted">
            Ga in Search Console naar Instellingen, dan Gebruikers en machtigingen,
            en voeg dit adres toe met het recht <strong>Beperkt</strong>. Meer recht
            is niet nodig: ORBIT ENGINE leest alleen.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-url rounded-[var(--radius-md)] bg-[var(--bg-elevated)] px-2 py-1 text-sm">
              {serviceAccountEmail}
            </code>
            <button
              type="button"
              className="text-sm text-secondary hover:underline"
              onClick={() => void kopieer()}
            >
              {gekopieerd ? "Gekopieerd" : "Kopieer"}
            </button>
          </div>
        </div>
      ) : (
        <p
          className="card text-sm"
          style={{
            background: "var(--intent-warning-surface)",
            borderColor: "var(--intent-warning-border)",
          }}
        >
          De Google-sleutel is nog niet ingesteld. Zet <code>GOOGLE_SERVICE_ACCOUNT_JSON</code>{" "}
          in de omgevingsvariabelen; daarna verschijnt hier het adres dat de klant
          moet toevoegen.
        </p>
      )}

      {/* ── Stap 2: de property ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <label htmlFor="gsc-property" className="mono-label">
          2. Welke property is het?
        </label>
        <p className="text-sm text-muted">
          Neem hem letterlijk over uit Search Console. Een domein-property heet{" "}
          <code>sc-domain:voorbeeld.nl</code>, een adres-property{" "}
          <code>https://voorbeeld.nl/</code> met de schuine streep aan het eind.
        </p>
        <input
          id="gsc-property"
          className="field"
          value={waarde}
          onChange={(e) => setWaarde(e.target.value)}
          placeholder="sc-domain:voorbeeld.nl"
        />
        <button
          type="button"
          className="btn-primary btn-sm w-fit"
          onClick={() => void koppel()}
          disabled={busy || waarde.trim().length === 0 || !serviceAccountEmail}
        >
          {busy ? "Bezig met controleren…" : gekoppeld ? "Opnieuw controleren" : "Koppel en controleer"}
        </button>
      </div>

      {/* ⚠️ Zie de toelichting bovenaan dit bestand. */}
      <p className="text-sm text-muted">
        Google splitst klikken uit AI-antwoorden niet apart uit: die zitten in het
        gewone zoekverkeer. Hoe vaak een AI-assistent je noemt, meet ORBIT ENGINE zelf.
      </p>
    </div>
  );
}
