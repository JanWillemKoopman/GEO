import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { brandNav, hoofdstukken, type Hoofdstuk, type NavHoofdstuk, type NavItem } from "@/lib/nav";
import type { IcoonNaam } from "@/lib/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support" };

/**
 * SUPPORT: de ingebouwde gebruikershandleiding van ORBIT ENGINE.
 *
 * ── WAAROM DEZE PAGINA ER IS ─────────────────────────────────────────────────
 *
 * `components/info-hint.tsx` koos ooit bewust tegen een aparte helppagina:
 * "daar komt niemand, en een getal dat je moet opzoeken om te begrijpen is een
 * getal dat je verkeerd onthoudt". Dat argument blijft waar voor de uitleg bij
 * één cijfer, en die vraagtekens blijven dus staan. Deze pagina lost een ander
 * probleem op: niet "wat betekent dít getal" maar "wat is deze app, en hoe
 * hangen al die schermen met elkaar samen".
 *
 * ── DE VORM: EEN DOCUMENTATIEPAGINA, GEEN DASHBOARDSCHERM ───────────────────
 *
 * De eerste versie van dit scherm hergebruikte de tabbladen en de inklapbare
 * rijen van het clusterdossier, en dat paste niet: die twee patronen bestaan
 * om DATA te temmen (veel cijfers, veel regels), en Support heeft geen data,
 * alleen uitleg. Het resultaat was een rij bijna identieke grijze kaarten
 * zonder enige hiërarchie. Deze versie kiest de vorm die uitleg wél goed
 * verdraagt: een vaste linkernavigatie naast doorlopende inhoud, zoals een
 * echte documentatiepagina. Op desktop is dat een smalle kolom die meescrollt
 * (`ZijNav`, bewust opgebouwd als een kleine kopie van `components/sidebar.tsx`
 * zodat de herkenning meteen klopt: "dit is dezelfde indeling als mijn menu
 * links"); op mobiel wordt dat een liggende sprongbalk (`MobielNav`).
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
 * De vier hoofdstukken en hun tien bestemmingen komen uit `brandNav()` en
 * `hoofdstukken()`, dezelfde functies die de zijbalk zelf gebruikt. Verandert
 * een naam of adres daar, dan verandert hij hier mee. Alleen de uitleg per
 * bestemming staat hieronder als losse tekst, gekoppeld op het label.
 * Staf- en salesbestemmingen doen niet mee: `brandNav(id, false)` levert ze
 * niet, dus deze pagina is voor iedereen dezelfde klanthandleiding.
 */
export default async function SupportPage() {
  const user = await requireUser();
  const workspace = await loadWorkspace(user.id);
  const brandId = workspace.active?.id ?? null;

  // ⚠️ Met een placeholder-id, want zonder gekozen merk bestaat er geen echt
  // adres. De labels en de indeling staan vast; alleen de link onderaan elk
  // blok wijkt uit naar de merkkiezer zolang er geen merk actief is.
  const items = brandNav(brandId ?? "_", false);
  const groepen = hoofdstukken(items).filter((h) => h.naam in CONTENT);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Support"
        title="Hoe ORBIT ENGINE werkt"
        description="Wat deze app doet, wat elk scherm betekent, en wat je vervolgens moet doen."
      />

      <Hero brandId={brandId} />

      <MobielNav groepen={groepen} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-12">
        <ZijNav groepen={groepen} />

        <div className="flex min-w-0 flex-col gap-12">
          {groepen.map((groep) => (
            <div key={groep.naam} className="flex flex-col gap-5">
              <div
                id={slug(groep.naam)}
                className="flex scroll-mt-[calc(var(--header-h)+1.5rem)] items-center gap-2.5 border-b border-[var(--border-subtle)] pb-3"
              >
                <span className="flex text-[var(--text-primary)]">
                  <Icon naam={groep.icoon} size={20} />
                </span>
                <h2 className="type-section">{groep.naam}</h2>
              </div>

              <div className="flex flex-col gap-6">
                {groep.items.map((item) => (
                  <Onderdeel
                    key={item.href}
                    item={item}
                    brandId={brandId}
                    icoon={ICOON_PER_LABEL[item.label] ?? groep.icoon}
                  >
                    {CONTENT[groep.naam]?.[item.label]}
                  </Onderdeel>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * De vaste introductie, altijd zichtbaar en boven de navigatie: wat is
 * ORBIT ENGINE, wat is het verschil tussen SEO en GEO, en hoe de cyclus in
 * elkaar zit. Dit is de tekst die binnen een paar minuten moet uitleggen wat
 * het product doet, dus die hoort niet verstopt te zitten achter een klik.
 */
function Hero({ brandId }: { brandId: string | null }) {
  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-2xl text-lg leading-8 text-secondary">
        ORBIT ENGINE onderzoekt hoe zichtbaar je merk is in AI-antwoorden, adviseert wat daaraan te
        doen is, schrijft de content die daarvoor nodig is, en meet daarna of het gewerkt heeft.
        Niet als losse tools naast elkaar, maar als één doorlopend proces. Je merkdossier staat al
        klaar voordat je voor het eerst inlogt: dat werk is gedaan door je consultant.
      </p>

      {/* SEO en GEO, als twee gelijkwaardige kaarten naast elkaar in plaats van
          een alinea die het verschil moet uitleggen. GEO draagt het
          merk-accent (intelligence): dat is waar ORBIT ENGINE vandaag op
          gebouwd is. SEO blijft neutraal, want dat is hier context en geen
          eigen bouwsteen (`docs/merkstrategie.md` §30, punt 2). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card card-accent flex flex-col gap-3">
          <IconTegel
            icoon="meten"
            achtergrond="var(--intent-success-surface)"
            kleur="var(--accent)"
          />
          <span className="mono-label" style={{ color: "var(--accent)" }}>
            GEO · de kern van ORBIT ENGINE
          </span>
          <p className="text-secondary">
            <span className="font-medium">Generative Engine Optimization.</span> Zichtbaarheid in
            AI-antwoorden: wordt jouw merk genoemd wanneer iemand ChatGPT, Gemini of een andere
            AI-assistent iets vraagt over jouw markt? Elke meting, elk cluster en elke tekst in
            ORBIT ENGINE is hierop gericht.
          </p>
        </div>
        <div className="card flex flex-col gap-3">
          <IconTegel icoon="zoekmachine" />
          <span className="mono-label">SEO · wat je erbij ziet</span>
          <p className="text-secondary">
            <span className="font-medium">Zoekmachineoptimalisatie.</span> Zichtbaarheid in
            traditionele zoekresultaten, zoals Google. Op{" "}
            <span className="font-medium">Zoekverkeer</span> zie je de echte cijfers uit Google
            Search Console: leveren je gepubliceerde pagina&apos;s ook daar bezoekers op? Zoekvolumes
            uit Google gebruikt ORBIT ENGINE op één plek, bij Clusters ontdekken, om nieuwe
            onderwerpen te vinden. Een ranglijst van je posities in Google houdt het niet bij.
          </p>
        </div>
      </div>

      {/* De cyclus, als tijdlijn met een doorlopende lijn: dit is één proces
          met een vaste volgorde, geen zes losse feiten. */}
      <div className="flex flex-col gap-5">
        <span className="mono-label">Zo hangt alles samen. Elke ronde voedt de volgende</span>
        <ol className="flex flex-col">
          {CYCLUS.map((stap, i) => (
            <li key={stap.titel} className="relative flex gap-4">
              {i < CYCLUS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[19px] top-10 bottom-0 w-px bg-[var(--border-subtle)]"
                />
              )}
              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-secondary">
                <Icon naam={stap.icoon} size={18} />
              </span>
              <div className="flex flex-col gap-0.5 pb-6 pt-1.5">
                <span className="flex items-baseline gap-2">
                  <span className="mono-label">
                    {stap.nummer}
                  </span>
                  <span className="font-medium">{stap.titel}</span>
                </span>
                <p className="max-w-xl text-sm text-secondary">{stap.tekst}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4">
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

interface CyclusStap {
  nummer: string;
  titel: string;
  tekst: React.ReactNode;
  icoon: IcoonNaam;
}

const CYCLUS: CyclusStap[] = [
  {
    nummer: "01",
    titel: "Meten",
    icoon: "meten",
    tekst: (
      <>
        Voor elk cluster stelt ORBIT ENGINE de vragen die klanten aan een AI-assistent stellen, en
        telt hoe vaak jij in het antwoord voorkomt. Dat begint bij <b>Clusters</b>.
      </>
    ),
  },
  {
    nummer: "02",
    titel: "Begrijpen",
    icoon: "analytics",
    tekst: (
      <>
        Op <b>Zichtbaarheid in AI</b>, <b>Concurrenten</b> en <b>Mijn reputatie</b> zie je wat die
        metingen zeggen en waarom.
      </>
    ),
  },
  {
    nummer: "03",
    titel: "Plannen en aanvullen",
    icoon: "plannen",
    tekst: (
      <>
        <b>Openstaande vragen</b> zet alle vragen aan jou bij elkaar, en <b>Contentplan</b> zet wat er
        geschreven wordt in de tijd.
      </>
    ),
  },
  {
    nummer: "04",
    titel: "Schrijven en goedkeuren",
    icoon: "goedkeuring",
    tekst: (
      <>
        ORBIT ENGINE schrijft de content, jij keurt hem goed voor hij verder gaat. Alles wat af is
        staat verzameld in je <b>Bibliotheek</b>.
      </>
    ),
  },
  {
    nummer: "05",
    titel: "Publiceren",
    icoon: "publiceren",
    tekst: "ORBIT ENGINE levert de tekst klaar op, en jij plaatst hem zelf op je website. Een automatische koppeling met je website is er niet.",
  },
  {
    nummer: "06",
    titel: "Opnieuw meten",
    icoon: "opnieuw",
    tekst: (
      <>
        Na publicatie meet ORBIT ENGINE opnieuw of je op díe vragen vaker genoemd wordt, en of de
        pagina ook bezoekers oplevert via <b>Zoekverkeer</b>. Dat voedt de volgende ronde vanaf
        stap 01.
      </>
    ),
  },
];

function IconTegel({
  icoon,
  achtergrond = "var(--bg-layer-2)",
  kleur = "var(--text-secondary)",
}: {
  icoon: IcoonNaam;
  achtergrond?: string;
  kleur?: string;
}) {
  return (
    <span
      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-xl)]"
      style={{ background: achtergrond, color: kleur }}
    >
      <Icon naam={icoon} size={18} />
    </span>
  );
}

/**
 * De linkernavigatie op desktop: bewust dezelfde opbouw als
 * `components/sidebar.tsx` (kop met icoon, kinderen ingesprongen tot onder de
 * tekst), zodat de herkenning meteen klopt. Dit is een anker-navigatie en
 * geen client component: één lange, doorlopende pagina met `id`'s per
 * onderdeel, geen `useState` en geen scroll-spy nodig.
 */
function ZijNav({ groepen }: { groepen: NavHoofdstuk[] }) {
  return (
    <nav
      aria-label="Onderdelen van deze handleiding"
      className="no-print sticky top-[calc(var(--header-h)+1.5rem)] hidden max-h-[calc(100vh-var(--header-h)-3rem)] flex-col gap-5 overflow-y-auto lg:flex"
    >
      {groepen.map((groep) => (
        <div key={groep.naam} className="flex flex-col gap-1">
          <span className="flex items-center gap-2 px-3 pb-1.5 text-[0.9375rem] font-medium text-[var(--text-primary)]">
            <span className="flex text-[var(--text-primary)]">
              <Icon naam={groep.icoon} size={16} />
            </span>
            {groep.naam}
          </span>
          <div className="flex flex-col pl-7">
            {groep.items.map((item) => (
              <a
                key={item.href}
                href={`#${slug(item.label)}`}
                className="truncate rounded-[var(--radius-xl)] px-3 py-1.5 text-sm text-secondary transition-colors hover:bg-[var(--interactive-hover)] hover:text-[var(--text-primary)]"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Dezelfde sprong, maar dan liggend en met de hoofdstukken zelf als doel: op mobiel is er geen ruimte voor een kolom van tien regels. */
function MobielNav({ groepen }: { groepen: NavHoofdstuk[] }) {
  return (
    <nav
      aria-label="Ga naar onderdeel"
      className="no-print volle-breedte flex gap-2 overflow-x-auto border-y border-[var(--border-subtle)] py-2.5 lg:hidden"
    >
      {groepen.map((groep) => (
        <a key={groep.naam} href={`#${slug(groep.naam)}`} className="chip chip-neutral shrink-0">
          <Icon naam={groep.icoon} size={12} />
          {groep.naam}
        </a>
      ))}
    </nav>
  );
}

/**
 * Eén bestemming uit de zijbalk, als een volwaardig, altijd open artikel: een
 * icoontegel en een titel die de belofte zegt (schrijfstijl.md §4), de uitleg
 * zelf, en onderaan de link naar de echte pagina. Geen accordion: de
 * linkernavigatie ernaast is de manier om iets terug te vinden, dus hier hoeft
 * niets weggevouwen te worden.
 */
function Onderdeel({
  item,
  brandId,
  icoon,
  children,
}: {
  item: NavItem;
  brandId: string | null;
  icoon: IcoonNaam;
  children: React.ReactNode;
}) {
  return (
    <article
      id={slug(item.label)}
      className="card scroll-mt-[calc(var(--header-h)+1.5rem)] flex flex-col gap-4"
    >
      <div className="flex items-start gap-3">
        <IconTegel icoon={icoon} />
        <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
          <h3 className="type-body-emphasis text-[var(--text-primary)]">
            {item.label}
          </h3>
          <p className="text-sm text-muted">{KICKER[item.label]}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-4">
        {children}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
        <span className="text-sm text-muted">Volgende stap</span>
        {brandId ? (
          <Link href={item.href} className="btn-outline btn-sm w-fit">
            Ga naar {item.label}
            <Icon naam="naar" size={14} />
          </Link>
        ) : (
          <Link href="/merk" className="btn-outline btn-sm w-fit">
            Kies eerst een merk
            <Icon naam="naar" size={14} />
          </Link>
        )}
      </div>
    </article>
  );
}

/** Een korte, feitelijke bulletlijst in een getint kader, voor "wat je hier ziet en kunt doen". */
function Kader({ label, items }: { label: string; items: React.ReactNode[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-xl)] bg-[var(--bg-layer-2)] p-4">
      <span className="mono-label">{label}</span>
      <ul className="flex flex-col gap-2">
        {items.map((tekst, i) => (
          <li key={i} className="flex gap-2 text-sm text-secondary">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current" />
            <span>{tekst}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Een toelichting: de betekenis "information" uit de betekenislaag, voor een mededeling die geen waarschuwing is. */
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="rounded-[var(--radius-xl)] border-l-2 bg-[var(--bg-layer-2)] py-2.5 pl-3 pr-3 text-sm text-secondary"
      style={{ borderColor: "var(--border-default)" }}
    >
      <span
        className="mono-label mr-1.5"
        style={{ color: "var(--intent-info-content)" }}
      >
        Tip
      </span>
      {children}
    </p>
  );
}

/** URL-vriendelijke ankernaam. Geen van de labels hierboven draagt een diakritisch teken. */
function slug(label: string): string {
  return label
    .toLocaleLowerCase("nl")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Eén icoon per bestemming. Vier lenen die van hun eigen hoofdstuk, de rest staat voor het eerst in `lib/icons.ts`. */
const ICOON_PER_LABEL: Record<string, IcoonNaam> = {
  "Hoe sta je ervoor": "overzicht",
  "Mijn clusters": "meten",
  "Clusters ontdekken": "zoekmachine",
  "Openstaande vragen": "feit",
  Contentplan: "plannen",
  Bibliotheek: "bibliotheek",
  "Zichtbaarheid in AI": "analytics",
  Zoekverkeer: "zoekmachine",
  Concurrenten: "concurrenten",
  "Mijn reputatie": "reputatie",
  Merkdossier: "merkprofiel",
};

/** De belofte in één zin, zichtbaar naast de titel (schrijfstijl.md §4: kop is de belofte, subkop is één zin uitleg). */
const KICKER: Record<string, string> = {
  "Hoe sta je ervoor": "Is er iets nieuws sinds je hier voor het laatst was?",
  "Mijn clusters": "Eén onderwerp, gemeten op hoe vaak AI je noemt.",
  "Clusters ontdekken": "Nieuwe onderwerpen die bij je merk passen.",
  "Openstaande vragen": "Wat ORBIT ENGINE nog van je wil weten.",
  Contentplan: "Wat er wanneer geschreven en gepubliceerd wordt.",
  Bibliotheek: "Alle pagina's, van de eerste vragen tot het gemeten effect.",
  "Zichtbaarheid in AI": "Je hoofdcijfer: hoe vaak je genoemd wordt.",
  Zoekverkeer: "Levert je content ook bezoekers op uit Google?",
  Concurrenten: "Wie er nog meer genoemd wordt, en waar jij staat.",
  "Mijn reputatie": "Niet óf je genoemd wordt, maar hoé.",
  Merkdossier: "Wie je bent volgens ORBIT ENGINE, en of dat klopt.",
};

/**
 * De uitleg per bestemming, gekoppeld op hoofdstuk en dan op het label uit
 * `lib/nav.ts`. Verandert een label daar, dan valt de uitleg hier stil in
 * plaats van op het verkeerde scherm te verschijnen: `SupportPage` filtert
 * hierboven op wat hier écht een sleutel heeft.
 */
const CONTENT: Partial<Record<Hoofdstuk, Record<string, React.ReactNode>>> = {
  Overzicht: {
    "Hoe sta je ervoor": (
      <>
        <p className="text-secondary">
          Dit is de eerste pagina die je ziet zodra je inlogt, en het antwoord op één vraag: is er
          iets nieuws sinds je hier voor het laatst was.
        </p>
        <Kader
          label="Wat je hier ziet"
          items={[
            <>
              <span className="font-medium">Wat er op jou wacht</span> staat bovenaan, maar
              alleen als er iets is: een vraag beantwoorden, een tekst lezen, een pagina live
              melden. De knop bij de bovenste regel is de belangrijkste van het scherm.
            </>,
            <>
              <span className="font-medium">Zichtbaarheid in AI</span> is je hoofdcijfer: hoe vaak
              AI-assistenten je noemen, met de onzekerheidsmarge erbij. Een verandering binnen die
              marge telt niet als winst of verlies, dat is meetruis. Eronder staat in één zin wat
              er sinds de start gemaakt is.
            </>,
            <>
              <span className="font-medium">Deze maand</span> onderaan laat de vijf stappen van
              de maand zien, van meten tot hermeten, en bij wie de beurt ligt.
            </>,
          ]}
        />
        <Tip>
          Onder je merknaam staat altijd wanneer er voor het laatst gemeten is. Zie je hetzelfde
          cijfer als vorige week, kijk dan eerst naar die datum: er is dan nog geen nieuwe meting
          geweest.
        </Tip>
      </>
    ),
  },

  Clusters: {
    "Mijn clusters": (
      <>
        <p className="text-secondary">
          Een cluster is één onderwerp of product waarop ORBIT ENGINE je zichtbaarheid volgt,
          bijvoorbeeld &ldquo;cv-ketel onderhoud&rdquo; of &ldquo;dameskleding online
          bestellen&rdquo;. Zonder een cluster is er niets om te meten en dus ook niets om over te
          schrijven.
        </p>
        <Kader
          label="Wat je hier ziet en kunt doen"
          items={[
            "Bovenaan staat wat je aandacht vraagt: een cluster dat niet gelukt is, of een meetplan dat wacht op goedkeuring.",
            "Bij een gemeten cluster staan twee links: de cijfers van dat cluster op Analytics, en de pagina's die eruit volgen in de Bibliotheek.",
            "Onder Voorgesteld staan onderwerpen die ORBIT ENGINE voorstelt, uit je merkonderzoek en uit Clusters ontdekken. Je consultant start daar de meting.",
            "Een label hangt een cluster aan een eigen groep. Een cluster in de prullenbak wordt niet meer gemeten, maar blijft bewaard en kan altijd terug.",
          ]}
        />
        <p className="text-secondary">
          Een nieuw cluster start je consultant voor je. Na de start stelt ORBIT ENGINE een
          meetplan voor, en pas als dat is goedgekeurd gaan de vragen naar de AI-assistenten.
        </p>
        <Tip>
          Website en onderwerp liggen na de start vast, want anders is de trend niet meer te lezen.
          Wil je iets anders afbakenen, dan wordt dat een nieuw cluster.
        </Tip>
      </>
    ),
    "Clusters ontdekken": (
      <>
        <p className="text-secondary">
          Nieuwe onderwerpen die bij je merk passen, gevonden in je eigen Google-cijfers, je
          onboarding en de zoekdata van Google. Je consultant start een ronde over één thema;
          daarna staan hier hooguit twaalf voorstellen, met per voorstel waarom het de moeite
          waard is.
        </p>
        <Kader
          label="Wat je hier kunt doen"
          items={[
            "Bewaar een voorstel dat je aanspreekt. Het komt dan bij Voorgesteld op Mijn clusters te staan, waar je consultant de meting start.",
            "Het zoekvolume is hoe vaak iets in Google gezocht wordt: een aanwijzing voor wat mensen aan een AI-assistent vragen, geen meting daarvan.",
          ]}
        />
      </>
    ),
  },

  Strategie: {
    "Openstaande vragen": (
      <>
        <p className="text-secondary">
          Alle vragen die ORBIT ENGINE nog aan jou heeft, op één plek: eerst de vragen per pagina,
          de pagina met de vroegste streefdatum bovenaan, en daaronder de losse vragen over je merk.
        </p>
        <p className="text-secondary">
          Een pagina wordt pas geschreven als elke vraag van die pagina beantwoord of overgeslagen
          is. Het laatste antwoord is genoeg: daarna begint het schrijven vanzelf. Teksten om goed te
          keuren en pagina&apos;s om live te zetten vind je in de Bibliotheek.
        </p>
        <Kader
          label="Wat je hier kunt doen"
          items={[
            "Beantwoord een vraag, of sla hem over. Overslaan telt als antwoord; de knop zegt erbij welk onderdeel dan niet op de pagina komt.",
            "Open een pagina om te zien waar de vragen voor zijn.",
            "Staat er niets open, dan heeft ORBIT ENGINE alles wat het nu nodig heeft.",
          ]}
        />
        <Tip>
          Hoe concreter je antwoord, hoe concreter de tekst die ORBIT ENGINE ervan maakt.
          &ldquo;Wij werken met eigen monteurs, geen onderaannemers&rdquo; is bruikbaarder dan
          &ldquo;kwaliteit staat voorop&rdquo;.
        </Tip>
      </>
    ),
    Contentplan: (
      <>
        <p className="text-secondary">
          Wat ORBIT ENGINE deze maand en volgende maand voor je schrijft, en wanneer het live moet
          staan. Dit is de brug tussen wat er gemeten is en wat er daadwerkelijk gepubliceerd wordt.
        </p>
        <Kader
          label="Drie weergaven"
          items={[
            <>
              <span className="font-medium">Overzicht</span> is waar je landt: eerst wat er van
              jou gevraagd wordt, dan deze maand en volgende maand, en de rest van je jaar
              ingeklapt.
            </>,
            <>
              <span className="font-medium">Plannen</span> is het bord waarop je consultant
              pagina&apos;s naar een maand sleept. Het staat ook voor jou open.
            </>,
            <>
              <span className="font-medium">Kalender</span> toont het hele jaar in één oogopslag,
              zodat je ziet waar een gat valt.
            </>,
          ]}
        />
        <p className="text-secondary">
          Een maand vrijgeven doe je samen met je consultant. Daarna zet ORBIT ENGINE de vragen
          voor die pagina&apos;s klaar onder Openstaande vragen.
        </p>
      </>
    ),
    Bibliotheek: (
      <>
        <p className="text-secondary">
          Alles wat ORBIT ENGINE voor je merk schreef, over al je clusters heen op één plek. Dit is
          het eindproduct: de teksten zelf, niet de taak eromheen.
        </p>
        <Kader
          label="Wat je hier ziet"
          items={[
            "De pagina's staan in drie groepen: wat op jou wacht, wat op de planning staat (daar hoef je niets voor te doen) en wat live staat.",
            "Open een pagina om hem te lezen, goed te keuren, of te melden dat hij live staat zodra je hem op je site hebt gezet. ORBIT ENGINE zet zelf niets op je website.",
            "Dit is de enige bibliotheek. Klik je vanuit een cluster op zijn pagina's, dan kom je hier uit met dat cluster al als filter ingesteld.",
          ]}
        />
        <p className="text-secondary">
          Is je bibliotheek nog leeg, dan heeft ORBIT ENGINE nog geen pagina geschreven. In het
          contentplan zie je welke pagina&apos;s eraan komen.
        </p>
      </>
    ),
  },

  Analytics: {
    "Zichtbaarheid in AI": (
      <>
        <p className="text-secondary">
          Hoe vaak AI-assistenten je noemen, over al je clusters heen, en wat dat cijfer verklaart.
          Dit is het hoofdcijfer waarvoor je ORBIT ENGINE gebruikt.
        </p>
        <Kader
          label="Wat je hier ziet"
          items={[
            "Het grote percentage is je gewogen gemiddelde over alle clusters, met de onzekerheidsmarge erbij: dat is geen slordigheid maar de breedte van een steekproef.",
            "Het raster ernaast toont per cluster hoe de lijn loopt: staven bij één of twee metingen, een lijn vanaf drie.",
            "De tabel eronder zet elk cluster naast elkaar, zodat je in één oogopslag ziet welk onderwerp achterblijft. Daaronder staat elke AI-vraag los, met het antwoord erbij.",
            "Helemaal onderaan staat wat je gepubliceerde pagina's in Google opleverden: klikken sinds de start en in de laatste 28 dagen.",
            "Staat er een blokkade bovenaan, los die dan als eerste op: zolang een AI-assistent je site niet mag lezen, blijft je score lager dan hij zou zijn, en helpt nieuwe content daar niets aan.",
          ]}
        />
        <p className="text-secondary">
          Met de filterbalk kijk je naar een andere periode of één los cluster. Onder &ldquo;Meer
          filters&rdquo; staan label, AI-assistent en fase van de klantreis.
        </p>
      </>
    ),
    Zoekverkeer: (
      <>
        <p className="text-secondary">
          Levert de content die ORBIT ENGINE publiceerde ook bezoekers op uit Google? Dit scherm
          gaat over de pagina&apos;s die ORBIT ENGINE zelf schreef en publiceerde, niet over je hele
          website.
        </p>
        <Kader
          label="Wat je hier ziet"
          items={[
            "Klikken, vertoningen, doorklikratio en gemiddelde positie: de vier cijfers die Google Search Console per pagina bijhoudt.",
            "De grafiek toont het verloop per dag, met een merkteken op de publicatiedatum van elke pagina.",
            <>
              De kolom <span className="font-medium">Effect op AI</span> vergelijkt hoe vaak een
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
      </>
    ),
    Concurrenten: (
      <>
        <p className="text-secondary">
          Wie er nog meer genoemd wordt als klanten een AI-assistent iets vragen over jouw markt, en
          op welke plek jij tussen hen staat.
        </p>
        <Kader
          label="Wat je hier ziet"
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
      </>
    ),
    "Mijn reputatie": (
      <>
        <p className="text-secondary">
          Niet óf je genoemd wordt, maar hoé een AI-assistent over je praat: positief, neutraal,
          verdeeld of negatief, per product of dienst.
        </p>
        <Kader
          label="Wat je hier ziet"
          items={[
            "Het toonoordeel staat nooit alleen: ernaast staat altijd hoeveel echte bronnen daaronder liggen. Weinig bronnen betekent een onzeker oordeel, ook als de toon vriendelijk is.",
            "Per product zie je wie de AI aanraadt en op welke plek jij in dat rijtje staat.",
            "Dit is een los onderzoek dat je apart start, anders dan de andere drie schermen in dit hoofdstuk die meelopen in de vaste meetronde.",
          ]}
        />
        <Tip>
          Een vriendelijke toon zonder bronnen eronder is geen goed nieuws: dat betekent vaak dat de
          AI simpelweg niets van je weet en dan standaard beleefd is. Kijk daarom altijd samen met
          het aantal bronnen naar dit cijfer, nooit los.
        </Tip>
      </>
    ),
  },

  Merkprofiel: {
    Merkdossier: (
      <>
        <p className="text-secondary">
          Wie ben je volgens ORBIT ENGINE, en klopt dat? ORBIT ENGINE heeft het meeste al van je
          website gehaald: bedrijfsgegevens, waar je actief bent, je doelgroep, je toon en een
          contactpersoon.
        </p>
        <Kader
          label="Wat je hier doet"
          items={[
            "Elk veld toont waar de waarde vandaan komt, bijvoorbeeld 'uit je website gehaald'. Zo weet je precies wat ORBIT ENGINE zelf heeft afgeleid en wat nog een controle nodig heeft.",
            "Kijk elk veld na, corrigeer wat niet klopt en vul aan wat ORBIT ENGINE niet kon weten.",
            "Wat je hier vastlegt blijft staan, ook als het onderzoek later opnieuw draait.",
          ]}
        />
        <p className="text-secondary">
          Dit dossier is de basis onder alles: hoe scherper het klopt, hoe beter de vragen die ORBIT
          ENGINE stelt en hoe raker de content die het schrijft.
        </p>
        <Tip>
          Klopt er iets in je dossier niet meer, bijvoorbeeld een nieuwe dienst of een ander
          werkgebied? Werk het hier bij. Dat werkt door in de volgende meetronde en in nieuwe
          content, niet met terugwerkende kracht in wat er al geschreven is.
        </Tip>
      </>
    ),
  },
};
