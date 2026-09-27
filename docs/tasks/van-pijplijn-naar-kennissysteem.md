# Van pijplijn naar kennissysteem: het ontwikkelplan voor de volgende versie van ORBIT ENGINE

**Opgesteld:** 26 september 2026, na de teambespreking van `docs/doorloop-van-klant-tot-content.md`.
**Status: plan, niets gebouwd.** De voortgang per werkpakket staat in §13; werk die tabel bij in
dezelfde commit als het werk. **Bestemming:** `docs/visie.md` en `docs/merkstrategie.md`.

Dit document zet de feedback van het team om in een bouwvolgorde. Het is geschreven om over veel
sessies heen uitgevoerd te worden: elke sessie pakt één werkpakket, en dit document zegt welk, wat
er precies moet gebeuren, en wanneer het af is.

---

## 0. Lees dit eerst (voor elke sessie die hieraan werkt)

**De kern in één zin:** ORBIT ENGINE wordt een systeem rond één betrouwbare klantwaarheid, met
daaromheen een kansenlaag, een eenvoudige contentmotor en een meetlaag die zijn uitkomsten
terugvoert naar die klantwaarheid.

**En de waarschuwing die erbij hoort, uit de feedback zelf:** *"Het risico is juist dat er te veel
intelligentie in de pipeline zit en te weinig in het datamodel."* Dit plan voegt geen AI-aanroepen
toe om iets slimmer te maken. Het verplaatst intelligentie van prompts naar tabellen, regels en
herkomst.

1. **Lees eerst `CLAUDE.md`, dan dit hele document.** Gaat je werkpakket over het schrijven van
   pagina's, lees dan ook §0 en §3 van `docs/tasks/contentketen-opnieuw.md`. Die regels blijven
   gelden: dit plan verandert wat de schrijver krijgt, niet hoeveel stappen er rond het schrijven
   zijn.
2. **Werk precies één werkpakket per sessie**, in de volgorde van §9. Begin niet aan het volgende
   voordat de "klaar als"-lijst van het vorige helemaal gehaald is.
3. **Elk werkpakket laat de app werkend achter.** De eerste echte klant wacht op de verbouwing (V5),
   maar de proefmerken draaien op productie en zijn de meetlat voor elke verandering. Anders dan bij de
   ombouw van de contentketen (besluit B8 daar) is er dus geen periode waarin de app tijdelijk niet
   schrijft of niet meet.
4. **Oud en nieuw bestaan alleen naast elkaar tijdens één overgang**, en die overgang heeft een
   einddatum in de vorm van een werkpakket. Na de omschakeling leest geen code het oude nog, en een
   test in `scripts/test-unit.ts` bewaakt dat (zoals `contentketen-opnieuw.md` §7.2 dat doet).
5. **Migraties zijn additief en idempotent, nooit `drop`** (conventie 4). Oude kolommen blijven
   staan; ze worden alleen niet meer gelezen of geschreven.
6. **Bouw niets wat niet in dit document staat.** Denk je dat iets nodig is, zet het dan eerst als
   besluit in §3.2, met datum en reden, en pas daarna in code.
7. **Klopt iets hier niet meer met de code?** Pas eerst dit document aan (met datum en reden), dan de
   code.
8. **Per werkpakket één commit (of een paar)**, met `npx tsc --noEmit`, `npm run test:unit`,
   `npm run test:chain` en `npm run build` groen. Werk §13 bij in dezelfde commit.
9. **Gebouwd is niet geverifieerd** (conventie 10). Waar het kan, bevat "klaar als" een controle tegen
   productie of echte opgeslagen data.

---

## 1. Wat er verandert, op één whiteboard

**Vandaag** is ORBIT ENGINE vooral een reeks opeenvolgende AI-stappen. Elke stap maakt zijn eigen
uitvoer, en de volgende stap leest die uitvoer en interpreteert hem opnieuw:

```
merk → onderzoek → aanbod → onderwerpen → meetvragen → meting → rapport → contentplan
     → brief → vragen → schrijven → controle → publiceren → nameting
```

**Straks** staat er één klantwaarheid in het midden, en alles eromheen leest daaruit en schrijft
erin terug:

```
                        ┌──────────────────────────────┐
                        │ 1. KLANTKENNIS               │
                        │ identiteit, aanbod,          │
                        │ doelgroepen, positionering,  │
                        │ bewijs, stem, verhalen,      │
                        │ grenzen, geleerd             │
                        │ (elk item met herkomst)      │
                        └──────────────┬───────────────┘
                                       │
          website · Search Console · ChatGPT · AI Overview · consultant
                                       │
                        ┌──────────────▼───────────────┐
                        │ 2. KANSEN                    │
                        │ één object per kans, met     │
                        │ bewijs per bron, en wat we   │
                        │ over het bedrijf nog missen  │
                        └──────────────┬───────────────┘
                                       │ geprioriteerd, ingepland
                        ┌──────────────▼───────────────┐
                        │ 3. KENNIS OPHALEN            │
                        │ "wat weet alleen jij?"       │
                        │ antwoorden worden klantkennis│
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │ 4. CONTENTMOTOR              │
                        │ brief → schrijven → controle │
                        │ → hooguit 1x herschrijven    │
                        │ → goedkeuren                 │
                        │ → publicatiepakket           │
                        └──────────────┬───────────────┘
                                       │ klant publiceert
                        ┌──────────────▼───────────────┐
                        │ 5. METING                    │
                        │ meetplan per pagina, Search  │
                        │ Console, ChatGPT, AI Overview│
                        │ citaties, bewijsladder       │
                        └──────────────┬───────────────┘
                                       │ uitkomst
                                       └──────────▶ terug naar 1. KLANTKENNIS ("geleerd")
```

De wachtrij met taken blijft bestaan en blijft goed werk doen: asynchroon, idempotent, met
kostenregistratie en de volledige ruwe uitvoer bewaard. Maar hij wordt **infrastructuur**. Welke
stap er moet gebeuren, volgt uit het domein (een klantfeit veranderde, een kans werd goedgekeurd, een
pagina ging live). De wachtrij bepaalt alleen hoe dat asynchroon wordt uitgevoerd.

---

## 2. Waar de feedback klopt, en wat er al staat

**De hoofdconclusie van de feedback klopt**, en de code bevestigt hem. Op drie punten onderschat de
feedback wel wat er al staat. Dat verandert de volgorde van dit plan, niet de richting. Herkomst van
feiten is er al voor een klein deel: `brand_facts` kent bron, bronpagina, soort, stand en
bewijskracht. De kolommen voor een datum van herbevestiging en voor de vraag of het document waar een
feit uit kwam, bestaan wel maar worden nooit gevuld, en alle 33 feiten op productie komen van de site
(gecorrigeerd op 26 september 2026 na de inventaris van F0.2, `kennismodel-inventaris.md` §3). Search Console is gebouwd en levert al kansen, maar staat bij geen enkel merk aan. En
de nameting met controlegroep bestaat al, maar meet alleen of ChatGPT het merk noemt. Daarnaast één
punt waar dit plan bewust minder doet dan de feedback voorstelt: een volledig gebeurtenissensysteem
voor tientallen soorten gebeurtenissen is bij drie proefmerken te vroeg. Fase 3 bouwt daarom een
lichte versie met een expliciet beslismoment om te stoppen.

**Wat er vandaag staat, nagekeken op 26 september 2026** (code op `main`, productie via Supabase):

| Onderdeel uit de feedback | Wat er vandaag al is | Wat ontbreekt |
|---|---|---|
| Klantkennis als centrale laag | Verspreid: `profiles` (94 kolommen), `brand_facts` (22), `profile_offerings`, `profile_facets`, `profile_strategy`, `fact_requests`, `brand_documents`, `profiles.verhalen`, `stem_voorbeelden`, `taboo_phrases`, `content_pieces.brief_json` | Eén plek, één vorm, één schrijfingang. De schrijver leest een deel (blok A); `proof_points` en de stijlvoorbeelden uit het merkonderzoek leest hij niet |
| Herkomst per feit | `brand_facts`: `source`, `kind` (klant, site, onderzoek), `stand`, `bewijskracht`, `superseded_by`; de kolommen `verify_after`, `origin_fact_request_id` en `origin_document_id` bestaan maar worden nooit gevuld, en het gecontroleerde citaat wordt niet bewaard (alleen in de ruwe uitvoer). `profile_field_sources`: wie zette welk profielveld (ai, klant, gesprek, consultant). Citaatcontrole bij aanbod en feiten | Onderscheid **waargenomen, verklaard, bevestigd, afgeleid** als één vast veld; regels welke status waarvoor gebruikt mag worden; herkomst voor alles wat geen feit is (verhalen, stem, grenzen) |
| Klantinput als kennisverwerving | Vaste open vraag per pagina, tot 8 gerichte vragen per brief, merkbrede vragen, ontdubbeling, "eerder gestelde vragen" (`lib/pagina/brief.ts`) | Vragen op basis van wat er over de dienst **ontbreekt** in de klantkennis; antwoorden die als klantkennis terugkomen en bij latere pagina's hergebruikt worden |
| Kansen als domeinobject | Aanbevelingen als JSON in `reports.recommendations_json`, gekopieerd naar de voorraad in `planned_pages` (`syncBacklog`); `lib/opportunities.ts` zet bronnen alleen voor het scherm naast elkaar, waaronder `zoekverkeer` uit Search Console; `cluster_discovery_candidates` voor nieuwe clusters | Een kans als eigen object met bewijs per bron, kennisgat en status; handmatige kansen die ook echt voorbereid worden (een kaart zonder cluster blijft nu op "Geen cluster") |
| Search Console | `search_console_days`, `search_console_queries`, dagelijkse `gsc_sync`, het opbrengstblok op Analytics | **Nul merken gekoppeld** op productie. Geen invloed op de effectmeting per pagina |
| ChatGPT en AI Overview | Meting per vraag met positie, rol en `cited_sources`; AI Overview staat aan op productie; Gemini slaapt achter een schakelaar | Citaties van de eigen pagina als eigen signaal; de kruising van bronnen per kans |
| Contentmotor | De nieuwe keten van 25 en 26 september 2026 (`lib/pagina/`): brief, vragen, één schrijfbeurt, controle, hooguit één herschrijving | Blijft zoals hij is. Hij krijgt alleen betere invoer (fase 4) en een controle die ook de FAQ leest (fase 5) |
| Publicatiepakket | Sinds PR #163: tekst, metatitel, metabeschrijving, FAQ, gestructureerde gegevens, download in één bestand, sjabloonexport, voorstel voor het adres, live-controle | Voorstel voor interne links; welke klantkennis in een versie gebruikt is |
| Meting als bewijs | `content_impact`: doelvragen tegen controlevragen, golf na 14 en 28 dagen, oordeel met marge, "te weinig data" | Search Console per pagina, citaties, een meetplan vanaf het begin, een bewijsladder die zichtbaarheid niet als opbrengst verkoopt. Nul effectmetingen op productie |
| Terugkoppeling naar klantkennis | Niets | Alles (fase 7) |
| Gebeurtenissen en afhankelijkheden | `lib/jobs/chain.ts` (wie plant wie in), `onboarding-refresh.ts` (welk veld welke stap opnieuw laat draaien) | Afhankelijkheden als gegevens, en gevolgen van een wijziging zichtbaar voor de consultant |

**De uitgangspositie in cijfers (productie, 26 september 2026):** 3 merken (de proefmerken), 3
clusters, 33 feiten, 64 vragen, 16 pagina's, 0 gepubliceerd, 0 effectmetingen, 0 merken met Search
Console. Omzetten van het datamodel is nu goedkoop: er is geen klantdata om voorzichtig mee te zijn.
Dat verandert zodra de eerste echte klant erin staat, en dat is een reden om fase 1 niet uit te
stellen.

---

## 3. Principes en besluiten

### 3.1 Principes (vast)

| # | Principe | Wat het in de praktijk betekent |
|---|---|---|
| P1 | **Eén klantwaarheid.** Alles wat ORBIT over een bedrijf weet, staat op één plek, met herkomst | Een nieuwe functie bouwt geen eigen versie van klantkennis. Hij leest uit de kennislaag en schrijft erin via één ingang |
| P2 | **AI is niet de database.** AI mag interpreteren, samenvatten, voorstellen, indelen, schrijven en hypotheses maken, maar nooit zelf een klantwaarheid vastleggen | AI-uitvoer komt in de kennislaag alleen als *afgeleid*, of als *waargenomen* met een citaat dat de code letterlijk op de bron terugvond. Nooit als *verklaard* of *bevestigd* |
| P3 | **Afgeleid is geen feit.** | Een afgeleid item mag een vraag, een kans of een hypothese voeden, maar komt nooit als bewering in een pagina |
| P4 | **Kansen, pagina's en metingen zijn eigen objecten**, geen JSON in een rapport | Elk heeft een tabel, een status en verwijzingen naar de klantkennis waar hij van afhangt |
| P5 | **De wachtrij is infrastructuur.** Het domein zegt wat er moet gebeuren, de wachtrij hoe | Nieuwe logica van het soort "als dit veld verandert, draai die stap opnieuw" komt niet meer in een taak, maar in een abonnee op een gebeurtenis (fase 3) |
| P6 | **Eén eenvoudige contentmotor.** | De verboden van `contentketen-opnieuw.md` §3 blijven onverkort: hooguit drie soorten AI-aanroep per pagina plus één herschrijving, geen scores op de tekst, geen extra beoordelaar |
| P7 | **Nooit één cijfer als opbrengst.** | Zichtbaarheid, citatie, verkeer en conversie zijn verschillende treden (fase 6). Wat niet gemeten is, heet "geen gegevens", niet 0 |

### 3.2 Open besluiten voor de eigenaar

Deze besluiten zijn nodig voordat het werkpakket erachter kan beginnen. Per besluit staat een advies.
Vul de kolom "Besluit" in (met datum) in werkpakket F0.3.

| # | Vraag | Advies | Nodig voor | Besluit |
|---|---|---|---|---|
| V1 | Een nieuwe tabel voor klantkennis, of `brand_facts` uitbreiden? | **Nieuwe tabel `klantkennis`.** `brand_facts` is gebouwd voor beweringen; verhalen, stem, grenzen en afgeleide kennis passen er niet in zonder de betekenis van bestaande kolommen te veranderen. `brand_facts` wordt bron voor het terugvullen en daarna alleen-lezen | K1 || **Nieuwe tabel**, zoals geadviseerd (26 september 2026) |
| V2 | Mag een handmatige kans van de consultant voorbereid en geschreven worden zonder gemeten cluster? | **Ja**, met het label "niet gemeten". De effectmeting begint dan met een eigen nulmeting op de doelvragen die de consultant opgeeft. Raakt `start.ts` (`clusterVan`), dus ook een besluit in `contentketen-opnieuw.md` §2 | N5 || **Ja, met het label "niet gemeten"**, zoals geadviseerd (26 september 2026). Staat als B18 in `contentketen-opnieuw.md` §2 |
| V3 | Stopt het rapport met het stellen van vragen aan de klant, zodra de brief vragen stelt op basis van kennisgaten? | **Ja.** Twee bronnen van vragen voor dezelfde pagina is dubbel werk voor de klant, en de brief vraagt gerichter | A3 || **Ja, alleen de voorbereiding van de pagina vraagt**, zoals geadviseerd (26 september 2026) |
| V4 | Controleert de keten ook de FAQ en de metabeschrijving op harde beweringen en verboden woorden? | **Ja**, in code (conventie 1), en de eindredacteur leest de FAQ mee. Een besluit in `contentketen-opnieuw.md` §2 | C1 || **Ja, ook de FAQ en de metabeschrijving controleren**, zoals geadviseerd (26 september 2026). Staat als B19 in `contentketen-opnieuw.md` §2 |
| V5 | Gaat de eerste echte klant door de huidige keten, vóór fase 1 klaar is? | **Ja.** Die doorloop is de meetlat waartegen dit plan zich moet bewijzen (`meting-eerste-klant.md`) | F0.1 || **Nee: de eerste echte klant wacht op de verbouwing** (26 september 2026), tegen het advies in. Uitgewerkt als: de klant komt zodra fase 1 tot en met 5 af zijn (alles wat hij ziet en gebruikt); fase 6 en 7 worden met zijn pagina's afgemaakt, want die hebben gepubliceerde pagina's nodig. Gevolg: er is geen meetlat van de huidige keten; de vergelijking loopt via de proefmerken (K6, A1) |
| V6 | Ziet de klant zelf het kennisoverzicht, en mag hij bevestigen? | **Ja.** "Bevestigd" is de hoogste status en kan alleen van een mens komen; de klant is de beste bron | K7 || **Nee: alleen de consultant ziet en beheert het kennisoverzicht** (26 september 2026), tegen het advies in. De klant bevestigt in het gesprek; de consultant legt het vast. "Bevestigd" komt daarmee altijd via de consultant |
| V7 | Een lichte gebeurtenissenlaag in Postgres, of een externe dienst (berichtenwachtrij)? | **Licht, in Postgres**, op de bestaande wachtrij. Bij drie merken is een externe dienst alleen extra onderhoud | G1 || **In de bestaande database**, zoals geadviseerd (26 september 2026) |
| V8 | Mag het systeem leren over merken heen ("dit type pagina werkt vaak"), of alleen per merk? | **Eerst alleen per merk.** Over merken heen raakt aan wat klanten van elkaar mogen weten, en vraagt veel meer data dan er is | L2 || **Eerst alleen per merk**, zoals geadviseerd (26 september 2026) |
| V9 | Waar leest de meting de velden die haar sturen (merknaam, andere namen, gelijknamige bedrijven, bereik, werkgebied, concurrenten, markt en taal) na K8? | **De kennislaag is de enige schrijfingang; `lib/kennis/` houdt een kopie op `profiles` bij, en de meting blijft die kopie lezen.** Eén waarheid zonder de meting om te bouwen | K1, K2, K8 || **Kennislaag met kopie**, zoals geadviseerd (26 september 2026). De kopie heeft geen eigen schrijver: alleen `lib/kennis/` schrijft hem, en K8 bewaakt dat met een test |
| V10 | Komen de twaalf lege, ongelezen velden terug op het kennisoverzicht (auteur, missie, positionering, USP, tweede doelgroep, wettelijke beperkingen)? | **Nee.** Niemand leest ze en ze zijn bij alle drie de merken leeg (`kennismodel-inventaris.md` §2). De kolommen blijven staan (conventie 4); een wettelijke beperking wordt een item in het domein grens | K7, K8 || **Nee, ze verdwijnen van het formulier**, zoals geadviseerd (26 september 2026) |
| V11 | Wie mag de tabel `klantkennis` lezen? (K1 zei: eigenaar en staf) | **Alleen medewerkers.** De klant ziet het kennisoverzicht niet (V6), de tabel bevat wat een model alleen denkt, en de app leest hem via de server | K1 || **Alleen medewerkers**, zoals geadviseerd (26 september 2026). Wijkt af van de oorspronkelijke tekst van K1, die hierop is aangepast |
| V12 | Krijgt een kennisitem een eigen veld voor bewijskracht (sterk, gewoon, geen)? | **Ja.** De schrijver zet nu de sterkste feiten eerst (`kiesFeiten()`); zonder dit veld gaat die volgorde verloren in K6 | K1, K6 || **Ja, een eigen veld naast de status**, zoals geadviseerd (26 september 2026) |
| V13 | Hoe leggen we vast dat kennis alleen voor één onderwerp of één pagina geldt? | **Twee eigen verwijzingen**, naar het cluster (`analysis_id`) en naar de pagina (`content_piece_id`), naast `geldt_voor`. De database controleert dan dat ze bestaan | K1, K5 || **Twee eigen verwijzingen**, zoals geadviseerd (26 september 2026) |
| V14 | Hoe gaat de kennislaag om met een botsing (twee waarden voor hetzelfde)? Het feitenregister laat een model oordelen | **De code herkent de botsing (`vindKandidaten()`) en zet hem op de bestaande conflictlijst, met een eigen verwijzing naar de kennis (`fact_conflicts.kennis_ids`).** Beide items blijven staan; de consultant beslist op het kennisoverzicht (K7). Geen AI-aanroep (§4 regel 1) | K2, K7 || **Herkennen en bewaren**, zoals geadviseerd (26 september 2026) |
| V15 | Hoe draait het terugvullen (K3) op productie, als de werkomgeving de sleutel van de productiedatabase niet heeft? | **Het script maakt de lijst met dezelfde regels als `legVast()` (geldigheid, status per actor, ontdubbelsleutel) en schrijft een bestand; dat bestand gaat via de databaseverbinding van de beheertool naar productie, waar de check-constraints alles nog eens toetsen.** Met de sleutel in de omgeving schrijft hetzelfde script rechtstreeks via `legVast()` | K3 || **Via de databaseverbinding**, zoals geadviseerd (26 september 2026). Geen geheime sleutel buiten Vercel |
| V16 | Wat gebeurt er met een feit waarvan de code niet kan vaststellen voor welke dienst het geldt (11 van de 24 op 26 september 2026)? | **Voorlopig merkbreed, met de oude tekst in `ruw`, en op de lijst voor de consultant.** K6 zet de schrijver pas over als die lijst leeg is, zodat een prijs niet stil op een pagina over iets anders belandt | K3, K6 || **Merkbreed, op een lijst**, zoals geadviseerd (26 september 2026) |
| V17 | Wat gebeurt er met de data van de drie proefmerken? De eigenaar hecht er zelf geen waarde aan | **Bewaren tot A1 klaar is, daarna alles verwijderen.** K6 en A1 bewijzen een verbetering door de oude en de nieuwe versie naast elkaar te leggen (V5); zonder de oude data kan dat niet meer | K6, A1 || **Bewaren tot na A1**, zoals geadviseerd (26 september 2026). Tot die tijd hoeft niemand de data te sparen: omzetten mag zonder voorzichtigheid, en na A1 hoeft geen werkpakket er nog rekening mee te houden. Het verwijderen zelf is onomkeerbaar en gebeurt pas na een laatste bevestiging van de eigenaar (§12) |
| V18 | Krijgt een nieuw sitefeit uit het onderzoek (K4) meteen een soort en een waarde in de kennislaag? De samenvatting kent die niet; het feitenregister deelt feiten pas later in, als eigen taak, en alleen op `brand_facts` | **Nog niet. Tot K8 komt een nieuw sitefeit zonder soort in de kennislaag, in het domein aanbod, net als een feit zonder soort bij K3 (`domeinVanFeit(null)`). In K8 verhuist de indeling naar de kennislaag**, want na K8 schrijft niemand meer in `brand_facts`. Zonder soort vindt de kennislaag bij zo'n feit geen botsing; het feitenregister vindt die tot K8 nog wel op de oude tabel | K4, K8 || **Gekozen bij het bouwen van K4, volgens advies** (26 september 2026). De eigenaar kan dit terugdraaien: dan komt de indeling in K4 of K5. **In K8 deel 2 gedaan** (27 september 2026): de indeling staat op het kennisitem (`lib/kennis/indelen.ts`) |
| V19 | Tellen getallen van één of twee cijfers mee in de ontdubbelsleutel van de kennislaag? `claimKey()` laat ze weg, net als "de" en "is" | **Ja, achteraan in de sleutel.** Zonder dat hebben "80 procent" en "85 procent", of € 45 en € 50, dezelfde sleutel, en `legVast()` gooit de tweede stil weg als "bestond al". Gevonden bij het bouwen van K5: een gewijzigd antwoord kwam zo nooit in de kennislaag. Een bewering zonder zo'n getal houdt zijn sleutel; op productie verandert de sleutel van 84 van de 517 items, en bij het terugvullen van K3 is hierdoor niets samengevallen (nagelopen over de vier merken). De sleutels zijn herberekend met `scripts/kennis-sleutels-herberekenen.ts`, direct na de uitrol (26 september 2026; een tweede run vindt er 0) | K5 || **Gekozen bij het bouwen van K5, volgens advies** (26 september 2026) |
| V20 | Wordt een veld dat een mens op het gespreksscherm opslaat in zijn geheel verklaard, of alleen wat die mens eraan veranderde? Het terugvullen (K3) nam de herkomst per veld over, dus een veld dat ooit in het gesprek is opgeslagen, heette daar helemaal verklaard | **Alleen wat er veranderde.** Een vermoeden van het model laten staan is geen uitspraak van de klant (P2). Wat erbij komt, wordt verklaard; wat een mens weghaalt, wordt afgewezen (bewaard, telt niet meer mee, komt niet stil terug); een andere tekst op dezelfde plek wordt een nieuwe versie. Bevestigen van wat bleef staan, gebeurt op het kennisoverzicht (K7) | K5, K7 || **Gekozen bij het bouwen van K5, volgens advies** (26 september 2026) |
| V21 | Welke status krijgt een feit uit een aangeleverd document (het merkdossier) in de kennislaag? De inventaris stelde *waargenomen* voor, met de zin als citaat | **Verklaard, met de letterlijke zin als citaat en het document als herkomst.** Waargenomen eist een bronadres (regel en check-constraint van K1), en een geplakte tekst heeft er geen; een nepadres verzinnen is erger. Het document is materiaal van de klant zelf, dus "de klant zei het" klopt. Wie het plakte, legt het vast. De code controleerde al dat de zin letterlijk in het document staat (`verifyDossierFacts()`). Dezelfde sleutel als het antwoord op die merkvraag, zodat een latere wijziging een nieuwe versie wordt | K8 || **Gekozen bij het bouwen van K8 deel 1, volgens advies** (27 september 2026) |
| V22 | Waar lezen de meting, het rapport, de onderwerpen en de aanbodboom de klantkennis na K8, nu ze de kolommen van `profiles` (en `profile_offerings`) op honderden plekken lezen? | **Besluit V9 voor alle kennisvelden: de kennislaag is de enige schrijfingang, `lib/kennis/` houdt de kolommen bij als kopie, en de lezers blijven de kopie lezen.** Honderden leesplekken omzetten kost vele sessies en levert geen andere uitkomst op; één schrijver maakt de kopie betrouwbaar. Een test faalt als iets buiten `lib/kennis/` een kennisveld schrijft. Een lezer die iets met de status moet doen (blok A, het kennisgat, het kennisoverzicht) leest de kennislaag zelf | K8 || **Gekozen bij de verdeling van K8, volgens advies** (27 september 2026). De eigenaar kan dit terugdraaien: dan wordt elke lezer omgezet, en dat is per groep lezers een eigen werkpakket |
| V23 | Voor wie geldt het antwoord op een gerichte vraag van een pagina? Sinds K5 alleen voor die pagina (`content_piece_id`), omdat een vraag geen dienst kende | **Voor de dienst van de kans achter die pagina** (`geldt_voor`), zodat een volgende pagina over dezelfde dienst het niet opnieuw vraagt (A2). Niet voor een praktijkvoorbeeld of de open vraag (B3), en niet als er geen kans met een dienst is | A2 || **Gekozen bij het bouwen van A2, volgens advies** (27 september 2026) |

---

## 4. Verboden (absoluut)

1. **Geen nieuwe AI-aanroep om kennis samen te voegen of op te schonen.** Terugvullen, indelen naar
   domein en ontdubbelen gebeurt in code. Waar een oordeel nodig is, beslist de consultant.
2. **AI schrijft nooit een item met status *verklaard* of *bevestigd*** in de kennislaag. Een test
   bewaakt dat alleen de routes voor klantantwoorden, het gesprek, de keuze bij een tegenstrijdigheid
   (toegevoegd in K5, zie daar) en het kennisoverzicht die statussen zetten, ook via een omweg door een
   module die ze aanroept.
3. **Geen tweede schrijfingang naar de kennislaag.** Alles gaat via `lib/kennis/` (K2). Een test
   faalt bij een `insert` of `update` op `klantkennis` buiten die map.
4. **Geen afgeleid item in blok A**, ook niet "als achtergrond".
5. **Geen automatische heruitvoering bij een wijziging** zonder dat de consultant het ziet (G3). Een
   wijziging markeert wat er geraakt wordt; opnieuw laten draaien kost geld en is een handeling.
6. **Geen één samenvattend opbrengstcijfer** op het klantscherm (P7).
7. **Geen nieuwe stap, beoordelaar of score in de contentketen.** `contentketen-opnieuw.md` §3 blijft
   gelden. Wat dit plan aan de contentketen verandert, is invoer (blok A, kennisgaten) en de reikwijdte
   van de bestaande controle (V4).
8. **Geen grafendatabank of vectordatabank.** De "knowledge graph" uit de feedback is hier een tabel
   met verwijzingen (`geldt_voor`, afhankelijkheden). Postgres is genoeg bij deze schaal.

---

## 5. Buiten de scope

- De Sales-module en het zijproject Solliciteren.
- Mijn reputatie.
- Echte zoekvolumes via DataForSEO (geparkeerd, `docs/tasks/zoekdata-in-de-keten.md`) en de
  CMS-koppeling met WordPress en Shopify (`ontwikkelplan-visie.md` sprint 8 en 9). Die kunnen later als
  nieuwe kansbron of als publicatieroute aansluiten op dit model; daar is het op ontworpen.
- Conversie- en omzetgegevens (Google Analytics, een CRM). De bewijsladder (M4) heeft er een plek voor,
  met de status "geen gegevens", maar de koppelingen zelf zitten niet in dit plan.
- De verschuiving van doelgroep uit `visie.md` (grotere organisaties). Dit plan maakt die mogelijk, maar
  verandert de doelgroep niet.

---

## 6. Het doelmodel

Vijf domeinobjecten. Per object: wat het is, de velden, en welke bestaande tabel erin opgaat. De
precieze kolomnamen worden in het werkpakket vastgelegd; dit is de inhoud.

### 6.1 Klantkennis (`klantkennis`)

Eén rij per kennisitem: alles wat ORBIT denkt te weten over het bedrijf, hoe het dat weet, en waarvoor
het gebruikt mag worden.

| Veld | Betekenis |
|---|---|
| `profile_id` | Het merk |
| `domein` | identiteit, aanbod, doelgroep, positionering, bewijs, stem, verhaal, grens, geleerd |
| `soort` | Binnen het domein, bijvoorbeeld: prijs, termijn, werkgebied, dienst, bezwaar, voorbeeld, verboden woord (sluit aan op de soorten van `fact-classify.ts`) |
| `bewering` | De uitspraak in gewone taal, zoals een schrijver hem kan gebruiken |
| `waarde` | Genormaliseerd waar het kan (bedrag, getal met eenheid, plaats), anders leeg |
| `status` | **waargenomen** (uit een bron gehaald, met citaat), **verklaard** (de klant zei het), **bevestigd** (gevonden en door een mens bevestigd), **afgeleid** (AI denkt het) |
| `bewijskracht` | sterk, gewoon, geen: hoe overtuigend de bewering is, naast hoe zeker we hem weten (besluit V12) |
| `bron` | website, klant, gesprek, document, extern, meting, ai |
| `bron_url`, `citaat` | Waar het staat, letterlijk. Verplicht bij *waargenomen* |
| `vastgelegd_door`, `vastgelegd_door_taak`, `vastgelegd_op`, `bevestigd_door`, `bevestigd_op` | Wie: een mens, of bij code en modellen de taaksoort. Bevestigd eist wie en wanneer |
| `laatst_gecontroleerd_op`, `verloopt_op` | Voor feiten die kunnen verouderen (prijzen, termijnen) |
| `gebruik` | **content** (mag op een pagina), **intern** (alleen voor vragen, kansen en analyse), **verboden** (de klant zei: dit niet) |
| `geldt_voor` | Verwijzingen naar andere kennisitems: deze dienst, deze regio, deze doelgroep. Leeg is merkbreed |
| `analysis_id`, `content_piece_id` | Alleen voor dit onderwerp of deze ene pagina (besluit V13). Leeg is geen beperking |
| `vervangen_door` | Bij een nieuwere versie. Nooit verwijderen |
| `afgewezen_door`, `afgewezen_op` | Een mens zei "dit klopt niet". Het item blijft bewaard maar telt nergens meer mee, en komt bij een volgende onderzoeksronde niet stil terug (toegevoegd in K2, migratie 0117) |
| `herkomst_tabel`, `herkomst_id` | De tabel en de rij waar het vandaan kwam: een klantvraag, een document, een meting, een oude rij in `brand_facts` |
| `sleutel` | Ontdubbelsleutel voor K2: per merk één actueel item per sleutel |
| `ruw` | Wat de bron letterlijk opleverde (conventie 8) |

**Welke status mag waarheen:**

| Status | In een pagina (blok A) | Vragen en kansen | Kennisoverzicht |
|---|---|---|---|
| waargenomen, met gecontroleerd citaat | ja | ja | ja, met bron |
| verklaard | ja | ja | ja, "volgens jou" |
| bevestigd | ja, eerst | ja | ja, met vinkje |
| afgeleid | **nooit** | ja, als hypothese | ja, als "we denken", met knop bevestigen of afwijzen |
| gebruik = verboden | nooit, en de schrijver krijgt hem als verbod | nee | ja |

**Wat erin opgaat** (terugvullen in K3, schrijvers omzetten in K4 en K5): `brand_facts`,
`profile_offerings`, de kennisvelden van `profiles` (zie de inventaris van F0.2), `profile_facets`
(waar het kennis is en geen onderzoeksverslag), beantwoorde `fact_requests`, `profiles.verhalen`,
`stem_voorbeelden`, `taboo_phrases`, `forbidden_topics`, `sales_objections`, `differentiator`,
`offline_proof`, `value_props`, `proof_points`, `profile_field_sources` (als herkomst).

### 6.2 Kans (`kansen` en `kans_bewijs`)

Eén kans per te nemen actie op een klantbehoefte, ongeacht waar hij vandaan kwam.

| Veld | Betekenis |
|---|---|
| `profile_id`, `cluster_id` | Het merk, en het gemeten cluster als dat er is |
| `titel`, `lezer` | Wat, en voor wie in één zin (het huidige `targetIntent`) |
| `handeling` | nieuwe pagina, bestaande pagina verbeteren (met adres) |
| `bronnen` | consultant, chatgpt, ai_overview, gemini, search_console, structuur (dienst zonder pagina) |
| `geldt_voor` | Verwijzingen naar kennisitems: dienst, regio, doelgroep |
| `commerciele_waarde` | Uit de commerciële prioriteiten van het merk (kennislaag) en de potentie |
| `kennis_bekend`, `kennis_ontbreekt` | Uitkomst van het kennisgat (N6) |
| `status` | open, ingepland, in voorbereiding, geschreven, gepubliceerd, vervallen, te herzien |
| `uitleg` | De zin die de kans onderbouwt, opgebouwd in code uit het bewijs (N1), nooit door een model |

`kans_bewijs`, één rij per bron per kans: de doelvragen met hun meting (`runId`), de Search
Console-zoekopdrachten met vertoningen en klikken, of de eigen site in AI Overview geciteerd wordt,
welke concurrenten genoemd worden, en een verwijzing naar het rapport of de meting waar het uit komt.

**Wat erin opgaat:** `reports.recommendations_json` blijft de ruwe AI-uitvoer (conventie 8), maar de
voorraad in `planned_pages` gaat naar een kans verwijzen (`kans_id`) in plaats van naar
`source_ref`. De bron `zoekverkeer` van `lib/opportunities.ts` wordt bewijs in `kans_bewijs`.

### 6.3 Contentasset (bestaand: `content_pieces`)

Blijft de tabel die hij is, met versies, controle en goedkeuring. Erbij komen:
- `kans_id`: de kans waarvoor hij geschreven is;
- `gebruikte_kennis`: de ids van de kennisitems die in de invoer van déze versie zaten. Dat legt de
  code vast, niet de schrijver (besluit B9 in `contentketen-opnieuw.md` blijft staan);
- het publicatiepakket (`lib/oplevering.ts`) met een voorstel voor het adres en voor interne links.

### 6.4 Meting (`meetplannen` en een uitbreiding van `content_impact`)

- **Meetplan**, vastgelegd zodra een pagina wordt goedgekeurd: doelvragen, controlegroep (vast
  bepaald), doelpagina (het adres zodra hij live staat), regio, de zoekopdrachten uit Search Console,
  de bronnen waarop gemeten wordt, de nulmeting.
- **Uitkomst per bron en per golf**: ChatGPT (genoemd, positie, rol), AI Overview, citatie van de eigen
  pagina, Search Console (vertoningen, klikken, positie), elk met de controlegroep ernaast waar dat kan.
- **Bewijsladder** per pagina (M4): gepubliceerd, zichtbaar in zoekmachines, genoemd door AI,
  geciteerd door AI, verkeer, conversie, omzet. Per trede: bewezen, geen verandering, te weinig
  gegevens, of geen gegevens.

### 6.5 Gebeurtenis en afhankelijkheid (`gebeurtenissen`, `afhankelijkheden`)

- **Gebeurtenis**: iets wat in het domein gebeurde, met het merk, het object en wat er veranderde.
  Bijvoorbeeld: kennis gewijzigd, kans goedgekeurd, maand vrijgegeven, pagina gepubliceerd, meting
  afgerond.
- **Afhankelijkheid**: "deze kans, meetvraag of pagina leunt op dit kennisitem". Wordt gevuld door wie
  het object maakt (N2, C3), niet achteraf geraden.
- **Abonnee**: een functie die bij een gebeurtenis bepaalt wat er moet gebeuren, en daarvoor taken in
  de bestaande wachtrij zet of objecten op "te herzien" zet.

---

## 7. De contentketen in dit plan

De keten uit `contentketen-opnieuw.md` is al wat de feedback voorstelt: kans, lezersbrief,
klantvragen, één sterke schrijfbeurt, controle in code, één redactionele beoordeling, goedkeuring,
publicatiepakket. **Hij wordt niet herbouwd.** Dit plan raakt hem op vier plekken, elk met een besluit
in §2 van dat document voordat er code verandert:

| Plek | Wat verandert | Werkpakket |
|---|---|---|
| Blok A | Komt uit de kennislaag, met de statusregels van §6.1 | K6 |
| De brief | Krijgt de kennisgaten van de kans mee: "dit weten we over deze dienst niet" | A1 |
| Antwoorden | Worden klantkennis, en zijn daarna bij elke pagina over dezelfde dienst bruikbaar | K5, A2 |
| De controle | Leest ook de FAQ en de metabeschrijving (V4) | C1 |

Het aantal AI-aanroepen per pagina blijft drie tot vier. De verbeterlus (WP9 van dat plan) blijft de
manier om de tekstkwaliteit te verbeteren.

---

## 8. De werkpakketten

Per werkpakket: **doel**, **wat**, **niet**, **klaar als**. De nummers zijn vast; de volgorde staat in
§9. Een schatting van het aantal sessies staat in §13.

### Fase 0. Het fundament vastleggen (geen gedragsverandering)

#### F0.1 De eerste echte klant, na fase 5
- **Verschoven door besluit V5** (26 september 2026): de klant wacht tot fase 1 tot en met 5 af zijn.
  Het nummer blijft F0.1, de plek in de volgorde (§9) is na C3.
- **Doel:** de eerste echte klant door de nieuwe opbouw, en daarmee de gepubliceerde pagina's die fase 6
  en 7 nodig hebben. Wat verandert de ondernemer aan onze teksten, welke vragen leverden iets op?
- **Wat:** de doorloop van `docs/doorloop-van-klant-tot-content.md` (dan bijgewerkt) met de eerste
  klant. Het rapport uit `docs/tasks/meting-eerste-klant.md`.
- **Niet:** tussentijds de keten aanpassen, tenzij iets echt kapot is.
- **Klaar als:** het rapport van de klantmeting staat in `docs/tasks/`, met per pagina het oordeel van
  de ondernemer, en de uitkomst staat in `docs/logbook.md`.

#### F0.2 De inventaris van alle klantkennis
- **Doel:** weten wat er in de kennislaag moet, en wat weg kan.
- **Wat:** een tabel in `docs/tasks/kennismodel-inventaris.md` met één rij per kolom of veld dat iets
  over het bedrijf zegt: de 94 kolommen van `profiles`, `brand_facts`, `profile_offerings`,
  `profile_facets`, `profile_strategy`, `fact_requests`, `brand_documents`. Per rij: domein (§6.1),
  status, gebruik, wie schrijft het, wie leest het (met `grep`), en het voorstel: meenemen, alleen
  herkomst, of niet meer gebruiken.
- **Niet:** code of migraties.
- **Klaar als:** elke kolom heeft een rij; de kolommen die niemand meer leest, zijn gemarkeerd; de
  eigenaar heeft de tabel gezien.

#### F0.3 De besluiten
- **Doel:** V1 tot en met V8 beslist voordat er gebouwd wordt.
- **Wat:** één sessie met de eigenaar; de kolom "Besluit" in §3.2 invullen met datum. De besluiten die de
  contentketen raken (V2, V4, en straks de invoerwijzigingen van §7) ook als besluit in
  `contentketen-opnieuw.md` §2.
- **Klaar als:** §3.2 is ingevuld.

### Fase 1. De kennislaag

#### K1 Het datamodel en de regels
- **Doel:** één tabel en één set regels voor alle klantkennis.
- **Wat:** migratie `klantkennis` volgens §6.1 (met RLS: alleen staf leest, besluit V11 van 26
  september 2026; schrijven alleen via de service role). Een pure module `lib/kennis/regels.ts`: welke status en welk
  gebruik waarheen mag (de tabel in §6.1), welke overgangen mogen (afgeleid naar bevestigd alleen door
  een mens; waargenomen vereist een citaat), wanneer een item verlopen is. Typen in
  `lib/types/database.ts`, de index in `supabase/README.md`.
- **Niet:** schrijvers of lezers omzetten.
- **Klaar als:** de tabel bestaat op productie; minstens 25 eenheidstests op de regels, waaronder: een
  afgeleid item komt nooit in de set voor blok A; een waargenomen item zonder citaat wordt geweigerd; een
  verboden item komt alleen als verbod mee.

#### K2 Eén schrijfingang
- **Doel:** niemand schrijft klantkennis buiten één module om.
- **Wat:** `lib/kennis/vastleggen.ts` met `legVast()`, `bevestig()`, `wijsAf()`, `vervang()`. Herkomst
  verplicht. Ontdubbelen op een sleutel (zoals `claimKey()`). Tegenstrijdigheden via de bestaande logica
  van het feitenregister (`conflict-detect.ts`, `fact_conflicts`), nu op de kennislaag. Een test in
  `test-unit.ts` die faalt bij een schrijfactie op `klantkennis` buiten `lib/kennis/`, en een test dat
  alleen de routes voor klantantwoorden, het gesprek en het kennisoverzicht de status verklaard of
  bevestigd kunnen zetten (§4 regel 2).
- **Klaar als:** de twee bewakingstests draaien, en een ketentest legt vast, vervangt en bevestigt een
  item met de herkomst intact.

#### K3 Terugvullen uit wat er al staat
- **Doel:** de kennislaag bevat alles wat ORBIT nu al weet, voor de drie proefmerken en de eerste klant.
- **Wat:** een idempotent script (`scripts/kennis-terugvullen.ts`), deterministisch, volgens de
  inventaris van F0.2: `brand_facts` naar bewijs en aanbod (met `kind` en `stand` als status),
  `profile_offerings` naar aanbod (met citaat, dus waargenomen), beantwoorde vragen naar verklaard, het
  gesprek naar verklaard, verhalen naar verhaal, stemvoorbeelden naar stem, verboden woorden en
  onderwerpen naar grens (gebruik verboden), `value_props` en `proof_points` naar waargenomen of afgeleid
  al naar gelang er een citaat is.
- **Niet:** een AI-aanroep om te verdelen of op te schonen (§4 regel 1). Wat de code niet kan indelen,
  komt op een lijst voor de consultant.
- **Klaar als:** per merk een telling per bron en domein, en een test dat elke rij uit de oude tabellen
  een rij (of een bewuste uitsluiting met reden) in de kennislaag heeft. Gedraaid op productie.

#### K4 Het onderzoek schrijft in de kennislaag
- **Doel:** nieuwe kennis uit het onderzoek komt meteen op de goede plek, met de goede status.
- **Wat:** `profile_research`, `profile_offering`, `profile_synthesis`, `profile_market` en de
  kennistest schrijven via `legVast()`. Feiten met gecontroleerd citaat als waargenomen; oordelen van het
  model (positionering, "waarschijnlijk is snelheid belangrijk") als afgeleid. Tijdens de overgang
  schrijven ze ook nog de oude tabel; dat stopt in K8.
- **Niet:** de opdrachten aan de modellen veranderen, behalve wat nodig is om een citaat mee te krijgen.
- **Klaar als:** een ketentest laat een onderzoek draaien met testtransport en vindt de verwachte items,
  met status en herkomst. Eén nieuw proefmerk op productie aangemaakt en nagekeken.

#### K5 Het gesprek en de antwoorden schrijven in de kennislaag
- **Doel:** wat de klant vertelt, wordt klantkennis die blijft.
- **Wat:** het gespreksscherm, `answerFact()` en de keuze bij een tegenstrijdigheid schrijven via
  `legVast()` of `bevestig()`. Een antwoord op een gerichte vraag wordt verklaard, met `geldt_voor` van
  de vraag (merk, dienst of pagina). Het antwoord op de open vraag wordt een item in het domein verhaal,
  letterlijk, met gebruik "alleen deze pagina" tenzij de ondernemer aangeeft dat het voor zijn hele
  bedrijf geldt (besluit B3 van de contentketen).
- **Klaar als:** een ketentest beantwoordt een gerichte vraag en de open vraag en vindt beide als
  verklaard terug, met de juiste `geldt_voor`.
- **Bijgesteld bij het bouwen (26 september 2026), omdat de tekst hierboven niet meer klopte met de code:**
  - *"Met `geldt_voor` van de vraag (merk, dienst of pagina)":* een vraag kent geen dienst, alleen het
    merk, het cluster (`analysis_id`) en de pagina's (`content_piece_ids`). Sinds besluit V13 staat de
    reikwijdte daarom in `analysis_id` en `content_piece_id` van het item, zoals het terugvullen (K3) het
    al deed, en blijft `geldt_voor` leeg. De koppeling aan een dienst komt met de kans (N2, N6).
  - *"Met gebruik 'alleen deze pagina'":* `gebruik` kent alleen content, intern en verboden. Het verhaal
    krijgt gebruik content, en "alleen deze pagina" is `content_piece_id` (V13).
  - *"Tenzij de ondernemer aangeeft dat het voor zijn hele bedrijf geldt":* op het scherm kan de
    ondernemer dat bij de open vraag niet aangeven; de open vraag is altijd voor één pagina. De code volgt
    de reikwijdte van de vraag, dus een open vraag voor het merk zou merkbreed worden. Een knop op het
    scherm heeft pas zin als de schrijver uit de kennislaag leest (K6), en hoort bij A2.
  - *De keuze bij een tegenstrijdigheid:* de conflictroute stond niet op de lijst van §4 regel 2; K5 voegt
    hem toe, en `lib/facts.ts` (dat de route voor klantantwoorden uitvoert).
  - Besluiten V19 en V20 (§3.2) kwamen uit dit werkpakket.

#### K6 Blok A leest uit de kennislaag
- **Doel:** de schrijver krijgt gecontroleerde klantkennis, en niets wat alleen AI denkt.
- **Wat:** `kennisVoor(pagina)` in `lib/kennis/` levert blok A: alleen de statussen die §6.1 toestaat,
  bevestigd eerst, gefilterd op `geldt_voor` (merkbreed, deze dienst, deze regio), verboden items als
  verbod. `lib/pagina/bedrijfskennis.ts` en `context.ts` gebruiken dat. De bronnen voor de controle op
  harde beweringen komen uit dezelfde set. Eerst als besluit in `contentketen-opnieuw.md` §2, en
  `lib/kennis/` erbij op de importlijst van §7.3 daar.
- **Niet:** de schrijfopdracht veranderen.
- **Voorwaarde (besluit V16):** de lijst voor de consultant uit K3 met feiten zonder gekoppelde dienst is
  leeg. **Vervuld op 27 september 2026:** alle twintig punten afgehandeld (zes gekoppeld aan een dienst,
  zes merkbreed, vier prijzen met het letterlijke citaat van de site, vier keer "offerte op aanvraag" opgegaan
  in een feit over de offerte); zie `scripts/kennis-open-punten.ts`.
- **Klaar als:** een ketentest laat zien dat een afgeleid item niet bij de schrijver komt en een
  verklaard item wel; de vier pagina's van WP9 ronde 2 opnieuw geschreven op productie en paarsgewijs
  vergeleken met de vorige versie (de verbeterlus van de contentketen). Kosten per pagina gelijk of
  lager.
- **Bijgesteld bij het bouwen (27 september 2026):**
  - *Besluit B20* in `contentketen-opnieuw.md` §2, en `lib/kennis/voor-pagina.ts` en `blok-a.ts` op de
    importlijst van §7.3 daar.
  - *Welke dienst:* die van de kans achter de pagina (N2), met alles wat eronder hangt (een prijs onder een
    dienst onder een categorie). Zonder kans de diensten waarvan de naam in de titel of de zoekintentie
    staat, zoals het oude blok A het deed. Een dienst of categorie van de aanbodboom komt alleen mee als hij
    bij de kans hoort, ook als hij nergens onder hangt (na het herschrijven op productie: anders kreeg een
    warmtepomppagina ook airco en zinkwerk als bedrijfskennis).
  - *Wat verviel:* "waar het bedrijf voor staat" uit `value_props` (een oordeel van het merkonderzoek, P3), en
    de feiten uit `brand_facts` zonder citaat. De stem gaat niet in blok A: die krijgt de schrijver al apart.
  - *Verboden:* een verbod uit de kennislaag telt voor elke pagina, ook als het aan een dienst hangt, en
    naast wat het merkprofiel als kopie draagt (tot K8 schrijven beide).
  - *De opdracht:* versie 4, alleen omdat de invoer anders is (WP9: elke tekst terug te leiden naar zijn
    invoer).
- **Gevonden in K5 (26 september 2026):** een nieuwe versie van een pagina krijgt een nieuw id
  (`lib/pagina/taken.ts` hangt de vragen er dan ook aan), maar een kennisitem met `content_piece_id` wijst
  naar de versie waarvoor het antwoord gegeven is. `kennisVoor(pagina)` moet dus alle versies van de pagina
  meenemen, anders verdwijnt het verhaal van de open vraag bij de eerste herschrijving.

#### K7 Het kennisoverzicht
- **Doel:** de klant en de consultant zien wat ORBIT weet, waar het vandaan komt, en kunnen het
  verbeteren.
- **Wat:** een scherm "Wat we over je bedrijf weten" per domein, met per item de herkomst, de status, en
  de handelingen bevestigen, aanpassen, dit klopt niet, en dit wil ik niet op mijn site. Afgeleide items
  apart, als "wat we denken". Volgt `docs/designsystem.md` en `docs/schrijfstijl.md`. Vervangt de
  kennisvelden op "merkprofiel bewerken" (de rest van dat scherm blijft).
- **Alleen voor de consultant** (besluit V6): de klant ziet dit scherm niet. Wat de klant in het gesprek
  bevestigt, legt de consultant hier vast.
- **Klaar als:** als consultant bevestigd en afgewezen op een proefmerk; de status verandert; een
  afgewezen item verdwijnt uit blok A; met een klantlogin is het scherm niet te bereiken.
- **Gevonden in K5 (26 september 2026):** (1) laat de consultant de ondernemer kiezen bij een
  tegenstrijdigheid, dan komt diens keuze als verklaard antwoord binnen, maar de twee sitefeiten blijven in
  de kennislaag actueel (in de oude tabel zet de feitentaak ze op vervangen). Die beslissing hoort hier,
  want bevestigen en afwijzen doet alleen de consultant (V6). (2) "Niet van toepassing" op het
  gespreksscherm verandert niets in de kennislaag. (3) Botsingen tussen kennisitems staan op de
  conflictlijst met `kennis_ids`, maar het huidige conflictscherm toont alleen die tussen feiten.
- **Verdeeld over twee sessies (27 september 2026):**
  - *Deel 1:* het scherm onder Admin (`/merk/[id]/admin/kennis`), de vier handelingen
    (`lib/kennis/overzicht.ts` en `uit-overzicht.ts`, route `api/profiles/[id]/kennis/[itemId]`) en de
    klaar-als hierboven.
  - *Deel 2:* de drie bevindingen uit K5, en "merkprofiel bewerken".
  - *Bijgesteld bij deel 2:* "vervangt de kennisvelden op merkprofiel bewerken" is geschreven vóór besluit
    V6. Sinds V6 ziet de klant het kennisoverzicht niet, en merkprofiel bewerken is juist de plek waar de
    klant zelf iets vertelt (wat hij opslaat komt sinds K5 als verklaard in de kennislaag). De velden
    blijven daarom staan; de consultant krijgt er een verwijzing naar het kennisoverzicht. Het weghalen van
    de twaalf lege velden (V10) hoort bij K8.
  - *Gevonden bij deel 2:* sinds K6 gingen twee feiten die elkaar tegenspreken allebei naar de schrijver,
    want blok A las de conflictlijst niet meer. Nu houdt `lib/kennis/betwist.ts` tegen wat op een open
    conflict staat, wat bij een keuze verloor en wat botst in de kennislaag. Op productie stond geen
    conflict open, dus er is niets verkeerd geschreven.
  - *Twee keuzes bij het bouwen.* "Niet op de site" zet het gebruik op intern in dezelfde rij, zonder
    nieuwe versie: bewering en status blijven gelijk, en een nieuwe versie zou een bevestiging kwijtraken
    (een nieuw item kan niet als bevestigd beginnen). En een bevestigd vermoeden mag op een pagina: het
    stond alleen op intern omdat het een vermoeden was.

#### K8 De oude schrijvers en lezers opruimen
- **Doel:** één waarheid, ook in de code.
- **Wat:** de dubbele schrijfacties van K4 en K5 stoppen. Een test die faalt als de kolommen uit de
  inventaris met "niet meer gebruiken" buiten `lib/types/database.ts` nog gelezen worden.
- **Klaar als:** die test draait; `docs/architecture.md` §3 beschrijft de kennislaag.
- **Gevonden in K5 (26 september 2026):** twee plekken schrijven klantkennis nog alleen in de oude tabel,
  en moeten vóór het stoppen van het dubbele schrijven over: de tekst van de stemvoorbeelden (de code haalt
  hem op na het opslaan, `haalStemvoorbeeldenOp()`; waargenomen, zoals het terugvullen hem vastlegde) en
  het merkdossier (`dossier/route.ts`, feiten uit een geplakt document, met de letterlijke bronzin; bron
  document).
- **Verdeeld over drie sessies (27 september 2026).** Het dubbele schrijven kan pas stoppen als niets de
  oude kolommen meer leest, en dat is veel: `industry` staat in 39 bestanden, `summary` in 38,
  `competitors` in 36, `brand_name` in 34, `service_regions` in 32 (geteld zonder de typen, de
  veldencatalogus, de voorbeelden en `lib/kennis/`). Daarom, zoals bij K7:
  - *Deel 1:* wat geen lezer meer heeft opruimen, de twee plekken die alleen in de oude tabel schreven
    overzetten, de bewakingstest en `docs/architecture.md` §3. De twaalf lege velden van V10 van het
    formulier en het gespreksscherm, en ook `proof_points`: dat stond in de inventaris al op "niet meer
    gebruiken", dus de test eist dat hij van het formulier gaat. Het antwoord op een vraag gaat niet
    meer als regel naar `proof_points`, het onderzoek zet er niets meer in (de bewijspunten van het
    model gaan alleen de kennislaag in, als vermoeden), en `tone_of_voice`, `style_samples` en
    `suggested_answer` hebben geen lezer of schrijver meer.
  - *Deel 2, de feiten:* de indeling van het feitenregister (soort en waarde) verhuist naar de
    kennislaag (V18), het feitenscherm en de conflictlijst lezen de kennislaag, `kennisVoor()` leest de
    stand van `brand_facts` niet meer, en de samenvatting en `answerFact()` schrijven niet meer in
    `brand_facts`. Een test faalt bij een schrijfactie op `brand_facts`.
  - *Deel 3, het merkprofiel:* besluit V9 geldt voor alle kennisvelden van `profiles`, niet alleen de
    stuurvelden (besluit V22): alleen `lib/kennis/` schrijft ze, als kopie van de kennislaag, en een test
    faalt als iets anders ze schrijft. Het onderzoek, de profielroute, de strategieroute, de kennistest en
    de marktstap schrijven dan alleen nog via `lib/kennis/`.
  - *Deel 4, het aanbod:* `profile_offerings`, met de aanbodboom die de consultant bewerkt, volgt hetzelfde
    patroon (bij het bouwen van deel 3 bleek het een eigen sessie waard).
- *Gevonden bij deel 1:* (1) de twee kolommen `confidence` van `profile_offerings` en `profile_facets`
  stonden in de inventaris als zelfoordeel van het model, maar de code zet ze (bij een aanbodknoop: 1 als
  het citaat letterlijk op de pagina staat), en K4 bepaalt er de status mee. Ze zijn in de inventaris
  gecorrigeerd en vallen buiten de test; daardoor 35 kolommen in plaats van 37. (2) Een feit uit het
  merkdossier kan niet *waargenomen* worden, want dat eist een bronadres en een geplakte tekst heeft er
  geen. Het wordt *verklaard*, met de zin als citaat (besluit V21). (3) De opgehaalde tekst van een
  stemvoorbeeld legt de code vast, niet een mens; die schrijver staat daarom apart van de gespreksmodule
  (`lib/kennis/uit-stem.ts`), zodat de test "alles wat het gesprek vastlegt, legt een mens vast" blijft
  gelden.
- *Gebouwd in deel 2 (27 september 2026):* de samenvatting legt haar sitefeiten alleen nog in de kennislaag
  vast, met het verslag van de stap als herkomst (`profile_facets`). De taak `fact_register` deelt ze daar in
  (`lib/kennis/indelen.ts`): hetzelfde goedkope model als het feitenregister, en `deelIn()` zet soort, waarde,
  bewijskracht en waarvoor het geldt op het item zelf, één keer, zonder nieuwe versie (zoals "niet op de
  site" in K7: bewering, citaat en status veranderen niet). Daarna zoekt de code of het botst (V14). "Geldt
  voor" wordt de verwijzing naar het aanbod met die naam; vindt de code er geen, dan blijft het item
  merkbreed, zoals het vóór de indeling al was, en ziet de consultant een botsing liever één keer te veel.
  Verviel: het tweede model dat elk paar beoordeelde (`conflict-judge.ts`), de automatische winnaar (klant
  vóór site) en "vraag het de ondernemer" bij een conflict tussen feiten. Dat volgt V14 en V6; op productie
  stond op 27 september 2026 geen conflict tussen feiten en geen betwist of vervangen feit, dus er ging geen
  besluit verloren. `answerFact()` zet in `brand_facts` niets meer op vervangen, het conflictscherm en blok A
  lezen alleen nog de kennislaag. Een test faalt als iets anders dan het terugvullen `brand_facts` schrijft
  of leest.
- *Gebouwd in deel 3 (27 september 2026):* de kennisvelden van `profiles` (wat de inventaris meenam, zonder
  `proof_points`: `KENNISVELDEN` in `lib/kennis/profielvelden.ts`) schrijft alleen nog
  `lib/kennis/profielkopie.ts`. De mens doet dat via `slaProfielOp()` (gespreksscherm, wizard,
  strategieroute, het aanmaken van een merk), het onderzoek via `legOnderzoeksveldenVast()` (merkonderzoek,
  aanbodboom, markt, kennistest, de scan van Wikidata, en het omzetten van een Sales-prospect), de
  stemvoorbeelden via `legStemVast()`: telkens de kopie en de kennis in één handeling. Wat de consultant op
  het kennisoverzicht afwijst of aanpast, verandert ook in de kopie (`werkKopieBij()`), als de oude tekst in
  precies één veld staat; zo telt de meting niet meer op een naam die volgens de kennislaag niet klopt. Een
  test faalt als code buiten `lib/kennis/` een kennisveld op `profiles` schrijft. Ketenscenario 28.
  *Gevonden bij deel 3:* wat de consultant bij het aanmaken van een merk typte, kwam tot nu toe niet in de
  kennislaag (alleen de profielroute en de strategieroute schreven er sinds K5 in). Nu wel, verklaard, zoals
  het terugvullen het deed; de aanmaakroute staat daarom op de lijst van §4 regel 2. En de Wikidata-scan en
  het omzetten van een prospect schreven een kennisveld zonder kennisitem; nu met (waargenomen,
  respectievelijk vermoeden).
- *Gebouwd in deel 4 (27 september 2026):* de aanbodboom (`profile_offerings`) is dezelfde kopie. Alleen
  `lib/kennis/aanbodkopie.ts` (de aanbodstap en "opnieuw onderzoeken") en `lib/kennis/uit-aanbod.ts` (een mens
  op het bewerkscherm) schrijven de tabel; de onderwerpen, clusters en de reputatiemodule lezen hem zoals
  voorheen. *Gevonden:* wat een mens aan de aanbodboom deed, kwam tot nu toe niet in de kennislaag. Nu is
  toevoegen en aanpassen verklaard (met de ouder in `geldt_voor`), weghalen een afwijzing door die mens, en
  terugzetten weer actueel; de bewerkroute staat daarom op de lijst van §4 regel 2. *En gevonden:* kreeg een
  dienst een nieuwe versie (hernoemd op het kennisoverzicht of in de aanbodboom), dan wezen een prijs onder
  die dienst en een kans nog naar de oude versie, en viel de prijs stil uit blok A. Nu verwijst `vervang()`
  wat naar de oude versie wees door naar de nieuwe, en volgen blok A en het kennisgat de keten naar de
  actuele versie (`naarActueleVersies()`; een kans schrijft `lib/kennis/` niet). *En de bewaking:* een
  module in `lib/kennis/` die de gespreksmodule aanroept, telt nu ook als plek die verklaard zet. Een test
  faalt als iets buiten `lib/kennis/` `profile_offerings` schrijft. Ketenscenario 29.

### Fase 2. Kansen als eigen object

#### N1 Het datamodel en de prioritering
- **Doel:** één object per kans, ongeacht de bron.
- **Wat:** migratie `kansen` en `kans_bewijs` (§6.2). Een pure module `lib/kansen/prioriteit.ts`:
  volgorde op commerciële waarde, potentie, bewijs per bron en kennisgat, met een uitleg in gewone taal
  die uit het bewijs wordt opgebouwd. Voorbeeld van zo'n uitleg: *"Mensen zoeken hiernaar (240
  vertoningen in Google in 28 dagen), maar ChatGPT noemt je bij 0 van de 4 vragen en noemt twee
  concurrenten wel. Je huidige pagina gaat er deels over."*
- **Niet:** een model dat de volgorde of de uitleg bepaalt.
- **Klaar als:** eenheidstests voor de volgorde en voor de uitleg bij elke combinatie van bronnen,
  inclusief "geen gegevens" (conventie 3).
- **Bijgesteld bij het bouwen (26 september 2026), omdat §6.2 op drie punten niet klopte met de code:**
  - *`cluster_id`:* in deze database is een cluster een analyse. De kolom heet daarom `analysis_id`, net
    als in de kennislaag (besluit V13).
  - *`bronnen` als veld:* de bronnen van een kans volgen uit de rijen in `kans_bewijs` (`bronnenVan()`).
    Een aparte kolom zou kunnen afwijken van het bewijs zelf, en één feit heeft één eigenaar.
  - *`commerciele_waarde`:* twee kolommen in plaats van één. `commerciele_waarde` (voorrang, gewoon,
    minder, of leeg als onbekend) komt uit de commerciële prioriteiten van het merk; `potentie` (0 tot
    100) is de bestaande potentiescore. Samen in één getal kon de uitleg niet meer zeggen welke van de
    twee de doorslag gaf.
  - *De volgorde* is in lagen, niet als gewogen som: eerst commerciële waarde, dan het aantal bronnen
    dat de kans steunt, dan de potentie, dan het kennisgat. Gewichten zouden een gok zijn zolang er
    geen gepubliceerde pagina is om ze aan te toetsen; leren welke laag zwaarder weegt, is L2.

#### N2 Het rapport maakt kansen
- **Doel:** een aanbeveling wordt meteen een kans, met zijn bewijs.
- **Wat:** `generate_report` schrijft naast `recommendations_json` een kans per aanbeveling, met het
  bewijs van ChatGPT en AI Overview (doelvragen, `runId`) en de afhankelijkheden op de kennisitems voor
  dienst en regio. `planned_pages` krijgt `kans_id`; `syncBacklog()` leest uit `kansen`. De opdracht
  van het rapport spreekt zichzelf nu tegen over het aantal aanbevelingen ("ligt niet vast" in
  `REPORT_SYSTEM` tegenover "geef 5 tot 8" in `buildReportInput()`); die tegenspraak wordt hier
  opgelost, met het aantal dat het meeste gemeten gemis dekt.
- **Klaar als:** een ketentest van meting naar kans naar voorraad; het plan toont dezelfde kaarten als
  ervoor.
- **Bijgesteld bij het bouwen (26 september 2026):**
  - *Ook de voorraad maakt kansen, als vangnet.* `syncBacklog()` roept dezelfde `legKansenVast()` aan voor
    het laatste rapport van elk cluster. Dat vult de kansen voor de drie rapporten van vóór N2 zonder apart
    script (V15 zou anders een omweg via de beheertool vragen), en vangt een rapport op waarvan het
    wegschrijven mislukte. Er blijft één schrijver: `lib/kansen/uit-rapport.ts`, bewaakt door een test.
  - *Het bewijs telt per bron opnieuw.* Een doelvraag is gemist volgens alle bronnen samen; in één bron kan
    het merk er wel genoemd zijn. Het bewijs zegt daarom per bron bij hoeveel doelvragen het merk genoemd
    werd, met dezelfde meerderheidsregel als het rapport, en welke concurrenten er wel stonden. Of Google de
    eigen site citeert, blijft leeg tot N4.
  - *Verbeteren zonder bruikbaar adres wordt een nieuwe pagina.* De tabel weigert een verbetering zonder
    adres (0118). Op productie had op 26 september 2026 elke verbetering een adres (8 van de 8), dus geen
    kaart verandert.
  - *De tekst op de kaart blijft de toelichting van het rapportmodel.* De uitleg van de kans, opgebouwd uit
    het bewijs, is voor het kansenscherm (N7).

#### N3 Search Console als kansbron
- **Doel:** kansen waar al vraag naar is in Google, en bewijs bij bestaande kansen.
- **Wat:** uit `search_console_queries`: zoekopdrachten met vertoningen maar weinig klikken of een lage
  positie, die bij een dienst uit de kennislaag horen, worden bewijs bij een bestaande kans of een
  nieuwe kans met bron `search_console`. Pure regels, getest.
- **Afhankelijk van:** minstens één merk met Search Console gekoppeld (een taak voor de eigenaar, zie
  §12).
- **Klaar als:** op dat merk op productie minstens één kans met Search Console-bewijs, nagekeken tegen
  de cijfers in Search Console zelf.

#### N4 Citaties als bewijs
- **Doel:** zien of AI de site van de klant als bron gebruikt, per kans.
- **Wat:** uit de metingen (`cited_sources` per vermelding, ChatGPT en AI Overview) per kans: wordt de
  eigen site geciteerd, welke pagina, welke concurrenten wel.
- **Klaar als:** eenheidstests; op één proefmerk nagekeken tegen de ruwe antwoorden.

#### N5 De handmatige kans
- **Doel:** de consultant kan een kans toevoegen die de meting niet vond, en die wordt echt voorbereid.
- **Wat:** een formulier (titel, lezer, dienst, regio, eventueel doelvragen); `bron = consultant`. Volgens
  V2: een kans zonder cluster wordt voorbereid, met het label "niet gemeten", en krijgt een eigen
  nulmeting op de opgegeven doelvragen. Raakt `clusterVan()` in `lib/pagina/start.ts`.
- **Klaar als:** een ketentest van handmatige kans tot geschreven pagina; het label staat op het scherm.

#### N6 Het kennisgat per kans
- **Doel:** per kans weten wat we over het bedrijf weten en wat ontbreekt, voordat we vragen stellen.
- **Wat:** een pure functie die de behoeften van een kans (de dienst, de regio, de lezer, het soort
  pagina) legt naast de kennislaag: per domein bekend, afgeleid of onbekend. Een vaste lijst van wat een
  pagina van dit soort meestal nodig heeft (werkwijze, prijsindicatie, termijn, voorbeeld uit de
  praktijk, voor wie niet), in code, als uitgangspunt.
- **Niet:** een model dat bepaalt wat er ontbreekt.
- **Klaar als:** eenheidstests; op een proefmerk ziet de consultant bij elke kans wat er ontbreekt.
- **Bijgesteld bij het bouwen (26 september 2026):**
  - *Bekend is wat op de pagina mag* (`magInBlokA()`, dezelfde regel als blok A in K6); een vermoeden van
    het model telt als ontbrekend, met de stand "afgeleid", zodat A1 er een bevestigingsvraag van kan maken.
  - *De lijst per soort pagina:* een dienstpagina heeft werkwijze, prijsindicatie, termijn, een voorbeeld uit
    de praktijk, voor wie het niet is en bewijs nodig; een vergelijking werkwijze, prijs, voor wie niet en
    bewijs; een artikel of veelgestelde vragen werkwijze, voorbeeld en bewijs. "Voor wie het niet is" bestaat
    nog bij geen enkel merk als kennis, en staat dus overal als ontbrekend.
  - *Alle versies van een pagina* (zelfde cluster en titel) tellen mee voor kennis die voor één pagina
    geldt. Dat lost voor het kennisgat de notitie "Gevonden in K5" bij K6 op; K6 kan dezelfde koppeling
    gebruiken (`werkKennisgatBij()` in `lib/kansen/uit-rapport.ts`).
  - *Een prijs en een termijn alleen van de dienst zelf* (27 september 2026, na het nalopen op productie):
    een merkbreed feit als "een offerte aanvragen is gratis" vulde bij Verstraaten elke prijsbehoefte, zodat
    er bij geen enkele kans iets ontbrak. Voor die twee behoeften telt alleen kennis met een dienst, een
    cluster of een pagina.
  - *Waar de consultant het ziet:* op de kaarten van het plan, onder de titel van een geplande pagina en in
    de uitgeklapte voorraadkaart. Alleen voor de consultant: vragen stellen is zijn werk (V6).

#### N7 Het kansenscherm
- **Doel:** de voorraad van het plan wordt een lijst kansen met hun onderbouwing.
- **Wat:** per kans de uitleg (N1), het bewijs per bron, het kennisgat, de status. Inplannen blijft zoals
  het is. De klant ziet de uitleg; de bewijsdetails zijn uit te klappen.
- **Klaar als:** met een klantlogin nagelopen op een proefmerk; `docs/ux-design.md` bijgewerkt.

### Fase 3. Gebeurtenissen en afhankelijkheden (licht)

#### G1 De gebeurtenissenlaag
- **Doel:** het domein zegt wat er moet gebeuren; de wachtrij voert het uit.
- **Wat:** migratie `gebeurtenissen`; `lib/gebeurtenissen/` met `publiceer()` en een register van
  abonnees (puur, getest), uitgevoerd door de bestaande werker. Eerst één gebeurtenis:
  **kennis gewijzigd** (vanuit `lib/kennis/`).
- **Niet:** de onboardingketen (`lib/jobs/chain.ts`) ombouwen. Die is infrastructuur en werkt.
- **Klaar als:** een ketentest: een wijziging in de kennislaag geeft een gebeurtenis, en de abonnee
  draait precies één keer, ook als de werker het twee keer probeert.

#### G2 Afhankelijkheden vastleggen
- **Doel:** weten welke kansen, meetvragen en pagina's op welk kennisitem leunen.
- **Wat:** migratie `afhankelijkheden`; gevuld door N2 (kans op dienst en regio), C3 (pagina op de
  gebruikte kennis) en de meetvragen (op regio en dienst).
- **Klaar als:** voor een proefmerk levert "wat hangt er aan deze dienst" een volledige lijst.

#### G3 Een wijziging maakt zichtbaar wat er geraakt wordt
- **Doel:** "wij doen geen warmtepompen meer" leidt niet tot blind opnieuw draaien, maar tot een lijst.
- **Wat:** de abonnee op kennis gewijzigd zet afhankelijke kansen op "te herzien" of "vervallen", zet
  een melding bij geplande en geschreven pagina's, en toont de consultant wat er geraakt is en wat
  opnieuw draaien zou kosten. Niets draait vanzelf (§4 regel 5).
- **Klaar als:** een ketentest met precies dat voorbeeld; het scherm toont de lijst.

#### G4 De bestaande verversingslogica wordt een abonnee
- **Doel:** één mechanisme voor "wat moet er opnieuw", in plaats van twee.
- **Wat:** de regels van `lib/pipeline/onboarding-refresh.ts` (werkgebied geeft nieuwe meetvragen en een
  nieuwe kennistest, een concurrent geeft een nieuw marktonderzoek) verhuizen naar abonnees op kennis
  gewijzigd, met hetzelfde gedrag.
- **Klaar als:** de bestaande ketentests voor het bijwerken van het onderzoek slagen ongewijzigd.

#### G5 Beslismoment: verder of stoppen
- **Doel:** niet meer bouwen dan het oplevert.
- **Wat:** na G4 beoordelen of de laag de code eenvoudiger maakte. Zo ja: "maand vrijgegeven" en "pagina
  gepubliceerd" worden ook gebeurtenissen (in plaats van de directe aanroepen van `bereidVoor()` en
  `markPublished()`). Zo nee: de laag blijft bij kennis gewijzigd, en dat wordt vastgelegd als besluit.
- **Klaar als:** het besluit staat in §3.2 en in `docs/logbook.md`.

### Fase 4. Klantkennis ophalen

#### A1 De brief krijgt de kennisgaten
- **Doel:** vragen die de pagina het meest verbeteren, omdat ze gaan over wat we echt niet weten.
- **Wat:** `briefInvoer()` krijgt het kennisgat van de kans (N6): "Dit weten we over deze dienst niet".
  De opdracht voor de vragen blijft zoals hij is, met één zin erbij: vraag eerst naar wat hier ontbreekt,
  en vraag liever om een voorbeeld uit de praktijk dan om een los feit. Nog steeds hooguit acht. Brief
  versie 4. Eerst als besluit in `contentketen-opnieuw.md` §2.
- **Klaar als:** op de proefmerken opnieuw gebriefd; de vragen per pagina naast die van versie 3
  gelegd; de eigenaar kiest welke set hij als ondernemer liever beantwoordt.
- **Gebouwd (27 september 2026):** besluit B21 in `contentketen-opnieuw.md` §2. `kennisgatVoorPagina()` in
  `lib/kennis/voor-pagina.ts` leest het gat dat N6 bij de kans bewaarde (`kansen.kennis_ontbreekt`) en zet het in
  woorden; `briefInvoer()` zet het na "wat we al weten". Zonder kans of zonder uitgerekend gat ontbreekt het
  blok, zoals bij versie 3. Eenheidstests en ketenscenario 23. *Niet gedaan:* opnieuw briefen op de
  proefmerken. Dat kost per pagina een aanroep op Sol met zoeken op het web en schrijft vragen op productie,
  en de werkomgeving mag niet via de app op productie schrijven; het is een taak voor de eigenaar (§12), net
  als de keuze tussen de twee sets vragen.

#### A2 Eén keer vertellen, altijd gebruikt
- **Doel:** een antwoord over een dienst helpt ook de volgende pagina over die dienst.
- **Wat:** het kennisgat van een volgende kans ziet de antwoorden uit K5 als bekend, zodat dezelfde vraag
  niet terugkomt; de brief en de schrijver krijgen ze via blok A. De regel voor praktijkvoorbeelden
  blijft: een voorbeeld dat voor één pagina verteld is, staat alleen op die pagina, tenzij de ondernemer
  het merkbreed maakte.
- **Klaar als:** een ketentest met twee pagina's over dezelfde dienst: de tweede krijgt minder vragen en
  het antwoord van de eerste in blok A.
- **Gebouwd (27 september 2026), besluit V23:** het antwoord op een gerichte vraag van een pagina geldt voor
  de dienst van de kans achter die pagina (`geldt_voor`), niet meer alleen voor die ene pagina. Zo komt het
  in blok A van elke pagina over die dienst, en telt het in het kennisgat van elke kans daarover als bekend.
  Een praktijkvoorbeeld en het antwoord op de open vraag blijven bij hun pagina (B3), een merkvraag blijft
  merkbreed, en een pagina zonder kans met een dienst werkt zoals in K5. Een antwoord van vóór A2 dat de
  klant wijzigt, blijft bij zijn pagina: anders stond het daar twee keer. Ketenscenario 30: de tweede
  pagina krijgt het antwoord in blok A, haar kennisgat en de brief vragen niet meer naar de werkwijze, en het
  voorbeeld van de eerste pagina komt er niet in. "Minder vragen" is in de ketentest het kleinere gat dat de
  brief meekrijgt (A1); hoeveel vragen het model dan echt stelt, blijkt bij het opnieuw briefen (§12).

#### A3 Eén bron van vragen
- **Doel:** de klant krijgt geen dubbele vragenlijsten.
- **Wat:** volgens V3 stopt het rapport met vragen stellen (`saveFactRequests` in `report.ts`); de open
  punten uit het onderzoek (`gap-questions.ts`) worden kennisgaten op het kennisoverzicht (K7) in plaats
  van losse vragen.
- **Klaar als:** bij een nieuw proefmerk tellen we de vragen van onderzoek tot eerste pagina en vergelijken
  met de 12 tot 14 per merk van de proef van 26 september 2026.
- **Gebouwd (27 september 2026):** het rapport en de samenvatting van het onderzoek schrijven geen vragen
  meer (`saveFactRequests` en `storeGapQuestions` zijn weg); wat ze voorstelden, blijft in hun ruwe uitvoer.
  Het kennisoverzicht toont de open punten van de samenvatting en de aanbodboom als "wat het onderzoek niet
  kon vaststellen" (`openPuntenUitOnderzoek()`). Een test legt vast dat vragen aan de klant alleen nog uit de
  voorbereiding van een pagina, de open vraag en het merkdossier komen. Vragen die al openstaan, blijven
  staan. De opdracht van het rapport vraagt nog wel om feitvragen: die veranderen was geen onderdeel van
  A3, en de uitvoer blijft zo vergelijkbaar. *Niet gedaan:* de telling bij een nieuw proefmerk (dat is een
  betaalde onderzoeksronde op productie); een taak voor de eigenaar (§12).

#### A4 De kennisronde in het gesprek
- **Doel:** het gesprek richt zich op wat het meeste oplevert.
- **Wat:** het gespreksscherm toont per domein de grootste kennisgaten, eerst voor de diensten met de
  hoogste kansen. Geen nieuwe AI-aanroep: het is het kennisgat van N6 over alle kansen heen.
- **Klaar als:** op een proefmerk nagelopen door de eigenaar, als consultant.

#### A5 Een herinnering bij openstaande vragen
- **Doel:** een pagina wacht niet ongemerkt op de klant.
- **Wat:** op de startpagina van de klant en in het overzicht van de consultant: welke pagina's wachten
  op antwoorden, sinds wanneer. Een e-mail alleen als `EMAILS_ENABLED` aanstaat.
- **Klaar als:** zichtbaar op productie voor een proefmerk met open vragen.

### Fase 5. De contentasset en het publicatiepakket

#### C1 De controle leest ook de FAQ en de metabeschrijving
- **Doel:** geen verzonnen bedrag of belofte in een FAQ-antwoord.
- **Wat:** volgens V4: de controle op harde beweringen en verboden woorden (`harde-beweringen.ts`,
  `controle-regels.ts`) loopt ook over de FAQ-antwoorden en de metabeschrijving; de eindredacteur krijgt
  de FAQ mee in zijn invoer; gele zinnen in de FAQ staan geel op het scherm. Eerst als besluit in
  `contentketen-opnieuw.md` §2.
- **Klaar als:** ketentest met een verzonnen bedrag in een FAQ-antwoord: hij gaat mee in de herschrijving
  en wordt anders geel.

#### C2 Het publicatiepakket compleet
- **Doel:** "dit is klaar om op je site te zetten", zonder uitzoekwerk.
- **Wat:** in `lib/oplevering.ts` en `components/pagina/opleveren.tsx`: het voorgestelde adres (nu alleen
  in de handleiding), en een voorstel voor interne links (naar welke eigen pagina's deze pagina zou
  moeten linken, en welke naar deze), deterministisch uit de pagina's van de site en de goedgekeurde
  pagina's van het merk die over dezelfde dienst gaan.
- **Klaar als:** eenheidstests; op een proefmerk nagekeken of de voorgestelde links bestaan.

#### C3 Vastleggen welke kennis in een versie zat
- **Doel:** later kunnen zeggen welke klantkennis een pagina droeg, en wat er geraakt wordt als die
  kennis verandert.
- **Wat:** `content_pieces.gebruikte_kennis` gevuld bij schrijven en herschrijven, uit wat `kennisVoor()`
  leverde. De schrijver wijst niets aan (B9 blijft).
- **Klaar als:** een ketentest; G2 leest het.

### Fase 6. De meetlaag als bewijsladder

#### M1 Het meetplan vanaf het goedkeuren
- **Doel:** vastleggen wat we gaan meten voordat de pagina live staat, zodat er een eerlijke nulmeting
  is.
- **Wat:** migratie `meetplannen`; bij het goedkeuren van een pagina: doelvragen, controlegroep (vast
  bepaald, zoals `impact.ts` nu), regio, de zoekopdrachten uit Search Console voor het onderwerp, de
  bronnen die aanstaan. Bij publicatie komt het adres erbij. `measure_impact` leest uit het meetplan.
- **Klaar als:** een ketentest van goedkeuren naar publiceren naar golf 1; het gedrag van de bestaande
  effectmeting blijft gelijk.

#### M2 Search Console per pagina
- **Doel:** zien of een pagina gevonden wordt in Google, niet alleen of AI het merk noemt.
- **Wat:** vertoningen, klikken en positie voor het adres van de pagina en voor de doelzoekopdrachten, 28
  dagen vóór en na publicatie, uit `search_console_days` en `search_console_queries`. Pure rekenkunde in
  `impact-math.ts`, met dezelfde regel "te weinig gegevens" als nu.
- **Afhankelijk van:** een merk met Search Console en een gepubliceerde pagina.
- **Klaar als:** eenheidstests; op productie nagekeken tegen Search Console zelf.

#### M3 Citaties van de eigen pagina
- **Doel:** zien of de nieuwe pagina als bron gebruikt wordt, niet alleen of het merk genoemd wordt.
- **Wat:** in de golven: wordt het adres van de pagina geciteerd in de antwoorden van ChatGPT en AI
  Overview op de doelvragen. De effectmeting meet ook met AI Overview als die bron aanstaat (nu alleen
  ChatGPT).
- **Klaar als:** eenheidstests op de herkenning van het adres (zelfde regels als `isRedirectedElsewhere()`:
  http of https, www, slash aan het eind, trackingcode tellen niet).

#### M4 De bewijsladder
- **Doel:** de klant ziet per pagina welk bewijs er is, en nooit zichtbaarheid verpakt als opbrengst.
- **Wat:** een pure module `lib/meting/bewijsladder.ts`: per trede (gepubliceerd en gecontroleerd,
  zichtbaar in Google, genoemd door AI, geciteerd door AI, verkeer, conversie, omzet) de status bewezen,
  geen verandering, te weinig gegevens, of geen gegevens, met de cijfers en de controlegroep erbij. Het
  scherm Zoekverkeer toont de ladder per pagina in plaats van één oordeel, met de uitleg in gewone taal
  (`lib/impact-uitleg.ts`).
- **Klaar als:** eenheidstests voor elke combinatie; met een klantlogin nagelopen; `merkstrategie.md`
  §30 nagekeken op beloftes over opbrengst.

### Fase 7. Leren

#### L1 De uitkomst wordt klantkennis
- **Doel:** wat werkt voor deze klant, wordt kennis over deze klant.
- **Wat:** na golf 2 een kennisitem in het domein geleerd, status waargenomen, bron meting: het soort
  pagina, de dienst, de fase van de klantreis, nieuw of verbeteren, en de hoogste bewezen trede van de
  ladder.
- **Afhankelijk van:** gepubliceerde pagina's met een afgeronde golf 2 (op zijn vroegst 28 dagen na de
  eerste publicatie).
- **Klaar als:** een ketentest; op productie na de eerste golf 2 nagekeken.

#### L2 De prioritering leert mee
- **Doel:** kansen van een soort dat bij deze klant werkte, komen hoger.
- **Wat:** `lib/kansen/prioriteit.ts` leest het domein geleerd, alleen vanaf een vast aantal afgeronde
  metingen per merk (voorstel: 5), en de uitleg van de kans zegt het erbij. Per merk, volgens V8.
- **Klaar als:** eenheidstests, inclusief "te weinig metingen: geen invloed".

### Fase 8. Afronden

#### D1 De documentatie
- **Doel:** de documentatie beschrijft het systeem dat er staat.
- **Wat:** `docs/architecture.md` opnieuw rond de vijf lagen van §1; `docs/doorloop-van-klant-tot-content.md`
  en `docs/processtappen-nieuwe-pagina.md` bijgewerkt; `CLAUDE.md` waar nodig; dit document naar
  "afgerond", met de uitkomsten in `docs/logbook.md`.
- **Klaar als:** een nieuwe sessie die alleen de documentatie leest, kan uitleggen hoe een klantfeit van
  het gesprek in een pagina komt, en hoe een meting terug in de klantkennis komt.

---

## 9. De volgorde

```
F0.2 ──▶ F0.3 ─▶ K1 ─▶ K2 ─▶ K3 ─▶ K4 ─▶ K5 ─▶ K6 ─▶ K7 ─▶ K8
      │                  │                         │
      │                  └─▶ N1 ─▶ N2 ─▶ N6 ───────┼─▶ A1 ─▶ A2 ─▶ A3 ─▶ A4
      │                            │    │          │
      │                            │    └─▶ N7     └─▶ C3 ─▶ G2
      │                            ├─▶ N4                  │
      │                            └─▶ N5            G1 ───┴─▶ G3 ─▶ G4 ─▶ G5
      │
      ├─▶ C1 (zodra V4 besloten is)            C2 (los, elk moment)
      └─▶ M1 ─▶ M3 ─▶ M4
      C3 ─▶ F0.1 (eerste echte klant, besluit V5) ─▶ M2 ─▶ L1 ─▶ L2
          (N3 zodra er een merk met Search Console is; L1 zodra er een golf 2 is)
```

**Waarom deze volgorde:**
1. **De eerste echte klant na fase 5 (besluit V5).** Tot die tijd zijn de proefmerken de meetlat: elke
   verandering aan wat de schrijver krijgt, wordt op hun pagina's paarsgewijs vergeleken (K6, A1).
2. **De kennislaag vóór de kansen.** Een kans verwijst naar dienst, regio en doelgroep in de
   kennislaag, en het kennisgat (N6) kan pas als de kennislaag staat.
3. **De gebeurtenissen na de kansen.** Er valt pas iets te herzien als er afhankelijkheden zijn.
4. **De meetlaag parallel.** M1 en M3 hangen niet aan de kennislaag, en de wachttijd van metingen
   (golven na 14 en 28 dagen) loopt dan al.
5. **Leren als laatste**, omdat het echte, afgeronde metingen nodig heeft.

---

## 10. Kosten

**Ontwikkeling:** ongeveer 40 sessies (de schatting per werkpakket staat in §13). De bouwtijd is niet het
langzame deel: M2, M3, L1 en L2 wachten op gepubliceerde pagina's en golven van 14 en 28 dagen.

**AI-kosten per klant:** dit plan voegt geen AI-aanroepen toe (§4 regel 1). Wat verandert:
- de content brief en de schrijver krijgen een gerichtere blok A, eerder korter dan langer;
- AI Overview in de effectmeting kost per golf ongeveer wat een meting van die vragen nu kost (op de
  cluster-meting ongeveer $0,38 bovenop $0,76 voor ChatGPT, `ai-overview-als-tweede-meetbron.md`);
- het rapport stelt geen vragen meer (A3), wat een klein beetje uitvoer scheelt.

De grens van $0,50 per pagina (besluit B4 van de contentketen) blijft staan; K6 en A1 meten de kosten
per pagina opnieuw.

---

## 11. Risico's en wat we eraan doen

| # | Risico | Maatregel |
|---|---|---|
| 1 | Zonder echte klant is er geen meetlat van de huidige keten (besluit V5), en een verbetering is moeilijker te bewijzen | De proefmerken als meetlat (K6, A1); de eerste klant direct na fase 5 (F0.1), zodat fase 6 en 7 met echte pagina's worden afgemaakt |
| 2 | Oud en nieuw blijven naast elkaar bestaan en er ontstaan twee waarheden | Elke overgang eindigt in een werkpakket met een bewakingstest (K8, en `contentketen-opnieuw.md` §7.2 als voorbeeld) |
| 3 | De kennislaag groeit uit tot een nieuwe AI-pijplijn | §4 regel 1 en 2: terugvullen en indelen in code; AI schrijft alleen afgeleid of waargenomen met citaat |
| 4 | De gebeurtenissenlaag wordt complexer dan wat hij vervangt | Licht in Postgres (V7), één gebeurtenis om mee te beginnen, en een expliciet beslismoment om te stoppen (G5) |
| 5 | Te weinig data om te leren of om Search Console te benutten | N3, M2, L1 en L2 zijn afhankelijk gemaakt van echte data en wachten daarop; tot die tijd toont de app "geen gegevens" |
| 6 | Het kennisgat maakt de vragenlijst langer in plaats van beter | Hooguit acht vragen blijft (contentketen §6.1); A1 wordt beoordeeld door de eigenaar als ondernemer, niet op aantal |
| 7 | De consultant bevestigt namens de klant zonder dat de klant het echt zei, en bevestigd krijgt dan te veel gewicht | Bevestigen per item, niet "alles bevestigen", met in de herkomst dat het in het gesprek bevestigd is; een bevestigd item dat verloopt (prijs, termijn) moet opnieuw bevestigd worden |
| 8 | De feedback wordt gelezen als opdracht om alles opnieuw te bouwen | Dit plan behoudt de wachtrij, de onboardingketen, de contentketen en de effectmeting, en verandert het datamodel eromheen (§2) |
| 9 | De eigenaar is geen ontwikkelaar en kan de schermen pas laat beoordelen | K7, N7, A4 en M4 hebben een klaar-als op het scherm (K7 en A4 als consultant, N7 en M4 met een klantlogin), zodat het werk beoordeeld wordt en niet alleen in tests |

---

## 12. Taken voor de eigenaar, buiten de code

| Wanneer | Wat | Waarom |
|---|---|---|
| Nu | PR #163 samenvoegen | Het publicatiepakket en dit plan staan op die branch |
| Na fase 5 | De eerste klant door de doorloop begeleiden, de vragen in het gesprek samen invullen (F0.1) | Besluit V5; fase 6 en 7 hebben zijn gepubliceerde pagina's nodig |
| Na A1 | Bevestigen dat de drie proefmerken met alles wat eraan hangt verwijderd mogen worden (besluit V17) | Hun enige nut, de vergelijking met de oude versie in K6 en A1, is dan gebruikt |
| Voor N3 en M2 | Search Console koppelen bij minstens één merk (een proefmerk met een eigen site, of de eerste klant) | Nu staat er bij nul merken Search Console |
| Na K8 | Op productie één stemvoorbeeld opslaan en één stuk tekst in het merkdossier plakken, en in het kennisoverzicht kijken of ze erbij staan (stemvoorbeeld: "uit de website"; dossier: "uit een document"). Na een maandvoorbereiding op het conflictscherm kijken of "alle feiten van de site zijn nagelopen" | Claude kon dit niet zelf: de werkomgeving weigert schrijven via de app op productie. In de ketentest werkt het (scenario 18 en 27) |
| Na A1 | Op de proefmerken een paar pagina's opnieuw laten briefen (brief versie 4) en de vragen naast die van versie 3 leggen; kiezen welke set je als ondernemer liever beantwoordt | Het "klaar als" van A1; kost per pagina één aanroep op Sol met zoeken op het web |
| Na A3 | Bij het volgende nieuwe proefmerk de vragen tellen van onderzoek tot eerste pagina, en vergelijken met de 12 tot 14 per merk van 26 september 2026 | Het "klaar als" van A3; vraagt een betaalde onderzoeksronde |
| Na K7, N7, A4, M4 | De nieuwe schermen doorlopen (K7 en A4 als consultant, N7 en M4 met een klantlogin) | Het oordeel "begrijpt een ondernemer dit" kan alleen een mens geven |

---

## 13. Stand

| Werkpakket | Wat | Sessies (schatting) | Stand | Commit en datum |
|---|---|---|---|---|
| F0.1 | Eerste echte klant, na fase 5 (V5) | 1 tot 2, plus wachttijd | Open, wacht op fase 1 tot en met 5 | |
| F0.2 | Inventaris van alle klantkennis | 1 | Gedaan en door de eigenaar gezien: 193 kolommen in `docs/tasks/kennismodel-inventaris.md` (55 meenemen, 36 alleen herkomst, 37 niet meer gebruiken, 65 geen klantkennis). Daaruit besluiten V9 en V10 (§3.2) en een correctie van §2 | 26 september 2026 |
| F0.3 | Besluiten V1 tot en met V8 | 1 | Gedaan: zes volgens advies, V5 en V6 anders (zie §3.2); B18 en B19 in `contentketen-opnieuw.md` | 26 september 2026 |
| K1 | Datamodel en regels van de kennislaag | 1 | Gedaan: migratie 0116 op productie (tabel leeg, RLS aan, vier regels als check-constraint en op productie nagelopen), `lib/kennis/regels.ts`, 55 eenheidstests. Besluiten V11 tot en met V13 | 26 september 2026 |
| K2 | Eén schrijfingang | 1 | Gedaan: `lib/kennis/vastleggen.ts` (`legVast`, `bevestig`, `wijsAf`, `vervang`) en `samenvoegen.ts`; migratie 0117 op productie (afwijzen, een model-item mag door een mens bevestigd worden, botsingen op de conflictlijst, V14); de twee bewakingstests en ketenscenario 19 | 26 september 2026 |
| K3 | Terugvullen uit wat er al staat | 1 | Gedaan: `lib/kennis/terugvullen.ts`, `scripts/kennis-terugvullen.ts`, ketenscenario 20. Op productie 435 items (Pompert 141, Wesley Keeris 158, Verstraaten 136; 137 waargenomen, 161 verklaard, 137 afgeleid; 223 content, 197 intern, 15 verboden), weggeschreven volgens V15 door de eigenaar. Nagelopen: elke tekst en elk citaat gelijk aan de bron, elke oude rij gedekt, geen regel geschonden. 20 open punten voor de consultant; op 27 september 2026 afgehandeld met `scripts/kennis-open-punten.ts` (zie K6 en het logboek), en het document daarmee verwijderd | 26 september 2026 |
| K4 | Het onderzoek schrijft in de kennislaag | 2 | Gedaan: `lib/kennis/onderzoek.ts` (omzetting, zelfde indeling en sleutels als K3) en `uit-onderzoek.ts` (via `legVast()`, gooit nooit een fout naar de onderzoeksstap); de vijf stappen schrijven ook nog de oude tabellen tot K8. Waargenomen alleen waar de code het citaat terugvond (sitefeit van de samenvatting, aanbodknoop met `confidence = 1`), al het andere afgeleid en intern. Ketenscenario 21; besluit V18. Op productie nagelopen met een nieuw proefmerk (Fysiotherapie West Maas en Waal): 82 items (33 merkonderzoek, 30 aanbod, 8 markt, 11 sitefeiten; 32 waargenomen, 50 afgeleid). Elk citaat staat letterlijk op de bronpagina (32 van 32), elke aanbodknoop (19) en elk sitefeit (11) heeft een item met herkomst, de 16 kinderen hangen aan hun ouder, geen afgeleid item als content, niets verklaard of bevestigd. De kennistest vond geen gelijknamig bedrijf, dus 0 items. De drie prijzen uit de aanbodboom zijn afgeleid: ze staan op de tarievenpagina, maar niet in het citaat van hun dienst | 26 september 2026 |
| K5 | Gesprek en antwoorden schrijven in de kennislaag | 1 | Gedaan: `lib/kennis/gesprek.ts` (omzetting, dezelfde als K3 via `planAntwoord`, `planProfielveld` en `planGesprek`) en `uit-gesprek.ts` (via `legVast()`, `vervang()`, `wijsAf()` en `bevestig()`, gooit nooit een fout). `answerFact()`, de profielroute, de strategieroute en de conflictroute schrijven ook in de kennislaag; de oude tabellen blijven tot K8. De bewakingstest van §4 regel 2 volgt nu ook de aanroepers van een module. Ketenscenario 22: een gerichte vraag, de open vraag en een merkvraag komen verklaard terug met de reikwijdte van de vraag; een gewijzigd antwoord wordt een nieuwe versie; de keuze van de consultant bevestigt het ene item en wijst het andere af. Besluiten V19 (getallen in de sleutel) en V20 (alleen wat veranderde). Na de uitrol (PR #166) de sleutels op productie herberekend: 84 van de 517 items, een tweede run vindt er 0. **Op productie nagelopen** (26 september 2026, met een eigen beheerdersaccount via de routes van de app): een merkvraag van Fysiotherapie West Maas en Waal, de open vraag en een gerichte vraag van de faalangstpagina van Pompert, en een veld op het gespreksscherm. Alle vier verklaard, met het testaccount als vastlegger; het antwoord van de klant met bron klant, het veld met bron gesprek. De merkvraag zonder cluster of pagina, de twee paginavragen met de juiste pagina en het juiste cluster. Elk gewijzigd antwoord werd een nieuwe versie en de oude bleef bewaard met een verwijzing naar de nieuwe (bij Pompert een keten van drie: het item van het terugvullen, de wijziging, en de oorspronkelijke tekst terug). Fysiotherapie heeft nog geen pagina, dus de paginavragen gingen via Pompert | 26 september 2026 |
| K6 | Blok A leest uit de kennislaag | 1 | Gedaan: `lib/kennis/voor-pagina.ts` (`kennisVoor()`, alle versies van een pagina) en `blok-a.ts` (`kiesVoorBlokA()` via `setVoorBlokA()`); `lib/pagina/context.ts` leest niet meer uit `brand_facts` of `value_props`; besluit B20 in de contentketen, schrijfopdracht versie 4. Ketenscenario 24 (een vermoeden komt niet bij de schrijver, een verklaard item wel, de prijs van een andere dienst niet, het verhaal bij een eerdere versie wel, de controle gebruikt dezelfde set). Op productie de vier pagina's van WP9 ronde 2 opnieuw geschreven (versie 3) en paarsgewijs vergeleken met versie 2: invoer even groot (per pagina 56 tokens minder tot 427 meer), kosten $0,31 tegen $0,29 (het verschil zit in welke twee een herschrijving kregen; alle vier ruim onder $0,50), twee direct goed, twee met één herschrijving, één gele zin (vals alarm: "tussenwoning uit 1985" staat letterlijk in het antwoord van de ondernemer). Inhoudelijk gelijk tot iets beter: de warmtepomppagina gebruikt meer van wat de ondernemer eerder vertelde (planning, wie de extra groep regelt) en noemt het adviesbezoek niet meer gratis; de korte beschrijving van de proeflespagina liet de voorwaarde bij de € 50 weg. Daarbij gevonden en gerepareerd: een categorie zonder ouder telde als merkbreed (airco en zinkwerk op de warmtepomppagina); nagerekend op de gegevens van productie gaat blok A van die pagina van ongeveer 40 naar 23 items. Die reparatie is niet opnieuw op productie geschreven | 27 september 2026 |
| K7 | Het kennisoverzicht | 2 | Gedaan. Deel 1: het scherm onder Admin (`/merk/[id]/admin/kennis`) met bevestigen, aanpassen, klopt niet en niet op de site; ketenscenario 25. Op productie nagelopen bij Fysiotherapie West Maas en Waal (PR #174): een vermoeden bevestigd met wie en wanneer, een proeftekst afgewezen, blok A voor en na nagerekend op de echte gegevens (afgewezen eruit, bevestigd erin, 34 items), een gewone klant van het merk krijgt "niet gevonden" en de route een 404 zonder iets te wijzigen. Deel 2 (PR #176): tegenstrijdigheden houden kennis bij de schrijver weg (`lib/kennis/betwist.ts`, gevonden: sinds K6 las blok A de conflictlijst niet), botsingen in de kennislaag op het conflictscherm, "niet van toepassing" wijst af wat er stond; merkprofiel bewerken blijft voor de klant (zie K7). Ketenscenario 26. Op productie nagelopen: conflictscherm, teller, kennisoverzicht en de verwijzing op merkprofiel bewerken staan er; er stond geen tegenstrijdigheid open, dus blokkeren en oplossen zijn alleen in de ketentest nagelopen. "Niet van toepassing" op het onderscheid van Fysiotherapie wees de tweede proeftekst af, door wie het aanvinkte; blok A ging van 34 naar 33 items. Daarna het veld leeggemaakt en het vinkje teruggezet, zoals het vóór K5 was | 27 september 2026 |
| K8 | Oude schrijvers en lezers opruimen | 4 | **Gedaan.** Deel 1 (PR #178): de stemvoorbeelden en het merkdossier schrijven in de kennislaag (`lib/kennis/uit-stem.ts`, `legDocumentVast()`, besluit V21); dertien velden zonder lezer van het formulier en het gespreksscherm (V10 plus `proof_points`); geen schrijver meer van `proof_points`, `tone_of_voice`, `style_samples` en `suggested_answer`; de bewakingstest op de 35 kolommen met "niet meer gebruiken" (twee gecorrigeerd in de inventaris); `docs/architecture.md` §3 beschrijft de kennislaag; ketenscenario 27. Op productie nagelopen door te lezen: merkprofiel bewerken (alle stappen, ook de oude auteursstap) en het gespreksscherm tonen de dertien velden niet meer en de gewone velden wel. Het schrijven van een stemvoorbeeld en een merkdossier op productie is niet gedaan: de veiligheidscontrole van de werkomgeving weigerde schrijven via de app op productie; alleen in de ketentest nagelopen (zie §12). Deel 2 gebouwd: de feiten van de site alleen in de kennislaag, de indeling op het kennisitem (`lib/kennis/indelen.ts`, `deelIn()`), `brand_facts` zonder schrijver of lezer; ketenscenario 18 herschreven. Deel 2 op productie: zie het logboek. Deel 3 gebouwd: alleen `lib/kennis/` schrijft een kennisveld op `profiles` (`profielkopie.ts`, `slaProfielOp()`, `legOnderzoeksveldenVast()`), de kopie volgt het kennisoverzicht; ketenscenario 28. Deel 4 gebouwd: de aanbodboom is dezelfde kopie (`aanbodkopie.ts`, `uit-aanbod.ts`), wat een mens aan de boom doet komt nu in de kennislaag, en verwijzingen volgen een nieuwe versie; ketenscenario 29. Na K8 schrijft niemand de oude tabellen nog buiten `lib/kennis/`, en vijf tests bewaken dat. Op productie nagelopen door te lezen (zie het logboek); het schrijven op productie is een taak voor de eigenaar (§12) | 27 september 2026 |
| N1 | Datamodel en prioritering van kansen | 1 | Gedaan: migratie 0118 op productie (`kansen` en `kans_bewijs`, leeg; de regels op productie nagelopen met proefrijen die daarna weer weg zijn: een verbetering zonder adres, een onbekende status of bron, een potentie boven 100, meer keer genoemd dan gemeten en een tweede rij voor dezelfde bron worden geweigerd). `lib/kansen/prioriteit.ts`: de volgorde in vier lagen en de uitleg uit het bewijs, zonder model. Eenheidstests voor de volgorde, voor de uitleg bij alle 64 combinaties van bronnen (steunend en zonder gegevens, bij beide handelingen) en het voorbeeld uit het plan letterlijk. Geen ketenscenario: er schrijft nog niemand in de tabellen (N2) | 26 september 2026 |
| N2 | Het rapport maakt kansen | 1 | Gedaan: `lib/kansen/rapport.ts` (aanbeveling naar kans, bewijs per bron met de meerderheidsregel van het rapport, commerciële waarde, dienst en regio uit de kennislaag) en `uit-rapport.ts` (de enige schrijver, gooit nooit). `generateReport()` en, als vangnet, `syncBacklog()` maken de kansen; de voorraad leest uit `kansen`, en elke kaart krijgt `kans_id` (migratie 0119 op productie). De opdracht van het rapport spreekt zichzelf niet meer tegen over het aantal. Ketenscenario 23 (meting, kans, voorraad, en een kaart van vóór N2 die zijn kans terugvindt). Op productie vooraf nagelopen: alle 20 kaarten vinden hun aanbeveling terug, met dezelfde titel en handeling. Na de uitrol (PR #168) op productie nagelopen: het plan van de drie proefmerken geopend, 20 kansen met 38 rijen bewijs, alle 20 kaarten gekoppeld, geen afwijkende titel of sleutel; het bewijs van een kans met de hand nageteld tegen de meting (gelijk). Daarbij gevonden: een terloops genoemde naam (het CBR) telde als concurrent. Gerepareerd met `isConcurrent()` en `BEWIJS_REGEL` 2; bestaand bewijs van een open kans wordt één keer opnieuw geteld | 26 september 2026 |
| N3 | Search Console als kansbron | 1 | Open, wacht op een merk met Search Console | |
| N4 | Citaties als bewijs | 1 | Gedaan: `bewijsUitMetingen()` (`lib/kansen/rapport.ts`) telt per kans of `cited_sources` van een vermelding het eigen domein bevat (`isOnBrandDomain()`), `eigenSiteGeciteerd` `true`/`false`/`null` (geen meting). `uit-rapport.ts` geeft het profieladres mee. Eenheidstests. Productieverificatie op een proefmerk: nog niet gedaan | 27 september 2026 |
| N5 | De handmatige kans | 1 | Gedaan: `lib/kansen/handmatig.ts` (`voegHandmatigeKansToe()`) legt de kans vast zonder gemeten cluster (`analysis_id` blijft NULL, het label "Niet gemeten"), met een meteen gearchiveerde schaduwanalyse die alleen `content_pieces.analysis_id NOT NULL` dekt en de opgegeven doelvragen als prompts bewaart. `clusterVan()` in `start.ts` is ongewijzigd: hij leest toch al `source_analysis_id` eerst. Formulier op het plan (`handmatige-kans-formulier.tsx`, alleen de consultant), route `/api/profiles/[id]/kansen/handmatig`. Ketenscenario 34: kans tot en met een aangemaakte pagina (`content_pieces`, status `briefing`) onder de schaduwanalyse. **Nog niet gebouwd:** de "eigen nulmeting" van besluit V2 (de doelvragen liggen klaar als prompts, maar worden niet gemeten: de bestaande wachtrij zou via `generateReport()` een overbodige tweede aanbeveling maken; een eigen aftakking van die aggregatie is nodig, zie de toelichting in `handmatig.ts`). Klantlogin-verificatie van het label nog niet gedaan | 27 september 2026 |
| N6 | Het kennisgat per kans | 1 | Gedaan: `lib/kansen/kennisgat.ts` (vaste lijst per soort pagina, per behoefte bekend, afgeleid of onbekend, zonder model) en `werkKennisgatBij()` (alle versies van een pagina, bij elke synchronisatie en na het rapport). Het plan toont de consultant per kaart "Nog niet bekend: ...". Eenheidstests en ketenscenario 23 (een antwoord van de klant verkleint het gat, een vermoeden niet, een verhaal bij een oudere versie telt mee). Op productie nagelopen (27 september 2026, na PR #169 en #170): het plan van de drie proefmerken geopend; elke kans heeft een kennisgat en het scherm krijgt het mee voor de consultant. Daarbij gevonden en gerepareerd: een merkbrede prijs of termijn vulde elke kans. Nu bij Pompert meestal een termijn en "voor wie het niet is", bij Keeris ook de prijs; bij de vijf artikelen van Verstraaten ontbreekt niets (die vragen geen prijs of termijn) | 26 en 27 september 2026 |
| N7 | Het kansenscherm | 2 | Gedaan: `lib/plans.ts` geeft `kansUitleg` (N1) en `kansBewijs` (bewijs per bron als leesbare zin, `bewijsRegel()` in `lib/kansen/prioriteit.ts`) mee in `PlanBundle`, voor iedereen zichtbaar (klant ziet de uitleg, het bewijs staat uitgeklapt in `<details>`). Doorverbonden via `page.tsx` naar `PlanView`/`BacklogRij`. Eenheidstests voor `bewijsRegel()`. Klantlogin-verificatie op een proefmerk: nog niet gedaan; `docs/ux-design.md` nog bij te werken | 27 september 2026 |
| G1 | De gebeurtenissenlaag | 1 | Gedaan: migratie 0123 op productie (`gebeurtenissen` als logboek, `gebeurtenis_verwerkingen` om een abonnee een gebeurtenis precies één keer te laten verwerken), `lib/gebeurtenissen/` (`publiceer()`, het register van abonnees, `verwerkGebeurtenis()`), nieuw jobtype `gebeurtenis_verwerken`. `lib/kennis/vastleggen.ts` publiceert nu bij elke geslaagde schrijfactie de gebeurtenis "kennis gewijzigd" (best effort, een mislukte melding blokkeert de kennis zelf niet). Het register is nog leeg: G1 bouwt geen abonnee, dat is G3 en G4. Ketenscenario 35: de gebeurtenis komt binnen, zonder abonnee plant `publiceer()` geen taak, mét een (test)abonnee precies één taak met de juiste dedupe-sleutel, en de abonnee draait precies één keer ook als `verwerkGebeurtenis()` twee keer wordt aangeroepen | 27 september 2026 |
| G2 | Afhankelijkheden vastleggen | 1 | Open | |
| G3 | Een wijziging maakt zichtbaar wat er geraakt wordt | 1 | Open | |
| G4 | De verversingslogica wordt een abonnee | 1 | Open | |
| G5 | Beslismoment: verder of stoppen | 1 | Open | |
| A1 | De brief krijgt de kennisgaten | 1 | Gebouwd: brief versie 4 met het kennisgat van de kans (besluit B21), eenheidstests en ketenscenario 23. Open: opnieuw briefen op de proefmerken en de keuze van de eigenaar (§12) | 27 september 2026 |
| A2 | Eén keer vertellen, altijd gebruikt | 1 | Gedaan: een antwoord op een gerichte paginavraag geldt voor de dienst van de kans (besluit V23), ketenscenario 30 (het "klaar als" van dit werkpakket is een ketentest) | 27 september 2026 |
| A3 | Eén bron van vragen | 1 | Gebouwd: rapport en onderzoek stellen geen vragen meer (besluit V3), de open punten van het onderzoek staan op het kennisoverzicht; eenheidstests en de ketentest van de open punten. Open: de telling bij een nieuw proefmerk (§12) | 27 september 2026 |
| A4 | De kennisronde in het gesprek | 1 | Open | |
| A5 | Herinnering bij openstaande vragen | 1 | Open | |
| C1 | De controle leest ook FAQ en metabeschrijving | 1 | Gedaan: de harde-beweringencontrole en de verboden-woordencontrole lopen nu over de hoofdtekst, de metabeschrijving en de FAQ-antwoorden samen (`volledigeControletekst()` in `lib/pagina/controle-regels.ts`), zowel na het schrijven als na een herschrijving en bij "nog geel" op het goedkeuringsscherm. De eindredacteur krijgt de metabeschrijving en de FAQ in zijn invoer (`controleInvoer()`) en de opdracht noemt ze expliciet. Op het scherm staan gele zinnen in de FAQ en de metabeschrijving nu ook geel gemarkeerd (`Opleveren`, met dezelfde `markeerZinnen()` als de hoofdtekst); bevestigen ververst de pagina zodat de markering meegaat. Eenheidstests en ketenscenario 31 (een verzonnen prijs alleen in een FAQ-antwoord en een verzonnen belofte alleen in de metabeschrijving worden geel, blijven na de ene herschrijving geel, en goedkeuren kan pas als beide bevestigd zijn) | 27 september 2026 |
| C2 | Het publicatiepakket compleet | 1 | Gedaan: `lib/oplevering.ts` krijgt `siteLinksVoorOnderwerp()` (woordmatch tussen de dienstnaam en bestaande site-pagina's) en `zusterPaginas()` (de kruising van `kansen.geldt_voor` met andere goedgekeurde pagina's van het merk); `app/(app)/merk/[id]/strategie/bibliotheek/[paginaId]/page.tsx` (`laadInterneLinks()`) doet de databasekant en geeft ook het voorgestelde adres door (`resolvedContentUrl()`, tot nu toe alleen in de handleiding). `Opleveren` toont een nieuw blok "Adres en interne links": het adres, welke pagina's deze pagina zou moeten linken en welke bestaande pagina's naar deze zouden moeten linken. Zonder kans of zonder dienst: geen voorstel, alleen het adres. Eenheidstests voor beide functies. Op productie nagekeken (Autorijschool Pompert): de kansen delen dezelfde drie diensten (rijangst, faalangstexamen, rijlessen Eindhoven), en de site heeft precies één bestaande pagina die het woord "faalangst" in titel of adres draagt; die pagina komt terug als voorstel bij de nieuwe faalangstpagina's | 27 september 2026 |
| C3 | Vastleggen welke kennis in een versie zat | 1 | Gedaan: migratie 0124 (`content_pieces.gebruikte_kennis`, uuid-array). `tekstKolommen()` (`lib/pagina/schrijven.ts`) vult hem uit `basis.bedrijf.kennis` (dezelfde keuze die `kiesVoorBlokA()` voor de schrijver maakte), bij schrijven, de behouden herschrijving en een nieuwe versie op verzoek (die spreidt de kolommen van `tekstKolommen()` over de nieuwe rij). De schrijver wijst zelf niets aan (B9 blijft). Ketenscenario 36 | 27 september 2026 |
| M1 | Het meetplan vanaf het goedkeuren | 1 | Gedaan, en een echte fout gevonden en gerepareerd: sinds de contentketen opnieuw gebouwd is (WP1, 25 september 2026) schrijft niemand meer in `content_piece_targets` (de oude schrijver `content.ts`/`saveTargets()` bestaat niet meer), dus elke pagina uit de nieuwe keten had stilzwijgend geen doelvragen en de effectmeting is sinds WP6 nooit meer gestart. `lib/pipeline/meetplan.ts` (`maakMeetplan()`) leest de doelvragen terug uit het rapport (zelfde bron als `laadDoelvragen()`), bevriest de controlegroep met dezelfde regels als `impact.ts` al had, en legt vast welke bronnen meededen (migratie 0122, `meetplannen`). `keurGoed()` roept hem aan; `koppelAdresAanMeetplan()` (via `markPublished()`) zet het adres erbij. `planImpactWaves()`, `planImpactMeasurements()` en `computeImpact()` (`lib/pipeline/impact.ts`) lezen nu het meetplan in plaats van vers uit te rekenen; `pickControlPrompts()` sluit een prompt nu uit via `meetplannen` van al gepubliceerde pagina's in plaats van via `content_piece_targets`. Ketenscenario 33. Op productie nagelopen (27 september 2026): 7 pagina's waren al goedgekeurd vóór M1 en hadden dus geen meetplan; met de hand nagerekend tegen dezelfde regels (doelvragen uit het rapport, controlegroep uit de actieve vragen van de analyse) en via de Supabase MCP-tool ingevoegd, elke rij achteraf gecontroleerd op het aantal doelvragen en de bevroren bronnen (`openai`, `ai_overview`, want die stond aan op productie). `scripts/meetplan-achterstand.ts` doet dit voortaan zelf, voor de volgende keer dat dit gebeurt | 27 september 2026 |
| M2 | Search Console per pagina | 1 | Open, wacht op Search Console en de eerste klant (F0.1) | |
| M3 | Citaties van de eigen pagina | 1 | Gedaan, vóór M1 gebouwd (zelfstandig, geen afhankelijkheid): `citeertEigenPagina()` in `lib/pipeline/impact-math.ts` (dezelfde regels als `isRedirectedElsewhere()` in `lib/url.ts`: http of https, www, hoofdletters, een slash aan het eind en een trackingcode maken niets uit). `computeImpact()` (`lib/pipeline/impact.ts`) rekent per golf uit of het gepubliceerde adres in minstens één `cited_sources` van een eigen-merk-vermelding staat, over beide bronnen tegelijk; NULL zonder gemeten golf of zonder adres (conventie 3), nooit "nee" zonder meting. Migratie 0120 (`content_impact.target_cited_own_page`). Daarnaast het tweede deel van M3: `planImpactMeasurements()` plant nu ook een `measure_ai_overview`-taak per doel- en controlevraag als `AI_OVERVIEW_ENABLED` aanstaat, met dezelfde impact-markering; `meetViaAiOverview()` ondersteunt nu een impact-/controlegolf net als `measureOnePrompt()`. Onderweg gevonden: de idempotentiesleutel van een impactmeting (`tracking_runs_impact_unique_idx`, migratie 0020) kende geen `engine`, dus ChatGPT en AI Overview zouden op dezelfde rij botsen (dezelfde fout als 0066 al eens repareerde voor de periodieke meting); migratie 0121 voegt `engine` toe aan de sleutel. Ook gerepareerd: de afteller die de effectberekening pas start als alle metingen van een golf binnen zijn (`scheduleImpactIfLastRun` in `lib/jobs/handlers.ts`) telde alleen `measure_prompt`-taken, en de afhandeling van een definitief mislukte taak routeerde op het taaktype in plaats van op de payload, waardoor een mislukte Google-meting van een impactgolf de verkeerde tak insloeg. Eenheidstests voor de adresherkenning en de gewijzigde routing (brontekstcontrole), en ketenscenario 32 (inplannen met en zonder de schakelaar, en `computeImpact()` over twee bronnen, met de drie standen waar/onwaar/onbekend) | 27 september 2026 |
| M4 | De bewijsladder | 2 | Open | |
| L1 | De uitkomst wordt klantkennis | 1 | Open, wacht op een golf 2 | |
| L2 | De prioritering leert mee | 1 | Open, wacht op L1 | |
| D1 | De documentatie | 1 | Open | |

---

## 14. Verhouding tot de andere plannen

- **`docs/tasks/contentketen-opnieuw.md`** blijft het plan voor de contentmotor. Dit plan verandert daar
  alleen de invoer (K6, A1, A2) en de reikwijdte van de controle (C1), telkens via een besluit in §2 van
  dat document.
- **`docs/tasks/ontwikkelplan-visie.md`** blijft het plan voor wat hier buiten de scope valt (§5): echte
  zoekvolumes (sprint 8), CMS-koppeling (sprint 9), technische SEO (sprint 3), eigen vormgeving. Sprint 2
  (de SEO-meetlaag) gaat op in N3 en M2, sprint 4 (bestaande pagina's verbeteren) in de kans met
  handeling "verbeteren" (N2) en het kennisgat (N6), sprint 5 (autonomie tot aan de publicatieknop)
  komt pas na dit plan.
- **`docs/doorloop-van-klant-tot-content.md`** beschrijft de app zoals hij vandaag is en wordt per
  werkpakket bijgewerkt waar het gedrag verandert. Deel III daarvan (de tien punten om te bespreken) is
  in dit plan verwerkt: punt 1 in C1, punt 2 in A3, punt 3 in N2, punt 7 in K3 en K8, punt 8 in K7 en A4,
  punt 9 in A5. Punt 5 (het zoekvolume is een schatting) deels in N3: Search Console wordt bewijs van
  echte vraag; echte zoekvolumes blijven buiten de scope. Punt 4 (hoe dicht de nabootsing van ChatGPT
  bij de echte ervaring zit), punt 6 (de aanbodboom ziet een kwart van de site) en punt 10 (de
  strengheid van de controle) vallen buiten dit plan en blijven open in dat document.
