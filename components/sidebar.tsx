"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandSwitcher } from "@/components/brand-switcher";
import { Icon } from "@/components/icon";
import {
  brandNav,
  generalNav,
  hoofdstukken,
  navActief,
  type NavHoofdstuk,
  type NavItem,
} from "@/lib/nav";
import type { BrandOption } from "@/lib/workspace";

/**
 * De zijbalk van de werkruimte.
 *
 * ── DE OPZET VAN 29 SEPTEMBER 2026 ──────────────────────────────────────────
 *
 * De balk loopt van de bovenrand tot de onderrand van het scherm; de bovenbalk
 * staat rechts ernaast (`components/workspace-chrome.tsx`). Van boven naar
 * beneden:
 *
 * 1. het woordmerk (dun en ruim gespatieerd, `.brand-logo`),
 * 2. de merkkiezer, alleen bij twee of meer merken (`BrandSwitcher`),
 * 3. het menu: kleine koppen zonder icoon, de bestemmingen eronder met een
 *    icoon, en
 * 4. onderaan het profiel met zijn uitklapmenu (`ProfileMenu`).
 *
 * De inklapknop en de ingeklapte stand (56px, `localStorage`) zijn weg: de
 * eigenaar wil één vaste balk. Daarmee vervalt ook het bewaarde
 * `orbit_engine_zijbalk_ingeklapt` in de browser van wie hem ooit gebruikte; het
 * wordt niet meer gelezen en doet niets.
 *
 * ── WAAROM EEN ZIJBALK EN GEEN BOVENBALK ────────────────────────────────────
 *
 * De bovenbalk had twee bestemmingen en paste prima. Maar besluit 1 maakt van de
 * app een merk-werkruimte, en dan komen er twee soorten navigatie naast elkaar
 * te staan: wat gaat over dít merk, en wat gaat over de app als geheel. Dat
 * onderscheid is horizontaal niet te maken zonder scheidingstekens die niets
 * betekenen. Verticaal is het één tussenkopje.
 *
 * ── KOPPEN MET EEN GRENS PER KOP ────────────────────────────────────────────
 *
 * De balk groepeert een platte lijst bestemmingen op hun hoofdstuk
 * (`lib/nav.ts`), in een vaste volgorde, met een grens per kop die in
 * `GRENS_PER_HOOFDSTUK` staat. Een hoofdstuk zonder bestemmingen wordt niet
 * getoond. Alles staat open: met hooguit vier per hoofdstuk passen alle
 * bestemmingen tegelijk in beeld. Hoeveel koppen je ziet hangt af van wie je
 * bent: een klant vier, Outer Orbit daar Admin bovenop.
 *
 * ── ICONEN ──────────────────────────────────────────────────────────────────
 *
 * Sinds 29 september 2026 draagt elke bestemming een icoon en de kop niet. De
 * geschiedenis (en waarom het tot dan andersom was) staat bij `NavItem.icoon`
 * in `lib/nav.ts`.
 *
 * ── DE ACTIEVE REGEL ────────────────────────────────────────────────────────
 *
 * Een neutrale waas met gewone tekstkleur, geen paars en geen gevuld blok: paars
 * betekent in dit systeem "hier doet de AI iets" (`docs/designsystem.md` §8), en
 * een gevuld blok leest in een lange kolom als een knop. De vorm staat in
 * `.nav-item` in globals.css en grijpt aan op `aria-current`: één bron voor de
 * staat.
 */
export function Sidebar({
  activeBrand,
  brands,
  onSelectBrand,
  logo,
  profiel,
  staff = false,
  onMobileClose,
}: {
  activeBrand: BrandOption | null;
  brands: BrandOption[];
  onSelectBrand: (brandId: string) => void;
  /** Het woordmerk bovenaan. Leeg in de mobiele lade: daar staat het al in de balk. */
  logo?: React.ReactNode;
  /** Het profiel met zijn menu, vastgezet onderaan. */
  profiel: React.ReactNode;
  /** Beheerder? Dan staan de Admin-bestemmingen erbij. */
  staff?: boolean;
  /** Alleen gezet in de mobiele lade: dan sluit een klik het menu. */
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();

  // Merk- en app-bestemmingen gaan door dezelfde groepering heen, zodat
  // Instellingen en Admin op hun eigen plek in de volgorde landen en niet in
  // een tweede lijst eronder.
  const alles = [
    ...(activeBrand ? brandNav(activeBrand.id, staff) : []),
    ...generalNav(staff),
  ];
  const koppen = hoofdstukken(alles);

  // Vaste breedte (`--sidebar-w`): een zijbalk die meegroeit met de langste
  // merknaam laat de hele pagina verspringen zodra je wisselt. In de lade vult
  // hij de lade.
  return (
    <div className={onMobileClose ? "flex h-full w-full flex-col" : "sidebar"}>
      <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
        {logo}
        <BrandSwitcher
          brands={brands}
          active={activeBrand}
          onSelect={(id) => {
            onSelectBrand(id);
            onMobileClose?.();
          }}
        />
      </div>

      {/* Alleen het menu scrolt, zodat het profiel onderaan blijft staan. */}
      <nav aria-label="Hoofdmenu" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2">
        {koppen.map((kop, i) => (
          <Hoofdstuk
            key={kop.naam}
            kop={kop}
            pathname={pathname}
            // Het eerste hoofdstuk krijgt geen extra ruimte erboven: de balk zelf
            // heeft al padding.
            eerste={i === 0}
            // De Admin-groep staat onder een scheidingslijn. Niet omdat het
            // geheim is, maar omdat het een ander soort werk is: wat de klant
            // nooit ziet, staat visueel apart van wat je met hem deelt.
            scheiding={Boolean(kop.afgeschermd) && i > 0}
            onClick={onMobileClose}
          />
        ))}
      </nav>

      <div className="border-t border-[var(--line-muted)] p-2">{profiel}</div>
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
  eerste,
  scheiding,
  onClick,
}: {
  kop: NavHoofdstuk;
  pathname: string;
  eerste: boolean;
  scheiding: boolean;
  onClick?: () => void;
}) {
  // ── EEN HOOFDSTUK MET ÉÉN BESTEMMING IS ÉÉN REGEL (UX-AUDIT P2.6) ────────
  //
  // Overzicht ("Hoe sta je ervoor") heeft er maar één. Een kop met één kind
  // eronder is twee regels lezen voor één klik, en de kop zelf is geen link.
  // Nu is het één regel zonder kop.
  // Merkdossier is de uitzondering (30 september 2026): het is een kop met
  // "Mijn bedrijf" eronder, net als Clusters, Strategie en Analytics, zodat er
  // later dossieronderdelen bij kunnen zonder dat de balk van vorm verandert.
  if (kop.items.length === 1 && !kop.afgeschermd && kop.naam !== "Merkdossier") {
    return (
      <div className={eerste ? "" : "mt-4"}>
        <Item item={kop.items[0]} active={navActief(pathname, kop.items[0])} onClick={onClick} />
      </div>
    );
  }

  return (
    <>
      {scheiding && <div className="mb-1 mt-4 border-t border-[var(--line-muted)]" />}
      <div className={`flex flex-col ${eerste || scheiding ? "" : "mt-4"}`}>
        {/* ── DE KOP IS LICHTER DAN ZIJN KINDEREN (17 SEPTEMBER 2026)
            Klein en gedempt: de kop wijst een vaste plek in de app aan, de
            bestemmingen zijn de inhoud. Zonder icoon sinds 29 september 2026.
            De vorm staat in `.nav-kop` in globals.css. */}
        <span className="nav-kop">
          <span className="min-w-0 flex-1 truncate">{kop.naam}</span>
          {/* Eén stempel per afgeschermd hoofdstuk en niet bij elke regel (UX-audit
              P2.6): veertien keer "alleen jij" onder elkaar markeerde niets meer. */}
          {kop.afgeschermd && (
            <span
              className="chip chip-outline shrink-0 normal-case tracking-normal"
              title="Alleen zichtbaar voor jou, niet voor de klant"
            >
              alleen jij
            </span>
          )}
        </span>
        {/* Niet meer ingesprongen: de icoontjes staan op één lijn en de kop
            erboven begint op dezelfde lijn (dezelfde 12 pixels opzij). */}
        <div className="flex flex-col">
          {kop.items.map((item) => (
            <Item
              key={item.href}
              item={item}
              active={navActief(pathname, item)}
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
      // Klassen en geen inline `style`: een inline achtergrond wint het van elke
      // klasse, en dan doet een `hover:`-regel niets meer.
      //
      // ── WAAROM DE ACTIEVE REGEL NIET MEER PAARS IS (24 augustus 2026) ──────
      //
      // Hij droeg een paars vlak met paarse tekst erop. Twee bezwaren, en het
      // tweede is het zwaarste:
      //
      // 1. In de donkere stand kwam dat vlak op #42006d uit met letters van
      //    #ad45ff erop. Dat is 2,6:1, onder de 4,5 die leesbare tekst vraagt,
      //    en het was de felste kleur op een verder rustig scherm.
      // 2. Paars betekende in dat systeem "hier doet de AI iets". Zolang de
      //    zijbalk het naast élk scherm voor "je bent hier" gebruikt, betekent
      //    het dat niet meer.
      //
      // ── EN SINDS 17 SEPTEMBER 2026 IS HET GEEN VLAK MEER ──────────────────
      //
      // Het neutrale vlak dat daarvoor in de plaats kwam bleef één ding doen
      // wat het niet moest doen: in een kolom van twintig bestemmingen leest
      // een gevuld blok als een knop en niet als "je bent hier". Nu is het een
      // lichte waas plus een streep van twee pixels links, en dat is hetzelfde
      // patroon als bij de gekozen filterchip en de gekozen regel in een menu:
      // de staat is een rand of een streep, nooit een kleurvlak. De vorm staat
      // in `.nav-item` in globals.css, en hij grijpt aan op `aria-current`
      // hierboven: één bron voor de staat, geen tweede klasse die ermee uit de
      // pas kan lopen.
      className="nav-item"
    >
      {/* ── ⚠️ GEEN BOLLETJE MEER ACHTER "OPENSTAANDE VRAGEN" (29 september
          2026) ─────────────────────────────────────────────────────────────
          Er stond een groen stipje achter die ene bestemming zodra er vragen
          openstonden. Het is er op verzoek van de eigenaar af. Het signaal zelf
          is niet weg: de teller in de bovenbalk (`OpenQuestionsBadge`) noemt het
          aantal voluit, en op mobiel draagt de onderbalk hetzelfde stipje. Die
          twee blijven de plek waar "er wacht iets op je" staat. */}
      <span className="flex min-w-0 items-center gap-2">
        <Icon naam={item.icoon} size={16} />
        <span className="truncate">{item.label}</span>
      </span>
    </Link>
  );
}
