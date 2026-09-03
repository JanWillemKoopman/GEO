# De copywriterronde: elf verbetervoorstellen, en twee keuzes

**Status:** de voorstellen liggen bij de eigenaar, er is nog niets gebouwd. Bijgewerkt 3 september
2026 na de beoordeling door een echte copywriter.

Op 3 september zijn de twaalf pagina's uit `content-reviews/` twee keer beoordeeld: eerst door een
AI in de rol van copywriter (`content-reviews/feedback/`, twaalf bestanden en `patronen.md`), daarna
door een echte copywriter
(`content-reviews/feedback/copywriter-extern-3-september-2026.md`). Dit document bevat wat er uit
allebei volgt voor de app.

## 1. Eerst de correctie: de vakmanschapsbeoordelaar zat er niet naast, ik wel

De vorige versie van dit document zei dat de vakmanschapsbeoordelaar 20 tot 39 punten te hoog
scoorde en dat de ijking daarom de blokkerende stap was. **De eerste helft van die conclusie is
onjuist gebleken.** De echte copywriter zit vrijwel bovenop de beoordelaar, en het was mijn eigen
ronde die te streng was.

Alle drie de beoordelaars omgerekend naar dezelfde schaal van 1 tot 5, gemiddeld over twaalf
pagina's:

| Dimensie | Echte copywriter | Vakmanschapsbeoordelaar | AI-copywriterronde |
|---|---|---|---|
| specificiteit | 3,92 | 3,60 | 1,67 |
| menselijkheid (toon) | 2,92 | 2,87 | 1,50 |
| overtuigingskracht | 2,58 | 2,82 | 1,83 |

De beoordelaar zit op 0,05 tot 0,32 punt van het menselijke oordeel. Mijn ronde zit er 0,75 tot 2,25
naast, steeds te laag. **Op het niveau van de cijfers is de vakmanschapsbeoordelaar dus goed
geijkt**, en dat is beter nieuws dan het vorige document suggereerde.

Er is één ding dat hij niet kan, en dat is operationeel het belangrijkste:

**Hij kan de pagina's niet uit elkaar houden.** De rangschikking van de twaalf pagina's, gemeten als
rangcorrelatie met de copywriter:

| Beoordelaar | Rangcorrelatie met de copywriter |
|---|---|
| Vakmanschapsbeoordelaar | +0,19 |
| AI-copywriterronde | +0,70 |

De copywriter noemt als vier zwakste pagina's 2, 8, 1 en 4. De beoordelaar noemt 1, 12, 4 en 9. De
sterkste tegenspraak: pagina 8 (het gratis medisch consult) is voor de copywriter de gedeeld
slechtste van de twaalf ("ABSOLUUT NIET", "liever grotendeels opnieuw schrijven"), en voor de
beoordelaar de op twee na béste.

Dat is precies wat de app nodig heeft en niet krijgt. De score bepaalt "klaar, repareren of
geblokkeerd" per pagina. Een beoordelaar die het gemiddelde niveau goed schat maar binnen een batch
niet weet welke pagina de slechtste is, stuurt de reparatie naar de verkeerde pagina.

**Gevolg voor de ijking:** die blijft nodig, maar met een ander doel. Niet om de hoogte van de
cijfers bij te stellen, want die klopt ongeveer, maar om de beoordelaar te leren onderscheiden. Er
liggen nu twaalf menselijk beoordeelde pagina's van de twintig uit `IJKING_MINIMUM`.

## 2. Keuze 1: wat gaat er de database in

| | Wat het is | Voorstel |
|---|---|---|
| De twaalf oordelen van de echte copywriter | Menselijk, bruikbaar voor de ijking, twaalf van de twintig | **Wel opnemen** in `content_quality_reviews`. Dit is precies waar het Kwaliteitslab voor gebouwd is. |
| De twaalf oordelen uit de AI-ronde | Niet menselijk, en aantoonbaar 0,75 tot 2,25 punt te streng | **Niet opnemen.** Ze blijven markdown in `content-reviews/feedback/`. |

De cijfers van de copywriter passen één op één op de kolommen van `content_quality_reviews`
(`copywriter_equivalence`, `company_specificity`, `generic_ai_feel`, `persuasiveness`,
`brand_representation`, `correction_effort`, `would_send`, `first_thing_to_change`). Er is geen
migratie voor nodig. Wat wel moet: `reviewer_name` en `benchmark_set` invullen, en de twaalf
`content_piece_id`'s opzoeken.

⚠️ Eén kanttekening bij het invoeren: `generic_ai_feel` telt in de app vermoedelijk andersom dan de
copywriter het bedoelde. Hij scoorde "menselijk" waarbij 5 het beste is. Dat moet nagerekend worden
vóór het invoeren, anders komen de twaalf pagina's er als bijna-perfect in te staan op precies de
dimensie waar ze het slechtst scoren.

## 3. Keuze 2: welke verbeteringen bouwen we

Elf voorstellen in twee lagen. De eerste laag komt van de copywriter en gaat over redactionele
keuze; daar zit volgens hem "verreweg het meeste" in. De tweede laag komt uit de AI-ronde en gaat
over mechanische hygiëne; goedkoop, hard te controleren, en losstaand van smaak.

Elk voorstel heeft een promptwijziging én een deterministisch vangnet (code-conventie 1), en elk is
te verifiëren tegen de twaalf bestaande pagina's, want die liggen er al.

---

### Laag A. Redactionele keuze (uit de beoordeling van de copywriter)

#### V7. Elke pagina krijgt één lezer, één probleem, één beslissing

**Waarom dit bovenaan staat.** Dit is voorstel nummer 1 van de copywriter: "Schrijf vanuit de
situatie van de lezer. Omdat vrijwel alle andere problemen hieruit voortkomen." Zijn regel 2 luidt:
iedere pagina moet in één zin kunnen uitleggen "deze pagina helpt [type persoon] die [probleem]
heeft en [beslissing] moet nemen".

**Wat er nu gebeurt, en dit is het scherpst meetbare cijfer van deze hele ronde.** Bij **acht van de
twaalf pagina's** stond in de opdracht letterlijk:

> "_Geen doelomschrijving vastgelegd._"
>
> "_Er waren geen specifiek gemeten vragen aan deze pagina gekoppeld._"

Dezelfde acht, allebei leeg. De belangrijkste aanbeveling van de copywriter faalt dus niet bij het
schrijven maar bij de invoer: de schrijver kreeg bij twee derde van de pagina's geen lezer en geen
vraag mee. Dat verklaart ook zijn observatie dat de teksten "alle mogelijke lezers tegelijk"
bedienen. Er was er geen aangewezen.

**Wat ik voorstel.** `rec.targetIntent` wordt verplicht en krijgt een vaste vorm: wie, welk
probleem, welke beslissing. Is hij leeg, dan wordt hij afgeleid uit de gemeten vragen van het
cluster. Zijn die er ook niet, dan wordt de pagina niet geschreven maar teruggelegd, want een pagina
zonder aanwijsbare lezer is precies de pagina die alles probeert te zeggen.

**Vangnet.** Een blokkade vóór de dure schrijfaanroep, niet erna: geen paginaopdracht in die vorm,
geen schrijfopdracht. Dat scheelt ook geld, want een pagina zonder lezer kost nu $0,071 aan
schrijven plus reparatierondes.

**Risico.** Middel, en het raakt de planstap en niet de schrijfstap. Het kan betekenen dat een ronde
minder pagina's oplevert. Dat is wat de copywriter aanraadt: liever minder en gerichter.

#### V8. De opening begint bij de lezer, niet bij het bedrijf

**Waarom.** Regel 1 en ondergrens 1 en 7 van de copywriter. Zijn oordeel over de huidige openingen:
"Dat is vaak een startpunt, maar geen sterke opening. Eerst moet de lezer zichzelf herkennen."

**Wat er nu gebeurt.** **Elf van de twaalf openingen** beginnen bij het merk of bij de
beschikbaarheid: "Bij Fysio Centrum Utrecht kun je terecht voor", "MJB Dakservice helpt in Twello
bij", "In Apeldoorn kun je MJB Dakservice bellen". Zes ervan beginnen met het woord "Ja", waarvan
vijf op een pagina waar niemand een vraag gesteld heeft. Eén opening begint bij de situatie van de
lezer, en dat is dan ook de pagina die de copywriter als beste van de twaalf aanwijst.

**Wat ik voorstel.** De eerste alinea beschrijft de situatie waarin de lezer zich bevindt, in
concrete woorden, en pas de tweede alinea introduceert het bedrijf als oplossing.

**Vangnet.** De eerste zin van de body bevat de merknaam niet en begint niet met "Ja". Twee regels
code, en het vindt vandaag elf van de twaalf pagina's.

**⚠️ De spanning die hierbij hoort en die eerst opgelost moet worden.** Diezelfde eerste alinea is
het antwoordblok dat een AI-assistent oppakt, en daar hoort de merknaam juist in. Beide kunnen
alleen naast elkaar als de merknaam naar de tweede zin verhuist en niet uit de eerste alinea
verdwijnt. Niet bouwen zonder een nameting op citeerbaarheid, samen met V1.

#### V9. Van feit naar betekenis

**Waarom.** Voorstel nummer 2 van de copywriter, en zijn regel 3. Zijn voorbeelden zijn de
duidelijkste instructie uit de hele beoordeling:

> "Vaste ploeg van vier eigen dakdekkers" wordt "u weet wie er op uw dak komt."
>
> "Extra werk alleen na toestemming" wordt "geen onverwachte werkzaamheden zonder dat u eerst
> akkoord geeft."
>
> "Gratis inspectie met fotorapport" wordt "u ziet zelf wat we aantreffen en welke punten volgens
> ons eerst aandacht nodig hebben."

**Wat er nu gebeurt.** De feiten staan er, als feiten, meestal in een opsomming naast VCA en het
aantal klanten. De copywriter noemt dit bij elf van de twaalf pagina's (zijn patroon 4) en het is
ook de kern van zijn eindoordeel: de teksten weten wat het bedrijf doet, maar niet waarom deze lezer
dit bedrijf zou kiezen.

**Wat ik voorstel.** De schrijfaanroep levert een nieuw veld `proofPoints`: drie tot vijf paren van
een F-nummer plus één zin die zegt wat dat feit voor de lezer betekent. Dat is dezelfde machinerie
als `claims`, met een ander doel: `claims` bewijst dat een zin mag, `proofPoints` bewijst dat een
feit is omgezet.

**Vangnet.** Minstens drie proofPoints, elk met een bestaand F-nummer, en elke betekeniszin komt
letterlijk in de tekst terug. Dat laatste is met dezelfde vergelijking te doen als `claimMatches`.

**Risico.** Middel. Hier zit de meeste opbrengst en het meeste ontwerp: welke drie feiten van de
twintig, dat is precies de keuze die de copywriter mist.

#### V10. Minder, maar sterker

**Waarom.** Voorstel nummer 3 van de copywriter: "schrap 25 tot 40 procent van de informatie en maak
de rest sterker". Plus zijn patroon 2 en 3, allebei op twaalf van de twaalf.

**Wat er nu gebeurt.** Gemeten over de twaalf pagina's: **169 van de 228 koppen is een vraag, 74
procent.** Op vier pagina's is elke kop een vraag. De copywriter: "Als vrijwel iedere alinea antwoord
geeft op een losse vraag, ontbreekt waarschijnlijk een verhaal." Zijn tegenvoorstel is een verhaal
in acht stappen: probleem, herkenning, gevolg, oplossing, bewijs, bezwaar, zekerheid, actie.

**Wat ik voorstel.** Twee dingen. Het contract (de inhoudsopgave die de schrijver meekrijgt) wordt
per contenttype als verhaalboog opgesteld in plaats van als vragenlijst, met stellende koppen. En de
doellengte gaat omlaag: de twaalf pagina's lopen van 850 tot 1650 woorden met tot 26 secties.

**Vangnet.** Twee tellingen: hoogstens de helft van de koppen is een vraag, en een bovengrens op het
aantal secties per contenttype. Bij een FAQ geldt de eerste regel uiteraard niet.

**Risico.** Middel. Vraagkoppen zijn goed voor citeerbaarheid in een AI-antwoord, dus dit is
opnieuw een afweging tussen vindbaarheid en leesbaarheid en het hoort met een nameting.

#### V11. Eén concreet scenario vóór de uitleg

**Waarom.** Regel 5 en patroon 7 van de copywriter, op twaalf van de twaalf: "De teksten benoemen
problemen, maar laten ze zelden voelen." Zijn voorbeeld:

> Nu: "Water kan onder dakbedekking..."
>
> Sterker: "U ziet ineens een natte plek boven de bank. Even later drupt er water naar beneden. Moet
> u nu iemand bellen? En gaat dit honderden of duizenden euro's kosten?"

**Wat ik voorstel.** Elke pagina opent met of bevat vroeg één herkenbare situatie in de woorden van
de lezer. Dit hangt vast aan V7: zonder aangewezen lezer valt er geen scenario te schrijven.

**Vangnet.** Zwak, en dat moet erbij gezegd. Dit is niet te tellen. Wat wel kan: de
vakmanschapsbeoordelaar er een aparte dimensie voor geven ("herkenning"), zodat het cijfer bestaat
en de ijking hem later kan bijstellen. Dit is het enige voorstel zonder harde controle.

#### V12. Niet elke pagina hetzelfde rijtje feiten

**Waarom.** Patroon 9 van de copywriter: "Iedere pagina moet één eigen reden hebben om te bestaan."

**Wat er nu gebeurt.** Geteld over de zes pagina's per klant:

| MJB Dakservice | FCU |
|---|---|
| gratis inspectie: 6 van 6 | twee locaties: 6 van 6 |
| binnen 24 uur: 6 van 6 | binnen 24 uur: 6 van 6 |
| fotorapport: 6 van 6 | geen verwijzing nodig: 6 van 6 |
| 25 jaar ervaring: 5 van 6 | gratis medisch consult: 6 van 6 |
| 500+ klanten: 5 van 6 | alle zorgverzekeraars: 6 van 6 |
| VCA: 5 van 6 | zeven dagen open: 4 van 6 |

**Wat ik voorstel.** De proofPoints uit V9 worden per ronde verdeeld: een pagina kiest de drie die
bij zijn lezer horen, niet de drie die het hoogst op de kaart staan.

**Vangnet.** Een waarschuwing wanneer een feit op meer dan de helft van de pagina's van dezelfde
ronde staat. Dat is een telling over een batch en geen blokkade per pagina, dus hij hoort in het
ronde-overzicht en niet in de keuring.

---

### Laag B. Mechanische hygiëne (uit de AI-ronde)

Deze zes vond de copywriter niet, en dat is te verklaren: hij beoordeelde twaalf teksten los, hij
telde niet en hij zag de klantantwoorden niet naast de tekst. Het zijn geen smaakkwesties maar
fouten, en ze zijn alle zes goedkoop te vangen.

#### V2. De aanspreekvorm wordt altijd gekozen (goedkoopst)

95 keer "je" naast 81 keer "u" over twaalf pagina's, bij twee klanten die allebei beide vormen
kregen; op de contactpagina van FCU slaat het binnen twee zinnen om. `describePronoun` in
`lib/pipeline/tone-sliders.ts` lost dit al op, maar schrijft alleen een promptregel als
`profiles.pronoun_preference` gevuld is, en dat was hier niet zo.

**Voorstel:** nooit meer leeg, afgeleid uit de bestaande paginatekst van de klant of uit
`tone_formality`. **Vangnet:** blokkade zodra één pagina beide vormen bevat. **Risico:** laag.

#### V3. Het vangnet tegen werkproces-praat verbreden

Zes zinnen over onze eigen bronnen en redactie kwamen op vijf pagina's terecht, waaronder
"Controleer vóór publicatie (...) de actuele inschrijving van de behandelaar", "De locaties worden op
deze pagina niet inhoudelijk van elkaar onderscheiden" en "Dit beantwoordt het bezwaar: 'Ik hoor pas
achteraf wat het kost.'" `checkSourceTalk` in `content-gate.ts` heeft elf zoektermen en vindt er
geen van.

**Voorstel:** vier families toevoegen (redactie-instructies, bezwaarsjablonen, verificatiestatus,
zelfrelativering). **Vangnet:** dit ís het vangnet; de test is dat hij deze zes vindt en niet
aanslaat op de overige 13.600 woorden. **Risico:** laag.

#### V5. Een klantinstructie is een verbod, geen feit

Vier FCU-pagina's kregen mee: "Zet er geen adres bij (...) Verwijs voor de adressen naar de
contactpagina." Twee van die vier zetten er toch een adres bij.

**Voorstel:** instructie-antwoorden gaan naar hetzelfde blok als `taboo_phrases`, een gesloten
verbodslijst bovenaan de prompt. **Vangnet:** per verbod een controle waar dat kan; voor het
adresgeval een straatnaam met huisnummer. **Risico:** laag voor dit geval, hoger voor het algemene.

#### V6 en V11-bis. Minder adviseren, minder slap formuleren

Deze twee lopen samen, want ze zijn hetzelfde vangnet met twee woordenlijsten.

De AI-ronde telde 72 zinnen die beginnen met "Vraag", "Controleer", "Laat", "Bespreek" of "Leg",
waarvan 23 op één pagina. De copywriter voegt daar zijn regel 12 en ondergrens 5 aan toe, en die
lijst is los te tellen: **120 slappe formuleringen op 13.605 woorden, één per 113 woorden.** De
grootste posten zijn "mogelijk" (43), "hangt af van" (26) en "niet automatisch" (18).

Daar bovenop de drie pagina's waar het advies tegen de klant werkt: een checklist om dakdekkers te
vergelijken, en twee keer de oproep om de registratie van de eigen therapeut na te trekken.

**Voorstel:** in de prompt het verbod op vergelijkingsadvies en op twijfel over de eigen
deskundigheid; in de code een bovengrens per honderd woorden op allebei de lijsten. **Risico:**
middel, want een deel van die voorzichtigheid is in de zorg terecht. De grens hoort bij het
doorslaan te liggen, niet bij het eerste geval.

#### V4. Klantcitaten beschermen

Op vier pagina's is een letterlijk klantantwoord tot een procedurezin geparafraseerd, waarbij de
motivering wegviel: "Doorwerken over houtrot heen doen we niet, ook niet als de klant erom vraagt,
want dan kunnen we onze garantie op het werk niet waarmaken" werd "dan legt MJB Dakservice het werk
stil, maakt foto's en meldt eerst de herstelkosten".

Dit is de mechanische kant van V9: de betekenis zat al in het antwoord van de klant en is er
uitgehaald.

**Voorstel:** klantantwoorden langer dan ongeveer vijftien woorden met een motivering ("want",
"omdat", "daarom") apart aanbieden als CITEERBAAR. **Vangnet:** woordoverlap tussen pagina en de
langste klantantwoorden; nul overlap is een bevinding. **Risico:** middel.

#### V1. Het bedrijf mag weer "wij" zeggen

Twee keer "wij" in 13.600 woorden, beide in een kop, tegenover 164 keer de merknaam in de derde
persoon. De oorzaak is de regel in `lib/pipeline/content.ts` en `REPAIR_SYSTEM` regel 3, die er met
reden staat: een AI-assistent die "wij" leest, weet niet welk merk hij moet citeren.

**Voorstel:** de regel begrenzen in plaats van schrappen. Merknaam verplicht in het openingsantwoord
en de eerste zin van elke sectie, wij-vorm toegestaan in de rest. **Vangnet:** bevinding bij nul
zinnen in de eerste persoon én meer dan één merknaamvermelding per honderd woorden. **Risico:**
middel, hoort samen met V8 en met dezelfde nameting.

## 4. Wat ik zou doen

**Eerst V7.** Acht van de twaalf pagina's zijn geschreven zonder aangewezen lezer, terwijl de
copywriter "schrijf vanuit de situatie van de lezer" zijn belangrijkste punt noemt. Dit is de enige
plek waar zijn nummer 1 een harde, meetbare oorzaak heeft, en de oplossing zit vóór de dure
schrijfaanroep. Zonder V7 hebben V8, V9, V11 en V12 geen fundament, want ze veronderstellen allemaal
dat er een lezer bekend is.

**Daarna V2, V3 en V5 als schoonmaakronde.** Samen ongeveer anderhalve dag, alle drie met een test
die vandaag meteen aanslaat, alle drie zonder risico voor de vindbaarheid.

**Daarna V9 en V4 samen**, want dat is één onderwerp: van feit naar betekenis, met de woorden van de
klant als vertrekpunt.

**Dan V8, V1 en V10 als één blok, met nameting.** Alle drie verschuiven ze de merknaam of de
vraagvorm, en alle drie raken ze aan wat een AI-assistent oppakt. Die drie moeten samen gemeten
worden, niet los.

**V6 en V12 het laatst**, want die vragen het meeste oordeel over waar de grens ligt.

En doorlopend: **de vakmanschapsbeoordelaar leren onderscheiden.** Zijn niveau klopt, zijn
rangschikking niet (+0,19). De twaalf oordelen van de copywriter zijn daarvoor het materiaal, en
dat is de eerste keer dat dat materiaal er is.
