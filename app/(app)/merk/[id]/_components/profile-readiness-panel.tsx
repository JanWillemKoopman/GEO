"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { assessReadiness, type Readiness } from "@/lib/pipeline/profile-readiness";
import {
  buildOnboardingStatus,
  statusZin,
  type OnboardingStatus,
  type StatusRegel,
} from "@/lib/pipeline/onboarding-status";
import type { ResearchStep } from "@/lib/pipeline/research-steps";
import { Icon } from "@/components/icon";

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
  failedJobs?: number;
  counts?: {
    profileId: string;
    pages: number;
    offerings: number;
    topics: number;
    auditChecks: number;
    baselineRows: number;
    dossier: boolean;
    openFactRequests: number;
    scopeKnown: boolean;
    scopeDetail: string | null;
    packagePages: number | null;
    assigned: boolean;
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

  if (!readiness) return null;

  // ── Eén overzicht, ook als het nog loopt ────────────────────────────────
  //
  // Voor 30 september 2026 waren dit twee blokken (een lijst tijdens het
  // onderzoek, een andere erna) met een teller die alleen de blokkerende regels
  // telde. Nu staat er altijd dezelfde lijst, en de balk, de zin en de getallen
  // per groep komen uit dezelfde regels (`lib/pipeline/onboarding-status.ts`).
  const status = buildOnboardingStatus(steps, readiness);
  const toon = status.allesKlaar ? "card-success" : status.nodigOpen.length > 0 && !loopt ? "card-warning" : "";

  return (
    <div className={`card flex flex-col gap-4 ${toon}`} role="status">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          {loopt && <span className="live-dot" aria-hidden />}
          <span className="mono-label">
            {loopt ? "ORBIT ENGINE onderzoekt · live" : "Stand van de voorbereiding"}
          </span>
        </span>
        <span className="mono-label">
          {loopt && data?.etaText ? `${data.etaText} · ` : ""}
          {status.klaar} van de {status.totaal}
        </span>
      </div>

      <Balk gedaan={status.klaar} totaal={status.totaal} />

      <p className="text-secondary">{statusZin(status, brandName)}</p>

      {(data?.failedJobs ?? 0) > 0 && !loopt && (
        <p className="text-sm" style={{ color: "var(--intent-warning-content)" }}>
          Een onderdeel van het onderzoek is vastgelopen. Draai het onderzoek opnieuw.
        </p>
      )}

      {status.groepen.map((g) => (
        <section key={g.sleutel} className="flex flex-col gap-2" aria-label={g.titel}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="type-body-emphasis">{g.titel}</span>
            <span className="mono-label">
              {g.klaar} van de {g.totaal}
            </span>
          </div>
          <p className="text-sm text-muted">{g.uitleg}</p>
          <ul className="flex flex-col gap-1.5">
            {g.regels.map((r) => (
              <Regel key={r.label} regel={r} />
            ))}
          </ul>
        </section>
      ))}
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
      className="h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--bg-layer-2)]"
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
          background: "var(--trend-up)",
        }}
      />
    </div>
  );
}

const STAND_TEKST: Record<StatusRegel["stand"], string> = {
  klaar: "klaar",
  bezig: "bezig",
  wacht: "wacht",
  leeg: "ontbreekt",
  open: "open",
};

function Regel({ regel }: { regel: StatusRegel }) {
  const icoon =
    regel.stand === "klaar" ? "klaar" : regel.stand === "bezig" || regel.stand === "wacht" ? "loopt" : "open";
  const kleur =
    regel.stand === "klaar"
      ? "var(--trend-up-text)"
      : regel.stand === "bezig" || regel.stand === "wacht"
        ? "var(--text-tertiary)"
        : regel.nodig
          ? "var(--intent-warning-content)"
          : "var(--text-tertiary)";
  // Een stap die draaide en niets vond is geen fout maar wel iets om te weten:
  // "0 gevonden" mag nooit lezen als een geslaagde stap (`buildSteps()`).
  const tekst = regel.stand === "leeg" && !regel.nodig ? "niets gevonden" : STAND_TEKST[regel.stand];

  return (
    <li className="flex flex-wrap items-baseline gap-2 text-sm">
      <span style={{ color: kleur }}>
        <Icon naam={icoon} size={14} />
      </span>
      {regel.anchor ? (
        <a href={regel.anchor} className="hover:underline">
          {regel.label}
        </a>
      ) : (
        <span>{regel.label}</span>
      )}
      {regel.detail && <span className="text-muted">· {regel.detail}</span>}
      {regel.stand !== "klaar" && (
        <span className="mono-label" style={{ color: kleur }}>
          {tekst}
        </span>
      )}
    </li>
  );
}
