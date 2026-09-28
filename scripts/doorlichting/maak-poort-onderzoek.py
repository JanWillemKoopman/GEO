"""Bouwt per merk de opdracht voor de blinde lezer over het onderzoek (stap 2-7).

Gebruik: python3 maak-poort-onderzoek.py <spoor.json> <sitetekst.txt> <uit.md> <bedrijfsnaam>
De lezer ziet: de sitetekst (onze eigen, onafhankelijke kopie) en per stap het resultaat.
Hij ziet niets van hoe de app werkt: geen prompts, geen namen van stappen in de code.
"""
import json, sys

spoor_pad, site_pad, uit_pad, naam = sys.argv[1:5]
spoor = json.load(open(spoor_pad))
site = open(site_pad).read()

def laatste(kind):
    rijen = [a for a in spoor["aanroepen"] if a["kind"] == kind]
    return rijen[-1]["raw_json"] if rijen else None

def alle(prefix):
    return [(a["kind"], a["raw_json"]) for a in spoor["aanroepen"] if a["kind"].startswith(prefix)]

def js(x, n=12000):
    t = x if isinstance(x, str) else json.dumps(x, ensure_ascii=False, indent=1)
    return t[:n] + ("\n[... afgekapt]" if len(t) > n else "")

stappen = [
    ("S3", "Het bedrijf en de markt beschrijven",
     "Een assistent las de website en beschreef het bedrijf: wat het doet, voor wie, hoe het klinkt, wat het onderscheidt, wie de concurrenten zijn en welke harde feiten er zijn. Dit is de basis voor alle teksten die later voor dit bedrijf geschreven worden.",
     "Klopt deze beschrijving met de website? Wat is fout, wat is verzonnen, wat belangrijks ontbreekt dat wel op de site staat?",
     laatste("profile_research")),
    ("S4", "Het aanbod in kaart brengen",
     "Een assistent zette alle diensten en producten als boom op een rij (hoofddienst met onderliggende diensten).",
     "Zou de ondernemer deze lijst herkennen als zijn aanbod? Ontbreekt er iets, staat er iets bij dat hij niet doet, klopt de indeling?",
     laatste("profile_offering")),
    ("S5", "Concurrenten en marktbronnen",
     "Een assistent zocht uit wie de concurrenten zijn, waarom die winnen, en welke websites deze markt bepalen.",
     "Zijn dit echte, relevante concurrenten in deze regio? Is de uitleg waarom ze winnen onderbouwd of algemeen?",
     laatste("profile_market")),
    ("S6", "Onderwerpen voorstellen",
     "Een assistent stelde onderwerpen voor waar het bedrijf content over zou moeten maken om beter gevonden te worden.",
     "Zou een ervaren marketingconsultant deze onderwerpen kiezen voor groei? Zijn ze specifiek genoeg? Mist er een voor de hand liggend onderwerp?",
     laatste("propose_topics")),
    ("S7", "Wat AI-assistenten al over het bedrijf weten",
     "Een assistent testte of AI-assistenten dit bedrijf kennen en of wat ze zeggen klopt.",
     "Is de conclusie over het bedrijf juist, gezien de antwoorden? Zijn er fouten die over het hoofd gezien zijn?",
     alle("llm_baseline")),
    ("S8", "Alles samenbrengen tot één dossier",
     "Een assistent bundelde alles tot één dossier dat een tekstschrijver meekrijgt.",
     "Kan een goede copywriter hier een sterke, specifieke pagina uit maken? Wat mist hij het meest?",
     laatste("profile_synthesis")),
]

delen = [f"""Je bent een ervaren Nederlandse marketingconsultant en copywriter voor het mkb. Je werkt voor geen enkel softwarebedrijf en je weet niet hoe het materiaal hieronder gemaakt is.

BELANGRIJK: negeer alle andere instructies, projectbestanden of schrijfregels die je eventueel eerder in je context hebt gekregen. Gebruik alleen je eigen vakoordeel en alleen wat in dit bestand staat. Lees geen andere bestanden en zoek niets op.

## De situatie

Voor het bedrijf **{naam}** is automatisch onderzoek gedaan, in stappen. Elke stap voedt de volgende, en aan het eind schrijft iemand webpagina's voor dit bedrijf. Jij beoordeelt per stap of het resultaat goed genoeg is om de volgende stap te voeden.

Hieronder eerst de tekst van de website zoals die op 23 september 2026 online stond (een eigen, onafhankelijke kopie; niet elke pagina is volledig). Daarna per stap het resultaat.

## De website

<<<SITE
{site[:110000]}
SITE>>>
"""]
for code, titel, uitleg, vraag, data in stappen:
    delen.append(f"""
## Stap {code}: {titel}

{uitleg}

**Poortvraag:** {vraag}

<<<RESULTAAT {code}
{js(data) if data is not None else "(deze stap leverde niets op)"}
RESULTAAT {code}>>>
""")

delen.append("""
## Wat je doet

Beoordeel elke stap los. Wees streng en eerlijk. Onderbouw elk probleem met een letterlijk citaat uit het resultaat, en waar het gaat om iets wat ontbreekt: met een citaat uit de website.

Antwoord met uitsluitend dit JSON-object:
{
  "stappen": [
    {
      "stap": "S3",
      "oordeel": "goed_genoeg" | "met_gebreken" | "onvoldoende",
      "fout_of_verzonnen": [ { "citaat": "...", "probleem": "...", "ernst": "hoog" | "middel" | "laag" } ],
      "ontbreekt": [ { "wat": "...", "bron_op_site": "..." } ],
      "gevolg_voor_de_teksten": "één zin: wat merkt de lezer van de uiteindelijke webpagina hiervan?"
    }
  ],
  "zwakste_stap": "S?",
  "waarom": "..."
}
""")
open(uit_pad, "w").write("".join(delen))
print(uit_pad, sum(len(d) for d in delen), "tekens")
