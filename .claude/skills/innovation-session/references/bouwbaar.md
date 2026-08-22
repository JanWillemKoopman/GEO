# Realiseerbaarheidskaart

Wat er met de gereedschappen van ORBIT ENGINE vandaag te bouwen valt, zonder nieuwe leverancier en
zonder nieuw team. Gebruikt door de skill `innovation-session`, fase 2 en fase 5.

**Deze kaart is een ideeënbron, geen boodschappenlijst.** Hij staat er niet om ideeën af te keuren
maar om ze op te wekken: de meeste onbenutte kracht zit in iets dat er al is. Lees vooral de laatste
kolom, "wat er nauwelijks mee gedaan wordt".

Peildatum 22 augustus 2026. Klopt een rij niet meer, meld dat in de sessie en werk hem bij.

## Wat er staat, en wat er nog in zit

| Gereedschap | Wat het nu doet | Wat er nauwelijks mee gedaan wordt |
|---|---|---|
| **Achtergrondwachtrij** (`lib/jobs/`), 24 taaktypen, werker draait elke minuut via pg_cron | De pijplijn van onboarding tot effectmeting, taak voor taak, met dedupe en idempotentie | Een taaktype hoeft niet door een mens gestart te worden. Alles wat periodiek, reagerend of speculatief mag draaien kan een taak zijn. Er is nu bijna geen taak die zichzelf plant op basis van wat hij ziet |
| **pg_cron** (`0015`, `0050`) | Werker elke minuut, planschrijver elke nacht om 04:00 | Een tweede nachtelijke ronde kost niets. Alles wat "terwijl de klant slaapt" kan gebeuren is gratis rekentijd |
| **De ruwe JSON van elke AI-aanroep** (conventie 8) | Wordt opgeslagen naast de uitgesplitste kolommen, als audit-trail | Dit is een groeiende dataset over echte AI-antwoorden per branche, per vraag, per week, die alleen wij hebben. Er wordt vrijwel niets uit teruggelezen. Hier zit verdedigbaarheid |
| **Meetreeksen over tijd** (metingen, hermeetgolven, effectmeting) | Vergelijking tussen perioden binnen één merk | Vergelijking tússen merken, tussen branches, en tussen wat er gepubliceerd werd en wat er daarna gebeurde. Een leereffect over de hele klantenbasis bestaat nog niet |
| **Enginelaag** (`lib/engines/`) | OpenAI actief, Gemini slapend, sleutel erin en de engine doet mee | Meerdere engines naast elkaar meten geeft verschil per model, en verschil is informatie die één engine nooit geeft |
| **Modeltiers en redeneerinspanning** (`lib/openai/models.ts`, `sampling.ts`) | Luna voor meten en onderzoeken, Sol alleen voor schrijven, effort per soort werk | Een goedkoop model duizend keer draaien is een ander soort gereedschap dan een duur model één keer. Die vorm wordt nergens gebruikt |
| **Gestructureerde uitvoer plus vangnet in code** (conventie 1, Zod in `lib/schemas/`) | Elk modelantwoord komt terug in een gecontroleerd contract | Een contract kan ook een besluit dragen, niet alleen een beschrijving. Een model dat kiest binnen grenzen die code afdwingt is iets anders dan een model dat adviseert |
| **Web search in het model** | In het onderzoek en in de meting; het duurste onderdeel, ongeveer $0,025 per aanroep | Gericht en zeldzaam inzetten kan veel opleveren; dit is de plek waar kosten en waarde het hardst botsen, dus elk idee erover moet zijn prijs noemen |
| **Google Search Console** (`lib/search-console/`) | Zoekverkeer ophalen en een meetvenster bepalen | Het klassieke zoekgedrag naast het AI-zichtbaarheidsbeeld leggen. De twee werelden raken elkaar in de app nog nauwelijks |
| **Crawler en sitemapinventaris** (`lib/crawler.ts`, `lib/crawl-urls.ts`, `profile_pages`) | De site van de klant uitlezen bij onboarding, met prioritering als hij te groot is | De site van iemand anders uitlezen kan net zo goed. Een concurrent, een bron die de AI citeert, een branchesite |
| **Mail via Resend** (`lib/email/`, standaard uit) | Publicatieherinnering en rapport | De klant hoeft niet in te loggen om waarde te krijgen. Alles wat een bericht kan zijn hoeft geen scherm te zijn |
| **Postgres met RLS** en additieve migraties | Datamodel van merk tot meting tot content | Een nieuwe tabel is goedkoop. Een idee mag er twee vragen. Wat niet mag: `drop`, of schrijven vanaf de client |
| **Next.js server components, API-routes met service-role** | De hele app | Een scherm is niet de enige uitvoervorm. Een gedeelde publieke pagina, een export, een insluitbaar blok: allemaal dezelfde route-laag |
| **Vercel en Supabase via MCP** | Claude Code kan zelf migreren, deployen en logs lezen | De ontwikkelronde zelf is kort. Een idee dat vandaag bedacht wordt kan deze week draaien. Dat verandert wat "te ambitieus" betekent |

## Wat er niet is, en waar een idee dus rekening mee houdt

| Ontbreekt | Gevolg voor een idee |
|---|---|
| **CMS-koppeling** | Publiceren is handwerk: kopiëren, plakken, URL invullen. Dit staat in sprint 9 van `docs/tasks/ontwikkelplan-visie.md`. Een idee mag ervan uitgaan dat het er ooit komt, maar niet dat het er is |
| **Echte zoekvolumes van een leverancier** | De potentiescore rust op een modelschatting, alleen binnen één merk vergelijkbaar. Sprint 8 |
| **Self-serve aanmelding** | Het product is sales-led. Elk scherm kan twee publieken hebben: de consultant vóór de verkoop en de klant erna |
| **Een tweede actieve engine** | Gemini zit erin maar slaapt. Een idee dat meerdere modellen vergelijkt moet die sleutel als voorwaarde noemen |
| **Volledige autonomie** | De goedkeuringspoort vóór publicatie blijft staan, ook in de autonomiesprint. Een idee dat hem weghaalt botst met een vastgelegd besluit, en dat mag, maar dan expliciet |

## De drie harde randen

Deze gelden voor élk idee, ook het wildste. Een idee dat er tegenin gaat is geen idee maar een
misverstand.

1. **Additief en idempotent.** Migraties voegen toe, nooit `drop`. Elke pijplijnstap controleert of
   zijn resultaat al bestaat vóór een dure aanroep.
2. **Nooit schrijven vanaf de client.** Altijd via een API-route met service-role en een expliciete
   eigendomscontrole.
3. **Eén taak is hooguit één zware AI-aanroep.** Een nieuwe zware stap wordt een eigen taaktype.

## De maat voor "haalbaar"

Gebruik in fase 5 deze drie maten, niet het gevoel:

- **Klein.** Een dag werk voor Claude Code, geen nieuwe tabel, geen nieuw taaktype.
- **Middel.** Een sprint. Eén of twee migraties, een nieuw taaktype, een scherm erbij.
- **Groot.** Verandert wat het product is. Meerdere sprints, en de eigenaar moet er zelf iets bij
  regelen, bijvoorbeeld een sleutel, een klant die meedoet of een besluit over de prijs.
