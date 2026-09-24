"""Telt de oordelen van de blinde lezers over de teksten op, zodat een herhaling op dezelfde manier
wordt vergeleken met de nulmeting van 24 september 2026 (4,1 op 10, nieuw beter in 11 van 15).
Gebruik, vanuit docs/tasks/kwaliteitsdoorlichting: python3 ../../../scripts/doorlichting/tel-oordeel.py [map]
Standaard is de map poort19 (de nulmeting); geef de map van de herhaling mee om die te tellen."""
import json, sys
from collections import Counter

MAP = sys.argv[1] if len(sys.argv) > 1 else 'poort19'
cijfers, publiceert, contact, vergelijk, adres = [], Counter(), Counter(), Counter(), 0
for k in 'ABC':
    d = json.load(open(f'{MAP}/{k}-teksten-oordeel.json'))
    eigen = [p['copywriter_cijfer'] for p in d['paginas']]
    cijfers += eigen
    for p in d['paginas']:
        publiceert[p['ondernemer_publiceert']] += 1
        contact[p['bezoeker_neemt_contact_op']] += 1
        vergelijk[p['vergelijking_huidig']] += 1
        adres += p['past_bij_adres'] is False
    print(f"{k}: cijfers {eigen}, niveau professioneel: {d['niveau_professionele_copywriter']}")
vergeleken = vergelijk['nieuw_beter'] + vergelijk['huidig_beter'] + vergelijk['gelijk']
print(f"Teksten: {len(cijfers)}, gemiddeld cijfer {sum(cijfers) / len(cijfers):.1f} op 10")
print(f"Ondernemer publiceert: {dict(publiceert)}")
print(f"Bezoeker neemt contact op: {dict(contact)}")
print(f"Nieuw beter dan huidig: {vergelijk['nieuw_beter']} van {vergeleken} vergelijkingen")
print(f"Past niet bij het adres: {adres}")
