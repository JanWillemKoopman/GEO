"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { renderMarkdown } from "@/lib/markdown";
import { markeerZinnen } from "@/lib/tekst-markering";

/**
 * LEES EN KEUR GOED (`docs/tasks/contentketen-opnieuw.md` §6.9).
 *
 * De tekst opgemaakt, de gele zinnen geel in de tekst, per zin "Klopt" of "Pas
 * aan", en één hoofdknop "Keur goed" die pas werkt als elke gele zin
 * bevestigd of aangepast is. Daarnaast "Vraag een aanpassing" (een nieuwe
 * versie op basis van wat de ondernemer schrijft) en zelf bewerken.
 *
 * Geen cijfers en geen tabbladen met bevindingen (§6.9): de punten van de
 * eindredacteur staan ingeklapt onder "Wat we nog zien".
 */
export function Goedkeuren({
  profileId,
  analysisId,
  pieceId,
  tekst,
  updatedAt,
  geel,
  bevestigd: beginBevestigd,
  notitie,
  punten,
  goedgekeurd,
  aanpassingLoopt,
}: {
  profileId: string;
  analysisId: string;
  pieceId: string;
  tekst: string;
  updatedAt: string;
  /** De gele zinnen die nog in de tekst staan. */
  geel: string[];
  bevestigd: string[];
  notitie: string | null;
  punten: { waar: string; probleem: string; hoe: string }[];
  goedgekeurd: boolean;
  aanpassingLoopt: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [bevestigd, setBevestigd] = useState<string[]>(beginBevestigd);
  const [bezig, setBezig] = useState<string | null>(null);
  const [bewerken, setBewerken] = useState(false);
  const [concept, setConcept] = useState(tekst);
  const [vraagAanpassing, setVraagAanpassing] = useState(false);
  const [aanpassing, setAanpassing] = useState("");

  const openGeel = geel.filter((z) => !bevestigd.includes(z));
  const html = useMemo(() => markeerZinnen(renderMarkdown(tekst), openGeel).html, [tekst, openGeel]);

  async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      return res.ok ? { ok: true } : { ok: false, error: j?.error ?? "Probeer het opnieuw." };
    } catch {
      return { ok: false, error: "Controleer je internet en probeer het opnieuw." };
    }
  }

  async function klopt(zin: string) {
    setBezig(zin);
    const r = await post(`/api/profiles/${profileId}/paginas/${pieceId}/zinnen`, { zin });
    setBezig(null);
    if (!r.ok) return toast({ intent: "fout", title: "Bevestigen lukte niet", description: r.error });
    setBevestigd((oud) => [...oud, zin]);
  }

  async function keurGoed() {
    setBezig("goedkeuren");
    const r = await post(`/api/profiles/${profileId}/paginas/${pieceId}`, { actie: "goedkeuren" });
    setBezig(null);
    if (!r.ok) return toast({ intent: "fout", title: "Goedkeuren lukte niet", description: r.error });
    toast({ intent: "succes", title: "Goedgekeurd", description: "Je kunt de pagina nu op je site zetten." });
    router.refresh();
  }

  async function bewaar() {
    setBezig("bewaren");
    try {
      const res = await fetch(`/api/analyses/${analysisId}/content/${pieceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body_markdown: concept, updated_at: updatedAt }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) return toast({ intent: "fout", title: "Opslaan lukte niet", description: j?.error ?? "Probeer het opnieuw." });
      setBewerken(false);
      router.refresh();
    } catch {
      toast({ intent: "fout", title: "Geen verbinding", description: "Controleer je internet en probeer het opnieuw." });
    } finally {
      setBezig(null);
    }
  }

  async function stuurAanpassing() {
    setBezig("aanpassing");
    const r = await post(`/api/profiles/${profileId}/paginas/${pieceId}`, { actie: "aanpassing", notitie: aanpassing });
    setBezig(null);
    if (!r.ok) return toast({ intent: "fout", title: "Aanpassing vragen lukte niet", description: r.error });
    toast({ intent: "succes", title: "Aanpassing gevraagd", description: "We schrijven een nieuwe versie. Die staat hier binnen een paar minuten." });
    setVraagAanpassing(false);
    setAanpassing("");
    router.refresh();
  }

  function pasAan(zin: string) {
    setConcept(tekst);
    setBewerken(true);
    // Na het openen van het tekstvak naar de zin springen en hem selecteren.
    requestAnimationFrame(() => {
      const vak = document.getElementById("pagina-bewerken") as HTMLTextAreaElement | null;
      const plek = vak?.value.indexOf(zin) ?? -1;
      if (vak && plek >= 0) {
        vak.focus();
        vak.setSelectionRange(plek, plek + zin.length);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {notitie && !goedgekeurd && (
        <section className="card flex flex-col gap-2">
          <h2 className="type-section">Een vraag van de schrijver</h2>
          <p className="type-body text-secondary">{notitie}</p>
        </section>
      )}

      {aanpassingLoopt && (
        <div className="card type-body" role="status">
          We schrijven een nieuwe versie met jouw aanpassing. Die staat hier binnen een paar minuten.
        </div>
      )}

      {!goedgekeurd && openGeel.length > 0 && (
        <section className="card flex flex-col gap-3">
          <h2 className="type-section">Loop deze zinnen na</h2>
          <p className="type-body text-secondary">
            Hier staat iets over je bedrijf dat we nergens in jouw informatie terugvonden. Klopt het, bevestig het
            dan. Klopt het niet, pas de zin aan.
          </p>
          <ul className="flex flex-col gap-3">
            {openGeel.map((zin) => (
              <li key={zin} className="flex flex-col gap-2">
                <span className="tekst-punt-link">{zin}</span>
                <div className="flex gap-2">
                  <button type="button" className="btn-outline" disabled={bezig !== null} onClick={() => klopt(zin)}>
                    Klopt
                  </button>
                  <button type="button" className="btn-outline" disabled={bezig !== null} onClick={() => pasAan(zin)}>
                    Pas aan
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {bewerken ? (
        <section className="card flex flex-col gap-3">
          <h2 className="type-section">Tekst bewerken</h2>
          <textarea
            id="pagina-bewerken"
            className="field min-h-[28rem] font-mono text-sm"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="button" className="btn-primary" disabled={bezig !== null} onClick={bewaar}>
              Bewaar
            </button>
            <button type="button" className="btn-outline" disabled={bezig !== null} onClick={() => setBewerken(false)}>
              Annuleer
            </button>
          </div>
        </section>
      ) : (
        <article className="card prose" dangerouslySetInnerHTML={{ __html: html }} />
      )}

      {!goedgekeurd && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={bezig !== null || openGeel.length > 0 || bewerken || aanpassingLoopt}
              onClick={keurGoed}
            >
              Keur goed
            </button>
            {!bewerken && (
              <button type="button" className="btn-outline" disabled={bezig !== null} onClick={() => setBewerken(true)}>
                Zelf bewerken
              </button>
            )}
            <button
              type="button"
              className="btn-outline"
              disabled={bezig !== null || aanpassingLoopt}
              onClick={() => setVraagAanpassing((v) => !v)}
              aria-expanded={vraagAanpassing}
            >
              Vraag een aanpassing
            </button>
          </div>
          {openGeel.length > 0 && (
            <p className="type-caption text-muted">
              {openGeel.length === 1
                ? "Goedkeuren kan zodra je de gele zin bevestigd of aangepast hebt."
                : `Goedkeuren kan zodra je de ${openGeel.length} gele zinnen bevestigd of aangepast hebt.`}
            </p>
          )}
          {vraagAanpassing && (
            <div className="card flex flex-col gap-3">
              <label htmlFor="aanpassing" className="type-body">
                Wat moet er anders?
              </label>
              <textarea
                id="aanpassing"
                className="field min-h-[8rem]"
                value={aanpassing}
                maxLength={2000}
                onChange={(e) => setAanpassing(e.target.value)}
                placeholder="Bijvoorbeeld: noem ook dat we in het weekend werken, en maak de opening korter."
              />
              <button
                type="button"
                className="btn-primary w-fit"
                disabled={bezig !== null || !aanpassing.trim()}
                onClick={stuurAanpassing}
              >
                Schrijf een nieuwe versie
              </button>
            </div>
          )}
        </section>
      )}

      {punten.length > 0 && !goedgekeurd && (
        <details className="card">
          <summary className="type-section cursor-pointer">Wat we nog zien</summary>
          <ul className="mt-3 flex flex-col gap-2">
            {punten.map((p, i) => (
              <li key={i} className="type-body text-secondary">
                <span className="text-primary">{p.waar}:</span> {p.probleem} {p.hoe}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
