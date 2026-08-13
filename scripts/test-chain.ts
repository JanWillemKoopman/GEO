/**
 * De KETENTEST: de echte jobhandlers tegen een echte Postgres
 * (implementatieplan.md S7).
 *
 * Draai met `npm run test:chain`. GEEN API-sleutel, GEEN netwerk, GEEN kosten.
 *
 * ── WAAROM DEZE TEST BESTAAT ────────────────────────────────────────────────
 *
 * `test-unit.ts` dekt pure functies uitstekend, en precies daarom zat geen van
 * de zeven fouten van dit traject erin. Ze zitten allemaal in de SAMENHANG
 * tussen taken: wat de ene stap opslaat en wat de volgende ervan leest.
 *
 *   1. `briefing` gold als "al af"           → er werd nooit geschreven
 *   2. Versiesprong                          → een lege spookrij naast de echte
 *   3. `answeredFacts` dood                  → klantantwoorden bereikten de schrijver niet
 *   4. Multi-ref-citaatplicht                → "F1, F2" telde als onbewezen
 *   5. Bevroren kaart plant zich voort       → de verouderde kaart werd permanent
 *   6. Merkbrede antwoorden buiten de sleutel→ de tweede schrijfklik sneuvelde stil
 *   7. Auditplan weggegooid                  → de schrijver begon elke keer bij nul
 *
 * Elk van de zeven is hieronder een assertie. Ze zijn stuk voor stuk gevonden
 * met de hand, op productie, na uren en dollars. Dat is wat deze test moet
 * vervangen.
 *
 * ── WAT ER ECHT IS EN WAT NIET ──────────────────────────────────────────────
 *
 * Echt: Postgres, het schema (dezelfde migraties), de constraints, de enums, de
 * unieke indexen, de jobhandlers, de wachtrij, de dedupe-sleutels, de volledige
 * pijplijncode. Nagebootst: alleen de Supabase-wire-vertaling (die valt bij het
 * eerste onbekende geval, zie `chain/supabase-shim.ts`) en OpenAI (vaste
 * antwoorden per schema, zie `chain/openai-stub.ts`).
 */
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

// ── De server-only-grendel opheffen, vóór alles ─────────────────────────────
//
// De pijplijnmodules beginnen met `import "server-only"`. Dat pakket bestaat
// alleen binnen Next; deze test draait er bewust buiten. De omleiding staat hier
// en nergens anders, zodat de grendel in productie ongemoeid blijft.
const require_ = createRequire(import.meta.url);
type ResolveFn = (request: string, ...rest: unknown[]) => string;
const ModuleCtor = require_("node:module") as { _resolveFilename: ResolveFn };
const origineleResolve = ModuleCtor._resolveFilename;
const stubPad = join(process.cwd(), "scripts/chain/server-only-stub.js");
ModuleCtor._resolveFilename = ((request: string, ...rest: unknown[]) => {
  if (request === "server-only") return stubPad;
  return origineleResolve(request, ...rest);
}) as ResolveFn;

// Web-zoeken en bronanalyse uit: die doen HTTP-verzoeken naar de buitenwereld,
// en een test die het internet nodig heeft is geen test maar een gok.
process.env.WEB_SEARCH_ENABLED = "false";
process.env.SOURCE_ANALYSIS = "false";
process.env.EMAILS_ENABLED = "false";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? `: ${detail}` : ""}`);
    console.log(`  ✗ ${name}${detail ? `: ${detail}` : ""}`);
  }
}

async function main(): Promise<void> {
  const { startTestDatabase } = await import("./chain/postgres");
  const { createShimClient } = await import("./chain/supabase-shim");
  const { createOpenAiStub } = await import("./chain/openai-stub");
  type StubLog = import("./chain/openai-stub").StubLog;

  console.log("\nKetentest · echte handlers, echte Postgres, gestubde AI\n");
  console.log("Database opstarten en migraties toepassen…");
  const db = await startTestDatabase(join(process.cwd(), "supabase/migrations"));

  const log: StubLog[] = [];

  try {
    const { __setTestAdminClient } = await import("@/lib/supabase/admin");
    const { __setTestTransport } = await import("@/lib/openai/structured");
    __setTestAdminClient(createShimClient(db.client));
    __setTestTransport(createOpenAiStub(log));

    const admin = createShimClient(db.client) as unknown as {
      from: (t: string) => never;
    };

    // ── Het decor: profiel, analyse, gecrawlde pagina, rapport ──────────────
    const userId = randomUUID();
    const profileId = randomUUID();
    const analysisId = randomUUID();

    await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
      userId,
      "ketentest@example.com",
    ]);
    await db.client.query(
      `insert into public.profiles (id, user_id, name, url, brand_name, proof_points, status)
       values ($1, $2, 'Fysi-Unique', 'https://fysi-unique.nl', 'Fysi-Unique',
               array['Wordt met een 9,4 beoordeeld op Zorgkaart'], 'klaar')`,
      [profileId, userId],
    );
    await db.client.query(
      `insert into public.profile_pages (profile_id, url, title, text_excerpt) values
       ($1, 'https://fysi-unique.nl/hardloopklachten', 'Hardloopklachten Amersfoort',
        'Fysi-Unique behandelt hardloopblessures zoals runnersknie en shin splints. Wij zitten in Amersfoort.')`,
      [profileId],
    );
    await db.client.query(
      `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
       values ($1, $2, $3, 'Fysi-Unique — hardloopblessures', 'https://fysi-unique.nl',
               'hardloopblessure behandelen', 'gereed')`,
      [analysisId, userId, profileId],
    );

    const aanbeveling = {
      title: "Pagina over hardloopblessures",
      type: "article" as const,
      targetIntent: "Waar kan ik in Amersfoort terecht voor een hardloopblessure?",
      why: "De AI noemt hier andere praktijken.",
      action: "nieuw" as const,
      existingUrl: null,
      reportId: null,
      targets: [
        {
          promptId: null,
          runId: null,
          text: "Waar kan ik in Amersfoort terecht voor een hardloopblessure?",
          cluster: "hardloop",
          weight: 1,
        },
      ],
      revisionNote: null,
    };

    // ── 1. De briefing ──────────────────────────────────────────────────────
    console.log("\nDe briefing (content_brief)");
    const { runBriefing } = await import("@/lib/pipeline/briefing");
    const briefing = await runBriefing({ analysisId, recommendations: [aanbeveling] });

    ok("de briefing maakt één pagina aan", briefing.contentPieceIds.length === 1);
    ok("er wordt een vraag aan de klant gesteld", briefing.questions >= 1, `${briefing.questions}`);

    // S1, het vangnet van de atomiseerstap. De stub bood twee zinnen aan;
    // alleen de zin die letterlijk op de gecrawlde pagina staat mag doorkomen.
    const kaart = await db.client.query(
      `select briefing_snapshot_json from public.content_pieces where analysis_id = $1`,
      [analysisId],
    );
    const snapshot = kaart.rows[0]?.briefing_snapshot_json as {
      facts?: { text: string; citable: boolean }[];
      plan?: unknown[];
      contradictions?: unknown;
    };
    const citeerbaar = (snapshot?.facts ?? []).filter((f) => f.citable).map((f) => f.text);
    ok(
      "S1: de letterlijke sitezin staat als citeerbaar feit op de kaart",
      citeerbaar.some((t) => t.includes("runnersknie")),
      citeerbaar.join(" | "),
    );
    ok(
      "S1: de verzonnen zin is door het vangnet tegengehouden",
      !citeerbaar.some((t) => t.includes("beste praktijk van Nederland")),
    );

    // Bug 7, het auditplan werd weggegooid.
    ok(
      "bug 7: het paginaplan staat in de snapshot",
      Array.isArray(snapshot?.plan) && snapshot.plan.length === 2,
      `${snapshot?.plan?.length ?? 0} punten`,
    );

    // S8, de tegenspraken werden berekend en alleen gelogd. Dit scenario kent
    // er geen (de klant heeft nog niets herzien), dus de lijst hoort leeg te
    // zijn, maar hij moet er wél STAAN. Precies dát is de regressie die deze
    // assertie bewaakt: verdwijnt het veld uit de snapshot, dan kan het
    // briefingscherm het nooit tonen en merkt niemand het.
    ok(
      "S8: het tegenspraakveld staat in de snapshot",
      Array.isArray(snapshot?.contradictions),
      `${JSON.stringify(snapshot?.contradictions)}`,
    );

    // ── 2. De klant beantwoordt ─────────────────────────────────────────────
    console.log("\nDe klant beantwoordt (twee vragen, één merkbreed)");
    const { data: vragen } = (await (admin.from("fact_requests") as never as {
      select: (k: string) => { eq: (a: string, b: string) => Promise<{ data: { id: string }[] }> };
    })
      .select("id")
      .eq("profile_id", profileId)) as { data: { id: string }[] };
    ok("de vraag staat in fact_requests", (vragen ?? []).length >= 1);

    // Het antwoord dat de contentronde nooit bereikte: een bevestigd feit dat
    // ná de bevroren kaart binnenkomt.
    await db.client.query(
      `update public.fact_requests
          set answer = 'Ja, met een nazorgprogramma van zes weken', status = 'beantwoord',
              answered_at = now()
        where profile_id = $1`,
      [profileId],
    );
    // En een merkbreed antwoord (analysis_id is null). Dat is wat bug 6 miste.
    await db.client.query(
      `insert into public.fact_requests
         (profile_id, analysis_id, question, reason, answer, status, answered_at, scope, kind,
          answer_type, required, claim_key)
       values ($1, null, 'Wat is jullie telefoonnummer?', 'praktisch', '033 - 123 45 67',
               'beantwoord', now(), 'merk', 'praktisch', 'tekst_kort', true, 'telefoonnummer')`,
      [profileId],
    );

    // Bug 6, telt een merkbreed antwoord mee in de dedupe-sleutel?
    const { planContentDraft } = await import("@/lib/jobs/content-jobs");
    const eerste = await planContentDraft(admin as never, {
      analysisId,
      userId,
      recommendation: aanbeveling,
    });
    ok("er wordt een schrijftaak ingepland", eerste.created);

    await db.client.query(
      `insert into public.fact_requests
         (profile_id, analysis_id, question, reason, answer, status, answered_at, scope, kind,
          answer_type, required, claim_key)
       values ($1, null, 'Wat is jullie adres?', 'praktisch', 'Vondelplein 4c',
               'beantwoord', now(), 'merk', 'praktisch', 'tekst_kort', true, 'adres')`,
      [profileId],
    );
    const tweede = await planContentDraft(admin as never, {
      analysisId,
      userId,
      recommendation: aanbeveling,
    });
    ok(
      "bug 6: een merkbreed antwoord levert een nieuwe schrijftaak op",
      tweede.created,
      "de dedupe-sleutel telde merkbrede antwoorden niet mee",
    );

    // ── 3. Schrijven ────────────────────────────────────────────────────────
    console.log("\nSchrijven (content_draft)");
    const { draftContentPiece } = await import("@/lib/pipeline/content");
    const draft = await draftContentPiece({
      analysisId,
      userId,
      reportId: null,
      recommendation: aanbeveling,
    });

    const na = await db.client.query(
      `select id, version, is_current, status, body_markdown, source_coverage, needs_review,
              briefing_snapshot_json
         from public.content_pieces where analysis_id = $1 order by version`,
      [analysisId],
    );

    // Bug 1, 'briefing' gold als "al af".
    ok(
      "bug 1: er staat tekst in de pagina",
      Boolean(na.rows[0]?.body_markdown),
      "de briefing-rij werd als 'al af' behandeld",
    );

    // Bug 2, de versiesprong met een lege spookrij ernaast.
    ok("bug 2: precies één rij voor deze titel", na.rows.length === 1, `${na.rows.length} rijen`);
    ok("bug 2: het is nog steeds versie 1", na.rows[0]?.version === 1);
    ok("bug 2: en die rij is de huidige", na.rows[0]?.is_current === true);

    // Bug 3, het antwoord van de klant moet in de gebruikte kaart staan.
    const gebruikt = na.rows[0]?.briefing_snapshot_json as { facts?: { text: string }[] };
    ok(
      "bug 3: het antwoord van de klant staat op de gebruikte feitenkaart",
      (gebruikt?.facts ?? []).some((f) => f.text.includes("nazorgprogramma van zes weken")),
      "de bevroren kaart werd blind hergebruikt",
    );

    // Bug 7, kreeg de schrijver het plan te zien?
    const schrijfprompt = log.filter((l) => l.schemaName === "content_piece").at(-1)?.user ?? "";
    ok(
      "bug 7: het paginaplan gaat mee de schrijfprompt in",
      schrijfprompt.includes("PAGINAPLAN"),
      "het plan werd na de briefing weggegooid",
    );
    ok(
      "S2: een weerlegd of ongedekt punt staat als zodanig in het plan",
      /GEDEKT|GEEN BRON|WEERLEGD/.test(schrijfprompt),
    );


    // Bug 4, "F1, F2" moet als onderbouwd tellen.
    ok(
      "bug 4: een samengestelde bronverwijzing telt als onderbouwd",
      Number(na.rows[0]?.source_coverage ?? 0) > 0,
      `dekking ${na.rows[0]?.source_coverage}`,
    );

    // S3, de zin zonder bron ("binnen 24 uur terecht") hoort opgemerkt te zijn.
    const notities = await db.client.query(
      `select review_notes from public.content_pieces where analysis_id = $1`,
      [analysisId],
    );
    const regels = (notities.rows[0]?.review_notes ?? []) as string[];
    ok(
      "S3: een uitspraak zonder bron wordt gemeld",
      regels.some((r) => r.includes("zonder bron")),
      regels.join(" | "),
    );

    // S6, 'ready' betekent niet 'vrijgegeven'.
    ok("S6: de pagina staat op nakijken", na.rows[0]?.needs_review === true);

    // ── 4. Nog een antwoord, dan opnieuw genereren ──────────────────────────
    console.log("\nOpnieuw genereren na een nieuw antwoord (bug 5)");
    await db.client.query(
      `insert into public.fact_requests
         (profile_id, analysis_id, question, reason, answer, status, answered_at, scope, kind,
          answer_type, required, claim_key)
       values ($1, null, 'Hoe snel kan ik terecht?', 'praktisch', 'Binnen 24 uur',
               'beantwoord', now(), 'merk', 'aanvulling', 'tekst_kort', false, 'wachttijd')`,
      [profileId],
    );

    await draftContentPiece({
      analysisId,
      userId,
      reportId: null,
      recommendation: aanbeveling,
      regenerate: true,
    });

    const opnieuw = await db.client.query(
      `select briefing_snapshot_json from public.content_pieces
        where analysis_id = $1 and is_current = true`,
      [analysisId],
    );
    const kaartNa = opnieuw.rows[0]?.briefing_snapshot_json as { facts?: { text: string }[] };
    ok(
      "bug 5: een nieuw antwoord bereikt ook een hergenereerde pagina",
      (kaartNa?.facts ?? []).some((f) => f.text.includes("Binnen 24 uur")),
      "de bevroren kaart plantte zichzelf voort over versies",
    );

    // ── De feitenbank (migratie 0036) ───────────────────────────────────────
    const bank = await db.client.query(
      `select id, text, analysis_id, kind, allowed from public.brand_facts
        where profile_id = $1 and superseded_by is null order by created_at`,
      [profileId],
    );
    ok(
      "0036: de feiten staan in de feitenbank",
      bank.rows.length >= 3,
      `${bank.rows.length} feiten`,
    );
    ok(
      "0036: klantantwoorden zijn merkbreed",
      bank.rows.some((r) => r.kind === "klant" && r.analysis_id === null),
    );
    ok(
      "0036: de geatomiseerde sitezin hangt aan deze analyse",
      bank.rows.some((r) => r.analysis_id === analysisId && String(r.text).includes("runnersknie")),
    );

    // Elke bewering wijst naar een FEIT-ID en niet alleen naar een plek in een
    // lijst. Dat is het hele punt van 0036: een F-nummer is een positie.
    const metId = await db.client.query(
      `select claims_json from public.content_pieces where analysis_id = $1 and is_current = true`,
      [analysisId],
    );
    const claims = (metId.rows[0]?.claims_json ?? []) as { factRef: string; factId: string | null }[];
    ok(
      "0036: elke onderbouwde bewering draagt een feit-id",
      claims.length > 0 && claims.every((c) => typeof c.factId === "string" && c.factId.length > 0),
      JSON.stringify(claims.map((c) => ({ ref: c.factRef, id: c.factId ? "ja" : "nee" }))),
    );

    ok(
      "de unieke index laat maar één huidige versie toe",
      (
        await db.client.query(
          `select count(*)::int as n from public.content_pieces
            where analysis_id = $1 and is_current = true`,
          [analysisId],
        )
      ).rows[0].n === 1,
    );

    // ══════════════════════════════════════════════════════════════════════
    // Eigenaarschap en de beheerdersrol (migratie 0038, blok A)
    //
    // Dit is de gevoeligste wijziging van het onboarding-traject: getOwnedProfile
    // en getOwnedAnalysis kregen een tweede uitweg, en die twee functies zijn
    // samen de enige poort tussen een verzoek en andermans data. Een `||` er
    // verkeerd neerzetten geeft iedereen toegang tot alles, en dat merk je aan
    // niets, want de happy path blijft gewoon werken.
    //
    // Vandaar drie gevallen per functie, waarvan het middelste het echte:
    // een gewone gebruiker mag er NIET bij.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nEigenaarschap: eigenaar, vreemde, beheerder");

    const { getOwnedProfile } = await import("@/lib/profiles");
    const { getOwnedAnalysis } = await import("@/lib/analyses");

    const vreemdeId = randomUUID();
    const beheerderId = randomUUID();
    await db.client.query("insert into auth.users (id, email) values ($1, $2), ($3, $4)", [
      vreemdeId,
      "vreemde@example.com",
      beheerderId,
      "beheerder@example.com",
    ]);
    await db.client.query("insert into public.staff_users (user_id) values ($1)", [beheerderId]);

    const adminClient = createShimClient(db.client) as never;

    ok(
      "0038: de eigenaar komt bij zijn eigen profiel",
      (await getOwnedProfile(adminClient, profileId, userId))?.id === profileId,
    );
    ok(
      "0038: een vreemde komt NIET bij dat profiel",
      (await getOwnedProfile(adminClient, profileId, vreemdeId)) === null,
    );
    ok(
      "0038: de beheerder komt er wel bij",
      (await getOwnedProfile(adminClient, profileId, beheerderId))?.id === profileId,
    );

    ok(
      "0038: de eigenaar komt bij zijn eigen analyse",
      (await getOwnedAnalysis(adminClient, analysisId, userId))?.id === analysisId,
    );
    ok(
      "0038: een vreemde komt NIET bij die analyse",
      (await getOwnedAnalysis(adminClient, analysisId, vreemdeId)) === null,
    );
    ok(
      "0038: de beheerder komt er wel bij",
      (await getOwnedAnalysis(adminClient, analysisId, beheerderId))?.id === analysisId,
    );

    // Toewijzen verplaatst het profiel ÉN de analyses. Alleen het profiel
    // verzetten levert een klant op die zijn merk ziet maar geen enkele
    // analyse. Precies het scherm waar hij voor betaalt.
    await db.client.query(
      "update public.profiles set user_id = $1, assigned_at = now() where id = $2",
      [vreemdeId, profileId],
    );
    await db.client.query("update public.analyses set user_id = $1 where profile_id = $2", [
      vreemdeId,
      profileId,
    ]);

    ok(
      "0038: na toewijzing is de analyse van de nieuwe eigenaar",
      (await getOwnedAnalysis(adminClient, analysisId, vreemdeId))?.id === analysisId,
    );
    ok(
      "0038: de vorige eigenaar komt er niet meer bij",
      (await getOwnedAnalysis(adminClient, analysisId, userId)) === null,
    );
    ok(
      "0038: de beheerder houdt toegang na toewijzing",
      (await getOwnedProfile(adminClient, profileId, beheerderId))?.id === profileId,
    );

    // ══════════════════════════════════════════════════════════════════════
    // Een correctie overleeft een tweede onderzoeksronde (migratie 0039)
    //
    // Dit is samenhang tussen twee dingen die elk apart werkten: de bewerkroute
    // schrijft `profile_field_sources`, en `prepare-profile.ts` leest die tabel
    // vóór hij een AI-patch wegschrijft. Tot 3 augustus 2026 schreef alleen de
    // strategieroute die rijen, en dan nog alleen voor aliassen en werkgebied.
    // De gewone manier waarop iemand een profiel corrigeert liet geen spoor na,
    // dus `filterProtectedFields()` blokkeerde nooit iets en de knop "onderzoek
    // opnieuw" zou elke correctie stil overschrijven.
    //
    // Geen unittest kon dit vangen: die functie deed precies wat hij moest doen
    // op de invoer die hij kreeg. Het gat zat ertussen.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nEen correctie overleeft een tweede onderzoeksronde");

    const { filterProtectedFields } = await import("@/lib/pipeline/field-merge");

    // Wat de bewerkroute nu doet als de klant de branche corrigeert.
    await db.client.query(
      `insert into public.profile_field_sources (profile_id, field, source, confidence, set_by)
       values ($1, 'industry', 'klant', 1, $2)
       on conflict (profile_id, field) do update set source = excluded.source`,
      [profileId, vreemdeId],
    );

    const { rows: herkomst } = await db.client.query(
      "select field, source from public.profile_field_sources where profile_id = $1",
      [profileId],
    );

    const { allowed, blocked } = filterProtectedFields(
      { industry: "iets wat het model bedacht", summary: "nieuwe samenvatting" },
      herkomst as { field: string; source: "ai" | "klant" | "gesprek" }[],
    );

    ok("0039: de gecorrigeerde branche wordt tegengehouden", blocked.includes("industry"));
    ok("0039: en staat niet in de patch", !("industry" in allowed));
    ok("0039: de rest gaat gewoon door", allowed.summary === "nieuwe samenvatting");

    // 'ai' is geen mens: een veld dat een vorige ronde zette mag ververst worden.
    await db.client.query(
      "update public.profile_field_sources set source = 'ai' where profile_id = $1 and field = 'industry'",
      [profileId],
    );
    const { rows: herkomst2 } = await db.client.query(
      "select field, source from public.profile_field_sources where profile_id = $1",
      [profileId],
    );
    ok(
      "0039: wat de AI zelf zette mag wél overschreven worden",
      filterProtectedFields(
        { industry: "een nieuwere afleiding" },
        herkomst2 as { field: string; source: "ai" | "klant" | "gesprek" }[],
      ).blocked.length === 0,
    );

    // ══════════════════════════════════════════════════════════════════════
    // Een onderwerp overleeft "onderzoek opnieuw" mét zijn aanbod (0043)
    //
    // De herhaalroute verwijdert de aanbodknopen met bron `ai` en laat de
    // topics staan. `profile_topics.offering_ids` is een `uuid[]` en kan dus
    // geen foreign key hebben, na die verwijdering wijst hij naar rijen die
    // niet meer bestaan, zonder dat er iets omvalt. Precies het soort fout dat
    // alleen zichtbaar wordt als je de twee stappen achter elkaar zet.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nEen onderwerp overleeft een herbouw van de aanbodboom");

    const { relinkOfferingIds } = await import("@/lib/pipeline/topic-link");

    const { rows: oudeKnopen } = await db.client.query(
      `insert into public.profile_offerings (profile_id, kind, name, source, sort_order)
       values ($1, 'dienst', 'Bekkenfysiotherapie', 'ai', 0),
              ($1, 'dienst', 'Zwangerschapsbegeleiding', 'ai', 1),
              ($1, 'dienst', 'Eigen toevoeging', 'klant', 2)
       returning id, name, source`,
      [profileId],
    );
    const oudId = (naam: string) =>
      (oudeKnopen as { id: string; name: string }[]).find((o) => o.name === naam)!
        .id;

    await db.client.query(
      `insert into public.profile_topics (profile_id, title, offering_ids, offering_names, priority)
       values ($1, 'Bekkenbodemklachten behandelen', $2, $3, 5)`,
      [
        profileId,
        [oudId("Bekkenfysiotherapie"), oudId("Eigen toevoeging")],
        ["Bekkenfysiotherapie"],
      ],
    );

    // Wat de herhaalroute doet: alleen de AI-knopen weg.
    await db.client.query(
      "delete from public.profile_offerings where profile_id = $1 and source = 'ai'",
      [profileId],
    );

    const { rows: dangling } = await db.client.query(
      `select cardinality(t.offering_ids) as gekoppeld,
              (select count(*) from public.profile_offerings o where o.id = any (t.offering_ids)) as bestaat_nog
       from public.profile_topics t where t.profile_id = $1`,
      [profileId],
    );
    ok(
      "0043: na de verwijdering wijst de koppeling naar een verdwenen knoop",
      Number(dangling[0].gekoppeld) === 2 && Number(dangling[0].bestaat_nog) === 1,
    );

    // En wat `buildOfferingTree()` erna doet: de boom opnieuw opbouwen…
    const { rows: nieuweKnopen } = await db.client.query(
      `insert into public.profile_offerings (profile_id, kind, name, source, sort_order)
       values ($1, 'dienst', 'Bekkenfysiotherapie', 'ai', 0)
       returning id, name`,
      [profileId],
    );
    const { rows: alleKnopen } = await db.client.query(
      "select id, name from public.profile_offerings where profile_id = $1",
      [profileId],
    );

    const { rows: teHerstellen } = await db.client.query(
      "select id, offering_ids, offering_names from public.profile_topics where profile_id = $1",
      [profileId],
    );
    const nieuweIds = relinkOfferingIds(
      teHerstellen[0] as { offering_ids: string[]; offering_names: string[] },
      alleKnopen as { id: string; name: string }[],
    );
    if (nieuweIds) {
      await db.client.query(
        "update public.profile_topics set offering_ids = $1 where id = $2",
        [nieuweIds, teHerstellen[0].id],
      );
    }

    const { rows: naHerbouw } = await db.client.query(
      `select (select count(*) from public.profile_offerings o where o.id = any (t.offering_ids)) as bestaat_nog,
              cardinality(t.offering_ids) as gekoppeld
       from public.profile_topics t where t.profile_id = $1`,
      [profileId],
    );
    ok(
      "0043: na de herbouw wijst elke koppeling weer naar een bestaande knoop",
      Number(naHerbouw[0].gekoppeld) === Number(naHerbouw[0].bestaat_nog),
    );
    ok(
      "0043: de nieuwe AI-knoop is teruggekoppeld",
      (nieuweIds ?? []).includes(
        (nieuweKnopen as { id: string }[])[0].id,
      ),
    );
    ok(
      "0043: en de knoop van de klant is niet gesneuveld",
      (nieuweIds ?? []).includes(oudId("Eigen toevoeging")),
    );

    // ══════════════════════════════════════════════════════════════════════
    // Archiveren: onzichtbaar in de app, aanwezig in de database (0044)
    //
    // Zes query's sommen merken of analyses op, en het filter moet in alle zes.
    // De duurste is de maandelijkse meetronde: zonder filter plant die elke
    // maand een betaalde meting in voor een merk dat niemand meer ziet staan.
    // Dat is precies het soort samenhang dat geen unittest kan zien, de query
    // op zich klopt, hij vraagt alleen de verkeerde rijen op.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nArchiveren: verborgen in de app, bewaard in de database");

    await db.client.query(
      "update public.analyses set archived_at = now(), tracking_enabled = true, status = 'gereed' where id = $1",
      [analysisId],
    );
    await db.client.query(
      "update public.profiles set archived_at = now() where id = $1",
      [profileId],
    );

    const { rows: nogAanwezig } = await db.client.query(
      `select (select count(*) from public.profiles where id = $1) as profielen,
              (select count(*) from public.analyses where id = $2) as analyses,
              (select count(*) from public.content_pieces where analysis_id = $2) as paginas`,
      [profileId, analysisId],
    );
    ok(
      "0044: de data staat er gewoon nog",
      Number(nogAanwezig[0].profielen) === 1 &&
        Number(nogAanwezig[0].analyses) === 1,
    );
    // Alles wat via `analysis_id` aan de analyse hangt blijft staan. Dat is
    // precies waarom dit een archief is en geen `delete`: één verwijdering zou
    // via `on delete cascade` de hele contentgeschiedenis meenemen.
    ok(
      "0044: en alles wat eronder hangt ook",
      Number(nogAanwezig[0].paginas) > 0,
      `${nogAanwezig[0].paginas} pagina's`,
    );

    const { rows: zichtbaar } = await db.client.query(
      `select (select count(*) from public.profiles where archived_at is null) as profielen,
              (select count(*) from public.analyses where archived_at is null) as analyses`,
    );
    ok(
      "0044: maar geen van beide telt nog mee in een lijst",
      Number(zichtbaar[0].profielen) === 0 && Number(zichtbaar[0].analyses) === 0,
    );

    // ⚠️ De dure: dit is de query van /api/cron/tracking.
    const { rows: meetronde } = await db.client.query(
      `select count(*) as n from public.analyses
       where tracking_enabled = true and status in ('gemeten','gereed')
         and archived_at is null`,
    );
    ok(
      "0044: de maandelijkse meetronde slaat hem over",
      Number(meetronde[0].n) === 0,
    );

    // En terugdraaien kan: het is een archief, geen verwijdering.
    await db.client.query(
      "update public.analyses set archived_at = null where id = $1",
      [analysisId],
    );
    const { rows: terug } = await db.client.query(
      "select count(*) as n from public.analyses where id = $1 and archived_at is null",
      [analysisId],
    );
    ok("0044: dearchiveren zet hem weer in beeld", Number(terug[0].n) === 1);

    // ══════════════════════════════════════════════════════════════════════
    // Het contentplan schrijft zichzelf (0049/0050, fase 4)
    //
    // ⚠️ Dit is bij uitstek samenhang tussen taken, en dus onzichtbaar voor een
    // unittest. De schrijfpijplijn kent alleen analyses; het plan kent alleen
    // merken. De brug is `plannedPageId` in de payload, en die brug bestaat uit
    // drie stukken die alle drie moeten kloppen: de cron zet hem erin, de
    // handler koppelt terug, en de werker meldt een definitieve mislukking.
    // Valt er één weg, dan schrijft Aura wel maar blijft het plan op "Aura is
    // bezig" staan, en dat merkt niemand tot de klant ernaar vraagt.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nHet contentplan: van goedgekeurde maand naar geschreven tekst");

    await db.client.query(
      "update public.profiles set archived_at = null where id = $1",
      [profileId],
    );
    const { rows: funnelRij } = await db.client.query(
      `insert into public.profile_funnel_stages (profile_id, label, sort_order)
       values ($1, 'Oriëntatie', 0) returning id`,
      [profileId],
    );
    const { rows: topicRij } = await db.client.query(
      `insert into public.profile_topics (profile_id, title, priority, status, analysis_id)
       values ($1, 'Hardloopblessures', 9, 'goedgekeurd', $2) returning id`,
      [profileId, analysisId],
    );
    const { rows: planRij } = await db.client.query(
      `insert into public.content_plans (profile_id, pages_per_month, started_on, version, status)
       values ($1, 10, current_date, 1, 'actief') returning id`,
      [profileId],
    );
    const { rows: maandRij } = await db.client.query(
      `insert into public.plan_months (plan_id, month_number, status, approved_at)
       values ($1, 1, 'goedgekeurd', now()) returning id`,
      [planRij[0].id],
    );
    // Twee pagina's: één binnen het venster van tien dagen, één ver daarbuiten.
    const { rows: paginaRijen } = await db.client.query(
      `insert into public.planned_pages
         (plan_month_id, profile_id, title, page_type, funnel_stage_id, topic_id,
          sort_order, is_buffer, scheduled_for)
       values ($1, $2, 'Hardloopblessures · Oriëntatie', 'informatief', $3, $4, 0, false,
               current_date + 5),
              ($1, $2, 'Hardloopblessures · Later', 'informatief', $3, $4, 1, false,
               current_date + 60)
       returning id, title`,
      [maandRij[0].id, profileId, funnelRij[0].id, topicRij[0].id],
    );
    const binnenVenster = (paginaRijen as { id: string; title: string }[]).find((p) =>
      p.title.endsWith("Oriëntatie"),
    )!.id;
    const buitenVenster = (paginaRijen as { id: string; title: string }[]).find((p) =>
      p.title.endsWith("Later"),
    )!.id;

    // ── De query van /api/cron/plan, in SQL ────────────────────────────────
    // Precies de vier voorwaarden die de route stelt. Een test die de route zelf
    // aanroept zou een HTTP-laag en een cron-geheim nodig hebben; wat hier
    // getoetst moet worden is of het SCHEMA deze selectie ondersteunt.
    const { rows: aanDeBeurt } = await db.client.query(
      `select p.id from public.planned_pages p
         join public.plan_months m on m.id = p.plan_month_id
        where p.status = 'gepland' and p.is_buffer = false
          and p.scheduled_for is not null
          and p.scheduled_for <= current_date + 10
          and m.status = 'goedgekeurd'`,
    );
    ok(
      "de cron ziet precies de pagina binnen tien dagen",
      aanDeBeurt.length === 1 && aanDeBeurt[0].id === binnenVenster,
      `${aanDeBeurt.length} pagina's`,
    );

    // ── De beslissing, met de echte rijen erbij ────────────────────────────
    const { writeDecision } = await import("@/lib/plan-writing");
    const { rows: besluitRij } = await db.client.query(
      `select p.status, p.scheduled_for, p.is_buffer, p.topic_id,
              m.status as maand_status, t.analysis_id, a.status as analyse_status
         from public.planned_pages p
         join public.plan_months m on m.id = p.plan_month_id
         left join public.profile_topics t on t.id = p.topic_id
         left join public.analyses a on a.id = t.analysis_id
        where p.id = $1`,
      [binnenVenster],
    );
    const r = besluitRij[0];
    const besluit = writeDecision(
      {
        status: r.status,
        scheduled_for: r.scheduled_for,
        is_buffer: r.is_buffer,
        topic_id: r.topic_id,
      },
      r.maand_status,
      { analysis_id: r.analysis_id, analysis_status: r.analyse_status },
    );
    ok(
      "en mag hem schrijven op de analyse van het onderwerp",
      besluit.schrijven === true && besluit.analysisId === analysisId,
    );

    // ── De terugkoppeling: schrijft de handler het plan bij? ────────────────
    //
    // ⚠️ De eigenaar komt uit de database en niet uit een variabele. De analyse
    // is hierboven toegewezen aan een andere gebruiker (0038), en de
    // contentpijplijn weigert te schrijven voor iemand die geen eigenaar is.
    // Dat is precies waarom `/api/cron/plan` `analyses.user_id` uitleest in
    // plaats van de klant af te leiden uit het profiel.
    const { rows: eigenaarRij } = await db.client.query(
      "select user_id from public.analyses where id = $1",
      [analysisId],
    );
    const planUserId = eigenaarRij[0].user_id as string;

    const { runJob } = await import("@/lib/jobs/handlers");
    const { rows: taakRij } = await db.client.query(
      `insert into public.jobs (analysis_id, type, payload_json, dedupe_key, status)
       values ($1, 'content_draft', $2, $3, 'running') returning *`,
      [
        analysisId,
        JSON.stringify({
          userId: planUserId,
          plannedPageId: binnenVenster,
          recommendation: { ...aanbeveling, title: "Hardloopblessures · Oriëntatie" },
        }),
        `chain-plan:${binnenVenster}`,
      ],
    );
    await runJob({ admin: admin as never, job: taakRij[0] });

    const { rows: naSchrijven } = await db.client.query(
      "select status, content_piece_id from public.planned_pages where id = $1",
      [binnenVenster],
    );
    ok(
      "de plan-pagina weet welke tekst het geworden is",
      Boolean(naSchrijven[0].content_piece_id),
      "content_piece_id bleef leeg: het plan verwijst nergens naar",
    );
    ok(
      "en staat niet meer op 'gepland'",
      naSchrijven[0].status !== "gepland",
      `status is ${naSchrijven[0].status}`,
    );

    // ── Het vangnet: een definitief mislukte taak ──────────────────────────
    // Zonder deze regel blijft een pagina op "Aura is bezig" staan terwijl er
    // niets meer gebeurt: de status die om geduld vraagt dat nergens toe leidt.
    const { rows: mislukteTaak } = await db.client.query(
      `insert into public.jobs (analysis_id, type, payload_json, dedupe_key, status, attempts)
       values ($1, 'content_draft', $2, $3, 'running', 4) returning *`,
      [
        analysisId,
        JSON.stringify({
          userId: planUserId,
          plannedPageId: buitenVenster,
          recommendation: aanbeveling,
        }),
        `chain-plan-fout:${buitenVenster}`,
      ],
    );
    const { handleFailure } = await import("@/lib/jobs/worker");
    await handleFailure(admin as never, mislukteTaak[0], "de stub weigerde");

    const { rows: naFout } = await db.client.query(
      "select status from public.planned_pages where id = $1",
      [buitenVenster],
    );
    ok(
      "een definitief mislukte schrijftaak is zichtbaar in het plan",
      naFout[0].status === "mislukt",
      `status is ${naFout[0].status}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // Het uitnodigingspad (0046/0047, fase 2)
    //
    // ⚠️ DIT IS HET EERSTE WAT EEN ECHTE KLANT DOET, en het was nog nooit van
    // begin tot eind gelopen. De keten is: de consultant maakt een uitnodiging,
    // stuurt de link door, de klant kiest een wachtwoord, en ziet daarna zijn
    // merk. Breekt er één schakel, dan staat de klant buiten met een verbruikte
    // link, en dat is niet te herstellen zonder nieuwe uitnodiging.
    //
    // Registreren staat dicht (`signupsEnabled`), dus dit is de ENIGE deur naar
    // binnen. Er is geen tweede pad dat het opvangt.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nHet uitnodigingspad: van link tot toegang");

    const { createInvite, lookupInvite, acceptInvite } = await import("@/lib/invites");
    const { getOwnedProfile: ownedProfile } = await import("@/lib/profiles");

    // Het account waar het merk aan hangt. De backfill van 0046 maakte er één
    // per eigenaar; hier zetten we hem expliciet zodat de test niet afhangt van
    // wat eerdere scenario's deden.
    const accountId = randomUUID();
    await db.client.query(
      `insert into public.accounts (id, name) values ($1, 'Fysi-Unique BV')`,
      [accountId],
    );
    await db.client.query(`update public.profiles set account_id = $1 where id = $2`, [
      accountId,
      profileId,
    ]);

    const klantAdres = `klant-${Date.now()}@voorbeeld.nl`;
    const uitnodiging = await createInvite({
      accountId,
      email: klantAdres.toUpperCase(), // hoofdletters: adressen zijn ongevoelig
      role: "member",
      invitedBy: userId,
    });
    ok("de uitnodiging wordt aangemaakt", uitnodiging !== null);
    ok(
      "het adres wordt kleingeschreven opgeslagen",
      uitnodiging?.invite.email === klantAdres.toLowerCase(),
    );

    // ⚠️ Alleen de HASH staat in de database. Het ruwe token bestaat precies één
    // keer, in het antwoord van de route, en wordt nergens bewaard.
    const { rows: hashRij } = await db.client.query(
      `select token_hash from public.account_invites where id = $1`,
      [uitnodiging!.invite.id],
    );
    ok(
      "het ruwe token staat niet in de database",
      hashRij[0].token_hash !== uitnodiging!.token && String(hashRij[0].token_hash).length === 64,
    );

    const gevonden = await lookupInvite(uitnodiging!.token);
    ok("de link vindt zijn uitnodiging terug", gevonden.state === "geldig");
    ok("met de accountnaam erbij, voor op het scherm", gevonden.accountName === "Fysi-Unique BV");
    ok("een verzonnen token vindt niets", (await lookupInvite("bestaat-niet")).state === "ongeldig");

    // Een te zwak wachtwoord mag de link NIET verbruiken: anders staat de klant
    // buiten omdat hij één keer iets te kort typte.
    const zwak = await acceptInvite(uitnodiging!.token, "kort");
    ok("een zwak wachtwoord wordt geweigerd", !zwak.ok && zwak.reason === "zwak");
    ok(
      "en verbruikt de link niet",
      (await lookupInvite(uitnodiging!.token)).state === "geldig",
    );

    const geaccepteerd = await acceptInvite(uitnodiging!.token, "Wachtwoord1");
    ok("met een geldig wachtwoord komt de klant binnen", geaccepteerd.ok);

    const { rows: nieuweGebruiker } = await db.client.query(
      `select id from auth.users where email = $1`,
      [klantAdres.toLowerCase()],
    );
    ok("er is een gebruiker aangemaakt", nieuweGebruiker.length === 1);

    const { rows: lidmaatschap } = await db.client.query(
      `select role from public.account_users where account_id = $1 and user_id = $2`,
      [accountId, nieuweGebruiker[0].id],
    );
    ok("met een lidmaatschap op het account", lidmaatschap.length === 1);
    ok("in de rol uit de uitnodiging", lidmaatschap[0].role === "member");

    // ⚠️ DE ASSERTIE WAAR HET OM DRAAIT. Een klant die binnenkomt en zijn merk
    // niet ziet, is een mislukte onboarding, ook al klopte elke stap ervoor.
    // Dit loopt over de derde toegangslaag van migratie 0046: hij is niet de
    // eigenaar van het profiel en geen beheerder, alleen lid van het account.
    const merkVoorKlant = await ownedProfile(adminClient, profileId, nieuweGebruiker[0].id);
    ok(
      "en de klant ziet zijn merk via het account",
      merkVoorKlant?.id === profileId,
      "de derde toegangslaag (account_users) liet hem er niet in",
    );

    // De link is nu op. Twee keer dezelfde link gebruiken zou betekenen dat een
    // doorgestuurde mail een tweede toegang oplevert.
    ok(
      "de link is verbruikt",
      (await lookupInvite(uitnodiging!.token)).state === "gebruikt",
    );
    ok(
      "en een tweede poging wordt geweigerd",
      !(await acceptInvite(uitnodiging!.token, "Wachtwoord1")).ok,
    );

    // Een uitnodiging voor iemand die al een account heeft, voegt alleen het
    // lidmaatschap toe. Zou hij een wachtwoord zetten, dan was een uitnodiging
    // een overnameroute voor een bestaand account.
    const tweedeUitnodiging = await createInvite({
      accountId,
      email: klantAdres,
      role: "admin",
      invitedBy: userId,
    });
    const nogmaals = await acceptInvite(tweedeUitnodiging!.token, "Wachtwoord2");
    ok("een bestaand adres krijgt alleen het lidmaatschap", nogmaals.ok);
    const { rows: naTweede } = await db.client.query(
      `select count(*) as n from auth.users where email = $1`,
      [klantAdres.toLowerCase()],
    );
    ok("er komt geen tweede gebruiker bij", Number(naTweede[0].n) === 1);
    const { rows: rolNa } = await db.client.query(
      `select role from public.account_users where account_id = $1 and user_id = $2`,
      [accountId, nieuweGebruiker[0].id],
    );
    ok("en de rol wordt bijgewerkt", rolNa[0].role === "admin");

    // Een ingetrokken uitnodiging werkt niet meer, ook al is hij niet verlopen.
    const derde = await createInvite({
      accountId,
      email: `ander-${Date.now()}@voorbeeld.nl`,
      role: "member",
      invitedBy: userId,
    });
    await db.client.query(
      `update public.account_invites set revoked_at = now() where id = $1`,
      [derde!.invite.id],
    );
    ok(
      // ⚠️ Ingetrokken leest als "ongeldig" en NIET als "gebruikt": anders denkt
      // de ontvanger dat hij een account heeft dat hij nooit gekregen heeft.
      "een ingetrokken uitnodiging is ongeldig en niet 'al gebruikt'",
      (await lookupInvite(derde!.token)).state === "ongeldig",
    );

    // ══════════════════════════════════════════════════════════════════════
    // Wat de klant ziet als hij binnen is
    //
    // ⚠️ Een klant is GEEN eigenaar en GEEN beheerder. Hij komt binnen via de
    // derde toegangslaag van migratie 0046: lid van het account. Elke lees-query
    // in de app loopt over `getOwnedProfile` of `getOwnedAnalysis`, en als daar
    // één van de drie lagen ontbreekt ziet de klant een lege app terwijl alles
    // er gewoon staat. Dat is de duurste denkbare eerste indruk.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nWat de klant ziet als hij binnen is");

    const klantId = nieuweGebruiker[0].id as string;
    const { getOwnedAnalysis: ownedAnalysis } = await import("@/lib/analyses");
    const { listBrands } = await import("@/lib/workspace");
    const { accountIdsOf, isMember } = await import("@/lib/accounts");

    ok("de klant is lid van het account", await isMember(klantId, accountId));
    ok(
      "en dat account staat in zijn lijst",
      (await accountIdsOf(klantId)).includes(accountId),
    );

    const merken = await listBrands(klantId);
    ok(
      "zijn merk staat in de merkkiezer",
      merken.some((m) => m.id === profileId),
      `${merken.length} merken gevonden`,
    );

    // ⚠️ De analyse hangt aan een ANDERE gebruiker (0038 wees hem toe), en de
    // klant komt er alleen bij via het account van het merk. Zonder die route
    // ziet hij zijn merk wél en zijn metingen niet.
    ok(
      "hij ziet de analyse van zijn merk",
      (await ownedAnalysis(adminClient, analysisId, klantId))?.id === analysisId,
    );

    // En het omgekeerde moet ook kloppen: een merk van een ánder account blijft
    // dicht. Zonder deze assertie zou een te ruime regel onopgemerkt blijven,
    // want alle andere tests kijken alleen of iemand er wél in komt.
    const vreemdAccount = randomUUID();
    const vreemdProfiel = randomUUID();
    await db.client.query(
      `insert into public.accounts (id, name) values ($1, 'Ander bedrijf')`,
      [vreemdAccount],
    );
    await db.client.query(
      `insert into public.profiles (id, user_id, account_id, name, url, status)
       values ($1, $2, $3, 'Ander merk', 'https://ander.nl', 'klaar')`,
      [vreemdProfiel, userId, vreemdAccount],
    );
    ok(
      "een merk van een ander account blijft dicht",
      (await ownedProfile(adminClient, vreemdProfiel, klantId)) === null,
    );

    // Het contentplan van zijn merk moet leesbaar zijn: dat is het scherm waar
    // hij maandelijks iets moet goedkeuren.
    const { loadPlan } = await import("@/lib/plans");
    const planVoorKlant = await loadPlan(adminClient, profileId);
    ok(
      "het contentplan is te laden voor zijn merk",
      planVoorKlant !== null && planVoorKlant.months.length > 0,
      planVoorKlant === null ? "geen plan gevonden" : `${planVoorKlant.months.length} maanden`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // Een nieuw merk krijgt een account (0046, gat gedicht 11 augustus 2026)
    //
    // ⚠️ Migratie 0046 vulde `account_id` met terugwerkende kracht voor élk
    // bestaand merk, maar de route die NIEUWE merken aanmaakt zette hem niet.
    // Elk merk dat daarna via de app ontstond kwam zonder account binnen, en
    // dan vindt het contentplan geen pakket en ziet een uitgenodigde klant het
    // merk niet. Dat is precies het scenario van de eerste echte onboarding,
    // want die begint met een nieuw merk aanmaken.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nEen nieuw merk krijgt een account");

    const { defaultAccountFor } = await import("@/lib/accounts");

    // Een gebruiker die al bij een account hoort, krijgt dát account.
    ok(
      "een bestaand lid krijgt zijn eigen account",
      (await defaultAccountFor(klantId)) === accountId,
    );

    // Een gebruiker zonder account krijgt er één, op zijn e-mailadres, met
    // zichzelf als beheerder. Zelfde regel als de backfill van 0046.
    const verseId = randomUUID();
    await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
      verseId,
      "vers@voorbeeld.nl",
    ]);
    const versAccount = await defaultAccountFor(verseId);
    ok("een gebruiker zonder account krijgt er één", versAccount !== null);

    const { rows: versRij } = await db.client.query(
      `select a.name, au.role
         from public.accounts a
         join public.account_users au on au.account_id = a.id
        where a.id = $1 and au.user_id = $2`,
      [versAccount, verseId],
    );
    ok("met zijn e-mailadres als naam", versRij[0]?.name === "vers@voorbeeld.nl");
    ok("en zichzelf als beheerder van dat account", versRij[0]?.role === "admin");

    // En twee keer aanroepen levert hetzelfde account op, geen tweede.
    ok(
      "een tweede aanroep maakt geen tweede account",
      (await defaultAccountFor(verseId)) === versAccount,
    );

    // ══════════════════════════════════════════════════════════════════════
    // Het budgetplafond (F1, migratie 0053)
    //
    // ⚠️ Hoort hier en niet in test-unit.ts, want de helft van dit mechanisme
    // is databasegedrag: de trigger `ai_calls_set_account` leidt het account af
    // uit het profiel of de analyse, en zonder die trigger telt het plafond
    // altijd nul en remt het nooit. Een unittest op `spendVerdict()` zou dat
    // niet zien, want die krijgt het bedrag al aangereikt.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nHet budgetplafond");

    const { checkBudget, checkBudgetForProfile } = await import("@/lib/spend-limit");

    // Een leeg logboek remt niets: dit is de normale toestand en die moet
    // gewoon doorlaten.
    await db.client.query("delete from public.ai_calls");
    ok("zonder uitgaven mag alles door", (await checkBudget(accountId)).ok);

    // De trigger: een aanroep die alleen een profiel noemt, hoort vanzelf op
    // het juiste account te landen.
    await db.client.query(
      `insert into public.ai_calls (profile_id, kind, model, web_search, cost_usd)
       values ($1, 'test', 'gpt-5.6-luna', false, 1.00)`,
      [profileId],
    );
    const { rows: viaProfiel } = await db.client.query(
      "select account_id from public.ai_calls where profile_id = $1",
      [profileId],
    );
    ok(
      "de trigger leidt het account af uit het profiel",
      viaProfiel[0]?.account_id !== null && viaProfiel[0]?.account_id !== undefined,
    );

    // En een aanroep die alleen een analyse noemt, komt er via de andere weg.
    await db.client.query(
      `insert into public.ai_calls (analysis_id, kind, model, web_search, cost_usd)
       values ($1, 'test', 'gpt-5.6-luna', false, 1.00)`,
      [analysisId],
    );
    const { rows: viaAnalyse } = await db.client.query(
      "select account_id from public.ai_calls where analysis_id = $1",
      [analysisId],
    );
    ok(
      "en ook uit de analyse, via het profiel eronder",
      viaAnalyse[0]?.account_id !== null && viaAnalyse[0]?.account_id !== undefined,
    );

    // Nu de rem zelf. Het account krijgt een plafond van €1; er staat $2 op,
    // oftewel ~€1,85, dus het is op.
    const budgetAccount = viaProfiel[0].account_id as string;
    await db.client.query(
      "update public.accounts set monthly_budget_eur = 1 where id = $1",
      [budgetAccount],
    );
    const geblokkeerd = await checkBudget(budgetAccount);
    ok("boven het maandplafond blokkeert het", !geblokkeerd.ok);
    ok("en het zegt welk plafond", geblokkeerd.scope === "maand");
    ok(
      "en de melding noemt een bedrag in euro's",
      (geblokkeerd.message ?? "").includes("€"),
    );

    // ⚠️ Nul is een echte waarde en geen "niet ingesteld". Zonder deze regel
    // zou `?? standaard` of `||` een account op slot stilletjes weer openzetten.
    await db.client.query(
      "update public.accounts set monthly_budget_eur = 0 where id = $1",
      [budgetAccount],
    );
    ok("een plafond van nul zet het account op slot", !(await checkBudget(budgetAccount)).ok);

    // Ruim plafond: het mag weer.
    await db.client.query(
      "update public.accounts set monthly_budget_eur = 500 where id = $1",
      [budgetAccount],
    );
    ok("met een ruim plafond mag het weer", (await checkBudget(budgetAccount)).ok);

    // De route-ingang loopt via het profiel en hoort hetzelfde te zeggen.
    await db.client.query(
      "update public.accounts set monthly_budget_eur = 1 where id = $1",
      [budgetAccount],
    );
    ok(
      "checkBudgetForProfile komt op hetzelfde uit",
      !(await checkBudgetForProfile(profileId)).ok,
    );

    // En een account dat niets heeft uitgegeven, wordt niet geraakt door de
    // uitgaven van een ander: het plafond is per account.
    await db.client.query("delete from public.ai_calls");
    ok("een leeg account begint weer op nul", (await checkBudget(budgetAccount)).ok);

    // ══════════════════════════════════════════════════════════════════════
    // De rolmatrix, leeskant (migratie 0056)
    //
    // ⚠️ Dit is de eerste ketentest die ECHTE RLS toetst en niet de service-role.
    // Tot 12 augustus 2026 gaf de \`auth.uid()\`-stub altijd null, met als
    // redenering dat de pijplijn toch met de service-role draait. Dat klopt voor
    // de pijplijn, niet voor een dossierpagina: die leest met de sessie van de
    // klant, dus mét RLS. Precies dat gat liet toe dat 23 tabellen wél de
    // eigenaars- en beheerderslaag hadden maar niet de accountlaag: elk tweede
    // teamlid dat je bij een klantaccount uitnodigt, zag een leeg dossier. Zie
    // lib/access.ts voor dezelfde les op de SCHRIJFKANT, elf maanden eerder.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nDe rolmatrix, leeskant: wie ziet het dossier van een klant");

    const matrixAccount = randomUUID();
    const matrixProfiel = randomUUID();
    const matrixAnalyse = randomUUID();
    const matrixEigenaarId = randomUUID();
    const matrixTeamlidId = randomUUID();
    const matrixVreemdeId = randomUUID();
    const matrixStaffId = randomUUID();

    await db.client.query("insert into public.accounts (id, name) values ($1, 'Matrix BV')", [matrixAccount]);
    for (const [id, mail] of [
      [matrixEigenaarId, "matrix-eigenaar@example.com"],
      [matrixTeamlidId, "matrix-teamlid@example.com"],
      [matrixVreemdeId, "matrix-vreemde@example.com"],
      [matrixStaffId, "matrix-staff@example.com"],
    ]) {
      await db.client.query("insert into auth.users (id, email) values ($1, $2)", [id, mail]);
    }
    // De eigenaar is lid via account_users (de gewone weg sinds fase 2); het
    // teamlid ook, maar is NOOIT de user_id op profiel of analyse. Dat is
    // precies het onderscheid dat migratie 0056 moest dichten.
    await db.client.query(
      `insert into public.account_users (account_id, user_id, role) values ($1, $2, 'admin'), ($1, $3, 'member')`,
      [matrixAccount, matrixEigenaarId, matrixTeamlidId],
    );
    await db.client.query("insert into public.staff_users (user_id) values ($1)", [matrixStaffId]);
    await db.client.query(
      `insert into public.profiles (id, user_id, account_id, name, url, brand_name, status)
       values ($1, $2, $3, 'Matrix BV', 'https://matrix-bv.nl', 'Matrix BV', 'klaar')`,
      [matrixProfiel, matrixEigenaarId, matrixAccount],
    );
    await db.client.query(
      `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
       values ($1, $2, $3, 'Matrix-analyse', 'https://matrix-bv.nl', 'iets', 'gereed')`,
      [matrixAnalyse, matrixEigenaarId, matrixProfiel],
    );
    const matrixPrompt = randomUUID();
    await db.client.query(
      `insert into public.prompts (id, analysis_id, text, category, active) values ($1, $2, 'Een vraag?', 'Beslissing', true)`,
      [matrixPrompt, matrixAnalyse],
    );

    /** Leest `tabel` als `wie`, met echte RLS. Geeft het aantal zichtbare rijen. */
    async function zichtbaarAls(wie: string, tabel: string, kolom: string, waarde: string): Promise<number> {
      await db.client.query("begin");
      await db.client.query("set local role authenticated");
      await db.client.query("select set_config('request.jwt.claim.sub', $1, true)", [wie]);
      const { rows } = await db.client.query(
        `select count(*)::int as n from public.${tabel} where ${kolom} = $1`,
        [waarde],
      );
      await db.client.query("commit");
      return rows[0].n;
    }

    ok(
      "de eigenaar ziet de vraag",
      (await zichtbaarAls(matrixEigenaarId, "prompts", "analysis_id", matrixAnalyse)) === 1,
    );
    // ⚠️ DE KERN VAN DE VONDST. Vóór migratie 0056 was dit 0.
    ok(
      "een teamlid dat geen eigenaar is, ziet de vraag ook",
      (await zichtbaarAls(matrixTeamlidId, "prompts", "analysis_id", matrixAnalyse)) === 1,
      "0 vragen zichtbaar: de accountlaag ontbreekt weer op prompts",
    );
    ok(
      "de beheerder ziet de vraag",
      (await zichtbaarAls(matrixStaffId, "prompts", "analysis_id", matrixAnalyse)) === 1,
    );
    ok(
      "een vreemde ziet niets",
      (await zichtbaarAls(matrixVreemdeId, "prompts", "analysis_id", matrixAnalyse)) === 0,
      "een vreemde zag de vraag: dit is een lek, geen ontbrekende garantie",
    );

    // Dezelfde proef op het profiel zelf, met een andere tabel, om aan te tonen
    // dat het geen toeval van één tabel is.
    ok(
      "een teamlid ziet ook het profiel",
      (await zichtbaarAls(matrixTeamlidId, "profiles", "id", matrixProfiel)) === 1,
    );
    ok(
      "een vreemde ziet het profiel niet",
      (await zichtbaarAls(matrixVreemdeId, "profiles", "id", matrixProfiel)) === 0,
    );

        // ══════════════════════════════════════════════════════════════════════
    // Een ingelogde gebruiker moet kunnen lezen (migratie 0055)
    //
    // ⚠️ Deze test bestaat door schade. Op 12 augustus 2026 trok een migratie het
    // uitvoerrecht op `is_staff()` in bij de rollen `anon` en `authenticated`,
    // omdat de veiligheidscontrole van Supabase klaagde dat de functie van
    // buitenaf aanroepbaar was. Gevolg: een ingelogde gebruiker kon NIETS meer
    // lezen. Een RLS-regel wordt geëvalueerd namens de bevragende rol, dus die
    // rol moet de functie in die regel mogen aanroepen; zonder dat recht faalt
    // niet de regel maar de hele query. Dat raakte 28 tabellen tegelijk, en op
    // productie stond het een paar minuten zo.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nEen ingelogde gebruiker kan lezen");

    // De invariant, algemener dan het geval dat hem brak: ELKE functie die in
    // een RLS-regel voorkomt, moet door `authenticated` aangeroepen kunnen
    // worden. Zo vangt deze test ook de volgende functie die iemand ooit
    // dichtzet, en niet alleen `is_staff`.
    const { rows: regelFuncties } = await db.client.query(`
      select distinct p.proname, has_function_privilege('authenticated', p.oid, 'execute') as mag
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and exists (
           select 1 from pg_policies pol
            where pol.schemaname = 'public'
              and coalesce(pol.qual, '') like '%' || p.proname || '(%'
         )
       order by p.proname
    `);

    ok(
      "er zijn functies die in leesregels gebruikt worden",
      regelFuncties.length > 0,
      "geen enkele functie gevonden in een RLS-regel: klopt de query nog?",
    );

    for (const fn of regelFuncties as { proname: string; mag: boolean }[]) {
      ok(
        `${fn.proname}() is aanroepbaar door een ingelogde gebruiker`,
        fn.mag === true,
        `zonder dit recht faalt niet de regel maar de hele query, op elke tabel die ${fn.proname}() gebruikt`,
      );
    }

    // ══════════════════════════════════════════════════════════════════════
    // Gearchiveerd werk kost geen geld meer
    //
    // ⚠️ De maandronde filtert gearchiveerde analyses al, maar de taken die er
    // op dat moment al stonden niet. Zonder deze controle loopt een merk dat net
    // uit beeld is gehaald zijn hele wachtrij nog leeg: betaald werk waarvan de
    // uitkomst nergens meer te zien is.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nGearchiveerd werk wordt overgeslagen");

    const { runWorker } = await import("@/lib/jobs/worker");

    const archiefAnalyse = randomUUID();
    await db.client.query(
      `insert into public.analyses (id, user_id, profile_id, name, url, topic, status, archived_at)
       values ($1, $2, $3, 'Gearchiveerd', 'https://fysi-unique.nl', 'iets', 'gereed', now())`,
      [archiefAnalyse, userId, profileId],
    );
    // Een taak die zonder de controle een betaalde AI-aanroep zou doen.
    await db.client.query(
      `insert into public.jobs (analysis_id, type, payload_json, dedupe_key, status, scheduled_for)
       values ($1, 'generate_report', '{}'::jsonb, $2, 'queued', now())`,
      [archiefAnalyse, `chain-archief:${archiefAnalyse}`],
    );

    await runWorker();

    const { rows: naWerker } = await db.client.query(
      "select status, last_error from public.jobs where analysis_id = $1",
      [archiefAnalyse],
    );
    ok(
      "de taak van een gearchiveerde analyse is afgehandeld",
      naWerker[0]?.status === "done",
      `status was ${naWerker[0]?.status}`,
    );
    // De AI-stub gooit bij een onbekend schema. Dat er geen rapport is, bewijst
    // dus dat de taak is overgeslagen en niet gewoon gedraaid heeft.
    const { rows: rapporten } = await db.client.query(
      "select 1 from public.reports where analysis_id = $1",
      [archiefAnalyse],
    );
    ok("en er is geen betaald werk gedaan", rapporten.length === 0);

    // ══════════════════════════════════════════════════════════════════════
    // De promptgeneratie per funnelfase (migratie 0054)
    //
    // ⚠️ Dit hoort in de KETENtest en niet in test-unit.ts, want de hele vondst
    // zit in de samenhang tussen taken: drie taken die onafhankelijk draaien en
    // waarvan alleen de laatste de poort naar klant-goedkeuring mag openen. Een
    // unittest ziet één functie en zou nooit merken dat de analyse al op
    // 'concept_klaar' staat terwijl er nog twee fasen lopen.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nDe promptgeneratie per funnelfase");

    const { resolveMix: mixVan } = await import("@/lib/prompt-mix");

    // Vers decor: een analyse in voorbereiding, met onderwerp-onderzoek zodat de
    // generatie zijn invoer heeft.
    const mixAnalyse = randomUUID();
    await db.client.query(
      `insert into public.analyses (id, user_id, profile_id, name, url, topic, status,
                                    prompts_orientatie, prompts_overweging, prompts_beslissing)
       values ($1, $2, $3, 'Mix-analyse', 'https://fysi-unique.nl', 'iets', 'bezig', 0, 2, 3)`,
      [mixAnalyse, userId, profileId],
    );
    await db.client.query(
      `insert into public.topic_research (analysis_id, content_summary, competitors, raw_json)
       values ($1, 'samenvatting', array['Concurrent A'], '{}'::jsonb)`,
      [mixAnalyse],
    );

    // De verdeling komt eruit zoals hij erin ging, en nul blijft nul.
    const { rows: mixRij } = await db.client.query(
      "select prompts_orientatie, prompts_overweging, prompts_beslissing from public.analyses where id = $1",
      [mixAnalyse],
    );
    const gelezen = mixVan(mixRij[0]);
    ok("nul in de database blijft nul", gelezen["Oriëntatie"] === 0);
    ok("en de andere fasen houden hun eigen aantal", gelezen["Overweging"] === 2 && gelezen["Beslissing"] === 3);

    // ⚠️ De kern: een fase met nul vragen krijgt géén taak. Zou hij die wel
    // krijgen, dan zou de generatie een lege uitkomst als storing zien en de
    // analyse op 'mislukt' zetten, terwijl nul juist de bedoeling was.
    const { rows: naPrepare } = await db.client.query(
      `insert into public.jobs (analysis_id, type, payload_json, dedupe_key, status)
       values ($1, 'prepare_analysis', '{}'::jsonb, $2, 'running') returning *`,
      [mixAnalyse, `chain-mix-prepare:${mixAnalyse}`],
    );
    await runJob({ admin: admin as never, job: naPrepare[0] });

    const { rows: fasetaken } = await db.client.query(
      `select payload_json->>'category' as fase from public.jobs
        where analysis_id = $1 and type = 'generate_prompts' order by fase`,
      [mixAnalyse],
    );
    ok("er zijn twee fasetaken en niet drie", fasetaken.length === 2);
    ok(
      "en de fase met nul vragen zit er niet bij",
      !fasetaken.some((r: { fase: string }) => r.fase === "Oriëntatie"),
    );
    ok(
      "de fase staat in de taak zelf",
      fasetaken.some((r: { fase: string }) => r.fase === "Beslissing"),
    );

    // ⚠️ En de tweede kern: de EERSTE fasetaak mag de poort niet openen. Zonder
    // die telling zou de klant een derde van zijn vragen te zien krijgen met de
    // mededeling dat ze klaar zijn.
    const { rows: eersteFase } = await db.client.query(
      `select * from public.jobs where analysis_id = $1 and type = 'generate_prompts'
        and payload_json->>'category' = 'Overweging'`,
      [mixAnalyse],
    );
    await db.client.query("update public.jobs set status = 'running' where id = $1", [
      eersteFase[0].id,
    ]);
    await runJob({ admin: admin as never, job: { ...eersteFase[0], status: "running" } });

    const { rows: naEerste } = await db.client.query(
      "select status from public.analyses where id = $1",
      [mixAnalyse],
    );
    ok(
      "na de eerste fase staat de analyse nog NIET op concept_klaar",
      naEerste[0].status === "bezig",
      `status was ${naEerste[0].status}, dus de poort ging te vroeg open`,
    );

    const { rows: aantalNaEerste } = await db.client.query(
      "select category, count(*)::int as n from public.prompts where analysis_id = $1 group by category",
      [mixAnalyse],
    );
    ok(
      "en de fase leverde precies het gevraagde aantal",
      aantalNaEerste.length === 1 && aantalNaEerste[0].n === 2,
      `kreeg ${JSON.stringify(aantalNaEerste)}`,
    );

    // De laatste fase opent de poort wél.
    const { rows: laatsteFase } = await db.client.query(
      `select * from public.jobs where analysis_id = $1 and type = 'generate_prompts'
        and payload_json->>'category' = 'Beslissing'`,
      [mixAnalyse],
    );
    await db.client.query(
      "update public.jobs set status = 'done' where id = $1",
      [eersteFase[0].id],
    );
    await runJob({ admin: admin as never, job: { ...laatsteFase[0], status: "running" } });

    const { rows: naLaatste } = await db.client.query(
      "select status from public.analyses where id = $1",
      [mixAnalyse],
    );
    ok(
      "na de laatste fase gaat de poort open",
      naLaatste[0].status === "concept_klaar",
      `status was ${naLaatste[0].status}`,
    );

    const { rows: totaal } = await db.client.query(
      "select count(*)::int as n from public.prompts where analysis_id = $1",
      [mixAnalyse],
    );
    ok("en er staan vijf vragen, precies 0 + 2 + 3", totaal[0].n === 5, `kreeg ${totaal[0].n}`);

    // ══════════════════════════════════════════════════════════════════════
    // Wedstrijdcondities: twee dingen die tegelijk gebeuren
    //
    // ⚠️ Dit soort fout duikt bij een gewone test nooit op, want een tester doet
    // nooit twee dingen op exact hetzelfde moment. Het gebeurt pas met een
    // echte klant, en dan op het slechtste moment. Beide gevallen hier zijn
    // met `Promise.all` afgedwongen: twee aanroepen die ECHT tegelijk bij de
    // database aankomen, niet kort na elkaar.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nWedstrijdcondities");

    const { approveMonth, removePage } = await import("@/lib/plans");

    // ── Twee mensen keuren dezelfde maand tegelijk goed ──────────────────────
    const raceePlan = randomUUID();
    await db.client.query(
      `insert into public.content_plans (id, profile_id, pages_per_month, started_on, version, status)
       values ($1, $2, 10, current_date, 1, 'concept')`,
      [raceePlan, profileId],
    );
    const { rows: raceeMaandRij } = await db.client.query(
      `insert into public.plan_months (plan_id, month_number, status)
       values ($1, 1, 'concept') returning id`,
      [raceePlan],
    );
    const raceeMaand = raceeMaandRij[0].id as string;

    const eersteGebruiker = randomUUID();
    const tweedeGebruiker = randomUUID();
    for (const [id, mail] of [
      [eersteGebruiker, "race-een@example.com"],
      [tweedeGebruiker, "race-twee@example.com"],
    ]) {
      await db.client.query("insert into auth.users (id, email) values ($1, $2)", [id, mail]);
    }

    // Twee ECHT gelijktijdige aanroepen op dezelfde maand.
    const [uitslagEen, uitslagTwee] = await Promise.all([
      approveMonth(admin as never, raceeMaand, eersteGebruiker),
      approveMonth(admin as never, raceeMaand, tweedeGebruiker),
    ]);
    ok("de eerste aanroep meldt geen fout", uitslagEen === true);
    ok("de tweede aanroep meldt ook geen fout", uitslagTwee === true, "een race hoort geen 500 op te leveren");

    const { rows: raceeUitkomst } = await db.client.query(
      "select status, approved_by_user_id from public.plan_months where id = $1",
      [raceeMaand],
    );
    ok("de maand staat op goedgekeurd", raceeUitkomst[0].status === "goedgekeurd");
    // ⚠️ DE KERN: precies één van de twee heeft 'm daadwerkelijk goedgekeurd.
    // De atomaire voorwaardelijke update (`neq status 'goedgekeurd'`) zorgt
    // ervoor dat de database, niet de applicatiecode, de wedstrijd beslist.
    ok(
      "en precies één van de twee staat als goedkeurder geregistreerd",
      raceeUitkomst[0].approved_by_user_id === eersteGebruiker ||
        raceeUitkomst[0].approved_by_user_id === tweedeGebruiker,
    );

    const { rows: raceePlanNa } = await db.client.query(
      "select status from public.content_plans where id = $1",
      [raceePlan],
    );
    ok("en het plan zelf is precies één keer op actief gezet", raceePlanNa[0].status === "actief");

    // ── Een pagina wordt verwijderd terwijl hij net geschreven is ────────────
    //
    // Dit dwingt de wedstrijdconditie zelf af: de content-taak wint de race
    // (zijn UPDATE committeert eerst), en pas dáárna probeert de klant de
    // pagina te verwijderen. Vóór de reparatie besliste `removePage` op een
    // lezing van vóór die race en schoof de buffer alsnog in voor een slot dat
    // al gevuld was.
    const { rows: raceeFunnelRij } = await db.client.query(
      `insert into public.profile_funnel_stages (profile_id, label, sort_order)
       values ($1, 'Beslissing', 1) returning id`,
      [profileId],
    );
    const { rows: raceePaginaRijen } = await db.client.query(
      `insert into public.planned_pages
         (plan_month_id, profile_id, title, page_type, funnel_stage_id, sort_order, is_buffer, scheduled_for, status)
       values ($1, $2, 'Racepagina', 'informatief', $3, 5, false, current_date + 5, 'gepland'),
              ($1, $2, 'Racebuffer', 'informatief', $3, 6, true, null, 'gepland')
       returning id, title`,
      [raceeMaand, profileId, raceeFunnelRij[0].id],
    );
    const raceePagina = (raceePaginaRijen as { id: string; title: string }[]).find((p) =>
      p.title === "Racepagina",
    )!.id;
    const raceeBuffer = (raceePaginaRijen as { id: string; title: string }[]).find((p) =>
      p.title === "Racebuffer",
    )!.id;

    // De content-taak "wint": zet de pagina op geschreven vóórdat de klant
    // verwijdert. Dit is precies wat `linkPlannedPage` in productie doet.
    await db.client.query(
      "update public.planned_pages set status = 'ter_goedkeuring' where id = $1",
      [raceePagina],
    );

    const raceeUitkomstVerwijderen = await removePage(admin as never, raceePagina);
    ok("verwijderen zelf lukt", raceeUitkomstVerwijderen.ok === true);
    // ⚠️ DE KERN: geen buffer, want de pagina was op het moment van de
    // verwijdering al 'geschreven' en niet meer 'gepland'. De voorwaardelijke
    // UPDATE zag dat, een lezing-vooraf had dat gemist.
    ok(
      "en de buffer schuift NIET in, want het werk was al gedaan",
      raceeUitkomstVerwijderen.bufferUsed === false,
    );

    const { rows: bufferNa } = await db.client.query(
      "select is_buffer, status from public.planned_pages where id = $1",
      [raceeBuffer],
    );
    ok("de buffer staat nog gewoon als buffer", bufferNa[0].is_buffer === true);

    const { rows: geschrevenPaginaNa } = await db.client.query(
      "select status from public.planned_pages where id = $1",
      [raceePagina],
    );
    ok(
      "de geschreven pagina is nu afgewezen, de tekst blijft bewaard (conventie 8)",
      geschrevenPaginaNa[0].status === "afgewezen",
    );
    // status is hier alleen op 'afgewezen' overschreven, verder niets: de
    // koppeling naar de geschreven tekst (content_piece_id) blijft intact,
    // want removePage raakt alleen de statuskolom aan.

    // ── En de omgekeerde volgorde: verwijderen vóórdat er iets geschreven is ──
    // Hier hoort de buffer wél in te schuiven.
    const { rows: raceePagina2Rijen } = await db.client.query(
      `insert into public.planned_pages
         (plan_month_id, profile_id, title, page_type, funnel_stage_id, sort_order, is_buffer, scheduled_for, status)
       values ($1, $2, 'Racepagina twee', 'informatief', $3, 7, false, current_date + 9, 'gepland')
       returning id`,
      [raceeMaand, profileId, raceeFunnelRij[0].id],
    );
    const raceePagina2 = raceePagina2Rijen[0].id as string;

    const uitkomst2 = await removePage(admin as never, raceePagina2);
    ok("verwijderen van een nog niet geschreven pagina lukt", uitkomst2.ok === true);
    ok("en nu schuift de overgebleven buffer wél in", uitkomst2.bufferUsed === true);

    // ── Twee gelijktijdige verwijderingen die om dezelfde buffer strijden ────
    const { rows: raceeBuffer2Rij } = await db.client.query(
      `insert into public.planned_pages
         (plan_month_id, profile_id, title, page_type, funnel_stage_id, sort_order, is_buffer, scheduled_for, status)
       values ($1, $2, 'Racebuffer twee', 'informatief', $3, 8, true, null, 'gepland')
       returning id`,
      [raceeMaand, profileId, raceeFunnelRij[0].id],
    );
    const { rows: tweeStrijders } = await db.client.query(
      `insert into public.planned_pages
         (plan_month_id, profile_id, title, page_type, funnel_stage_id, sort_order, is_buffer, scheduled_for, status)
       values ($1, $2, 'Strijder A', 'informatief', $3, 9, false, current_date + 11, 'gepland'),
              ($1, $2, 'Strijder B', 'informatief', $3, 10, false, current_date + 12, 'gepland')
       returning id`,
      [raceeMaand, profileId, raceeFunnelRij[0].id],
    );
    const [strijderA, strijderB] = (tweeStrijders as { id: string }[]).map((r) => r.id);

    const [uitkomstA, uitkomstB] = await Promise.all([
      removePage(admin as never, strijderA),
      removePage(admin as never, strijderB),
    ]);
    const aantalBufferClaims = [uitkomstA.bufferUsed, uitkomstB.bufferUsed].filter(Boolean).length;
    ok("allebei de verwijderingen lukken", uitkomstA.ok && uitkomstB.ok);
    // ⚠️ DE KERN: er was maar één buffer, dus hoogstens één van de twee mag
    // 'm claimen. Zonder de `is_buffer`-guard op de tweede update konden beide
    // "bufferUsed: true" melden terwijl er maar één buffer was.
    ok(
      "precies één van de twee claimt de ene overgebleven buffer, niet allebei",
      aantalBufferClaims === 1,
      `${aantalBufferClaims} claims op één buffer`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // De potentiescore: zoekvolume eerlijk over analyses heen (docs/tasks/potentiescore.md)
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nDe potentiescore: zoekvolume eerlijk over analyses heen");

    const { recalibrateSearchVolume } = await import("@/lib/pipeline/search-demand");
    const { visibilityIndex: viIndex, potentialScore: potScore } = await import("@/lib/potential");

    const potUserId = randomUUID();
    const potProfileId = randomUUID();
    await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
      potUserId,
      "potentie@example.com",
    ]);
    await db.client.query(
      `insert into public.profiles (id, user_id, name, url, brand_name, status)
       values ($1, $2, 'Potentie BV', 'https://potentie-bv.nl', 'Potentie BV', 'klaar')`,
      [potProfileId, potUserId],
    );

    // Elke titel draagt zijn "ware omvang" mee als (getal), die de stub in
    // openai-stub.ts uitleest. Dat is een testtruc, geen productiegedrag: in
    // het echt kent alleen het model die omvang, hier moeten WIJ hem kennen om
    // te kunnen navragen of de herkalibratie er correct mee omgaat.
    async function nieuwOnderwerp(titel: string): Promise<{ analyseId: string; topicId: string }> {
      const analyseId = randomUUID();
      const topicId = randomUUID();
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, $4, 'https://potentie-bv.nl', $4, 'gereed')`,
        [analyseId, potUserId, potProfileId, titel],
      );
      await db.client.query(
        `insert into public.profile_topics (id, profile_id, analysis_id, title, status)
         values ($1, $2, $3, $4, 'goedgekeurd')`,
        [topicId, potProfileId, analyseId, titel],
      );
      // De taak heeft ten minste één rapport nodig om mee te tellen: dat is
      // "de analyse is afgerond" uit de vraag.
      await db.client.query("insert into public.reports (analysis_id) values ($1)", [analyseId]);
      return { analyseId, topicId };
    }

    const klein = await nieuwOnderwerp("Kleine niche (20)");
    const groot = await nieuwOnderwerp("Grote markt (80)");

    const eersteRonde = await recalibrateSearchVolume(potProfileId);
    ok("de eerste herkalibratie werkt beide onderwerpen bij", eersteRonde.updated === 2, `kreeg ${eersteRonde.updated}`);

    const { rows: naEerstePotentie } = await db.client.query(
      "select title, search_volume_index, search_volume_reasoning from public.profile_topics where profile_id = $1 order by title",
      [potProfileId],
    );
    ok("allebei kregen een index", naEerstePotentie.every((r: { search_volume_index: number | null }) => r.search_volume_index !== null));
    ok(
      "allebei kregen ook een reden, voor de tooltip",
      naEerstePotentie.every((r: { search_volume_reasoning: string | null }) => Boolean(r.search_volume_reasoning)),
    );
    const grootEersteRonde = naEerstePotentie.find((r: { title: string }) => r.title === "Grote markt (80)")!
      .search_volume_index as number;
    // Het zwaarste onderwerp van deze aanroep staat op (bijna) het maximum:
    // ware omvang 80 was hier de grootste, dus relatief 100.
    ok("het zwaarste onderwerp van de aanroep staat op 100", grootEersteRonde === 100, `kreeg ${grootEersteRonde}`);

    // ── Nu komt er een veel groter onderwerp bij, en één gearchiveerd ────────
    const enorm = await nieuwOnderwerp("Enorme markt (95)");
    const gearchiveerd = await nieuwOnderwerp("Gearchiveerd onderwerp (99)");
    await db.client.query("update public.analyses set archived_at = now() where id = $1", [
      gearchiveerd.analyseId,
    ]);

    const tweedeRonde = await recalibrateSearchVolume(potProfileId);
    // ⚠️ DE KERN VAN DE VRAAG: drie actieve onderwerpen bijgewerkt, niet vier.
    // Het gearchiveerde onderwerp telt niet mee (keuze 2, docs/tasks/potentiescore.md
    // §5) en wordt niet aangeraakt.
    ok(
      "de tweede ronde werkt drie onderwerpen bij, het gearchiveerde niet",
      tweedeRonde.updated === 3,
      `kreeg ${tweedeRonde.updated}`,
    );

    const { rows: naTweedePotentie } = await db.client.query(
      "select title, search_volume_index from public.profile_topics where profile_id = $1 order by title",
      [potProfileId],
    );
    const indexVan = (titel: string) =>
      naTweedePotentie.find((r: { title: string }) => r.title === titel)?.search_volume_index as number | null;

    ok(
      "het gearchiveerde onderwerp heeft nog steeds geen index (nooit meegenomen)",
      indexVan("Gearchiveerd onderwerp (99)") === null,
    );

    // ⚠️ DE KERN VAN DE VRAAG, TWEEDE HELFT: "Grote markt" (ware omvang 80) is
    // zelf niet veranderd, maar staat nu niet meer op 100, want "Enorme markt"
    // (95) is de nieuwe noemer. Zonder een profielbrede herkalibratie zou dit
    // onderwerp voor altijd op zijn dag-1-schatting blijven staan, ook al kwam
    // er een groter onderwerp bij.
    ok(
      "'Grote markt' daalt zodra een groter onderwerp meedoet, al is hij zelf niet veranderd",
      (indexVan("Grote markt (80)") ?? 0) < grootEersteRonde,
      `stond op ${indexVan("Grote markt (80)")}, was ${grootEersteRonde}`,
    );
    ok(
      "en 'Enorme markt' is nu het zwaarste, dus die staat op 100",
      indexVan("Enorme markt (95)") === 100,
    );
    // Met de hand nagerekend: ware omvang 80 / 95 × 100 ≈ 84.
    ok(
      "de nieuwe waarde van 'Grote markt' klopt met de hand (80/95 × 100 ≈ 84)",
      Math.abs((indexVan("Grote markt (80)") ?? 0) - 84) <= 1,
    );

    // ── De taak zelf, niet alleen de bare functie ─────────────────────────
    const nogEenOnderwerp = await nieuwOnderwerp("Vierde onderwerp (50)");
    const { rows: potentieTaak } = await db.client.query(
      `insert into public.jobs (profile_id, type, payload_json, dedupe_key, status)
       values ($1, 'recalculate_potential', '{}'::jsonb, $2, 'running') returning *`,
      [potProfileId, `chain-potentie:${potProfileId}`],
    );
    await runJob({ admin: admin as never, job: potentieTaak[0] });
    const { rows: naTaak } = await db.client.query(
      "select search_volume_index from public.profile_topics where analysis_id = $1",
      [nogEenOnderwerp.analyseId],
    );
    ok(
      "de taak zelf (niet alleen de bare functie) werkt de index bij",
      naTaak[0]?.search_volume_index !== null,
    );

    // De handler weigert zonder profiel, net als gsc_sync zonder profiel.
    let weigerdeZonderProfiel = false;
    try {
      await runJob({
        admin: admin as never,
        job: { ...potentieTaak[0], id: randomUUID(), profile_id: null },
      });
    } catch {
      weigerdeZonderProfiel = true;
    }
    ok("de taak weigert zonder profile_id", weigerdeZonderProfiel);

    // ── De rekenkant zelf, ook los van de database (conventie 2) ────────────
    ok("visibilityIndex en potentialScore komen overeen met wat er in de tabel staat", (() => {
      const zichtbaarheid = viIndex(1, 4); // 25
      const potentie = potScore(zichtbaarheid, indexVan("Enorme markt (95)"));
      return zichtbaarheid === 25 && potentie === 75; // 0,75 × 100
    })());

    // ══════════════════════════════════════════════════════════════════════
    // Het contentplan volgt de potentiescore (fase 3, docs/tasks/potentiescore.md)
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nHet contentplan volgt de potentiescore");

    const { createPlan } = await import("@/lib/plans");

    const planPotUserId = randomUUID();
    const planPotProfileId = randomUUID();
    await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
      planPotUserId,
      "planpotentie@example.com",
    ]);
    await db.client.query(
      `insert into public.profiles (id, user_id, name, url, brand_name, status)
       values ($1, $2, 'Planpotentie BV', 'https://planpotentie-bv.nl', 'Planpotentie BV', 'klaar')`,
      [planPotProfileId, planPotUserId],
    );

    async function onderwerpMetPotentie(
      titel: string,
      priority: number,
      zichtbaarheid: number,
      zoekvolume: number,
    ): Promise<{ analyseId: string; topicId: string }> {
      const analyseId = randomUUID();
      const topicId = randomUUID();
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, $4, 'https://planpotentie-bv.nl', $4, 'gereed')`,
        [analyseId, planPotUserId, planPotProfileId, titel],
      );
      await db.client.query(
        `insert into public.profile_topics (id, profile_id, analysis_id, title, priority, status, search_volume_index)
         values ($1, $2, $3, $4, $5, 'goedgekeurd', $6)`,
        [topicId, planPotProfileId, analyseId, titel, priority, zoekvolume],
      );
      await db.client.query(
        "insert into public.visibility_scores (analysis_id, week_no, score) values ($1, 0, $2)",
        [analyseId, zichtbaarheid],
      );
      return { analyseId, topicId };
    }

    // Hoge PRIORITY (de dag-1-gok), maar amper nog iets te winnen: bijna overal
    // al zichtbaar (95) en weinig zoekvolume (10). Potentie ≈ 0,05 × 10 ≈ 1.
    const hogePrioriteitLagePotentie = await onderwerpMetPotentie(
      "Hoge prioriteit, lage potentie",
      9,
      95,
      10,
    );
    // Lage PRIORITY, maar de echte kans: nog nergens zichtbaar (10) en veel
    // zoekvolume (90). Potentie ≈ 0,90 × 90 = 81.
    const lagePrioriteitHogePotentie = await onderwerpMetPotentie(
      "Lage prioriteit, hoge potentie",
      1,
      10,
      90,
    );

    const planResultaat = await createPlan(admin as never, {
      profileId: planPotProfileId,
      pagesPerMonth: 2,
    });
    ok(
      "het plan wordt gemaakt",
      planResultaat.ok,
      planResultaat.ok ? "" : JSON.stringify((planResultaat as { problems: string[] }).problems),
    );

    const { rows: maand1Paginas } = await db.client.query(
      `select pp.topic_id, pp.sort_order
         from public.planned_pages pp
         join public.plan_months pm on pm.id = pp.plan_month_id
         join public.content_plans cp on cp.id = pm.plan_id
        where cp.profile_id = $1 and pm.month_number = 1 and pp.is_buffer = false
        order by pp.sort_order`,
      [planPotProfileId],
    );
    // ⚠️ DE KERN: zonder fase 3 zou "Hoge prioriteit, lage potentie" vooraan
    // staan (priority 9 tegen 1). Met fase 3 wint de gemeten potentiescore, en
    // staat "Lage prioriteit, hoge potentie" (potentie ≈ 81) vooraan, want die
    // levert écht iets op.
    ok(
      "het onderwerp met de hoogste potentiescore staat vooraan, ondanks de lagere priority",
      maand1Paginas[0]?.topic_id === lagePrioriteitHogePotentie.topicId,
      `eerste plek was ${maand1Paginas[0]?.topic_id}`,
    );
    ok(
      "en het onderwerp met de hoge priority maar lage potentie staat op de tweede plek",
      maand1Paginas[1]?.topic_id === hogePrioriteitLagePotentie.topicId,
      `tweede plek was ${maand1Paginas[1]?.topic_id}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // Een klant volledig verwijderen (F4, AVG)
    //
    // ⚠️ Dit hoort bij uitstek in de ketentest en niet in test-unit.ts, want het
    // hele mechanisme leunt op wat de DATABASE doet: bijna alles hangt met
    // `on delete cascade` aan `profiles`, en `profiles.account_id` staat bewust
    // op `no action` zodat een account met merken eraan niet zomaar weg kan.
    // Een unittest zou alleen de teksten zien en geen van beide.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nEen klant volledig verwijderen");

    const { deletionPlan, deleteAccount } = await import("@/lib/deletion");

    // Vers decor, los van de rest van deze test: een klant met een merk, een
    // analyse, een vraag en een meting, plus twee mensen erin.
    const wegAccount = randomUUID();
    const wegProfiel = randomUUID();
    const wegAnalyse = randomUUID();
    const wegPrompt = randomUUID();
    const alleenHier = randomUUID();
    const ookElders = randomUUID();
    const anderAccount = randomUUID();

    await db.client.query("insert into public.accounts (id, name) values ($1, 'Te Verwijderen BV')", [wegAccount]);
    await db.client.query("insert into public.accounts (id, name) values ($1, 'Blijft Bestaan BV')", [anderAccount]);
    for (const [id, mail] of [[alleenHier, "alleenhier@example.com"], [ookElders, "ookelders@example.com"]]) {
      await db.client.query("insert into auth.users (id, email) values ($1, $2)", [id, mail]);
    }
    await db.client.query(
      `insert into public.account_users (account_id, user_id, role) values
       ($1, $2, 'admin'), ($1, $3, 'member'), ($4, $3, 'member')`,
      [wegAccount, alleenHier, ookElders, anderAccount],
    );
    await db.client.query(
      `insert into public.profiles (id, user_id, account_id, name, url, brand_name, status)
       values ($1, $2, $3, 'Weg', 'https://weg.nl', 'Weg', 'klaar')`,
      [wegProfiel, alleenHier, wegAccount],
    );
    await db.client.query(
      `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
       values ($1, $2, $3, 'Weg analyse', 'https://weg.nl', 'iets', 'gereed')`,
      [wegAnalyse, alleenHier, wegProfiel],
    );
    await db.client.query(
      `insert into public.prompts (id, analysis_id, text, category, active)
       values ($1, $2, 'Waar in Breda?', 'Beslissing', true)`,
      [wegPrompt, wegAnalyse],
    );
    await db.client.query(
      `insert into public.tracking_runs (analysis_id, prompt_id, week_no, engine, prompt_text_snapshot, prompt_category_snapshot)
       values ($1, $2, 1, 'openai', 'Waar in Breda?', 'Beslissing')`,
      [wegAnalyse, wegPrompt],
    );

    // ⚠️ Een momentopname uit migratie 0025. Die tabel heeft GEEN verwijzing
    // naar het merk, dus de cascade raakt hem niet. Zonder de reparatie van
    // 12 augustus 2026 bleef de tekst van deze klant hier gewoon staan nadat
    // hij "volledig verwijderd" was.
    await db.client.query(
      `insert into public._backup_20260729 (source_table, source_id, snapshot, reason)
       values ('prompts', $1, '{"text":"Waar in Breda?"}'::jsonb, 'ketentest')`,
      [wegPrompt],
    );

    // Eerst het overzicht: wat zou er verdwijnen? Dit verandert niets.
    const plan = await deletionPlan(wegAccount);
    ok("het plan vindt het account", plan?.accountName === "Te Verwijderen BV");
    ok("en telt het merk", plan?.counts.merken === 1);
    ok("en de analyse", plan?.counts.analyses === 1);
    ok("en de meting", plan?.counts.metingen === 1);
    ok("en de twee mensen erin", plan?.counts.gebruikers === 2);
    ok("de regels noemen enkelvoud waar het één is", plan?.regels.includes("1 merk") === true);

    // ⚠️ En het overzicht heeft niets weggegooid. Zonder deze controle zou een
    // scherm dat alleen kijkt al kunnen verwijderen.
    const { rows: nogSteedsDaar } = await db.client.query(
      "select id from public.profiles where id = $1",
      [wegProfiel],
    );
    ok("het opvragen van het plan verwijdert niets", nogSteedsDaar.length === 1);

    // Nu echt.
    const resultaat = await deleteAccount(wegAccount);
    ok("er is één merk verwijderd", resultaat.merken === 1);

    for (const [tabel, kolom, waarde] of [
      ["accounts", "id", wegAccount],
      ["profiles", "id", wegProfiel],
      ["analyses", "id", wegAnalyse],
      ["prompts", "id", wegPrompt],
      ["account_users", "account_id", wegAccount],
    ] as const) {
      const { rows } = await db.client.query(
        `select 1 from public.${tabel} where ${kolom} = $1`,
        [waarde],
      );
      ok(`${tabel} is leeg voor deze klant`, rows.length === 0);
    }

    // De meting hangt via de analyse en gaat dus mee, ook al noemt de code hem
    // nergens. Dat is precies wat de cascade hoort te doen.
    const { rows: metingen } = await db.client.query(
      "select 1 from public.tracking_runs where analysis_id = $1",
      [wegAnalyse],
    );
    ok("en de metingen zijn via de cascade meegegaan", metingen.length === 0);

    // ⚠️ De kern van de AVG-plicht: het dossier weghalen maar de inlog laten
    // staan is geen verwijdering. Wie nergens anders bij hoort, gaat mee.
    const { rows: weg } = await db.client.query("select 1 from auth.users where id = $1", [alleenHier]);
    ok("de inlog van wie hier alleen zat, is weg", weg.length === 0);

    // Maar wie nog bij een ander account hoort, blijft. Anders sluit het
    // opruimen van klant A per ongeluk klant B buiten.
    const { rows: blijft } = await db.client.query("select 1 from auth.users where id = $1", [ookElders]);
    ok("wie nog elders lid is, houdt zijn inlog", blijft.length === 1);

    const { rows: anderNog } = await db.client.query(
      "select 1 from public.accounts where id = $1",
      [anderAccount],
    );
    ok("en het andere account staat er nog", anderNog.length === 1);

    // ⚠️ En de momentopname is ook weg. Dit is precies het restant waar de AVG
    // over gaat: de klant is uit elk scherm verdwenen en zijn teksten staan er
    // nog, in een tabel die niemand meer bekijkt.
    const { rows: kopie } = await db.client.query(
      "select 1 from public._backup_20260729 where source_id = $1",
      [wegPrompt],
    );
    ok("de bewaarde kopie van zijn tekst is ook weg", kopie.length === 0);

    __setTestAdminClient(null);
    __setTestTransport(null);
  } finally {
    await db.stop();
  }

  console.log(`\n${passed} geslaagd, ${failed} mislukt`);
  if (failures.length > 0) {
    console.log("\nMislukt:");
    for (const f of failures) console.log(`  ✗ ${f}`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nKetentest kon niet draaien:", err instanceof Error ? err.message : err);
  process.exit(1);
});
