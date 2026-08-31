"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

/**
 * De content-inventaris opnieuw laten uitlezen.
 *
 * ── WAAROM DIT GEEN WIZARDVELD IS ───────────────────────────────────────────
 *
 * `max_inventory_pages` is geen merkeigenschap maar een crawl-instelling: het
 * zegt niets over wie de klant is, alleen hoe grondig ORBIT ENGINE zijn site
 * uitleest. Het staat daarom naast de wizard en niet erin, samen met de knop
 * die de crawl opnieuw start. De 42 klantvelden in `lib/pipeline/brand-fields.ts`
 * gaan uitsluitend over het merk zelf, en die grens houdt de teller "42 in,
 * 42 uit" eerlijk.
 *
 * ⚠️ Het sitemap-adres staat wél in de wizard (stap 1): dat is een feit over de
 * site van de klant, geen instelling van ons. Wijzig je het daar, bewaar dan
 * eerst, anders crawlt deze knop nog met het oude adres.
 */
export function InventoryBox({
  profileId,
  initialCount,
  initialMax,
  initialTotalFound = null,
  initialPriorityPaths = [],
}: {
  profileId: string;
  initialCount: number;
  initialMax: number;
  /** Hoeveel pagina's de site in totaal heeft. Null = nog niet gemeten. */
  initialTotalFound?: number | null;
  /** Sitesecties die voorrang krijgen bij het verdelen van de plekken. */
  initialPriorityPaths?: string[];
}) {
  const [count, setCount] = useState(initialCount);
  const [totaal, setTotaal] = useState<number | null>(initialTotalFound);
  const [max, setMax] = useState(initialMax);
  const [voorrang, setVoorrang] = useState(initialPriorityPaths.join(", "));
  const [staat, setStaat] = useState<"rust" | "bezig" | "klaar" | "fout">("rust");
  const [fout, setFout] = useState<string | null>(null);

  async function vernieuw() {
    setStaat("bezig");
    setFout(null);
    try {
      // Eerst de instellingen opslaan, dan pas crawlen: anders leest de crawl
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

      const res = await fetch(`/api/profiles/${profileId}/refresh-inventory`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as {
        count?: number;
        totalFound?: number;
        detail?: string;
        error?: string;
      };
      if (!res.ok) {
        setStaat("fout");
        setFout(json.detail ?? json.error ?? null);
        return;
      }
      setCount(json.count ?? 0);
      if (typeof json.totalFound === "number") setTotaal(json.totalFound);
      setStaat("klaar");
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

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Maximaal aantal pagina&apos;s</span>
        <input
          type="number"
          min={5}
          max={150}
          className="field w-32"
          value={max}
          onChange={(e) => setMax(Number(e.target.value) || 0)}
        />
        <span className="text-sm text-muted">
          Tussen 5 en 150. Meer pagina&apos;s is grondiger, maar trager.
        </span>
      </label>

      {/* ⚠️ Dit is de knop die de consultant miste. Het paginamaximum kon alleen
          omláág (de bovengrens is 150 en de crawl gebruikt die al), dus bij een
          te grote site viel er niets te sturen. Kiezen wélke delen meetellen kan
          wél, en dat helpt precies waar meer pagina's niet helpen. */}
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

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void vernieuw()}
          disabled={staat === "bezig"}
          className="btn-outline disabled:opacity-60"
        >
          {staat === "bezig" ? "ORBIT ENGINE leest je site…" : "Vernieuw inventaris"}
        </button>
        {staat === "klaar" && (
          <span className="flex items-center gap-1.5 text-sm text-[var(--intent-growth-text)]">
            <Icon naam="klaar" size={14} />
            Bijgewerkt: {count} pagina&apos;s
          </span>
        )}
        {staat === "fout" && (
          <span className="text-sm text-[var(--status-error)]">
            Vernieuwen is niet gelukt{fout ? `: ${fout}` : "."}
          </span>
        )}
      </div>
    </div>
  );
}
