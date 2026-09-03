"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentQualityReview } from "@/lib/types/database";

/**
 * DE MENSELIJKE BEOORDELING
 * (docs/tasks/contentkwaliteit-framework.md §6, punt 11 van de opdracht)
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Een AI-evaluator mag niet de enige definitie van kwaliteit worden. Op 31 juli
 * 2026 gaven tien van de tien pagina's zichzelf 100 van de 100, inclusief de
 * pagina met vijf verzonnen feiten. Zolang niemand daar met de hand naast legt
 * wat hij ervan vindt, is elke verbetering aan de schrijfinstructie een gok.
 *
 * ── DE ZEVEN VELDEN, EN WAAROM PRECIES DEZE ─────────────────────────────────
 *
 * Zes schuiven van 1 tot 5 plus één ja-of-nee-vraag. Die laatste is de
 * belangrijkste en is letterlijk de vraag die de eigenaar zelf stelt bij het
 * beoordelen (herstelplan T2): zou je dit zonder aanpassing naar een klant
 * sturen? Alles eromheen legt uit waarom niet.
 *
 * Alles is optioneel. Een half ingevulde beoordeling is meer waard dan een lege,
 * en een verplicht veld is de snelste manier om te zorgen dat er nooit één
 * wordt ingevuld.
 */

const MAATSTAVEN = [
  {
    veld: "copywriter_equivalence" as const,
    label: "Zoals een copywriter het zou schrijven",
    uitleg: "1 = duidelijk AI-tekst, 5 = niet van een goede copywriter te onderscheiden",
  },
  {
    veld: "company_specificity" as const,
    label: "Gaat over dit bedrijf",
    uitleg: "1 = zou op elke concurrentensite kunnen staan, 5 = onmiskenbaar deze ondernemer",
  },
  {
    veld: "generic_ai_feel" as const,
    label: "Eigen in plaats van generiek",
    uitleg: "1 = het bekende AI-verhaal, 5 = zegt iets wat je nergens anders leest",
  },
  {
    veld: "persuasiveness" as const,
    label: "Overtuigt",
    uitleg: "1 = laat de lezer koud, 5 = zet aan tot contact",
  },
  {
    veld: "brand_representation" as const,
    label: "Vertegenwoordigt het merk goed",
    uitleg: "1 = klinkt als een ander bedrijf, 5 = klinkt als dit bedrijf",
  },
];

const CORRECTIE = [
  { waarde: "geen", label: "Geen correctie nodig" },
  { waarde: "licht", label: "Lichte correctie" },
  { waarde: "zwaar", label: "Zware correctie" },
  { waarde: "opnieuw", label: "Opnieuw schrijven" },
] as const;

export function ReviewForm({
  pieceId,
  bestaand,
}: {
  pieceId: string;
  bestaand: ContentQualityReview | null;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  async function opslaan(formData: FormData) {
    setBezig(true);
    setFout(null);
    setMelding(null);
    const nummer = (naam: string) => {
      const waarde = formData.get(naam);
      const getal = Number(waarde);
      return waarde && Number.isFinite(getal) && getal > 0 ? getal : null;
    };
    const tekst = (naam: string) => {
      const waarde = (formData.get(naam) as string | null)?.trim();
      return waarde ? waarde : null;
    };
    const wouldSend = formData.get("would_send");

    try {
      const res = await fetch(`/api/beheer/kwaliteit/${pieceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          benchmarkSet: tekst("benchmark_set"),
          copywriterEquivalence: nummer("copywriter_equivalence"),
          companySpecificity: nummer("company_specificity"),
          genericAiFeel: nummer("generic_ai_feel"),
          persuasiveness: nummer("persuasiveness"),
          brandRepresentation: nummer("brand_representation"),
          correctionEffort: tekst("correction_effort"),
          wouldSend: wouldSend === "ja" ? true : wouldSend === "nee" ? false : null,
          firstThingToChange: tekst("first_thing_to_change"),
          notes: tekst("notes"),
          referenceMarkdown: tekst("reference_markdown"),
          referenceSource: tekst("reference_source"),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Opslaan is niet gelukt.");
      }
      setMelding("Je beoordeling is opgeslagen.");
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Opslaan is niet gelukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <form action={opslaan} className="card flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="mono-label">Jouw beoordeling</span>
        <p className="text-sm text-secondary">
          Dit is de meetlat waaraan het oordeel van de app geijkt wordt. Alles mag leeg blijven; een
          half ingevulde beoordeling is meer waard dan geen.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {MAATSTAVEN.map((maat) => (
          <label key={maat.veld} className="flex flex-col gap-1">
            <span className="text-sm font-medium">{maat.label}</span>
            <span className="text-xs text-muted">{maat.uitleg}</span>
            <select
              name={maat.veld}
              defaultValue={String(bestaand?.[maat.veld] ?? "")}
              className="input max-w-xs"
            >
              <option value="">niet beoordeeld</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Zou je dit zonder aanpassing naar de klant sturen?</span>
        <select
          name="would_send"
          defaultValue={bestaand?.would_send === true ? "ja" : bestaand?.would_send === false ? "nee" : ""}
          className="input max-w-xs"
        >
          <option value="">niet beoordeeld</option>
          <option value="ja">Ja</option>
          <option value="nee">Nee</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Hoeveel correctie kost deze pagina?</span>
        <select
          name="correction_effort"
          defaultValue={bestaand?.correction_effort ?? ""}
          className="input max-w-xs"
        >
          <option value="">niet beoordeeld</option>
          {CORRECTIE.map((c) => (
            <option key={c.waarde} value={c.waarde}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Wat zou je als eerste veranderen?</span>
        <input
          name="first_thing_to_change"
          defaultValue={bestaand?.first_thing_to_change ?? ""}
          className="input"
          placeholder="Eén punt, het punt dat het meeste oplevert."
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Verdere opmerkingen</span>
        <textarea name="notes" defaultValue={bestaand?.notes ?? ""} rows={3} className="input" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Benchmark</span>
        <span className="text-xs text-muted">
          Een label waarmee je deze pagina bij een vaste set zet, bijvoorbeeld &quot;start-20&quot;. Leeg laten
          mag: dan is dit een losse beoordeling.
        </span>
        <input
          name="benchmark_set"
          defaultValue={bestaand?.benchmark_set ?? ""}
          className="input max-w-xs"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Referentieversie (optioneel)</span>
        <span className="text-xs text-muted">
          Hoe een mens deze pagina geschreven zou hebben. Geen norm maar een meetlat: waar wijkt de
          AI-versie van af, en hoeveel correctie kostte dat.
        </span>
        <textarea
          name="reference_markdown"
          defaultValue={bestaand?.reference_markdown ?? ""}
          rows={8}
          className="input font-mono text-xs"
        />
        <input
          name="reference_source"
          defaultValue={bestaand?.reference_source ?? ""}
          className="input mt-2 max-w-xs"
          placeholder="Waar komt deze versie vandaan?"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={bezig}>
          {bezig ? "Bezig..." : "Beoordeling opslaan"}
        </button>
        {melding && <span className="text-sm text-secondary">{melding}</span>}
        {fout && <span className="text-sm text-secondary">{fout}</span>}
      </div>
    </form>
  );
}
