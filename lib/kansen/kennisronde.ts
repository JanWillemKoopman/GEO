/**
 * DE KENNISRONDE VOOR HET GESPREK (A4 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Het gesprek met de klant kan niet alles tegelijk vragen. Deze module zegt
 * welke kennisgaten het eerst aan bod komen: per domein gegroepeerd, en de
 * dienst met de hoogste kansen het eerst genoemd.
 *
 * Geen nieuwe berekening en geen AI-aanroep: dit leest alleen `kansen.
 * kennis_ontbreekt`, dat `werkKennisgatBij()` (N6) al per kans bijhoudt, over
 * alle kansen van het merk heen. De volgorde van de kansen is niet dit bestand
 * z'n zaak: die komt van de aanroeper (`ordenKansen()`,
 * `lib/kansen/prioriteit.ts`), zodat er één plek blijft die "hoogste kans"
 * bepaalt (conventie: één feit, één eigenaar).
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import type { Domein } from "@/lib/kennis/regels";
import { BEHOEFTE_LABEL, type Behoefte } from "@/lib/kansen/kennisgat";

/**
 * Het domein waar elke behoefte in valt. Dezelfde indeling als
 * `domeinVanFeit()` (`lib/kennis/terugvullen.ts`): een prijs, een termijn, de
 * werkwijze en voor wie iets niet is, zijn een eigenschap van het aanbod; een
 * praktijkvoorbeeld is een verhaal; bewijs is bewijs.
 */
export const BEHOEFTE_DOMEIN: Record<Behoefte, Domein> = {
  werkwijze: "aanbod",
  prijs: "aanbod",
  termijn: "aanbod",
  voor_wie_niet: "aanbod",
  voorbeeld: "verhaal",
  bewijs: "bewijs",
};

/** Wat de kennisronde van een kans nodig heeft. */
export interface KennisrondeKans {
  titel: string;
  /** `null` = het kennisgat is nog niet uitgerekend (N6); zo'n kans doet niet mee. */
  kennisOntbreekt: readonly Behoefte[] | null;
}

/** Eén ontbrekende behoefte, met de kansen die hem missen. */
export interface KennisrondeRegel {
  domein: Domein;
  behoefte: Behoefte;
  label: string;
  /** Titels van de kansen die dit missen, in de volgorde van `kansenOpVolgorde`. */
  kansen: string[];
}

export interface KennisrondeDomein {
  domein: Domein;
  regels: KennisrondeRegel[];
}

/**
 * Groepeert het kennisgat van alle kansen per domein.
 *
 * `kansenOpVolgorde` moet al op prioriteit staan (`ordenKansen()`); deze
 * functie verandert die volgorde niet. Hij bepaalt wel welk domein en welke
 * behoefte het eerst in de lijst staat: dat van de eerste kans die er iets over
 * mist. Zo komt de dienst met de hoogste kansen vanzelf bovenaan.
 */
export function kennisrondeVoorMerk(kansenOpVolgorde: readonly KennisrondeKans[]): KennisrondeDomein[] {
  const regels = new Map<string, KennisrondeRegel>();
  for (const kans of kansenOpVolgorde) {
    for (const behoefte of kans.kennisOntbreekt ?? []) {
      const domein = BEHOEFTE_DOMEIN[behoefte];
      const sleutel = `${domein}:${behoefte}`;
      let regel = regels.get(sleutel);
      if (!regel) {
        regel = { domein, behoefte, label: BEHOEFTE_LABEL[behoefte], kansen: [] };
        regels.set(sleutel, regel);
      }
      regel.kansen.push(kans.titel);
    }
  }

  const perDomein = new Map<Domein, KennisrondeRegel[]>();
  for (const regel of regels.values()) {
    const lijst = perDomein.get(regel.domein) ?? [];
    lijst.push(regel);
    perDomein.set(regel.domein, lijst);
  }
  return [...perDomein.entries()].map(([domein, domeinRegels]) => ({ domein, regels: domeinRegels }));
}
