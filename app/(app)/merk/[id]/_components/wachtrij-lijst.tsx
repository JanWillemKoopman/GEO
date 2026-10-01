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
 * - Eén kolom, een sectie per band. Links de sectie zelf (icoon, naam, hoeveel
 *   er open staat, de weg naar dat hoofdstuk), rechts de taken.
 * - Elke taak is één regel met twee lagen: waar het over gaat
 *   (`wachtrijRegel()`) en één zin waarom. De hele regel is de link.
 *
 * ── GEEN KNOPPEN, WEL EEN WOORD (30 september en 1 oktober 2026) ───────────
 *
 * Op 30 september 2026 verdwenen de knoppen uit deze lijst: er stonden er soms
 * tien onder elkaar, en tien knoppen zijn er nul. Daarna stond er per regel
 * alleen nog een pijltje, en zei het scherm nergens meer wat de klik deed. De
 * startpagina van een product dat de klant door zijn taken leidt, had zo geen
 * zichtbare volgende stap.
 *
 * Sinds 1 oktober 2026 noemt de dringendste regel van het scherm (`eersteId`,
 * de eerste na `sortWork()`) zijn handeling in woorden naast de punthaak
 * ("Beantwoord de vragen"), in de leeskleur en zonder knopvorm. Eén regel
 * spreekt, de rest wijst alleen. Zo blijft het besluit van 30 september
 * staan (geen knoppen) en heeft het scherm toch één plek die zegt: begin hier.
 *
 * ── ÉÉN VLAK, ÉÉN TELLER PER SECTIE (1 oktober 2026) ───────────────────────
 *
 * De regels stonden in een omlijnd vak, in een sectie, in een kaart: drie
 * randen om één lijst. Het vak is weg; de regels hebben alleen nog hun
 * scheidingslijn. Het aantal per sectie is gewone tekst en geen label meer,
 * want het totaal staat al als label boven de lijst.
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
  /** De dringendste taak, de enige regel die zijn handeling in woorden noemt. */
  eersteId?: string;
}) {
  const eerste = eersteId ?? null;
  return (
    <div className="flex flex-col gap-5">
      {overzicht.waarschuwingen.map((item) => (
        <WachtrijKaart key={item.id} item={item} spreekt={item.id === eerste} />
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
                    <SubkopBlok key={sub.subkop} sub={sub} eersteId={eerste} />
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
      <h3 className="type-body-emphasis flex items-center gap-2">
        <span className="text-secondary">
          <Icon naam={SECTIE_ICOON[sectie.kop]} size={18} />
        </span>
        {sectie.kop}
      </h3>
      <span className="type-caption text-muted tabular">{sectie.aantal} open</span>
      <Link
        href={sectie.overzichtHref}
        className="inline-flex items-center gap-1 text-sm text-secondary hover:underline md:mt-1"
      >
        {sectie.overzichtLabel}
        <Icon naam="naar" size={14} />
      </Link>
    </div>
  );
}

function SubkopBlok({ sub, eersteId }: { sub: WachtrijSubkop; eersteId: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mono-label">{sub.subkop}</span>
      <ul className="-mx-3 flex flex-col divide-y divide-[var(--line-muted)]">
        {sub.items.map((item) => (
          <li key={item.id}>
            <TaakRegel item={item} spreekt={item.id === eersteId} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TaakRegel({ item, spreekt }: { item: WorkItem; spreekt: boolean }) {
  const { titel, cluster } = wachtrijRegel(item);
  return (
    <Link
      href={item.href}
      // Alleen de sprekende regel mag afbreken (zijn handeling valt op een
      // telefoon onder de tekst); een losse punthaak blijft op dezelfde regel.
      className={`flex ${spreekt ? "flex-wrap" : ""} items-center gap-x-6 gap-y-2 rounded-[var(--radius-md)] px-3 py-3 transition-colors hover:bg-[var(--bg-surface-raised)]`}
    >
      {/* Twee regels: wat en waarom (UX-audit P2.2). Het cluster en de extra
          informatie staan in de tooltip; vier regels per taak maakten de lijst
          twee keer zo traag om te scannen. */}
      <div
        className={`flex min-w-0 flex-1 flex-col gap-1 ${spreekt ? "basis-72" : ""}`}
        title={[cluster ? `Cluster: ${cluster}` : null, item.meta].filter(Boolean).join(". ") || undefined}
      >
        <span className="font-medium">{titel}</span>
        <span className="text-sm text-secondary">{item.why}</span>
      </div>
      <ActiePijl label={item.actionLabel ?? "Bekijken"} spreekt={spreekt} />
    </Link>
  );
}

/**
 * De actie rechts op een regel, als icoon en niet als knop.
 *
 * Er stonden er op het overzicht soms tien onder elkaar, elk met een omlijnde
 * knop, en dan is er geen knop meer die iets betekent. De hele regel is al de
 * link; de punthaak laat zien dat er iets opent, en de tekst van de actie staat
 * in de tooltip en voor schermlezers. Alleen de regel die `spreekt` (de
 * dringendste van het scherm) zet die tekst zichtbaar naast de punthaak.
 */
function ActiePijl({ label, spreekt }: { label: string; spreekt: boolean }) {
  if (spreekt) {
    return (
      <span className="type-compact-emphasis flex shrink-0 items-center gap-1 text-[var(--text-primary)]">
        {label}
        <Icon naam="verder" size={16} />
      </span>
    );
  }
  return (
    <span className="shrink-0 text-muted" title={label}>
      <Icon naam="verder" size={16} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * Eén regel werk dat op de klant wacht, gereserveerd voor blokkades.
 *
 * ⚠️ De type-chip (`item.typeLabel`) staat er sinds 21 september 2026 altijd
 * bij. ⚠️ De hele kaart is de link (`.card-link`), sinds 22 september 2026. De
 * actie rechts is een `<span>` en geen tweede `<a>`. Een blokkade is meestal
 * de dringendste taak, en dan noemt deze kaart zijn handeling in woorden.
 */
function WachtrijKaart({ item, spreekt }: { item: WorkItem; spreekt: boolean }) {
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
      <ActiePijl label={item.actionLabel ?? "Bekijken"} spreekt={spreekt} />
    </Link>
  );
}
