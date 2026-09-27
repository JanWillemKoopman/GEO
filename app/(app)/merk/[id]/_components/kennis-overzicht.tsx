"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";
import {
  GEBRUIK_LABEL,
  STATUS_LABEL,
  handelingenVoor,
  herkomstZin,
  type Overzicht,
  type OverzichtActie,
  type OverzichtGroep,
  type OverzichtItem,
} from "@/lib/kennis/overzicht";

const KNOP: Record<OverzichtActie, string> = {
  bevestigen: "Bevestigen",
  aanpassen: "Aanpassen",
  afwijzen: "Klopt niet",
  niet_op_site: "Niet op de site",
};

/**
 * Het kennisoverzicht (K7). Schrijven gaat via de API-route, nooit rechtstreeks
 * naar de database (conventie 6). Welke knoppen er staan, zegt
 * `handelingenVoor()`; de route controleert hetzelfde nog eens.
 */
export function KennisOverzicht({ profileId, overzicht }: { profileId: string; overzicht: Overzicht }) {
  const router = useRouter();
  const [bezig, setBezig] = useState<string | null>(null);
  const [bewerkt, setBewerkt] = useState<{ id: string; tekst: string } | null>(null);
  const [probleem, setProbleem] = useState<UserFacingError | null>(null);

  async function doe(itemId: string, actie: OverzichtActie, bewering?: string) {
    setBezig(itemId);
    setProbleem(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/kennis/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actie, bewering }),
      });
      if (!res.ok) {
        setProbleem(problemFromResponse(await res.json().catch(() => null)));
        return;
      }
      setBewerkt(null);
      router.refresh();
    } catch (err) {
      setProbleem(networkProblem(err));
    } finally {
      setBezig(null);
    }
  }

  function Item({ item }: { item: OverzichtItem }) {
    const acties = handelingenVoor(item);
    const inBewerking = bewerkt?.id === item.id;
    return (
      <li className="vlak flex flex-col gap-2">
        {inBewerking ? (
          <textarea
            className="field min-h-24 text-sm"
            value={bewerkt.tekst}
            onChange={(e) => setBewerkt({ id: item.id, tekst: e.target.value })}
            aria-label="Nieuwe tekst"
          />
        ) : (
          <p className="text-sm whitespace-pre-line">{item.bewering}</p>
        )}
        <p className="text-xs text-muted">
          {STATUS_LABEL[item.status] ?? item.status}. {herkomstZin(item)} {GEBRUIK_LABEL[item.gebruik] ?? item.gebruik}.
        </p>
        {item.citaat && item.status === "waargenomen" && (
          <p className="text-xs text-secondary">Op de site: &ldquo;{item.citaat}&rdquo;</p>
        )}
        {acties.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {inBewerking ? (
              <>
                <button
                  type="button"
                  className="btn-outline btn-sm"
                  disabled={bezig === item.id}
                  onClick={() => doe(item.id, "aanpassen", bewerkt.tekst)}
                >
                  Opslaan
                </button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setBewerkt(null)}>
                  Annuleren
                </button>
              </>
            ) : (
              acties.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={a === "bevestigen" ? "btn-outline btn-sm" : "btn-ghost btn-sm"}
                  disabled={bezig === item.id}
                  onClick={() => (a === "aanpassen" ? setBewerkt({ id: item.id, tekst: item.bewering }) : doe(item.id, a))}
                >
                  {KNOP[a]}
                </button>
              ))
            )}
          </div>
        )}
      </li>
    );
  }

  function Groepen({ groepen }: { groepen: OverzichtGroep[] }) {
    return (
      <div className="flex flex-col gap-4">
        {groepen.map((g) => (
          <section key={g.domein} className="card flex flex-col gap-3">
            <h3 className="text-sm font-medium">
              {g.kop} <span className="text-muted">({g.items.length})</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {g.items.map((i) => (
                <Item key={i.id} item={i} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  const { aantallen } = overzicht;
  return (
    <div className="flex flex-col gap-6">
      {probleem && <ErrorNotice error={probleem} />}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Wat we weten</h2>
        <p className="text-sm text-secondary">
          {aantallen.weten === 0
            ? "Nog niets. Het onderzoek en het gesprek vullen dit."
            : `${aantallen.weten} dingen, waarvan ${aantallen.bevestigd} bevestigd door de klant. Alleen wat hier staat met "mag op een pagina" gaat naar de schrijver.`}
        </p>
        <Groepen groepen={overzicht.weten} />
      </section>

      {aantallen.denken > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">Wat we denken</h2>
          <p className="text-sm text-secondary">
            {`${aantallen.denken} vermoedens uit het onderzoek. Zolang het vermoedens zijn, gaan ze niet naar de schrijver. Bevestigt de klant er een, dan wel.`}
          </p>
          <Groepen groepen={overzicht.denken} />
        </section>
      )}

      {aantallen.afgewezen > 0 && (
        <details className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
          <summary className="cursor-pointer text-sm font-medium">Afgewezen ({aantallen.afgewezen})</summary>
          <p className="mt-2 text-sm text-secondary">Bewaard, maar telt nergens meer mee en komt niet vanzelf terug.</p>
          <ul className="mt-2 flex flex-col gap-2">
            {overzicht.afgewezen.map((i) => (
              <li key={i.id} className="text-sm text-secondary">
                {i.bewering}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
