"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InfoHint } from "@/components/info-hint";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import { ExternalLink } from "@/components/external-link";
import { CopyButton } from "@/components/copy-button";
import type { UserFacingError } from "@/lib/errors";
import type { PublishCheck } from "@/lib/pipeline/publish-check";
import { formatDateLong } from "@/lib/format";
import { Icon } from "@/components/icon";
import { Alert } from "@/components/alert";

/**
 * "Deze pagina staat live" (optimalisatie.md 5.1/5.2/5.3).
 *
 * Het scharnierpunt van fase 5. Tot hier levert de app tekst; vanaf hier kan hij
 * volgen of het iets uithaalt. Vandaar dat er bij de knop staat wat er daarna
 * gebeurt: een klant die niet weet dat er over twee weken hermeten wordt, ziet
 * later een meting waar hij niet om gevraagd heeft.
 *
 * ── ⚠️ VAN KAART NAAR BALK, EN WAT DAT KOST (22 september 2026) ─────────────
 *
 * Dit blok stond eerst als kaart bovenaan de pagina en scrolde mee uit beeld.
 * Nu zit het in de paginabalk en is het dus altijd bereikbaar. Dat is winst
 * voor een handeling die anders blijft liggen, en het is tegelijk een risico
 * dat er eerst niet was: een knop die nooit uit beeld gaat, wordt eerder per
 * ongeluk gebruikt.
 *
 * Het bewijs dat mensen hem niet kónden vinden is bovendien dun. Gemeten op
 * productie (22 september 2026): 25 contentpagina's, waarvan nul gepubliceerd.
 * Dit scherm is dus nog nauwelijks gebruikt, en dan is "hij stond te laag" een
 * aanname en geen waarneming.
 *
 * Daarom noemt de bevestigingsstap voortaan wat er nog openstaat. De knop wordt
 * NIET geblokkeerd: de klant weet zelf of zijn pagina online staat, en de app
 * hoort dat niet te overrulen. Hij mag het alleen niet verzwijgen.
 */
export function PublishBox({
  analysisId,
  pieceId,
  publishedAt,
  publishedUrl,
  check,
  checkedAt,
  blokkades,
}: {
  analysisId: string;
  pieceId: string;
  publishedAt: string | null;
  publishedUrl: string | null;
  check: PublishCheck | null;
  checkedAt: string | null;
  /**
   * Hoeveel bevindingen publicatie tegenhouden. Uit dezelfde bron als de
   * kwaliteitsrail (`quality_json`), zodat er nooit twee tellingen naast elkaar
   * staan die elkaar tegenspreken.
   */
  blokkades: number;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(publishedUrl ?? "");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [problem, setProblem] = useState<UserFacingError | null>(null);
  // A.9: bevestiging vóór een handeling die niet zomaar ongedaan te maken is,
  // dit zet twee hermetingen in de rij (over twee en vier weken). Zelfde
  // patroon als RerunResearchButton: geen modaal venster, één klik wordt twee.
  const [confirming, setConfirming] = useState(false);
  const [open, setOpen] = useState(false);
  const wikkel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function buiten(e: MouseEvent) {
      if (!wikkel.current?.contains(e.target as Node)) setOpen(false);
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", toets);
    };
  }, [open]);

  async function publish() {
    setState("busy");
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/content/${pieceId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        setState("error");
        setProblem(problemFromResponse(await res.json().catch(() => null)));
        return;
      }
      setState("idle");
      setOpen(false);
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setState("error");
      setProblem(networkProblem(err));
    }
  }

  async function unpublish() {
    setState("busy");
    try {
      await fetch(`/api/analyses/${analysisId}/content/${pieceId}/publish`, { method: "DELETE" });
      setState("idle");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setState("error");
      setProblem(networkProblem(err));
    }
  }

  return (
    <div className="relative" ref={wikkel}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        /* Regel 8 van §11: hooguit één hoofdactie per scherm. Dit is hem. Is de
           pagina al live, dan is er niets meer te doen en wordt het een gewone
           knop naar de gegevens. */
        className={publishedAt ? "btn-outline btn-sm" : "btn-accent btn-sm"}
      >
        {publishedAt ? "Publicatie" : "Meld dat hij live staat"}
      </button>

      {open && (
        <div className="menu-surface popover absolute right-0 z-30 mt-1 w-[min(26rem,calc(100vw-2rem))] p-4">
          {state === "error" && problem ? (
            <ErrorNotice error={problem} onRetry={() => void publish()} />
          ) : publishedAt ? (
            <Gepubliceerd
              publishedAt={publishedAt}
              publishedUrl={publishedUrl}
              check={check}
              checkedAt={checkedAt}
              bezig={state === "busy"}
              onTerugtrekken={() => void unpublish()}
            />
          ) : (
            <NogNiet
              url={url}
              setUrl={setUrl}
              confirming={confirming}
              setConfirming={setConfirming}
              bezig={state === "busy"}
              blokkades={blokkades}
              onPubliceer={() => void publish()}
            />
          )}
        </div>
      )}
    </div>
  );
}

function NogNiet({
  url,
  setUrl,
  confirming,
  setConfirming,
  bezig,
  blokkades,
  onPubliceer,
}: {
  url: string;
  setUrl: (v: string) => void;
  confirming: boolean;
  setConfirming: (v: boolean) => void;
  bezig: boolean;
  blokkades: number;
  onPubliceer: () => void;
}) {
  if (confirming) {
    return (
      <div className="flex flex-col gap-3">
        <span className="mono-label">Klopt de link?</span>
        <p className="w-fit break-all text-sm font-medium">{url.trim()}</p>

        {/* De rem (§4 van het herontwerpplan). Geen blokkade, wel een feit dat
            de app niet mag verzwijgen op het moment dat het ertoe doet. */}
        {blokkades > 0 && (
          <p className="card card-warning text-sm">
            Er {blokkades === 1 ? "staat nog 1 punt" : `staan nog ${blokkades} punten`} open die
            publicatie tegenhouden. Je kunt doorgaan, maar kijk ze liever eerst na onder
            {"\"Te verbeteren\"."}
          </p>
        )}

        <p className="text-sm text-secondary">
          ORBIT ENGINE zet nu twee hermetingen in de rij, over twee en over vier weken, om te zien of
          deze pagina het verschil maakt.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={bezig}
            onClick={onPubliceer}
          >
            {bezig ? "Controleren…" : "Ja, dit staat live"}
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={bezig}
            onClick={() => setConfirming(false)}
          >
            Annuleren
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) setConfirming(true);
      }}
    >
      <span className="mono-label flex items-center gap-1">
        Staat deze pagina al live?
        <InfoHint label="Waarom vraagt ORBIT ENGINE dit?">
          Zodra je hier de link invult, hermeet ORBIT ENGINE de vragen waarvoor deze pagina gemaakt
          is, twee en vier weken later. Dan zie je zwart-op-wit of het gewerkt heeft.
        </InfoHint>
      </span>
      <p className="text-sm text-secondary">
        Geef de link, dan controleert ORBIT ENGINE of de tekst er echt op staat.
      </p>
      <input
        className="field"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://jouwsite.nl/de-nieuwe-pagina"
        aria-label="Link naar de gepubliceerde pagina"
        disabled={bezig}
      />
      <button type="submit" className="btn-primary btn-sm w-fit" disabled={bezig || !url.trim()}>
        Dit staat live
      </button>
    </form>
  );
}

function Gepubliceerd({
  publishedAt,
  publishedUrl,
  check,
  checkedAt,
  bezig,
  onTerugtrekken,
}: {
  publishedAt: string;
  publishedUrl: string | null;
  check: PublishCheck | null;
  checkedAt: string | null;
  bezig: boolean;
  onTerugtrekken: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label flex items-center gap-1">
          Live
          <InfoHint label="Wat gebeurt er nu?">
            ORBIT ENGINE hermeet de vragen waarvoor deze pagina gemaakt is, twee en vier weken na
            publicatie. AI-assistenten pikken nieuwe content niet dezelfde dag op, dus eerder meten
            zegt niets.
          </InfoHint>
        </span>
        <span className="mono-label">{formatDateLong(publishedAt)}</span>
      </div>

      {publishedUrl && (
        <div className="flex flex-wrap items-center gap-3">
          <ExternalLink href={publishedUrl} className="link w-fit break-all text-sm">
            {publishedUrl}
          </ExternalLink>
          <CopyButton
            value={publishedUrl}
            label="Kopieer link"
            className="text-sm text-secondary hover:underline"
          />
        </div>
      )}

      <PublishCheckNotice check={check} checkedAt={checkedAt} />

      <p className="text-sm text-secondary">
        ORBIT ENGINE hermeet de bijbehorende vragen over twee en over vier weken. Het resultaat komt
        vanzelf in hoofdstuk 04 van je cluster te staan. Jij hoeft niets.
      </p>

      <button
        type="button"
        onClick={onTerugtrekken}
        disabled={bezig}
        className="w-fit text-sm text-secondary hover:underline"
      >
        Toch niet gepubliceerd
      </button>
    </div>
  );
}

/**
 * De uitslag van de controle (5.2).
 *
 * Een probleem hier is geen foutmelding maar een waarschuwing: de klant dénkt
 * dat het klaar is, en zonder dit blokje wacht hij weken op een effect dat nooit
 * kan komen. Vandaar dat er altijd bij staat wat hij ermee moet.
 */
function PublishCheckNotice({
  check,
  checkedAt,
}: {
  check: PublishCheck | null;
  checkedAt: string | null;
}) {
  if (!check) {
    return (
      <p className="flex items-center gap-2 text-sm text-secondary">
        <span className="live-dot" />
        ORBIT ENGINE controleert de pagina…
      </p>
    );
  }

  if (check.problems.length === 0) {
    return (
      <p className="flex items-start gap-1.5 text-sm" style={{ color: "var(--intent-success-content)" }}>
        <span className="mt-0.5">
          <Icon naam="klaar" size={14} />
        </span>
        {/* De hele zin in één span: los naast elkaar zouden het drie
            flex-kinderen zijn en dan breekt de regel op de verkeerde plek. */}
        <span>
          Gecontroleerd: de tekst staat erop
          {check.schemaFound ? ", inclusief de gestructureerde data" : ""}.
          {checkedAt && <span className="text-muted"> ({formatDateLong(checkedAt)})</span>}
        </span>
      </p>
    );
  }

  return (
    <Alert intent="warning">
      <span className="flex flex-col gap-1">
        <span className="font-medium text-[var(--text-primary)]">Even controleren</span>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {check.problems.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </span>
    </Alert>
  );
}
