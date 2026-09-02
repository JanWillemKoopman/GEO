import "server-only";

/**
 * De pagina die verbeterd wordt, vers en volledig ophalen
 * (docs/tasks/paginakeuze-nieuw-of-verbeteren.md O3, migratie 0083).
 *
 * ── WAAROM DE CRAWLTEKST NIET VOLSTAAT ──────────────────────────────────────
 *
 * `profile_pages.text_excerpt` is afgekapt op 1500 tekens. Dat is geen fout
 * maar een noodzaak: er gaan 150 pagina's tegelijk het aanbodonderzoek in, en
 * die passen alleen als elke pagina klein blijft (`PAGE_MAX_CHARS` in
 * `lib/crawler.ts`). Voor de nieuw-of-verbeteren-beslissing is dat genoeg, want
 * daar telt alleen waar een pagina over gaat.
 *
 * Voor het VERBETEREN van één pagina is het te weinig. Nagerekend op productie
 * op 1 september 2026: 667 van de 738 gecrawlde pagina's staan precies op die
 * grens, en van de tien pagina's die de app daadwerkelijk verbeterd heeft
 * negen. Ongeveer 230 woorden, terwijl de vervangende tekst er 400 tot 1200
 * telt. Alles wat verderop op de pagina staat, prijzen, veelgestelde vragen,
 * voorwaarden, bestond voor de schrijver niet, en de klant kreeg wél de
 * instructie om zijn pagina ermee te vervangen.
 *
 * Bovendien was de tekst oud: tot 20 dagen tussen de crawl en het schrijven.
 *
 * ── ÉÉN VERZOEK, GEEN AI ────────────────────────────────────────────────────
 *
 * Dit is dezelfde beweging die `publish-check.ts` al maakt: één HTTP-verzoek en
 * wat tekstverwerking. Geen AI-aanroep, geen nieuwe afhankelijkheid, en de
 * kosten zijn een paar honderd milliseconden in een taak die verderop een
 * schrijfaanroep van tot 150 seconden doet.
 *
 * ⚠️ De KEUZE tussen de verse tekst en het crawl-excerpt staat bewust niet hier
 * maar in `page-match.ts` (`chooseExistingText`). Die keuze bepaalt de uitkomst
 * en hoort dus puur en testbaar te zijn (conventie 2); dit bestand doet het
 * netwerkwerk en kan dat per definitie niet zijn. Zelfde scheiding als tussen
 * `factcard.ts` en `factbase.ts`.
 */
import { fetchText, htmlToText } from "@/lib/crawler";
import { EXISTING_PAGE_MAX_CHARS } from "@/lib/pipeline/page-match";

export interface ExistingPageFetch {
  /** De opgehaalde tekst, of `null` als de pagina niet te lezen was. */
  text: string | null;
  /** Waarom er niets is. Leeg als het gelukt is. */
  probleem: string | null;
  fetchedAt: string;
}

/**
 * Haalt één pagina op en geeft de platte tekst terug.
 *
 * Faalt ZACHT en zichtbaar: een pagina die niet meer bestaat levert `text: null`
 * met een reden op, en de aanroeper beslist wat dat betekent. Dat is bewust geen
 * uitzondering, want een verbetering die strandt op een 404 hoort niet de hele
 * schrijftaak te laten mislukken; hij hoort een NIEUWE pagina te worden.
 */
export async function fetchExistingPage(url: string): Promise<ExistingPageFetch> {
  const fetchedAt = new Date().toISOString();
  const adres = (url ?? "").trim();
  if (!adres || !/^https?:\/\//i.test(adres)) {
    return { text: null, probleem: "geen geldig adres", fetchedAt };
  }

  const html = await fetchText(adres);
  if (html === null) {
    // `fetchText` geeft null bij zowel een foutstatus als een time-out. Het
    // onderscheid doet er hier niet toe: in beide gevallen hebben we de tekst
    // niet, en gokken is verboden (conventie 3).
    return { text: null, probleem: "pagina niet op te halen", fetchedAt };
  }

  const tekst = htmlToText(html).slice(0, EXISTING_PAGE_MAX_CHARS).trim();
  if (tekst.length === 0) {
    return { text: null, probleem: "pagina bevat geen leesbare tekst", fetchedAt };
  }

  return { text: tekst, probleem: null, fetchedAt };
}
