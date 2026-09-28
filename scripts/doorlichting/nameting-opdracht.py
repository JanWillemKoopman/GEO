"""Bouwt de opdrachten voor de blinde lezer (nameting fase 1) in het formaat van poort19."""
import json, re, sys
K = '/home/user/GEO/docs/tasks/kwaliteitsdoorlichting/'
# Tweede argument: de map voor deze meting (standaard nameting-fase1/, de eerste).
UIT = (sys.argv[2].rstrip('/') + '/') if len(sys.argv) > 2 else '/home/user/GEO/docs/tasks/kwaliteitsdoorlichting/nameting-fase1/'
d = json.load(open(sys.argv[1]))  # per merk de nieuwe en de oude versie, zoals nameting-fase1/teksten.json

def blok(bestand, begin, eind):
    t = open(bestand).read()
    i = t.index(begin); j = t.index(eind, i) + len(eind)
    return t[i:j]

def paginablok(bestand, n):
    t = open(bestand).read()
    i = t.index(f'### Pagina {n}\n'); j = t.find('### Pagina', i + 5)
    j = t.index('## Wat je doet') if j == -1 else j
    return t[i:j]

def tekst(p):
    s = p['body'].rstrip() + '\n'
    if p['faq']:
        s += '\n\nVragen en antwoorden onderaan:\n' + ''.join(f"V: {f['q']}\nA: {f['a']}\n" for f in p['faq'])
    return s

bronnen = {
    'A': (K + 'herhaling/poort19/A-teksten-opdracht.md', K + 'poort19/A-teksten-opdracht.md', 1),
    'B': (K + 'herhaling/poort19/B-teksten-opdracht.md', K + 'herhaling/poort19/B-teksten-opdracht.md', 4),
}
import os; os.makedirs(UIT, exist_ok=True)
for merk, p in d.items():
    basis, paginabron, n = bronnen[merk]
    t = open(basis).read()
    kop = t[: t.index('## De teksten')]
    vragen = t[t.index('## Wat je doet'):]
    oud = paginablok(paginabron, n)
    kopregels = oud[: oud.index('<<<NIEUWE TEKST')]
    kopregels = re.sub(r'### Pagina \d+', '### Pagina 1', kopregels)
    kopregels = re.sub(r'- Titel in Google: .*', f"- Titel in Google: {p['nieuw']['meta_title']}", kopregels)
    kopregels = re.sub(r'- Omschrijving in Google: .*', f"- Omschrijving in Google: {p['nieuw']['meta_description']}", kopregels)
    huidig = ''
    if '<<<HUIDIGE PAGINA' in oud:
        huidig = oud[oud.index('<<<HUIDIGE PAGINA'):]
        huidig = re.sub(r'HUIDIGE PAGINA \d+', 'HUIDIGE PAGINA 1', huidig)
    enkel = (kop + "## De teksten\n\nEr is 1 webpagina geschreven om beter gevonden te worden in Google en in AI-assistenten zoals ChatGPT. "
             "Er staat bij voor wie hij bedoeld is, en waar hij een bestaande pagina vervangt of er een al bestaat, de huidige tekst.\n\n"
             + kopregels + '<<<NIEUWE TEKST 1\n' + tekst(p['nieuw']) + 'NIEUWE TEKST 1>>>\n\n' + huidig.rstrip() + '\n\n' + vragen)
    open(UIT + f'{merk}-enkel-opdracht.md', 'w').write(enkel)
    # Paar: de nieuwe versie op plek A bij de hovenier en op plek B bij de installateur, tegen volgorde-effect.
    nieuw_eerst = merk == 'A'
    x, y = (p['nieuw'], p['oud']) if nieuw_eerst else (p['oud'], p['nieuw'])
    paar = (kop + "## De opdracht\n\nHieronder staan twee versies van dezelfde webpagina, bedoeld om beter gevonden te worden in Google en in AI-assistenten zoals ChatGPT.\n\n"
            + re.sub(r'- (Titel|Omschrijving) in Google: .*\n', '', kopregels.replace('### Pagina 1\n', '')) + f"\n<<<A\nTitel in Google: {x['meta_title']}\n\n" + tekst(x) + "A>>>\n\n<<<B\nTitel in Google: "
            + f"{y['meta_title']}\n\n" + tekst(y) + "B>>>\n\n## Wat je doet\nKies de versie die je als eindredacteur zou laten publiceren. Let op alles: inhoud, betrouwbaarheid, toon, overtuigingskracht. Noem het belangrijkste verschil met een letterlijk citaat.\n\n"
            'Antwoord met uitsluitend dit JSON-object:\n{ "keuze": "A" | "B" | "gelijk", "zekerheid": 1-5, "belangrijkste_verschil": "...", "citaat": "..." }\n')
    open(UIT + f'{merk}-paar-opdracht.md', 'w').write(paar)
    print(merk, 'nieuw staat op plek', 'A' if nieuw_eerst else 'B')
