"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import {
  brandNav,
  generalNav,
  hoofdstukken,
  navActief,
  salesNav,
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
 * tussen "dit is een van de vaste plekken" en "dit is een pagina daarbinnen",
 * en dat verschil verdwijnt zodra beide er een dragen.
 *
 * Hoeveel koppen je ziet hangt af van wie je bent: een klant vier, Outer Orbit
 * daar Admin bovenop, en wie de salesrol heeft ook Sales. Sales is de enige kop
 * die aan een rol hangt en niet aan een merk (plan §4.1).
 *
 * ── DE VORMGEVING VAN 24 AUGUSTUS 2026 ──────────────────────────────────────
 *
 * De balk had vijf koppen en zestien regels in vrijwel één en dezelfde opmaak:
 * kop en bestemming allebei `text-sm`, allebei grijs, allebei 400 tot 500 in
 * gewicht, en het enige wat een kop van een regel scheidde was een verticale
 * lijn van 1 pixel links van de kinderen. Vijf verschillen zetten die hiërarchie
 * nu neer, en elk verschil doet één ding:
 *
 * 1. **De kop is zwaarder en donkerder** (15px, gewicht 600, `--text-primary`).
 *    Zes ankers die je in één oogopslag terugvindt, in plaats van zestien regels
 *    die om beurten oplichten. De kop verandert niet meer van kleur als je op
 *    een pagina eronder staat: dat markeerde één van de zes koppen, terwijl de
 *    actieve regel het al zegt, en twee markeringen voor één plek is er een.
 * 2. **Het icoon van de kop draagt de kleur van de tekst ernaast.** Het was
 *    paars; sinds 24 augustus 2026 niet meer, om dezelfde reden als bij de
 *    actieve regel hieronder. Zes paarse tekeningen naast élk scherm maken van
 *    paars de kleur van de zijbalk in plaats van de kleur van "hier doet de AI
 *    iets" (`docs/designsystem.md` §8).
 * 3. **De verticale lijn onder de kop is weg.** Hij moest het kindschap dragen,
 *    maar de bestemmingen staan al ingesprongen tot ónder de koptekst en dat
 *    zegt hetzelfde zonder een lijn die dwars door de actieve regel loopt.
 * 4. **De actieve regel is een neutraal vlak met gewone tekstkleur**, dus wit
 *    in de donkere stand. Hij is paars geweest, en het argument daarvoor was
 *    dat grijs op wit te weinig opviel. Dat argument gold in de lichte stand en
 *    het is opgelost door het vlak één stap donkerder te nemen
 *    (`--bg-elevated`) én de tekst mee te laten oplopen naar `--text-primary`:
 *    de regel valt nu op aan zijn contrast met de regels eromheen, niet aan een
 *    kleur. Het waarom van het weghalen van dat paars staat bij `Item`
 *    verderop, met de contrastmeting erbij.
 * 5. **De marges zijn ruimer**: 20px tussen twee hoofdstukken en 36px per regel
 *    in plaats van 30px. Zestien regels op elkaar lezen als een lijst, zes
 *    groepjes met lucht ertussen lezen als een indeling.
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
  openVragen = 0,
  onMobileClose,
}: {
  activeBrand: BrandOption | null;
  /** Beheerder? Dan staan de Admin-bestemmingen erbij. */
  staff?: boolean;
  /** Salesmedewerker? Dan staat de Sales-sectie erbij (plan §4.1). */
  sales?: boolean;
  /**
   * Hoeveel vragen er op de klant wachten. Zet het groene bolletje achter
   * "Openstaande vragen" aan. Bewust zonder getal: dat staat al in de
   * bovenbalk, en twee keer hetzelfde cijfer op één scherm laat de lezer zoeken
   * welke van de twee de echte is (`docs/ux-design.md` §1).
   */
  openVragen?: number;
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
  // De breedtes staan als token in globals.css (`--sidebar-w` en
  // `--sidebar-w-collapsed`), want de bovenbalk en de mobiele lade rekenen er
  // ook mee. Ingeklapt van 64 naar 56: een pictogramknop is 40 pixels plus 8
  // lucht aan weerszijden, en 64 liet daar een lege rand omheen staan.
  const breedte = mobiel ? "w-full" : smal ? "sidebar sidebar-smal" : "sidebar";

  return (
    <div className={mobiel ? "flex h-full w-full flex-col p-2" : `flex flex-col ${breedte}`}>
      {!smal && activeBrand && (
        <span className="mono-label truncate px-3 pb-2 pt-2">{activeBrand.name}</span>
      )}

      {koppen.map((kop, i) => (
        <Hoofdstuk
          key={kop.naam}
          kop={kop}
          pathname={pathname}
          smal={smal}
          openVragen={openVragen}
          // Het eerste hoofdstuk krijgt geen extra ruimte erboven: de balk zelf
          // heeft al padding, en anders zakt de hele lijst zichtbaar weg onder
          // de bovenbalk.
          eerste={i === 0}
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
          className="nav-kop mt-auto transition-colors hover:text-[var(--text-primary)]"
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
  eerste,
  scheiding,
  openVragen,
  onClick,
}: {
  kop: NavHoofdstuk;
  pathname: string;
  smal: boolean;
  openVragen: number;
  eerste: boolean;
  scheiding: boolean;
  onClick?: () => void;
}) {
  const actief = kop.items.some((i) => navActief(pathname, i));

  // Ingeklapt is er geen ruimte voor kinderen. Dan blijft het teken van het
  // hoofdstuk over, en dat gaat naar de eerste bestemming eronder: een teken
  // waar je niet op kunt klikken is een teken zonder functie.
  if (smal) {
    return (
      <>
        {scheiding && <div className="my-2 border-t border-[var(--line-muted)]" />}
        <Link
          href={kop.items[0].href}
          onClick={onClick}
          title={kop.naam}
          aria-current={actief ? "page" : undefined}
          // Het icoon draagt de tekstkleur, ook ingeklapt: het is dan het enige
          // wat er van de zes ankers overblijft, en dan moet het leesbaar zijn
          // en niet opvallend. De actieve staat zit in het vlak eronder, niet in
          // de tint van de tekening.
          // Neutraal in plaats van paars, zelfde ronde en zelfde reden als bij
          // `Item` verderop.
          // Ingeklapt is dit de hele navigatie, dus het aanraakvlak is 40 en
          // niet 32: `.icon-btn-lg`. De actieve staat is hier wél een vlak en
          // geen streep links, want een streep van twee pixels naast een balk
          // van 56 is niet te zien.
          className={`icon-btn icon-btn-lg mx-auto ${
            actief ? "bg-[var(--interactive-hover)] text-[var(--text-primary)]" : ""
          }`}
        >
          <Icon naam={kop.icoon} size={18} />
        </Link>
      </>
    );
  }

  return (
    <>
      {scheiding && <div className="mb-1 mt-4 border-t border-[var(--line-muted)]" />}
      <div className={`flex flex-col ${eerste || scheiding ? "" : "mt-4"}`}>
        {/* ── DE KOP IS LICHTER GEWORDEN DAN ZIJN KINDEREN (17 SEPTEMBER 2026)
            Hij stond op 15 pixels, gewicht 600, in `--text-primary`, dus
            zwaarder dan de bestemmingen eronder. Dat is precies omgekeerd aan
            wat het zou moeten zeggen: de kop wijst een vaste plek in de app
            aan, de bestemmingen zijn de inhoud. Bij OKX is zo'n kop klein en
            gedempt. De vorm staat in `.nav-kop` in globals.css.

            De kleur staat op de ouder en niet op het icoon zelf: `Icon` erft
            altijd `currentColor` (`components/icon.tsx`), en die regel blijft
            staan zodat een tekening nooit zijn eigen tint meebrengt. */}
        <span className="nav-kop">
          <Icon naam={kop.icoon} size={16} />
          <span className="min-w-0 flex-1 truncate">{kop.naam}</span>
        </span>
        {/* 24 pixels inspringen is niet willekeurig: dat is precies de breedte
            van het icoon (16) plus de tussenruimte (8), waardoor de tekst van
            een bestemming exact onder de tekst van zijn kop uitkomt. De
            uitlijning draagt het kindschap, en daarmee is de verticale lijn die
            hier tot 24 augustus 2026 stond overbodig.

            ⚠️ Was 28 toen het icoon nog 18 was en de tussenruimte 10. Wijzig je
            een van die twee, dan moet dit getal mee. */}
        <div className="flex flex-col pl-6">
          {kop.items.map((item) => (
            <Item
              key={item.href}
              item={item}
              active={navActief(pathname, item)}
              // Alleen de vragenpagina draagt een bolletje. Een tweede
              // markering in deze balk maakt van "hier wacht iets" opnieuw een
              // versiering, en dat is precies waarom de iconen bij de
              // bestemmingen op 21 augustus 2026 verdwenen zijn.
              wacht={item.href.endsWith("/strategie/vragen") && openVragen > 0}
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
  wacht = false,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  /** Wacht hier werk op de klant? Dan een groen bolletje achter de tekst. */
  wacht?: boolean;
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
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate">{item.label}</span>
        {/* ⚠️ Achter de tekst en niet ervoor: ervoor duwt het label uit de
            uitlijning met de regels eronder, en dan lijkt de balk scheef zodra
            het bolletje verschijnt of verdwijnt. */}
        {wacht && (
          <>
            <span className="vraag-dot" aria-hidden />
            {/* Kleur alleen is nooit de drager van betekenis. De bovenbalk zegt
                het voluit; hier staat het voor wie voorleest. */}
            <span className="sr-only">er wachten vragen op je</span>
          </>
        )}
      </span>
      {item.staffOnly && (
        <span
          // Een stempel en niet los grijs hoofdlettertekst: los in de regel las
          // het als een tweede label bij de bestemming, terwijl het een stempel
          // op die bestemming is. Zelfde vlak als de actieve regel, zodat de
          // balk twee tinten kent en geen vier.
          //
          // Neutraal en niet paars, sinds 24 augustus 2026, om dezelfde reden
          // als de actieve regel hierboven: dit stempel zegt "van jou", niet
          // "hier doet de AI iets". Er stonden er vier onder elkaar, en dat was
          // het eerste wat het oog in de zijbalk raakte.
          //
          // ⚠️ `--radius-lg` en geen pil. Dit was een pil, in dezelfde ronde
          // waarin de chips van de app dat juist óphielden te zijn
          // (`docs/designsystem.md` §5.1). Twee ronde stempels in een app vol
          // vlakken van 6, 8 en 12 pixels zijn geen accent maar een afwijking,
          // en de zijbalk staat naast élk scherm.
          className="chip chip-neutral shrink-0"
          style={{ fontSize: "0.625rem", padding: "0 6px", letterSpacing: "0.04em", textTransform: "uppercase" }}
          title="Alleen zichtbaar voor jou, niet voor de klant"
        >
          alleen jij
        </span>
      )}
    </Link>
  );
}
