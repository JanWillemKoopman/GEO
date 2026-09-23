/**
 * Minimale, veilige Markdown→HTML-renderer. Bewust dependency-vrij en veilig:
 * we escapen EERST alle HTML-entiteiten en passen daarna pas de markdown-
 * transformaties toe, daardoor kan er nooit ruwe HTML (bv. <script>) uit de
 * gegenereerde content in de DOM belanden. Dekt de opmaak die de content-
 * pipeline produceert: koppen, lijsten, nadruk, links, code, quotes, regels.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Kop-tekst naar een ankertekst: alleen a-z, 0-9 en koppelteken. */
function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diakrieten weg (Unicode-range combining marks), "cafe" blijft "cafe"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "sectie";
}

/**
 * Maakt een slug uniek binnen één document. Twee koppen met dezelfde tekst
 * (twee keer "Veelgestelde vragen" in dezelfde pagina) mogen niet naar
 * hetzelfde anker wijzen, `seen` telt hoe vaak een basis-slug al langskwam.
 */
function uniqueSlug(text: string, seen: Map<string, number>): string {
  const base = slugify(text);
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

export interface MarkdownHeading {
  level: number;
  /** Leesbare tekst, opmaaktekens (**, _, `) eruit. */
  text: string;
  /** Zelfde anker als renderMarkdown() in de HTML zet (id="…"), H.68. */
  slug: string;
}

/**
 * Kopjes uit de markdown, voor een inhoudsopgave bij lange pagina's (H.68).
 * Loopt over DEZELFDE ge-escapete tekst en met hetzelfde ontdubbelalgoritme
 * als renderMarkdown() hieronder: anders zouden de ankers hier net niet
 * overeenkomen met de id's in de gerenderde HTML zodra een kop een "&" of
 * aanhalingsteken bevat.
 */
export function extractHeadings(markdown: string): MarkdownHeading[] {
  const escaped = escapeHtml(markdown);
  const seen = new Map<string, number>();
  const headings: MarkdownHeading[] = [];
  for (const raw of escaped.split(/\r?\n/)) {
    const match = raw.trimEnd().match(/^(#{1,6})\s+(.*)$/);
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].replace(/[*_`]/g, "").trim();
    if (!text) continue;
    headings.push({ level, text, slug: uniqueSlug(match[2], seen) });
  }
  return headings;
}

/**
 * Inline-opmaak (vet, cursief, code, links) binnen een regel.
 *
 * Geëxporteerd zodat `content-export.ts` dezelfde regels gebruikt voor het
 * CMS-specifieke export: één plek die bepaalt hoe `**vet**` wordt, niet twee
 * die uit de pas kunnen lopen.
 */
export function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_m, label, url) => {
      const safeUrl = String(url).replace(/"/g, "%22");
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
}

/**
 * Een markdowntabel vanaf regel `start`, of `null` als daar geen tabel begint.
 *
 * ── WAAROM (23 september 2026) ──────────────────────────────────────────────
 *
 * De schrijver zet prijzen en vergelijkingen geregeld in een tabel. Deze
 * renderer kende geen tabellen, en dan verscheen er op het scherm én in de
 * gekopieerde HTML één alinea vol streepjes: "| Bedrijfswagen | Vanafprijs per
 * maand | ... |---|---:|---|". Zo stond het op de pagina "Bedrijfswagen leasen
 * vanaf € 359 p/m" van Van den Udenhout.
 *
 * Een tabel is: een kopregel met `|`, direct daarna een scheidingsregel van
 * streepjes (met of zonder `:` voor de uitlijning), en daarna nul of meer
 * rijen met `|`. Zonder scheidingsregel is het geen tabel maar een zin waarin
 * toevallig een streep staat, en die blijft een alinea.
 *
 * Werkt op regels die al ge-escaped zijn; de cellen gaan door `inline()` bij
 * de aanroeper. Gedeeld met `content-export.ts`, zodat scherm en export
 * dezelfde tabel herkennen.
 */
export function leesTabel(
  lines: readonly string[],
  start: number,
): { kop: string[]; rijen: string[][]; volgende: number } | null {
  const cellen = (regel: string) =>
    regel
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
  const kopRegel = lines[start]?.trim() ?? "";
  const scheiding = lines[start + 1]?.trim() ?? "";
  if (!kopRegel.startsWith("|")) return null;
  if (!/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(scheiding)) return null;

  const kop = cellen(kopRegel);
  const rijen: string[][] = [];
  let i = start + 2;
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    rijen.push(cellen(lines[i]));
    i++;
  }
  return { kop, rijen, volgende: i };
}

export function renderMarkdown(markdown: string): string {
  const escaped = escapeHtml(markdown);
  const lines = escaped.split(/\r?\n/);
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let paragraph: string[] = [];
  // Voor de kop-ankers (H.68): zelfde algoritme en dezelfde volgorde als
  // extractHeadings(), zie de uitleg daarboven.
  const seenSlugs = new Map<string, number>();

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    if (line.trim() === "") {
      flushParagraph();
      closeList();
      continue;
    }

    const tabel = leesTabel(lines, i);
    if (tabel) {
      flushParagraph();
      closeList();
      const kop = tabel.kop.map((c) => `<th>${inline(c)}</th>`).join("");
      const rijen = tabel.rijen
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
        .join("");
      html.push(`<table><thead><tr>${kop}</tr></thead><tbody>${rijen}</tbody></table>`);
      i = tabel.volgende - 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      const slug = uniqueSlug(heading[2], seenSlugs);
      html.push(`<h${level} id="${slug}">${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph();
      closeList();
      html.push("<hr/>");
      continue;
    }

    // ⚠️ De regel is al ge-escaped (zie `escaped` hierboven), dus een citaat
    // begint hier niet meer met ">" maar met de entiteit "&gt;". Stond hier
    // eerder `/^>\s?(.*)$/`, en dat matchte dus NOOIT: elk citaat in gegenereerde
    // content belandde als kale tekst "&gt; ..." op de pagina in plaats van als
    // `<blockquote>`. Onopgemerkt omdat er geen test op stond en de tekst zelf
    // prima leesbaar bleef, alleen niet als citaat opgemaakt.
    const quote = line.match(/^&gt;\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    const unordered = line.match(/^\s*[-*]\s+(.*)$/);
    if (ordered || unordered) {
      flushParagraph();
      const wanted: "ul" | "ol" = ordered ? "ol" : "ul";
      if (listType !== wanted) {
        closeList();
        html.push(`<${wanted}>`);
        listType = wanted;
      }
      html.push(`<li>${inline((ordered ?? unordered)![1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  return html.join("\n");
}
