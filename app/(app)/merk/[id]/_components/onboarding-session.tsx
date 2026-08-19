"use client";

import { useMemo, useState } from "react";
import { SectionRail } from "@/components/section-rail";
import { CollapsibleSection } from "@/components/collapsible-section";
import { BrandFieldInput, type VeldStand } from "./brand-field-input";
import { DossierBox } from "./dossier-box";
import { StrategyBox } from "./strategy-box";
import {
  STEP_META,
  CLIENT_STEPS,
  fieldsOfStep,
  stepProgress,
} from "@/lib/pipeline/brand-fields";
import { findGaps } from "@/lib/profile-gaps";
import { examplesFor } from "@/lib/pipeline/brand-examples";
import {
  planRefresh,
  describeRefresh,
  TASK_LABELS,
} from "@/lib/pipeline/onboarding-refresh";
import { sessionMeter, notApplicableFields, type FieldState } from "@/lib/profile-meter";
import type { ContextFactor, Profile } from "@/lib/types/database";

/**
 * DE ONBOARDINGSESSIE: het scherm waar consultant en klant samen aan tafel zitten.
 *
 * ── ⚠️ DIT IS HET ENIGE STAFSCHERM DAT BEDOELD IS OM TE DELEN ───────────────
 *
 * Alle andere stafschermen zijn intern. Hier kijkt de klant mee, en daar volgen
 * drie harde regels uit (`docs/tasks/onboarding-3.0.md` deel B3):
 *
 *   1. Geen taaknamen, geen jobtypes, geen foutmeldingen uit de wachtrij.
 *   2. Geen bedragen op het scherm.
 *   3. Geen interne begrippen. De tekst volgt `docs/schrijfstijl.md` alsof de
 *      klant de lezer is, want dat is hij.
 *
 * `scripts/test-unit.ts` leest dit bestand en faalt als er alsnog een jobtype,
 * een bedrag of een foutcode in komt te staan.
 *
 * ── DE VOLGORDE IS DE BELANGRIJKSTE KEUZE VAN DIT SCHERM ────────────────────
 *
 * Het opent met wat we NIET weten, niet met veld 1. Zonder die volgorde kost het
 * gesprek een uur aan het bevestigen van dingen die al klopten, en dat is precies
 * het uur waar de klant voor betaalt.
 *
 * ── GEEN TWEEDE FORMULIER ───────────────────────────────────────────────────
 *
 * Elk veld komt uit `BRAND_FIELDS` en wordt gerenderd door `BrandFieldInput`,
 * hetzelfde component als de klantwizard gebruikt. Er is geen tweede
 * veldendefinitie en geen tweede opslagroute; het verschil met de wizard zit in
 * wie er mag, welke stappen je ziet, en de herkomst die wordt weggeschreven.
 */
export function OnboardingSession({
  profileId,
  brandName,
  initial,
  initialStates,
  strategyNotes,
  strategyFactors,
  recordedAt,
  changedSinceResearch,
  openAnalyses,
}: {
  profileId: string;
  brandName: string;
  initial: Profile;
  /** Per veld de herkomst en of hij op n.v.t. staat. */
  initialStates: Record<string, FieldState>;
  strategyNotes: string | null;
  strategyFactors: ContextFactor[];
  /** Wanneer het gesprek is vastgelegd. Null = nog niet. */
  recordedAt: string | null;
  /** Velden die een mens heeft gezet ná de laatste onderzoeksronde. */
  changedSinceResearch: string[];
  /** Analyses waarvan de vragen nog opnieuw opgesteld kunnen worden. */
  openAnalyses: number;
}) {
  const [waarden, setWaarden] = useState<Record<string, unknown>>(() => {
    const start: Record<string, unknown> = {};
    for (const veld of ALLE_VELDEN) start[veld.key as string] = initial[veld.key];
    return start;
  });
  const [standen, setStanden] = useState<Record<string, VeldStand>>({});
  // De voorbeelden van de branche van dit merk (`brand-examples.ts`). Vooral op
  // dit scherm belangrijk: de commerciële velden beginnen helemaal leeg, dus
  // daar doet het voorbeeld het werk van de uitleg.
  const voorbeelden = useMemo(() => examplesFor(initial), [initial]);
  // Wat er sinds de laatste onderzoeksronde gewijzigd is. Begint bij wat de
  // server meegaf en groeit met alles wat er in dit gesprek bij komt.
  const [gewijzigd, setGewijzigd] = useState<string[]>(changedSinceResearch);
  const [bijwerken, setBijwerken] = useState<"rust" | "bezig" | "gedaan" | "mislukt">("rust");
  const [states, setStates] = useState<Record<string, FieldState>>(initialStates);

  const meter = useMemo(
    () => sessionMeter(waarden as Partial<Profile>, states),
    [waarden, states],
  );

  const gaten = useMemo(
    () =>
      findGaps(
        {
          aliases: (waarden.aliases as string[]) ?? [],
          proof_points: (waarden.proof_points as string[]) ?? [],
          service_scope: (waarden.service_scope as string | null) ?? null,
          service_regions: (waarden.service_regions as string[]) ?? [],
          business_model: (waarden.business_model as string | null) ?? null,
        },
        notApplicableFields(states),
      ),
    [waarden, states],
  );

  function zet(key: string, value: unknown) {
    setWaarden((w) => ({ ...w, [key]: value }));
  }

  /**
   * Opslaan per veld, zodra het de focus verlaat.
   *
   * ⚠️ Geen opslaanknop onderaan en geen waarschuwing bij weglopen, anders dan
   * in de klantwizard. Een gesprek springt, wordt onderbroken, en de klant pakt
   * halverwege zijn telefoon om iets op te zoeken. Een half ingevuld formulier
   * dat bij het weglopen verdwijnt is de duurste fout die dit scherm kan maken.
   */
  async function bewaarVeld(key: string) {
    setStanden((s) => ({ ...s, [key]: "opslaan" }));
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: waarden[key], bron: "gesprek" }),
      });
      if (!res.ok) {
        setStanden((s) => ({ ...s, [key]: "mislukt" }));
        return;
      }
      setStanden((s) => ({ ...s, [key]: "opgeslagen" }));
      setStates((s) => ({ ...s, [key]: { ...s[key], source: "gesprek" } }));
      setGewijzigd((v) => (v.includes(key) ? v : [...v, key]));
    } catch {
      setStanden((s) => ({ ...s, [key]: "mislukt" }));
    }
  }

  /** Niet van toepassing aan- of uitzetten. Zelfde route, andere sleutel. */
  async function zetNvt(key: string) {
    const nieuw = !states[key]?.notApplicable;
    setStanden((s) => ({ ...s, [key]: "opslaan" }));
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nvt: { [key]: nieuw }, bron: "gesprek" }),
      });
      if (!res.ok) {
        setStanden((s) => ({ ...s, [key]: "mislukt" }));
        return;
      }
      setStanden((s) => ({ ...s, [key]: "opgeslagen" }));
      setStates((s) => ({ ...s, [key]: { ...s[key], notApplicable: nieuw } }));
    } catch {
      setStanden((s) => ({ ...s, [key]: "mislukt" }));
    }
  }

  const plan = useMemo(
    () => planRefresh(gewijzigd, { analyses: openAnalyses }),
    [gewijzigd, openAnalyses],
  );

  /**
   * Precies de stappen inplannen die van de gewijzigde velden afhangen.
   *
   * De bevestiging draagt de raming, en dat is de enige plek waar een bedrag
   * hoort te staan: dit scherm wordt met de klant gedeeld.
   */
  async function werkBij() {
    if (!window.confirm(describeRefresh(plan))) return;
    setBijwerken("bezig");
    try {
      const res = await fetch(`/api/profiles/${profileId}/refresh`, { method: "POST" });
      setBijwerken(res.ok ? "gedaan" : "mislukt");
    } catch {
      setBijwerken("mislukt");
    }
  }

  function veld(key: string) {
    const definitie = ALLE_VELDEN.find((f) => (f.key as string) === key)!;
    return (
      <BrandFieldInput
        key={key}
        field={definitie}
        value={waarden[key]}
        example={voorbeelden[key]}
        source={states[key]?.source}
        notApplicable={states[key]?.notApplicable}
        stand={standen[key] ?? "rust"}
        onChange={(v) => zet(key, v)}
        onCommit={() => void bewaarVeld(key)}
        onToggleNvt={() => void zetNvt(key)}
        onRetry={() => void bewaarVeld(key)}
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:gap-10">
      <SectionRail
        sections={[
          {
            id: "open",
            label: "Nog niet bekend",
            badge: gaten.length > 0 ? `${gaten.length} open` : undefined,
          },
          { id: "markt", label: "Wat je wilt" },
          { id: "gevonden", label: "Wat we vonden" },
          { id: "materiaal", label: "Wat je hebt" },
          { id: "speelt", label: "Wat er speelt" },
          { id: "afronden", label: "Afronden" },
        ]}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-12">
        {/* ── 1. Wat we nog niet weten ─────────────────────────────────────
            Bovenaan, en dat is de kern van dit scherm. Elk punt noemt het
            gevolg en niet het gemis, en de zwaarste staat bovenaan. */}
        <section id="open" className="flex flex-col gap-3">
          <Kop
            nummer="01"
            titel="Wat we nog niet weten"
            uitleg="Hier begint het gesprek. Elk punt hieronder maakt de meting of de teksten scherper, en het zwaarste staat bovenaan."
          />
          {gaten.length === 0 ? (
            <div className="card card-success flex flex-col gap-1">
              <span className="mono-label">Niets open</span>
              <p className="text-secondary">
                ORBIT ENGINE heeft alles wat het nodig heeft om te meten en te schrijven.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {gaten.map((gat) => (
                <li key={gat.field} className="card flex flex-col gap-2">
                  <span className="text-sm font-semibold">{gat.label}</span>
                  <p className="text-sm text-secondary">{gat.effect}</p>
                  <a
                    href={`#veld-anker-${gat.field}`}
                    className="btn-outline w-fit"
                  >
                    Invullen
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── 2. Wat we van je willen weten ────────────────────────────────
            De commerciële laag. Het enige blok dat helemaal leeg begint, en
            waar het uur consultancy over gaat. */}
        <section id="markt" className="flex flex-col gap-3">
          <Kop nummer="02" titel={STEP_META.strategie.title} uitleg={STEP_META.strategie.description} />
          <div className="flex flex-col gap-4">
            {fieldsOfStep("strategie").map((f) => veld(f.key as string))}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <Kop nummer="02b" titel={STEP_META.contact.title} uitleg={STEP_META.contact.description} />
            <div className="flex flex-col gap-4">
              {fieldsOfStep("contact").map((f) => veld(f.key as string))}
            </div>
          </div>
        </section>

        {/* ── 3. Wat we al gevonden hebben ─────────────────────────────────
            Ter controle, ingeklapt per stap met de teller ernaast, zodat een
            stap die af is niet in de weg zit. */}
        <section id="gevonden" className="flex flex-col gap-3">
          <Kop
            nummer="03"
            titel="Wat we al gevonden hebben"
            uitleg="Dit heeft ORBIT ENGINE zelf van de website gehaald. Klap open wat je wilt nalopen; wat je aanpast staat meteen vast."
          />
          {CLIENT_STEPS.map((stap) => {
            const p = stepProgress(waarden as Partial<Profile>, stap);
            return (
              <CollapsibleSection
                key={stap}
                title={`${STEP_META[stap].title} · ${p.gevuld} van de ${p.totaal}`}
              >
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted">{STEP_META[stap].description}</p>
                  {fieldsOfStep(stap).map((f) => veld(f.key as string))}
                </div>
              </CollapsibleSection>
            );
          })}
        </section>

        {/* ── 4. Wat je al hebt liggen ─────────────────────────────────────
            Uitgeklapt en niet ingeklapt: het moment waarop de klant zijn
            tarievenpagina of brochure daadwerkelijk bij zich heeft, is dit
            gesprek. */}
        <section id="materiaal" className="flex flex-col gap-3">
          <Kop
            nummer="04"
            titel="Wat je al hebt liggen"
            uitleg="Plak hier een tarievenpagina, een brochure of een stuk tekst. ORBIT ENGINE haalt er de feiten uit en bewaart ze."
          />
          <DossierBox profileId={profileId} />
        </section>

        {/* ── 5. Wat er speelt buiten de website om ────────────────────────── */}
        <section id="speelt" className="flex flex-col gap-3">
          <Kop
            nummer="05"
            titel="Wat er speelt buiten je website om"
            uitleg="Een nieuwe naam, een nieuwe vestiging, een dienst die stopt. Dit soort dingen staan nergens op je site en veranderen wél wat ORBIT ENGINE meet."
          />
          <StrategyBox
            profileId={profileId}
            initialNotes={strategyNotes}
            initialFactors={strategyFactors}
          />
        </section>

        {/* ── 6. Afronden ─────────────────────────────────────────────────── */}
        <section id="afronden" className="flex flex-col gap-3">
          <Kop
            nummer="06"
            titel="Afronden"
            uitleg={`Wat er na dit gesprek nog open staat, en waar ORBIT ENGINE mee verder gaat voor ${brandName}.`}
          />
          <div className="card flex flex-col gap-3">
            <Meter meter={meter} />
            {gaten.length > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="mono-label">Nog open</span>
                <ul className="flex flex-col gap-1">
                  {gaten.map((g) => (
                    <li key={g.field} className="text-sm text-secondary">
                      {g.label}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted">
                  Dit hoeft nu niet af. Alles werkt ook zonder, elk punt maakt het alleen
                  scherper.
                </p>
              </div>
            ) : (
              <p className="text-secondary">
                Er staat niets meer open dat de meting of de teksten scherper zou maken.
              </p>
            )}

            <p className="text-sm text-secondary">
              {recordedAt
                ? `Het gesprek is vastgelegd op ${nlDatum(recordedAt)}. Pas je hierboven iets aan, bewaar het dan opnieuw bij "Wat er speelt".`
                : "Leg het gesprek vast bij “Wat er speelt buiten je website om”. Dan staat er wat je hebt afgesproken, met de datum erbij."}
            </p>
          </div>

          {/* ── Het onderzoek bijwerken ──────────────────────────────────
              ⚠️ De raming staat in het bevestigvenster en niet op het scherm:
              de klant kijkt mee. `describeRefresh()` bouwt die zin, zodat er
              in dit bestand geen bedrag voorkomt. */}
          <div className="card flex flex-col gap-3">
            <span className="mono-label">Het onderzoek bijwerken</span>
            {plan.tasks.length === 0 ? (
              <p className="text-secondary">
                Er is niets veranderd waar het onderzoek anders van wordt. ORBIT ENGINE gaat
                verder met wat er al ligt.
              </p>
            ) : (
              <>
                <p className="text-secondary">
                  Door wat we net hebben vastgelegd, werkt ORBIT ENGINE dit opnieuw uit:
                </p>
                <ul className="flex flex-col gap-1">
                  {plan.tasks.map((t) => (
                    <li key={t} className="text-sm text-secondary">
                      {TASK_LABELS[t]}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-primary w-fit"
                disabled={plan.tasks.length === 0 || bijwerken === "bezig"}
                onClick={() => void werkBij()}
              >
                {bijwerken === "bezig" ? "Bezig…" : "Onderzoek bijwerken"}
              </button>
              {bijwerken === "gedaan" && (
                <span className="text-sm text-secondary">
                  ORBIT ENGINE is ermee bezig. Je kunt dit scherm sluiten.
                </span>
              )}
              {bijwerken === "mislukt" && (
                <span className="text-sm text-[var(--status-error)]">
                  Het is niet gelukt om dit in gang te zetten. Probeer het zo nog eens.
                </span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Alle velden van de sessie, in catalogusvolgorde. */
const ALLE_VELDEN = [
  ...CLIENT_STEPS.flatMap((s) => fieldsOfStep(s)),
  ...fieldsOfStep("strategie"),
  ...fieldsOfStep("contact"),
];

function Kop({
  nummer,
  titel,
  uitleg,
}: {
  nummer: string;
  titel: string;
  uitleg: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mono-label text-muted">{nummer}</span>
      <h2 className="text-xl font-bold tracking-tight">{titel}</h2>
      <p className="text-secondary">{uitleg}</p>
    </div>
  );
}

/**
 * Drie getallen, geen percentage.
 *
 * "78% compleet" verbergt precies het verschil dat telt: hoeveel er door een
 * mens bevestigd is, en hoeveel er nog een aanname is. Zie `profile-meter.ts`.
 */
export function Meter({
  meter,
}: {
  meter: { bevestigd: number; gevonden: number; open: number; totaal: number };
}) {
  return (
    <div className="flex flex-wrap gap-6">
      <Getal waarde={meter.bevestigd} label="samen bevestigd" />
      <Getal waarde={meter.gevonden} label="door ORBIT ENGINE gevonden" />
      <Getal waarde={meter.open} label="nog open" />
    </div>
  );
}

function Getal({ waarde, label }: { waarde: number; label: string }) {
  return (
    <span className="flex flex-col">
      <span className="stat-value text-2xl">{waarde}</span>
      <span className="mono-label text-muted">{label}</span>
    </span>
  );
}

/** 19 augustus 2026, in gewone taal en niet als tijdstempel. */
function nlDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
