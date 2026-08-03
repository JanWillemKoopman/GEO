/**
 * Entiteitsconsistentie: heet dit bedrijf overal hetzelfde?
 * (docs/tasks/onboarding-2.0.md, blok B fase 4)
 *
 * ── WAAROM DIT ERBIJ KOMT ───────────────────────────────────────────────────
 *
 * De technische audit keek tot nu alleen of AI-crawlers de site mochten
 * bezoeken. Dat is de deur. Dit gaat over wat er achter die deur te herkennen
 * valt.
 *
 * AI-systemen bouwen een beeld van een bedrijf op door vermeldingen aan elkaar
 * te knopen. Staat er op de ene pagina "Jansen Bouw", in de JSON-LD "Jansen Bouw
 * B.V.", in de footer "Bouwbedrijf Jansen" en op LinkedIn weer iets anders, dan
 * krijgt zo'n systeem vier zwakke signalen in plaats van één sterk. Dat is
 * precies het punt dat InSpace maakt in hun drie-pijlers-artikel, en het is een
 * bevinding die niemand in dit segment een MKB'er geeft.
 *
 * ── WAAROM DIT NUL KOST ─────────────────────────────────────────────────────
 *
 * Alle invoer komt uit fase 0, die de site toch al uitkamde. Geen extra fetch,
 * geen AI-aanroep. Puur, dus testbaar (conventie 2).
 */
import type { AuditCheck } from "@/lib/audit/technical";

export interface EntityConsistencyInput {
  /** De canonieke naam zoals de klant hem opgaf. */
  brandName: string;
  /** Naamvarianten uit JSON-LD, og:site_name en `<title>` — uit fase 0. */
  foundNames: string[];
  /** Aliassen die de klant zelf opgaf; die tellen niet als afwijking. */
  aliases: string[];
  /** `sameAs`-verwijzingen uit de gestructureerde data. */
  sameAs: string[];
  /** Alle schema.org-types die ergens op de site voorkomen. */
  schemaTypes: string[];
  /** Op hoeveel pagina's stond überhaupt gestructureerde data? */
  pagesWithSchema: number;
  pagesCrawled: number;
  /** Pagina's waarvan de tekst pas met JavaScript verschijnt. */
  clientRenderedPages: number;
  wikidataId: string | null;
  wikipediaUrl: string | null;
}

/**
 * Vergelijkt twee namen los van hoofdletters, leestekens en rechtsvormen.
 *
 * "Jansen Bouw B.V." en "jansen bouw" zijn hetzelfde bedrijf en horen geen
 * bevinding op te leveren — anders staat er bij elke klant met een B.V. een
 * waarschuwing die niets betekent, en dan leest niemand de audit meer.
 */
export function normalizeBrand(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(b\.?v\.?|n\.?v\.?|v\.?o\.?f\.?|holding|group|groep|nederland)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Is dit dezelfde naam, afgezien van schrijfwijze en rechtsvorm? */
export function sameBrand(a: string, b: string): boolean {
  const na = normalizeBrand(a);
  const nb = normalizeBrand(b);
  if (!na || !nb) return false;
  // Ook een echte deelverzameling telt: "jansen bouw" in "jansen bouw amersfoort".
  return na === nb || na.includes(nb) || nb.includes(na);
}

/** Welke platforms herkennen we in een sameAs-verwijzing? */
function platformOf(url: string): string | null {
  const l = url.toLowerCase();
  if (l.includes("linkedin.")) return "LinkedIn";
  if (l.includes("wikipedia.")) return "Wikipedia";
  if (l.includes("wikidata.")) return "Wikidata";
  if (l.includes("facebook.")) return "Facebook";
  if (l.includes("instagram.")) return "Instagram";
  if (l.includes("youtube.")) return "YouTube";
  if (l.includes("x.com") || l.includes("twitter.")) return "X";
  return null;
}

export function entityConsistencyChecks(input: EntityConsistencyInput): AuditCheck[] {
  const checks: AuditCheck[] = [];

  // ── 1. Eén naam of vier? ─────────────────────────────────────────────────
  const bekend = [input.brandName, ...input.aliases];
  const afwijkend = input.foundNames.filter(
    (n) => n.trim() !== "" && !bekend.some((b) => sameBrand(b, n)),
  );

  if (input.foundNames.length === 0) {
    checks.push({
      id: "entity.name",
      label: "Naamconsistentie",
      severity: "unknown",
      finding: "We vonden geen bedrijfsnaam in de opmaak van de site.",
      fix: "Laat je websitebouwer schema.org-opmaak toevoegen met de officiële bedrijfsnaam.",
      who: "je websitebouwer",
    });
  } else if (afwijkend.length === 0) {
    checks.push({
      id: "entity.name",
      label: "Naamconsistentie",
      severity: "ok",
      finding: `De site noemt het bedrijf consequent "${input.brandName}".`,
      fix: null,
      who: null,
    });
  } else {
    checks.push({
      id: "entity.name",
      label: "Naamconsistentie",
      severity: "warning",
      finding:
        `Naast "${input.brandName}" staat het bedrijf op de site ook als ` +
        `${afwijkend.map((n) => `"${n}"`).join(", ")}. AI-systemen zien dat als losse ` +
        `vermeldingen en niet als één bedrijf.`,
      fix:
        "Kies één schrijfwijze en gebruik die overal: op de site, in de schema-opmaak en op je " +
        "sociale profielen. Zijn het bewust verschillende namen, voeg ze dan hier toe als " +
        "alternatieve schrijfwijze — dan telt de meting ze wél mee.",
      who: "jijzelf of je websitebouwer",
    });
  }

  // ── 2. Verwijzingen naar externe profielen ───────────────────────────────
  const platforms = [...new Set(input.sameAs.map(platformOf).filter((p): p is string => p !== null))];
  checks.push(
    platforms.length > 0
      ? {
          id: "entity.sameas",
          label: "Koppeling met externe profielen",
          severity: "ok",
          finding: `De site verwijst in zijn opmaak naar ${platforms.join(", ")}.`,
          fix: null,
          who: null,
        }
      : {
          id: "entity.sameas",
          label: "Koppeling met externe profielen",
          severity: "warning",
          finding:
            "De site legt in zijn opmaak geen verband met externe profielen (LinkedIn, Wikipedia, sociale media).",
          fix:
            "Laat een `sameAs`-lijst toevoegen aan de schema.org-opmaak, met de adressen van je " +
            "sociale profielen. Dat is de manier waarop een AI-systeem bevestigt dat het over " +
            "hetzelfde bedrijf gaat.",
          who: "je websitebouwer",
        },
  );

  // ── 3. Dekking van de gestructureerde data ───────────────────────────────
  const dekking =
    input.pagesCrawled > 0 ? Math.round((input.pagesWithSchema / input.pagesCrawled) * 100) : 0;
  if (input.pagesWithSchema === 0) {
    checks.push({
      id: "entity.schema",
      label: "Gestructureerde data",
      severity: "warning",
      finding: `Geen enkele van de ${input.pagesCrawled} gecontroleerde pagina's heeft schema.org-opmaak.`,
      fix:
        "Laat op zijn minst een Organization- of LocalBusiness-blok toevoegen met naam, adres en " +
        "telefoonnummer. Dat is de goedkoopste manier om herkenbaar te worden voor AI-systemen.",
      who: "je websitebouwer",
    });
  } else {
    const kern = ["Organization", "LocalBusiness"].filter((t) => input.schemaTypes.includes(t));
    checks.push({
      id: "entity.schema",
      label: "Gestructureerde data",
      severity: kern.length > 0 ? "ok" : "warning",
      finding:
        `${dekking}% van de pagina's heeft schema.org-opmaak` +
        (input.schemaTypes.length > 0 ? ` (${input.schemaTypes.slice(0, 6).join(", ")})` : "") +
        ".",
      fix:
        kern.length > 0
          ? null
          : "Er is wel opmaak, maar geen Organization- of LocalBusiness-blok. Juist dát blok vertelt een AI-systeem wíé je bent.",
      who: kern.length > 0 ? null : "je websitebouwer",
    });
  }

  // ── 4. De zwaarste bevinding die er bestaat ──────────────────────────────
  if (input.clientRenderedPages > 0) {
    const aandeel =
      input.pagesCrawled > 0
        ? Math.round((input.clientRenderedPages / input.pagesCrawled) * 100)
        : 0;
    checks.push({
      id: "entity.rendering",
      label: "Tekst zichtbaar zonder JavaScript",
      // Boven de helft is dit geen aandachtspunt maar een blokkade: dan is de
      // site voor een AI-assistent grotendeels leeg, en heeft betere content
      // geen enkel effect.
      severity: aandeel >= 50 ? "blocker" : "warning",
      finding:
        `Bij ${input.clientRenderedPages} van de ${input.pagesCrawled} pagina's (${aandeel}%) ` +
        `verschijnt de tekst pas nadat JavaScript is uitgevoerd. AI-crawlers doen dat niet.`,
      fix:
        "Laat de belangrijkste pagina's server-side renderen (of prerenderen). Zolang dit zo is, " +
        "leest een AI-assistent een lege pagina — hoe goed de tekst ook is.",
      who: "je websitebouwer",
    });
  }

  // ── 5. Bekend als entiteit? ──────────────────────────────────────────────
  const inKennisbank = Boolean(input.wikidataId || input.wikipediaUrl);
  checks.push({
    id: "entity.knowledge",
    label: "Bekend als entiteit",
    // Bewust géén warning: voor een MKB-bedrijf is ontbreken op Wikidata de
    // norm en geen fout. Het is een kans, en zo hoort het te lezen.
    severity: inKennisbank ? "ok" : "unknown",
    finding: inKennisbank
      ? "Het bedrijf komt voor in Wikidata of Wikipedia — een sterk herkenningssignaal."
      : "Het bedrijf staat niet in Wikidata of Wikipedia. Voor een MKB-bedrijf is dat normaal.",
    fix: inKennisbank
      ? null
      : "Een Wikidata-vermelding is gratis aan te maken en is een van de sterkste signalen dat een bedrijf bestaat. De moeite waard zodra er iets verifieerbaars over je geschreven is.",
    who: inKennisbank ? null : "jijzelf",
  });

  return checks;
}
