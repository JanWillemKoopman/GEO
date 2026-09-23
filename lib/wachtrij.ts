/**
 * De wachtrij op het overzicht, ingedeeld in de vaste secties van de app.
 *
 * ── WAAROM VASTE SECTIES EN NIET (MEER) PER CLUSTER ─────────────────────────
 *
 * Tot 22 september 2026 groepeerde de wachtrij per cluster: "Wagenparkbeheer",
 * "All-in leaseprijs", enzovoort. Dat werkte bij één onderwerp per taak, maar
 * de app kreeg er twee soorten werk bij die niet aan een cluster hangen
 * (`contentmaand`, `planpagina`), en een klant met meerdere clusters zag zijn
 * ene openstaande vraag en zijn drie te publiceren pagina's al door elkaar
 * staan zodra ze uit verschillende clusters kwamen.
 *
 * De rest van de app is al ingedeeld naar ONDERWERP, niet naar cluster:
 * Cluster, Contentplan, Openstaande vragen, Bibliotheek zijn de vier plekken
 * waar een klant zelf al naartoe navigeert. Deze module legt dezelfde
 * indeling over de wachtrij, zodat "dit wacht op jou" meteen zegt in welk
 * hoofdstuk van de app dat opgelost wordt.
 *
 * Een technische blokkade (`kind: "blokkade"`) hoort bij geen van de vier: hij
 * wijst naar Analytics en niet naar een van de vier onderwerpen, en blokkeert
 * bovendien alles daaronder. Die blijft daarom apart, als waarschuwing vóór de
 * secties (`waarschuwingen` hieronder), niet in `secties`.
 */
import type { WorkItem, WorkKind } from "@/lib/work";
import { getClusterDisplayName } from "@/lib/url";

export type WachtrijKop = "Cluster" | "Contentplan" | "Openstaande vragen" | "Bibliotheek";

export interface WachtrijSubkop {
  subkop: string;
  items: WorkItem[];
}

export interface WachtrijSectie {
  kop: WachtrijKop;
  /** Het overzichtsscherm van dit onderwerp, voor de "bekijk alles"-link. */
  overzichtHref: string;
  /** De tekst van die link, met de naam zoals hij in de zijbalk staat. */
  overzichtLabel: string;
  /** Alle open taken in deze sectie samen, voor de groene teller. */
  aantal: number;
  subkoppen: WachtrijSubkop[];
}

export interface WachtrijOverzicht {
  /** Blokkades: boven de secties, want ze zetten alles daaronder stil. */
  waarschuwingen: WorkItem[];
  /** Alleen secties met minstens één item, in de vaste volgorde hieronder. */
  secties: WachtrijSectie[];
}

/**
 * Welke sectie en subkop een soort werk krijgt. `pagina` splitst verder op
 * `typeLabel`, want briefing, nakijken en publiceren zijn drie verschillende
 * momenten in dezelfde bibliotheek (zie `subkopVoorPagina()`).
 */
const SECTIE_PER_SOORT: Partial<Record<WorkKind, WachtrijKop>> = {
  goedkeuring: "Cluster",
  herstel: "Cluster",
  contentmaand: "Contentplan",
  planpagina: "Contentplan",
  feit: "Openstaande vragen",
  pagina: "Bibliotheek",
};

const SUBKOP_PER_SOORT: Partial<Record<WorkKind, string>> = {
  goedkeuring: "Clusters bevestigen (onderzoek starten)",
  herstel: "Clusters herstellen na mislukte meting",
  contentmaand: "Contentmaand vrijgeven (definitief maken)",
  planpagina: "Losse geplande pagina's goedkeuren",
  feit: "Openstaande vraag beantwoorden",
};

/** `pagina`-items delen één soort maar drie momenten; het label zegt welk. */
function subkopVoorPagina(item: WorkItem): string {
  if (item.typeLabel === "Briefing invullen") return "Briefing invullen voor een pagina";
  if (item.typeLabel === "Pagina nakijken") return "Pagina nakijken vóór publicatie";
  return "Pagina publiceren";
}

const OVERZICHT_HREF: Record<WachtrijKop, (profileId: string) => string> = {
  Cluster: (profileId) => `/merk/${profileId}/strategie/clusters`,
  Contentplan: (profileId) => `/merk/${profileId}/strategie/plan`,
  "Openstaande vragen": (profileId) => `/merk/${profileId}/strategie/vragen`,
  Bibliotheek: (profileId) => `/merk/${profileId}/strategie/bibliotheek`,
};

const OVERZICHT_LABEL: Record<WachtrijKop, string> = {
  Cluster: "Naar je clusters",
  Contentplan: "Naar je contentplan",
  "Openstaande vragen": "Naar je vragen",
  Bibliotheek: "Naar je bibliotheek",
};

/**
 * De vaste volgorde van kopjes én subkopjes, ongeacht hoeveel items erin
 * staan en ongeacht hun urgentie. Nodig omdat de globale sortering
 * (`sortWork()`) op urgentie loopt en niet op deze indeling: "Briefing
 * invullen" heeft een lagere urgentie dan "Pagina publiceren" (het is
 * uitvragen, geen afronden, zie `lib/work.ts`), maar hoort in de bibliotheek
 * wél als eerste subkop te staan. Afleiden uit de volgorde van vóórkomen zou
 * dat verschil stilzwijgend omdraaien.
 */
const SUBKOP_VOLGORDE: Record<WachtrijKop, string[]> = {
  Cluster: SUBKOP_PER_SOORT.goedkeuring ? [SUBKOP_PER_SOORT.goedkeuring, SUBKOP_PER_SOORT.herstel!] : [],
  Contentplan: [SUBKOP_PER_SOORT.contentmaand!, SUBKOP_PER_SOORT.planpagina!],
  "Openstaande vragen": [SUBKOP_PER_SOORT.feit!],
  Bibliotheek: [
    "Briefing invullen voor een pagina",
    "Pagina nakijken vóór publicatie",
    "Pagina publiceren",
  ],
};

/**
 * Deelt de wachtrij op in de vaste secties. `items` moet al gesorteerd zijn
 * (`sortWork()`): binnen een subkop blijft die volgorde staan, dus het
 * dringendste werk staat ook binnen zijn subkop bovenaan.
 */
export function groepeerPerSectie(items: WorkItem[]): WachtrijOverzicht {
  const waarschuwingen = items.filter((i) => i.kind === "blokkade");

  const perSubkop = new Map<string, WorkItem[]>();
  let profileId: string | null = null;

  for (const item of items) {
    if (item.kind === "blokkade") continue;
    profileId ??= item.profileId;

    const kop = SECTIE_PER_SOORT[item.kind];
    if (!kop) continue; // "offsite" en andere soorten zonder sectie: bewust overgeslagen.
    const subkop = item.kind === "pagina" ? subkopVoorPagina(item) : SUBKOP_PER_SOORT[item.kind]!;

    const lijst = perSubkop.get(subkop) ?? [];
    lijst.push(item);
    perSubkop.set(subkop, lijst);
  }

  if (!profileId) return { waarschuwingen, secties: [] };

  const secties: WachtrijSectie[] = [];
  for (const kop of ["Cluster", "Contentplan", "Openstaande vragen", "Bibliotheek"] as const) {
    const subkoppen = SUBKOP_VOLGORDE[kop]
      .map((subkop) => ({ subkop, items: perSubkop.get(subkop) ?? [] }))
      .filter((s) => s.items.length > 0);
    if (subkoppen.length === 0) continue;
    secties.push({
      kop,
      overzichtHref: OVERZICHT_HREF[kop](profileId),
      overzichtLabel: OVERZICHT_LABEL[kop],
      aantal: subkoppen.reduce((som, s) => som + s.items.length, 0),
      subkoppen,
    });
  }

  return { waarschuwingen, secties };
}

/**
 * Wat één regel in de wachtrij laat zien: waar het over gaat, en bij welk
 * cluster het hoort.
 *
 * ── ⚠️ DE CLUSTERNAAM IS DE TITEL, NIET "BEKIJK EN BEVESTIG" (23 september 2026)
 *
 * Een cluster dat op akkoord wacht heeft in `lib/work.ts` de titel "Bekijk en
 * bevestig het concept". Bij Van den Udenhout stonden er twee, onder elkaar,
 * met precies die zin: welk concept welk cluster was, stond nergens (op
 * productie: "Occasion kopen in Noord-Brabant" en "Goedkope prive lease"). De
 * handeling staat al in de subkop erboven ("Clusters bevestigen"), dus op de
 * regel zelf hoort het enige dat de twee van elkaar onderscheidt.
 *
 * Een pagina houdt zijn eigen titel, maar krijgt de clusternaam als context:
 * "Maak de pagina over wagenparkbeheer tot…" zegt wat, niet voor welk
 * onderwerp. Een contentmaand en de vragen over je bedrijf gaan over het hele
 * merk en krijgen daarom geen cluster, ook al hangt er in `WorkItem` technisch
 * één aan (`analysisName` is daar de eerste analyse van het merk, geen keuze).
 *
 * `lib/work.ts` blijft ongemoeid: dezelfde items voeden andere schermen, en
 * daar staat de clusternaam al in de omgeving.
 */
export interface WachtrijRegel {
  titel: string;
  /** De clusternaam als context, of `null` als het item over het hele merk gaat. */
  cluster: string | null;
}

export function wachtrijRegel(item: WorkItem): WachtrijRegel {
  const cluster = getClusterDisplayName(item.analysisName);
  switch (item.kind) {
    case "goedkeuring":
    case "herstel":
      return { titel: cluster, cluster: null };
    case "pagina":
    case "planpagina":
      return { titel: item.title, cluster };
    default:
      return { titel: item.title, cluster: null };
  }
}

/**
 * Hoeveel taken een sectie op het overzicht laat zien, over al zijn subkoppen
 * samen.
 *
 * ── ⚠️ VIER PER BLOK, NIET VIER PER SUBKOP (23 september 2026) ──────────────
 *
 * De grens stond eerst per subkop. De Bibliotheek heeft er drie (briefing,
 * nakijken, publiceren), dus één blok kon twaalf taken tonen terwijl
 * Openstaande vragen er één had. Op verzoek van de eigenaar geldt de grens nu
 * per blok: de eerste vier in de vaste volgorde van de subkoppen, en daaronder
 * één link naar het hoofdstuk zodra er meer zijn. Een subkop waarvan niets
 * meer past, valt helemaal weg in plaats van als lege kop te blijven staan.
 */
export const PER_SECTIE_ZICHTBAAR = 4;

export function beperkSectie(
  sectie: WachtrijSectie,
  max: number = PER_SECTIE_ZICHTBAAR,
): { subkoppen: WachtrijSubkop[]; verborgen: number } {
  let ruimte = max;
  const subkoppen: WachtrijSubkop[] = [];
  for (const sub of sectie.subkoppen) {
    if (ruimte <= 0) break;
    const items = sub.items.slice(0, ruimte);
    ruimte -= items.length;
    subkoppen.push({ subkop: sub.subkop, items });
  }
  return { subkoppen, verborgen: Math.max(0, sectie.aantal - max) };
}
