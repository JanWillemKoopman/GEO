/**
 * WAT DE KLANT MEENEEMT NAAR ZIJN EIGEN SITE (`docs/tasks/contentketen-opnieuw.md` §6.9,
 * "daarna de bestaande publicatiestappen").
 *
 * ── WAAROM DIT ERBIJ MOEST (26 september 2026) ──────────────────────────────
 *
 * De schrijver levert een tekst, een metatitel, een metabeschrijving en 0 tot 5
 * veelgestelde vragen, en de code bouwt er gestructureerde gegevens bij. Bij de
 * ombouw van de contentketen verdween het menu met kopiëren en downloaden van
 * het paginascherm, en sindsdien zag de klant alleen de tekst: de helft van wat
 * hij betaalt bleef in de database staan (`docs/doorloop-van-klant-tot-content.md`,
 * deel III punt 1). Hier staat hoe die delen samen één pakket worden.
 *
 * Twee regels:
 *   - De FAQ hoort bij de pagina. In een download staat hij onder de tekst, met
 *     zijn eigen kop, zodat een klant die alleen het bestand plakt hem niet mist.
 *   - Het HTML-bestand is een compleet document: de metatitel als `<title>`, de
 *     metabeschrijving als `<meta name="description">`, en de gestructureerde
 *     gegevens in de `<head>`, waar ze horen.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { escapeHtml, renderMarkdown } from "@/lib/markdown";

export interface FaqPaar {
  q: string;
  a: string;
}

/** De kop boven de FAQ in een download. */
export const FAQ_KOP = "Veelgestelde vragen";

/** De FAQ als Markdown: een kop, en per vraag een subkop met het antwoord. Leeg zonder vragen. */
export function faqMarkdown(faq: readonly FaqPaar[]): string {
  const paren = faq.filter((f) => f.q?.trim() && f.a?.trim());
  if (paren.length === 0) return "";
  return [`## ${FAQ_KOP}`, ...paren.map((f) => `### ${f.q.trim()}\n\n${f.a.trim()}`)].join("\n\n");
}

/** De tekst met de FAQ eronder, zoals hij in een download hoort. */
export function volledigeMarkdown(tekst: string, faq: readonly FaqPaar[]): string {
  return [tekst.trim(), faqMarkdown(faq)].filter(Boolean).join("\n\n");
}

/**
 * Een compleet HTML-document voor de download.
 *
 * ⚠️ In de JSON-LD wordt `</` geschreven als `<\/`: staat er ergens in een
 * antwoord de tekst `</script>`, dan sluit die anders het blok af en belandt de
 * rest van de gegevens als losse tekst op de pagina. JSON leest `<\/` gewoon als
 * `</`.
 */
export function htmlDocument(input: {
  metaTitel: string | null;
  metaBeschrijving: string | null;
  tekst: string;
  faq: readonly FaqPaar[];
  schemaJsonLd: string | null;
}): string {
  const head = [
    '<meta charset="utf-8">',
    input.metaTitel?.trim() ? `<title>${escapeHtml(input.metaTitel.trim())}</title>` : null,
    input.metaBeschrijving?.trim()
      ? `<meta name="description" content="${escapeHtml(input.metaBeschrijving.trim())}">`
      : null,
    input.schemaJsonLd?.trim()
      ? `<script type="application/ld+json">\n${input.schemaJsonLd.trim().replace(/<\//g, "<\\/")}\n</script>`
      : null,
  ].filter(Boolean);
  const body = renderMarkdown(volledigeMarkdown(input.tekst, input.faq));
  return `<!doctype html>\n<html lang="nl">\n<head>\n${head.join("\n")}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
}

/** Een bestandsnaam uit een titel: kleine letters, streepjes, nooit leeg. */
export function bestandsnaam(titel: string): string {
  return (
    titel
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "pagina"
  );
}
