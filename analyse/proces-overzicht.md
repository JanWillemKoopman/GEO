# Hoe ORBIT ENGINE werkt: van klantaccount tot gepubliceerde content

Dit document is geschreven op basis van de huidige code, database-migraties en configuratie, niet op basis van bestaande documentatie. Waar de code iets anders doet dan een functienaam of een stuk tekst belooft, staat dat er expliciet bij. Onzekerheden zijn benoemd, niet weggelaten.

De Sales-module (het interne systeem om saleskansen te vinden en een conceptmail klaar te zetten) is op verzoek buiten dit overzicht gelaten, behalve op de ene plek waar hij de grens raakt met een klantaccount.

## Samenvatting in 10 zinnen

ORBIT ENGINE meet hoe vaak en hoe positief een merk genoemd wordt in antwoorden van AI-assistenten zoals ChatGPT, en zet die meting om in concrete verbeterkansen. Een beheerder (consultant) zet een merkprofiel op, waarna de app de website automatisch scant en een deel van het profiel zelf invult; de klant vult of corrigeert dat daarna. De meting stelt tientallen vragen aan een AI-model, beoordeelt of het merk in het antwoord voorkomt en berekent daaruit een score, een aandeel ten opzichte van concurrenten en een lijst gemiste vragen. Uit die gemiste vragen schrijft een tweede AI-model, met een strikt feitenkader, concept-webpagina's die de kans moeten verzilveren. Elke conceptpagina doorloopt een geautomatiseerde kwaliteitskeuring en moet daarna door een mens (klant of beheerder) worden vrijgegeven voordat hij gepubliceerd mag worden. Publiceren gebeurt niet door de app zelf: de klant plaatst de tekst zelf op zijn eigen website en meldt dat in de app. Na publicatie meet de app twee keer automatisch of de pagina echt effect heeft, en elke maand wordt de hele meting herhaald. Een deel van de app (koppeling met Google Search Console, en een module voor echt zoekvolume) staat al klaar in de code maar is nog nooit met een echte klant getest. Vrijwel alle achtergrondwerk loopt via een wachtrij die automatisch draait, met uitzondering van één functie (de e-mailherinnering bij niet-gepubliceerde content) die momenteel nergens automatisch aangeroepen wordt.

## De stappen in volgorde

**Fase A: het merk opzetten**
1. Een profiel (merk) wordt aangemaakt, door een beheerder of via een sales-conversie
2. Automatisch vooronderzoek: een lichte scan van de website
3. Automatische ontdekking en diepe crawl van de belangrijkste pagina's
4. Automatisch AI-onderzoek vult het merkprofiel
5. Het profiel wordt gekoppeld aan een echt klantaccount
6. Teamleden worden uitgenodigd en loggen in
7. De klant vult en corrigeert het merkprofiel
8. (Nog niet in gebruik bij klanten) Koppeling met Google Search Console en zoekvolumedata

**Fase B: zichtbaarheid meten**
9. Een analyse (meetronde rond een onderwerp) wordt gestart
10. Automatische voorbereiding: meetvragen genereren
11. Automatische meting: de AI-assistent wordt bevraagd en het antwoord beoordeeld
12. Automatische verwerking: score, aandeel en betrouwbaarheid berekenen
13. Automatisch rapport: GEO-kansen bepalen en rangschikken

**Fase C: van kans naar content**
14. Besluit om een kans te laten uitschrijven, automatisch of via een knop
15. Automatische voorbereiding van het schrijven
16. Automatisch schrijven van de pagina
17. Automatische kwaliteitscontrole en reparatie

**Fase D: controle en publicatie**
18. De klant of beheerder bekijkt, bewerkt en keurt het concept goed
19. De klant publiceert de pagina zelf en meldt dit in de app
20. Automatische controle of de pagina echt live staat

**Fase E: na publicatie**
21. Automatische hermeting van het effect, twee en vier weken later
22. Maandelijkse hermeting van de hele analyse en een technische audit
23. E-mails: rapportmail en publicatie-herinnering
24. Doorontwikkeling die al gebouwd is maar nog niet getest: Search Console en zoekvolume

---

## Fase A: het merk opzetten

### Stap 1: een profiel (merk) wordt aangemaakt

**Wat gebeurt er?** Een beheerder vult een naam en een website in. De app controleert of de website bestaat en bereikbaar is, maakt een rij aan in de tabel `profiles` met status "bezig", en zet meteen een achtergrondtaak klaar die het onderzoek start. Er bestaat een tweede weg naar hetzelfde punt: als een sales-medewerker een prospect "converteert", ontstaat op dezelfde manier een nieuw profiel, met als extra dat de bekende naamvarianten van dat bedrijf worden meegenomen.

**Wie of wat start deze stap?** Alleen een beheerder (staflid), nooit een klant zelf. Dit is bewust zo gebouwd na een eerder incident waarbij een klant via een vrij tekstveld ongemerkt een betaald onderzoek kon starten.

**Wat ziet de gebruiker op dat moment op het scherm?** De beheerder ziet een formulier met naam, website en optionele naamvarianten. Na opslaan volgt een doorverwijzing naar het voortgangsscherm van het profiel.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Bedrijfsnaam en website worden opgeslagen in `profiles`. Wie welk veld heeft ingevuld (mens of AI) wordt apart bijgehouden in `profile_field_sources`, zodat een latere AI-ronde handmatig ingevoerde velden niet overschrijft.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Op dit moment nog geen AI-model; wel een technische controle of de website bereikbaar is.

**Wat is het resultaat, en welke stap volgt daarna?** Een nieuw profiel met status "bezig", en een achtergrondtaak die stap 2 in gang zet.

**Wat gebeurt er als het misgaat?** Is de website niet bereikbaar (bijvoorbeeld omdat de site geautomatiseerd bezoek weert), dan krijgt de beheerder een duidelijke foutmelding met de mogelijkheid het alsnog te forceren. Is het adres onjuist geschreven, dan blokkeert een controle vóór het opslaan.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Dat alleen een beheerder dit mag starten, nooit de klant zelf. Dat het profiel bij aanmaken op het account van de beheerder komt te staan, niet op een klantaccount; de koppeling naar de klant is een aparte, latere stap (zie stap 5).

**Waar in de code zit dit?** `app/(app)/merk/nieuw/`, `app/api/profiles/route.ts`, `lib/url.ts`.

### Stap 2: automatisch vooronderzoek, een lichte scan van de website

**Wat gebeurt er?** Zodra een profiel is aangemaakt, leest de app van tot duizend pagina's van de website alleen de titel en de metabeschrijving (geen volledige inhoud). Dit is bedoeld om snel te zien welke pagina's belangrijk zijn, ook als de url zelf niets zegt (bijvoorbeeld een paginanummer in plaats van een woord).

**Wie of wat start deze stap?** Automatisch, direct na stap 1, zonder dat iemand daarop klikt.

**Wat ziet de gebruiker op dat moment op het scherm?** Een voortgangsindicator op het profielscherm; geen inhoudelijke keuzes.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** De titel en metabeschrijving per pagina worden opgeslagen in `profile_page_signals`. Omdat deze scan lang kan duren, wordt de voortgang bewaard zodat een onderbreking niet betekent dat alles opnieuw moet.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Geen AI, wel het ophalen van paginateksten van de website van de klant zelf.

**Wat is het resultaat, en welke stap volgt daarna?** Een lijst signalen die de volgende stap (de diepe crawl) helpt bij het kiezen van de belangrijkste pagina's. Daarna start automatisch stap 3.

**Wat gebeurt er als het misgaat?** Als de scan de tijdslimiet van één taak overschrijdt, plant de app zichzelf opnieuw in, tot vijf keer. Lukt een deel niet (bijvoorbeeld een pagina die niet laadt), dan wordt dat deel overgeslagen zonder de rest te blokkeren.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Het maximum van duizend pagina's voor deze fase. Er bestaat een vergelijkbare, maar los daarvan gebouwde tweede scan die draait wanneer een bestaand profiel later ververst wordt (maximaal zeshonderd pagina's); die twee scans delen geen code, ook al doen ze inhoudelijk hetzelfde.

**Waar in de code zit dit?** `lib/pipeline/light-scan.ts`, `lib/crawler.ts`, migratie `0102_vooronderzoek_paginasignalen.sql`, `0101_lichte_paginascan.sql`.

### Stap 3: automatische ontdekking en diepe crawl

**Wat gebeurt er?** De app leest de volledige inhoud van een geselecteerde groep pagina's (met de signalen uit stap 2 als hulp bij het kiezen), tot een vaste bovengrens per profiel.

**Wie of wat start deze stap?** Automatisch, aansluitend op stap 2.

**Wat ziet de gebruiker op dat moment op het scherm?** Voortgang op het profielscherm.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Paginateksten worden verwerkt tot bruikbare tekst per pagina, gebruikt in de volgende stap.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Geen AI in deze stap zelf; puur het ophalen en verwerken van webpagina's.

**Wat is het resultaat, en welke stap volgt daarna?** Genoeg tekstmateriaal om het merkprofiel automatisch te laten invullen (stap 4).

**Wat gebeurt er als het misgaat?** Onbereikbare pagina's worden overgeslagen. Een harde bovengrens (honderdvijftig pagina's, ruimer in de achtergrondversie) voorkomt dat één grote website de hele pijplijn blokkeert of onnodig lang laat duren.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** De bovengrens van het aantal gecrawlde pagina's; bij een zeer grote website worden dus niet alle pagina's meegenomen.

**Waar in de code zit dit?** `lib/pipeline/discover.ts`, `lib/crawler.ts`.

### Stap 4: automatisch AI-onderzoek vult het merkprofiel

**Wat gebeurt er?** Een AI-model leest het verzamelde websitemateriaal en vult delen van het merkprofiel in: bijvoorbeeld doelgroep, kernboodschappen, toonzetting. Elk veld dat zo wordt ingevuld, krijgt het label "uit de website gehaald", zichtbaar voor de klant.

**Wie of wat start deze stap?** Automatisch, als vervolg op stap 3.

**Wat ziet de gebruiker op dat moment op het scherm?** Een voortgangsindicator, en later, bij het bekijken van het merkprofiel, een badge per veld die aangeeft dat de waarde automatisch is afgeleid.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Merkprofielvelden in `profiles` en de herkomst per veld in `profile_field_sources`.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Het middelste AI-model (zie stap 11 voor uitleg over de modeltiers) analyseert de website-inhoud.

**Wat is het resultaat, en welke stap volgt daarna?** Een grotendeels ingevuld merkprofiel. De klant kan het daarna bekijken en aanvullen (stap 7).

**Wat gebeurt er als het misgaat?** Levert de AI voor een veld niets bruikbaars op, dan blijft dat veld leeg (nooit een geraden waarde). Een velden-lijst die eerder handmatig door een mens is ingevuld, wordt door dit onderzoek nooit overschreven.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Van de zevenenvijftig merkprofielvelden zijn er twaalf commerciële en drie contactvelden die de klant nooit te zien krijgt op zijn eigen scherm; dat is een bewuste keuze ("waar wil je op groeien is een gesprek, geen invulveld"), geen weglating per ongeluk. Sommige velden hebben in de code zelf de vermelding dat ze nog nergens in de app gebruikt worden.

**Waar in de code zit dit?** `lib/pipeline/brand-fields.ts`, `lib/profile-source.ts`.

### Stap 5: het profiel koppelen aan een echt klantaccount

**Wat gebeurt er?** Een beheerder wijst een bestaande, al aangemaakte gebruiker toe aan het profiel. Vanaf dat moment staat het merk (en alle bijbehorende metingen) op naam van de klant in plaats van op naam van de beheerder.

**Wie of wat start deze stap?** Uitsluitend een beheerder, met een expliciete waarschuwing in de code dat het aanmaken van de gebruiker zelf hier niet gebeurt: dat moet de beheerder buiten de app om doen, in het Supabase-beheerscherm.

**Wat ziet de gebruiker op dat moment op het scherm?** De beheerder ziet een lijst met bestaande gebruikers om uit te kiezen. De klant merkt op dit moment zelf nog niets; hij heeft op dit punt meestal nog geen inloggegevens.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Het profiel en de bijbehorende analyses krijgen een nieuwe eigenaar (account en gebruiker).

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Geen.

**Wat is het resultaat, en welke stap volgt daarna?** Het merk hoort nu bij het klantaccount. Als er nog geen inlog is voor de klant, moet die apart geregeld worden (zie de aandachtspunten hieronder en bij stap 6).

**Wat gebeurt er als het misgaat?** De koppeling van het profiel en die van de bijbehorende analyses zijn twee losse handelingen na elkaar, niet één ondeelbare stap. Lukt de tweede niet, dan wordt de eerste teruggedraaid zodat het niet half blijft hangen; alleen bij een zeer onwaarschijnlijke onderbreking precies daartussenin kan een merk op de klant staan terwijl de analyses nog aan de vorige eigenaar hangen.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Er bestaat geen enkele knop in de app die voor de allereerste gebruiker van een nieuw klantaccount een wachtwoord instelt of een welkomstmail stuurt. Dat moet de beheerder nu volledig buiten de app om regelen (zie ook lijst B, punt B5, aan het einde van dit document).

**Waar in de code zit dit?** `app/api/profiles/[id]/assign/route.ts`, `app/api/sales/outreach/[id]/convert/route.ts` (voor de sales-herkomst).

### Stap 6: teamleden uitnodigen en inloggen

**Wat gebeurt er?** Een beheerder van het account (of een staflid) kan extra teamleden uitnodigen door een e-mailadres in te voeren. De app maakt een unieke link aan die veertien dagen geldig is. Die link wordt niet automatisch gemaild; de beheerder krijgt hem te zien en moet hem zelf doorsturen. Wie op de link klikt, kan een wachtwoord instellen (bij een nieuw account) of wordt direct toegevoegd aan het account (bij een e-mailadres dat al een account heeft).

**Wie of wat start deze stap?** Een accountbeheerder of staflid stuurt de uitnodiging; de uitgenodigde persoon activeert hem.

**Wat ziet de gebruiker op dat moment op het scherm?** De uitnodiger ziet een kopieerbare link. De uitgenodigde ziet een activatiescherm met vier mogelijke uitkomsten (geldig, verlopen, al gebruikt, ongeldig), elk met eigen tekst.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Alleen een beveiligde versie (hash) van de uitnodigingscode wordt bewaard, nooit de code zelf. Bij acceptatie wordt een lidmaatschap toegevoegd aan `account_users`.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Supabase Auth voor het aanmaken van de inlog zelf. Geen AI.

**Wat is het resultaat, en welke stap volgt daarna?** De uitgenodigde persoon kan inloggen en het merk beheren. Daarna kan de klant het merkprofiel gaan bekijken (stap 7).

**Wat gebeurt er als het misgaat?** Bestaat het e-mailadres al als gebruiker, dan wordt het ingevoerde wachtwoord genegeerd (terecht, om een bestaand wachtwoord niet te overschrijven), maar de app probeert daarna toch automatisch in te loggen met dat genegeerde wachtwoord. Lukt dat niet, dan komt de gebruiker zonder duidelijke uitleg op het inlogscherm terecht, terwijl hij inmiddels wel al is toegevoegd aan het account.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Wie de uitnodigingslink in bezit heeft, wordt zonder verdere controle toegevoegd aan het account, ook als er al een bestaand account met een ander wachtwoord achter dat e-mailadres zit. Dat is veilig zolang de link alleen bij de juiste persoon terechtkomt, maar wordt niet technisch afgedwongen: er wordt niet gecontroleerd of degene die de link gebruikt ook echt het wachtwoord van dat bestaande account kent.

**Waar in de code zit dit?** `lib/invites.ts`, `app/api/invites/`, `app/(auth)/uitnodiging/[token]/`.

### Stap 7: de klant vult en corrigeert het merkprofiel

**Wat gebeurt er?** Op één centraal scherm ("merkdossier") kan de klant tweeënveertig van de zevenenvijftig merkprofielvelden bekijken en bewerken, verdeeld over stappen zoals "je bedrijf", "je klant" en "hoe je klinkt". Elk veld toont waarvoor het gebruikt wordt in de app, inclusief eerlijke teksten bij velden die nog nergens toe leiden.

**Wie of wat start deze stap?** De klant zelf, of een consultant namens de klant tijdens een gesprek.

**Wat ziet de gebruiker op dat moment op het scherm?** Een formulier per onderdeel, met per veld een uitleg, een badge bij automatisch ingevulde velden, en schuifregelaars voor toonzetting.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Alle bewerkbare merkprofielvelden. Elke wijziging wordt getrimd en opgeschoond; een leeg tekstveld wordt bewust "onbekend" in plaats van een lege tekenreeks, zodat een later systeem niet per ongeluk een leeg veld als bewust antwoord ziet.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Geen op dit moment; dit is puur formulierinvoer.

**Wat is het resultaat, en welke stap volgt daarna?** Een vollediger en correcter merkprofiel, dat als basis dient voor zowel de meting (fase B) als het schrijven van content (fase C).

**Wat gebeurt er als het misgaat?** Ongeldige waarden (bijvoorbeeld een schuifregelaar buiten bereik, of een niet-toegestane keuze) worden serverside afgekapt of genegeerd in plaats van foutief opgeslagen.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Een gewone gebruiker kan zijn eigen invoer alleen als "klant" markeren, nooit als "consultant" of "gesprek"; dat voorkomt dat iemand zijn eigen invoer onaantastbaar maakt voor een later AI-onderzoek.

**Waar in de code zit dit?** `app/(app)/merk/[id]/merkprofiel/bewerken/`, `app/api/profiles/[id]/route.ts`, `lib/profile-editable.ts`.

### Stap 8: koppeling met Google Search Console en zoekvolume (nog niet getest met klanten)

**Wat gebeurt er?** Een staflid kan per merk een koppeling maken met Google Search Console, zodat de app dagelijks automatisch echte kliks, vertoningen en posities ophaalt. Daarnaast bestaat er code die echt zoekvolume per zoekterm ophaalt bij een externe leverancier (DataForSEO), gebruikt om te bepalen hoeveel een onderwerp oplevert.

**Wie of wat start deze stap?** Alleen een staflid kan de koppeling instellen; dit scherm is bewust onzichtbaar voor klanten. De klant moet zelf, buiten de app, het serviceaccount van de app toegang geven in zijn eigen Google Search Console.

**Wat ziet de gebruiker op dat moment op het scherm?** Alleen zichtbaar voor staf: een koppelingsscherm per merk met statusmeldingen bij problemen (bijvoorbeeld: geen toegang gegeven, of de property-naam klopt niet).

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Klik-, vertonings- en positiecijfers per pagina en per zoekterm worden dagelijks opgeslagen. Zoekvolume per zoekterm wordt apart bijgehouden met een duidelijk label of het gemeten of geschat is.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** De Google Search Console-API (dagelijks, automatisch) en optioneel de DataForSEO-API voor zoekvolume.

**Wat is het resultaat, en welke stap volgt daarna?** Waar een koppeling werkt, wordt deze data al gebruikt op het zoekverkeerscherm van de klant en in de bepaling van kansen en contentplanning. Zonder koppeling verandert er niets: de app werkt dan zoals voorheen, met geschatte in plaats van gemeten cijfers.

**Wat gebeurt er als het misgaat?** Bij een storing bij Google wordt de fout zichtbaar getoond aan de beheerder, zonder automatische nieuwe poging (een nieuwe poging lost een toegangsprobleem toch niet op). Bij DataForSEO staat in de code zelf expliciet vermeld dat deze koppeling nog nooit tegen een echt account is getest.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Zonder de juiste sleutels ingesteld, toont het scherm zelf een waarschuwing en werkt geen enkele koppeling. Dit is dus, zoals u zelf al aangaf, een kant en klare maar ongeteste uitbreiding.

**Waar in de code zit dit?** `app/(app)/instellingen/koppelingen/`, `lib/search-console/`, `lib/search-demand/`.

---

## Fase B: zichtbaarheid meten

### Stap 9: een analyse wordt gestart

**Wat gebeurt er?** Een beheerder kiest een onderwerp (cluster) waarop gemeten gaat worden en start de analyse.

**Wie of wat start deze stap?** Uitsluitend een beheerder; dit is niet zichtbaar of beschikbaar voor een klant.

**Wat ziet de gebruiker op dat moment op het scherm?** Een formulier met onderwerp, gevolgd door een voortgangsscherm.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Een nieuwe rij in `analyses`, gekoppeld aan het merkprofiel.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Nog geen; deze stap plant alleen de voorbereidingstaak in.

**Wat is het resultaat, en welke stap volgt daarna?** Automatisch vervolg naar stap 10.

**Wat gebeurt er als het misgaat?** Kostenremmen voorkomen dat iemand zonder de juiste rechten dit start, en het profiel moet eerst klaar zijn.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Dat alleen staf een analyse mag starten, met een dagbudget als extra rem.

**Waar in de code zit dit?** `app/(app)/analyses/new/`, `app/api/analyses/route.ts`.

### Stap 10: automatische voorbereiding, meetvragen genereren

**Wat gebeurt er?** De app laat een AI-model een reeks vragen bedenken die een potentiële klant aan een AI-assistent zou kunnen stellen over dit onderwerp.

**Wie of wat start deze stap?** Automatisch, direct na stap 9.

**Wat ziet de gebruiker op dat moment op het scherm?** Een voortgangsbalk met tekst als "vragen bedenken".

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** De gegenereerde vragen (prompts) worden opgeslagen, elk met een geschat zoekvolume en type (bijvoorbeeld oriënterend of kooprijp).

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Een AI-model bedenkt de vragen; als er een werkende koppeling met echt zoekvolume bestaat (stap 8), wordt dat gebruikt in plaats van een schatting.

**Wat is het resultaat, en welke stap volgt daarna?** Een lijst vragen, klaar om gemeten te worden (stap 11).

**Wat gebeurt er als het misgaat?** Levert het model te weinig bruikbare vragen op, dan probeert de app tot een vast maximum aantal keer opnieuw aan te vullen.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Het gewicht van elke vraag (hoe zwaar hij meetelt in de uiteindelijke score) hangt af van een geschat zoekvolume en het type vraag; dit gewicht wordt vastgezet op het moment van meten, zodat een latere herziening de geschiedenis niet verandert.

**Waar in de code zit dit?** `lib/pipeline/prompts.ts`, `lib/pipeline/prompt-weight.ts`, `lib/pipeline/volume.ts`.

### Stap 11: automatische meting, de AI-assistent wordt bevraagd en beoordeeld

**Wat gebeurt er?** Voor elke vraag stelt de app dezelfde vraag aan een AI-model, alsof een echte gebruiker die stelt (met de mogelijkheid om live op het web te zoeken, net als een assistent dat zou doen). Een tweede, apart aangeroepen AI-beoordeling bepaalt vervolgens of het merk van de klant in dat antwoord voorkomt, en zo ja op welke positie en met welke rol.

**Wie of wat start deze stap?** Automatisch, na stap 10, en later ook maandelijks herhaald (zie stap 22).

**Wat ziet de gebruiker op dat moment op het scherm?** "Vragen stellen (x van y)" op het voortgangsscherm.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Het ruwe antwoord van de AI-assistent en de beoordeling ervan worden allebei volledig opgeslagen, ook de ruwe modeloutput naast de uitgesplitste velden (voor controleerbaarheid achteraf).

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Op dit moment alleen OpenAI-modellen. Er bestaat kant en klare code om ook Google Gemini te bevragen, maar die is nooit gebruikt omdat er geen sleutel voor is ingesteld; de bijbehorende kostentarieven staan zelfs nog niet correct in de code.

**Wat is het resultaat, en welke stap volgt daarna?** Eén beoordeelde meting per vraag. Zodra alle vragen van een ronde beoordeeld zijn, volgt automatisch stap 12.

**Wat gebeurt er als het misgaat?** Een te kort of afgekapt antwoord wordt niet opgeslagen als "niet genoemd" maar simpelweg verworpen en later opnieuw geprobeerd: een meetfout wordt dus nooit verward met een echt "nee". Zegt de beoordelaar dat het merk genoemd wordt, maar komt de merknaam nergens letterlijk in de tekst voor, dan wordt dat oordeel genegeerd: dit vangnet is toegevoegd nadat bleek dat het model in een steekproef bij bijna één op de vijf gevallen dit fout had.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Of er wel of niet live op het web gezocht wordt tijdens het meten, is instelbaar (`MEASURE_WEB_SEARCH`); staat dit uit, dan geeft de AI vrijwel altijd "ken ik niet" voor een lokale ondernemer, wat de meting onbruikbaar maakt voor een echte klant maar wel geschikt is om goedkoop te testen.

**Waar in de code zit dit?** `lib/pipeline/measure.ts`, `lib/engines/`, `lib/openai/mention-prompt.ts`.

### Stap 12: automatische verwerking, score, aandeel en betrouwbaarheid

**Wat gebeurt er?** Alle beoordeelde metingen van een ronde worden samengevoegd tot één zichtbaarheidsscore, een aandeel ten opzichte van concurrenten (share of voice) en een marge van onzekerheid rond dat cijfer.

**Wie of wat start deze stap?** Automatisch, zodra de laatste meting van een ronde beoordeeld is.

**Wat ziet de gebruiker op dat moment op het scherm?** "Score en concurrentievergelijking berekenen" op het voortgangsscherm.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** De score, het gewogen aandeel en de statistische onzekerheid worden opgeslagen, samen met een uitsplitsing per concurrent.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Vrijwel geen; alleen een kleine, optionele AI-classificatie van nieuw ontdekte merknamen, die zacht faalt als hij niet lukt.

**Wat is het resultaat, en welke stap volgt daarna?** Een score en aandeel, klaar voor het rapport (stap 13).

**Wat gebeurt er als het misgaat?** Vragen waarin de AI helemaal geen enkele aanbieder noemt, tellen niet mee in de score: er valt dan niets te winnen, dus meetellen zou de score onterecht verlagen. Alleen beoordelingen die echt gelukt zijn tellen mee; een mislukte beoordeling is "onbekend", nooit stilzwijgend "niet genoemd".

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Het aandeel telt alleen merken mee die als "concurrent" zijn bevestigd, niet elk ontdekt merk (dus geen marktplaatsen of vergelijkingssites). Bij een grote onzekerheidsmarge krijgt het cijfer het label "nog een meetronde nodig"; dit blokkeert niets, het is puur een waarschuwing.

**Waar in de code zit dit?** `lib/pipeline/measure.ts` (aggregatiedeel), `lib/entities/`, `lib/potential.ts`.

### Stap 13: automatisch rapport, GEO-kansen bepalen en rangschikken

**Wat gebeurt er?** Vragen waarop het merk in de meerderheid van de metingen niet voorkwam, worden gerangschikt op belang (op basis van het vastgezette gewicht uit stap 10) en voorgelegd aan een AI-model, dat op basis daarvan aanbevelingen schrijft: welke pagina nieuw moet komen of verbeterd moet worden, en waarom.

**Wie of wat start deze stap?** Automatisch, na stap 12.

**Wat ziet de gebruiker op dat moment op het scherm?** "Rapport opstellen", en na afloop een samenvatting in gewone taal met de gemiste vragen en de aanbevelingen, zichtbaar voor zowel klant als beheerder.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Het rapport, inclusief de ruwe modeloutput voor controleerbaarheid.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Eén AI-aanroep die de aanbevelingen schrijft.

**Wat is het resultaat, en welke stap volgt daarna?** Een lijst GEO-kansen, klaar om (in fase C) tot content te leiden.

**Wat gebeurt er als het misgaat?** Verzint het model een naam van een concurrent die niet in het bewijs voorkomt, dan wordt die zin uit de tekst gehaald. Verwijst het model naar een niet-bestaand webadres, dan wordt dat rechtgezet tegen de echte inventaris van de website; dit is aantoonbaar nodig geweest, want eerder droeg bijna de helft van de aanbevelingen een verzonnen of onjuist adres.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** De volgorde waarin de klant de aanbevelingen ziet, is het prioriteitsgetal dat het AI-model zelf per aanbeveling verzint, niet de onderliggende, wel volledig berekende rangschikking van gemiste vragen. Dat maakt de zichtbare volgorde minder voorspelbaar dan de cijfers erachter.

**Waar in de code zit dit?** `lib/pipeline/report.ts`, `lib/pipeline/recommendation.ts`, `lib/potential.ts`.

---

## Fase C: van kans naar content

### Stap 14: het besluit om een kans te laten uitschrijven

**Wat gebeurt er?** Er zijn twee wegen die naar hetzelfde punt leiden: een beheerder klikt op een knop bij een specifieke aanbeveling of op "schrijf mijn pagina's", óf een dagelijkse achtergrondtaak start automatisch het schrijven van pagina's die al in een door een beheerder goedgekeurde contentmaand staan.

**Wie of wat start deze stap?** Bij de knop: een beheerder, na een eigen kostencontrole. Bij de automatische weg: een dagelijkse achtergrondtaak, maar die voert alleen uit wat een beheerder al eerder heeft goedgekeurd door een hele contentmaand vrij te geven; dat is de duurste goedkeuring in de hele app.

**Wat ziet de gebruiker op dat moment op het scherm?** Bij de knop: direct een voortgangsmelding. Bij de automatische weg: de kaart in de contentkalender verandert van status naar "schrijven".

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Een nieuwe schrijftaak wordt aangemaakt, gekoppeld aan de betreffende aanbeveling of geplande pagina.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Nog niet in deze stap zelf.

**Wat is het resultaat, en welke stap volgt daarna?** Automatisch vervolg naar stap 15.

**Wat gebeurt er als het misgaat?** Bij de knop kan een dagbudget de actie blokkeren als het plafond al bereikt is; er verschijnt dan een duidelijke melding.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Het besluit "nu schrijven" ligt dus altijd bij een mens (beheerder), nooit volledig automatisch zonder eerdere menselijke goedkeuring, ook al lijkt de dagelijkse cron op het eerste gezicht een geheel automatisch proces.

**Waar in de code zit dit?** `app/api/cron/plan/route.ts`, `app/api/analyses/[id]/generate/route.ts`, `lib/plan-status.ts`, `lib/jobs/content-jobs.ts`.

### Stap 15: automatische voorbereiding van het schrijven

**Wat gebeurt er?** Voordat er geschreven wordt, stelt de app eerst een inhoudsopgave op (welke deelvragen de pagina moet beantwoorden), een korte redactionele schrijfopdracht (wie is de lezer, wat is het kernantwoord, wat moet blijven hangen) en een lijst bewijspunten die letterlijk terug te voeren zijn op vastgelegde feiten over het bedrijf.

**Wie of wat start deze stap?** Automatisch, als eerste onderdeel van de schrijftaak uit stap 14.

**Wat ziet de gebruiker op dat moment op het scherm?** Alleen voortgang; de inhoud van deze tussenstap is niet apart zichtbaar voor de klant.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Het contract (inhoudsopgave), de schrijfopdracht en de bewijspunten worden opgeslagen bij de conceptpagina.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Eén of meer kleinere AI-aanroepen die kiezen in plaats van uitgebreid onderzoeken.

**Wat is het resultaat, en welke stap volgt daarna?** Alle bouwstenen die het schrijfmodel in stap 16 nodig heeft.

**Wat gebeurt er als het misgaat?** Levert de AI een onbruikbare of onvolledige schrijfopdracht op (bijvoorbeeld te weinig bewijspunten), dan wordt de hele opdracht verworpen in plaats van gedeeltelijk gebruikt, en schrijft de app verder zoals vóór deze extra stap bestond.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Deze stap is bedoeld om reparatierondes later te verminderen; de code zelf merkt op dat dit een verwachting is, geen gemeten resultaat.

**Waar in de code zit dit?** `lib/pipeline/content-plan.ts`, `lib/pipeline/writer-brief.ts`, `lib/schrijfopdracht.ts`, `lib/pipeline/bewijspunten.ts`.

### Stap 16: automatisch schrijven van de pagina

**Wat gebeurt er?** Het duurste AI-model van de app schrijft de volledige pagina, met een strikte instructie dat alleen vastgelegde feiten als concrete bewering gebruikt mogen worden ("wat er niet op de feitenkaart staat, bestaat niet"), dat concurrenten nooit genoemd worden, en dat de stijl van het merk wordt nagebootst.

**Wie of wat start deze stap?** Automatisch, na stap 15.

**Wat ziet de gebruiker op dat moment op het scherm?** Voortgang; de klant ziet pas het resultaat in fase D.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** De geschreven pagina (tekst, titel, samenvatting, veelgestelde vragen) wordt opgeslagen als conceptstuk.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Het duurste van de drie AI-modeltiers in de app, specifiek gereserveerd voor het schrijven zelf; dit is verreweg de grootste kostenpost van de hele pijplijn.

**Wat is het resultaat, en welke stap volgt daarna?** Een conceptpagina, die automatisch naar de kwaliteitscontrole gaat (stap 17).

**Wat gebeurt er als het misgaat?** Wijkt het model onvoldoende af naar aanleiding van eerdere feedback, dan wordt dat gedetecteerd in de kwaliteitscontrole (zie stap 17), niet in deze stap zelf.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** De redeneerinspanning voor het schrijven is bewust niet op de hoogste stand gezet, omdat dat te vaak tegen een tijdslimiet zou aanlopen en dan dubbele kosten zou opleveren.

**Waar in de code zit dit?** `lib/pipeline/content.ts`.

### Stap 17: automatische kwaliteitscontrole en reparatie

**Wat gebeurt er?** Elke conceptpagina wordt gekeurd door een panel van vier gescheiden AI-beoordelaars (kritiek, feitelijkheid, citeerbaarheid, vakmanschap) plus ongeveer twintig harde, niet-AI-gebaseerde controles (bijvoorbeeld: worden concurrenten toch genoemd, klopt de aanspreekvorm, is de inhoudsopgave gevolgd). Op basis daarvan volgt een oordeel: goedgekeurd, repareren, of blokkeren. Bij "repareren" herschrijft de app gericht de zwakke onderdelen, tot drie keer.

**Wie of wat start deze stap?** Automatisch, direct na stap 16, en automatisch herhaald na elke reparatie.

**Wat ziet de gebruiker op dat moment op het scherm?** Voortgang; het definitieve oordeel wordt pas zichtbaar bij het concept in fase D.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** De keuringsuitslag en eventuele opmerkingen worden opgeslagen bij het conceptstuk.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Vier aparte AI-beoordelingen per keuringsronde.

**Wat is het resultaat, en welke stap volgt daarna?** Een pagina die klaarstaat voor menselijke controle (fase D), met een label of hij extra aandacht nodig heeft.

**Wat gebeurt er als het misgaat?** Na drie reparatierondes stopt de app: wat dan nog als bevinding overblijft, wordt gewoon zichtbaar getoond aan de klant in een "kijk hier even naar"-blok, niet verborgen.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Een geslaagde automatische keuring ("pass") is uitdrukkelijk niet hetzelfde als "een mens heeft dit goedgekeurd"; die twee zijn los van elkaar vastgelegd (zie stap 18). Er bestaat daarnaast een apart, alleen voor staf zichtbaar "kwaliteitslab" waarin een mens het automatische oordeel kan vergelijken met zijn eigen oordeel; dat blokkeert of publiceert niets, het is puur een meetinstrument voor het team.

**Waar in de code zit dit?** `lib/pipeline/quality-run.ts`, `lib/pipeline/content-panel.ts`, `app/(app)/beheer/kwaliteit/`.

---

## Fase D: controle en publicatie

### Stap 18: de klant of beheerder bekijkt, bewerkt en keurt het concept goed

**Wat gebeurt er?** Op het conceptscherm ziet de gebruiker bovenaan de publicatieknop, daarna uitleg waarom deze pagina bestaat, het automatische kwaliteitsoordeel in gewone taal, de tekst zelf, en een apart blok met de feitenkaart waarop de pagina gebouwd is (inclusief wat bewust is weggelaten). Pas na een expliciete klik op "ik heb dit gecontroleerd" telt de pagina als door een mens gecontroleerd. De gebruiker kan de tekst zelf aanpassen, of een nieuwe versie laten schrijven met eigen feedback.

**Wie of wat start deze stap?** De klant, of de beheerder namens de klant.

**Wat ziet de gebruiker op dat moment op het scherm?** Zoals hierboven beschreven: tekst, kwaliteitsoordeel, feitenkaart, een bewerkknop en een goedkeurknop.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Handmatige aanpassingen worden direct opgeslagen; goedkeuring zet een apart vinkje (los van de tekst zelf) met wie en wanneer.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Alleen bij "opnieuw schrijven met feedback" wordt opnieuw het schrijfmodel ingezet; een nieuwe versie vervangt de vorige niet, maar wordt ernaast bewaard.

**Wat is het resultaat, en welke stap volgt daarna?** Een door een mens goedgekeurde pagina, klaar voor publicatie (stap 19).

**Wat gebeurt er als het misgaat?** Bewerken twee mensen tegelijk dezelfde pagina, dan weigert de tweede opslagpoging met een duidelijke melding in plaats van de eerste wijziging stilzwijgend te overschrijven. Zijn er nog openstaande, verplichte vragen, dan is de goedkeurknop geblokkeerd; het overslaan van zo'n vraag telt zelf als een antwoord.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Dat een geautomatiseerd "pass" nooit vanzelf tot publicatie leidt: er is altijd een aparte, expliciete menselijke klik nodig.

**Waar in de code zit dit?** `app/(app)/analyses/[id]/bibliotheek/[pieceId]/`, `app/api/analyses/[id]/content/[pieceId]/approve/route.ts`, `lib/content-final-gate.ts`.

### Stap 19: de klant publiceert zelf en meldt dit in de app

**Wat gebeurt er?** De app publiceert nooit zelf iets op de website van de klant. De klant plaatst de tekst zelf op zijn eigen website (via zijn eigen CMS, buiten de app om) en meldt daarna in de app dat de pagina live staat, met de bijbehorende url.

**Wie of wat start deze stap?** De klant of de beheerder, op twee verschillende manieren die niet hetzelfde doen (zie hieronder).

**Wat ziet de gebruiker op dat moment op het scherm?** Een publiceerknop op het conceptscherm zelf, of een aparte actie op de contentplanningskalender ("geplaatst" of "alles geplaatst" voor een hele maand).

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Bij de knop op het conceptscherm: de status van het conceptstuk gaat naar "gepubliceerd", met de gemelde url. Bij de kalenderactie: alleen de status van de geplande pagina in de kalender verandert, dat is een aparte tabel.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Geen AI in deze stap; wel een technische controle die de opgegeven website bezoekt (zie stap 20).

**Wat is het resultaat, en welke stap volgt daarna?** Bij de knop op het conceptscherm: automatische controle (stap 20) en later automatische hermeting (stap 21). Bij de kalenderactie: voor zover in de code te vinden geen van beide.

**Wat gebeurt er als het misgaat?** Wordt geprobeerd te publiceren met een pagina die nog niet door een mens is goedgekeurd, of met een url die niet op het domein van het merk staat, dan wordt dat geblokkeerd met een duidelijke melding.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Dit is de belangrijkste bevinding van dit hele onderzoek (zie ook lijst A, punt A1): de kalenderactie "geplaatst" of "alles geplaatst" toont de tekst "we gaan deze adressen vanaf nu volgen en meten wat ze opleveren", maar in de code die deze actie uitvoert is geen aanroep gevonden die de urlcontrole of de latere hermeting daadwerkelijk in gang zet. Alleen de aparte publiceerknop op het conceptscherm zelf doet dat wel. Dit betekent mogelijk dat een pagina die via de kalender als geplaatst gemarkeerd wordt, nooit automatisch nagemeten wordt, ondanks de belofte op het scherm.

**Waar in de code zit dit?** `app/api/analyses/[id]/content/[pieceId]/publish/route.ts`, `lib/pipeline/publish.ts` (de knop op het conceptscherm); `app/api/profiles/[id]/plan/pages/[pageId]/route.ts`, `lib/plans.ts` (de kalenderactie).

### Stap 20: automatische controle of de pagina echt live staat

**Wat gebeurt er?** Nadat via de publiceerknop een pagina als gepubliceerd is gemeld, bezoekt de app de opgegeven url echt en controleert of een groot deel van de verwachte tekst daadwerkelijk terug te vinden is.

**Wie of wat start deze stap?** Automatisch, direct na stap 19 (alleen via de publiceerknop op het conceptscherm).

**Wat ziet de gebruiker op dat moment op het scherm?** Geen directe actie nodig; bij een probleem verschijnt een melding op de pagina zelf.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** De uitkomst van de controle wordt vastgelegd bij het conceptstuk.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Geen AI; wel het ophalen van de live pagina van de klant.

**Wat is het resultaat, en welke stap volgt daarna?** Bij een geslaagde controle start automatisch de hermeting (stap 21). Bij een mislukte controle gaat de pagina terug naar "klaar, nog te controleren", en moet de klant opnieuw door het goedkeurscherm voordat een nieuwe publicatiepoging kan.

**Wat gebeurt er als het misgaat?** Is de pagina onbereikbaar of ontbreekt de tekst, dan worden reeds ingeplande hermetingen weer verwijderd: er wordt geen geld uitgegeven aan het meten van een pagina die niet echt live staat.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** De drempel van hoeveel van de verwachte tekst moet terugkomen voordat de controle slaagt, is een vaste waarde in de code.

**Waar in de code zit dit?** `lib/pipeline/publish.ts`, `lib/pipeline/publish-check.ts`.

---

## Fase E: na publicatie

### Stap 21: automatische hermeting van het effect

**Wat gebeurt er?** Twee en vier weken na publicatie meet de app opnieuw specifiek de vragen waarvoor deze pagina is geschreven, en vergelijkt dat met een vaste groep vragen zonder nieuwe pagina, om te zien of de verbetering echt aan deze pagina te danken is.

**Wie of wat start deze stap?** Automatisch, ingepland op het moment van succesvolle publicatie (stap 20).

**Wat ziet de gebruiker op dat moment op het scherm?** Het resultaat komt terug in de rapportage van de bijbehorende analyse.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Nieuwe metingen op dezelfde doelvragen, vergeleken met de controlegroep.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Dezelfde meet- en beoordelingsstap als in fase B.

**Wat is het resultaat, en welke stap volgt daarna?** Zichtbaar bewijs of de content werkt. Geen verdere handeling van de klant nodig.

**Wat gebeurt er als het misgaat?** Heeft de pagina geen doelvragen (bijvoorbeeld omdat hij niet uit de gemeten kansen is ontstaan), dan gebeurt er niets, met een waarschuwing in de logs.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** De termijnen van twee en vier weken liggen vast in de code.

**Waar in de code zit dit?** `lib/pipeline/impact.ts`.

### Stap 22: maandelijkse hermeting van de hele analyse en een technische audit

**Wat gebeurt er?** Elke maand herhaalt de app automatisch de meting voor elke actieve analyse, en plant per merk één technische audit (een bredere technische controle van de website).

**Wie of wat start deze stap?** Een geplande taak die één keer per maand automatisch draait.

**Wat ziet de gebruiker op dat moment op het scherm?** Nieuwe cijfers verschijnen in de bestaande rapportages; geen aparte melding nodig.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Nieuwe metingen, zoals in fase B.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Dezelfde AI-modellen als bij een gewone meting.

**Wat is het resultaat, en welke stap volgt daarna?** Een bijgewerkte score, elke maand opnieuw, zolang de klant dit niet uitzet.

**Wat gebeurt er als het misgaat?** Is de vorige meting nog te recent, dan wordt die analyse voor deze ronde overgeslagen in plaats van dubbel gemeten.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Er is geen ingebouwde bovengrens op het aantal maanden dat dit doorloopt; de enige rem is dat de klant het zelf uitzet, plus het algemene dagbudget. Zonder actie kan een analyse dus voor onbepaalde tijd maandelijks blijven meten (zie ook lijst D, punt D3).

**Waar in de code zit dit?** `app/api/cron/tracking/route.ts`, `lib/measure-cadence.ts`, `lib/config.ts`.

### Stap 23: e-mails, rapport en publicatieherinnering

**Wat gebeurt er?** Er zijn twee mogelijke automatische e-mails: een rapportmail na een meting met een merkbare verandering, en een eenmalige herinnering als content langer dan zeven dagen klaarligt zonder gepubliceerd te zijn.

**Wie of wat start deze stap?** De rapportmail wordt verstuurd als onderdeel van de meetpijplijn zelf (stap 12/13). De herinneringsmail hoort bij een aparte route die wekelijks bedoeld is te draaien.

**Wat ziet de gebruiker op dat moment op het scherm?** Niets in de app; dit is puur een e-mail.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Geen nieuwe gegevens; wel een vinkje dat de herinnering al eens verstuurd is, om herhaling te voorkomen.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** De e-maildienst Resend, alleen als e-mail expliciet is ingeschakeld.

**Wat is het resultaat, en welke stap volgt daarna?** Geen vervolgstap; dit is puur informatief.

**Wat gebeurt er als het misgaat?** E-mail versturen staat standaard uit; is dat zo, dan gebeurt er stil niets, zonder foutmelding aan wie dan ook. Lukt het versturen zelf niet (storing bij de e-maildienst), dan wordt dat alleen in de technische logs vastgelegd, niet aan een beheerder gemeld.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** De route voor de publicatieherinnering staat op dit moment nergens automatisch ingepland (niet in het geplande-takenbestand, niet als terugkerende databasetaak). Zolang e-mail sowieso uitstaat heeft dat geen gevolg, maar mocht e-mail ooit aangezet worden zonder deze route opnieuw in te plannen, dan wordt deze herinnering nooit verstuurd, ook al staat de logica er volledig klaar voor.

**Waar in de code zit dit?** `lib/email/report-email.ts`, `lib/email/publish-reminder.ts`, `app/api/cron/reminders/route.ts`, `lib/env.ts`.

### Stap 24: doorontwikkeling die al gebouwd is maar nog niet getest

**Wat gebeurt er?** Twee stukken werk staan klaar in de code maar zijn, zoals u zelf al aangaf, nog nooit met een echte, actieve klant gebruikt: de dagelijkse Google Search Console-synchronisatie (stap 8) en de koppeling met echt zoekvolume via een externe leverancier. Beide zijn al wel functioneel aangesloten op andere onderdelen (zoekverkeerscherm, contentplanning), maar werken alleen zodra de bijbehorende sleutels zijn ingesteld en een klant de koppeling daadwerkelijk heeft gemaakt.

**Wie of wat start deze stap?** In potentie automatisch (dagelijkse synchronisatie), maar in de praktijk nog door niemand in gebruik genomen bij een lopende klant.

**Wat ziet de gebruiker op dat moment op het scherm?** Zolang de koppeling niet is ingesteld: een duidelijke melding dat de sleutel ontbreekt of dat er nog niets gemeten is.

**Welke gegevens worden gebruikt, en welke worden opgeslagen of gewijzigd?** Zie stap 8.

**Welke externe diensten of AI-modellen worden aangeroepen, en waarvoor?** Zie stap 8.

**Wat is het resultaat, en welke stap volgt daarna?** Op het moment dat dit wel wordt ingesteld en getest, zou dit een deel van de geschatte cijfers in fase B en C vervangen door gemeten cijfers.

**Wat gebeurt er als het misgaat?** Zonder een geldige sleutel gedraagt de app zich precies zoals vóór deze uitbreiding bestond: alles blijft op geschat staan.

**Welke keuzes of aannames heeft de code hier gemaakt die u bewust zou moeten goedkeuren?** Dit is precies het punt waar u zelf al op wees: dit is gebouwd maar nog niet in een echte situatie beproefd. Er is bovendien een aparte databasetabel (`profile_keywords`) aangemaakt voor een volgende stap in deze uitbreiding (per merk bijhouden welke zoekterm bij welk onderwerp hoort), die op dit moment nergens door code gebruikt wordt: puur een leeg fundament.

**Waar in de code zit dit?** `lib/search-console/`, `lib/search-demand/`, migraties `0103` tot en met `0106`.

---

## A. Mogelijke logicaproblemen

**A1. Twee "gepubliceerd"-registraties die niet hetzelfde doen (zeker, hoog).** Publiceren via de knop op het conceptscherm (`content_pieces`) controleert de url, verifieert of de pagina echt live staat en start automatisch de hermeting na twee en vier weken. Publiceren via de contentplanningskalender ("geplaatst" of "alles geplaatst", `planned_pages`) doet, voor zover in de code te vinden, geen van beide, ondanks dat de bevestigingstekst op het scherm belooft dat er vanaf nu gemeten gaat worden. Als de kalenderweg in de praktijk de gangbare route is, worden mogelijk pagina's nooit nagemeten zonder dat iemand dat merkt.

**A2. Twee gelijknamige "goedkeuren"-stappen op twee losse tabellen (waarschijnlijk, middel).** De contentplanningskalender heeft een eigen "goedkeuren"-stap (een maand vrijgeven om te laten schrijven), los van de "ik heb dit gecontroleerd"-goedkeuring op het conceptstuk zelf. Beide heten in de schermen vergelijkbaar, maar zijn niet aan elkaar gekoppeld. Niet gecontroleerd of de schermen dit altijd duidelijk uit elkaar houden voor de gebruiker.

**A3. Geen zichtbaar automatisch stopmoment voor maandelijkse hermeting (zeker dat de code geen bovengrens heeft, middel qua ernst).** Zolang tracking aanstaat, blijft een analyse voor onbepaalde tijd maandelijks doormeten; alleen het algemene dagbudget en het zelf uitzetten door de klant remmen dit af.

**A4. De publicatieherinnering staat los, buiten het automatische systeem (zeker, laag zolang e-mail uitstaat, middel als e-mail ooit aangaat).** Deze route is bewust uit het geplande-takenbestand gehaald zolang e-mail uitstaat, maar staat ook nergens anders automatisch ingepland; wie e-mail ooit aanzet, moet dit apart weer instellen.

**A5. Eén rekentaak lijkt de verkeerde instelling te gebruiken (waarschijnlijk, laag).** De herberekening van geschat zoekvolume voor een heel merkprofiel gebruikt dezelfde instelling (temperatuur en inspanning) als het schrijven van content, terwijl dit inhoudelijk meer op een analytische, voorspelbare taak lijkt. Niet vastgesteld of dit bewust zo gekozen is.

## B. Losse eindjes

**B1. Geen ingebouwd pad voor de allereerste klantgebruiker van een nieuw account (zeker, hoog).** Zodra een merk aan een klantaccount gekoppeld is (stap 5), bestaat er geen knop in de app die voor die eerste gebruiker een wachtwoord instelt of een welkomstmail verstuurt. Dat moet nu volledig buiten de app geregeld worden. Het uitnodigingsscherm (stap 6) is uitsluitend bedoeld voor extra teamleden van een account dat al een eerste gebruiker heeft.

**B2. Google Gemini als AI-model is volledig gebouwd maar nog nooit gebruikt (zeker, laag tot het ooit aangezet wordt).** Er is geen sleutel voor ingesteld, en de bijbehorende kostentarieven staan nog niet correct in de code. Wie dit ooit aanzet zonder eerst de tarieven bij te werken, krijgt een gok in plaats van de echte kostprijs.

**B3. Een lege databasetabel voor toekomstig zoekwoordbeheer (zeker, laag).** `profile_keywords` bestaat als structuur maar wordt nergens door code gelezen of geschreven.

**B4. Een los archief in de hoofdmap van het project (zeker, laag).** De map `content-reviews/` bevat een eenmalige export voor een externe beoordelingsronde en wordt door geen enkel deel van de app gebruikt.

**B5. Een hardgecodeerde grens van tweehonderd gebruikers bij twee belangrijke controles (zeker over het feit, middel over de ernst omdat het pas bij groei speelt).** Zowel het accepteren van een uitnodiging als het koppelen van een profiel aan een klant doorzoekt maximaal tweehonderd gebruikers in één keer. Bij meer dan tweehonderd gebruikers in totaal (staf, sales en klanten samen) kunnen bestaande gebruikers gemist worden, stil, zonder foutmelding.

## C. Plekken waar gegevens van de ene klant bij een andere terecht zouden kunnen komen

**C1. Een tabel met een volledige, ongefilterde momentopname van klantgegevens uit meerdere klanten heeft in de opgeslagen migratiegeschiedenis geen instructie die hem afschermt (zeker over het feit, twijfel over praktisch risico vandaag, hoog als de database ooit vanaf de migraties opnieuw wordt opgebouwd).** Deze tabel is op dit moment op de productieomgeving wel afgeschermd, maar dat lijkt buiten de normale migratieprocedure om ingesteld, in tegenstelling tot vergelijkbare gevoelige tabellen waar die afscherming wel netjes is vastgelegd. Aanbevolen om dit alsnog vast te leggen, of de tabel te verwijderen als hij niet meer nodig is.

**C2. Twee tabellen misten een beveiligingslaag die elders al is toegevoegd (zeker over het feit, laag praktisch risico vandaag omdat de app deze tabellen alleen via een beheerderstoegang benadert, middel op termijn).** Mocht hier ooit een scherm bijkomen dat deze tabellen rechtstreeks via de sessie van de gebruiker leest, dan zou een uitgenodigd teamlid mogelijk niets zien in plaats van zijn eigen gegevens (geen lek naar een andere klant, wel een gemiste laag).

**C3. Een uitnodigingslink is op zichzelf voldoende om iemand aan een account toe te voegen (zeker, middel).** Zie stap 6: er wordt niet gecontroleerd of degene die de link gebruikt het wachtwoord van een eventueel al bestaand account kent. Dit is veilig zolang de link alleen bij de juiste persoon terechtkomt, maar dat wordt niet technisch afgedwongen.

**C4. Geen ondeelbare koppeling tussen profiel en analyses bij het toewijzen aan een klant (waarschijnlijk zeer klein risico, laag).** Zie stap 5: bij een zeer onwaarschijnlijke onderbreking precies tussen de twee handelingen in, kan een merk op de klant staan terwijl de bijbehorende analyses nog aan de vorige eigenaar hangen.

## D. Plekken waar het proces kan vastlopen, eindeloos kan herhalen, of onverwacht veel kosten kan maken

**D1. Twee geplande achtergrondtaken (de continue verwerker en de dagelijkse contentplanner) zijn afhankelijk van twee sleutels die niet via een migratie zijn vastgelegd (twijfel of dit nu speelt, hoog als het wel zo is).** Ontbreken deze sleutels, dan doen deze taken helemaal niets, elke keer opnieuw, zonder enige foutmelding waar dan ook. Dit is met de beschikbare middelen niet vanuit de code te controleren; dit zou als eerste gecontroleerd moeten worden in de Supabase-omgeving zelf.

**D2. Geen ingebouwde bovengrens op het aantal maanden dat een analyse blijft doormeten (zeker, middel).** Zie A3 hierboven; dit is vooral een kostenkwestie op de lange termijn, niet een acuut risico.

**D3. Het dagbudget dat AI-kosten moet afremmen, faalt open bij een eigen storing (zeker, middel tot hoog).** Als de tellerfunctie zelf een storing heeft, wordt dat alleen gelogd; er is dan geen harde rem meer op de uitgaven, precies op het moment dat controle het hardst nodig is.

**D4. Mislukte achtergrondtaken en een zeldzame, dure dubbeltelling worden alleen in technische logs vastgelegd, niet actief gemeld (zeker, middel).** Bijvoorbeeld: een taak die niet op tijd als "klaar" gemarkeerd kan worden, kan later opnieuw worden opgepakt en dus dubbel worden uitgevoerd; de code herkent dit zelf als het duurste stille faalpad, maar de melding blijft een logregel, geen actief signaal aan een beheerder.

**D5. Een kleine testverzameling van vijftien voorbeelden bewaakt de belangrijkste AI-beoordeling van het hele product (zeker, laag tot middel).** De kwaliteitsdrempel hierop is een harde poort, maar met zo'n kleine verzameling heeft het percentage zelf een grote foutmarge.

## E. Vragen aan u

1. Zijn de twee technische sleutels die de continue achtergrondwerker en de dagelijkse contentplanning aan het draaien houden, op dit moment daadwerkelijk correct ingesteld in de productieomgeving? Dit is vanuit de code niet te controleren, en als ze ontbreken, merkt niemand dat automatisch.
2. Klopt het dat "een pagina in de contentplanningskalender als geplaatst markeren" ook de urlcontrole en de automatische hermeting zou moeten starten, zoals de tekst op het scherm belooft? Zo ja, dan lijkt dat op dit moment niet te gebeuren voor die route.
3. Is het bewust dat er geen enkele knop in de app is die voor de allereerste gebruiker van een nieuw klantaccount een wachtwoord instelt of een welkomstmail stuurt? Wilt u dat dit binnen de app geregeld wordt, of blijft dit bewust een handmatige stap voor u als beheerder?
4. Moet er een maximum komen op het aantal maanden of meetronden dat een analyse automatisch blijft doorlopen, of mag dit voor onbepaalde tijd doorgaan zolang een klant het niet zelf uitzet?
5. Mag de tabel met de eenmalige, volledige gegevensback-up van 29 juli 2026 verwijderd worden nu de bijbehorende opschoning achter de rug is, of moet hij bewaard blijven? Als hij moet blijven, wilt u dat de beveiliging ervan alsnog netjes wordt vastgelegd?
6. Bij welke klant mag de koppeling met Google Search Console en de koppeling met echt zoekvolume voor het eerst in de praktijk getest worden, en zijn de bijbehorende toegangssleutels daarvoor al aangevraagd?
7. Wilt u dat de publicatieherinnering per e-mail op een gegeven moment weer gaat werken (en zo ja, hoe vaak), of is die functie voorlopig bewust overbodig zolang e-mail nog uitstaat?
