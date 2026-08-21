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
 * `Network` bij clusters en `FileStack` bij de bibliotheek, en vandaar dat §15.4
 * hier meegewogen is: geen robot, geen brein, geen `Sparkles` bij alles wat AI
 * aanraakt. "Zichtbaarheid in AI" krijgt `Radar`, want dat is wat de meting
 * doet: aftasten of je er staat.
 *
 * ── DE REGELS ──────────────────────────────────────────────────────────────
 *
 * 1. **Een icoon staat nooit alleen.** Overal in de navigatie en in de knoppen
 *    staat het label ernaast. Het icoon versnelt het terugvinden, het draagt de
 *    betekenis niet. Daarom staat er `aria-hidden` op (`components/icon.tsx`);
 *    een schermlezer die "netwerk, clusters" voorleest, herhaalt zichzelf.
 * 2. **Eén betekenis, één icoon.** Deze tabel is de enige plek waar een
 *    betekenis aan een tekening gekoppeld wordt. Wie ergens `<Check />`
 *    rechtstreeks importeert, zet de tweede kopie van een keuze neer, en twee
 *    kopieën lopen uit elkaar.
 * 3. **De naam is de betekenis, niet de tekening.** `clusters`, niet `network`.
 *    Verandert de tekening ooit, dan is dat één regel hier en geen zoekactie
 *    door 38 bestanden. Twee namen mogen dezelfde tekening delen als ze iets
 *    anders betekenen: `stijging` is een meting, `omhoog` is een handeling van
 *    de gebruiker, en die twee horen los te kunnen bewegen.
 *
 * Bewust ZONDER `server-only`: de zijbalk is client, de paginakoppen zijn
 * server, en beide lezen deze tabel.
 */
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChartNoAxesCombined,
  Circle,
  CircleDashed,
  Copy,
  FileStack,
  FileText,
  FingerprintPattern,
  Gauge,
  Headset,
  LayoutGrid,
  ListChecks,
  Menu,
  MessageCircleQuestionMark,
  Minus,
  Network,
  Orbit,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Radar,
  Search,
  Shield,
  SlidersHorizontal,
  SquarePen,
  TriangleAlert,
  UserPlus,
  UserRound,
  Users,
  Waypoints,
  X,
  type LucideIcon,
} from "lucide-react";

/**
 * Elke betekenis die de app tekent, in de volgorde waarin je ze tegenkomt:
 * eerst de zes hoofdstukken, dan hun bestemmingen, dan de bediening, dan de
 * standen.
 */
export type IcoonNaam =
  // ── De zes hoofdstukken van de zijbalk ──────────────────────────────────
  | "overzicht"
  | "strategie"
  | "analytics"
  | "merkprofiel"
  | "instellingen"
  | "admin"
  // ── De bestemmingen daaronder ───────────────────────────────────────────
  | "stand"
  | "contentplan"
  | "clusters"
  | "bibliotheek"
  | "zichtbaarheid"
  | "zoekverkeer"
  | "concurrenten"
  | "merkdossier"
  | "bewerken"
  | "input"
  | "account"
  | "koppelingen"
  | "onboarding"
  | "diagnose"
  | "toewijzen"
  | "alleMerken"
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
  // ── Standen ─────────────────────────────────────────────────────────────
  | "klaar"
  | "loopt"
  | "open"
  | "mislukt"
  | "letop"
  | "nvt"
  | "stijging"
  | "daling";

export const ICONEN: Record<IcoonNaam, LucideIcon> = {
  // ── DE ZES HOOFDSTUKKEN ─────────────────────────────────────────────────
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
  // Het schild is niet "beveiligd" maar "afgeschermd": dit hoofdstuk staat al
  // onder een scheidingslijn omdat de klant het nooit ziet (`lib/nav.ts`).
  admin: Shield,

  // ── DE BESTEMMINGEN ─────────────────────────────────────────────────────
  stand: Gauge,
  contentplan: ListChecks,
  // Knopen met verbindingen ertussen, letterlijk wat een cluster is en
  // tegelijk de metafoor uit §15.5.
  clusters: Network,
  // Gestapelde documenten: de bibliotheek groeit met elke gepubliceerde tekst.
  bibliotheek: FileStack,
  // Aftasten of je merk in het antwoord voorkomt. Bewust niet `Sparkles`: §15.4
  // verbiedt het AI-cliché, en glitters zeggen niets over wat er gemeten is.
  zichtbaarheid: Radar,
  zoekverkeer: Search,
  // Andere bedrijven, niet andere personen. `Users` is hieronder het team van
  // de klant zelf, en die twee mogen niet op hetzelfde lijken.
  concurrenten: Building2,
  merkdossier: FileText,
  bewerken: SquarePen,
  // Dit scherm stelt de klant vragen die het model niet zelf kon beantwoorden.
  input: MessageCircleQuestionMark,
  account: Users,
  koppelingen: Plug,
  // De onboardingsessie is het gesprek mét de klant, het enige stafscherm dat
  // gedeeld wordt. Vandaar de headset en niet een klembord: het is een gesprek,
  // geen formulier.
  onboarding: Headset,
  // Diagnose is wat er technisch gebeurde. Een hartslaglijn is de rustigste
  // manier om "verloop van een proces" te tekenen.
  diagnose: Activity,
  toewijzen: UserPlus,
  alleMerken: LayoutGrid,

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
};
