import "server-only";

/**
 * Tekst uit een geüpload bestand halen.
 *
 * ── WAAROM DIT ER IS ───────────────────────────────────────────────────────
 *
 * Een CV en een projectbeschrijving komen in de praktijk uit een PDF. Ze eerst
 * openen, selecteren en plakken is drie handelingen die nergens toe dienen.
 *
 * ── WAAROM `unpdf` EN GEEN VAN DE BEKENDERE PAKKETTEN ──────────────────────
 *
 * Eén afhankelijkheid zonder eigen afhankelijkheden, gebouwd voor omgevingen
 * als Vercel, en hij wordt alleen in deze server-module geïmporteerd, dus er
 * gaat geen byte van naar de browser. De bekendere keuze (`pdf-parse`) leest
 * bij het importeren een testbestand van schijf en breekt daarmee in een
 * serverless omgeving; dat is een bekend probleem met een lelijke omweg, en
 * niet iets om een zijproject aan op te hangen.
 *
 * Nagemeten op 15 september 2026 met een zelf samengestelde PDF van één pagina:
 * de twee tekstregels kwamen er compleet en in de juiste volgorde uit.
 *
 * ── WAT ER NIET IN ZIT ─────────────────────────────────────────────────────
 *
 * Geen `.docx`, en geen tekstherkenning op een gescande PDF. Een gescand CV is
 * een plaatje, en daar tekst uit halen vraagt een heel ander soort pakket. Het
 * scherm zegt in dat geval dat er geen tekst in zat, en niet dat het bestand
 * stuk is.
 */

/** Wat er hoogstens ingelezen wordt. Ruim boven een CV van twintig pagina's. */
export const MAX_BESTAND_BYTES = 10 * 1024 * 1024;

/** Wat het scherm mag aanbieden, en wat de route accepteert. Eén lijst. */
export const TOEGESTANE_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
] as const;

export interface Inleesresultaat {
  ok: boolean;
  tekst: string;
  melding?: string;
}

/**
 * Leest tekst uit een bestand.
 *
 * Gooit niet: een bestand dat niet meewerkt is een normale uitkomst van deze
 * functie en geen storing. De aanroeper krijgt de reden mee zodat het scherm
 * kan zeggen wat er aan de hand is.
 */
export async function leesTekstUitBestand(bestand: File): Promise<Inleesresultaat> {
  if (bestand.size > MAX_BESTAND_BYTES) {
    return {
      ok: false,
      tekst: "",
      melding: `Dit bestand is ${Math.round(bestand.size / 1024 / 1024)} MB. Tot 10 MB gaat goed.`,
    };
  }

  const type = bestand.type || raadType(bestand.name);

  if (type === "text/plain" || type === "text/markdown") {
    return { ok: true, tekst: (await bestand.text()).trim() };
  }

  if (type !== "application/pdf") {
    return {
      ok: false,
      tekst: "",
      melding: "Dit werkt met een PDF of een tekstbestand. Een Word-bestand nog niet.",
    };
  }

  try {
    // Binnen de functie geladen en niet bovenaan het bestand: zo staat het
    // pakket alleen in het geheugen van een verzoek dat echt een PDF inleest,
    // en niet in elke koude start van deze route.
    const { extractText, getDocumentProxy } = await import("unpdf");
    const bytes = new Uint8Array(await bestand.arrayBuffer());
    const document = await getDocumentProxy(bytes);
    const { text } = await extractText(document, { mergePages: true });
    const schoon = normaliseer(Array.isArray(text) ? text.join("\n") : text);

    if (!schoon) {
      return {
        ok: false,
        tekst: "",
        melding:
          "Er zat geen tekst in deze PDF. Waarschijnlijk is hij gescand, dan is het een plaatje. Plak de tekst dan zelf.",
      };
    }
    return { ok: true, tekst: schoon };
  } catch {
    return { ok: false, tekst: "", melding: "Deze PDF liet zich niet lezen. Plak de tekst zelf." };
  }
}

/** Sommige browsers sturen geen type mee. Dan maar op de naam af. */
function raadType(naam: string): string {
  const klein = naam.toLowerCase();
  if (klein.endsWith(".pdf")) return "application/pdf";
  if (klein.endsWith(".md")) return "text/markdown";
  if (klein.endsWith(".txt")) return "text/plain";
  return "";
}

/**
 * Uit een PDF komt tekst met harde regelafbrekingen midden in een zin en met
 * losse spaties tussen letters. Dit ruimt het ergste op zonder de alinea's
 * kwijt te raken: meer dan één lege regel wordt er één, en een regel die
 * middenin een zin afbreekt wordt aan de volgende geplakt.
 */
function normaliseer(ruw: string): string {
  return ruw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([a-zà-ÿ,;])\n(?=[a-zà-ÿ])/g, "$1 ")
    .trim();
}
