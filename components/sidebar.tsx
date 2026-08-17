"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { brandNav, generalNav, isActive, type NavItem } from "@/lib/nav";
import type { BrandOption } from "@/lib/workspace";

/**
 * De zijbalk van de werkruimte.
 *
 * ── WAAROM EEN ZIJBALK EN GEEN BOVENBALK ────────────────────────────────────
 *
 * De bovenbalk had twee bestemmingen en paste prima. Maar besluit 1 maakt van de
 * app een merk-werkruimte, en dan komen er twee soorten navigatie naast elkaar
 * te staan: wat gaat over dít merk, en wat gaat over de app als geheel. Dat
 * onderscheid is horizontaal niet te maken zonder scheidingstekens die niets
 * betekenen. Verticaal is het één tussenkopje.
 *
 * Nova doet het ook zo, inclusief het inklappen (`expandSidebar`,
 * `collapseSidebar`) en een aparte mobiele variant (`openNavigationMenu`).
 *
 * ── INGEKLAPT IS EEN VOORKEUR, GEEN STAAT ───────────────────────────────────
 *
 * De keuze staat in `localStorage` en niet in een cookie: hij verandert niets
 * aan wat de server rendert, en een cookie zou elke request groter maken voor
 * een puur visuele voorkeur.
 */
const OPSLAG = "orbit_engine_zijbalk_ingeklapt";

export function Sidebar({
  activeBrand,
  staff = false,
  onMobileClose,
}: {
  activeBrand: BrandOption | null;
  /** Beheerder? Dan staat het CSM-paneel erbij (fase 8). */
  staff?: boolean;
  /** Alleen gezet in de mobiele lade: dan sluit een klik het menu. */
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const [ingeklapt, setIngeklapt] = useState(false);
  const mobiel = Boolean(onMobileClose);

  useEffect(() => {
    setIngeklapt(window.localStorage.getItem(OPSLAG) === "1");
  }, []);

  function klapOm() {
    setIngeklapt((v) => {
      window.localStorage.setItem(OPSLAG, v ? "0" : "1");
      return !v;
    });
  }

  // In de mobiele lade is inklappen zinloos: daar is de balk altijd breed.
  const smal = ingeklapt && !mobiel;

  const merkItems = activeBrand ? brandNav(activeBrand.id, staff) : [];

  // De breedte zit hier en niet op de <aside>: het inklappen is clientstate en
  // die woont in dit component. Vaste breedtes, want een zijbalk die meegroeit
  // met de langste merknaam laat de hele pagina verspringen zodra je wisselt.
  const breedte = mobiel ? "w-full" : smal ? "w-16" : "w-60";

  return (
    <div
      className={`flex h-full flex-col gap-1 p-3 transition-[width] duration-200 ${breedte}`}
    >
      {merkItems.length > 0 && (
        <>
          {!smal && (
            <span className="mono-label px-3 pb-1 pt-2 truncate">
              {activeBrand?.name}
            </span>
          )}
          {merkItems.map((item) => (
            <ItemGroup
              key={item.href}
              item={item}
              pathname={pathname}
              smal={smal}
              onClick={onMobileClose}
            />
          ))}
          <div className="my-2 border-t border-[var(--border-subtle)]" />
        </>
      )}

      {!smal && <span className="mono-label px-3 pb-1">Algemeen</span>}
      {generalNav(staff).map((item) => (
        <Item
          key={item.href}
          item={item}
          active={isActive(pathname, item.href)}
          smal={smal}
          onClick={onMobileClose}
        />
      ))}

      {!mobiel && (
        <button
          type="button"
          onClick={klapOm}
          className="mono-label mt-auto rounded-[var(--radius-md)] px-3 py-2 text-left transition-colors hover:bg-[var(--bg-elevated)]"
          aria-label={ingeklapt ? "Zijbalk uitklappen" : "Zijbalk inklappen"}
        >
          {ingeklapt ? "»" : "« Inklappen"}
        </button>
      )}
    </div>
  );
}

/**
 * Eén hoofditem, met eronder zijn subpagina's (Mijn merk, Clusters).
 *
 * ── EEN KOP MET KINDEREN NAVIGEERT NIET MEER, HIJ KLAPT ALLEEN UIT ─────────
 *
 * Eerder was zo'n kop tegelijk een link naar zijn eigen bestemming (bv.
 * "Merkdossier" ging naar `/profielen/[id]`) én de trigger die zijn
 * subpagina's toonde. Dat zijn twee dingen tegelijk op één klik, en het is
 * niet te zien welke van de twee er gebeurt vóórdat je klikt. Sinds de tweede
 * herstructureringsronde (14 augustus 2026) is een kop met kinderen alleen
 * nog een klapknop; wat eerst zijn eigen pagina was, staat nu als eerste kind
 * in de lijst (zie `lib/nav.ts`).
 *
 * ── AUTOMATISCH OPEN ZODRA JE ERIN ZIT, MANUEEL DAARBUITEN ──────────────────
 *
 * Negen subpagina's onder "Mijn merk" mogen niet altijd openstaan naast de
 * andere hoofditems, dat is de vergaarbak die dit oplost alleen verticaal. Op
 * een pagina van deze groep klapt hij dus vanzelf open. Overal elders mag je
 * hem met een klik openzetten om te kijken wat erin zit, zonder ergens heen te
 * gaan: dat is precies wat er gevraagd is voor "Clusters".
 */
function ItemGroup({
  item,
  pathname,
  smal,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  smal: boolean;
  onClick?: () => void;
}) {
  const children = item.children ?? [];
  // Exact, niet `isActive()`: de kinderen zijn onderling gelijkwaardige
  // bestemmingen, geen route-nesting. "Merkdossier" (`/profielen/[id]`) is nu
  // zelf een kind naast "Producten" (`/profielen/[id]/producten`), en
  // `isActive()`'s prefixmatch zou "Merkdossier" laten oplichten op elke
  // andere subpagina, want die paden beginnen allemaal met hetzelfde adres.
  const childHref = (h: string) => h.split("?")[0];
  const childActive = children.some((c) => pathname === childHref(c.href));
  const [manualOpen, setManualOpen] = useState(false);

  // Verlaat je de groep (childActive wordt false), dan valt de handmatige
  // stand terug op dicht. Anders blijft "Clusters" openstaan nadat je naar
  // een heel ander deel van de app bent genavigeerd, wat op den duur meer
  // balken tegelijk open zou laten staan dan er zijbalk is.
  useEffect(() => {
    if (!childActive) setManualOpen(false);
  }, [childActive]);

  const open = !smal && children.length > 0 && (childActive || manualOpen);

  if (children.length === 0) {
    return (
      <Item item={item} active={isActive(pathname, item.href)} smal={smal} onClick={onClick} />
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setManualOpen((v) => !v)}
        aria-expanded={open}
        title={smal ? item.label : undefined}
        className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm font-medium transition-colors"
        style={{
          color: childActive ? "var(--text-primary)" : "var(--text-secondary)",
          background: childActive ? "var(--bg-elevated)" : "transparent",
        }}
      >
        <span className="w-4 shrink-0 text-center" aria-hidden>
          {item.teken}
        </span>
        {!smal && (
          <>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <span className="mono-label shrink-0 text-muted" aria-hidden>
              {open ? "▾" : "▸"}
            </span>
          </>
        )}
      </button>
      {open && (
        <div className="ml-4 flex flex-col gap-0.5 border-l border-[var(--border-subtle)] pl-2">
          {children.map((child, i) => (
            <div key={child.href + child.label} className="flex flex-col gap-0.5">
              {child.group && i > 0 && (
                <span className="mono-label px-3 pb-0.5 pt-2 text-[0.65rem] text-muted">
                  {child.group}
                </span>
              )}
              <Item
                item={child}
                active={pathname === childHref(child.href)}
                smal={false}
                sub
                onClick={onClick}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Item({
  item,
  active,
  smal,
  sub = false,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  smal: boolean;
  /** Subpagina: kleiner, geen teken-kolom, want de aansluitlijn geeft al de hiërarchie. */
  sub?: boolean;
  onClick?: () => void;
}) {
  if (sub) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className="flex items-center justify-between gap-2 truncate rounded-[var(--radius-md)] px-3 py-1.5 text-sm transition-colors"
        style={{
          color: active ? "var(--text-primary)" : "var(--text-secondary)",
          background: active ? "var(--bg-elevated)" : "transparent",
          fontWeight: active ? 500 : 400,
        }}
      >
        <span className="truncate">{item.label}</span>
        {item.staffOnly && (
          <span
            className="mono-label shrink-0 text-muted"
            style={{ fontSize: "0.6rem" }}
            title="Alleen zichtbaar voor jou, niet voor de klant"
          >
            alleen jij
          </span>
        )}
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={smal ? item.label : undefined}
      className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors"
      style={{
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        background: active ? "var(--bg-elevated)" : "transparent",
      }}
    >
      {/* Het teken is geen icoon maar een anker: ingeklapt is het het enige dat
          overblijft, en dan moet je er nog steeds op kunnen mikken. */}
      <span className="w-4 shrink-0 text-center" aria-hidden>
        {item.teken}
      </span>
      {!smal && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
