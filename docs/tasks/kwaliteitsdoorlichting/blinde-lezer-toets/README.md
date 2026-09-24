# Toets van de blinde lezer (fase 0.5), 23 september 2026

**Vraag:** kunnen we de losse beoordelaar vertrouwen voordat hij de doorloop beoordeelt?

**Opzet.** Eén bestaande pagina van ORBIT ENGINE (`basis.md`, Van den Udenhout, wagenparkbeheer,
geschreven op 23 september 2026) en vijf kopieën met elk precies één ingebouwde fout:

| Variant | Ingebouwde fout |
|---|---|
| `f1.md` | een verzonnen belofte: gemiste omzet volledig terugbetalen en vijf jaar garantie |
| `f2.md` | een openingsalinea met holle zelfpromotie in plaats van het antwoord |
| `f3.md` | een sectie met gemeenplaatsen die op elke concurrentensite kan staan |
| `f4.md` | de aanspreekvorm wisselt halverwege van je naar u (met taalfouten als bijvangst) |
| `f5.md` | een alinea zonder inhoud |

De beoordelaar is Claude, in een afgeschermde opdracht per beoordeling: alleen de tekst en het doel
van de pagina, de expliciete opdracht alle andere context te negeren, en geen toegang tot andere
bestanden. Zie `opdracht-voorbeeld-enkel.md` en `opdracht-voorbeeld-paar.md`.

⚠️ **Beperking.** De beoordelaar draait binnen dezelfde werkomgeving als de rest van de
doorlichting. Hij krijgt de opdracht alles buiten het bestand te negeren, maar een volledig schone
omgeving is het niet. Zijn oordelen lezen niet als die van iemand die de app kent (hij noemt
bijvoorbeeld geen enkele interne regel), maar bewezen is dat niet.

## Uitslag

| Proef | Norm | Uitkomst | Gehaald? |
|---|---|---|---|
| Vindt hij de ingebouwde fout? | minstens 4 van 5 | 5 van 5 (vier keer als eerste of tweede probleem, één keer als vijfde) | ja |
| Kiest hij in een vergelijking de goede tekst, in beide volgordes? | minstens 9 van 10 | 10 van 10, zekerheid 4 of 5 | ja |
| Geeft hij dezelfde tekst twee keer hetzelfde oordeel? | ongeveer gelijk | 50 en 44, beide "na aanpassing" | ja, met een spreiding van 6 punten |
| Zet hij elke slechtere versie lager dan het origineel? | 5 van 5 | 2 van 5 (46, 54, 52, 46, 56 tegen gemiddeld 47) | **nee** |

## Wat dit betekent

**Vergelijken en fouten aanwijzen werkt, losse cijfers niet.** De beoordelaar ziet elke fout en
kiest in een directe vergelijking altijd de betere tekst. Maar zijn totaalcijfer schommelt met zes
punten op dezelfde tekst, en een tekst met een holle openingsalinea kreeg een hoger cijfer dan het
origineel, terwijl hij die alinea zelf als zwaarste probleem aanwees. Een los cijfer van deze
beoordelaar zegt dus niets over welke tekst beter is.

**Gevolg voor de doorloop:** de eindbeoordeling rust op vergelijkingen (onze pagina tegen de
huidige pagina van de klant en tegen de beste concurrent, elke keer in beide volgordes) en op de
lijst met problemen met citaten. De cijfers worden wel verzameld, maar niet gebruikt om te
rangschikken.

## Bijvangst: wat de beoordelaar vond in de echte pagina

Alle zeven losse beoordelingen noemden dezelfde problemen in de ongewijzigde pagina van de app. Dat
zijn geen ingebouwde fouten, dat is wat ORBIT ENGINE zelf schreef:

1. **Tegenstrijdige beloftes** (7 van 7 keer): "binnen vier uur vervangend vervoer" en "nooit meer
   dan één auto zonder vervanging" naast "tegen meerprijs" en "hangt af van de afspraken".
2. **Een aangekondigd rekenvoorbeeld dat er niet staat** (7 van 7).
3. **Definities die de doelgroep niet nodig heeft** ("APK is de periodieke keuring van een
   voertuig", "Schadeafhandeling is de begeleiding van schadezaken") (7 van 7).
4. **De opening "Ja."** op een vraag die de lezer nergens ziet (6 van 6; in `f2` was die opening vervangen).
5. **Herhaling** van de planning en de prijs (7 van 7).
6. **Bijna elke alinea begint met de merknaam**, met wisselend perspectief tussen merknaam en "wij" (7 van 7).
7. **Een afsluiter zonder concrete volgende stap** en zonder bewijs (7 van 7).

Deze zeven zijn de eerste kandidaten om in de doorloop op te letten.
