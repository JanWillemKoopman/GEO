"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { TagListEditor } from "@/components/tag-list-editor";
import {
  BRAND_FIELDS,
  STEP_META,
  STEP_ORDER,
  fieldsOfStep,
  isFilled,
  overallProgress,
  stepProgress,
  type BrandField,
  type BrandStep,
} from "@/lib/pipeline/brand-fields";
import type { Profile } from "@/lib/types/database";

/**
 * Het merkprofiel invullen, in vijf stappen.
 *
 * ── WAAROM DIT GEEN LEEG FORMULIER IS ───────────────────────────────────────
 *
 * Nova laat hun klant twintig minuten uittrekken (`landingTimeNote`) voor een
 * onboarding van dertig velden die hij van nul invult. ORBIT ENGINE kan dat korter,
 * omdat het onderzoek hier vóór de kennismaking draait in plaats van erna: van
 * de veertig velden staat het merendeel er al, gevonden op de site van de klant.
 *
 * Vandaar het label **"uit je website gehaald"** (Nova's `draftedBadge`) bij
 * elk veld dat de pijplijn zelf vulde. De klant vult niets in, hij kijkt na. Dat
 * is een wezenlijk andere handeling, en het scherm zegt dat ook.
 *
 * ── WAAROM ÉÉN ROUTE EN GEEN VIJF ───────────────────────────────────────────
 *
 * De stap staat in de state en niet in de URL. Een half ingevuld formulier over
 * vijf routes verdelen betekent dat elke stapwissel een opslagmoment moet zijn,
 * anders ben je je invoer kwijt bij een misklik. Nu is opslaan een eigen
 * handeling met een eigen knop, en de stappen zijn alleen een indeling.
 *
 * ⚠️ Er staat daarom één waarschuwing tegenover: wie wegnavigeert met
 * openstaande wijzigingen, verliest ze. `onbeforeunload` vangt de harde variant.
 */
export function BrandWizard({
  profileId,
  initial,
  sources,
}: {
  profileId: string;
  initial: Profile;
  /** Per veld waar de waarde vandaan komt, uit `profile_field_sources`. */
  sources: Record<string, string>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [stap, setStap] = useState<BrandStep>("fundament");
  const [waarden, setWaarden] = useState<Record<string, unknown>>(() => {
    const start: Record<string, unknown> = {};
    for (const f of BRAND_FIELDS) start[f.key as string] = initial[f.key];
    return start;
  });
  const [vuil, setVuil] = useState(false);
  const [busy, setBusy] = useState(false);

  const voortgang = useMemo(
    () => overallProgress(waarden as Partial<Profile>),
    [waarden],
  );
  const stapIndex = STEP_ORDER.indexOf(stap);
  const laatste = stapIndex === STEP_ORDER.length - 1;

  // Het vangnet bij het sluiten van het tabblad of een harde navigatie. Vangt
  // niet alles: een klik op een link binnen de app gaat hier langs, en daarvoor
  // staat de waarschuwing onderaan het scherm. Browsers tonen hun eigen tekst,
  // dus die valt hier niet te schrijven.
  useEffect(() => {
    if (!vuil) return;
    function waarschuw(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", waarschuw);
    return () => window.removeEventListener("beforeunload", waarschuw);
  }, [vuil]);

  function zet(key: string, value: unknown) {
    setWaarden((w) => ({ ...w, [key]: value }));
    setVuil(true);
  }

  async function bewaar(daarna?: () => void) {
    setBusy(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(waarden),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        toast({
          intent: "fout",
          title: "Opslaan is niet gelukt",
          description: j?.error ?? "Probeer het zo nog eens.",
        });
        return;
      }
      setVuil(false);
      toast({
        intent: "succes",
        title: "Je merkprofiel is bijgewerkt",
        description:
          "ORBIT ENGINE gebruikt dit vanaf nu in élke pagina die het schrijft, niet alleen in de eerstvolgende.",
      });
      router.refresh();
      daarna?.();
    } catch {
      toast({
        intent: "fout",
        title: "Geen verbinding",
        description: "Controleer je internet en probeer het opnieuw.",
      });
    } finally {
      setBusy(false);
    }
  }

  const meta = STEP_META[stap];

  return (
    <div className="flex flex-col gap-6">
      {/* ── De rail ───────────────────────────────────────────────────────
          Nova's "Your strategy taking shape": een lijst die meegroeit terwijl je
          vult. Hier per stap het aantal ingevulde velden, want dat is het enige
          eerlijke signaal van voortgang. */}
      <nav className="flex flex-wrap gap-2" aria-label="Stappen">
        {STEP_ORDER.map((s, i) => {
          const p = stepProgress(waarden as Partial<Profile>, s);
          const actief = s === stap;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStap(s)}
              aria-current={actief ? "step" : undefined}
              className="flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: actief
                  ? "var(--intent-intelligence-border)"
                  : "var(--border-subtle)",
                background: actief
                  ? "var(--intent-intelligence-surface)"
                  : "var(--bg-surface)",
                color: actief ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <span className="mono-label">{String(i + 1).padStart(2, "0")}</span>
              <span>{STEP_META[s].title}</span>
              <span
                className={p.compleet ? "chip chip-success" : "chip chip-neutral"}
              >
                {p.gevuld}/{p.totaal}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight">{meta.title}</h2>
        <p className="text-secondary">{meta.description}</p>
      </div>

      <div className="flex flex-col gap-4">
        {fieldsOfStep(stap).map((field) => (
          <FieldRow
            key={field.key as string}
            field={field}
            value={waarden[field.key as string]}
            source={sources[field.key as string]}
            onChange={(v) => zet(field.key as string, v)}
          />
        ))}
      </div>

      {/* ── De onderbalk ──────────────────────────────────────────────────
          Sticky, want dit scherm is lang en de opslagknop moet bereikbaar
          blijven zonder terug te scrollen (ux-design.md §7). */}
      <div className="no-print sticky bottom-0 -mx-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-base-blur)] px-6 py-3 backdrop-blur-md">
        <span className="mono-label">
          {voortgang.gevuld} van de {voortgang.totaal} ingevuld
          {vuil && " · niet opgeslagen"}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {stapIndex > 0 && (
            <button
              type="button"
              className="btn-outline"
              onClick={() => setStap(STEP_ORDER[stapIndex - 1])}
            >
              Vorige
            </button>
          )}
          <button
            type="button"
            className="btn-outline"
            onClick={() => void bewaar()}
            disabled={busy || !vuil}
          >
            {busy ? "Bezig…" : "Bewaren"}
          </button>
          {laatste ? (
            <button
              type="button"
              className="btn-primary btn-lg"
              onClick={() =>
                void bewaar(() => router.push(`/profielen/${profileId}`))
              }
              disabled={busy}
            >
              Bewaren en terug naar het dossier
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setStap(STEP_ORDER[stapIndex + 1])}
            >
              Volgende
            </button>
          )}
        </div>
      </div>

      {vuil && (
        <p className="text-sm text-muted">
          Je hebt wijzigingen die nog niet bewaard zijn.{" "}
          <Link href={`/profielen/${profileId}`} className="underline">
            Terug naar het dossier
          </Link>{" "}
          zonder bewaren gooit ze weg.
        </p>
      )}
    </div>
  );
}

/**
 * Eén veld: label, uitleg, herkomst, invoer.
 *
 * De herkomstchip is het hele punt van dit scherm. `onderzoek` betekent "ORBIT ENGINE
 * heeft dit van je site gehaald, kijk het na"; `klant` of `gesprek` betekent
 * "dit heeft een mens vastgelegd, en een volgende onderzoeksronde laat het met
 * rust" (zie `lib/pipeline/field-merge.ts`).
 */
function FieldRow({
  field,
  value,
  source,
  onChange,
}: {
  field: BrandField;
  value: unknown;
  source?: string;
  onChange: (value: unknown) => void;
}) {
  const id = `veld-${String(field.key)}`;
  const gevuld = isFilled(value);

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold">
          {field.label}
        </label>
        <Herkomst source={source} gevuld={gevuld} derivable={field.derivable} />
      </div>
      <p className="text-sm text-muted">{field.description}</p>

      {field.kind === "lijst" ? (
        <TagListEditor
          items={Array.isArray(value) ? (value as string[]) : []}
          onChange={(items) => onChange(items)}
          placeholder={field.placeholder}
        />
      ) : field.kind === "schuif" || field.kind === "keuze" ? (
        <Standen
          id={id}
          options={field.options ?? []}
          value={
            field.kind === "keuze"
              ? pronounIndex(value)
              : typeof value === "number"
                ? value
                : null
          }
          onChange={(n) =>
            onChange(field.kind === "keuze" ? PRONOUN_VALUES[n - 1] : n)
          }
        />
      ) : field.kind === "lange-tekst" ? (
        <textarea
          id={id}
          className="field"
          rows={3}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      ) : (
        <input
          id={id}
          className="field"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      )}
    </div>
  );
}

/** De drie waarden van `pronoun_preference`, op dezelfde volgorde als de labels. */
const PRONOUN_VALUES = ["je", "u", "wij"] as const;

function pronounIndex(value: unknown): number | null {
  const i = PRONOUN_VALUES.indexOf(value as (typeof PRONOUN_VALUES)[number]);
  return i === -1 ? null : i + 1;
}

function Herkomst({
  source,
  gevuld,
  derivable,
}: {
  source?: string;
  gevuld: boolean;
  derivable: boolean;
}) {
  if (!gevuld) {
    // Een leeg veld dat ORBIT ENGINE niet kán vinden, is geen tekortkoming van de app
    // maar een vraag aan de klant. Dat verschil hoort zichtbaar te zijn.
    return (
      <span className="chip chip-neutral">
        {derivable ? "niets gevonden" : "vul jij in"}
      </span>
    );
  }
  if (source === "klant" || source === "gesprek") {
    return <span className="chip chip-success">door jou vastgelegd</span>;
  }
  return <span className="chip">uit je website gehaald</span>;
}

/**
 * De schuifstanden als knoppenrij en niet als `<input type="range">`.
 *
 * Een schuifbalk zonder benoemde standen dwingt de gebruiker te raden wat stand
 * 2 betekent. Nova benoemt ze allemaal (`formality1` tot `formality3`), en dan
 * is een rij knoppen eerlijker: je kiest een woord, geen positie.
 */
function Standen({
  id,
  options,
  value,
  onChange,
}: {
  id: string;
  options: string[];
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={id}>
      {options.map((label, i) => {
        const n = i + 1;
        const actief = value === n;
        return (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={actief}
            onClick={() => onChange(n)}
            className="rounded-[var(--radius-md)] border px-3 py-2 text-sm transition-colors"
            style={{
              borderColor: actief
                ? "var(--intent-intelligence-border)"
                : "var(--border-strong)",
              background: actief
                ? "var(--intent-intelligence-surface)"
                : "var(--bg-surface)",
              color: actief ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: actief ? 600 : 400,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
