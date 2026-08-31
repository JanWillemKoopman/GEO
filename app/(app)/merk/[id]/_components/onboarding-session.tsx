"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionRail } from "@/components/section-rail";
import { CollapsibleSection } from "@/components/collapsible-section";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BrandFieldInput, type VeldStand } from "./brand-field-input";
import { DossierBox } from "./dossier-box";
import { StrategyBox } from "./strategy-box";
import { FactRequests } from "./fact-requests";
import { ProfileReadinessPanel } from "./profile-readiness-panel";
import {
  BRAND_FIELDS,
  SESSION_BLOCKS,
  SESSION_AUTHOR_FIELDS,
  missingRequired,
  isFilled,
} from "@/lib/pipeline/brand-fields";
import { findGaps } from "@/lib/profile-gaps";
import { examplesFor } from "@/lib/pipeline/brand-examples";
import {
  planRefresh,
  refreshConfirmation,
  TASK_LABELS,
  FIELD_TASKS,
} from "@/lib/pipeline/onboarding-refresh";
import { sessionMeter, notApplicableFields, type FieldState } from "@/lib/profile-meter";
import type { ContextFactor, FactRequest, Profile } from "@/lib/types/database";

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
  factRequests,
  factGroepen,
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

  /**
   * B6: dezelfde feitenvragen als op de vragenpagina, uit `loadOpenQuestions()`.
   * Eén loader, geen tweede telling (hoofdstuk 13, A3).
   */
  factRequests: FactRequest[];
  factGroepen: { id: string; naam: string }[];
}) {
  const router = useRouter();
  const [waarden, setWaarden] = useState<Record<string, unknown>>(() => {
    const start: Record<string, unknown> = {};
    for (const veld of BRAND_FIELDS) start[veld.key as string] = initial[veld.key];
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
  const [bevestigBijwerken, setBevestigBijwerken] = useState(false);
  const [states, setStates] = useState<Record<string, FieldState>>(initialStates);
  // B9: één regel bovenin in plaats van een chip per veld (hoofdstuk 8.6). Een
  // chip blijft alleen staan bij een mislukte opslag, dat blijft aan het veld
  // zelf hangen.
  const [laatsteOpslag, setLaatsteOpslag] = useState<Date | null>(null);
  const [toonSamenvatting, setToonSamenvatting] = useState(false);
  const [urlBewerken, setUrlBewerken] = useState(false);
  const [urlWaarde, setUrlWaarde] = useState(initial.url);
  const [bevestigUrl, setBevestigUrl] = useState(false);

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

  // B6: de open feitenvragen tellen mee in de badge van blok 1, naast de
  // profielgaten. `factRequests` komt uit dezelfde `loadOpenQuestions()` als de
  // vragenpagina; overgeslagen vragen tellen bewust niet mee (zie die module).
  const openFeitenvragen = useMemo(
    () => factRequests.filter((f) => f.status === "open"),
    [factRequests],
  );

  // B3: welke verplichte velden staan nog open, inclusief het onderscheid uit
  // hoofdstuk 14 (`service_regions` telt alleen mee bij een lokaal werkgebied).
  const openstaandVerplicht = useMemo(
    () => missingRequired(waarden as Partial<Profile>, notApplicableFields(states)),
    [waarden, states],
  );

  // A4: welke velden zijn getypt maar nog niet opgeslagen. Bijgehouden in een
  // ref omdat een pagehide-listener buiten de React-renderklok afgaat en dan
  // de laatste stand nodig heeft, niet de stand van het moment dat hij werd
  // aangemeld.
  const openstaandeVelden = useRef<Set<string>>(new Set());
  const waardenRef = useRef(waarden);
  useEffect(() => {
    waardenRef.current = waarden;
  }, [waarden]);

  function zet(key: string, value: unknown) {
    setWaarden((w) => ({ ...w, [key]: value }));
    openstaandeVelden.current.add(key);
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
      openstaandeVelden.current.delete(key);
      setLaatsteOpslag(new Date());
    } catch {
      setStanden((s) => ({ ...s, [key]: "mislukt" }));
    }
  }

  /**
   * A4: opslaan bij het sluiten van het tabblad.
   *
   * Opslaan gebeurt normaal bij `onBlur`, maar wie het tabblad sluit terwijl de
   * cursor nog in een tekstvak staat, verliest zonder dit wat er getypt is: er
   * komt dan geen blur meer. `pagehide` vangt het sluiten en het navigeren weg,
   * `visibilitychange` naar verborgen vangt ook het wisselen van tabblad of app
   * op een telefoon. `keepalive` laat de aanvraag doorlopen nadat de pagina al
   * is losgelaten.
   */
  useEffect(() => {
    function bewaarOpenstaand() {
      for (const key of openstaandeVelden.current) {
        void fetch(`/api/profiles/${profileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: waardenRef.current[key], bron: "gesprek" }),
          keepalive: true,
        });
      }
      openstaandeVelden.current.clear();
    }
    function opZichtbaarheid() {
      if (document.visibilityState === "hidden") bewaarOpenstaand();
    }
    window.addEventListener("pagehide", bewaarOpenstaand);
    document.addEventListener("visibilitychange", opZichtbaarheid);
    return () => {
      window.removeEventListener("pagehide", bewaarOpenstaand);
      document.removeEventListener("visibilitychange", opZichtbaarheid);
    };
  }, [profileId]);

  /**
   * B8: de website wijzigen. `url` staat bewust niet in `BRAND_FIELDS`: het is
   * geen veld dat je "nakijkt" zoals de rest, het is de bron van de hele crawl.
   * Daarom eerst alleen tonen, en een aparte actie met een waarschuwing die
   * duidelijk maakt dat de crawl opnieuw moet (hoofdstuk 5.2).
   */
  async function bewaarUrl() {
    setBevestigUrl(false);
    setStanden((s) => ({ ...s, url: "opslaan" }));
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlWaarde, bron: "gesprek" }),
      });
      if (!res.ok) {
        setStanden((s) => ({ ...s, url: "mislukt" }));
        return;
      }
      setStanden((s) => ({ ...s, url: "opgeslagen" }));
      setLaatsteOpslag(new Date());
      setUrlBewerken(false);
    } catch {
      setStanden((s) => ({ ...s, url: "mislukt" }));
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
      setLaatsteOpslag(new Date());
    } catch {
      setStanden((s) => ({ ...s, [key]: "mislukt" }));
    }
  }

  const plan = useMemo(
    () => planRefresh(gewijzigd, { analyses: openAnalyses }),
    [gewijzigd, openAnalyses],
  );
  const bevestiging = useMemo(() => refreshConfirmation(plan), [plan]);

  /**
   * Precies de stappen inplannen die van de gewijzigde velden afhangen.
   *
   * De bevestiging draagt de raming, en dat is de enige plek waar een bedrag
   * hoort te staan: dit scherm wordt met de klant gedeeld.
   *
   * B9: ná een geslaagde ronde ververst de pagina. Zonder dit blijft de knop
   * staan alsof er nog niets gebeurd is, en ziet de consultant pas na een
   * handmatige herlaadbeurt dat het werk daadwerkelijk liep (hoofdstuk 13, A9).
   */
  async function werkBij() {
    setBevestigBijwerken(false);
    setBijwerken("bezig");
    try {
      const res = await fetch(`/api/profiles/${profileId}/refresh`, { method: "POST" });
      setBijwerken(res.ok ? "gedaan" : "mislukt");
      if (res.ok) router.refresh();
    } catch {
      setBijwerken("mislukt");
    }
  }

  // B9: de voortgang per blok, voor de badges in de rail (hoofdstuk 8.2). Zonder
  // dit ziet de consultant pas na het scrollen door alle negen blokken hoe ver
  // hij is; de rail zei tot nu toe alleen "Openstaande punten".
  const blokVoortgang = useMemo(
    () =>
      Object.fromEntries(
        SESSION_BLOCKS.map((blok) => {
          const gevuld = blok.velden.filter((k) => isFilled(waarden[k as string])).length;
          return [blok.id, { gevuld, totaal: blok.velden.length }];
        }),
      ),
    [waarden],
  );

  function veld(key: string) {
    const definitie = BRAND_FIELDS.find((f) => (f.key as string) === key)!;
    return (
      <BrandFieldInput
        key={key}
        field={definitie}
        value={waarden[key]}
        example={voorbeelden[key]}
        source={states[key]?.source}
        notApplicable={states[key]?.notApplicable}
        stand={standen[key] ?? "rust"}
        // B7: precies de vier velden waar `FIELD_TASKS` de taak "onderwerpen"
        // aan hangt. Geen tweede lijst: verandert de vertaaltabel, dan verandert
        // deze markering vanzelf mee.
        triggersTopics={(FIELD_TASKS[key] ?? []).includes("onderwerpen")}
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
          { id: "voorbereiding", label: "Voorbereiding" },
          {
            id: "open",
            label: "Openstaande punten",
            badge:
              gaten.length + openFeitenvragen.length > 0
                ? `${gaten.length + openFeitenvragen.length} open`
                : undefined,
          },
          // B9, hoofdstuk 8.2: voortgang per blok in de rail, zodat de
          // consultant ziet waar hij staat zonder alle negen blokken langs te
          // scrollen.
          ...SESSION_BLOCKS.map((blok) => {
            const p = blokVoortgang[blok.id];
            return {
              id: blok.id,
              label: blok.titel,
              badge: p ? `${p.gevuld} van de ${p.totaal}` : undefined,
            };
          }),
          { id: "materiaal", label: "Documenten en teksten" },
          { id: "afronden", label: "Afspraken en afronden" },
        ]}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-10 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-12">
          {/* B9, hoofdstuk 8.6: één vaste regel in plaats van een chip per
              veld. Springt niet, en zegt precies wat de klant wil weten: dat
              er niets kwijtraakt. */}
          {laatsteOpslag && (
            <p className="mono-label text-muted" role="status">
              Alles bewaard · laatste wijziging{" "}
              {laatsteOpslag.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}

          {/* ── 0. Voorbereiding ─────────────────────────────────────────────
              Hoofdstuk 3 en 14: wat de consultant vóór het gesprek wil weten,
              via de bestaande readiness-module (`profile-readiness.ts`). Die
              stond al in de codebase klaar, alleen nog nergens aangeroepen. */}
          <section id="voorbereiding" className="flex flex-col gap-3">
            <Kop
              nummer="00"
              titel="Voorbereiding"
              uitleg={`${initial.url} · ${initial.industry ?? "branche nog niet bekend"}. Wat ORBIT ENGINE al weet, en wat er nog moet gebeuren voordat je dit scherm deelt.`}
            />
            <ProfileReadinessPanel profileId={profileId} brandName={brandName} />
          </section>

          {/* ── 1. Openstaande punten en vragen ──────────────────────────────
              Bovenaan, en dat is de kern van dit scherm. B6: naast de open
              punten in het profiel staan hier ook de feitenvragen uit
              `fact_requests`, uit dezelfde loader als de vragenpagina
              (`loadOpenQuestions()`). Eén telling, niet twee. */}
          <section id="open" className="flex flex-col gap-3">
            <Kop
              nummer="01"
              titel="Openstaande punten en vragen"
              uitleg="Hier begint het gesprek. Elk punt hieronder maakt de meting of de teksten scherper, en het zwaarste staat bovenaan. Vragen beantwoord je meteen, hier."
            />
            {gaten.length === 0 ? (
              <div className="card card-success flex flex-col gap-1">
                <span className="mono-label">Niets open</span>
                <p className="text-secondary">
                  Alles wat de meting stuurt staat er. De rest maakt het scherper, maar is niet
                  nodig om te beginnen.
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
                      Ga naar dit veld
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {factRequests.length > 0 && (
              <FactRequests
                profileId={profileId}
                initial={factRequests}
                groepen={factGroepen}
                kop="Wat ORBIT ENGINE nog van je wil weten"
              />
            )}
          </section>

          {/* ── 2 tot en met 6, 8. De blokken van hoofdstuk 3 ─────────────────
              De gespreksvolgorde: eerst wie je bent en wat je verkoopt, dan pas
              de markt en de toon. Elk blok combineert wat ORBIT ENGINE al vond
              met wat alleen het gesprek kan opleveren; de herkomstchip per veld
              (`BrandFieldInput`) laat zien welke van de twee het is. */}
          {SESSION_BLOCKS.map((blok) => {
            const p = { ...blokVoortgang[blok.id], compleet: blokVoortgang[blok.id].gevuld === blokVoortgang[blok.id].totaal };
            return (
              <section key={blok.id} id={blok.id} className="flex flex-col gap-3">
                <Kop nummer={blok.volgnummer} titel={blok.titel} uitleg={blok.uitleg} />
                {/* A1, toegepast op de negen blokken: een blok dat al compleet is
                    hoeft niet in de weg te staan tijdens het gesprek. */}
                <CollapsibleSection
                  title={`${p.gevuld} van de ${p.totaal} ingevuld`}
                  defaultOpen={!p.compleet}
                >
                  {blok.velden.map((k) => veld(k as string))}
                  {/* B8: de website, alleen tonen met een aparte wijzigactie,
                      en de Search Console-koppeling als statusregel. Allebei
                      geen catalogusveld: de eerste is de bron van de hele
                      crawl, de tweede is geen invoer maar een verwijzing. */}
                  {blok.id === "techniek" && (
                    <>
                      <div className="card flex flex-col gap-2" id="veld-anker-url">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold">Website</span>
                          {standen.url === "mislukt" && (
                            <span className="chip chip-danger">niet gelukt</span>
                          )}
                        </div>
                        <p className="text-sm text-muted">
                          Het domein waar ORBIT ENGINE leest: de crawl, de inventaris en het advies
                          over je pagina&apos;s beginnen hier.
                        </p>
                        {urlBewerken ? (
                          <div className="flex flex-col gap-2">
                            <input
                              className="field"
                              value={urlWaarde}
                              onChange={(e) => setUrlWaarde(e.target.value)}
                            />
                            <p className="text-sm text-[var(--status-error)]">
                              Let op: dit verandert het domein waar ORBIT ENGINE op leest. De crawl
                              en de inventaris moeten daarna opnieuw.
                            </p>
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                className="btn-primary w-fit"
                                disabled={
                                  !urlWaarde.trim() ||
                                  urlWaarde === initial.url ||
                                  standen.url === "opslaan"
                                }
                                onClick={() => setBevestigUrl(true)}
                              >
                                Website wijzigen
                              </button>
                              <button
                                type="button"
                                className="text-sm text-secondary underline-offset-2 hover:underline"
                                onClick={() => {
                                  setUrlBewerken(false);
                                  setUrlWaarde(initial.url);
                                }}
                              >
                                Annuleren
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            <a
                              href={initial.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm underline-offset-2 hover:underline"
                            >
                              {initial.url}
                            </a>
                            <button
                              type="button"
                              className="btn-outline w-fit"
                              onClick={() => setUrlBewerken(true)}
                            >
                              Website wijzigen
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="card flex flex-col gap-2">
                        <span className="text-sm font-semibold">Search Console</span>
                        <p className="text-sm text-muted">
                          Zonder koppeling blijft het scherm Zoekverkeer leeg en mist je rapport de
                          cijfers over klikken en vertoningen.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {initial.gsc_property ? (
                            <span className="chip chip-success">
                              Gekoppeld
                              {initial.gsc_last_sync_at &&
                                ` · laatst gesynchroniseerd ${nlDatum(initial.gsc_last_sync_at)}`}
                            </span>
                          ) : (
                            <span className="chip chip-neutral">Nog niet gekoppeld</span>
                          )}
                          <a
                            href="/instellingen/koppelingen"
                            className="text-sm text-secondary underline-offset-2 hover:underline"
                          >
                            Naar koppelingen
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                </CollapsibleSection>
              </section>
            );
          })}

          {/* ── 7. Documenten en teksten, plus veranderingen ─────────────────
              Uitgeklapt en niet ingeklapt: het moment waarop de klant zijn
              tarievenpagina of brochure daadwerkelijk bij zich heeft, is dit
              gesprek. */}
          <section id="materiaal" className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <Kop
                nummer="07"
                titel="Documenten en teksten"
                uitleg="Plak hier een tarievenpagina, een brochure of een stuk tekst. ORBIT ENGINE haalt er de feiten uit en bewaart ze."
              />
              <DossierBox profileId={profileId} />
            </div>

            <div className="flex flex-col gap-3">
              <Kop
                nummer="07b"
                titel="Veranderingen die eraan komen"
                uitleg="Een nieuwe naam, een nieuwe vestiging, een dienst die stopt. Dit soort dingen staan nergens op je site en veranderen wél wat ORBIT ENGINE meet."
              />
              <StrategyBox
                profileId={profileId}
                initialNotes={strategyNotes}
                initialFactors={strategyFactors}
              />
            </div>
          </section>

        {/* ── 9. Afspraken en afronden ──────────────────────────────────── */}
        <section id="afronden" className="flex flex-col gap-6">
          <Kop
            nummer="09"
            titel="Afspraken en afronden"
            uitleg={`Wie het aanspreekpunt is bij ${brandName}, en wat er na dit gesprek nog open staat.`}
          />

          <div className="flex flex-col gap-3">
            <span className="mono-label text-muted">Contactpersoon</span>
            <div className="flex flex-col gap-4">
              {veld("contact_name")}
              {veld("contact_email")}
              {veld("contact_phone")}
            </div>
          </div>

          <CollapsibleSection title="Auteur, voor later" defaultOpen={false}>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted">
                Zeven velden voor de naam onder je artikelen. Vastgelegd, maar nog niet
                automatisch onder gepubliceerde content gezet.
              </p>
              {SESSION_AUTHOR_FIELDS.map((k) => veld(k as string))}
            </div>
          </CollapsibleSection>

          <div className="card flex flex-col gap-3">
            <Meter meter={meter} />
            {openstaandVerplicht.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="mono-label">Nog {openstaandVerplicht.length} verplichte velden open</span>
                <ul className="flex flex-col gap-1">
                  {openstaandVerplicht.map((v) => (
                    <li key={v.field}>
                      <a href={`#veld-anker-${v.field}`} className="text-sm text-secondary underline-offset-2 hover:underline">
                        {v.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                ? `Het gesprek is vastgelegd op ${nlDatum(recordedAt)}. Pas je hierboven iets aan, bewaar het dan opnieuw bij "Veranderingen die eraan komen".`
                : "Leg het gesprek vast bij “Veranderingen die eraan komen”. Dan staat er wat je hebt afgesproken, met de datum erbij."}
            </p>
          </div>

          {/* B9, hoofdstuk 8.8: een samenvatting om terug te sturen. De
              consultant had tot nu toe geen manier om wat er is afgesproken
              door te sturen zonder zelf een e-mail te typen. */}
          <div className="card flex flex-col gap-3">
            <button
              type="button"
              className="btn-outline w-fit"
              onClick={() => setToonSamenvatting((s) => !s)}
              aria-expanded={toonSamenvatting}
            >
              {toonSamenvatting ? "Samenvatting verbergen" : "Samenvatting van dit gesprek"}
            </button>
            {toonSamenvatting && (
              <div className="flex flex-col gap-3 text-sm">
                <p className="text-secondary">
                  {brandName} · {initial.url}
                  {recordedAt && ` · gesprek vastgelegd op ${nlDatum(recordedAt)}`}
                </p>
                <div className="flex flex-col gap-1.5">
                  {BRAND_FIELDS.filter((f) => f.priority === "verplicht").map((f) => (
                    <p key={f.key as string}>
                      <span className="text-muted">{f.label}: </span>
                      <span>{samenvattingswaarde(waarden[f.key as string])}</span>
                    </p>
                  ))}
                </div>
                {strategyNotes && (
                  <p>
                    <span className="text-muted">Afgesproken: </span>
                    <span>{strategyNotes}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Het onderzoek bijwerken ──────────────────────────────────
              ⚠️ De raming staat in het bevestigvenster en niet op het scherm:
              de klant kijkt mee. `refreshConfirmation()` bouwt de twee zinnen
              daarvoor, zodat er in dit bestand geen bedrag voorkomt. */}
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
                onClick={() => setBevestigBijwerken(true)}
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

        {/* B9, hoofdstuk 8.1: een blijvende contextkolom naast de invoer, met
            de meter en de openstaande punten. Zonder dit moest de consultant
            voor de meter naar de bodem van een lange pagina scrollen. */}
        <aside className="hidden w-64 shrink-0 flex-col gap-4 self-start lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:flex">
          <div className="card flex flex-col gap-3">
            <Meter meter={meter} />
          </div>
          {gaten.length + openFeitenvragen.length > 0 && (
            <div className="card flex flex-col gap-2">
              <span className="mono-label">
                {gaten.length + openFeitenvragen.length} nog open
              </span>
              <a href="#open" className="text-sm text-secondary underline-offset-2 hover:underline">
                Naar de openstaande punten
              </a>
            </div>
          )}
        </aside>
      </div>

      {/* Was een kaal `window.confirm()` met alles op één regel, "Doorgaan?"
          incluis. Nu hetzelfde venster als de rest van de app: een lopende zin
          wat er opnieuw draait, en de kosten in het aparte blokje dat
          `ConfirmDialog` daarvoor heeft. Zie `docs/logbook.md`. */}
      <ConfirmDialog
        open={bevestigBijwerken}
        title="Onderzoek bijwerken"
        body={bevestiging.body}
        irreversible={
          bevestiging.cost
            ? { title: "Dit zet het onderzoek in gang", description: bevestiging.cost }
            : undefined
        }
        confirmLabel="Onderzoek bijwerken"
        confirmingLabel="Bezig…"
        busy={bijwerken === "bezig"}
        onConfirm={() => void werkBij()}
        onCancel={() => setBevestigBijwerken(false)}
      />

      {/* B8: de bevestiging bij het wijzigen van de website. Andere volgorde
          dan het bijwerkvenster: hier is de waarschuwing de kern van het
          bericht, niet een bedrag ernaast. */}
      <ConfirmDialog
        open={bevestigUrl}
        title="Website wijzigen"
        body={`ORBIT ENGINE gaat voortaan lezen op ${urlWaarde}.`}
        irreversible={{
          title: "De crawl moet opnieuw",
          description:
            "De inventaris en het aanbod zijn gebaseerd op de oude website. Draai \"Onderzoek bijwerken\" zodra je klaar bent, anders blijft ORBIT ENGINE werken met de oude pagina's.",
        }}
        confirmLabel="Website wijzigen"
        confirmingLabel="Bezig…"
        busy={standen.url === "opslaan"}
        onConfirm={() => void bewaarUrl()}
        onCancel={() => setBevestigUrl(false)}
      />
    </div>
  );
}

/** Eén regel voor de deelbare samenvatting: een waarde in gewone taal, of "nog niet ingevuld". */
function samenvattingswaarde(value: unknown): string {
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "nog niet ingevuld";
  if (typeof value === "string" && value.trim()) return value;
  return "nog niet ingevuld";
}

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
      <h2 className="type-section">{titel}</h2>
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
