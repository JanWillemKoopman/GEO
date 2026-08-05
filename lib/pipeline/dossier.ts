import "server-only";

/**
 * Het merkdossier, aangeleverd materiaal wordt bevestigde kennis
 * (implementatieplan.md S5, contentbriefing.md §7/§8).
 *
 * ── WAAROM DIT NODIG IS ─────────────────────────────────────────────────────
 *
 * Het enige kanaal waarlangs klantkennis binnenkomt is de briefing: maximaal 8
 * vragen per contentbatch, waarvan er 3 à 4 vaste slots zijn. Wat dat in de
 * praktijk oplevert, gemeten over vijf testklanten: 21 beantwoorde vragen, en
 * daarvan 8 praktisch (telefoon, contact-URL). Van de 35 gestelde
 * `aanvulling`-vragen werden er 7 beantwoord, 20%.
 *
 * De kennisbank die `contentbriefing.md` §7 belooft ("na drie analyses heeft een
 * klant een gevulde feitenbank, en wordt elke volgende pagina beter én sneller
 * geschreven dan de vorige") vult zich met die trechter niet. Niet omdat de
 * klant het niet wíl, maar omdat acht vragen per keer nu eenmaal acht feiten per
 * keer is.
 *
 * Tegelijk heeft vrijwel elke ondernemer het materiaal al liggen: een
 * tarievenpagina, een brochure, een lijst veelgestelde vragen. `contentbriefing.md`
 * §8 noemt dat het bulk-alternatief en zet het op "fase 2, niet MVP". Deze module
 * promoveert het, want het is het verschil tussen 8 vragen en 8 keer "ja".
 *
 * ── HET MODEL SELECTEERT, HET VERZINT NIET ──────────────────────────────────
 *
 * De aanroep hieronder levert vraag/antwoord-paren, en `verifyDossierFacts()`
 * gooit elk paar weg waarvan het antwoord niet letterlijk in het aangeleverde
 * materiaal staat. Zonder dat vangnet zouden deze feiten. Die op de kaart als
 * "door de klant bevestigd" gelden, de hoogste betrouwbaarheid die er is,
 * afgeronde bedragen en samengevatte voorwaarden kunnen bevatten.
 *
 * ── KOSTEN ──────────────────────────────────────────────────────────────────
 *
 * Eén mini-aanroep per aangeleverd document, geen web_search: ongeveer $0,01 bij
 * een tarievenpagina van een paar duizend tekens. Eenmalig per klant per
 * document, dus geen effect op de kosten per analyse of per pagina.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { DossierFacts } from "@/lib/schemas/dossier-facts";
import { verifyDossierFacts, type VerifiedDossierFact } from "@/lib/pipeline/dossier-verify";

/**
 * Hoeveel tekst er per keer verwerkt wordt.
 *
 * Ruim genoeg voor een tarievenpagina, een FAQ of een productblad. Bij meer
 * plakt de klant beter twee keer: dan ziet hij ook per document welke feiten
 * eruit kwamen, en dat is precies het moment waarop hij kan corrigeren.
 */
export const MAX_DOCUMENT_CHARS = 12_000;

const DOSSIER_SYSTEM =
  "Je zet materiaal dat een ondernemer zelf aanlevert om in CONTROLEERBARE FEITEN over zijn " +
  "bedrijf. Je schrijft niets, je vat niets samen, je rekent niets om: je selecteert en ordent. " +
  "OPDRACHT: geef vraag-antwoordparen. De vraag is wat een klant zou vragen; het antwoord is wat " +
  "er letterlijk in het materiaal staat. " +
  "HARDE REGELS: " +
  "(1) Het ANTWOORD moet LETTERLIJK in de aangeleverde tekst voorkomen, teken voor teken. Niet " +
  "afronden ('€ 45,00' wordt niet '45 euro'), niet samenvatten, niet omrekenen, geen 'ongeveer' " +
  "toevoegen. Een bijgeschaafd antwoord wordt weggegooid door de controle die hierachter zit, dus " +
  "dat kost alleen maar een feit. " +
  "(2) Geef bij elk paar de letterlijke ZIN of REGEL uit het materiaal waar het antwoord in staat. " +
  "Het antwoord moet in die zin voorkomen. " +
  "(3) Stel de vraag in gewone taal, zoals een klant hem zou stellen: 'Wat kost een eerste " +
  "consult?', niet 'Tarief consult regulier'. Eén feit per vraag. " +
  "(4) Kies alleen wat HARD is: bedragen, termijnen, aantallen, openingstijden, voorwaarden, wat " +
  "er wel of niet bij zit, namen van diensten of vestigingen. Sfeerteksten en marketingzinnen " +
  "sla je over. Daar kan een pagina niets mee bewijzen. " +
  "(5) Zet `perishable` op true bij alles wat verloopt: prijzen, tarieven, looptijden, " +
  "openingstijden, actievoorwaarden. Op false bij wat blijft: oprichtingsjaar, vestigingsplaats, " +
  "certificeringen. " +
  "(6) Liever tien scherpe feiten dan veertig vage. Bij twijfel: weglaten.";

export interface DossierResult {
  facts: VerifiedDossierFact[];
  /** Hoeveel het model er aandroeg, vóór de controle. Voor de logregel. */
  proposed: number;
}

/**
 * Haalt bevestigde feiten uit door de klant aangeleverd materiaal.
 *
 * Faalt zacht: gaat de aanroep stuk, dan komt er een lege lijst terug. Dit is
 * een verrijking van het profiel, geen voorwaarde om verder te kunnen, zelfde
 * afspraak als bij de concurrentprofilering (R4.2) en de atomiseerstap (S1).
 */
export async function extractDossierFacts(args: {
  documentText: string;
  brandName: string;
  profileId: string;
}): Promise<DossierResult> {
  const tekst = (args.documentText ?? "").trim().slice(0, MAX_DOCUMENT_CHARS);
  if (tekst.length < 40) return { facts: [], proposed: 0 };

  try {
    const result = await callStructured({
      model: MODELS.quality,
      system: DOSSIER_SYSTEM,
      user: [
        `Bedrijf: ${args.brandName}`,
        "",
        "Hieronder het materiaal dat de ondernemer zelf aanleverde. Haal er de controleerbare",
        "feiten uit, als vraag-antwoordparen.",
        "",
        tekst,
      ].join("\n"),
      schema: DossierFacts,
      schemaName: "dossier_facts",
      webSearch: false,
      work: "deterministic",
      meta: { kind: "dossier_extract", profileId: args.profileId },
    });

    return {
      facts: verifyDossierFacts(result.parsed.facts, tekst),
      proposed: result.parsed.facts.length,
    };
  } catch (err) {
    console.warn(`Merkdossier verwerken mislukt voor profiel ${args.profileId}:`, err);
    return { facts: [], proposed: 0 };
  }
}
