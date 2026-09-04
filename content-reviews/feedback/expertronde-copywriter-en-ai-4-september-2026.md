# Feedback van de externe copywriter en de externe AI-expert, 4 september 2026

> **Dit is de ruwe feedback, letterlijk overgenomen en verder ongewijzigd.** Twee rondes: de tweede
> ronde is gevraagd nadat de eerste binnen was, met het verzoek doordachter en scherper te kijken.
> Beide experts hebben `docs/contentpijplijn-overdracht.md` gekregen, inclusief de tien vragen aan
> het eind.
>
> Wat de app hiermee doet staat in `docs/tasks/optimalisaties-expertronde-4-september-2026.md`.
> Elke vertaalslag daar is interpretatie; dit bestand is het origineel om naast te leggen.
>
> ⚠️ De stijlregels van `docs/schrijfstijl.md` gelden hier niet: een citaat wordt niet bijgewerkt.

---

## Toelichting van de product owner bij het aanleveren

Ik heb de feedback ontvangen van AI expery em copywriter. Hieronder staat de feedback dat we gaan verwerken. Jij moet hun feedback omzetten naar daadwerkelijke optimalisaties in de app. Er hebben twee feedback rondes plaatsgevonden waarbij in de tweede feedback ronde is gevraagd om nog wat doordachter en scherper te kijken.
Nu wil ik dat jij deze feedback verwerkt en een lijst opstelt met optmimalisaties.
Nummer deze optimalisaties en geef aan wat de effert en verwachte impactis.

Een ding wil ik hierbij expliciert benoemen is dat we niet gaan A/B testen of gaan testen wat de aanpassingen die hieruit komen daadwerkelijk resultaren. Dus niet met SOL en Terra testen. We zijn al over naar Terra en dat is definitief Daarnaaast wat ik dat de volgende stappen niet worden worden opgenomen in het optimalisatieplan voor de app:
Stap 5 - Sol vs Terra afzonderlijk meten
Stap 6 - Beoordelaars kalibreren
Stap 7 - Pas daarna beslissen of Sol überhaupt nog nodig is
Het testen of dit goed werkt nadat we optimalisaties hebben doorgevoerd in de pipeline doen we in een later stadium.

Jouw doel is om deze feedback om te zetten in een daadwerkelijke lijst met optimalisaties. P Maak een lange lijst en laat mij kiezen welke we daadwerkelijk gaan doorvoeren waarbij ik duidelijk inzie wat de verwachte impact is op verbetering en de effort. Waarbij effort uiteindelijk geen rol gaat spelen of we gaan kiezen om een optimalisatie door te voeren of niet.

Analyseer nu de feedback uitgebreid en maak een lijst met optimalisaties voor de pipeline. Neem de feedback serieus en schrijf ook optimalisaties die hier volledig op aansluiten maar wees zelf ook kritisch; zij kennen de codebase niet en jij wel.

---

# FEEDBACKRONDE 1

Mijn oordeel is behoorlijk positief, maar ik zou nog niet verder gaan met allerlei extra AI-stappen toevoegen. De documentatie laat namelijk iets interessants zien: ORBIT ENGINE heeft inmiddels een behoorlijk volwassen content-engine gebouwd, maar probeert op sommige plekken een probleem met méér instructies en controles op te lossen terwijl het echte probleem waarschijnlijk informatiehiërarchie en redactionele richting is.
En precies daar zit volgens mij de belangrijkste volgende stap.
________________________________________
1. Mijn oordeel in één zin
De architectuur is goed. De researchlaag is sterk. De feitelijkheid is uitzonderlijk goed afgedekt. De grootste zwakte zit nu niet in "kan AI goede tekst schrijven?", maar in "weet AI vooraf scherp genoeg wat deze specifieke pagina voor deze specifieke lezer moet bereiken?"
Dat zie je eigenlijk al terug in jullie eigen data.
De menselijke copywriter kwam vooral met:
•	ontbrekende lezer; 
•	onvoldoende eigen stem van de ondernemer; 
•	onvoldoende duidelijk waarom deze lezer voor dit bedrijf zou kiezen. 
Terwijl de pipeline inmiddels enorm veel aandacht besteedt aan:
•	feiten; 
•	claims; 
•	broncontrole; 
•	verboden woorden; 
•	sectiedekking; 
•	structuur; 
•	citeerbaarheid; 
•	mechanische stijlregels. 
Dat zijn allemaal nuttige dingen.
Maar ze zorgen vooral dat de AI niet fout gaat.
Ze zorgen nog onvoldoende dat de AI iets bijzonders maakt.
Dat onderscheid vind ik cruciaal.
________________________________________
2. Als copywriter: de volgorde klopt grotendeels
Ik vind de basisvolgorde goed:
marktmeting → aanbeveling → onderzoek → contentcontract → claim audit → klantvragen → schrijven → beoordelen → gericht repareren
Dat is veel beter dan:
"Hier is wat informatie over bedrijf X. Schrijf een goede SEO-pagina."
Jullie hebben feitelijk een redactieproces in software gegoten. Dat is een sterke keuze. De pipeline zorgt er bovendien bewust voor dat onderzoek en schrijven verschillende activiteiten zijn. 
Ook de feitenkaart vind ik erg sterk. Het onderscheid tussen bruikbare feiten, expliciet verboden informatie en achtergrondinformatie is precies het soort onderscheid dat je nodig hebt wanneer je AI voor klantcontent inzet. 
Voor commerciële AI-content is "niet verzinnen" namelijk niet genoeg.
Je moet de AI eigenlijk vertellen:
Dit weet je.
Dit weet je nadrukkelijk niet.
Dit mag je nooit zeggen.
En dit mag je wel gebruiken om de context te begrijpen, maar niet als feit.
Dat hebben jullie goed gedaan.
________________________________________
3. Maar hier zit de grote paradox van jullie systeem
Jullie hebben inmiddels 18 blokken in de schrijfopdracht.
Dat is mijn grootste zorg als copywriter.
Niet omdat 18 blokken per definitie te veel zijn. Een menselijke copywriter kan ook een uitgebreide briefing krijgen.
Het probleem is dat niet alle informatie dezelfde status heeft.
Kijk naar wat de schrijver allemaal krijgt:
•	bedrijf; 
•	branche; 
•	tone-of-voice; 
•	aanspreekvorm; 
•	diensten; 
•	verboden woorden; 
•	wetten; 
•	waardeproposities; 
•	bezwaren; 
•	klantinstructies; 
•	feitenkaart; 
•	klantantwoorden; 
•	bewijspunten; 
•	adviestoon; 
•	contract; 
•	algemene uitleg; 
•	paginaplan; 
•	onbeantwoorde vragen; 
•	stijlvoorbeelden; 
•	doelvragen; 
•	winnend antwoord. 
Dat is ontzettend veel.
En een goede menselijke copywriter doet vervolgens iets wat jullie systeem nog niet expliciet doet:
prioriteren.
Een menselijke copywriter denkt:
"Oké, ik weet nu 47 dingen over dit bedrijf. Maar voor déze pagina en déze lezer zijn er eigenlijk maar zes dingen die ertoe doen."
Dat is volgens mij de ontbrekende schakel.
________________________________________
4. Daarom zou ik mijn eerdere idee iets aanscherpen
Ik noemde eerder een Writer Brief.
Na het lezen van deze documentatie ben ik daar nog sterker van overtuigd, maar ik zou hem anders definiëren dan simpelweg:
"Maak een samenvatting van alle informatie."
Dat zou ik juist niet doen.
Een Writer Brief moet geen samenvatting worden.
Hij moet een redactionele beslissing zijn.
Dus:
Niet:
Hier zijn de belangrijkste feiten uit de research.
Maar:
Dit is de pagina die we gaan maken, voor deze persoon, met dit doel, en dit zijn de argumenten die we daarvoor moeten gebruiken.
Dat is een fundamenteel verschil.
________________________________________
5. Waar ik de Writer Brief zou plaatsen
Ik zou hem hier zetten:
Recommendation
↓
fact_atomise
↓
item_dossier
↓
content_contract
↓
claim_audit
↓
klantvragen
↓
🆕 WRITER BRIEF
↓
content_draft
↓
4 beoordelaars
↓
gerichte revisie
Dat betekent dus: vlak vóór het schrijven.
De Writer Brief krijgt alle belangrijke output van de voorbereiding en maakt daar één redactioneel plan van.
________________________________________
6. Wat moet die Writer Brief dan daadwerkelijk bevatten?
Ik zou hem relatief klein houden.
Bijvoorbeeld:
WRITER BRIEF
1. De lezer
Wie is deze persoon?
Niet:
"Mensen die dakisolatie zoeken."
Maar:
"Een huiseigenaar die merkt dat zijn woning in de winter moeilijk warm blijft en wil weten of isoleren zonder de bestaande dakbedekking te vervangen mogelijk is."
Dit is belangrijk omdat jullie eigen document laat zien dat bij 8 van de 12 pagina's überhaupt geen goede lezer was gedefinieerd. 
________________________________________
2. De hoofdvraag
Eén vraag.
Niet twintig.
Welke vraag moet deze pagina uiteindelijk beantwoorden?
________________________________________
3. Het gewenste antwoord
Dit vind ik misschien wel het belangrijkste onderdeel.
De Writer Brief zou moeten zeggen:
Als de lezer maar één alinea leest, wat moet hij dan begrijpen?
Jullie content_contract doet hier al iets mee met de opening en de doelvraag. 
Maar ik zou het explicieter maken als redactionele kernboodschap.
________________________________________
4. Waarom deze pagina bestaat
Bijvoorbeeld:
Deze pagina bestaat omdat AI-assistenten bij de vraag X momenteel concurrent Y noemen en deze klant niet.
Dat koppelt de content terug aan GEO.
________________________________________
5. Waarom zou deze lezer dit bedrijf kiezen?
Dit is volgens mij de belangrijkste ontbrekende stap in jullie hele pipeline.
De externe copywriter heeft dit zelf als openstaand probleem benoemd. De huidige pipeline vraagt nog nergens expliciet:
Waarom zou deze specifieke lezer voor dit specifieke bedrijf kiezen?
Ik zou hier geen generieke USP-generator van maken.
De AI moet zoeken naar:
Welke 1–3 concrete eigenschappen van dit bedrijf zijn relevant voor déze lezer en déze vraag?
Bijvoorbeeld:
De lezer heeft haast → 24-uurs spoedservice is relevant.
Niet:
Het bedrijf heeft vier dakdekkers → interessant feitje.
Dat is het verschil tussen feit en copy.
________________________________________
6. De 3–5 bewijspunten
Dit hebben jullie al heel goed bedacht.
De feitenkaart → bewijspunt → betekenis voor de lezer.
Dat vind ik één van de beste onderdelen van de huidige pipeline. 
Ik zou deze dus absoluut behouden.
________________________________________
7. Wat moet de ondernemer zelf zeggen?
Hier zou ik de klantcitaten expliciet prioriteren.
Jullie hebben al ontdekt dat de reden achter een klantantwoord vaak waardevoller is dan het kale feit. 
De Writer Brief zou dus kunnen zeggen:
Gebruik dit ondernemerscitaat omdat het iets laat zien over de manier waarop dit bedrijf werkt.
Dat is veel krachtiger dan:
Hier zijn 14 klantantwoorden.
________________________________________
8. Wat mag absoluut niet gebeuren?
Een korte lijst.
Bijvoorbeeld:
•	geen prijs verzinnen; 
•	niet verwijzen naar contact voor een antwoord dat bekend had moeten zijn; 
•	geen vergelijkingsadvies; 
•	geen concurrenten; 
•	geen algemene consumentengids; 
•	geen derde-persoons productbeschrijving. 
Veel daarvan staat al in jullie prompts, maar de Writer Brief kan de relevante beperkingen voor deze pagina naar voren halen.
________________________________________
9. De redactionele invalshoek
Dit ontbreekt nu volgens mij nog het meest.
Bijvoorbeeld:
Invalshoek: help iemand die nú met een lekkage zit begrijpen wat er vandaag gebeurt, in plaats van algemene informatie over daklekkages te geven.
Of:
Invalshoek: laat zien dat deze aanbieder voorspelbaarheid biedt bij een investering waar klanten vooral bang zijn voor onverwachte kosten.
Dit is waar een goede copywriter zijn vakmanschap inzet.
________________________________________
7. En dan krijgt Terra/Sol dus niet "minder informatie"
Dit is belangrijk, want we hadden het hier eerder over.
Ik zou het inmiddels anders formuleren:
De schrijver krijgt niet noodzakelijk minder informatie. De schrijver krijgt beter geprioriteerde informatie.
Dat is veel belangrijker.
Je kunt bijvoorbeeld nog steeds de volledige feitenkaart beschikbaar houden.
Maar de Writer Brief vertelt:
Gebruik voor deze pagina vooral F3, F7 en F12.
Daardoor krijgt het model een hiërarchie.
Dat voorkomt dat het model alle beschikbare informatie probeert te gebruiken.
En dat is precies wat een menselijke copywriter doet.
________________________________________
8. Wat ik NIET zou doen
Ik zou nu niet nog tien nieuwe AI-agents toevoegen.
Jullie hebben al:
•	research; 
•	dossier; 
•	contract; 
•	audit; 
•	feitenkaart; 
•	vragenlijst; 
•	schrijfmodel; 
•	vier beoordelaars; 
•	codecontroles; 
•	revisiemodel. 
Dat is behoorlijk uitgebreid.
De oplossing voor slechte content is niet automatisch:
"Nog een AI-call."
Sterker nog: jullie eigen bevindingen wijzen erop dat de menselijke kritiek vooral op opdracht en positionering zat, niet op het redeneervermogen van het model. 
Daarom vind ik de overstap naar Terra tijdens development ook logisch.
________________________________________
9. Terra versus Sol: na deze documentatie ben ik nóg comfortabeler met Terra
Dit vind ik een belangrijke conclusie.
Jullie hebben 12 pagina's laten beoordelen door een echte copywriter.
Zijn kritiek was volgens de documentatie niet:
"Het model kan niet goed redeneren."
Maar vooral:
•	geen duidelijke lezer; 
•	onvoldoende eigen stem; 
•	onvoldoende onderscheid; 
•	onvoldoende overtuiging. 
En dat zijn problemen die je niet noodzakelijk oplost met een duurder redeneermodel.
Daarom zou ik voor development inderdaad:
Terra → standaard
en
Sol → kwaliteitsbenchmark
maken.
Dus bijvoorbeeld:
90% van je iteraties met Terra.
En wanneer je denkt:
"Dit is nu mijn nieuwe versie."
dan een kleine benchmark:
dezelfde input → Sol → vergelijken.
Dat is veel slimmer dan tijdens iedere ontwikkeliteratie Sol verbranden.
De huidige meting laat immers zien dat de overstap van Sol naar Terra het totaal van die twaalf pagina's van $7,43 naar $3,69 brengt. 
________________________________________
10. Maar ik zou één ding absoluut veranderen aan jullie modelkeuze-test
De huidige overstap is methodologisch een beetje lastig.
Jullie document zegt dat zelf terecht:
de modelwissel is niet los te toetsen.
Dat klopt. 
Want je hebt tegelijkertijd:
oude pipeline + Sol
tegen
verbeterde pipeline + Terra
getest.
Als het resultaat beter wordt, weet je niet waarom.
Dus ik zou uiteindelijk vier condities willen:
	Sol	Terra
oude briefing	A	B
nieuwe briefing	C	D
Dan kun je werkelijk zien:
A → B = effect van model
A → C = effect van Writer Brief
C → D = effect van model binnen verbeterde pipeline
Dat zou voor mij de ideale test zijn.
________________________________________
11. De beoordelaars: hier zit nog een veel groter vraagstuk
Dit vind ik eerlijk gezegd belangrijker dan Sol versus Terra.
Jullie zeggen:
niveau klopt, rangorde klopt niet.
Dat is een heel belangrijke observatie.
De vakmanschapsbeoordelaar zat gemiddeld maar 0,14 punt van het menselijke oordeel af, maar had slechts een rangcorrelatie van +0,29. 
Dat betekent voor mij:
de beoordelaar begrijpt redelijk goed wat "een goede pagina" is, maar kan nog onvoldoende betrouwbaar bepalen welke van twee pagina's beter is.
En dat is juist wat jullie systeem nodig heeft.
Want de revisie-engine moet weten:
Welke pagina verdient mijn dure reparatie?
Niet alleen:
Is deze pagina op zichzelf redelijk?
________________________________________
12. Daarom zou ik de beoordelaar niet primair "beter laten scoren"
Ik zou hem meer vergelijkend laten werken.
Dus in plaats van alleen:
Geef deze pagina een score van 0–100.
ook:
Hier zijn pagina A en pagina B. Welke zou een goede copywriter eerder naar de klant sturen?
En vervolgens:
Waarom?
Dat is vaak een betrouwbaarder beoordelingsprobleem dan een absoluut cijfer.
Je hebt dan een soort pairwise ranking.
Voor jullie use case is dat enorm interessant, omdat jullie uiteindelijk een beslissing willen nemen:
Welke versie is beter?
of:
Welke pagina moet eerst gerepareerd worden?
Dat sluit veel beter aan op het daadwerkelijke doel van de beoordelaar.
________________________________________
13. De vier beoordelaars vind ik overigens een goede keuze
Die zou ik niet weghalen.
De scheiding tussen:
•	redactie; 
•	factuality; 
•	citability; 
•	craft 
vind ik verstandig. 
Vooral omdat jullie al hebben gezien dat één beoordelaar zichzelf te makkelijk een 100 gaf terwijl hij in dezelfde beoordeling aangaf dat de hoofdvraag niet goed werd beantwoord. 
Dat is een sterk argument voor onafhankelijke beoordelaars.
________________________________________
14. Eén ding zou ik wel aanpassen: de "menselijke ijkpunten"
Ik vind het goed dat jullie die hebben toegevoegd.
Maar ik zou oppassen dat dit uiteindelijk verandert in:
"Dit is wat een goede tekst is."
Want dan gaat het model de voorbeelden imiteren.
Ik zou de menselijke feedback gebruiken als rubric, niet als stijltemplate.
Dus bijvoorbeeld:
Menselijke beoordeling zegt:
Een goede pagina geeft de lezer een concrete keuze en benoemt een herkenbare twijfel.
Dat is goed.
Maar:
Deze specifieke zin scoorde hoog.
is minder interessant.
Je wilt het beoordelingsvermogen trainen, niet het model leren om een paar voorbeeldzinnen na te doen.
________________________________________
15. De revisiestap vind ik juist heel goed
Dit vind ik een duidelijke verbetering.
De oude methode:
hele pagina opnieuw schrijven
is gevaarlijk.
De nieuwe methode:
alleen getroffen secties krijgen + bevinding + toegestaan bewijs → secties terugplaatsen
is veel beter. 
Dat is zowel goedkoper als kwalitatief veiliger.
En de regel:
raak niets aan wat niet in een bevinding genoemd wordt
vind ik uitstekend.
Dat zou ik absoluut behouden.
________________________________________
16. Eén probleem dat ik nog wel zie: jullie revisie kan verkeerde problemen repareren
Dit hangt direct samen met de slechte rangorde.
Stel:
Pagina A
•	kwaliteit 72 
•	goede positionering 
•	één feitelijke fout 
Pagina B
•	kwaliteit 78 
•	feitelijk correct 
•	generieke commerciële tekst 
•	weinig onderscheid 
Dan kan het systeem makkelijk besluiten:
A heeft een probleem → A repareren.
Terwijl een menselijke copywriter misschien zegt:
B is veel slechter als commerciële pagina.
Daarom zou ik de "kwaliteitsscore" niet als primaire waarheid gebruiken voor reparatieprioriteit.
Ik zou een onderscheid maken tussen:
Blokkade
Kan niet gepubliceerd worden.
Correctie
Moet gerepareerd worden.
Verbeterkans
Kan beter, maar hoeft niet.
En vervolgens:
reparatie alleen bij echte problemen, niet bij elk lage subscore.
Jullie zitten daar al gedeeltelijk op met de blokkades. 
________________________________________
17. Wat ik als copywriter nog mis: één commerciële gedachte
Dit is uiteindelijk mijn belangrijkste inhoudelijke kritiek.
Jullie vragen nu heel goed:
Wat wil de lezer weten?
Maar nog onvoldoende:
Wat moet de lezer na het lezen anders begrijpen dan vóór het lezen?
Dat is iets anders.
Een pagina kan alle vragen beantwoorden en tóch middelmatige copy zijn.
Bijvoorbeeld:
Wat kost het?
Hoe werkt het?
Hoe lang duurt het?
Welke materialen gebruiken jullie?
Allemaal beantwoord.
Score technisch misschien 90.
Maar de lezer denkt nog steeds:
"Oké. Maar waarom zou ik dit bedrijf bellen?"
Dat is precies waar de menselijke copywriter volgens jullie document op uitkomt: de teksten weten wat het bedrijf doet en wat de lezer wil weten, maar laten nog onvoldoende zien waarom die lezer juist dit bedrijf zou kiezen. 
Dat zou ik daarom tot een expliciet onderdeel van het contentproces maken.
________________________________________
18. Mijn ideale versie van jullie pipeline
Als ik hem als copywriter én AI-expert opnieuw zou tekenen, zou ik hem ongeveer zo zien:
GEO-METING
   ↓
CONTENT OPPORTUNITY
   ↓
PAGINA-ONDERZOEK
   ↓
FEITENKAART
   ↓
CONTENT CONTRACT
   ↓
CLAIM AUDIT
   ↓
KLANTVRAGEN
   ↓
────────────────────────────
       WRITER BRIEF
────────────────────────────
   ↓
"Voor wie?"
"Welke vraag?"
"Wat moet hij begrijpen?"
"Welke feiten zijn relevant?"
"Welke bewijspunten?"
"Welke eigen woorden?"
"Waarom dit bedrijf?"
"Welke invalshoek?"
"Wat absoluut niet?"
   ↓
CONTENT DRAFT
   ↓
4 ONAFHANKELIJKE BEOORDELINGEN
   ↓
CODE CONTROLES
   ↓
BESLISSING
   ↓
gerichte revisie
   ↓
OPNIEUW BEOORDELEN
En vervolgens:
PUBLICEREN → meten → terug de cyclus in.
________________________________________
19. Wat ik nu concreet zou doen
Ik zou niet meteen allerlei onderdelen gaan herschrijven.
Mijn prioriteit zou zijn:
Stap 1 - Terra blijven gebruiken tijdens development
Prima keuze.
Stap 2 - Writer Brief ontwerpen
Maar alleen als Claude Code na analyse bevestigt dat de huidige input daadwerkelijk onvoldoende geprioriteerd is.
Mijn verwachting: ja.
Stap 3 - "Waarom dit bedrijf?" expliciet toevoegen
Dit zou ik zelfs belangrijker vinden dan nóg meer SEO/GEO-regels.
Stap 4 - Eén nieuwe ronde van dezelfde 12 pagina's
Niet alleen technisch meten.
Maar opnieuw door dezelfde menselijke copywriter laten beoordelen.
Stap 5 - Sol vs Terra afzonderlijk meten
Niet tegelijk met een compleet veranderde pipeline.
Stap 6 - Beoordelaars kalibreren
Die 20 menselijke beoordelingen waar jullie document naar verwijst, vind ik hiervoor zeer waardevol. 
Stap 7 - Pas daarna beslissen of Sol überhaupt nog nodig is
Mijn voorlopige verwachting is namelijk:
Terra + betere briefing + goede controles + goede beoordelaars kan heel dicht bij Sol komen.
En als dat lukt, heb je niet alleen een goedkopere pipeline, maar ook een veel beter schaalbare SaaS-economie.
________________________________________
20. Mijn eindbeoordeling
Als ik dit als externe copywriter zou krijgen, zou mijn oordeel ongeveer zijn:
Onderdeel	Mijn oordeel
Research	🟢 Sterk
Feitenbeheer	🟢 Zeer sterk
Anti-hallucinatie	🟢 Zeer sterk
Contentstructuur	🟢 Sterk
Klantinformatie	🟢 Sterk
GEO-focus	🟢 Sterk
Redactionele beoordeling	🟢 Goede basis
Revisiesysteem	🟢 Sterk
Kostenarchitectuur	🟢 Goed
Modelkeuze Terra	🟢 Kansrijk
Lezergerichtheid	🟡 Nog verbeteren
Positionering	🟡 Nog verbeteren
Onderscheidend vermogen	🟡 Nog verbeteren
"Waarom dit bedrijf?"	🔴 Ontbrekende expliciete stap
Beoordelaars-rangorde	🔴 Nog onvoldoende betrouwbaar
Writer Brief	🔴 Waarschijnlijk waardevolle ontbrekende laag
Mijn belangrijkste conclusie:
Ik zou je pipeline niet opnieuw ontwerpen.
Hij is daarvoor al te goed en te doordacht.
Ik zou hem juist redactioneel aanscherpen op één niveau hoger:
Jullie hebben inmiddels heel goed geregeld wat AI wel en niet mag schrijven.
De volgende stap is zorgen dat AI nog beter weet wat het móét proberen te zeggen.
En daar zijn volgens mij de Writer Brief + "waarom dit bedrijf voor deze lezer?" + betere ranking van de beoordelaars de drie belangrijkste verbeteringen.
Dat is ook precies waarom ik op basis van deze documentatie niet zou zeggen: gooi Sol terug in de pipeline omdat Terra misschien iets minder slim is. Ik zou eerst bewijzen of de tekortkomingen daadwerkelijk modelproblemen zijn. Op basis van de twaalf menselijke beoordelingen lijkt daar op dit moment juist weinig bewijs voor te zijn. 
Dus mijn advies zou zijn: ontwikkel verder met Terra, voeg de Writer Brief gecontroleerd toe, maak "waarom dit bedrijf?" expliciet, en gebruik Sol voorlopig als benchmark in plaats van als standaard schrijfmodel.
 
# FEEDBACK RONDE 2

Ik heb het document opnieuw als zelfstandige review bekeken, dit keer met extra nadruk op de vraag: waar zit nu werkelijk het belangrijkste probleem in de pijplijn, welke conclusies zijn al hard onderbouwd, en welke verbeteringen dreigen vooral complexiteit toe te voegen zonder aantoonbare kwaliteitswinst?
Mijn oordeel is scherper dan alleen "de architectuur is goed": jullie hebben inmiddels een opvallend volwassen controlesysteem gebouwd, maar de pijplijn is nog steeds sterker in het voorkomen van slechte content dan in het veroorzaken van uitstekende content. Dat verschil is volgens mij precies waar jullie volgende stap moet zitten. 
Mijn hoofdconclusie
Ik zou de huidige pijplijn niet fundamenteel omgooien.
De volgorde:
onderzoek → feiten → dossier → contract → ontbrekende informatie → schrijven → onafhankelijk beoordelen → gerichte reparatie
is inhoudelijk logisch. Een menselijke copywriter doet in wezen ook precies dit: eerst begrijpen, dan keuzes maken, dan schrijven, dan redigeren.
Wat ik wél zou veranderen, is wat er tussen "we weten alles" en "schrijf de pagina" gebeurt.
Daar zit nu een gat.
Jullie verzamelen namelijk enorm veel goede informatie:
•	wie de lezer is; 
•	welke vragen hij heeft; 
•	welke feiten beschikbaar zijn; 
•	welke feiten ontbreken; 
•	welke klantantwoorden er zijn; 
•	welke bewijsstukken er zijn; 
•	welke bezwaren bestaan; 
•	wat de inhoudsstructuur moet zijn; 
•	wat de tone of voice is; 
•	wat algemene uitleg is; 
•	wat verboden is. 
Maar vervolgens krijgt de schrijver een gigantische hoeveelheid informatie en regels tegelijk. Er is geen duidelijke tussenlaag die zegt:
"Dit is wat deze specifieke pagina uiteindelijk moet betekenen voor deze specifieke persoon."
En precies daar zie ik de grootste overeenkomst met de feedback van de menselijke copywriter: het probleem was niet primair dat de teksten verkeerde informatie bevatten. Het probleem was dat ze onvoldoende duidelijk maakten voor wie de pagina er is, wat die persoon nodig heeft en waarom juist deze ondernemer relevant is. 
________________________________________
1. De belangrijkste ontdekking: jullie systeem heeft inmiddels heel veel "negatieve intelligence"
Daar bedoel ik mee:
Het systeem weet steeds beter wat het níét mag doen.
Dat is indrukwekkend goed uitgewerkt.
Je hebt bijvoorbeeld:
•	verboden feiten; 
•	ontbrekende feiten; 
•	bronvereisten; 
•	geen concurrenten; 
•	geen verzinsels; 
•	geen gemengde aanspreekvorm; 
•	geen vergelijking; 
•	geen huiswerk voor de lezer; 
•	geen verkeerde onderwerpen; 
•	geen klantinstructie als feit; 
•	geen ongecontroleerde algemene uitleg; 
•	geen sectie overslaan; 
•	maximaal drie reparaties; 
•	alleen getroffen secties opnieuw schrijven. 
Dat is allemaal verstandig.
Maar dit levert vooral constraint intelligence op.
Wat nog relatief zwak is ontwikkeld, is:
editorial intelligence
Dus niet:
"Wat mag ik niet schrijven?"
maar:
"Wat is in deze pagina de ene reden waarom deze lezer verder moet lezen?"
Dat zie je heel duidelijk terug in de cijfers. Jullie hebben 19+ controles, maar de menselijke kritiek zat juist op relatief zachte zaken als lezer, eigen stem, differentiatie en overtuiging. 
Dat is een belangrijke aanwijzing.
Daarom zou ik géén twintig extra controles toevoegen
Dat zou de verkeerde reactie zijn.
Jullie hebben het mechanische gedeelte al behoorlijk volwassen gemaakt.
De volgende verbetering moet juist een beslislaag zijn.
________________________________________
2. De Writer Brief is daarom inderdaad interessant
Na deze nieuwe lezing ben ik er eigenlijk sterker van overtuigd dat een Writer Brief zinvol kan zijn.
Maar alleen onder één voorwaarde:
De Writer Brief mag geen samenvatting worden.
Dat zou juist nóg een blok informatie opleveren.
Hij moet iets anders doen:
alle informatie die jullie hebben verzamelen en omzetten naar redactionele prioriteiten.
Dus niet:
"Hier zijn alle feiten, vragen, bezwaren en klantantwoorden."
Maar:
"Voor deze pagina is dit de lezer.
Dit is zijn belangrijkste probleem.
Dit is het antwoord dat hij moet krijgen.
Dit zijn de drie dingen die hem moeten overtuigen.
Dit is wat alleen deze ondernemer kan zeggen.
Dit is de ene gedachte die na het lezen moet blijven hangen."
Dat is iets totaal anders.
________________________________________
3. Waar ik hem zou plaatsen
Heel specifiek:
ná alle inhoudelijke voorbereiding en direct vóór content_draft.
Dus ongeveer:
Recommendation
↓
fact_atomise
↓
item_dossier
↓
content_contract
↓
claim_audit
↓
vragen aan ondernemer
↓
source_analysis
↓
Writer Brief
↓
content_draft
↓
4 judges
↓
content_revise
Dat voelt voor mij architectonisch veel logischer dan hem eerder in het proces zetten.
Waarom?
Omdat de Writer Brief dan alle relevante informatie mag gebruiken en er een eindredactionele beslissing van maakt.
Je wilt namelijk niet nóg een AI die onderzoek doet.
Je wilt een AI die zegt:
"Ik heb alles gelezen. Dit is waar deze pagina uiteindelijk om draait."
________________________________________
4. En ik zou één onderdeel daar expliciet aan toevoegen
Jullie hebben zelf al gevonden:
"Er is nog geen enkele stap in de pijplijn die expliciet vraagt waarom deze lezer dit bedrijf zou moeten kiezen." 
Ik denk dat dit inmiddels méér is dan een ontbrekend veld.
Ik zou het zien als een centrale redactionele vraag.
Dus niet:
"Wat zijn de waardeproposities?"
Dat is te algemeen.
Maar:
"Gezien deze specifieke lezer, dit specifieke probleem en deze specifieke doelvraag: wat heeft deze ondernemer waardoor deze lezer juist hém zou moeten vertrouwen of kiezen?"
Dat antwoord kan heel klein zijn.
Bijvoorbeeld:
•	vaste eigen ploeg; 
•	gratis inspectie; 
•	binnen 24 uur ter plaatse; 
•	een bepaalde werkwijze; 
•	een bijzonder specialisme; 
•	een principiële keuze van de ondernemer; 
•	een reden waarom ze iets bewust níét doen. 
Maar het cruciale is:
de relevantie moet vanuit de lezer worden bepaald.
Een bedrijf kan twintig sterke eigenschappen hebben. Voor deze pagina kunnen er maar drie relevant zijn.
Dat is precies waar een menselijke copywriter waarde toevoegt.
________________________________________
5. Hier zit volgens mij ook een fout in jullie huidige model
Jullie hebben al proofPoints.
Dat is goed.
Maar ik denk dat:
proof point ≠ differentiatie
Een bewijsstuk zegt:
"Dit is aantoonbaar waar."
Maar een sterke copywriter vraagt:
"Waarom zou deze persoon hier iets om geven?"
Jullie huidige voorbeeld maakt dat al zichtbaar:
"vier eigen dakdekkers"
→ "u weet wie er op uw dak komt"
Dat is een vertaalslag van feit naar betekenis. 
Maar er is nog een stap:
"Waarom is weten wie er op uw dak komt relevant voor déze lezer?"
Dat is waar de Writer Brief waarde kan toevoegen.
Dus idealiter:
feit → betekenis → relevantie voor deze lezer
Niet alleen:
feit → betekenis
________________________________________
6. De 18 promptblokken zijn naar mijn mening inmiddels het grootste risico
Hier ben ik wat kritischer dan in mijn eerdere beoordeling.
Niet omdat de informatie verkeerd is.
Bijna alle blokken hebben een legitieme functie. 
Het probleem is cognitief:
Een schrijver krijgt:
1.	bedrijfscontext 
2.	branche 
3.	tone of voice 
4.	aanspreekvorm 
5.	diensten 
6.	verboden woorden 
7.	regels 
8.	waardeproposities 
9.	bezwaren 
10.	feitenkaart 
11.	klantantwoorden 
12.	bewijspunten 
13.	adviestoon 
14.	contract 
15.	algemene uitleg 
16.	paginaplan 
17.	openstaande vragen 
18.	stijlvoorbeelden 
En daarbovenop nog een systeemprompt van ongeveer 700 woorden met elf regels. 
Technisch gezien is dit allemaal coherent.
Maar redactioneel is het riskant.
Een menselijke copywriter kijkt niet naar twintig gelijkwaardige bakken informatie.
Die maakt automatisch een hiërarchie:
Dit is het verhaal.
Dit zijn de drie belangrijkste argumenten.
Dit moet absoluut in de tekst.
Dit mag niet.
De rest is ondersteunend.
Jullie systeem heeft enorm veel informatie, maar die hiërarchie zit nu nog onvoldoende expliciet in het proces.
Dat is volgens mij de kern van het hele probleem.
________________________________________
7. Ik zou daarom juist NIET de feitenkaart kleiner maken
Dat lijkt op het eerste gezicht aantrekkelijk.
"Geef de schrijver minder informatie."
Daar ben ik niet voor.
De feitenkaart is juist een van jullie sterkste architectonische beslissingen. De hele constructie rond F-nummers en letterlijke dekking maakt hallucinaties controleerbaar. 
De oplossing is dus niet:
minder informatie.
Maar:
informatie + prioriteit.
De schrijver mag alles weten.
Maar moet expliciet weten:
wat is voor deze pagina belangrijk?
Dat is een heel ander ontwerpprincipe.
________________________________________
8. De modelwissel naar Terra vind ik verdedigbaar, maar nog niet bewezen
Hier zou ik voorzichtig zijn.
Jullie redenering is:
de menselijke copywriter zag geen enkel probleem dat duidelijk door een groter model zou worden opgelost; de problemen zaten in de opdracht. Daarom is het goedkopere model waarschijnlijk voldoende. 
Dat is een redelijke hypothese.
Maar het is nog geen bewijs.
Want er zijn eigenlijk twee veranderingen:
A. de prompt/pijplijn is verbeterd
B. het model is goedkoper geworden
En jullie nieuwe meting verandert beide tegelijk. Dat staat zelf correct als openstaand probleem beschreven. 
Daarom zou ik de modelkeuze voorlopig zo behandelen:
Terra = development model
Prima.
Sol = benchmark model
Ook prima.
Maar trek nog geen conclusie:
"Terra is net zo goed als Sol."
Die conclusie kan pas na gecontroleerde vergelijking.
________________________________________
9. Jullie 2×2-test zou ik echt doen
Dit vind ik één van de waardevolste experimenten die uit het document volgt.
Neem dezelfde onderwerpen en test:
	Oude briefing	Nieuwe briefing
Terra	A	B
Sol	C	D
Dan kun je eindelijk uit elkaar trekken:
•	effect van model; 
•	effect van nieuwe briefing; 
•	interactie tussen model en briefing. 
Want het kan bijvoorbeeld gebeuren dat:
Terra + nieuwe briefing ≈ Sol + oude briefing
Dan heb je iets heel interessants ontdekt.
Dan blijkt dat een goedkopere modeltier met betere instructie ongeveer dezelfde kwaliteit kan leveren als een duurder model met slechtere briefing.
Dat zou voor ORBIT ENGINE commercieel en technisch een heel belangrijke uitkomst zijn.
________________________________________
10. De judge is een veel groter probleem dan het gemiddelde suggereert
Dit vond ik misschien wel het interessantste onderdeel van het document.
Jullie schrijven:
gemiddeld slechts 0,14 punt verschil met de menselijke beoordeling.
Dat klinkt uitstekend.
Maar:
rangcorrelatie slechts +0,29. 
Voor jullie toepassing is juist die tweede maat veel belangrijker.
Waarom?
Omdat de judge niet alleen moet zeggen:
"Deze pagina is ongeveer 70."
Hij moet uiteindelijk bepalen:
"Welke pagina moet ik eerst repareren?"
En dáár gaat het mis.
Dus ik zou de judge niet primair proberen beter te maken in absolute scoring.
Ik zou hem beter maken in ranking.
________________________________________
11. Ik zou daarom pairwise judging serieus testen
In plaats van:
Geef pagina A een 0-100-score.
ook testen:
Welke van deze twee pagina's zou een goede copywriter eerder naar de klant sturen?
A of B.
En:
Waarom?
Dat soort relatieve vragen is voor taalmodellen vaak veel natuurlijker dan een absolute score op een abstracte schaal.
Voor jullie use case is dat bovendien rechtstreeks relevant.
Je hoeft uiteindelijk niet eens precies te weten of pagina A een 74 of 78 is.
Je wilt weten:
Welke van deze twee is beter?
Daarna kun je daar een ranking uit bouwen.
Ik zou dus experimenteren met:
absolute score + pairwise ranking
en vervolgens kijken welke beter overeenkomt met de menselijke copywriter.
________________________________________
12. Nog belangrijker: train de judge niet op de antwoorden van één copywriter
Hier moet je oppassen.
De menselijke ijkpunten zijn waardevol. Maar als je de judge steeds meer vertelt:
"de menselijke copywriter vond X goed"
kan hij langzaam leren om deze ene beoordelaar na te bootsen, in plaats van algemene copykwaliteit te beoordelen.
Jullie huidige ijkpunten vind ik daarom goed als principes.
Bijvoorbeeld:
Een gratis aanbod dat als een risico klinkt, is slecht geschreven.
Dat is een principe.
Maar:
"Pagina X kreeg 2,6"
is veel gevaarlijker als trainingssignaal.
Het kalibratielab met echte menselijke beoordelingen is daarom een veel interessantere lange-termijninvestering. Jullie hebben zelf al vastgesteld dat daarvoor ongeveer twintig menselijke beoordelingen nodig zijn. 
________________________________________
13. Ik ben ook kritisch op één van jullie huidige schrijfregels
Deze:
"In de eerste alinea en in de eerste zin van elke sectie noem je het bedrijf expliciet bij naam." 
Ik snap waarom jullie hem hebben gemaakt.
GEO-technisch is de gedachte logisch.
Maar redactioneel is dit potentieel gevaarlijk.
Je kunt namelijk een tekst krijgen die formeel perfect aan de regel voldoet maar onnatuurlijk wordt:
"MJB Dakservice helpt u bij..."
"MJB Dakservice werkt met..."
"MJB Dakservice voert..."
"MJB Dakservice controleert..."
sectie na sectie.
En daarmee krijg je precies het probleem dat jullie eerder hadden:
het merk wordt semantisch zeer zichtbaar, maar de ondernemer verdwijnt als stem.
Jullie hebben dat deels opgelost met de regel over de wij-vorm. Maar ik zou deze regel eigenlijk niet als pure schrijfregel blijven behandelen.
Ik zou hem herformuleren als:
Zorg dat het bedrijfsentiteit en het antwoord in de belangrijkste citeerbare passages ondubbelzinnig gekoppeld zijn.
Dat geeft de schrijver meer natuurlijke vrijheid.
En laat de GEO-controle vervolgens bepalen of die koppeling daadwerkelijk voldoende aanwezig is.
Dat is weer jullie eigen principe:
prompt = intentie, code = garantie. 
________________________________________
14. Er zit nog een tweede spanning in jullie systeem
Jullie willen tegelijk:
A. maximale GEO-citeerbaarheid
en
B. natuurlijke ondernemerscopy.
Dat zijn niet altijd dezelfde dingen.
Jullie schrijven bijvoorbeeld dat iedere sectie minimaal één losstaande citeerbare zin moet hebben. 
Dat is slim voor GEO.
Maar zodra je daar te hard op optimaliseert, krijg je mogelijk een tekst die uit allemaal "AI-ready answer units" bestaat.
Dan krijg je:
vraag → antwoord
vraag → antwoord
vraag → antwoord
En jullie eigen cijfers laten al zien dat 169 van 228 koppen vragen waren. 
De oplossing is volgens mij niet minder GEO.
De oplossing is:
GEO als eigenschap van goede content, niet als zichtbare vorm van de content.
Een goede copywriter kan een pagina schrijven die uitstekend citeerbaar is zonder dat hij voortdurend schrijft alsof hij voor een chatbot schrijft.
Dat onderscheid zou ik in jullie kwaliteitsmodel explicieter maken.
________________________________________
15. Jullie content_contract is sterk, maar er zit een risico in
Ik vind het principe:
"plan de pagina die de vraag écht beantwoordt, niet de pagina die je toevallig kunt onderbouwen"
erg goed. 
Dat voorkomt dat de dataset bepaalt wat er geschreven wordt.
Maar daardoor ontstaat een tweede risico:
De contractlaag kan een pagina structureel compleet maken zonder dat hij redactioneel sterk wordt.
Bijvoorbeeld:
25 secties
→ iedere sectie aanwezig
→ alle deelvragen beantwoord
→ alle feiten onderbouwd
en toch:
saai, voorspelbaar, weinig onderscheidend.
Dat is precies waarom ik de Writer Brief niet als technische toevoeging zie, maar als ontbrekende redactionele tussenlaag.
________________________________________
16. Ik zou de Writer Brief daarom extreem compact houden
Ik zou hem ongeveer dit laten beantwoorden:
Writer Brief
1. Voor wie schrijf je?
Eén concrete persoon/situatie.
2. Wat wil deze persoon nu weten of beslissen?
Eén hoofdvraag.
3. Wat moet hij na het lezen begrijpen?
Eén kernantwoord.
4. Waarom is deze pagina voor hem relevant?
Eén zin.
5. Welke 3–5 dingen van deze ondernemer zijn voor hém het meest relevant?
Bewijs + betekenis.
6. Wat kan deze ondernemer zeggen wat een concurrent niet zomaar kan kopiëren?
Eigen woorden, motivatie, werkwijze, overtuiging.
7. Wat moet absoluut in de pagina?
Prioriteiten.
8. Wat moet de schrijver juist níét doen?
Pagina-specifieke valkuilen.
9. Wat moet de lezer denken na afloop?
Niet "ik weet nu alles", maar bijvoorbeeld:
"Dit bedrijf begrijpt precies mijn situatie en heeft een aanpak die hierbij past."
Dat is volgens mij genoeg.
Meer zou ik ervan niet maken.
________________________________________
17. Een belangrijk verschil: Writer Brief is geen extra intelligentielaag
Ik zou hem ook niet presenteren als:
"We voegen nog een AI-agent toe."
Dat maakt het systeem onnodig ingewikkeld.
Conceptueel is het gewoon:
een redactionele interpretatie van alle voorbereide informatie.
Je hebt al:
•	dossier; 
•	contract; 
•	claims; 
•	feiten; 
•	klantinput. 
De Writer Brief maakt daar één coherent schrijfmandaat van.
Dat is veel eenvoudiger.
________________________________________
18. Over de kosten: jullie optimaliseren nu op de juiste plek
De cijfers zijn hier heel duidelijk.
$3,09 voor schrijven + $3,33 voor reparaties op $7,43 totaal betekent dat schrijven en repareren het overgrote deel van de rekening bepalen. 
En er is één heel interessante verhouding:
één vermeden reparatieronde betaalt zeven volledige keuringen. 
Dus ik zou niet proberen $0,002 van een judge af te schaven.
Ik zou investeren in:
minder slechte eerste versies.
En dat betekent:
betere briefing → betere eerste tekst → minder reparaties.
Dat is financieel waarschijnlijk veel waardevoller dan micro-optimalisaties in de goedkope stappen.
________________________________________
19. Ik zou zelfs liever 1 extra goedkope denkstap hebben dan een vierde reparatie
Dit is een ontwerpgedachte die ik sterk vind voor jullie systeem.
Jullie hebben nu dure:
write → judge → revise
Maar als een compacte Writer Brief ervoor zorgt dat de eerste schrijfaanroep beter is, kan die stap zichzelf terugverdienen door minder revisies.
Dus:
research → editorial decision → write → judge → targeted fix
is waarschijnlijk economisch beter dan:
research → write → judge → repair → judge → repair → judge
Jullie hebben dat eigenlijk al deels gebouwd. Nu moet de ontbrekende redactionele intelligentie vóór het dure schrijven komen.
________________________________________
20. Wat ik voorlopig absoluut níét zou veranderen
Ik zou deze zaken juist met rust laten:
Feitenkaart
Sterke architectuur.
F-nummer + letterlijk bewijs
Heel goed.
Algemene uitleg apart behandelen
Goed.
Customer instructions apart van facts
Goed.
Customer quotes met motivatie bewaren
Heel goed.
Proof points
Behouden, maar koppelen aan de specifieke lezer.
Content contract
Behouden.
Gerichte section-level revision
Behouden. Dit is volgens mij één van jullie beste technische keuzes. 
Onafhankelijke judges
Behouden.
Deterministische codecontroles
Behouden.
Repareren alleen bij bevindingen
Behouden.
Maximaal drie rondes
Redelijk.
Jullie grootste gevaar is nu niet dat de architectuur te simpel is.
Het gevaar is dat jullie hem steeds complexer maken zonder de centrale redactionele beslissing te verbeteren.
________________________________________
21. Mijn prioriteitenlijst zou daarom anders zijn dan "nog meer safeguards"
Als ik nu eigenaar van dit product was, zou ik het zo aanpakken:
1. Writer Brief als experiment toevoegen.
Niet meteen aannemen dat hij werkt. A/B-testen.
2. "Waarom dit bedrijf voor deze lezer?" expliciet onderdeel maken.
Dit is rechtstreeks uit de menselijke kritiek gekomen. 
3. Dezelfde 12 pagina's opnieuw laten schrijven.
Dit is op dit moment eigenlijk de belangrijkste ontbrekende stap. Jullie weten zelf dat de nieuwe controles nog niet gevalideerd zijn. 
4. Sol en Terra gecontroleerd vergelijken.
Niet tegelijk allerlei veranderingen doorvoeren zonder te weten waardoor het resultaat verandert.
5. Judge-ranking verbeteren, liefst met pairwise tests.
Omdat +0,29 voor jullie werkelijke use case simpelweg te laag is.
6. Pas daarna verder sleutelen aan prompts.
Niet nu al nóg meer instructieblokken toevoegen.
________________________________________
Mijn eindoordeel als copywriter
Als ik puur als externe copywriter naar dit systeem kijk:
Technisch: zeer sterk.
Redactioneel proces: sterk.
Informatieverzameling: zeer sterk.
Fact discipline: uitzonderlijk sterk.
GEO-denken: zeer sterk.
Controleerbaarheid: zeer sterk.
Briefing aan de schrijver: te zwaar én tegelijk onvoldoende geprioriteerd.
Menselijkheid/onderscheidend vermogen: nog onvoldoende gestuurd.
Waarom deze ondernemer: nog onvoldoende expliciet.
Lezergerichtheid: duidelijk verbeterd in ontwerp, maar nog niet bewezen in output.
Modelkeuze: Terra is verdedigbaar, maar nog niet bewezen.
Judge: inhoudelijk veelbelovend, maar voor ranking nog onvoldoende betrouwbaar.
En mijn scherpste samenvatting zou zijn:
ORBIT ENGINE heeft inmiddels geleerd hoe je voorkomt dat AI onzin schrijft. De volgende stap is leren hoe je AI laat kiezen wat het belangrijkste is om te zeggen.
Dat is naar mijn oordeel de fundamentele verbetering die nu het meeste rendement kan opleveren.
En juist daarom zou ik niet meteen nog meer regels, agents of controles toevoegen. Eerst bewijzen of een compacte redactionele tussenstap vóór content_draft de daadwerkelijke kwaliteit van de pagina's significant verhoogt. De huidige documentatie geeft daar een behoorlijk sterke aanwijzing voor, maar nog geen bewijs.
