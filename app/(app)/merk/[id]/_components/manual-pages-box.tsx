"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";

/**
 * Zelf pagina's aan de inventaris toevoegen (migratie 0061).
 *
 * ── WAAROM DIT NAAST DE AANBODBOOM STAAT EN NIET BIJ DE INSTELLINGEN ────────
 *
 * Je ziet hier dat er een dienst mist. Dat is het moment waarop je de pagina
 * erbij wilt zetten, en dan moet de knop hier staan en niet twee schermen
 * verderop. Het paginamaximum staat wél bij de instellingen: dat is een
 * crawl-instelling, dit is een correctie op de uitkomst.
 *
 * ── WAAROM ER TERUGGEMELD WORDT WAT ER NIET LUKTE ───────────────────────────
 *
 * Vijftien van de zestien adressen toevoegen en over de zestiende zwijgen is
 * erger dan niets toevoegen: dan denk je dat die pagina meetelt in het aanbod.
 * Elke afgekeurde of onleesbare regel komt daarom terug, met de reden.
 */
export function ManualPagesBox({
  profileId,
  pages,
}: {
  profileId: string;
  /** De pagina's die al handmatig zijn toegevoegd, zodat je ze ook weer weg kunt halen. */
  pages: { url: string; title: string | null }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invoer, setInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [uitslag, setUitslag] = useState<{
    added: number;
    unreadable: string[];
    duplicates: string[];
    rejected: { value: string; reason: string }[];
  } | null>(null);

  async function voegToe() {
    setBezig(true);
    setFout(null);
    setUitslag(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: invoer }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(json.detail ?? json.error ?? "Toevoegen is niet gelukt.");
        return;
      }
      setUitslag(json);
      if (json.added > 0) {
        setInvoer("");
        router.refresh();
      }
    } catch {
      setFout("We konden ORBIT ENGINE niet bereiken. Controleer je verbinding en probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  async function haalWeg(url: string) {
    setFout(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/pages`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setFout(json.error ?? "Weghalen is niet gelukt.");
        return;
      }
      router.refresh();
    } catch {
      setFout("We konden ORBIT ENGINE niet bereiken.");
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label">Pagina&apos;s die je zelf toevoegt</span>
        {pages.length > 0 && (
          <span className="mono-label text-muted">{pages.length} toegevoegd</span>
        )}
      </div>

      {pages.length > 0 && (
        <ul className="flex flex-col gap-1">
          {pages.map((p) => (
            <li key={p.url} className="flex items-baseline justify-between gap-3 text-sm">
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer noopener"
                className="truncate text-[var(--intent-intelligence-text)] hover:underline"
              >
                {p.title || shortUrl(p.url)}
              </a>
              <button
                type="button"
                className="shrink-0 text-muted hover:text-[var(--status-error)]"
                onClick={() => void haalWeg(p.url)}
                aria-label={`${p.title || p.url} weghalen`}
              >
                weghalen
              </button>
            </li>
          ))}
        </ul>
      )}

      {!open ? (
        <button type="button" className="btn-outline btn-sm w-fit" onClick={() => setOpen(true)}>
          Pagina&apos;s toevoegen
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-secondary">
            Mist er een dienst of productgroep? Plak hier de adressen van de pagina&apos;s die er
            zeker bij horen, één per regel. ORBIT ENGINE leest ze uit en neemt ze mee in je aanbod.
            Ze blijven staan als het onderzoek later opnieuw draait.
          </p>
          <textarea
            className="field min-h-28 font-mono text-sm"
            placeholder={"https://jouwsite.nl/diensten/bekkenfysiotherapie\nhttps://jouwsite.nl/tarieven"}
            value={invoer}
            onChange={(e) => setInvoer(e.target.value)}
            disabled={bezig}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary btn-sm disabled:opacity-60"
              disabled={bezig || !invoer.trim()}
              onClick={() => void voegToe()}
            >
              {bezig ? "ORBIT ENGINE leest de pagina's…" : "Toevoegen"}
            </button>
            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={bezig}
              onClick={() => {
                setOpen(false);
                setUitslag(null);
                setFout(null);
              }}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {uitslag && (
        <div className="flex flex-col gap-1 text-sm" role="status">
          {uitslag.added > 0 && (
            <span className="flex items-center gap-1.5 text-[var(--intent-growth-text)]">
              <Icon naam="klaar" size={14} />
              {uitslag.added} {uitslag.added === 1 ? "pagina" : "pagina's"} toegevoegd. Draai
              &ldquo;Onderzoek opnieuw&rdquo; om ze in je aanbod te verwerken.
            </span>
          )}
          {uitslag.duplicates.length > 0 && (
            <span className="text-muted">
              {uitslag.duplicates.length}{" "}
              {uitslag.duplicates.length === 1 ? "adres stond" : "adressen stonden"} er al in.
            </span>
          )}
          {uitslag.unreadable.length > 0 && (
            <span className="text-[var(--status-warning)]">
              Niet kunnen lezen: {uitslag.unreadable.join(", ")}. Controleer of het adres klopt en
              of de pagina zonder JavaScript tekst toont.
            </span>
          )}
          {uitslag.rejected.map((r) => (
            <span key={r.value} className="text-[var(--status-warning)]">
              {r.value}: {r.reason}
            </span>
          ))}
        </div>
      )}

      {fout && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {fout}
        </p>
      )}
    </div>
  );
}

/** Alleen het pad, want het domein staat overal hetzelfde bovenaan. */
function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? u.hostname : u.pathname;
  } catch {
    return url;
  }
}
