# Hoe Nova (InSpace) een klant onboardt

Bron: de complete i18n-tekstcatalogus van de Nova-app, gevonden ingebed in de server-gerenderde
loginpagina van `nova.inspace.io/login` (Next.js/next-intl stuurt daar per ongeluk de volledige
`messages`-catalogus van de hele ingelogde app mee, niet alleen de teksten van de loginpagina).
Alle letterlijke Engelse teksten hieronder komen uit die catalogus (secties `onboarding.*` en
`workspaces.*`); de tussenkopjes en duiding zijn mijn interpretatie van de flow die uit de
sleutelvolgorde en voorwaardelijke teksten blijkt. Waar ik iets afleid in plaats van letterlijk
citeer, staat dat er expliciet bij.

Nova is zelf **sales-led, niet self-serve**: een account manager (hier "customer service
manager"/CSM genoemd) zet het traject klaar, en de klant vult pas ná verkoop zijn eigen
onboarding in.

---

## Stap 0 · Vóór de klant iets ziet (intern, sales-led)

Uit `onboarding.activation` en `admin.*` blijkt dat er, voordat een klant ook maar iets te zien
krijgt, al het volgende intern is vastgelegd:

- Een **agreement** (contract) is gesloten. De activatiepagina verwijst er expliciet naar
  ("Need to check the details? → View agreement") en de bedrijfsstap zegt letterlijk *"We've
  prefilled these details from your agreement"* — de sales-fase heeft dus al bedrijfsnaam,
  facturatiegegevens en het abonnement vastgelegd.
- De klant krijgt een **persoonlijke, tijdgebonden uitnodigingslink** ("SECURED INVITATION").
  Die link kan drie foutstaten hebben: niet gevonden (`invalidTitle`), verlopen
  (`expiredTitle`, met de tekst "For your security, invitation links expire. Please contact your
  customer service manager for a new one") en al geactiveerd (`alreadyTitle`). Er zit dus een
  vervaltermijn op en de CSM is de enige die een nieuwe link kan sturen — geen self-serve reset.
- Er is al een **CSM aan het account gekoppeld** (zie ook `admin.assignCsm`, `admin.csm`), die
  door de hele onboarding heen terugkomt als vangnet ("if it keeps happening, your customer
  service manager can help").

**Interne stap 0 (afgeleid, niet letterlijk in de teksten)**: sales sluit de deal → CSM wordt
toegewezen → workspace + factuurgegevens worden voor-ingevuld → uitnodiging wordt verstuurd.

---

## Stap 1 · Account activeren

Scherm: badge **"SECURED INVITATION"**, titel **"Welcome to NOVA"**.

- Klant ziet zijn werkmail al ingevuld en **geverifieerd** (badge "VERIFIED") — dat komt dus uit
  het contract, de klant hoeft het niet zelf in te typen.
- Klant vult alleen een **wachtwoord** in ("Create password").
- Wachtwoordeisen worden client-side getoetst (`passwordWeak`: "Your password doesn't meet all
  the requirements yet").
- Knop: **"Activate my account"**.

**Wat de klant invult**: alleen het wachtwoord.
**Wat Nova al klaarzet**: werk-e-mailadres, koppeling aan het juiste contract/workspace.

---

## Stap 2 · Accountgegevens bevestigen (bedrijf, contact, facturatie)

Kicker: **"YOUR ACCOUNT"**, titel **"Confirm your company details"**.

Letterlijke tekst: *"We've prefilled these details from your agreement. Check if everything is
correct before continuing."* — dit is dus geen invoerscherm maar een **controlescherm**: sales
heeft de gegevens al ingevoerd op basis van het getekende contract, de klant bevestigt of
corrigeert.

Velden die getoond/gecontroleerd worden (drie groepen):
- **Bedrijfsgegevens**: legal name, adres, plaats, postcode, land, btw-nummer (met optie "I
  don't have a VAT number").
- **Facturatiegegevens**: invoice email.
- **Contactpersoon**: naam, e-mail, telefoonnummer, met een vinkje voor "primary contact".

Elk blok is los te bewerken (edit-modus per sectie, met "Save changes" / "Cancel"). Knop onderaan:
**"Confirm company details"**.

**Wat de klant invult**: correcties op wat al is voor-ingevuld (in de praktijk waarschijnlijk
weinig, aangezien het uit het ondertekende contract komt).
**Wat Nova al klaarzet**: alle bedrijfs-, factuur- en contactgegevens, rechtstreeks uit de
sales-fase.

---

## Stap 3 · Website(s) koppelen — en Nova scant de site al tijdens onboarding

Kicker: **"YOUR ACCOUNT"**, titel **"Connect your website(s)"**.

Dit is de eerste stap waar Nova echt zelf research doet, nog vóórdat het merkprofiel wordt
ingevuld:

1. Klant ziet zijn domein(en) al ingevuld (uit het contract) en controleert of het klopt
   ("Check the domain looks right"). Er is een live check die het domein bevraagt en meldt:
   *serving* (bereikbaar), *notServing* (niets op dat adres), *unconfirmed* (waarschijnlijk
   bot-bescherming, mag je toch opslaan), *invalid* (geen geldig domein), of *unknown*
   (check kon niet draaien, probeert het bij opslaan opnieuw). Er is ook een expliciete melding
   als een domein al bij een andere workspace hoort (`domainAlreadyInUse`).
2. Zodra het domein bevestigd is, start een **automatische scan** met een live voortgangsbalk.
   De scanberichten (letterlijk uit de catalogus, in volgorde) laten precies zien wát Nova van het
   web haalt, zónder dat de klant iets hoeft in te vullen:
   1. *"Crawling your homepage…"*
   2. *"Following your internal links…"*
   3. *"Reading your titles and meta descriptions…"*
   4. *"Checking which pages search engines can see…"*
   5. *"Sizing up your headings and page structure…"*
   6. *"Cataloguing your products and services…"*
   7. *"Listening for your tone of voice…"*
   8. *"Spotting the topics you already rank for…"*
   9. *"Comparing notes with your competitors…"*
   10. *"Bundling everything into your brand profile…"*
   Dus: Nova crawlt de homepage en interne links, leest SEO-metadata, checkt indexeerbaarheid,
   analyseert de paginastructuur, herkent producten/diensten, destilleert een toon van stem,
   zoekt bestaande rankings, doet concurrentie-vergelijking, en bouwt daar automatisch een eerste
   merkprofiel-concept van.
3. **CMS koppelen** ("Connect your CMS") — verplicht. In een modal per website:
   - Klant kiest zijn CMS uit een lijst en vult de inlog-URL van zijn CMS-omgeving in.
   - Nova geeft een **e-mailadres van zichzelf** dat de klant als gebruiker/editor moet toevoegen
     in zijn eigen CMS (stappen: log in op je CMS-admin → Users → Add New User → voer dat
     e-mailadres in → rol = Editor → verstuur de uitnodiging, "our team will receive it by
     email"). Nova wacht dus op een **door de klant verstrekte editor-toegang**, geen
     automatische API-koppeling zonder mensentussenkomst.
   - Uitleg aan de klant waarom dit nodig is: Nova bereidt nieuwe artikelen voor en zet ze klaar
     in het CMS, en herschrijft bestaande artikelen die verbetering nodig hebben.
   - Er is een ontsnappingsroute: **"I couldn't provide access yet"** — CMS-koppeling mag dus
     later, blokkeert de rest van onboarding niet per se.
4. **Search Console koppelen** — optioneel (badge "Optional"), zelfde patroon:
   - Nova toont e-mailadressen die de klant moet toevoegen in Search Console (met "Full access"
     en "Restricted access" niveaus, kopieerbaar).
   - Stappenlijst: open Search Console → property kiezen → Settings → Users and permissions →
     Add user → adressen plakken met het juiste recht → terug naar Nova om te verifiëren.
   - Uitleg waarom: Search Console laat zien welke zoekopdrachten al bezoekers opleveren, welke
     pagina's terugvallen en verdienen om vernieuwd te worden, en meet of het werk van Nova
     daadwerkelijk hogere posities oplevert.
   - Ook hier een uitweg: **"I'll connect this later"**.
5. Bij meerdere websites doorloopt de klant dit per domein ("Website {current} of {total}").

**Wat de klant invult/doet**: domein bevestigen, CMS-platform kiezen, CMS-inlog-URL, een
editor-gebruiker aanmaken in zijn eigen CMS voor Nova, optioneel gebruikers toevoegen in Search
Console.
**Wat Nova zelf van internet haalt**: de volledige inhoud, structuur, SEO-status, producten/
diensten, toon van stem, bestaande rankings en concurrenten van de website — allemaal via een
geautomatiseerde crawl, nog vóór het merkprofielgesprek.

---

## Stap 4 · Betaling instellen

Kicker: **"YOUR ACCOUNT"**, titel **"Set up your direct debit"**.

- Standaardmodel is **SEPA-incasso** via **Stripe** ("Secured by Stripe", "Your bank details are
  encrypted and stored by Stripe, never on our servers").
- Klant vult rekeninghouder en IBAN in; expliciete machtigingstekst met een wettelijke
  terugboek-termijn van 8 weken wordt getoond en moet bevestigd worden ("Authorise mandate").
- Er bestaat ook een **factuurroute** ("Pay by invoice" / "Invoiced monthly") als alternatief voor
  automatische incasso — welke van de twee getoond wordt hangt af van wat sales heeft afgesproken.
- Btw-nummer wordt hier nogmaals gevraagd/bevestigd, met een hint *"Required for cross-border
  invoicing"* als het land daarom vraagt.
- Vangnet: als online betaalsetup niet beschikbaar is, meldt het scherm dat de CSM dit handmatig
  komt afhandelen. Bij een fout na succesvolle bank-autorisatie ("recordFailed") wordt de klant
  gerustgesteld dat de machtiging wél is gelukt en de CSM kan helpen.
- Onderaan staat een direct support-contact: telefoonnummer en `csm@inspace.io`.

**Wat de klant invult**: rekeninghouder, IBAN (of factuuradres als voor die route gekozen is),
eventueel een ontbrekend btw-nummer.
**Wat Nova al klaarzet**: het abonnementsbedrag/valuta, het gekozen betaalmodel (incasso vs.
factuur) uit het contract.

Na deze stap: **"Create account"** — pas hierna bestaat het werkende klantaccount.

---

## Stap 5 · Account aangemaakt — overgang naar het merkprofiel

Scherm **"Welcome to NOVA"** (accountCreated), met de kernzin die de hele filosofie van Nova
samenvat:

> *"NOVA has already drafted your brand profile from your website — open each step, check what it
> wrote and save it. That is what teaches NOVA how to write for you; your topics and first SEO
> strategy come after that."*

Dus: Nova heeft **op basis van de website-scan uit stap 3 al zelf een compleet
merkprofiel-concept geschreven**, nog voordat de klant er iets over heeft ingevuld. De volgende
stap is puur nog **controleren en aanvullen**, niet vanaf nul invullen.

---

## Stap 6 · Merkprofiel-wizard ("Brand profile hub")

Dit is inhoudelijk het zwaartepunt van de onboarding, opgedeeld in zes stappen die je los kunt
openen. Bij elke stap staat er expliciet bij dat NOVA het antwoord al heeft voorbereid, en dat de
klant alleen hoeft te checken:

> *"NOVA is drafting your answers"* → *"Reading your website takes a couple of minutes. Start
> filling these in — anything you leave blank, NOVA will write for you. Your workspace stays put
> until it lands."*

Dat is een expliciet ontwerpprincipe: **de klant hoeft niets in te vullen** — elk leeg veld wordt
door Nova zelf geschreven. Mislukt het lezen van de site, dan valt het terug op *"Your answers are
below and yours to fill in — nothing is lost"* met een "Try again"-knop.

De zes stappen, met wat er letterlijk gevraagd wordt:

1. **Brand — "Who you are"**
   *"The basics NOVA needs before it writes a word: what you sell, why you exist and where you
   sit in your market."*
   - Categorie/branche (bv. "B2B SaaS, E-commerce fashion, Healthcare services")
   - Merkmissie (bv. "We help small businesses grow their online presence through AI-powered SEO")
   - Positionering (bv. "Premium quality at accessible prices for mid-market companies")

2. **Values — "What you stand for"**
   *"The values and the proof NOVA leans on whenever it makes a claim about you."*
   - Kernwaarden/pijlers (bv. "Innovation, Transparency, Customer-first approach")
   - Bewijspunten ("500+ satisfied clients, 10 years experience, industry certifications") —
     dit is precies het soort concrete, checkbare cijfer/claim dat NOVA later in content gebruikt
   - Identiteits-keywords (los toe te voegen chips)

3. **Audience — "Who you serve"**
   *"Who your customers are decides which questions NOVA answers and which words it uses."*
   - Primaire doelgroep (bv. "Marketing managers at mid-size B2B companies, age 30-50")
   - Secundaire doelgroep
   - "Us vs. them" — onderscheidend vermogen t.o.v. concurrenten
   - Geografische markt(en) (bv. "Netherlands, DACH region, Global")

4. **Voice — "How you sound"**
   *"The tone NOVA writes in, and the personality behind it."*
   - Toon van stem: kies uit **Conversational / Formal / Authoritative / Something else**, elk
     met dezelfde voorbeeldzin in een andere stijl zodat de klant kan vergelijken; bij "Something
     else" beschrijft de klant zelf de toon met een voorbeeldzin.
   - Merkpersoonlijkheid in eigen woorden (bv. "Friendly expert who makes complex topics simple
     and actionable")

5. **Vocabulary — "Words to use and avoid"**
   *"The phrases NOVA should reach for, the ones it must never use, and anything you are required
   to say."*
   - Kenmerkende uitdrukkingen ("Powered by innovation", "Built for growth", …)
   - Woorden die NOVA nooit mag gebruiken ("cheap", "guarantee results", "number one")
   - Compliance-notities voor content (bv. "Must include disclaimer for medical claims") — een
     vrij invulveld, geen automatische toetsing zichtbaar in de teksten.

6. **Author — "Who signs it"**
   *"Articles get published under someone's name. This is usually you."*
   - Naam, functie, korte bio
   - LinkedIn / Facebook / overig social-profiel
   - Foto (PNG/JPEG/WebP, max 2 MB) — kan pas nadat de website volledig is opgezet
     ("You can add a photo once NOVA has finished setting this website up")

Tijdens het invullen loopt er een **autosave** (statussen: saving / saved / invalid veld / niet
opgeslagen door verbindingsfout) en een zijbalk **"Your strategy taking shape"** die live
bijhoudt wat al vastligt (bv. "Voice defined", "{n} topics chosen") — de klant ziet dus tijdens het
invullen al een voorproefje van de contentstrategie die eruit gaat rollen.

---

## Stap 7 · Review en genereren

- **Review-scherm**: alle zes secties worden samengevat getoond (industrie, missie, positionering,
  doelgroep, tone of voice, kenmerkende zinnen, vermijdwoorden, compliance, auteur…), met per veld
  een "Edit"-link en "Not set" als iets nog leeg is. Zolang er verplichte acties open staan (met
  name: betaling nog niet afgerond) toont het scherm expliciet hoeveel acties nog nodig zijn
  vóórdat het profiel naar NOVA kan.
- Zodra alles compleet is, genereert Nova het **definitieve merkprofiel**: een asynchrone job met
  zichtbare voortgang (*"queued" → "NOVA is reading the files you uploaded" → "NOVA is writing
  your brand profile"*), die letterlijk zegt: *"You can close this page — it carries on without
  you. Your answers are locked until it finishes."* Mislukt de run, dan blijft de vorige versie
  zichtbaar met een duidelijke melding dat dat de oude versie is, niet de mislukte nieuwe, en niets
  van wat de klant schreef gaat verloren.
- Resultaat: **"Your brand profile is ready"**, met een downloadbare versie en de mogelijkheid om
  het volledig **opnieuw te laten genereren** (met de waarschuwing dat de nieuwe tekst dan niet
  identiek zal zijn aan de oude).

---

## Stap 8 · Overdracht aan de CSM voor de contentstrategie

Laatste tekst in de hele flow, en cruciaal voor hoe sales-led dit is:

> *"Next, your customer service manager will fill in your funnels to build your content plan.
> Once that's done, your first strategy will be ready to review on the Strategy page."*

en op het wachtscherm:

> *"NOVA is building your strategy — Your brand profile is in NOVA's hands. It's turning
> everything you told us into your first content strategy — your customer service manager will
> let you know the moment it's ready for you."*

Met andere woorden: **de klant onboardt zichzelf tot en met het merkprofiel, maar de vertaalslag
naar een concrete contentstrategie (funnels, paginatypes, eerste maandplanning) is weer mensenwerk
van de CSM**, niet iets dat de klant zelf ziet of doet. Dit sluit aan bij wat we al zagen in de
adminsectie (`admin.marketGates`, `admin.domainConfig`): een CSM zet per markt/domein aan of
strategie en publicatie überhaupt aanstaan, en kiest het publicatiemodel (Nova publiceert
zelf / CMS-concept / volledig handmatig) vóórdat er ooit een pagina live gaat.

---

## Samenvattend stappenschema

| # | Stap | Klant vult in | Nova/CSM regelt |
|---|------|----------------|-----------------|
| 0 | Sales & voorbereiding (intern) | — | Contract, CSM-koppeling, workspace + factuurgegevens, uitnodigingslink |
| 1 | Account activeren | Wachtwoord | E-mail al geverifieerd |
| 2 | Bedrijfsgegevens bevestigen | Correcties (indien nodig) | Bedrijf/factuur/contact al voor-ingevuld uit contract |
| 3 | Website(s) + CMS + Search Console | Domein bevestigen, CMS kiezen, editor-gebruiker aanmaken in eigen CMS, optioneel GSC-gebruikers | Automatische crawl: homepage, interne links, meta's, indexeerbaarheid, structuur, producten/diensten, toon, bestaande rankings, concurrenten |
| 4 | Betaling | IBAN/rekeninghouder of factuurgegevens, btw-nummer | Abonnementsbedrag en betaalmodel uit contract |
| 5 | Account aangemaakt | — | Merkprofiel-concept al geschreven op basis van de scan |
| 6 | Merkprofiel-wizard (6 stappen) | Controleren/aanvullen: brand, values, audience, voice, vocabulary, author | Elk leeg veld wordt door Nova zelf geschreven |
| 7 | Review & genereren | Bevestigen, evt. edits | Genereert definitief profiel (async job), downloadbaar, herhaalbaar |
| 8 | Overdracht naar strategie | — | CSM vult funnels/paginatypes in, bouwt eerste contentstrategie, meldt klant wanneer klaar |

---

## Timeline: schermen, velden en techniek per stap

Deze tabel legt de flow chronologisch naast elkaar: welk scherm de klant ziet, welke velden erop
staan, en welke techniek er vermoedelijk achter zit. Techniek die letterlijk uit de teksten blijkt
(bv. Stripe, SEPA, Search Console) staat zonder voorbehoud; techniek die ik afleid uit wat een
scherm doét (bv. "crawlt de homepage" → webscraping) staat gemarkeerd als **(afgeleid)**. Niets
hiervan is bevestigd door InSpace zelf of door broncode buiten de i18n-teksten.

| # | Scherm | Velden op het scherm | Techniek erachter |
|---|--------|----------------------|--------------------|
| 0 | (geen scherm — interne sales-fase) | Contract/agreement, abonnementsvorm, factuurgegevens, CSM-toewijzing | CRM/contractbeheer, e-mail met tijdgebonden uitnodigingslink **(afgeleid: een link met vervaltermijn en eenmalig gebruik wijst op een getekende, verlopende JWT- of tokenlink, geen wachtwoord)** |
| 1 | **Activatiescherm** ("Welcome to NOVA", badge "Secured invitation") | Werk-e-mail (readonly, al "VERIFIED"), wachtwoord, wachtwoordbevestiging (afgeleid uit de aanwezige validatieregels) | Tokenvalidatie van de uitnodigingslink; wachtwoordsterkte-check client-side (lengte, cijfer, hoofdletter — zie `passwordRules` in de catalogus) |
| 2 | **"Confirm your company details"** | Bedrijfsnaam, adres, plaats, postcode, land, btw-nummer; factuur-e-mail; contactpersoon (naam, e-mail, telefoon, primair-vinkje) | Voor-ingevulde formuliervelden uit het CRM/contract, geen externe lookup zichtbaar; mogelijk een btw-validatieservice op het btw-veld **(afgeleid, niet bevestigd)** |
| 3a | **"Connect your website(s)" — domeincontrole** | Domeinnaam per website | Live HTTP-bereikbaarheidscheck van het domein (server-side `fetch`/ping met foutafhandeling voor bot-bescherming — status "unconfirmed" wijst op een user-agent- of Cloudflare-blokkade) |
| 3b | **Scanscherm (voortgangsbalk, geen invoervelden)** | — (alleen statustekst, geen input) | **Webscraping/crawling (afgeleid uit de scanberichten zelf)**: een crawler doorloopt de homepage en interne links, parseert HTML voor `<title>`/meta-descriptions, checkt `robots.txt`/`noindex` voor indexeerbaarheid, analyseert de kop- en paginastructuur (H1–H3), classificeert product-/dienstpagina's, en voedt een taalmodel met de geëxtraheerde tekst om toon van stem, bestaande rankingsonderwerpen en concurrenten te destilleren. Vermoedelijk gecombineerd met een externe rank-tracking- of SERP-databron voor het "bestaande rankings"- en "concurrenten"-onderdeel, aangezien dat niet uit de eigen site te halen is **(afgeleid)** |
| 3c | **CMS-koppelmodal** | CMS-platform (dropdown), CMS-inlog-URL | Geen API-koppeling op dit moment: de klant nodigt een door Nova opgegeven e-mailadres uit als Editor-gebruiker in zijn eigen CMS. Techniek is dus **handmatige gebruikersuitnodiging**, geen OAuth/API-key-koppeling in dit scherm (die kan er later wel zijn, ligt buiten wat de teksten laten zien) |
| 3d | **Search Console-koppelmodal (optioneel)** | Getoonde Nova-e-mailadressen (full/restricted access, kopieerbaar) | Google Search Console-gebruikersrechten (geen OAuth-koppeling zichtbaar in deze stap, wél een "Check connection"-actie die vermoedelijk de Search Console API bevraagt op toegang) |
| 4 | **"Set up your direct debit"** | Rekeninghouder, IBAN; of factuuradres als alternatief; btw-nummer | **Stripe** voor SEPA-incasso-machtiging (expliciet genoemd: "Secured by Stripe", bankgegevens versleuteld bij Stripe opgeslagen, niet bij Nova zelf) |
| 5 | **"Welcome to NOVA" (accountCreated)** | — (alleen een CTA-knop) | Vermoedelijk een achtergrondjob die de scan-resultaten uit stap 3b al heeft omgezet in een concept-merkprofiel via een taalmodel, klaar om te tonen **(afgeleid uit de aankondigingstekst)** |
| 6.1 | **Brand — "Who you are"** | Branche/categorie, merkmissie, positionering | Voor-ingevulde tekstvelden uit de scan van stap 3b (LLM-gegenereerde samenvatting), door klant te overschrijven |
| 6.2 | **Values — "What you stand for"** | Kernwaarden/pijlers, bewijspunten, identiteitskeywords (chips) | Idem: LLM-concept op basis van scan, aangevuld met keyword-chips die de klant los toevoegt |
| 6.3 | **Audience — "Who you serve"** | Primaire doelgroep, secundaire doelgroep, "us vs. them", geografische markt | LLM-concept op basis van scan; geen externe doelgroepdata (bv. geen social-media-scraping van volgers) zichtbaar in de teksten |
| 6.4 | **Voice — "How you sound"** | Tone-of-voice-keuze (Conversational/Formal/Authoritative/Custom) met voorbeeldzin per stijl, merkpersoonlijkheid in vrije tekst | Voorbeeldzinnen zijn vermoedelijk template-tekst per stijl (dezelfde tekst getoond in verschillende toon), geen live LLM-call per keuze **(afgeleid, want de voorbeeldzin is telkens identiek)** |
| 6.5 | **Vocabulary — "Words to use and avoid"** | Signatuurzinnen, verboden woorden, compliance-notities (vrije tekstvelden + "add"-knoppen) | Puur handmatige invoer, geen automatische detectie zichtbaar |
| 6.6 | **Author — "Who signs it"** | Naam, functie, korte bio, LinkedIn/Facebook/overig social-profiel, foto-upload (PNG/JPEG/WebP, max 2 MB) | Foto-upload naar object storage; **geen bewijs van automatische social-media-scraping** van het LinkedIn/Facebook-profiel — het zijn losse tekstvelden die de klant zelf invult/plakt |
| 7 | **Review & generatiescherm** | Samenvatting van alle 6 secties (readonly, met "Edit"-links), voortgangsstatus (queued/files/writing) | Asynchrone achtergrondjob (waarschijnlijk een LLM-aanroep die het geverifieerde profiel plus geüploade bestanden verwerkt tot het definitieve merkprofieldocument), met job-status-polling in de UI |
| 8 | **Strategiewachtscherm** | — | Handmatige verwerking door de CSM (funnels/paginatypes invullen), geen zichtbare automatisering in deze stap |

**Samenvatting van de vermoedelijke technologiestapel** (voor zover af te leiden uit de teksten,
niets hiervan is bevestigd buiten de i18n-catalogus):
- **Webscraping/crawling** van de eigen website van de klant (homepage + interne links, meta's,
  structuur, producten/diensten) als basis voor het automatisch voor-ingevulde merkprofiel.
- **Een taalmodel (LLM)** dat de gescrapete tekst omzet in de concepttekst per merkprofielveld
  (missie, positionering, doelgroep, tone of voice) en later het definitieve profieldocument
  schrijft.
- **Een externe rank-/SERP-bron** voor "bestaande rankings" en "concurrenten" (niet uit de eigen
  site te halen, dus vermoedelijk een SEO-databron of zoekmachine-API) — **afgeleid, niet
  bevestigd**.
- **Stripe** voor SEPA-incassomachtigingen.
- **Google Search Console** (gebruikersrechten, geen zichtbare OAuth-flow in deze schermen) voor
  zoekprestatie-data.
- **Geen aanwijzing voor social-media-scraping**: het auteur-profiel met LinkedIn/Facebook-links
  is een vrij invulveld, geen geautomatiseerde profielverrijking.
- CMS-koppeling verloopt via **handmatige gebruikersuitnodiging** (Editor-rol), niet via een
  API-key of OAuth-koppeling op dit punt in de flow.
