/**
 * Feiten samenvoegen met de feitenbank (migratie 0036).
 *
 * ── WAAROM FEITEN EEN IDENTITEIT NODIG HEBBEN ───────────────────────────────
 *
 * Een F-nummer is een POSITIE, geen identiteit: "F3" betekent "het derde
 * citeerbare feit in deze lijst". Voeg er één toe en alles schuift.
 *
 * Dat is aantoonbaar, niet theoretisch. In de ketentest verwees de teststub naar
 * F1 en F2; zodra er vier klantantwoorden bijkwamen werden dat F5 en F6, omdat
 * klantantwoorden vooraan sorteren (`SOURCE_ORDER`). De test viel daar terecht
 * op om. Bij de echte Fysi-Unique-pagina bleven de nummers tussen versie 1 en 2
 * gelijk, maar alleen omdat er niets bijkwam.
 *
 * Zolang een feit alleen als positie in een JSON-lijst bestaat, kun je van
 * `claims_json` niet zeggen naar wélk feit een bewering verwees. Deze module is
 * het rekenwerk dat daar identiteit aan geeft: wat is nieuw, wat is ongewijzigd,
 * en wat vervangt iets wat er al stond.
 *
 * ── TEGENSPRAAK IS DE INTERESSANTE UITKOMST ─────────────────────────────────
 *
 * Twee feiten met dezelfde `factKey` gaan over hetzelfde. Verschilt hun tekst,
 * dan is dat geen dubbeling maar een TEGENSPRAAK: en die hoort getoond te
 * worden in plaats van stilzwijgend opgelost. Precies dat ging mis in de
 * contentronde van 31 juli: op de kaart stonden zowel het oude als het nieuwe
 * antwoord, en het model mocht kiezen welk het aanhaalde.
 *
 * Bewust ZONDER `server-only`: pure vergelijking, testbaar in een kaal script.
 */
import { normalizeForQuote } from "@/lib/pipeline/factcard";

/** Een feit zoals het in de feitenbank staat. */
export interface StoredFact {
  id: string;
  text: string;
  source: string;
  kind: string;
  citable: boolean;
  allowed: boolean;
  factKey: string;
}

/** Een feit zoals het uit een bron komt, vóór het een identiteit heeft. */
export interface IncomingFact {
  text: string;
  source: string;
  sourceUrl?: string | null;
  kind: "klant" | "site" | "onderzoek";
  citable: boolean;
  allowed: boolean;
  factKey: string;
  verifyAfter?: string | null;
  originFactRequestId?: string | null;
  originDocumentId?: string | null;
}

/** Twee uitspraken over hetzelfde onderwerp die elkaar niet verdragen. */
export interface Contradiction {
  factKey: string;
  oud: string;
  nieuw: string;
  /** true = de klant zei eerder iets anders. Dat weegt zwaarder dan een sitewijziging. */
  vanKlant: boolean;
  /** true = het gaat van mag-wel naar mag-niet of andersom. Het scherpste geval. */
  omgekeerd: boolean;
}

export interface MergePlan {
  /** Feiten die er nog niet waren. */
  insert: IncomingFact[];
  /** Feiten die een bestaand feit vervangen; het oude blijft bewaard. */
  supersede: { oldId: string; by: IncomingFact }[];
  /** Ids die ongemoeid blijven, zelfde sleutel, zelfde tekst. */
  unchanged: string[];
  /** Wat de klant zou moeten zien. */
  contradictions: Contradiction[];
}

/**
 * Bepaalt wat er met de feitenbank moet gebeuren.
 *
 * Puur: geen database, geen tijd, geen willekeur. Dezelfde invoer geeft altijd
 * hetzelfde plan, en dat is wat het testbaar maakt.
 *
 * ── WAAROM NIET GEWOON OVERSCHRIJVEN ────────────────────────────────────────
 *
 * Een feit dat de klant bijstelt blijft bestaan (`superseded_by`). Anders is een
 * al geschreven pagina die ernaar verwijst niet meer na te trekken, en dat is
 * precies de traceerbaarheid die R5 opleverde. Verwijderen is goedkoper en maakt
 * de audit-trail waardeloos.
 */
export function planFactMerge(existing: StoredFact[], incoming: IncomingFact[]): MergePlan {
  const perSleutel = new Map<string, StoredFact>();
  for (const feit of existing) perSleutel.set(feit.factKey, feit);

  const plan: MergePlan = { insert: [], supersede: [], unchanged: [], contradictions: [] };
  const gezien = new Set<string>();

  for (const nieuw of incoming) {
    if (!nieuw.factKey || !nieuw.text.trim()) continue;
    // Twee inkomende feiten met dezelfde sleutel: de eerste wint. De bronnen zijn
    // op betrouwbaarheid gesorteerd (klant vóór site vóór onderzoek), dus de
    // eerste is per definitie de beste.
    if (gezien.has(nieuw.factKey)) continue;
    gezien.add(nieuw.factKey);

    const oud = perSleutel.get(nieuw.factKey);
    if (!oud) {
      plan.insert.push(nieuw);
      continue;
    }

    if (zelfdeUitspraak(oud, nieuw)) {
      plan.unchanged.push(oud.id);
      continue;
    }

    plan.supersede.push({ oldId: oud.id, by: nieuw });
    plan.contradictions.push({
      factKey: nieuw.factKey,
      oud: oud.text,
      nieuw: nieuw.text,
      vanKlant: oud.kind === "klant",
      omgekeerd: oud.allowed !== nieuw.allowed,
    });
  }

  return plan;
}

/**
 * Gaat het om dezelfde uitspraak?
 *
 * Op genormaliseerde tekst én op `allowed`. Dat tweede is geen detail: "pechhulp
 * zit erbij" en "pechhulp zit er NIET bij" kunnen na normalisatie dicht bij
 * elkaar liggen, en dat is nu net het verschil dat ertoe doet.
 */
function zelfdeUitspraak(oud: StoredFact, nieuw: IncomingFact): boolean {
  if (oud.allowed !== nieuw.allowed) return false;
  if (oud.citable !== nieuw.citable) return false;
  return normalizeForQuote(oud.text) === normalizeForQuote(nieuw.text);
}

/**
 * De tegenspraken in gewone taal, klaar voor `review_notes` of het scherm.
 *
 * Alleen de tegenspraken die de klant aangaan komen bovendrijven: een
 * sitewijziging is meestal gewoon een update, maar een antwoord dat de klant
 * zelf herziet, of een feit dat van mag-wel naar mag-niet gaat, is iets waar
 * hij naar moet kijken.
 */
export function describeContradictions(items: Contradiction[]): string[] {
  return items
    .filter((c) => c.vanKlant || c.omgekeerd)
    .map((c) =>
      c.omgekeerd
        ? `Dit is omgedraaid ten opzichte van wat er eerder stond: "${c.oud}" is nu "${c.nieuw}". ` +
          `De nieuwste versie telt; controleer of dat klopt.`
        : `Je gaf hier eerder een ander antwoord: "${c.oud}" is nu "${c.nieuw}".`,
    );
}
