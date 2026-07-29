/**
 * Minimale, veilige Markdown→HTML-renderer. Bewust dependency-vrij en veilig:
 * we escapen EERST alle HTML-entiteiten en passen daarna pas de markdown-
 * transformaties toe — daardoor kan er nooit ruwe HTML (bv. <script>) uit de
 * gegenereerde content in de DOM belanden. Dekt de opmaak die de content-
 * pipeline produceert: koppen, lijsten, nadruk, links, code, quotes, regels.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string): string {
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
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph();
      closeList();
      html.push("<hr/>");
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
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
