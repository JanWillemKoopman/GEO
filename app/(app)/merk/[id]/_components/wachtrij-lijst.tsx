"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import type { IcoonNaam } from "@/lib/icons";
import { workChipTone, workKindIcon, WORK_KIND_LABEL } from "@/lib/work-kind";
import type { WorkItem } from "@/lib/work";
import {
  beperkSectie,
  wachtrijRegel,
  type WachtrijOverzicht,
  type WachtrijSectie,
  type WachtrijSubkop,
} from "@/lib/wachtrij";

/**
 * De wachtrij, ingedeeld in de vaste secties Cluster, Contentplan, Openstaande
 * vragen en Bibliotheek. Zie `lib/wachtrij.ts` voor het waarom van die
 * indeling.
 *
 * ── ⚠️ ÉÉN KOLOM, EEN REGEL PER TAAK (23 september 2026) ─────────────────────
 *
 * Tot vandaag stonden de vier secties in twee CSS-kolommen, met per taak één
 * afgekapte regel tekst. Bij Van den Udenhout las dat als zeven losse zinnen:
 * twee keer "Bekijk en bevestig het concept" zonder dat zichtbaar was welk
 * cluster, en nergens waarom een taak ertoe deed of wat de klik zou doen. Dit
 * is het blok waar de klant ziet wat hij moet doen, dus het krijgt de ruimte:
 *
 * - Eén kolom, een sectie per band. Links de sectie zelf (icoon, naam, een
 *   groene teller, de weg naar dat hoofdstuk), rechts de taken. Zo blijven de
 *   vier blokken herkenbaar en loopt het oog van boven naar beneden, in plaats
 *   van zigzag over twee kolommen waarvan de verdeling van hoogtes afhing.
 * - Elke taak is een eigen regel met drie lagen: waar het over gaat (bij een
 *   cluster de clusternaam, `wachtrijRegel()`), één zin waarom, en een knop die
 *   zegt wat er gebeurt. De hele regel is de link; de knop is een `<span>`,
 *   geen tweede `<a>`.
 * - De dringendste taak van het hele scherm (`eersteId`, de eerste na
 *   `sortWork()`) krijgt de enige primaire knop. Het scherm vraagt zo op één
 *   plek om een klik, en dat is de plek waar de klant het meeste vrijmaakt.
 *
 * ── DE TELLERS ZIJN GROEN, DE PRIMAIRE KNOP DONKER ──────────────────────────
 *
 * Groen is hier dezelfde `chip-success` als "Klaar voor jouw akkoord" op het
 * clusteroverzicht: iets ligt klaar en wacht op de klant, er is niets mis. Rood
 * blijft gereserveerd voor een blokkade (`WachtrijKaart` hieronder).
 */
const SECTIE_ICOON: Record<WachtrijSectie["kop"], IcoonNaam> = {
  Cluster: "goedkeuring",
  Contentplan: "plannen",
  "Openstaande vragen": "feit",
  Bibliotheek: "bibliotheek",
};

export function WachtrijLijst({
  overzicht,
  eersteId,
}: {
  overzicht: WachtrijOverzicht;
  /** De dringendste taak, die als enige een primaire knop krijgt. */
  eersteId?: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {overzicht.waarschuwingen.map((item) => (
        <WachtrijKaart key={item.id} item={item} />
      ))}
      {overzicht.secties.length > 0 && (
        <div className="card overflow-hidden !p-0">
          {overzicht.secties.map((sectie, i) => {
            const { subkoppen, verborgen } = beperkSectie(sectie);
            return (
              <section
                key={sectie.kop}
                aria-label={sectie.kop}
                className={`grid gap-4 p-4 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8 md:p-6 ${
                  i > 0 ? "border-t border-[var(--border-subtle)]" : ""
                }`}
              >
                <SectieKop sectie={sectie} />
                <div className="flex min-w-0 flex-col gap-5">
                  {subkoppen.map((sub) => (
                    <SubkopBlok key={sub.subkop} sub={sub} eersteId={eersteId} />
                  ))}
                  {/* Meer dan vier taken in dit blok: de rest staat in het
                      hoofdstuk zelf (`beperkSectie()` in `lib/wachtrij.ts`). */}
                  {verborgen > 0 && (
                    <Link
                      href={sectie.overzichtHref}
                      className="w-fit text-sm font-medium underline underline-offset-4 hover:text-secondary"
                    >
                      Bekijk alle openstaande acties
                    </Link>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectieKop({ sectie }: { sectie: WachtrijSectie }) {
  return (
    <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-2 md:flex-col md:items-start">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <span className="text-secondary">
          <Icon naam={SECTIE_ICOON[sectie.kop]} size={18} />
        </span>
        {sectie.kop}
      </h3>
      <span className="chip chip-success">
        {sectie.aantal} open
      </span>
      <Link
        href={sectie.overzichtHref}
        className="inline-flex items-center gap-1 text-sm text-secondary hover:underline md:mt-1"
      >
        {sectie.overzichtLabel}
        <Icon naam="naar" size={13} />
      </Link>
    </div>
  );
}

function SubkopBlok({ sub, eersteId }: { sub: WachtrijSubkop; eersteId?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="mono-label">{sub.subkop}</span>
      <ul className="vlak flex flex-col divide-y divide-[var(--line-muted)] overflow-hidden p-0">
        {sub.items.map((item) => (
          <li key={item.id}>
            <TaakRegel item={item} primair={item.id === eersteId} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TaakRegel({ item, primair }: { item: WorkItem; primair: boolean }) {
  const { titel, cluster } = wachtrijRegel(item);
  return (
    <Link
      href={item.href}
      className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 transition-colors hover:bg-[var(--bg-surface-raised)]"
    >
      <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
        {cluster && <span className="mono-label">Cluster · {cluster}</span>}
        <span className="font-medium">{titel}</span>
        <span className="text-sm text-secondary">{item.why}</span>
        {item.meta && <span className="text-sm text-muted">{item.meta}</span>}
      </div>
      <span className={`${primair ? "btn-primary" : "btn-outline"} btn-sm shrink-0`}>
        {item.actionLabel ?? "Bekijken"}
        <Icon naam="naar" size={14} />
      </span>
    </Link>
  );
}

/**
 * Eén regel werk dat op de klant wacht, gereserveerd voor blokkades.
 *
 * ⚠️ De type-chip (`item.typeLabel`) staat er sinds 21 september 2026 altijd
 * bij. ⚠️ De hele kaart is de link (`.card-link`), sinds 22 september 2026. De
 * knop rechts is een `<span>` en geen tweede `<a>`, en is omlijnd: de enige
 * primaire knop van het scherm hoort bij de dringendste taak (`TaakRegel`).
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
