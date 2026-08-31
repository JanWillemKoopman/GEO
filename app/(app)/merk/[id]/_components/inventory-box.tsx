"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { useRefresh } from "@/components/use-refresh";
import { CRAWL_SPEEDS, speedProfile, type CrawlSpeed } from "@/lib/crawl-speed";

/**
 * Crawlbeheer: hoeveel, hoe vaak, en hoe rustig (onboarding Ronde D, §17.9).
 *
 * ── WAAROM DIT GEEN WIZARDVELD IS ───────────────────────────────────────────
 *
 * `max_inventory_pages` is geen merkeigenschap maar een crawl-instelling: het
 * zegt niets over wie de klant is, alleen hoe grondig ORBIT ENGINE zijn site
 * uitleest. Het staat daarom naast de wizard en niet erin, samen met de knop
 * die de crawl start. De 42 klantvelden in `lib/pipeline/brand-fields.ts` gaan
 * uitsluitend over het merk zelf, en die grens houdt de teller "42 in, 42 uit"
 * eerlijk.
 *
 * ⚠️ Het sitemap-adres staat wél in de wizard (stap 1): dat is een feit over de
 * site van de klant, geen instelling van ons. Wijzig je het daar, bewaar dan
 * eerst, anders crawlt deze knop nog met het oude adres.
 *
 * ── WAAROM DIT GEEN VOORTGANGSBALK HEEFT (§17.7) ────────────────────────────
 *
 * De ronde is sinds Ronde D een achtergrondtaak: de knop plant hem in en geeft
 * meteen antwoord. Deze knop laat pas los als de server bevestigt dat de taak
 * in de wachtrij staat, niet als de crawl klaar is. "Ververs" haalt de nieuwe
 * stand op zodra de werker klaar is; er is bewust geen polling toegevoegd, dat
 * zou een tweede voortgangsmechanisme naast de bestaande onboardingstatus zijn.
 */
export function InventoryBox({
  profileId,
  initialCount,
  initialMax,
  initialTotalFound = null,
  initialPriorityPaths = [],
  initialSpeed = "normaal",
  initialLastRunAt = null,
  initialLastMode = null,
  initialBlockedAt = null,
}: {
  profileId: string;
  initialCount: number;
  initialMax: number;
  /** Hoeveel pagina's de site in totaal heeft. Null = nog niet gemeten. */
  initialTotalFound?: number | null;
  /** Sitesecties die voorrang krijgen bij het verdelen van de plekken. */
  initialPriorityPaths?: string[];
  initialSpeed?: CrawlSpeed;
  initialLastRunAt?: string | null;
  initialLastMode?: "meer" | "opnieuw" | null;
  initialBlockedAt?: string | null;
}) {
  const { refresh, refreshing } = useRefresh();
  const [count] = useState(initialCount);
  const [totaal] = useState<number | null>(initialTotalFound);
  const [max, setMax] = useState(initialMax);
  const [voorrang, setVoorrang] = useState(initialPriorityPaths.join(", "));
  const [speed, setSpeed] = useState<CrawlSpeed>(initialSpeed);
  const [bevestigOpnieuw, setBevestigOpnieuw] = useState(false);
  const [staat, setStaat] = useState<"rust" | "bezig" | "ingepland" | "fout">("rust");
  const [fout, setFout] = useState<string | null>(null);
  const wacht = staat === "bezig" || refreshing;

  async function plan(mode: "meer" | "opnieuw") {
    setStaat("bezig");
    setFout(null);
    setBevestigOpnieuw(false);
    try {
      // Eerst de instellingen opslaan, dan pas plannen: anders leest de crawl
      // met de oude bovengrens en klopt de uitkomst niet met wat er op het
      // scherm staat.
      const bewaard = await fetch(`/api/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_inventory_pages: max,
          crawl_priority_paths: voorrang,
        }),
      });
      if (!bewaard.ok) {
        setStaat("fout");
        setFout("De instelling kon niet opgeslagen worden.");
        return;
      }

      const res = await fetch(`/api/profiles/${profileId}/refresh-inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, speed }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        queued?: boolean;
        already?: boolean;
        detail?: string;
        error?: string;
      };
      if (!res.ok) {
        setStaat("fout");
        setFout(json.detail ?? json.error ?? null);
        return;
      }
      setStaat("ingepland");
      refresh();
    } catch {
      // A.5: geen rauwe JS-foutmelding ("Failed to fetch") op het scherm, dat
      // zegt niets over wat de klant eraan kan doen.
      setStaat("fout");
      setFout("We konden ORBIT ENGINE niet bereiken. Controleer je verbinding en probeer het opnieuw.");
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      <span className="mono-label">Wat er al op je site staat</span>
      <p className="text-sm text-secondary">
        ORBIT ENGINE brengt in kaart welke pagina&apos;s je website al heeft, zodat een aanbeveling
        bestaande content kan verbeteren in plaats van altijd iets nieuws voor te stellen.
        Productpagina&apos;s van webshops blijven buiten beschouwing.{" "}
        {typeof totaal === "number" && totaal > count ? (
          <>
            Je site heeft <span className="font-medium">{totaal} pagina&apos;s</span> en ORBIT
            ENGINE leest er <span className="font-medium">{count}</span>, verdeeld over alle delen
            van de site.
          </>
        ) : (
          <>
            Nu op <span className="font-medium">{count} pagina&apos;s</span>.
          </>
        )}
      </p>

      {initialLastRunAt && (
        <p className="text-sm text-muted">
          Laatst gelezen op {new Date(initialLastRunAt).toLocaleDateString("nl-NL")}
          {initialLastMode === "meer" ? ", aangevuld" : initialLastMode === "opnieuw" ? ", opnieuw gecrawld" : ""}.
        </p>
      )}
      {initialBlockedAt && (
        <div
          className="rounded-[var(--radius-md)] border border-[var(--status-error)] px-3 py-2 text-sm"
          role="status"
        >
          <span className="mono-label">De site weerde ons</span>
          <p className="mt-1 text-secondary">
            Bij de laatste ronde antwoordde de site met een 403. Laat ons adres toe bij de
            hostingpartij, of zet het tempo op langzaam.
          </p>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Aantal pagina&apos;s deze ronde</span>
        <input
          type="number"
          min={5}
          max={500}
          className="field w-32"
          value={max}
          onChange={(e) => setMax(Number(e.target.value) || 0)}
        />
        <span className="text-sm text-muted">
          Tussen 5 en 500 voor deze ronde. De doorlopende instelling die andere stappen gebruiken
          blijft maximaal 150.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Mappen met voorrang</span>
        <input
          type="text"
          className="field"
          placeholder="/diensten, /behandelingen"
          value={voorrang}
          onChange={(e) => setVoorrang(e.target.value)}
        />
        <span className="text-sm text-muted">
          Is je site groter dan het maximum? Noem hier de mappen waar je aanbod staat, gescheiden
          door komma&apos;s. Laat je dit leeg, dan bepaalt ORBIT ENGINE zelf welke delen het
          zwaarst wegen.
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="mono-label">Tempo</span>
        <div className="flex flex-wrap gap-2">
          {CRAWL_SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className={s === speed ? "chip chip-green" : "chip chip-neutral"}
              onClick={() => setSpeed(s)}
              disabled={wacht}
            >
              {speedProfile(s).label}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted">{speedProfile(speed).description}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void plan("meer")}
          disabled={wacht}
          className="btn-outline disabled:opacity-60"
        >
          {wacht ? "Bezig…" : "Meer pagina's lezen"}
        </button>
        {!bevestigOpnieuw ? (
          <button
            type="button"
            onClick={() => setBevestigOpnieuw(true)}
            disabled={wacht}
            className="btn-outline disabled:opacity-60"
          >
            Opnieuw crawlen
          </button>
        ) : (
          <span className="flex items-center gap-2 text-sm">
            De gelezen pagina&apos;s worden vervangen. Zeker weten?
            <button type="button" className="btn-primary btn-sm" disabled={wacht} onClick={() => void plan("opnieuw")}>
              Ja, opnieuw crawlen
            </button>
            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={wacht}
              onClick={() => setBevestigOpnieuw(false)}
            >
              Annuleren
            </button>
          </span>
        )}
      </div>

      {staat === "ingepland" && (
        <span className="flex items-center gap-1.5 text-sm text-[var(--intent-growth-text)]">
          <Icon naam="klaar" size={14} />
          Ingepland. Dit kan een paar minuten duren, ververs de pagina om de nieuwe stand te zien.
        </span>
      )}
      {staat === "fout" && (
        <span className="text-sm text-[var(--status-error)]">
          Vernieuwen is niet gelukt{fout ? `: ${fout}` : "."}
        </span>
      )}
    </div>
  );
}
