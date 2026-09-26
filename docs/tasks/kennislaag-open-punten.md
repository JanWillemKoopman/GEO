# Open punten van de kennislaag, voor de consultant

**Opgesteld:** 26 september 2026, bij het terugvullen van de kennislaag (K3 van
`docs/tasks/van-pijplijn-naar-kennissysteem.md`). **Status:** open, 20 punten.

Bij het terugvullen legde de code alles vast wat ORBIT al wist over de drie proefmerken, zonder model.
Twintig keer kon de code niet zelf beslissen. Die punten staan hieronder. Ze staan al in de kennislaag,
op de voorzichtige manier: een feit waarvan niet vaststaat voor welke dienst het geldt, geldt voorlopig
voor het hele merk (besluit V16); een prijs die niet letterlijk in het citaat van de site staat, is een
vermoeden en komt niet op een pagina.

**Waarom dit belangrijk is:** K6 zet de schrijver pas over op de kennislaag als deze lijst leeg is
(besluit V16). Anders kan een prijs voor het basispakket op een pagina over iets anders belanden.

**Afhandelen:** tot het kennisoverzicht (K7) er is, per punt in dit document noteren wat het wordt
(koppelen aan een dienst, merkbreed laten, bevestigen, of afwijzen), zodat K7 het meteen kan
vastleggen. Een punt dat af is, gaat uit dit document; is de lijst leeg, dan gaat het document weg.

Drie soorten punten:
- **Geldt voor iets dat geen dienst is** (11): de oude feitentabel zei waarvoor een feit geldt in vrije
  tekst ("basispakket", "kantoor"), en die tekst is aan geen knoop van het aanbod te koppelen. Vaak is
  merkbreed juist goed (het kantooradres, "een offerte aanvragen is gratis").
- **Een prijs uit de aanbodboom die niet in het citaat staat** (9): het model schreef een prijs bij een
  dienst, maar het citaat dat de code controleerde, bevat die bedragen niet. De prijs kan kloppen (hij
  staat dan op een andere pagina), maar dat is niet gecontroleerd. Vier ervan zijn geen prijs maar
  "offerte op aanvraag".
- Een betwist feit of een feit zonder terug te vinden citaat: bij de proefmerken nul.

### Autorijschool Pompert

| Wat | Waarom op deze lijst | Bron |
|---|---|---|
| Rijles in een automaat: € 76 per uur in pakketvorm; losse simulatorles en automaatles tarieven staan afzonderl | De prijs "€ 76 per uur in pakketvorm; losse simulatorles en automaatles tarieven staan afzonderlijk vermeld." staat niet in het citaat van de site; controleer hem. | `profile_offerings` |
| Rijles in een elektrische auto: Ook mogelijk in pakket voor € 76 per uur. | De prijs "Ook mogelijk in pakket voor € 76 per uur." staat niet in het citaat van de site; controleer hem. | `profile_offerings` |
| Rijsimulatorles: Losse les van 60 minuten: € 50; cursus van 8 uur: € 380. | De prijs "Losse les van 60 minuten: € 50; cursus van 8 uur: € 380." staat niet in het citaat van de site; controleer hem. | `profile_offerings` |
| Proefles / intake voor rijlessen: Intake van 60 minuten: € 50; de intakekosten worden teruggegeven als de leer | De prijs "Intake van 60 minuten: € 50; de intakekosten worden teruggegeven als de leerling daarna bij de rijschool lest." staat niet in het citaat van de site; controleer hem. | `profile_offerings` |
| Autorijles (handgeschakeld): Losse autorijles van 60 minuten: € 80; lessen als pakket vanaf € 76 per uur. Pakk | De prijs "Losse autorijles van 60 minuten: € 80; lessen als pakket vanaf € 76 per uur. Pakketten: 20 lessen van 75 minuten voor € 2525 of 32 lessen van 75 minuten voor € 3665." staat niet in het citaat van de site; controleer hem. | `profile_offerings` |
| Voor begeleiding door een instructeur met ervaring met faalangst, ASS of AD(H)D wordt geen toeslag gerekend. | Geldt voor "begeleiding door een instructeur met ervaring met faalangst, ASS of AD(H)D", maar dat is aan geen dienst te koppelen. Nu merkbreed. | `brand_facts` |
| Leerlingen kunnen vóór het rijden op de weg een aantal lessen in de rijsimulator volgen. | Geldt voor "leerlingen", maar dat is aan geen dienst te koppelen. Nu merkbreed. | `brand_facts` |
| Het starterspakket omvat 25 uur, verdeeld over 20 lessen van 75 minuten. | Geldt voor "starterspakket", maar dat is aan geen dienst te koppelen. Nu merkbreed. | `brand_facts` |
| Het basispakket omvat 40 uur, verdeeld over 32 lessen van 75 minuten. | Geldt voor "basispakket", maar dat is aan geen dienst te koppelen. Nu merkbreed. | `brand_facts` |
| De gepubliceerde pakketprijzen gelden volgens de prijslijst vanaf 1 november 2025, onder voorbehoud van prijsw | Geldt voor "gepubliceerde pakketprijzen", maar dat is aan geen dienst te koppelen. Nu merkbreed. | `brand_facts` |
| Leerlingen krijgen les van één vaste rijinstructeur. | Geldt voor "leerlingen", maar dat is aan geen dienst te koppelen. Nu merkbreed. | `brand_facts` |
| De rijsimulatorcursus duurt acht uur en kost volgens de prijslijst € 380; bij het volgen van de cursus is een  | Geldt voor "rijsimulatorcursus", maar dat is aan geen dienst te koppelen. Nu merkbreed. | `brand_facts` |

### Wesley Keeris Installatietechniek

| Wat | Waarom op deze lijst | Bron |
|---|---|---|
| Service en onderhoud: Vrijblijvende offerte op aanvraag | De prijs "Vrijblijvende offerte op aanvraag" staat niet in het citaat van de site; controleer hem. | `profile_offerings` |
| Service en onderhoud van installaties: Vrijblijvende offerte op aanvraag | De prijs "Vrijblijvende offerte op aanvraag" staat niet in het citaat van de site; controleer hem. | `profile_offerings` |
| Het kantoor is van maandag tot en met vrijdag geopend van 08:00 tot 16:30 uur. | Geldt voor "kantoor", maar dat is aan geen dienst te koppelen. Nu merkbreed. | `brand_facts` |
| Het contactadres is Hooge Akker 15, 5661 NG Geldrop. | Geldt voor "adres", maar dat is aan geen dienst te koppelen. Nu merkbreed. | `brand_facts` |

### Hans Verstraaten Hoveniers

| Wat | Waarom op deze lijst | Bron |
|---|---|---|
| Kunstgras: Offerte op aanvraag. | De prijs "Offerte op aanvraag." staat niet in het citaat van de site; controleer hem. | `profile_offerings` |
| Aanleg van golf putting greens: Offerte op aanvraag. | De prijs "Offerte op aanvraag." staat niet in het citaat van de site; controleer hem. | `profile_offerings` |
| Een offerte aanvragen is gratis. | Geldt voor "offerte aanvragen", maar dat is aan geen dienst te koppelen. Nu merkbreed. | `brand_facts` |
| Het bedrijf doet zijn best om binnen vier uur een offerte te sturen. | Geldt voor "offerte sturen", maar dat is aan geen dienst te koppelen. Nu merkbreed. | `brand_facts` |
