"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";

/**
 * Een klant volledig verwijderen (F4, AVG-plicht).
 *
 * ── WAAROM DIT ONDERAAN HET BEHEERSCHERM STAAT ──────────────────────────────
 *
 * Niet in het accountscherm van de klant zelf, om twee redenen. De klant mag
 * dit niet (het is een handeling van de beheerder), en een beheerder mag zijn
 * eigen account niet verwijderen omdat hij daarmee zijn eigen inlog weggooit.
 * Het hoort dus op het enige scherm dat alle klanten naast elkaar toont.
 *
 * ── WAT HET SCHERM DOET VOORDAT ER IETS WEGGAAT ─────────────────────────────
 *
 * Eerst opvragen wát er verdwijnt, met aantallen. "Dit verwijdert 3 merken, 5
 * analyses en 412 metingen" is een ander besluit dan "dit verwijdert een
 * account", en het verschil hoort op het scherm te staan en niet in het hoofd
 * van degene die klikt.
 *
 * Daarna de naam overtypen. Dat is K4 uit `docs/tasks/lanceerplan.md`
 * (onomkeerbaar wordt vooraf benoemd, in een eigen blok) en het is de reden dat
 * `ConfirmDialog` een `irreversible`-blok en een `children`-vak heeft.
 */
export interface DeletableAccount {
  id: string;
  name: string;
}

interface Plan {
  accountName: string;
  regels: string[];
  waarschuwing: string;
  blokkade: string | null;
}

export function DeleteAccountBox({ accounts }: { accounts: DeletableAccount[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [gekozen, setGekozen] = useState<DeletableAccount | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [getypt, setGetypt] = useState("");
  const [bezig, setBezig] = useState(false);
  const [laden, setLaden] = useState(false);

  async function start(account: DeletableAccount) {
    setGekozen(account);
    setGetypt("");
    setPlan(null);
    setLaden(true);
    setOpen(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}?plan=verwijderen`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Ophalen mislukt", description: json.error ?? "Onbekende fout.", intent: "fout" });
        setOpen(false);
        return;
      }
      setPlan(json as Plan);
    } catch {
      toast({
        title: "Ophalen mislukt",
        description: "Er is geen verbinding met de server. Probeer het opnieuw.",
        intent: "fout",
      });
      setOpen(false);
    } finally {
      setLaden(false);
    }
  }

  async function verwijder() {
    if (!gekozen) return;
    setBezig(true);
    try {
      const res = await fetch(`/api/accounts/${gekozen.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bevestiging: getypt }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Verwijderen mislukt", description: json.error ?? "Onbekende fout.", intent: "fout" });
        return;
      }
      toast({
        title: `${gekozen.name} is verwijderd`,
        description: `${json.merken} ${json.merken === 1 ? "merk" : "merken"} en ${json.gebruikersVerwijderd} ${
          json.gebruikersVerwijderd === 1 ? "inlogaccount" : "inlogaccounts"
        } zijn weggehaald.`,
      });
      setOpen(false);
      router.refresh();
    } catch {
      toast({
        title: "Verwijderen mislukt",
        description: "Er is geen verbinding met de server. Controleer of het account er nog staat.",
        intent: "fout",
      });
    } finally {
      setBezig(false);
    }
  }

  if (accounts.length === 0) return null;

  const magWeg = plan !== null && plan.blokkade === null;
  const naamKlopt = plan !== null && getypt.trim() === plan.accountName.trim() && plan.accountName !== "";

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="mono-label">Een klant verwijderen</h2>
        <p className="text-sm text-muted">
        Dit haalt het account, alle merken, alle metingen en alle inlogaccounts definitief weg. Wil je
          een klant alleen uit beeld hebben, gebruik dan archiveren: dat bewaart alles.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-4 text-sm">
            <span>{a.name}</span>
            <button
              type="button"
              onClick={() => void start(a)}
              className="btn-outline btn-sm"
            >
              Verwijderen
            </button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={open}
        title={`${gekozen?.name ?? "Klant"} verwijderen`}
        body={
          laden
            ? "Aura kijkt na wat er aan deze klant vasthangt."
            : (plan?.blokkade ?? plan?.waarschuwing ?? "")
        }
        irreversible={
          magWeg
            ? {
                title: "Dit kan niet terug",
                description: `Wat verdwijnt: ${plan?.regels.join(", ")}. Er is geen prullenbak en geen herstel.`,
              }
            : undefined
        }
        confirmLabel="Definitief verwijderen"
        confirmingLabel="Bezig met verwijderen"
        busy={bezig}
        danger
        onConfirm={() => void verwijder()}
        onCancel={() => setOpen(false)}
      >
        {magWeg ? (
          <label className="flex flex-col gap-1.5 text-sm">
            <span>
              Typ <strong>{plan?.accountName}</strong> over om te bevestigen.
            </span>
            <input
              value={getypt}
              onChange={(e) => setGetypt(e.target.value)}
              autoComplete="off"
              className="field"
              placeholder={plan?.accountName}
            />
            {/* De knop blijft aanklikbaar; de server controleert de naam ook. Een
                knop die uitgaat zonder te zeggen waarom, is een raadsel. */}
            {getypt.length > 0 && !naamKlopt ? (
              <span className="text-sm" style={{ color: "var(--intent-danger-text)" }}>
                De naam komt nog niet overeen.
              </span>
            ) : null}
          </label>
        ) : null}
      </ConfirmDialog>
    </section>
  );
}
