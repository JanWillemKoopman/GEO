# Taalaudit: één woord per begrip, één stem in de hele app

> Onderzoek van 30 september 2026 naar het taalgebruik in ORBIT ENGINE, met aanbevelingen.
> Er is nog niets aangepast. Dit bestand gaat eruit zodra de aanbevelingen zijn uitgevoerd of
> afgewezen; wat blijft, landt in `docs/schrijfstijl.md`.

---

## 0. Het uitgangspunt klopt al half

De wens was om de tone of voice van inspace.io over te nemen. Dat is al de officiële regel:
`docs/schrijfstijl.md` is in augustus 2026 afgeleid van InSpace Nova, met twaalf richtlijnen en een
vaste woordenlijst (§11). Het probleem is dus niet dat de stijl ontbreekt, maar dat de app zich er
op een aantal plekken niet aan houdt, en dat de woordenlijst een paar begrippen nog niet regelt.

Een snelle vergelijking met inspace.io van vandaag (Nederlandse site, september 2026) laat zien dat
de toon nog steeds dezelfde is: korte stellende zinnen, de drieslag (*"Meer zichtbaarheid. Meer
verkeer. Meer klanten."*), labels met een punt-midden (*"Waarom nu · de nieuwe realiteit"*,
*"Elke markt · elke niche"*), en een nuchtere knoptekst (*"Plan een gratis demo"*, *"Bekijk alle
cases"*). Er is één verschil: InSpace spreekt nu van *"AI-citaties"*, wij van *"vermelding"*. Dat
laten we zo, want "vermelding" is gewoon Nederlands en past beter bij §13.5 van
`docs/merkstrategie.md`.

## 1. Hoe er gemeten is

Alle zichtbare teksten in `app/` en `components/` zijn automatisch uit de code gehaald: 2.727
teksten (koppen, knoppen, meldingen, uitleg). De map `app/solliciteren/` en de API-routes zijn
overgeslagen. Daarna is gezocht op de woorden uit de woordenlijst, op synoniemen en op Engelse
woorden. De aantallen hieronder komen uit die telling, niet uit een schatting.

## 2. Wat al goed gaat

- **Nergens "u" of "uw"** in de app zelf. Alleen in de schrijfprompts voor de klantsite, en daar
  hoort het.
- **Geen uitroeptekens** in de schermteksten, geen superlatieven gevonden.
- **"Niet gelukt"** is al de gewone vorm (44 keer), "mislukt" is de uitzondering.
- **Pagina-idee en ideeënlijst** zijn in het contentplan netjes doorgevoerd (22 keer, op één
  uitzondering na).
- **Richtlijn 12** (wie lost het op) staat er op de belangrijkste plek al goed: *"Je consultant is op
  de hoogte en lost dit op; je hoeft hier zelf niets voor te doen."*

## 3. Bevindingen

### 3.1 Wie praat er eigenlijk? ORBIT ENGINE, "we" en "de schrijver" door elkaar

Richtlijn 3 zegt: ORBIT ENGINE is het handelende onderwerp. In de praktijk praten er drie stemmen
door elkaar, soms op hetzelfde scherm:

| Stem | Voorbeeld | Waar |
|---|---|---|
| ORBIT ENGINE | "ORBIT ENGINE stelt nu de vragen aan AI-assistenten." | `cluster-kaart.tsx` |
| we | "Alles gedaan. We beginnen nu met schrijven." | `bibliotheek/[paginaId]/page.tsx` |
| we | "We schrijven een nieuwe versie met jouw aanpassing." | `components/pagina/goedkeuren.tsx` |
| de schrijver | "Het gaat dan mee naar de schrijver." | `kennis-werkblad.tsx` |

"We", "wij", "ons" en "onze" staan in 57 teksten. Twee vormen zijn echt verwarrend:

- **"We konden ORBIT ENGINE niet bereiken"** staat 17 keer in de app. Wie is "we", als ORBIT ENGINE
  zelf degene is die niet bereikbaar is?
- **"Onze pagina's"** op Zichtbaarheid in AI en Zoekverkeer (onder andere "Dat verschil is aan ons
  toe te schrijven"). Voor de klant zijn het zíjn pagina's, en "ons" is een partij die hij niet kent.

"De schrijver" is een derde, onzichtbare figuur. Voor de klant bestaat er geen schrijver; ORBIT
ENGINE schrijft.

### 3.2 Het menu en de pagina heten anders

Richtlijn 11 zegt: het menu-item en de kop van de pagina dragen hetzelfde woord.

| Menu | Kop van de pagina |
|---|---|
| Search console (kleine c) | Zoekverkeer |
| Openstaande taken | de naam van het merk |

Op de supportpagina staat "Search console" drie keer met een kleine c, elders 15 keer "Search
Console". Het is een merknaam van Google, dus met hoofdletter.

### 3.3 Engelse hoofdstuknamen naast Nederlandse

Het menu mengt twee talen: **Overzicht, Clusters, Strategie, Mijn bedrijf** naast **Analytics,
Admin, Support**. In lopende tekst staan verder "content" (Content-richting, "Wat voor content wil
je?"), "onboarding" ("je onboarding", "Status van de onboarding"), "crawl" en "opnieuw crawlen"
(6 keer), "label", "property" en "score". §13.5 van de merkstrategie vraagt
natuurlijk Nederlands zonder overdreven Engels.

### 3.4 Woorden die de woordenlijst al verbiedt

| Staat er | Hoort volgens §11 | Aantal | Voorbeeld |
|---|---|---|---|
| mislukt | niet gelukt | 11 teksten + statuslabel "Schrijven mislukt" | "Opslaan mislukt. Probeer het opnieuw." |
| merkprofiel | merkdossier | 3 | "omdat je merkprofiel is gewijzigd" (Mijn reputatie) |
| bewaard, bewaren | opgeslagen | 12 | "Alles bewaard · laatste wijziging" |
| crawl, crawlen | onderzoek | 6 | "Opnieuw crawlen" |
| vrijgeven | een maand starten | 1 | supportpagina: "Een maand vrijgeven doe je samen met je consultant" |
| kansen (in het contentplan) | pagina-ideeën | 2 | "ORBIT ENGINE haalt de kansen uit het rapport van een gemeten cluster" |
| meet-vragen, "vragen" zonder meer | AI-vragen | ruim 20 | "De meet-vragen zijn al opgesteld bij het aanmaken" |

Het laatste punt weegt het zwaarst. Het woord "vragen" betekent in de app twee dingen: de vragen die
ORBIT ENGINE aan de AI stelt, en de Openstaande vragen die de klant zelf beantwoordt. Richtlijn 11
verbiedt precies dat, maar in `lancering-melding.tsx` staan ze in één zin: *"Zodra het klaar is
staan de vragen bij Openstaande vragen en de voorgestelde pagina's in je Contentplan."*

### 3.5 Een belofte die niet klopt

Twee teksten op Zoekverkeer zeggen **"Wat ORBIT ENGINE publiceerde"** en *"Levert de content die ORBIT
ENGINE publiceerde ook bezoekers op"*. ORBIT ENGINE publiceert niet; de klant plaatst zelf
(`schrijfstijl.md`, "Wat we bewust NIET overnemen van Nova"). Dat is precies wat CLAUDE.md verbiedt:
schrijf nooit dat iets al kan wat nog niet gebouwd is. Dit is het enige punt in deze audit dat
inhoudelijk onjuist is, en niet alleen onhandig.

### 3.6 Begrippen zonder vaste plek in de woordenlijst

Hier regelt de woordenlijst nog niets, en daardoor gebruikt de app meerdere woorden voor hetzelfde,
of hetzelfde woord voor meerdere dingen.

**Thema, label, cluster en onderwerp.** Vier woorden voor de indeling van wat er gemeten wordt, en
hun verhouding staat nergens:
- "Eén cluster = één product of onderwerp."
- "Een label groepeert clusters op onderwerp."
- "zoekt naar onderwerpen binnen één thema ... en bundelt ze tot" clusters.

Een klant kan hier niet uit afleiden of een onderwerp groter of kleiner is dan een cluster.

**Ronde.** Betekent vier verschillende dingen: een ontdekkingsronde (Clusters ontdekken), het
opnieuw uitlezen van de website, een meting, en de nachtelijke Search Console-synchronisatie.

**Analyse, rapport, meetplan.** Mijn reputatie spreekt van "de analyse" ("De analyse loopt"), terwijl
elke andere meting "meting" heet. "Het rapport" wordt 6 keer genoemd ("Mail me zodra het rapport
klaar is"), maar er is geen scherm dat zo heet. "Meetplan" en "nulmeting" staan in de uitleg, maar
niet in de woordenlijst.

**Score, aandeel, percentage.** Het hoofdcijfer van zichtbaarheid heet afwisselend "je score", "je
aandeel" en "het grote percentage". De supportpagina legt uit dat de tabel eronder een *strengere
rekenwijze* gebruikt dan het hoofdcijfer, zonder dat de twee cijfers een eigen naam hebben.

**Live, gepubliceerd, geplaatst.** "Meld dat hij live staat" is de vaste knop, maar daarnaast staat
"telt als gepubliceerd", "Laatst geplaatst op" en in het statuslabel van de bewijsladder "Gepubliceerd
en gecontroleerd".

### 3.7 Foutmeldingen: vijf varianten voor één boodschap

Voor "het lukte niet, probeer het opnieuw" staan nu onder andere:
"Probeer het opnieuw." · "Probeer het zo nog eens." · "Controleer je internet en probeer het
opnieuw." (13) · "Controleer je verbinding en probeer het opnieuw." (5) · "Geen verbinding." ·
"Er ging iets mis." · "laat het ons dan weten". Internet en verbinding lopen door elkaar, en "laat
het ons weten" zegt niet wie "ons" is of hoe. Richtlijn 12 vraagt om *wie lost het op*: dat is
bij de klant altijd **je consultant**.

### 3.8 De documenten spreken elkaar tegen

`docs/merkstrategie.md` §14 (kernboodschappen) zegt *"ORBIT ENGINE automatiseert strategie,
content, publicatie en optimalisatie voor SEO en GEO"* en *"Eén systeem dat blijft werken aan je
zichtbaarheid"*. `docs/schrijfstijl.md` zegt: niet "het systeem", geen automatisch publiceren, geen
klassieke SEO-taal. Omdat §13 van de merkstrategie zelf zegt dat schrijfstijl.md wint voor de app,
gaat er in de app niets mis. Maar wie een tekst schrijft voor een demo, een e-mail of een scherm
op basis van §14, belooft iets wat de app niet doet.

---

## 4. Aanbevelingen, in volgorde van belang

**1. Haal de onjuiste belofte weg (klein, meteen).** Vervang "Wat ORBIT ENGINE publiceerde" op
Zoekverkeer door "Pagina's van ORBIT ENGINE die live staan". Een tekst die iets belooft wat niet
bestaat, kost vertrouwen bij de eerste demo.

**2. Kies één stem en schrijf hem op.** Voorstel voor richtlijn 3 in `schrijfstijl.md`:
- **ORBIT ENGINE** doet het werk: meten, onderzoeken, schrijven. Dus "ORBIT ENGINE schrijft deze
  pagina", niet "we schrijven".
- **Je consultant** is de mens: afspraken, storingen, advies. Dus "laat het je consultant weten",
  niet "laat het ons weten".
- **"We"** vervalt in de app. Het staat in 57 teksten en betekent daar soms ORBIT ENGINE, soms Outer
  Orbit en soms de klant zelf.
- **"De schrijver"** wordt ORBIT ENGINE: "Het gaat dan mee in de tekst die ORBIT ENGINE schrijft."
- **"Onze pagina's"** wordt "je nieuwe pagina's" of "pagina's van ORBIT ENGINE".
- **"We konden ORBIT ENGINE niet bereiken"** wordt "ORBIT ENGINE is niet bereikbaar. Controleer je
  internet en probeer het opnieuw."

**3. Maak één woord voor "vragen" onmisbaar.** Wat ORBIT ENGINE aan AI-assistenten stelt heet
overal **AI-vragen**, ook in lopende tekst; "vragen" zonder meer betekent alleen nog de Openstaande
vragen van de klant. Dit raakt ruim 20 teksten, waaronder de keuzes bij een nieuw cluster ("Hoeveel
vragen per fase?") en Mijn reputatie ("Ongeveer 50 vragen aan ChatGPT").

**4. Leg de ontbrekende begrippen vast in de woordenlijst.** Dit vraagt een besluit van de product
owner; hieronder staat een voorstel.

| Begrip | Voorstel | Niet meer |
|---|---|---|
| wat samen gemeten wordt | cluster | thema |
| waar een cluster over gaat | onderwerp (één per cluster) | |
| een groep clusters | label | thema, categorie |
| het zoeken naar nieuwe clusters | ontdekkingsronde | ronde zonder meer |
| het opnieuw lezen van de website | onderzoek van de website | crawl, ronde |
| elk meten, ook reputatie | meting | analyse |
| het eerste meten van een cluster | nulmeting | 0-meting, basismeting |
| wat vóór de meting wordt goedgekeurd | meetplan | concept |
| het hoofdcijfer op Zichtbaarheid in AI | zichtbaarheid (in procenten) | score, aandeel |
| het cijfer per concurrent | aandeel in de antwoorden | percentage van alle gestelde vragen |
| een pagina die op de site staat | live | gepubliceerd, geplaatst |
| wat na een meting beschikbaar is | de uitslag | het rapport, zolang er geen scherm "Rapport" bestaat |

**5. Maak het menu Nederlands en laat het menu en de kop hetzelfde zeggen.** Voorstel:
Analytics wordt **Resultaten**, Admin wordt **Beheer** (de map heet al `beheer/`), Support wordt
**Hulp**. "Search console" in het menu wordt **Zoekverkeer**, gelijk aan de kop. "Openstaande taken"
blijft, maar de kop van dat scherm heet dan ook zo, met de merknaam als eyebrow.

**6. Ruim de woorden op die §11 al verbiedt.** Een mechanische ronde door de tabel in §3.4:
mislukt, merkprofiel, bewaard, crawlen, vrijgeven, kansen in het contentplan. Ongeveer 35 teksten,
geen besluit nodig, want de regel bestaat al. Voor Engelse woorden in klantzicht dezelfde aanpak:
content wordt "tekst" of "pagina's", onboarding wordt "kennismakingsgesprek", property wordt
"eigendom" of "domein".

**7. Eén set foutmeldingen.** Drie vaste zinnen, en verder niets:
- Geen verbinding: "Geen verbinding. Controleer je internet en probeer het opnieuw."
- Iets lukte niet: "[Handeling] is niet gelukt. Probeer het opnieuw."
- Blijft het misgaan: "Blijft het misgaan, laat het dan je consultant weten."

Zet ze als constanten in één bestand in `lib/`, zodat een nieuw scherm niet een zesde variant
verzint.

**8. Laat een test de woordenlijst bewaken.** Het verbod op gedachtestreepjes heeft al een test in
`scripts/test-unit.ts` (herstelplan T8.8); de woordenlijst niet, en daarom is hij weggezakt. Een
test die de schermteksten in `app/` en `components/` doorzoekt op de "niet dit"-kolom van §11, met
een korte lijst bewuste uitzonderingen, houdt de app consistent zonder dat iemand eraan hoeft te
denken. De uittrekmethode van deze audit (TypeScript-parser over JSX-tekst en tekstwaarden) is
daarvoor bruikbaar.

**9. Trek de merkstrategie gelijk met de app.** Pas §14 van `docs/merkstrategie.md` aan, of zet er
een regel boven dat die kernboodschappen de bestemming beschrijven en niet wat de app nu kan, met een
verwijzing naar §30. Anders blijft de salesdemo iets beloven wat de app niet doet.

**10. Neem één InSpace-gewoonte beter over: de drieslag en het cijfer met richting.** De app volgt
richtlijn 7 (cijfer met richting) al op Zichtbaarheid in AI, maar lege staten en uitlegteksten zijn
vaak lang: 8 zinnen in de schermteksten tellen meer dan 25 woorden, en dat is het tegendeel van
InSpace' "één gedachte per zin". Ze staan verspreid over acht schermen, onder andere de
supportpagina, Clusters ontdekken, Mijn reputatie en de knop om een maand te starten. Knip ze bij
de volgende aanpassing van die schermen.

---

## 5. Voorgestelde volgorde

1. Aanbeveling 1 en 6: meteen, zonder besluit.
2. Aanbeveling 2, 3, 4 en 5: eerst een besluit van de product owner over de woorden, dan één
   commit die `schrijfstijl.md` §3 en §11 bijwerkt en de schermen erop aanpast.
3. Aanbeveling 7 en 8: samen, zodat de test meteen de nieuwe foutmeldingen afdwingt.
4. Aanbeveling 9 en 10: bij de volgende aanpassing van die documenten en schermen.
