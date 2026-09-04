import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { CollapsibleSection } from "@/components/collapsible-section";
import { ChapterTabs, type ChapterTab } from "@/components/chapter-tabs";
import { Icon } from "@/components/icon";
import { brandNav, hoofdstukken, type Hoofdstuk, type NavItem } from "@/lib/nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support" };

/**
 * SUPPORT: de ingebouwde gebruikershandleiding van ORBIT ENGINE.
 *
 * ── WAAROM DEZE PAGINA ER NU IS ──────────────────────────────────────────────
 *
 * `components/info-hint.tsx` koos ooit bewust tegen een aparte helppagina:
 * "daar komt niemand, en een getal dat je moet opzoeken om te begrijpen is een
 * getal dat je verkeerd onthoudt". Dat argument blijft waar voor de uitleg bij
 * één cijfer, en die vraagtekens blijven dus staan. Deze pagina lost een ander
 * probleem op: niet "wat betekent dít getal" maar "wat is deze app, en hoe
 * hangen al die schermen met elkaar samen". Dat is een vraag die je één keer
 * stelt, meestal in je eerste week, en waarvoor een inline vraagteken op
 * veertien verschillende plekken geen antwoord is.
 *
 * ── ÉÉN PAGINA, GEEN NIEUWE ZIJBALKREGEL ─────────────────────────────────────
 *
 * `lib/nav.ts` bewaakt met opzet hoeveel bestemmingen een hoofdstuk mag hebben
 * (`GRENS_PER_HOOFDSTUK`), en Support is geen bestemming binnen een van die
 * hoofdstukken: het gaat niet over dít merk maar over de app als geheel, net
 * als het profielmenu en de themaschakelaar. Vandaar het hulp-icoon in de
 * bovenbalk (`components/workspace-chrome.tsx`) en geen elfde zijbalkregel.
 *
 * ── DE INHOUD KOMT UIT `lib/nav.ts`, NIET UIT EEN TWEEDE LIJST ──────────────
 *
 * De vier hoofdstukken en hun tien bestemmingen hieronder komen uit
 * `brandNav()` en `hoofdstukken()`, dezelfde functies die de zijbalk zelf
 * gebruikt. Verandert een naam of een adres daar, dan verandert hij hier mee.
 * Alleen de UITLEG per bestemming staat hieronder als losse tekst, gekoppeld
 * op het label. Staf- en salesbestemmingen doen niet mee: `brandNav(id, false)`
 * levert ze niet, dus deze pagina is voor iedereen dezelfde klanthandleiding,
 * ook als een beheerder hem opent.
 */
export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ onderdeel?: string }>;
}) {
  const { onderdeel } = await searchParams;
  const user = await requireUser();
  const workspace = await loadWorkspace(user.id);
  const brandId = workspace.active?.id ?? null;

  // ⚠️ Met een placeholder-id, want zonder gekozen merk bestaat er geen echt
  // adres. De labels en de indeling staan vast; alleen de link eronder wijkt
  // uit naar de merkkiezer zolang er geen merk actief is (`SupportItem`
  // hieronder).
  const items = brandNav(brandId ?? "_", false);
  const groepen = hoofdstukken(items).filter((h) => h.naam in CONTENT);

  const actief: Hoofdstuk = groepen.some((h) => h.naam === onderdeel)
    ? (onderdeel as Hoofdstuk)
    : "Overzicht";

  const tabs: ChapterTab[] = groepen.map((h) => ({ id: h.naam, label: h.naam }));
  const hrefFor = (id: string) => (id === "Overzicht" ? "/support" : `/support?onderdeel=${id}`);

  const huidigeGroep = groepen.find((h) => h.naam === actief) ?? groepen[0];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Support"
        title="Hoe ORBIT ENGINE werkt"
        description="Wat deze app doet, wat elk scherm betekent, en wat je vervolgens moet doen."
      />

      <Inleiding brandId={brandId} />

      <div className="flex flex-col gap-4">
        <SectionHeading title="Per onderdeel van de app" />
        <ChapterTabs tabs={tabs} active={actief} hrefFor={hrefFor} />

        {huidigeGroep && (
          <div className="flex flex-col gap-3">
            {huidigeGroep.items.map((item) => (
              <SupportSectie key={item.href} item={item} brandId={brandId}>
                {CONTENT[huidigeGroep.naam]?.[item.label]}
              </SupportSectie>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * De vaste introductie, altijd zichtbaar en niet achter een tabblad: wat is
 * ORBIT ENGINE, wat is het verschil tussen SEO en GEO, en hoe de cyclus in
 * elkaar zit. Dit is de tekst die binnen een paar minuten moet uitleggen wat
 * het product doet, dus die hoort niet verstopt te zitten achter een klik.
 */
function Inleiding({ brandId }: { brandId: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <span className="mono-label">Wat is ORBIT ENGINE</span>
        <p className="text-secondary">
          ORBIT ENGINE onderzoekt hoe zichtbaar je merk is in AI-antwoorden, adviseert wat daaraan
          te doen is, schrijft de content die daarvoor nodig is, en meet daarna of het gewerkt
          heeft. Niet als losse tools naast elkaar, maar als één doorlopend proces: meten, begrijpen,
          schrijven, publiceren, opnieuw meten.
        </p>
        <p className="text-secondary">
          Je merkprofiel staat al klaar voordat je voor het eerst inlogt. Je hoeft dus niet zelf een
          bedrijf aan te maken of in te stellen: dat werk is gedaan door je consultant. Wat je hier
          doet is kijken hoe je ervoor staat, keuzes nakijken en goedkeuren, en de content gebruiken
          die ORBIT ENGINE voor je klaarzet.
        </p>
      </div>

      <div className="card flex flex-col gap-3">
        <span className="mono-label">SEO en GEO, het verschil</span>
        <p className="text-secondary">
          <span className="font-semibold">SEO</span> (zoekmachineoptimalisatie) gaat over
          zichtbaarheid in traditionele zoekresultaten, zoals Google.{" "}
          <span className="font-semibold">GEO</span> (Generative Engine Optimization) gaat over
          zichtbaarheid in AI-antwoorden: wordt jouw merk genoemd wanneer iemand ChatGPT, Gemini of
          een andere AI-assistent iets vraagt over jouw markt.
        </p>
        <p className="text-secondary">
          Steeds meer mensen stellen hun vraag niet meer aan Google maar aan een AI-assistent, en
          vergelijken merken via het antwoord dat ze daar krijgen. Sta je daar niet in, dan besta je
          voor die zoeker niet, ook al sta je bovenaan Google.
        </p>
        <p className="text-secondary">
          ORBIT ENGINE is in de kern gebouwd op GEO: elke meting, elk cluster en elke tekst is erop
          gericht dat AI-assistenten jouw merk noemen. Op{" "}
          <span className="font-semibold">Zoekverkeer</span> zie je daarnaast de echte cijfers uit
          Google Search Console: hoeveel klikken en vertoningen je gepubliceerde pagina&apos;s
          opleveren in Google. Zo zie je of dezelfde content ook daar werkt. Dat is meetdata, geen
          los SEO-onderzoek: ORBIT ENGINE doet vandaag geen zoekwoordonderzoek en houdt geen
          posities in Google bij.
        </p>
      </div>

      <div className="card flex flex-col gap-3">
        <span className="mono-label">Zo hangt alles samen</span>
        <p className="text-secondary">
          De schermen van ORBIT ENGINE zijn geen losse tools maar stappen in één ronde. Elke ronde
          voedt de volgende.
        </p>
        <ol className="flex flex-col gap-3">
          <CyclusStap nummer="01" titel="Meten">
            Voor elk cluster stelt ORBIT ENGINE de vragen die klanten aan een AI-assistent stellen,
            en telt hoe vaak jij in het antwoord voorkomt. Dat begint bij{" "}
            <span className="font-semibold">Clusters</span>.
          </CyclusStap>
          <CyclusStap nummer="02" titel="Begrijpen">
            Op <span className="font-semibold">Zichtbaarheid in AI</span>,{" "}
            <span className="font-semibold">Concurrenten</span> en{" "}
            <span className="font-semibold">Mijn reputatie</span> zie je wat die metingen zeggen en
            waarom.
          </CyclusStap>
          <CyclusStap nummer="03" titel="Plannen en aanvullen">
            <span className="font-semibold">Openstaande vragen</span> maakt de meting scherper, en{" "}
            <span className="font-semibold">Contentplan</span> zet wat er geschreven wordt in de
            tijd.
          </CyclusStap>
          <CyclusStap nummer="04" titel="Schrijven en goedkeuren">
            ORBIT ENGINE schrijft de content, jij keurt hem goed voor hij verder gaat. Alles wat af
            is staat verzameld in je <span className="font-semibold">Bibliotheek</span>.
          </CyclusStap>
          <CyclusStap nummer="05" titel="Publiceren">
            ORBIT ENGINE levert de tekst klaar op, en jij plaatst hem zelf op je website. Een
            automatische koppeling met je website is er niet.
          </CyclusStap>
          <CyclusStap nummer="06" titel="Opnieuw meten" laatste>
            Na publicatie meet ORBIT ENGINE opnieuw of je op díe vragen vaker genoemd wordt, en of
            de pagina ook bezoekers oplevert via <span className="font-semibold">Zoekverkeer</span>.
            Dat voedt de volgende ronde vanaf stap 01.
          </CyclusStap>
        </ol>
      </div>

      <div className="card card-accent flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="mono-label">Waar je begint</span>
          <p className="text-secondary">
            Begin op je overzicht. Daar staat wat er op jou wacht en waar je als eerste moet
            klikken.
          </p>
        </div>
        <Link href={brandId ? `/merk/${brandId}` : "/merk"} className="btn-primary w-fit shrink-0">
          Naar je overzicht
          <Icon naam="naar" size={14} />
        </Link>
      </div>
    </div>
  );
}

function CyclusStap({
  nummer,
  titel,
  laatste,
  children,
}: {
  nummer: string;
  titel: string;
  laatste?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`flex gap-3 ${laatste ? "" : "border-b border-[var(--border-subtle)] pb-3"}`}
    >
      <span className="mono-label shrink-0" style={{ color: "var(--intent-intelligence-text)" }}>
        {nummer}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold">{titel}</span>
        <span className="text-sm text-secondary">{children}</span>
      </div>
    </li>
  );
}

/**
 * Eén bestemming uit de zijbalk, als inklapbare sectie met de uitleg erin en
 * een link naar de echte pagina eronder.
 *
 * Zonder gekozen merk (nul merken, of de kiezer staat op "geen merk") wijst de
 * knop naar de merkkiezer in plaats van naar een adres met een placeholder-id
 * erin. Dat is dezelfde uitwijkroute als het woordmerk in de bovenbalk zelf
 * gebruikt (`components/app-shell.tsx`).
 */
function SupportSectie({
  item,
  brandId,
  children,
}: {
  item: NavItem;
  brandId: string | null;
  children: React.ReactNode;
}) {
  return (
    <CollapsibleSection title={item.label}>
      {children}
      <div>
        {brandId ? (
          <Link href={item.href} className="btn-outline w-fit">
            Ga naar {item.label}
            <Icon naam="naar" size={14} />
          </Link>
        ) : (
          <Link href="/merk" className="btn-outline w-fit">
            Kies eerst een merk
            <Icon naam="naar" size={14} />
          </Link>
        )}
      </div>
    </CollapsibleSection>
  );
}

/** Een bullet met een beetje meer lucht dan een kale `<li>`, voor gebruik in de teksten hieronder. */
function Punten({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((tekst, i) => (
        <li key={i} className="flex gap-2 text-sm text-secondary">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current" />
          <span>{tekst}</span>
        </li>
      ))}
    </ul>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-sm text-secondary">
      <span className="mono-label mr-1.5" style={{ fontSize: "0.65rem" }}>
        Tip
      </span>
      {children}
    </p>
  );
}

/**
 * De uitleg per bestemming, gekoppeld op hoofdstuk en dan op het label uit
 * `lib/nav.ts`. Verandert een label daar, dan valt de uitleg hier stil in
 * plaats van op het verkeerde scherm te verschijnen: `SupportPage` filtert
 * hierboven op wat hier écht een sleutel heeft.
 */
const CONTENT: Partial<Record<Hoofdstuk, Record<string, React.ReactNode>>> = {
  Overzicht: {
    "Hoe sta je ervoor": (
      <div className="flex flex-col gap-3">
        <p className="text-secondary">
          Dit is de eerste pagina die je ziet zodra je inlogt, en het antwoord op één vraag: is er
          iets nieuws sinds je hier voor het laatst was.
        </p>
        <Punten
          items={[
            <>
              <span className="font-semibold">Zichtbaarheid in AI</span> bovenaan is je hoofdcijfer:
              hoe vaak AI-assistenten je noemen, met de onzekerheidsmarge erbij. Een verandering
              binnen die marge telt niet als winst of verlies, dat is meetruis.
            </>,
            <>
              <span className="font-semibold">Wat er op je wacht</span> toont hooguit vijf punten
              die om jouw actie vragen, zoals een concept goedkeuren of een vraag beantwoorden.
              Staan er meer, dan verwijst de pagina door naar je clusters.
            </>,
            <>
              <span className="font-semibold">Waar je begint</span> wijst naar de kans die het
              meeste oplevert als er nog niets gepland staat.
            </>,
            <>
              Daaronder zie je je <span className="font-semibold">contentplan</span> in het kort en
              wat ORBIT ENGINE de afgelopen week deed.
            </>,
          ]}
        />
        <p className="text-secondary">
          In je eerste maand, vóór de eerste meting en zonder contentplan, blijft dit scherm bewust
          leeg onder de kansen: er is dan simpelweg nog niets om te tonen. Zodra ORBIT ENGINE de
          eerste meetronde heeft gedraaid, vul je dat vanzelf op.
        </p>
        <Tip>
          Onder je merknaam staat altijd wanneer er voor het laatst gemeten is. Zie je hetzelfde
          cijfer als vorige week, kijk dan eerst naar die datum: er is dan simpelweg nog geen nieuwe
          meting geweest.
        </Tip>
      </div>
    ),
  },

  Strategie: {
    Clusters: (
      <div className="flex flex-col gap-3">
        <p className="text-secondary">
          Een cluster is één onderwerp of product waarop ORBIT ENGINE je zichtbaarheid volgt,
          bijvoorbeeld &ldquo;cv-ketel onderhoud&rdquo; of &ldquo;dameskleding online
          bestellen&rdquo;. Elk cluster meet, schrijft en rapporteert los van de andere: zo zie je
          per onderwerp waar je wint en waar je mist.
        </p>
        <p className="text-secondary">
          Dit is het startpunt van elke ronde. Zonder een cluster is er niets om te meten en dus
          ook niets om over te schrijven.
        </p>
        <Punten
          items={[
            "Bovenaan staat wat je actie vraagt: een cluster dat niet gelukt is, of een concept dat wacht op jouw goedkeuring.",
            "Elk cluster opent in een eigen dossier met vier hoofdstukken: hoe je ervoor staat, waar je wint en mist, wat je nu moet doen, en wat het heeft opgeleverd.",
            "Onderaan staan onderwerpen die ORBIT ENGINE voorstelt op basis van je merkonderzoek. Kies je er een, dan wordt het een echt cluster dat gaat meten.",
            "Een label hangt een cluster aan een eigen groep, handig zodra je er meer dan een paar hebt. Een cluster in de prullenbak wordt niet meer gemeten, maar blijft bewaard en kan altijd terug.",
          ]}
        />
        <p className="text-secondary">
          Start een nieuw cluster met de knop bovenaan. Kies een website en een onderwerp: ORBIT
          ENGINE stelt daarna een meetplan voor, dat je eerst moet goedkeuren voordat de eerste
          meting start.
        </p>
        <Tip>
          Website en onderwerp liggen na de start vast, want anders is de trend niet meer te lezen.
          Wil je iets anders afbakenen, start dan een nieuw cluster in plaats van dit ene aan te
          passen.
        </Tip>
      </div>
    ),
    "Openstaande vragen": (
      <div className="flex flex-col gap-3">
        <p className="text-secondary">
          Alles wat ORBIT ENGINE nog van jou wil weten, op één plek: vragen over je merk in het
          algemeen, en vragen die specifiek gaan over de content van een cluster.
        </p>
        <p className="text-secondary">
          Elk antwoord maakt de meting scherper en de teksten concreter. Zolang er vragen open staan
          over een pagina, kan ORBIT ENGINE die pagina niet afronden: dit scherm houdt dus
          rechtstreeks je contentplan op gang.
        </p>
        <Punten
          items={[
            "Beantwoord een vraag in het invoerveld, of sla hem over: overslaan telt ook als antwoord en houdt niets tegen.",
            "Filter op je merk of op een los cluster om te zien waar een vraag vandaan komt.",
            "Staat er niets open, dan heeft ORBIT ENGINE alles wat het op dit moment nodig heeft.",
          ]}
        />
        <Tip>
          Hoe concreter je antwoord, hoe concreter de tekst die ORBIT ENGINE ervan maakt. &ldquo;Wij
          werken met eigen monteurs, geen onderaannemers&rdquo; is bruikbaarder dan
          &ldquo;kwaliteit staat voorop&rdquo;.
        </Tip>
      </div>
    ),
    Contentplan: (
      <div className="flex flex-col gap-3">
        <p className="text-secondary">
          Wat ORBIT ENGINE deze maand en volgende maand voor je schrijft, en wanneer het live moet
          staan. Dit is de brug tussen wat er gemeten is en wat er daadwerkelijk gepubliceerd wordt.
        </p>
        <Punten
          items={[
            <>
              De <span className="font-semibold">voortgangsbalk</span> toont hoeveel van de geplande
              pagina&apos;s al geplaatst zijn.
            </>,
            <>
              <span className="font-semibold">Per fase van de klantreis</span> laat zien of het plan
              in balans is: alleen informatieve pagina&apos;s bereikt bijvoorbeeld niemand die al
              klaar is om te kopen.
            </>,
            <>
              <span className="font-semibold">Wat voor content er gepland staat</span> toont de
              verdeling over informatief, categorie en dienst.
            </>,
            "Een reservepagina telt niet mee in je maandtotaal en staat klaar voor het geval er iets afvalt.",
          ]}
        />
        <p className="text-secondary">
          Staat er nog geen plan, dan zie je hier een uitnodiging om er een te starten. Daarna toont
          dit scherm standaard een overzicht om te lezen; een sleepbord om zelf pagina&apos;s tussen
          maanden te schuiven staat via de knop &ldquo;Plannen&rdquo; ook voor jou open.
        </p>
      </div>
    ),
    Bibliotheek: (
      <div className="flex flex-col gap-3">
        <p className="text-secondary">
          Alles wat ORBIT ENGINE voor je merk schreef, over al je clusters heen op één plek. Dit is
          het eindproduct: de teksten zelf, niet de taak eromheen.
        </p>
        <Punten
          items={[
            "Elke rij toont het onderwerp, het cluster waar de pagina bij hoort, de status, en of de pagina nog nagekeken moet worden.",
            "Alleen de huidige versie van elke pagina staat in dit overzicht. Oudere versies blijven bewaard en zijn te vinden vanaf de detailpagina van een tekst.",
            "Elk cluster heeft ook een eigen, kleinere bibliotheek met alleen zijn eigen pagina's, bereikbaar vanuit het cluster zelf.",
          ]}
        />
        <p className="text-secondary">
          Is je bibliotheek nog leeg, dan heeft ORBIT ENGINE nog geen pagina geschreven. Ga naar je
          clusters en kijk onder &ldquo;Wat je nu moet doen&rdquo; welke pagina&apos;s klaarstaan
          om te schrijven.
        </p>
      </div>
    ),
  },

  Analytics: {
    "Zichtbaarheid in AI": (
      <div className="flex flex-col gap-3">
        <p className="text-secondary">
          Hoe vaak AI-assistenten je noemen, over al je clusters heen, en wat dat cijfer verklaart.
          Dit is het hoofdcijfer waarvoor je ORBIT ENGINE gebruikt.
        </p>
        <Punten
          items={[
            "Het grote percentage bovenaan is je gewogen gemiddelde over alle clusters, met de onzekerheidsmarge erbij: dat is geen slordigheid maar de breedte van een steekproef.",
            "Het raster ernaast toont per cluster hoe de lijn loopt: staven bij één of twee metingen, een lijn vanaf drie.",
            "De tabel eronder zet elk cluster naast elkaar, zodat je in één oogopslag ziet welk onderwerp achterblijft.",
            "Staat er een blokkade bovenaan, los die dan als eerste op: zolang een AI-assistent je site niet mag lezen, blijft je score lager dan hij zou zijn, en helpt nieuwe content daar niets aan.",
          ]}
        />
        <p className="text-secondary">
          Gebruik de filterbalk om te kijken naar een andere periode, een label of één los cluster.
          Onderaan staat een technische diagnose: of AI-assistenten je site mogen lezen, en of je
          gegevens overal hetzelfde zijn.
        </p>
      </div>
    ),
    Zoekverkeer: (
      <div className="flex flex-col gap-3">
        <p className="text-secondary">
          Levert de content die ORBIT ENGINE publiceerde ook bezoekers op uit Google? Dit scherm
          gaat over de pagina&apos;s die ORBIT ENGINE zelf schreef en publiceerde, niet over je hele
          website.
        </p>
        <Punten
          items={[
            "Klikken, vertoningen, doorklikratio en gemiddelde positie: de vier cijfers die Google Search Console per pagina bijhoudt.",
            "De grafiek toont het verloop per dag, met een merkteken op de publicatiedatum van elke pagina.",
            <>
              De kolom <span className="font-semibold">Effect op AI</span> vergelijkt hoe vaak een
              AI-assistent je noemde vóór en ná publicatie van die pagina, tegen een controlegroep
              die niets veranderde. Dat is het enige cijfer op dit scherm dat oorzaak en gevolg
              verbindt.
            </>,
            "De rest van je site staat er, ingeklapt, alleen ter vergelijking: dat is verkeer dat er al was vóór ORBIT ENGINE begon.",
          ]}
        />
        <p className="text-secondary">
          Is dit scherm nog niet gekoppeld aan Google Search Console, dan is er niets te tonen. Je
          consultant regelt die koppeling.
        </p>
      </div>
    ),
    Concurrenten: (
      <div className="flex flex-col gap-3">
        <p className="text-secondary">
          Wie er nog meer genoemd wordt als klanten een AI-assistent iets vragen over jouw markt, en
          op welke plek jij tussen hen staat.
        </p>
        <Punten
          items={[
            "Jouw plaats bovenaan is een rangnummer, geen percentage: plaats 2 van de 6 bijvoorbeeld.",
            "De tabel eronder zet elk merk op dezelfde manier neer, als percentage van alle gestelde vragen. Dat is een strengere rekenwijze dan het hoofdcijfer op Zichtbaarheid, en precies daarom de eerlijke manier om jezelf te vergelijken.",
            "Het bronnenlandschap toont welke websites de AI-assistent citeert als bron, en of jouw site daarbij staat.",
          ]}
        />
        <p className="text-secondary">
          Komt geen enkele concurrent vaker dan één keer voor, dan is jouw markt versnipperd: er is
          dan geen partij die de AI standaard noemt, en dat is een kans in plaats van een probleem.
        </p>
      </div>
    ),
    "Mijn reputatie": (
      <div className="flex flex-col gap-3">
        <p className="text-secondary">
          Niet óf je genoemd wordt, maar hoé een AI-assistent over je praat: positief, neutraal,
          verdeeld of negatief, per product of dienst.
        </p>
        <Punten
          items={[
            "Het toonoordeel staat nooit alleen: ernaast staat altijd hoeveel echte bronnen daaronder liggen. Weinig bronnen betekent een onzeker oordeel, ook als de toon vriendelijk is.",
            "Per product zie je wie de AI aanraadt en op welke plek jij in dat rijtje staat.",
            "Dit is een los onderzoek dat je apart start, in tegenstelling tot de andere drie schermen in dit hoofdstuk die meelopen in de vaste meetronde.",
          ]}
        />
        <p className="text-secondary">
          Een vriendelijke toon zonder bronnen eronder is geen goed nieuws: dat betekent vaak dat de
          AI simpelweg niets van je weet en dan standaard beleefd is. Kijk daarom altijd samen met
          het aantal bronnen naar dit cijfer, nooit los.
        </p>
      </div>
    ),
  },

  Merkprofiel: {
    Merkdossier: (
      <div className="flex flex-col gap-3">
        <p className="text-secondary">
          Wie ben je volgens ORBIT ENGINE, en klopt dat? ORBIT ENGINE heeft het meeste al van je
          website gehaald: bedrijfsgegevens, waar je actief bent, je doelgroep, je toon en een
          contactpersoon.
        </p>
        <Punten
          items={[
            "Elk veld toont waar de waarde vandaan komt, bijvoorbeeld 'uit je website gehaald'. Zo weet je precies wat ORBIT ENGINE zelf heeft afgeleid en wat nog een controle nodig heeft.",
            "Kijk elk veld na, corrigeer wat niet klopt en vul aan wat ORBIT ENGINE niet kon weten.",
            "Wat je hier vastlegt blijft staan, ook als het onderzoek later opnieuw draait.",
          ]}
        />
        <p className="text-secondary">
          Dit profiel is de basis onder alles: hoe scherper het klopt, hoe beter de vragen die
          ORBIT ENGINE stelt en hoe raker de content die het schrijft.
        </p>
        <Tip>
          Klopt er iets in je profiel niet meer, bijvoorbeeld een nieuwe dienst of een ander
          werkgebied? Werk het hier bij. Dat werkt door in de volgende meetronde en in nieuwe
          content, niet met terugwerkende kracht in wat er al geschreven is.
        </Tip>
      </div>
    ),
  },
};
