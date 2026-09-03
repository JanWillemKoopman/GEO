# Wat er op meerdere pagina's misgaat

De twaalf losse beoordelingen gaan elk over één tekst. Dit bestand gaat over de schrijfpijplijn:
alleen de kritiek die op minstens drie van de twaalf pagina's terugkomt, want alleen dan zit de
oorzaak in het systeem en niet in de smaak van de beoordelaar.

Alle tellingen hieronder gaan over de geschreven pagina's zelf, dus over sectie 4 van elk
bronbestand, samen ongeveer 13.600 woorden. Ze zijn na te tellen.

## 1. Het bedrijf spreekt nergens zelf. Dit is de belangrijkste.

**Twee keer "wij" of "we" in 13.600 woorden.** Beide keren in een kop ("Dit kunnen we behandelen",
"Wat controleren we tijdens de dakinspectie?"), nul keer in een zin. Daartegenover: **164 keer de
merknaam in de derde persoon**, gemiddeld dertien keer per pagina van duizend woorden.

Zo klinkt dat:

> "MJB Dakservice vermeldt dat het bij een lekkage binnen 24 uur ter plaatse kan zijn."
>
> "Na de inspectie ontvangt de klant aanbevelingen op volgorde van urgentie."
>
> "Fysio Centrum Utrecht noemt vooraf geen vaste herstelduur, omdat die per persoon verschilt."

Dit is de pagina van de klant zelf. Daar hoort te staan: "Wij zijn er binnen 24 uur." Het huidige
resultaat leest als een productbeschrijving die iemand anders over dit bedrijf schreef, en dat is
precies het gevoel dat een bezoeker niet mag krijgen op de site waar hij moet gaan bellen.

De oorzaak is bekend en bewust: de schrijfprompt draagt het model op het bedrijf bij naam te
noemen, omdat een AI-assistent die "wij" leest niet weet welk merk hij moet citeren
(`lib/pipeline/content.ts` en `REPAIR_SYSTEM` regel 3). Dat is een goede regel voor de zinnen die
een AI-assistent oppakt. Hij is alleen absoluut toegepast, op elke zin van elke pagina, en daardoor
kost hij de hele merkstem.

Drie keer "de klant" op een klantpagina hoort in hetzelfde rijtje: "Na de inspectie ontvangt de
klant aanbevelingen op volgorde van urgentie." De lezer ís de klant.

## 2. De aanspreekvorm zwabbert, ook binnen één pagina

Over de twaalf pagina's: **95 keer "je" en 81 keer "u"**. Per klant loopt het door elkaar.

| Klant | Pagina's met "je" | Pagina's met "u" |
|---|---|---|
| MJB Dakservice | spoedpagina Zutphen, hoofdpagina daklekkage | Twello, isolatiemethode, renovatie |
| Fysio Centrum Utrecht | hardloopblessures, sportfysio, Leidsche Rijn, bekkenbodem | gratis consult, contact en boeken |

Het scherpst op de contactpagina van Fysio Centrum Utrecht, waar het binnen twee zinnen omslaat:

> "Ja. Bij Fysio Centrum Utrecht kun **je** rechtstreeks contact opnemen (...)"
>
> "Wilt **u** meteen boeken, vraag dan online een afspraak aan."

Daarna twintig keer "u". Er bestaat al een mechanisme voor (`describePronoun` in
`lib/pipeline/tone-sliders.ts`), maar het schrijft alleen een promptregel als
`profiles.pronoun_preference` gevuld is. Bij deze twee klanten was dat kennelijk niet zo, en dan
kiest het model per pagina opnieuw.

## 3. Ons eigen werkproces lekt de pagina in

Zinnen die over onze bronnen, ons oordeel of onze redactie gaan, en die op de site van de klant
terechtkomen. Zes echte gevallen, op vijf verschillende pagina's:

> "Controleer **vóór publicatie** en vóór je afspraak ook de actuele inschrijving van de behandelaar
> in het Register bekkenfysiotherapie." (bekkenbodem Utrecht)
>
> "De locaties worden op deze pagina niet inhoudelijk van elkaar onderscheiden." (gratis consult)
>
> "Dit beantwoordt het bezwaar: 'Ik hoor pas achteraf wat het kost.'" (dakinspectie Zutphen en Epe)
>
> "Bang dat u achteraf pas hoort wat een reparatie kost?" (renovatie en isolatie)
>
> "Een bevestigde totaalprijs of vanafprijs inclusief btw is niet beschikbaar." (spoedpagina
> Zutphen, plus drie soortgelijke op dezelfde pagina)
>
> "Deze bedrijfsgegevens vervangen nooit de inspectie van uw specifieke dak." (isolatiemethode)

Er bestaat al een vangnet hiervoor, `checkSourceTalk` in `lib/pipeline/content-gate.ts`, met elf
zoektermen. Geen van deze zes wordt erdoor gevonden: de eerste vier bevatten geen enkele term uit
de lijst, en "niet bevestigd" staat er alleen als "bevestigd feit" in.

## 4. Het beste antwoord van de klant overleeft de parafrase niet

Op vier pagina's is een letterlijk klantantwoord omgezet in een procedurezin, waarbij steeds de
reden wegviel. De reden was het overtuigende deel.

| Wat de klant zei | Wat er op de pagina staat |
|---|---|
| "Doorwerken over houtrot heen doen we niet, ook niet als de klant erom vraagt, want dan kunnen we onze garantie op het werk niet waarmaken." | "Wordt tijdens isolatiewerk schade gevonden, dan legt MJB Dakservice het werk stil, maakt foto's en meldt eerst de herstelkosten." |
| "Neem de schoenen mee waar je het meest op loopt, daar zien we vaak aan waar de belasting zit." | "Neem naar Fysio Centrum Utrecht een identiteitsbewijs, uw zorgverzekeringspas en de hardloopschoenen waarop u het meest loopt mee." |
| "Hoe lang herstel duurt zeggen we nooit vooraf, want we willen geen verwachting wekken die we niet waar kunnen maken." | "Fysio Centrum Utrecht noemt vooraf geen vaste herstelduur, omdat die per persoon verschilt." |
| "Wij werken met een vaste ploeg van vier eigen dakdekkers en besteden niets uit. Bij die andere bedrijven weet je vaak niet wie er komt." | Op drie van de zes MJB-pagina's helemaal niet gebruikt; op de andere drie als opsommingsonderdeel naast VCA en het aantal klanten. |

Het patroon is telkens hetzelfde: het feit blijft, de motivering verdwijnt, en de zin wordt van de
derde persoon. Dit is exact het verschil tussen een pagina die klinkt als de ondernemer en een
pagina die klinkt als een samenvatting van de ondernemer.

## 5. Expliciete klantinstructies worden niet nageleefd

Vier van de zes FCU-pagina's kregen dit antwoord mee:

> "Zet er geen adres bij, want we hebben twee vestigingen (...) Verwijs voor de adressen naar de
> contactpagina."

Twee van die vier zetten er toch een adres bij: de hardloopblessurepagina ("De twee Utrechtse
vestigingsadressen zijn Pablo Picassostraat 216 en Moreelsehoek 2") en de Leidsche Rijn-pagina, die
Pablo Picassostraat 216 twee keer noemt.

Dit is geen stijlkwestie maar een instructie die woordelijk in de invoer stond. Zolang zoiets kan
gebeuren, weet de klant niet wat zijn antwoorden waard zijn.

## 6. De pagina adviseert de lezer in plaats van hem te helpen kiezen

**72 zinnen** beginnen met "Vraag", "Controleer", "Laat", "Bespreek" of "Leg", op twaalf pagina's.
Op de hoofdpagina over daklekkage alleen al 23.

Op drie pagina's slaat dat door tot het punt waarop de tekst tegen de klant werkt:

> "Zo vergelijk je dakdekkers eerlijk. Controleer acht punten (...) Gebruik in Zutphen en Deventer
> dezelfde checklist." (spoedpagina Zutphen)
>
> "Die algemene inschrijving is niet automatisch hetzelfde als registratie in een deelregister
> bekkenfysiotherapie, dus vraag bij het plannen naar de controleerbare registratie van je
> behandelaar." (sportfysio en bekkenklachten)
>
> "Controleer (...) de actuele inschrijving van de behandelaar in het Register bekkenfysiotherapie."
> (bekkenbodem Utrecht)

Wij geven de bezoeker op de site van de klant een boodschappenlijstje mee om de klant zelf te
controleren, en op twee pagina's een link naar de beroepsvereniging om het na te trekken. Dat is
uitstekende consumentenvoorlichting en het is de verkeerde pagina ervoor.

Hetzelfde mechanisme in de bijsluitervorm: **achttien keer "niet automatisch"**, waarvan zeven op
de pagina over het gratis medisch consult. Dat is de pagina die een gratis aanbod moet uitleggen.

## 7. Woordenboekzinnen midden in de lopende tekst

Op acht van de twaalf pagina's staan definities van vaktermen ingevoegd tussen twee inhoudelijke
zinnen. Op de dakinspectiepagina zijn het er tien op 850 woorden:

> "Dakbeschot draagt de bedekking. Loodwerk dicht aansluitingen af."
>
> "Ventilatie voert vochtige lucht af."
>
> "Houtrot is aantasting door langdurig vocht. Condens ontstaat wanneer waterdamp afkoelt."

En bij Fysio Centrum Utrecht:

> "Sportfysiotherapie richt zich op sportklachten. Sportrevalidatie ondersteunt de terugkeer naar
> sport."
>
> "Een afspraakaanvraag is een verzoek om een moment in te plannen."

De bedoeling is goed, jargon uitleggen hoort. Maar een mens zet zo'n uitleg tussen komma's in de
zin waar het woord staat, of in een kader onderaan. Zo neergezet hakken ze het ritme aan stukken,
en sommige leggen niets uit ("Sportfysiotherapie richt zich op sportklachten").

## 8. Zes van de twaalf openen met "Ja"

> "Ja. MJB Dakservice kan bij een daklekkage in Zutphen binnen 24 uur ter plaatse zijn."
>
> "Ja. Bij Fysio Centrum Utrecht kunt u in Utrecht eerst een gratis medisch consult aanvragen (...)"

Op een pagina met een vraag als kop is dat sterk. Vijf van deze zes zijn landingspagina's of
artikelen waar niemand een vraag gesteld heeft, en dan is "Ja." een antwoord op een vraag die de
lezer niet kent.

Belangrijker dan het woordje "Ja": **elf van de twaalf openingen beginnen bij het merk of bij de
beschikbaarheid, niet bij de lezer.** "Bij Fysio Centrum Utrecht kun je terecht voor", "MJB
Dakservice helpt in Twello bij", "In Apeldoorn kun je MJB Dakservice bellen". Eén opening begint
bij de situatie van de lezer, en dat is dan ook de best geschreven pagina van de twaalf: "Bij een
oud hellend dak kunnen de dakpannen meestal blijven liggen wanneer u van binnenuit isoleert."

## 9. Het bewijs staat op de verkeerde plek, of is niet gebruikt

Wat er beschikbaar was en niet gebruikt is:

- **€ 250 vanafprijs** voor een reparatie, door de klant bevestigd inclusief wat erin zit. De
  briefing vroeg er expliciet om. Komt op geen enkele MJB-pagina voor.
- **Spoedhulp in avond, nacht en weekend**, door de klant met "ja" bevestigd. De pagina schrijft dat
  de bezoeker het zelf maar moet navragen.
- **86 procent haalde zijn doel binnen vijf behandelingen** en **2.200 patiënten gaven een 9,2 of
  9,4**. Op twee van de zes FCU-pagina's gebruikt, op vier niet, waaronder de nieuwe
  hardloopblessurepagina.
- **Geen wachtlijsten.** Nergens gebruikt, terwijl de gemeten vraag letterlijk over wachttijd ging.
- **De namen van de therapeuten.** Vijf therapeuten stonden met opleiding en achtergrond in de
  invoer, onder wie een fysiotherapeut die zelf hardloopt en gespecialiseerd is in knie, enkel en
  heup. Op zes FCU-pagina's staan twee voornamen, geen enkele achternaam. Het AI-antwoord waar FCU
  het van verliest, noemt de concurrent met voor- en achternaam.

## Wat ik hieruit zou concluderen

De keuring die na de reparaties van PR #53 en #54 nog alle twaalf pagina's blokkeert, meet iets
anders dan wat er werkelijk mis is. Van de negen patronen hierboven raakt er precies één aan
herleidbaarheid: patroon 3, en dan alleen de vier zinnen met "niet bevestigd" erin. De andere acht
gaan over stem, volgorde en durf, en die zou een keuring op herleidbare zinnen allemaal met een
voldoende laten passeren.

Anders gezegd: **het percentage herleidbare zinnen kan naar 100 zonder dat één van deze twaalf
pagina's beter wordt om te lezen.** De twee grootste problemen, dat het bedrijf nooit zelf spreekt
en dat de sterkste zinnen van de ondernemer in parafrase sneuvelen, maken een pagina zelfs
herleidbaarder naarmate ze erger worden.

⚠️ **Bijgesteld op 3 september, ná de beoordeling door een echte copywriter.** Hij komt op dezelfde
diagnose uit ("de teksten informeren beter dan ze overtuigen", op 12 van de 12) maar op hogere
cijfers dan deze ronde, en op één punt kijkt hij scherper: waar ik tel wat er misgaat, wijst hij aan
wat er ontbreekt. Zijn drie zwaarstwegende punten zijn schrijven vanuit de situatie van de lezer,
feiten omzetten naar betekenis, en 25 tot 40 procent van de informatie schrappen. Geen daarvan is
een telling en alle drie wegen ze zwaarder dan de negen patronen hierboven. Zijn volledige oordeel
staat in [`copywriter-extern-3-september-2026.md`](copywriter-extern-3-september-2026.md).

Wat er met allebei de rondes gedaan wordt staat in `docs/tasks/contentkwaliteit-copywriterronde.md`,
met de twee keuzes die eerst bij de eigenaar liggen.
