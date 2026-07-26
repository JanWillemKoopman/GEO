/**
 * App-brede schakelaars.
 *
 * `signupsEnabled` — of publieke registratie via de app is toegestaan.
 * Standaard UIT: tijdens de bouwfase mag alleen de eigenaar de app gebruiken.
 * Zet later bij lancering `SIGNUPS_ENABLED=true` in Vercel om open te stellen.
 *
 * ⚠️ Dit is de app-laag. De HARDE poort is de Supabase-instelling
 * "Allow new users to sign up" (uitzetten) — die geldt ook als iemand de
 * Supabase-API rechtstreeks aanroept, buiten onze UI om. Zie SETUP.md.
 */
export const signupsEnabled = process.env.SIGNUPS_ENABLED === "true";

/**
 * Aantal prompts dat per FUNNELFASE gegenereerd wordt (abcplan.md §6 A2,
 * optimalisatie.md 2.1). Met 3 funnelfasen: 10 = 30 vragen.
 *
 * Stond op 4 (12 vragen) omdat meer niet binnen de 60s van één route paste.
 * Sinds fase 1 is elke vraag een eigen taak, dus die grens is weg.
 *
 * WAAROM 30 EN NIET 12 MET 3 METINGEN: de onzekerheid van de score schaalt met
 * het TOTAAL aantal metingen, dus 30×1 en 12×3 zijn statistisch vrijwel gelijk
 * (95%-band ±16 vs ±15) — maar 30×1 kost minder (30 web-zoekacties i.p.v. 36)
 * én dekt de markt van de klant breder af. Bij gelijke kosten wint meer vragen
 * het van meer metingen per vraag.
 */
export const promptsPerFunnelStage = 10;

/**
 * Grounding: de `web_search`-tool, oftewel of de AI het internet op mag.
 *
 * ⚠️ DIT IS DE GROOTSTE KOSTENKNOP VAN HET HELE PRODUCT. Een web-zoekactie kost
 * een vast bedrag per aanroep en is daarmee ~94% van de meetkosten — de tokens
 * zijn verwaarloosbaar. Uit betekent: 30 vragen meten kost centen in plaats van
 * driekwart dollar.
 *
 * Zet `WEB_SEARCH_ENABLED=false` in de ontwikkelomgeving. Dit dekt ALLE drie de
 * plekken waar grounding gebruikt wordt:
 *   • de meting (halte 3a) — de AI antwoordt uit eigen kennis
 *   • het profielonderzoek — geen actuele marktcontext
 *   • het onderwerp-onderzoek — geen actuele concurrenten
 *
 * ⚠️ NIET UITZETTEN IN PRODUCTIE, en weet wat je meet als je hem uitzet:
 *
 *   1. De MÉTING wordt onrealistisch. Je meet dan wat het model uit z'n
 *      trainingsdata herinnert, niet wat een AI-assistent met live-zoeken
 *      antwoordt. Voor een lokale MKB'er is dat vrijwel altijd "ken ik niet".
 *   2. Het ONDERZOEK wordt zwakker. Concurrenten opzoeken leunt op actuele
 *      marktkennis; zonder zoeken verzint het model ze of laat de lijst leeg.
 *      Een lege concurrentenlijst maakt de mention-detectie én de
 *      merkneutraliteitsregel in de promptgeneratie minder scherp.
 *
 * Voor ontwikkelen is dat prima — je test de pijplijn, niet de marktdata. Voor
 * een echte klant niet.
 */
export const webSearchEnabled = process.env.WEB_SEARCH_ENABLED !== "false";

/**
 * Fijnere schakelaar: alleen de meting groundless maken en het onderzoek wél
 * laten zoeken. Standaard volgt hij `webSearchEnabled`. Bestond al als
 * MEASURE_WEB_SEARCH; blijft werken voor wie hem al gezet heeft.
 */
export const measureWebSearchEnabled =
  webSearchEnabled && process.env.MEASURE_WEB_SEARCH !== "false";

/**
 * Hoe vaak de terugkerende meting draait (optimalisatie.md 2.1).
 *
 * MAANDELIJKS, niet wekelijks. Twee redenen: de zichtbaarheid van een MKB'er in
 * AI-assistenten verandert niet van week tot week (nieuwe content wordt pas na
 * weken opgepikt), en met een 95%-band van ±18 punten is een verschil tussen
 * twee opeenvolgende weken vrijwel altijd ruis. Minder-maar-betekenisvollere
 * meetpunten leveren een bruikbaarder trendlijn op — en het scheelt ruim de
 * helft van de kosten.
 */

/**
 * Tot hoeveel periodes we blijven meten (optimalisatie.md 6.3).
 *
 * Stond op een harde 12. Zichtbaarheid volgen is doorlopend werk, geen project
 * van twaalf maanden: een klant die na een jaar stilletjes ophoudt met gemeten
 * worden, ziet dat pas als hij zich afvraagt waarom de grafiek niet meer groeit.
 *
 * Standaard onbeperkt. De rem zit waar hij hoort — bij de kosten (0.6) en bij
 * `tracking_enabled`, dat de klant zelf uitzet. Zet `MAX_MEASUREMENT_PERIODS`
 * als je tijdens ontwikkelen tóch een plafond wilt.
 */
export const maxMeasurementPeriods = Number(
  process.env.MAX_MEASUREMENT_PERIODS ?? Number.POSITIVE_INFINITY,
);

/**
 * Hoeveel wandkloktijd de werker zichzelf per aanroep gunt (optimalisatie.md 1.1).
 *
 * Moet RUIM onder de tijdslimiet van de route blijven, zodat er tijd overblijft
 * om de laatste taak af te ronden en de status weg te schrijven. Die limiet
 * verschilt per platform en per abonnement — vandaar een env-schakelaar in
 * plaats van een vaste waarde:
 *
 *   • Vercel met `maxDuration = 60` (de instelling in de route):  40000 (standaard)
 *   • Een platform dat op 10s afkapt:                              7000
 *   • Een eigen server zonder limiet:                              gerust 120000
 *
 * Te laag zetten is niet erg: de werker doet dan minder per ronde en de volgende
 * aanroep gaat verder. Te hoog zetten wél — dan wordt hij midden in een taak
 * afgekapt en moet de reaper hem tien minuten later terugzetten.
 */
export const workerTimeBudgetMs = Number(process.env.WORKER_TIME_BUDGET_MS ?? 40_000);

/**
 * De geciteerde bronnen ophalen en analyseren vóór het schrijven
 * (optimalisatie.md 4.4).
 *
 * Kost één extra mini-aanroep per gegenereerde pagina, plus een paar
 * HTTP-verzoeken (die zijn gratis). In ruil daarvoor weet de schrijver wat de
 * pagina's deden die de AI wél citeerde — de lat waar hij overheen moet.
 *
 * Zet `SOURCE_ANALYSIS=false` als je tijdens het ontwikkelen alleen de
 * pijplijn test en de inhoud er niet toe doet.
 */
export const sourceAnalysisEnabled = process.env.SOURCE_ANALYSIS !== "false";

/**
 * Web-zoeken tijdens het SCHRIJVEN, en alleen als vangnet (optimalisatie.md 4.6).
 *
 * De schrijfinstructie zegt "verzin geen feiten, blijf algemeen bij twijfel".
 * Bij een klant met een dunne website levert dat gegarandeerd algemene tekst op
 * — en algemeen is precies wat niet geciteerd wordt. Zijn er te weinig
 * geverifieerde feiten, dan mag de schrijver het internet op voor
 * ALGEMEEN BEKENDE, verifieerbare feiten over het onderwerp (geen
 * bedrijfsclaims: die kunnen we niet controleren).
 *
 * Volgt standaard `webSearchEnabled`, dus met grounding uit staat dit ook uit.
 */
export const contentWebSearchEnabled =
  webSearchEnabled && process.env.CONTENT_WEB_SEARCH !== "false";

/**
 * Onder hoeveel geverifieerde feiten we het vangnet uit 4.6 aanzetten.
 *
 * Drie is de grens waaronder een pagina onvermijdelijk in algemeenheden vervalt:
 * met minder heeft de schrijver letterlijk niets concreets om op te staan.
 */
export const minProofPointsForConcreteContent = 3;
