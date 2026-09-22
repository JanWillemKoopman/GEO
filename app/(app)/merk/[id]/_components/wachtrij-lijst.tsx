"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import type { IcoonNaam } from "@/lib/icons";
import { workChipTone, workKindIcon, WORK_KIND_LABEL } from "@/lib/work-kind";
import type { WorkItem } from "@/lib/work";
import type { WachtrijOverzicht, WachtrijSectie } from "@/lib/wachtrij";

/**
 * De wachtrij, ingedeeld in de vaste secties Cluster, Contentplan, Openstaande
 * vragen en Bibliotheek. Zie `lib/wachtrij.ts` voor het waarom van die
 * indeling.
 *
 * ── TWEE VORMEN NAAST ELKAAR, MET OPZET ──────────────────────────────────────
 *
 * Een blokkade krijgt de volle kaart (`WachtrijKaart`, ongewijzigd sinds
 * 22 september 2026): hij staat alleen, blokkeert alles eronder en verdient
 * de uitleg die daarbij hoort. Alles daaronder is nu een compacte bullet per
 * subkop in plaats van een kaart per item, want met acht subkoppen naast
 * elkaar zou een kaart per regel het scherm laten scrollen voordat de klant
 * ook maar één sectie gezien heeft. Wie meer wil weten over één punt klikt
 * erop; de titel is de link.
 *
 * ── DE TWEE KOLOMMEN VULLEN ZICH AUTOMATISCH ────────────────────────────────
 *
 * `columns-2` (CSS-kolommen) in plaats van twee vaste helften: een klant met
 * veel te herstellen clusters en niets in zijn contentplan zou bij een vaste
 * indeling een kolom vol en een kolom leeg zien. Native CSS-kolommen vullen
 * de linkerkolom eerst en lopen pas door naar de tweede zodra de eerste vol
 * is, en `break-inside-avoid` op elke sectie voorkomt dat één sectie
 * middenin geknipt wordt.
 *
 * ── ⚠️ ÉÉN WITTE KAART, GEEN LOS BLOK OP DE PAGINAKLEUR (22 september 2026) ──
 *
 * Stond eerst zonder `.card` direct op `--bg-base`, terwijl het stat-blok
 * erboven en het contentplan eronder wél in een witte kaart zitten. Dat las
 * als een gat tussen twee kaarten in plaats van een derde kaart in de reeks.
 * `SECTIE_ICOON` hergebruikt bestaande iconen (dezelfde tekeningen als de
 * bijbehorende `WorkKind` in `lib/icons.ts`) zodat een subkop ook zonder te
 * lezen bij Cluster, Contentplan, Openstaande vragen of Bibliotheek te
 * plaatsen is.
 *
 * ⚠️ Geen verticale lijn tussen de kolommen: bij `column-count` weet je niet
 * vooraf welke sectie in welke kolom landt (dat hangt af van hun hoogte), dus
 * een rand op "elk kind behalve het eerste" zou ook tussen twee secties in
 * dezelfde kolom verschijnen. De ruime `gap-x-10` scheidt de kolommen zonder
 * dat risico.
 */
const PER_SUBKOP_ZICHTBAAR = 4;

const SECTIE_ICOON: Record<WachtrijSectie["kop"], IcoonNaam> = {
  Cluster: "goedkeuring",
  Contentplan: "plannen",
  "Openstaande vragen": "feit",
  Bibliotheek: "bibliotheek",
};

export function WachtrijLijst({ overzicht }: { overzicht: WachtrijOverzicht }) {
  return (
    <div className="flex flex-col gap-5">
      {overzicht.waarschuwingen.map((item) => (
        <WachtrijKaart key={item.id} item={item} />
      ))}
      {overzicht.secties.length > 0 && (
        <div className="card">
          <div className="columns-1 gap-x-10 md:columns-2">
            {overzicht.secties.map((sectie, i) => (
              <div
                key={sectie.kop}
                className={`break-inside-avoid ${i > 0 ? "mt-6" : ""}`}
              >
                <SectieBlok sectie={sectie} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectieBlok({ sectie }: { sectie: WachtrijSectie }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <span className="text-secondary">
          <Icon naam={SECTIE_ICOON[sectie.kop]} size={17} />
        </span>
        {sectie.kop}
      </h3>
      {sectie.subkoppen.map((sub) => (
        <div key={sub.subkop} className="flex flex-col gap-1.5">
          <span className="mono-label">
            {sub.subkop} · {sub.items.length}
          </span>
          <ul className="flex flex-col">
            {sub.items.slice(0, PER_SUBKOP_ZICHTBAAR).map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group -mx-2 flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] px-2 py-1 text-sm hover:bg-[var(--bg-surface-raised)]"
                >
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <Icon
                    naam="naar"
                    size={13}
                    className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </Link>
              </li>
            ))}
          </ul>
          {sub.items.length > PER_SUBKOP_ZICHTBAAR && (
            <Link
              href={sectie.overzichtHref}
              className="inline-flex w-fit items-center gap-1.5 text-sm font-medium hover:underline"
            >
              Nog {sub.items.length - PER_SUBKOP_ZICHTBAAR}{" "}
              {sub.items.length - PER_SUBKOP_ZICHTBAAR === 1 ? "punt" : "punten"} bekijken
              <Icon naam="naar" size={14} />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Eén regel werk dat op de klant wacht, gereserveerd voor blokkades.
 *
 * ⚠️ De type-chip (`item.typeLabel`) staat er sinds 21 september 2026 altijd
 * bij. ⚠️ De hele kaart is de link (`.card-link`), sinds 22 september 2026. De
 * knop rechts is een `<span>` en geen tweede `<a>`: `btn-outline` in plaats
 * van `btn-primary`, om dezelfde reden als "Bekijk je zichtbaarheid" bovenaan
 * het scherm.
 */
function WachtrijKaart({ item }: { item: WorkItem }) {
  const blokkerend = workChipTone(item.kind) === "danger";

  return (
    <Link
      href={item.href}
      className={`card card-link ${blokkerend ? "card-danger" : ""} flex-wrap items-start gap-4`}
    >
      <span className="pt-0.5 text-secondary">
        <Icon naam={workKindIcon(item.kind)} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.title}</span>
          {blokkerend && <span className="chip chip-danger">{WORK_KIND_LABEL[item.kind]}</span>}
        </span>
        <span className="mono-label">{item.typeLabel}</span>
        <span className="text-sm text-secondary">{item.why}</span>
        {item.meta && <span className="mono-label">{item.meta}</span>}
      </div>
      <span className="btn-outline btn-sm shrink-0">
        {item.actionLabel ?? "Bekijken"}
        <Icon naam="naar" size={14} />
      </span>
    </Link>
  );
}
