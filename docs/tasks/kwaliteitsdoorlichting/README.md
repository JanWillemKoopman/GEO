# De proefset van de kwaliteitsdoorlichting

De vaste invoer en de nulmeting van de doorloop van 23 en 24 september 2026, zodat een herhaling
dezelfde merken met dezelfde waarheid en dezelfde blinde lezers kan meten. De uitslag van de eerste
herhaling (24/25 september 2026) staat in `docs/tasks/bevindingen-kwaliteitsdoorlichting.md`
§"Herhaling", de teksten en oordelen van die herhaling in `herhaling/`; de hulpscripts in
`scripts/doorlichting/`.

| Bestand of map | Wat het is |
|---|---|
| `waarheidsdossiers.md` | Wat echt waar is over de drie merken (site plus wat de ondernemer vertelt). Bevroren vóór de doorloop; de meetlat voor elk "verzonnen"-oordeel |
| `gesprek-A.json` tot en met `gesprek-C.json` | Wat er in het gesprek is ingevoerd (`stappen/gesprek.mjs`) |
| `uitsluiting-A.json` tot en met `uitsluiting-C.json` | De gecorrigeerde lijsten "gelijknamige bedrijven die jij niet bent" |
| `antwoorden/realistisch.json` | De antwoorden van de klant op de vragen van de nulmeting, per merk en vraag-id. Alleen wat in het waarheidsdossier staat; de rest `SKIP` |
| `sites/` | Onze eigen kopie van de sitetekst van 23 september, gemaakt met `scripts/doorlichting/haal-site.py` |
| `poort/` | Opdrachten en samenvattingen van de blinde lezer over het merkonderzoek en de meetvragen |
| `poort13/` | Opdracht en oordeel van de blinde lezer over het rapport, per merk |
| `rapporten/` | Het rapport per merk zoals de lezer van `poort13/` het kreeg |
| `teksten/` | De 16 geschreven teksten van de nulmeting, zoals ze uit `content_pieces` kwamen |
| `poort19/` | Opdracht en oordeel van de blinde lezer over die teksten: **de nulmeting, 4,1 op 10** |
| `blinde-lezer-toets/` | De toets vooraf die liet zien dat de lezer betrouwbaar vergelijkt, maar geen betrouwbaar los cijfer geeft |
| `bevindingen-log.md` | Het logboek dat tijdens de doorloop werd bijgehouden, vóór de uitwerking in de bevindingenlijst |

**Letterlijke opnames.** Alles in `teksten/`, `rapporten/`, `sites/`, de oordelen en de opdrachten is
ongewijzigd bewaard (conventie 8), ook waar er gedachtestreepjes in staan: het zijn opnames van wat de
app, de site of de lezer toen schreef, en een herhaling moet er precies tegen vergeleken kunnen worden.
Wat wij zelf schreven, volgt `docs/schrijfstijl.md`.

**Geen geheimen.** Er staan hier geen wachtwoorden of sleutels in, en er komen er ook geen in. De
inlogstaat van de schermbesturing wordt buiten de repository bewaard.
