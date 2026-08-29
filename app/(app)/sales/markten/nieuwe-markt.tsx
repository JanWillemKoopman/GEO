"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import {
  STRAAL_STANDAARD,
  controleerMarktInvoer,
  standaardLabel,
} from "@/lib/sales/market";

/**
 * Een markt aanmaken: branche, plaats, straal.
 *
 * ── DEZELFDE CONTROLE HIER EN OP DE SERVER, EN DAT IS GEEN VERDUBBELING ─────
 *
 * `controleerMarktInvoer()` staat in een pure module en draait op allebei de
 * plekken (conventie 2). Hier zodat je de fout ziet vóórdat je op de knop drukt,
 * en op de server omdat een controle in de browser geen controle is. Zou het
 * twee stukken code zijn, dan zouden ze uit elkaar lopen en zou de browser iets
 * doorlaten dat de server weigert, of erger, andersom.
 *
 * ⚠️ Deze knop kost nog niets. Het onderzoek naar de markt komt in sprint 2, en
 * dat is het moment dat er een kostenraming bij hoort. Er staat hier dus ook
 * geen bedrag: een bedrag noemen dat nergens op slaat is erger dan geen bedrag.
 */
export function NieuweMarkt() {
  const router = useRouter();
  const toast = useToast();
  const [branche, setBranche] = useState("");
  const [plaats, setPlaats] = useState("");
  const [straal, setStraal] = useState(String(STRAAL_STANDAARD));
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<{ veld: string; melding: string } | null>(null);

  // Het voorstel dat straks in de lijst komt te staan. Zichtbaar terwijl je
  // typt, zodat niemand zich hoeft af te vragen hoe de markt gaat heten.
  const voorstel = branche.trim() && plaats.trim() ? standaardLabel(branche, plaats) : "";

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);

    const uitkomst = controleerMarktInvoer({
      branche,
      plaats,
      straalKm: Number.parseInt(straal, 10),
    });
    if (!uitkomst.ok) {
      setFout({ veld: uitkomst.veld, melding: uitkomst.melding });
      return;
    }

    setBezig(true);
    try {
      const res = await fetch("/api/sales/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branche: uitkomst.branche,
          plaats: uitkomst.plaats,
          straalKm: uitkomst.straalKm,
        }),
      });
      const data = (await res.json()) as { error?: string; veld?: string };
      if (!res.ok) {
        setFout({ veld: data.veld ?? "branche", melding: data.error ?? "Het opslaan is niet gelukt." });
        return;
      }
      toast({
        title: `${uitkomst.label} staat klaar`,
        description: "De markt is aangemaakt. Het onderzoek naar de bedrijven volgt in een latere stap.",
        intent: "succes",
      });
      setBranche("");
      setPlaats("");
      setStraal(String(STRAAL_STANDAARD));
      router.refresh();
    } catch {
      setFout({ veld: "branche", melding: "De verbinding viel weg. Probeer het opnieuw." });
    } finally {
      setBezig(false);
    }
  }

  return (
    <form onSubmit={verstuur} className="card flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Nieuwe markt</h2>
        <p className="mt-1 text-secondary">
          Een branche, een plaats en de straal eromheen. Meer heeft ORBIT ENGINE niet nodig om een
          markt af te bakenen.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Branche</span>
          <input
            className="field"
            value={branche}
            onChange={(e) => setBranche(e.target.value)}
            placeholder="makelaar"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Plaats</span>
          <input
            className="field"
            value={plaats}
            onChange={(e) => setPlaats(e.target.value)}
            placeholder="Eindhoven"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Straal in km</span>
          <input
            className="field"
            value={straal}
            onChange={(e) => setStraal(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
          />
        </label>
      </div>

      {voorstel && (
        <p className="text-sm text-muted">
          Komt in de lijst te staan als <span className="font-medium">{voorstel}</span>. Je kunt de
          naam later aanpassen.
        </p>
      )}

      {fout && <p className="text-sm text-[var(--intent-danger-text)]">{fout.melding}</p>}

      <div>
        <button type="submit" className="btn-primary" disabled={bezig}>
          {bezig ? "Bezig" : "Markt aanmaken"}
        </button>
      </div>
    </form>
  );
}
