"use client";

import { GEEN_VERBINDING } from "@/lib/meldingen";
import { useState } from "react";
import { useRefresh } from "@/components/use-refresh";

/** Zelfde grenzen als de server (`MAX_PAGES_HARD_CAP` in `lib/crawler.ts`, 150). */
const MIN_PAGINAS = 5;
const MAX_PAGINAS = 150;
const STANDAARD_PAGINAS = 150;

/**
 * "Onderzoek opnieuw" (docs/tasks/onboarding-2.0.md §8, punt 3).
 *
 * De knop is alleen bruikbaar omdat hij veilig is: `field-merge.ts` houdt
 * profielvelden tegen die een mens zette, en de route laat aanbodknopen met
 * bron `klant` of `gesprek` staan. Zonder die twee zou dit een knop zijn die je
 * niet durft te gebruiken, en dan is het antwoord op "de site is vernieuwd"
 * weer "maak een nieuw merk aan".
 *
 * Een bevestiging ervoor, want het duurt een paar minuten en het herschrijft
 * het aanbod. Geen modaal venster: één klik die verandert in twee is genoeg.
 */
export function RerunResearchButton({
  profileId,
  onStarted,
  manualPages = [],
}: {
  profileId: string;
  /** De pagina's die al eerder handmatig zijn toegevoegd, zodat je ze ook weer weg kunt halen. */
  manualPages?: { url: string; title: string | null }[];
  /** Blok B punt 12: laat een aanroeper (bv. `DossierStatus`) opnieuw gaan pollen. */
  onStarted?: () => void;
}) {
  const { refresh, refreshing } = useRefresh();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  // ⚠️ De knop laat pas los als het scherm de nieuwe stand heeft, niet als de
  // aanvraag de deur uit is. Zie `components/use-refresh.ts`.
  const wacht = pending || refreshing;
  const [error, setError] = useState<string | null>(null);
  const [maxPages, setMaxPages] = useState(String(STANDAARD_PAGINAS));
  const [extraUrls, setExtraUrls] = useState("");
  const [waarschuwing, setWaarschuwing] = useState<string | null>(null);

  async function haalWeg(url: string) {
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/pages`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Weghalen is niet gelukt.");
        return;
      }
      refresh();
    } catch {
      setError(GEEN_VERBINDING);
    }
  }

  async function run() {
    setPending(true);
    setError(null);
    setWaarschuwing(null);
    try {
      // Eerst de extra adressen, dan pas het onderzoek: de crawl leest ze dan
      // in dezelfde ronde mee. Lukt er een adres niet, dan starten we niet stil
      // door, want dan denk je dat die pagina meetelt.
      if (extraUrls.trim()) {
        const add = await fetch(`/api/profiles/${profileId}/pages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: extraUrls }),
        });
        const addJson = await add.json().catch(() => ({}));
        if (!add.ok) {
          setError(addJson.detail ?? addJson.error ?? "De extra adressen toevoegen is niet gelukt.");
          setPending(false);
          return;
        }
        const problemen: string[] = [
          ...(addJson.unreadable ?? []).map((u: string) => `${u} was niet te lezen`),
          ...(addJson.rejected ?? []).map(
            (r: { value: string; reason: string }) => `${r.value}: ${r.reason}`,
          ),
        ];
        if (problemen.length > 0 && !addJson.added) {
          setError(`Er is niets toegevoegd. ${problemen.join(". ")}.`);
          setPending(false);
          return;
        }
        if (problemen.length > 0) setWaarschuwing(`Niet gelukt: ${problemen.join(". ")}.`);
        setExtraUrls("");
      }

      const aantal = Math.round(Number(maxPages));
      const res = await fetch(`/api/profiles/${profileId}/deep-research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPages: Number.isFinite(aantal) ? aantal : undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Opnieuw onderzoeken is niet gelukt.");
        setPending(false);
        return;
      }
      onStarted?.();
      refresh();
    } catch {
      setError(GEEN_VERBINDING);
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="btn-outline btn-sm w-fit"
          onClick={() => setConfirming(true)}
        >
          Onderzoek opnieuw
        </button>
        {error && (
          <p className="text-sm text-[var(--intent-danger-content)]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="vlak flex flex-col gap-2">
      <p className="text-sm text-secondary">
        ORBIT ENGINE leest de website opnieuw uit en bouwt het aanbod opnieuw op. Dat
        duurt een paar minuten.
        <strong> Wat jij of de klant invulde blijft staan</strong>, net als de
        onderwerpen en de AI-kennistest.
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Hoeveel pagina&apos;s lezen?</span>
        <input
          type="number"
          className="field w-32"
          min={MIN_PAGINAS}
          max={MAX_PAGINAS}
          value={maxPages}
          onChange={(e) => setMaxPages(e.target.value)}
          disabled={wacht}
        />
        <span className="text-sm text-muted">
          Tussen {MIN_PAGINAS} en {MAX_PAGINAS}. Een hoger aantal is grondiger, maar duurt langer.
          Past de site in het aantal, dan leest ORBIT ENGINE alles.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Extra pagina&apos;s (optioneel)</span>
        <textarea
          className="field min-h-24 font-mono text-sm"
          placeholder={"https://jouwsite.nl/diensten/bekkenfysiotherapie\nhttps://jouwsite.nl/tarieven"}
          value={extraUrls}
          onChange={(e) => setExtraUrls(e.target.value)}
          disabled={wacht}
        />
        <span className="text-sm text-muted">
          Mist er een dienst of productgroep? Plak de adressen die er zeker bij horen, één per
          regel. Ze blijven staan bij een volgend onderzoek.
        </span>
      </label>

      {manualPages.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="mono-label">Eerder toegevoegd ({manualPages.length})</span>
          <ul className="flex flex-col gap-1">
            {manualPages.map((p) => (
              <li key={p.url} className="flex items-baseline justify-between gap-3 text-sm">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link truncate"
                >
                  {p.title || p.url}
                </a>
                <button
                  type="button"
                  className="shrink-0 text-muted hover:text-[var(--intent-danger-content)]"
                  onClick={() => void haalWeg(p.url)}
                  disabled={wacht}
                  aria-label={`${p.title || p.url} weghalen`}
                >
                  weghalen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={wacht}
          onClick={() => void run()}
        >
          {wacht ? "Starten…" : "Ja, opnieuw onderzoeken"}
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={wacht}
          onClick={() => setConfirming(false)}
        >
          Annuleren
        </button>
      </div>
      {waarschuwing && (
        <p className="text-sm text-[var(--intent-warning-content)]" role="status">
          {waarschuwing}
        </p>
      )}
      {error && (
        <p className="text-sm text-[var(--intent-danger-content)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
