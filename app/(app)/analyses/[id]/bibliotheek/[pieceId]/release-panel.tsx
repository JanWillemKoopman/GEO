"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDateLong } from "@/lib/format";
import type { PoortOordeel } from "@/lib/content-final-gate";

/**
 * Het vrijgavepaneel (implementatieplan.md S6).
 *
 * ── WAAROM DIT SCHERM ER MOET ZIJN ──────────────────────────────────────────
 *
 * De app kent één bewezen patroon voor "stop bewust, laat de klant kijken vóór
 * er iets onomkeerbaars gebeurt": het conceptscherm vóór de meting start
 * (abcplan.md §3.6). Voor content bestond dat niet. Uit de contentronde van
 * 31 juli: alle tien pagina's kwamen op `ready`, één met vijf verbeterpunten van
 * de eigen redactie eronder, en er was geen moment waarop iemand die te zien
 * kreeg vóór publicatie.
 *
 * Publiceren doet de klant zelf, buiten de app om (fase D is geen scope). Wat we
 * wél kunnen is zorgen dat hij niet publiceert zonder gezien te hebben waaróp
 * deze pagina gebouwd is. Vandaar dat dit paneel drie dingen toont die tot nu toe
 * alleen in de database stonden, de gebruikte feitenkaart, elke uitspraak over
 * het bedrijf met of zonder bron, en wat er ontbreekt omdat een vraag open bleef.
 *
 * ── GEEN MUUR, MET ÉÉN UITZONDERING SINDS 28 AUGUSTUS 2026 ──────────────────
 *
 * De tekst blijft gewoon te lezen, te kopiëren en te bewerken. Een gate die je
 * niet kunt passeren is een muur, en muren leveren afgehaakte klanten op in
 * plaats van betere content (README.md §2). Het verschil met vroeger is dat
 * "klaar" nu iets betekent: iemand heeft gekeken.
 *
 * ⚠️ De knop zélf gaat wél op slot zolang er vragen open staan die deze pagina
 * blokkeren (`lib/content-final-gate.ts`, besluit van de eigenaar). Vrijgeven is
 * de handeling die zegt "deze tekst is af", en dat kan niet terwijl ORBIT ENGINE
 * nog wacht op de feiten waar de tekst om vroeg. De uitweg is één klik:
 * overslaan telt als antwoord. Alles wat hierboven staat over kopiëren en
 * publiceren blijft gelden, want dat doet de klant zelf en buiten de app om.
 */

export interface ReleaseFact {
  ref: string;
  text: string;
  source: string;
  allowed: boolean;
}

export interface ReleaseClaim {
  sentence: string;
  /** Het F-nummer dat deze zin dekt, of `null` als er geen is. */
  factRef: string | null;
}

export function ReleasePanel({
  analysisId,
  pieceId,
  needsReview,
  reviewedAt,
  facts,
  claims,
  unansweredRequired,
  poort,
  vragenHref,
}: {
  analysisId: string;
  pieceId: string;
  needsReview: boolean;
  /** Wanneer een mens hem heeft vrijgegeven. `null` = nog nooit bekeken (0034). */
  reviewedAt: string | null;
  facts: ReleaseFact[];
  claims: ReleaseClaim[];
  unansweredRequired: string[];
  /** Houden openstaande vragen het vrijgeven tegen? (28 augustus 2026) */
  poort: PoortOordeel;
  /** Waar die vragen staan. */
  vragenHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zonderBron = claims.filter((c) => !c.factRef);
  const bruikbaar = facts.filter((f) => f.allowed);
  const verboden = facts.filter((f) => !f.allowed);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/content/${pieceId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Vrijgeven is niet gelukt.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="mono-label">Waarop deze pagina gebouwd is</span>
        <p className="text-sm text-secondary">
          Dit is alle bevestigde informatie die ORBIT ENGINE had toen het schreef. Wat hier niet staat, staat
          ook niet in de tekst. Met opzet.
        </p>
      </div>

      {/* De feitenkaart. Stond tot nu toe uitsluitend in briefing_snapshot_json,
          dus alleen zichtbaar voor wie de database opent. */}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          Bevestigde feiten ({bruikbaar.length})
        </span>
        {bruikbaar.length === 0 ? (
          <p className="text-sm text-muted">
            Geen. Deze pagina bevat daarom alleen algemene uitleg over het onderwerp en geen
            concrete beweringen over je bedrijf.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {bruikbaar.map((f) => (
              <li key={f.ref} className="flex flex-wrap gap-x-2">
                <span className="mono-label shrink-0">{f.ref}</span>
                <span className="text-secondary">{f.text}</span>
                <span className="text-muted">bron: {f.source}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {verboden.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Wat je expliciet niet wilde beweren</span>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-secondary">
            {verboden.map((f) => (
              <li key={f.text}>{f.text}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Elke zin die iets over het bedrijf beweert, met of zonder bron (S3).
          De zinnen zónder bron staan bovenaan: dat is de categorie waarin beide
          fabricages van 31 juli vielen, en precies wat een klant moet nalopen. */}
      {claims.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            Uitspraken over je bedrijf in deze tekst ({claims.length})
          </span>
          {zonderBron.length > 0 && (
            <p className="text-sm" style={{ color: "var(--intent-warning-text)" }}>
              {zonderBron.length} daarvan kon ORBIT ENGINE niet herleiden tot een bevestigd feit. Lees ze
              na voordat je publiceert.
            </p>
          )}
          <ul className="flex flex-col gap-1 text-sm">
            {[...zonderBron, ...claims.filter((c) => c.factRef)].slice(0, 15).map((c, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                <span className="mono-label shrink-0">{c.factRef ?? "geen bron"}</span>
                <span className={c.factRef ? "text-secondary" : ""}>{c.sentence}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unansweredRequired.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Wat deze pagina mist</span>
          <p className="text-sm text-secondary">
            Deze vragen bleven open, dus die passages zijn weggelaten in plaats van ingevuld:
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-secondary">
            {unansweredRequired.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-sm" role="alert" style={{ color: "var(--intent-danger-text)" }}>
          {error}
        </p>
      )}

      {/* Drie standen, en het verschil tussen de laatste twee is precies waarom
          migratie 0034 er is: "de controles vonden niets" is niet hetzelfde als
          "iemand heeft gekeken". */}
      {reviewedAt ? (
        <span className="text-sm text-muted">
          Vrijgegeven op {formatDateLong(reviewedAt)}.
        </span>
      ) : poort.mag ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary btn-sm" onClick={approve} disabled={busy}>
            {busy ? "Vastleggen…" : "Ik heb dit gecontroleerd"}
          </button>
          <span className="text-sm text-muted">
            {needsReview
              ? "Kopiëren kan ook zonder dit. Het is een aantekening voor jezelf."
              : "ORBIT ENGINE's controles vonden niets, maar er heeft nog geen mens naar gekeken."}
          </span>
        </div>
      ) : (
        // ⚠️ Een grijze knop zonder uitleg is een dood einde
        // (`docs/ux-design.md` §4). De melding zegt wat er open staat, waaróm dat
        // uitmaakt en waar je het oplost, en de knop ernaast gaat er direct
        // heen. Overslaan staat in de melding zelf, want dat is de uitweg.
        <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
          <span className="mono-label">Nog niet vrij te geven</span>
          <p className="text-sm text-secondary">{poort.melding}</p>
          <Link href={vragenHref} className="btn-outline btn-sm w-fit">
            Naar je openstaande vragen
          </Link>
        </div>
      )}
    </div>
  );
}
