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
import { budgetUitOnderwerpen, klemBudget, PER_BESLISVRAAG, type Budgetgrenzen } from "@/lib/lengtebudget";

/** Hoogstens zoveel prioriteitsfeiten (§5 L5). Meer is geen keuze meer. */
export const MAX_PRIORITEITSFEITEN = 6;
/** Minder dan drie is een waarschuwing, geen correctie: dan ontbreken er feiten, niet keuzes. */
export const MIN_PRIORITEITSFEITEN = 3;
/**
 * Zoveel verschillende stukken sterk bewijs staan hoe dan ook bij de
 * prioriteitsfeiten, als de kaart ze heeft. Nameting fase 1 (25 september
 * 2026): bij Best had de strategie er één (de vaste ploeg), en 35 jaar
 * ervaring en de 4,9 uit 5 bleven liggen omdat "de bestaande site ervaring al
 * noemt". Die pagina vervangt juist de bestaande. Beide blinde lezers misten
 * het. Twee, omdat één stuk bewijs op een pagina een toevalstreffer lijkt.
 */
export const MIN_STERK_BEWIJS = 2;

/** Een betwist feit zoals de strategie het kreeg: met B-nummer. */
export interface BetwistVoorStrategie {
  ref: string;
  conflictId: string;
  feitIds: string[];
  soort: string;
}

/** Een feit op de kaart dat het register als sterk bewijs indeelde. */
export interface SterkBewijs {
  ref: string;
  text: string;
  /** Door de ondernemer zelf verteld: gaat voor, want dat kan geen concurrent zeggen. */
  vanOndernemer: boolean;
}

export interface StrategieInvoer {
  /** De F-nummers van de citeerbare, bruikbare feiten op de kaart. */
  kaartRefs: readonly string[];
  /** De betwiste feiten, met B-nummer. */
  betwist: readonly BetwistVoorStrategie[];
  grenzen: Budgetgrenzen;
  /** De gecontroleerde algemene uitleg, met U-nummer en term (bron "vakkennis"). */
  uitleg?: readonly { ref: string; term: string }[];
  /** Het sterke bewijs op de kaart, in de volgorde van de kaart. */
  sterk?: readonly SterkBewijs[];
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

/**
 * Wat een stuk bewijs zegt, zodat "35 jaar ervaring" en "35+ Jaar ervaring" één
 * stuk zijn: het eerste getal (komma als punt), anders de woorden. De kaart van
 * de hovenier had 35 jaar vier keer en 4,9 uit 5 twee keer als los feit.
 */
const TELWOORD: Record<string, string> = {
  twee: "2", drie: "3", vier: "4", vijf: "5", zes: "6", zeven: "7", acht: "8", negen: "9", tien: "10",
  elf: "11", twaalf: "12", dertien: "13", veertien: "14", vijftien: "15", twintig: "20",
};

export function bewijsKern(tekst: string): string {
  // "Twaalf monteurs in dienst" en "12 monteurs" zijn één stuk bewijs.
  const metCijfers = tekst.replace(/\b(twee|drie|vier|vijf|zes|zeven|acht|negen|tien|elf|twaalf|dertien|veertien|vijftien|twintig)\b/gi, (w) => TELWOORD[w.toLowerCase()]);
  const getal = metCijfers.match(/\d+(?:[.,]\d+)?/);
  if (getal) return getal[0].replace(",", ".");
  return tekst.toLowerCase().replace(/[^a-z0-9à-ÿ]+/g, " ").trim();
}

/**
 * Hoort deze uitleg bij dit onderwerp? Elk woord van de term (vanaf vier
 * letters) staat als heel woord in de naam van het onderwerp. "Rookgasafvoer"
 * hoort bij "Rookgasafvoer bij ketelvervanging"; "HR-ketel" niet bij "Prijs van
 * ketelvervanging".
 */
export function uitlegPastBij(term: string, onderwerp: string): boolean {
  const woorden = (t: string) => t.toLowerCase().split(/[^a-z0-9à-ÿ]+/).filter((w) => w.length >= 4);
  const termWoorden = woorden(term);
  if (termWoorden.length === 0) return false;
  // Hele woorden: "ketel" uit "HR-ketel" hoort niet bij "ketelvervanging".
  const o = new Set(woorden(onderwerp));
  return termWoorden.every((w) => o.has(w));
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
  // ── Het sterkste bewijs gaat mee (werkstand §4, punt 2) ──────────────────
  // Ook als de strategie het uitsloot: de reden was bij de nameting "de site
  // noemt het al", en deze pagina vervangt de site. Alleen betwist houdt het
  // tegen, en dat staat dan niet in `sterk` want het is niet bruikbaar.
  const sterk = (invoer.sterk ?? []).filter((b) => kaart.has(normaliseerRef(b.ref)) && !betwist.has(normaliseerRef(b.ref)));
  if (sterk.length > 0) {
    const sterkPerRef = new Map(sterk.map((b) => [normaliseerRef(b.ref), b]));
    const aanwezig = new Set(
      s.prioriteitsfeiten.flatMap((p) => {
        const b = sterkPerRef.get(p.feit);
        return b ? [bewijsKern(b.text)] : [];
      }),
    );
    const kandidaten = [...sterk.filter((b) => b.vanOndernemer), ...sterk.filter((b) => !b.vanOndernemer)];
    for (const b of kandidaten) {
      if (aanwezig.size >= MIN_STERK_BEWIJS) break;
      const kern = bewijsKern(b.text);
      if (aanwezig.has(kern)) continue;
      const ref = normaliseerRef(b.ref);
      if (s.prioriteitsfeiten.length >= MAX_PRIORITEITSFEITEN) {
        // Plaats maken: het laatste prioriteitsfeit dat geen sterk bewijs is, wordt optioneel.
        const i = s.prioriteitsfeiten.map((p) => sterkPerRef.has(p.feit)).lastIndexOf(false);
        if (i < 0) break;
        const [weg] = s.prioriteitsfeiten.splice(i, 1);
        s.optioneleFeiten = [weg.feit, ...s.optioneleFeiten];
      }
      s.prioriteitsfeiten.push({ feit: ref, betekenis: "Sterk bewijs: onderbouwt waarom de lezer voor dit bedrijf kiest." });
      s.uitgeslotenFeiten = s.uitgeslotenFeiten.filter((u) => normaliseerRef(u.feit) !== ref);
      aanwezig.add(kern);
      correcties.push(`Sterk bewijs ${ref} ("${b.text}") ontbrak en is als prioriteitsfeit toegevoegd.`);
    }
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
  const uitlegPerRef = new Map((invoer.uitleg ?? []).map((u) => [normaliseerRef(u.ref), u.term]));
  s.onderwerpen = s.onderwerpen.map((o) => {
    const feiten = Array.from(new Set(o.feiten.map(normaliseerRef).filter((r) => kaart.has(r))));
    const wacht = Array.from(new Set(o.wachtOpConflict.map(normaliseerRef).filter((r) => betwist.has(r))));
    // U-nummers worden de term van de uitleg; een onbekend nummer valt weg. Een
    // term die al in de naam van het onderwerp staat, hoort er ook bij, ook als
    // het model het nummer vergat (conventie 1).
    const uitleg = Array.from(
      new Set([
        ...(o.uitleg ?? []).flatMap((r) => {
          const term = uitlegPerRef.get(normaliseerRef(r));
          return term ? [term] : [];
        }),
        ...Array.from(uitlegPerRef.values()).filter((term) => uitlegPastBij(term, o.onderwerp)),
      ]),
    );
    let uit = { ...o, feiten, uitleg, wachtOpConflict: wacht };
    // Een kernvraag van de lezer valt niet weg omdat het bedrijfsfeit ontbreekt
    // (werkstand §4, punt 1). Nameting fase 1: de kostenpagina zette "wat zit er
    // in de prijs", de rookgasafvoer en het extra werk op "eerst vragen", en
    // hield 210 woorden over. Is er gecontroleerde uitleg of noemt de strategie
    // zelf vakkennis als bron, dan komt het onderwerp erop als algemene uitleg,
    // en gaat de vraag toch naar de ondernemer.
    if (uit.besluit === "eerst vragen" && uit.kern && (uitleg.length > 0 || uit.bron === "vakkennis")) {
      uit = { ...uit, besluit: "opnemen", bron: "vakkennis", woorden: uit.woorden ?? PER_BESLISVRAAG };
      correcties.push(
        `Kernonderwerp "${o.onderwerp}" stond op eerst vragen maar heeft algemene uitleg: komt erop als uitleg, de vraag gaat naar de ondernemer.`,
      );
    }
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
    if (uit.besluit !== "weglaten" && uit.vraag?.trim()) vragen.push(uit.vraag.trim());
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

  // ── Het lengtebudget: de som van de onderwerpen, onder het plafond ───────
  const metReden = Boolean(s.lengtebudget.redenBovenPlafond?.trim());
  const budget = klemBudget(s.lengtebudget.woorden, invoer.grenzen, metReden);
  if (budget.correctie) correcties.push(budget.correctie);
  const opgenomen = s.onderwerpen.filter((o) => o.besluit === "opnemen").map((o) => o.woorden);
  const perOnderwerp = budgetUitOnderwerpen(budget.woorden, opgenomen);
  if (perOnderwerp.correctie) correcties.push(perOnderwerp.correctie);
  const woorden = klemBudget(perOnderwerp.woorden, invoer.grenzen, metReden).woorden;
  s.lengtebudget = { ...s.lengtebudget, woorden };
  if (woorden < invoer.grenzen.min) {
    waarschuwingen.push(
      `Lengtebudget ${woorden} onder het vertrekpunt van ${invoer.grenzen.min}: de pagina heeft weinig inhoud. Kijk welke vragen aan de ondernemer hem voller maken.`,
    );
  }

  return {
    strategie: s,
    correcties,
    waarschuwingen,
    prioriteitBetwist: Array.from(new Set(prioriteitBetwist)),
    benodigdBetwist: Array.from(new Set(benodigdBetwist)),
    vragenAanOndernemer: Array.from(new Set(vragen)),
  };
}
