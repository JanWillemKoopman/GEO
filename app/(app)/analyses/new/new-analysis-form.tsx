"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClusterLabel, Profile } from "@/lib/types/database";
import { MAX_LABELNAAM, sorteerLabels } from "@/lib/cluster-labels";

/** De waarde van de keuzelijst die zegt: ik typ er zelf een nieuwe. */
const NIEUW_LABEL = "__nieuw__";

export function NewAnalysisForm({
  profiles,
  labelsPerMerk,
  initialProfileId,
  /** Uit tijdens het bouwen (EMAILS_ENABLED). Dan tonen we het mailvinkje niet. */
  emailsEnabled = false,
}: {
  profiles: Profile[];
  /**
   * De bestaande labels per merk-id (migratie 0083). Per merk en niet één
   * lijst, want een label van merk A hoort niet in de keuzelijst van merk B.
   */
  labelsPerMerk: Record<string, ClusterLabel[]>;
  /** Het merk waar de klant vandaan kwam, zodat hij het niet opnieuw kiest. */
  initialProfileId?: string;
  emailsEnabled?: boolean;
}) {
  const router = useRouter();
  const [profileId, setProfileId] = useState(
    profiles.find((p) => p.id === initialProfileId)?.id ?? profiles[0]?.id ?? "",
  );
  const [topic, setTopic] = useState("");
  const [contentBrief, setContentBrief] = useState("");
  // Het label (migratie 0083). Leeg = geen label, `NIEUW_LABEL` = het tekstveld
  // eronder telt. Labels zijn optioneel: wie er één cluster heeft, heeft niets
  // te groeperen.
  const [labelKeuze, setLabelKeuze] = useState("");
  const [nieuwLabel, setNieuwLabel] = useState("");
  // Standaard aan: een analyse duurt minuten, dus je wilt bericht als het klaar is.
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const labels = sorteerLabels(labelsPerMerk[profileId] ?? []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          topic,
          content_brief: contentBrief,
          notify_by_email: notifyByEmail,
          label_id: labelKeuze === NIEUW_LABEL ? "" : labelKeuze,
          label_name: labelKeuze === NIEUW_LABEL ? nieuwLabel : "",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Er ging iets mis.");
        setPending(false);
        return;
      }
      router.push(`/analyses/${json.id}`);
    } catch {
      setError("We konden ORBIT ENGINE niet bereiken. Controleer je verbinding en probeer het opnieuw.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Merk *</span>
        <select
          required
          value={profileId}
          onChange={(e) => {
            // Een ander merk heeft andere labels, dus de keuze vervalt. Zonder
            // dit blijft er een label-id staan dat bij het nieuwe merk niet
            // bestaat, en dan weigert de route hem terecht.
            setProfileId(e.target.value);
            setLabelKeuze("");
            setNieuwLabel("");
          }}
          className="field"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.url})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Product of onderwerp *</span>
        <input
          type="text"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="bijv. iPhone, smartphone-reparatie"
          className="field"
          autoFocus
        />
        <span className="text-sm text-muted">
          Eén cluster = één product of onderwerp. Scherp afbakenen levert scherpere vragen op.
        </span>
      </label>

      {/* Het label (migratie 0083). Onder het onderwerp en niet erboven: eerst
          waar dit cluster over gaat, dan waar het bij hoort. Optioneel, en dat
          staat er ook, want bij het eerste cluster valt er niets te groeperen. */}
      <div className="flex flex-col gap-1.5">
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Label (optioneel)</span>
          <select
            value={labelKeuze}
            onChange={(e) => setLabelKeuze(e.target.value)}
            className="field"
          >
            <option value="">Geen label</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
            <option value={NIEUW_LABEL}>+ Nieuw label maken</option>
          </select>
        </label>

        {labelKeuze === NIEUW_LABEL && (
          <input
            type="text"
            value={nieuwLabel}
            onChange={(e) => setNieuwLabel(e.target.value)}
            maxLength={MAX_LABELNAAM}
            placeholder="bijv. Onderhoud"
            className="field"
            aria-label="Naam van het nieuwe label"
          />
        )}

        <span className="text-sm text-muted">
          Een label groepeert clusters op onderwerp. Zo blijft het overzicht leesbaar zodra je er
          veel hebt. Je kunt het later altijd nog aanpassen.
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Wat voor content wil je? (optioneel)</span>
        <textarea
          value={contentBrief}
          onChange={(e) => setContentBrief(e.target.value)}
          rows={4}
          placeholder={
            "bijv. 'Richt de content op sollicitanten die zich voorbereiden op een gesprek " +
            "(hoe kleed ik me, welke vragen kan ik verwachten), niet op algemene info voor wie " +
            "niet actief naar werk zoekt.'"
          }
          className="field"
        />
        <span className="text-sm text-muted">
          Bepaal de hoek en de doelgroep. ORBIT ENGINE neemt dit mee in de vragen die het stelt, in de
          aanbevelingen én in de content die het schrijft.
        </span>
      </label>

      {/* Bericht als het klaar is (optimalisatie.md 1.8). Het werk draait op de
          achtergrond en duurt minuten. Dan hoort de klant te weten wanneer hij
          terug kan komen, in plaats van te moeten blijven kijken.

          Staat de mail uit (EMAILS_ENABLED), dan verdwijnt het vinkje: een vakje
          aanvinken waar niets van komt, is een belofte die de app niet nakomt. */}
      {emailsEnabled && (
        <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
          <input
            type="checkbox"
            checked={notifyByEmail}
            onChange={(e) => setNotifyByEmail(e.target.checked)}
            className="mt-0.5"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Mail me zodra het rapport klaar is</span>
            <span className="text-sm text-muted">
              ORBIT ENGINE werkt op de achtergrond door, ook als je dit scherm sluit. Blijven wachten hoeft
              niet, je krijgt bericht.
            </span>
          </span>
        </label>
      )}

      {error && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary btn-lg w-full disabled:opacity-60">
        {pending ? "Cluster aanmaken…" : "Start cluster"}
      </button>
    </form>
  );
}
