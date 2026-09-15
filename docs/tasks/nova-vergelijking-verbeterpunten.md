# Wat ORBIT ENGINE van Nova kan overnemen

**Opgesteld:** 15 september 2026. **Status: voorstellenlijst, geen bouwopdracht.**
Niets hieronder is gebouwd. Elk punt is een voorstel dat nog een eigen besluit nodig heeft.

**Bron:** een verse vastlegging van de Nova-app van InSpace, gehaald uit de server-gerenderde
loginpagina van `nova.inspace.io`. Die pagina stuurt de volledige tekstcatalogus van de hele
applicatie mee naar een bezoeker die niet is ingelogd, dus de schermindeling, de knoppen, de
foutmeldingen en de statussen zijn er allemaal uit te lezen. De vastlegging in `docs/nova-i18n.json`
is met deze ronde ververst.

**Wat er sinds de vorige vastlegging is veranderd:** Nova is gegroeid van 971 naar 1766
tekstsleutels, bijna een verdubbeling. De 1233 nieuwe sleutels zitten vooral in vier gebieden:
de merkprofiel-wizard die er eerst niet was (`workspaces.*`, 250 sleutels), het aanpassen van het
contentplan door de klant zelf (`strategy.move` en `strategy.detail`, 129), beheeracties op
bestaande pagina's (`admin.contentActions`, 91) en de CMS-koppeling (`admin.domainConfig` en
`admin.domainCredentials`, 252). Dat laatste blok valt buiten deze lijst, zie de afbakening.

**Afbakening:** automatisch publiceren naar het CMS van de klant is uitgesloten, op verzoek van de
eigenaar en in lijn met wat `README.md` al zegt ("bewust niet gebouwd: een koppeling met het CMS
van de klant"). Ongeveer een vijfde van alles wat Nova erbij heeft gebouwd gaat daarover en staat
dus niet in deze lijst, behalve waar een idee ook zonder CMS-koppeling waarde heeft.

**Werkwijze bij het opstellen:** van elk punt is eerst in de code van ORBIT ENGINE gecontroleerd
of het er al staat. Wat er al is, staat er expliciet bij, zodat geen enkel punt iets voorstelt dat
al gebouwd is. Waar ORBIT ENGINE het al beter doet dan Nova, staat dat er ook bij.

---

## Leeswijzer

Elk punt heeft een maat: **klein** is een middag werk, **midden** is een dag of twee met een
migratie, **groot** is een eigen project met een eigen plan. De volgorde binnen een blok is
aflopend naar wat het oplevert per uur werk.

---

## Blok A. Het contentplan: van zelf samenstellen naar nakijken

Dit is het grootste verschil tussen de twee apps, en het raakt precies de vraag waar
`docs/tasks/optimalisatielab-orbit-engine.md` werkpakket C mee eindigt: hoe voorkom je dat een
voorraad van honderdvijfenzeventig voorstellen een last wordt in plaats van waarde.

Nova lost dat op door de klant nooit een lege kalender te laten vullen. Nova vult hem zelf, plus
een buffer, en de klant past aan. ORBIT ENGINE doet het omgekeerd: links de voorraad, rechts twaalf
lege maanden die de gebruiker zelf vult met slepen of een menu. Dat werkt bij zeven kansen en loopt
vast bij honderd.

**1. Vul de maanden vooraf, laat de klant nakijken in plaats van samenstellen.** (groot) ✅ **Live,
15 september 2026.** Kleiner dan gedacht: `createPlan()` vulde al één maand zo (de voorzet), nu doet
`vulOpenMaanden()` (`lib/plans.ts`, rekenkant puur in `lib/plan-fill.ts`) dat voor elke openstaande
maand, bij het aanmaken van een plan én bij elke schermopening. Migratie 0098
(`planned_pages.auto_placed`). Zie `docs/logbook.md`, 15 september 2026, voor de twee dingen die
niet in de oorspronkelijke planningsronde stonden: de bevordering naar precies één
"ter_goedkeuring"-maand tegelijk, en de correctie voor een maand zonder bruikbare kalenderdag meer.
Alle vier de punten van dit blok zijn nu live.

**2. ~~Geef elke maand een vast formaat en houd dat vast bij elke wijziging.~~** (midden) ✅ **Live,
15 september 2026.** `moveToBacklog()` en de "oude maand" van `assignToMonth()` roepen na hun
herplanning nu ook `vulMetBuffer()` aan (`lib/plans.ts`): dezelfde soort voorwaardelijke claim die
`removePage()` al voor verwijderen deed, nu ook voor terugleggen en verplaatsen. Alleen als de
maand een buffer heeft: zonder buffer krimpt hij nog steeds tot de eerstvolgende schermopening
(conventie 3, geen verzonnen inhoud). Dat is precies waarom punt 3 hiervoor moest.

**3. ~~Schrijf een paar pagina's meer dan het abonnement dekt, als wisselgeld.~~** (midden) ✅ **Live,
15 september 2026.** `bepaalVulling()` (`lib/plan-fill.ts`) vult, ná de echte inhoud van alle open
maanden, in een tweede ronde elke maand aan tot één buffer (`BUFFER_PER_MONTH`,
`lib/plan-constants.ts`). Bevinding die de open vraag hieronder beantwoordt: een buffer kost niets
totdat hij verzilverd wordt. `lib/plan-writing.ts` slaat `is_buffer: true` al expliciet over, dus
een buffer die nooit wordt opgevraagd, wordt ook nooit geschreven en kost geen schrijfronde.

**4. ~~Zet wat niet in het plan past in een zichtbare wachtrij, met uitleg waarom.~~** (klein) ✅
**Live, 15 september 2026.** Geen apart tabblad zoals Nova's "Not included": dezelfde voorraadlijst,
met per kaart een label ("eruit gehaald" of "buiten bereik") en bij het uitklappen de uitleg
(`redenChip()`/`redenUitleg()`, `lib/plan-backlog.ts`). Nieuwe kolom `planned_pages.taken_out`
(migratie 0099) onthoudt de eerste helft; de tweede helft ("buiten bereik") is puur rekenwerk: wat
`vulOpenMaanden()` ná een volledige vulronde nog in de voorraad overlaat, past per definitie nergens
meer. Bijvangst: `assignToMonth()` zette `auto_placed` nooit terug op `false` bij een menselijke
sleepactie, ondanks wat de migratie 0098 zelf al beloofde. Rechtgezet in dezelfde ronde.

**5. Zeg op het planscherm hoeveel pagina's er nog bij moeten om het abonnement te halen.** (klein)
Nova: "Add # more pages to reach your plan of {quota} pages a month". Eén zin, en de klant weet
of hij klaar is. ORBIT ENGINE toont wel hoe lang de voorraad meegaat (`backlogDurationLabel()`),
maar niet of de eerstvolgende maand vol is.

**6. Laat het plan ook als kalender zien, niet alleen als lijst.** (klein)
Nova heeft een schakelaar tussen "Table" en "Calendar" (`strategy.calendar.layoutLabel`). Bij twaalf
maanden met elk een handvol pagina's is een kalender sneller te overzien dan een lijst, en het maakt
gaten zichtbaar die in een lijst niet opvallen.

**7. Bewaar elk voorstel als versie, met de uitkomst erbij.** (midden)
Nova bewaart elke strategieronde apart: "Proposal of {date}", met per ronde de uitkomst goedgekeurd,
afgewezen of niet afgemaakt, en oudere rondes alleen-lezen. ORBIT ENGINE logt cluster-rondes al in
`profile_topic_rounds`, maar het planvoorstel zelf niet. Zonder dat kun je achteraf niet nagaan wat
je een klant precies hebt voorgesteld en wat hij ervan vond, en dat is bij een verlenging precies
wat je wilt laten zien.

**8. Toon voortgang terwijl het plan gemaakt wordt, per maand.** (klein)
Nova: "{completed} of {total} months generated so far", plus per nog lege maand een blokje "This
month is still being generated. It will appear here as soon as it's ready, no need to do anything."
ORBIT ENGINE heeft een goede wachtrij met statussen, maar een half klaar plan ziet er nu uit als
een kapot plan.

---

## Blok B. Het merkprofiel

ORBIT ENGINE doet dit op het hoofdpunt al beter dan Nova en dat moet zo blijven: bij ons vult het
onderzoek het profiel vooraf en kijkt de klant na, wat de wizard zelf ook zegt met het label
"uit je website gehaald". Nova is daar pas later heen bewogen. De punten hieronder zijn afwerking,
geen koerswijziging.

**9. Geef het merkprofiel een eigen statuskaart per merk.** (klein)
Nova's `brand.card` kent vijf toestanden: nog niet begonnen, bezig, verstuurd, klaar, en mislukt met
de uitnodiging om opnieuw te genereren. ORBIT ENGINE toont voortgang als "x van de y ingevuld", wat
iets anders zegt: het zegt hoe vol het formulier is, niet of het profiel bruikbaar is. Die twee
lopen uiteen zodra de belangrijke velden leeg zijn en de onbelangrijke vol.

**10. Maak het profiel downloadbaar.** (klein)
Nova heeft "Download profile". Klein, maar het maakt het profiel iets dat de klant bezit en kan
doorsturen naar zijn eigen tekstschrijver of bureau. Dat is ook een verkoopargument: het bewijst
dat het werk van waarde is los van de app.

**11. Waarschuw eerlijk bij opnieuw genereren.** (klein)
Nova: "NOVA writes the profile and your plan again from scratch, so the wording will not be
identical." ORBIT ENGINE heeft geen knop om het hele profiel opnieuw te laten schrijven. Komt die
er, dan hoort deze zin er meteen bij, want een klant die correcties heeft getypt verwacht ze terug
te zien.

**12. Laat tijdens het genereren zien in welke stap het zit.** (klein)
Nova toont drie fases: in de wachtrij, bestanden lezen, profiel schrijven, met de geruststelling
"You can close this page, it carries on without you." ORBIT ENGINE heeft die belofte wel in de
onboarding ("loopt door als je dit scherm sluit") maar niet bij het profiel zelf.

---

## Blok C. Het contentstuk: bewerken, controleren, versies

ORBIT ENGINE heeft hier al veel: versieherkomst in gewone taal (`lib/pipeline/version-reason.ts`,
zelf al naar Nova gemodelleerd), een diff-weergave, een kwaliteitspaneel, een zoekresultaat-preview,
claimcontrole en een eindpoort. De punten hieronder zijn wat Nova er sindsdien bij heeft gezet.

**13. Zet een drempel voor de handmatige bewerkmodus.** (klein)
Nova opent een bevestiging: "Manual edits may affect indexing, keyword targeting, and on-page
optimisation for Google. Continue only if you're comfortable editing this content by hand", met als
knop "Continue at my own risk". ORBIT ENGINE waarschuwt nu alleen dat wijzigingen de versie
overschrijven. Het punt is niet de waarschuwing zelf, het is dat de klant erna weet dat een
handmatige ingreep iets kost.

**14. Controleer deterministisch vóór het opslaan van een bewerking.** (midden)
Nova toetst bij opslaan op vijf dingen: lege meta-titel, lege H1, lege meta-omschrijving, het
belangrijkste zoekwoord dat nergens in titel, H1 of tekst voorkomt, en een link zonder adres. Dat
is precies conventie 1 uit `CLAUDE.md`: elke promptinstructie een deterministisch vangnet in code.
ORBIT ENGINE controleert de gegenereerde tekst al streng, maar de handmatig bewerkte tekst gaat
langs een lichtere poort. Een klant kan dus met de hand kapot maken wat de pijplijn goed had.

**15. Zeg vooraf welke opmaak verloren gaat.** (klein)
Nova: "Some formatting on this page can't be edited here and will be removed if you save:
{elements}". Wie een tabel of een bijschrift kwijtraakt zonder waarschuwing, vertrouwt de editor
daarna niet meer.

**16. Maak de foutmeldingen bij opslaan specifiek.** (klein)
Nova heeft er tien, elk met een eigen oorzaak: iemand anders wijzigde dit ondertussen, dit is al
gepubliceerd, de tekst is te lang, je hebt geen rechten meer, de verbinding brak af. Elke melding
eindigt met "Your draft is safe". ORBIT ENGINE heeft er één algemene. Dat verschil merk je pas als
er iets misgaat, en dan is het precies het moment waarop vertrouwen wint of verliest.

**17. Vang gelijktijdig bewerken af.** (midden)
Nova's melding "This item changed since you opened it" verraadt dat ze meegeven welke versie je aan
het bewerken was. Bij ons kan een consultant en een klant tegelijk in hetzelfde stuk werken en wint
stilzwijgend wie het laatst opslaat. Met een sales-led model waarin de consultant meekijkt is dat
geen randgeval maar de normale gang van zaken.

---

## Blok D. Beheer: acties op wat er al staat

Dit blok is bij Nova het sterkst gegroeid en bij ons het dunst. Het gaat over alles wat je doet
nádat een pagina bestaat. Let op: bij Nova hangt een deel hiervan aan hun CMS-koppeling, maar de
onderliggende actie werkt ook zonder.

**18. Scheid opnieuw inplannen van opnieuw schrijven, en bewaak het verschil.** (midden)
Nova heeft twee aparte acties met een expliciete kruisverwijzing: als de publicatiedatum al voorbij
is, blokkeert hij herschrijven en zegt "Reschedule the post instead, that moves the date and
re-queues the write in one step. A publication date in the past is skipped, so a rewrite on its own
would never go out." ORBIT ENGINE kent herschrijven wel, opnieuw inplannen niet als eigen actie.
Dat betekent dat een pagina met een verlopen datum nu stil blijft liggen.

**19. Geef per regel de reden waarom een actie niet kan.** (klein)
Nova's bulk-herschrijven zet achter elke regel die niet mee kan waaróm niet: al gepubliceerd, wordt
nu gepubliceerd, geannuleerd, nog niet goedgekeurd door de klant, of er is nog geen tekst om te
vervangen. Geen algemene melding "sommige items zijn overgeslagen", maar per regel. Dit is een
patroon dat overal in ORBIT ENGINE bruikbaar is waar nu een verzamelmelding staat.

**20. Bouw bulkacties met een controlestap ertussen.** (midden)
Nova's opzet voor het aanpassen van adressen in bulk is netjes: zoek en vervang over alle paden,
met een aparte optie om alleen de eerste map te vervangen, per regel een controle op geldigheid en
dubbelingen, en dan een scherm "Review the changes" dat toont wat er nu staat en wat er na opslaan
staat, met "Nothing is written until you confirm". ORBIT ENGINE heeft bulkacties op het planscherm,
maar zonder die tussenstap.

**21. Zet een dakpan op bulkacties die geld kosten.** (klein)
Nova: "At most {max} pages at a time, each one costs a new writer run. Re-queue the rest in a second
pass." Bij ons is elke schrijfronde een betaalde AI-aanroep en is er geen bovengrens op een
bulkactie. Eén verkeerde klik is dan meteen duur.

**22. Vertel bij een veld expliciet op welk niveau het werkt.** (klein)
Nova zet boven hun schrijfinstructie: "This note belongs to the domain, not to the pages you
rewrite", met de uitleg dat opslaan de instructie verandert voor élke nog niet geschreven pagina.
ORBIT ENGINE heeft drie lagen die precies dit probleem hebben: merklaag, clusterlaag, paginalaag
(zie `optimalisatielab-orbit-engine.md` §3.1). Het scherm zegt nu niet altijd welke laag je te
pakken hebt, en dat is de makkelijkste manier om per ongeluk alles te veranderen.

**23. Leg het abonnement vast als getal waar het plan tegen afgezet wordt.** (midden)
Nova's `admin.planQuota` koppelt een abonnementsvorm aan twee dingen: hoeveel pagina's per maand, en
wélke paginatypes dit merk mag krijgen. ORBIT ENGINE heeft `pages_per_month`, maar niet de
paginatypes per abonnement. Zonder dat kan een klant een paginatype in zijn plan krijgen waar hij
niet voor betaalt.

**24. Geef de klantentabel een reden bij elke vastgelopen klant.** (klein)
ORBIT ENGINE's `beheer/csm-view.tsx` heeft de segmenten al, naar Nova gemodelleerd, en doet het
met de banner per segment op één punt zelfs beter. Wat Nova erbij heeft is `admin.issueReasons`:
zes concrete redenen waarom een merk stilstaat, zoals "geen standaardtaal ingesteld", "minder dan
drie funnels", "laatste ronde mislukt", "nog geen strategie". Een segment zegt dát iemand
vastzit, een reden zegt wat jij nu moet doen.

---

## Blok E. Vertrouwen en communicatie

**25. Meld het als er een nieuwe versie van de app is uitgerold.** (klein) ✅ **Live, 15 september
2026.** `next.config.ts` bakt de versie in de browserbundel, `/api/version` geeft de echt lopende
versie terug, `components/deployment-banner.tsx` vergelijkt ze elke vijf minuten en toont bij een
verschil een balk onderin het scherm. Bewust geen automatisch herladen zoals Nova: het merkprofiel
bewaart pas op een expliciete klik, dus de klant beslist zelf wanneer. Zie `docs/logbook.md`,
15 september 2026.

**26. Zeg bij elke tijdelijke storing wie het oplost en wat de klant intussen kan.** (klein) ✅
**Live, 15 september 2026.** Nieuwe richtlijn 12 in `docs/schrijfstijl.md`. Toegepast op de
Search Console-foutmelding op `/merk/[id]/analytics/zoekverkeer`: een beheerder ziet nog steeds de
technische reden (die is vaak zelf de "wie het oplost"), een klant ziet voortaan dat zijn consultant
ervan op de hoogte is en dat er voor hem niets te doen valt, in plaats van een ruwe API-foutregel.
De overige foutmeldingen in de app zijn niet allemaal langsgelopen: de richtlijn staat er, de rest
volgt bij de eerstvolgende keer dat iemand zo'n scherm toch al aanraakt.

**27. Maak het verschil zichtbaar tussen wachten op ons en wachten op de klant.** (klein) ✅ **Live,
15 september 2026, kleiner dan gedacht.** Het onderscheid bleek al in het datamodel te zitten
(`lib/work.ts`, `WorkState`: `nu` versus `loopt`/`wacht`), alleen werd op `/merk/[id]` uitsluitend
`nu` getoond. Er is geen tweede lijst bijgekomen (die zou dubbel werk doen met de bestaande
statuskaarten per pagina), wel een teller naast de kop ("Bij ORBIT ENGINE · 3") en een aangepaste
lege-staat-tekst die zegt waar ORBIT ENGINE mee bezig is als er niets op de klant wacht.

**28. Laat de klant zijn content en zijn plan exporteren.** (klein) ✅ **Deels live, 15 september
2026.** Het per-pagina exporteren van geschreven content bleek al te bestaan
(`lib/pipeline/content-export.ts`, de downloadknop in de bibliotheek); dat is dus al Nova's
"Download content". Nieuw: `GET /api/profiles/[id]/plan/export` en een "Download CSV"-knop op het
planscherm, met per geplande pagina de maand, titel, type, funnelfase, status en datum. Een bulk-
export van alle geschreven teksten in één bestand (in plaats van per pagina) staat niet in deze
ronde; dat is een aparte, grotere afweging als blijkt dat klanten dat missen.

**Losse observatie, geen eigen punt:** bij het bouwen van de plan-export bleek dat er al een
vergelijkbare route bestaat voor analyseresultaten (`/api/analyses/[id]/results/export`), maar die
is in geen enkel scherm aan een knop gekoppeld. Niet in deze ronde opgepakt: onbekend of dat bewust
zo is (nog te bouwen knop) of een vergeten aansluiting; eerst navragen bij de eigenaar.
exporteert alleen de meetresultaten van een analyse
(`app/api/analyses/[id]/results/export/route.ts`). Een klant die zijn plan in een eigen overleg wil
bespreken, of zijn teksten wil doorgeven aan een tekstschrijver, kan dat nu niet zonder kopiëren en
plakken. Dit is bovendien de tegenhanger van niet publiceren naar het CMS: als wij niet publiceren,
moet meenemen des te makkelijker zijn.

---

## Blok F. Groot, en apart te besluiten

**29. Meertaligheid, en dan in twee betekenissen.** (groot)
Nova doet twee dingen die bij ons allebei ontbreken, en ze staan los van elkaar.

Ten eerste de app zelf: Nova is er in Engels, Nederlands, Duits en Frans (`account.language`).
Voor ORBIT ENGINE is Nederlands een bewuste keuze en zolang de markt Nederland is, is dat
verdedigbaar.

Ten tweede, en dat is de interessante: Nova schrijft elke pagina rechtstreeks in de doeltaal in
plaats van te vertalen, en zegt dat ook tegen de klant: "Written natively in {locale}, not
translated, NOVA writes every page in its own target language for the best local tone and SEO."
Hun hele planstructuur kent taal als eerste burger, inclusief een maandquotum per taal. Voor een
Nederlandse klant die ook in België of Duitsland wil scoren is dat een echte functie. Dit is geen
middagje werk: het raakt het datamodel, het plan, de meting en de schrijfketen. Apart besluit waard,
niet iets om tussendoor te doen.

**30. Een testronde om te controleren of een koppeling echt werkt.** (midden)
Nova's `admin.demoPost` stuurt een proefbericht met onzin-tekst om te controleren of de
CMS-koppeling doet wat hij belooft. De CMS-kant vervalt hier, maar het idee erachter niet: ORBIT
ENGINE heeft ook koppelingen die stil kunnen falen, met Search Console als belangrijkste. Een knop
"controleer deze koppeling" die één echte aanvraag doet en toont wat er terugkomt, voorkomt dat je
er weken later achter komt dat er geen data binnenkwam. Conventie 10 uit `CLAUDE.md` zegt precies
dit: gebouwd is niet geverifieerd.

---

## Wat we bewust niet overnemen

Even belangrijk als de lijst hierboven, zodat dit later niet opnieuw onderzocht wordt.

**Automatisch publiceren naar het CMS.** Uitgesloten door de eigenaar. Daarmee vervallen ook
Nova's drie publicatiemodi, de aan-uitschakelaars per markt voor publiceren, de opslag van
CMS-sleutels per klant, en het grootste deel van `admin.domainConfig` en `admin.domainCredentials`.
Dat is ongeveer een vijfde van alles wat Nova erbij heeft gebouwd.

**De zelfbedienings-onboarding met betaling.** Nova laat de klant zijn eigen bedrijfsgegevens
bevestigen, zijn IBAN invullen en een incassomachtiging afgeven. Dat hoort bij een product waar de
klant zichzelf inricht. ORBIT ENGINE is sales-led (`docs/logbook.md` §15): de consultant zet het
merkprofiel klaar vóór het demogesprek. Een betaalstap in de app zou dat model tegenspreken.

**Twintig minuten onboarding.** Nova vraagt de klant er twintig minuten voor uit te trekken. Onze
drie velden plus een onderzoekspijplijn zijn hier het sterkere ontwerp en dat blijft zo.

**De aparte tekstbewerker met volledige opmaakbalk.** Nova bouwt een complete editor met tabellen,
citaten, codeblokken en afbeeldingen. Dat is logisch als jij publiceert en de tekst dus af moet zijn
in jouw app. Wij publiceren niet, dus de tekst gaat hoe dan ook door een CMS van iemand anders. Punt
14 en 15 hierboven zijn wél de moeite waard, de opmaakbalk zelf niet.

---

## Voorgestelde volgorde

**Eerst, want klein en meteen merkbaar:** ~~25, 26, 27, 28 (alle vier live sinds
15 september 2026, blok E is daarmee compleet)~~, 5 (hoeveel pagina's nog nodig), 19 (reden per
regel), 16 (specifieke foutmeldingen), 13 (drempel voor handmatig bewerken).

**Daarna, want het lost een echt probleem op dat groeit:** ~~blok A, alle vier de punten, live sinds
15 september 2026~~. Dit was de voorwaarde om werkpakket B uit het optimalisatielab te kunnen
opleveren: zodra het aantal kansen omhoog gaat, liep het oude planscherm vast.

**Dan, omdat ze de kwaliteit bewaken die we al hebben:** 14, 15, 17, 21.

**Apart besluit:** 29 (meertaligheid) en 23 (paginatypes per abonnement), allebei omdat ze het
datamodel raken.

---

## Open vragen voor de eigenaar

1. Punt 1 draait de rolverdeling op het planscherm om: van zelf samenstellen naar nakijken. Dat is
   een wezenlijke wijziging in hoe het scherm aanvoelt. Akkoord met die richting voordat er iets
   gebouwd wordt?
2. ~~Punt 3 (een buffer schrijven bovenop wat het abonnement dekt) kost per extra pagina een echte
   schrijfronde. Hoeveel buffer is dat waard?~~ **Beantwoord bij het bouwen, 15 september 2026:** een
   buffer kost niets totdat hij verzilverd wordt (`lib/plan-writing.ts` schrijft nooit `is_buffer:
   true`). De vraag was op een verkeerde aanname gebaseerd: er is geen "hoeveel is het waard"-afweging
   nodig, want een ongebruikte buffer kost helemaal niets.
3. Punt 29: is er zicht op klanten die ook in het buitenland zichtbaar willen zijn? Zo nee, dan
   blijft dit onderaan liggen en hoeft het datamodel er niet op voorbereid te worden.
4. Punt 23 veronderstelt dat er abonnementsvormen bestaan met verschillende rechten. Bestaan die al
   commercieel, of is `pages_per_month` per klant voorlopig genoeg?
