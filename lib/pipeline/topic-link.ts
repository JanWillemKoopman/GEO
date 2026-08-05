/**
 * De koppeling tussen een onderwerp en het aanbod waar het uit volgt.
 *
 * ── WAAROM DIT EEN EIGEN, PURE MODULE IS ────────────────────────────────────
 *
 * `profile_topics.offering_ids` is een `uuid[]`, en Postgres kan geen foreign
 * key leggen op een element ván een array. De verwijzing wordt dus door niets
 * bewaakt, en dat gaat één keer mis op een voorspelbaar moment:
 *
 *   "Onderzoek opnieuw" verwijdert alle aanbodknopen met bron `ai` (anders slaat
 *   `buildOfferingTree()` zichzelf over) en laat de topics staan (dat zijn
 *   beslissingen van de klant, soms met een lopende analyse eraan). Daarna
 *   wijzen alle offering_ids naar rijen die niet meer bestaan. Geen foutmelding,
 *   geen lege lijst, een lijst met id's die nergens op uitkomen.
 *
 * Migratie 0043 zet de NAMEN ernaast, want die overleven een herbouw:
 * "Bekkenfysiotherapie" heet na een tweede crawl nog steeds zo. Deze module
 * bepaalt wat de nieuwe id-lijst moet worden; `offering.ts` schrijft hem weg.
 *
 * Puur, dus testbaar (conventie 2), en dat is hier geen formaliteit: dit is
 * precies het soort logica dat alleen fout gaat in de samenhang tussen twee
 * stappen, en dan zonder dat er iets omvalt.
 */

/** Een knoop zoals hij ná de herbouw in de database staat. */
export interface LinkableNode {
  id: string;
  name: string;
}

export interface TopicLinks {
  offering_ids: string[];
  offering_names: string[];
}

/**
 * Wat de `offering_ids` van dit onderwerp moeten worden na een herbouw van de
 * boom, of `null` als er niets te veranderen valt.
 *
 * Twee bronnen worden samengevoegd:
 *
 *   1. Id's die nog wél bestaan. Een herhaalronde laat knopen met bron `klant`
 *      of `gesprek` staan; die verwijzingen zijn nog goed en mogen niet
 *      sneuvelen omdat ze toevallig niet in `offering_names` voorkomen.
 *   2. Id's die we op naam terugvinden in de nieuwe boom.
 *
 * Een naam die nergens meer op uitkomt verdwijnt stilzwijgend, en dat is de
 * bedoeling: de dienst staat niet meer op de site. Een lege lijst is dan een
 * eerlijker antwoord dan een verwijzing naar iets wat er niet is (conventie 3).
 */
export function relinkOfferingIds(
  topic: TopicLinks,
  nodes: LinkableNode[],
): string[] | null {
  if (topic.offering_names.length === 0) return null;

  const idByName = new Map(
    nodes.map((n) => [n.name.trim().toLowerCase(), n.id]),
  );
  const bestaand = new Set(nodes.map((n) => n.id));

  const nogGeldig = topic.offering_ids.filter((id) => bestaand.has(id));
  const opnieuw = topic.offering_names
    .map((naam) => idByName.get(naam.trim().toLowerCase()))
    .filter((id): id is string => Boolean(id));

  const nieuw = [...new Set([...nogGeldig, ...opnieuw])];

  const ongewijzigd =
    nieuw.length === topic.offering_ids.length &&
    nieuw.every((id, i) => id === topic.offering_ids[i]);

  return ongewijzigd ? null : nieuw;
}
