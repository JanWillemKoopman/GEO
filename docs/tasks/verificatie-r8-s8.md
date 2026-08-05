# Verificatieronde R8 + S1–S8

**Status:** open · **Kosten:** ~$2 · **Effort:** een halve dag

R8 en S1–S8 zijn met unittests op de echte gevallen uit de contentronde getoetst, en geen van beide
op productie. Gebouwd is niet geverifieerd. Deze ronde beantwoordt in één keer of de ingrepen
werken.

## Werkwijze

Dezelfde vijf testcases opnieuw door de keten, twee pagina's per case:

| Bedrijf | Analyse-ID | Onderwerp | Nulmeting |
|---|---|---|---|
| Coolblue | `de8f2204-6505-48c0-9d89-93f96c40ceb4` | wasmachine kopen | score 36 · 22 vragen · 3 merkloos |
| Bol | `62aebcce-373e-48e7-a4f9-bc1a4821875d` | beste laptop voor studenten | score 17 · 29 vragen · 7 merkloos |
| HEMA | `49fa376e-8b23-4d2e-8c7e-669213898bef` | verjaardagscadeau <€20 | score 10 · 30 vragen · 4 merkloos |
| Van der Valk | `d08b3db5-a64b-4645-ab4f-ae53f00bbbcd` | vergaderlocatie boeken | score 7 · 30 vragen · 9 merkloos |
| Fysi-Unique | `850c8998-b143-4203-af76-243b4f9bee51` | hardloopblessure behandelen | score 10 · 30 vragen · 9 merkloos |

Beantwoord de briefingvragen zoals in de vorige ronde: met bron waar dat kan, bewust overslaan waar
dat niet kan. Leg per vraag de routekeuze vast, anders is een verschil met de vorige ronde niet toe
te schrijven.

## Wat moet blijken

1. **S1, haalt de feitenkaart voor Coolblue nu de wasmachinepagina's?** Vorige ronde: 24 citeerbare
   feiten over vijf analyses, géén over het onderwerp; tien wasmachine-adviespagina's (15.000
   tekens) bleven ongebruikt terwijl vier Engelstalige homepage-duplicaten wél op de kaart kwamen.
2. **R8.1, is de Fysi-Unique-tegenspraak weg?** Een met bron bevestigd "nee" op de doelvraag werd
   vorige ronde alsnog als "ja" gepubliceerd. Dit is de sluitende toets op de kernbelofte van R5:
   landt een *gecorrigeerd* briefingantwoord in de tekst?
3. **R8.2/R8.7/R8.8, markeert de poort de vier pagina's die hun doelvraag ontweken?** De
   zelfrapportage gaf vorige ronde 100/100 op alle tien pagina's.
4. **S3, wat doet `source_coverage` nu de code de noemer bepaalt?** Vorige ronde mat hij 49
   getagde beweringen op ~250 zinnen; beide fabricages zaten in de ongemeten vier vijfde.
5. **S8, blijven F-nummers stabiel** als er klantantwoorden bijkomen? Die sorteren vooraan en
   verschoven vorige ronde de bestaande verwijzingen.

## Randvoorwaarden

- Draai met `MEASURE_WEB_SEARCH` aan; zonder web_search is de meting niet representatief.
- Noteer per pagina welke `brand_facts`-rijen zijn gebruikt, zodat het verschil met de vorige ronde
  herleidbaar is.
- Verwerk de uitkomst in `docs/logbook.md` §8 en werk `roadmap.md` bij.
