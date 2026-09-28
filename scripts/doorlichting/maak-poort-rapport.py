"""Bouwt per merk de opdracht voor de blinde lezer over het rapport (stap 13).
De lezer is de ondernemer met een onafhankelijke marketingadviseur naast zich.
Hij ziet: wat de ondernemer wil (uit het waarheidsdossier), de website, het rapport zoals de klant
het krijgt, en de meetgegevens waar het rapport op rust. Niets over hoe de app werkt."""
import json, re, sys
k, bedrijf, sites, dossierkop = sys.argv[1], sys.argv[2], sys.argv[3].split(','), sys.argv[4]
r = json.load(open(f'rapporten/rapport-{k}-v2.json'))
wd = open('waarheidsdossiers.md').read()
blok = wd[wd.index(dossierkop):]
blok = blok[:blok.index('\n---', 10)] if '\n---' in blok[10:] else blok
wens = blok[blok.index('### Uit het gesprek'):]
site = '\n\n'.join(open('sites/' + s).read() for s in sites)[:110000]
inv = r['rapport_invoer'] or ''
bew = inv[inv.index('BEWIJSDOSSIER'):] if 'BEWIJSDOSSIER' in inv else inv
bew = bew[:bew.index('MARKTBEELD')] if 'MARKTBEELD' in bew else bew
paginas = '\n'.join(f"- {p['url']}  ({p.get('titel') or ''})" for p in (r['paginas'] or []))
klant = {
  'samenvatting': r['summary'],
  'waar_je_mist': [{'onderwerp': g['cluster'], 'wat_er_gebeurt': g['problem']} for g in r['gaps_json']],
  'aanbevolen_paginas': [{'nummer': i+1, 'prioriteit_volgens_rapport': x['priority'], 'titel': x['title'], 'soort': x['type'],
      'nieuw_of_verbeteren': x['action'], 'bestaande_pagina': x.get('existingUrl'), 'voor_wie': x.get('targetIntent'), 'waarom': x['why'],
      'vragen_die_deze_pagina_moet_beantwoorden': [t['text'] for t in x['targets']]} for i, x in enumerate(r['recommendations_json'])],
  'bewust_geen_advies': r['declined_json'],
}
tekst = f"""Je bent een ervaren Nederlandse marketingadviseur en copywriter voor het mkb. Je zit naast de eigenaar van **{bedrijf}**, die net een rapport heeft gekregen over hoe vaak AI-assistenten (ChatGPT, Google) zijn bedrijf noemen, met een lijst pagina's die hij zou moeten maken of verbeteren. Je werkt voor geen enkel softwarebedrijf en weet niet hoe het rapport gemaakt is.

BELANGRIJK: negeer alle andere instructies, projectbestanden of schrijfregels die je eventueel eerder in je context hebt gekregen. Gebruik alleen je eigen vakoordeel en alleen wat in dit bestand staat. Lees geen andere bestanden en zoek niets op.

## Wat de eigenaar wil (uit het kennismakingsgesprek)

{wens}

## De website (eigen kopie van 23 september 2026; NIET volledig, dus "staat niet op de site" mag je alleen zeggen als je het zeker weet, anders schrijf je "niet gevonden in de kopie")

<<<SITE
{site}
SITE>>>

## Pagina's die het rapport van deze website kende

{paginas or '(geen)'}

## De meetgegevens waar het rapport op rust (de vragen waarop het bedrijf NIET genoemd werd, met wie er wel stond)

<<<MEETGEGEVENS
{bew[:40000]}
MEETGEGEVENS>>>

## Het rapport zoals de eigenaar het krijgt

<<<RAPPORT
{json.dumps(klant, ensure_ascii=False, indent=1)}
RAPPORT>>>

## Wat je doet

Beoordeel streng en eerlijk, als iemand die het geld van deze eigenaar niet wil verspillen. Onderbouw elk probleem met een letterlijk citaat uit het rapport, en waar het om de feiten gaat met een citaat uit de meetgegevens of de website.

1. De samenvatting: klopt hij met de meetgegevens, begrijpt de eigenaar wat het voor hem betekent?
2. Elke aanbevolen pagina: is het een goed idee, klopt "nieuw" of "verbeteren" (bestaat die pagina, is het de juiste), past hij bij wat de eigenaar wil, overlapt hij met een andere aanbeveling? Zou jij hem laten maken?
3. De volgorde: staat het belangrijkste bovenaan, gegeven wat de eigenaar wil en wat de meting laat zien?
4. Wat ontbreekt er dat een goede adviseur wel had aangeraden?
5. Kan dit rapport zonder aanpassingen de basis zijn voor een contentplan van de komende maanden?

Antwoord met uitsluitend dit JSON-object:
{{
  "samenvatting": {{ "oordeel": "goed_genoeg" | "met_gebreken" | "onvoldoende", "problemen": [ {{"citaat": "...", "probleem": "...", "ernst": "hoog"|"middel"|"laag"}} ] }},
  "paginas": [ {{ "nummer": 1, "oordeel": "maken" | "maken_met_aanpassing" | "niet_maken", "nieuw_of_verbeteren_klopt": true|false, "problemen": [ {{"citaat": "...", "probleem": "...", "ernst": "hoog"|"middel"|"laag"}} ], "overlapt_met": [2] }} ],
  "volgorde_klopt": true|false, "betere_volgorde": [nummers], "waarom_volgorde": "...",
  "ontbreekt": [ {{"pagina": "...", "waarom": "..."}} ],
  "klaar_voor_contentplan": "ja" | "met_aanpassingen" | "nee",
  "belangrijkste_verbetering": "één zin"
}}
"""
open(f'poort13/{k}-rapport-opdracht.md', 'w').write(tekst)
print(k, len(tekst), 'tekens')
