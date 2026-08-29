import { z } from "zod";

/**
 * De contracten van de Sales-module (`docs/tasks/geo-prospect-engine.md`).
 *
 * ── ⚠️ WAT DIT MODEL WEL EN NIET MAG BEPALEN ───────────────────────────────
 *
 * Conventie 1: een promptinstructie is een intentie, code is een garantie. In
 * deze module ligt die grens scherper dan elders, want wat hier uitkomt bepaalt
 * welke bedrijven benaderd worden. Het model levert dus **kandidaten en
 * vindplaatsen**, en het beslist niets:
 *
 *   - Het bepaalt niet of een bedrijf in de markt hoort. Dat doet de admin bij
 *     poort 1, op basis van de zekerheid die `lib/sales/discovery.ts` rekent.
 *   - Het bepaalt niet hoe zeker een bedrijf is. Dat volgt uit het aantal
 *     onafhankelijke vindplaatsen, en het model is er daarvan één.
 *   - Het bepaalt niet wie er uitgesloten wordt. Dat is `lib/sales/suppression.ts`.
 *
 * ── EN WAAROM DE VINDPLAATS VERPLICHT IS ────────────────────────────────────
 *
 * Plan hoofdstuk 15: geen bewijs is geen claim. Een bedrijfsnaam zonder pagina
 * waar hij vandaan komt, is niet te controleren bij poort 1, en een verzonnen
 * bedrijf dat door poort 1 glipt komt uiteindelijk in een verkoopmail terecht.
 * Het veld mag leeg zijn (het model mag niets verzinnen om het te vullen), maar
 * dan telt de kandidaat als minder zeker.
 */

/**
 * Wat de marktontdekking oplevert (plan 9.1).
 *
 * Twee lijsten, en de tweede is de belangrijkste. De bedrijven zijn wat het
 * model zelf vond; de bronpagina's zijn waar onze eigen crawler dáárna gratis
 * verder kan zoeken, zonder model en zonder AI-vooroordeel. Dat tweede is de
 * enige echt onafhankelijke bron die we vandaag hebben.
 */
export const SalesMarketDiscovery = z.object({
  bedrijven: z.array(
    z.object({
      /** De bedrijfsnaam zoals hij op de vindplaats staat. */
      naam: z.string(),
      /**
       * Het webadres, of een lege string.
       *
       * ⚠️ Leeg mag, en dat is met opzet. Een bedrijf zonder website is precies
       * de prospect die deze module zoekt (plan hoofdstuk 9). Zou dit veld
       * verplicht zijn, dan zou het model er een verzinnen.
       */
      website: z.string(),
      /** De vestigingsplaats, of leeg als die er niet bij stond. */
      plaats: z.string(),
      /** De pagina waarop dit bedrijf gevonden is. Leeg als er geen bron is. */
      bron_url: z.string(),
    }),
  ),
  /**
   * De ledenlijsten, vergelijkingssites en gemeentegidsen die deze markt
   * beschrijven.
   *
   * Dit is de bron die niets kost: onze crawler haalt deze pagina's op en leest
   * eruit naar welke bedrijven ze linken. Een ledenlijst van een
   * branchevereniging linkt naar zijn leden, ook naar de leden die geen enkel
   * AI-model ooit noemt.
   */
  bronpaginas: z.array(
    z.object({
      /** Het volledige adres van de overzichtspagina. */
      url: z.string(),
      /** Wat voor pagina dit is, in gewone taal, bijvoorbeeld "ledenlijst NVM". */
      wat: z.string(),
    }),
  ),
  /**
   * Wat het model niet zeker wist, in gewone taal.
   *
   * Conventie 3 in gespreksvorm: een lijst met dertig bedrijven waarvan er acht
   * twijfelachtig zijn, is iets anders dan een lijst met dertig zekere. Dit veld
   * komt bij poort 1 op het scherm, zodat de admin weet waar hij moet kijken.
   */
  kanttekening: z.string(),
});

export type SalesMarketDiscovery = z.infer<typeof SalesMarketDiscovery>;
