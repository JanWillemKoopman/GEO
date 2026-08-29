"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { STAGE_LABEL, isIntentStage } from "@/lib/sales/intents";

/**
 * Poort 2 op het scherm (`docs/tasks/geo-prospect-engine.md` §8.1).
 *
 * ── WAT HIER TE ZIEN MOET ZIJN, EN WAAROM ───────────────────────────────────
 *
 * Dit is de duurste knop van de module: ~95% van wat een marktronde kost, zit
 * achter deze goedkeuring (plan 21.1). Wie hem indrukt hoort drie dingen te
 * weten, en ze staan alle drie op het scherm vóór de knop:
 *
 * 1. **Welke vragen er gesteld worden.** Niet "40 vragen" maar de vragen zelf,
 *    per intentie gegroepeerd. Alles wat erna komt, de scores, de kansen, de
 *    zin in de mail, rust op deze veertig zinnen.
 * 2. **Wat het gaat kosten**, als schatting en met het woord schatting erbij.
 * 3. **Wat er niet gemeten wordt.** Een intentie met minder vragen dan de rest
 *    levert een dunner cijfer op, en dat hoort te blijken vóór de meting.
 *
 * ── EN WAAROM DE INTENTIE DE GROEPERING IS EN NIET DE FASE ──────────────────
 *
 * Omdat de intentie het verkoopargument draagt (plan 10.2). "Bij de negen vragen
 * over aankoopbegeleiding word je nul keer genoemd" is de zin die straks in een
 * mail staat, en de admin moet kunnen zien of die negen vragen kloppen. Op fase
 * groeperen zou de vier fases naast elkaar zetten en de intentie versnipperen.
 */
export interface VraagRegel {
  id: string;
  tekst: string;
  intentLabel: string;
  intentNaam: string;
  fase: string;
  gewicht: number;
  actief: boolean;
}

export function Vragenlijst({
  marketId,
  vragen,
  ramingEur,
  engines,
  kanttekening,
  magGoedkeuren,
}: {
  marketId: string;
  vragen: VraagRegel[];
  /** De kostenraming in euro's, over alle engines samen. */
  ramingEur: number;
  engines: string[];
  kanttekening: string | null;
  magGoedkeuren: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [bezig, setBezig] = useState<string | null>(null);
  const [starten, setStarten] = useState(false);

  const actief = vragen.filter((v) => v.actief);

  // Per intentie tellen, in de volgorde waarin de vragen staan. Die volgorde is
  // de verdeling uit `lib/sales/intents.ts` en niet het alfabet.
  const groepen: { label: string; naam: string; vragen: VraagRegel[] }[] = [];
  for (const v of vragen) {
    const bestaand = groepen.find((g) => g.label === v.intentLabel);
    if (bestaand) bestaand.vragen.push(v);
    else groepen.push({ label: v.intentLabel, naam: v.intentNaam, vragen: [v] });
  }

  async function zetVraag(questionId: string, nieuweStand: boolean) {
    setBezig(questionId);
    try {
      const res = await fetch(`/api/sales/markets/${marketId}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, active: nieuweStand }),
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
      setBezig(null);
    }
  }

  async function startMeting() {
    setStarten(true);
    try {
      const res = await fetch(`/api/sales/markets/${marketId}/measure`, { method: "POST" });
      const data = (await res.json()) as { error?: string; vragen?: number };
      if (!res.ok) {
        toast({ title: "Niet gestart", description: data.error, intent: "fout" });
        return;
      }
      toast({
        title: "De meting loopt",
        description: `${data.vragen} vragen op ${engines.length} ${
          engines.length === 1 ? "assistent" : "assistenten"
        }. Je kunt dit scherm sluiten.`,
        intent: "succes",
      });
      router.refresh();
    } catch {
      toast({ title: "De verbinding viel weg", intent: "fout" });
    } finally {
      setStarten(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">De vragen die deze markt gaan meten</h2>
          <p className="mt-1 text-secondary">
            Elk bedrijf in deze markt wordt gemeten op dezelfde {actief.length} vragen, op{" "}
            {engines.length === 1 ? "één assistent" : `${engines.length} assistenten`}. Haal eruit
            wat deze markt niet meet. Wat je weghaalt, telt niet mee in de kosten.
          </p>
        </div>

        {kanttekening && <p className="text-sm text-muted">{kanttekening}</p>}

        <p className="text-sm text-muted">
          Naar schatting {ramingEur.toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}{" "}
          voor deze meting. Dat is een schatting: er is nog geen marktmeting nagerekend.
        </p>

        {magGoedkeuren ? (
          <div>
            <button
              type="button"
              className="btn-primary"
              onClick={startMeting}
              disabled={starten || actief.length === 0}
            >
              {starten ? "Bezig" : `Meet deze ${actief.length} vragen`}
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Alleen een sales admin kan de meting starten, want dit is de stap die geld kost.
          </p>
        )}
      </div>

      {groepen.map((groep) => {
        const actiefInGroep = groep.vragen.filter((v) => v.actief).length;
        return (
          <div key={groep.label} className="card flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{groep.naam}</h3>
              <span className="mono-label">
                {actiefInGroep} van de {groep.vragen.length} vragen
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {groep.vragen.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-start justify-between gap-3 border-t border-[var(--border-subtle)] pt-2 first:border-0 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className={v.actief ? "" : "text-muted line-through"}>{v.tekst}</p>
                    <span className="mono-label">
                      {isIntentStage(v.fase) ? STAGE_LABEL[v.fase] : v.fase}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost shrink-0"
                    onClick={() => zetVraag(v.id, !v.actief)}
                    disabled={bezig === v.id}
                  >
                    {v.actief ? "Haal weg" : "Zet terug"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
