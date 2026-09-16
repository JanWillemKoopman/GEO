/**
 * De verkoopafspraak onder een account: wat is er afgesproken, en wat mist er nog?
 *
 * ── WAAROM DIT ERBIJ MOEST ──────────────────────────────────────────────────
 *
 * Twee waarden bepalen samen wat een klant in de app te zien krijgt, en ze
 * stonden allebei los van elkaar in een hoek:
 *
 *   `package_pages_per_month`  het quotum van het contentplan. Zonder dit
 *                              getal blokkeert het planscherm van de klant.
 *   `started_at`               waar "maand 4 sinds de start" op rekent.
 *
 * Het pakket is sinds 31 augustus 2026 te zetten op het toewijzingsscherm. De
 * startdatum was dat niet: nagerekend op 16 september 2026 schreef geen enkele
 * regel in `lib/` of `app/` ooit `accounts.started_at`. Hij werd alleen gelezen,
 * door `monthsSinceStart()`. Gevolg: de teller op het instellingenscherm stond
 * bij elke echte klant op niets, en het enige cijfer dat zegt hoe lang ORBIT
 * ENGINE al voor iemand werkt, was in de praktijk onzichtbaar.
 *
 * ── WANNEER BEGINT HET PROGRAMMA? ───────────────────────────────────────────
 *
 * Bij de TOEWIJZING, niet bij het aanmaken van het merk. Het merk wordt
 * klaargezet vóór het demogesprek, soms weken eerder, en soms voor een prospect
 * die nooit klant wordt (`docs/logbook.md` §15, sales-led). Zou de teller daar
 * beginnen, dan leest een klant in zijn eerste week "maand 3".
 *
 * Puur en zonder `server-only` (conventie 2): dit bepaalt een datum die op het
 * scherm van de klant terechtkomt, en dat hoort onder test.
 */

import { packageLabel } from "@/lib/package-sizes";

/**
 * De startdatum die bij een toewijzing gezet moet worden, of `null` als er niets
 * te zetten valt.
 *
 * ⚠️ **Een bestaande startdatum wordt nooit overschreven.** Een klant die zijn
 * tweede merk krijgt toegewezen, is geen klant die opnieuw begint: zijn teller
 * hoort door te lopen en zijn opbrengst sinds de start hoort niet op nul te
 * springen. Dat is dezelfde regel als bij `field-merge.ts`, waar onderzoek nooit
 * overschrijft wat er al vastligt.
 */
export function startdatumBijToewijzing(
  huidig: string | null,
  nu: Date = new Date(),
): string | null {
  if (huidig) return null;
  return nu.toISOString();
}

export interface Verkoopafspraak {
  pakket: number | null;
  startdatum: string | null;
}

export interface AfspraakGat {
  veld: "pakket" | "startdatum";
  /** Wat er mist, in gewone taal. */
  wat: string;
  /** Wat de klant hiervan merkt zolang het mist. Nooit alleen wat er ontbreekt. */
  gevolg: string;
}

/**
 * Wat er nog mist aan de verkoopafspraak, en wat de klant daarvan merkt.
 *
 * ⚠️ Elk gat noemt het GEVOLG en niet alleen het ontbrekende veld. Dat is de
 * regel van het onboardingscherm (`APP_FLOW_DOCUMENTATION.md` §6.4) toegepast op
 * de verkoopkant: "pakket ontbreekt" zegt een consultant niets, "de klant krijgt
 * zijn contentplan niet te zien" wel. De zwaarste staat bovenaan, en zwaar
 * betekent hier: hoeveel de klant ervan merkt.
 */
export function afspraakGaten(afspraak: Verkoopafspraak): AfspraakGat[] {
  const gaten: AfspraakGat[] = [];

  if (!afspraak.pakket) {
    gaten.push({
      veld: "pakket",
      wat: "Er is nog geen contentpakket gekozen.",
      gevolg:
        "Het contentplan blokkeert voor de klant zolang dit leeg is, want er is geen aantal " +
        "pagina's per maand om mee te rekenen.",
    });
  }

  if (!afspraak.startdatum) {
    gaten.push({
      veld: "startdatum",
      wat: "Er staat nog geen startdatum.",
      gevolg:
        "De klant ziet niet hoe lang ORBIT ENGINE al voor hem werkt, en elk cijfer dat met " +
        "“sinds de start” rekent blijft leeg.",
    });
  }

  return gaten;
}

/** Eén regel die zegt hoe de afspraak er nu voor staat. */
export function afspraakSamenvatting(afspraak: Verkoopafspraak): string {
  const gaten = afspraakGaten(afspraak);
  if (gaten.length === 0) return `${packageLabel(afspraak.pakket)}, gestart op ${datum(afspraak.startdatum)}.`;
  if (gaten.length === 2) return "De verkoopafspraak staat nog helemaal open.";
  return gaten[0].wat;
}

function datum(iso: string | null): string {
  if (!iso) return "onbekend";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "onbekend";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Een datum uit een invoerveld (`YYYY-MM-DD`) naar iets dat de database aankan.
 *
 * Leeg is een geldige waarde: de startdatum wissen moet kunnen zolang een klant
 * nog niet echt begonnen is. Een onleesbare datum levert `undefined` op, en die
 * slaat de route over: onbekend is beter dan verkeerd (conventie 3), want een
 * verkeerde startdatum zet de teller van de klant op een getal dat nergens op
 * slaat.
 */
export function leesStartdatum(waarde: unknown): string | null | undefined {
  if (waarde === null || waarde === "") return null;
  if (typeof waarde !== "string") return undefined;
  const d = new Date(waarde);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}
