# Kwaliteitsdoorlichting: de pijplijn stap voor stap

> **Wat dit is.** Het werkdossier van de doorloop uit `docs/tasks/kwaliteitsdoorlichting-pijplijn.md`:
> per stap wat erin ging, wat eruit kwam, wat het kostte, wat de meetlat van de app zegt, wat de
> blinde lezer ervan vindt (nagetrokken), en welke verbeterpunten eruit volgen. De verbeterpunten
> zelf staan genummerd in `docs/tasks/bevindingen-kwaliteitsdoorlichting.md` (hieronder als **B1** tot
> en met **Bn**). Dit document is doorlopend: het groeit mee met de doorloop.
>
> **De drie merken.** A = Hans Verstraaten Hoveniers (Eindhoven), B = Wesley Keeris
> Installatietechniek (Geldrop), C = Autorijschool Pompert (Eindhoven). Id's en accounts: zie de
> kop van de bevindingenlijst.
>
> **Hoe het gemeten is.** Alle cijfers komen uit `ai_calls` op productie, sinds migratie 0112 met de
> volledige opdracht (`input_json`). Het spoor per merk is op te halen met
> `GET /api/beheer/spoor/[profileId]`. De blinde lezer is Claude in een afgeschermde opdracht per
> beoordeling (zie `kwaliteitsdoorlichting-pijplijn.md` §4, 0.5): hij vond 5 van 5 ingebouwde fouten en
> koos in 10 van 10 vergelijkingen de betere tekst, maar zijn losse cijfers rangschikken niet. Elk
> "verzonnen"-oordeel van hem is nagetrokken; waar hij ongelijk had staat dat erbij.

---

## Tijdlijn

| Tijd (UTC) | Wat |
|---|---|
| 23 sep 21:26 | Drie merken aangemaakt via het scherm "Nieuw merk" (consultant) |
| 21:27 tot 21:50 | Merkonderzoek, ongeveer 10 minuten per merk |
| 21:45 | Gesprek A ingevoerd; fout B1 ontdekt (gegevens stil verloren) |
| 21:55 | Fout B2 ontdekt (A had nul onderwerpen) |
| 22:10 | Reparaties live (PR #108), gesprek A, B, C (opnieuw) ingevoerd |
| 22:20 | Uitsluitingslijsten als consultant gecorrigeerd (B3) |
| 22:25 | Per merk één cluster gestart, merken toegewezen aan het klantaccount |
| 22:40 | Meetvragen klaar, beoordeeld door de blinde lezer |
| 24 sep 05:10 | Metingen gestart (A per ongeluk door de consultant via het script, B en C via het scherm) |

---

## Stap 1. Merk aanmaken

**Wie:** consultant, scherm `/merk/nieuw`. Drie velden: naam, website, andere schrijfwijzen.

| | A | B | C |
|---|---|---|---|
| Schrijfwijzen opgegeven | Verstraaten Hoveniers; Hans Verstraaten | WK Installatie; WK Installatietechniek; Wesley Keeris | Rijschool Pompert; Pompert |

**Bevindingen:** geen. Het scherm is helder.

## Stap 2. Vooronderzoek en de website lezen (geen AI)

| | A | B | C |
|---|---|---|---|
| Pagina's op de site (eigen telling) | ~70 (45 pagina's, 23 blogs) | ~23 | ~15 in het menu, 7 in de sitemap |
| Gelezen door de app (`profile_pages`) | **1** | 23 | 108 |
| Gemiddelde tekst per pagina | 3.359 tekens | 829 tekens | 2.183 tekens |
| Tijd | 3 min | 5 min | 1 min |

**Bevindingen:**
- A: 1 van ~70 pagina's, zonder waarschuwing op het scherm (**B4**).
- C: 108 adressen, waarvan tientallen fotobijlagen, tags en auteurs (**B10**).
- B: de site weigert te snelle bezoekers (HTTP 429 bij onze eigen download), de app kwam wel binnen.
- Het voortgangsscherm zegt "klaar" en "nog minder dan een minuut" terwijl er stappen wachten (**B14**).

## Stap 3. Merk en markt leren kennen (`profile_research`, Luna, redeneren laag, met websearch)

| | A | B | C |
|---|---|---|---|
| Sitetekst in de opdracht | 4.929 tekens | 31.585 tekens | 61.945 tekens |
| Invoertokens (met zoekresultaten) | 14.753 | 27.070 | 27.132 |
| Kosten | $0,012 | $0,013 | $0,013 |

**Wat de opdracht vraagt** (systeemopdracht 2.098 tekens, één promptversie): branche, aanbod, toon,
persona's, waardeproposities, 3 tot 5 concurrenten, merknaam, bedrijfsmodel, bereik en werkgebied,
en letterlijke bewijspunten en stijlvoorbeelden "uitsluitend op basis van de website-tekst".

**Blinde lezer:** A, B en C allemaal "met gebreken".
- A: te smal (alleen particulieren; de site noemt ook bedrijven, scholen, parken); ruim de helft van
  het aanbod ontbreekt (gevolg van B4).
- C: het sterkste bewijs "93 procent geslaagd" ontbreekt, terwijl het op 3 gelezen pagina's staat
  (**B7**, nagetrokken); familiebedrijf en autisme als doelgroep ontbreken.
- ❌ Onterecht (nagetrokken): C "werkgebied Best, Geldrop, Helmond, Waalre verzonnen" (er zijn vier
  plaatspagina's), B en C "stijlvoorbeelden verzonnen" (de zinnen staan op de site), A "binnen 4 uur
  verzonnen" (staat op de site). De lezer had een onvolledige kopie van de site.

## Stap 4. Het aanbod als boom (`profile_offering`, Luna, laag)

| | A | B | C |
|---|---|---|---|
| Invoer | **1.354 tokens** | 5.828 | 13.082 |
| Uitvoer | 2.379 tokens | 4.708 | 2.417 |

**Blinde lezer:** A **onvoldoende** (ongeveer vijftien diensten met een eigen pagina ontbreken;
"werkgebieden niet vermeld" terwijl er plaatspagina's zijn), B en C met gebreken.
- B: "ventilatie laten schoonmaken" als dienst, uit een adviesregel op de site (**B9**, nagetrokken).
- C: losse les "€ 76" is fout (de site: € 77 tot € 79 in pakketten van 20, 10 of 5 uur; € 76 is de
  automaatprijs); theoriecursus als onzeker weggezet terwijl de homepage hem noemt.

## Stap 5. Concurrenten en marktbronnen (`profile_market`, Luna, laag, websearch)

Invoer 34.000 tot 40.000 tokens per merk (vooral zoekresultaten), $0,014 tot $0,015.

**Blinde lezer:** alle drie met gebreken.
- A: noemt het bedrijf "minder ecologisch" dan een concurrent, terwijl de site sterk groen is.
- B: raadt de schrijver af de eigen CO-certificering en de 8,1 uit 74 reviews te gebruiken, terwijl
  die op de site en bij Trustoo staan.
- C: zet het slagingspercentage en de prijs niet naast die van de concurrenten.

## Stap 6. Onderwerpen voorstellen (`propose_topics`, Luna, laag)

Eerst als concept (vóór het gesprek), daarna definitief (na het gesprek). Invoer ~1.000 tot 1.900
tokens.

| | Concept (voor het gesprek) | Definitief (na het gesprek) |
|---|---|---|
| A | tuin aanleggen, ontwerp, onderhoud, bestrating, beregening (algemeen) | complete tuin met bestrating, oude tuin renoveren, **zwemvijver**, nieuwbouwtuin, beregening |
| B | **waterontharder** bovenaan, dan airco, ventilatie, badkamer, vloerverwarming | **hybride warmtepomp**, ketelvervanging, onderhoud voor woningen en VvE's |
| C | **automaat** bovenaan, theorie, praktijkexamen | **faalangst**, **autisme en ADHD**, automaat, laatbeginners, simulator |

**Het gesprek werkt**: de definitieve onderwerpen volgen de groeidoelen. Wel: bij A mislukte de
eerste definitieve ronde en had het merk nul onderwerpen (**B2**, opgelost).

**Blinde lezer op de concepten:** B **onvoldoende** (het menu van de site, zonder plaats of koopvraag;
"ventilatie schoonmaken" bestaat niet als dienst), A en C met gebreken (algemeen, zonder invalshoek).

## Stap 7. Wat AI-assistenten al weten (`llm_baseline_*`, Luna, 11 aanroepen per merk)

Zes herkenningsvragen, drie categorievragen, één verwarringsvraag, één citaatvraag. ~$0,065 per merk.

**Blinde lezer:** C **onvoldoende**, A en B met gebreken.
- Alle drie: het dossier meldt "herkend bij 5 (of 4) van 6", terwijl meerdere antwoorden het
  bedrijf niet kennen of alleen uit de naam gokken (**B6**, oorzaak in `knowsBrand()`).
- C: bij een faalangstvraag noemt de AI de concurrent Feka en niet Pompert; niet als bevinding
  opgepakt. Twee adressen en drie naamvarianten online, ook niet opgepakt.
- A: een tweede handelsnaam en een klacht uit juni 2025 in de antwoorden, niet opgepakt.
- De verwarringsvraag vulde de uitsluitingslijst met het merk zelf (**B3**).

## Stap 8. Het dossier (`profile_synthesis`, **Sol**, redeneren middel)

| | A | B | C |
|---|---|---|---|
| Invoer | 2.201 tokens | 7.151 | 10.468 |
| Kosten | $0,016 | $0,031 | $0,035 |

**Blinde lezer:** A **onvoldoende**, B en C met gebreken. Fouten uit eerdere stappen gaan
onveranderd mee (werkgebied, "5 van 6 herkend"); citaten staan er niet letterlijk in zoals op de site
(telefoonnummer anders geschreven, HTML-code in een citaat); open vragen aan de klant die de site al
beantwoordt.

**Totaal merkonderzoek:** 16 aanroepen, A $0,111, B $0,125, C $0,129.

## Stap 9. Het gesprek (consultant, scherm `/merk/[id]/admin/onboarding`)

Vijftien velden per merk, ingevuld uit het bevroren waarheidsdossier (buiten de repo), plus de
strategie en "Gesprek vastleggen en onderwerpen definitief maken".

**Bevindingen:**
- Gegevens stil verloren bij lijsten en keuzes (**B1**, opgelost en nagemeten).
- Het blok met de naamuitsluitingen klapt dicht als het "compleet" is (**B11**); de uitsluitingen
  bevatten het merk zelf (**B3**). Als consultant gecorrigeerd.

## Stap 10. Toewijzen aan de klant (consultant, `/merk/[id]/admin/toewijzen`)

Werkt. Het scherm zegt zelf "Maak het klantaccount aan in Supabase": dat is de huidige werkwijze.
**Bevinding:** de klant ziet daarna "Nieuw merk" en het hele formulier (**B13**).

## Stap 11. Cluster starten en meetvragen opstellen (`topic_research`, `prompts`, `volume_calibration`)

Per merk: 1 `topic_research` (~13.000 tot 18.000 tokens, $0,012), **6 tot 7** `prompts`-aanroepen
voor 30 vragen (samen ~$0,003), 1 `volume_calibration`.

**Meetlat van de app:** alle 30 vragen actief, allemaal met een geschat volume.

**Blinde lezer:** A met gebreken, **B onvoldoende**, C met gebreken. Realistisch 12, 10 en 17 van de
30; 14 tot 16 per merk in feite dubbel; 30 van 30 met plaatsnaam (**B8**).

**Oorzaak gevonden dankzij de opname van opdrachten:** B's groeigebieden staan in 0 van 30 vragen,
omdat de opdracht eerst hard eist dat ALLE vragen over Geldrop of Eindhoven gaan en daarna zacht
vraagt "een deel" over de groeiplaatsen (**B5**). Alle 7 aanroepen kregen beide regels.

## Stap 12. Akkoord en meting

**Wie:** het conceptscherm toont de klant "Bevestig en start de meting", maar alleen de consultant
mag starten (**B12**).

**Wat er gepland wordt per cluster:** 166 taken: 46 ChatGPT-simulaties (`measure_simulate`, met
websearch), 90 Google AI-overzichten via DataForSEO (drie per vraag), 30 Gemini-antwoorden via
DataForSEO.

| Meting A (stand 24 sep 05:30) | Aantal | Kosten |
|---|---|---|
| ChatGPT-simulaties | 46 | $0,590 |
| Vermeldingsbeoordelingen | 115 | $0,033 |
| Google AI-overzichten | 90: 71 gemeten, 15 geen overzicht, 4 mislukt | $0,350 |
| Gemini via DataForSEO | 30: **30 mislukt** ("rate_limit_exceeded") | $0,000 |
| **Samen** | | **~$0,97** |

**Bevindingen:**
- De Gemini-meting viel bij alle drie de clusters bij de eerste poging volledig uit op een limiet van
  de leverancier: 90 van 90 (**B17**). De takenlaag probeert opnieuw; nog na te gaan of dat lukt en
  of het rapport zegt dat Gemini ontbrak.
- Google AI-overzichten: 12 keer "Internal SE Server Error" bij de eerste poging.
- De vermeldingsbeoordeling gaf een paar keer hardop denken ("We need ou…") in plaats van JSON
  (**B18**); de herhaling vangt het op, maar de mislukte uitvoer wordt niet bewaard.
- Voortgang om 05:39: A 115, B 118, C 115 van 166 taken; de rest wacht op Gemini.

**Afloop (24 september, 06:00).** Alle 90 Gemini-taken gaven na vier pogingen definitief op. Daarna
bleven alle drie de analyses op "meten" staan: de aggregatie werd na een opgegeven Gemini- of
Google-taak nooit ingepland (**B19**, opgelost in PR #110). Met de hand ingepland om 06:05; om 06:10
waren alle drie gereed. Het rapport zegt nergens dat Gemini ontbrak. Gemini telt niet mee in de
score; hoe het scherm "Zichtbaarheid in AI" een bron zonder metingen toont, is nog niet bekeken.

---

## Stap 13. Rapport en aanbevolen pagina's (`gap_analysis` en `report`, Luna)

| | A hovenier | B installateur | C rijschool |
|---|---|---|---|
| Score ChatGPT (gewogen) | 15 (17) | 20 (23) | 0 (0) |
| Score Google AI Overview | 27 | 15 | 23 |
| Invoer rapport (tekens) | 28.705 | 28.887 | 39.706 |
| Kosten gap + rapport | $0,006 | $0,006 | $0,006 |
| Aanbevelingen (eerste versie, na reparatie) | 5 | 5 | 8 |
| Zinnen geschrapt door de naamcontrole, eerste versie | 17 | 17 | 15 |
| Idem na PR #111 en #112 | 0 | 0 | 0 |

**Wat de app zelf fout deed en is gerepareerd (zelfde dag):**
- De naamcontrole schrapte elke zin over wie een vraag wint, ook de juiste: 49 zinnen, 47 juist
  (**B20**, PR #111). Een eigen product telde als concurrent en een naam met "(VSB)" werd afgekeurd
  (**B21**, **B23**, PR #112).
- Het rijschoolrapport opende met "niet genoemd, 0 op 100" terwijl Google hem in 17 van 74 antwoorden
  noemde (**B22**, PR #111 en #112).
- De clusternamen in het rijschoolrapport begonnen met "V1" plus een kastlijntje (PR #111).
- De drie rapporten zijn na de reparaties opnieuw gemaakt; de oude versies staan bewaard als periode
  -1 en -2 in `reports`.

**Wat de klant op het scherm ziet.** Als klant stuurt `/analyses/[id]/rapport` door naar de
clusterlijst. Daar staat het cluster met "0% zichtbaarheid" (rijschool), maar de kaart was niet aan
te klikken (**B25**, opgelost). Als consultant ziet dezelfde pagina nul clusters en een knop
"Start het eerste cluster" (**B26**, open).

**Blinde poort.** Drie onafhankelijke lezers (Claude, blind voor de app) kregen per merk: wat de
ondernemer wil (uit het waarheidsdossier), de eigen kopie van de site, de lijst pagina's die de app
kende, de meetgegevens onder het rapport en het rapport zoals de klant het krijgt. Opdracht en
oordelen staan in de kladmap (`doorlichting/poort13/`), niet in de repo.

| | A | B | C |
|---|---|---|---|
| Samenvatting | met gebreken | met gebreken | met gebreken |
| Pagina's: maken met aanpassing / niet maken | 3 / 2 | 5 / 0 | 6 / 2 |
| "Nieuw of verbeteren" fout volgens de lezer | 4 van 5 | 3 van 5 | 3 van 8 |
| Volgorde klopt | nee | nee | nee |
| Klaar voor het contentplan | met aanpassingen | met aanpassingen | met aanpassingen |

Nagerekend voordat het hier staat: dat `/hovenier-in-best/` en `/hovenier-in-nuenen/` bestaan
(ja), dat de site van de hovenier een proefpagina met een adres in Jakarta en KvK 00000000 heeft
(ja), dat de menupagina "Rijles met faalangst & autisme" niet tussen de 108 bekende pagina's zit
(ja, **B28**), dat de rapportinvoer van de installateur zijn groeiplaatsen en feiten niet bevat
(ja, nul treffers, **B27**). Eén opmerking van lezer A klopt niet: hij las "30 vragen, 119
metingen" als tegenspraak. Dat is het niet, maar het laat wel zien dat een leek die twee getallen
naast elkaar niet begrijpt.

**De rode draad uit de drie oordelen:**
1. Het rapport stuurt op de meting en niet op de groeidoelen van de ondernemer (**B27**). Bij C
   drie van de acht adviezen voor plaatsen die geen groeiplaats zijn; bij B niets over de tweede
   groeidienst.
2. "Nieuw of verbeteren" klopt vaak niet, omdat de app de site onvolledig kent (**B4**, **B28**).
3. De adviezen vragen de ondernemer om feiten ("noem alleen bedragen die je kunt onderbouwen") die
   hij in het gesprek al gaf.
4. Bij B gaan vier van de vijf adviezen naar dezelfde pagina; alle drie de lezers vinden eigen
   pagina's per vraag sterker.
5. De score met marge ("15, plus of min 15") zegt de ondernemer niets; alle drie de lezers vragen om
   het gevolg in plaats van het getal.

---

## Stap 14. Contentplan (consultant, `/merk/[id]/strategie/plan`, geen AI)

**Voorwaarde: een pakket.** Zonder pakket staat er "Er is nog geen pakket gekozen". Het pakket zet de
consultant op `/merk/[id]/admin/toewijzen` onder "Verkoopafspraak": 10 pagina's per maand gekozen.
Het hangt aan het klantaccount, dus geldt voor alle drie de merken samen.

**Als klant geprobeerd.** Het scherm zei "stel je het plan zelf op" en de knop werkte, maar de server
weigerde (403) omdat alleen de consultant het plan opstelt (**B29**, opgelost in PR #114). Daarna als
consultant opgesteld, met een opmerking bij A ("vanaf februari word het druk met aanvragen, en de
zwemvijver willen we meer gaan doen") en C ("veel leerlingen met autisme of adhd, ouders bellen vaak
zelf"), bij B leeg. Beide opmerkingen komen letterlijk uit het waarheidsdossier.

| | A hovenier | B installateur | C rijschool |
|---|---|---|---|
| Pagina's in maand 1 (pakket 10) | 5 | 5 | 8 |
| Nieuw / verbeteren | 3 / 2 | 0 / 5 | 0 / 8 |
| Gepland op | 25 tot 28 september | 25 tot 28 september | 25 tot 28 september |
| Zelfde bestaande pagina meer dan eens | homepage 2x | `/warmtepomp` 4x | nee |

**Bevindingen:**
- De volgorde komt uit de meting (gewicht en potentie), niet uit het getal van het model. Bij A staan
  Best en Nuenen daardoor terecht bovenaan (**B24** heeft hier geen gevolg).
- De zwaarste gemiste vraag van B kreeg potentie 0 en kwam achteraan (**B30**, opgelost in PR #114).
  Opnieuw opzetten om dat na te rekenen lukte niet (**B32**, open).
- Vier verbeteringen van dezelfde pagina in dezelfde week (**B31**, open). De klant ziet in zijn
  overzicht geen adres per regel, dus merkt niet dat het om één pagina gaat.
- De fotobijlagepagina van C staat in het plan als "Leg uit hoe Pompert helpt bij voorbereiding op een
  faalangstexamen" (gevolg van **B28**).

## Stap 15. Maand vrijgeven (consultant)

De klant ziet "Deze maand wacht op jouw vrijgave" en in hetzelfde blok "Deze maand goedkeuren doet je
consultant bij Outer Orbit samen met jou". Klein, maar tegenstrijdig in één oogopslag. Als consultant
vrijgegeven: 5, 5 en 8 pagina's voorbereid, geen pagina zonder onderwerp.

Het venster zegt: "Beantwoord ze graag vóór 13 september om op schema te blijven." Het is 24
september. De eerste pagina staat op 25 september en de app rekent tien dagen schrijftijd plus twee
dagen voor de vragen; een plan dat op de 24e van de maand start, heeft zijn deadline dus al gehad.
**Richting:** een plan dat laat in de maand start, plant zijn eerste pagina's minstens twaalf dagen
vooruit, of het venster noemt dan geen datum in het verleden.

---

## Stap 16. Voorbereiding per pagina (`content_plan`: `item_dossier`, `content_contract`, `fact_atomise`, Luna)

Na het vrijgeven 18 taken (5, 5 en 8), samen ongeveer 17 minuten. Per pagina een itemdossier met
webzoeken (Luna, redeneren laag, rond $0,012 per pagina), een contract met de opzet van de pagina
(rond $0,002) en losse feiten. Bij de hovenier kwamen identieke feitenaanroepen twee keer voor (zelfde
invoer, zelfde lengte): goedkoop ($0,0002), maar tegen conventie 9 in. Daarna per merk één
briefingtaak (`content_brief`) die de vragen aan de klant opstelt.

## Stap 17. Vragen aan de klant (`/merk/[id]/strategie/vragen`)

| | A hovenier | B installateur | C rijschool |
|---|---|---|---|
| Open vragen (na opruimen, zie B36) | 22 | 23 | 25 |
| Waarvan verplicht | 7 | 10 | 5 |
| Vragen over het merk, zonder pagina | 13 | 12 | 14 |

**Bevindingen:**
- Vragen die het gesprek al beantwoordde, staan open (**B35**): monteurs, storingsdienst,
  onderhoudscontracten, werkgebied.
- Elk rapport zet zijn eigen vragen klaar, drie versies gaven drie varianten (**B36**).
- Elke pagina staat op dag één op "Loopt achter · vóór 16 september" (gevolg van **B33**).
- Eén vraag met "en" en "of" met een schuine streep ertussen (**B37**).
- Goed: de vragen per pagina zijn concreet en zeggen waarom ze gesteld worden ("Zonder prijs en
  betaalvorm kan de klant de onderhoudsdienst niet financieel beoordelen"), en er is overal een knop
  "Overslaan" met uitleg wat er dan gebeurt.

## Stap 18. Antwoorden als realistische klant

Antwoorden alleen uit het waarheidsdossier en de eigen site, kort, zonder opmaak; wat de ondernemer
niet paraat heeft, overgeslagen. Verstuurd met de klantsessie via dezelfde route als het scherm
(`PATCH /api/profiles/[id]/facts`). Antwoorden en log in de kladmap (`doorlichting/antwoorden/`).

| | Beantwoord | Overgeslagen |
|---|---|---|
| A hovenier | 16 | 6 |
| B installateur | 17 | 6 |
| C rijschool | 14 | 11 |

Wachttijd per antwoord: 0,3 tot 1,3 seconden, behalve het laatste antwoord van een pagina (9 tot 18
seconden, één keer meer dan 30), zie **B38**. Na het laatste antwoord startte het schrijven meteen voor
vier van de vijf pagina's van de hovenier. De vijfde ("Leg op de bestaande pagina uit welke plaatsen
en projecten het bedrijf bedient", dekking 33 procent) hield de app terecht tegen.

De ideale-klantvariant volgt later als wisselproef op twee pagina's.

---

## Nog te doen in deze doorloop

- Stap 19 tot en met 23: schrijfopdracht, eerste versie, keuring door de app, reparatierondes,
  goedkeuren; de vier blinde lezers en de blinde vergelijking met de huidige pagina en de beste
  concurrent.
- De ideale-klantvariant op twee pagina's, de wisselproeven en het verslag met hooguit vijf verbeteringen.
