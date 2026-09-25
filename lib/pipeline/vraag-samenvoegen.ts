/**
 * Vragen aan de klant die in essentie hetzelfde vragen, samenvoegen
 * (punt 57 van de kwaliteitsdoorlichting, reparatieplan blok I, 25 september 2026).
 *
 * ── WAT ER MISGING ──────────────────────────────────────────────────────────
 *
 * Bij de herhaling kreeg de installateur in één voorbereidingsronde twaalf
 * nieuwe vragen, waarvan er acht in de kern één vraag stelden: wat zit er bij
 * een ketelvervanging inbegrepen ("Voert u de oude ketel af?", "Welke
 * onderdelen haalt u los?", "Controleert u de rookgasafvoer?" ...). Erger: de
 * klant had die vraag dezelfde ochtend al overgeslagen ("Wat zit bij een
 * standaard ketelvervanging inbegrepen, bijvoorbeeld het afvoeren van de oude
 * ketel ...?"). De claim-audit kreeg de al gestelde vragen mee met de opdracht
 * ze "ook niet in andere bewoordingen" opnieuw te stellen, en deed het toch.
 * `claimKey()` en `topicKey()` vangen alleen dezelfde woorden, niet dezelfde
 * vraag.
 *
 * ── HOE ─────────────────────────────────────────────────────────────────────
 *
 * Eén kleine modelaanroep per voorbereidingsronde (`vraag-judge.ts`) wijst per
 * nieuwe vraag aan of hij hetzelfde vraagt als een al bestaande vraag (B3) of
 * als een eerdere nieuwe vraag uit dezelfde ronde (N2). Deze module past dat
 * toe, met de regels die de code bepaalt en niet het model (conventie 1):
 *
 *   • een vaste slotvraag en de positioneringsvraag voegen nooit samen: die zijn
 *     met de hand geformuleerd en bewust verschillend (zelfde regel als
 *     `dedupeOpOnderwerp()`);
 *   • een verwijzing naar een nieuwe vraag mag alleen naar een EERDERE, zodat er
 *     geen kringen ontstaan, en een verwijzing die niet bestaat telt niet;
 *   • samenvoegen neemt de pagina's, de secties en "verplicht" van de verliezer
 *     mee, zoals overal in `briefing-select.ts`: overslaan moet elke sectie
 *     raken die op het antwoord wachtte;
 *   • is de bestaande vraag nog OPEN, dan krijgt die de pagina's erbij; is hij
 *     beantwoord of overgeslagen, dan vervalt de nieuwe vraag. Het antwoord
 *     staat al op de kaart, of de klant heeft al gezegd dat hij het niet weet.
 *
 * Zonder oordeel (mislukte aanroep) verandert er niets: dan gaan de vragen erin
 * zoals vóór deze reparatie (conventie 3).
 *
 * Bewust ZONDER `server-only`: puur, testbaar in `test-unit.ts`.
 */
import type { BriefingQuestion } from "@/lib/pipeline/briefing-select";

export interface BestaandeVraag {
  id: string;
  question: string;
  status: "open" | "beantwoord" | "overgeslagen";
}

export interface VraagOordeel {
  /** Het nummer van de nieuwe vraag (N1 = 1). */
  nummer: number;
  /** "B3" (een bestaande vraag), "N2" (een eerdere nieuwe vraag), of `null`. */
  zelfdeAls: string | null;
}

export interface Samenvoeging {
  /** De vragen die als nieuwe rij de tabel in gaan. */
  nieuw: BriefingQuestion[];
  /** Open bestaande vragen die er pagina's en secties bij krijgen. */
  aanvullingen: { id: string; contentPieceIds: string[]; sectionRefs: string[]; required: boolean }[];
  /** Nieuwe vragen die vervallen, en waarom: voor het logboek. */
  vervallen: { question: string; zelfdeAls: string }[];
}

/** Doet deze vraag nooit mee aan het samenvoegen? */
function beschermd(v: BriefingQuestion): boolean {
  return v.fixedSlot === true || v.kind === "onderscheid";
}

function voegToe(doel: { contentPieceIds: string[]; sectionRefs?: string[]; required: boolean }, bron: BriefingQuestion) {
  doel.contentPieceIds = Array.from(new Set([...doel.contentPieceIds, ...bron.contentPieceIds]));
  doel.sectionRefs = Array.from(new Set([...(doel.sectionRefs ?? []), ...(bron.sectionRefs ?? [])]));
  doel.required = doel.required || bron.required;
}

export function voegVragenSamen(args: {
  kandidaten: readonly BriefingQuestion[];
  bestaande: readonly BestaandeVraag[];
  oordelen: readonly VraagOordeel[] | null;
}): Samenvoeging {
  const kandidaten = args.kandidaten.map((k) => ({ ...k, sectionRefs: [...(k.sectionRefs ?? [])] }));
  if (!args.oordelen || args.oordelen.length === 0) {
    return { nieuw: kandidaten, aanvullingen: [], vervallen: [] };
  }
  const perNummer = new Map(args.oordelen.map((o) => [o.nummer, o.zelfdeAls?.trim().toUpperCase() ?? null]));

  // Waar gaat vraag i heen? Een index in `kandidaten`, een bestaande vraag, of nergens.
  type Doel = { soort: "nieuw"; index: number } | { soort: "bestaand"; vraag: BestaandeVraag } | null;
  const doelen: Doel[] = kandidaten.map(() => null);

  kandidaten.forEach((kandidaat, i) => {
    if (beschermd(kandidaat)) return;
    const ref = perNummer.get(i + 1) ?? null;
    const b = ref?.match(/^B(\d+)$/);
    const n = ref?.match(/^N(\d+)$/);
    if (b) {
      const vraag = args.bestaande[Number(b[1]) - 1];
      if (vraag) doelen[i] = { soort: "bestaand", vraag };
    } else if (n) {
      const j = Number(n[1]) - 1;
      if (j >= 0 && j < i && !beschermd(kandidaten[j])) doelen[i] = { soort: "nieuw", index: j };
    }
  });

  // Volg een keten N5 → N2 → B1 tot het eind; dat is waar de vraag landt.
  const eindpunt = (i: number): Doel => {
    let doel = doelen[i];
    while (doel?.soort === "nieuw" && doelen[doel.index]) doel = doelen[doel.index];
    return doel;
  };

  const nieuw: BriefingQuestion[] = [];
  const aanvullingPerId = new Map<string, Samenvoeging["aanvullingen"][number]>();
  const vervallen: Samenvoeging["vervallen"] = [];

  // Eerst de blijvers vastleggen, dan de verliezers erin opgaan.
  kandidaten.forEach((k, i) => {
    if (!doelen[i]) nieuw.push(k);
  });
  kandidaten.forEach((k, i) => {
    const doel = eindpunt(i);
    if (!doel) return;
    if (doel.soort === "nieuw") {
      voegToe(kandidaten[doel.index], k);
      vervallen.push({ question: k.question, zelfdeAls: kandidaten[doel.index].question });
      return;
    }
    vervallen.push({ question: k.question, zelfdeAls: doel.vraag.question });
    if (doel.vraag.status !== "open") return;
    const aanvulling = aanvullingPerId.get(doel.vraag.id) ?? {
      id: doel.vraag.id,
      contentPieceIds: [],
      sectionRefs: [],
      required: false,
    };
    voegToe(aanvulling, k);
    aanvullingPerId.set(doel.vraag.id, aanvulling);
  });

  return { nieuw, aanvullingen: [...aanvullingPerId.values()], vervallen };
}
