/**
 * DE MEETLAT VOOR DE EERSTE ECHTE KLANT (`docs/tasks/meting-eerste-klant.md`).
 *
 * Na WP9 ronde 2 (26 september 2026) was de conclusie van de copywriter dat
 * nog een vergelijkingsronde met AI-teksten weinig toevoegt: wat de ondernemer
 * zelf verandert, zegt meer. Deze module rekent dat uit per pagina, uit wat de
 * keten al bewaart: de tekst van het model (`raw_json.uitvoer`), de tekst die
 * werd goedgekeurd (`body_markdown`), de gele zinnen met wat bevestigd is, de
 * gevraagde aanpassingen (`revision_note`) en de vragen met hun antwoord.
 *
 * Wat code niet kan, doet een mens met het rapport ernaast: of een wijziging
 * een feit of de stijl raakt, en of de ondernemer vindt dat de tekst klinkt als
 * het eigen bedrijf. Die twee vragen staan daarom leeg in het rapport.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { normaliseerVraag } from "@/lib/pagina/brief-regels";
import { splitsZinnen } from "@/lib/pagina/harde-beweringen";

export interface ZinnenVerschil {
  /** Zinnen van het model die niet meer in de goedgekeurde tekst staan. */
  geschrapt: string[];
  /** Zinnen in de goedgekeurde tekst die het model niet schreef. */
  toegevoegd: string[];
  /** Hoeveel zinnen van het model ongewijzigd bleven. */
  gebleven: number;
  /** Aandeel ongewijzigde zinnen van het model, of null zonder tekst. */
  aandeelGebleven: number | null;
}

function sleutels(tekst: string): { zin: string; sleutel: string }[] {
  return splitsZinnen(tekst)
    .map((zin) => ({ zin, sleutel: normaliseerVraag(zin) }))
    .filter((z) => z.sleutel);
}

/**
 * Vergelijkt op zinnen, niet op woorden: een ondernemer die één getal
 * verandert, verandert één zin, en dat is precies wat we willen tellen.
 * Hoofdletters en leestekens tellen niet mee, zodat een reparatie van een
 * leesteken door de keten zelf geen wijziging lijkt.
 */
export function zinnenVerschil(machine: string, definitief: string): ZinnenVerschil {
  const m = sleutels(machine);
  const d = sleutels(definitief);
  const inDefinitief = new Set(d.map((z) => z.sleutel));
  const inMachine = new Set(m.map((z) => z.sleutel));
  const gebleven = m.filter((z) => inDefinitief.has(z.sleutel)).length;
  return {
    geschrapt: m.filter((z) => !inDefinitief.has(z.sleutel)).map((z) => z.zin),
    toegevoegd: d.filter((z) => !inMachine.has(z.sleutel)).map((z) => z.zin),
    gebleven,
    aandeelGebleven: m.length > 0 ? gebleven / m.length : null,
  };
}

/** Woorden die in elk antwoord staan en dus niets zeggen over of het gebruikt is. */
const ALLEDAAGS = new Set([
  "hebben", "worden", "kunnen", "moeten", "gewoon", "meestal", "altijd", "eigenlijk", "natuurlijk",
  "mensen", "klanten", "klant", "bijvoorbeeld", "daarna", "eerst", "omdat", "zodat", "zonder", "tussen",
  "ongeveer", "misschien", "vooral", "echter", "waarbij", "waardoor", "hierdoor", "daarom",
]);

/**
 * De kenmerken van een antwoord: de getallen en de woorden van zeven letters
 * of meer. Zeven, omdat kortere woorden ("tuin", "les", "ketel") ook zonder het
 * antwoord in elke tekst over het onderwerp staan.
 */
export function kenmerkenVan(antwoord: string): string[] {
  const plat = antwoord.toLowerCase();
  const getallen = plat.match(/\d+(?:[.,]\d+)?/g) ?? [];
  const woorden = (plat.normalize("NFD").replace(/[̀-ͯ]/g, "").match(/\p{L}{7,}/gu) ?? []).filter((w) => !ALLEDAAGS.has(w));
  return Array.from(new Set([...getallen, ...woorden]));
}

export interface AntwoordGebruik {
  kenmerken: number;
  teruggevonden: number;
  /** Aandeel kenmerken van het antwoord dat in de tekst staat, of null zonder kenmerken. */
  aandeel: number | null;
}

/**
 * Een signaal, geen bewijs: hoeveel van wat alleen in het antwoord stond, in
 * de tekst terugkomt. Een laag aandeel betekent dat de schrijver het antwoord
 * waarschijnlijk niet gebruikte; een hoog aandeel dat de vraag iets opleverde.
 */
export function antwoordGebruik(antwoord: string, tekst: string): AntwoordGebruik {
  const kenmerken = kenmerkenVan(antwoord);
  const plat = tekst.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const teruggevonden = kenmerken.filter((k) => plat.includes(k)).length;
  return { kenmerken: kenmerken.length, teruggevonden, aandeel: kenmerken.length > 0 ? teruggevonden / kenmerken.length : null };
}

export interface MeetPagina {
  titel: string;
  /** De tekst zoals het model hem leverde (`raw_json.uitvoer.tekst_markdown`). */
  machinetekst: string | null;
  /** De tekst zoals hij nu staat (`body_markdown`). */
  definitief: string | null;
  bewerktDoorKlant: boolean;
  goedgekeurd: boolean;
  /** De gevraagde aanpassingen, oudste eerst (`revision_note` van elke versie). */
  aanpassingen: string[];
  geel: string[];
  bevestigd: string[];
  vragen: { vraag: string; status: string; antwoord: string | null }[];
}

function procent(x: number | null): string {
  return x === null ? "onbekend" : `${Math.round(x * 100)}%`;
}

function citaat(zin: string): string {
  return `"${zin.replace(/\s+/g, " ").trim()}"`;
}

/** Het rapport per pagina, in markdown, met de twee vragen die een mens beantwoordt. */
export function meetrapport(paginas: MeetPagina[]): string {
  const delen: string[] = [];
  for (const p of paginas) {
    const regels: string[] = [`## ${p.titel}`, ""];
    regels.push(`- Goedgekeurd: ${p.goedgekeurd ? "ja" : "nee"}. Zelf bewerkt: ${p.bewerktDoorKlant ? "ja" : "nee"}.`);
    regels.push(`- Gevraagde aanpassingen: ${p.aanpassingen.length}.`);
    for (const a of p.aanpassingen) regels.push(`  - ${citaat(a)}`);

    const plat = (t: string) => normaliseerVraag(t);
    const definitiefPlat = plat(p.definitief ?? "");
    const bevestigd = new Set(p.bevestigd.map(plat));
    const bevestigdGeel = p.geel.filter((z) => bevestigd.has(plat(z)));
    const aangepastGeel = p.geel.filter((z) => !bevestigd.has(plat(z)) && !definitiefPlat.includes(plat(z)));
    regels.push(
      `- Gele zinnen: ${p.geel.length}; bevestigd ${bevestigdGeel.length}, aangepast of weggehaald ${aangepastGeel.length}.`,
    );
    for (const z of aangepastGeel) regels.push(`  - niet herkend: ${citaat(z)}`);

    if (p.machinetekst && p.definitief) {
      const v = zinnenVerschil(p.machinetekst, p.definitief);
      regels.push(
        `- Zinnen van het model die bleven: ${v.gebleven} (${procent(v.aandeelGebleven)}). Geschrapt of veranderd: ${v.geschrapt.length}. Nieuw van de ondernemer: ${v.toegevoegd.length}.`,
      );
      if (v.geschrapt.length > 0) {
        regels.push("", "Geschrapt of veranderd:");
        for (const z of v.geschrapt) regels.push(`- ${citaat(z)}`);
      }
      if (v.toegevoegd.length > 0) {
        regels.push("", "Nieuw of in andere woorden:");
        for (const z of v.toegevoegd) regels.push(`- ${citaat(z)}`);
      }
    } else {
      regels.push("- Geen tekst van het model bewaard; het verschil is niet te meten.");
    }

    if (p.vragen.length > 0) {
      regels.push("", "Vragen aan de ondernemer (aandeel van het antwoord dat de schrijver gebruikte):");
      for (const q of p.vragen) {
        // Tegen de tekst van het model: de vraag is of de schrijver het antwoord
        // gebruikte, niet of de ondernemer het er later zelf in zette.
        const tekst = p.machinetekst ?? p.definitief;
        const gebruik = q.antwoord?.trim() && tekst ? antwoordGebruik(q.antwoord, tekst) : null;
        regels.push(`- ${q.vraag} (${q.status}${gebruik ? `, ${procent(gebruik.aandeel)} terug` : ""})`);
      }
    }

    regels.push(
      "",
      "Door een mens in te vullen:",
      "- Raken de wijzigingen vooral feiten, of ook stijl en opbouw?",
      "- Klinkt de tekst volgens de ondernemer als het eigen bedrijf? (ja, grotendeels, nee)",
    );
    delen.push(regels.join("\n"));
  }
  return `# Meting eerste klant\n\n${delen.join("\n\n")}\n`;
}
