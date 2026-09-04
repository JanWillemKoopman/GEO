import "server-only";

/**
 * TWEE VERSIES VAN DEZELFDE PAGINA VERGELIJKEN
 * (optimalisatie 11 uit docs/tasks/optimalisaties-expertronde-4-september-2026.md).
 *
 * ── WAT DEZE STAP OPLOST ────────────────────────────────────────────────────
 *
 * Na elke reparatieronde besliste de app op het VERSCHIL tussen twee absolute
 * cijfers of de nieuwe tekst de oude vervangt. Allebei die cijfers komen van de
 * beoordelaar waarvan gemeten is dat zijn niveau klopt (0,14 punt van het
 * menselijke oordeel) en zijn ordening niet (rangcorrelatie 0,29). Twee punten
 * verschil is bij die betrouwbaarheid ruis, en toch besliste het over welke
 * tekst de klant krijgt en of er nog een ronde van $0,083 volgt.
 *
 * Deze stap stelt in dat geval de vraag die een taalmodel wél betrouwbaar
 * beantwoordt: welke van deze twee zou een goede copywriter eerder naar de
 * klant sturen?
 *
 * ── HIJ DRAAIT ALLEEN BIJ EEN GELIJKSPEL ────────────────────────────────────
 *
 * Verschillen de blokkades, dan beslist code en wordt er niets gevraagd: een
 * versie met één blokkade minder is de betere, wat een model er ook van vindt.
 * Ligt het scoreverschil buiten de ruismarge, dan telt de score. Alleen
 * daartussen wordt deze aanroep gedaan, en dat is precies waar hij iets kan
 * toevoegen. Kosten: ongeveer twee pagina's tekst als invoer op de goedkope
 * tier, in dezelfde orde als een beoordelaar (ongeveer $0,004).
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { VersionCompare } from "@/lib/schemas/version-compare";
import type { WriterBrief } from "@/lib/schemas/writer-brief";

const SYSTEM =
  "Je bent een ervaren copywriter. Je krijgt twee versies van dezelfde webpagina van een " +
  "ondernemer: A is de versie die er nu staat, B is een zojuist gerepareerde versie. " +
  "ÉÉN VRAAG: welke van de twee zou jij eerder naar deze klant sturen? " +
  "Je herschrijft niets, je geeft geen cijfer en je controleert geen feiten: dat doen anderen. " +
  "WAAROP JE LET, in deze volgorde: " +
  "(1) welke versie helpt de lezer beter bij de beslissing die hij moet nemen; " +
  "(2) welke versie maakt duidelijker waarom deze lezer juist dit bedrijf zou kiezen; " +
  "(3) welke versie klinkt meer als de ondernemer zelf en minder als een informatiebank. " +
  "Een versie die netter is opgeschreven maar vager is geworden, is de SLECHTERE. Een reparatie " +
  "die een concreet punt oplost en verder niets aanraakt, is de betere, ook als hij daardoor " +
  "minder glad leest. " +
  "Twijfel je echt, kies dan A: de bestaande tekst vervangen kost een ronde, en een wissel zonder " +
  "reden is verlies. " +
  "Geef in `waarom` één zin die zegt waarop je keuze rust. Antwoord in het Nederlands.";

export interface VergelijkInput {
  /** De tekst die er nu staat. */
  huidig: string;
  /** De zojuist gerepareerde tekst. */
  nieuw: string;
  /** De opdracht waaraan beide versies gemeten horen te worden (optimalisatie 5). */
  opdracht: WriterBrief | null;
  analysisId: string;
  profileId: string | null;
  contentPieceId: string;
}

/**
 * Vraagt welke van twee versies er beter is.
 *
 * Levert `null` zodra de aanroep faalt. Dan valt de beslissing terug op de
 * regel van vóór deze stap, en dat is precies goed: een gevallen beoordelaar
 * mag nooit als oordeel gelden (conventie 3).
 */
export async function vergelijkVersies(
  input: VergelijkInput,
): Promise<{ beter: "huidig" | "nieuw"; waarom: string } | null> {
  const opdrachtblok = input.opdracht
    ? [
        "DE OPDRACHT DIE DEZE PAGINA MEEKREEG, meet beide versies hieraan:",
        `- geschreven voor: ${input.opdracht.lezer}`,
        `- wat de lezer moet begrijpen: ${input.opdracht.kernantwoord}`,
        `- waarom hij juist dit bedrijf zou kiezen: ${input.opdracht.keuzeredenen
          .map((k) => k.reden)
          .join("; ")}`,
        "",
      ].join("\n")
    : "";

  try {
    const result = await callStructured({
      model: MODELS.quality,
      system: SYSTEM,
      user: [
        opdrachtblok,
        "── VERSIE A, de tekst die er nu staat ──",
        input.huidig,
        "",
        "── VERSIE B, de zojuist gerepareerde tekst ──",
        input.nieuw,
      ]
        .filter(Boolean)
        .join("\n"),
      schema: VersionCompare,
      schemaName: "version_compare",
      webSearch: false,
      work: "judging",
      meta: {
        kind: "content_version_compare",
        analysisId: input.analysisId,
        profileId: input.profileId ?? undefined,
        contentPieceId: input.contentPieceId,
      },
    });
    return {
      beter: result.parsed.beter === "B" ? "nieuw" : "huidig",
      waarom: result.parsed.waarom?.trim() ?? "",
    };
  } catch (err) {
    console.warn(`De versievergelijking mislukte, de score beslist: ${String(err)}`);
    return null;
  }
}
