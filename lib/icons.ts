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
 * ── WAAROM PHOSPHOR, GEWICHT BOLD (30 september 2026) ─────────────────────
 *
 * Eerst stond hier Lucide, een dunne lijnset. Die las als te dun en te
 * standaard. Phosphor (MIT-licentie, gratis, ruim 1.500 tekeningen in zes
 * gewichten) is gekozen op verzoek van de eigenaar. Eén tekenstijl in alle
 * gewichten betekent dat wisselen tussen dun, dik of gevuld één woord is in
 * `components/icon.tsx`, zonder dat een tekening verandert. Het icoon erft
 * `currentColor` en kleurt dus mee met de tekst ernaast, nooit ernaast, dus
 * §16.1 van `docs/merkstrategie.md` ("neutral-first") blijft heel.
 *
 * Geïmporteerd uit `@phosphor-icons/react/dist/ssr`, omdat deze tabel zowel in
 * server- als in clientcomponenten wordt gelezen.
 *
 * Phosphor heeft geen radar (`meten`, nu een uitzendend signaal) en geen
 * vraagteken op een blad (`feit`, nu een zegel met vraagteken).
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
 * 4. **Sinds 29 september 2026 hebben de bestemmingen in de zijbalk een icoon en
 *    de koppen niet meer** (`lib/nav.ts`, `NavItem.icoon`). Daarvoor gold het
 *    omgekeerde (besluit 21 augustus 2026): alleen de hoofdstukken hadden er een.
 *
 * Bewust ZONDER `server-only`: de zijbalk is client, de paginakoppen zijn
 * server, en beide lezen deze tabel.
 */
import { type IcoonNaam } from "@/lib/icon-names";
import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowLineLeftIcon,
  ArrowLineRightIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  BellIcon,
  BookOpenIcon,
  BuildingsIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  FunnelSimpleIcon,
  CaretRightIcon,
  ChartBarIcon,
  ChatCircleIcon,
  CheckIcon,
  CircleIcon,
  CircleDashedIcon,
  ClipboardTextIcon,
  CompassIcon,
  CopyIcon,
  DotsSixVerticalIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  FilePlusIcon,
  FingerprintIcon,
  GlobeIcon,
  InfoIcon,
  ListIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
  MinusIcon,
  MoonIcon,
  NotePencilIcon,
  PaperPlaneTiltIcon,
  PathIcon,
  PencilSimpleIcon,
  PlanetIcon,
  PlugsIcon,
  PlusIcon,
  QuestionIcon,
  BroadcastIcon,
  ScalesIcon,
  SealQuestionIcon,
  ShieldIcon,
  SignOutIcon,
  SlidersHorizontalIcon,
  SquaresFourIcon,
  SunIcon,
  TagIcon,
  TrashIcon,
  UploadSimpleIcon,
  UserIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Elke betekenis die de app tekent, in de volgorde waarin je ze tegenkomt:
 * eerst de zeven hoofdstukken van de zijbalk, dan de bediening, dan de standen.
 */
export type { IcoonNaam };

export const ICONEN: Record<IcoonNaam, ComponentType<IconProps>> = {
  // ── DE ZEVEN HOOFDSTUKKEN ───────────────────────────────────────────────
  //
  // `Orbit` bovenaan is geen woordgrapje op de productnaam maar het antwoord
  // op de vraag die dit hoofdstuk stelt: waar sta je ten opzichte van de rest.
  // Een middelpunt met een lichaam eromheen is precies dat beeld.
  overzicht: PlanetIcon,
  taken: ListChecksIcon,
  // Punten die met elkaar verbonden zijn en oplopen: contentplan, clusters en
  // bibliotheek zijn stappen in één volgorde en geen losse keuzes. Hier stond
  // eerst `Route`, maar die leek op 18 pixels te veel op de schuifjes van
  // Instellingen, en juist ingeklapt staan die twee koppen vlak bij elkaar.
  strategie: PathIcon,
  // Losse blokjes die bij elkaar horen: een cluster is precies dat, een groep
  // vragen over één onderwerp. Toegevoegd op 23 september 2026, toen Clusters
  // een eigen hoofdstuk werd (docs/tasks/clusters-ontdekken.md).
  clusters: SquaresFourIcon,
  analytics: ChartBarIcon,
  // Merkprofiel gaat over identiteit: wie ben jij volgens ORBIT ENGINE. Een
  // vingerafdrukpatroon zegt dat abstract, zonder een persoon te tekenen (dit
  // is een merk, geen gebruiker).
  merkprofiel: FingerprintIcon,
  // Schuifjes en geen tandwiel. Het tandwiel is het cliché waar §15.2 voor
  // waarschuwt, en instellingen zijn hier ook echt afstellen: hoe vaak meten,
  // wie mag erbij, welke koppeling staat aan.
  instellingen: SlidersHorizontalIcon,
  // Een radar tekent precies wat deze sectie doet: een gebied afzoeken en
  // zichtbaar maken wat erin zit. Geen doelwit met een kruis erin, want dat
  // maakt van een prospect een prooi, en geen geldteken, want de module gaat
  // over de kans en niet over de rekening. Sales staat net als Admin onder de
  // scheidingslijn: de klant ziet het nooit (plan §4.3).
  // Het schild is niet "beveiligd" maar "afgeschermd": dit hoofdstuk staat al
  // onder een scheidingslijn omdat de klant het nooit ziet (`lib/nav.ts`).
  admin: ShieldIcon,

  // ── BEDIENING ───────────────────────────────────────────────────────────
  menu: ListIcon,
  sluiten: XIcon,
  // Iets nieuws aanmaken ("Nieuw merk", "Nieuw label maken"). Stond er tot
  // 23 september 2026 als een los plusteken in de tekst, tegen §11 regel 9.
  toevoegen: PlusIcon,
  // De zijbalk klapt in en uit. Het paneel-icoon toont de handeling én de
  // richting, waar « en » alleen richting toonden.
  uitklappen: ArrowLineRightIcon,
  inklappen: ArrowLineLeftIcon,
  openen: CaretDownIcon,
  verder: CaretRightIcon,
  terug: ArrowLeftIcon,
  // Vooruit binnen de app, achter een tekstlink: "Naar de cijfers", "Cluster
  // loopt". Niet hetzelfde als `extern`, die de app verlaat.
  naar: ArrowRightIcon,
  // Een regel een plek verplaatsen. Zelfde tekening als `stijging` en `daling`,
  // andere betekenis: dit is een handeling van de gebruiker en geen meting.
  // Regel 3 hierboven: de naam is de betekenis, niet de tekening.
  omhoog: ArrowUpIcon,
  omlaag: ArrowDownIcon,
  extern: ArrowUpRightIcon,
  kopieer: CopyIcon,
  downloaden: DownloadSimpleIcon,
  profiel: UserIcon,
  // Een vraagteken in een cirkel: de standaardtekening voor hulp, en de enige
  // in deze set die dat woord letterlijk uitbeeldt. Voor Support, rechtsboven
  // in de bovenbalk, naast de andere iconen die over "jou" en het scherm gaan.
  help: QuestionIcon,
  // Drie puntjes: alles wat een rij kan, maar niet vaak genoeg om er ruimte
  // voor op te eisen. Het contentplan had per regel vijf zichtbare bedieningen
  // (twee pijlen, een keuzelijst, twee tekstlinks) en dat woog zwaarder dan de
  // titel ernaast.
  meer: DotsThreeIcon,
  // De greep om te slepen. Verschijnt pas als de muis over de rij komt: zonder
  // greep is niet te zien dát een rij versleepbaar is, met een altijd zichtbare
  // greep staat er op elke regel een teken dat niets zegt zolang je niet sleept.
  versleep: DotsSixVerticalIcon,
  // Een kaartlabel: een woord dat je ergens aan hangt om het terug te vinden.
  // Geen map en geen bookmark, want dit is geen plek en geen leeswijzer maar
  // een groep waar iets bij hoort (`lib/cluster-labels.ts`).
  label: TagIcon,
  // De prullenbak zegt "hier gaat het heen" en niet "hier is het weg": wat de
  // knop doet is archiveren (migratie 0044), en terugzetten kan altijd. Geen
  // kruis, want een kruis betekent in deze set "mislukt".
  prullenbak: TrashIcon,
  // Een pen: een tekst aanpassen (Feiten en kennis, 30 september 2026). Niet
  // `paginabijwerken`: dat is een blad met een pen en betekent een hele pagina.
  bewerken: PencilSimpleIcon,

  // ── STANDEN ─────────────────────────────────────────────────────────────
  //
  // ⚠️ Deze zes dragen betekenis die óók in kleur zit, en dat is precies
  // waarom ze bestaan: `components/geo-scorecard.tsx` legt uit dat identiteit
  // nooit alleen op kleur mag leunen. Een klant die rood en groen niet
  // onderscheidt, ziet hier het verschil tussen een vinkje en een kruis.
  klaar: CheckIcon,
  // Een onderbroken cirkel: er draait iets, maar het is nog niet rond.
  loopt: CircleDashedIcon,
  open: CircleIcon,
  mislukt: XIcon,
  letop: WarningIcon,
  // Ter informatie: een melding die niets vraagt en niets waarschuwt. Voor
  // `Alert intent="info"` (23 september 2026).
  info: InfoIcon,
  // Conventie 3: niet van toepassing is een streepje, nooit een 0 en nooit een
  // kruis. Een kruis zou "fout" zeggen over iets dat niet gemeten hoefde.
  nvt: MinusIcon,
  stijging: ArrowUpIcon,
  daling: ArrowDownIcon,

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
  nieuwepagina: FilePlusIcon,
  // Hetzelfde blad met een pen: de pagina bestaat al en wordt bijgewerkt. Het
  // verschil tussen deze twee is precies het verschil dat de klant moet zien.
  paginabijwerken: NotePencilIcon,
  // Naar buiten: geschreven, goedgekeurd, en het enige wat nog moet gebeuren
  // is dat het online komt.
  publiceren: UploadSimpleIcon,
  // Een radar tast af wat er is zonder het te veranderen: dat is wat een
  // meetronde doet. Geen vergrootglas, want dat is zoeken en niet meten.
  meten: BroadcastIcon,
  // Een lijst met een vinkje: nakijken en bevestigen, en dan gaat het verder.
  goedkeuring: ClipboardTextIcon,
  // Een vraag óp een blad: dit is geen chatvraag maar een openstaand feit in
  // het merkdossier dat alleen de klant kan invullen.
  feit: SealQuestionIcon,
  // Terugdraaien en opnieuw: er ging iets mis in de pijplijn en het moet over.
  herstel: ArrowCounterClockwiseIcon,
  // Werk buiten de eigen site: een vermelding, een profiel, een bron elders.
  offsite: GlobeIcon,

  // ── ONDERWERPEN IN DE SUPPORT-HANDLEIDING ───────────────────────────────
  //
  // Toegevoegd bij de bouw van `/support`. Vier van de tien uitlegblokken
  // lenen hun tekening van het hoofdstuk waarin ze de enige of de eerste
  // bestemming zijn (`overzicht`, `analytics`, `merkprofiel`, `meten`); deze
  // zes zijn nieuw.
  //
  // Een vergrootglas: het klassieke teken voor zoeken, en Zoekverkeer gaat
  // over precies dat, zichtbaarheid in Google.
  zoekmachine: MagnifyingGlassIcon,
  // Een trechter: de knop die de filters van een lijst openklapt (Bibliotheek,
  // 1 oktober 2026). Bewust niet het vergrootglas, dat is zoeken op tekst.
  filter: FunnelSimpleIcon,
  // Met de klok mee ronddraaien: een nieuwe ronde die weer bij stap 01
  // begint. Bewust een andere tekening dan `herstel` (tegen de klok in): dat
  // is een pijplijn die opnieuw moet na een storing, dit is de cyclus die
  // gewoon doorgaat (regel 3: de naam is de betekenis, niet de tekening).
  opnieuw: ArrowClockwiseIcon,
  // Een kalenderblad met een reeks erin: het contentplan zet pagina's in de
  // tijd, geen los kruisje op één dag.
  plannen: CalendarBlankIcon,
  // Een open boek: waar de geschreven teksten zelf staan, geen taak erover.
  bibliotheek: BookOpenIcon,
  // Een weegschaal: Concurrenten zet merken tegen elkaar af.
  concurrenten: ScalesIcon,
  // Een spraakballon: Mijn reputatie gaat over wat een AI-assistent over je
  // ZEGT, niet over of je genoemd wordt.
  reputatie: ChatCircleIcon,

  // ── ZIJBALK (29 september 2026) ─────────────────────────────────────────
  // Een kompas: op zoek naar clusters die je nog niet hebt.
  ontdekken: CompassIcon,
  // Een stekker: een koppeling met een andere dienst (Search Console).
  koppeling: PlugsIcon,
  // De deur uit: de rij Uitloggen in het profielmenu.
  uitloggen: SignOutIcon,

  // De themaschakelaar. Het icoon toont waar je heen gaat en niet waar je bent:
  // sta je in de lichte stand, dan zie je de maan. Dat is de conventie in vrijwel
  // elke app die dit heeft, en de knop draagt bovendien een `aria-label` die het
  // uitspreekt, dus de betekenis hangt nergens aan het plaatje alleen.
  licht: SunIcon,
  donker: MoonIcon,
  // Een open oog voor "kijk mee zoals een klant kijkt", een doorgestreept oog
  // voor "je bent daar nu, terug naar jezelf". Alleen zichtbaar voor staf.
  klantweergave: EyeIcon,
  eigenweergave: EyeSlashIcon,

  // ── De onderbalk op een telefoon ─────────────────────────────────────────
  // Een gebied op een kaart: sales onderzoekt een markt vóór er een klant is,
  // niet een individueel bedrijf. Bewust een andere tekening dan `offsite`
  // (ook `Globe`-achtig maar een andere betekenis: bereik buiten de eigen
  // site), om twee betekenissen nooit op elkaar te laten lijken.
  markten: MapTrifoldIcon,
  // Een pand: de bedrijven die sales kent, vóór ze een prospect zijn.
  bedrijven: BuildingsIcon,
  // Een verstuurd bericht: wat er de deur uit is, de laatste stap in
  // outreach.
  verstuurd: PaperPlaneTiltIcon,

  // ── Het inlogtoneel ───────────────────────────────────────────────────────
  wachtwoordtonen: EyeIcon,
  wachtwoordverbergen: EyeSlashIcon,
  notificaties: BellIcon,
};
