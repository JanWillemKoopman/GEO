"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ResearchStep } from "@/lib/pipeline/research-steps";

/**
 * De onderzoeksketen mét tussenresultaten (docs/tasks/onboarding-2.0.md §8).
 *
 * ── WAAROM DIT OP DE PROFIELPAGINA STAAT EN NIET OP HET WACHTSCHERM ─────────
 *
 * Het profiel gaat op `klaar` zodra het merkonderzoek klaar is — stap 2 van 6.
 * Dat is bewust: de klant hoeft niet op de aanbodboom te wachten om zijn merk te
 * zien. Maar het betekent wél dat hij op de profielpagina belandt terwijl de
 * aanbodboom, de topics en de kennistest nog draaien, en daar lege kaarten ziet
 * zonder uitleg.
 *
 * Deze strip vult dat gat. Hij verdwijnt zodra alles klaar is — een blijvend
 * overzicht van afgeronde stappen is ruis.
 */
export function ResearchStepsStrip({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [steps, setSteps] = useState<ResearchStep[] | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [klaar, setKlaar] = useState(false);
  /**
   * Hebben we in DEZE sessie werk zien lopen?
   *
   * Bepaalt of we het afrondingsmoment tonen. Zonder deze vlag zou de melding
   * "onderzoek klaar" ook verschijnen bij iemand die het profiel drie weken
   * later opent, en dan is het geen nieuws maar ruis.
   */
  const zagWerk = useRef(false);

  useEffect(() => {
    if (klaar) return;
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/profiles/${profileId}/status`, {
          cache: "no-store",
        });
        if (!res.ok || !active) return;
        const json = (await res.json()) as {
          steps?: ResearchStep[];
          etaText: string | null;
          pendingJobs: number;
        };
        if (!active) return;
        setSteps(json.steps ?? []);
        setEta(json.etaText);
        if (json.pendingJobs > 0) zagWerk.current = true;
        if (json.pendingJobs === 0) {
          setKlaar(true);
          // Eén keer verversen zodat de nieuw gevulde kaarten (aanbod, topics,
          // kennistest) daadwerkelijk verschijnen. Zonder dit blijft de pagina
          // staan zoals hij bij het openen was.
          router.refresh();
        }
      } catch {
        /* netwerkhik: de volgende ronde leest de echte stand */
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [profileId, klaar, router]);

  // Niets te melden zolang er geen openstaand werk is. Bewust ook niets tonen
  // in de eerste ronde vóór het antwoord binnen is: een strip die kort
  // opflitst en weer verdwijnt is vervelender dan geen strip.
  if (!steps || steps.length === 0) return null;
  const loopt = steps.some((s) => s.state === "bezig" || s.state === "wacht");

  // ── Het afrondingsmoment ──────────────────────────────────────────────────
  //
  // Hier stond `return null`: zodra alles klaar was verdween de strip en
  // ploften de panelen erin na de `router.refresh()`. Het beste moment van de
  // hele flow — het onderzoek is af en het dossier staat er — ging ongemarkeerd
  // voorbij, en de klant die net wegkeek zag alleen dat het scherm veranderd was.
  //
  // Alleen voor wie het heeft zien lopen (`zagWerk`), dus niet bij een later
  // bezoek.
  if (!loopt) {
    if (!zagWerk.current) return null;
    const gedaan = steps.filter(
      (s) => s.state === "klaar" || s.state === "overgeslagen",
    );
    const opbrengst = gedaan
      .map((s) => s.result)
      .filter((r): r is string => Boolean(r))
      .slice(0, 3);

    return (
      <div className="card card-success flex flex-col gap-2" role="status">
        <span className="mono-label">Onderzoek afgerond</span>
        <p className="text-secondary">
          {gedaan.length} van de {steps.length} stappen klaar
          {opbrengst.length > 0 ? `: ${opbrengst.join(" · ")}.` : "."} Je dossier
          hieronder is bijgewerkt.
        </p>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="live-dot" aria-hidden />
          <span className="mono-label">Aura onderzoekt · live</span>
        </div>
        {eta && <span className="mono-label text-muted">{eta}</span>}
      </div>

      <p className="text-sm text-secondary">
        Je merkdossier staat er al. De rest komt hieronder binnen. Je kunt dit
        scherm sluiten — Aura werkt door.
      </p>

      <ol className="flex flex-col gap-2">
        {steps.map((s) => (
          <li
            key={s.job}
            className="flex flex-wrap items-baseline gap-2 text-sm"
          >
            <span
              className={
                s.state === "klaar"
                  ? "chip chip-success"
                  : s.state === "bezig"
                    ? "chip chip-green"
                    : s.state === "overgeslagen"
                      ? "chip chip-warning"
                      : "chip chip-neutral"
              }
            >
              {s.state === "klaar"
                ? "klaar"
                : s.state === "bezig"
                  ? "bezig"
                  : s.state === "overgeslagen"
                    ? "niets gevonden"
                    : "wacht"}
            </span>
            <span className={s.state === "wacht" ? "text-muted" : ""}>
              {s.label}
            </span>
            {s.result && <span className="text-secondary">— {s.result}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
