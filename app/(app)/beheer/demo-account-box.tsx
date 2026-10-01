"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/toast";

/**
 * Het voorbeeldaccount RunX inladen of verjongen (`docs/tasks/demo-account-runx.md` §9.4).
 *
 * Loopt de stappen van `/api/beheer/demo/runx` één voor één af, zodat elke stap
 * binnen de tijdslimiet van één verzoek blijft, en toont na elke stap wat er
 * gebeurde. Opnieuw klikken is veilig: het schuift het jaar op naar vandaag in
 * plaats van rijen te verdubbelen. Kost niets: er wordt geen AI aangeroepen.
 */
export function DemoAccountBox({ profielId }: { profielId: string | null }) {
  const toast = useToast();
  const [bezig, setBezig] = useState(false);
  const [regels, setRegels] = useState<string[]>([]);
  const [klaar, setKlaar] = useState<string | null>(profielId);

  async function inladen() {
    setBezig(true);
    setRegels([]);
    let stap: string | null = "basis";
    try {
      while (stap) {
        setRegels((r) => [...r, `Bezig: ${stap}`]);
        const res: Response = await fetch("/api/beheer/demo/runx", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ stap }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Onbekende fout.");
        setRegels((r) => [...r, ...(json.regels as string[])]);
        setKlaar(json.profielId as string);
        stap = json.volgende as string | null;
      }
      toast({ title: "Voorbeeldaccount staat klaar", description: "RunX is ingeladen tot en met vandaag.", intent: "succes" });
    } catch (err) {
      toast({ title: "Inladen is niet gelukt", description: err instanceof Error ? err.message : String(err), intent: "fout" });
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="mono-label">Voorbeeldaccount RunX</h2>
        <p className="text-sm text-muted">
          Een klant van twaalf maanden om te laten zien in een demogesprek, opgebouwd uit openbare gegevens van
          runx.nl en een nagespeeld jaar. RunX is geen klant. Inladen kost niets: er wordt niets gemeten of
          geschreven. Doe het opnieuw vóór een belangrijk gesprek, dan loopt alles weer tot en met vandaag.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-outline btn-sm" onClick={inladen} disabled={bezig}>
          {bezig ? "Bezig met inladen…" : klaar ? "Opnieuw inladen tot vandaag" : "Inladen"}
        </button>
        {klaar && !bezig && (
          <Link className="text-sm underline" href={`/merk/${klaar}`}>
            Open RunX
          </Link>
        )}
      </div>
      {regels.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-muted">
          {regels.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
