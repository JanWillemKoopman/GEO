# Overdracht: het kwaliteitsraamwerk voor content (3 september 2026)

Dit is het startpunt voor de volgende sessie. Het zegt wat er staat, wat er aantoonbaar NIET werkt,
en wat de eerstvolgende stap is. De redenering achter de keuzes staat in
`docs/tasks/contentkwaliteit-framework.md`; het klantdossier van de testronde in
`docs/tasks/benchmarkronde-twee-klanten.md`; de besluiten met datum en cijfer in `docs/logbook.md`.

**Werk op branch `claude/orbit-content-quality-framework-r9ypcx`.** Die is bijgewerkt met `main` en
alle vier de controles staan groen: `npx tsc --noEmit`, 4103 unittests, 636 ketentests,
`npm run build`.

---

## 1. Waar dit over gaat, in één alinea

Een pagina die ORBIT ENGINE schrijft moet niet te onderscheiden zijn van wat een goede copywriter
voor déze klant zou schrijven, en de app moet kunnen uitleggen waarom een pagina goed of onvoldoende
is en waar in de keten het misging. Fase A tot en met E daarvan is gebouwd. Fase F, de ijking op
echte data, is de reden dat deze overdracht bestaat.

---

## 2. Wat er staat en werkt

| Onderdeel | Bestand |
|---|---|
| Twaalf kwaliteitsdimensies, elk met een bron die hem kan vullen | `lib/pipeline/quality-dimensions.ts` |
| Vier profielen per contenttype, met eigen wegingen en drempels | `lib/pipeline/quality-profile.ts` |
| Eén type voor elke bevinding: sectie, bewijs, verwachting, blokkade, zekerheid, ketenfase | `lib/pipeline/quality-issue.ts` |
| Score, zekerheid en oordeel als drie losse getallen | `lib/pipeline/quality-score.ts` |
| Gewogen bewijsdekking, kernsecties driemaal zo zwaar | `lib/pipeline/evidence-weight.ts` |
| Root cause: in welke fase ontstond dit, en helpt herschrijven? | `lib/pipeline/root-cause.ts` |
| Eén keuring voor het eerste concept én de reparatierondes | `lib/pipeline/quality-run.ts` |
| Vierde beoordelaar (vakmanschap), naast kritiek, feitelijkheid en citeerbaarheid | `lib/schemas/content-craft.ts`, `lib/pipeline/content-panel.ts` |
| Reparatieopdracht per sectie, met toegestaan bewijs en verboden aannames | `lib/pipeline/quality-repair.ts` |
| Klantweergave en adviseursweergave, twee verschillende dingen | `components/quality-panel.tsx` |
| Kwaliteitslab met menselijke beoordeling en gouden referentie | `app/(app)/beheer/kwaliteit/` |
| **Herkeuring**: dezelfde tekst opnieuw beoordelen, ~$0,013 in plaats van ~$1,00 | `POST /api/analyses/[id]/recheck`, `herkeurContentPiece()` |
| De live app bedienen zonder browser | `scripts/live.ts`, `npm run live` |

Migraties op productie: `0091` (het raamwerk), `0092` (de herkeuring). Beide additief, beide in
`supabase/README.md`.

---

## 3. ⚠️ Wat er aantoonbaar NIET werkt

**Alle twaalf benchmarkpagina's worden geblokkeerd.** Dat was de uitkomst van de ronde van
3 september, en het is de reden dat de ijking stilligt. Een poort die honderd procent tegenhoudt
zegt niets meer, en hij liet ondertussen zestien betaalde reparatierondes draaien tegen bevindingen
die geen enkele herschrijving kon oplossen.

Twee oorzaken zijn gerepareerd, één is nog open:

| | Wat | Stand |
|---|---|---|
| R0 | Een kop werd aan de alinea eronder geplakt; een opsomming werd op de cijfers doorgeknipt. Die fragmenten golden als onbewijsbare bewering. | **gerepareerd**, `lib/pipeline/sentences.ts` |
| R0b | Een telefoonnummer maakte van elke oproep tot actie een bewering; toezeggingswoorden matchten midden in langere woorden ("mogelijk" in "contactmogelijkheden"). | **gerepareerd**, `lib/pipeline/claim-extract.ts` |
| R0c | Het schrijvende model tagt maar een deel van wat het beweert. Wat het niet tagt, blokkeert. | **open** |

**De twaalf pagina's zijn nog niet opnieuw gekeurd.** De code staat op de branch, niet op `main`, en
de werker draait alleen wat op `main` staat. Zolang dat zo is, staan de oude oordelen er nog.

**Nagemeten effect van R0 en R0b samen**, op de teksten van deze ronde en niet op oudere pagina's:
van de 62 blokkerende bevindingen bij MJB blijven er 37 over. Wat verdwijnt zijn oproepen tot actie,
telefoonnummers en woorden als "beschikbaarheid". Wat blijft staan is wat moet blijven staan: "MJB
Dakservice reageert binnen 24 uur op de aanvraag", "Niet elke vochtplek vereist 24-uursservice".

⚠️ **37 is nog steeds genoeg om te blijven blokkeren.** Verwacht dus niet dat de twaalf pagina's na
de herkeuring groen zijn. Het echte doel van die herkeuring is meten hoeveel er overblijft, zodat je
weet of R0c de laatste horde is of dat de drempels zelf te streng staan.

---

## 4. Wat er op productie klaarstaat

Twee echte bedrijven, aangemaakt via de gewone serverroutes en niet met SQL.

| Merk | Profiel-id | Clusters |
|---|---|---|
| MJB Dakservice (Apeldoorn, dakdekker) | `e1fe7b94-ead1-4020-a8ed-216905c042c8` | `8f301aef-8a5c-4130-91ae-5be720601448` (daklekkage verhelpen), `467968f3-ab2e-413c-8f2a-c94357f497bd` (dakrenovatie en dakisolatie) |
| Fysio Centrum Utrecht | `58f2da3a-b068-479c-82a3-a7952e32e9ee` | `9013d0fd-ee98-4dce-92b2-35c6a440c8ff` (bekkenfysiotherapie), `ec7d3329-4893-4ee3-9034-cbdf611cfdf5` (hardloopblessure behandelen) |

Twaalf pagina's, drie per cluster. Kosten van de hele ronde: **$10,97** tegen een raming van $16.
Nul mislukte taken in de hele keten.

⚠️ **Niet elk antwoord in die pagina's is een geverifieerd feit.** Wat uit hun eigen site komt is
echt: het werkgebied van vijftig kilometer rond Apeldoorn, de vaste ploeg van vier dakdekkers, de
garantie op materiaal en apart op werk, de twee vestigingen van de fysiopraktijk, het telefoonnummer
030-2270437, het gratis medisch consult, de contracten met alle zorgverzekeraars. **Verzonnen** zijn
de bedragen en de bedrijfsregels: de reparatie vanaf ongeveer €250, exclusief btw, geen voorrijkosten
binnen vijfentwintig kilometer, geen spoed 's nachts. Deze twaalf pagina's meten dus hoe goed de app
met een gegeven antwoord omgaat, niet of dat antwoord over MJB waar is. **Publiceren kan niet zonder
de echte cijfers.**

---

## 5. De eerstvolgende stappen, op volgorde

**1. De branch naar `main`.** Anders draait de werker de oude code en heeft de rest geen zin.

**2. De twaalf pagina's herkeuren.** Vier aanroepen, ongeveer $0,16 totaal:

```bash
npx tsx scripts/live.ts POST /api/analyses/8f301aef-8a5c-4130-91ae-5be720601448/recheck
npx tsx scripts/live.ts POST /api/analyses/467968f3-ab2e-413c-8f2a-c94357f497bd/recheck
npx tsx scripts/live.ts POST /api/analyses/9013d0fd-ee98-4dce-92b2-35c6a440c8ff/recheck
npx tsx scripts/live.ts POST /api/analyses/ec7d3329-4893-4ee3-9034-cbdf611cfdf5/recheck
```

**3. Tellen wat er overblijft**, en de uitkomst tegen de oude zetten:

```sql
select cp.title, q.repair_round, q.herkeuring, q.verdict, q.score, q.blocking_count
from content_quality_runs q join content_pieces cp on cp.id = q.content_piece_id
where cp.analysis_id in ('8f301aef-8a5c-4130-91ae-5be720601448','467968f3-ab2e-413c-8f2a-c94357f497bd',
                         '9013d0fd-ee98-4dce-92b2-35c6a440c8ff','ec7d3329-4893-4ee3-9034-cbdf611cfdf5')
order by cp.title, q.repair_round;
```

De oude rijen staan er nog naast: migratie 0092 laat een herkeuring de geschiedenis niet
overschrijven, juist zodat deze vergelijking te maken is.

**4. R0c beslissen.** Pas als je weet hoeveel er na stap 3 overblijft, is te zeggen of het probleem
zit in wat het model tagt of in hoe streng een ongetagde zin bestraft wordt. Twee richtingen, en de
tweede is waarschijnlijk de betere:

- Het schrijfmodel meer laten taggen. Maar een promptinstructie is een intentie en geen garantie
  (conventie 1), dus dit leunt op precies wat de rest van dit raamwerk niet wil.
- Een ongetagde zin niet meer standaard **blokkerend** maken. Nu is elke ongetagde bewerende zin een
  blokkade met `confidence: ZEKER` (`lib/pipeline/quality-collect.ts`). Een zin met de merknaam erin
  blokkeren is verdedigbaar; een zin waarvan het enige signaal een cijfer is, hoort misschien
  "hoog" te zijn zonder te blokkeren.

**5. Pas daarna ijken.** `IJKING_MINIMUM` is twintig menselijk beoordeelde pagina's
(`lib/quality-benchmark.ts`). Er staan er acht van eerder plus deze twaalf. ⚠️ Ze tellen alleen mee
als ze ook echt door een mens beoordeeld zijn in `/beheer/kwaliteit`; twaalf ongelezen pagina's
tellen nergens in mee.

---

## 6. Restlijst, wat er verder nog openstaat

Uit `docs/tasks/contentkwaliteit-framework.md` §10, kort:

- **R0c** hierboven.
- **De drie zinnenknippers samenvoegen.** `lib/pipeline/sentences.ts` belooft in zijn eigen
  toelichting dat drie controles hetzelfde knippen. Dat was niet zo: `content-gate.ts` en
  `validate-claims.ts` hebben elk hun eigen kopie, en de fout van R0 zat daardoor in twee van de
  drie tegelijk. De kopie in `content-gate.ts` is bewust niet meeveranderd, want daar voedt het
  knippen alleen een noemer en een "is er een citeerbare zin", en meeveranderen verschuift de
  poortuitkomst van élke bestaande pagina.
- **De herkeuring automatisch aftrappen** zodra de klant zijn tekst bewerkt
  (`PATCH .../content/[pieceId]`). De stap bestaat nu, hij wordt alleen met de hand gestart. Zonder
  dit blijft er "klaar voor publicatie" staan onder een tekst die niemand beoordeeld heeft.
- **R2** betrouwbaarheid per bron, **R3** herbruikbaarheid in de vraagselectie, **R4** de zeven
  resterende testscenario's expliciet maken, **R5** fase F.

---

## 7. Twee dingen die je moet weten voordat je begint

**De live app bedienen gaat met `npm run live`.** Inloggegevens komen uit `.env.local`
(`LIVE_EMAIL`, `LIVE_PASSWORD`), niet uit de repo. Productie is `https://geo-ten-blush.vercel.app`;
het adres `geo-janwillemkoopmans-projects.vercel.app` bestaat ook maar staat achter Vercel
Deployment Protection en geeft op elke route een 302. Wie dat test, concludeert ten onrechte dat de
app onbereikbaar is. Dat is gebeurd en heeft een hele ronde opgehouden.

**Het wachtwoord van de testaccounts staat in de geschiedenis van deze repo**, sinds 31 augustus, in
`docs/tasks/herstelplan-na-audit.md` (dat bestand is inmiddels verwijderd, maar dat haalt de tekst
niet uit de oude commits). Zet een nieuw wachtwoord voor `e2e-consultant@orbit-test.nl` en
`e2e-klant@orbit-test.nl` via Supabase, en zet het daarna in `.env.local`.

---

## 8. De les uit deze ronde

R0 en R0b waren met nadenken niet te vinden. Ze kwamen eruit door conventie 10 letterlijk te nemen:
de ronde echt draaien, op echte teksten, en dan naar de uitkomst kijken in plaats van naar de
bedoeling. De ketentest bewees de samenhang op een stub en stond de hele tijd groen, terwijl de
poort op productie honderd procent van de pagina's tegenhield.

Wat daar ook uit volgt: de eerste poging tot R0b brak de bescherming tegen de fabricages van
31 juli, en dat werd gevangen door een bestaande test op de échte zin uit die ronde. Zonder die test
was er een reparatie doorgevoerd die het ergste probleem van dit hele systeem stilletjes weer had
opengezet.
