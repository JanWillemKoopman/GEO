# Bevindingen: verificatie van de 117 processtappen tegen de code

> **22 september 2026.** De 117 genummerde stappen in `docs/processtappen-nieuwe-pagina.md` zijn
> onafhankelijk gecontroleerd tegen de code, in vier losse controles die de documentatie zelf niet
> hebben gelezen. 115 stappen klopten. Twee niet, en dat zijn de enige twee items op dit lijstje.

## 1. De doorverwijzingscontrole bij publicatie doet niets

`lib/pipeline/publish-check.ts` heeft een veld `finalUrl` dat volgens zijn eigen commentaar moet
zeggen of je na de opgegeven URL op een andere pagina bent uitgekomen (bijvoorbeeld door een
doorverwijzing). In de code wordt dat veld alleen gelijkgezet aan de ingevoerde URL zelf (regel 132);
er wordt nergens de echte eind-URL na een eventuele doorverwijzing opgevraagd of vergeleken.
`fetchText()` in `lib/crawler.ts` volgt doorverwijzingen wel (`redirect: "follow"`), maar geeft de
uiteindelijke URL nooit terug aan de aanroeper.

**Gevolg**: een klant die een verkeerde of verlopen URL invult die naar een andere pagina
doorverwijst, krijgt daar geen melding van. De overige controles (bereikbaar, tekst herkend,
metadata aanwezig) werken wel.

**Wat het zou kosten om dit echt te bouwen**: `fetchText()` moet `res.url` teruggeven naast de
HTML-tekst, en `publish-check.ts` moet dat vergelijken met de opgegeven URL (genormaliseerd, want
`http` versus `https` of een trailing slash is geen echte afwijking).

## 2. De nameting toont op het klantscherm geen vergelijking, alleen een eindoordeel

`lib/pipeline/impact.ts` en `impact-math.ts` berekenen precies wat het overzichtsdocument beschrijft:
het verschil vóór/na voor de doelvragen, apart voor de controlegroep, met een marge die meebeweegt
met het aantal vragen. Die cijfers staan in `content_impact` en worden gebruikt in de CSV-export
(`app/api/analyses/[id]/results/export/route.ts`).

Het scherm dat de klant ziet (`components/zoekverkeer-paginas.tsx`, gevoed door
`app/(app)/merk/[id]/analytics/zoekverkeer/page.tsx`) toont per pagina alleen één label: "gestegen",
"gelijk gebleven", "gedaald" of "nog te weinig data". De cijfers van de doelgroep naast de
controlegroep, het punt dat het hele idee achter de controlegroep pas overtuigend maakt, staan er
niet bij. Een tooltip legt wel uit dát er met een controlegroep vergeleken wordt, maar laat de
vergelijking zelf niet zien.

**Gevolg**: precies de losse uitspraak die `merkstrategie.md` en de rekenkunde in
`lib/pipeline/impact.ts` willen vermijden ("je score is gestegen" zonder onderbouwing) is wat de
klant nu te zien krijgt. De onderbouwing bestaat, ligt alleen nog niet op het scherm.

**Wat het zou kosten om dit te bouwen**: op `zoekverkeer-paginas.tsx` de twee delta's
(`target_delta`, `control_delta`) en de aantallen tonen naast het label, ongeveer zoals de CSV-export
ze al opsomt. Geen nieuwe berekening nodig, wel een UI-wijziging.

## Niet opgepakt in deze ronde

Dit document meldt de bevindingen, het lost ze niet op. Kies bij oppakken eerst punt 2: dat raakt
rechtstreeks de verkoopbelofte uit `merkstrategie.md` §30 ("nooit beweren wat nog niet gebouwd is"),
punt 1 is een kleinere randgeval-check.
