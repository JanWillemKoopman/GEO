import "server-only";

/**
 * De VRAGENBEOORDELAAR: één kleine modelaanroep per voorbereidingsronde die
 * aanwijst welke nieuwe vragen aan de klant in essentie hetzelfde vragen als
 * een bestaande of een andere nieuwe vraag (punt 57 van de
 * kwaliteitsdoorlichting, reparatieplan blok I, 25 september 2026).
 *
 * Waarom een model: "Voert u de oude ketel af?" en "Wat zit bij een
 * ketelvervanging inbegrepen?" delen bijna geen woorden, en `topicKey()` ziet
 * ze dus als twee onderwerpen. Of de ene vraag met het antwoord op de andere
 * vervalt, is een vraag naar betekenis.
 *
 * Wat de code ermee doet, en waar het oordeel niet geldt, staat in
 * `vraag-samenvoegen.ts`. Een mislukte aanroep geeft `null`, en dan gaan de
 * vragen erin zoals voor deze reparatie.
 *
 * Kosten: goedkope tier met redeneertijd, zelfde soort aanroep als de
 * zinnenbeoordelaar van blok G ($0,0010 per keer gemeten). Alleen als er
 * minstens twee vragen zijn om te vergelijken.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { VraagJudgeVerdict } from "@/lib/schemas/vraag-judge";
import type { BestaandeVraag, VraagOordeel } from "@/lib/pipeline/vraag-samenvoegen";

/** Hooguit zoveel bestaande vragen gaan mee; de meest recente eerst. */
const MAX_BESTAAND = 60;

const SYSTEM =
  "Je helpt een ondernemer tijd besparen. Hij krijgt vragen over zijn bedrijf, zodat er juiste teksten " +
  "over hem geschreven kunnen worden. Hij hoort niet twee keer hetzelfde gevraagd te worden. " +
  "Je krijgt BESTAANDE vragen (B1, B2, ...), met of ze open, beantwoord of overgeslagen zijn, en NIEUWE " +
  "vragen (N1, N2, ...). Bepaal per nieuwe vraag of hij in essentie hetzelfde vraagt als een bestaande " +
  "vraag of als een EERDERE nieuwe vraag. Hetzelfde betekent: het antwoord op de ene vraag beantwoordt " +
  "de andere ook, of de ene is een onderdeel van de andere. 'Voert u de oude ketel af?' en 'Welke " +
  "onderdelen haalt u los?' zijn allebei onderdeel van 'Wat zit er bij een ketelvervanging " +
  "inbegrepen?'. Een vraag over de prijs en een vraag over wat erbij zit, zijn NIET hetzelfde. " +
  "Geef bij een nieuwe vraag die hetzelfde vraagt het nummer van de bredere vraag (B-nummer, of een " +
  "N-nummer lager dan die van de vraag zelf). Vraagt hij iets eigens, geef dan null. Bij twijfel: null. " +
  "Geef per vraag in één korte zin de reden. Antwoord in het Nederlands.";

export async function beoordeelVragen(args: {
  nieuw: string[];
  bestaande: BestaandeVraag[];
  analysisId: string;
  profileId: string | null;
}): Promise<{ oordelen: VraagOordeel[]; bestaande: BestaandeVraag[]; raw: unknown } | null> {
  const bestaande = args.bestaande.slice(0, MAX_BESTAAND);
  if (args.nieuw.length === 0 || args.nieuw.length + bestaande.length < 2) {
    return { oordelen: [], bestaande, raw: null };
  }
  try {
    const user = [
      "BESTAANDE VRAGEN:",
      ...(bestaande.length > 0
        ? bestaande.map((v, i) => `B${i + 1} (${v.status}): ${v.question}`)
        : ["(geen)"]),
      "",
      "NIEUWE VRAGEN:",
      ...args.nieuw.map((v, i) => `N${i + 1}: ${v}`),
    ].join("\n");
    const res = await callStructured({
      model: MODELS.quality,
      system: SYSTEM,
      user,
      schema: VraagJudgeVerdict,
      schemaName: "briefing_vraag_judge",
      webSearch: false,
      work: "judging",
      meta: { kind: "briefing_vraag_judge", analysisId: args.analysisId, profileId: args.profileId ?? undefined },
    });
    return {
      oordelen: res.parsed.vragen.map((v) => ({ nummer: v.nummer, zelfdeAls: v.zelfdeAls?.trim() || null })),
      bestaande,
      raw: res.raw,
    };
  } catch (err) {
    console.warn(`Vragenbeoordeling mislukt, de vragen gaan erin zoals ze zijn: ${String(err)}`);
    return null;
  }
}
