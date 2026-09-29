"""
Bouwt het klantdocument voor de copywriter volgens het sjabloon in
`docs/contentkwaliteit-testmethode.md` §4, uit één databestand.

Waarom een script: het sjabloon is voor elke klant hetzelfde, alleen de
inhoud verschilt. Met de hand plakken van zes pagina's met elk twee versies is
foutgevoelig (de verkeerde versie onder het verkeerde kopje), en klant B en C
volgen met hetzelfde sjabloon.

Gebruik:
    python3 maak_klantdocument.py data.json klantdocument.md

`data.json` wordt per ronde samengesteld uit de database (alleen lezen):
    {
      "bedrijf": "...", "sector": "...", "werkgebied": "...",
      "voor_wie": ["..."], "toon": "...",
      "paginas": [{
        "titel": "...", "doel": "...", "voor_wie": "...",
        "open_vraag_antwoord": "..." | null,
        "gerichte_vragen": [{"vraag": "...", "antwoord": "..." | null}],
        "eerste_versie": "...", "definitieve_versie": "..." | null
      }]
    }

`definitieve_versie` is null als er geen herschrijving was; dan schrijft het
sjabloon "gelijk aan de eerste versie".

De sjabloontekst hieronder is letterlijk die van §4 (versie 1, 28 september
2026). Wijzig hem alleen samen met §4 en leg de wijziging vast in §9.
"""
import json
import sys


def verlaag_koppen(tekst: str) -> str:
    """Koppen in een paginatekst drie niveaus lager (# wordt ####).

    De paginatekst staat onder "### De tekst", en een `#` of `##` daarin zou
    groter weergegeven worden dan de kop "Pagina n" van het document zelf. De
    tekst verandert niet, alleen de koplaag.
    """
    regels = []
    for regel in tekst.splitlines():
        if regel.startswith("#"):
            regel = "###" + regel
        regels.append(regel)
    return "\n".join(regels)


def pagina_blok(n: int, p: dict) -> str:
    aangeleverd = []
    if p.get("open_vraag_antwoord"):
        aangeleverd.append(p["open_vraag_antwoord"].strip())
    else:
        aangeleverd.append("*(Op de open vraag is geen antwoord gegeven.)*")
    vragen = p.get("gerichte_vragen") or []
    if vragen:
        aangeleverd.append("")
        for v in vragen:
            antwoord = v.get("antwoord")
            aangeleverd.append(f"- **{v['vraag'].strip()}**  ")
            aangeleverd.append(f"  {antwoord.strip()}" if antwoord else "  *(niet beantwoord)*")
    definitief = p.get("definitieve_versie")
    definitief_tekst = (
        verlaag_koppen(definitief.strip())
        if definitief and definitief.strip() != p["eerste_versie"].strip()
        else "*Gelijk aan de eerste versie, geen herschrijving nodig.*"
    )
    return f"""## Pagina {n}: {p['titel']}

**Waarvoor deze pagina bedoeld is:** {p['doel']}
**Voor wie:** {p['voor_wie']}

### Wat het bedrijf zelf heeft aangeleverd
{chr(10).join(aangeleverd)}

### De tekst (eerste versie)
{verlaag_koppen(p['eerste_versie'].strip())}

### De tekst (na controle en eventuele herschrijving, dit is de definitieve versie)
{definitief_tekst}

### Jouw beoordeling
| Punt | Cijfer (1-5) | Toelichting |
|---|---|---|
| **Heeft dit de kwaliteit van een copywriter die een pagina schrijft voor een klant?** (de hoofdvraag) | | |
| Is de pagina compleet? Mis je iets dat op een goede pagina over dit onderwerp had moeten staan, ook als daar niet letterlijk naar gevraagd werd? Wat dan? | | |
| Vindt een bezoeker met dit doel op deze pagina wat hij zoekt, en snel? | | |
| Leest het lekker: prettige opbouw, geen rommelige zinnen, geen herhaling? | | |
| Klopt het, staat er niets wat feitelijk onjuist aanvoelt? | | |
| Klinkt het als dit specifieke bedrijf, niet als een generieke tekst die op elk bedrijf in de branche past? | | |

**Zou je dit publiceren op de website van dit bedrijf?**
- [ ] Ja, zo
- [ ] Nee, maar met wat bijschaven en finetuning kan het wel
- [ ] Nee, dit zit onder de maat en ik zou opnieuw beginnen

*(bij een pagina die laag scoort: voeg hier je korte schets toe van wat jij zelf zou schrijven of
toevoegen)*

---
"""


def document(d: dict) -> str:
    n = len(d["paginas"])
    kop = f"""# Contentbeoordeling: {d['bedrijf']}

Dit document bevat {n} pagina's die automatisch zijn opgesteld voor dit bedrijf, met de
achtergrondinformatie waarmee ze zijn geschreven. We willen weten of ze goed genoeg zijn om
zonder verdere bewerking op de eigen website van het bedrijf te zetten, en waar niet.

**De maatstaf.** Beoordeel elke pagina op het niveau van een professionele copywriter die dit
bedrijf zelf zou inhuren om deze pagina te schrijven. Dat is een hoge lat, met opzet.

**Hoe we willen dat je leest.** Lees elke pagina zoals je dat als vakcopywriter zou doen voor een
opdrachtgever, niet als een checklist. Vraag je bij elke pagina eerst af: wat is het doel van deze
pagina, en wie leest hem? Vind je daarna alles wat je zou verwachten, of mis je iets dat er wel op
had moeten staan, ook als dat niet met zoveel woorden gevraagd werd? En is het geschreven op het
niveau dat jij als copywriter zou opleveren?

**Wat we vragen.** Beoordeel elke pagina op de punten onder aan die pagina. Vul een cijfer van 1
(helemaal niet) tot 5 (helemaal wel) in, met een korte reden. Een paar zinnen per punt is genoeg;
wat je zou aanpassen of toevoegen is waardevoller dan het cijfer zelf.

Bij de laagst scorende pagina's van dit bedrijf vragen we je iets extra's: een paar zinnen over wat
jij daar zelf anders zou schrijven of toevoegen. Geen volledige herschrijving, alleen een schets
waar wij mee verder kunnen.

Onderaan dit document staat ruimte voor een algemene indruk over alle {n} pagina's van dit
bedrijf samen: valt je iets op dat vaker terugkomt?

Stuur dit document na het invullen gewoon terug, met je opmerkingen erin.

---

## Over dit bedrijf
- Sector: {d['sector']}
- Werkgebied: {d['werkgebied']}
- Voor wie: {'; '.join(d['voor_wie'])}
- Toon: {d['toon']}

---

"""
    blokken = "\n".join(pagina_blok(i + 1, p) for i, p in enumerate(d["paginas"]))
    staart = f"""
## Algemene indruk over alle pagina's van {d['bedrijf']} samen
*(Wat valt op, wat komt vaker terug, wat zou je als eerste aanpakken?)*

"""
    return kop + blokken + staart


if __name__ == "__main__":
    bron, doel = sys.argv[1], sys.argv[2]
    with open(bron, encoding="utf8") as f:
        data = json.load(f)
    with open(doel, "w", encoding="utf8") as f:
        f.write(document(data))
    print(f"{doel}: {len(data['paginas'])} pagina's")
