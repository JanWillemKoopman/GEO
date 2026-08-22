import "server-only";

/**
 * Het aanbod volledig in kaart (docs/tasks/onboarding-2.0.md, blok B fase 1).
 *
 * ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
 *
 * `profiles.products` is een `text[]`. Voor "wasmachines, drogers, vaatwassers"
 * is dat genoeg; voor de vraag die de app straks moet beantwoorden, welke
 * diensten levert deze klant precies, aan wie, waar en tegen welke prijs, is
 * een platte lijst het verkeerde gereedschap. Een dienst heeft subdiensten, een
 * categorie heeft productgroepen, en een core topic zit op het niveau
 * dáártussen: een topic op categorieniveau is te breed om te meten, een op
 * productniveau te smal.
 *
 * ── WAAROM DE SITEMAP-TAXONOMIE MEEGAAT ─────────────────────────────────────
 *
 * Fase 0 leverde al gratis welke secties de site heeft en hoeveel pagina's er in
 * elke sectie zitten. `/diensten` met 12 pagina's tegenover `/blog` met 80 is
 * de structuur van het bedrijf, deterministisch afgeleid. Het model hoeft die
 * dus niet te raden, het hoeft hem alleen te benoemen en te vullen. Dat scheelt
 * zowel fouten als tokens.
 *
 * ── ÉÉN AANROEP, GEEN DRIE ──────────────────────────────────────────────────
 *
 * Het plan hield rekening met 2–4 parallelle aanroepen. In de praktijk is de
 * boom één samenhangend geheel: je kunt "welke diensten" niet los van "onder
 * welke categorie" beantwoorden zonder dat de niveaus door elkaar gaan lopen.
 * Eén aanroep met een ruime context is hier goedkoper én consistenter.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { createAdminClient } from "@/lib/supabase/admin";
import { OfferingTree } from "@/lib/schemas/offering";
import { buildTaxonomy } from "@/lib/pipeline/inventory-quality";
import { buildPageBlocks } from "@/lib/pipeline/page-select";
import { quoteConfidence } from "@/lib/pipeline/quote-check";
import {
  relinkOfferingIds,
  type LinkableNode,
  type TopicLinks,
} from "@/lib/pipeline/topic-link";
import type { BusinessModel, Profile } from "@/lib/types/database";
import { requireCount } from "@/lib/require-count";

/** Hoeveel sitetekst er de aanroep in gaat. Zelfde orde als het profielonderzoek. */
const MAX_SITE_CHARS = 55_000;

/** Hoeveel knopen we bewaren. Meer dan dit is geen boom meer maar een export. */
const MAX_NODES = 60;

/**
 * Wat het model per bedrijfsmodel moet zoeken. Dit is het scharnierpunt van het
 * hele idee: bij een dienstverlener de dienstverlening, bij een productverkoper
 * het assortiment. Dezelfde vorm, andere vraag.
 */
function briefingFor(model: BusinessModel | null): string {
  switch (model) {
    case "dienstverlener":
      return (
        `Dit is een DIENSTVERLENER. Breng de dienstverlening volledig in kaart:\n` +
        `- elke dienst als eigen knoop (kind 'dienst'), gegroepeerd onder een 'categorie' als de site dat doet;\n` +
        `- per dienst: welk probleem hij oplost, voor wie, en de prijsindicatie als die genoemd wordt;\n` +
        `- elke vestiging of werklocatie als kind 'vestiging'.\n` +
        `Wees fijnmazig: "fysiotherapie" is een categorie, "dry needling" en "sportmassage" zijn diensten.`
      );
    case "retailer":
      return (
        `Dit is een RETAILER: hij verkoopt producten van ANDERE merken. Breng het assortiment in kaart:\n` +
        `- de categoriestructuur als knopen met kind 'categorie', in de vorm die de sitestructuur hieronder laat zien;\n` +
        `- productgroepen (niet losse artikelen!) als kind 'product' onder hun categorie;\n` +
        `- de GEVOERDE MERKEN als kind 'merk'. Dit is belangrijk: die merken zijn géén concurrenten van deze klant.\n` +
        `Noem geen individuele artikelnummers: een categorie met 400 artikelen is één knoop.`
      );
    case "fabrikant":
      return (
        `Dit is een FABRIKANT: hij maakt en verkoopt zijn eigen producten. Breng in kaart:\n` +
        `- de productlijnen als kind 'categorie' en de producten daarbinnen als kind 'product';\n` +
        `- per product waar het voor dient en voor wie;\n` +
        `- productielocaties of vestigingen als kind 'vestiging'.`
      );
    case "platform":
      return (
        `Dit is een PLATFORM: het brengt vraag en aanbod van derden bij elkaar. Breng in kaart:\n` +
        `- welke categorieën aanbod erop staan (kind 'categorie');\n` +
        `- welke diensten het platform zélf levert (kind 'dienst'): bemiddeling, garantie, betaling;\n` +
        `- de partijen aan de aanbodzijde als kind 'merk', als die genoemd worden.\n` +
        `Let op het verschil tussen wat het platform aanbiedt en wat de aanbieders erop aanbieden.`
      );
    default:
      return (
        `Het bedrijfsmodel is niet vastgesteld. Bepaal het zelf uit het materiaal en breng vervolgens ` +
        `in kaart wat dit bedrijf aanbiedt: diensten als kind 'dienst', producten of productgroepen ` +
        `als kind 'product', groeperingen als 'categorie', locaties als 'vestiging'.`
      );
  }
}

export interface OfferingResult {
  nodes: number;
  businessModel: BusinessModel;
  gaps: string[];
  costUsd: number;
}

export async function buildOfferingTree(profileId: string): Promise<OfferingResult> {
  const admin = createAdminClient();

  const { data: row } = await admin.from("profiles").select("*").eq("id", profileId).single();
  if (!row) throw new Error(`Profiel ${profileId} niet gevonden.`);
  const profile = row as Profile;

  // Idempotent vóór de dure aanroep (conventie 9): staat de boom er al, dan
  // niets opnieuw doen. Een retry na een mislukte vervolgtaak mag geen tweede
  // keer betaald worden.
  const existing = requireCount(
    await admin
      .from("profile_offerings")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId),
    "de aanbodboom van dit merk",
  );
  if (existing > 0) {
    return {
      nodes: existing,
      businessModel: profile.business_model ?? "overig",
      gaps: [],
      costUsd: 0,
    };
  }

  const { data: pageRows } = await admin
    .from("profile_pages")
    .select("url, title, text_excerpt")
    .eq("profile_id", profileId);
  const pages = pageRows ?? [];

  if (pages.length === 0) {
    // Zonder pagina's valt er niets in kaart te brengen. Geen aanroep doen is
    // hier het juiste antwoord: een model dat op een lege context een aanbod
    // verzint, levert precies de gefabriceerde data waar de rest van dit
    // project vangnetten tegen bouwt (conventie 3).
    return {
      nodes: 0,
      businessModel: profile.business_model ?? "overig",
      gaps: ["Er zijn geen pagina's gecrawld, dus het aanbod kon niet in kaart gebracht worden."],
      costUsd: 0,
    };
  }

  const taxonomy = buildTaxonomy(pages.map((p) => p.url as string))
    .slice(0, 15)
    .map((s) => `${s.segment} · ${s.count} pagina's`)
    .join("\n");

  // ── WELKE PAGINA'S HET MODEL TE ZIEN KRIJGT (22 augustus 2026) ────────────
  //
  // Hier stond: sorteren op tekstlengte, langste eerst, met als onderbouwing
  // dat een navigatiepagina van 200 tekens dan afvalt en de dienstenpagina
  // blijft. Dat klopte niet. `crawler.ts` kapt élke pagina af op 1.500 tekens,
  // dus alle langere pagina's staan precies gelijk en besliste de volgorde
  // waarin Postgres ze teruggaf. En de pagina's die die 1.500 halen zijn juist
  // de blogartikelen: een dienstenpagina van 900 tekens verloor van een artikel
  // van 4.000. Van de 150 gecrawlde pagina's passen er ~35 in dit budget, dus
  // dit is de vernauwing die bepaalt wat we van een klant weten, niet de crawl.
  //
  // `page-select.ts` verdeelt het budget nu om beurten over de secties van de
  // site, met dezelfde score als de crawl zelf gebruikt (`url-priority.ts`).
  const { data: profielRij } = await admin
    .from("profiles")
    .select("crawl_priority_paths")
    .eq("id", profileId)
    .single();
  const priorityPaths =
    ((profielRij as { crawl_priority_paths: string[] } | null)?.crawl_priority_paths) ?? [];

  const selectie = buildPageBlocks(
    pages.map((p) => ({
      url: p.url as string,
      title: (p.title as string) ?? null,
      text: (p.text_excerpt as string) ?? "",
    })),
    MAX_SITE_CHARS,
    priorityPaths,
  );
  const blocks = selectie.blocks;

  const system =
    `Je brengt het AANBOD van een bedrijf in kaart op basis van zijn eigen website. ` +
    `Je output is een boom: knopen met een 'parent' die verwijst naar de NAAM van een andere knoop ` +
    `(leeg voor het bovenste niveau).\n\n` +
    `${briefingFor(profile.business_model)}\n\n` +
    `HARDE REGELS:\n` +
    `1. Elke knoop MOET een evidenceUrl hebben uit de meegegeven pagina's, en een evidenceQuote die ` +
    `LETTERLIJK in de tekst van die pagina staat. Kun je dat niet, dan hoort de knoop er niet.\n` +
    `2. Verzin geen aanbod. Staat een dienst er niet, dan levert het bedrijf hem niet, ook niet als ` +
    `bedrijven in deze branche hem meestal wel leveren.\n` +
    `3. Laat audience en priceIndication LEEG als de site er niets over zegt. Een lege string is een ` +
    `beter antwoord dan een aanname.\n` +
    `4. Zet in 'gaps' wat je niet kon vaststellen maar wel had willen weten. Dat wordt de agenda voor ` +
    `het gesprek met de klant.\n` +
    `Antwoord in het Nederlands.`;

  const user =
    `Bedrijf: ${profile.brand_name ?? profile.name}\nWebsite: ${profile.url}\n` +
    (profile.industry ? `Branche: ${profile.industry}\n` : "") +
    `\nSTRUCTUUR VAN DE SITE (afgeleid uit de sitemap, dit is feitelijk):\n${taxonomy}\n\n` +
    `PAGINA'S (${blocks.length} van de ${pages.length} gelezen pagina's, uit ${selectie.sections} ` +
    `secties van de site):\n"""\n${blocks.join("\n\n")}\n"""`;

  const result = await callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: OfferingTree,
    schemaName: "offering_tree",
    // Geen web search: dit gaat uitsluitend over wat er op de eigen site staat.
    // Marktcontext zoeken zou hier juist ruis toevoegen, het model zou dan
    // aanbod van concurrenten kunnen overnemen.
    webSearch: false,
    work: "analytical",
    meta: { kind: "profile_offering", profileId },
  });

  const tree = result.parsed;
  const { nodes: saved, droppedByCap, droppedByEvidence } = await persistTree(
    admin,
    profileId,
    tree.nodes,
    pages.map((p) => ({
      url: p.url as string,
      text: (p.text_excerpt as string) ?? "",
    })),
  );

  // ── WAT ER STIL AFVIEL, STAAT NU IN DE GESPREKSAGENDA ─────────────────────
  //
  // Drie plekken kapten af zonder dat iemand het kon zien: de tekenlimiet van
  // de prompt, de bewijscontrole en `MAX_NODES`. Alle drie zijn ze een keuze
  // die de klant raakt, dus alle drie melden ze zich nu. Deze regels komen uit
  // CODE en niet uit het model: `gaps` was tot nu toe zelfrapportage, en een
  // model dat niet weet dat er iets is weggegooid kan dat ook niet melden.
  const gaps = [...tree.gaps];
  if (selectie.skipped > 0) {
    gaps.push(
      `${selectie.skipped} van de ${pages.length} gelezen pagina's pasten niet in deze analyse. ` +
        `De selectie is over ${selectie.sections} secties van de site verdeeld, dus alle delen ` +
        `komen aan bod, maar niet elke pagina is meegewogen.`,
    );
  }
  if (droppedByEvidence > 0) {
    gaps.push(
      `${droppedByEvidence} onderdelen zijn weggelaten omdat het model er geen pagina bij kon aanwijzen.`,
    );
  }
  if (droppedByCap > 0) {
    gaps.push(
      `Er zijn ${droppedByCap} onderdelen méér gevonden dan de ${MAX_NODES} die in het overzicht passen. ` +
        `Bespreek welke groepen het belangrijkst zijn.`,
    );
  }

  // ── De topics weer aan de boom hangen (migratie 0043) ────────────────────
  //
  // "Onderzoek opnieuw" verwijdert de AI-knopen en komt hier langs om ze
  // opnieuw op te bouwen, met nieuwe id's. De topics blijven bewust staan (dat
  // zijn beslissingen van de klant, soms met een lopende analyse eraan), maar
  // hun `offering_ids` wijzen daarna naar rijen die niet meer bestaan. Stil,
  // want een `uuid[]` kan geen foreign key hebben, dus niets valt om.
  //
  // Op naam herstellen kan wél: "Bekkenfysiotherapie" heet na een tweede crawl
  // nog steeds zo.
  await relinkTopics(admin, profileId, saved);

  // Het bedrijfsmodel dat na de hele site bekeken te hebben uitkomt, is beter
  // onderbouwd dan het oordeel op alleen de homepage, maar een handmatig
  // gezette waarde wint nog steeds (dezelfde regel als in prepare-profile.ts).
  if (!profile.business_model) {
    await admin
      .from("profiles")
      .update({ business_model: tree.businessModel })
      .eq("id", profileId);
  }

  await admin.from("profile_facets").upsert(
    {
      profile_id: profileId,
      facet: "aanbod",
      summary: beschrijf(saved, tree.businessModel, gaps),
      raw_json: result.raw as never,
      // De zekerheid is het aandeel knopen dat een geldige bron overleefde.
      // Haalt de helft dat niet, dan is er iets mis met het materiaal en hoort
      // dat zichtbaar te zijn in plaats van als "klaar" weggeschreven.
      confidence: tree.nodes.length > 0 ? round2(saved.length / tree.nodes.length) : null,
      sources: [...new Set(saved.map((n) => n.evidence_url).filter(Boolean))].slice(0, 10) as string[],
      model_used: MODELS.quality,
      cost_usd: result.costUsd,
      researched_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,facet" },
  );

  return {
    nodes: saved.length,
    businessModel: profile.business_model ?? tree.businessModel,
    gaps,
    costUsd: result.costUsd,
  };
}

interface StoredNode {
  id: string;
  profile_id: string;
  parent_id: string | null;
  kind: string;
  name: string;
  description: string | null;
  audience: string | null;
  price_indication: string | null;
  evidence_url: string | null;
  evidence_quote: string | null;
  confidence: number | null;
  source: string;
  sort_order: number;
}

/**
 * Slaat de boom op en legt de ouder-kindrelaties in twee ronden.
 *
 * ── HET VANGNET (conventie 1) ───────────────────────────────────────────────
 *
 * Het model geeft `parent` als NAAM terug, niet als id. Anders zou het id's
 * moeten verzinnen die nog niet bestaan. Twee ronden dus: eerst alles inserten,
 * dan de verwijzingen leggen op naam. Een parent die nergens naar wijst wordt
 * stil een wortelknoop; dat is beter dan de knoop weggooien.
 *
 * En het belangrijkste: een knoop met een `evidenceUrl` die niet in de
 * gecrawlde pagina's voorkomt, verdwijnt. Dat is dezelfde regel als
 * `verifyAtoms()` en `verifyDossierFacts()`, een promptinstructie is een
 * intentie, code is een garantie.
 */
interface PersistedTree {
  nodes: StoredNode[];
  /** Knopen die het model aanbood maar die niet in het overzicht pasten. */
  droppedByCap: number;
  /** Knopen zonder bruikbare bronpagina. Die verdwijnen, en dat moet zichtbaar zijn. */
  droppedByEvidence: number;
}

async function persistTree(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  nodes: OfferingTree["nodes"],
  knownPages: Array<{ url: string; text: string }>,
): Promise<PersistedTree> {
  const textByUrl = new Map(knownPages.map((p) => [p.url, p.text]));
  const metNaam = nodes.filter((n) => n.name.trim() !== "");
  const metBron = metNaam.filter((n) => textByUrl.has(n.evidenceUrl));
  const geldig = metBron.slice(0, MAX_NODES);

  const droppedByEvidence = metNaam.length - metBron.length;
  const droppedByCap = metBron.length - geldig.length;

  if (geldig.length === 0) return { nodes: [], droppedByCap, droppedByEvidence };

  const { data: inserted, error } = await admin
    .from("profile_offerings")
    .insert(
      geldig.map((n, i) => ({
        profile_id: profileId,
        parent_id: null,
        kind: n.kind,
        name: n.name.trim(),
        description: n.description.trim() || null,
        audience: n.audience.trim() || null,
        price_indication: n.priceIndication.trim() || null,
        evidence_url: n.evidenceUrl,
        evidence_quote: n.evidenceQuote.trim() || null,
        // ⚠️ ZEKERHEID PER KNOOP (3 aug 2026)
        //
        // Stond hier hard op `null`, en dat betekent in `ConfidenceChip`
        // "niet vastgesteld". Bij Fysi-Unique leverde dat twintig grijze chips
        // op naast een aanbodboom die juist góéd onderbouwd was, en dat is het
        // omgekeerde van wat die chip moet doen ("alleen het twijfelgeval valt
        // op", components/confidence-chip.tsx).
        //
        // Nu deterministisch, dezelfde regel als `verifyDossierFacts()` in
        // synthesis.ts: staat het citaat letterlijk op de pagina waar de knoop
        // naar verwijst, dan is dit geen afleiding maar een vondst.
        confidence: quoteConfidence(
          n.evidenceQuote,
          textByUrl.get(n.evidenceUrl) ?? "",
        ),
        source: "ai",
        sort_order: i,
      })),
    )
    .select("*");

  if (error || !inserted) {
    console.error(`Aanbodboom opslaan mislukt voor profiel ${profileId}: ${error?.message}`);
    return { nodes: [], droppedByCap, droppedByEvidence };
  }

  const stored = inserted as unknown as StoredNode[];
  const byName = new Map(stored.map((n) => [n.name.toLowerCase(), n.id]));

  await Promise.all(
    geldig.map(async (n, i) => {
      const parent = n.parent.trim().toLowerCase();
      if (!parent) return;
      const parentId = byName.get(parent);
      // Niet naar zichzelf wijzen: dat levert een rij op die in elke
      // boomopbouw een oneindige lus wordt.
      if (!parentId || parentId === stored[i].id) return;
      await admin.from("profile_offerings").update({ parent_id: parentId }).eq("id", stored[i].id);
    }),
  );

  return { nodes: stored, droppedByCap, droppedByEvidence };
}

function beschrijf(nodes: StoredNode[], model: string, gaps: string[]): string {
  if (nodes.length === 0) return "Geen aanbod in kaart kunnen brengen uit de gecrawlde pagina's.";
  const perKind = new Map<string, number>();
  for (const n of nodes) perKind.set(n.kind, (perKind.get(n.kind) ?? 0) + 1);
  const telling = [...perKind.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kind, n]) => `${n} ${kind}${n === 1 ? "" : "en"}`)
    .join(", ");
  const staart = gaps.length > 0 ? ` · ${gaps.length} open vraag/vragen voor het gesprek` : "";
  return `${model}: ${telling}${staart}.`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * De aanbodkoppeling van bestaande topics herstellen na een herbouw.
 *
 * De beslissing zelf staat in `topic-link.ts` (puur, dus testbaar); hier alleen
 * het lezen en schrijven. Doet niets bij de eerste ronde. Dan zijn er nog geen
 * topics, en niets voor topics zonder `offering_names`.
 */
async function relinkTopics(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  stored: StoredNode[],
): Promise<void> {
  if (stored.length === 0) return;

  const { data: topicRows } = await admin
    .from("profile_topics")
    .select("id, offering_ids, offering_names")
    .eq("profile_id", profileId);

  const topics = (topicRows ?? []) as Array<
    { id: string } & TopicLinks
  >;
  if (topics.length === 0) return;

  const nodes: LinkableNode[] = stored.map((n) => ({ id: n.id, name: n.name }));

  let hersteld = 0;
  for (const t of topics) {
    const nieuw = relinkOfferingIds(t, nodes);
    if (nieuw === null) continue;

    await admin
      .from("profile_topics")
      .update({ offering_ids: nieuw })
      .eq("id", t.id);
    hersteld++;
  }

  if (hersteld > 0) {
    console.info(
      `Profiel ${profileId}: aanbodkoppeling van ${hersteld} onderwerp(en) hersteld na de herbouw.`,
    );
  }
}
