# Prompt voor een live end-to-end test op productie

Kopieer alles hieronder in een nieuwe Claude Code sessie die wél toegang heeft tot een echte
OPENAI_API_KEY en een echte SUPABASE_SERVICE_ROLE_KEY (of die tegen de live app op
`https://geo-janwillemkoopmans-projects.vercel.app` kan inloggen). Deze taak is bewust
niet uitvoerbaar in de sessie waarin hij is geschreven, omdat die geen echte
credentials heeft.

---

## Opdracht

Je krijgt toestemming om echte, betaalde OpenAI-aanroepen te doen tegen de productieomgeving
van ORBIT ENGINE. Er mogen echte kosten gemaakt worden, dit is bewust: het doel is een
volledige, live doorloop van de app om te controleren of een net afgeronde optimalisatieronde
ook onder echte omstandigheden werkt, niet alleen in de unit- en ketentests.

Lees eerst `docs/optimalisatielab-orbit-engine.md` in zijn geheel. Dat document beschrijft wat
er in de vorige sessie is gebouwd (werkpakket A, B en C) en is de bron van waarheid voor wat je
hieronder moet controleren. Lees ook `CLAUDE.md` voor de projectconventies voordat je begint.

### Wat je gaat doen

Bedenk zelf een passend fictief MKB-bedrijf (naam, website of URL-achtige omschrijving, sector)
en doorloop daarmee de volledige klantreis in de live app, van merk aanmaken tot en met het
aanmaken van precies één nieuw content-item. Het daadwerkelijk laten schrijven van de tekst van
dat content-item hoeft niet, alles ervoor wel. Doe dit als een echte gebruiker zou doen, tegen de
draaiende productieomgeving, niet lokaal en niet met gestubde AI-antwoorden.

Let bij elke stap op twee dingen: functionele bugs in het algemeen, en specifiek of de
onderstaande punten uit het optimalisatielab zich gedragen zoals beschreven.

### Stappen en wat te controleren

1. **Merk aanmaken en uitlezen.** Maak het fictieve merk aan, laat de crawl en de
   onboardingpijplijn (aanbod, topics, markt, kennistest, synthese) volledig doorlopen.
   - Controleer dat de voorgestelde onderwerpen na deze fase de status `concept` hebben
     (kolom `profile_topics.stage`), zichtbaar op de clusterpagina als gespreksvoorbereiding,
     en dat ze NIET goed te keuren of te starten zijn (moet een foutmelding geven, geen
     stille no-op).
   - Controleer of elk voorgesteld onderwerp een `origin` heeft (`aanbod` op dit punt, nog geen
     gesprek vastgelegd).

2. **Strategisch gesprek vastleggen.** Vul het gesprek in (of de intake-blok-flow) inclusief een
   antwoord met een duidelijke marktclaim zonder onderbouwing (bijvoorbeeld "wij zijn de
   marktleider in de regio" of "de beste in ons vakgebied").
   - Controleer dat deze claim NIET automatisch als vaststaand feit in `profiles.proof_points`
     terechtkomt, maar wel bewaard blijft in `fact_requests` met een uitleg waarom, en dat de
     klant de kans krijgt om een cijfer of voorbeeld toe te voegen (`claim-plausibility.ts`).
   - Controleer dat het vastleggen van het gesprek automatisch een nieuwe, definitieve ronde
     onderwerpen genereert die de nog onbesliste concepten vervangt, en dat deze nieuwe
     onderwerpen `stage = 'definitief'` hebben en nu wel goed te keuren en te starten zijn.
   - Controleer dat onderwerpen die uit deze ronde komen en duidelijk voortbouwen op iets dat
     alleen in het gesprek stond (niet in het aanbod) `origin = 'aanbod_en_gesprek'` hebben.

3. **Clusterlaag invullen.** Vul op een cluster de drie gerichte velden in (vaakst gestelde
   vraag, wat vaak misgaat, onderscheid met de concurrent) in plaats van het oude vrije
   notitieveld.
   - Controleer dat deze drie velden samen in `analyses.content_brief` terechtkomen zodra het
     cluster gestart wordt (`buildTopicBrief()`).

4. **Cluster starten en de meetvolume-suggestie.** Start een cluster en bekijk het scherm
   "Verdeling aanpassen".
   - Controleer dat de voorgestelde verdeling (`suggestPromptMix()`) meegroeit met het aantal
     diensten onder het onderwerp en het aantal werkgebieden van het merk, in plaats van altijd
     10/10/10 te tonen.
   - Vul een extreme waarde in (probeer een verdeling met een totaal ruim boven de 80 vragen) en
     controleer dat de kostenwaarschuwing verschijnt, en dat de harde grens van 100 vragen totaal
     niet te doorbreken is via het formulier.
   - Start het cluster met de eenvoudige standaardknop (niet via het aanpasscherm) en controleer
     dat dit ongewijzigd de goedkope standaard gebruikt: dit gedrag mag niet zijn veranderd.

5. **Meting laten lopen.** Laat de echte meting compleet draaien (dit is de dure stap, ~$0,82 tot
   ~$2,40 afhankelijk van het gekozen volume). Volg de queue en controleer dat hij zonder
   handmatig ingrijpen afrondt.

6. **Rapport bekijken.**
   - Controleer dat het aantal aanbevelingen niet kunstmatig op een vast aantal (bijvoorbeeld 7)
     lijkt te blijven hangen, en dat er geen twee aanbevelingen staan die overduidelijk dezelfde
     gemiste vraag als doel hebben (dat moet door `mergeOverlappingRecommendations()` al zijn
     samengevoegd).
   - Controleer dat de zin over de verhouding nieuw/verbeteren (`describeActionRatio()`)
     grammaticaal klopt, ook als die verhouding toevallig 1 op een totaal is.
   - Controleer of er gemiste kansen zijn die het model overwoog maar afwees: die moeten met een
     reden terugkomen in `reports.declined_json`, zichtbaar als de inklapbare
     "Afgevallen"-sectie op het planscherm (stap 8).

7. **"Stel nieuwe clusters voor" (staff-only knop).** Test dit met een staff/adminaccount, niet
   met het klantaccount.
   - Controleer dat de knop op het klantaccount helemaal niet zichtbaar is (niet alleen visueel
     verborgen: probeer de API-route `app/api/profiles/[id]/topics/refresh` ook rechtstreeks aan
     te roepen met het klantaccount en controleer dat dit 403 geeft).
   - Roep als staff eerst de preview (GET) aan zonder dat er iets nieuws is gebeurd sinds de
     vorige ronde, en controleer dat deze weigert met een duidelijke reden
     (`topic-round-diff.ts`).
   - Wijs een onderwerp af met een reden, en controleer dat een volgende aanvullende ronde die
     reden gebruikt als vermijd-instructie en het onderwerp niet opnieuw voorstelt.

8. **Contentvoorraad en planscherm.** Ga naar het planscherm van het merk.
   - Controleer dat de nieuwe "Afgevallen" sectie de afgewezen kansen uit het rapport toont met
     hun reden.
   - Controleer dat de voorraadduur (`backlogDurationLabel()`) een concreet aantal maanden toont
     op basis van het huidige publicatietempo, en dat dit getal verandert als je het
     publicatietempo aanpast.

9. **Eén content-item aanmaken.** Maak vanuit de voorraad of het plan één nieuw content-item aan
   tot en met de briefingfase. Het daadwerkelijk laten schrijven van de tekst (de dure
   `gpt-5.6-sol`-aanroep) hoeft niet, maar alles ervoor (briefing samenstellen, vragen aan de
   klant tonen inclusief de vereiste-vragen-niet-capping uit punt 6 van werkpakket A) moet echt
   doorlopen zijn.
   - Controleer specifiek dat een onmisbare (kern)vraag nooit wegvalt door de grens van acht
     vragen, en dat alleen optionele vragen daardoor worden afgekapt
     (`selectBriefingQuestions()`).

### Opleveren

Schrijf een kort verslag in het Nederlands, niet-technisch leesbaar voor de productowner:
per stap hierboven of het gedrag klopte, en zo niet wat er misging (met het bestand en de
concrete waarneming, niet alleen "werkt niet"). Zet er ook de daadwerkelijk gemaakte OpenAI-kosten
bij (uit het kostenlogboek, `lib/openai/pricing.ts` / de kostentabel in de database) zodat
duidelijk is wat deze test heeft gekost.

Maak GEEN aanpassingen aan productiedata van bestaande, echte klanten. Werk uitsluitend met het
zelf aangemaakte fictieve testmerk. Verwijder na afloop niets automatisch: als het testmerk
opgeruimd moet worden, vraag dat expliciet aan de eigenaar voordat je iets verwijdert.
