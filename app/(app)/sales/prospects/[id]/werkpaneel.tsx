"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import {
  STAND_TEKST,
  AFWIJS_LABEL,
  AFWIJS_REDENEN,
  volgendeStandenVoor,
  isOutreachStand,
  type OutreachStand,
  type AfwijsReden,
} from "@/lib/sales/workflow";

/**
 * Vanuit de analyse direct naar actie (plan §17.2).
 *
 * ── HET PRINCIPE ────────────────────────────────────────────────────────────
 *
 * "Vanuit de lijst en vanuit het dossier: bekijken, toewijzen, conceptmail
 * openen, mail aanpassen, verstuurd melden, status wijzigen, notitie toevoegen,
 * follow-up plannen." Zonder een ander scherm te hoeven zoeken. Een verkoper die
 * na het lezen van het bewijs eerst moet navigeren, doet het niet.
 *
 * ── ⚠️ ER IS GEEN KNOP DIE VERSTUURT, EN DIE KOMT ER NIET ───────────────────
 *
 * Plan 16.3, een vaste regel: de medewerker verstuurt de openingsmail altijd
 * zelf, vanuit zijn eigen mailbox, onder zijn eigen naam. Wat dit paneel doet is
 * het concept tonen, laten kopiëren, en registreren dat het eruit is. "Meld dat
 * je hem verstuurd hebt" is dus een registratie en geen opdracht aan het
 * systeem, en de tekst van de knop zegt dat ook.
 */
export interface WerkpaneelProps {
  opportunityId: string | null;
  outreach: {
    id: string;
    status: string;
    subject: string | null;
    bodyDraft: string | null;
    callPrep: {
      cijfers?: string[];
      openingen?: string[];
      bezwaren?: { bezwaar: string; antwoord: string }[];
      nietZeggen?: string[];
    } | null;
    contact: { naam: string; rol: string | null; email: string | null; magMailen: boolean; melding: string | null } | null;
  } | null;
}

export function Werkpaneel({ opportunityId, outreach }: WerkpaneelProps) {
  const router = useRouter();
  const toast = useToast();
  const [bezig, setBezig] = useState(false);
  const [tekst, setTekst] = useState(outreach?.bodyDraft ?? "");
  const [reden, setReden] = useState<AfwijsReden>("geen_interesse");

  async function pakOp() {
    if (!opportunityId) return;
    setBezig(true);
    try {
      const res = await fetch(`/api/sales/opportunities/${opportunityId}/assign`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: "Niet opgepakt", description: data.error, intent: "fout" });
        return;
      }
      toast({
        title: "Je hebt deze kans",
        description: "ORBIT ENGINE zoekt de contactpersoon en zet een concept klaar.",
        intent: "succes",
      });
      router.refresh();
    } catch {
      toast({ title: "De verbinding viel weg", intent: "fout" });
    } finally {
      setBezig(false);
    }
  }

  async function zetStatus(naar: OutreachStand, extra?: { reden?: string }) {
    if (!outreach) return;
    setBezig(true);
    try {
      const res = await fetch(`/api/sales/outreach/${outreach.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: naar,
          reden: extra?.reden,
          verstuurdeTekst: naar === "gemaild" ? tekst : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: "Niet opgeslagen", description: data.error, intent: "fout" });
        return;
      }
      router.refresh();
    } catch {
      toast({ title: "De verbinding viel weg", intent: "fout" });
    } finally {
      setBezig(false);
    }
  }

  if (!outreach) {
    return (
      <section className="card flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Pak deze kans op</h2>
          <p className="mt-1 text-secondary">
            Zodra je hem oppakt zoekt ORBIT ENGINE wie er bij dit bedrijf over de commercie gaat en
            zet een conceptmail plus een gespreksvoorbereiding klaar. Dat gebeurt bewust pas nu:
            voor bedrijven die niemand belt is dat weggegooid werk.
          </p>
        </div>
        <div>
          <button type="button" className="btn-primary" onClick={pakOp} disabled={bezig || !opportunityId}>
            {bezig ? "Bezig" : "Pak deze kans op"}
          </button>
        </div>
      </section>
    );
  }

  const stand = isOutreachStand(outreach.status) ? outreach.status : "nieuw";
  const volgende = volgendeStandenVoor(stand).filter((s) => s !== "afgewezen" && s !== "klant");

  return (
    <section className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Jouw werk</h2>
          <span className="chip chip-neutral">{STAND_TEKST[stand].label}</span>
        </div>
        <p className="text-secondary">{STAND_TEKST[stand].uitleg}</p>

        {/* ⚠️ De contactpersoon met zijn oordeel erbij. Een afgeleid adres dat
            niemand bevestigd heeft mag geen ontvanger zijn, en dat staat er dan
            ook zo bij (plan 9.4, regel 1). */}
        {outreach.contact ? (
          <div className="flex flex-col gap-1 text-sm">
            <p>
              <span className="font-medium">{outreach.contact.naam}</span>
              {outreach.contact.rol ? `, ${outreach.contact.rol}` : ""}
              {outreach.contact.email ? ` · ${outreach.contact.email}` : ""}
            </p>
            {!outreach.contact.magMailen && outreach.contact.melding && (
              <p className="text-muted">{outreach.contact.melding}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Er is nog geen contactpersoon gevonden. ORBIT ENGINE mailt niet naar een algemeen adres
            en gokt geen naam: zoek er zelf een op, of bel het bedrijf.
          </p>
        )}
      </div>

      {outreach.bodyDraft && (
        <div className="card flex flex-col gap-3">
          <div>
            <h3 className="font-semibold">Het concept</h3>
            <p className="mt-1 text-secondary">
              Lees hem na en pas hem aan. Versturen doe je zelf, vanuit je eigen mailbox: de
              ontvanger krijgt een bericht van jou en niet van een systeem.
            </p>
          </div>
          {outreach.subject && (
            <p className="text-sm">
              <span className="mono-label">Onderwerp</span> {outreach.subject}
            </p>
          )}
          <textarea
            className="field min-h-[14rem] font-mono text-sm"
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            aria-label="De tekst van de mail"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                void navigator.clipboard.writeText(tekst);
                toast({ title: "Gekopieerd", description: "Plak hem in je eigen mail." });
              }}
            >
              Kopieer de tekst
            </button>
            {stand === "toegewezen" && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => zetStatus("gemaild")}
                disabled={bezig}
              >
                Ik heb hem verstuurd
              </button>
            )}
          </div>
        </div>
      )}

      {outreach.callPrep && (
        <div className="card flex flex-col gap-3">
          <div>
            <h3 className="font-semibold">Als je belt</h3>
            <p className="mt-1 text-secondary">
              Houd dit open tijdens het gesprek. Elk cijfer hierin is tegen de meting gecontroleerd.
            </p>
          </div>
          {(outreach.callPrep.cijfers ?? []).length > 0 && (
            <div>
              <span className="mono-label">De cijfers die je paraat hebt</span>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {(outreach.callPrep.cijfers ?? []).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {(outreach.callPrep.openingen ?? []).length > 0 && (
            <div>
              <span className="mono-label">Openingen</span>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {(outreach.callPrep.openingen ?? []).map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          )}
          {(outreach.callPrep.bezwaren ?? []).length > 0 && (
            <div>
              <span className="mono-label">Bezwaren en antwoorden</span>
              <ul className="mt-1 flex flex-col gap-2 text-sm">
                {(outreach.callPrep.bezwaren ?? []).map((b) => (
                  <li key={b.bezwaar}>
                    <span className="font-medium">{b.bezwaar}</span>
                    <br />
                    {b.antwoord}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(outreach.callPrep.nietZeggen ?? []).length > 0 && (
            <div>
              {/* De grens van wat de meting draagt. Weten we niet hoeveel omzet
                  dit misloopt, dan zeg je dat niet, ook niet als het gesprek
                  erom vraagt (plan 16.5, blok 4). */}
              <span className="mono-label">Wat je niet moet zeggen</span>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {(outreach.callPrep.nietZeggen ?? []).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="card flex flex-col gap-3">
        <h3 className="font-semibold">Leg vast wat er gebeurd is</h3>
        <div className="flex flex-wrap gap-2">
          {volgende.map((s) => (
            <button
              key={s}
              type="button"
              className="btn-ghost"
              onClick={() => zetStatus(s)}
              disabled={bezig}
            >
              {STAND_TEKST[s].label}
            </button>
          ))}
        </div>

        {volgendeStandenVoor(stand).includes("afgewezen") && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
            {/* ⚠️ De reden is verplicht en komt uit een vaste lijst (plan 17.1).
                Zonder categorie is later niet te zien welk soort prospect
                afhaakt, en dan is er niets te leren. */}
            <select
              className="field w-auto"
              value={reden}
              onChange={(e) => setReden(e.target.value as AfwijsReden)}
              aria-label="De reden van de afwijzing"
            >
              {AFWIJS_REDENEN.map((r) => (
                <option key={r} value={r}>
                  {AFWIJS_LABEL[r]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => zetStatus("afgewezen", { reden })}
              disabled={bezig}
            >
              Afwijzen
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
