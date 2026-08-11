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
const OPSLAG = "aura_zijbalk_ingeklapt";

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

  const merkItems = activeBrand ? brandNav(activeBrand.id) : [];

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
            <Item
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
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

function Item({
  item,
  active,
  smal,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  smal: boolean;
  onClick?: () => void;
}) {
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
