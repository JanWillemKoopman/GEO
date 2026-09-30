/**
 * Haalt de zichtbare teksten uit de schermen: JSX-tekst en tekstwaarden
 * (string literals en template strings) in `.tsx`-bestanden.
 *
 * Gebruikt door `scripts/test-unit.ts` om de woordenlijst van
 * docs/schrijfstijl.md §11 af te dwingen (lib/woordenlijst.ts). Dezelfde
 * methode leverde op 30 september 2026 de 2.727 teksten van de taalaudit
 * (docs/logbook.md, "30 september 2026: taalaudit").
 *
 * Wat eruit valt en waarom:
 * - commentaar: de parser ziet het niet als tekst, en commentaar mag Engels
 *   en technisch zijn;
 * - imports, klassenamen en sleutels: een waarde zonder spatie die met een
 *   kleine letter begint (`"mislukt"`, `"btn-primary"`) is een identifier, geen
 *   zin voor een mens;
 * - `app/api/` en `app/solliciteren/`: API-foutmeldingen komen via een scherm
 *   binnen dat zelf getest wordt, en het zijproject heeft zijn eigen regels
 *   (README.md);
 * - `app/(app)/beheer/designsysteem/`: de galerij toont voorbeeldtekst.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

export type UiTekst = { bestand: string; regel: number; tekst: string };

const OVERSLAAN = new Set(["api", "solliciteren", "designsysteem", "node_modules"]);

function isIdentifier(t: string): boolean {
  return !/ /.test(t) && !/^[A-Z]/.test(t);
}

/** Een adres, een HTTP-kop of een stukje code is geen zin voor een mens. */
function isTechnisch(t: string): boolean {
  return (
    /^(\/|… \/)/.test(t) ||
    /^(Content-Type|POST|PATCH|PUT|DELETE|GET)$/.test(t) ||
    /localStorage|=>|document\./.test(t)
  );
}

function uitBestand(pad: string): UiTekst[] {
  const bron = readFileSync(pad, "utf8");
  const sf = ts.createSourceFile(pad, bron, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const uit: UiTekst[] = [];
  const voegToe = (node: ts.Node, ruw: string) => {
    const tekst = ruw.replace(/\s+/g, " ").trim();
    if (!/[a-zA-Z]{3}/.test(tekst) || isIdentifier(tekst) || isTechnisch(tekst)) return;
    const regel = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    uit.push({ bestand: pad, regel, tekst });
  };
  const bezoek = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isJsxText(node)) voegToe(node, node.text);
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      // Een klassenaam of een fetch-methode is geen tekst voor een mens.
      const ouder = node.parent;
      if (ts.isJsxAttribute(ouder) && ["className", "href", "style", "type", "name", "id"].includes(ouder.name.getText())) return;
      voegToe(node, node.text);
    } else if (ts.isTemplateExpression(node)) {
      voegToe(node, node.head.text + node.templateSpans.map((s) => " … " + s.literal.text).join(""));
    }
    ts.forEachChild(node, bezoek);
  };
  bezoek(sf);
  return uit;
}

/** Alle schermteksten onder de gegeven mappen, en losse `.ts`-bestanden met labels. */
export function uiTeksten(mappen: string[], losseBestanden: string[] = []): UiTekst[] {
  const uit: UiTekst[] = [];
  const loop = (map: string) => {
    for (const naam of readdirSync(map)) {
      const pad = path.join(map, naam);
      if (statSync(pad).isDirectory()) {
        if (!OVERSLAAN.has(naam)) loop(pad);
      } else if (naam.endsWith(".tsx")) {
        uit.push(...uitBestand(pad));
      }
    }
  };
  mappen.forEach(loop);
  for (const bestand of losseBestanden) uit.push(...uitBestand(bestand));
  return uit;
}
