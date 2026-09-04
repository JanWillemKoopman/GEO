# Opdracht: zes nieuwe artikelen schrijven en klaarleggen voor beoordeling

**Voor een nieuwe Claude Code-sessie.** Geschreven op 4 september 2026, na de expertronde. Verwijder
dit bestand zodra de zes artikelen er staan en het resultaat in `docs/logbook.md` beschreven is.

---

## De opdracht in één alinea

Laat de contentpijplijn **zes volledig nieuwe artikelen** schrijven, op productie, en leg ze in één
markdownbestand in `content-reviews/` zodat een externe copywriter ze blanco kan beoordelen. Precies
hetzelfde soort bestand als `content-reviews/copywriter-opdracht-alle-twaalf.md`, alleen met zes
nieuwe pagina's in plaats van de twaalf van 3 september. Beantwoord vóór het schrijven de vragen die
voor de klant nog openstaan, want de pijplijn schrijft anders om die gaten heen.

---

## 1. Lees dit eerst, in deze volgorde

1. **`CLAUDE.md`**, de werkregels. Kort, en ze overrulen je gewoontes.
2. **`docs/contentpijplijn-overdracht.md`**, wat de pijplijn doet en waarom. Sinds 4 september staat
   daar een nieuwe stap in (§5b, de schrijfopdracht) en een nieuwe stap 12 (de versievergelijking).
3. **`docs/tasks/optimalisaties-expertronde-4-september-2026.md`**, wat er net gebouwd is en wat
   bewust niet. Dit is de reden dat deze ronde er komt.
4. **`content-reviews/copywriter-opdracht-alle-twaalf.md`**, het bestand dat je nadoet. Lees vooral
   de kop en één paginablok, dan weet je de vorm.
5. **`docs/tasks/benchmarkronde-twee-klanten.md`** §3 en §5, hoe de vorige ronde is uitgevoerd en wat
   er als klant is ingevuld.
6. **`scripts/live.ts`**, de kop ervan. Zo bedien je de live app zonder browser.

---

## 2. ⚠️ Eén ding uitzoeken vóór je ook maar iets start

**Staan de optimalisaties van 4 september op productie?** Ze zijn gebouwd op de branch
`claude/orbit-contentpijplijn-feedback-monriz` en `main` is productie. Zolang die branch niet
gemerged en gedeployd is, meet deze ronde de OUDE pijplijn en is hij zijn geld niet waard.

Controleer het, en zeg het hardop in je eerste antwoord:

```bash
git log origin/main --oneline | head -5
git log origin/main --oneline | grep -c "optimalisatie"
```

Staat het er niet op, leg dat dan aan de eigenaar voor en wacht. Dit is de enige vraag in deze
opdracht die de uitkomst wezenlijk verandert, dus hierover mag je stoppen en vragen.

---

## 3. Waar de zes artikelen vandaan komen

**Verzin geen paginatitels.** Welke pagina's er nodig zijn, komt uit de meting, en titels vooraf
bedenken slaat precies de stap over die deze ronde moet meten.

Er staan vier clusters klaar van de twee benchmarkklanten, met per cluster vijf tot zeven
aanbevelingen waarvan er drie geschreven zijn. Er liggen dus genoeg ONGESCHREVEN aanbevelingen voor
zes nieuwe pagina's, zonder dat er een nieuwe meetronde nodig is:

| Analyse | Klant | Cluster | Geschreven | Aanbevelingen totaal | Openstaande klantvragen |
|---|---|---|---|---|---|
| `8f301aef-8a5c-4130-91ae-5be720601448` | MJB Dakservice | daklekkage verhelpen | 3 | 7 | 6 |
| `467968f3-ab2e-413c-8f2a-c94357f497bd` | MJB Dakservice | dakrenovatie en dakisolatie | 3 | 6 | 7 |
| `ec7d3329-4893-4ee3-9034-cbdf611cfdf5` | Fysio Centrum Utrecht | hardloopblessure behandelen | 3 | 5 | 7 |
| `9013d0fd-ee98-4dce-92b2-35c6a440c8ff` | Fysio Centrum Utrecht | bekkenfysiotherapie | 3 | 6 | 6 |

(Nagemeten op productie op 4 september 2026. Controleer de tellingen zelf, neem ze niet over:
`CLAUDE.md` verbiedt een cijfer uit documentatie zonder verificatie.)

**Kies zes aanbevelingen die nog niet geschreven zijn**, verdeeld over de vier clusters en over
allebei de klanten, zodat de copywriter ook kan zien of pagina's van dezelfde klant op elkaar gaan
lijken. Neem per cluster de hoogst geprioriteerde die nog vrij is. Zijn er in een cluster geen vrije
aanbevelingen meer, vul dan aan uit een ander cluster van dezelfde klant en schrijf op dat je dat
gedaan hebt.

**Nieuwe pagina's, geen herschrijvingen van de twaalf.** Een aanbeveling die al een
`content_pieces`-rij heeft, valt af.

---

## 4. Beantwoord eerst de openstaande vragen aan de klant

Dit is het deel dat de vorige ronde niet had en dat de eigenaar expliciet vraagt. Er staan
zesentwintig vragen open over de vier analyses. Zolang die openstaan, schrijft de pijplijn om het gat
heen, en dan meet je de omgang met een gat in plaats van de kwaliteit van de tekst.

**Hoe je dat doet:** je acteert als de klant, niet als de app. Beantwoord wat een dakdekker of een
fysiotherapeut echt zou weten, in zijn eigen woorden, met de reden erbij waarom hij iets zo doet. Die
reden is het waardevolste deel: `lib/pipeline/klantcitaten.ts` zoekt er expliciet naar, en de
schrijfopdracht kiest er het citaat uit dat geen concurrent kan kopiëren.

Drie regels, en houd je er streng aan:

1. **Blijf bij wat er al vaststaat.** De antwoorden van 3 september staan in `fact_requests` en in
   `docs/tasks/benchmarkronde-twee-klanten.md` §3. Een nieuw antwoord mag een oud antwoord nooit
   tegenspreken, anders staan er twee waarheden op de feitenkaart.
2. **Verzin geen cijfers om de dekking op te krikken.** Een overgeslagen vraag is een geldig antwoord
   en laat zijn sectie vervallen. Dat gedrag hoort deze ronde te laten zien.
3. **Sla er bewust één of twee over**, verdeeld over de twee klanten, precies zoals de vorige ronde
   deed. Dan is zichtbaar wat er met een openstaande vraag gebeurt, en dat is informatie.

Noteer per vraag of je hem beantwoord hebt en of het antwoord uit de site van de klant komt of dat
jij het als klant hebt ingevuld. Dat onderscheid gaat mee in het logboek, want het bepaalt of deze
teksten publiceerbaar zouden zijn.

---

## 5. De ronde draaien

Volgorde per pagina, via `npm run live` op productie:

1. Aanbeveling kiezen en de planstap laten lopen (onderzoek plus inhoudsopgave).
2. De briefingvragen beantwoorden die eruit komen, volgens §4 hierboven. **Bewuste stop.**
3. "Schrijf mijn pagina's" starten.
4. Wachten tot de keuring en de eventuele reparatierondes klaar zijn.

**Wat dit kost.** Eén pagina kost van onderzoek tot en met reparatie ongeveer $0,65 op Terra, plus de
twee nieuwe stappen van samen ongeveer $0,015. Zes pagina's is dus ongeveer $4, en dat is een raming
en geen meting: reken het na op `ai_calls` als de ronde klaar is, met `kind` en `cost_usd`, en zet
het echte bedrag in het logboek. De vorige ronde raamde $16 en werd $10,97, en de raming daarvóór zat
er 3,6 keer naast.

**Zet `MEASURE_WEB_SEARCH` niet uit.** Dit is een echte ronde, geen ontwikkelronde.

---

## 6. Het resultaat: één markdownbestand

Maak `content-reviews/copywriter-opdracht-zes-artikelen.md` (of een naam die net zo duidelijk zegt
wat het is) met dezelfde opbouw als de twaalf:

**Bovenaan, één keer:**

- wat dit is, in gewone taal, zonder jargon;
- wat wij willen weten: komt dit in de buurt van wat een goede copywriter zou schrijven;
- de vijf vragen per pagina (versturen ja of nee, hoeveel werk, vijf cijfers van 1 tot 5, wat je als
  eerste zou veranderen, en een herschreven fragment als er tijd is);
- de opdracht om daarna één samenvatting te maken van de gemeenschappelijke delers;
- een inhoudsopgave met links naar de zes pagina's, per klant gegroepeerd.

**Per pagina, zes keer:**

1. **Aanleiding**: waarom deze pagina uit de meting kwam, met de letterlijke gemeten vragen erbij.
2. **Doel van de pagina**: de lezersopdracht, in één zin.
3. **Informatie die beschikbaar was bij het schrijven**: de antwoorden van de klant, de feiten van
   zijn eigen site, en het onderzoek naar het onderwerp. Precies zoals het bij de twaalf staat.
4. **De geschreven pagina**: de volledige tekst, inclusief de vraag-en-antwoordblokken.

**Drie dingen die er NIET in mogen:**

- **Geen enkel kwaliteitsoordeel van ORBIT ENGINE.** Geen scores, geen blokkades, geen bevindingen,
  geen dekkingspercentages. De copywriter moet blanco kijken, en een cijfer erbij stuurt zijn oordeel.
- **Geen schrijfopdracht.** Die is nieuw en interessant, maar hij verraadt wat de tekst probeerde te
  doen. Bewaar hem in de database en houd hem uit dit bestand.
- **Geen vergelijking met de twaalf van 3 september.** De copywriter hoort niet te weten dat er een
  vorige ronde was.

Werk daarna `content-reviews/README.md` bij, zodat duidelijk is welke set welke is.

---

## 7. Wat je daarna opschrijft

Eén alinea met datum onderaan `docs/logbook.md`, met deze cijfers erin, allemaal nagemeten en niet
geraamd:

- welke zes aanbevelingen het geworden zijn en uit welke clusters;
- hoeveel vragen je beantwoord hebt en hoeveel je bewust hebt laten liggen;
- wat de ronde echt gekost heeft, per stap uitgesplitst op `ai_calls`;
- hoeveel reparatierondes er nodig waren, en hoe vaak de versievergelijking uit stap 12 heeft moeten
  beslissen;
- hoe vaak de schrijfopdracht bruikbaar was en hoe vaak hij verviel omdat een veld leeg bleef;
- de scores en oordelen van de zes pagina's, met de kanttekening dat die van onszelf komen en dus
  niets zeggen over de vraag die deze ronde stelt.

Die laatste twee zijn het interessantst: ze zeggen of het werk van 4 september ook echt draait.

---

## 8. Vier valkuilen uit de vorige rondes

Alle vier zijn echt gebeurd. Lees ze voordat je begint.

**Neem geen cijfer uit documentatie over.** De kostenraming van de vorige ronde zat er 3,6 keer
naast omdat een tarief uit een oud document was overgenomen. Draai de query, kijk in de map, tel het
na. Dit staat niet voor niets zo hard in `CLAUDE.md`.

**Een AI die AI-tekst beoordeelt is te streng.** Verleid jezelf niet tot een eigen beoordelingsronde
over deze zes. In september bleek zo'n ronde 0,75 tot 2,25 punt te laag te zitten op elke dimensie.
Tellingen zijn bruikbaar, cijfers niet. Het oordeel komt van een mens.

**Gebouwd is niet geverifieerd.** Deze ronde is de eerste keer dat de nieuwe stappen op echte data
draaien. Loopt er iets stuk, dan is dat de opbrengst van de ronde en geen tegenvaller: schrijf op wat
er misging en waar, met het taak-id en de rij erbij.

**Schrijf nooit dat iets al kan wat nog niet gebouwd is.** Ook niet in je antwoord aan de eigenaar.

---

## 9. De harde regels

- **Branch vanaf `main`**, en werk niet op `main` zelf. Deze ronde levert een markdownbestand op,
  een logboekalinea, en hooguit een reparatie van iets dat stuk bleek.
- **Vóór elke commit vier keer groen:** `npx tsc --noEmit`, `npm run test:unit`,
  `npm run test:chain`, `npm run build`. Ook als je alleen documentatie aanraakt.
- **Taal:** Nederlands, ook in het opdrachtbestand voor de copywriter. Geen gedachtestreepjes en
  geen schuine streep tussen twee woorden, zie `docs/schrijfstijl.md` §10.
- **De eigenaar is geen ontwikkelaar.** Zeg het gevolg van een cijfer, niet alleen het cijfer.
- **Dit schrijft naar productie en het kost geld.** Elke pagina is zichtbaar voor de klant. Bij
  twijfel over een stap die geld kost of data verandert: eerst afstemmen.
