"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

/**
 * De handelingen op een afgeronde markt: hermeten en publiceren
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 20 en 22, sprint 7).
 *
 * ── TWEE KNOPPEN DIE ALLEBEI EEN BESLUIT ZIJN ───────────────────────────────
 *
 * **Hermeten** kost geld en levert nieuwe belaanleidingen op uit een markt die je
 * al kent. Het is de knop die de economie van deze module verandert: zonder
 * hermeting is een markt na één oogst leeg.
 *
 * **Publiceren** zet een pagina online waar de bedrijven uit deze markt bij naam
 * op staan. Dat is geen instelling maar een handeling, en intrekken kan altijd.
 * De tekst bij de knop zegt allebei die dingen, want een knop met alleen het
 * woord "publiceren" verzwijgt wat er gebeurt.
 */
export function Marktacties({
  marketId,
  slug,
  isPublic,
  heeftRapport,
  magHermeten,
}: {
  marketId: string;
  slug: string;
  isPublic: boolean;
  heeftRapport: boolean;
  magHermeten: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [bezig, setBezig] = useState<string | null>(null);

  async function roep(pad: string, methode: "POST" | "DELETE", naam: string, gelukt: string) {
    setBezig(naam);
    try {
      const res = await fetch(pad, { method: methode });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: "Niet gelukt", description: data.error, intent: "fout" });
        return;
      }
      toast({ title: gelukt, intent: "succes" });
      router.refresh();
    } catch {
      toast({ title: "De verbinding viel weg", intent: "fout" });
    } finally {
      setBezig(null);
    }
  }

  return (
    <div className="card flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Wat je nu met deze markt kunt</h2>
        <p className="mt-1 text-secondary">
          Deze markt is gemeten. Je kunt hem later opnieuw meten om te zien wat er verandert, en je
          kunt de uitkomst als openbare pagina neerzetten.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-3">
        <div>
          <h3 className="font-semibold">Opnieuw meten</h3>
          <p className="mt-1 text-secondary">
            Met exact dezelfde vragen als de vorige keer. Dat moet, want anders meet je het verschil
            tussen twee vragenlijsten en niet het verschil in de markt. Een bedrijf dat gezakt is,
            levert het scherpste gesprek op dat er bestaat.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn-ghost"
            disabled={!magHermeten || bezig !== null}
            onClick={() =>
              roep(
                `/api/sales/markets/${marketId}/remeasure`,
                "POST",
                "hermeten",
                "De vragen staan klaar. Keur de meting goed om te starten.",
              )
            }
          >
            {bezig === "hermeten" ? "Bezig" : "Meet deze markt opnieuw"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-3">
        <div>
          <h3 className="font-semibold">De openbare pagina</h3>
          <p className="mt-1 text-secondary">
            {isPublic
              ? `Deze markt staat online op /markt/${slug}. Je kunt hem er altijd weer afhalen.`
              : "Hiermee komt er een pagina online waar de bedrijven uit deze markt bij naam op " +
                "staan, met wat de AI-assistenten over ze antwoordden. Een verkoper kan er in een " +
                "mail naar verwijzen. Terugtrekken kan altijd."}
          </p>
          {!heeftRapport && !isPublic && (
            <p className="mt-1 text-sm text-muted">
              Er is nog geen tekst geschreven voor deze meting. Schrijven en online zetten zijn twee
              besluiten: eerst lees je wat er staat, dan pas gaat het naar buiten.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!heeftRapport && !isPublic && (
            <button
              type="button"
              className="btn-ghost"
              disabled={bezig !== null}
              onClick={() =>
                roep(
                  `/api/sales/markets/${marketId}/report`,
                  "POST",
                  "schrijven",
                  "ORBIT ENGINE schrijft de tekst. Ververs over een minuut.",
                )
              }
            >
              {bezig === "schrijven" ? "Bezig" : "Schrijf de tekst"}
            </button>
          )}
          {isPublic ? (
            <button
              type="button"
              className="btn-ghost"
              disabled={bezig !== null}
              onClick={() =>
                roep(
                  `/api/sales/markets/${marketId}/publish`,
                  "DELETE",
                  "intrekken",
                  "De pagina staat niet meer online.",
                )
              }
            >
              {bezig === "intrekken" ? "Bezig" : "Haal de pagina offline"}
            </button>
          ) : (
            <button
              type="button"
              className="btn-ghost"
              disabled={!heeftRapport || bezig !== null}
              onClick={() =>
                roep(
                  `/api/sales/markets/${marketId}/publish`,
                  "POST",
                  "publiceren",
                  "De pagina staat online.",
                )
              }
            >
              {bezig === "publiceren" ? "Bezig" : "Zet de pagina online"}
            </button>
          )}
          {isPublic && (
            <a className="btn-ghost" href={`/markt/${slug}`} target="_blank" rel="noreferrer">
              Bekijk de pagina
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
