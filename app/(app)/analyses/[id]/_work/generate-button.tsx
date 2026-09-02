"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ContentAction, ContentType } from "@/lib/types/database";
import type { RecommendationTarget } from "@/lib/pipeline/recommendation";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";
import { Icon } from "@/components/icon";

/**
 * "Genereer deze pagina" (Fase C, expliciet op klik).
 *
 * ⚠️ Deze knop schrijft NOOIT meteen. Hij plant de briefing in (contentbriefing.md
 * §8): ORBIT ENGINE bouwt eerst de feitenkaart en de vragen die de klant nog
 * moet beantwoorden op `/analyses/[id]/briefing`; pas ná dat scherm, op
 * "Schrijf mijn pagina's", start het echte schrijven. Vóór 1 september 2026
 * beloofde de knoptekst "schrijven" en viel de klik terug op de pollende
 * "ORBIT ENGINE schrijft…"-tekst hieronder, die daar niet bij hoorde: er was
 * nog geen letter geschreven, en de klant moest eerst zelf iets doen.
 *
 * Het schrijven zelf draait op de achtergrond (optimalisatie.md 1.4): die knop
 * (elders, na de briefing) plant in en pollt tot de pagina klaar is. Voorheen
 * hield die fetch zestig seconden lang een verbinding open terwijl het premium
 * model twee volledige pagina's schreef, de meest waarschijnlijke plek om op
 * de tijdslimiet stuk te lopen, en dan was het dure schrijfwerk weg. Sluit de
 * klant de tab, dan gaat het schrijven gewoon door.
 */
const GENERATION_FAILED: UserFacingError = {
  kind: "unknown",
  title: "Het schrijven van deze pagina is vastgelopen",
  message:
    "ORBIT ENGINE heeft het een paar keer geprobeerd. Probeer het opnieuw. Lukt het dan " +
    "nog steeds niet, laat het ons dan weten.",
  canRetry: true,
  detail: "",
};

export function GenerateButton({
  analysisId,
  reportId,
  recommendation,
  blocked = false,
}: {
  analysisId: string;
  reportId: string;
  recommendation: {
    title: string;
    type: ContentType;
    targetIntent: string;
    why: string;
    action: ContentAction;
    existingUrl: string | null;
    /** Een bestaande pagina die dit onderwerp al raakt (migratie 0083, O2). */
    relatedUrl?: string | null;
    /** De gemiste vragen die deze pagina moet winnen (optimalisatie.md 4.1). */
    targets?: RecommendationTarget[];
  };
  /** Houdt de technische controle een blokkade tegen? (optimalisatie.md 3.7) */
  blocked?: boolean;
}) {
  const [state, setState] = useState<"idle" | "pending" | "briefing" | "done" | "error">("idle");
  // Bij een blokkade genereren we niet zomaar: de klant moet eerst bevestigen
  // dat hij weet dat de tekst voorlopig niet gelezen kan worden. Bewust geen
  // harde blokkade, hij kan een goede reden hebben (de webbouwer is al bezig,
  // of hij wil de tekst alvast klaar hebben) en dat is zijn beslissing, niet de
  // onze. Wel één die hij bewust neemt in plaats van per ongeluk.
  const [acknowledged, setAcknowledged] = useState(false);
  const [problem, setProblem] = useState<UserFacingError | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  function startPolling() {
    if (pollTimer.current) clearInterval(pollTimer.current);
    const url = `/api/analyses/${analysisId}/content?title=${encodeURIComponent(recommendation.title)}`;
    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const json: { ready: boolean; failed: boolean } = await res.json();
        if (json.ready) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setState("done");
        } else if (json.failed) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setState("error");
          setProblem(GENERATION_FAILED);
        }
      } catch {
        /* stil, volgende tick probeert opnieuw */
      }
    }, 4000);
  }

  async function generate() {
    setState("pending");
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...recommendation, reportId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setProblem(problemFromResponse(json));
        return;
      }
      // Stond hij er al? Dan zijn we meteen klaar.
      if (json.done) {
        setState("done");
        return;
      }
      // De briefing staat klaar, er is nog geen letter tekst: de klant moet
      // eerst de vragen beantwoorden. Niet pollen alsof er geschreven wordt,
      // dat werk begint pas ná de briefing.
      if (json.briefing) {
        setState("briefing");
        return;
      }
      startPolling();
    } catch (err) {
      setState("error");
      setProblem(networkProblem(err));
    }
  }

  if (state === "error" && problem) {
    return <ErrorNotice error={problem} onRetry={() => void generate()} />;
  }

  if (state === "done") {
    return (
      <Link
        href={`/analyses/${analysisId}/bibliotheek`}
        className="btn-outline w-fit"
      >
        <Icon naam="klaar" />
        Klaar, lees hem in je bibliotheek
      </Link>
    );
  }

  if (state === "pending") {
    return (
      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm text-secondary">
          <span className="live-dot" />
          ORBIT ENGINE schrijft…
        </span>
        <span className="text-sm text-muted">
          Dit duurt een paar minuten. Je kunt dit scherm sluiten. ORBIT ENGINE schrijft door en zet de
          tekst vanzelf in je bibliotheek.
        </span>
      </div>
    );
  }

  if (state === "briefing") {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm text-secondary">
          De briefing staat klaar. Vul aan wat ORBIT ENGINE niet van je website kan halen, dan
          schrijft het de pagina.
        </span>
        <Link href={`/analyses/${analysisId}/briefing`} className="btn-primary w-fit">
          Briefing invullen
        </Link>
      </div>
    );
  }

  if (blocked && !acknowledged) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-secondary">
          <span className="font-medium text-[var(--text-primary)]">
            Je site houdt AI-assistenten nu buiten.
          </span>{" "}
          ORBIT ENGINE kan deze pagina wel voorbereiden, maar ChatGPT kan hem straks nog niet
          citeren. Los eerst de blokkade hierboven op, of ga alvast verder.
        </p>
        <button onClick={() => setAcknowledged(true)} className="btn-outline w-fit">
          Toch alvast beginnen
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => void generate()} className="btn-primary w-fit">
      Start het onderzoek voor deze pagina
    </button>
  );
}
