"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { CollapsibleSection } from "@/components/collapsible-section";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import { FilterChip, FilterChipGroep } from "@/components/filterchip";
import { Icon } from "@/components/icon";
import type { UserFacingError } from "@/lib/errors";
import {
  FILTER_LABEL,
  GEBRUIK_LABEL,
  KENNIS_FILTERS,
  STATUS_LABEL,
  groepenVoorFilter,
  handelingenVoor,
  herkomstZin,
  standVan,
  telPerFilter,
  type KennisFilter,
  type KennisTab,
  type OverzichtActie,
  type OverzichtItem,
} from "@/lib/kennis/overzicht";

const KNOP: Record<OverzichtActie, string> = {
  bevestigen: "Bevestigen",
  aanpassen: "Aanpassen",
  afwijzen: "Klopt niet",
  niet_op_site: "Niet op de site",
};

/** Eén kleur per stand, en nooit alleen kleur: het woord staat erin. */
const STAND_CHIP: Record<Exclude<KennisFilter, "alles">, string> = {
  bevestigd: "chip chip-success",
  site: "chip chip-neutral",
  klant: "chip chip-info",
  vermoeden: "chip chip-warning",
  afgewezen: "chip chip-outline",
};

const STAND_LABEL: Record<Exclude<KennisFilter, "alles">, string> = {
  bevestigd: STATUS_LABEL.bevestigd,
  site: STATUS_LABEL.waargenomen,
  klant: STATUS_LABEL.verklaard,
  vermoeden: STATUS_LABEL.afgeleid,
  afgewezen: "Afgewezen",
};

const LEEG: Record<KennisTab, string> = {
  feiten: "Nog geen feiten. Het onderzoek van de website en het onboardinggesprek vullen dit.",
  kennis: "Nog geen kennis. Het onderzoek en het onboardinggesprek vullen dit.",
};

/**
 * Het werkblad van één tabblad op "Feiten en kennis".
 *
 * Van boven naar beneden: een zin die zegt wat er staat en wat op een oordeel
 * wacht, een filter, en dan één ingeklapt blok per onderwerp. Een blok opent een
 * tabel met drie kolommen (wat, hoe zeker, waar vandaan) en een regel opent zijn
 * details en knoppen. Zo blijft de eerste indruk kort, ook bij honderd items.
 *
 * ⚠️ De handelingen zijn die van het oude kennisoverzicht (K7) en lopen langs
 * dezelfde route, die zelf nog eens controleert wie het mag (conventie 6, besluit
 * V6). Welke knoppen er staan, zegt `handelingenVoor()`.
 *
 * Het filter zet de blokken open die iets overhouden: wie "Vermoedens" kiest wil
 * ze zien, niet eerst nog elk onderwerp openklikken. Bij "Alles" is alles dicht.
 */
export function KennisWerkblad({
  profileId,
  tab,
  items,
}: {
  profileId: string;
  tab: KennisTab;
  items: OverzichtItem[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<KennisFilter>("alles");
  const [open, setOpen] = useState<string | null>(null);
  const [bewerkt, setBewerkt] = useState<{ id: string; tekst: string } | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const [probleem, setProbleem] = useState<UserFacingError | null>(null);

  const telling = telPerFilter(items);
  const groepen = groepenVoorFilter(items, filter);

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
      setOpen(null);
      router.refresh();
    } catch (err) {
      setProbleem(networkProblem(err));
    } finally {
      setBezig(null);
    }
  }

  if (telling.alles === 0 && telling.afgewezen === 0) {
    return <p className="text-sm text-muted">{LEEG[tab]}</p>;
  }

  const zichtbaar: KennisFilter[] = KENNIS_FILTERS.filter((f) => f === "alles" || telling[f] > 0);

  return (
    <div className="flex flex-col gap-4">
      {probleem && <ErrorNotice error={probleem} />}

      <p className="text-sm text-secondary">
        {zin(tab, telling.alles, telling.bevestigd, telling.vermoeden)}
      </p>

      {zichtbaar.length > 1 && (
        <FilterChipGroep label="Toon">
          {zichtbaar.map((f) => (
            <FilterChip
              key={f}
              label={FILTER_LABEL[f]}
              aantal={telling[f]}
              gekozen={filter === f}
              onKies={() => {
                setFilter(f);
                setOpen(null);
                setBewerkt(null);
              }}
            />
          ))}
        </FilterChipGroep>
      )}

      {groepen.length === 0 ? (
        <p className="text-sm text-muted">Hier staat niets onder dit filter.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groepen.map((g) => (
            // De sleutel bevat het filter: een blok onthoudt zijn open-stand
            // alleen bij het eerste tonen, dus een ander filter moet hem
            // opnieuw laten beginnen.
            <CollapsibleSection
              key={`${tab}-${filter}-${g.domein}`}
              title={g.kop}
              badge={String(g.items.length)}
              defaultOpen={filter !== "alles"}
              compact
              card
            >
              <table className="tabel tabel-klikbaar">
                <thead>
                  <tr>
                    <th scope="col">Wat we weten</th>
                    <th scope="col">Zekerheid</th>
                    <th scope="col" className="hidden sm:table-cell">
                      Waar vandaan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((item) => {
                    const stand = standVan(item);
                    const isOpen = open === item.id;
                    return (
                      <Fragment key={item.id}>
                        <tr
                          aria-selected={isOpen || undefined}
                          onClick={() => {
                            setOpen(isOpen ? null : item.id);
                            setBewerkt(null);
                          }}
                        >
                          <td className="w-full">
                            <button
                              type="button"
                              className="flex w-full items-start gap-2 text-left"
                              aria-expanded={isOpen}
                              onClick={(e) => {
                                // De rij regelt het openen zelf; zonder dit
                                // klapt hij twee keer om en dus weer dicht.
                                e.stopPropagation();
                                setOpen(isOpen ? null : item.id);
                                setBewerkt(null);
                              }}
                            >
                              <span
                                className="mt-0.5 shrink-0 text-secondary"
                                style={{ transform: isOpen ? "rotate(90deg)" : undefined }}
                              >
                                <Icon naam="verder" size={14} />
                              </span>
                              <span className={isOpen ? "" : "line-clamp-2"}>{item.bewering}</span>
                            </button>
                          </td>
                          <td className="whitespace-nowrap">
                            <span className={STAND_CHIP[stand]}>{STAND_LABEL[stand]}</span>
                          </td>
                          <td className="hidden text-secondary sm:table-cell">{bronKort(item)}</td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={3} className="!pt-0">
                              <Detail
                                item={item}
                                bezig={bezig === item.id}
                                bewerkt={bewerkt?.id === item.id ? bewerkt.tekst : null}
                                onBewerk={(tekst) => setBewerkt(tekst === null ? null : { id: item.id, tekst })}
                                onDoe={(actie, bewering) => doe(item.id, actie, bewering)}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </CollapsibleSection>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({
  item,
  bezig,
  bewerkt,
  onBewerk,
  onDoe,
}: {
  item: OverzichtItem;
  bezig: boolean;
  /** De tekst in het invoerveld, of `null` als er niet bewerkt wordt. */
  bewerkt: string | null;
  onBewerk: (tekst: string | null) => void;
  onDoe: (actie: OverzichtActie, bewering?: string) => void;
}) {
  const acties = handelingenVoor(item);
  return (
    <div className="vlak vlak-gevuld flex flex-col gap-2">
      {bewerkt !== null && (
        <textarea
          className="field min-h-24 text-sm"
          value={bewerkt}
          onChange={(e) => onBewerk(e.target.value)}
          aria-label="Nieuwe tekst"
        />
      )}
      <p className="text-xs text-muted">
        {herkomstZin(item)} {GEBRUIK_LABEL[item.gebruik] ?? item.gebruik}.
      </p>
      {item.citaat && item.status === "waargenomen" && (
        <p className="text-xs text-secondary">Op de site: &ldquo;{item.citaat}&rdquo;</p>
      )}
      {item.blokkade && <p className="text-xs text-secondary">{item.blokkade}</p>}
      {acties.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {bewerkt !== null ? (
            <>
              <button
                type="button"
                className="btn-outline btn-sm"
                disabled={bezig || bewerkt.trim().length === 0}
                onClick={() => onDoe("aanpassen", bewerkt)}
              >
                Opslaan
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => onBewerk(null)}>
                Annuleren
              </button>
            </>
          ) : (
            acties.map((a) => (
              <button
                key={a}
                type="button"
                className={a === "bevestigen" ? "btn-outline btn-sm" : "btn-ghost btn-sm"}
                disabled={bezig}
                onClick={() => (a === "aanpassen" ? onBewerk(item.bewering) : onDoe(a))}
              >
                {KNOP[a]}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** "De website" in de tabel, zonder datum: de datum staat in de details. */
function bronKort(item: OverzichtItem): string {
  const zin = herkomstZin({ bron: item.bron });
  // "Uit de website." wordt "De website".
  const kaal = zin.replace(/^Uit /, "").replace(/\.$/, "");
  return kaal.charAt(0).toUpperCase() + kaal.slice(1);
}

function zin(tab: KennisTab, totaal: number, bevestigd: number, vermoedens: number): string {
  const soort = tab === "feiten" ? "feiten" : "stukken kennis";
  const enkel = tab === "feiten" ? "feit" : "stuk kennis";
  const kop = `${totaal} ${totaal === 1 ? enkel : soort}, waarvan ${bevestigd} bevestigd.`;
  if (vermoedens === 0) return kop;
  return `${kop} ${vermoedens} ${vermoedens === 1 ? "vermoeden wacht" : "vermoedens wachten"} op jouw oordeel en gaan tot die tijd niet naar de schrijver.`;
}
