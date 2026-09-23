"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { FaqEditor, type FaqEditItem } from "@/components/faq-editor";
import { SearchPreview } from "@/components/search-preview";
import { CollapsibleSection } from "@/components/collapsible-section";
import { renderMarkdown } from "@/lib/markdown";
import { Icon } from "@/components/icon";

/**
 * Het CANVAS: de tekst als het onderwerp van de pagina, direct bewerkbaar
 * (`docs/tasks/herontwerp-contentpagina.md` §5).
 *
 * ── WAT HIER VERDWIJNT ──────────────────────────────────────────────────────
 *
 * Tot 22 september 2026 stond dezelfde tekst twee keer op het scherm: als
 * opgemaakt artikel op blok 12, en nog eens als tekstvak op blok 18, achter een
 * knop en een drempelscherm. Twee waarheden over dezelfde alinea, en zes
 * blokken scrollen tussen het lezen van een probleem en de plek om het op te
 * lossen.
 *
 * ── WAAROM HET NOG STEEDS MARKDOWN IS ───────────────────────────────────────
 *
 * Geen rijke editor. `lib/markdown.ts` is een eigen renderer die eerst escapet
 * en daarna pas opmaakt, en `content-export.ts` hergebruikt diezelfde `inline()`
 * voor de CMS-export: er is precies één plek die bepaalt hoe `**vet**`
 * eruitkomt. Een tweede maakt het mogelijk dat wat de klant op zijn site plakt
 * afwijkt van wat hij op het scherm zag, en dat is bij tekst die onder zijn
 * naam gepubliceerd wordt het duurste soort verrassing. Zie §8.2 van het plan
 * voor de proef die dat besluit mag omkeren.
 *
 * Wat het canvas wél doet is eruitzien als een document in plaats van als een
 * formulierveld: de leesletter, de maat van lopende tekst, geen kader, en een
 * vlak dat meegroeit zodat er nooit twee schuifbalken over elkaar liggen.
 *
 * ── GESTUURD VAN BUITEN ─────────────────────────────────────────────────────
 *
 * Alle tekststanden wonen in `ContentWerkblad`. Dat is geen stijlkeuze: de
 * balk bovenin moet weten of er iets onopgeslagen is, en de rail ernaast moet
 * weten welke koppen er op dit moment in de tekst staan. Eén eigenaar van die
 * stand voorkomt dat drie zones drie versies van de waarheid bijhouden.
 */
export function ContentCanvas({
  titel,
  tekst,
  metaTitle,
  metaDescription,
  faq,
  onTitel,
  onTekst,
  onMetaTitle,
  onMetaDescription,
  onFaq,
  onEerstePoging,
  drempelGezien,
  previewUrl,
  tekstRef,
  schrijft,
  leesTitel,
}: {
  /** De naam die in de leesweergave als kop staat (`paginaNaam()`). */
  leesTitel?: string;
  titel: string;
  tekst: string;
  metaTitle: string;
  metaDescription: string;
  faq: FaqEditItem[];
  onTitel: (v: string) => void;
  onTekst: (v: string) => void;
  onMetaTitle: (v: string) => void;
  onMetaDescription: (v: string) => void;
  onFaq: (v: FaqEditItem[]) => void;
  /**
   * De eerste keer dat iemand in deze tekst typt. Daar hangt de drempel aan,
   * zie hieronder.
   */
  onEerstePoging: () => void;
  drempelGezien: boolean;
  previewUrl: { url: string; isReal: boolean };
  /** Voor "Ga naar deze sectie" vanuit de rail. */
  tekstRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Loopt er een herschrijving? Dan komt er straks andere tekst overheen. */
  schrijft: boolean;
}) {
  // ── Standaard lezen, niet bewerken (23 september 2026) ─────────────────────
  // De bewerkstand stond voorop, en die toont de brontekst: `##` voor koppen,
  // een tabel als rijen met streepjes, links als `[tekst](url)`. De eigenaar
  // beoordeelde dat als een halffabricaat, en terecht: wie een tekst komt
  // beoordelen, wil hem eerst lezen zoals hij op de site komt.
  const [weergave, setWeergave] = useState<"schrijven" | "opgemaakt">("opgemaakt");

  return (
    <div className="flex flex-col gap-6">
      {/* ── De drempel (punt 13, 16 september 2026) ─────────────────────────
          Stond eerst vóór het openen van de bewerkmodus. Met een canvas dat
          altijd openstaat is er geen "openen" meer, dus hangt hij nu aan de
          eerste toetsaanslag. Wat hij moest voorkomen blijft voorkomen:
          niemand typt hierin zonder het gelezen te hebben. */}
      {!drempelGezien && weergave === "schrijven" && (
        <p className="text-sm text-muted">
          Wat je hier zelf aanpast, controleert ORBIT ENGINE niet opnieuw. Wil je dat de tekst
          opnieuw gekeurd wordt, vraag dan een aanpassing onder de tekst.
        </p>
      )}

      {schrijft && (
        <div className="card card-warning flex items-center gap-2 text-sm">
          <span className="live-dot" />
          ORBIT ENGINE schrijft op dit moment een nieuwe versie van deze pagina. Wat je nu typt komt
          niet in die versie terecht.
        </div>
      )}

      {/* De tekst zelf op een wit vlak (`.card`): de pagina die straks
          gepubliceerd wordt, zichtbaar los van de grijze app eromheen, in
          plaats van dezelfde grijstint als een formulierveld. */}
      <div className="content-canvas-maat">
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-end gap-1 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] p-0.5 w-fit self-end">
            <Knop actief={weergave === "opgemaakt"} onClick={() => setWeergave("opgemaakt")}>
              Lezen
            </Knop>
            <Knop actief={weergave === "schrijven"} onClick={() => setWeergave("schrijven")}>
              Bewerken
            </Knop>
          </div>

          {weergave === "schrijven" ? (
            <>
              <input
                className="canvas-titel type-title"
                value={titel}
                onChange={(e) => {
                  onEerstePoging();
                  onTitel(e.target.value);
                }}
                aria-label="Titel van de pagina"
              />
              <GroeiendVeld
                waarde={tekst}
                onWijzig={(v) => {
                  onEerstePoging();
                  onTekst(v);
                }}
                veldRef={tekstRef}
              />
            </>
          ) : (
            <article className="prose max-w-none">
              <h1>{leesTitel ?? titel}</h1>
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(tekst) }} />
            </article>
          )}
        </div>
      </div>

      <div className="content-canvas-maat">
        <CollapsibleSection title="Titel en zoekresultaat" defaultOpen={false}>
          <div className="flex flex-col gap-4 pb-4">
            <SearchPreview
              title={titel}
              metaTitle={metaTitle}
              metaDescription={metaDescription}
              url={previewUrl.url}
              isReal={previewUrl.isReal}
            />

            <label className="flex flex-col gap-1 text-sm">
              <span className="mono-label" style={{ fontSize: "0.65rem" }}>
                Meta-title ({metaTitle.length}/60)
              </span>
              <input
                className="field"
                value={metaTitle}
                maxLength={70}
                onChange={(e) => {
                  onEerstePoging();
                  onMetaTitle(e.target.value);
                }}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="mono-label" style={{ fontSize: "0.65rem" }}>
                Meta-description ({metaDescription.length}/160)
              </span>
              <textarea
                className="field"
                rows={2}
                value={metaDescription}
                maxLength={200}
                onChange={(e) => {
                  onEerstePoging();
                  onMetaDescription(e.target.value);
                }}
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="mono-label" style={{ fontSize: "0.65rem" }}>
                Veelgestelde vragen
              </span>
              <FaqEditor
                items={faq}
                onChange={(v) => {
                  onEerstePoging();
                  onFaq(v);
                }}
              />
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

function Knop({
  actief,
  onClick,
  children,
}: {
  actief: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actief}
      className="rounded-[calc(var(--radius-xl)-2px)] px-3 py-1 text-sm"
      style={
        actief
          ? {
              background: "var(--intent-intelligence-surface)",
              color: "var(--intent-intelligence-text)",
            }
          : { color: "var(--text-muted)" }
      }
    >
      {children}
    </button>
  );
}

/**
 * Een tekstvlak dat meegroeit met zijn inhoud.
 *
 * ⚠️ Bewust in JavaScript en niet met `field-sizing: content` in CSS: die
 * eigenschap kent nog niet elke browser, en een canvas dat in de ene browser
 * meegroeit en in de andere een schuifbalk van zes regels toont, is precies
 * het soort verschil dat je bij lange tekst niet wilt. `useLayoutEffect` zet de
 * hoogte vóór de browser tekent, zodat er nooit een frame met de verkeerde
 * hoogte in beeld komt.
 */
function GroeiendVeld({
  waarde,
  onWijzig,
  veldRef,
}: {
  waarde: string;
  onWijzig: (v: string) => void;
  veldRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const eigen = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const veld = eigen.current;
    if (!veld) return;
    // Eerst terug naar nul: anders groeit hij alleen maar en krimpt hij nooit
    // als er tekst weggehaald wordt.
    veld.style.height = "auto";
    veld.style.height = `${veld.scrollHeight}px`;
  }, [waarde]);

  return (
    <textarea
      ref={(el) => {
        eigen.current = el;
        veldRef.current = el;
      }}
      className="canvas-veld"
      value={waarde}
      onChange={(e) => onWijzig(e.target.value)}
      aria-label="De tekst van deze pagina, in Markdown"
      spellCheck
    />
  );
}

/**
 * De keuze bij een versie die van buiten binnenkwam (§5.2 van het plan).
 *
 * ── WAAROM DIT GEEN `key` OP HET CANVAS IS ──────────────────────────────────
 *
 * De makkelijke oplossing voor "de server heeft nieuwere tekst" is het canvas
 * opnieuw monteren met een nieuwe `key`. Dat gooit onopgeslagen werk weg zonder
 * het te vragen, en dit scherm maakt die situatie zelf aan: een herschrijving
 * levert een nieuwe versie op terwijl iemand zit te typen. Vandaar een keuze in
 * plaats van een automatisme.
 */
export function NieuweVersieBalk({
  onOvernemen,
  onHouden,
  verschilHref,
}: {
  onOvernemen: () => void;
  onHouden: () => void;
  verschilHref: string | null;
}) {
  return (
    <div className="card card-accent flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon naam="letop" size={16} />
        Er is een nieuwere tekst dan die je voor je hebt.
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {verschilHref && (
          <a href={verschilHref} className="btn-outline btn-sm">
            Bekijk het verschil
          </a>
        )}
        <button type="button" onClick={onOvernemen} className="btn-primary btn-sm">
          Neem de nieuwe tekst over
        </button>
        <button type="button" onClick={onHouden} className="text-sm text-secondary hover:underline">
          Houd mijn tekst
        </button>
      </div>
    </div>
  );
}
