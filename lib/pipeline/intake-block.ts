/**
 * Wat er vóór het onderzoek al bekend was, als promptblok.
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS (onboarding 3.0, fase 2) ─────────────────
 *
 * Dit blok stond in `profile-research.ts` en zei tegen het model: "RESPECTEER
 * dit, verzin geen andere merknaam, branche of concurrenten". Dat is precies
 * goed voor wat de klant zelf heeft gezegd, en precies verkeerd voor wat de
 * consultant vóór het eerste contact heeft ingevuld.
 *
 * Het verschil is niet cosmetisch. Sinds migratie 0060 zet de consultant een
 * merk klaar vóór hij de klant ooit gesproken heeft: drie velden, een
 * onderbouwde aanname. Kwam die aanname als klantwaarde binnen, dan legde hij
 * het eigen marktonderzoek stil, want het model mag een klantwaarde niet
 * tegenspreken. Een consultant-aanname mag dat wel, en dan is het onderzoek
 * waar het voor bedoeld is: een tweede paar ogen.
 *
 * Puur en zonder `server-only`, zodat `scripts/test-unit.ts` kan nakijken dat de
 * twee lijsten uit elkaar gehouden worden (conventie 2).
 */
import type { FieldSource } from "@/lib/types/database";

/** Wat er vóór het onderzoek al is vastgelegd (leidend, zie prepare-profile.ts). */
export interface ClientIntake {
  name?: string | null;
  aliases?: string[];
  description?: string | null;
  industry?: string | null;
  products?: string[];
  valueProps?: string[];
  competitors?: string[];
  serviceScope?: string | null;
  serviceRegions?: string[];
  marketLanguage?: string | null;
  toneOfVoice?: string | null;
  audience?: string | null;
  /**
   * Per kolomnaam wie de waarde zette, uit `profile_field_sources`. Ontbreekt
   * hij, dan geldt de oude lezing: alles is bevestigd. Dat is de veilige kant,
   * want dan blijft het model van de waarde af.
   */
  sources?: Record<string, FieldSource | undefined>;
}

/**
 * Eén regel van het blok: welke kolom het is, hoe hij in de prompt heet, en wat
 * erin staat. De kolomnaam is de sleutel waarmee de herkomst wordt opgezocht.
 */
interface IntakeLine {
  column: string;
  label: string;
  value: string;
}

function linesOf(intake: ClientIntake): IntakeLine[] {
  const lijst = (v: string[] | undefined) => (v?.length ? v.join(", ") : "");
  const tekst = (v: string | null | undefined) => (v ?? "").trim();

  const kandidaten: IntakeLine[] = [
    { column: "name", label: "Bedrijfsnaam", value: tekst(intake.name) },
    { column: "aliases", label: "Ook bekend als", value: lijst(intake.aliases) },
    { column: "intake_description", label: "Omschrijving", value: tekst(intake.description) },
    { column: "industry", label: "Branche", value: tekst(intake.industry) },
    { column: "products", label: "Producten en diensten", value: lijst(intake.products) },
    { column: "value_props", label: "Waardeproposities", value: lijst(intake.valueProps) },
    { column: "competitors", label: "Concurrenten", value: lijst(intake.competitors) },
    { column: "service_scope", label: "Bereik", value: tekst(intake.serviceScope) },
    { column: "service_regions", label: "Werkgebied", value: lijst(intake.serviceRegions) },
    { column: "market_language", label: "Markt en taal", value: tekst(intake.marketLanguage) },
    { column: "tone_of_voice", label: "Gewenste tone-of-voice", value: tekst(intake.toneOfVoice) },
    { column: "intake_audience", label: "Doelgroep", value: tekst(intake.audience) },
  ];

  return kandidaten.filter((l) => l.value !== "");
}

/**
 * Splitst de bekende gegevens in twee blokken met een tegengestelde instructie.
 *
 * ⚠️ Ontbreekt de herkomst van een veld, dan telt hij als bevestigd. Een
 * aanname per ongeluk als vaststaand behandelen kost een verrijking; een
 * bevestigd feit per ongeluk als aanname behandelen laat het model de klant
 * tegenspreken, en dat is de duurdere fout.
 */
export function buildIntakeBlock(intake?: ClientIntake): string {
  if (!intake) return "";
  const regels = linesOf(intake);
  if (regels.length === 0) return "";

  const bron = (column: string) => intake.sources?.[column];
  const aannames = regels.filter((l) => bron(l.column) === "consultant");
  const bevestigd = regels.filter((l) => bron(l.column) !== "consultant");

  const blokken: string[] = [];

  if (bevestigd.length > 0) {
    blokken.push(
      `\n\nDit is over dit bedrijf al VASTGESTELD. RESPECTEER het: verzin geen andere ` +
        `merknaam, branche of concurrenten als die gegeven zijn, en gebruik het als leidraad; ` +
        `VUL de rest aan en verrijk:\n` +
        bevestigd.map((l) => `${l.label}: ${l.value}`).join("\n"),
    );
  }

  if (aannames.length > 0) {
    blokken.push(
      `\n\nDit is door een adviseur INGEVULD VÓÓR het gesprek met de klant, op basis van een ` +
        `eerste indruk. Behandel het als startpunt en niet als feit: klopt het met wat je op de ` +
        `site en op het web vindt, neem het dan over; vind je iets anders, geef dan je eigen ` +
        `bevinding en niet deze aanname:\n` +
        aannames.map((l) => `${l.label}: ${l.value}`).join("\n"),
    );
  }

  return blokken.join("");
}
