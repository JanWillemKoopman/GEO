/**
 * Wie mailen we, en wie zeker niet
 * (`docs/tasks/geo-prospect-engine.md` 9.4).
 *
 * ── DRIE REGELS DIE HARD IN CODE MOETEN ─────────────────────────────────────
 *
 * 1. **Een afgeleid adres is geen adres.** Een gok op `voornaam@domein.nl` mag
 *    opgeslagen worden met het etiket "afgeleid", maar er gaat geen mail naartoe
 *    zonder dat een mens hem heeft bevestigd. "Een mail die stuitert kost je
 *    niets, maar een mail bij de verkeerde persoon kost je het bedrijf."
 * 2. **Liever geen contact dan de verkeerde.** Vindt de stap niemand met genoeg
 *    zekerheid, dan krijgt de opportunity de stand "contact ontbreekt" en
 *    verschijnt hij in een aparte lijst voor handwerk. Hij verdwijnt niet stil
 *    en gaat ook niet stiekem naar het algemene adres. Conventie 3.
 * 3. **De juiste rol, niet zomaar een naam.** Bij een makelaarskantoor is dat de
 *    eigenaar of de commercieel verantwoordelijke, niet de administratief
 *    medewerker die toevallig op de teampagina staat.
 *
 * Bewust ZONDER `server-only` (conventie 2). De regel "mag deze persoon een
 * ontvanger zijn" is de belangrijkste regel van de hele module om te kunnen
 * testen zonder database.
 */

export interface Contactpersoon {
  id?: string;
  naam: string;
  rol: string | null;
  email: string | null;
  emailKind: "gevonden" | "afgeleid";
  telefoon?: string | null;
  bron?: string | null;
  zekerheid: "hoog" | "middel" | "laag";
  /** Gevuld = een mens heeft dit adres bevestigd. */
  verifiedAt?: string | null;
}

/**
 * De rollen die commercieel passen (regel 3).
 *
 * ⚠️ Woordlijsten en geen model. Het is een ja-of-nee-vraag over een functietitel
 * van drie woorden, en een model erop loslaten zou de stap van gratis naar
 * betaald tillen voor iets wat een `includes()` afhandelt. Nederlandse én
 * Engelse varianten, want een deel van de teampagina's is Engels.
 */
const PASSENDE_ROLLEN = [
  "eigenaar",
  "directeur",
  "oprichter",
  "partner",
  "vennoot",
  "manager",
  "commercieel",
  "marketing",
  "sales",
  "owner",
  "founder",
  "director",
  "ceo",
  "cmo",
];

/**
 * Rollen die er juist op wijzen dat dit niet de persoon is.
 *
 * Deze lijst staat er náást de vorige en niet in plaats daarvan: "administratief
 * medewerker marketing" bevat "marketing" en is toch niet de juiste persoon.
 * Een uitsluiting weegt daarom zwaarder dan een treffer.
 */
const VERKEERDE_ROLLEN = [
  "administratief",
  "administratie",
  "receptie",
  "stagiair",
  "assistent",
  "boekhouding",
  "planner",
  "monteur",
  "intern",
];

export function rolPast(rol: string | null | undefined): boolean {
  const tekst = (rol ?? "").toLowerCase();
  if (!tekst) return false;
  if (VERKEERDE_ROLLEN.some((w) => tekst.includes(w))) return false;
  return PASSENDE_ROLLEN.some((w) => tekst.includes(w));
}

export interface OntvangerOordeel {
  ok: boolean;
  /** Waarom deze persoon geen ontvanger mag zijn, in gewone taal. */
  melding: string | null;
}

/**
 * Mag er een mail naar deze persoon?
 *
 * ⚠️ **Dit is een controle in code en niet alleen in de UI** (plan 9.4). Een
 * knop die verborgen is, is geen garantie: er staat straks een lijst met een
 * knop "concept openen" naast, en die route hoort hetzelfde antwoord te geven.
 */
export function magOntvangerZijn(contact: Contactpersoon): OntvangerOordeel {
  const email = (contact.email ?? "").trim();
  if (!email || !email.includes("@")) {
    return {
      ok: false,
      melding:
        "Er is geen mailadres gevonden. Zoek er zelf een op en vul hem in, of bel in plaats van " +
        "te mailen. ORBIT ENGINE gokt er geen.",
    };
  }

  // Regel 1, en dit is de belangrijkste van de drie. Een afgeleid adres is een
  // gok, en een gok die aankomt bij de verkeerde persoon kost het bedrijf.
  if (contact.emailKind === "afgeleid" && !contact.verifiedAt) {
    return {
      ok: false,
      melding:
        `Dit adres is afgeleid en niet gevonden: ORBIT ENGINE heeft hem geraden op basis van het ` +
        "patroon van het bedrijf. Controleer hem eerst en bevestig hem, dan kan de mail eruit.",
    };
  }

  if (!rolPast(contact.rol)) {
    return {
      ok: false,
      melding:
        `De functie "${contact.rol ?? "onbekend"}" past niet bij dit gesprek. Zoek de eigenaar of ` +
        "degene die over de commercie gaat: een mail bij de verkeerde persoon binnen het bedrijf " +
        "komt zelden bij de juiste terecht.",
    };
  }

  return { ok: true, melding: null };
}

/**
 * Een afgeleid adres voorstellen op basis van het patroon van bekende adressen.
 *
 * ⚠️ Dit levert bewust een LABEL mee en geen kant-en-klaar adres. Het patroon
 * wordt alleen afgeleid als er minstens twee bekende adressen op hetzelfde
 * domein zijn: uit één adres een patroon afleiden is geen afleiding maar een
 * aanname met een steekproef van één.
 */
export function leidAdresAf(
  voornaam: string,
  achternaam: string,
  domein: string,
  bekendeAdressen: string[],
): { email: string; patroon: string } | null {
  const opDomein = bekendeAdressen
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a.endsWith(`@${domein.toLowerCase()}`));
  if (opDomein.length < 2) return null;

  const lokaal = opDomein.map((a) => a.split("@")[0]);
  const vn = voornaam.trim().toLowerCase();
  const an = achternaam.trim().toLowerCase();
  if (!vn || !an) return null;

  // Alleen de patronen die echt voorkomen, en alleen als ze bij ALLE bekende
  // adressen kloppen. Eén afwijkend adres betekent dat er geen patroon is.
  const patronen: { naam: string; test: (l: string) => boolean; maak: () => string }[] = [
    {
      naam: "voornaam",
      test: (l) => /^[a-z]+$/.test(l) && !l.includes("."),
      maak: () => `${vn}@${domein}`,
    },
    {
      naam: "voornaam.achternaam",
      test: (l) => /^[a-z]+\.[a-z]+$/.test(l),
      maak: () => `${vn}.${an}@${domein}`,
    },
    {
      naam: "eerste letter plus achternaam",
      test: (l) => /^[a-z]{1}[a-z]+$/.test(l) && l.length <= 12,
      maak: () => `${vn.charAt(0)}${an}@${domein}`,
    },
  ];

  for (const patroon of patronen) {
    if (lokaal.every((l) => patroon.test(l))) {
      return { email: patroon.maak(), patroon: patroon.naam };
    }
  }
  return null;
}

/** De vraag aan het model. Apart, zodat de test hem kan nalezen. */
export function bouwContactVraag(bedrijf: {
  naam: string;
  domein: string | null;
  plaats: string | null;
}): string {
  return [
    `Bedrijf: ${bedrijf.naam}`,
    bedrijf.domein ? `Website: ${bedrijf.domein}` : "Dit bedrijf heeft geen bekende website.",
    bedrijf.plaats ? `Plaats: ${bedrijf.plaats}` : "",
    "",
    "Zoek wie bij dit bedrijf over de commercie gaat: de eigenaar, de directeur, of degene die " +
      "over marketing of verkoop gaat.",
    "Kijk op de eigen website (over ons, team, contact) en op openbare bedrijfsgegevens.",
    "",
    "Geef per persoon:",
    "- de naam zoals hij er staat",
    "- de functie, letterlijk zoals vermeld",
    "- het mailadres als dat er echt staat, anders leeg",
    "- het telefoonnummer als dat er staat",
    "- de pagina waar je dit vond",
    "",
    "Noem geen administratief medewerkers, receptiemedewerkers of stagiairs.",
    "Verzin nooit een mailadres. Een leeg veld is een goed antwoord.",
  ]
    .filter(Boolean)
    .join("\n");
}
