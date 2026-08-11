"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import {
  assessReadiness,
  readinessHeadline,
  type Readiness,
  type ReadinessRow,
} from "@/lib/pipeline/profile-readiness";
import type { ResearchStep } from "@/lib/pipeline/research-steps";

/**
 * Het afrondingsblok van het merkdossier.
 *
 * Vervangt `ResearchStepsStrip`. Die deed het wachten goed en het aankomen
 * slecht: zodra alles klaar was verscheen er één regel "Onderzoek afgerond",
 * en of het dossier daarmee ook bruikbaar was moest je zelf uitzoeken door acht
 * kaarten langs te lopen.
 *
 * Hier staan drie dingen op één plek, in de volgorde waarin je ze nodig hebt:
 *
 *   1. loopt het nog, en hoe lang nog        (de stappen, met tussenresultaat)
 *   2. is het af                             (`assessReadiness`, Nova's
 *                                             "Review & launch"-model)
 *   3. wat is er nog open                    (de agenda voor het gesprek)
 *
 * ── HET MOMENT ZELF ─────────────────────────────────────────────────────────
 *
 * Op de overgang van "loopt" naar "af" gaat er één keer een broodroostermelding
 * af. Dat is het antwoord op de vraag "wanneer is het onderzoek nou klaar": de
 * consultant kan het tabblad laten staan, iets anders doen, en wordt geroepen.
 * Alleen bij een échte overgang in deze sessie (`zagWerk`), nooit bij iemand die
 * het profiel drie weken later opent, want dan is het geen nieuws maar ruis.
 */
interface StatusPayload {
  steps?: ResearchStep[];
  etaText: string | null;
  pendingJobs: number;
  counts?: {
    pages: number;
    offerings: number;
    topics: number;
    auditChecks: number;
    baselineRows: number;
    dossier: boolean;
    openFactRequests: number;
    researchGaps: number;
    scopeKnown: boolean;
    scopeDetail: string | null;
  };
}

export function ProfileReadinessPanel({
  profileId,
  brandName,
}: {
  profileId: string;
  brandName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<StatusPayload | null>(null);
  const [klaar, setKlaar] = useState(false);
  const zagWerk = useRef(false);
  const meldingGedaan = useRef(false);

  useEffect(() => {
    if (klaar) return;
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/profiles/${profileId}/status`, {
          cache: "no-store",
        });
        if (!res.ok || !active) return;
        const json = (await res.json()) as StatusPayload;
        if (!active) return;
        setData(json);
        if (json.pendingJobs > 0) zagWerk.current = true;
        if (json.pendingJobs === 0) {
          setKlaar(true);
          // Eén keer verversen zodat de nieuw gevulde panelen (aanbod, topics,
          // kennistest) daadwerkelijk verschijnen.
          if (zagWerk.current) router.refresh();
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

  const steps = data?.steps ?? [];
  const counts = data?.counts;
  const readiness: Readiness | null =
    counts && steps.length > 0
      ? assessReadiness({ steps, ...counts })
      : null;

  const loopt = steps.some((s) => s.state === "bezig" || s.state === "wacht");

  // ── De melding, precies één keer ─────────────────────────────────────────
  useEffect(() => {
    if (!readiness || loopt || meldingGedaan.current || !zagWerk.current) return;
    meldingGedaan.current = true;
    toast(
      readiness.compleet
        ? {
            intent: "succes",
            title: `Het dossier van ${brandName} is compleet`,
            description:
              readiness.optioneelOpen.length > 0
                ? `Alle ${readiness.nodigAantal} onderdelen staan er. Er zijn nog ${readiness.optioneelOpen.length} punten voor het gesprek.`
                : "Alles staat er. Je kunt het scherm delen en het gesprek in.",
          }
        : {
            intent: "fout",
            title: "Het onderzoek is klaar, maar niet compleet",
            description: `${readiness.ontbreekt.length} van de ${readiness.nodigAantal} onderdelen bleven leeg. Draai het onderzoek opnieuw.`,
          },
    );
  }, [readiness, loopt, toast, brandName]);

  if (steps.length === 0) return null;

  // ── Loopt nog ────────────────────────────────────────────────────────────
  if (loopt) {
    const gedaan = steps.filter(
      (s) => s.state === "klaar" || s.state === "overgeslagen",
    ).length;
    return (
      <div className="card flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="live-dot" aria-hidden />
            <span className="mono-label">Aura onderzoekt · live</span>
          </div>
          {data?.etaText && (
            <span className="mono-label text-muted">{data.etaText}</span>
          )}
        </div>

        <Balk gedaan={gedaan} totaal={steps.length} />

        <p className="text-sm text-secondary">
          Je merkdossier staat er al. De rest komt hieronder binnen. Je kunt dit
          scherm sluiten, Aura werkt door en meldt zich als het klaar is.
        </p>

        <ol className="flex flex-col gap-2">
          {steps.map((s) => (
            <li key={s.job} className="flex flex-wrap items-baseline gap-2 text-sm">
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
              {s.result && <span className="text-secondary">· {s.result}</span>}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (!readiness) return null;

  // ── Klaar ────────────────────────────────────────────────────────────────
  //
  // Blijft staan, ook bij een later bezoek. Dit is niet het nieuws van het
  // moment maar de stand van het dossier, en dat is precies wat je wilt zien
  // voordat je het scherm deelt.
  return (
    <div
      className={`card flex flex-col gap-3 ${readiness.compleet ? "card-success" : "card-warning"}`}
      role="status"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label">
          {readiness.compleet ? "Dossier compleet" : "Dossier niet compleet"}
        </span>
        <span className="mono-label text-muted">
          {readiness.klaarAantal} van de {readiness.nodigAantal}
        </span>
      </div>

      <Balk gedaan={readiness.klaarAantal} totaal={readiness.nodigAantal} />

      <p className="text-secondary">{readinessHeadline(readiness, brandName)}</p>

      <ul className="flex flex-col gap-1.5">
        {readiness.rows.map((r) => (
          <Regel key={r.label} row={r} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Het balkje. Geen percentage erbij: "4 van de 6" staat er al, en een getal dat
 * hetzelfde zegt in een andere eenheid maakt het alleen drukker.
 */
function Balk({ gedaan, totaal }: { gedaan: number; totaal: number }) {
  const pct = totaal === 0 ? 0 : Math.round((gedaan / totaal) * 100);
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--bg-elevated)]"
      role="progressbar"
      aria-valuenow={gedaan}
      aria-valuemin={0}
      aria-valuemax={totaal}
      aria-label={`${gedaan} van de ${totaal} onderdelen klaar`}
    >
      <div
        className="h-full rounded-[var(--radius-pill)] transition-[width] duration-500"
        style={{
          width: `${pct}%`,
          background: "var(--intent-growth-solid)",
        }}
      />
    </div>
  );
}

function Regel({ row }: { row: ReadinessRow }) {
  const teken =
    row.state === "klaar" ? "✓" : row.state === "loopt" ? "·" : "○";
  const kleur =
    row.state === "klaar"
      ? "var(--intent-growth-text)"
      : row.state === "loopt"
        ? "var(--text-muted)"
        : row.nodig
          ? "var(--intent-warning-text)"
          : "var(--text-muted)";

  return (
    <li className="flex flex-wrap items-baseline gap-2 text-sm">
      <span aria-hidden style={{ color: kleur }}>
        {teken}
      </span>
      <a href={row.anchor} className="hover:underline">
        {row.label}
      </a>
      {row.detail && <span className="text-muted">· {row.detail}</span>}
      {row.state !== "klaar" && (
        <span className="mono-label" style={{ color: kleur }}>
          {row.state === "loopt" ? "loopt" : row.nodig ? "ontbreekt" : "open"}
        </span>
      )}
    </li>
  );
}
