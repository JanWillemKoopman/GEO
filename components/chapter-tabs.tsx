import Link from "next/link";

/**
 * De hoofdstuktabs van het analysedossier.
 *
 * ── VAN RAIL NAAR TABBLADEN (26 augustus 2026) ──────────────────────────────
 *
 * Het dossier (`app/(app)/analyses/[id]/page.tsx`) had een `SectionRail`: een
 * verticale rail links op desktop, met scroll-spy, naast één doorlopende
 * scrollpagina met alle vier hoofdstukken onder elkaar. `docs/logbook.md` §9
 * legt uit waarom die vorm ooit boven vijf gelijkwaardige tabbladen werd
 * gekozen.
 *
 * Op expliciet verzoek is dat omgedraaid: vier losse tabbladen, één hoofdstuk
 * zichtbaar tegelijk, de balk horizontaal en sticky boven de inhoud, op
 * desktop én mobiel. Dit is een los component en geen aanpassing van
 * `SectionRail` zelf, want die draait ook op het onboardingscherm
 * (`onboarding-session.tsx`), dat wél één doorlopende pagina blijft.
 *
 * Serverside navigatie (`Link` met een querystring) in plaats van client-side
 * scroll-spy: zo houdt elk hoofdstuk zijn eigen `Suspense`-grens, want er staat
 * nooit meer dan één hoofdstuk tegelijk in de DOM, en blijft elk tabblad een
 * deelbare URL.
 *
 * ── DE LAGEN ────────────────────────────────────────────────────────────────
 *
 * Deze balk moet altijd bovenop liggen, en dat is niet vanzelfsprekend:
 *
 * 1. `top-[var(--header-h)]` in plaats van een losse `top-[57px]`. De bovenbalk
 *    is 61 pixels hoog en zet diezelfde variabele op zichzelf
 *    (`workspace-chrome.tsx`), dus de balken kunnen niet uit elkaar lopen. Op
 *    57 pixels bleef er een kier van 4 pixels open waar de pagina-inhoud
 *    doorheen schoof.
 * 2. `z-30` en niet `z-10`. Elk hoofdstuk zet zijn kop en inhoud op
 *    `relative z-10` (`components/chapter.tsx`), en bij een gelijke z-index
 *    wint wat later in de DOM staat: de inhoud schoof dus dwars over de balk
 *    heen bij het scrollen. `z-30` is dezelfde laag als de bovenbalk zelf, en
 *    blijft onder de uitklapmenu's (z-40) en de dialogen en meldingen (z-50),
 *    die wél over navigatie heen horen te vallen.
 */
export interface ChapterTab {
  id: string;
  label: string;
  /** Stand van dit hoofdstuk, bv. "4 open" of "meting loopt". */
  badge?: string;
  /** Toont de pulserende punt: hier draait iets. */
  live?: boolean;
}

export function ChapterTabs({
  tabs,
  active,
  hrefFor,
}: {
  tabs: ChapterTab[];
  /** id van het hoofdstuk dat nu getoond wordt. */
  active: string;
  /** Bouwt de URL voor een tabblad, met behoud van de overige querystring. */
  hrefFor: (id: string) => string;
}) {
  return (
    <nav
      aria-label="Hoofdstukken"
      // `-mx-6 px-6`: de balk loopt door tot in de zijmarge van de
      // inhoudskolom, zodat hij als één doorlopende strook over de pagina ligt
      // en niet als een blokje dat halverwege ophoudt.
      className="no-print sticky top-[var(--header-h)] z-30 -mx-6 mb-6 flex gap-2 overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--bg-base-blur)] px-6 py-2.5 backdrop-blur-md"
    >
      {tabs.map((tab, i) => {
        const on = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            aria-current={on ? "page" : undefined}
            className={`chip shrink-0 ${on ? "" : "chip-neutral"}`}
          >
            <span style={{ opacity: 0.7 }}>{String(i + 1).padStart(2, "0")}</span>
            {tab.label}
            {tab.live && <span className="live-dot" style={{ width: 6, height: 6 }} />}
            {tab.badge && (
              <span className="mono-label" style={{ fontSize: "0.6rem", opacity: 0.85 }}>
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
