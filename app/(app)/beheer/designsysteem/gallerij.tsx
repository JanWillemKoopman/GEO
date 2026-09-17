"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Tabs, Segment } from "@/components/tabs";
import { FilterChip, FilterChipGroep } from "@/components/filterchip";
import { Drawer } from "@/components/drawer";
import { DataCard, DataCardRij } from "@/components/data-card";
import { MobielTabel } from "@/components/mobiel-tabel";
import { Stappenflow } from "@/components/stappenflow";

/**
 * De interactieve helft van de etalage. Alles wat een staat heeft staat hier,
 * de rest staat in `page.tsx`.
 *
 * Bewust één bestand en niet twaalf: dit scherm heeft geen hergebruik nodig, en
 * twaalf bestanden voor twaalf blokken maakt het moeilijker om te zien wat er
 * ontbreekt.
 */
export function Gallerij() {
  const [periode, setPeriode] = useState<"actueel" | "vorige" | "jaar">("actueel");
  const [filters, setFilters] = useState<string[]>(["Actueel"]);
  const [ladeOpen, setLadeOpen] = useState(false);
  const [stap, setStap] = useState(0);

  function wisselFilter(naam: string) {
    setFilters((f) => (f.includes(naam) ? f.filter((x) => x !== naam) : [...f, naam]));
  }

  return (
    <div className="flex flex-col gap-10">
      <Blok titel="Kleur" toelichting="Elke waarde komt uit een token. Wissel van stand om beide kanten te zien.">
        <Rij>
          <Staal token="--bg-base" naam="Pagina" />
          <Staal token="--bg-layer-1" naam="Werkruimte" />
          <Staal token="--bg-surface" naam="Kaart" />
          <Staal token="--bg-surface-raised" naam="Rij bij hover" />
          <Staal token="--bg-layer-2" naam="Chip, tabelkop" />
          <Staal token="--bg-layer-3" naam="Dieper" />
        </Rij>
        <Rij>
          <Staal token="--text-primary" naam="Tekst primair" />
          <Staal token="--text-secondary" naam="Body" />
          <Staal token="--text-tertiary" naam="Label" />
          <Staal token="--text-subtle" naam="Bijzaak" />
          <Staal token="--text-subtler" naam="Randgeval" />
          <Staal token="--text-disabled" naam="Uitgeschakeld" />
        </Rij>
        <Rij>
          <Staal token="--accent" naam="Accent" />
          <Staal token="--accent-highlight" naam="Limoen" />
          <Staal token="--trend-up" naam="Stijging" />
          <Staal token="--trend-down" naam="Daling" />
          <Staal token="--intent-warning-content" naam="Waarschuwing" />
          <Staal token="--intent-danger-content" naam="Fout" />
        </Rij>
        <p className="type-caption text-muted">
          De acht grafiekreeksen. De laatste drie zijn grijs, en dat is het patroon: het eigen merk
          krijgt het accent, de concurrenten die ertoe doen krijgen kleur, de rest wordt grijs.
        </p>
        <Rij>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <Staal key={n} token={`--chart-${n}`} naam={`Reeks ${n}`} />
          ))}
        </Rij>
      </Blok>

      <Blok titel="Typografie" toelichting="Elf stijlen. Vet is gewicht 500, niet 600, en de regelhoogte is anderhalf.">
        <div className="flex flex-col gap-3">
          <p className="type-hero">Hero, 36 op 47,5, gewicht 600</p>
          <p className="type-title">Titel, 24 op 30, gewicht 500</p>
          <p className="type-section">Sectie, 18 op 24, gewicht 500</p>
          <p className="type-lead">Lead, 12 op 15, kapitalen</p>
          <p className="type-body">Body, 16 op 24. Dit is lopende tekst zoals hij in een rapport staat.</p>
          <p className="type-body-emphasis">Body met nadruk, 16 op 24, gewicht 500.</p>
          <p className="type-compact">Compact, 14 op 21. Dit is lopende tekst binnen een kaart.</p>
          <p className="type-compact-emphasis">Compact met nadruk, 14 op 21, gewicht 500.</p>
          <p className="type-caption">Bijschrift, 12 op 18.</p>
          <p className="type-caption-emphasis">Bijschrift met waarde, 12 op 18, gewicht 500.</p>
          <p className="mono-label">Het kleine label, 12 op 15</p>
          <p className="stat-value" style={{ fontSize: "1.5rem" }}>
            1234567890 met tabulaire cijfers
          </p>
        </div>
      </Blok>

      <Blok titel="Vorm" toelichting="Zeven treden. Er is niets ronder dan 12 pixels behalve de pil van 60.">
        <Rij>
          {[
            ["sm", "2px"],
            ["md", "4px"],
            ["lg", "6px"],
            ["xl", "8px"],
            ["xxl", "10px"],
            ["xxxl", "12px"],
            ["pill", "60px"],
          ].map(([naam, waarde]) => (
            <div key={naam} className="flex flex-col items-center gap-1.5">
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: `var(--radius-${naam})`,
                  background: "var(--bg-layer-2)",
                  border: "1px solid var(--border-primary)",
                }}
              />
              <span className="type-caption text-muted">
                {naam} {waarde}
              </span>
            </div>
          ))}
        </Rij>
      </Blok>

      <Blok titel="Knoppen" toelichting="Vijf varianten maal vier maten maal vijf staten. De focusring is wit of zwart, nooit gekleurd.">
        <div className="flex flex-col gap-4">
          {(["btn-primary", "btn-accent", "btn-outline", "btn-ghost", "btn-danger"] as const).map(
            (variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-2">
                <span className="mono-label" style={{ minWidth: 110 }}>
                  {variant.replace("btn-", "")}
                </span>
                <button type="button" className={variant}>
                  Rust
                </button>
                <button type="button" className={`${variant} btn-sm`}>
                  Klein
                </button>
                <button type="button" className={`${variant} btn-xs`}>
                  Extra klein
                </button>
                <button type="button" className={`${variant} btn-lg`}>
                  Groot
                </button>
                <button type="button" className={variant} disabled>
                  Uit
                </button>
                <button type="button" className={`${variant} btn-rect`}>
                  Rechthoekig
                </button>
                <button type="button" className={`${variant} btn-icon`} aria-label="Alleen pictogram">
                  <Icon naam="opnieuw" size={18} />
                </button>
              </div>
            ),
          )}
        </div>
      </Blok>

      <Blok titel="Chips" toelichting="Vier pixels rond, gewicht 500. De kale chip is neutraal, kleur is altijd een keuze.">
        <div className="flex flex-wrap gap-2">
          <span className="chip">Neutraal</span>
          <span className="chip chip-success">Gelukt</span>
          <span className="chip chip-warning">Let op</span>
          <span className="chip chip-danger">Mislukt</span>
          <span className="chip chip-info">Informatie</span>
          <span className="chip chip-attention">Kans</span>
          <span className="chip chip-outline">Omlijnd</span>
          <span className="chip chip-success">
            <Icon naam="klaar" size={12} />
            Met pictogram
          </span>
        </div>
      </Blok>

      <Blok titel="Velden" toelichting="Veertig pixels, even hoog als de knop ernaast. De focus is een ring en geen gloed.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="mono-label">Rust</span>
            <input className="field" placeholder="Typ hier iets" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="mono-label">Met waarde</span>
            <input className="field" defaultValue="Gasservice Brabant" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="mono-label">Fout</span>
            <input className="field field-error" defaultValue="geen-geldig-adres" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="mono-label">Uitgeschakeld</span>
            <input className="field" defaultValue="Niet te wijzigen" disabled />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="mono-label">Tekstvak</span>
            <textarea className="field" defaultValue="Een langere toelichting die over meerdere regels loopt." />
          </label>
        </div>
      </Blok>

      <Blok titel="Kaarten" toelichting="Vlak, één rand, geen schaduw. De diepte komt van de kleur tegenover de grond.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card">
            <p className="type-compact-emphasis">Gewone kaart</p>
            <p className="type-caption text-muted">8 pixels rond, padding groeit met het scherm.</p>
          </div>
          <div className="card card-interactive">
            <p className="type-compact-emphasis">Klikbaar</p>
            <p className="type-caption text-muted">Wijs hem aan. Er beweegt niets, alleen de kleur verandert.</p>
          </div>
          <div className="card card-rail-success">
            <p className="type-compact-emphasis">Met stang</p>
            <p className="type-caption text-muted">Twee pixels links, in de richtingkleur.</p>
          </div>
          <div className="card card-danger">
            <p className="type-compact-emphasis">Met accentrand</p>
            <p className="type-caption text-muted">De hele rand draagt de betekenis.</p>
          </div>
        </div>
      </Blok>

      <Blok titel="Datakaarten" toelichting="De hiërarchie komt van de maat en niet van het gewicht. Onbekend is een eigen staat, geen nul.">
        <DataCardRij>
          <DataCard
            label="Zichtbaarheid in AI"
            waarde="34%"
            verschil={{ tekst: "+6 punten", richting: "omhoog" }}
            toelichting="Je wordt in een op de drie antwoorden genoemd."
          />
          <DataCard
            label="Positie tegenover concurrenten"
            waarde="3e van 7"
            verschil={{ tekst: "-1 plaats", richting: "omlaag" }}
          />
          <DataCard label="Clusters in het plan" waarde="12" verschil={{ tekst: "gelijk", richting: "vlak" }} />
          <DataCard label="Reputatie" waarde={null} />
        </DataCardRij>
      </Blok>

      <Blok titel="Tabbladen en segment" toelichting="Een tab zegt waar je bent, een segment zegt hoe je kijkt. Daarom zijn het twee componenten.">
        <Tabs
          label="Voorbeeld"
          items={[
            { label: "Overzicht", href: "#overzicht", actief: true },
            { label: "Concurrenten", href: "#concurrenten", actief: false, aantal: 7 },
            { label: "Reputatie", href: "#reputatie", actief: false },
            { label: "Zoekverkeer", href: "#zoekverkeer", actief: false },
          ]}
        />
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Segment
            label="Periode"
            gekozen={periode}
            onKies={setPeriode}
            opties={[
              { waarde: "actueel", label: "Actueel" },
              { waarde: "vorige", label: "Vorige ronde" },
              { waarde: "jaar", label: "Dit jaar" },
            ]}
          />
          <span className="type-caption text-muted">Gekozen: {periode}</span>
        </div>
      </Blok>

      <Blok titel="Filterchips" toelichting="Gekozen is een rand en geen vulling. Zo blijft een balk met twaalf chips rustig.">
        <FilterChipGroep label="Voorbeeldfilters">
          {["Actueel", "Met kansen", "Zonder label", "Geschreven", "Wacht op de klant"].map((naam) => (
            <FilterChip
              key={naam}
              label={naam}
              gekozen={filters.includes(naam)}
              onKies={() => wisselFilter(naam)}
              aantal={naam === "Met kansen" ? 7 : undefined}
            />
          ))}
          <FilterChip label="Uitgeschakeld" gekozen={false} onKies={() => {}} uitgeschakeld />
        </FilterChipGroep>
      </Blok>

      <Blok titel="Lade" toelichting="Een rij openen mag je je plek in de lijst niet kosten. Onder 768 pixels wordt hij een blad van onderen.">
        <button type="button" className="btn-outline" onClick={() => setLadeOpen(true)}>
          Open de lade
        </button>
        <Drawer
          open={ladeOpen}
          titel="Wat kost een cv-ketel vervangen"
          onderschrift="Cluster: onderhoud en vervanging"
          onSluit={() => setLadeOpen(false)}
          voet={
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setLadeOpen(false)}>
                Sluiten
              </button>
              <button type="button" className="btn-primary">
                Naar het cluster
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="type-compact text-secondary">
              Hier staat de verdieping bij één rij. Hij scrolt zelf, en de pagina eronder staat stil
              zolang hij open is.
            </p>
            <DataCard label="Genoemd in" waarde="4 van 12 antwoorden" />
            <p className="type-compact text-secondary">
              Druk op Escape of klik ernaast om hem te sluiten.
            </p>
          </div>
        </Drawer>
      </Blok>

      <Blok
        titel="Mobiele tabel"
        toelichting="Twee kolommen van 50%, elk met twee waarden gestapeld: het patroon dat op een telefoon een tabel met tot zeven kolommen vervangt. Geen mediaquery-variant van de gewone tabel maar een eigen component (stap 7)."
      >
        <div
          className="mx-auto overflow-hidden rounded-[var(--radius-xxxl)] border border-[var(--border-primary)]"
          style={{ maxWidth: 375, padding: "0 4px" }}
        >
          <MobielTabel
            rijen={[
              {
                id: "1",
                hoofdwaarde: "Wat kost een cv-ketel vervangen",
                bijschrift: "Onderhoud en vervanging",
                kerncijfer: "34%",
                verandering: { tekst: "+6 punten", richting: "omhoog" },
              },
              {
                id: "2",
                hoofdwaarde: "Beste merk voor zonnepanelen",
                bijschrift: "Duurzame energie",
                kerncijfer: "3e van 7",
                verandering: { tekst: "-1 plaats", richting: "omlaag" },
              },
              {
                id: "3",
                hoofdwaarde: "Airco laten plaatsen kosten",
                bijschrift: "Nieuw dit kwartaal",
                kerncijfer: "12",
                verandering: { tekst: "gelijk", richting: "vlak" },
              },
            ]}
            onRijKlik={() => {}}
          />
        </div>
        <p className="type-caption text-muted">
          Een tik opent het detailblad: dat is `Drawer` hierboven, er komt geen apart component bij.
        </p>
      </Blok>

      <Blok
        titel="Stappenflow"
        toelichting="Eén sectie per scherm in plaats van alle secties onder elkaar: de mobiele vorm van een lang beheerformulier (stap 7). De knoppenbalk is net als ConfirmBar `fixed` aan de onderkant van het VENSTER, niet van deze kaart: scroll naar beneden om hem te zien."
      >
        <Stappenflow
          stappen={[
            {
              titel: "Basisgegevens",
              content: (
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="mono-label">Merknaam</span>
                    <input className="field" defaultValue="Gasservice Brabant" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="mono-label">Website</span>
                    <input className="field" defaultValue="https://gasservicebrabant.nl" />
                  </label>
                </div>
              ),
            },
            {
              titel: "Doelgroep",
              content: (
                <label className="flex flex-col gap-1.5">
                  <span className="mono-label">Voor wie werkt dit merk</span>
                  <textarea className="field" defaultValue="Particulieren in Noord-Brabant met een cv-ketel ouder dan tien jaar." />
                </label>
              ),
            },
            {
              titel: "Bevestigen",
              content: (
                <p className="type-compact text-secondary">
                  Controleer de twee vorige stappen en druk op Opslaan. Er komt geen derde stap meer.
                </p>
              ),
            },
          ]}
          huidige={stap}
          onVorige={() => setStap((s) => Math.max(0, s - 1))}
          onVolgende={() => setStap((s) => Math.min(2, s + 1))}
          onOpslaan={() => setStap(0)}
        />
      </Blok>

      <Blok titel="Wachten" toelichting="Een skeleton zegt waar de inhoud komt, een spinner alleen dat er gewacht wordt.">
        <div className="card flex flex-col gap-3">
          <div className="skeleton" style={{ height: 24, width: "40%" }} />
          <div className="skeleton" style={{ height: 14, width: "100%" }} />
          <div className="skeleton" style={{ height: 14, width: "85%" }} />
          <div className="skeleton" style={{ height: 14, width: "60%" }} />
        </div>
      </Blok>
    </div>
  );
}

function Blok({
  titel,
  toelichting,
  children,
}: {
  titel: string;
  toelichting: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-b border-[var(--line-muted)] pb-2">
        <h2 className="type-section">{titel}</h2>
        <p className="type-caption text-muted">{toelichting}</p>
      </div>
      {children}
    </section>
  );
}

function Rij({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}

/**
 * Eén kleurstaal. De waarde staat er niet bij: die verandert per stand, en een
 * bijschrift dat in de ene stand liegt is erger dan geen bijschrift. De
 * tokennaam is wat je nodig hebt om hem terug te vinden.
 */
function Staal({ token, naam }: { token: string; naam: string }) {
  return (
    <div className="flex flex-col gap-1.5" style={{ width: 104 }}>
      <div
        style={{
          height: 48,
          borderRadius: "var(--radius-md)",
          background: `var(${token})`,
          border: "1px solid var(--border-primary)",
        }}
      />
      <span className="type-caption" style={{ color: "var(--text-primary)" }}>
        {naam}
      </span>
      <code className="type-caption text-muted break-url" style={{ fontSize: "0.6875rem" }}>
        {token}
      </code>
    </div>
  );
}
