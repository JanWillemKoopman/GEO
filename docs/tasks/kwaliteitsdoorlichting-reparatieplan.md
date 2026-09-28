# Reparatieplan: de openstaande punten uit de herhaling

> **Wat dit is.** De opdracht van de eigenaar (25 september 2026): de punten die bij de herhaling van
> de kwaliteitsdoorlichting nog open bleven, daadwerkelijk oplossen. Alle details, code-plekken en
> voorstellen staan al bij de punten zelf in `docs/tasks/bevindingen-kwaliteitsdoorlichting.md`; hier
> staat alleen de volgorde en de aanpak. Verwijder dit document zodra alle blokken live staan en
> nagerekend zijn.
>
> **Besluit van de eigenaar:** Gemini (punt 17, 55) staat uit in productie en is voorlopig geen
> probleem. Niet oppakken in dit plan, tenzij Gemini weer aangezet wordt. Toekomstige testrondes
> schrijven veel minder teksten om de kosten omlaag te brengen (§3).

---

## 1. Wat er nog moet gebeuren, op volgorde

Zelfde werkwijze als de verbeterronde van 24 september: één blok is één PR, met migratie eerst (als
nodig), dan code, dan test, dan op productie nagerekend.

### Blok G, hoog: de keuring ziet feiten verkeerd (punt 59, 60)

Twee kanten van dezelfde zwakte: `zinParafraseertFeit()` en de bronherleidbaarheidscontrole in
`lib/pipeline/claim-extract.ts` kijken naar woord- en getalovereenkomst, niet naar betekenis.

- **59**: houdt zinnen tegen die geen bewering over het bedrijf zijn (een datumstempel, een
  veiligheidsinstructie, een verwijzing naar het CBR). Bij de herhaling kreeg hierdoor 19 van de 21
  pagina's onterecht "block".
- **60**: laat een volledig verzonnen certificering ("CO-gecertificeerd volgens de Gasketelwet") juist
  wél door, op alle 7 pagina's van één merk.

**Aanpak:** één gerichte modelaanroep per kandidaatzin die alleen vraagt "is dit een controleerbare
bewering over het bedrijf, en zo ja, welk feit op de kaart onderbouwt hem exact" (geen los
woord/getal-matchen meer). Daarbinnen:
- datumstempels en verwijzingen naar een externe partij (CBR, hulpdiensten, RVO) categorisch nooit als
  bewering over het bedrijf tellen (lost 59 op);
- een keurmerk, certificering of wettelijke kwalificatie altijd een letterlijke match op de feitenkaart
  eisen, nooit de coulance van een parafrase (lost 60 op).

**Test:** de vijf voorbeeldzinnen uit punt 59 en de "Gasketelwet"-zin uit punt 60 als vaste gevallen in
`test-unit.ts`, plus de bestaande gevallen uit punt 54 (die moeten blijven werken).

**Stand (25 september 2026):** live en nagerekend, PR #132 (zie punt 59 en 64). Punt 60 en 61 bleken bij narekenen onterecht (zie
de bevindingenlijst); het vangnet voor keurmerken is er toch, en de echte Gasketelwet-zin gaat erdoor.
Nameting op productie: een herkeuring van bestaande pagina's (vier beoordelaars plus de nieuwe
aanroep, ongeveer $0,02 per pagina) in plaats van nieuwe teksten, want dan is het verschil op
dezelfde tekst te zien.

### Blok H, hoog: de reparatieknop verliest feiten (punt 50, 62)

"Los alles op" (`regenerate: true`) laat de schrijver de hele pagina opnieuw opstellen. Bij de
herhaling verdween daarbij een juist klantfeit ("twaalf monteurs") dat niet eens als probleem gemeld
was, en bleef één van de vijf gemelde punten zelf onopgelost staan.

**Aanpak:** twee aparte reparaties, niet één:
1. De revisienota die naar de schrijver gaat (`lib/jobs/content-jobs.ts` / de route achter "los alles
   op") expliciet laten zeggen: behoud elk feit dat in de vorige versie stond en niet in de lijst met
   punten staat. Vergelijkbaar met hoe `content_revise` nu al de aanbeveling en de eerdere tekst
   meegeeft, maar dan met een harde instructie in plaats van alleen de oude tekst als context.
2. Na de herschrijving controleren: elk feit-ID dat in de vorige versie voorkwam en niet bij de
   gemelde punten stond, moet ook in de nieuwe versie voorkomen. Ontbreekt het, dan telt dat zelf als
   een nieuw gevonden punt (net als de bestaande bronherleidbaarheidscontrole), niet als stilzwijgend
   verlies.

**Test:** een scenario in `test-chain.ts` dat een pagina met een niet-gemeld feit door "los alles op"
haalt en controleert dat het feit blijft staan; een scenario dat controleert dat elk gemeld punt na de
herschrijving niet meer als issue terugkomt.

**Stand (25 september 2026):** gebouwd, PR #133. De ketentest toetst met een vaste schrijver: die kan
een feit niet terugzetten, dus het scenario controleert dat de schrijver het feit meekrijgt en dat het
verlies een blokkerende bevinding wordt, en dat een gemeld punt dat niet wordt. Of de echte schrijver
het feit ook terugzet, blijkt pas op productie. **Op productie nagerekend:** ja, alle drie terug, zie punt 62.

### Blok I, middel: dubbele vervolgvragen (punt 57)

Twaalf bijna-identiek geformuleerde vervolgvragen over hetzelfde onderwerp kwamen in één keer bij één
pagina terecht.

**Aanpak:** dezelfde soort gerichte modelaanroep als bij blok G, nu toegepast op het samenvoegen van
`fact_requests` (`lib/facts.ts`): vóór een nieuwe vraag wordt aangemaakt, checken of een van de al
openstaande vragen van hetzelfde merk in essentie hetzelfde vraagt, niet alleen of de tekst letterlijk
gelijk is.

**Test:** de negen echte vragen uit punt 57 als vast voorbeeld; moet uitkomen op twee tot drie
werkelijk verschillende vragen in plaats van negen.

**Stand (25 september 2026):** gebouwd, PR #134. Van negen naar drie in de eenheids- en ketentest,
met een vast oordeel; het echte model is nog niet op een voorbereidingsronde nagerekend (zie punt 57).

### Blok J, laag, alleen bij herhaling: crawldekking (punt 58)

Bij de herhaling las de crawl van een trage site nog maar de helft van wat de nulmeting las, binnen
dezelfde harde grens van vier aanvulrondes (`MAX_AANVULRONDES` in `lib/jobs/handlers.ts`).

**Aanpak:** niet oppakken tenzij dit bij een volgende meting terugkomt. Als het terugkomt:
`MAX_AANVULRONDES` optioneel maken, zodat de consultant handmatig kan doorgaan tot de dekking
voldoende is.

---

## 2. Volgorde en reden

1. **Blok G** eerst: raakt de keuring zelf, en blok H en I bouwen daar met hun eigen tests bovenop. Een
   betere "is dit een bewering, en welk feit hoort erbij"-toets in blok G maakt de test van blok H
   (welk feit verdween er) ook betrouwbaarder.
2. **Blok H** daarna: punt 50/62 is de op één na hoogste ernst en raakt het vertrouwen van de klant
   rechtstreeks (een feit dat hij zelf gaf, verdwijnt zonder melding).
3. **Blok I**: middel, geen directe schade aan de tekst, wel aan de tijd van de klant.
4. **Blok J**: alleen bij terugkeer van het probleem.

Gemini (17, 55) staat bewust niet in deze volgorde: uitgezet, geen klantimpact zolang hij uitstaat.

## 3. Kosten omlaag bij een volgende testronde

Besluit van de eigenaar: minder teksten laten schrijven bij een volgende doorlichting of herhaling.
De herhaling van 24/25 september schreef 21 pagina's (6, 7 en 8 per merk) om ook het plan en de
prioritering te kunnen toetsen; dat is meer dan nodig is om alleen blok G, H en I na te rekenen.

**Voor het nakijken van blok G, H en I is genoeg:**
- **Blok G (keuring):** geen nieuwe pagina's nodig. De vijf voorbeeldzinnen uit punt 59 en de
  Gasketelwet-zin uit punt 60 zijn al vastgelegd; die + de nieuwe eenheidstests dekken de reparatie.
  Pas als de unit-tests groen zijn, één pagina per merk (3 in totaal) laten schrijven om te zien of de
  keuring in het echt hetzelfde doet.
- **Blok H (reparatieknop):** één tegengehouden pagina met een niet-gemeld klantfeit is genoeg, bij
  één merk. Geen nieuwe meting nodig: een bestaande tegengehouden pagina van een eerdere ronde volstaat
  als het waarheidsdossier van dat merk nog klopt, anders één pagina bij één merk.
- **Blok I (dubbele vragen):** geen nieuwe pagina's nodig, dit toetst op het aanmaken van vragen, niet
  op de tekst zelf. Een `test-chain.ts`-scenario met de negen echte vragen uit punt 57 is genoeg.

**Vuistregel voor het vervolg:** een reparatie die een geïsoleerde functie raakt (de keuring, het
samenvoegen van vragen) wordt eerst met eenheidstests op de precieze voorbeelden uit de bevinding
gedekt, en pas daarna met hooguit één pagina per merk in het echt gecontroleerd. Alleen een reparatie
die de hele keten raakt (zoals punt 45 en 47 bij de vorige herhaling) heeft de volle set nieuwe
pagina's per merk nodig om na te rekenen.

## 4. Wat telt als klaar

- Blok G, H en I: elk een eigen PR, elk met een eenheidstest op de exacte voorbeelden uit de
  bijbehorende bevinding, elk op productie nagerekend met het minimale aantal pagina's uit §3.
- De statusregel van punt 50, 57, 59, 60, 61, 62 in `docs/tasks/bevindingen-kwaliteitsdoorlichting.md`
  bijgewerkt met datum en PR, en een alinea in `docs/logbook.md` per blok.
- Dit document weghalen zodra alle drie de blokken live staan en nagerekend zijn.
