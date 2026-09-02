"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icon";
import { useRefresh } from "@/components/use-refresh";
import { MAX_LABELNAAM, normaliseerLabelnaam } from "@/lib/cluster-labels";
import type { ClusterLabel } from "@/lib/types/database";

/**
 * De labels van dit merk hernoemen en weggooien.
 *
 * ── WAAROM DIT EEN APART PANEEL IS EN GEEN POTLOODJE PER REGEL ──────────────
 *
 * Hernoemen en weggooien zijn zeldzaam: je bedenkt een label één keer en
 * gebruikt het daarna maanden. Een potloodje op elke regel van het
 * uitklapmenu zou dus op elke regel ruimte kosten voor iets wat bijna nooit
 * gebeurt, en het menu is juist de plek waar je snel wilt kiezen. Vandaar één
 * knop naast het filter die een lijstje openklapt.
 *
 * ── WAT WEGGOOIEN NIET DOET ─────────────────────────────────────────────────
 *
 * Geen enkel cluster raakt weg. `on delete set null` in migratie 0083 haalt
 * alleen het label eraf. Dat staat ook letterlijk in de bevestiging, want
 * zonder die zin durft niemand de knop te gebruiken.
 */
export function LabelBeheer({
  merkId,
  labels,
  aantalPerLabel,
  onSluiten,
}: {
  merkId: string;
  labels: ClusterLabel[];
  /** Hoeveel clusters er in de huidige lijst onder dit label staan. */
  aantalPerLabel: Record<string, number>;
  onSluiten: () => void;
}) {
  const { refresh, refreshing } = useRefresh();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [hernoemt, setHernoemt] = useState<{ id: string; naam: string } | null>(null);
  const [weggooien, setWeggooien] = useState<ClusterLabel | null>(null);

  const opSlot = bezig || refreshing;

  async function hernoem() {
    if (!hernoemt) return;
    const naam = normaliseerLabelnaam(hernoemt.naam);
    if (!naam) {
      setFout("Vul een labelnaam in.");
      return;
    }
    setFout(null);
    setBezig(true);
    try {
      const res = await fetch(`/api/profiles/${merkId}/labels/${hernoemt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: naam }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFout(json.error ?? "Hernoemen is niet gelukt.");
        return;
      }
      setHernoemt(null);
      refresh();
    } catch {
      setFout("We konden ORBIT ENGINE niet bereiken. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  async function gooiWeg() {
    if (!weggooien) return;
    setFout(null);
    setBezig(true);
    try {
      const res = await fetch(`/api/profiles/${merkId}/labels/${weggooien.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        setFout(json.error ?? "Verwijderen is niet gelukt.");
        return;
      }
      setWeggooien(null);
      refresh();
    } catch {
      setFout("We konden ORBIT ENGINE niet bereiken. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <span className="mono-label">Labels van dit merk</span>
        <button type="button" className="btn-ghost btn-sm" onClick={onSluiten} disabled={opSlot}>
          <Icon naam="sluiten" size={14} />
          Sluiten
        </button>
      </div>

      {labels.length === 0 ? (
        <p className="text-secondary">
          Je hebt nog geen labels. Je maakt er één bij een cluster in de lijst hieronder, of bij het
          aanmaken van een nieuw cluster.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {labels.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2">
              {hernoemt?.id === l.id ? (
                <>
                  <input
                    type="text"
                    value={hernoemt.naam}
                    onChange={(e) => setHernoemt({ id: l.id, naam: e.target.value })}
                    maxLength={MAX_LABELNAAM}
                    className="field w-auto"
                    aria-label={`Nieuwe naam voor ${l.name}`}
                    autoFocus
                  />
                  <button type="button" className="btn-primary btn-sm" disabled={opSlot} onClick={hernoem}>
                    {opSlot ? "Bezig…" : "Opslaan"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    disabled={opSlot}
                    onClick={() => setHernoemt(null)}
                  >
                    Annuleren
                  </button>
                </>
              ) : (
                <>
                  <span className="chip chip-neutral">
                    <Icon naam="label" size={12} />
                    {l.name}
                  </span>
                  <span className="text-sm text-muted">
                    {aantalPerLabel[l.id] === 1
                      ? "1 cluster"
                      : `${aantalPerLabel[l.id] ?? 0} clusters`}
                  </span>
                  <button
                    type="button"
                    className="btn-outline btn-sm ml-auto"
                    disabled={opSlot}
                    onClick={() => setHernoemt({ id: l.id, naam: l.name })}
                  >
                    Hernoemen
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    disabled={opSlot}
                    onClick={() => setWeggooien(l)}
                  >
                    <Icon naam="prullenbak" size={14} />
                    Verwijderen
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {fout && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {fout}
        </p>
      )}

      {/* ⚠️ Bewust ZONDER het `irreversible`-blok: er gaat geen cluster verloren,
          dus een rood kader met "dit kun je niet terugdraaien" zou iets ergers
          beweren dan er gebeurt. Het label zelf is zo weer aangemaakt. */}
      <ConfirmDialog
        open={weggooien !== null}
        title={weggooien ? `Label "${weggooien.name}" verwijderen?` : ""}
        body={
          "Je clusters blijven gewoon staan, ze hebben daarna alleen geen label meer. Er wordt " +
          "niets gestopt en er gaat geen meting verloren. Wil je later opnieuw groeperen, dan maak " +
          "je het label zo weer aan."
        }
        confirmLabel="Label verwijderen"
        confirmingLabel="Bezig…"
        busy={opSlot}
        danger
        onConfirm={gooiWeg}
        onCancel={() => setWeggooien(null)}
      />
    </div>
  );
}
