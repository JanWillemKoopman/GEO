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

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === "") {
      flushParagraph();
      closeList();
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
