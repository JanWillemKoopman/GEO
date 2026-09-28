import "server-only";

/**
 * L1: feiten indelen (docs/tasks/contentpijplijn-publicatiewaardig.md, §5 L1, WP2).
 *
 * Elk feit krijgt een soort, een genormaliseerde waarde, een geldigheid en een
 * bewijskracht. Zonder soort en waarde is er geen conflict te vinden (twee zinnen
 * over dezelfde prijs in andere woorden) en geen feit te kiezen voor een pagina.
 *
 * Mechanisch werk dat de code narekent, dus het goedkope model zonder
 * redeneertijd (`deterministic`), in batches. Het vangnet (conventie 1 en 3): een
 * getal in de waarde moet in de feittekst staan, anders blijft de waarde leeg
 * (`veiligeWaarde()` in `conflict-detect.ts`).
 *
 * ── KOSTEN ──────────────────────────────────────────────────────────────────
 *
 * Luna, geen redeneertijd. Een batch van 40 feiten is ruwweg 2.500 tokens in en
 * 2.000 uit: $0,0012 per batch op de tarieven van `lib/openai/pricing.ts`. De
 * drie proefklanten hebben samen 408 actuele feiten (25 september 2026), dus
 * eenmalig elf batches, ongeveer anderhalve cent. Daarna alleen nieuwe feiten
 * (conventie 9: `ingedeeld_at`).
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { FactClassification } from "@/lib/schemas/fact-classification";
import { veiligeWaarde, type FeitSoort, type FeitWaarde, type Bewijskracht } from "@/lib/pipeline/conflict-detect";

/** Hoeveel feiten per aanroep. 40 houdt de uitvoer ruim onder de limiet en de aanroep onder tien seconden. */
export const INDEEL_BATCH = 40;

const SYSTEM =
  "Je deelt feiten over één bedrijf in. Je herschrijft niets en je voegt niets toe. Per feit geef je: " +
  "SOORT, precies één van: prijs, termijn (levertijd, doorlooptijd, reactietijd), plaats (een vestiging " +
  "of een plaats waar iets gebeurt), werkgebied (de plaatsen waar het bedrijf werkt), dienst (wat het " +
  "bedrijf wel of niet doet), product (een merk of type dat het levert), certificering (keurmerk, " +
  "erkenning), garantie, werkwijze (hoe het bedrijf werkt), cijfer (aantallen en jaren als bewijs: " +
  "medewerkers, jaren ervaring, klanten, een beoordeling), openingstijd, contact (adres, telefoon, " +
  "e-mail), overig. " +
  "WAARDE: staat er een getal of bandbreedte, zet het laagste in waardeMin en het hoogste in waardeMax " +
  "(bij één getal beide gelijk), en de eenheid in eenheid ('EUR', 'EUR per maand', 'week', 'dag', " +
  "'minuten', 'jaar', 'procent', of het ding dat geteld wordt: 'monteurs', 'tuinen per jaar'). Neem het " +
  "getal letterlijk over zoals het in het feit staat; '€ 2.200' is 2200, '4,9' is 4.9, 'twaalf' is 12. " +
  "Staat er geen getal, laat waardeMin en waardeMax leeg en zet de kern in waardeTekst (bij een " +
  "werkgebied de plaatsen, bij contact het adres of nummer). " +
  "GELDT VOOR: waarop het feit slaat, zo specifiek als het feit zegt: 'intake op kantoor', 'intake in " +
  "de auto', 'hybride warmtepomp', 'cv-ketelvervanging', 'onderhoudscontract', 'adres', 'telefoon'. " +
  "Geldt het voor het hele bedrijf, laat het leeg. Twee prijzen voor twee verschillende dingen horen " +
  "twee verschillende waarden in geldtVoor te krijgen. " +
  "BEWIJSKRACHT: sterk bij een concreet cijfer dat vertrouwen wekt (35 jaar ervaring, twaalf monteurs, " +
  "1.800 onderhoudscontracten, 93 procent geslaagd, een keurmerk); gewoon bij een concreet feit; geen " +
  "bij een praktisch gegeven zonder overtuigingskracht (een adres, een voorbehoud). " +
  "Antwoord in het Nederlands.";

export interface InTeDelen {
  id: string;
  text: string;
}

export interface Indeling {
  id: string;
  soort: FeitSoort;
  waarde: FeitWaarde | null;
  geldtVoor: string | null;
  bewijskracht: Bewijskracht;
}

/**
 * Deelt één batch in. Een feit waarvoor het model geen (geldig) nummer teruggaf,
 * ontbreekt in de uitkomst en blijft dus op "nog in te delen" staan; de volgende
 * ronde probeert het opnieuw.
 */
export async function deelFeitenIn(args: {
  feiten: InTeDelen[];
  profileId: string;
}): Promise<Indeling[]> {
  const feiten = args.feiten.slice(0, INDEEL_BATCH);
  if (feiten.length === 0) return [];

  const res = await callStructured({
    model: MODELS.quality,
    system: SYSTEM,
    user: ["FEITEN:", ...feiten.map((f, i) => `${i + 1}. ${f.text}`)].join("\n"),
    schema: FactClassification,
    schemaName: "fact_classification",
    webSearch: false,
    work: "deterministic",
    meta: { kind: "fact_classify", profileId: args.profileId },
  });

  const uit: Indeling[] = [];
  const gezien = new Set<number>();
  for (const r of res.parsed.feiten) {
    const feit = feiten[r.nummer - 1];
    if (!feit || gezien.has(r.nummer)) continue;
    gezien.add(r.nummer);
    uit.push({
      id: feit.id,
      soort: r.soort,
      waarde: veiligeWaarde(feit.text, {
        min: r.waardeMin,
        max: r.waardeMax,
        eenheid: r.eenheid,
        tekst: r.waardeTekst,
      }),
      geldtVoor: r.geldtVoor?.trim() || null,
      bewijskracht: r.bewijskracht,
    });
  }
  return uit;
}
