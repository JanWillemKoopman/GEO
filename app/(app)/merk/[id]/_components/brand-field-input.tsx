"use client";

import { TagListEditor } from "@/components/tag-list-editor";
import { isFilled, type BrandField } from "@/lib/pipeline/brand-fields";
import type { Persona } from "@/lib/types/database";

/**
 * ÉÉN veld, op alle oppervlakken hetzelfde.
 *
 * ── WAAROM DIT BESTAAT (onboarding 3.0, fase 3) ─────────────────────────────
 *
 * De klantwizard en de onboardingsessie tonen dezelfde velden aan twee
 * verschillende mensen. De verleiding is om voor de sessie een tweede formulier
 * te bouwen, en dat is precies de fout die `strategy-box.tsx` al benoemt: een
 * tweede scherm met dezelfde velden is een tweede plek waar iets kan verouderen.
 *
 * Dus staat de weergave hier, één keer: label, uitleg, voorbeeld, herkomstchip
 * en de invoer per soort. Wat de sessie erbij heeft (een stand per veld en de
 * knop "niet van toepassing") is optioneel. Laat je die weg, dan gedraagt dit
 * component zich exact als de rij die tot 19 augustus 2026 in `brand-wizard.tsx`
 * stond.
 */

/** Wat er met dit veld gebeurt sinds de laatste aanraking (alleen de sessie). */
export type VeldStand = "rust" | "opslaan" | "opgeslagen" | "mislukt";

export function BrandFieldInput({
  field,
  value,
  source,
  notApplicable,
  stand,
  onChange,
  onCommit,
  onToggleNvt,
  onRetry,
}: {
  field: BrandField;
  value: unknown;
  /** Uit `profile_field_sources`. Bepaalt de chip rechtsboven. */
  source?: string;
  notApplicable?: boolean;
  /** Weglaten op een oppervlak dat met één knop opslaat. */
  stand?: VeldStand;
  onRetry?: () => void;
  onChange: (value: unknown) => void;
  /**
   * Het veld is klaar met bewerken (focus weg, of een keuze aangeklikt). De
   * sessie slaat hier op; de wizard laat dit weg en gebruikt zijn knop.
   */
  onCommit?: () => void;
  onToggleNvt?: () => void;
}) {
  const id = `veld-${String(field.key)}`;
  const gevuld = isFilled(value);

  return (
    <div
      className="card flex flex-col gap-2"
      id={`veld-anker-${String(field.key)}`}
      style={notApplicable ? { opacity: 0.55 } : undefined}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold">
          {field.label}
        </label>
        <span className="flex flex-wrap items-center gap-2">
          {stand && stand !== "rust" && <Stand stand={stand} />}
          {notApplicable ? (
            <span className="chip chip-neutral">niet van toepassing</span>
          ) : (
            <Herkomst source={source} gevuld={gevuld} derivable={field.derivable} />
          )}
          {onToggleNvt && (
            <button
              type="button"
              onClick={onToggleNvt}
              className="text-sm text-secondary underline-offset-2 hover:underline"
            >
              {notApplicable ? "Toch invullen" : "Niet van toepassing"}
            </button>
          )}
        </span>
      </div>
      <p className="text-sm text-muted">{field.description}</p>

      {/* ⚠️ De waarde blijft staan, en er komt een knop bij. Stil terugdraaien
          naar de oude waarde laat de consultant het opnieuw typen zonder te
          weten dat het de eerste keer ook al niet lukte. */}
      {stand === "mislukt" && onRetry && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-secondary">
          Dit veld is niet opgeslagen. Wat je typte staat er nog.
          <button type="button" className="btn-outline" onClick={onRetry}>
            Opnieuw proberen
          </button>
        </p>
      )}

      {notApplicable ? null : field.kind === "lijst" ? (
        <TagListEditor
          items={Array.isArray(value) ? (value as string[]) : []}
          onChange={(items) => {
            onChange(items);
            onCommit?.();
          }}
          placeholder={field.placeholder}
        />
      ) : field.kind === "personas" ? (
        <PersonaEditor
          items={Array.isArray(value) ? (value as Persona[]) : []}
          onChange={(items) => onChange(items)}
          onCommit={onCommit}
          placeholder={field.placeholder}
        />
      ) : field.kind === "janee" ? (
        <Standen
          id={id}
          options={field.options ?? ["Ja", "Nee"]}
          // Twee standen die een `boolean` opslaan: stand 1 is ja, stand 2 is
          // nee. Nogmaals klikken zet hem terug op niet vastgesteld, want dat is
          // een echte derde uitkomst (conventie 3).
          value={value === true ? 1 : value === false ? 2 : null}
          onChange={(n) => {
            onChange(n === 1);
            onCommit?.();
          }}
          onClear={() => {
            onChange(null);
            onCommit?.();
          }}
        />
      ) : field.kind === "schuif" || field.kind === "keuze" ? (
        <Standen
          id={id}
          options={field.options ?? []}
          // Een `keuze` slaat een woord op (`lokaal`, `dienstverlener`), een
          // `schuif` een nummer van 1 tot 3 of 4. De stand op het scherm is in
          // beide gevallen een index, dus alleen de vertaling verschilt.
          value={
            field.values
              ? indexVan(field.values, value)
              : typeof value === "number"
                ? value
                : null
          }
          onChange={(n) => {
            onChange(field.values ? field.values[n - 1] : n);
            onCommit?.();
          }}
          // Nogmaals klikken op de actieve stand zet hem terug op "niet
          // ingesteld". Zonder dat is een per ongeluk aangeklikte stand niet
          // meer weg te krijgen zonder een aparte resetknop (C.28).
          onClear={() => {
            onChange(null);
            onCommit?.();
          }}
        />
      ) : field.kind === "lange-tekst" ? (
        <textarea
          id={id}
          className="field"
          rows={3}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onCommit?.()}
          placeholder={field.placeholder}
        />
      ) : (
        <input
          id={id}
          className="field"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onCommit?.()}
          placeholder={field.placeholder}
        />
      )}
    </div>
  );
}

/**
 * De stand van het opslaan, per veld.
 *
 * ⚠️ Een mislukte opslag laat de getypte waarde staan en zegt het erbij. Stil
 * terugdraaien naar de oude waarde is de duurste fout die dit scherm kan maken:
 * de consultant typt het dan opnieuw zonder te weten dat het de eerste keer ook
 * al niet lukte.
 */
function Stand({ stand }: { stand: VeldStand }) {
  if (stand === "opslaan") return <span className="chip chip-neutral">opslaan</span>;
  if (stand === "opgeslagen") return <span className="chip chip-success">opgeslagen</span>;
  return <span className="chip chip-danger">niet gelukt</span>;
}

/** Welke stand hoort bij deze opgeslagen waarde? 1-gebaseerd, `null` als hij er niet bij staat. */
function indexVan(values: string[], value: unknown): number | null {
  const i = values.indexOf(String(value ?? ""));
  return i === -1 ? null : i + 1;
}

/**
 * Klanttypes: een lijst van naam plus behoeftes.
 *
 * Het enige veld dat geen tekst of tekstlijst is, en daarom een eigen invoer
 * heeft in plaats van `TagListEditor`. De behoeftes gaan als komma-lijst, net
 * als in de platte editor die dit veld tot 17 augustus 2026 bezat: een tweede
 * invoerpatroon leren voor één veld is meer moeite dan het oplevert.
 */
function PersonaEditor({
  items,
  onChange,
  onCommit,
  placeholder,
}: {
  items: Persona[];
  onChange: (items: Persona[]) => void;
  onCommit?: () => void;
  placeholder?: string;
}) {
  function patch(index: number, veranderd: Partial<Persona>) {
    onChange(items.map((p, i) => (i === index ? { ...p, ...veranderd } : p)));
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((persona, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3"
        >
          <input
            className="field"
            value={persona.name}
            onChange={(e) => patch(i, { name: e.target.value })}
            onBlur={() => onCommit?.()}
            placeholder={placeholder ?? "Naam van dit klanttype"}
            aria-label="Naam van dit klanttype"
          />
          <input
            className="field"
            value={persona.needs.join(", ")}
            onChange={(e) =>
              patch(i, {
                needs: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            onBlur={() => onCommit?.()}
            placeholder="Waar deze persoon mee zit, gescheiden door komma's"
            aria-label="Behoeftes, gescheiden door komma's"
          />
          <button
            type="button"
            onClick={() => {
              onChange(items.filter((_, idx) => idx !== i));
              onCommit?.();
            }}
            className="w-fit text-sm text-[var(--status-error)] hover:underline"
          >
            Verwijderen
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { name: "", needs: [] }])}
        className="btn-outline w-fit"
      >
        + Klanttype toevoegen
      </button>
    </div>
  );
}

/**
 * De herkomstchip, en dat is het hele punt van dit component.
 *
 * `onderzoek` betekent "ORBIT ENGINE heeft dit van je site gehaald, kijk het
 * na"; `klant` of `gesprek` betekent "dit heeft een mens vastgelegd, en een
 * volgende onderzoeksronde laat het met rust" (zie `lib/pipeline/field-merge.ts`).
 */
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
    // Een leeg veld dat ORBIT ENGINE niet kán vinden, is geen tekortkoming van
    // de app maar een vraag aan de klant. Dat verschil hoort zichtbaar te zijn.
    return (
      <span className="chip chip-neutral">
        {derivable ? "niets gevonden" : "vul jij in"}
      </span>
    );
  }
  if (source === "klant" || source === "gesprek") {
    return <span className="chip chip-success">door jou vastgelegd</span>;
  }
  // Vóór het eerste contact klaargezet (migratie 0060). "Door jou vastgelegd"
  // zou hier niet kloppen: de klant heeft dit niet gezegd, wij hebben het
  // aangenomen. Wel een mensbron, dus een volgende onderzoeksronde laat het
  // staan, en de klant mag het overschrijven zonder dat het opvalt.
  if (source === "consultant") {
    return <span className="chip chip-success">door ons ingevuld</span>;
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
  onClear,
}: {
  id: string;
  options: string[];
  value: number | null;
  onChange: (value: number) => void;
  onClear: () => void;
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
            onClick={() => (actief ? onClear() : onChange(n))}
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
