# Het clusterresultaat zonder eigen scherm

**Gebouwd op 22 september 2026.** Dit document blijft staan zolang er één ding open staat: het
off-site werk (zie het laatste blok). De rest is af en nagerekend; het waarom ervan staat in
`docs/logbook.md`, 22 september 2026.

## Wat er weg is, en waarom

Een cluster had een eigen resultatenpagina (`/analyses/[id]`). Die was tegelijk het wachtscherm:
na "Bevestig en start de meting" keek je naar een voortgangsbalk voor werk dat op de server
doorloopt, ook als je de tab sluit. Daarna toonde hetzelfde adres de uitslag.

De eigenaar streepte allebei door, om dezelfde reden waarom dit scherm op 16 september 2026 al drie
van zijn vier hoofdstukken verloor: alles wat erop stond, staat ergens anders óók, en dan is het
geen samenvatting maar een tweede waarheid op een plek waar niemand hem zoekt.

| Wat erop stond | Waar het nu staat |
|---|---|
| De cijfers van de meting | Analytics, met een filter per cluster |
| De conclusie in gewone taal | Analytics, zodra je één cluster kiest (nieuw, stond nergens anders) |
| De vragen die uit de meting kwamen | Strategie → Openstaande vragen, met een filter per cluster |
| De voorgestelde pagina's | Strategie → Contentplan, als voorraad naast de twaalf maanden |
| "Schrijf deze pagina nu" | Contentplan → Plannen, in het menu achter de drie puntjes, alleen beheerder |
| Opnieuw proberen na een storing | Het kaartje van het cluster in het clusteroverzicht |
| Het off-site werk | Nergens. Bewuste keuze, zie het laatste blok |

## Wat ervoor in de plaats kwam

**Na het bevestigen ga je terug naar je clusters**, met de melding "Cluster gelanceerd" rechtsonder
(`app/(app)/merk/[id]/strategie/clusters/lancering-melding.tsx`). De meting stond op dat moment al in
de wachtrij: `POST /api/analyses/[id]/confirm` plant hem zelf in, en dat deed hij al sinds
optimalisatie.md 1.5. Het wachtscherm voegde daar niets aan toe behalve kijktijd.

**De uitslag komt je achterna.** `components/cluster-melder.tsx` staat in de app-schil en vraagt elke
twintig seconden of er een cluster van dit merk klaar is. Zo ja, dan verschijnt "Cluster succesvol
gemeten" met de drie cijfers die de eigenaar vroeg: zichtbaarheid, openstaande vragen, voorgestelde
pagina's. Een mislukte ronde krijgt dezelfde behandeling in het rood, want zonder tegenbericht blijft
iemand wachten op een melding die nooit komt.

Twee regels die daarbij horen:

- **Één melding per ronde**, bewaakt door `analyses.resultaat_gezien_at` (migratie 0107). Leeg
  betekent "nog te melden"; `enqueueMeasurement()` maakt hem leeg zodra er échte meettaken bijkomen.
  Wie pas de volgende ochtend inlogt, krijgt de melding alsnog.
- **Hooguit drie tegelijk** (`lib/cluster-melding.ts`), maar alles wordt weggezet. Acht meldingen
  onder elkaar is geen mededeling maar een muur.

De beslissing wát er gemeld wordt en in welke woorden staat in `lib/cluster-melding.ts`, puur en
zonder `server-only` (conventie 2), met tests in `scripts/test-unit.ts`. Scenario 16 in
`scripts/test-chain.ts` legt de levensloop van het vlaggetje vast.

## Het enige wachtscherm dat overblijft

`/analyses/[id]/concept`. Daar wacht je op het onderzoek en de vragen, en dat is het enige wachten
in de app waar jíj daarna iets mee moet: je geeft akkoord. Op de meting wacht je nergens op.

`/analyses/[id]` zelf verwijst nu door: naar het concept zolang dat nog loopt of op akkoord wacht,
en anders naar het clusteroverzicht. Het bestand blijft bestaan omdat er links naar dit adres staan
in verstuurde rapportmails en in bladwijzers van klanten; een 404 kost daar een gesprek.

## Off-site: bewust weggelaten, niet verhuisd

**Besluit van de eigenaar, 22 september 2026: het off-site werk gaat voorlopig helemaal uit de app.**
Dat is iets anders dan de rest van dit document, want dit is het enige onderdeel dat nergens anders
terugkomt.

Wat het was: per cluster een lijst concrete acties buiten je eigen website ("zorg dat je op deze
vergelijkingssite staat"), met een status per actie, plus het bronnenlandschap eronder. Het stond
alleen op de resultatenpagina, en er stond een regel per actie in de werklijst op de startpagina.

Wat er nu gebeurt:

- Het paneel is weg (`_work/offsite-panel.tsx`, verwijderd).
- Het werkitem is weg uit `lib/work.ts`. Een taak zonder scherm om hem af te vinken is een taak die
  de klant nooit kan afronden, en die hoort niet op zijn startpagina te staan.
- **De data blijft.** `offsite_tasks` wordt nog gewoon gevuld, en de API-route om een taak af te
  vinken staat er nog. Komt dit onderdeel terug, dan staat de geschiedenis er nog.
- **De scan blijft ook draaien**, en dat is geen slordigheid. Dezelfde taak (`offsite_scan`,
  ingepland door `lib/pipeline/report.ts`) vult `source_landscape`, en dáárop draait Analytics →
  Concurrenten. Wie deze aanroep ooit uitzet om kosten te sparen, haalt dus ook dat scherm leeg.

**Wat er moet gebeuren voordat dit terugkomt.** Niet "het paneel terugzetten": off-site werk is geen
content en geen vraag aan de klant, dus het hoorde nooit thuis op een scherm dat over één cluster
gaat. Het is merkbreed werk met een eigen ritme (een platform kan weken duren en loopt vaak via
iemand anders). Een terugkeer vraagt dus eerst een antwoord op: wiens taak is dit, hoe vaak kijkt
die persoon ernaar, en wat is de eerstvolgende handeling? Zolang dat antwoord er niet is, is
weglaten eerlijker dan een lijst die niemand afvinkt.

⚠️ `WorkKind` kent nog steeds de soort `offsite` (`lib/work-kind.ts`) en `URGENCY` zijn plek in de
volgorde. Die blijven met opzet staan: ze kosten niets en ze zijn de vorm waarin dit terugkomt.

## Wat er NIET gebeurd is, en bewust

**Geen voortgangsteller op het clusterkaartje.** Het kaartje zegt "ORBIT ENGINE stelt nu de vragen
aan AI-assistenten" en niet "12 van de 30". Dat tweede cijfer vraagt per cluster een telling over
`tracking_runs` in de juiste periode, en een teller die bij een maandronde de verkeerde periode pakt
liegt tegen de klant over iets waar hij toch niets aan kan doen. De statusbadge draagt de stand, de
melding draagt het moment.

**Geen routes opgeruimd.** `POST /api/analyses/[id]/generate`, `/generate-all`, `/measure` en
`/report` hebben sinds vandaag geen knop meer die ze aanroept: het schrijven loopt via het
contentplan, het meten via het bevestigen en de herstelknop. Ze staan er nog, want ze zijn de
handmatige ingang bij een storing en ze kosten niets zolang niemand ze aanroept. Wie ze weghaalt,
haalt ook die ingang weg; dat is een eigen afweging en geen opruimwerk.

**Geen tweede melding halverwege.** `gemeten` (score binnen, rapport volgt) levert geen melding op:
twee van de drie cijfers zouden dan op nul staan terwijl ze een minuut later wel bestaan.
