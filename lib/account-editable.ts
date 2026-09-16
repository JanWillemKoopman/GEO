/**
 * Welke accountvelden een klant zelf mag wijzigen.
 *
 * ── WAAROM DIT EEN EIGEN LIJST IS ───────────────────────────────────────────
 *
 * ⚠️ Bij het merkprofiel ging dit één keer mis en het kostte een echte bug:
 * `proof_points` stond wél in de wizard maar niet in de bewerkbare velden van de
 * PATCH-route, en dus sloeg dat veld stilzwijgend niets op. Niemand ziet dat,
 * want de melding zegt "opgeslagen". De oplossing was toen `lib/profile-editable.ts`
 * plus een test die eist dat elk veld in de wizard ook opslaanbaar is; dit is
 * dezelfde constructie voor het account.
 *
 * Wat er BEWUST niet in staat:
 *
 *   • `package_pages_per_month`  het pakket is een verkoopafspraak, geen
 *     instelling. Zou een klant zichzelf op 40 kunnen zetten, dan is de afspraak
 *     een suggestie.
 *   • `started_at` en `cancelled_at`  die horen bij de levenscyclus. Opzeggen
 *     loopt via een eigen handeling met een bevestiging (besluit 14), en de
 *     startdatum wordt sinds 16 september 2026 vanzelf gezet bij het toewijzen.
 *     De consultant corrigeert hem op het toewijzingsscherm; een klant die zijn
 *     eigen startdatum kan verzetten, verzet daarmee elk cijfer dat "sinds de
 *     start" rekent.
 *   • `name`  de werknaam staat in de merkkiezer en wordt door de consultant
 *     gezet bij het aanmaken.
 *
 * Puur, dus testbaar (conventie 2).
 */
import type { Account } from "@/lib/types/database";

export const EDITABLE_ACCOUNT_FIELDS = [
  "legal_name",
  "address",
  "postal_code",
  "city",
  "country",
  "vat_number",
  "vat_not_applicable",
  "invoice_email",
  "contact_person",
  "contact_phone",
] as const satisfies readonly (keyof Account)[];

export type EditableAccountField = (typeof EDITABLE_ACCOUNT_FIELDS)[number];
