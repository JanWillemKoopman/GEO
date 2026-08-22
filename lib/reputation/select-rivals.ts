/**
 * Tegen wie vergelijken we? (§4.4)
 *
 * Bewust ZONDER `server-only` (conventie 2). Wie er in de vergelijking komt
 * bepaalt de uitkomst van blok V volledig, dus dat hoort testbaar te zijn.
 *
 * ── DE VOLGORDE VAN DE BRONNEN, EN WAAROM DIE ZO IS ─────────────────────────
 *
 *   1. Concurrenten die uit de METINGEN zijn gekomen. Dit is het sterkste
 *      signaal dat er is: die namen zijn niet bedacht maar waargenomen, ze
 *      kwamen naar boven toen een AI-assistent een echte koopvraag beantwoordde.
 *   2. Anders de concurrenten uit het profielonderzoek. Zwakker, want dat is een
 *      oordeel van het model over de markt en geen waarneming. Bij een merk
 *      zonder metingen is het het enige dat er is.
 *   3. Anders GEEN vergelijking. Geen namen verzinnen, geen "vergelijkbare
 *      bedrijven in de regio". De run gaat gewoon door zonder blok V,
 *      `rank_score` blijft null, en het scherm zegt waarom. Conventie 3.
 *
 * ── ⚠️ WAT DE KLANT HEEFT WEGGEZET, GAAT ER NOOIT IN ────────────────────────
 *
 * `entities.dismissed` is een expliciete beslissing van de klant dat iets geen
 * concurrent van hem is. Een vergelijking tegen een partij die hij zelf heeft
 * afgewezen kost het vertrouwen in het hele scherm, en terecht: hij heeft die
 * knop niet voor niets ingedrukt.
 *
 * Hetzelfde geldt voor `entity_role` anders dan 'concurrent'. Een marktplaats of
 * een brancheorganisatie komt wél uit de metingen maar hoort hier niet tussen:
 * "wie levert het beste werk, jij of Werkspot" is geen vraag met een antwoord.
 * Die classificatie bestaat al sinds migratie 0026 en hoeft alleen gelezen te
 * worden.
 */
import type { Entity } from "@/lib/types/database";

/**
 * Hooguit drie concurrenten, dus vier partijen.
 *
 * Daarboven gaat een model namen laten vallen, dubbel rangschikken of partijen
 * samenvoegen, en dan meet je de aandacht van het model in plaats van de markt.
 * Drie is ook wat een koper zelf naast elkaar legt.
 */
export const MAX_RIVALS = 3;

export interface RivalCandidate {
  entity: Entity;
  /** Vermeldingen in `competitor_breakdown` over de laatste afgeronde periode. */
  mentions: number;
}

export interface SelectRivalsArgs {
  /** Alle entiteiten van dit merk, met hun gemeten aantal vermeldingen. */
  measured: RivalCandidate[];
  /** `profiles.competitors`: de terugval als er niets gemeten is. */
  researched: string[];
  /** De eigen namen. Een merk vergelijkt zich niet met zichzelf. */
  ownNames: string[];
  limit?: number;
}

export interface RivalSelection {
  names: string[];
  /** Waar deze set vandaan komt. Gaat mee naar `scope_json` en naar het scherm. */
  source: "gemeten" | "onderzoek" | "geen";
  /** De zin die het scherm toont onder de vergelijkingstabel. */
  reason: string;
}

/** Losse namen vergelijken zonder over hoofdletters of spaties te struikelen. */
function sleutel(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Kiest de vaste set concurrenten voor de hele run.
 *
 * ⚠️ EEN SET VOOR DE HELE RUN, en niet per aanbodknoop opnieuw. Zou de set per
 * knoop verschillen, dan is de uitkomst per knoop niet meer met de andere te
 * vergelijken, en juist die vergelijking is de zin "je wint bij onderhoud en
 * verliest bij nieuwbouw". Vandaar dat deze functie één keer draait, in
 * `reputation_start`, en dat het resultaat in `reputation_runs.rivals` staat.
 */
export function selectRivals(args: SelectRivalsArgs): RivalSelection {
  const limit = args.limit ?? MAX_RIVALS;
  const eigen = new Set(args.ownNames.map(sleutel).filter(Boolean));

  const gemeten = args.measured
    .filter(
      (c) =>
        c.entity.entity_role === "concurrent" &&
        !c.entity.dismissed &&
        !eigen.has(sleutel(c.entity.canonical_name)),
    )
    // Op vermeldingen aflopend; bij gelijkspel op naam, zodat twee runs op
    // dezelfde data dezelfde set opleveren.
    .sort(
      (a, b) =>
        b.mentions - a.mentions ||
        a.entity.canonical_name.localeCompare(b.entity.canonical_name),
    )
    .slice(0, limit)
    .map((c) => c.entity.canonical_name);

  if (gemeten.length > 0) {
    return {
      names: gemeten,
      source: "gemeten",
      reason:
        gemeten.length === 1
          ? "Deze partij kwam als concurrent uit je metingen naar boven."
          : `Deze ${gemeten.length} partijen kwamen het vaakst als concurrent uit je metingen naar boven.`,
    };
  }

  // Terugval: het profielonderzoek. Ontdubbeld en zonder de eigen namen, want
  // het onderzoek noemt het merk zelf geregeld in dezelfde lijst.
  const gezien = new Set<string>();
  const uitOnderzoek: string[] = [];
  for (const raw of args.researched) {
    const naam = raw.trim();
    const k = sleutel(naam);
    if (!naam || !k || eigen.has(k) || gezien.has(k)) continue;
    gezien.add(k);
    uitOnderzoek.push(naam);
    if (uitOnderzoek.length >= limit) break;
  }

  if (uitOnderzoek.length > 0) {
    return {
      names: uitOnderzoek,
      source: "onderzoek",
      reason:
        "Deze partijen komen uit het onderzoek naar je markt. Er zijn nog geen metingen " +
        "waaruit blijkt wie AI daadwerkelijk naast je noemt.",
    };
  }

  return {
    names: [],
    source: "geen",
    reason:
      "ORBIT ENGINE kent nog geen concurrenten van je. Zodra er metingen zijn, komen ze " +
      "hieruit naar boven en kan de vergelijking wel.",
  };
}
