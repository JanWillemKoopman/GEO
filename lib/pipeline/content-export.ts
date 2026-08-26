/**
 * Content exporteren in de vorm die bij de site van de klant past.
 *
 * ── WAAROM DIT EEN APARTE STAP IS, NIET EEN ANDERE SCHRIJFPROMPT ─────────────
 *
 * De schrijvende AI-aanroep levert al gestructureerde content: een titel, een
 * body in Markdown, losse FAQ-vraag-antwoordparen, schema.org JSON-LD. Het
 * model de HTML van een WordPress-blok of een accordion-`<details>` laten
 * verzinnen is foutgevoelig en niet zijn taak. In plaats daarvan blijft de AI
 * bij wat hij goed kan (inhoud), en vertaalt een deterministische stap diezelfde
 * inhoud naar de vorm die `template-detect.ts` op de site van de klant
 * herkende. Conventie 1: de AI levert de intentie ("dit is een FAQ, dit is een
 * kop"), code levert de garantie dat de opmaak klopt.
 *
 * ── PUUR, DUS TESTBAAR (conventie 2) ─────────────────────────────────────────
 *
 * Markdown en een sjabloonbeeld erin, HTML eruit. Geen database, geen AI.
 */
import { escapeHtml, inline } from "@/lib/markdown";
import type { SiteTemplateProfile } from "@/lib/pipeline/template-detect";

export interface ExportFaqItem {
  q: string;
  a: string;
}

export interface TemplateExportInput {
  /**
   * Alleen gebruikt voor de bestandsnaam (`slugFromTitle()` hieronder), niet
   * voor de inhoud. Geef de PAGINATITEL mee (`displayTitle()` in
   * lib/pipeline/slug.ts), niet `content_pieces.title` zelf: dat is de
   * aanbevelingstitel uit het rapport, een opdrachtzin en geen paginanaam
   * (doorloop-huyberts.md punt 3).
   */
  title: string;
  bodyMarkdown: string;
  faq: ExportFaqItem[];
}

export interface TemplateExport {
  /** Knoptekst. */
  label: string;
  filename: string;
  content: string;
}

function slugFromTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "pagina";
}

/** FAQ als uitklapblok, het patroon dat `heeftFaqAccordion` herkent. */
function renderFaqAccordion(faq: ExportFaqItem[]): string {
  return faq
    .map(
      (f) =>
        `<details><summary>${escapeHtml(f.q)}</summary>\n<p>${escapeHtml(f.a)}</p>\n</details>`,
    )
    .join("\n");
}

/**
 * FAQ als WordPress-"Aangepast HTML"-blok.
 *
 * Bewust GEEN `core/details`-blok: dat bestaat pas sinds WordPress 6.5, en
 * welke versie de klant draait weten we niet (conventie 3). Het Aangepast
 * HTML-blok bestaat al sinds Gutenberg's eerste release en rendert de
 * `<details>`-accordion hoe dan ook correct, ook op een oudere installatie.
 */
function faqAsWordPressBlock(faq: ExportFaqItem[]): string {
  if (faq.length === 0) return "";
  return `<!-- wp:html -->\n${renderFaqAccordion(faq)}\n<!-- /wp:html -->`;
}

/**
 * Markdown naar Gutenberg-blokken (WordPress' eigen blokformaat).
 *
 * Spiegelt bewust de regelherkenning van `renderMarkdown()` in `lib/markdown.ts`
 * één op één (kop, liniaal, citaat, lijst, alinea), maar wikkelt elk element in
 * het bijbehorende `<!-- wp:... -->`-blokcommentaar. Zonder die commentaren plakt
 * de tekst als één "Aangepast HTML"-blok: het werkt, maar de klant kan dan geen
 * los kopje verslepen of een alinea apart opmaken, precies het verschil tussen
 * "plakt" en "past technisch één op één".
 */
export function markdownToGutenbergBlocks(markdown: string): string {
  const escaped = escapeHtml(markdown);
  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<!-- wp:paragraph -->\n<p>${inline(paragraph.join(" "))}</p>\n<!-- /wp:paragraph -->`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listType && listItems.length) {
      const orderedAttr = listType === "ol" ? ' {"ordered":true}' : "";
      const items = listItems.map((li) => `<li>${li}</li>`).join("");
      out.push(`<!-- wp:list${orderedAttr} -->\n<${listType}>${items}</${listType}>\n<!-- /wp:list -->`);
    }
    listType = null;
    listItems = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      out.push(
        `<!-- wp:heading {"level":${level}} -->\n<h${level}>${inline(heading[2])}</h${level}>\n<!-- /wp:heading -->`,
      );
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph();
      flushList();
      out.push(`<!-- wp:separator -->\n<hr class="wp-block-separator"/>\n<!-- /wp:separator -->`);
      continue;
    }

    // Zelfde reden als in `renderMarkdown()` (lib/markdown.ts): de regel is al
    // ge-escaped, dus ">" is hier al "&gt;".
    const quote = line.match(/^&gt;\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      out.push(
        `<!-- wp:quote -->\n<blockquote class="wp-block-quote"><p>${inline(quote[1])}</p></blockquote>\n<!-- /wp:quote -->`,
      );
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    const unordered = line.match(/^\s*[-*]\s+(.*)$/);
    if (ordered || unordered) {
      flushParagraph();
      const wanted: "ul" | "ol" = ordered ? "ol" : "ul";
      if (listType !== wanted) {
        flushList();
        listType = wanted;
      }
      listItems.push(inline((ordered ?? unordered)![1]));
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return out.join("\n\n");
}

/**
 * Bouwt de sjabloongerichte exportoptie, of `null` als er niets te winnen valt.
 *
 * ── WANNEER `NULL`, EN WAAROM DAT GEEN GEBREK IS ─────────────────────────────
 *
 * Zonder herkend CMS en zonder FAQ-accordion is de bestaande platte export
 * (Markdown/HTML-download) al het beste wat er te bieden is: een extra knop die
 * niets toevoegt is ruis op het scherm, en conventie 3 geldt ook hier, onbekend
 * is beter dan doen alsof.
 */
export function buildTemplateExport(
  piece: TemplateExportInput,
  profile: SiteTemplateProfile | null,
): TemplateExport | null {
  if (!profile || profile.pagesAnalysed === 0) return null;
  if (profile.cms === "onbekend" && !profile.heeftFaqAccordion) return null;

  const bestand = slugFromTitle(piece.title);

  if (profile.cms === "wordpress") {
    const body = markdownToGutenbergBlocks(piece.bodyMarkdown);
    const faqBlock = faqAsWordPressBlock(piece.faq);
    return {
      label: "Kopieer voor WordPress",
      filename: `${bestand}-wordpress.html`,
      content: [body, faqBlock].filter(Boolean).join("\n\n"),
    };
  }

  // Geen specifiek CMS herkend, maar de site gebruikt wél al FAQ-accordions:
  // bied in elk geval de FAQ in diezelfde stijl aan.
  if (profile.heeftFaqAccordion && piece.faq.length > 0) {
    return {
      label: "Kopieer FAQ als accordion",
      filename: `${bestand}-faq.html`,
      content: renderFaqAccordion(piece.faq),
    };
  }

  return null;
}
