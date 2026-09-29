/**
 * Welke velden van een merk met de hand bewerkt mogen worden.
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * Deze lijst stond in `app/api/profiles/[id]/route.ts`. Dat werkte zolang er
 * één scherm was dat hem vulde. Sinds de merkprofiel-wizard (fase 3) zijn het
 * er twee, en toen ging het meteen mis: `proof_points` stond wél in de wizard en
 * níet in deze lijst. De route negeerde dat veld dan zonder een fout te geven,
 * dus de klant vulde zijn bewijspunten in, kreeg "opgeslagen" te zien, en de
 * waarde was weg.
 *
 * Precies het stille degraderen waar conventie 1 over gaat: een lijst op twee
 * plekken is een intentie, één gedeelde lijst met een test eromheen is een
 * garantie. `scripts/test-unit.ts` controleert nu dat élk wizardveld hierin
 * voorkomt.
 *
 * Bewust ZONDER `server-only`: de test moet hem kunnen importeren (conventie 2).
 */

/**
 * Op 25 september 2026 zijn de elf stemvelden eruit gehaald (besluit B14 van
 * `docs/tasks/contentketen-opnieuw.md`): de stemvoorbeelden vervangen ze, en
 * een veld dat de schrijver niet meer leest hoort de klant niet in te vullen.
 * De kolommen blijven in de database staan (conventie 4).
 *
 * Op 27 september 2026 volgden er dertien (besluit V10 en K8 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`): de auteursvelden, missie,
 * positionering, `usp`, tweede doelgroep, wettelijke beperkingen en
 * `proof_points`. Niemand las ze; een test in `scripts/test-unit.ts` bewaakt
 * dat geen code ze nog noemt.
 *
 * ⚠️ Toevoegen mag, weghalen is een gedragswijziging. Een veld dat hier
 * verdwijnt wordt door de route stilzwijgend genegeerd, en dat is niet te zien
 * aan het scherm dat hem verstuurt.
 */
export const EDITABLE_PROFILE_FIELDS = [
  "name",
  // Onboarding ronde B, stap B1: de naam waarop de meting daadwerkelijk telt.
  // Tot deze stap kon alleen het AI-onderzoek hem zetten (`discover.ts`), en
  // was een verkeerd afgeleide naam nergens te corrigeren.
  "brand_name",
  "industry",
  // Het bedrijfsmodel (R8.5, migratie 0032). Bewerkbaar omdat de klant beter
  // weet dan het model of hij een retailer of een fabrikant is, en omdat deze
  // waarde stuurt welke briefingvragen hij straks krijgt. De database-constraint
  // bewaakt de toegestane waarden.
  "business_model",
  "summary",
  "products",
  "value_props",
  "competitors",
  "personas",
  "intake_description",
  "intake_audience",
  "aliases",
  "service_scope",
  "service_regions",
  "market_language",
  "sitemap_url",
  // Onboarding ronde B, stap B8: stonden al vast in de PATCH-route
  // (validatie en klemming, zie hieronder), maar niet in de catalogus. Ze
  // krijgen nu ook een herkomstregel, net als elk ander veld.
  "max_inventory_pages",
  "crawl_priority_paths",
  // Migratie 0045, naar het voorbeeld van InSpace Nova's onboardingstappen
  // "Words & language", "Voice" en "Author".
  "taboo_phrases",
  // Migratie 0048: de laatste dertien velden uit de veldeninventaris,
  // de vertaaltabel staat bovenaan die migratie. Wat er nog van over is.
  "differentiator",
  "pronoun_preference",
  // Migratie 0060, de commerciële laag uit onboarding 3.0 deel D1. Twaalf velden
  // die een website niet kan zeggen, ingevuld in het gesprek met de klant.
  "priority_offerings",
  "deprioritised_offerings",
  "growth_regions",
  "target_segments",
  "deal_value_band",
  "seasonality",
  "sales_objections",
  "forbidden_topics",
  "offline_proof",
  "name_exclusions",
  "respect_site_structure",
  "goal_12m",
  // De contactpersoon (deel D2). Bewerkbaar als alle andere velden; telt alleen
  // niet mee in de volledigheidsmeter.
  "contact_name",
  "contact_email",
  "contact_phone",
  // Migratie 0115, de contentketen opnieuw (§6.3 en §6.10).
  "verhalen",
  "stem_voorbeelden",
  // Migratie 0129 (besluit B28): de verhalen in vakken, bezwaren met antwoord.
  "verhaal_klussen",
  "verhaal_werkwijze",
  "verhaal_niet",
  "verhaal_begin",
  "bezwaren_met_antwoord",
] as const;

export type EditableProfileField = (typeof EDITABLE_PROFILE_FIELDS)[number];
