"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Antwoordveld } from "@/components/antwoordveld";
import { Icon } from "@/components/icon";

/**
 * De vragen van een pagina (`docs/tasks/contentflow-een-lijn.md` §3.2 en §4.6a).
 *
 * Eén kaart per vraag, en dezelfde kaart op het paginascherm en in "Jouw
 * beurt": wie een vraag op de ene plek ziet, herkent hem op de andere.
 *
 * ── DE REGELS DIE DEZE KAART VOORSPELBAAR HOUDEN ─────────────────────────────
 *
 *   • Elk antwoord slaat meteen op. Geen verzendknop onderaan: het laatste
 *     antwoord ís de handeling die het schrijven start (§3).
 *   • "Overslaan" zegt vooraf wat het kost: welk onderdeel dan niet op de
 *     pagina komt. Overslaan is een volwaardige keuze en telt als antwoord.
 *   • Geen knop "alles overslaan". Het besluit van 23 september 2026 is dat de
 *     klant elke vraag gezien heeft (§1).
 *   • Een beantwoorde vraag klapt in tot één regel met het antwoord en
 *     "Wijzig", zodat de lijst korter wordt naarmate het werk opschiet.
 */
export interface Vraag {
  id: string;
  question: string;
  reason: string | null;
  kind: string | null;
  answer_type: string | null;
  options: string[] | null;
  suggested_answer: string | null;
  required: boolean | null;
  status: "open" | "beantwoord" | "overgeslagen" | string;
  answer: string | null;
  /** De onderdelen van de pagina die op deze vraag leunen. */
  onderdelen: string[];
  /** Voor hoeveel pagina's deze vraag geldt. */
  paginas: number;
}

export function Vragenlijst({
  profileId,
  vragen,
  naAfronden,
}: {
  profileId: string;
  vragen: Vraag[];
  /** Wat de klant leest als de laatste vraag gedaan is. */
  naAfronden: string;
}) {
  const [stand, setStand] = useState<Record<string, { status: string; answer: string | null }>>(() =>
    Object.fromEntries(vragen.map((v) => [v.id, { status: v.status, answer: v.answer }])),
  );
  const gedaan = vragen.filter((v) => stand[v.id]?.status !== "open").length;
  const alles = vragen.length > 0 && gedaan === vragen.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="type-section">Vragen voor deze pagina</h2>
          <span className="type-caption text-muted tabular">
            {gedaan} van {vragen.length} gedaan
          </span>
        </div>
        <div className="stappenflow-voortgang" aria-hidden>
          <div
            className="stappenflow-voortgang-balk"
            style={{ width: `${vragen.length ? Math.round((gedaan / vragen.length) * 100) : 0}%` }}
          />
        </div>
      </div>

      {alles && (
        <div className="card card-success flex items-center gap-2 type-body" role="status">
          <Icon naam="klaar" size={16} />
          {naAfronden}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {vragen.map((v) => (
          <li key={v.id}>
            <Vraagkaart
              profileId={profileId}
              vraag={v}
              stand={stand[v.id]}
              onKlaar={(s) => setStand((oud) => ({ ...oud, [v.id]: s }))}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Vraagkaart({
  profileId,
  vraag,
  stand,
  onKlaar,
}: {
  profileId: string;
  vraag: Vraag;
  stand: { status: string; answer: string | null };
  onKlaar: (s: { status: string; answer: string | null }) => void;
}) {
  const router = useRouter();
  const [waarde, setWaarde] = useState(stand.answer ?? vraag.suggested_answer ?? "");
  const [bewerken, setBewerken] = useState(stand.status === "open");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const labelId = `vraag-${vraag.id}`;

  async function stuur(body: { answer?: string; skip?: boolean }) {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/facts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factId: vraag.id, ...body }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        needsEvidence?: boolean;
        evidenceHint?: string;
      } | null;
      if (!res.ok) {
        setFout(json?.error ?? "Opslaan is niet gelukt. Probeer het opnieuw.");
        return;
      }
      if (json?.needsEvidence && json.evidenceHint) setHint(json.evidenceHint);
      onKlaar(body.skip ? { status: "overgeslagen", answer: null } : { status: "beantwoord", answer: body.answer ?? "" });
      setBewerken(false);
      // De stand van de pagina kan veranderd zijn (laatste vraag gedaan, dan
      // begint het schrijven): de kop en de kaart "Aan zet" horen dat te tonen.
      router.refresh();
    } catch {
      setFout("Er is geen verbinding. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  if (!bewerken) {
    const overgeslagen = stand.status === "overgeslagen";
    return (
      <div className="card flex items-start gap-3">
        <span className={overgeslagen ? "text-muted" : "text-[var(--trend-up-text)]"} aria-hidden>
          <Icon naam={overgeslagen ? "nvt" : "klaar"} size={16} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="type-body-emphasis">{vraag.question}</span>
          <span className="type-caption text-muted">
            {overgeslagen ? "Overgeslagen" : stand.answer}
          </span>
          {hint && <span className="type-caption text-secondary">{hint}</span>}
        </div>
        <button type="button" className="btn-ghost btn-sm shrink-0" onClick={() => setBewerken(true)}>
          Wijzig
        </button>
      </div>
    );
  }

  const kost =
    vraag.onderdelen.length > 0
      ? `Dan komt ${vraag.onderdelen.length === 1 ? "het onderdeel" : "de onderdelen"} ${somOp(vraag.onderdelen)} niet op de pagina.`
      : "Dan schrijven we dit deel zonder dit gegeven, en noemen we het niet.";

  return (
    <div className="card card-rail card-rail-accent flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span id={labelId} className="type-body-emphasis">
          {vraag.question}
        </span>
        {vraag.reason && <span className="type-caption text-muted">{vraag.reason}</span>}
        {vraag.paginas > 1 && (
          <span className="type-caption text-secondary">Geldt voor {vraag.paginas} pagina&apos;s</span>
        )}
      </div>
      <Antwoordveld id={labelId} vraag={vraag} waarde={waarde} zetWaarde={setWaarde} uitgeschakeld={bezig} />
      {fout && <p className="type-caption text-[var(--intent-danger-content)]">{fout}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={bezig || !waarde.trim()}
          onClick={() => void stuur({ answer: waarde.trim() })}
        >
          {bezig ? "Opslaan…" : "Bewaar antwoord"}
        </button>
        <span className="flex flex-col items-end gap-0.5 text-right">
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={bezig}
            onClick={() => void stuur({ skip: true })}
          >
            Overslaan
          </button>
          <span className="type-caption text-muted max-w-[28ch]">{kost}</span>
        </span>
      </div>
    </div>
  );
}

function somOp(namen: string[]): string {
  const n = namen.map((x) => `"${x}"`);
  if (n.length === 1) return n[0];
  return `${n.slice(0, -1).join(", ")} en ${n[n.length - 1]}`;
}
