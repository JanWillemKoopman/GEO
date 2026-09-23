"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { InfoHint } from "@/components/info-hint";
import {
  leesbareBevinding,
  bundelOpSoort,
  type GegroepeerdeBevinding,
  type Bevindingengroepen,
} from "@/lib/pipeline/quality-groups";
import { opdrachtVan, puntSleutel, type Keuze, type Keuzes } from "@/lib/puntenronde";

/**
 * "Te verbeteren": wat er aan deze tekst beter moet, en hoe.
 *
 * ── ⚠️ WAT HIER VERANDERDE, EN WAAROM (23 september 2026) ──────────────────
 *
 * De eigenaar vond de rail naast de tekst onoverzichtelijk, en bij het
 * natellen op de pagina van Van den Udenhout klopte dat: vóór het eerste punt
 * stonden vier regels uitleg (een kop, een score, een klantzin van zes regels
 * die de eerste bevinding letterlijk herhaalde, en een zin over eerdere
 * pogingen), daarna vijf citaten die allemaal eindigden met `".`, en de knop om
 * het op te lossen stond onderaan, onder de vouw. Wat iemand hier komt doen
 * (zien wat beter moet en het oplossen) stond pas op de vijfde plek.
 *
 * Nu, van boven naar beneden:
 *
 *   1. De kop met het aantal, de score klein ernaast.
 *   2. Eén knop die alle punten tegelijk laat oplossen.
 *   3. Per punt: wat er mis is, hoe je het oplost, en de plekken in de tekst.
 *      Een plek aanklikken springt naar de gemarkeerde zin.
 *   4. Wat publicatie NIET tegenhoudt, ingeklapt onder "Overige suggesties".
 *      Op die pagina (317065f5) 53 van de 58 opgeslagen bevindingen, en die
 *      hoort niemand eerst te lezen.
 *
 * Weg: de klantzin (herhaalde het eerste punt) en "waarop dit oordeel rust"
 * onder elk punt (het bewijs is de zin zelf, en die staat nu gemarkeerd in de
 * tekst). De zin over eerdere pogingen staat nog, maar in de ingeklapte groep:
 * hij verklaart waarom die lijst er is, niet wat je nu moet doen.
 *
 * De groepering zelf staat in `lib/pipeline/quality-groups.ts`, puur en getest.
 *
 * ── EN DAARNA: ÉÉN VENSTER PER PUNT (23 september 2026, tweede ronde) ───────
 *
 * Per punt stonden drie tekstknoppen ("Laat ORBIT ENGINE het oplossen", "Zelf
 * aanpassen", "Klopt, laat staan"), en de eerste vulde alleen een vak onderaan
 * waar je daarna nog eens moest klikken. De eigenaar noemde dat een dood eind.
 * Nu opent een plek of "Los op" het puntenvenster (`puntvenster.tsx`), dat de
 * keuze stelt en daarna het volgende punt laat zien. Deze lijst toont per plek
 * wat je al gekozen hebt.
 */
export function QualityFindings({
  groepen,
  pogingen,
  klantzin,
  analysisId,
  pieceId,
  bewustLatenStaan,
  score,
  gevonden,
  sectieBestaat,
  onGaNaarSectie,
  onOpenPunt,
  onStartRonde,
  onAllesNaarOrbit,
  keuzes,
  onLaatOplossen,
  kanOplossen,
}: {
  groepen: Bevindingengroepen;
  /** De zin over eerdere pogingen. Leeg als er niets te vertellen valt. */
  pogingen: string;
  /** Alleen nog gebruikt als er niets meer openstaat. */
  klantzin: string;
  analysisId: string;
  pieceId: string;
  /** Zinnen zonder bron die de klant bewust laat staan: voor "ongedaan maken". */
  bewustLatenStaan: string[];
  score: number | null;
  /**
   * Per blokkade (zelfde volgorde als `groepen.blokkades`) of zijn zin in de
   * leestekst gemarkeerd kon worden. Niet gevonden: geen spring-knop.
   */
  gevonden: boolean[];
  sectieBestaat: (sectie: string) => boolean;
  onGaNaarSectie: (sectie: string) => void;
  /** Open het puntenvenster op dit punt. */
  onOpenPunt: (item: GegroepeerdeBevinding) => void;
  /** Open het puntenvenster op het eerste punt zonder keuze. */
  onStartRonde: () => void;
  /** Zet elk punt zonder keuze op de lijst voor ORBIT ENGINE. */
  onAllesNaarOrbit: () => void;
  /** Wat de klant in het venster per punt koos. */
  keuzes: Keuzes;
  /** Zet deze opdracht(en) in het herschrijfvak (alleen nog voor de overige suggesties). */
  onLaatOplossen: (opdrachten: string[]) => void;
  /** Uit zolang de eindpoort dicht staat of ORBIT ENGINE al aan het schrijven is. */
  kanOplossen: boolean;
}) {
  const blokkades = groepen.blokkades;
  const overig = [...groepen.geprobeerd, ...groepen.nietGeprobeerd];
  const laatStaan = useLaatStaan(analysisId, pieceId);

  return (
    <section id="verbeteren" className="flex flex-col gap-4 scroll-mt-24" aria-label="Te verbeteren">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="type-section flex items-center gap-2">
          Te verbeteren
          {blokkades.length > 0 && <span className="chip chip-warning">{blokkades.length}</span>}
        </h2>
        {score !== null && (
          <span className="flex items-center gap-1 text-sm text-muted">
            <span className="tabular">
              <span className="font-medium text-[var(--text-primary)]">{Math.round(score)}</span>/100
            </span>
            <InfoHint label="Wat deze score betekent">
              Vier onafhankelijke beoordelaars kijken naar deze pagina, en de app rekent daarnaast tien
              controles na die geen mening nodig hebben, zoals of elke uitspraak over je bedrijf een
              bron heeft. De score zegt hoe goed de tekst is; de punten hieronder zeggen wat er nog
              beter moet.
            </InfoHint>
          </span>
        )}
      </div>

      {blokkades.length === 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-2 text-sm" style={{ color: "var(--status-success)" }}>
            <Icon naam="klaar" size={16} />
            Niets houdt publicatie tegen.
          </p>
          {overig.length === 0 && klantzin && <p className="text-sm text-secondary">{klantzin}</p>}
        </div>
      ) : (
        <>
          <p className="text-sm text-secondary">
            {blokkades.length === 1
              ? "Dit punt raden we je aan op te lossen voor je de tekst goedkeurt."
              : "Deze punten raden we je aan op te lossen voor je de tekst goedkeurt."}
            {gevonden.some(Boolean) && " De zinnen staan oranje gemarkeerd in de tekst. Klik erop om ze op te lossen."}
          </p>
          <div className="flex flex-col gap-1.5">
            <button type="button" data-sluit-lade className="btn-primary btn-sm w-full" onClick={onStartRonde}>
              {blokkades.length === 1 ? "Los dit punt op" : `Los de ${blokkades.length} punten stap voor stap op`}
            </button>
            {kanOplossen && blokkades.length > 1 && (
              <button
                type="button"
                data-sluit-lade
                className="w-fit self-center text-sm text-secondary hover:underline"
                onClick={onAllesNaarOrbit}
              >
                of laat ORBIT ENGINE ze alle {blokkades.length} in één keer oplossen
              </button>
            )}
          </div>
          <ul className="flex flex-col gap-3">
            {bundelOpSoort(blokkades).map((bundel, i) => (
              <Punt
                key={`${bundel.kop ?? bundel.details[0]}-${i}`}
                items={bundel.items}
                kop={bundel.kop}
                details={bundel.details}
                keuzes={keuzes}
                onOpenPunt={onOpenPunt}
              />
            ))}
          </ul>
        </>
      )}

      {laatStaan.fout && <p className="text-sm text-[var(--intent-danger-content)]">{laatStaan.fout}</p>}

      {bewustLatenStaan.length > 0 && (
        <p className="text-sm text-muted">
          {bewustLatenStaan.length === 1
            ? "1 zin zonder bron laat je bewust staan."
            : `${bewustLatenStaan.length} zinnen zonder bron laat je bewust staan.`}{" "}
          <button
            type="button"
            disabled={laatStaan.bezig}
            onClick={() => void laatStaan.doe(bewustLatenStaan, true)}
            className="text-secondary underline"
          >
            Ongedaan maken
          </button>
        </p>
      )}

      {overig.length > 0 && (
        <Overige
          items={overig}
          pogingen={pogingen}
          sectieBestaat={sectieBestaat}
          onGaNaarSectie={onGaNaarSectie}
          onLaatOplossen={onLaatOplossen}
          kanOplossen={kanOplossen}
        />
      )}
    </section>
  );
}

/**
 * "Akkoord, laat staan" (migratie 0110): de zin blijft in de tekst, het punt
 * verdwijnt. Na het opslaan ververst het scherm, zodat de telling in de rail,
 * de kaart "Aan zet" en de publiceerstap tegelijk meegaan.
 */
export function useLaatStaan(analysisId: string, pieceId: string) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  /** `true` als het gelukt is. */
  async function doe(zinnen: string[], ongedaan: boolean): Promise<boolean> {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/content/${pieceId}/zinnen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zinnen, ongedaan }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setFout(json?.error ?? "Dat is niet gelukt. Probeer het opnieuw.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setFout("Er is geen verbinding. Probeer het opnieuw.");
      return false;
    } finally {
      setBezig(false);
    }
  }
  return { bezig, fout, doe };
}

/**
 * Het deel van een bevinding vóór de dubbele punt, als de rest een citaat is
 * dat al als plek getoond wordt. Anders zou dezelfde zin twee keer staan.
 */
function kopVan(item: GegroepeerdeBevinding): string {
  const zin = leesbareBevinding(item.issue.finding);
  const i = zin.indexOf(":");
  if (item.issue.evidence?.trim() && i >= 8 && i <= 90) return zin.slice(0, i).trim();
  return zin;
}

/** Het citaat van één plek, zonder aanhalingstekens en slotpunt eromheen. */
function plekVan(item: GegroepeerdeBevinding): string | null {
  const bron = item.issue.evidence?.trim();
  if (!bron) return null;
  return leesbareBevinding(bron).replace(/^["“„']+|["”']+\.?$/g, "").trim();
}

/** Wat de klant voor een plek koos, in drie woorden. */
const KEUZE_LABEL: Record<Keuze["soort"], string> = {
  orbit: "Op je lijst voor ORBIT ENGINE",
  zelf: "Zelf aangepast",
  staan: "Laat je staan",
  overslaan: "Overgeslagen",
};

/**
 * Eén verbeterpunt: wat er mis is, hoe je het oplost, en waar het staat.
 * Een bundel (dezelfde soort op meerdere plekken) is één punt met meerdere
 * plekken. Elke plek en de knop "Los op" openen het puntenvenster.
 */
function Punt({
  items,
  kop,
  details,
  keuzes,
  onOpenPunt,
}: {
  items: GegroepeerdeBevinding[];
  kop: string | null;
  /** Per item de tekst ná de aanhef, voor een bundel zonder citaten. */
  details: string[];
  keuzes: Keuzes;
  onOpenPunt: (item: GegroepeerdeBevinding) => void;
}) {
  const eerste = items[0];
  const titel = kop ?? kopVan(eerste);
  const hoe = eerste.issue.recommendation?.trim() ? leesbareBevinding(eerste.issue.recommendation) : null;
  const plekken = items
    .map((item) => ({ item, zin: plekVan(item), keuze: keuzes[puntSleutel(item)] }))
    .filter((p): p is { item: GegroepeerdeBevinding; zin: string; keuze: Keuze | undefined } => Boolean(p.zin));
  const sectie = eerste.issue.section?.trim();
  // "Los op" begint bij de eerste plek zonder keuze; heeft elke plek er een,
  // dan bij de eerste, om een keuze te kunnen wijzigen.
  const eersteOpen = items.find((i) => !keuzes[puntSleutel(i)]) ?? eerste;
  const allesGekozen = items.every((i) => keuzes[puntSleutel(i)]);
  const eersteKeuze = keuzes[puntSleutel(eerste)];

  return (
    <li
      className="flex flex-col gap-2 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] border-l-2 p-3"
      style={{ borderLeftColor: allesGekozen ? "var(--status-success)" : "var(--intent-warning-solid)" }}
    >
      <p className="text-sm font-medium">
        {titel}
        {items.length > 1 && <span className="text-muted font-normal"> ({items.length}×)</span>}
      </p>
      {sectie && <span className="type-caption text-muted">In: {sectie}</span>}
      {hoe && (
        <p className="text-sm text-secondary">
          <span className="text-muted">Zo los je het op: </span>
          {hoe}
        </p>
      )}

      {plekken.length === 0 && kop && (
        <ul className="flex flex-col gap-1">
          {details.map((d, i) => (
            <li key={i} className="text-sm text-secondary">
              {d}
            </li>
          ))}
        </ul>
      )}

      {plekken.length > 0 && (
        <ul className="flex flex-col gap-1">
          {plekken.map(({ item, zin, keuze }) => (
            <li key={puntSleutel(item)} className="flex flex-col gap-0.5">
              <button
                type="button"
                data-sluit-lade
                onClick={() => onOpenPunt(item)}
                className="tekst-punt-link w-full text-left text-sm"
                data-gekozen={keuze ? "" : undefined}
                title="Los dit punt op"
              >
                <span className="line-clamp-2">{zin}</span>
              </button>
              {keuze && <span className="pl-2 text-xs text-secondary">{KEUZE_LABEL[keuze.soort]}</span>}
            </li>
          ))}
        </ul>
      )}

      {plekken.length === 0 && items.length === 1 && eersteKeuze && (
        <span className="text-xs text-secondary">{KEUZE_LABEL[eersteKeuze.soort]}</span>
      )}

      <button
        type="button"
        data-sluit-lade
        onClick={() => onOpenPunt(eersteOpen)}
        className="link w-fit text-sm font-medium"
      >
        {allesGekozen ? "Keuze wijzigen" : items.length > 1 ? "Los ze op" : "Los op"}
      </button>
    </li>
  );
}

/** Hoeveel overige suggesties er in één keer uitklappen. */
const EERSTE_LADING = 10;

/**
 * Wat publicatie niet tegenhoudt. Standaard dicht: op productie gemiddeld 49
 * bevindingen per pagina (22 september 2026), en de lezer hoort eerst bij de
 * punten te komen die ertoe doen.
 */
function Overige({
  items,
  pogingen,
  sectieBestaat,
  onGaNaarSectie,
  onLaatOplossen,
  kanOplossen,
}: {
  items: GegroepeerdeBevinding[];
  pogingen: string;
  sectieBestaat: (sectie: string) => boolean;
  onGaNaarSectie: (sectie: string) => void;
  onLaatOplossen: (opdrachten: string[]) => void;
  kanOplossen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [getoond, setGetoond] = useState(EERSTE_LADING);
  const zichtbaar = items.slice(0, getoond);
  const rest = items.length - zichtbaar.length;

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left text-sm"
      >
        <span className="flex items-center gap-2">
          Overige suggesties
          <span className="chip chip-neutral">{items.length}</span>
        </span>
        <Icon naam={open ? "inklappen" : "uitklappen"} size={14} />
      </button>

      {open && (
        <>
          <p className="text-sm text-muted">
            Deze houden publicatie niet tegen. {pogingen}
          </p>
          <ul className="flex flex-col gap-3">
            {zichtbaar.map((item, i) => {
              const sectie = item.issue.section?.trim() ?? "";
              const springbaar = sectie.length > 0 && sectieBestaat(sectie);
              return (
                <li
                  key={`${sectie}-${item.issue.finding}-${i}`}
                  className="flex flex-col gap-1 border-l-2 border-[var(--border-subtle)] pl-3"
                >
                  {sectie && <span className="type-caption text-muted">{sectie}</span>}
                  <p className="text-sm">{leesbareBevinding(item.issue.finding)}</p>
                  {item.issue.recommendation?.trim() && (
                    <p className="text-sm text-secondary">{leesbareBevinding(item.issue.recommendation)}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {kanOplossen && (
                      <button
                        type="button"
                        data-sluit-lade
                        onClick={() => onLaatOplossen([opdrachtVan(item)])}
                        className="text-sm text-secondary hover:underline"
                      >
                        {item.herkomst === "geprobeerd" ? "Laat het nog eens proberen" : "Laat ORBIT ENGINE dit oplossen"}
                      </button>
                    )}
                    {springbaar && (
                      <button
                        type="button"
                        data-sluit-lade
                        onClick={() => onGaNaarSectie(sectie)}
                        className="text-sm text-secondary hover:underline"
                      >
                        Ga naar deze sectie
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {rest > 0 && (
            <button
              type="button"
              onClick={() => setGetoond((g) => g + EERSTE_LADING)}
              className="w-fit text-sm text-secondary hover:underline"
            >
              Toon de overige {rest}
            </button>
          )}
        </>
      )}
    </div>
  );
}
