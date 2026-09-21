"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { workChipTone, workKindIcon, WORK_KIND_LABEL } from "@/lib/work-kind";
import type { WorkItem } from "@/lib/work";
import type { WachtrijGroep } from "@/lib/wachtrij";

/**
 * De wachtrij, per onderwerp. Zie `lib/wachtrij.ts` voor het waarom van de
 * groepering.
 *
 * ── ⚠️ CLIENT-COMPONENT VOOR ÉÉN REDEN: "NOG X BEKIJKEN" PER ONDERWERP ──────
 *
 * Elk onderwerp toont in eerste instantie twee taken. Heeft het onderwerp er
 * meer, dan staat eronder een knop die de rest van DAT onderwerp toont, zonder
 * de andere onderwerpen open te klappen. Dat kan niet met een link naar een
 * ander scherm: de taken staan al in de payload van dit scherm, dus opnieuw
 * ophalen op een detailpagina zou dubbel werk zijn voor iets dat er al is.
 */
const PER_ONDERWERP_ZICHTBAAR = 2;

export function WachtrijLijst({ groepen }: { groepen: WachtrijGroep[] }) {
  return (
    <div className="flex flex-col gap-5">
      {groepen.map((groep) => (
        <OnderwerpGroep key={groep.onderwerp} groep={groep} />
      ))}
    </div>
  );
}

function OnderwerpGroep({ groep }: { groep: WachtrijGroep }) {
  const [open, setOpen] = useState(false);
  const zichtbaar = open ? groep.items : groep.items.slice(0, PER_ONDERWERP_ZICHTBAAR);
  const verborgen = groep.items.length - zichtbaar.length;

  return (
    <div className="flex flex-col gap-3">
      <span className="mono-label truncate" title={groep.onderwerp}>
        {groep.onderwerp}
      </span>
      <ul className="flex flex-col gap-3">
        {zichtbaar.map((item) => (
          <li key={item.id}>
            <WachtrijKaart item={item} />
          </li>
        ))}
      </ul>
      {verborgen > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium hover:underline"
        >
          Nog {verborgen} {verborgen === 1 ? "taak" : "taken"} bij dit onderwerp
          <Icon naam="naar" size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Eén regel werk dat op de klant wacht.
 *
 * ⚠️ De type-chip (`item.typeLabel`) staat er sinds 21 september 2026 altijd
 * bij, niet meer alleen op blokkerende items. Zonder dat onderscheid zag een
 * regel als "Maak de pagina over wagenparkbeheer..." er hetzelfde uit als "6
 * vragen over je bedrijf": allebei een titel en een knop, zonder dat duidelijk
 * was wát voor taak het was (`docs/logbook.md`, 21 september).
 */
function WachtrijKaart({ item }: { item: WorkItem }) {
  const blokkerend = workChipTone(item.kind) === "danger";

  return (
    <div className={`card ${blokkerend ? "card-danger" : ""} flex flex-wrap items-start gap-4`}>
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
      <Link href={item.href} className="btn-primary btn-sm shrink-0">
        {item.actionLabel ?? "Bekijken"}
        <Icon naam="naar" size={14} />
      </Link>
    </div>
  );
}
