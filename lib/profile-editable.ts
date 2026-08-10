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
 * ⚠️ Toevoegen mag, weghalen is een gedragswijziging. Een veld dat hier
 * verdwijnt wordt door de route stilzwijgend genegeerd, en dat is niet te zien
 * aan het scherm dat hem verstuurt.
 */
export const EDITABLE_PROFILE_FIELDS = [
  "name",
  "industry",
  // Het bedrijfsmodel (R8.5, migratie 0032). Bewerkbaar omdat de klant beter
  // weet dan het model of hij een retailer of een fabrikant is, en omdat deze
  // waarde stuurt welke briefingvragen hij straks krijgt. De database-constraint
  // bewaakt de toegestane waarden.
  "business_model",
  "tone_of_voice",
  "summary",
  "products",
  "value_props",
  "competitors",
  "personas",
  "proof_points",
  "intake_description",
  "intake_audience",
  "aliases",
  "service_scope",
  "service_regions",
  "market_language",
  "sitemap_url",
  // Migratie 0045, naar het voorbeeld van InSpace Nova's onboardingstappen
  // "Words & language", "Voice" en "Author" (docs/tasks/nova-analyse.md §3.3).
  "taboo_phrases",
  "compliance_notes",
  "author_name",
  "author_role",
  "author_bio",
  "author_linkedin_url",
  "tone_formality",
  "tone_energy",
  "tone_complexity",
  "tone_humor",
  // Migratie 0048: de laatste dertien velden uit de veldeninventaris
  // (docs/Nova.md §13).
  "brand_mission",
  "brand_positioning",
  "usp",
  "key_messages",
  "identity_keywords",
  "differentiator",
  "audience_secondary",
  "audience_knowledge_level",
  "tone_emotional",
  "signature_phrases",
  "pronoun_preference",
  "author_photo_url",
  "author_facebook_url",
  "author_other_url",
] as const;

export type EditableProfileField = (typeof EDITABLE_PROFILE_FIELDS)[number];
