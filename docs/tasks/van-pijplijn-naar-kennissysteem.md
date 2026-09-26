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

---

## 4. Verboden (absoluut)

1. **Geen nieuwe AI-aanroep om kennis samen te voegen of op te schonen.** Terugvullen, indelen naar
   domein en ontdubbelen gebeurt in code. Waar een oordeel nodig is, beslist de consultant.
2. **AI schrijft nooit een item met status *verklaard* of *bevestigd*** in de kennislaag. Een test
   bewaakt dat alleen de routes voor klantantwoorden, het gesprek en het kennisoverzicht die statussen
   zetten.
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

#### K6 Blok A leest uit de kennislaag
- **Doel:** de schrijver krijgt gecontroleerde klantkennis, en niets wat alleen AI denkt.
- **Wat:** `kennisVoor(pagina)` in `lib/kennis/` levert blok A: alleen de statussen die §6.1 toestaat,
  bevestigd eerst, gefilterd op `geldt_voor` (merkbreed, deze dienst, deze regio), verboden items als
  verbod. `lib/pagina/bedrijfskennis.ts` en `context.ts` gebruiken dat. De bronnen voor de controle op
  harde beweringen komen uit dezelfde set. Eerst als besluit in `contentketen-opnieuw.md` §2, en
  `lib/kennis/` erbij op de importlijst van §7.3 daar.
- **Niet:** de schrijfopdracht veranderen.
- **Voorwaarde (besluit V16):** de lijst voor de consultant uit K3 met feiten zonder gekoppelde dienst is
  leeg.
- **Klaar als:** een ketentest laat zien dat een afgeleid item niet bij de schrijver komt en een
  verklaard item wel; de vier pagina's van WP9 ronde 2 opnieuw geschreven op productie en paarsgewijs
  vergeleken met de vorige versie (de verbeterlus van de contentketen). Kosten per pagina gelijk of
  lager.

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

#### K8 De oude schrijvers en lezers opruimen
- **Doel:** één waarheid, ook in de code.
- **Wat:** de dubbele schrijfacties van K4 en K5 stoppen. Een test die faalt als de kolommen uit de
  inventaris met "niet meer gebruiken" buiten `lib/types/database.ts` nog gelezen worden.
- **Klaar als:** die test draait; `docs/architecture.md` §3 beschrijft de kennislaag.

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

#### A2 Eén keer vertellen, altijd gebruikt
- **Doel:** een antwoord over een dienst helpt ook de volgende pagina over die dienst.
- **Wat:** het kennisgat van een volgende kans ziet de antwoorden uit K5 als bekend, zodat dezelfde vraag
  niet terugkomt; de brief en de schrijver krijgen ze via blok A. De regel voor praktijkvoorbeelden
  blijft: een voorbeeld dat voor één pagina verteld is, staat alleen op die pagina, tenzij de ondernemer
  het merkbreed maakte.
- **Klaar als:** een ketentest met twee pagina's over dezelfde dienst: de tweede krijgt minder vragen en
  het antwoord van de eerste in blok A.

#### A3 Eén bron van vragen
- **Doel:** de klant krijgt geen dubbele vragenlijsten.
- **Wat:** volgens V3 stopt het rapport met vragen stellen (`saveFactRequests` in `report.ts`); de open
  punten uit het onderzoek (`gap-questions.ts`) worden kennisgaten op het kennisoverzicht (K7) in plaats
  van losse vragen.
- **Klaar als:** bij een nieuw proefmerk tellen we de vragen van onderzoek tot eerste pagina en vergelijken
  met de 12 tot 14 per merk van de proef van 26 september 2026.

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
| Voor N3 en M2 | Search Console koppelen bij minstens één merk (een proefmerk met een eigen site, of de eerste klant) | Nu staat er bij nul merken Search Console |
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
| K3 | Terugvullen uit wat er al staat | 1 | Bijna gedaan: `lib/kennis/terugvullen.ts` en `scripts/kennis-terugvullen.ts`, ketenscenario 20. Plan voor productie: 435 items (Pompert 141, Wesley Keeris 158, Verstraaten 136), elke oude rij gedekt, 20 punten in `kennislaag-open-punten.md`. Wacht op het wegschrijven (V15) en de controle op productie | 26 september 2026 |
| K4 | Het onderzoek schrijft in de kennislaag | 2 | Open | |
| K5 | Gesprek en antwoorden schrijven in de kennislaag | 1 | Open | |
| K6 | Blok A leest uit de kennislaag | 1 | Open | |
| K7 | Het kennisoverzicht | 2 | Open | |
| K8 | Oude schrijvers en lezers opruimen | 1 | Open | |
| N1 | Datamodel en prioritering van kansen | 1 | Open | |
| N2 | Het rapport maakt kansen | 1 | Open | |
| N3 | Search Console als kansbron | 1 | Open, wacht op een merk met Search Console | |
| N4 | Citaties als bewijs | 1 | Open | |
| N5 | De handmatige kans | 1 | Open | |
| N6 | Het kennisgat per kans | 1 | Open | |
| N7 | Het kansenscherm | 2 | Open | |
| G1 | De gebeurtenissenlaag | 1 | Open | |
| G2 | Afhankelijkheden vastleggen | 1 | Open | |
| G3 | Een wijziging maakt zichtbaar wat er geraakt wordt | 1 | Open | |
| G4 | De verversingslogica wordt een abonnee | 1 | Open | |
| G5 | Beslismoment: verder of stoppen | 1 | Open | |
| A1 | De brief krijgt de kennisgaten | 1 | Open | |
| A2 | Eén keer vertellen, altijd gebruikt | 1 | Open | |
| A3 | Eén bron van vragen | 1 | Open | |
| A4 | De kennisronde in het gesprek | 1 | Open | |
| A5 | Herinnering bij openstaande vragen | 1 | Open | |
| C1 | De controle leest ook FAQ en metabeschrijving | 1 | Open | |
| C2 | Het publicatiepakket compleet | 1 | Open | |
| C3 | Vastleggen welke kennis in een versie zat | 1 | Open | |
| M1 | Het meetplan vanaf het goedkeuren | 1 | Open | |
| M2 | Search Console per pagina | 1 | Open, wacht op Search Console en de eerste klant (F0.1) | |
| M3 | Citaties van de eigen pagina | 1 | Open | |
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
