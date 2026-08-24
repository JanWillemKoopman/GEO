"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import {
  brandNav,
  generalNav,
  hoofdstukken,
  salesNav,
  isExact,
  type NavHoofdstuk,
  type NavItem,
} from "@/lib/nav";
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
 * ── KOPPEN IN PLAATS VAN ZEVEN REGELS MET EEN VERGAARBAK ───────────────────
 *
 * Tot 17 augustus 2026 was dit een lijst van 7 regels die uitklapten naar 15
 * bestemmingen, waarvan er negen onder één kop hingen. Nu groepeert de balk een
 * platte lijst bestemmingen op hun hoofdstuk (`lib/nav.ts`), in een vaste
 * volgorde, met een grens per kop die in `GRENS_PER_HOOFDSTUK` staat: drie voor
 * de klanthoofdstukken, vier voor Analytics en Admin, vijf voor Sales. Een
 * hoofdstuk zonder bestemmingen wordt niet getoond.
 *
 * ── ALLES STAAT OPEN, ER VALT NIETS MEER UIT TE KLAPPEN ─────────────────────
 *
 * Het uitklappen was er voor die ene kop met negen kinderen. Met hooguit vijf
 * per hoofdstuk passen alle bestemmingen tegelijk in beeld, en dan is een
 * klapknop een klik die niets oplevert. Ingeklapt (64px) blijft alleen het
 * icoon van het hoofdstuk over, en dat linkt naar zijn eerste bestemming.
 *
 * ── ALLEEN DE KOP DRAAGT EEN ICOON ──────────────────────────────────────────
 *
 * De koppen droegen de tekens ◉ ▣ ▲ ◆ ⚙ ◈, die op elk apparaat een andere vorm
 * hadden. Sinds 21 augustus 2026 komen ze uit `lib/icons.ts`, op 18 pixels.
 *
 * ⚠️ **De bestemmingen eronder krijgen er geen**, en dat is een besluit van
 * later diezelfde dag. Ze hebben ze een halve dag wél gehad, en dat zag er
 * netjes uit maar werkte averechts: zestien tekeningen in een balk van zestien
 * regels markeren niets meer. Het icoon van de kop moet het verschil maken
 * tussen "dit is een van de zeven vaste plekken" en "dit is een pagina daarbinnen",
 * en dat verschil verdwijnt zodra beide er een dragen. De bestemming staat al
 * ingesprongen achter een lijn; dat zegt genoeg.
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
  sales = false,
  onMobileClose,
}: {
  activeBrand: BrandOption | null;
  /** Beheerder? Dan staan de Admin-bestemmingen erbij. */
  staff?: boolean;
  /** Salesmedewerker? Dan staat de Sales-sectie erbij (plan §4.1). */
  sales?: boolean;
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

  // Merk- en app-bestemmingen gaan door dezelfde groepering heen, zodat
  // Instellingen en Admin op hun eigen plek in de volgorde landen en niet in
  // een tweede lijst eronder.
  // Sales hangt niet aan een merk (een prospect ís nog geen merk), dus die
  // groep staat er ook als er geen merk gekozen is.
  const alles = [
    ...(activeBrand ? brandNav(activeBrand.id, staff) : []),
    ...generalNav(staff),
    ...salesNav(sales),
  ];
  const koppen = hoofdstukken(alles);

  // De breedte zit hier en niet op de <aside>: het inklappen is clientstate en
  // die woont in dit component. Vaste breedtes, want een zijbalk die meegroeit
  // met de langste merknaam laat de hele pagina verspringen zodra je wisselt.
  const breedte = mobiel ? "w-full" : smal ? "w-16" : "w-60";

  return (
    <div className={`flex h-full flex-col gap-1 p-3 transition-[width] duration-200 ${breedte}`}>
      {!smal && activeBrand && (
        <span className="mono-label truncate px-3 pb-1 pt-2">{activeBrand.name}</span>
      )}

      {koppen.map((kop, i) => (
        <Hoofdstuk
          key={kop.naam}
          kop={kop}
          pathname={pathname}
          smal={smal}
          // De Admin-groep staat onder een scheidingslijn. Niet omdat het
          // geheim is, maar omdat het een ander soort werk is: wat de klant
          // nooit ziet, staat visueel apart van wat je met hem deelt.
          scheiding={Boolean(kop.afgeschermd) && i > 0}
          onClick={onMobileClose}
        />
      ))}

      {!mobiel && (
        <button
          type="button"
          onClick={klapOm}
          className="mono-label mt-auto flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left transition-colors hover:bg-[var(--bg-elevated)]"
          aria-label={ingeklapt ? "Zijbalk uitklappen" : "Zijbalk inklappen"}
        >
          <Icon naam={ingeklapt ? "uitklappen" : "inklappen"} />
          {!ingeklapt && "Inklappen"}
        </button>
      )}
    </div>
  );
}

/**
 * Eén hoofdstuk: een kop met zijn bestemmingen eronder.
 *
 * De kop is geen link. Een kop die zowel navigeert als groepeert doet twee
 * dingen op één klik, en het is niet te zien welke van de twee er gebeurt
 * vóórdat je klikt. Dat is op 14 augustus 2026 al eens rechtgezet en die regel
 * blijft staan.
 */
function Hoofdstuk({
  kop,
  pathname,
  smal,
  scheiding,
  onClick,
}: {
  kop: NavHoofdstuk;
  pathname: string;
  smal: boolean;
  scheiding: boolean;
  onClick?: () => void;
}) {
  const actief = kop.items.some((i) => isExact(pathname, i.href));

  // Ingeklapt is er geen ruimte voor kinderen. Dan blijft het teken van het
  // hoofdstuk over, en dat gaat naar de eerste bestemming eronder: een teken
  // waar je niet op kunt klikken is een teken zonder functie.
  if (smal) {
    return (
      <>
        {scheiding && <div className="my-2 border-t border-[var(--border-subtle)]" />}
        <Link
          href={kop.items[0].href}
          onClick={onClick}
          title={kop.naam}
          aria-current={actief ? "page" : undefined}
          className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors"
          style={{
            color: actief ? "var(--text-primary)" : "var(--text-secondary)",
            background: actief ? "var(--bg-elevated)" : "transparent",
          }}
        >
          <Icon naam={kop.icoon} size={18} />
        </Link>
      </>
    );
  }

  return (
    <>
      {scheiding && <div className="my-2 border-t border-[var(--border-subtle)]" />}
      <div className="flex flex-col gap-0.5">
        <span
          className="flex items-center gap-3 px-3 pb-0.5 pt-2 text-left text-sm font-medium"
          style={{ color: actief ? "var(--text-primary)" : "var(--text-secondary)" }}
        >
          <Icon naam={kop.icoon} size={18} />
          <span className="min-w-0 flex-1 truncate">{kop.naam}</span>
        </span>
        <div className="ml-4 flex flex-col gap-0.5 border-l border-[var(--border-subtle)] pl-2">
          {kop.items.map((item) => (
            <Item
              key={item.href}
              item={item}
              active={isExact(pathname, item.href)}
              onClick={onClick}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function Item({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
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
