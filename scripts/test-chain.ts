/**
 * De KETENTEST — de echte jobhandlers tegen een echte Postgres
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
 * met de hand, op productie, na uren en dollars — dat is wat deze test moet
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
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main(): Promise<void> {
  const { startTestDatabase } = await import("./chain/postgres");
  const { createShimClient } = await import("./chain/supabase-shim");
  const { createOpenAiStub } = await import("./chain/openai-stub");
  type StubLog = import("./chain/openai-stub").StubLog;

  console.log("\nKetentest — echte handlers, echte Postgres, gestubde AI\n");
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

    // S1 — het vangnet van de atomiseerstap. De stub bood twee zinnen aan;
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

    // Bug 7 — het auditplan werd weggegooid.
    ok(
      "bug 7: het paginaplan staat in de snapshot",
      Array.isArray(snapshot?.plan) && snapshot.plan.length === 2,
      `${snapshot?.plan?.length ?? 0} punten`,
    );

    // S8 — de tegenspraken werden berekend en alleen gelogd. Dit scenario kent
    // er geen (de klant heeft nog niets herzien), dus de lijst hoort leeg te
    // zijn — maar hij moet er wél STAAN. Precies dát is de regressie die deze
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
    // En een merkbreed antwoord (analysis_id is null) — dat is wat bug 6 miste.
    await db.client.query(
      `insert into public.fact_requests
         (profile_id, analysis_id, question, reason, answer, status, answered_at, scope, kind,
          answer_type, required, claim_key)
       values ($1, null, 'Wat is jullie telefoonnummer?', 'praktisch', '033 - 123 45 67',
               'beantwoord', now(), 'merk', 'praktisch', 'tekst_kort', true, 'telefoonnummer')`,
      [profileId],
    );

    // Bug 6 — telt een merkbreed antwoord mee in de dedupe-sleutel?
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

    // Bug 1 — 'briefing' gold als "al af".
    ok(
      "bug 1: er staat tekst in de pagina",
      Boolean(na.rows[0]?.body_markdown),
      "de briefing-rij werd als 'al af' behandeld",
    );

    // Bug 2 — de versiesprong met een lege spookrij ernaast.
    ok("bug 2: precies één rij voor deze titel", na.rows.length === 1, `${na.rows.length} rijen`);
    ok("bug 2: het is nog steeds versie 1", na.rows[0]?.version === 1);
    ok("bug 2: en die rij is de huidige", na.rows[0]?.is_current === true);

    // Bug 3 — het antwoord van de klant moet in de gebruikte kaart staan.
    const gebruikt = na.rows[0]?.briefing_snapshot_json as { facts?: { text: string }[] };
    ok(
      "bug 3: het antwoord van de klant staat op de gebruikte feitenkaart",
      (gebruikt?.facts ?? []).some((f) => f.text.includes("nazorgprogramma van zes weken")),
      "de bevroren kaart werd blind hergebruikt",
    );

    // Bug 7 — kreeg de schrijver het plan te zien?
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


    // Bug 4 — "F1, F2" moet als onderbouwd tellen.
    ok(
      "bug 4: een samengestelde bronverwijzing telt als onderbouwd",
      Number(na.rows[0]?.source_coverage ?? 0) > 0,
      `dekking ${na.rows[0]?.source_coverage}`,
    );

    // S3 — de zin zonder bron ("binnen 24 uur terecht") hoort opgemerkt te zijn.
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

    // S6 — 'ready' betekent niet 'vrijgegeven'.
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
    // verkeerd neerzetten geeft iedereen toegang tot alles — en dat merk je aan
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
    // analyse — precies het scherm waar hij voor betaalt.
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
    // strategieroute die rijen — en dan nog alleen voor aliassen en werkgebied.
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
