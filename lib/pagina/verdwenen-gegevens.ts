/**
 * HARDE GEGEVENS VAN DE HUIDIGE PAGINA DIE NIET IN DE NIEUWE TEKST STAAN
 * (V21 punt 3 van `docs/tasks/pijplijnanalyse-contentketen.md`, besluit B-h).
 *
 * Bij een verbeterpagina vervangt de nieuwe tekst de oude. In ronde 1 van de
 * contentkwaliteit (29 september 2026) verdween zo bij een prijzenpagina een
 * deel van de tarieven, en bij een andere pagina het telefoonnummer. Niemand
 * zag het, want de controle keek alleen naar wat er nieuw in stond.
 *
 * Deze regel zoekt bedragen, termijnen, percentages, telefoonnummers en
 * keurmerken op de huidige pagina en kijkt of ze in de nieuwe tekst terugkomen.
 * Wat ontbreekt, ziet de ondernemer op het goedkeuringsscherm. Het houdt niets
 * tegen: soms is weglaten juist de bedoeling (een oude prijs). Een controle op
 * harde feiten in code, geen oordeel over de tekst (conventie 1).
 *
 * Puur, zonder `server-only` (conventie 2).
 */
import { getallenIn, splitsZinnen } from "@/lib/pagina/harde-beweringen";

/** Hooguit zoveel gegevens in de lijst: een lange lijst leest niemand. */
export const MAX_VERDWENEN = 10;

/** Eenheden die een hard gegeven maken; een los getal zonder eenheid telt niet. */
const HARD = new Set(["euro", "procent", "dag", "week", "maand", "jaar", "uur", "minuut"]);

/** Telefoonnummers, als alleen cijfers (`+31` wordt `0`). */
function telefoonnummers(tekst: string): { tekst: string; cijfers: string }[] {
  const uit: { tekst: string; cijfers: string }[] = [];
  for (const m of tekst.matchAll(/(?:\+31[\s-]?|\b0)(?:\d[\s-]?){8,9}\d?\b/g)) {
    const cijfers = m[0].replace(/^\+31/, "0").replace(/\D/g, "");
    if (cijfers.length === 10) uit.push({ tekst: m[0].trim(), cijfers });
  }
  return uit;
}

/** Keurmerken met sterren ("SKG***", "SKG★★★"): de letters en het aantal sterren. */
function keurmerken(tekst: string): { tekst: string; sleutel: string }[] {
  const uit: { tekst: string; sleutel: string }[] = [];
  for (const m of tekst.matchAll(/(?<![\p{L}])(\p{Lu}{2,})\s?([*★]{1,3})(?![\p{L}*★])/gu)) {
    uit.push({ tekst: m[0], sleutel: `${m[1]}${m[2].length}` });
  }
  return uit;
}

/**
 * De harde gegevens die op de huidige pagina stonden en niet in de nieuwe
 * tekst, zoals ze op de huidige pagina geschreven waren. Leeg zonder huidige
 * tekst.
 */
export function verdwenenGegevens(huidig: string | null | undefined, nieuw: string): string[] {
  if (!huidig?.trim()) return [];
  const uit: string[] = [];
  const gezien = new Set<string>();
  const voegToe = (sleutel: string, tekst: string) => {
    if (gezien.has(sleutel) || uit.length >= MAX_VERDWENEN) return;
    gezien.add(sleutel);
    uit.push(tekst);
  };

  const nieuwCijfers = new Set(telefoonnummers(nieuw).map((t) => t.cijfers));
  for (const t of telefoonnummers(huidig)) if (!nieuwCijfers.has(t.cijfers)) voegToe(`tel:${t.cijfers}`, t.tekst);

  const nieuwMerken = new Set(keurmerken(nieuw).map((k) => k.sleutel));
  for (const k of keurmerken(huidig)) if (!nieuwMerken.has(k.sleutel)) voegToe(`merk:${k.sleutel}`, k.tekst);

  const nieuweGetallen = splitsZinnen(nieuw).flatMap(getallenIn);
  for (const zin of splitsZinnen(huidig)) {
    for (const g of getallenIn(zin)) {
      if (!g.eenheid || !HARD.has(g.eenheid)) continue;
      const staat = nieuweGetallen.some((n) => n.waarde === g.waarde && (n.eenheid === g.eenheid || n.eenheid === null));
      if (!staat) voegToe(`getal:${g.waarde}:${g.eenheid}`, g.tekst);
    }
  }
  return uit;
}
