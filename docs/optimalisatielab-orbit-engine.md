# Optimalisatielab Orbit Engine

**Doel:** meer en betere nieuwe pagina's voorstellen, onderbouwd met eigen meetgegevens, gevoed door maximale klantinput, en clusters pas vaststellen als de echte kennis binnen is.

**Uitgangspunt:** de opdrachtgever beoordeelt geen code. Elke wijziging moet eindigen in een zichtbaar resultaat in de app dat hij zelf kan controleren, plus een korte uitleg in gewone taal van wat er veranderd is.

**Database:** Supabase project `GEO`, ref `kosauqzjbpweluiqgmwv`.

---

## Voortgang

| Wanneer | Wat | Status |
|---|---|---|
| 30 augustus 2026 | Werkpakket A, punt 1: in kaart gebracht hoe clusters nu ontstaan (zie het gesprek dat aan dit plan voorafging) | Afgerond, geen codewijziging |
| 30 augustus 2026 | Werkpakket A, punt 2: onderwerpen krijgen een fase, `concept` vóór het strategisch gesprek en `definitief` erna. Een concept is zichtbaar maar niet te goedkeuren of te starten, op het scherm én op de achterkant. Zodra het gesprek wordt opgeslagen, maakt ORBIT ENGINE zelf een definitieve ronde die de onbesliste concepten vervangt. Migratie `0074_concept_definitief_topics.sql` (zie `supabase/README.md`) | Live op productie |
| 30 augustus 2026 | Werkpakket A, punt 3: de clusterlaag krijgt drie gerichte velden (vaakst gestelde vraag, wat vaak misgaat, onderscheid met de concurrent) in plaats van één generiek notitieveld, met een eigen invulblok op de clusterpagina. Voedt voortaan `content_brief` via `lib/pipeline/topic-brief.ts`. Migratie `0075_clusterlaag_velden.sql` | Live op productie |
| 30 augustus 2026 | Werkpakket A, punt 4: `goal_12m` stuurt nu ook mee in de clusterkeuze. De overige acht strategische velden hebben bewust geen lezer in de clusterkeuze: ze beantwoorden HOE er binnen een onderwerp gevraagd en geschreven wordt, niet WELK onderwerp, en hebben daar hun eigen, al bestaande lezer (zie de aantekening in `lib/pipeline/commercial-context.ts`) | Live op productie |
| 30 augustus 2026 | Werkpakket A, punt 5: elk onderwerp draagt zijn herkomst, "uit het aanbod" of "uit het aanbod en het gesprek", zichtbaar op de clusterpagina. Migratie `0076_topic_herkomst.sql` | Live op productie |
| 30 augustus 2026 | Werkpakket A, punt 6: de grens van acht vragen per contentbriefing geldt voortaan alleen voor de optionele vragen. Een onmisbare (`kern`) vraag wordt nooit meer stilzwijgend weggesneden, en kan dus ook nooit meer ongezien de eindpoort omzeilen | Live op productie |
| 28 augustus 2026 | Werkpakket A, punt 7 (blokkeer schrijven zolang onmisbare antwoorden ontbreken) bleek al gebouwd, vóór dit plan: `lib/content-final-gate.ts`. Geen aparte wijziging nodig | Al aanwezig |
| 30 augustus 2026 | Werkpakket A, punt 9: een bijgewerkt gesprek maakt de knop "Stel nieuwe clusters voor" weer de moeite waard, met de reden erbij ("het strategisch gesprek is bijgewerkt"). Goedgekeurde en gestarte onderwerpen worden nooit aangeraakt | Live op productie |
| 30 augustus 2026 | Werkpakket A, punt 10: de knop "Stel nieuwe clusters voor", alleen zichtbaar en uitvoerbaar voor de beheerdersrol (`clusters_aanvullen` in `lib/cost-rules.ts`, afgedwongen in de route, niet alleen verborgen in de weergave). Altijd aanvullend, nooit vervangend. Neemt mee: het aanbod, het gesprek, bestaande onderwerpen (om dubbel voorstellen te voorkomen), afwijzingsredenen, en gemeten gaps uit de laatste rapporten van lopende clusters. Weigert te draaien zonder nieuwe informatie sinds de vorige klik, met een preview vooraf (gratis) die dat laat zien. Elke ronde staat gelogd in `profile_topic_rounds`, ook een ronde die niets opleverde. Migratie `0077_clusters_aanvullen.sql` | Live op productie |
| 30 augustus 2026 | Werkpakket A, punt 8: een superlatief of marktclaim in een klantantwoord ("wij zijn de beste van de regio") wordt bewaard maar niet automatisch als vaststaand feit gebruikt in teksten, tenzij er een cijfer, bron of voorbeeld bij staat. Eigen mededelingen over de eigen werkwijze blijven zonder meer aangenomen. `lib/pipeline/claim-plausibility.ts`, toegepast in `app/api/profiles/[id]/facts/route.ts` | Live op productie |

**Werkpakket A is hiermee compleet.**

| 30 augustus 2026 | Werkpakket B, punten 3, 4, 5 en 7: het rapport zegt nu expliciet dat het aantal aanbevelingen niet vastligt, met de vier eisen uit het plan letterlijk in de instructie. `mergeOverlappingRecommendations()` is het deterministische vangnet tegen twee aanbevelingen op dezelfde zwaarste gemiste vraag. `describeActionRatio()` legt de verhouding nieuw/verbeteren uit op het rapportscherm | Live op productie |

Bewust nog niet gebouwd in werkpakket B: punt 2 (het aantal zoekvragen per cluster variabel maken met
een verzadigingsregel) en punt 6 (het budgetplafond per cluster-run). Beide vermenigvuldigen direct de
meetkosten (nu ~$0,82 per ronde, vrijwel geheel `web_search`), en het plan zelf noemt "tot hoeveel
zoekvragen per cluster" en "een acceptabel budget per cluster-run" met zoveel woorden als vragen voor
de eigenaar, niet als aannames voor Claude Code (hoofdstuk 7, open vragen). Die vraag ligt na deze
sessie bij de eigenaar.

Werkpakket C staat nog volledig open.

---

## 1. Waar we nu staan (gemeten, niet geschat)

Gemeten op de live database, 30 augustus 2026, over 4 profielen met 16 analyses.

| Wat | Nu |
|---|---|
| Clusters voorgesteld na onboarding | Altijd exact 7 |
| Moment waarop clusters ontstaan | Enkele seconden nadat de aanbodboom is opgehaald |
| Strategisch gesprek vastgelegd | Bij 2 van de 4 profielen, en steeds *na* de clusters |
| Kansen per cluster-run | Altijd exact 7 |
| Waarvan nieuw | 2 tot 3 |
| Waarvan verbeteren | 4 tot 5 |
| Vragen aan de klant per run | 3 tot 13, gemiddeld 6 |
| Verplichte vragen | Ongeveer 1 op de 6 |
| Zoekvragen aan de AI-engines per run | Ongeveer 30 |

**De harde conclusie:** die 7 en 7 zijn geen uitkomst van onderzoek, het zijn plafonds. Een klant met veel witte vlekken krijgt precies evenveel voorstellen als een klant met bijna geen. En de clusters worden bepaald voordat de meest waardevolle informatie — het strategisch gesprek — überhaupt bestaat.

**Het tweede probleem, dat minder opvalt:** de app meet al heel veel dat ze niet gebruikt. Per run worden ongeveer 30 zoekvragen aan de AI-engines gesteld en wordt vastgelegd waar de klant wél en niet genoemd wordt, wie er in zijn plaats genoemd wordt en uit welke bronnen die antwoorden komen. Daarnaast staat er Search Console-data in. Dat is hard bewijs van vraag en van gemis, en het stuurt de contentvoorstellen op dit moment niet aan.

---

## 2. Het principe waar alles op rust

Eén regel die door alle werkpakketten heen loopt:

> **Elke voorgestelde pagina is gekoppeld aan een gemeten gemis. Geen gemeten gemis, geen voorstel.**

Een gemeten gemis is één van deze drie:

- Er is een zoekvraag gesteld aan de AI-engines waarop de klant niet genoemd wordt, terwijl concurrenten dat wel worden.
- Er is een zoekvraag waarop de klant wel genoemd wordt, maar zwak of onvolledig.
- Er is een zoekterm in Search Console met vertoningen en nauwelijks kliks.

Zonder deze regel betekent "onderzoek de volledige ruimte" in de praktijk: laat een taalmodel zoveel mogelijk ideeën bedenken. Dat levert altijd een lange lijst op, en de kwaliteit zakt zodra de echte ideeën op zijn. Mét deze regel is elk voorstel na te rekenen en kun je de klant precies laten zien waaróm die pagina er moet komen.

---

## 3. Werkpakket A — Informatie eerst: strategisch gesprek en klantvragen als één systeem

Het strategisch gesprek en het uitvragen van de klant zijn in de kern hetzelfde: informatie uit het hoofd van de klant halen. Bouw er dus één systeem voor. Twee losse vraagsystemen leiden onvermijdelijk tot dubbele vragen en irritatie.

### Wat er nu gebeurt

De app haalt de website op, bouwt de aanbodboom en genereert binnen een minuut 7 clusters. Alles wat later in het strategisch gesprek naar boven komt — welke diensten marge maken, welke regio's groei moeten laten zien, welke segmenten je wél en niet wil, welke bezwaren de verkoop tegenkomt, seizoenspatronen — komt te laat om de clusters nog te beïnvloeden. Bij twee van de vier profielen is het gesprek zelfs nooit vastgelegd, en toch stonden de clusters er.

Daarnaast: gemiddeld 6 vragen per run, waarvan de meeste optioneel. Een klant kan bijna alles overslaan en toch een pagina laten schrijven.

De velden zijn er al: `profile_strategy`, en op het profiel `priority_offerings`, `deprioritised_offerings`, `growth_regions`, `target_segments`, `deal_value_band`, `seasonality`, `sales_objections`, `goal_12m`, `offline_proof`, `forbidden_topics`. Ook `brand_facts`, `profile_field_sources` en `suggested_answer` bestaan al en worden onderbenut.

### 3.1 Eén invulomgeving, drie lagen

Alle informatie-inwinning komt in één omgeving met dezelfde werking, opgesplitst naar reikwijdte:

- **Merklaag** — één keer invullen, overal hergebruiken. Wie schrijft, hoe je werkt, wat je garandeert, prijzen, werkgebied, bewijs, klantverhalen, plus de strategische velden hierboven.
- **Clusterlaag** — per onderwerp. Wat vragen klanten je hierover het vaakst, wat gaat er mis, waarin ben je anders dan de concurrent.
- **Paginalaag** — per specifieke pagina, vlak voor het schrijven. Concrete cijfers, voorbeelden, uitzonderingen.

Het strategisch gesprek is de eerste sessie in de merklaag. **Het wordt handmatig ingevuld — geen opnames, geen transcripties.** In de praktijk voeren jullie het gesprek en typt degene die het gesprek voert de antwoorden in het scherm, tijdens of direct na het gesprek. Dat maakt het scherm belangrijk: het moet zo zijn opgezet dat je er tijdens een gesprek in kunt typen zonder de draad kwijt te raken. Korte velden, duidelijke volgorde, tussentijds opslaan, en per veld een voorbeeld van een goed antwoord.

### 3.2 De poort: zacht tonen, hard doorlaten

Blokkeer niet de hele onboarding op het gesprek — bij twee van de vier profielen had de klant dan helemaal niets gezien. Verplaats de rem naar het moment dat het telt:

- **Na de aanbodboom** toont de app concept-clusters, duidelijk gelabeld als voorlopig en bedoeld als gespreksvoorbereiding. Ze zijn zichtbaar maar niet goed te keuren.
- **Na het strategisch gesprek** worden de clusters opnieuw gemaakt mét de gespreksinformatie erbij. Pas dan kun je ze goedkeuren en laten draaien.

Zo houd je het effect van "kijk wat de app al weet" én dwing je het gesprek af voordat er iets onomkeerbaars gebeurt.

### 3.3 Vragen: geen plafond, wel een rem

Haal de grens op het aantal vragen weg. De rem is niet een maximum, maar deze regel: **stel de vraag alleen als het antwoord er nog niet is.** De app kijkt eerst in de website, de aanbodboom, de merklaag en eerdere antwoorden. Alleen wat echt ontbreekt of geverifieerd moet worden, wordt gevraagd. Zonder die rem staat "meer vragen" gelijk aan "irritant".

Verder:

- Bepaal per pagina welke feiten onmisbaar zijn. Ontbreken die, dan blijft de pagina op "wacht op input" staan met zichtbaar welke vragen open zijn.
- Toon per pagina de onderbouwingsgraad: welk deel van de beweringen steunt op klantinput in plaats van op aannames. Het veld `source_coverage` bestaat al.
- Maak antwoorden goedkoop: concept-antwoorden die alleen bevestigd hoeven te worden (`suggested_answer`), keuzelijsten en ja/nee waar het kan, documenten of een lap tekst plakken waar de app zelf antwoorden uit vist (`brand_documents` staat er al, leeg), blokgewijs beantwoorden met tussentijds opslaan, en automatische herinneringen aan openstaande vragen.

### 3.4 Niet alle klantinput is gelijk

Meer input is niet automatisch betere input. Als een klant invult dat hij "de beste van Brabant" is of een cijfer noemt dat niet klopt, schrijft de AI dat straks met overtuiging op. Maak daarom onderscheid:

- **Aannemen zonder meer:** wat de klant zegt over zijn eigen werkwijze, aanbod, prijzen, garanties, werkgebied en processen. Dat is zijn eigen domein.
- **Onderbouwing vereist:** claims over de markt, over concurrenten, over resultaten en over superlatieven. Deze mogen pas in een tekst als er een bron, cijfer of voorbeeld bij zit. Anders worden ze afgezwakt of weggelaten.

`profile_field_sources` legt al vast wie een veld gezet heeft en met welke zekerheid; gebruik dat om dit onderscheid afdwingbaar te maken in plaats van het alleen in een instructie te hopen.

### 3.5 Knop: nieuwe clusters voorstellen

Op de clusterpagina staan twee soorten clusters naast elkaar: de zelf aangemaakte en de voorgestelde. Bij de voorgestelde komt een knop **"Stel nieuwe clusters voor"**, die op elk moment een nieuwe ronde voorstellen genereert op basis van álle data die op dat moment beschikbaar is.

**De knop is alleen zichtbaar voor de eigenaar/beheerder van de app**, niet voor gewone tenant-gebruikers. Dat loopt via de bestaande beheerdersrol (`staff_users`). Twee redenen: de knop kost geld per klik, en het is een regieknop — de eigenaar bepaalt wanneer het beeld goed genoeg is om nieuwe clusters voor te stellen, niet de klant. De klant ziet dus wel de resulterende voorstellen, maar niet de knop die ze aanmaakt. Zorg dat de beperking niet alleen in de weergave zit maar ook op de achterkant afgedwongen wordt, anders is de knop verborgen maar niet beschermd.

Dit lost een echt probleem op: de eerste set clusters ontstaat vroeg, wanneer je nog het minste weet. Naarmate het strategisch gesprek is gevoerd, klantvragen zijn beantwoord, metingen zijn gedaan en Search Console gekoppeld is, wordt het beeld beter — maar de clusters blijven staan zoals ze waren. De knop maakt dat de clusterlijst meegroeit met wat je leert.

**Wat de knop meeneemt.** Alles wat er op dat moment ligt:

- de aanbodboom, inclusief prioriteitsdiensten en gedeprioriteerde diensten
- alle strategische velden uit het gesprek
- de beantwoorde klantvragen en de vastgelegde merkfeiten
- de meetuitkomsten van clusters die al gedraaid hebben: waar de klant ontbrak, wie er in zijn plaats genoemd werd, welke bronnen de antwoorden voedden
- Search Console: waar vertoningen zijn zonder kliks
- de bestaande clusters, inclusief de afgewezen

**Belangrijke regels, anders wordt de knop een ergernis:**

- **Alleen toevoegen, nooit vervangen.** Bestaande, goedgekeurde en zelf aangemaakte clusters blijven onaangeroerd staan. De knop vult aan.
- **Geen dubbelingen.** Voordat een voorstel getoond wordt, wordt het vergeleken met alles wat er al ligt — goedgekeurd, voorgesteld, zelf aangemaakt. Overlappend voorstel valt af.
- **Afgewezen is een signaal, geen vergetelheid.** Wat de klant eerder afwees komt niet terug in dezelfde vorm. De reden van afwijzing gaat mee als instructie, zodat de volgende ronde die richting mijdt.
- **Toon wat er nieuw is sinds de vorige ronde.** Voordat de app iets genereert, laat ze zien waarop dit voorstel gebaseerd is: "sinds de vorige ronde zijn het strategisch gesprek, 14 klantantwoorden en de metingen van 3 clusters toegevoegd." Is er niets bijgekomen, dan meldt de app dat en raadt ze aan de knop niet te gebruiken — hetzelfde voedsel geeft hetzelfde resultaat, alleen duurder.
- **Elk voorstel draagt zijn herkomst.** Uit het aanbod, uit het gesprek, uit een meting, of uit een combinatie. Zonder die regel weet je bij ronde drie niet meer waarom iets er staat.
- **De knop kost geld.** Toon een indicatie vooraf en log het verbruik, net als bij de cluster-runs.

**Aantal:** geen vast getal, net als bij de kansen. De ronde levert op wat er te leveren valt; is er weinig nieuws, dan is één voorstel een prima uitkomst en nul ook.

### Uit te voeren

1. ✅ Breng in kaart welke code de clusters aanmaakt en wat het startsein is.
2. ✅ Splits dat in twee momenten: concept-clusters na de aanbodboom, definitieve clusters na het gesprek. Goedkeuren en draaien kan alleen na het gesprek. *(30 augustus 2026, migratie 0074, zie Voortgang hierboven)*
3. ✅ Bouw de invulomgeving met de drie lagen, gericht op handmatig typen tijdens een gesprek. *(30 augustus 2026: de clusterlaag kreeg drie gerichte velden, migratie 0075. De merklaag bestond al via `StrategyBox` en de profielvelden, de paginalaag via de contentbriefing.)*
4. ✅ Voeg alle strategische velden toe aan de instructie die clusters genereert, met de regel: gedeprioriteerde diensten en verboden onderwerpen leveren geen clusters op, prioriteitsdiensten krijgen voorrang. *(30 augustus 2026: vier velden waren al verwerkt, `goal_12m` is toegevoegd. Zie de aantekening in `lib/pipeline/commercial-context.ts` voor welke velden bewust geen lezer in de clusterkeuze hebben en waarom.)*
5. ✅ Geef elk cluster een zichtbare herkomstregel: uit het aanbod, uit het gesprek, of beide. *(30 augustus 2026, migratie 0076)*
6. ✅ Haal de grens op het aantal vragen weg en bouw de ontbrekendheidscheck. *(30 augustus 2026: de grens van acht geldt voortaan alleen voor optionele vragen, elke onmisbare vraag gaat altijd mee, zie `lib/pipeline/briefing-select.ts`.)*
7. ✅ Markeer onmisbare antwoorden per pagina en blokkeer schrijven zolang die ontbreken. *(bleek al gebouwd op 28 augustus 2026, `lib/content-final-gate.ts`.)*
8. ✅ Bouw het onderscheid tussen eigen feiten en te onderbouwen claims in het schrijfproces in. *(30 augustus 2026: `lib/pipeline/claim-plausibility.ts`, toegepast op klantantwoorden vóórdat ze `proof_points` in gaan.)*
9. ✅ Zorg dat het gesprek later bijgewerkt kan worden, waarna de app voorstelt de clusters opnieuw te bekijken, zonder goedgekeurde clusters weg te gooien. *(30 augustus 2026: het gesprek kon al altijd opnieuw worden opgeslagen; nieuw is dat "Stel nieuwe clusters voor" dat oppikt en aanraadt.)*
10. ✅ Bouw de knop "Stel nieuwe clusters voor" op de clusterpagina, alleen zichtbaar en uitvoerbaar voor de beheerdersrol, met de ontdubbelingscheck, het meenemen van afwijzingsredenen, het overzicht van wat er nieuw is sinds de vorige ronde, en herkomst per voorstel. *(30 augustus 2026, migratie 0077)*

### Hoe je controleert dat het werkt

Druk twee keer achter elkaar op "Stel nieuwe clusters voor" zonder er tussendoor iets aan de data te veranderen. De tweede keer hoort de app te melden dat er niets nieuws is. Doet ze dat niet en komt er gewoon een tweede lijst uit, dan verzint ze in plaats van dat ze op data steunt.

Draai daarna één bestaand profiel opnieuw en vergelijk de oude 7 clusters met de nieuwe set. Verwijst de onderbouwing van geen enkel cluster naar het gesprek, dan wordt de informatie wel meegegeven maar niet gebruikt. Laat daarna één pagina twee keer schrijven: één keer zonder de nieuwe vragen, één keer met alles beantwoord. Is de tweede niet duidelijk concreter — eigen cijfers, eigen voorbeelden, eigen woorden — dan komen de antwoorden niet in de tekst terecht en zit het probleem in het schrijfproces.

---

## 4. Werkpakket B — De schaalknop: meer meten, niet meer verzinnen

### Het inzicht

Als elke kans aan een gemeten gemis hangt, kun je nooit meer kansen hebben dan je vragen hebt gesteld. Met 30 zoekvragen per cluster is 30 je werkelijke plafond, niet die 7. **De knop die je moet omzetten is dus het aantal metingen, niet het aantal aanbevelingen.**

Dit is ook waar extra API-budget hoort te landen. Bij een klant met veel ruimte meet je 100 of 200 zoekvragen per cluster in plaats van 30. Dat kost meer, maar het geld gaat naar bewijs verzamelen in plaats van naar meer verzonnen ideeën.

### Wat er moet veranderen

**Het aantal zoekvragen per cluster wordt variabel.** De app bepaalt hoeveel er gemeten moet worden op basis van de omvang van het cluster, hoeveel diensten eronder hangen, hoe breed het werkgebied is en hoeveel de klant per maand kan publiceren. Bij verzadiging — nieuwe vragen leveren geen nieuwe gemissen meer op — stopt de meting vanzelf.

**Het aantal kansen wordt de uitkomst, niet de instelling.** Haal de grens van 7 weg. Elk gemeten gemis dat door de kwaliteitstoets komt, wordt een voorstel:

1. Het gemis is gemeten (zie het principe in hoofdstuk 2).
2. De klant heeft er iets echts over te zeggen — aanbod, ervaring, bewijs.
3. Er is geen bestaande pagina die dit al goed doet, anders wordt het een verbetering.
4. Het overlapt niet inhoudelijk met een ander voorstel uit dezelfde run.

**De verhouding nieuw versus verbeteren volgt uit de meting.** Geen vast percentage. De vraag is simpel: worden de bestaande pagina's van deze klant in de metingen daadwerkelijk genoemd? Bij een site die nauwelijks meedoet is verbeteren zinloos en wordt het vanzelf bijna alles nieuw. Bij een site die al goed presteert maar op details tekortschiet, mag het aandeel verbeteringen hoger liggen. De app rapporteert de verhouding en legt uit waar die vandaan komt.

**Kosten.** Zet een budgetplafond per cluster-run, met een melding als het geraakt wordt en de mogelijkheid door te gaan. Log per run wat het kostte en hoeveel kansen het opleverde — `ai_calls` heeft de kosten al. Na tien runs weet je wat een kans gemiddeld kost en kun je het budget onderbouwd instellen in plaats van gokken.

### Uit te voeren

1. ✅ Zoek op waar het aantal van 7 vandaan komt en haal die grens weg. *(30 augustus 2026: er stond geen harde grens in de code, het getal ontstond doordat niets in de instructie een ander aantal aanmoedigde. Nu staat "het aantal ligt niet vast" er expliciet.)*
2. Maak het aantal zoekvragen per cluster variabel, met een verzadigingsregel. *(Nog niet gebouwd, raakt de meetkosten direct, ligt bij de eigenaar.)*
3. ✅ Herschrijf de instructie: van "geef de beste 7" naar "lever elk gemeten gemis op dat door de kwaliteitstoets komt". *(30 augustus 2026)*
4. ✅ Bouw de vier eisen expliciet in en laat de AI per voorstel tonen op welke meting het steunt. *(30 augustus 2026: de vier eisen staan letterlijk in de instructie; elke aanbeveling wijst al naar zijn V-codes, dat bestond al.)*
5. ✅ Laat de verhouding nieuw/verbeteren voortkomen uit de meetuitkomst, met uitleg. *(30 augustus 2026, `describeActionRatio()`)*
6. Voeg het budgetplafond per run toe plus logging van kosten per kans. *(Nog niet gebouwd, vereist eerst het antwoord op punt 2.)*
7. ✅ Voeg een dubbelcheck toe die overlappende voorstellen binnen één run samenvoegt. *(30 augustus 2026, `mergeOverlappingRecommendations()`)*

### Hoe je controleert dat het werkt

Draai hetzelfde cluster bij twee heel verschillende klanten — één met een dunne site, één met een volle. De aantallen moeten duidelijk verschillen; doen ze dat niet, dan zit er nog ergens een verborgen grens. Klik daarna bij vijf voorstellen door naar het bewijs. Kun je bij elk de zoekvraag zien waar de klant ontbrak, dan werkt het principe. Zie je alleen een onderbouwing in mooie woorden, dan is de koppeling met de meting niet echt gelegd.

---

## 5. Werkpakket C — Van lange lijst naar werkbare voorraad

### Het probleem dat je creëert

Stel dat een run 25 kansen oplevert bij 7 clusters: dan liggen er 175 voorstellen terwijl de klant er misschien 4 per maand publiceert. Dat is drie jaar werk. Meer voorstellen maken het product niet beter als de klant vastloopt in de keuze — dan is de lange lijst een last in plaats van waarde.

Het knelpunt verschuift dus van "hoeveel ideeën hebben we" naar "hoeveel kan de klant aan".

### Wat er moet veranderen

**Presenteer geen lijst maar een voorraad met een volgorde.** Drie niveaus:

- **Nu aan de beurt** — wat er dit kwartaal gemaakt wordt, afgestemd op het publicatietempo van de klant. Dit is wat de klant standaard ziet.
- **Voorraad** — alles wat de kwaliteitstoets doorstond maar nog niet aan de beurt is, gesorteerd op geschatte waarde. Zichtbaar, doorzoekbaar, maar niet in het gezicht.
- **Afgevallen** — met de reden erbij, zodat je kunt zien of de toets te streng of te soepel staat.

**De volgorde is niet willekeurig.** Sorteer op geschatte waarde: hoe vaak kwam het gemis terug in de metingen, hoe dicht zit het onderwerp op de prioriteitsdiensten uit het strategisch gesprek, en hoe makkelijk is de pagina te maken met de informatie die je al hebt.

**Maak het publicatietempo een gesprek.** `content_plans` heeft al een veld voor pagina's per maand. Als de voorraad drie jaar beslaat, is dat een concreet verkoopargument om het tempo te verhogen. Toon het gewoon: "bij dit tempo duurt het X maanden voordat deze voorraad op is."

**Houd het beheersbaar in de app.** Filteren op nieuw/verbeteren en op cluster, sorteren op waarde, en in bulk goedkeuren of afwijzen. Zonder dat is een voorraad van 175 items onbruikbaar.

### Uit te voeren

1. Voeg de drie niveaus toe: nu aan de beurt, voorraad, afgevallen met reden.
2. Bouw de waardescore en toon per voorstel in één zin waarom het die plek heeft.
3. Koppel "nu aan de beurt" aan het publicatietempo uit het contentplan.
4. Toon hoe lang de voorraad meegaat bij het huidige tempo.
5. Bouw filteren, sorteren en bulkacties in het overzicht.

### Hoe je controleert dat het werkt

Zet een klant met 100+ voorstellen voor het scherm. Kan hij binnen vijf minuten beslissen wat er de komende maand gebeurt zonder alles door te lezen? Zo niet, dan is de ordening niet goed genoeg en helpen meer kansen hem niet.

---

## 6. Volgorde

**A eerst.** Clusters die uit het strategisch gesprek komen sturen alles wat erna komt, en betere klantinput maakt elke volgende stap waardevoller. Optimaliseer je B en C eerst, dan bouw je bovenop een verkeerd fundament.

**B daarna.** Pas als de informatie op orde is, heeft het zin de meting en daarmee het aantal kansen op te schalen.

**C tegelijk met B afronden.** Zodra de aantallen groeien, heb je de ordening direct nodig. Lever B niet op zonder C, anders krijgt de klant een onwerkbare lijst.

Per werkpakket: eerst in kaart brengen wat er nu gebeurt, dan één wijziging, dan opleveren en laten controleren, dan pas door.

---

## 7. Open vragen om onderweg te beslissen

- Welke velden van het strategisch gesprek zijn écht verplicht voordat clusters goedgekeurd mogen worden? Te veel verplicht en de onboarding stokt.
- Wat is een acceptabel budget per cluster-run, en tot hoeveel zoekvragen per cluster willen we gaan?
- Wie vult de klantvragen in: de klant zelf in de app, of het bureau namens de klant tijdens een gesprek? Dat verandert de toon en de lengte van alle vragen ingrijpend.
- Wat gebeurt er met de 7 goedgekeurde clusters die nu al bestaan bij bestaande klanten? Opnieuw draaien of laten staan?
- Wat doen we met een gemeten gemis waar de klant niets zinnigs over te zeggen heeft? Weglaten, of aanhouden als signaal dat het aanbod tekortschiet?

Deze vragen leg je aan mij voor op het moment dat ze relevant worden, niet allemaal vooraf.
