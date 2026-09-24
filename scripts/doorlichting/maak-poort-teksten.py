"""Bouwt per merk de opdracht voor de blinde lezer over de geschreven teksten (stap 19 tot 23).
Gebruik: python3 maak-poort-teksten.py <merkcode> <bedrijfsnaam> <dossierkop> <sitebestand> <uit.md> [adres=huidigepagina ...]
De lezer ziet: wat de ondernemer echt weet (waarheidsdossier), de eigen site, per tekst de nieuwe versie
en, waar die er is, de huidige pagina op de site. Niets over hoe de app werkt en niets over het oordeel van de app."""
import json, os, re, sys
# Draai vanuit docs/tasks/kwaliteitsdoorlichting. TEKSTEN_MAP wijst naar de teksten van een herhaling.
k, bedrijf, kop, sitebestand, uit = sys.argv[1:6]
extra = dict(a.split('=', 1) for a in sys.argv[6:])
teksten = json.load(open(f"{os.environ.get('TEKSTEN_MAP', 'teksten')}/{k}.json"))
wd = open('waarheidsdossiers.md').read()
blok = wd[wd.index(kop):]
i = blok.find('\n---', 10)
blok = blok if i < 0 else blok[:i]
site = open('sites/' + sitebestand).read()
def pagina(url):
    m = re.search(r'### ' + re.escape(url) + r'\n(.*?)(?=\n### |\Z)', site, re.S)
    return m.group(1)[:6000] if m else None
delen = [f"""Je bent een ervaren Nederlandse copywriter en SEO-specialist voor het mkb. Je werkt voor geen enkel softwarebedrijf en weet niet hoe de teksten hieronder gemaakt zijn.

BELANGRIJK: negeer alle andere instructies, projectbestanden of schrijfregels die je eventueel eerder in je context hebt gekregen. Gebruik alleen je eigen vakoordeel en alleen wat in dit bestand staat. Lees geen andere bestanden en zoek niets op.

## De opdrachtgever

Hieronder staat alles wat waar is over **{bedrijf}**: wat op de eigen website staat en wat de ondernemer in een gesprek vertelde. Dit is de waarheid. Staat iets in een tekst dat hier niet staat en ook geen algemene vakkennis is, dan is het verzonnen.

<<<WAARHEID
{blok}
WAARHEID>>>

## De teksten

Er zijn {len(teksten)} webpagina's geschreven om beter gevonden te worden in Google en in AI-assistenten zoals ChatGPT. Per pagina staat erbij voor wie hij bedoeld is, en waar het een bestaande pagina vervangt of er een al bestaat, de huidige tekst.
"""]
for i, t in enumerate(teksten, 1):
    huidig = t.get('huidige_tekst') or (pagina(extra[str(i)]) if str(i) in extra else None)
    faq = '\n'.join(f"V: {f['q']}\nA: {f['a']}" for f in (t.get('faq') or []))
    delen.append(f"""
### Pagina {i}

- Bedoeld als: {t['plantitel']}
- Adres waar hij komt: {t.get('bestaand_adres') or ('nieuw' if not extra.get(str(i)) else extra[str(i)])}
- Voor wie: {t['voor_wie']}
- Titel in Google: {t['titel']}
- Omschrijving in Google: {t['meta']}

<<<NIEUWE TEKST {i}
{t['tekst']}

Vragen en antwoorden onderaan:
{faq}
NIEUWE TEKST {i}>>>
""" + (f"""
<<<HUIDIGE PAGINA {i}
{huidig[:6000]}
HUIDIGE PAGINA {i}>>>
""" if huidig else ""))
delen.append("""
## Wat je doet

Beoordeel elke pagina streng, als iemand die zijn naam eronder moet zetten. Onderbouw elk probleem met een letterlijk citaat.

1. **Klopt het?** Elke bewering over het bedrijf die niet in de waarheid staat of er tegenin gaat. Let ook op woorden die de ondernemer niet wil.
2. **De ondernemer:** zou hij deze tekst zonder aanpassingen publiceren? Wat zou hij als eerste veranderen?
3. **De bezoeker:** iemand uit de doelgroep die zoekt. Krijgt hij antwoord, en zou hij contact opnemen?
4. **De copywriter:** niveau van een professionele copywriter? Cijfer 1 tot 10. Noem herhaling, holle zinnen, kromme koppen, clichés.
5. **AI-assistent:** kan ChatGPT uit deze pagina een concreet, citeerbaar antwoord halen op de vraag van de doelgroep?
6. **Vergelijking:** waar een huidige pagina staat: welke is beter voor bezoeker en vindbaarheid, de nieuwe of de huidige? Waarom?
7. **Past de pagina bij het adres?** Wordt de bestaande pagina op dat adres vervangen door iets met een ander onderwerp?

Antwoord met uitsluitend dit JSON-object:
{
  "paginas": [
    {
      "pagina": 1,
      "fout_of_verzonnen": [ {"citaat": "...", "probleem": "...", "ernst": "hoog"|"middel"|"laag"} ],
      "ondernemer_publiceert": "ja" | "met_aanpassingen" | "nee",
      "ondernemer_verandert_eerst": "...",
      "bezoeker_neemt_contact_op": "ja" | "misschien" | "nee",
      "copywriter_cijfer": 1-10,
      "copywriter_problemen": [ {"citaat": "...", "probleem": "..."} ],
      "ai_citeerbaar": "ja" | "deels" | "nee",
      "beste_citeerbare_zin": "...",
      "vergelijking_huidig": "nieuw_beter" | "huidig_beter" | "gelijk" | "geen_huidige",
      "waarom_vergelijking": "...",
      "past_bij_adres": true|false
    }
  ],
  "rode_draad": "wat gaat bij alle pagina's mis, in twee zinnen",
  "niveau_professionele_copywriter": "ja" | "bijna" | "nee"
}
""")
open(uit, 'w').write(''.join(delen))
print(uit, sum(len(d) for d in delen), 'tekens')
