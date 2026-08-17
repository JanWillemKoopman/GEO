"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { monthsSinceStart, isActiveAccount } from "@/lib/account-status";
import type { Account } from "@/lib/types/database";

/**
 * De bedrijfsgegevens van één account (fase 7, uitgesteld uit fase 3).
 *
 * ── WAT HIER WEL EN NIET IN ZIT ─────────────────────────────────────────────
 *
 * De velden komen uit de inventaris in `docs/Nova.md` §13.1: wat InSpace in hun
 * onboarding uitvraagt, vertaald naar ORBIT ENGINE. Ze staan hier en niet in de
 * merkwizard, want ze horen bij het bedrijf en niet bij één website: een bureau
 * met vijf merken factureert één keer (besluit 9).
 *
 * ⚠️ Het btw-nummer heeft een apart vinkje "niet van toepassing", precies zoals
 * Nova. Het verschil tussen "nog niet ingevuld" en "bestaat niet" is hier echt:
 * een stichting hééft geen btw-nummer, en één leeg veld zou die twee op één hoop
 * gooien en het scherm eeuwig onaf laten lijken.
 *
 * ── OPZEGGEN IS EEN DATUM, GEEN KNOP DIE IETS WEGGOOIT ──────────────────────
 *
 * Besluit 14: opzeggen verwijdert niets en sluit niets af op de dag zelf. Tot de
 * opzegdatum verandert er niets aan wat de klant ziet. Dat staat ook in de
 * bevestiging, want "abonnement opzeggen" leest anders als "alles kwijt".
 */
export function AccountBox({
  account,
  mayEdit,
}: {
  account: Account;
  /** Alleen een admin van dit account mag wijzigen. Een member leest mee. */
  mayEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [opzegDialoog, setOpzegDialoog] = useState(false);
  const [form, setForm] = useState({
    legal_name: account.legal_name ?? "",
    address: account.address ?? "",
    postal_code: account.postal_code ?? "",
    city: account.city ?? "",
    country: account.country ?? "Nederland",
    vat_number: account.vat_number ?? "",
    vat_not_applicable: account.vat_not_applicable,
    invoice_email: account.invoice_email ?? "",
    contact_person: account.contact_person ?? "",
    contact_phone: account.contact_phone ?? "",
  });

  const actief = isActiveAccount(account);
  const maand = monthsSinceStart(account);

  async function bewaar() {
    setBusy(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast({
          intent: "fout",
          title: "Opslaan lukte niet",
          description: j?.error ?? "Probeer het opnieuw.",
        });
        return;
      }
      toast({ intent: "succes", title: "Opgeslagen", description: "Je bedrijfsgegevens staan bij." });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function zegOp() {
    setBusy(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel: true }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        toast({
          intent: "fout",
          title: "Opzeggen lukte niet",
          description: j?.error ?? "Probeer het opnieuw.",
        });
        return;
      }
      toast({
        intent: "succes",
        title: "Het abonnement is opgezegd",
        description: "Tot het einde van de betaalde maand verandert er niets aan wat je ziet.",
      });
      router.refresh();
    } finally {
      setBusy(false);
      setOpzegDialoog(false);
    }
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="mono-label">Bedrijfsgegevens · {account.name}</span>
        {/* Besluit 7: "maand 4 sinds de start", nooit "van 12". Een teller die
            zegt hoeveel je nog tegoed hebt, suggereert een contract dat er niet is. */}
        {maand !== null && (
          <span className="text-sm text-muted">
            {actief ? `Maand ${maand} sinds de start` : "Opgezegd"}
          </span>
        )}
      </div>

      {account.package_pages_per_month && (
        <p className="text-secondary">
          Je pakket: {account.package_pages_per_month} pagina&apos;s per maand.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Veld label="Bedrijfsnaam volgens de KvK" waarde={form.legal_name} zetWaarde={(v) => setForm({ ...form, legal_name: v })} mag={mayEdit} />
        <Veld label="Contactpersoon" waarde={form.contact_person} zetWaarde={(v) => setForm({ ...form, contact_person: v })} mag={mayEdit} />
        <Veld label="Adres" waarde={form.address} zetWaarde={(v) => setForm({ ...form, address: v })} mag={mayEdit} />
        <Veld label="Postcode" waarde={form.postal_code} zetWaarde={(v) => setForm({ ...form, postal_code: v })} mag={mayEdit} />
        <Veld label="Plaats" waarde={form.city} zetWaarde={(v) => setForm({ ...form, city: v })} mag={mayEdit} />
        <Veld label="Land" waarde={form.country} zetWaarde={(v) => setForm({ ...form, country: v })} mag={mayEdit} />
        <Veld label="Factuuradres (e-mail)" waarde={form.invoice_email} zetWaarde={(v) => setForm({ ...form, invoice_email: v })} mag={mayEdit} type="email" />
        <Veld label="Telefoon" waarde={form.contact_phone} zetWaarde={(v) => setForm({ ...form, contact_phone: v })} mag={mayEdit} type="tel" />
      </div>

      {/* ⚠️ Zie de toelichting bovenaan: het vinkje is het verschil tussen "nog
          niet ingevuld" en "bestaat niet". */}
      <div className="flex flex-col gap-2">
        <Veld
          label="Btw-nummer"
          waarde={form.vat_number}
          zetWaarde={(v) => setForm({ ...form, vat_number: v })}
          mag={mayEdit && !form.vat_not_applicable}
        />
        <label className="flex items-center gap-2 text-sm text-secondary">
          <input
            type="checkbox"
            checked={form.vat_not_applicable}
            disabled={!mayEdit}
            onChange={(e) =>
              setForm({
                ...form,
                vat_not_applicable: e.target.checked,
                vat_number: e.target.checked ? "" : form.vat_number,
              })
            }
          />
          Wij hebben geen btw-nummer
        </label>
      </div>

      {mayEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary btn-sm w-fit" onClick={() => void bewaar()} disabled={busy}>
            {busy ? "Bezig…" : "Bewaar"}
          </button>
          {actief && (
            <button
              type="button"
              className="text-sm text-secondary hover:underline"
              onClick={() => setOpzegDialoog(true)}
              disabled={busy}
            >
              Abonnement opzeggen
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={opzegDialoog}
        title="Abonnement opzeggen"
        body="Je zegt het abonnement van dit account op. Je merken, metingen, rapporten en geschreven pagina's blijven allemaal staan."
        irreversible={{
          title: "Wat er wél verandert",
          description:
            "Aan het einde van de betaalde maand stopt ORBIT ENGINE met meten en schrijven. Tot dat moment verandert er niets aan wat je ziet.",
        }}
        confirmLabel="Ja, zeg op"
        confirmingLabel="Bezig…"
        busy={busy}
        onCancel={() => setOpzegDialoog(false)}
        onConfirm={() => void zegOp()}
      />
    </div>
  );
}

function Veld({
  label,
  waarde,
  zetWaarde,
  mag,
  type = "text",
}: {
  label: string;
  waarde: string;
  zetWaarde: (v: string) => void;
  mag: boolean;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-secondary">{label}</span>
      <input
        className="field"
        type={type}
        value={waarde}
        disabled={!mag}
        onChange={(e) => zetWaarde(e.target.value)}
      />
    </label>
  );
}
