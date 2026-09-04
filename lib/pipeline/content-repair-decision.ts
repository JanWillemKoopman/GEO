/**
 * De reparatielus (`reviseContentPiece` in `content.ts`) in een pure, testbare
 * functie (conventie 2). Beantwoordt twee vragen na elke reparatieronde:
 *
 *  1. Bewaren we deze nieuwe versie, of houden we de vorige aan?
 *  2. Volgt er nog een ronde, of is dit de eindstand?
 *
 * ── DE REGEL ─────────────────────────────────────────────────────────────────
 *
 * Bewaren zolang de ronde niet slechter is dan de beste versie tot nu toe (een
 * gelijk gebleven score is geen verlies). Doorgaan alleen als de score ECHT
 * hoger is: blijft hij gelijk of daalt hij, dan heeft een volgende ronde niets
 * nieuws te pakken en betalen we voor niets.
 *
 * `vorigeKwaliteit` is altijd de score die al op de rij staat, en die staat er
 * alleen als een eerdere ronde hem verdiende: een ronde die niet bewaard werd,
 * overschrijft het cijfer niet. Daarom is "de vorige score" hier hetzelfde als
 * "de beste score tot nu toe", zonder dat deze functie dat apart hoeft bij te
 * houden.
 *
 * ── HERSTELPLAN NA AUDIT, T1.1: WAAROM DE LUS NA ÉÉN RONDE STOPTE ───────────
 *
 * Op 2 september 2026 concludeerde de audit dat pagina db76cb57 na één ronde
 * stopte bij score 68 (concept) → 66 (ronde 1), terwijl er drie rondes mochten.
 * Nagerekend met de echte cijfers (2 september 2026, na de reparatie van
 * dezelfde ochtend): dat is geen fout maar precies deze regel die werkt. Ronde 1
 * scoorde 66, twee punten ONDER het concept van 68: `beterDanVorige` is dan
 * `false`, dus stopt de lus, en `nietSlechter` is ook `false`, dus blijft het
 * concept (68) staan in plaats van de mindere ronde 1 (66).
 *
 * Bij de andere pagina uit dezelfde audit (3517f87e: 78 → 68 → 78 → 52) klopt
 * de uitkomst NIET met deze regel: ronde 1 (68) is al slechter dan het concept
 * (78), dus had de lus na ronde 1 moeten stoppen met het concept (78) bewaard.
 * In werkelijkheid liepen er nog twee rondes en eindigde de score op 52. Die
 * pagina is op 2 september 2026 tussen 15:22 en 15:37 uur geschreven, tegen een
 * versie van productie van vóór de reparatie van dezelfde ochtend (commit
 * 20f6b5d, 04:03 uur) inhaalde. De twee testgevallen hieronder leggen vast dat
 * de HUIDIGE code, met deze regel, geen van beide gevallen meer zo zou
 * afhandelen: beide pagina's zouden na ronde 1 stoppen met het concept bewaard.
 */

/**
 * Binnen hoeveel punten twee scores hetzelfde betekenen (optimalisatie 11).
 *
 * Drie punten. Herleid uit de enige meting die we hebben: het NIVEAU van de
 * vakmanschapsbeoordelaar zit 0,14 punt van het menselijke oordeel af op een
 * schaal van 1 tot 5, en dat is 2,8 punt op de schaal van 0 tot 100 waarop hier
 * gerekend wordt. Alles binnen die marge is ruis van de beoordelaar zelf, en
 * daar hoort geen beslissing op te rusten over welke tekst de klant krijgt.
 *
 * ⚠️ Gekozen op één meting, net als de zeven drempels van 3 september. Zodra er
 * een tweede ronde ligt, hoort dit getal opnieuw tegen de spreiding gelegd te
 * worden.
 */
export const GELIJKSPEL_MARGE = 3;

/** Betekenen deze twee scores hetzelfde? `null` telt nooit als gelijkspel. */
export function binnenRuis(a: number | null, b: number | null): boolean {
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= GELIJKSPEL_MARGE;
}

/** Welke van twee versies een vergelijkend oordeel beter vindt. */
export type VersieVoorkeur = "huidig" | "nieuw";

export interface RepairRoundInput {
  /** Kwaliteitsscore die nu op de rij staat (van de beste eerdere versie). */
  vorigeKwaliteit: number | null;
  /** Kwaliteitsscore van de zojuist geschreven reparatieronde. */
  nieuweKwaliteit: number;
  /** Het rondenummer van deze reparatie (1 voor de eerste). */
  ronde: number;
  /** Hoogstens dit veel reparatierondes (REPAIR_MAX). */
  repairMax: number;
  /** Eén van de kwaliteitsdrempels nog niet gehaald. */
  scoresTeLaag: boolean;
  /** Aantal openstaande bevindingen na deze ronde. */
  openstaandeBevindingen: number;
  /**
   * Het VERGELIJKENDE oordeel tussen de vorige en deze versie (optimalisatie 11).
   *
   * Telt alleen mee bij een gelijkspel, dus wanneer de twee scores binnen
   * `GELIJKSPEL_MARGE` van elkaar liggen. Daarbuiten beslist de score, want dan
   * is het verschil groter dan de ruis van de beoordelaar. `null` of weglaten
   * betekent geen oordeel, en dan geldt de regel van vóór 4 september 2026.
   */
  vergelijking?: VersieVoorkeur | null;
}

export interface RepairRoundDecision {
  /** `true`: deze ronde vervangt de vorige versie op de rij. */
  bewaarNieuweVersie: boolean;
  /** `true`: er volgt nog een reparatieronde. */
  nogEenRonde: boolean;
}

export function beslisReparatieRonde(input: RepairRoundInput): RepairRoundDecision {
  const {
    vorigeKwaliteit,
    nieuweKwaliteit,
    ronde,
    repairMax,
    scoresTeLaag,
    openstaandeBevindingen,
    vergelijking = null,
  } = input;

  // Bij de allereerste reparatie van een pagina van vóór dit veld bestond is er
  // geen meetpunt: dan telt de ronde als verbetering, want zonder meetpunt is
  // "niet beter" een gok en geen vaststelling (conventie 3).
  const geenMeetpunt = vorigeKwaliteit === null || !Number.isFinite(vorigeKwaliteit);

  // ── Gelijkspel: dan beslist het vergelijkende oordeel (optimalisatie 11) ──
  //
  // Twee cijfers van dezelfde beoordelaar die binnen drie punten van elkaar
  // liggen, zeggen niets over welke tekst beter is: zijn niveau klopt, zijn
  // ordening niet. In dat geval telt het antwoord op de vraag die hij wél
  // betrouwbaar beantwoordt, namelijk welke van de twee een copywriter eerder
  // zou versturen. Ligt het verschil buiten de marge, dan is het geen ruis meer
  // en beslist de score, ook als het oordeel iets anders zegt.
  const gelijkspel = !geenMeetpunt && binnenRuis(vorigeKwaliteit, nieuweKwaliteit);
  if (gelijkspel && vergelijking) {
    const beter = vergelijking === "nieuw";
    return {
      bewaarNieuweVersie: beter,
      // Een volgende ronde alleen als deze ronde iets opleverde. Zei het
      // oordeel dat de oude tekst beter was, dan heeft nog een poging op
      // dezelfde bevindingen geen nieuwe informatie.
      nogEenRonde: beter && (scoresTeLaag || openstaandeBevindingen > 0) && ronde < repairMax,
    };
  }

  const nietSlechter = geenMeetpunt || nieuweKwaliteit >= vorigeKwaliteit;
  const beterDanVorige = geenMeetpunt || nieuweKwaliteit > vorigeKwaliteit;

  const nogEenRonde =
    (scoresTeLaag || openstaandeBevindingen > 0) && ronde < repairMax && beterDanVorige;

  return { bewaarNieuweVersie: nietSlechter, nogEenRonde };
}
