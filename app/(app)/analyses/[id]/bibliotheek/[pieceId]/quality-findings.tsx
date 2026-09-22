"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { InfoHint } from "@/components/info-hint";
import type { GegroepeerdeBevinding, Bevindingengroepen } from "@/lib/pipeline/quality-groups";

/**
 * De bevindingen van een pagina, in drie groepen
 * (`docs/tasks/herontwerp-contentpagina.md` §6.1).
 *
 * ── WAT HIER VERVANGEN WORDT ────────────────────────────────────────────────
 *
 * Tot 22 september 2026 stond hier "Kijk hier even naar": één platte lijst uit
 * `review_notes`. Gemeten op productie liep die van 45 tot 78 regels per pagina,
 * gemiddeld 49,1 over 25 pagina's. Alles even zwaar, alles even lang, en
 * nergens stond welke regel publicatie tegenhield.
 *
 * ── WAAROM DE DERDE GROEP HET BELANGRIJKST IS ───────────────────────────────
 *
 * De reparatie krijgt met opzet hooguit tien bevindingen mee. De rest is nooit
 * aan het model voorgelegd. Voor de lezer is dat het verschil tussen "hier liep
 * de machine op stuk, er ontbreekt waarschijnlijk informatie die alleen jij
 * hebt" en "dit heeft nog niemand aangeraakt". Die tweede soort is vaak in
 * dertig seconden zelf opgelost, en dat is precies het werk waar een canvas
 * naast deze lijst voor bedoeld is.
 *
 * De groepering zelf staat in `lib/pipeline/quality-groups.ts`, puur en getest.
 * Dit bestand toont hem en rekent niets uit.
 */
export function QualityFindings({
  groepen,
  pogingen,
  klantzin,
  score,
  verdict,
  sectieBestaat,
  onGaNaarSectie,
  onLaatHetOplossen,
  kanOplossen,
}: {
  groepen: Bevindingengroepen;
  /** De zin over eerdere pogingen. Leeg als er niets te vertellen valt. */
  pogingen: string;
  klantzin: string;
  score: number | null;
  verdict: string | null;
  /**
   * Bestaat deze kop nog in de tekst die op dit moment in het canvas staat?
   * Loopt via de live tekst en niet via de opgeslagen versie: wie een kop
   * hernoemt zonder op te slaan, hoort geen knop te zien die nergens heen gaat.
   */
  sectieBestaat: (sectie: string) => boolean;
  onGaNaarSectie: (sectie: string) => void;
  /** Zet de aanbeveling in het herschrijfvak. */
  onLaatHetOplossen: (bevinding: GegroepeerdeBevinding) => void;
  /** Uit zolang de eindpoort dicht staat of ORBIT ENGINE al aan het schrijven is. */
  kanOplossen: boolean;
}) {
  const totaal =
    groepen.blokkades.length + groepen.geprobeerd.length + groepen.nietGeprobeerd.length;

  if (totaal === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-sm" style={{ color: "var(--status-success)" }}>
          <Icon naam="klaar" size={16} />
          Er staan geen opmerkingen meer open.
        </p>
        {klantzin && <p className="text-sm text-secondary">{klantzin}</p>}
      </div>
    );
  }

  const stand =
    verdict === "pass"
      ? { icoon: "klaar" as const, kop: "Klaar voor publicatie" }
      : verdict === "repair"
        ? { icoon: "letop" as const, kop: "Bijna klaar" }
        : { icoon: "letop" as const, kop: "Nog niet naar je site" };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="mono-label flex items-center gap-1">
          <Icon naam={stand.icoon} size={16} />
          {stand.kop}
          <InfoHint label="Hoe ORBIT ENGINE dit bepaalt">
            Vier onafhankelijke beoordelaars kijken naar deze pagina, en daarnaast rekent de app tien
            controles na die geen mening nodig hebben: staan de verboden woorden erin, klopt de
            onderbouwing, is de tekst niet te veel als een andere pagina van jou.
          </InfoHint>
        </span>
        {score !== null && (
          <span className="stat-value" style={{ fontSize: "1.1rem" }}>
            {Math.round(score)}
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>
              /100
            </span>
          </span>
        )}
      </div>

      {klantzin && <p className="text-sm text-secondary">{klantzin}</p>}

      {/* De zin die zegt dat de app het zelf al geprobeerd heeft. Zonder deze
          regel leest iemand 49 punten als 49 dingen die niemand bekeken heeft,
          en dat klopt voor een deel van de lijst juist niet. */}
      {pogingen && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {pogingen}
        </p>
      )}

      {groepen.blokkades.length > 0 && (
        <Groep
          titel="Houdt publicatie tegen"
          aantal={groepen.blokkades.length}
          items={groepen.blokkades}
          /* ⚠️ Nooit inklapbaar, hoeveel het er ook zijn. Een punt dat
             publicatie tegenhoudt hoort niet achter een trede te staan. */
          altijdOpen
          toon="blokkade"
          sectieBestaat={sectieBestaat}
          onGaNaarSectie={onGaNaarSectie}
          onLaatHetOplossen={onLaatHetOplossen}
          kanOplossen={kanOplossen}
        />
      )}

      {groepen.geprobeerd.length > 0 && (
        <Groep
          titel="ORBIT ENGINE probeerde dit, zonder resultaat"
          aantal={groepen.geprobeerd.length}
          items={groepen.geprobeerd}
          toon="geprobeerd"
          sectieBestaat={sectieBestaat}
          onGaNaarSectie={onGaNaarSectie}
          onLaatHetOplossen={onLaatHetOplossen}
          kanOplossen={kanOplossen}
        />
      )}

      {groepen.nietGeprobeerd.length > 0 && (
        <Groep
          /* Bij een pagina zonder bekende reparatierondes valt er niets te
             beweren over wat er wel of niet geprobeerd is (conventie 3), en
             dan is "Verder opgevallen" de eerlijke kop. */
          titel={
            groepen.reparatierondes === 0
              ? "Verder opgevallen"
              : "Hier is ORBIT ENGINE niet aan toegekomen"
          }
          aantal={groepen.nietGeprobeerd.length}
          items={groepen.nietGeprobeerd}
          toon="niet-geprobeerd"
          sectieBestaat={sectieBestaat}
          onGaNaarSectie={onGaNaarSectie}
          onLaatHetOplossen={onLaatHetOplossen}
          kanOplossen={kanOplossen}
        />
      )}
    </div>
  );
}

/** Hoeveel bevindingen er in één keer uitklappen. */
const EERSTE_LADING = 10;

function Groep({
  titel,
  aantal,
  items,
  altijdOpen = false,
  toon,
  sectieBestaat,
  onGaNaarSectie,
  onLaatHetOplossen,
  kanOplossen,
}: {
  titel: string;
  aantal: number;
  items: GegroepeerdeBevinding[];
  altijdOpen?: boolean;
  toon: "blokkade" | "geprobeerd" | "niet-geprobeerd";
  sectieBestaat: (sectie: string) => boolean;
  onGaNaarSectie: (sectie: string) => void;
  onLaatHetOplossen: (bevinding: GegroepeerdeBevinding) => void;
  kanOplossen: boolean;
}) {
  const [open, setOpen] = useState(altijdOpen);
  // Niet 54 items tegelijk in de DOM: dat is de lijst die dit scherm juist
  // kwijt wilde, alleen een trede lager.
  const [getoond, setGetoond] = useState(EERSTE_LADING);

  const zichtbaar = items.slice(0, getoond);
  const rest = items.length - zichtbaar.length;

  return (
    <div className="flex flex-col gap-2">
      {altijdOpen ? (
        <span
          className="mono-label flex items-center gap-1.5"
          style={{ color: "var(--intent-danger-content)" }}
        >
          {titel}
          <span className="chip chip-danger">{aantal}</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="mono-label flex items-center gap-1.5">
            {titel}
            <span className="chip">{aantal}</span>
          </span>
          <span style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            <Icon naam="openen" size={16} />
          </span>
        </button>
      )}

      {open && (
        <ul className="flex flex-col gap-3">
          {zichtbaar.map((item, i) => (
            <Bevinding
              key={`${item.issue.section ?? ""}-${item.issue.finding}-${i}`}
              item={item}
              toon={toon}
              sectieBestaat={sectieBestaat}
              onGaNaarSectie={onGaNaarSectie}
              onLaatHetOplossen={onLaatHetOplossen}
              kanOplossen={kanOplossen}
            />
          ))}
          {rest > 0 && (
            <li>
              <button
                type="button"
                onClick={() => setGetoond((g) => g + EERSTE_LADING)}
                className="text-sm text-secondary hover:underline"
              >
                Toon de overige {rest}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function Bevinding({
  item,
  toon,
  sectieBestaat,
  onGaNaarSectie,
  onLaatHetOplossen,
  kanOplossen,
}: {
  item: GegroepeerdeBevinding;
  toon: "blokkade" | "geprobeerd" | "niet-geprobeerd";
  sectieBestaat: (sectie: string) => boolean;
  onGaNaarSectie: (sectie: string) => void;
  onLaatHetOplossen: (bevinding: GegroepeerdeBevinding) => void;
  kanOplossen: boolean;
}) {
  const { issue } = item;
  const sectie = issue.section?.trim() ?? "";
  // De kop kan hernoemd zijn in tekst die nog niet is opgeslagen. Dan is een
  // knop die nergens heen springt erger dan geen knop (conventie 3).
  const springbaar = sectie.length > 0 && sectieBestaat(sectie);

  return (
    <li
      className="flex flex-col gap-1.5 border-l-2 pl-3"
      style={{
        borderColor:
          toon === "blokkade" ? "var(--intent-danger-solid)" : "var(--border-subtle)",
      }}
    >
      {sectie && (
        <span className="mono-label" style={{ fontSize: "0.65rem" }}>
          {sectie}
        </span>
      )}

      <p className="text-sm">{issue.finding}</p>

      {issue.recommendation?.trim() && (
        <p className="text-sm text-secondary">{issue.recommendation}</p>
      )}

      {/* Het bewijs is voor wie het niet gelooft, niet voor wie het leest. Een
          citaat van twee regels onder elke bevinding maakt de lijst weer even
          lang als de lijst die dit scherm verving. */}
      {issue.evidence?.trim() && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Waarop dit oordeel rust</summary>
          <p className="mt-1 text-secondary">{issue.evidence}</p>
          {issue.expected?.trim() && (
            <p className="mt-1 text-muted">Verwacht: {issue.expected}</p>
          )}
        </details>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {springbaar && (
          <button
            type="button"
            onClick={() => onGaNaarSectie(sectie)}
            className="text-sm text-secondary hover:underline"
          >
            Ga naar deze sectie
          </button>
        )}
        {sectie && !springbaar && (
          <span className="text-sm text-muted">Deze kop staat niet meer in de tekst</span>
        )}
        {kanOplossen && (
          <button
            type="button"
            onClick={() => onLaatHetOplossen(item)}
            className="text-sm text-secondary hover:underline"
          >
            {toon === "geprobeerd" ? "Laat het nog eens proberen" : "Laat ORBIT ENGINE dit oplossen"}
          </button>
        )}
      </div>
    </li>
  );
}
