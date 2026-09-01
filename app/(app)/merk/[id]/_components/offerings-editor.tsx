"use client";

import { useState } from "react";
import { useRefresh } from "@/components/use-refresh";
import { OFFERING_KINDS, type OfferingKind } from "@/lib/offerings-validate";
import type { OfferingCoverage } from "@/lib/pipeline/structure-gap";
import type { ProfileOffering } from "@/lib/types/database";

/** Alleen het pad, want het domein staat overal hetzelfde bovenaan. */
function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? u.hostname : u.pathname;
  } catch {
    return url;
  }
}

const KIND_LABELS: Record<OfferingKind, string> = {
  dienst: "dienst",
  product: "product",
  categorie: "categorie",
  merk: "merk",
  vestiging: "vestiging",
};

interface FormValues {
  name: string;
  kind: OfferingKind;
  parentId: string;
  description: string;
  audience: string;
  priceIndication: string;
  note: string;
}

const LEEG: FormValues = {
  name: "",
  kind: "dienst",
  parentId: "",
  description: "",
  audience: "",
  priceIndication: "",
  note: "",
};

function toForm(o: ProfileOffering): FormValues {
  return {
    name: o.name,
    kind: o.kind,
    parentId: o.parent_id ?? "",
    description: o.description ?? "",
    audience: o.audience ?? "",
    priceIndication: o.price_indication ?? "",
    note: o.note ?? "",
  };
}

/**
 * De aanbodboom bewerken: toevoegen, wijzigen, verwijderen (onboarding
 * Ronde C, §16.7).
 *
 * ── WAAROM ÉÉN CLIENT-COMPONENT EN NIET DRIE ────────────────────────────────
 *
 * Toevoegen, bewerken en verwijderen delen hetzelfde formulier (naam, soort,
 * omschrijving, voor wie, prijsindicatie, notitie, bovenliggende knoop) en
 * dezelfde route. Drie losse componenten zouden die vorm drie keer opnieuw
 * opschrijven en gegarandeerd uit elkaar laten lopen.
 *
 * ── OPSLAAN PER KNOOP, ZOALS DE ONBOARDINGVELDEN ────────────────────────────
 *
 * Geen aparte opslaanknop per formulier: het potlood opent het blok als
 * formulier, en "Opslaan" bevestigt in dezelfde beweging. Bij een fout blijft
 * het formulier open met de melding erbij, zodat er niets getypt verloren gaat.
 */
export function OfferingsEditor({
  profileId,
  offerings,
  removedOfferings,
  dekkingPerId,
}: {
  profileId: string;
  /** De actieve boom, plat, in `sort_order`. */
  offerings: ProfileOffering[];
  removedOfferings: ProfileOffering[];
  /** Welke knopen geen (goede) eigen pagina hebben (`structure-gap.ts`). */
  dekkingPerId?: Map<string, OfferingCoverage>;
}) {
  const { refresh, refreshing } = useRefresh();
  const [bewerktId, setBewerktId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(LEEG);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [toevoegen, setToevoegen] = useState(false);
  const [toonVerwijderd, setToonVerwijderd] = useState(false);
  const wacht = bezig || refreshing;

  const byParent = new Map<string | null, ProfileOffering[]>();
  for (const o of offerings) {
    const list = byParent.get(o.parent_id) ?? [];
    list.push(o);
    byParent.set(o.parent_id, list);
  }
  const roots = byParent.get(null) ?? [];

  function beginBewerken(o: ProfileOffering) {
    setToevoegen(false);
    setFout(null);
    setBewerktId(o.id);
    setForm(toForm(o));
  }

  function beginToevoegen(onderParentId: string | null) {
    setBewerktId(null);
    setFout(null);
    setToevoegen(true);
    setForm({ ...LEEG, parentId: onderParentId ?? "" });
  }

  function annuleer() {
    setBewerktId(null);
    setToevoegen(false);
    setFout(null);
  }

  async function opslaan() {
    if (!form.name.trim()) {
      setFout("Vul een naam in.");
      return;
    }
    setBezig(true);
    setFout(null);
    try {
      const body = {
        name: form.name,
        kind: form.kind,
        parentId: form.parentId || null,
        description: form.description,
        audience: form.audience,
        priceIndication: form.priceIndication,
        note: form.note,
      };
      const res = await fetch(`/api/profiles/${profileId}/offerings`, {
        method: bewerktId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bewerktId ? { id: bewerktId, ...body } : body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(json.error ?? "Opslaan is niet gelukt.");
        return;
      }
      setBewerktId(null);
      setToevoegen(false);
      refresh();
    } catch {
      setFout("We konden ORBIT ENGINE niet bereiken. Controleer je verbinding en probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  async function verwijder(o: ProfileOffering) {
    const kinderen = offerings.filter((x) => x.parent_id === o.id).length;
    const vraag =
      kinderen > 0
        ? `${o.name} verwijderen? De ${kinderen} onderliggende onderdelen gaan mee.`
        : `${o.name} verwijderen?`;
    if (!window.confirm(vraag)) return;

    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/offerings`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: o.id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setFout(json.error ?? "Verwijderen is niet gelukt.");
        return;
      }
      refresh();
    } catch {
      setFout("We konden ORBIT ENGINE niet bereiken.");
    } finally {
      setBezig(false);
    }
  }

  async function zetTerug(o: ProfileOffering) {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/offerings`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: o.id, restore: true }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setFout(json.error ?? "Terugzetten is niet gelukt.");
        return;
      }
      refresh();
    } catch {
      setFout("We konden ORBIT ENGINE niet bereiken.");
    } finally {
      setBezig(false);
    }
  }

  function renderForm() {
    return (
      <div className="mt-2 flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="mono-label">Naam</span>
            <input
              className="field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={wacht}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="mono-label">Soort</span>
            <select
              className="field"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as OfferingKind })}
              disabled={wacht}
            >
              {OFFERING_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="mono-label">Hangt onder</span>
          <select
            className="field"
            value={form.parentId}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            disabled={wacht}
          >
            <option value="">geen, dit is een hoofdknoop</option>
            {offerings
              .filter((o) => o.id !== bewerktId)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="mono-label">Omschrijving</span>
          <textarea
            className="field min-h-16"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={wacht}
          />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="mono-label">Voor wie</span>
            <input
              className="field"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
              disabled={wacht}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="mono-label">Prijsindicatie</span>
            <input
              className="field"
              value={form.priceIndication}
              onChange={(e) => setForm({ ...form, priceIndication: e.target.value })}
              disabled={wacht}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="mono-label">Notitie uit het gesprek</span>
          <textarea
            className="field min-h-16"
            placeholder="Bijvoorbeeld: levert 40 procent van de omzet, staat niet op de site"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            disabled={wacht}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary btn-sm disabled:opacity-60"
            disabled={wacht || !form.name.trim()}
            onClick={() => void opslaan()}
          >
            {wacht ? "Bezig…" : "Opslaan"}
          </button>
          <button type="button" className="btn-outline btn-sm" disabled={wacht} onClick={annuleer}>
            Annuleren
          </button>
        </div>
      </div>
    );
  }

  function renderNode(o: ProfileOffering, depth: number) {
    const kinderen = byParent.get(o.id) ?? [];
    const dekking = dekkingPerId?.get(o.id);
    return (
      <li key={o.id} className="flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="chip chip-neutral">{KIND_LABELS[o.kind]}</span>
            <span className="font-medium">{o.name}</span>
            {o.price_indication && (
              <span className="mono-label text-muted">{o.price_indication}</span>
            )}
            {o.source !== "ai" && <span className="chip chip-green">{o.source}</span>}
            {dekking?.dekking === "ontbreekt" && (
              <span className="chip chip-warning" title={dekking.reason}>
                geen eigen pagina
              </span>
            )}
            {dekking?.dekking === "zwak_gedekt" && (
              <span className="chip chip-neutral" title={dekking.reason}>
                zwak gedekt
              </span>
            )}
          </span>
          <span className="flex shrink-0 gap-3 text-sm">
            <button
              type="button"
              className="text-muted hover:text-[var(--text-primary)]"
              onClick={() => beginBewerken(o)}
              disabled={wacht}
            >
              bewerken
            </button>
            <button
              type="button"
              className="text-muted hover:text-[var(--status-error)]"
              onClick={() => void verwijder(o)}
              disabled={wacht}
            >
              verwijderen
            </button>
          </span>
        </div>
        {(o.description || o.audience || o.note || o.evidence_url) && (
          <div className="mt-1 flex flex-col gap-1">
            {o.description && <p className="text-sm text-secondary">{o.description}</p>}
            {o.audience && (
              <p className="text-sm text-muted">
                <span className="mono-label">voor</span> {o.audience}
              </p>
            )}
            {o.note && (
              <p className="text-sm text-muted">
                <span className="mono-label">notitie</span> {o.note}
              </p>
            )}
            {o.evidence_url && (
              <a
                href={o.evidence_url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm text-[var(--intent-intelligence-text)] hover:underline"
              >
                gevonden op {shortUrl(o.evidence_url)}
              </a>
            )}
          </div>
        )}
        {bewerktId === o.id && renderForm()}
        {kinderen.length > 0 && (
          <ul className="mt-2 flex flex-col gap-2 border-l border-[var(--border-subtle)] pl-4">
            {kinderen.map((k) => renderNode(k, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {offerings.length > 0 && (
        <ul className="flex flex-col gap-2">{roots.map((o) => renderNode(o, 0))}</ul>
      )}

      {!toevoegen ? (
        <button
          type="button"
          className="btn-outline btn-sm w-fit"
          onClick={() => beginToevoegen(null)}
          disabled={wacht}
        >
          Dienst of product toevoegen
        </button>
      ) : (
        renderForm()
      )}

      {fout && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {fout}
        </p>
      )}

      {removedOfferings.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
          {!toonVerwijderd ? (
            <button
              type="button"
              className="mono-label text-muted hover:text-[var(--text-primary)] w-fit"
              onClick={() => setToonVerwijderd(true)}
            >
              {removedOfferings.length} verwijderd, tonen
            </button>
          ) : (
            <>
              <span className="mono-label text-muted">Verwijderd</span>
              <ul className="flex flex-col gap-1">
                {removedOfferings.map((o) => (
                  <li key={o.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-muted line-through">{o.name}</span>
                    <button
                      type="button"
                      className="shrink-0 text-[var(--intent-intelligence-text)] hover:underline"
                      onClick={() => void zetTerug(o)}
                      disabled={wacht}
                    >
                      terugzetten
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
