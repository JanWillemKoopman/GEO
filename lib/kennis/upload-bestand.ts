import "server-only";

/**
 * Tekst uit een geüploade PDF of tekstbestand halen, voor de handmatige upload
 * op "Feiten en kennis".
 *
 * Eigen, korte versie en geen import uit `lib/solliciteren/bestand.ts`: dat is
 * het zijproject, en ORBIT ENGINE hoort niet van een zijproject af te hangen
 * (README, "Zijproject: Solliciteren"). Dezelfde bibliotheek (`unpdf`, zonder
 * eigen afhankelijkheden, geschikt voor Vercel).
 *
 * De grens is 4 MB, niet 10: een serverless functie op Vercel weigert een
 * verzoek boven 4,5 MB voordat onze code draait, en dan ziet de gebruiker een
 * kale fout in plaats van deze melding. Geen Word-bestanden en geen tekstherkenning
 * op een gescande PDF; het scherm zegt dat en wijst op plakken.
 */
import { MAX_UPLOAD_BYTES } from "@/lib/kennis/upload-grenzen";

export interface UploadLezing {
  ok: boolean;
  tekst: string;
  melding?: string;
}

function type(bestand: File): string {
  if (bestand.type) return bestand.type;
  const naam = bestand.name.toLowerCase();
  if (naam.endsWith(".pdf")) return "application/pdf";
  if (naam.endsWith(".md")) return "text/markdown";
  if (naam.endsWith(".txt")) return "text/plain";
  return "";
}

/** Gooit niet: een bestand dat niet meewerkt is een normale uitkomst, met de reden erbij. */
export async function leesUpload(bestand: File): Promise<UploadLezing> {
  if (bestand.size > MAX_UPLOAD_BYTES) {
    return { ok: false, tekst: "", melding: "Dit bestand is groter dan 4 MB. Kies een kleiner bestand of plak de tekst." };
  }
  const soort = type(bestand);
  if (soort === "text/plain" || soort === "text/markdown") return { ok: true, tekst: (await bestand.text()).trim() };
  if (soort !== "application/pdf") {
    return { ok: false, tekst: "", melding: "Dit werkt met een PDF of een tekstbestand. Een Word-bestand nog niet: sla het op als PDF of plak de tekst." };
  }
  try {
    // Pas laden als er echt een PDF binnenkomt, niet bij elke koude start van de route.
    const { extractText, getDocumentProxy } = await import("unpdf");
    const document = await getDocumentProxy(new Uint8Array(await bestand.arrayBuffer()));
    const { text } = await extractText(document, { mergePages: true });
    const schoon = (Array.isArray(text) ? text.join("\n") : text)
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!schoon) {
      return { ok: false, tekst: "", melding: "Er zat geen tekst in deze PDF. Waarschijnlijk is hij gescand, dan is het een plaatje. Plak de tekst dan zelf." };
    }
    return { ok: true, tekst: schoon };
  } catch {
    return { ok: false, tekst: "", melding: "Deze PDF liet zich niet lezen. Plak de tekst zelf." };
  }
}
