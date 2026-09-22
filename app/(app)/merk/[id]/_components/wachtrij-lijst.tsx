"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
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
 */
const PER_SUBKOP_ZICHTBAAR = 4;

export function WachtrijLijst({ overzicht }: { overzicht: WachtrijOverzicht }) {
  return (
    <div className="flex flex-col gap-5">
      {overzicht.waarschuwingen.map((item) => (
        <WachtrijKaart key={item.id} item={item} />
      ))}
      {overzicht.secties.length > 0 && (
        <div className="columns-1 gap-x-8 md:columns-2">
          {overzicht.secties.map((sectie) => (
            <div key={sectie.kop} className="mb-6 break-inside-avoid">
              <SectieBlok sectie={sectie} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectieBlok({ sectie }: { sectie: WachtrijSectie }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-semibold">{sectie.kop}</h3>
      {sectie.subkoppen.map((sub) => (
        <div key={sub.subkop} className="flex flex-col gap-2">
          <span className="mono-label">
            {sub.subkop} · {sub.items.length}
          </span>
          <ul className="flex flex-col gap-1.5">
            {sub.items.slice(0, PER_SUBKOP_ZICHTBAAR).map((item) => (
              <li key={item.id} className="flex items-baseline gap-2 pl-0.5">
                <span aria-hidden="true" className="text-muted">
                  •
                </span>
                <Link href={item.href} className="min-w-0 truncate text-sm hover:underline">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
          {sub.items.length > PER_SUBKOP_ZICHTBAAR && (
            <Link
              href={sectie.overzichtHref}
              className="inline-flex w-fit items-center gap-1.5 pl-4 text-sm font-medium hover:underline"
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
