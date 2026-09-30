"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { CollapsibleSection } from "@/components/collapsible-section";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import { FilterChip, FilterChipGroep } from "@/components/filterchip";
import { Icon } from "@/components/icon";
import { formatDateShort } from "@/lib/format";
import type { UserFacingError } from "@/lib/errors";
import {
  FILTER_LABEL,
  GEBRUIK_LABEL,
  KENNIS_FILTERS,
  STATUS_LABEL,
  bronKort,
  gebruikVan,
  groepenVoorFilter,
  handelingenVoor,
  herkomstZin,
  isTeBevestigenVermoeden,
  soortLabel,
  telPerFilter,
  type KennisFilter,
  type KennisTab,
  type OverzichtActie,
  type OverzichtItem,
} from "@/lib/kennis/overzicht";

const LEEG: Record<KennisTab, string> = {
  feiten: "Nog geen feiten. Het onderzoek van de website en het kennismakingsgesprek vullen dit.",
  kennis: "Nog geen kennis. Het onderzoek en het kennismakingsgesprek vullen dit.",
};

/**
 * Het werkblad van één tabblad op "Feiten en kennis".
 *
 * ── HET UITGANGSPUNT (30 september 2026) ────────────────────────────────────
 *
 * Wat hier staat komt ergens vandaan en wordt gebruikt bij het schrijven, tenzij
 * de consultant het afkeurt. Daarom draagt elke regel rechts drie knoppen: klopt
 * (alleen bij een vermoeden), aanpassen en afkeuren. Wat het onderzoek alleen
 * dacht (een vermoeden, zonder citaat van de site) gaat niet mee tot iemand het
 * bevestigt; de regel `magInBlokA()` staat ook in de database (conventie 1) en
 * het scherm zegt per regel of hij meegaat en zo niet waarom (`gebruikVan()`).
 *
 * Afkeuren is niet wissen: het item blijft staan, telt nergens meer mee en
 * komt niet stil terug bij de volgende onderzoeksronde. "Terugzetten" draait het
 * terug. Aanpassen maakt een nieuwe versie; de oude blijft in de geschiedenis.
 *
 * ── DE OPBOUW ───────────────────────────────────────────────────────────────
 *
 * Een zin die zegt wat er gebruikt wordt, een filter, en één ingeklapt blok per
 * onderwerp met een tabel: wat, bron, datum, gebruikt (Ja of Nee, het waarom staat in
 * de geopende regel), en de knoppen. Nieuw staat boven oud (`nieuwNaarOud`). Een regel opent
 * zijn herkomst en citaat. Een filter zet de blokken open die iets overhouden.
 *
 * Schrijven loopt via de API-route (conventie 6), die zelf nog eens controleert
 * wie het mag (besluit V6) en welke handeling bij welk item kan.
 */
export function KennisWerkblad({
  profileId,
  tab,
  items,
  alleenLezen = false,
}: {
  profileId: string;
  tab: KennisTab;
  items: OverzichtItem[];
  /**
   * De klant leest mee (30 september 2026): dezelfde tabbladen, filter en
   * tabel, maar geen knoppen. De route achter de knoppen is ook alleen voor
   * medewerkers, dus dit is netheid en geen slot.
   */
  alleenLezen?: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<KennisFilter>("alles");
  const [open, setOpen] = useState<string | null>(null);
  const [bewerkt, setBewerkt] = useState<{ id: string; tekst: string } | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const [bulkVraag, setBulkVraag] = useState<string | null>(null);
  const [laatsteAfgekeurd, setLaatsteAfgekeurd] = useState<{ id: string; tekst: string } | null>(null);
  const [probleem, setProbleem] = useState<UserFacingError | null>(null);

  const nu = new Date();
  const telling = telPerFilter(items, nu);
  const groepen = groepenVoorFilter(items, filter, nu);

  /** Eén handeling op de server. Geeft terug of het gelukt is; het scherm ververst de aanroeper. */
  async function stuur(itemId: string, actie: OverzichtActie, bewering?: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/profiles/${profileId}/kennis/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actie, bewering }),
      });
      if (!res.ok) {
        setProbleem(problemFromResponse(await res.json().catch(() => null)));
        return false;
      }
      return true;
    } catch (err) {
      setProbleem(networkProblem(err));
      return false;
    }
  }

  async function doe(item: OverzichtItem, actie: OverzichtActie, bewering?: string) {
    setBezig(item.id);
    setProbleem(null);
    const gelukt = await stuur(item.id, actie, bewering);
    setBezig(null);
    if (!gelukt) return;
    setBewerkt(null);
    setOpen(null);
    // Na een afkeuring blijft "ongedaan maken" staan tot de volgende handeling.
    setLaatsteAfgekeurd(actie === "afwijzen" ? { id: item.id, tekst: item.bewering } : null);
    router.refresh();
  }

  async function bevestigAlle(ids: string[]) {
    setBezig("bulk");
    setProbleem(null);
    setBulkVraag(null);
    // Na elkaar en niet tegelijk: elke bevestiging schrijft ook een gebeurtenis
    // en kan de kopie op het profiel raken. Bij de eerste fout stopt het, en wat
    // al gelukt is blijft bevestigd.
    for (const id of ids) {
      if (!(await stuur(id, "bevestigen"))) break;
    }
    setBezig(null);
    setLaatsteAfgekeurd(null);
    router.refresh();
  }

  if (telling.alles === 0 && telling.afgekeurd === 0) {
    return <p className="text-sm text-muted">{LEEG[tab]}</p>;
  }

  const zichtbaar: KennisFilter[] = KENNIS_FILTERS.filter((f) => f === "alles" || telling[f] > 0);

  return (
    <div className="flex flex-col gap-4">
      {probleem && <ErrorNotice error={probleem} />}

      <p className="text-sm text-secondary">{zin(tab, telling)}</p>

      {!alleenLezen && laatsteAfgekeurd && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-xl)] bg-[var(--bg-surface-raised)] px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 truncate">Afgekeurd: &ldquo;{laatsteAfgekeurd.tekst}&rdquo;</span>
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={bezig !== null}
            onClick={() => {
              const id = laatsteAfgekeurd.id;
              setLaatsteAfgekeurd(null);
              setBezig(id);
              stuur(id, "terugzetten").then((gelukt) => {
                setBezig(null);
                if (gelukt) router.refresh();
              });
            }}
          >
            Ongedaan maken
          </button>
        </div>
      )}

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
                setBulkVraag(null);
              }}
            />
          ))}
        </FilterChipGroep>
      )}

      {groepen.length === 0 ? (
        <p className="text-sm text-muted">Hier staat niets onder dit filter.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groepen.map((g) => {
            const vermoedens = g.items.filter(isTeBevestigenVermoeden);
            return (
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
                {!alleenLezen && vermoedens.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                    {bulkVraag === g.domein ? (
                      <>
                        <span className="text-secondary">
                          {vermoedens.length === 1
                            ? "Dit vermoeden bevestigen? ORBIT ENGINE gebruikt het dan bij het schrijven."
                            : `Deze ${vermoedens.length} vermoedens bevestigen? ORBIT ENGINE gebruikt ze dan bij het schrijven.`}
                        </span>
                        <button
                          type="button"
                          className="btn-outline btn-sm"
                          disabled={bezig !== null}
                          onClick={() => bevestigAlle(vermoedens.map((v) => v.id))}
                        >
                          Ja, bevestig
                        </button>
                        <button type="button" className="btn-ghost btn-sm" onClick={() => setBulkVraag(null)}>
                          Annuleren
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        disabled={bezig !== null}
                        onClick={() => setBulkVraag(g.domein)}
                      >
                        {vermoedens.length === 1 ? "Bevestig het vermoeden" : `Bevestig alle ${vermoedens.length} vermoedens`}
                      </button>
                    )}
                  </div>
                )}
                <table className="tabel tabel-klikbaar">
                  <thead>
                    <tr>
                      <th scope="col">Wat ORBIT ENGINE weet</th>
                      <th scope="col" className="hidden sm:table-cell">
                        Bron
                      </th>
                      <th scope="col" className="hidden sm:table-cell">
                        Toegevoegd
                      </th>
                      <th scope="col" className="hidden sm:table-cell">
                        Gebruikt
                      </th>
                      {!alleenLezen && (
                        <th scope="col">
                          <span className="sr-only">Acties</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((item) => {
                      const isOpen = open === item.id || bewerkt?.id === item.id;
                      const gebruik = gebruikVan(item, nu);
                      const acties = handelingenVoor(item);
                      const label = soortLabel(item.soort);
                      const wisselOpen = () => {
                        setOpen(isOpen ? null : item.id);
                        setBewerkt(null);
                      };
                      return (
                        <Fragment key={item.id}>
                          <tr aria-selected={isOpen || undefined} onClick={wisselOpen}>
                            <td className="w-full">
                              <button
                                type="button"
                                className="flex w-full items-start gap-2 text-left"
                                aria-expanded={isOpen}
                                onClick={(e) => {
                                  // De rij regelt het openen zelf; zonder dit
                                  // klapt hij twee keer om en dus weer dicht.
                                  e.stopPropagation();
                                  wisselOpen();
                                }}
                              >
                                <span
                                  className="mt-0.5 shrink-0 text-secondary"
                                  style={{ transform: isOpen ? "rotate(90deg)" : undefined }}
                                >
                                  <Icon naam="verder" size={14} />
                                </span>
                                <span className="flex min-w-0 flex-col">
                                  {label && <span className="text-xs text-muted">{label}</span>}
                                  <span className={isOpen ? "" : "line-clamp-2"}>{item.bewering}</span>
                                </span>
                              </button>
                            </td>
                            <td className="hidden whitespace-nowrap text-secondary sm:table-cell">{bronKort(item.bron)}</td>
                            <td className="hidden whitespace-nowrap text-secondary sm:table-cell">
                              {item.vastgelegd_op ? datumMetJaar(item.vastgelegd_op) : ""}
                            </td>
                            <td className="hidden whitespace-nowrap sm:table-cell">
                              {gebruik.gebruikt ? "Ja" : <span className="text-muted">Nee</span>}
                            </td>
                            {!alleenLezen && (
                            <td className="whitespace-nowrap text-right">
                              <span className="inline-flex items-center gap-1">
                                {isTeBevestigenVermoeden(item) && (
                                  <Knop
                                    icoon="klaar"
                                    titel="Klopt: bevestigen, dan gebruikt ORBIT ENGINE het bij het schrijven"
                                    uit={bezig !== null}
                                    onKlik={() => doe(item, "bevestigen")}
                                  />
                                )}
                                {acties.includes("aanpassen") && (
                                  <Knop
                                    icoon="bewerken"
                                    titel="Aanpassen"
                                    uit={bezig !== null}
                                    onKlik={() => {
                                      setOpen(null);
                                      setBewerkt({ id: item.id, tekst: item.bewering });
                                    }}
                                  />
                                )}
                                {acties.includes("afwijzen") && (
                                  <Knop
                                    icoon="prullenbak"
                                    titel="Klopt niet: afkeuren. Het blijft staan, maar ORBIT ENGINE schrijft er niet mee"
                                    uit={bezig !== null}
                                    onKlik={() => doe(item, "afwijzen")}
                                  />
                                )}
                                {acties.includes("terugzetten") && (
                                  <Knop
                                    icoon="herstel"
                                    titel="Terugzetten"
                                    uit={bezig !== null}
                                    onKlik={() => doe(item, "terugzetten")}
                                  />
                                )}
                              </span>
                            </td>
                            )}
                          </tr>
                          {isOpen && (
                            <tr>
                              <td colSpan={alleenLezen ? 4 : 5} className="!pt-0">
                                <Detail
                                  item={item}
                                  reden={gebruik.gebruikt ? null : gebruik.reden}
                                  alleenLezen={alleenLezen}
                                  bezig={bezig === item.id}
                                  bewerkt={bewerkt?.id === item.id ? bewerkt.tekst : null}
                                  onBewerk={(tekst) => setBewerkt(tekst === null ? null : { id: item.id, tekst })}
                                  onDoe={(actie, bewering) => doe(item, actie, bewering)}
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
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Een pictogramknop in de rij. Stopt de klik, anders opent en sluit de rij mee. */
function Knop({
  icoon,
  titel,
  uit,
  onKlik,
}: {
  icoon: "klaar" | "bewerken" | "prullenbak" | "herstel";
  titel: string;
  uit: boolean;
  onKlik: () => void;
}) {
  return (
    <button
      type="button"
      className="icon-btn"
      title={titel}
      aria-label={titel}
      disabled={uit}
      onClick={(e) => {
        e.stopPropagation();
        onKlik();
      }}
    >
      <Icon naam={icoon} size={16} />
    </button>
  );
}

function Detail({
  item,
  reden,
  alleenLezen,
  bezig,
  bewerkt,
  onBewerk,
  onDoe,
}: {
  item: OverzichtItem;
  /** Waarom dit niet naar de schrijver gaat, of `null` als het wel gaat. */
  reden: string | null;
  alleenLezen: boolean;
  bezig: boolean;
  /** De tekst in het invoerveld, of `null` als er niet bewerkt wordt. */
  bewerkt: string | null;
  onBewerk: (tekst: string | null) => void;
  onDoe: (actie: OverzichtActie, bewering?: string) => void;
}) {
  const acties = alleenLezen ? [] : handelingenVoor(item);
  // Wat de iconen niet dekken: bevestigen van iets wat geen vermoeden is, en
  // "niet op de site". Aanpassen en afkeuren staan al rechts in de rij.
  const extra = acties.filter((a) => (a === "bevestigen" && !isTeBevestigenVermoeden(item)) || a === "niet_op_site");
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
        {STATUS_LABEL[item.status] ?? item.status}. {herkomstZin(item)} {GEBRUIK_LABEL[item.gebruik] ?? item.gebruik}.
      </p>
      {item.citaat && item.status === "waargenomen" && (
        <p className="text-xs text-secondary">Op de site: &ldquo;{item.citaat}&rdquo;</p>
      )}
      {reden === "Vermoeden" && (
        <p className="text-xs text-secondary">
          {alleenLezen
            ? "Dit is een vermoeden van het onderzoek, zonder citaat van de site. ORBIT ENGINE gebruikt het pas nadat het bevestigd is."
            : "Dit is een vermoeden van het onderzoek, zonder citaat van de site. ORBIT ENGINE schrijft er pas mee als je het bevestigt."}
        </p>
      )}
      {/* De kolom Gebruikt zegt alleen Ja of Nee; het waarom staat hier. Het
          vermoeden heeft zijn eigen zin hierboven. */}
      {reden === "Verlopen" && (
        <p className="text-xs text-secondary">De geldigheidsdatum is voorbij, dus ORBIT ENGINE gebruikt dit niet meer bij het schrijven.</p>
      )}
      {reden === "Afgekeurd" && <p className="text-xs text-secondary">Afgekeurd: het blijft staan, maar ORBIT ENGINE gebruikt het niet.</p>}
      {/* De zin over de conflictlijst is voor de consultant: de klant weet niet
          wat dat is. */}
      {!alleenLezen && item.blokkade && <p className="text-xs text-secondary">{item.blokkade}</p>}
      {alleenLezen && reden === "Botsing" && (
        <p className="text-xs text-secondary">Dit botst met een ander gegeven en wordt nagekeken. Zolang gebruikt ORBIT ENGINE het niet.</p>
      )}
      {(bewerkt !== null || extra.length > 0) && (
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
            extra.map((a) => (
              <button key={a} type="button" className="btn-ghost btn-sm" disabled={bezig} onClick={() => onDoe(a)}>
                {a === "bevestigen" ? "Bevestigen" : "Niet op de site"}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** "30 sep 2026": het jaar erbij, want een upload kan maanden oud zijn. */
function datumMetJaar(iso: string): string {
  return `${formatDateShort(iso)} ${new Date(iso).getFullYear()}`;
}

/** De zin boven het werkblad: wat gaat mee naar de schrijver, en wat niet en waarom. */
function zin(tab: KennisTab, t: { alles: number; gebruikt: number; niet: number; vermoedens: number }): string {
  const soort = tab === "feiten" ? "feiten" : "stukken kennis";
  const enkel = tab === "feiten" ? "feit" : "stuk kennis";
  const kop = `${t.alles} ${t.alles === 1 ? enkel : soort}. ${t.gebruikt} ${t.gebruikt === 1 ? "wordt" : "worden"} gebruikt bij het schrijven.`;
  if (t.niet === 0) return kop;
  const rest = `${t.niet} niet`;
  const waarom =
    t.vermoedens > 0
      ? t.vermoedens === t.niet
        ? `omdat ${t.niet === 1 ? "het een vermoeden is" : "het vermoedens zijn"} die nog niemand bevestigde`
        : `waarvan ${t.vermoedens} ${t.vermoedens === 1 ? "vermoeden" : "vermoedens"} die nog niemand bevestigde`
      : "omdat ze alleen intern gelden";
  return `${kop} ${rest}, ${waarom}.`;
}
