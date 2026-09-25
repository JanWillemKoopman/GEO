/**
 * De vangnetten op de paginastrategie (docs/tasks/contentpijplijn-publicatiewaardig.md
 * §5 L5, WP3).
 *
 * Conventie 1: elke promptinstructie krijgt een vangnet in code. De strategie
 * belooft feiten van de kaart te kiezen, geen betwist feit te gebruiken, een
 * voorbehoud alleen met een reden uit §7.2 te geven, en een budget binnen de
 * grenzen te zetten. Deze module rekent dat na en CORRIGEERT, in plaats van de
 * hele strategie af te keuren: een strategie met één verkeerd F-nummer is voor
 * de rest nog goed, en een tweede aanroep op Sol met denktijd hoog kost
 * ongeveer acht cent.
 *
 * Elke correctie komt in de lijst `correcties`, zodat achteraf te zien is wat
 * het model koos en wat de code ervan maakte (conventie 8).
 *
 * Puur (conventie 2).
 */
import type { PageStrategy } from "@/lib/schemas/page-strategy";
import { klemBudget, type Budgetgrenzen } from "@/lib/lengtebudget";

/** Hoogstens zoveel prioriteitsfeiten (§5 L5). Meer is geen keuze meer. */
export const MAX_PRIORITEITSFEITEN = 6;
/** Minder dan drie is een waarschuwing, geen correctie: dan ontbreken er feiten, niet keuzes. */
export const MIN_PRIORITEITSFEITEN = 3;

/** Een betwist feit zoals de strategie het kreeg: met B-nummer. */
export interface BetwistVoorStrategie {
  ref: string;
  conflictId: string;
  feitIds: string[];
  soort: string;
}

export interface StrategieInvoer {
  /** De F-nummers van de citeerbare, bruikbare feiten op de kaart. */
  kaartRefs: readonly string[];
  /** De betwiste feiten, met B-nummer. */
  betwist: readonly BetwistVoorStrategie[];
  grenzen: Budgetgrenzen;
}

export interface GecontroleerdeStrategie {
  strategie: PageStrategy;
  correcties: string[];
  /** Waarschuwingen die niets veranderen maar wel gezien moeten worden. */
  waarschuwingen: string[];
  /** Betwiste feiten (B-nummers) die de strategie nodig had: voor de conflictpoort. */
  prioriteitBetwist: string[];
  benodigdBetwist: string[];
  /** De vragen aan de ondernemer die uit de strategie volgen (bestemming A en "eerst vragen"). */
  vragenAanOndernemer: string[];
}

/**
 * "f3", " F3 ", "F3." worden allemaal "F3", en "F15: Het bedrijf werkt in Best."
 * ook. Dat laatste deed het model bij de nameting van fase 1 (25 september 2026)
 * bij elk prioriteitsfeit van beide pagina's: alle tien werden als "niet op de
 * kaart" weggegooid, want de oude versie maakte er "F15HETBEDRIJFWERKTINBEST"
 * van. Het eerste nummer in de tekst telt; zonder nummer blijft het oude gedrag.
 */
export function normaliseerRef(ref: string): string {
  const kaal = ref.trim().toUpperCase();
  const nummer = kaal.match(/(?:^|[^A-Z0-9])([A-Z])\s?-?\s?(\d{1,4})(?![0-9])/);
  if (nummer) return `${nummer[1]}${nummer[2]}`;
  return kaal.replace(/[^A-Z0-9]/g, "");
}

export function controleerStrategie(ruw: PageStrategy, invoer: StrategieInvoer): GecontroleerdeStrategie {
  const correcties: string[] = [];
  const waarschuwingen: string[] = [];
  const kaart = new Set(invoer.kaartRefs.map(normaliseerRef));
  const betwist = new Set(invoer.betwist.map((b) => normaliseerRef(b.ref)));
  const s: PageStrategy = structuredClone(ruw);

  // ── Prioriteitsfeiten: bestaan ze, zijn ze niet betwist, hooguit zes ──────
  const prioriteitBetwist: string[] = [];
  const gezien = new Set<string>();
  s.prioriteitsfeiten = s.prioriteitsfeiten.flatMap((p) => {
    const ref = normaliseerRef(p.feit);
    if (betwist.has(ref)) {
      prioriteitBetwist.push(ref);
      correcties.push(`Prioriteitsfeit ${ref} is betwist en eruit gehaald.`);
      return [];
    }
    if (!kaart.has(ref)) {
      correcties.push(`Prioriteitsfeit "${p.feit}" staat niet op de feitenkaart en is eruit gehaald.`);
      return [];
    }
    if (gezien.has(ref)) return [];
    gezien.add(ref);
    return [{ ...p, feit: ref }];
  });
  if (s.prioriteitsfeiten.length > MAX_PRIORITEITSFEITEN) {
    const weg = s.prioriteitsfeiten.slice(MAX_PRIORITEITSFEITEN).map((p) => p.feit);
    s.prioriteitsfeiten = s.prioriteitsfeiten.slice(0, MAX_PRIORITEITSFEITEN);
    s.optioneleFeiten = [...weg, ...s.optioneleFeiten];
    correcties.push(`Meer dan ${MAX_PRIORITEITSFEITEN} prioriteitsfeiten; ${weg.join(", ")} naar optioneel.`);
  }
  if (s.prioriteitsfeiten.length < MIN_PRIORITEITSFEITEN) {
    waarschuwingen.push(
      `Maar ${s.prioriteitsfeiten.length} prioriteitsfeiten; de pagina heeft weinig om op te staan.`,
    );
  }

  // ── Optionele en uitgesloten feiten: alleen wat op de kaart staat ─────────
  const prio = new Set(s.prioriteitsfeiten.map((p) => p.feit));
  const optioneelVoor = s.optioneleFeiten.length;
  s.optioneleFeiten = Array.from(
    new Set(s.optioneleFeiten.map(normaliseerRef).filter((r) => kaart.has(r) && !prio.has(r))),
  );
  if (s.optioneleFeiten.length < optioneelVoor) {
    correcties.push("Optionele feiten die niet op de kaart staan, betwist zijn of al voorrang hebben, eruit gehaald.");
  }
  s.uitgeslotenFeiten = s.uitgeslotenFeiten
    .map((u) => ({ ...u, feit: normaliseerRef(u.feit) }))
    .filter((u) => kaart.has(u.feit) || betwist.has(u.feit));

  // ── Onderwerpen: een kernonderwerp zonder feit en zonder vakkennis is een vraag ──
  const benodigdBetwist: string[] = [];
  const vragen: string[] = [];
  s.onderwerpen = s.onderwerpen.map((o) => {
    const feiten = Array.from(new Set(o.feiten.map(normaliseerRef).filter((r) => kaart.has(r))));
    const wacht = Array.from(new Set(o.wachtOpConflict.map(normaliseerRef).filter((r) => betwist.has(r))));
    let uit = { ...o, feiten, wachtOpConflict: wacht };
    if (uit.besluit === "opnemen" && (uit.bron === "geen" || (uit.bron === "feit" && feiten.length === 0))) {
      if (uit.kern) {
        uit = {
          ...uit,
          besluit: "eerst vragen",
          vraag: uit.vraag?.trim() || `Wat kunnen we over "${uit.onderwerp}" zeggen?`,
          woorden: null,
        };
        correcties.push(`Kernonderwerp "${o.onderwerp}" heeft geen feit en geen vakkennis: wordt een vraag aan de ondernemer.`);
      } else {
        uit = { ...uit, besluit: "weglaten", woorden: null };
        correcties.push(`Onderwerp "${o.onderwerp}" heeft geen feit en geen vakkennis: weggelaten.`);
      }
    }
    if (uit.besluit !== "weglaten") benodigdBetwist.push(...wacht);
    if (uit.besluit === "eerst vragen" && uit.vraag?.trim()) vragen.push(uit.vraag.trim());
    return uit;
  });

  // ── Onzekerheden: bestemming B alleen met een reden uit §7.2 ─────────────
  s.onzekerheden = s.onzekerheden.map((o) => {
    if (o.bestemming === "B" && (!o.reden || !o.formulering?.trim())) {
      correcties.push(
        `Voorbehoud "${o.punt}" heeft ${o.reden ? "geen formulering" : "geen reden uit de lijst van §7.2"}: wordt een vraag aan de ondernemer.`,
      );
      const vraag = o.vraag?.trim() || o.punt;
      vragen.push(vraag);
      return { ...o, bestemming: "A" as const, reden: null, formulering: null, vraag };
    }
    if (o.bestemming === "A") vragen.push(o.vraag?.trim() || o.punt);
    return o;
  });

  // ── Het lengtebudget binnen de grenzen van §7.4 ──────────────────────────
  const metReden = Boolean(s.lengtebudget.redenBovenPlafond?.trim());
  const budget = klemBudget(s.lengtebudget.woorden, invoer.grenzen, metReden);
  if (budget.correctie) correcties.push(budget.correctie);
  s.lengtebudget = { ...s.lengtebudget, woorden: budget.woorden };

  return {
    strategie: s,
    correcties,
    waarschuwingen,
    prioriteitBetwist: Array.from(new Set(prioriteitBetwist)),
    benodigdBetwist: Array.from(new Set(benodigdBetwist)),
    vragenAanOndernemer: Array.from(new Set(vragen)),
  };
}
