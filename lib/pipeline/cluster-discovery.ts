import "server-only";

/**
 * Een ontdekkingsronde, in vier taken (docs/tasks/clusters-ontdekken.md).
 *
 *   discovery_collect  alles wat we al weten verzamelen, plus beginpunten     licht model
 *   discovery_expand   DataForSEO: eigen site, echte concurrenten, suggesties  geen AI
 *   discovery_sift     per zoekterm: past dit bij aanbod en strategie?         licht model
 *   discovery_bundle   zoektermen bundelen tot 8 tot 15 kandidaat-clusters     één zware aanroep
 *
 * Eén taak is hooguit één AI-aanroep (conventie 7). Elke taak kijkt eerst of
 * de ronde al voorbij zijn stap is (conventie 9): een herhaalde taak na een
 * herstart van de werker doet dan niets en kost niets.
 *
 * ⚠️ Niets hier schrijft in `profile_topics.search_volume_*`, de potentiescore
 * of de meetgewichten. Daar ontstonden de fouten van de geparkeerde
 * zoekvolumelaag (logboek 20 september 2026 (2)). De volumes leven alleen in de
 * twee tabellen van migratie 0109.
 */
import { z } from "zod";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { alleRijen } from "@/lib/supabase/pagineer";
import { activeOfferings } from "@/lib/offerings";
import { discontinuedNames, parseContextFactors } from "@/lib/pipeline/context-factors";
import { topicSteering, goalRule } from "@/lib/pipeline/commercial-context";
import {
  alleenBestaandeTermen,
  kandidaatFeiten,
  kandidaatScore,
  kandidaatSoort,
  kiesConcurrenten,
  lijktOp,
  voegVariantenSamen,
  voorfilter,
  type OntdekTerm,
  type Pasvorm,
} from "@/lib/cluster-discovery";
import {
  competitorsDomain,
  eigenOmvang,
  keywordSuggestions,
  labsBeschikbaar,
  leesConcurrenten,
  leesRangItems,
  leesSuggesties,
  rankedKeywords,
} from "@/lib/discovery/labs";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, ProfileOffering } from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

/** Hoeveel dagen Search Console terug. Zelfde venster als de proefronde. */
const GSC_DAGEN = 90;
/** Hoeveel Search Console-zoekopdrachten er mee de ronde in gaan. */
const MAX_GSC_TERMEN = 300;
/** DataForSEO-limieten, nagemeten in fase 0 op kosten en bruikbaarheid. */
const LIMIET_EIGEN = 700;
const LIMIET_CONCURRENT = 300;
const LIMIET_SUGGESTIE = 100;
const MAX_BEGINPUNTEN = 20;
const MAX_CONCURRENTEN = 3;

export const STAPPEN = ["verzamelen", "verbreden", "schiften", "bundelen", "klaar"] as const;
export type RondeStatus = (typeof STAPPEN)[number] | "mislukt";

/** Wat `input_json` van een ronde bevat. Alles wat de latere stappen nodig hebben. */
export interface RondeInvoer {
  domein: string;
  merknaam: string;
  merkwoorden: string[];
  regio: string[];
  branche: string | null;
  aanbod: string[];
  gesprek: string | null;
  sturing: string;
  gestopt: string[];
  /**
   * Bekende concurrenten op naam. Nagekeken op 23 september 2026: in de
   * Search Console van Van den Udenhout staat "van tilburg bastianen" (147
   * vertoningen). Daar zoekt iemand een ander bedrijf, en daar komt geen
   * cluster uit; het schiftmodel moet de namen dus kennen.
   */
  concurrenten: string[];
  /** Titels van lopende clusters en voorgestelde onderwerpen. */
  bestaand: string[];
  /** Afgewezen richtingen, met reden. */
  vermijd: string[];
  beginpunten: string[];
  gsc: OntdekTerm[];
  gscGekoppeld: boolean;
}

interface RondeRij {
  id: string;
  profile_id: string;
  status: RondeStatus;
  status_note: string | null;
  input_json: RondeInvoer | Record<string, never>;
  terms_json: OntdekTerm[] | null;
  sifted_json: (OntdekTerm & { pasvorm: Pasvorm })[] | null;
  ai_cost_usd: number;
  dataforseo_cost_usd: number;
}

async function leesRonde(admin: Admin, runId: string): Promise<RondeRij> {
  const { data } = await admin.from("cluster_discovery_runs").select("*").eq("id", runId).single();
  if (!data) throw new Error(`Ontdekkingsronde ${runId} niet gevonden.`);
  return data as unknown as RondeRij;
}

/** Is de ronde al voorbij deze stap? Dan doet een herhaalde taak niets (conventie 9). */
function alVoorbij(huidig: RondeStatus, stap: RondeStatus): boolean {
  if (huidig === "mislukt") return true;
  return STAPPEN.indexOf(huidig as (typeof STAPPEN)[number]) > STAPPEN.indexOf(stap as (typeof STAPPEN)[number]);
}

async function volgende(
  admin: Admin,
  run: RondeRij,
  status: RondeStatus,
  velden: Record<string, unknown>,
  taak: "discovery_expand" | "discovery_sift" | "discovery_bundle" | null,
): Promise<void> {
  await admin
    .from("cluster_discovery_runs")
    .update({
      ...velden,
      status,
      ...(status === "klaar" ? { finished_at: new Date().toISOString() } : {}),
    })
    .eq("id", run.id);
  if (taak) {
    await enqueue(admin, {
      type: taak,
      payload: { runId: run.id },
      profileId: run.profile_id,
      dedupeKey: dedupe.discovery(taak, run.id),
    });
  }
}

/** Een ronde op mislukt, met een zin voor het scherm. Voor de werker na de laatste poging. */
export async function markeerRondeMislukt(admin: Admin, runId: string, detail: string): Promise<void> {
  await admin
    .from("cluster_discovery_runs")
    .update({
      status: "mislukt",
      status_note: `Deze ronde is niet afgemaakt: ${detail.slice(0, 200)}`,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId)
    // Alleen een lopende ronde: een ronde die al klaar is, blijft klaar.
    .in("status", ["verzamelen", "verbreden", "schiften", "bundelen"]);
}

function kaalDomein(url: string): string {
  return url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

// ── Stap 1: verzamelen ──────────────────────────────────────────────────────

const Beginpunten = z.object({
  /** Zoektermen van twee tot vier woorden, zoals een klant ze in Google typt. */
  zoektermen: z.array(z.string()),
});

/**
 * Search Console per zoekopdracht, opgeteld over het venster. Positie gewogen
 * op vertoningen, zelfde regel als `lib/search-console/metrics.ts`; de pagina
 * met de meeste vertoningen is "de" pagina.
 */
async function leesGsc(admin: Admin, profileId: string): Promise<OntdekTerm[]> {
  const van = new Date(Date.now() - GSC_DAGEN * 86_400_000).toISOString().slice(0, 10);
  const rijen = await alleRijen<{ query: string; page: string; clicks: number; impressions: number; position: number | null }>(
    (a, b) =>
      admin
        .from("search_console_queries")
        .select("query, page, clicks, impressions, position")
        .eq("profile_id", profileId)
        .gte("day", van)
        .order("day")
        .range(a, b),
  );
  const perQuery = new Map<string, { k: number; v: number; pv: number; pagina: Map<string, number> }>();
  for (const r of rijen) {
    const q = r.query.trim().toLowerCase();
    if (!q) continue;
    const g = perQuery.get(q) ?? { k: 0, v: 0, pv: 0, pagina: new Map() };
    g.k += r.clicks;
    g.v += r.impressions;
    if (r.position !== null) g.pv += r.position * r.impressions;
    g.pagina.set(r.page, (g.pagina.get(r.page) ?? 0) + r.impressions);
    perQuery.set(q, g);
  }
  return [...perQuery.entries()]
    .map(([keyword, g]) => ({
      keyword,
      volume: null,
      bronnen: ["gsc" as const],
      eigenPositie: g.v > 0 && g.pv > 0 ? Math.round((g.pv / g.v) * 10) / 10 : null,
      eigenUrl: [...g.pagina.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      vertoningen: g.v,
      klikken: g.k,
      concurrent: null,
    }))
    .sort((a, b) => (b.vertoningen ?? 0) - (a.vertoningen ?? 0))
    .slice(0, MAX_GSC_TERMEN);
}

export async function discoveryCollect(admin: Admin, runId: string): Promise<void> {
  const run = await leesRonde(admin, runId);
  if (alVoorbij(run.status, "verzamelen")) return;

  const { data: profielRij } = await admin.from("profiles").select("*").eq("id", run.profile_id).single();
  if (!profielRij) throw new Error(`Profiel ${run.profile_id} niet gevonden.`);
  const profiel = profielRij as Profile;

  const [aanbodRijen, { data: strategie }, { data: analyses }, { data: topics }, { data: afgewezen }] =
    await Promise.all([
      activeOfferings(admin, run.profile_id),
      admin
        .from("profile_strategy")
        .select("strategy_notes, context_factors, recorded_at")
        .eq("profile_id", run.profile_id)
        .maybeSingle(),
      admin.from("analyses").select("topic").eq("profile_id", run.profile_id).is("archived_at", null),
      admin.from("profile_topics").select("title, status, rejection_reason").eq("profile_id", run.profile_id),
      admin
        .from("cluster_discovery_candidates")
        .select("title, rejection_reason")
        .eq("profile_id", run.profile_id)
        .eq("status", "afgewezen"),
    ]);

  const s = strategie as { strategy_notes: string | null; context_factors: unknown } | null;
  const gestopt = discontinuedNames(parseContextFactors(s?.context_factors));
  const aanbod = (aanbodRijen as ProfileOffering[])
    .filter((o) => o.kind === "dienst" || o.kind === "product")
    .filter((o) => !gestopt.some((g) => o.name.toLowerCase().includes(g)))
    .map((o) => o.name.trim());

  const topicRijen = (topics ?? []) as { title: string; status: string; rejection_reason: string | null }[];
  const bestaand = [
    ...((analyses ?? []) as { topic: string }[]).map((a) => a.topic),
    ...topicRijen.filter((t) => t.status !== "afgewezen").map((t) => t.title),
  ];
  const vermijd = [
    ...topicRijen.filter((t) => t.status === "afgewezen").map((t) => `${t.title}${t.rejection_reason ? `: ${t.rejection_reason}` : ""}`),
    ...((afgewezen ?? []) as { title: string; rejection_reason: string | null }[]).map(
      (t) => `${t.title}${t.rejection_reason ? `: ${t.rejection_reason}` : ""}`,
    ),
  ];

  const merknaam = profiel.brand_name ?? profiel.name;
  const merkwoorden = [merknaam, ...(profiel.aliases ?? []), kaalDomein(profiel.url).split(".")[0]];
  const gsc = await leesGsc(admin, run.profile_id);

  // De beginpunten: diensten vertaald naar hoe iemand zoekt. In de proefronde
  // met de hand gedaan ("Occasions kopen" → "occasion kopen", pakketnamen
  // weg); hier doet het lichte model dat. Het vangnet staat eronder: lengte,
  // dubbel en merknamen gaan er in code uit.
  let beginpunten: string[] = [];
  let aiKosten = 0;
  if (aanbod.length > 0) {
    const res = await callStructured({
      model: MODELS.volume,
      system:
        "Je vertaalt het aanbod van een bedrijf naar zoektermen zoals een klant ze in Google typt. " +
        "Twee tot vier woorden per zoekterm, kleine letters, geen merknaam van het bedrijf zelf, geen " +
        "plaatsnamen, geen namen van pakketten of abonnementen die alleen dit bedrijf gebruikt. " +
        `Hooguit ${MAX_BEGINPUNTEN} zoektermen, de belangrijkste diensten eerst. Antwoord in het Nederlands.`,
      user: `Bedrijf: ${merknaam}\n${profiel.industry ? `Branche: ${profiel.industry}\n` : ""}\nAANBOD:\n${aanbod.map((a) => `- ${a}`).join("\n")}`,
      schema: Beginpunten,
      schemaName: "discovery_seeds",
      work: "deterministic",
      meta: { kind: "discovery_seeds", profileId: run.profile_id },
    });
    aiKosten += res.costUsd;
    const merk = merkwoorden.map((m) => m.toLowerCase()).filter((m) => m.length >= 3);
    beginpunten = [
      ...new Set(
        res.parsed.zoektermen
          .map((z) => z.trim().toLowerCase())
          .filter((z) => z.length >= 3 && z.split(/\s+/).length <= 5)
          .filter((z) => !merk.some((m) => z.includes(m))),
      ),
    ].slice(0, MAX_BEGINPUNTEN);
  }

  const invoer: RondeInvoer = {
    domein: kaalDomein(profiel.url),
    merknaam,
    merkwoorden,
    regio: profiel.service_regions ?? [],
    branche: profiel.industry ?? null,
    aanbod,
    gesprek: s?.strategy_notes?.trim() || null,
    sturing: (topicSteering(profiel) + goalRule(profiel)).trim(),
    gestopt,
    concurrenten: profiel.competitors ?? [],
    bestaand,
    vermijd,
    beginpunten,
    gsc,
    gscGekoppeld: Boolean(profiel.gsc_property),
  };

  await volgende(
    admin,
    run,
    "verbreden",
    { input_json: invoer, ai_cost_usd: Number(run.ai_cost_usd ?? 0) + aiKosten },
    "discovery_expand",
  );
}

// ── Stap 2: verbreden ───────────────────────────────────────────────────────

export async function discoveryExpand(admin: Admin, runId: string): Promise<void> {
  const run = await leesRonde(admin, runId);
  if (alVoorbij(run.status, "verbreden")) return;
  const invoer = run.input_json as RondeInvoer;

  const termen: OntdekTerm[] = [...invoer.gsc];
  const ruw: Record<string, unknown> = {};
  let kosten = 0;
  const notities: string[] = [];
  let concurrenten: string[] = [];

  if (!labsBeschikbaar()) {
    notities.push("Zoekdata van Google (DataForSEO) stond uit. Deze ronde kijkt alleen naar Search Console en je aanbod.");
  } else {
    const conc = await competitorsDomain(invoer.domein, 20, run.profile_id);
    ruw.concurrenten = conc.raw;
    kosten += conc.costUsd;
    const lijst = leesConcurrenten(conc.items);
    const gekozen = kiesConcurrenten(lijst, invoer.domein, eigenOmvang(lijst, invoer.domein), MAX_CONCURRENTEN);
    concurrenten = gekozen.map((c) => c.domein);
    if (!conc.ok) notities.push(conc.melding ?? "Concurrenten ophalen mislukte.");

    const eigen = await rankedKeywords(invoer.domein, LIMIET_EIGEN, run.profile_id);
    ruw.eigen = eigen.raw;
    kosten += eigen.costUsd;
    for (const r of leesRangItems(eigen.items)) {
      termen.push({
        keyword: r.keyword,
        volume: r.volume,
        bronnen: ["eigen"],
        eigenPositie: r.positie,
        eigenUrl: r.url,
        vertoningen: null,
        klikken: null,
        concurrent: null,
      });
    }

    for (const domein of concurrenten) {
      const c = await rankedKeywords(domein, LIMIET_CONCURRENT, run.profile_id);
      ruw[`concurrent:${domein}`] = c.raw;
      kosten += c.costUsd;
      for (const r of leesRangItems(c.items)) {
        // Alleen de top 20 telt als "concurrent is je voor" (fase 0, punt 4).
        if (r.positie === null || r.positie > 20) continue;
        termen.push({
          keyword: r.keyword,
          volume: r.volume,
          bronnen: ["concurrent"],
          eigenPositie: null,
          eigenUrl: null,
          vertoningen: null,
          klikken: null,
          concurrent: { domein, positie: r.positie },
        });
      }
    }

    for (const b of invoer.beginpunten) {
      const sug = await keywordSuggestions(b, LIMIET_SUGGESTIE, run.profile_id);
      ruw[`suggestie:${b}`] = sug.raw;
      kosten += sug.costUsd;
      for (const r of leesSuggesties(sug.items)) {
        termen.push({
          keyword: r.keyword,
          volume: r.volume,
          bronnen: ["suggestie"],
          eigenPositie: null,
          eigenUrl: null,
          vertoningen: null,
          klikken: null,
          concurrent: null,
        });
      }
    }
  }
  if (!invoer.gscGekoppeld) {
    notities.push("Search Console is niet gekoppeld, dus deze ronde ziet niet waar je al bijna bovenaan staat.");
  }

  const samengevoegd = voegVariantenSamen(termen);
  await volgende(
    admin,
    run,
    "schiften",
    {
      terms_json: samengevoegd,
      dataforseo_raw: { concurrenten, ...ruw },
      dataforseo_cost_usd: Number(run.dataforseo_cost_usd ?? 0) + kosten,
      status_note: notities.length > 0 ? notities.join(" ") : null,
    },
    "discovery_sift",
  );
}

// ── Stap 3: schiften ────────────────────────────────────────────────────────

const Schifting = z.object({
  relevant: z.array(
    z.object({
      /** Het nummer uit de lijst. */
      nr: z.number(),
      pasvorm: z.enum(["sterk", "redelijk"]),
    }),
  ),
});

export async function discoverySift(admin: Admin, runId: string): Promise<void> {
  const run = await leesRonde(admin, runId);
  if (alVoorbij(run.status, "schiften")) return;
  const invoer = run.input_json as RondeInvoer;
  const kandidaten = voorfilter(run.terms_json ?? [], invoer.merkwoorden);

  if (kandidaten.length === 0) {
    await volgende(admin, run, "bundelen", { sifted_json: [] }, "discovery_bundle");
    return;
  }

  const res = await callStructured({
    model: MODELS.volume,
    system:
      "Je beoordeelt zoektermen voor één bedrijf. Geef alleen de nummers terug van zoektermen waarop dit " +
      "bedrijf met een eigen pagina gevonden zou willen worden, omdat ze direct over zijn aanbod gaan.\n" +
      "Laat weg: termen over iets anders dat toevallig een woord deelt (een app die 'apk' heet, " +
      "hypotheken bij 'financiering'), termen over een andere plaats buiten het werkgebied, " +
      "merknamen van concurrenten, gestopte diensten, en termen die alleen informatie zoeken zonder " +
      "verband met wat het bedrijf verkoopt, en een losse merk- of categorienaam zonder meer (alleen " +
      "'volkswagen' of 'auto'): daar zoekt iemand iets anders dan een pagina van dit bedrijf.\n" +
      "pasvorm 'sterk': een klant die dit typt, kan morgen klant worden. 'redelijk': past bij het " +
      "aanbod, maar de koopbedoeling is zwakker. Twijfel je, laat de term dan weg.",
    user:
      `Bedrijf: ${invoer.merknaam}\n` +
      (invoer.branche ? `Branche: ${invoer.branche}\n` : "") +
      (invoer.regio.length > 0 ? `Werkgebied: ${invoer.regio.join(", ")}\n` : "") +
      `\nAANBOD:\n${invoer.aanbod.map((a) => `- ${a}`).join("\n")}` +
      (invoer.gestopt.length > 0 ? `\n\nGESTOPT (niet meer aanbieden):\n${invoer.gestopt.join(", ")}` : "") +
      ((invoer.concurrenten ?? []).length > 0
        ? `\n\nCONCURRENTEN (termen met hun naam weglaten):\n${invoer.concurrenten.join(", ")}`
        : "") +
      (invoer.sturing ? `\n\n${invoer.sturing}` : "") +
      `\n\nZOEKTERMEN:\n${kandidaten.map((t, i) => `${i + 1}. ${t.keyword}`).join("\n")}`,
    schema: Schifting,
    schemaName: "discovery_sift",
    work: "deterministic",
    meta: { kind: "discovery_sift", profileId: run.profile_id },
  });

  // Vangnet (conventie 1): een nummer dat niet in de lijst stond valt weg, en
  // elk nummer telt één keer.
  const gezien = new Set<number>();
  const geschift: (OntdekTerm & { pasvorm: Pasvorm })[] = [];
  for (const r of res.parsed.relevant) {
    const i = Math.round(r.nr) - 1;
    if (i < 0 || i >= kandidaten.length || gezien.has(i)) continue;
    gezien.add(i);
    geschift.push({ ...kandidaten[i], pasvorm: r.pasvorm });
  }

  await volgende(
    admin,
    run,
    "bundelen",
    { sifted_json: geschift, ai_cost_usd: Number(run.ai_cost_usd ?? 0) + res.costUsd },
    "discovery_bundle",
  );
}

// ── Stap 4: bundelen ────────────────────────────────────────────────────────

const Bundeling = z.object({
  kandidaten: z.array(
    z.object({
      titel: z.string(),
      /** Eén of twee zinnen voor een ondernemer, zonder vaktermen. */
      onderbouwing: z.string(),
      /** Namen uit het aanbod, letterlijk. */
      diensten: z.array(z.string()),
      /** Zoektermen uit de lijst, letterlijk. */
      zoektermen: z.array(z.string()),
    }),
  ),
});

/** Een kandidaat met minder termen dan dit is een losse zoekterm, geen onderwerp. */
const MIN_TERMEN_PER_KANDIDAAT = 2;

export async function discoveryBundle(admin: Admin, runId: string): Promise<void> {
  const run = await leesRonde(admin, runId);
  if (alVoorbij(run.status, "bundelen")) return;
  const invoer = run.input_json as RondeInvoer;
  const geschift = run.sifted_json ?? [];

  // Bestaat er al een kandidaat voor deze ronde? Dan is de dure aanroep al
  // gedaan en brak alleen het afsluiten af (conventie 9).
  const { count } = await admin
    .from("cluster_discovery_candidates")
    .select("id", { count: "exact", head: true })
    .eq("run_id", run.id);
  if ((count ?? 0) > 0) {
    await volgende(admin, run, "klaar", {}, null);
    return;
  }

  if (geschift.length < MIN_TERMEN_PER_KANDIDAAT) {
    await volgende(
      admin,
      run,
      "klaar",
      {
        status_note:
          [run.status_note, "Er bleven te weinig passende zoektermen over om onderwerpen van te maken."]
            .filter(Boolean)
            .join(" "),
      },
      null,
    );
    return;
  }

  const regel = (t: OntdekTerm & { pasvorm: Pasvorm }) => {
    const delen = [t.keyword];
    if (t.volume !== null) delen.push(`${t.volume}/maand`);
    if (t.eigenPositie !== null) delen.push(`jij plek ${Math.round(t.eigenPositie)}`);
    if (t.concurrent) delen.push(`concurrent plek ${t.concurrent.positie}`);
    return `- ${delen.join(" · ")}`;
  };

  const res = await callStructured({
    model: MODELS.quality,
    system:
      "Je bundelt zoektermen tot ONDERWERPEN waarop een bedrijf zichtbaar wil zijn in AI-assistenten " +
      "zoals ChatGPT. Eén onderwerp wordt straks één cluster: een reeks vragen die we aan AI stellen om " +
      "te meten of het bedrijf genoemd wordt.\n\n" +
      "HET NIVEAU BEPAALT ALLES:\n" +
      "- Te breed (een hele branche of een los merk): dan meet je een hele markt.\n" +
      "- Te smal (één productvariant): daar stelt niemand een vraag over aan een AI-assistent.\n" +
      "- Goed: het niveau waarop iemand met een concreet probleem of een concrete koopwens zoekt.\n\n" +
      "REGELS:\n" +
      "1. Geef 8 tot 15 onderwerpen. Minder mag als er niet meer in zit; een lijst vullen mag niet.\n" +
      "2. Elk onderwerp volgt uit het AANBOD. Zet in 'diensten' de namen LETTERLIJK zoals ze daar staan.\n" +
      "3. Zet in 'zoektermen' alleen termen LETTERLIJK uit de lijst, minstens twee per onderwerp.\n" +
      "4. Geen merknamen van het bedrijf zelf in de titel.\n" +
      "5. Sla een onderwerp over dat inhoudelijk hetzelfde is als iets dat er AL STAAT of dat is " +
      "AFGEWEZEN, ook bij een andere formulering.\n" +
      "6. De onderbouwing is één of twee zinnen voor een ondernemer, zonder vaktermen, en noemt geen " +
      "getallen: die zet de app er zelf bij.\n" +
      "Antwoord in het Nederlands.",
    user:
      `Bedrijf: ${invoer.merknaam}\n` +
      (invoer.branche ? `Branche: ${invoer.branche}\n` : "") +
      (invoer.regio.length > 0 ? `Werkgebied: ${invoer.regio.join(", ")}\n` : "") +
      `\nAANBOD:\n${invoer.aanbod.map((a) => `- ${a}`).join("\n")}` +
      (invoer.sturing ? `\n\n${invoer.sturing}` : "") +
      (invoer.gesprek ? `\n\nUIT HET STRATEGISCH GESPREK:\n${invoer.gesprek}` : "") +
      (invoer.bestaand.length > 0 ? `\n\nSTAAT AL:\n${invoer.bestaand.map((b) => `- ${b}`).join("\n")}` : "") +
      (invoer.vermijd.length > 0 ? `\n\nAFGEWEZEN (vermijd ook varianten):\n${invoer.vermijd.map((b) => `- ${b}`).join("\n")}` : "") +
      `\n\nZOEKTERMEN:\n${geschift.map(regel).join("\n")}`,
    schema: Bundeling,
    schemaName: "discovery_bundle",
    work: "analytical",
    meta: { kind: "discovery_bundle", profileId: run.profile_id },
  });

  const aanbodLaag = new Map(invoer.aanbod.map((a) => [a.toLowerCase(), a]));
  const pasvormVan = new Map(geschift.map((t) => [t.keyword, t.pasvorm]));
  const gezienTitels: string[] = [];
  const rijen: Record<string, unknown>[] = [];

  for (const k of res.parsed.kandidaten) {
    const titel = k.titel.trim();
    if (!titel) continue;
    // Twee kandidaten in dezelfde ronde die op elkaar lijken: de eerste wint.
    if (lijktOp(titel, gezienTitels, invoer.regio)) continue;
    const termen = alleenBestaandeTermen(k.zoektermen, geschift);
    if (termen.length < MIN_TERMEN_PER_KANDIDAAT) continue;
    gezienTitels.push(titel);

    const feiten = kandidaatFeiten(termen);
    const soort = kandidaatSoort(feiten);
    const sterk = termen.filter((t) => pasvormVan.get(t.keyword) === "sterk").length;
    const pasvorm: Pasvorm = sterk * 2 >= termen.length ? "sterk" : "redelijk";
    const overlap = lijktOp(titel, invoer.bestaand, invoer.regio);
    const { score, onderdelen } = kandidaatScore(feiten, pasvorm, overlap !== null);

    rijen.push({
      run_id: run.id,
      profile_id: run.profile_id,
      title: titel,
      rationale: k.onderbouwing.trim() || null,
      kind: soort,
      offering_names: [
        ...new Set(k.diensten.map((d) => aanbodLaag.get(d.trim().toLowerCase())).filter((d): d is string => Boolean(d))),
      ],
      terms_json: termen,
      total_volume: feiten.totaalVolume,
      own_position: feiten.eigenPositie,
      score,
      score_json: { ...onderdelen, pasvorm },
      overlaps_with: overlap,
    });
  }

  if (rijen.length > 0) {
    const { error } = await admin.from("cluster_discovery_candidates").insert(rijen as never);
    if (error) throw new Error(`Kandidaten opslaan mislukt: ${error.message}`);
  }

  await volgende(
    admin,
    run,
    "klaar",
    {
      ai_cost_usd: Number(run.ai_cost_usd ?? 0) + res.costUsd,
      ...(rijen.length === 0
        ? {
            status_note: [run.status_note, "Het bundelen leverde geen onderwerpen op die door de controle kwamen."]
              .filter(Boolean)
              .join(" "),
          }
        : {}),
    },
    null,
  );
}
