"use client";

import { useState } from "react";
import { AnalyticsTable, type AnalyticsColumn } from "@/components/analytics-table";
import { DetailPanel } from "@/components/detail-panel";
import { groupOfferings, type OfferingView } from "@/lib/reputation/screen";

const STATE_LABEL: Record<OfferingView["state"], { text: string; chip: string }> = {
  genoemd: { text: "genoemd", chip: "chip-success" },
  niet_genoemd: { text: "niet genoemd", chip: "chip-danger" },
  niet_gevraagd: { text: "niet gevraagd", chip: "chip-neutral" },
};

/**
 * Twaalf productregels als tabel, met de bezwaren in het detailpaneel (plan
 * analytics-herontwerp.md, R3 en R4). Vervangt de accordeonlijst van
 * `offering-list.tsx`.
 *
 * ⚠️ **R4 vraagt eigenlijk de producttabel náást de bezwarenkolom, met een
 * klik die de rechterkolom filtert.** Dat is een tweede interactiepatroon
 * naast het detailpaneel dat F4 al overal elders op Analytics gebruikt (klik
 * een rij, lees rechts). Twee patronen voor "meer lezen" op één scherm is
 * precies de inconsistentie die dit hele plan wegwerkt; het detailpaneel
 * hieronder toont daarom zowel de lof als de bezwaren van het aangeklikte
 * product, in plaats van een aparte, altijd-zichtbare bezwarenkolom.
 */
export function ReputationOfferings({ views, brand }: { views: OfferingView[]; brand: string }) {
  const [geselecteerd, setGeselecteerd] = useState<string | null>(null);

  if (views.length === 0) {
    return (
      <div className="card flex flex-col gap-1">
        <span className="mono-label">Niets per product gemeten</span>
        <p className="text-secondary">
          Deze analyse leverde geen uitkomst per product op. Dat gebeurt als het merkprofiel nog
          geen diensten of producten bevat.
        </p>
      </div>
    );
  }

  const groepen = groupOfferings(views);
  const gesorteerd = [...groepen.nietGenoemd, ...groepen.genoemd, ...groepen.nietGevraagd];
  const gekozenView = views.find((v) => v.name === geselecteerd) ?? null;

  const kolommen: AnalyticsColumn<OfferingView>[] = [
    { key: "product", header: "Product", render: (v) => <span className="font-medium">{v.name}</span> },
    {
      key: "genoemd",
      header: "Noemt ChatGPT je",
      width: "10rem",
      sortValue: (v) => v.state,
      render: (v) => <span className={`chip ${STATE_LABEL[v.state].chip}`}>{STATE_LABEL[v.state].text}</span>,
    },
    {
      key: "plaats",
      header: "Jouw plaats",
      numeriek: true,
      width: "8rem",
      sortValue: (v) => v.position,
      render: (v) => (v.position !== null && v.ofParties !== null ? `${v.position} van ${v.ofParties}` : "-"),
    },
    {
      key: "wint",
      header: "Wie wint",
      width: "12rem",
      render: (v) => (v.ahead.length > 0 ? v.ahead[0] : v.state === "genoemd" ? "jij" : "-"),
    },
    {
      key: "bezwaren",
      header: "Bezwaren",
      numeriek: true,
      width: "7rem",
      sortValue: (v) => v.cons.length,
      render: (v) => v.cons.length,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <AnalyticsTable
        rows={gesorteerd}
        rowKey={(v) => v.name}
        columns={kolommen}
        onRowClick={(v) => setGeselecteerd(v.name === geselecteerd ? null : v.name)}
        selectedKey={geselecteerd}
      />
      {gekozenView && (
        <DetailPanel title={gekozenView.name} onClose={() => setGeselecteerd(null)}>
          <OfferingDetail view={gekozenView} brand={brand} />
        </DetailPanel>
      )}
    </div>
  );
}

function OfferingDetail({ view, brand }: { view: OfferingView; brand: string }) {
  return (
    <div className="flex flex-col gap-3">
      {view.state === "niet_genoemd" && view.ahead.length > 0 && (
        <p className="type-compact text-secondary">
          {brand} komt hier niet voor. ChatGPT noemt in plaats daarvan: {view.ahead.slice(0, 5).join(", ")}.
        </p>
      )}
      {view.pros.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="mono-label">Wat ChatGPT prijst</span>
          <ul className="flex flex-col gap-1">
            {view.pros.map((p) => (
              <li key={p} className="type-compact text-secondary">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      {view.cons.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="mono-label">Bezwaren</span>
          <ul className="flex flex-col gap-1">
            {view.cons.map((c) => (
              <li key={c} className="type-compact text-secondary">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
      {view.pros.length === 0 && view.cons.length === 0 && (
        <p className="type-compact text-muted">Geen specifieke punten in de antwoorden over dit product.</p>
      )}
      {view.gaps.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="mono-label">Waar niets over te vinden was</span>
          <ul className="flex flex-col gap-1">
            {view.gaps.map((g) => (
              <li key={g} className="type-compact text-muted">
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
