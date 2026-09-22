"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CLUSTERFILTER_ALLES,
  FUNNELFILTER_ALLES,
  LABELFILTER_ALLES,
  LABELFILTER_GEEN,
  PERIODEFILTER_ACTUEEL,
  type Periodeoptie,
} from "@/lib/analytics-filters";
import type { Labelachtig } from "@/lib/cluster-labels";
import { BRONFILTER_STANDAARD, bronToelichting, bronfilterNaarAdres, type Bron } from "@/lib/engines/bron";

/**
 * De ene filterbalk voor alle vier de Analytics-schermen (plan
 * analytics-herontwerp.md, F2). Periode, Label, Bron, Cluster en Funnel, in
 * die volgorde.
 *
 * Bron kwam erbij op 20 september 2026, toen Google AI Overview als tweede
 * meetbron ging meedraaien. Hij verschijnt alleen als er daadwerkelijk via meer
 * dan één bron gemeten is (`beschikbareBronnen()`), dus voor een klant met
 * alleen ChatGPT-metingen verandert er niets aan dit scherm.
 *
 * ── WAAROM BRON AANVINKVAKJES ZIJN EN GEEN KEUZEMENU (23 september 2026) ────
 *
 * Meerdere bronnen tegelijk aanvinken kan, tot en met "alle bronnen". Het
 * merkcijfer, de grafiek en de clustertabel tonen dan het GEMIDDELDE van de
 * aangevinkte bronnen, nooit een cijfer per bron naast elkaar
 * (`cijferVoorBronnen()` in `lib/engines/bron.ts`): dat blijft de regel van 20
 * september 2026, alleen kan die ene score nu over meer dan één bron gaan.
 *
 * Funnel filtert alleen de prompttabel onderaan (elke vraag heeft een fase,
 * een cluster niet), en verschijnt alleen als er meer dan één fase in de
 * getoonde vragen voorkomt.
 *
 * De keuze staat in het adres en niet in clientstate (`?periode=`, `?label=`,
 * `?cluster=`), dus een gefilterd beeld is te delen en te bewaren. Elke
 * dropdown verschijnt alleen als er iets te kiezen valt: één cluster of één
 * label heeft geen keuzemenu nodig, net als `PeriodPicker` dat al deed.
 */
export function AnalyticsFilters({
  periodes,
  labels,
  clustersBijLabel,
  bronnen = [],
  funnelfasen = [],
  periodefilter,
  labelfilter,
  clusterfilter,
  bronfilter = BRONFILTER_STANDAARD,
  funnelfilter = FUNNELFILTER_ALLES,
}: {
  periodes: Periodeoptie[];
  labels: Labelachtig[];
  /** De clusters die bij het huidige labelfilter horen (`clustersVoorFilter()`). */
  clustersBijLabel: Labelachtig[];
  /** De bronnen waarin daadwerkelijk gemeten is (`beschikbareBronnen()`). */
  bronnen?: Bron[];
  /** De funnelfasen die in de getoonde vragen voorkomen (`beschikbareFunnelfasen()`). */
  funnelfasen?: string[];
  periodefilter: string;
  labelfilter: string;
  clusterfilter: string;
  /** De aangevinkte bronnen; meer dan één mag. */
  bronfilter?: string[];
  funnelfilter?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (
    periodes.length < 2 &&
    labels.length === 0 &&
    clustersBijLabel.length <= 1 &&
    bronnen.length <= 1 &&
    funnelfasen.length <= 1
  ) {
    return null;
  }

  function navigeer(wijzigingen: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [sleutel, waarde] of Object.entries(wijzigingen)) {
      if (waarde === null) params.delete(sleutel);
      else params.set(sleutel, waarde);
    }
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div
      className="analytics-filterbalk no-print sticky top-[var(--header-h)] z-20 -mx-6 flex flex-wrap items-center gap-4 border-b border-[var(--line-muted)] bg-[var(--bg-base)] px-6 py-3"
      role="group"
      aria-label="Filters"
    >
      {periodes.length >= 2 && (
        <Filter label="Periode">
          <select
            className="field"
            value={periodefilter}
            onChange={(e) => navigeer({ periode: e.target.value === PERIODEFILTER_ACTUEEL ? null : e.target.value })}
          >
            <option value={PERIODEFILTER_ACTUEEL}>Actueel</option>
            {periodes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Filter>
      )}

      {labels.length > 0 && (
        <Filter label="Label">
          <select
            className="field"
            value={labelfilter}
            // Een gekozen label beperkt de clusterlijst (F2); een nieuwe keuze
            // die niet meer bij dat label hoort is verwarrender dan de
            // clusterkeuze meteen terug te zetten op "alle clusters".
            onChange={(e) =>
              navigeer({
                label: e.target.value === LABELFILTER_ALLES ? null : e.target.value,
                cluster: null,
              })
            }
          >
            <option value={LABELFILTER_ALLES}>Alle labels</option>
            <option value={LABELFILTER_GEEN}>Zonder label</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Filter>
      )}

      {bronnen.length > 1 && (
        <Filter label="Bron">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={bronfilter.length === bronnen.length}
                onChange={(e) =>
                  navigeer({
                    bron: e.target.checked ? bronfilterNaarAdres(bronnen.map((b) => b.id)) : bronfilterNaarAdres([bronnen[0].id]),
                  })
                }
              />
              Alle bronnen
            </label>
            {bronnen.map((b) => (
              <label key={b.id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={bronfilter.includes(b.id)}
                  onChange={(e) => {
                    const volgende = e.target.checked
                      ? [...bronfilter, b.id]
                      : bronfilter.filter((id) => id !== b.id);
                    if (volgende.length === 0) return; // minstens één bron blijft aangevinkt
                    navigeer({ bron: bronfilterNaarAdres(volgende) });
                  }}
                />
                {b.label}
              </label>
            ))}
          </div>
        </Filter>
      )}

      {bronnen.length > 1 &&
        bronfilter
          .map((b) => bronToelichting(b))
          .filter((tekst): tekst is string => tekst !== null)
          .map((tekst) => (
            <p key={tekst} className="text-secondary w-full basis-full text-sm">
              {tekst}
            </p>
          ))}

      {clustersBijLabel.length > 1 && (
        <Filter label="Cluster">
          <select
            className="field"
            value={clusterfilter}
            onChange={(e) => navigeer({ cluster: e.target.value === CLUSTERFILTER_ALLES ? null : e.target.value })}
          >
            <option value={CLUSTERFILTER_ALLES}>Alle clusters</option>
            {clustersBijLabel.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Filter>
      )}

      {funnelfasen.length > 1 && (
        <Filter label="Funnel">
          <select
            className="field"
            value={funnelfilter}
            onChange={(e) => navigeer({ funnel: e.target.value === FUNNELFILTER_ALLES ? null : e.target.value })}
          >
            <option value={FUNNELFILTER_ALLES}>Alle fasen</option>
            {funnelfasen.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Filter>
      )}
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="mono-label">{label}</span>
      {children}
    </label>
  );
}
