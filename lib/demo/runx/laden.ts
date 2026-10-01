import "server-only";

/**
 * Laadt het voorbeeldaccount RunX in de database, zonder één AI-aanroep.
 *
 * Plan: `docs/tasks/demo-account-runx.md` §9. Gestart door een beheerder via
 * `POST /api/beheer/demo/runx`, in stappen (`STAPPEN`), zodat elke stap ruim
 * binnen de tijdslimiet van één verzoek blijft: de clusters met de meeste
 * meetmomenten hebben 13 × 30 metingen en 13 keer de echte scoreberekening.
 *
 * ── WAT DIT WEL EN NIET DOET ────────────────────────────────────────────────
 *
 * Het schrijft wat een echte klant na een jaar heeft, langs dezelfde wegen
 * waar dat kan, zodat elk scherm dezelfde samenhang ziet als bij een echte klant:
 *
 *   • het merkprofiel via `slaProfielOp()` en de aanbodboom via `voegKnoopToe()`
 *     (de kennislaag, K8: alleen `lib/kennis/` schrijft een kennisveld);
 *   • de scores via `computeAggregates()`, dezelfde rekensom als na een echte
 *     meting, over de ingeladen antwoorden;
 *   • de kansen via `legKansenVast()`, de voorraad via `syncBacklog()`;
 *   • elk antwoord op een vraag via `answerFact()`.
 *
 * Wat normaal een AI-aanroep is (het antwoord van ChatGPT, het rapport, de
 * tekst van een pagina) komt uit de databestanden in deze map. Er wordt nooit
 * iets in `ai_calls` geschreven: er is niets betaald, en een verzonnen regel in
 * het kostenlogboek zou de echte kostencijfers van de app vervuilen.
 *
 * ⚠️ De ruwe kolommen die bij een echte aanroep de volledige modeluitvoer
 * dragen (conventie 8) krijgen `{"bron":"demo"}`: zo is altijd te zien dat een
 * rij ingeladen is.
 *
 * ── OPNIEUW INLADEN IS VERJONGEN ────────────────────────────────────────────
 *
 * Elke rij heeft een vast id (`demoId()`), en alle datums zijn relatief aan
 * `nu`. Een tweede keer inladen, een maand later, schuift dus het hele jaar
 * een maand op in plaats van rijen te verdubbelen (§9.5).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { slaProfielOp, legGesprekVast } from "@/lib/kennis/uit-gesprek";
import { GESPREKSVELDEN } from "@/lib/kennis/gesprek";
import { voegKnoopToe } from "@/lib/kennis/uit-aanbod";
import { legVast } from "@/lib/kennis/vastleggen";
import { computeAggregates } from "@/lib/pipeline/measure";
import { computePeriodChange } from "@/lib/pipeline/period-change";
import { legKansenVast, werkKennisgatBij } from "@/lib/kansen/uit-rapport";
import { syncBacklog } from "@/lib/plan-backlog-data";
import { ensureFunnels } from "@/lib/plans";
import { answerFact } from "@/lib/facts";
import { normalizeEntityName } from "@/lib/entities/normalize";
import { AANBOD, GESPREK, MERK, PARTIJEN, PROFIELVELDEN, WAAROM, WINKELS, type Knoop } from "@/lib/demo/runx/merk";
import { CLUSTERS } from "@/lib/demo/runx/vragen";
import { MAANDSTATUS, VOORRAAD } from "@/lib/demo/runx/plan";
import { KLANTVRAGEN } from "@/lib/demo/runx/klantvragen";
import { TEKSTEN } from "@/lib/demo/runx/teksten";
import { bouwJaar, paginaVoorOpenVraag, type ClusterJaar, type Jaar, type PaginaJaar } from "@/lib/demo/runx/jaar";
import { dagIn, demoId, isoDag, maandStart, meet, toeval } from "@/lib/demo/runx/rekenen";

type Admin = SupabaseClient;

import { PROFIEL_ID, ACCOUNT_ID } from "@/lib/demo/runx/ids";

export { PROFIEL_ID, ACCOUNT_ID };

/** De stappen, in volgorde. De route voert er één per verzoek uit. */
export const STAPPEN = ["basis", ...CLUSTERS.map((c) => `cluster:${c.sleutel}`), "plan", "afronden"] as const;

export interface StapVerslag {
  stap: string;
  volgende: string | null;
  regels: string[];
}

interface Context {
  admin: Admin;
  gebruikerId: string;
  nu: Date;
  jaar: Jaar;
  regels: string[];
}

const DEMO_RUW = { bron: "demo" } as const;
const DAG = 86_400_000;

/** Voert één stap uit. Gooit bij een fout, met de stap erbij, zodat de knop zegt waar het misging. */
export async function voerStapUit(admin: Admin, stap: string, opties: { gebruikerId: string; nu?: Date }): Promise<StapVerslag> {
  const nu = opties.nu ?? new Date();
  const ctx: Context = { admin, gebruikerId: opties.gebruikerId, nu, jaar: bouwJaar(nu), regels: [] };
  const i = (STAPPEN as readonly string[]).indexOf(stap);
  if (i < 0) throw new Error(`Onbekende stap: ${stap}`);

  if (stap === "basis") await basis(ctx);
  else if (stap.startsWith("cluster:")) await cluster(ctx, stap.slice("cluster:".length));
  else if (stap === "plan") await plan(ctx);
  else if (stap === "afronden") await afronden(ctx);

  return { stap, volgende: STAPPEN[i + 1] ?? null, regels: ctx.regels };
}

// ── Hulpjes ─────────────────────────────────────────────────────────────────

/**
 * Upsert in delen van 500, gegroepeerd op welke kolommen een rij heeft.
 *
 * ⚠️ Een upsert met rijen van verschillende vorm vult een kolom die in de ene
 * rij ontbreekt met `null`, niet met zijn standaardwaarde. Bij `content_pieces`
 * gaf dat een fout op de verplichte kolom `review_notes` zodra er een tweede
 * versie naast een eerste stond. Per vorm opslaan houdt elke standaardwaarde heel.
 */
async function upsert(admin: Admin, tabel: string, rijen: Record<string, unknown>[], onConflict = "id"): Promise<void> {
  const perVorm = new Map<string, Record<string, unknown>[]>();
  for (const r of rijen) {
    const vorm = Object.keys(r).sort().join(",");
    perVorm.set(vorm, [...(perVorm.get(vorm) ?? []), r]);
  }
  for (const groep of perVorm.values()) {
    for (let i = 0; i < groep.length; i += 500) {
      const { error } = await admin.from(tabel).upsert(groep.slice(i, i + 500), { onConflict });
      if (error) throw new Error(`${tabel}: ${error.message}`);
    }
  }
}

async function moet<T>(belofte: PromiseLike<{ data: T; error: { message: string } | null }>, wat: string): Promise<T> {
  const { data, error } = await belofte;
  if (error) throw new Error(`${wat}: ${error.message}`);
  return data;
}

function mens(ctx: Context) {
  return { actor: "mens" as const, gebruikerId: ctx.gebruikerId };
}

// ── Stap 1: het merk ────────────────────────────────────────────────────────

async function basis(ctx: Context): Promise<void> {
  const { admin, nu } = ctx;
  const gestart = maandStart(nu, -12);

  // Het account, met het pakket en het dagbudget op nul: de tweede rem naast
  // `is_demo` (`lib/demo.ts`), voor alles wat een gebruiker start.
  await upsert(admin, "accounts", [
    {
      id: ACCOUNT_ID,
      name: MERK.accountNaam,
      package_pages_per_month: MERK.pakket,
      started_at: gestart.toISOString(),
      daily_budget_eur: 0,
      contact_person: "Marketing RunX (fictief)",
    },
  ]);
  await upsert(admin, "account_users", [{ account_id: ACCOUNT_ID, user_id: ctx.gebruikerId, role: "admin" }], "account_id,user_id");

  const bestaand = await moet(admin.from("profiles").select("*").eq("id", PROFIEL_ID).maybeSingle(), "profiel lezen");
  const aangemaakt = dagIn(nu, -13, 18, 9);
  // Alleen kolommen die geen kennisveld zijn: die schrijft `slaProfielOp()`
  // hieronder (K8 deel 3). Expliciet uitgeschreven, zodat de bewaking in
  // `scripts/test-unit.ts` kan zien dat er geen kennisveld tussen zit.
  const profielRij = {
    id: PROFIEL_ID,
    user_id: ctx.gebruikerId,
    account_id: ACCOUNT_ID,
    url: MERK.url,
    name: MERK.naam,
    status: "klaar",
    is_demo: true,
    created_by_user_id: ctx.gebruikerId,
    created_at: aangemaakt.toISOString(),
    assigned_at: dagIn(nu, -13, 26).toISOString(),
    gsc_property: "sc-domain:runx.nl",
    gsc_verified_at: dagIn(nu, -12, 2).toISOString(),
    gsc_first_day: isoDag(maandStart(nu, -13)),
    gsc_last_sync_at: new Date(nu.getTime() - 6 * 3_600_000).toISOString(),
  };
  if (!bestaand) {
    await moet(admin.from("profiles").insert(profielRij), "profiel aanmaken");
    ctx.regels.push("Merk RunX aangemaakt.");
  } else {
    await moet(admin.from("profiles").update(profielRij).eq("id", PROFIEL_ID), "profiel bijwerken");
    ctx.regels.push("Merk RunX bestond al, bijgewerkt.");
  }

  // De kennisvelden, zoals de consultant ze na het gesprek invulde.
  const velden = Object.keys(PROFIELVELDEN).filter((v) => (GESPREKSVELDEN as readonly string[]).includes(v));
  const { error: profielFout } = await slaProfielOp(
    admin,
    {
      profileId: PROFIEL_ID,
      url: MERK.url,
      kolommen: PROFIELVELDEN as unknown as Record<string, unknown>,
      oud: (bestaand ?? {}) as never,
      velden,
      bron: "gesprek",
    },
    mens(ctx),
  );
  if (profielFout) throw new Error(`Merkprofiel: ${profielFout}`);
  await upsert(
    admin,
    "profile_field_sources",
    Object.keys(PROFIELVELDEN).map((field) => ({
      profile_id: PROFIEL_ID,
      field,
      source: "gesprek",
      confidence: 1,
      set_by: ctx.gebruikerId,
      set_at: dagIn(nu, -13, 22).toISOString(),
    })),
    "profile_id,field",
  );
  ctx.regels.push(`${velden.length} velden van het merkprofiel vastgelegd.`);

  // De aanbodboom, alleen de knopen die er nog niet zijn.
  const { data: knoopRijen } = await admin.from("profile_offerings").select("id, name, parent_id").eq("profile_id", PROFIEL_ID).is("removed_at", null);
  const knopen = (knoopRijen ?? []) as { id: string; name: string; parent_id: string | null }[];
  let nieuweKnopen = 0;
  const plaats = async (k: Knoop, ouder: string | null, volgorde: number): Promise<void> => {
    let id = knopen.find((r) => r.name === k.naam && r.parent_id === ouder)?.id ?? null;
    if (!id) {
      const uit = await voegKnoopToe(
        admin,
        {
          profileId: PROFIEL_ID,
          rij: { parent_id: ouder, kind: k.soort, name: k.naam, description: k.omschrijving ?? null, source: "gesprek", confidence: 1, sort_order: volgorde },
        },
        mens(ctx),
      );
      if (uit.error || !uit.id) throw new Error(`Aanbodknoop ${k.naam}: ${uit.error}`);
      id = uit.id;
      nieuweKnopen++;
    }
    for (const [i, kind] of (k.kinderen ?? []).entries()) await plaats(kind, id, i);
  };
  for (const [i, k] of AANBOD.entries()) await plaats(k, null, i);
  ctx.regels.push(`Aanbodboom: ${nieuweKnopen} nieuwe knopen.`);

  // Het gesprek: aantekeningen en veranderingen.
  const { data: vorigeStrategie } = await admin.from("profile_strategy").select("profile_id, strategy_notes, context_factors").eq("profile_id", PROFIEL_ID).maybeSingle();
  await upsert(
    admin,
    "profile_strategy",
    [
      {
        profile_id: PROFIEL_ID,
        strategy_notes: GESPREK.notities,
        context_factors: GESPREK.contextfactoren,
        recorded_by: ctx.gebruikerId,
        recorded_at: dagIn(nu, -1, 16).toISOString(),
      },
    ],
    "profile_id",
  );
  await legGesprekVast(
    admin,
    {
      profileId: PROFIEL_ID,
      vorige: (vorigeStrategie as never) ?? null,
      nu: { profile_id: PROFIEL_ID, strategy_notes: GESPREK.notities, context_factors: GESPREK.contextfactoren },
    },
    mens(ctx),
  );

  // Wat er letterlijk op runx.nl staat: waargenomen, met adres en citaat.
  const waargenomen: { bewering: string; citaat: string; url: string; domein: "identiteit" | "aanbod" | "positionering"; soort: string }[] = [
    { bewering: "In elke RunX-winkel staat een zelfstandige ondernemer.", citaat: "In alle RunX winkels in Nederland staan zelfstandige ondernemers.", url: "https://runx.nl/over/", domein: "identiteit", soort: "organisatie" },
    { bewering: "RunX is een hardloopspeciaalzaak voor ieder type sporter, ook voor beginners.", citaat: "RunX is dé hardloop speciaalzaak voor ieder type sporter.", url: "https://runx.nl/over/", domein: "positionering", soort: "omschrijving" },
    { bewering: "De loopanalyse is gratis bij aankoop van hardloopschoenen.", citaat: "gratis loopanalyse bij aankoop van hardloopschoenen", url: "https://runx.nl/winkels/twente/", domein: "aanbod", soort: "dienst" },
    ...WINKELS.map((w) => ({ bewering: `${w.naam} zit op ${w.adres}.`, citaat: w.adres, url: w.url, domein: "identiteit" as const, soort: "vestiging" })),
  ];
  for (const w of waargenomen) {
    const uit = await legVast(
      admin,
      { profileId: PROFIEL_ID, domein: w.domein, soort: w.soort, bewering: w.bewering, status: "waargenomen", bron: "website", bronUrl: w.url, citaat: w.citaat, gebruik: "content", herkomst: { tabel: "profiles", id: PROFIEL_ID }, ruw: DEMO_RUW },
      { actor: "code", taak: "demo_runx" },
    );
    if (uit.soort === "geweigerd") throw new Error(`Kennis "${w.bewering}": ${uit.fouten.join(" ")}`);
  }
  // Wat de ondernemers in het gesprek zeiden en niet zomaar in een tekst mag:
  // verklaard, intern. In de demo laat dit zien dat de schrijver het kent maar
  // niet gebruikt zolang het niet bevestigd is (§4.4 van het plan).
  const intern = [
    "Elke winkel doet samen enkele duizenden loopanalyses per jaar (fictief, nog niet bevestigd).",
    "De RunX Club heeft meer dan tienduizend leden (fictief, nog niet bevestigd).",
  ];
  for (const bewering of intern) {
    const uit = await legVast(
      admin,
      { profileId: PROFIEL_ID, domein: "bewijs", soort: "aantal", bewering, status: "verklaard", bron: "gesprek", gebruik: "intern", ruw: DEMO_RUW },
      mens(ctx),
    );
    if (uit.soort === "geweigerd") throw new Error(`Kennis "${bewering}": ${uit.fouten.join(" ")}`);
  }

  // Wie AI noemt en welke rol die heeft, vooraf vastgelegd: zo hoeft de
  // aggregatie niets te classificeren (dat zou een AI-aanroep zijn).
  await upsert(
    admin,
    "entities",
    PARTIJEN.map((p) => ({
      id: demoId(`entiteit:${p.naam}`),
      profile_id: PROFIEL_ID,
      canonical_name: p.naam,
      normalized: normalizeEntityName(p.naam),
      entity_role: p.rol,
      role_source: "handmatig",
      confirmed: true,
      dismissed: false,
    })),
    "profile_id,normalized",
  );
  await ensureFunnels(admin as never, PROFIEL_ID);

  // De technische audit van deze maand.
  await upsert(admin, "technical_audits", [
    {
      id: demoId("audit"),
      profile_id: PROFIEL_ID,
      checked_at: new Date(nu.getTime() - 20 * 3_600_000).toISOString(),
      site_url: MERK.url,
      blockers: 0,
      warnings: 1,
      checks_json: [
        { id: "crawler.all", label: "Toegang voor AI-crawlers", finding: "Alle grote AI-crawlers mogen je site lezen.", severity: "ok", fix: null, who: null },
        { id: "no-js-content", label: "Leesbaar zonder JavaScript", finding: "Je adviespagina's zijn leesbaar zonder JavaScript.", severity: "ok", fix: null, who: null },
        { id: "sitemap", label: "Sitemap", finding: "Er is een sitemap, en robots.txt verwijst ernaar.", severity: "ok", fix: null, who: null },
        { id: "structured-data", label: "Gestructureerde data", finding: "De winkelpagina's hebben LocalBusiness-gegevens; de adviespagina's nog geen FAQPage.", severity: "warning", fix: "Voeg FAQPage-gegevens toe aan de adviespagina's met veelgestelde vragen.", who: "Je webbouwer." },
      ],
    },
  ]);
  ctx.regels.push("Kennis, concurrenten, funnelfasen en technische audit vastgelegd.");
}

// ── Stap 2: een cluster met een jaar metingen ───────────────────────────────

async function cluster(ctx: Context, sleutel: string): Promise<void> {
  const { admin, nu, jaar } = ctx;
  const cj = jaar.clusters.find((c) => c.cluster.sleutel === sleutel);
  if (!cj) throw new Error(`Onbekend cluster: ${sleutel}`);
  const c = cj.cluster;
  const start = cj.momenten[0].op;

  const { data: knoopRijen } = await admin.from("profile_offerings").select("id, name").eq("profile_id", PROFIEL_ID).is("removed_at", null);
  const knoopId = new Map(((knoopRijen ?? []) as { id: string; name: string }[]).map((k) => [k.name, k.id]));

  await upsert(admin, "analyses", [
    {
      id: cj.analysisId,
      user_id: ctx.gebruikerId,
      profile_id: PROFIEL_ID,
      url: MERK.url,
      topic: c.topic,
      name: c.titel,
      status: "gereed",
      tracking_enabled: true,
      prompts_orientatie: 10,
      prompts_overweging: 10,
      prompts_beslissing: 10,
      created_at: new Date(start.getTime() - 2 * DAG).toISOString(),
      resultaat_gezien_at: nu.toISOString(),
    },
  ]);

  // Het cluster dat Clusters ontdekken vond (HYROX), met zijn ronde erbij.
  let kandidaatId: string | null = null;
  if (c.herkomst === "ontdekking") {
    const runId = demoId(`ontdekken:${sleutel}`);
    kandidaatId = demoId(`ontdekken:${sleutel}:kandidaat`);
    const ontdekt = new Date(start.getTime() - 5 * DAG);
    await upsert(admin, "cluster_discovery_runs", [
      { id: runId, profile_id: PROFIEL_ID, started_by: ctx.gebruikerId, status: "klaar", input_json: DEMO_RUW, dataforseo_cost_usd: 0, ai_cost_usd: 0, created_at: ontdekt.toISOString(), finished_at: ontdekt.toISOString(), theme: "nieuwe sporten naast hardlopen" },
    ]);
    await upsert(admin, "cluster_discovery_candidates", [
      {
        id: kandidaatId,
        run_id: runId,
        profile_id: PROFIEL_ID,
        title: c.titel,
        rationale: c.rationale,
        kind: "nieuw_terrein",
        offering_names: c.aanbod,
        status: "toegevoegd",
        requested_by: ctx.gebruikerId,
        requested_at: ontdekt.toISOString(),
        decided_at: new Date(ontdekt.getTime() + DAG).toISOString(),
        created_at: ontdekt.toISOString(),
      },
    ]);
  }

  await upsert(admin, "profile_topics", [
    {
      id: cj.topicId,
      profile_id: PROFIEL_ID,
      title: c.titel,
      rationale: c.rationale,
      offering_ids: c.aanbod.map((n) => knoopId.get(n)).filter(Boolean),
      offering_names: c.aanbod,
      priority: CLUSTERS.indexOf(c) + 1,
      status: "goedgekeurd",
      stage: "definitief",
      origin: c.herkomst,
      analysis_id: cj.analysisId,
      search_volume_source: "geschat",
      discovery_candidate_id: kandidaatId,
      created_at: new Date(start.getTime() - 3 * DAG).toISOString(),
    },
  ]);

  await upsert(
    admin,
    "prompts",
    cj.prompts.map((p) => ({
      id: p.id,
      analysis_id: cj.analysisId,
      text: p.tekst,
      category: p.categorie,
      intent: p.onderwerp,
      active: true,
      created_by: "system",
      source_raw_json: DEMO_RUW,
      intent_type: p.intentie,
      specificity: p.stad ? "long_tail" : "head",
      purchase_intent: p.intentie === "transactional",
      cluster: p.onderwerp,
      volume_band: p.band,
      volume_source: "geschat",
      brand_eliciting: p.zonderMerken ? "nee" : "ja",
      created_at: new Date(start.getTime() - DAG).toISOString(),
    })),
  );

  const { data: entiteitRijen } = await admin.from("entities").select("id, normalized").eq("profile_id", PROFIEL_ID);
  const entiteitVan = new Map(((entiteitRijen ?? []) as { id: string; normalized: string }[]).map((e) => [e.normalized, e.id]));

  const paginasVanCluster = jaar.paginas.filter((p) => p.pagina.cluster === sleutel);
  const laatste = cj.momenten[cj.momenten.length - 1].weekNo;

  for (const moment of cj.momenten) {
    const genoemd = cj.genoemd.get(moment.weekNo) ?? new Set<number>();
    const runs = cj.prompts.map((prompt) => {
      const eigen = paginasVanCluster.find((p) => p.status === "geplaatst" && p.datum < moment.op && p.doelvragen.includes(prompt.index));
      return meet({ cluster: c, prompt, moment, laatste, eigenPagina: eigen?.url ?? null, runxGenoemd: genoemd.has(prompt.index) });
    });
    await upsert(
      admin,
      "tracking_runs",
      runs.map((r) => ({
        id: r.id,
        analysis_id: cj.analysisId,
        prompt_id: r.promptId,
        prompt_text_snapshot: r.tekst,
        prompt_category_snapshot: r.categorie,
        engine: "openai",
        model_used: "demo",
        week_no: r.weekNo,
        ran_at: r.op.toISOString(),
        raw_response: r.antwoord,
        raw_response_received_at: r.op.toISOString(),
        mention_json: DEMO_RUW,
        tokens_used: 0,
        cost_usd: 0,
        prompt_weight: r.gewicht,
        purpose: "periodic",
        repeat_index: 0,
      })),
    );
    await upsert(
      admin,
      "tracking_run_mentions",
      runs.flatMap((r) =>
        r.noemingen.map((n) => ({
          id: demoId(`noeming:${r.id}:${n.naam}`),
          tracking_run_id: r.id,
          entity_name: n.naam,
          is_own_brand: n.eigen,
          mentioned: n.genoemd,
          position: n.positie,
          cited_sources: n.bronnen,
          entity_id: n.eigen ? null : (entiteitVan.get(normalizeEntityName(n.naam)) ?? null),
          mention_role: n.rol,
        })),
      ),
    );

    // ⚠️ De rem op de classificatie: een entiteit op 'onbepaald' zou
    // `computeAggregates()` een AI-aanroep laten doen. Alle namen hierboven
    // staan in `PARTIJEN`; komt er toch één bij, dan stoppen we hier.
    const { count: onbepaald } = await admin.from("entities").select("id", { count: "exact", head: true }).eq("profile_id", PROFIEL_ID).eq("role_source", "onbepaald");
    if ((onbepaald ?? 0) > 0) throw new Error(`${onbepaald} onbekende partij(en) in de metingen; voeg ze toe aan PARTIJEN in merk.ts.`);

    await computeAggregates(admin as never, cj.analysisId, moment.weekNo);
    await moet(admin.from("visibility_scores").update({ computed_at: moment.op.toISOString() }).eq("analysis_id", cj.analysisId).eq("week_no", moment.weekNo), "score dateren");
    await waaromConcurrenten(ctx, cj, moment.weekNo, moment.op);
    await rapport(ctx, cj, moment.weekNo, moment.op, runs.map((r) => ({ id: r.id, promptIndex: cj.prompts.findIndex((p) => p.id === r.promptId) })));
  }

  ctx.regels.push(`${c.titel}: ${cj.momenten.length} meetmomenten, ${cj.momenten.length * cj.prompts.length} metingen.`);
}

/** De "waarom"-laag die normaal een AI-aanroep is (`profile_competitors`), uit `WAAROM`. */
async function waaromConcurrenten(ctx: Context, cj: ClusterJaar, weekNo: number, op: Date): Promise<void> {
  const { data } = await ctx.admin.from("competitor_breakdown").select("id, competitor_name").eq("analysis_id", cj.analysisId).eq("week_no", weekNo);
  for (const rij of (data ?? []) as { id: string; competitor_name: string }[]) {
    const waarom = WAAROM[rij.competitor_name];
    await moet(
      ctx.admin
        .from("competitor_breakdown")
        .update({
          computed_at: op.toISOString(),
          why_summary: waarom ? `AI noemt ${rij.competitor_name} als ${waarom}.` : null,
          attributes_json: waarom ? [{ attribute: waarom, evidence: `${rij.competitor_name}: ${waarom}.` }] : null,
        })
        .eq("id", rij.id),
      "concurrent toelichten",
    );
  }
}

/** Het rapport van één meetmoment: samenvatting, gaten en de aanbevelingen die later pagina's werden. */
async function rapport(ctx: Context, cj: ClusterJaar, weekNo: number, op: Date, runs: { id: string; promptIndex: number }[]): Promise<void> {
  const { admin, jaar } = ctx;
  const c = cj.cluster;
  const id = demoId(`rapport:${c.sleutel}:${weekNo}`);
  const runVan = new Map(runs.map((r) => [r.promptIndex, r.id]));
  const laatste = weekNo === cj.momenten[cj.momenten.length - 1].weekNo;

  const { data: score } = await admin.from("visibility_scores").select("score, weighted_score, winnable_runs, first_mention_count").eq("analysis_id", cj.analysisId).eq("week_no", weekNo).maybeSingle();
  const { data: vorig } = weekNo > 0
    ? await admin.from("visibility_scores").select("weighted_score").eq("analysis_id", cj.analysisId).eq("week_no", weekNo - 1).maybeSingle()
    : { data: null };
  const gewogen = (score?.weighted_score as number | null) ?? (score?.score as number | null) ?? 0;
  const was = (vorig?.weighted_score as number | null) ?? null;

  const genoemd = cj.genoemd.get(weekNo) ?? new Set<number>();
  const gemist = cj.prompts.filter((p) => !p.zonderMerken && !genoemd.has(p.index)).sort((a, b) => b.gewicht - a.gewicht);
  const sterkste = c.concurrenten[0].naam;

  const summary =
    (weekNo === 0
      ? `Dit is de eerste meting, dus er is nog geen eerdere stand om mee te vergelijken. `
      : `Ten opzichte van de vorige meting ging de zichtbaarheid van ${was ?? "?"} naar ${gewogen} op 100. `) +
    `Gewogen naar populariteit en koopkans staat RunX op ${gewogen} van 100. Er zijn 30 vragen onderzocht over ${c.topic}. ` +
    (gemist.length > 0
      ? `Bij ${gemist.length} vragen waar AI wel winkels noemt, stond RunX er nog niet bij; ${sterkste} werd daar het vaakst genoemd.`
      : `RunX wordt genoemd bij alle vragen waar AI een winkel aanraadt.`);

  const gaps = gemist.slice(0, 4).map((p) => ({
    cluster: p.onderwerp,
    problem: `Bij de vraag "${p.tekst}" werd RunX niet genoemd. ${sterkste} stond in dit soort antwoorden het vaakst bovenaan.`,
    evidenceRunIds: [runVan.get(p.index)].filter(Boolean),
  }));

  const aanbevolen = jaar.paginas.filter((p) => p.pagina.cluster === c.sleutel && p.rapportWeek === weekNo).sort((a, b) => a.volgnummer - b.volgnummer);
  const doel = (indexen: number[]) =>
    indexen.map((i) => {
      const p = cj.prompts[i];
      return { text: p.tekst, runId: runVan.get(i) ?? null, weight: p.gewicht, cluster: p.onderwerp, promptId: p.id };
    });
  const recommendations = [
    ...aanbevolen.map((p, i) => ({
      why: `Bij ${p.doelvragen.length === 1 ? "deze vraag" : "deze vragen"} noemt AI nu andere winkels. Een eigen pagina geeft AI een bron om RunX te noemen.`,
      type: p.pagina.soort,
      title: p.pagina.titel,
      action: "nieuw",
      targets: doel(p.doelvragen),
      priority: i + 1,
      relatedUrl: null,
      existingUrl: null,
      targetIntent: `Een hardloper die wil weten: ${cj.prompts[p.doelvragen[0]]?.tekst ?? p.pagina.titel}`,
    })),
    // De voorraad hoort bij het laatste rapport (§6.3).
    // Met vragen die geen pagina van het plan al raakt: anders voegt
    // `legKansenVast()` de kaart terecht samen met de kans van die pagina (V7).
    ...(laatste
      ? VOORRAAD.filter((v) => v.cluster === c.sleutel).map((v, i) => {
          const bezet = new Set(jaar.paginas.filter((p) => p.pagina.cluster === c.sleutel).flatMap((p) => p.doelvragen));
          const vrij = gemist.filter((p) => !bezet.has(p.index));
          const kandidaat = vrij[i] ?? gemist[i];
          return {
            why: "Een vraag waar RunX nog niet genoemd wordt en die nog niet in het plan staat.",
            type: v.soort,
            title: v.titel,
            action: "nieuw",
            targets: kandidaat ? doel([kandidaat.index]) : [],
            priority: aanbevolen.length + i + 1,
            relatedUrl: null,
            existingUrl: null,
            targetIntent: kandidaat ? `Een hardloper die wil weten: ${kandidaat.tekst}` : v.titel,
          };
        })
      : []),
  ];

  await upsert(admin, "reports", [
    {
      id,
      analysis_id: cj.analysisId,
      week_no: weekNo,
      period: weekNo === 0 ? "nulmeting" : `periode ${weekNo}`,
      summary,
      gaps_json: gaps,
      recommendations_json: recommendations,
      declined_json: [],
      stripped_claims_json: [],
      change_json: await computePeriodChange(admin as never, cj.analysisId, weekNo),
      gap_analysis_raw_json: DEMO_RUW,
      raw_json: DEMO_RUW,
      generated_at: new Date(op.getTime() + 3 * 3_600_000).toISOString(),
      emailed_at: null,
    },
  ]);
  await legKansenVast(admin, id);
}

// ── Stap 3: het plan, de pagina's, de vragen, het effect ────────────────────

async function plan(ctx: Context): Promise<void> {
  const { admin, nu, jaar } = ctx;

  // Twee planversies (§6.1): het eerste kwartaal, en het jaarplan dat in
  // januari begon.
  const plannen = [
    { id: demoId("plan:1"), version: 1, status: "gestopt", started_on: isoDag(maandStart(nu, -12)), maanden: 3 },
    { id: demoId("plan:2"), version: 2, status: "actief", started_on: isoDag(maandStart(nu, -9)), maanden: 12 },
  ];
  await upsert(
    admin,
    "content_plans",
    plannen.map((p) => ({
      id: p.id,
      profile_id: PROFIEL_ID,
      started_on: p.started_on,
      pages_per_month: MERK.pakket,
      status: p.status,
      version: p.version,
      strategy_note: p.version === 2 ? "Jaarplan: eerst de zes steden en de loopanalyse, in het voorjaar wedstrijden, in de zomer trail, in het najaar HYROX erbij." : null,
      created_at: dagIn(nu, p.version === 1 ? -13 : -10, 20).toISOString(),
    })),
  );
  const maandId = (offset: number): string => {
    const plan = offset < -9 ? plannen[0] : plannen[1];
    const startOffset = offset < -9 ? -12 : -9;
    return demoId(`planmaand:${plan.version}:${offset - startOffset + 1}`);
  };
  const maandRijen: Record<string, unknown>[] = [];
  for (const [p, startOffset] of [[plannen[0], -12], [plannen[1], -9]] as const) {
    for (let n = 1; n <= p.maanden; n++) {
      const offset = startOffset + n - 1;
      const status = offset < 0 ? "goedgekeurd" : (MAANDSTATUS[offset] ?? "concept");
      maandRijen.push({
        id: maandId(offset),
        plan_id: p.id,
        month_number: n,
        status,
        approved_at: status === "goedgekeurd" ? dagIn(nu, offset - 1, 24).toISOString() : null,
        approved_by_user_id: status === "goedgekeurd" ? ctx.gebruikerId : null,
        created_at: dagIn(nu, startOffset - 1, 20).toISOString(),
      });
    }
  }
  await upsert(admin, "plan_months", maandRijen);

  const { data: faseRijen } = await admin.from("profile_funnel_stages").select("id, label, sort_order").eq("profile_id", PROFIEL_ID).order("sort_order");
  const fasen = (faseRijen ?? []) as { id: string }[];

  // De kansen die de rapporten maakten, op sleutel.
  const { data: kansRijen } = await admin.from("kansen").select("id, sleutel").eq("profile_id", PROFIEL_ID);
  const kansVan = new Map(((kansRijen ?? []) as { id: string; sleutel: string | null }[]).map((k) => [k.sleutel, k.id]));

  const stukken: Record<string, unknown>[] = [];
  const planPaginas: Record<string, unknown>[] = [];
  let zonderTekst = 0;
  for (const p of jaar.paginas) {
    const cj = jaar.clusters.find((c) => c.cluster.sleutel === p.pagina.cluster)!;
    const rapportId = demoId(`rapport:${p.pagina.cluster}:${p.rapportWeek}`);
    const sleutel = `${rapportId}#${p.volgnummer}`;
    const tekst = TEKSTEN[p.pagina.sleutel];
    const heeftTekst = ["geplaatst", "goedgekeurd", "ter_goedkeuring"].includes(p.status);
    if (heeftTekst && !tekst) zonderTekst++;
    const stukId = heeftTekst && tekst ? demoId(`stuk:${p.pagina.sleutel}`) : null;
    const geschreven = new Date(p.datum.getTime() - 9 * DAG);

    if (stukId && tekst) {
      const tweeVersies = p.pagina.pronk || toeval(`${p.pagina.sleutel}:versies`) < 0.12;
      const basis = {
        analysis_id: cj.analysisId,
        report_id: rapportId,
        type: p.pagina.soort,
        title: p.pagina.titel,
        target_intent: `Een hardloper die wil weten: ${cj.prompts[p.doelvragen[0]]?.tekst ?? p.pagina.titel}`,
        cluster: cj.prompts[p.doelvragen[0]]?.onderwerp ?? null,
        meta_title: tekst.metaTitel,
        meta_description: tekst.metaBeschrijving,
        faq_json: tekst.faq,
        raw_json: DEMO_RUW,
        action: "nieuw",
        word_count: tekst.tekst.split(/\s+/).filter(Boolean).length,
        controle_json: { ongedekt: [], verboden: [], bevestigd: [], beoordeling: { punten: [], oordeel: "goed", verzonnen: [] }, gele_zinnen: [], herschreven: false },
        brief_json: DEMO_RUW,
      };
      if (tweeVersies) {
        stukken.push({
          ...basis,
          id: demoId(`stuk:${p.pagina.sleutel}:v1`),
          body_markdown: eersteVersie(tekst.tekst),
          status: "ready",
          version: 1,
          is_current: false,
          needs_review: true,
          review_notes: ["Graag meer over hoe het in onze winkels gaat, en minder algemeen."],
          created_at: geschreven.toISOString(),
          updated_at: geschreven.toISOString(),
        });
      }
      const goedgekeurd = p.status !== "ter_goedkeuring";
      stukken.push({
        ...basis,
        id: stukId,
        body_markdown: tekst.tekst,
        status: p.status === "geplaatst" ? "published" : "ready",
        version: tweeVersies ? 2 : 1,
        is_current: true,
        supersedes_id: tweeVersies ? demoId(`stuk:${p.pagina.sleutel}:v1`) : null,
        revision_note: tweeVersies ? "Herschreven met de feedback van de klant." : null,
        needs_review: !goedgekeurd,
        reviewed_at: goedgekeurd ? new Date(p.datum.getTime() - 4 * DAG).toISOString() : null,
        reviewed_by: goedgekeurd ? ctx.gebruikerId : null,
        published_at: p.status === "geplaatst" ? p.datum.toISOString() : null,
        published_url: p.status === "geplaatst" ? p.url : null,
        created_at: new Date(geschreven.getTime() + (tweeVersies ? 2 : 0) * DAG).toISOString(),
        updated_at: new Date(p.datum.getTime() - 4 * DAG).toISOString(),
      });
    }

    planPaginas.push({
      id: p.id,
      plan_month_id: maandId(p.pagina.maand),
      profile_id: PROFIEL_ID,
      title: p.pagina.titel,
      url_path: p.pagina.pad,
      page_type: p.pagina.type,
      content_type: p.pagina.soort,
      funnel_stage_id: fasen[Math.min(fasen.length - 1, faseIndex(cj, p))]?.id ?? null,
      topic_id: cj.topicId,
      status: stukId || !heeftTekst ? p.status : "gepland",
      sort_order: jaar.paginas.filter((q) => q.pagina.maand === p.pagina.maand).indexOf(p),
      is_buffer: false,
      scheduled_for: isoDag(p.datum),
      content_piece_id: stukId,
      posted_at: p.status === "geplaatst" ? p.datum.toISOString() : null,
      posted_url: p.status === "geplaatst" ? p.url : null,
      posted_by_user_id: p.status === "geplaatst" ? ctx.gebruikerId : null,
      source: "aanbeveling",
      source_analysis_id: cj.analysisId,
      source_ref: sleutel,
      kans_id: kansVan.get(sleutel) ?? null,
      recommendation_action: "nieuw",
      why: "Bij deze vragen noemt AI nu andere winkels. Een eigen pagina geeft AI een bron om RunX te noemen.",
      target_intent: cj.prompts[p.doelvragen[0]]?.tekst ?? null,
      target_count: p.doelvragen.length,
      target_weight: p.doelvragen.reduce((s, i) => s + (cj.prompts[i]?.gewicht ?? 0), 0),
      created_at: dagIn(nu, p.pagina.maand - 1, 20).toISOString(),
    });
  }
  // Eerst de versies zonder `supersedes_id`, dan de rest: de verwijzing moet bestaan.
  await upsert(admin, "content_pieces", stukken.filter((s) => !s.supersedes_id));
  await upsert(admin, "content_pieces", stukken.filter((s) => s.supersedes_id));
  await upsert(admin, "planned_pages", planPaginas);
  ctx.regels.push(`${planPaginas.length} pagina's in het plan, ${stukken.length} versies met tekst.`);
  if (zonderTekst > 0) ctx.regels.push(`⚠️ ${zonderTekst} pagina('s) zonder tekst in teksten/: die staan op "gepland" tot de tekst er is.`);

  await effect(ctx);
  await klantvragen(ctx);
}

function faseIndex(cj: ClusterJaar, p: PaginaJaar): number {
  const cat = cj.prompts[p.doelvragen[0]]?.categorie;
  return cat === "Oriëntatie" ? 0 : cat === "Overweging" ? 1 : 2;
}

/** Een eerste versie die herkenbaar algemener is: zonder de alinea's die de klant liet toevoegen. */
function eersteVersie(tekst: string): string {
  const alineas = tekst.split("\n\n");
  return alineas.filter((a) => !/RunX/.test(a) || a.startsWith("#")).join("\n\n");
}

/** Het effect na 14 en 28 dagen, en het meetplan per pagina. */
async function effect(ctx: Context): Promise<void> {
  const { admin, jaar } = ctx;
  const impact: Record<string, unknown>[] = [];
  const meetplannen: Record<string, unknown>[] = [];
  for (const p of jaar.paginas) {
    if (p.status !== "geplaatst" || !TEKSTEN[p.pagina.sleutel]) continue;
    const cj = jaar.clusters.find((c) => c.cluster.sleutel === p.pagina.cluster)!;
    const stukId = demoId(`stuk:${p.pagina.sleutel}`);
    const controle = cj.prompts.filter((q) => !p.doelvragen.includes(q.index) && !q.zonderMerken).slice(0, 4);
    meetplannen.push({
      id: demoId(`meetplan:${p.pagina.sleutel}`),
      content_piece_id: stukId,
      analysis_id: cj.analysisId,
      doelvragen: p.doelvragen.map((i) => ({ tekst: cj.prompts[i].tekst, promptId: cj.prompts[i].id })),
      controlegroep: controle.map((q) => ({ tekst: q.tekst, promptId: q.id })),
      bronnen: ["openai"],
      vastgelegd_op: new Date(p.datum.getTime() - 4 * DAG).toISOString(),
      gepubliceerd_op: p.datum.toISOString(),
      adres: p.url,
    });
    for (const e of p.effect) {
      impact.push({
        id: demoId(`impact:${p.pagina.sleutel}:${e.golf}`),
        content_piece_id: stukId,
        analysis_id: cj.analysisId,
        wave: e.golf,
        target_total: e.totaal,
        target_before_mentioned: e.voor,
        target_after_mentioned: e.na,
        control_total: controle.length,
        control_before_mentioned: 1,
        control_after_mentioned: 1,
        target_delta: e.totaal > 0 ? (e.na - e.voor) / e.totaal : null,
        control_delta: 0,
        delta_threshold: 0.25,
        verdict: e.oordeel,
        target_cited_own_page: e.oordeel === "gestegen",
        computed_at: new Date(p.datum.getTime() + (e.golf === 1 ? 15 : 29) * DAG).toISOString(),
      });
    }
  }
  await upsert(admin, "meetplannen", meetplannen);
  await upsert(admin, "content_impact", impact);
  ctx.regels.push(`Effectmeting: ${impact.length} golven bij ${meetplannen.length} pagina's.`);
}

/** De vragen aan de klant: beantwoord via `answerFact()`, zoals bij een echte klant. */
async function klantvragen(ctx: Context): Promise<void> {
  const { admin, nu, jaar } = ctx;
  const openPagina = paginaVoorOpenVraag(jaar);
  let beantwoord = 0;
  for (const v of KLANTVRAGEN) {
    const id = demoId(`klantvraag:${v.sleutel}`);
    const cj = v.cluster ? jaar.clusters.find((c) => c.cluster.sleutel === v.cluster) : null;
    const gesteld = dagIn(nu, v.maand, 6 + (Math.abs(v.sleutel.length * 7) % 18), 10);
    const opPagina = v.openPagina && openPagina && TEKSTEN[openPagina.pagina.sleutel] ? demoId(`stuk:${openPagina.pagina.sleutel}`) : null;
    const { data: bestaand } = await admin.from("fact_requests").select("status").eq("id", id).maybeSingle();
    await upsert(admin, "fact_requests", [
      {
        id,
        profile_id: PROFIEL_ID,
        analysis_id: opPagina ? jaar.clusters.find((c) => c.cluster.sleutel === openPagina!.pagina.cluster)!.analysisId : (cj?.analysisId ?? null),
        question: v.vraag,
        reason: v.reden,
        status: bestaand?.status === "beantwoord" ? "beantwoord" : v.status === "overgeslagen" ? "overgeslagen" : "open",
        scope: opPagina ? "pagina" : cj ? "analyse" : "merk",
        kind: v.soort,
        answer_type: v.antwoordType,
        content_piece_ids: opPagina ? [opPagina] : [],
        open_vraag: Boolean(opPagina),
        required: false,
        raw_json: DEMO_RUW,
        created_at: gesteld.toISOString(),
      },
    ]);
    if (v.status === "beantwoord" && v.antwoord && bestaand?.status !== "beantwoord") {
      const uit = await answerFact(admin as never, { profileId: PROFIEL_ID, factId: id, answer: v.antwoord, gebruikerId: ctx.gebruikerId });
      if (!uit.ok) throw new Error(`Antwoord op "${v.vraag}": ${uit.error}`);
      beantwoord++;
    }
    if (v.status === "beantwoord") {
      await moet(admin.from("fact_requests").update({ answered_at: new Date(gesteld.getTime() + 2 * DAG).toISOString() }).eq("id", id), "antwoorddatum");
    }
  }
  ctx.regels.push(`${KLANTVRAGEN.length} vragen aan de klant, ${beantwoord} nu beantwoord.`);
}

// ── Stap 4: zoekverkeer, voorraad en meldingen ──────────────────────────────

async function afronden(ctx: Context): Promise<void> {
  const { admin, nu, jaar } = ctx;

  // Zoekverkeer uit Search Console, per geplaatste pagina per dag (§8): na
  // publicatie een paar weken opbouwen, daarna een niveau dat per seizoen
  // meebeweegt. Fictief, maar rekenkundig netjes: geen klik zonder vertoning.
  const dagen: Record<string, unknown>[] = [];
  const gisteren = new Date(nu.getTime() - 2 * DAG);
  for (const p of jaar.paginas) {
    if (p.status !== "geplaatst") continue;
    const niveau = 4 + Math.round(toeval(`${p.pagina.sleutel}:gsc`) * (p.pagina.pronk ? 26 : 12));
    for (let d = new Date(p.datum.getTime() + DAG); d <= gisteren; d = new Date(d.getTime() + DAG)) {
      const oud = (d.getTime() - p.datum.getTime()) / DAG;
      const opbouw = Math.min(1, oud / 35);
      const maand = d.getUTCMonth();
      const seizoen = maand === 0 || maand === 1 ? 1.4 : maand >= 7 && maand <= 9 ? 1.2 : maand === 6 || maand === 11 ? 0.8 : 1;
      const ruis = 0.7 + 0.6 * toeval(`${p.pagina.sleutel}:${isoDag(d)}`);
      const vertoningen = Math.round(niveau * 9 * opbouw * seizoen * ruis);
      if (vertoningen === 0) continue;
      const klikken = Math.round(vertoningen * (0.06 + 0.05 * toeval(`${p.pagina.sleutel}:ctr`)) * (0.8 + 0.4 * ruis - 0.2));
      dagen.push({
        id: demoId(`gsc:${p.pagina.sleutel}:${isoDag(d)}`),
        profile_id: PROFIEL_ID,
        day: isoDag(d),
        page: p.url,
        clicks: Math.max(0, Math.min(klikken, vertoningen)),
        impressions: vertoningen,
        position: Number((3 + 9 * (1 - opbouw) + 4 * toeval(`${p.pagina.sleutel}:pos`)).toFixed(2)),
      });
    }
  }
  await upsert(admin, "search_console_days", dagen, "profile_id,day,page");
  ctx.regels.push(`Zoekverkeer: ${dagen.length} dagregels.`);

  // De voorraad: kaarten uit de laatste rapporten, langs de echte weg.
  const sync = await syncBacklog(admin as never, PROFIEL_ID);
  await werkKennisgatBij(admin, PROFIEL_ID);
  ctx.regels.push(`Voorraad: ${sync.toegevoegd} nieuw, ${sync.bijgewerkt} bijgewerkt.`);

  // Wat de klant bij het openen ziet staan.
  await upsert(admin, "notificaties", [
    { id: demoId("melding:meting"), profile_id: PROFIEL_ID, account_id: ACCOUNT_ID, soort: "meting_klaar", object_id: null, gegevens: {}, aantal: 8, alleen_beheer: false, aangemaakt_op: dagIn(nu, 0, 1, 9).toISOString() },
    { id: demoId("melding:vragen"), profile_id: PROFIEL_ID, account_id: ACCOUNT_ID, soort: "nieuwe_vragen", object_id: null, gegevens: {}, aantal: 4, alleen_beheer: false, aangemaakt_op: new Date(nu.getTime() - 2 * DAG).toISOString() },
    { id: demoId("melding:gsc"), profile_id: PROFIEL_ID, account_id: ACCOUNT_ID, soort: "gsc_cijfers", object_id: null, gegevens: {}, aantal: 1, alleen_beheer: false, aangemaakt_op: new Date(nu.getTime() - 6 * 3_600_000).toISOString() },
  ]);

  // De laatste controle: er is niets betaald.
  const { count: kosten } = await admin.from("ai_calls").select("id", { count: "exact", head: true }).eq("profile_id", PROFIEL_ID);
  const analyseIds = jaar.clusters.map((c) => c.analysisId);
  const { count: kostenAnalyse } = await admin.from("ai_calls").select("id", { count: "exact", head: true }).in("analysis_id", analyseIds);
  if ((kosten ?? 0) + (kostenAnalyse ?? 0) > 0) {
    throw new Error(`Er staan ${(kosten ?? 0) + (kostenAnalyse ?? 0)} AI-aanroepen op het voorbeeldaccount. Dat had nul moeten zijn: zoek uit welke stap dat deed.`);
  }
  ctx.regels.push("Gecontroleerd: nul AI-aanroepen op dit merk.");
}
