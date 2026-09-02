/**
 * De iconenset van ORBIT ENGINE, één bron voor de hele app.
 *
 * ── WAAROM DIT BESTAND ER NU WEL IS ─────────────────────────────────────────
 *
 * Tot 21 augustus 2026 stond hier bewust niets. `lib/nav.ts` zei het zelf:
 * "Bewust geen icoonset: die vraagt een bibliotheek, een kleurregel en een
 * tweede manier om betekenis over te brengen, voor zes koppen." Dat argument
 * klopte toen de zijbalk zes koppen had en verder niets.
 *
 * Wat er sindsdien veranderd is: het bleef niet bij zes. De app gebruikte
 * ✓ ✕ ○ · ☰ ▾ ▲ ▼ ↗ ← → ↑ ↓ ⚙ – ! op 40 regels JSX, elk los getypt, elk met zijn
 * eigen maat en uitlijning, plus 23 regels in `lib/nav.ts` en twee met de hand
 * getekende SVG's in `components/profile-menu.tsx` met elk hun eigen lijndikte
 * (1,6 en 1,8). Bij die aantallen is "geen icoonset" ook een set, alleen dan
 * één zonder regels.
 *
 * Daar komt bij dat een letterteken geen vaste vorm heeft. Heeft het
 * paginalettertype de glyph niet, dan pakt het besturingssysteem er een uit een
 * ander font, en dat font verschilt per platform. ◉ ▣ ◆ ◈ zagen er dus per
 * klant anders uit. Een set met één lijndikte is daarmee geen versiering maar
 * het herstel van iets dat stuk was.
 *
 * ── WAAROM LUCIDE ──────────────────────────────────────────────────────────
 *
 * Lucide (ISC-licentie, gratis, ruim 1.600 iconen) tekent op een raster van
 * 24×24 met één lijndikte en ronde uiteinden. Dat is precies wat
 * `docs/merkstrategie.md` §15.1 vraagt: minimalistisch, technisch, rustig,
 * precies. Geen gevulde vlakken, geen kleur in het icoon zelf, dus §16.1
 * ("neutral-first, kleur krijgt betekenis") blijft heel: het icoon erft
 * `currentColor` en kleurt dus mee met de tekst ernaast, nooit ernaast.
 *
 * De keuze per icoon volgt §15.5, de visuele metafoor van "een systeem dat
 * zichzelf uitbreidt": netwerken, structuren, lagen, verbindingen. Vandaar
 * oplopende punten met verbindingen ertussen bij Strategie. En vandaar dat
 * §15.4 hier meegewogen is: geen robot, geen brein, geen glittertje bij alles
 * wat AI aanraakt, en geen tandwiel bij Instellingen.
 *
 * ── DE REGELS ──────────────────────────────────────────────────────────────
 *
 * 1. **Een icoon staat nooit alleen.** Overal in de navigatie en in de knoppen
 *    staat het label ernaast. Het icoon versnelt het terugvinden, het draagt de
 *    betekenis niet. Daarom staat er `aria-hidden` op (`components/icon.tsx`);
 *    een schermlezer die "schild, Admin" voorleest, herhaalt zichzelf.
 * 2. **Eén betekenis, één icoon.** Deze tabel is de enige plek waar een
 *    betekenis aan een tekening gekoppeld wordt. Wie ergens `<Check />`
 *    rechtstreeks importeert, zet de tweede kopie van een keuze neer, en twee
 *    kopieën lopen uit elkaar.
 * 3. **De naam is de betekenis, niet de tekening.** `strategie`, niet
 *    `waypoints`. Verandert de tekening ooit, dan is dat één regel hier en geen
 *    zoekactie door 38 bestanden. Twee namen mogen dezelfde tekening delen als
 *    ze iets anders betekenen: `stijging` is een meting, `omhoog` is een
 *    handeling van de gebruiker, en die twee horen los te kunnen bewegen.
 * 4. **Alleen de zeven hoofdstukken van de zijbalk hebben er een, de bestemmingen
 *    eronder niet** (besluit 21 augustus 2026). Ze hebben ze een halve dag wél
 *    gehad, en toen bleek dat zestien tekeningen in een balk van zestien regels
 *    niets meer markeren. `lib/nav.ts` heeft daarom geen icoonveld op `NavItem`,
 *    en een test in `scripts/test-unit.ts` bewaakt dat het niet terugsluipt.
 *
 * Bewust ZONDER `server-only`: de zijbalk is client, de paginakoppen zijn
 * server, en beide lezen deze tabel.
 */
import {
  Ellipsis,
  GripVertical,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChartNoAxesCombined,
  Circle,
  CircleDashed,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  FilePen,
  FilePlus2,
  FileQuestionMark,
  FingerprintPattern,
  Globe,
  Menu,
  Minus,
  Moon,
  Orbit,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Tag,
  Trash2,
  Sun,
  TriangleAlert,
  Upload,
  UserRound,
  Waypoints,
  X,
  type LucideIcon,
} from "lucide-react";

/**
 * Elke betekenis die de app tekent, in de volgorde waarin je ze tegenkomt:
 * eerst de zeven hoofdstukken van de zijbalk, dan de bediening, dan de standen.
 */
export type IcoonNaam =
  // ── De zeven hoofdstukken van de zijbalk ────────────────────────────────
  | "overzicht"
  | "strategie"
  | "analytics"
  | "merkprofiel"
  | "instellingen"
  | "sales"
  | "admin"
  // ── Bediening ───────────────────────────────────────────────────────────
  | "menu"
  | "sluiten"
  | "uitklappen"
  | "inklappen"
  | "openen"
  | "verder"
  | "terug"
  | "naar"
  | "omhoog"
  | "omlaag"
  | "extern"
  | "kopieer"
  | "profiel"
  | "meer"
  | "versleep"
  | "label"
  | "prullenbak"
  // ── Standen ─────────────────────────────────────────────────────────────
  | "klaar"
  | "loopt"
  | "open"
  | "mislukt"
  | "letop"
  | "nvt"
  | "stijging"
  | "daling"
  // ── Soorten werk en kansen ──────────────────────────────────────────────
  | "nieuwepagina"
  | "paginabijwerken"
  | "publiceren"
  | "meten"
  | "goedkeuring"
  | "feit"
  | "herstel"
  | "offsite"
  // ── De weergave van de app zelf ─────────────────────────────────────────
  | "licht"
  | "donker"
  // Alleen zichtbaar voor staf: wisselen naar wat een klant ziet
  // (`components/preview-toggle.tsx`).
  | "klantweergave"
  | "eigenweergave";

export const ICONEN: Record<IcoonNaam, LucideIcon> = {
  // ── DE ZEVEN HOOFDSTUKKEN ───────────────────────────────────────────────
  //
  // `Orbit` bovenaan is geen woordgrapje op de productnaam maar het antwoord
  // op de vraag die dit hoofdstuk stelt: waar sta je ten opzichte van de rest.
  // Een middelpunt met een lichaam eromheen is precies dat beeld.
  overzicht: Orbit,
  // Punten die met elkaar verbonden zijn en oplopen: contentplan, clusters en
  // bibliotheek zijn stappen in één volgorde en geen losse keuzes. Hier stond
  // eerst `Route`, maar die leek op 18 pixels te veel op de schuifjes van
  // Instellingen, en juist ingeklapt staan die twee koppen vlak bij elkaar.
  strategie: Waypoints,
  analytics: ChartNoAxesCombined,
  // Merkprofiel gaat over identiteit: wie ben jij volgens ORBIT ENGINE. Een
  // vingerafdrukpatroon zegt dat abstract, zonder een persoon te tekenen (dit
  // is een merk, geen gebruiker).
  merkprofiel: FingerprintPattern,
  // Schuifjes en geen tandwiel. Het tandwiel is het cliché waar §15.2 voor
  // waarschuwt, en instellingen zijn hier ook echt afstellen: hoe vaak meten,
  // wie mag erbij, welke koppeling staat aan.
  instellingen: SlidersHorizontal,
  // Een radar tekent precies wat deze sectie doet: een gebied afzoeken en
  // zichtbaar maken wat erin zit. Geen doelwit met een kruis erin, want dat
  // maakt van een prospect een prooi, en geen geldteken, want de module gaat
  // over de kans en niet over de rekening. Sales staat net als Admin onder de
  // scheidingslijn: de klant ziet het nooit (plan §4.3).
  sales: Radar,
  // Het schild is niet "beveiligd" maar "afgeschermd": dit hoofdstuk staat al
  // onder een scheidingslijn omdat de klant het nooit ziet (`lib/nav.ts`).
  admin: Shield,

  // ── BEDIENING ───────────────────────────────────────────────────────────
  menu: Menu,
  sluiten: X,
  // De zijbalk klapt in en uit. Het paneel-icoon toont de handeling én de
  // richting, waar « en » alleen richting toonden.
  uitklappen: PanelLeftOpen,
  inklappen: PanelLeftClose,
  openen: ChevronDown,
  verder: ChevronRight,
  terug: ArrowLeft,
  // Vooruit binnen de app, achter een tekstlink: "Naar de cijfers", "Cluster
  // loopt". Niet hetzelfde als `extern`, die de app verlaat.
  naar: ArrowRight,
  // Een regel een plek verplaatsen. Zelfde tekening als `stijging` en `daling`,
  // andere betekenis: dit is een handeling van de gebruiker en geen meting.
  // Regel 3 hierboven: de naam is de betekenis, niet de tekening.
  omhoog: ArrowUp,
  omlaag: ArrowDown,
  extern: ArrowUpRight,
  kopieer: Copy,
  profiel: UserRound,
  // Drie puntjes: alles wat een rij kan, maar niet vaak genoeg om er ruimte
  // voor op te eisen. Het contentplan had per regel vijf zichtbare bedieningen
  // (twee pijlen, een keuzelijst, twee tekstlinks) en dat woog zwaarder dan de
  // titel ernaast.
  meer: Ellipsis,
  // De greep om te slepen. Verschijnt pas als de muis over de rij komt: zonder
  // greep is niet te zien dát een rij versleepbaar is, met een altijd zichtbare
  // greep staat er op elke regel een teken dat niets zegt zolang je niet sleept.
  versleep: GripVertical,
  // Een kaartlabel: een woord dat je ergens aan hangt om het terug te vinden.
  // Geen map en geen bookmark, want dit is geen plek en geen leeswijzer maar
  // een groep waar iets bij hoort (`lib/cluster-labels.ts`).
  label: Tag,
  // De prullenbak zegt "hier gaat het heen" en niet "hier is het weg": wat de
  // knop doet is archiveren (migratie 0044), en terugzetten kan altijd. Geen
  // kruis, want een kruis betekent in deze set "mislukt".
  prullenbak: Trash2,

  // ── STANDEN ─────────────────────────────────────────────────────────────
  //
  // ⚠️ Deze zes dragen betekenis die óók in kleur zit, en dat is precies
  // waarom ze bestaan: `components/geo-scorecard.tsx` legt uit dat identiteit
  // nooit alleen op kleur mag leunen. Een klant die rood en groen niet
  // onderscheidt, ziet hier het verschil tussen een vinkje en een kruis.
  klaar: Check,
  // Een onderbroken cirkel: er draait iets, maar het is nog niet rond.
  loopt: CircleDashed,
  open: Circle,
  mislukt: X,
  letop: TriangleAlert,
  // Conventie 3: niet van toepassing is een streepje, nooit een 0 en nooit een
  // kruis. Een kruis zou "fout" zeggen over iets dat niet gemeten hoefde.
  nvt: Minus,
  stijging: ArrowUp,
  daling: ArrowDown,

  // ── SOORTEN WERK EN KANSEN ──────────────────────────────────────────────
  //
  // Toegevoegd 24 augustus 2026, voor het overzicht. Daar stonden twaalf
  // kaarten onder elkaar die alleen in hun tekst van elkaar verschilden:
  // "maak een nieuwe pagina", "verbeter de pagina over X", "verbeter de pagina
  // voor Y". Wie de lijst scant leest dan drie keer hetzelfde begin voordat
  // hij het verschil vindt. Het icoon draagt dat verschil vóór de eerste
  // letter (`docs/designsystem.md` §6b.3, regel 1: het versnelt het
  // terugvinden, het draagt de betekenis niet, want de zin staat ernaast).
  //
  // Ze houden zich aan regel 3: de naam is de handeling, niet de tekening.
  // Verandert de tekening ooit, dan is dat één regel hier.
  //
  // Een blad met een plus erop: er komt een pagina bij die er nog niet is.
  nieuwepagina: FilePlus2,
  // Hetzelfde blad met een pen: de pagina bestaat al en wordt bijgewerkt. Het
  // verschil tussen deze twee is precies het verschil dat de klant moet zien.
  paginabijwerken: FilePen,
  // Naar buiten: geschreven, goedgekeurd, en het enige wat nog moet gebeuren
  // is dat het online komt.
  publiceren: Upload,
  // Een radar tast af wat er is zonder het te veranderen: dat is wat een
  // meetronde doet. Geen vergrootglas, want dat is zoeken en niet meten.
  meten: Radar,
  // Een lijst met een vinkje: nakijken en bevestigen, en dan gaat het verder.
  goedkeuring: ClipboardCheck,
  // Een vraag óp een blad: dit is geen chatvraag maar een openstaand feit in
  // het merkdossier dat alleen de klant kan invullen.
  feit: FileQuestionMark,
  // Terugdraaien en opnieuw: er ging iets mis in de pijplijn en het moet over.
  herstel: RotateCcw,
  // Werk buiten de eigen site: een vermelding, een profiel, een bron elders.
  offsite: Globe,

  // De themaschakelaar. Het icoon toont waar je heen gaat en niet waar je bent:
  // sta je in de lichte stand, dan zie je de maan. Dat is de conventie in vrijwel
  // elke app die dit heeft, en de knop draagt bovendien een `aria-label` die het
  // uitspreekt, dus de betekenis hangt nergens aan het plaatje alleen.
  licht: Sun,
  donker: Moon,
  // Een open oog voor "kijk mee zoals een klant kijkt", een doorgestreept oog
  // voor "je bent daar nu, terug naar jezelf". Alleen zichtbaar voor staf.
  klantweergave: Eye,
  eigenweergave: EyeOff,
};
