# Openstaand na de OKX-omzetting

De herontwerpronde van 17 tot 21 september 2026 (Nova naar OKX, elf stappen, vastgelegd geweest in
`redesign2026.md`, inmiddels verwijderd nu de ronde af is) is inhoudelijk klaar en op `main`. Drie
punten kwamen daarbij naar boven die geen onderdeel van de ronde zelf waren, maar wel nog openstaan.
Streep een punt weg zodra het is opgelost, en verwijder dit bestand zodra de lijst leeg is.

## 1. `.field-lg` (48px) staat alleen op de inlogroute

`app/globals.css` merkt bij `.field-lg` zelf al op dat deze trede (48px in plaats van 40, tekst 16px
in plaats van 14) onder 768px eigenlijk voor **elk** invoerveld in de app zou moeten gelden: Safari
zoomt in bij focus op een veld met een kleinere lettergrootte. Dat is nooit doorgevoerd buiten
`app/(auth)/`. Raakt naar schatting vijftig schermen; is bewust niet meegenomen in stap 10 van de
OKX-ronde, want dat was een responsief gedragsprobleem en geen visuele omzetting.

## 2. De donkere stand is niet systematisch nagekeken op de ingelogde schermen

Dit stond al open ná de Nova-omzetting (24 augustus 2026) en is met de OKX-omzetting opnieuw relevant
geworden: de tokenlaag zelf is in beide standen gecontroleerd (§12 van de vroegere `redesign2026.md`,
de vijfde stijlcontrole in `docs/designsystem.md` §12), maar niemand heeft de ingelogde schermen zelf
in de donkere stand doorgekeken sinds de OKX-tokens erin zitten. Loop bij de eerstvolgende gelegenheid
minstens deze vier langs in donker: het merkoverzicht, analytics (de grafieken hebben acht nieuwe
reeksen, zie punt 3), het clusterdossier (lange tabellen) en de contentbibliotheek (`.prose`).

## 3. De acht grafiekkleuren zijn niet gevalideerd op kleurenblindheid

`docs/designsystem.md` §2.7 noemt dit al inline. De vorige set (Nova, zes reeksen) haalde ΔE 9,2 op
het slechtste aangrenzende paar; de nieuwe set (OKX, acht reeksen, drie ervan grijs) is nooit opnieuw
gemeten. Zolang dat niet is gebeurd, blijft de regel gelden dat elke lijn een naam aan het uiteinde
draagt en er een tabel onder staat: identiteit leunt nooit alleen op kleur.
