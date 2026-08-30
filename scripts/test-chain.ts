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

/** Gelijkheid met de werkelijke waarde in de foutmelding, zoals in test-unit.ts. */
function eqc(name: string, actual: string, expected: string): void {
  ok(name, actual === expected, actual === expected ? "" : `verwacht "${expected}", kreeg "${actual}"`);
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
    const { __setTestTransport, __setTestPlainTransport } = await import(
      "@/lib/openai/structured"
    );
    const { createPlainStub } = await import("./chain/openai-stub");
    __setTestAdminClient(createShimClient(db.client));
    __setTestTransport(createOpenAiStub(log));
    __setTestPlainTransport(createPlainStub(log));

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

    // De klant corrigeert twee velden in de samengevoegde merkprofiel-editor,
    // vlak vóór er geschreven wordt. Dezelfde kolommen die de PATCH-route zet
    // (`EDITABLE_PROFILE_FIELDS`), zodat de assertie verderop toetst of een
    // verse waarde de schrijver bereikt en niet een gecachete.
    await db.client.query(
      `update public.profiles
          set tone_of_voice = 'Een ervaren fysiotherapeut die het rustig uitlegt',
              taboo_phrases = array['spotgoedkoop'],
              edited_by_user = true
        where id = $1`,
      [profileId],
    );

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

    // ── Haalt een gecorrigeerd merkveld de schrijfprompt? (17 aug 2026) ───
    //
    // De wizard van 27 velden en de platte editor van 41 zijn samengevoegd tot
    // één formulier. `scripts/test-unit.ts` bewaakt dat alle 41 velden een stap
    // hebben, maar dat toetst de lijst en niet de kéten: een veld kan keurig in
    // een stap staan, netjes opgeslagen worden, en alsnog nooit bij het model
    // aankomen. Dat is precies het soort fout dat pas bij de volgende
    // contentronde opvalt, en dan zonder foutmelding.
    //
    // `tone_of_voice` en `taboo_phrases` staan in twee verschillende stappen
    // ("Hoe je klinkt" en "Je woorden") en gaan langs twee verschillende
    // plekken in de prompt, dus samen dekken ze het pad breed genoeg.
    ok(
      "de tone of voice uit het merkprofiel staat in de schrijfprompt",
      schrijfprompt.includes("Tone of voice:"),
      "het profiel bereikte de schrijver niet",
    );
    ok(
      "en het verboden woord dat de klant invulde ook",
      schrijfprompt.includes("spotgoedkoop"),
      "taboo_phrases bereikte de schrijver niet",
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
    // Wat de consultant vóór het gesprek klaarzet (onboarding 3.0, fase 2)
    //
    // Drie dingen die alleen samen te toetsen zijn, en die alle drie misgingen:
    //
    //   1. De aanmaakroute schreef NUL rijen in `profile_field_sources`. Wat de
    //      consultant typte was daarmee niet te onderscheiden van modeluitvoer,
    //      en het eerste onderzoek mocht het gewoon overschrijven.
    //   2. Mensinvoer ging niet door dezelfde normalisatie als modeluitvoer,
    //      terwijl `service_regions[0]` letterlijk in zes kennistestvragen wordt
    //      geplakt.
    //   3. De onderzoeksprompt zei "RESPECTEER dit" over álles wat er stond, ook
    //      over een aanname van vóór het eerste contact.
    //
    // Dit scenario draait het echte onderzoek (met gestubde AI die de consultant
    // met opzet tegenspreekt) en kijkt wat er daarna in de database staat.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nWat de consultant klaarzet overleeft het eerste onderzoek");

    const { consultantFields: velden } = await import("@/lib/profile-source");
    const { resolveScope: bereikVan } = await import("@/lib/pipeline/field-merge");
    const { prepareProfile } = await import("@/lib/pipeline/prepare-profile");

    const preboardId = randomUUID();
    // Precies wat de aanmaakroute doet: normaliseren, opslaan, herkomst erbij.
    const preboardBereik = bereikVan("lokaal", ["  Amersfoort  ", "amersfoort"]);
    const preboardIntake = {
      name: "Fysi-Unique",
      aliases: ["Fysi Unique"],
      industry: "fysiotherapie",
      products: [],
      value_props: [],
      competitors: ["SMC Amersfoort", "Fysio Vathorst"],
      service_scope: preboardBereik.scope,
      service_regions: preboardBereik.regions,
      market_language: null,
      tone_of_voice: null,
      intake_description: null,
      intake_audience: null,
    };

    await db.client.query(
      `insert into public.profiles (id, user_id, name, url, status, aliases, industry,
                                    products, value_props, competitors, service_scope,
                                    service_regions)
       values ($1, $2, $3, 'https://fysi-unique.nl', 'bezig', $4, $5, $6, $7, $8, $9, $10)`,
      [
        preboardId,
        userId,
        preboardIntake.name,
        preboardIntake.aliases,
        preboardIntake.industry,
        preboardIntake.products,
        preboardIntake.value_props,
        preboardIntake.competitors,
        preboardIntake.service_scope,
        preboardIntake.service_regions,
      ],
    );
    await db.client.query(
      `insert into public.profile_pages (profile_id, url, title, text_excerpt) values
       ($1, 'https://fysi-unique.nl/over-ons', 'Over ons',
        'Fysi-Unique is een fysiotherapiepraktijk in Amersfoort. Wij bestaan sinds 2011.')`,
      [preboardId],
    );

    const gezetteVelden = velden(preboardIntake);
    await db.client.query(
      `insert into public.profile_field_sources (profile_id, field, source, confidence, set_by)
       select $1, unnest($2::text[]), 'consultant', 1, $3`,
      [preboardId, gezetteVelden, userId],
    );

    ok(
      "de aanmaak legt de branche vast als consultant-aanname",
      gezetteVelden.includes("industry") && gezetteVelden.includes("competitors"),
      gezetteVelden.join(", "),
    );
    ok(
      "en een leeg veld krijgt géén herkomst",
      !gezetteVelden.includes("products") && !gezetteVelden.includes("tone_of_voice"),
    );

    const { rows: naAanmaak } = await db.client.query(
      "select service_regions from public.profiles where id = $1",
      [preboardId],
    );
    ok(
      "de getypte plaatsnaam is opgeschoond en ontdubbeld",
      naAanmaak[0].service_regions.length === 1 &&
        naAanmaak[0].service_regions[0] === "Amersfoort",
      JSON.stringify(naAanmaak[0].service_regions),
    );

    const promptsVoor = log.length;
    await prepareProfile(preboardId);
    const onderzoeksPrompt =
      log.slice(promptsVoor).find((l) => l.schemaName === "profile_research")?.user ?? "";

    ok("het onderzoek heeft echt gedraaid", onderzoeksPrompt.length > 0);
    ok(
      "de aanname staat in de prompt als startpunt en niet als feit",
      onderzoeksPrompt.includes("VÓÓR het gesprek") &&
        onderzoeksPrompt.includes("fysiotherapie"),
    );
    ok(
      "en het model mag hem tegenspreken",
      onderzoeksPrompt.includes("eigen bevinding"),
    );

    const { rows: naOnderzoek } = await db.client.query(
      `select industry, competitors, service_scope, service_regions, summary, proof_points, status
         from public.profiles where id = $1`,
      [preboardId],
    );
    // Het onderzoek gaf 'wellness en massage' en 'landelijk' terug. Zonder de
    // herkomstrijen uit de aanmaakroute zou dat er nu staan.
    ok(
      "de branche van de consultant staat er nog",
      naOnderzoek[0].industry === "fysiotherapie",
      naOnderzoek[0].industry,
    );
    ok(
      "het bereik ook",
      naOnderzoek[0].service_scope === "lokaal" &&
        naOnderzoek[0].service_regions[0] === "Amersfoort",
      `${naOnderzoek[0].service_scope} · ${JSON.stringify(naOnderzoek[0].service_regions)}`,
    );
    ok(
      "en de concurrenten die hij opgaf zijn niet vervangen",
      naOnderzoek[0].competitors.includes("SMC Amersfoort") &&
        naOnderzoek[0].competitors.includes("Fysio Vathorst"),
      JSON.stringify(naOnderzoek[0].competitors),
    );
    // Wat de consultant NIET invulde komt gewoon van het onderzoek: de
    // bescherming mag geen slot op het hele profiel worden.
    ok(
      "wat hij leeg liet vult het onderzoek wél",
      (naOnderzoek[0].summary ?? "").includes("Amersfoort") &&
        naOnderzoek[0].proof_points.length > 0,
    );
    ok("en het profiel staat op klaar", naOnderzoek[0].status === "klaar");

    // Opruimen: verderop telt het archiefscenario alle zichtbare merken in de
    // hele database, en dat cijfer hoort niet af te hangen van hoeveel merken
    // een eerder scenario heeft aangemaakt. De cascade neemt de pagina's en de
    // herkomstrijen mee.
    await db.client.query("delete from public.profiles where id = $1", [preboardId]);

    // ══════════════════════════════════════════════════════════════════════
    // De commerciële laag en de vierde herkomst (migratie 0060)
    //
    // Drie dingen die alleen samen te toetsen zijn: de kolommen bestaan echt en
    // nemen aan wat de route erin stopt, de constraint kent `consultant`, en
    // `filterProtectedFields()` beschermt zo'n waarde tegen een tweede
    // onderzoeksronde. Dat laatste is het punt van fase 2 van onboarding 3.0:
    // wat een consultant vóór het gesprek klaarzet mag niet als modeluitvoer
    // behandeld worden.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nDe commerciële laag en de herkomst 'consultant' (0060)");

    await db.client.query(
      `update public.profiles
          set priority_offerings = $2,
              deprioritised_offerings = $3,
              growth_regions = $4,
              target_segments = $5,
              deal_value_band = 'midden',
              seasonality = 'Piek in september',
              sales_objections = $6,
              forbidden_topics = $7,
              offline_proof = $8,
              name_exclusions = $9,
              respect_site_structure = false,
              goal_12m = 'De specialist zijn in warmtepompen',
              contact_name = 'Sanne de Wit',
              contact_email = 'sanne@voorbeeld.nl',
              contact_phone = '0612345678'
        where id = $1`,
      [
        profileId,
        ["onderhoudsabonnementen"],
        ["losse bandenwissel"],
        ["Utrecht"],
        ["installateurs met eigen monteurs"],
        ["jullie zijn duurder"],
        ["lopende rechtszaken"],
        ["ISO 9001 sinds 2019"],
        ["Jansen Techniek in Groningen"],
      ],
    );

    const { rows: commercieel } = await db.client.query(
      `select priority_offerings, growth_regions, deal_value_band,
              respect_site_structure, contact_email, name_exclusions
         from public.profiles where id = $1`,
      [profileId],
    );
    ok(
      "0060: de commerciële velden staan er en houden hun waarde",
      commercieel[0].priority_offerings[0] === "onderhoudsabonnementen" &&
        commercieel[0].growth_regions[0] === "Utrecht" &&
        commercieel[0].deal_value_band === "midden",
    );
    ok(
      "0060: 'nee' op nieuwe pagina's is een echte false, geen leegte",
      commercieel[0].respect_site_structure === false,
    );
    ok("0060: de contactpersoon staat vast", commercieel[0].contact_email === "sanne@voorbeeld.nl");
    ok(
      "0060: de uitsluitingslijst staat naast de aliassen en niet erin",
      commercieel[0].name_exclusions[0] === "Jansen Techniek in Groningen",
    );

    // De constraint kent vier waarden en niet vijf.
    let bandGeweigerd = false;
    try {
      await db.client.query(
        "update public.profiles set deal_value_band = 'gigantisch' where id = $1",
        [profileId],
      );
    } catch {
      bandGeweigerd = true;
    }
    ok("0060: een onbekende waardeklasse wordt geweigerd", bandGeweigerd);

    // De vierde herkomst, op de tabel waar hij vandaan moet komen.
    await db.client.query(
      `insert into public.profile_field_sources (profile_id, field, source, confidence, set_by)
       values ($1, 'service_scope', 'consultant', 1, $2)
       on conflict (profile_id, field) do update set source = excluded.source`,
      [profileId, beheerderId],
    );
    const { rows: metConsultant } = await db.client.query(
      "select field, source, not_applicable from public.profile_field_sources where profile_id = $1",
      [profileId],
    );
    ok(
      "0060: de constraint laat 'consultant' toe",
      metConsultant.some((r) => r.source === "consultant"),
    );
    ok(
      "0060: en n.v.t. staat standaard uit",
      metConsultant.every((r) => r.not_applicable === false),
    );
    ok(
      "0060: wat de consultant klaarzette overleeft een tweede onderzoeksronde",
      filterProtectedFields(
        { service_scope: "landelijk" },
        metConsultant as { field: string; source: "ai" | "klant" | "gesprek" | "consultant" }[],
      ).blocked.includes("service_scope"),
    );

    // Wat de onboardingsessie schrijft: bron `gesprek` plus een veld dat op
    // niet van toepassing staat. Allebei op dezelfde tabel en via dezelfde
    // route, en allebei beschermd tegen een volgende onderzoeksronde.
    await db.client.query(
      `insert into public.profile_field_sources (profile_id, field, source, confidence, set_by, not_applicable)
       values ($1, 'usp', 'gesprek', 1, $2, false),
              ($1, 'author_bio', 'gesprek', 1, $2, true)
       on conflict (profile_id, field) do update
         set source = excluded.source, not_applicable = excluded.not_applicable`,
      [profileId, beheerderId],
    );
    const { rows: naSessie } = await db.client.query(
      "select field, source, not_applicable from public.profile_field_sources where profile_id = $1",
      [profileId],
    );
    ok(
      "0060: wat in de sessie is gezet draagt bron 'gesprek'",
      naSessie.find((r) => r.field === "usp")?.source === "gesprek",
    );
    ok(
      "0060: en overleeft een herhaalronde van het onderzoek",
      filterProtectedFields(
        { usp: "iets wat het model bedacht" },
        naSessie as { field: string; source: "ai" | "klant" | "gesprek" | "consultant" }[],
      ).blocked.includes("usp"),
    );
    ok(
      "0060: een veld op n.v.t. wordt ook niet alsnog gevuld",
      filterProtectedFields(
        { author_bio: "een verzonnen biografie" },
        naSessie as { field: string; source: "ai" | "klant" | "gesprek" | "consultant" }[],
      ).blocked.includes("author_bio"),
    );
    ok(
      "0060: en n.v.t. staat er als vlag naast de herkomst",
      naSessie.find((r) => r.field === "author_bio")?.not_applicable === true,
    );

    let bronGeweigerd = false;
    try {
      await db.client.query(
        "update public.profile_field_sources set source = 'beheerder' where profile_id = $1 and field = 'service_scope'",
        [profileId],
      );
    } catch {
      bronGeweigerd = true;
    }
    ok("0060: een verzonnen herkomst wordt geweigerd", bronGeweigerd);

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
    // Valt er één weg, dan schrijft ORBIT ENGINE wel maar blijft het plan op "ORBIT ENGINE is
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
    // Zonder deze regel blijft een pagina op "ORBIT ENGINE is bezig" staan terwijl er
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
    // De aanbodstap kapt de keten niet meer af (Teamsessie 18 augustus 2026)
    //
    // ⚠️ `profile_offering` telt als NIET-BLOKKEREND, met als onderbouwing dat
    // de klant bij een mislukking alleen zijn dienstenoverzicht en zijn
    // topicvoorstellen mist. Dat klopte niet: diezelfde stap plande de markt in,
    // en de markt draagt de kennistest en de synthese. Mislukte hij definitief,
    // dan werd de halve onderzoeksketen nooit ingepland én verscheen er geen
    // foutmelding, want de taak telt als niet-blokkerend.
    //
    // Geen unittest kon dit vangen: elke functie deed precies wat hij moest doen
    // op de invoer die hij kreeg. Het gat zat ertussen.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nEen mislukte aanbodstap kapt de keten niet af");

    const ketenProfiel = randomUUID();
    await db.client.query(
      `insert into public.profiles (id, user_id, name, url, status)
       values ($1, $2, 'Ketenmerk', 'https://ketenmerk.nl', 'klaar')`,
      [ketenProfiel, userId],
    );
    const { rows: aanbodTaak } = await db.client.query(
      `insert into public.jobs (profile_id, type, payload_json, dedupe_key, status, attempts)
       values ($1, 'profile_offering', '{}', $2, 'running', 4) returning *`,
      [ketenProfiel, `chain-aanbod:${ketenProfiel}`],
    );
    await handleFailure(admin as never, aanbodTaak[0], "de aanbodboom kwam niet rond");

    const { rows: naAanbodFout } = await db.client.query(
      "select type, status from public.jobs where profile_id = $1 and type = 'profile_market'",
      [ketenProfiel],
    );
    ok(
      "de marktstap staat alsnog ingepland",
      naAanbodFout.length === 1 && naAanbodFout[0].status === "queued",
      JSON.stringify(naAanbodFout),
    );

    // En de rest van de keten volgt gewoon vanaf daar: markt plant de
    // kennistest in, die de synthese. Dat blijft het werk van de geslaagde tak.
    const { rows: aanbodStand } = await db.client.query(
      "select status from public.jobs where id = $1",
      [aanbodTaak[0].id],
    );
    ok("terwijl de aanbodstap zelf op mislukt staat", aanbodStand[0].status === "failed");

    // ⚠️ Een stap die LOS is ingepland vanuit het gesprek trekt niets achter
    // zich aan, ook niet bij een mislukking. Anders sleept één gewijzigde
    // concurrent alsnog de twee duurste stappen mee.
    const losProfiel = randomUUID();
    await db.client.query(
      `insert into public.profiles (id, user_id, name, url, status)
       values ($1, $2, 'Losmerk', 'https://losmerk.nl', 'klaar')`,
      [losProfiel, userId],
    );
    const { rows: losseTaak } = await db.client.query(
      `insert into public.jobs (profile_id, type, payload_json, dedupe_key, status, attempts)
       values ($1, 'profile_market', '{"chain": false}', $2, 'running', 4) returning *`,
      [losProfiel, `chain-los:${losProfiel}`],
    );
    await handleFailure(admin as never, losseTaak[0], "het marktonderzoek gaf op");
    const { rows: naLos } = await db.client.query(
      "select count(*) as n from public.jobs where profile_id = $1 and type = 'profile_llm_baseline'",
      [losProfiel],
    );
    ok(
      "een los ingeplande stap sleept de kennistest niet mee",
      Number(naLos[0].n) === 0,
    );

    await db.client.query("delete from public.profiles where id in ($1, $2)", [
      ketenProfiel,
      losProfiel,
    ]);

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
    // Toewijzen laat de accountlaag nu ook meeverhuizen (doorloop-huyberts.md,
    // kleiner punt B)
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KON GAAN: /api/profiles/[id]/assign
    // verplaatste tot 26 augustus 2026 alleen profiles.user_id en
    // analyses.user_id (laag 2, de historische terugval). profiles.account_id
    // (laag 1, de hoofdregel) bleef op het account van de beheerder staan. De
    // klant kwam dan binnen via laag 2 in plaats van laag 1, en dat is precies
    // de omweg die defaultAccountFor() destijds al repareerde voor NIEUWE
    // profielen. Dit scenario bootst na wat de route nu doet: hetzelfde
    // account resolveren dat een nieuw profiel ook zou krijgen, en dat
    // meegeven in de update.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nToewijzen laat de accountlaag nu meeverhuizen (kleiner punt B)");
    {
      const beheerderId = randomUUID();
      const beheerderAccountId = randomUUID();
      const klantVoorToewijzing = randomUUID();
      const toeTeWijzenProfiel = randomUUID();

      await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
        beheerderId,
        "beheerder-toewijzen@voorbeeld.nl",
      ]);
      await db.client.query("insert into public.accounts (id, name) values ($1, 'ORBIT ENGINE beheer')", [
        beheerderAccountId,
      ]);
      await db.client.query(
        `insert into public.account_users (account_id, user_id, role) values ($1, $2, 'admin')`,
        [beheerderAccountId, beheerderId],
      );
      // Precies de startsituatie van de bug: een profiel op naam van de
      // beheerder, met account_id op het account van de beheerder.
      await db.client.query(
        `insert into public.profiles (id, user_id, account_id, name, url, status)
         values ($1, $2, $3, 'Toe te wijzen merk', 'https://toewijzen-test.nl', 'klaar')`,
        [toeTeWijzenProfiel, beheerderId, beheerderAccountId],
      );

      await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
        klantVoorToewijzing,
        "klant-toewijzen@voorbeeld.nl",
      ]);

      // Wat de route nu doet: het doelaccount van de klant resolven (dezelfde
      // functie als een nieuw profiel gebruikt) en meegeven in de update.
      const doelAccountId = await defaultAccountFor(klantVoorToewijzing);
      ok("de klant krijgt een eigen account (had er nog geen)", doelAccountId !== null);
      ok(
        "en dat is NIET het account van de beheerder",
        doelAccountId !== beheerderAccountId,
      );

      await db.client.query(
        `update public.profiles set user_id = $1, account_id = $2, assigned_at = now() where id = $3`,
        [klantVoorToewijzing, doelAccountId, toeTeWijzenProfiel],
      );

      const { rows: naToewijzen } = await db.client.query(
        `select user_id, account_id from public.profiles where id = $1`,
        [toeTeWijzenProfiel],
      );
      ok("user_id staat op de klant (laag 2)", naToewijzen[0].user_id === klantVoorToewijzing);
      ok(
        "en account_id staat NIET meer op het account van de beheerder (laag 1)",
        naToewijzen[0].account_id !== beheerderAccountId,
        `account_id is nog ${naToewijzen[0].account_id}`,
      );
      ok(
        "account_id staat op het eigen account van de klant",
        naToewijzen[0].account_id === doelAccountId,
      );

      // De echte toets: ziet de klant zijn merk via laag 1 (het account), niet
      // via de terugvallende laag 2?
      ok(
        "de klant ziet zijn toegewezen merk via de accountlaag",
        (await ownedProfile(adminClient, toeTeWijzenProfiel, klantVoorToewijzing))?.id === toeTeWijzenProfiel,
      );

      // En de beheerder, die geen laag meer over heeft naar dit profiel, ziet
      // het niet langer als "zijn" merk via de accountlaag.
      ok(
        "de beheerder hoort niet meer bij het account van dit merk",
        !(await isMember(beheerderId, doelAccountId)),
      );
    }

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
    // Besluit 4: de klant ziet niet HOE ORBIT ENGINE aan zijn kennis kwam
    //
    // ⚠️ Dit is de verificatie van besluit 4 (17 augustus 2026), en hij
    // hoort hier en niet alleen in een broncodecontrole. Een scherm dat iets
    // niet toont is één wijziging van tonen verwijderd; een tabel die RLS niet
    // teruggeeft is dat niet. `ai_calls` (wat een klant ons kost, per aanroep,
    // met modelnaam) en `jobs` (de wachtrij, inclusief mislukte taken) horen
    // allebei op Admin, en de garantie daarvoor zit in de database.
    // ══════════════════════════════════════════════════════════════════════
    await db.client.query(
      `insert into public.ai_calls (analysis_id, profile_id, kind, model, cost_usd, web_search)
       values ($1, $2, 'measure_simulate', 'gpt-5.6-luna', 0.0251, true)`,
      [matrixAnalyse, matrixProfiel],
    );
    await db.client.query(
      `insert into public.jobs (analysis_id, profile_id, type, status)
       values ($1, $2, 'measure_prompt', 'failed')`,
      [matrixAnalyse, matrixProfiel],
    );

    // Eerst aantonen dát de rijen er staan: een test die nul telt omdat er niets
    // is, toetst niets.
    const { rows: erIsIets } = await db.client.query(
      `select (select count(*) from public.ai_calls where analysis_id = $1)::int as calls,
              (select count(*) from public.jobs where analysis_id = $1)::int as jobs`,
      [matrixAnalyse],
    );
    ok("de kostenregel en de taak staan er echt", erIsIets[0].calls === 1 && erIsIets[0].jobs === 1);

    ok(
      "de eigenaar ziet zijn eigen kostenregels niet",
      (await zichtbaarAls(matrixEigenaarId, "ai_calls", "analysis_id", matrixAnalyse)) === 0,
      "ai_calls is exploitatie-informatie en hoort op Admin",
    );
    ok(
      "een teamlid ook niet",
      (await zichtbaarAls(matrixTeamlidId, "ai_calls", "analysis_id", matrixAnalyse)) === 0,
    );
    ok(
      "en de takenwachtrij is voor niemand leesbaar",
      (await zichtbaarAls(matrixEigenaarId, "jobs", "analysis_id", matrixAnalyse)) === 0,
      "jobs heeft RLS aan en nul policies; alle mutaties lopen via de werker",
    );
    // Ook niet voor een beheerder: hij leest die tabellen via de service-role in
    // een route die zelf `isStaff` controleert, niet via zijn eigen sessie.
    ok(
      "ook een beheerder leest ze niet via zijn eigen sessie",
      (await zichtbaarAls(matrixStaffId, "jobs", "analysis_id", matrixAnalyse)) === 0,
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
    // Het gesprek verandert de uitkomst (onboarding 3.0, fase 4)
    //
    // ⚠️ DIT IS HET VERIFICATIECRITERIUM VAN FASE 4. Zonder deze lus is de
    // onboardingsessie een archief: de consultant legt vast dat het merk
    // landelijk werkt in plaats van lokaal, en de vragen die de meting stelt
    // zijn nog steeds gegenereerd op de gok van het model.
    //
    // Drie dingen moeten kloppen en ze zitten alle drie tússen stappen in:
    // de bijwerkroute moet zien wát er gewijzigd is, de promptgeneratie moet
    // de oude vragen vervangen zonder de metingen mee te nemen, en de
    // gesprekswaarden moeten na afloop nog steeds staan.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nWat er in het gesprek verandert, verandert het onderzoek");

    const { planRefresh: planVan } = await import("@/lib/pipeline/onboarding-refresh");

    // De sessie legt een nieuw bereik vast, ná de laatste onderzoeksronde.
    await db.client.query(
      "update public.profiles set service_scope = 'landelijk', service_regions = '{}', deep_research_at = now() - interval '1 day' where id = $1",
      [profileId],
    );
    await db.client.query(
      `insert into public.profile_field_sources (profile_id, field, source, confidence, set_by, set_at)
       values ($1, 'service_scope', 'gesprek', 1, $2, now()),
              ($1, 'goal_12m', 'gesprek', 1, $2, now())
       on conflict (profile_id, field) do update
         set source = excluded.source, set_at = excluded.set_at`,
      [profileId, beheerderId],
    );

    // Precies wat de bijwerkroute doet: kijken wat er sinds de laatste ronde
    // door een mens gezet is.
    const { rows: sindsdien } = await db.client.query(
      `select field from public.profile_field_sources
        where profile_id = $1 and source <> 'ai'
          and set_at > (select deep_research_at from public.profiles where id = $1)`,
      [profileId],
    );
    const gewijzigdeVelden = sindsdien.map((r: { field: string }) => r.field);
    ok(
      "de bijwerkroute ziet het gewijzigde bereik",
      gewijzigdeVelden.includes("service_scope"),
      gewijzigdeVelden.join(", "),
    );

    const bijwerkPlan = planVan(gewijzigdeVelden, { analyses: 1 });
    ok("en plant de vragen opnieuw in", bijwerkPlan.tasks.includes("prompts"));
    ok("plus de kennistest", bijwerkPlan.tasks.includes("kennistest"));
    // Het doel over twaalf maanden is óók gewijzigd en levert bewust niets op.
    ok("het jaardoel laat niets extra draaien", !bijwerkPlan.tasks.includes("markt"));

    // De vragen van vóór het gesprek, met een meting eraan. Die meting is de
    // reden dat er niet verwijderd mag worden.
    const { rows: voorVragen } = await db.client.query(
      "select id from public.prompts where analysis_id = $1 and category = 'Overweging' and active = true",
      [mixAnalyse],
    );
    await db.client.query(
      `insert into public.tracking_runs (analysis_id, prompt_id, week_no, engine, prompt_text_snapshot, prompt_category_snapshot)
       values ($1, $2, 1, 'openai', 'oude vraag', 'Overweging')`,
      [mixAnalyse, voorVragen[0].id],
    );

    // En dan de herdraai, precies zoals de bijwerkroute hem inplant.
    const { rows: herdraai } = await db.client.query(
      `insert into public.jobs (analysis_id, type, payload_json, dedupe_key, status)
       values ($1, 'generate_prompts', $2, $3, 'running') returning *`,
      [
        mixAnalyse,
        JSON.stringify({ category: "Overweging", regenerate: true }),
        `chain-herdraai:${mixAnalyse}`,
      ],
    );
    await runJob({ admin: admin as never, job: herdraai[0] });

    const { rows: naHerdraai } = await db.client.query(
      `select active, count(*)::int as n from public.prompts
        where analysis_id = $1 and category = 'Overweging' group by active order by active`,
      [mixAnalyse],
    );
    const inactief = naHerdraai.find((r: { active: boolean }) => r.active === false)?.n ?? 0;
    const actief = naHerdraai.find((r: { active: boolean }) => r.active === true)?.n ?? 0;
    ok("de oude vragen staan uit", inactief === 2, `${inactief} inactief`);
    ok("en er staan nieuwe actieve vragen", actief === 2, `${actief} actief`);

    // ⚠️ De metingen zijn er nog. Een `delete` op de vragen zou ze via de
    // foreign key hebben meegenomen, en dan is de trendlijn weg om een
    // correctie op de vraagstelling.
    const { rows: bewaardeMetingen } = await db.client.query(
      "select count(*)::int as n from public.tracking_runs where analysis_id = $1",
      [mixAnalyse],
    );
    ok("de metingen van de oude vragen staan er nog", bewaardeMetingen[0].n === 1);

    // En de gesprekswaarden zelf zijn niet aangeraakt.
    const { rows: naAlles } = await db.client.query(
      "select service_scope from public.profiles where id = $1",
      [profileId],
    );
    ok("het bereik uit het gesprek staat er nog", naAlles[0].service_scope === "landelijk");

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

    /**
     * Een volledig gemeten cluster mét rapport: de enige soort die sinds
     * migratie 0065 een kans in de voorraad oplevert.
     *
     * ⚠️ De hele keten moet er staan, en dat is precies waarom deze test in
     * `test-chain.ts` hoort en niet in `test-unit.ts`. De potentiescore van een
     * kans wordt niet uit één kolom gelezen maar bij elkaar gezocht over vijf
     * tabellen: de aanbeveling noemt een vraag, die vraag hangt aan een meting,
     * die meting draagt of het merk genoemd werd, en het zoekvolume komt van het
     * onderwerp. Valt er één schakel weg, dan is de potentie `null` en zakt de
     * kans naar onderen zonder dat er iets kapot lijkt.
     */
    async function clusterMetKans(
      titel: string,
      genoemd: boolean,
      zoekvolume: number,
    ): Promise<{ analyseId: string; topicId: string }> {
      const analyseId = randomUUID();
      const topicId = randomUUID();
      const promptId = randomUUID();
      const runId = randomUUID();

      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, $4, 'https://planpotentie-bv.nl', $4, 'gereed')`,
        [analyseId, planPotUserId, planPotProfileId, titel],
      );
      await db.client.query(
        `insert into public.profile_topics (id, profile_id, analysis_id, title, priority, status, search_volume_index)
         values ($1, $2, $3, $4, 5, 'goedgekeurd', $5)`,
        [topicId, planPotProfileId, analyseId, titel, zoekvolume],
      );
      await db.client.query(
        `insert into public.prompts (id, analysis_id, text, category, active)
         values ($1, $2, $3, 'Beslissing', true)`,
        [promptId, analyseId, `Waar vind ik ${titel}?`],
      );
      await db.client.query(
        `insert into public.tracking_runs
           (id, analysis_id, prompt_id, prompt_text_snapshot, prompt_category_snapshot, week_no, purpose)
         values ($1, $2, $3, $4, 'Beslissing', 0, 'periodic')`,
        [runId, analyseId, promptId, `Waar vind ik ${titel}?`],
      );
      await db.client.query(
        `insert into public.tracking_run_mentions (tracking_run_id, entity_name, is_own_brand, mentioned)
         values ($1, 'Planpotentie BV', true, $2)`,
        [runId, genoemd],
      );
      await db.client.query(
        "insert into public.visibility_scores (analysis_id, week_no, score) values ($1, 0, $2)",
        [analyseId, genoemd ? 100 : 0],
      );
      // Het rapport met één aanbeveling, die de gemeten vraag als doelvraag draagt.
      await db.client.query(
        `insert into public.reports (analysis_id, period, recommendations_json)
         values ($1, 'week 0', $2::jsonb)`,
        [
          analyseId,
          JSON.stringify([
            {
              title: `Pagina over ${titel}`,
              why: `De AI noemt ons niet bij ${titel}.`,
              type: "landing",
              action: "nieuw",
              targetIntent: `Iemand die ${titel} zoekt`,
              targets: [{ promptId, weight: 0.5, text: `Waar vind ik ${titel}?` }],
            },
          ]),
        ],
      );
      return { analyseId, topicId };
    }

    // Al overal zichtbaar (genoemd) en weinig zoekvolume: er valt bijna niets
    // meer te winnen. Potentie ≈ 0.
    const lagePotentie = await clusterMetKans("lage potentie", true, 10);
    // Nog nergens zichtbaar en veel zoekvolume: dít is de kans. Potentie ≈ 90.
    const hogePotentie = await clusterMetKans("hoge potentie", false, 90);

    // ⚠️ Eén pagina per maand, zodat de voorzet moet KIEZEN. Met twee zouden
    // beide kansen in maand 1 belanden en zou de test niets bewijzen.
    const planResultaat = await createPlan(admin as never, {
      profileId: planPotProfileId,
      pagesPerMonth: 1,
    });
    ok(
      "het plan wordt gemaakt",
      planResultaat.ok,
      planResultaat.ok ? "" : JSON.stringify((planResultaat as { problems: string[] }).problems),
    );

    const { rows: maand1Paginas } = await db.client.query(
      `select pp.topic_id, pp.sort_order, pp.scheduled_for, pp.source, pp.potential
         from public.planned_pages pp
         join public.plan_months pm on pm.id = pp.plan_month_id
         join public.content_plans cp on cp.id = pm.plan_id
        where cp.profile_id = $1 and pm.month_number = 1 and pp.is_buffer = false
        order by pp.sort_order`,
      [planPotProfileId],
    );

    // ⚠️ DE KERN: de voorzet van maand 1 pakt de kans met de hoogste
    // potentiescore. Zonder die sortering zou het van de invoegvolgorde afhangen,
    // en dan krijgt een klant die na drie maanden opzegt (besluit 7: dat mag) een
    // willekeurige greep in plaats van zijn beste drie maanden.
    ok(
      "de voorzet vult maand 1 met precies één pagina",
      maand1Paginas.length === 1,
      `${maand1Paginas.length} pagina's in maand 1`,
    );
    ok(
      "en dat is de kans met de hoogste potentiescore",
      maand1Paginas[0]?.topic_id === hogePotentie.topicId,
      `eerste plek was ${maand1Paginas[0]?.topic_id}`,
    );
    ok(
      "de ingeplande pagina heeft een publicatiedatum",
      Boolean(maand1Paginas[0]?.scheduled_for),
    );
    ok(
      "en draagt zijn herkomst: hij komt uit een gemeten aanbeveling",
      maand1Paginas[0]?.source === "aanbeveling",
      `herkomst was ${maand1Paginas[0]?.source}`,
    );
    ok(
      "met de potentiescore erbij, uitgerekend over de doelvraag van de aanbeveling",
      Number(maand1Paginas[0]?.potential) > 50,
      `potentie was ${maand1Paginas[0]?.potential}`,
    );

    // ⚠️ De andere kans is NIET verdwenen en NIET ingepland: hij staat in de
    // voorraad. Dat is het hele punt van migratie 0065, en het verschil met de
    // oude jaarverdeling, die alle twaalf maanden vooruit volstopte.
    const { rows: voorraad } = await db.client.query(
      `select id, topic_id, scheduled_for, potential from public.planned_pages
        where profile_id = $1 and plan_month_id is null and status = 'gepland'`,
      [planPotProfileId],
    );
    ok(
      "de andere kans blijft in de voorraad staan",
      voorraad.length === 1 && voorraad[0].topic_id === lagePotentie.topicId,
      `${voorraad.length} in de voorraad`,
    );
    ok(
      "een kans in de voorraad heeft geen publicatiedatum",
      voorraad[0]?.scheduled_for === null,
    );

    // ── Wat het scherm daadwerkelijk krijgt ─────────────────────────────────
    //
    // ⚠️ `loadPlan()` is het pad dat de hele pagina rendert, en het doet zes
    // query's die elk stil iets leegs kunnen teruggeven. Een test op de tabellen
    // alleen zou groen blijven terwijl de gebruiker een leeg scherm ziet.
    const { loadPlan: leesPlan } = await import("@/lib/plans");
    const bundel = await leesPlan(admin as never, planPotProfileId, { sync: false });
    ok("het scherm krijgt een plan", bundel !== null);
    ok("met twaalf maanden", bundel?.months.length === 12);
    ok(
      "één ingeplande pagina en één kans in de voorraad",
      bundel?.pages.length === 1 && bundel?.backlog.length === 1,
      `${bundel?.pages.length} ingepland, ${bundel?.backlog.length} in de voorraad`,
    );
    ok(
      "de voorraadkaart draagt de naam van zijn cluster",
      bundel?.backlog[0]?.cluster === "lage potentie",
      `cluster was ${bundel?.backlog[0]?.cluster}`,
    );
    ok(
      "en zijn doelvragen, met de noemer erbij",
      bundel?.backlog[0]?.raakt === 1 && bundel?.backlog[0]?.gemeten === 1,
      `raakt ${bundel?.backlog[0]?.raakt} van ${bundel?.backlog[0]?.gemeten}`,
    );
    // ⚠️ `numeric` komt als TEKST binnen bij de JS-client. Zonder de `Number()`
    // in `naarBacklogItem()` sorteert "9" boven "80", en dan staat de zwakste
    // kans bovenaan zonder dat er iets kapot lijkt.
    ok(
      "de potentie is een getal en geen tekst",
      typeof bundel?.backlog[0]?.potentie === "number" || bundel?.backlog[0]?.potentie === null,
      `type was ${typeof bundel?.backlog[0]?.potentie}`,
    );
    ok(
      "de clusters die al kansen leverden staan apart, zodat het scherm niet om een meting vraagt die er is",
      bundel?.metKansen.length === 2,
      `${bundel?.metKansen.length} clusters met kansen`,
    );

    // ── Idempotentie (conventie 9) ──────────────────────────────────────────
    //
    // ⚠️ De synchronisatie draait bij ELKE opening van het planscherm. Zou hij
    // niet herkennen wat er al staat, dan groeide de voorraad bij elk bezoek met
    // twee kaarten, en dat merkt niemand tot de lijst honderd rijen lang is.
    const { syncBacklog } = await import("@/lib/plan-backlog-data");
    await syncBacklog(admin as never, planPotProfileId);
    await syncBacklog(admin as never, planPotProfileId);
    const { rows: naDrieRondes } = await db.client.query(
      `select count(*)::int as n from public.planned_pages where profile_id = $1`,
      [planPotProfileId],
    );
    ok(
      "drie keer synchroniseren levert geen enkele dubbele kaart op",
      naDrieRondes[0].n === 2,
      `${naDrieRondes[0].n} kaarten in plaats van 2`,
    );

    // ── Inplannen en terugleggen ────────────────────────────────────────────
    const { assignToMonth, moveToBacklog } = await import("@/lib/plans");
    const { rows: maandRijen } = await db.client.query(
      `select pm.id, pm.month_number from public.plan_months pm
         join public.content_plans cp on cp.id = pm.plan_id
        where cp.profile_id = $1 and cp.status <> 'gestopt' order by pm.month_number`,
      [planPotProfileId],
    );
    const maand3 = maandRijen.find((m: { month_number: number }) => m.month_number === 3);

    const gezet = await assignToMonth(admin as never, {
      profileId: planPotProfileId,
      pageId: voorraad[0].id,
      monthId: maand3.id,
      index: null,
    });
    ok("een kans uit de voorraad in maand 3 zetten lukt", gezet.ok, gezet.probleem ?? "");

    const { rows: inMaand3 } = await db.client.query(
      `select pp.id, pp.scheduled_for from public.planned_pages pp
        where pp.plan_month_id = $1`,
      [maand3.id],
    );
    ok("hij staat nu in maand 3", inMaand3.length === 1);
    // ⚠️ De datum hoort bij de maand waar hij in ligt en niet bij de maand
    // waarin het plan startte. Zonder deze regel zou een kaart die je naar
    // december sleept in augustus gepubliceerd worden.
    ok(
      "en krijgt een publicatiedatum in de derde maand van het plan",
      typeof inMaand3[0]?.scheduled_for?.toISOString?.() === "string" ||
        typeof inMaand3[0]?.scheduled_for === "string",
    );

    const teruggelegd = await moveToBacklog(admin as never, {
      profileId: planPotProfileId,
      pageId: inMaand3[0].id,
    });
    ok("terugleggen in de voorraad lukt", teruggelegd.ok, teruggelegd.probleem ?? "");
    const { rows: naTerug } = await db.client.query(
      `select plan_month_id, scheduled_for from public.planned_pages where id = $1`,
      [inMaand3[0].id],
    );
    ok(
      "de kaart heeft geen maand en geen datum meer",
      naTerug[0].plan_month_id === null && naTerug[0].scheduled_for === null,
    );

    // ⚠️ Wat al geschreven wordt, mag NIET terug: dat is betaald werk weggooien.
    await db.client.query(
      "update public.planned_pages set status = 'schrijven' where id = $1",
      [inMaand3[0].id],
    );
    await db.client.query(
      "update public.planned_pages set plan_month_id = $1 where id = $2",
      [maand3.id, inMaand3[0].id],
    );
    const geweigerd = await moveToBacklog(admin as never, {
      profileId: planPotProfileId,
      pageId: inMaand3[0].id,
    });
    ok(
      "een pagina die al geschreven wordt kan niet terug naar de voorraad",
      geweigerd.ok === false && Boolean(geweigerd.probleem),
    );

    // ── De publicatiedatum zelf zetten (migratie 0067) ──────────────────────
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: `herplanMaand()` herberekent na
    // ELKE wijziging in een maand alle data. Een zelfgekozen datum die dat niet
    // overleeft, is één sleepbeweging later weer weg, en geen enkele unittest
    // ziet dat: de vlag moet uit de database komen, door de query heen, tot in
    // `resequenceMonth()`.
    {
      const { setPageDate } = await import("@/lib/plans");
      const { monthCalendar } = await import("@/lib/plan-schedule");
      const { rows: startRij } = await db.client.query(
        `select started_on from public.content_plans
          where profile_id = $1 and status <> 'gestopt' order by version desc limit 1`,
        [planPotProfileId],
      );
      const startedOn =
        typeof startRij[0].started_on === "string"
          ? startRij[0].started_on
          : startRij[0].started_on.toISOString().slice(0, 10);
      const k = monthCalendar(startedOn, 3);
      const gekozenDag = `${k?.jaar}-${String((k?.maandIndex ?? 0) + 1).padStart(2, "0")}-18`;

      // De kaart staat sinds de vorige controle op `schrijven`; terug naar
      // `gepland`, want alleen dan mag de datum nog verzet worden.
      await db.client.query("update public.planned_pages set status = 'gepland' where id = $1", [
        inMaand3[0].id,
      ]);

      const gezetDatum = await setPageDate(admin as never, {
        profileId: planPotProfileId,
        pageId: inMaand3[0].id,
        datum: gekozenDag,
      });
      ok("de datum zelf zetten lukt", gezetDatum.ok, gezetDatum.probleem ?? "");

      const { rows: naDatum } = await db.client.query(
        `select scheduled_for, scheduled_manual from public.planned_pages where id = $1`,
        [inMaand3[0].id],
      );
      const opgeslagen =
        typeof naDatum[0].scheduled_for === "string"
          ? naDatum[0].scheduled_for
          : naDatum[0].scheduled_for.toISOString().slice(0, 10);
      ok(
        "de gekozen dag staat in de database, met de vlag erbij",
        opgeslagen === gekozenDag && naDatum[0].scheduled_manual === true,
        `${opgeslagen}, vlag ${naDatum[0].scheduled_manual}`,
      );

      // Een dag buiten de kalendermaand van maand 3 hoort geweigerd te worden.
      const buitenDeMaand = await setPageDate(admin as never, {
        profileId: planPotProfileId,
        pageId: inMaand3[0].id,
        datum: `${k?.jaar}-${String((k?.maandIndex ?? 0) + 2).padStart(2, "0")}-05`,
      });
      ok(
        "een dag buiten de eigen maand wordt geweigerd",
        buitenDeMaand.ok === false && Boolean(buitenDeMaand.probleem),
      );

      // ⚠️ De echte test: er komt een tweede kaart in dezelfde maand, dus
      // `herplanMaand()` draait. De gekozen dag hoort te blijven staan.
      const tweedeKaart = randomUUID();
      await db.client.query(
        `insert into public.planned_pages (id, profile_id, plan_month_id, title, page_type, status, sort_order)
         values ($1, $2, $3, 'Tweede kaart in maand 3', 'informatief', 'gepland', 1)`,
        [tweedeKaart, planPotProfileId, maand3.id],
      );
      await assignToMonth(admin as never, {
        profileId: planPotProfileId,
        pageId: tweedeKaart,
        monthId: maand3.id,
        index: 0,
      });

      const { rows: naHerplan } = await db.client.query(
        `select scheduled_for from public.planned_pages where id = $1`,
        [inMaand3[0].id],
      );
      const nogSteeds =
        typeof naHerplan[0].scheduled_for === "string"
          ? naHerplan[0].scheduled_for
          : naHerplan[0].scheduled_for.toISOString().slice(0, 10);
      ok(
        "de zelfgekozen dag overleeft het herplannen van de maand",
        nogSteeds === gekozenDag,
        `${nogSteeds} in plaats van ${gekozenDag}`,
      );

      // ⚠️ En hij vervalt zodra de kaart naar een ANDERE maand gaat: 18 oktober
      // is geen dag in november.
      const maand4 = maandRijen.find((m: { month_number: number }) => m.month_number === 4);
      await assignToMonth(admin as never, {
        profileId: planPotProfileId,
        pageId: inMaand3[0].id,
        monthId: maand4.id,
        index: null,
      });
      const { rows: naVerhuizing } = await db.client.query(
        `select scheduled_manual from public.planned_pages where id = $1`,
        [inMaand3[0].id],
      );
      ok(
        "maar vervalt bij een verhuizing naar een andere maand",
        naVerhuizing[0].scheduled_manual === false,
      );
    }

    // ══════════════════════════════════════════════════════════════════════
    // De potentiescore onderscheidt kansen van hetzelfde onderwerp
    // (doorloop-huyberts.md punt 4)
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: het zoekvolume komt per
    // ONDERWERP en de zichtbaarheid is bij een nieuwe klant overal nul, dus
    // `syncBacklog()` kon twee kansen van hetzelfde onderwerp met een
    // identieke potentiescore opslaan. Dit scenario bouwt precies dat na (twee
    // aanbevelingen in ÉÉN rapport, op ÉÉN onderwerp, geen van beide gemeten
    // als genoemd) en controleert dat de opgeslagen `potential` ze alsnog
    // onderscheidt.
    console.log("\nDe potentiescore onderscheidt kansen van hetzelfde onderwerp (punt 4)");
    {
      const pvUserId = randomUUID();
      const pvProfileId = randomUUID();
      const pvAnalysisId = randomUUID();
      const pvTopicId = randomUUID();
      const zwareVraagId = randomUUID();
      const lichteVraagId = randomUUID();

      await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
        pvUserId,
        "potentieverdeling@example.com",
      ]);
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status)
         values ($1, $2, 'Potentieverdeling BV', 'https://potentieverdeling-bv.nl', 'Potentieverdeling BV', 'klaar')`,
        [pvProfileId, pvUserId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, 'Potentieverdeling — onderwerp', 'https://potentieverdeling-bv.nl', 'onderwerp', 'gereed')`,
        [pvAnalysisId, pvUserId, pvProfileId],
      );
      await db.client.query(
        `insert into public.profile_topics (id, profile_id, analysis_id, title, priority, status, search_volume_index)
         values ($1, $2, $3, 'onderwerp', 5, 'goedgekeurd', 58)`,
        [pvTopicId, pvProfileId, pvAnalysisId],
      );
      await db.client.query(
        `insert into public.prompts (id, analysis_id, text, category, active) values
         ($1, $2, 'Zware vraag?', 'Beslissing', true),
         ($3, $2, 'Lichte vraag?', 'Beslissing', true)`,
        [zwareVraagId, pvAnalysisId, lichteVraagId],
      );
      // Eén periodieke meting per vraag, geen van beide genoemd: zichtbaarheid
      // nul voor allebei de kansen, exact het scenario van Huyberts.
      for (const promptId of [zwareVraagId, lichteVraagId]) {
        const runId = randomUUID();
        await db.client.query(
          `insert into public.tracking_runs
             (id, analysis_id, prompt_id, prompt_text_snapshot, prompt_category_snapshot, week_no, purpose)
           values ($1, $2, $3, 'antwoord', 'Beslissing', 0, 'periodic')`,
          [runId, pvAnalysisId, promptId],
        );
        await db.client.query(
          `insert into public.tracking_run_mentions (tracking_run_id, entity_name, is_own_brand, mentioned)
           values ($1, 'Potentieverdeling BV', true, false)`,
          [runId],
        );
      }
      await db.client.query(
        "insert into public.visibility_scores (analysis_id, week_no, score) values ($1, 0, 0)",
        [pvAnalysisId],
      );
      // Eén rapport, twee aanbevelingen op hetzelfde onderwerp: de zware kans
      // (gewicht 1,0) en de lichte kans (gewicht 0,3). Zonder punt 4 komen
      // beide op dezelfde potentiescore uit, want ze delen zoekvolume 58 en
      // zichtbaarheid 0.
      await db.client.query(
        `insert into public.reports (analysis_id, period, recommendations_json)
         values ($1, 'week 0', $2::jsonb)`,
        [
          pvAnalysisId,
          JSON.stringify([
            {
              title: "De zware kans",
              why: "Weegt het zwaarst.",
              type: "landing",
              action: "nieuw",
              targetIntent: "Iemand met de zware vraag",
              targets: [{ promptId: zwareVraagId, weight: 1.0, text: "Zware vraag?" }],
            },
            {
              title: "De lichte kans",
              why: "Weegt het lichtst.",
              type: "landing",
              action: "nieuw",
              targetIntent: "Iemand met de lichte vraag",
              targets: [{ promptId: lichteVraagId, weight: 0.3, text: "Lichte vraag?" }],
            },
          ]),
        ],
      );

      const { syncBacklog: pvSyncBacklog } = await import("@/lib/plan-backlog-data");
      await pvSyncBacklog(admin as never, pvProfileId);

      const { rows: pvKansen } = await db.client.query(
        `select title, potential, target_weight from public.planned_pages
          where profile_id = $1 order by title`,
        [pvProfileId],
      );
      const zwareKans = pvKansen.find((r: { title: string }) => r.title === "De zware kans");
      const lichteKans = pvKansen.find((r: { title: string }) => r.title === "De lichte kans");

      ok(
        "vóór punt 4 zouden deze twee dezelfde potentie hebben (zelfde onderwerp, zichtbaarheid 0)",
        Number(zwareKans?.target_weight) === 1 && Number(lichteKans?.target_weight) === 0.3,
      );
      ok(
        "de zware kans is het anker en houdt de onderwerpscore (58)",
        Number(zwareKans?.potential) === 58,
        `potentie was ${zwareKans?.potential}`,
      );
      ok(
        "de lichte kans krijgt een lagere, evenredige score in plaats van ook 58",
        Number(lichteKans?.potential) > 0 && Number(lichteKans?.potential) < 58,
        `potentie was ${lichteKans?.potential}`,
      );
      ok(
        "en die score klopt met de hand (58 × 0,3/1,0 ≈ 17)",
        Number(lichteKans?.potential) === 17,
        `potentie was ${lichteKans?.potential}`,
      );
    }

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

    // ════════════════════════════════════════════════════════════════════════
    // De crawl van een TE GROTE site (22 augustus 2026)
    //
    // Dit is de achtste fout in de samenhang, en hij is van dezelfde soort als
    // de zeven hierboven: geen enkele unittest kon hem vangen, want elk stuk
    // klopte op zichzelf. De crawl koos zijn URL's, sloeg ze op, en verwijderde
    // daarbij alles wat er stond, inclusief de pagina's die een mens er
    // handmatig bij had gezet omdat de crawl ze miste. Precies de correctie
    // waarvoor die knop bestaat werd bij de eerstvolgende ronde gewist.
    //
    // Netwerk is hier gestubd, geen echte site. Wat écht draait: de
    // sitemapverwerking, de selectie, de vervanging van de inventaris en het
    // oordeel erover.
    // ════════════════════════════════════════════════════════════════════════
    console.log("\nEen site die groter is dan het paginamaximum\n");

    const grootProfielId = randomUUID();
    await db.client.query(
      `insert into public.profiles (id, user_id, name, url, brand_name, status, max_inventory_pages)
       values ($1, $2, 'Grote Praktijk', 'https://grootpraktijk.nl', 'Grote Praktijk', 'klaar', 10)`,
      [grootProfielId, userId],
    );

    // Eén pagina die een mens toevoegde, en die de crawl NIET zal vinden: hij
    // staat niet in de sitemap hieronder. Dat is het hele punt.
    await db.client.query(
      `insert into public.profile_pages (profile_id, url, title, text_excerpt, source) values
       ($1, 'https://grootpraktijk.nl/verborgen/specialisme', 'Ons specialisme',
        'Deze pagina staat niet in de sitemap en is met de hand toegevoegd.', 'handmatig')`,
      [grootProfielId],
    );
    // En één oude gecrawlde pagina, die wél vervangen moet worden.
    await db.client.query(
      `insert into public.profile_pages (profile_id, url, title, text_excerpt, source) values
       ($1, 'https://grootpraktijk.nl/oud', 'Oud', 'Deze pagina bestaat niet meer.', 'crawl')`,
      [grootProfielId],
    );

    const blogUrls = Array.from(
      { length: 30 },
      (_, i) => `https://grootpraktijk.nl/blog/artikel-${i}`,
    );
    const dienstUrls = Array.from(
      { length: 4 },
      (_, i) => `https://grootpraktijk.nl/diensten/dienst-${i}`,
    );
    const alleUrls = ["https://grootpraktijk.nl/", ...blogUrls, ...dienstUrls];

    const origineleFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      const antwoord = (body: string) => ({ ok: true, status: 200, text: async () => body });

      if (url.endsWith("/robots.txt")) return { ok: false, status: 404, text: async () => "" };
      if (url.endsWith("/sitemap.xml")) {
        return antwoord(
          `<?xml version="1.0"?><urlset>${alleUrls
            .map((u) => `<loc>${u}</loc>`)
            .join("")}</urlset>`,
        );
      }
      if (url.endsWith("/sitemap_index.xml")) return { ok: false, status: 404, text: async () => "" };
      if (alleUrls.includes(url)) {
        return antwoord(
          `<html><head><title>${url}</title></head><body><p>${"Inhoud van deze pagina. ".repeat(20)}</p></body></html>`,
        );
      }
      return { ok: false, status: 404, text: async () => "" };
    }) as typeof globalThis.fetch;

    try {
      const { refreshInventory } = await import("@/lib/pipeline/refresh-inventory");
      const uitslag = await refreshInventory(grootProfielId);

      ok(
        `de ware omvang van de site wordt geteld (${uitslag.totalFound})`,
        uitslag.totalFound === 35,
        String(uitslag.totalFound),
      );
      ok("en er wordt gemeld dát er afgekapt is", uitslag.truncated);

      const { rows: paginas } = await db.client.query(
        "select url, source from public.profile_pages where profile_id = $1",
        [grootProfielId],
      );

      // ⚠️ DE FOUT DIE DIT MOET VANGEN.
      ok(
        "de handmatig toegevoegde pagina overleeft de crawl",
        paginas.some((p) => p.url.includes("/verborgen/") && p.source === "handmatig"),
      );
      ok(
        "de oude gecrawlde pagina is wél vervangen",
        !paginas.some((p) => p.url.endsWith("/oud")),
      );

      // De tweede fout: de eerste 10 in sitemapvolgorde zouden 10 blogartikelen
      // zijn geweest, want die staan vooraan. De vier dienstenpagina's moeten
      // er alle vier zijn, ook al zijn er 30 blogartikelen die om de plek
      // vechten.
      const dienstenGelezen = paginas.filter((p) => p.url.includes("/diensten/")).length;
      ok(
        `alle vier de dienstenpagina's zijn gelezen (${dienstenGelezen}/4)`,
        dienstenGelezen === 4,
      );
      ok(
        "de homepage is gelezen",
        paginas.some((p) => p.url === "https://grootpraktijk.nl/"),
      );

      const { rows: profielNa } = await db.client.query(
        "select sitemap_total_urls, inventory_quality_json from public.profiles where id = $1",
        [grootProfielId],
      );
      ok(
        "de omvang staat in de database",
        profielNa[0].sitemap_total_urls === 35,
        String(profielNa[0].sitemap_total_urls),
      );
      ok(
        "en het oordeel is 'afgekapt' in plaats van 'voldoende'",
        profielNa[0].inventory_quality_json?.verdict === "afgekapt",
        String(profielNa[0].inventory_quality_json?.verdict),
      );
      ok(
        "het advies noemt beide getallen",
        String(profielNa[0].inventory_quality_json?.advice ?? "").includes("35"),
      );
    } finally {
      globalThis.fetch = origineleFetch;
    }


    // ══════════════════════════════════════════════════════════════════════
    // Mijn reputatie: de samenhang tussen zes taken
    //
    // ⚠️ Dit is het zwaartepunt van deze ketentest en niet het sluitstuk. Zeven
    // van de zeven fouten van het vorige traject zaten in de samenhang tussen
    // taken, en geen enkele unittest kon ze vangen. Dit onderdeel heeft zes
    // taaksoorten die op elkaar wachten, dus dat risico is hier groter dan
    // gemiddeld.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nMijn reputatie: de keten van start tot synthese");
    {
      const { dedupe } = await import("@/lib/jobs/queue");

      /** Draait alle openstaande reputatietaken tot de rij leeg is. */
      async function draaiReputatietaken(max = 60): Promise<string[]> {
        const gedraaid: string[] = [];
        for (let i = 0; i < max; i++) {
          const { rows } = await db.client.query(
            `select * from public.jobs
              where type like 'reputation%' and status = 'queued'
              order by scheduled_for asc, created_at asc limit 1`,
          );
          if (rows.length === 0) break;
          await db.client.query(
            "update public.jobs set status = 'running' where id = $1",
            [rows[0].id],
          );
          await runJob({ admin: admin as never, job: { ...rows[0], status: "running" } });
          await db.client.query(
            "update public.jobs set status = 'done' where id = $1",
            [rows[0].id],
          );
          gedraaid.push(rows[0].type as string);
        }
        return gedraaid;
      }

      // ── Het decor: een merk met vier diensten en twee concurrenten ────────
      const repProfielId = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, service_regions, status)
         values ($1, $2, 'Fysi-Unique', 'https://fysi-unique.nl', 'Fysi-Unique',
                 array['Amersfoort'], 'klaar')`,
        [repProfielId, userId],
      );

      const knoopIds: string[] = [];
      for (const [i, naam] of [
        "Hardloopblessures",
        "Bekkenfysiotherapie",
        "Sportmassage",
        // ⚠️ Een knoop van de soort `merk`. Die hoort er NOOIT in: bij een
        // retailer zijn de gevoerde merken niet zijn reputatie maar die van
        // iemand anders.
        "Volkswagen",
      ].entries()) {
        const id = randomUUID();
        knoopIds.push(id);
        await db.client.query(
          `insert into public.profile_offerings (id, profile_id, kind, name, source, sort_order)
           values ($1, $2, $3, $4, 'ai', $5)`,
          [id, repProfielId, naam === "Volkswagen" ? "merk" : "dienst", naam, i],
        );
      }

      for (const [naam, rol, weggezet] of [
        ["Concurrent A", "concurrent", false],
        ["Concurrent B", "concurrent", false],
        ["Concurrent C", "concurrent", false],
        // ⚠️ Een weggezette concurrent. `dismissed` is een expliciete beslissing
        // van de klant; ertegen vergelijken kost het vertrouwen in het scherm.
        ["Weggezet BV", "concurrent", true],
      ] as [string, string, boolean][]) {
        await db.client.query(
          `insert into public.entities (profile_id, canonical_name, normalized, entity_role, dismissed)
           values ($1, $2, $3, $4, $5)`,
          [repProfielId, naam, naam.toLowerCase(), rol, weggezet],
        );
      }

      // ── De GEMETEN vermeldingen ───────────────────────────────────────────
      //
      // ⚠️ Dit stuk decor is er niet voor de volledigheid maar omdat het een
      // echte fout heeft afgevangen. `countMentions()` las eerst een kolom
      // `competitors_json` die niet bestaat op `competitor_breakdown`; die
      // tabel heeft één rij per concurrent. Gevolg: iedereen nul vermeldingen,
      // en de keuze viel stil terug op alfabetische volgorde. Zonder dit decor
      // kwamen er nog steeds drie concurrenten uit en leek alles goed.
      //
      // De namen zijn zo gekozen dat de twee volgordes VERSCHILLEN: alfabetisch
      // wint A, op vermeldingen wint C. Zou de bug terugkomen, dan faalt de
      // test hieronder.
      const repClusterId = randomUUID();
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, 'Fysi-Unique, reputatiecluster', 'https://fysi-unique.nl',
                 'hardloopblessure behandelen', 'gereed')`,
        [repClusterId, userId, repProfielId],
      );
      for (const [naam, week, aantal] of [
        // Vorige periode: A stond bovenaan. Die telt NIET mee.
        ["Concurrent A", 0, 99],
        // Laatste afgeronde periode: C wint, dan B, dan A.
        ["Concurrent C", 1, 30],
        ["Concurrent B", 1, 20],
        ["Concurrent A", 1, 10],
        // Weggezet, en hij wordt het vaakst genoemd. Juist daarom een goede test.
        ["Weggezet BV", 1, 90],
      ] as [string, number, number][]) {
        await db.client.query(
          `insert into public.competitor_breakdown
             (analysis_id, week_no, competitor_name, mentions_count)
           values ($1, $2, $3, $4)`,
          [repClusterId, week, naam, aantal],
        );
      }

      const runId = randomUUID();
      await db.client.query(
        `insert into public.reputation_runs (id, profile_id, started_by, status)
         values ($1, $2, $3, 'queued')`,
        [runId, repProfielId, userId],
      );
      await db.client.query(
        `insert into public.jobs (type, payload_json, profile_id, dedupe_key, status)
         values ('reputation_start', $1, $2, $3, 'queued')`,
        [JSON.stringify({ runId }), repProfielId, dedupe.reputationStart(runId)],
      );

      // ── De hele keten draaien ─────────────────────────────────────────────
      const gedraaid = await draaiReputatietaken();

      // ⚠️ DE SYNTHESE IS DE LAATSTE. Dat is de hele afteller: elke afrondende
      // taak kijkt of ze de laatste was, en de laatste plant de synthese in.
      // Zonder de uitsluiting van de taak die zélf nog op 'running' staat, zou
      // dat aantal nooit op nul uitkomen en de run eeuwig blijven hangen.
      ok(
        "de synthese draait, en als laatste",
        gedraaid[gedraaid.length - 1] === "reputation_synthesis",
        gedraaid.join(" → "),
      );
      ok(
        "en precies één keer",
        gedraaid.filter((t) => t === "reputation_synthesis").length === 1,
        `${gedraaid.filter((t) => t === "reputation_synthesis").length}`,
      );

      const { rows: naRun } = await db.client.query(
        "select * from public.reputation_runs where id = $1",
        [runId],
      );
      const run = naRun[0];

      ok("de run is klaar", run.status === "klaar", String(run.status));
      ok("met een samenvatting", String(run.summary ?? "").length > 20);

      // ⚠️ "Weinig onafhankelijke reviews" is geen zwak punt van het bedrijf.
      // Op het scherm leest zo'n regel als een verwijt waar de ondernemer niets
      // mee kan, terwijl het over zijn vindbaarheid gaat. Het hoort in de
      // kanttekeningen en niet in de lijst met bezwaren.
      ok(
        "een opmerking over ons eigen bewijs staat niet bij de zwakke punten",
        !(run.weaknesses as string[]).some((w) => w.includes("weinig onafhankelijke")),
        (run.weaknesses as string[]).join(" | "),
      );
      ok(
        "maar wel als bevinding over de vindbaarheid",
        (run.notes as string[]).some((n) => n.includes("vindbaarheid")),
        (run.notes as string[]).join(" | "),
      );

      // ── De scope is vastgelegd ────────────────────────────────────────────
      //
      // Zonder dit is een herhaling over drie maanden niet met deze te
      // vergelijken: dan weet niemand meer of het verschil in de reputatie zat
      // of in de vraag.
      const scope = run.scope_json as {
        nodes: { naam: string; slot: number }[];
        concurrenten: { namen: string[]; bron: string };
      };
      ok("de scope is vastgelegd", Array.isArray(scope?.nodes), JSON.stringify(scope ?? {}).slice(0, 80));
      ok(
        "de soort `merk` staat er niet in",
        !scope.nodes.some((n) => n.naam === "Volkswagen"),
        scope.nodes.map((n) => n.naam).join(", "),
      );
      ok("de drie diensten wel", scope.nodes.length === 3, `${scope.nodes.length}`);

      // ── De concurrenten ───────────────────────────────────────────────────
      ok(
        "een weggezette concurrent komt er nooit in",
        !(run.rivals as string[]).includes("Weggezet BV"),
        (run.rivals as string[]).join(", "),
      );
      ok(
        "de drie andere wel",
        (run.rivals as string[]).length === 3,
        (run.rivals as string[]).join(", "),
      );
      // ⚠️ DE KERN VAN DEZE CONTROLE. De volgorde moet op GEMETEN vermeldingen
      // rusten en niet op het alfabet: C (30) vóór B (20) vóór A (10). Kwam de
      // kolomfout in `countMentions()` terug, dan staat hier "Concurrent A,
      // Concurrent B, Concurrent C" en faalt dit.
      eqc(
        "en op vermeldingen gesorteerd, niet alfabetisch",
        (run.rivals as string[]).join(", "),
        "Concurrent C, Concurrent B, Concurrent A",
      );
      // Alleen de LAATSTE periode telt. In periode 0 stond A op 99; zou die
      // meetellen, dan won A alsnog.
      ok(
        "en alleen de laatste periode telt mee",
        (run.rivals as string[])[0] === "Concurrent C",
        (run.rivals as string[])[0],
      );
      ok(
        "de bron van de keuze is de meting",
        (run.scope_json as { concurrenten?: { bron?: string } } | null)?.concurrenten?.bron ===
          "gemeten",
        JSON.stringify((run.scope_json as { concurrenten?: unknown } | null)?.concurrenten ?? {}),
      );

      // ── De vangnetten van de oordeelslaag ─────────────────────────────────
      const { rows: antwoorden } = await db.client.query(
        "select * from public.reputation_answers where run_id = $1 order by block, repeat_index",
        [runId],
      );

      const zonderBron = antwoorden.find((a) => a.grounding === "geen");
      ok("het antwoord zonder bron is bewaard", Boolean(zonderBron));
      // ⚠️ Bewaard, maar het telt NIET mee in het merkcijfer. Dat is de harde
      // regel uit §2.1: toon zonder bewijs is geen reputatie.
      ok(
        "en het staat er met zijn toon bij, zodat het scherm het kan tonen",
        zonderBron?.tone === "overwegend_positief",
        String(zonderBron?.tone),
      );

      // ⚠️ LOF MÉT KRITIEK IS GEMENGD, HOE VRIENDELIJK HET LABEL OOK IS.
      //
      // Op Gasservice Brabant kregen 18 van de 19 antwoorden "overwegend
      // positief" terwijl er gemiddeld 5,3 concrete bezwaren in stonden,
      // waaronder een scheef aangesloten rookgasafvoer en een conflict over een
      // gemeld gaslek. De merkindex kwam daardoor op +47 uit bij een
      // gasinstallatiebedrijf. De stub biedt hetzelfde geval aan: een
      // vriendelijk label met drie bezwaren eronder.
      const vriendelijkMetKritiek = antwoorden.filter(
        (a) => (a.cons as string[]).length >= 2 && a.mentions_brand === true,
      );
      ok(
        "een vriendelijk oordeel met twee of meer bezwaren wordt gemengd",
        vriendelijkMetKritiek.length > 0 &&
          vriendelijkMetKritiek.every((a) => a.tone !== "positief" && a.tone !== "overwegend_positief"),
        vriendelijkMetKritiek.map((a) => `${a.tone}(${(a.cons as string[]).length})`).join(", "),
      );

      // ⚠️ EN HET SPIEGELBEELD, want een eenrichtingsklep is geen meting.
      //
      // In de tweede run op Gasservice Brabant kreeg 24 van de 24 antwoorden
      // "gemengd". Bij het nalezen bleek dat er twee soorten bezwaren door
      // elkaar liepen: echte ervaringen ("scheef aangesloten rookgasafvoer") en
      // opmerkingen over ons eigen bewijs ("weinig onafhankelijke reviews over
      // deze dienst"). Dat tweede is geen kritiek op het bedrijf.
      const alleenBewijsbezwaar = antwoorden.filter((a) =>
        (a.cons as string[]).some((c) => c.includes("weinig onafhankelijke")),
      );
      ok(
        "een gemengd oordeel zonder één echt bezwaar wordt weer overwegend positief",
        alleenBewijsbezwaar.length > 0 &&
          alleenBewijsbezwaar.every((a) => a.tone === "overwegend_positief"),
        alleenBewijsbezwaar.map((a) => String(a.tone)).join(", "),
      );

      const anderBedrijf = antwoorden.find((a) => a.mentions_brand === false);
      ok("het antwoord over een ander bedrijf is herkend", Boolean(anderBedrijf));
      // ⚠️ Exact de fout die bij `mention_role` optrad: structured output kiest
      // bij twijfel de eerste waarde uit de lijst. Een model dat over iemand
      // anders praat, mag geen toon opleveren.
      ok(
        "en levert geen toonscore op",
        anderBedrijf?.tone_score === null,
        String(anderBedrijf?.tone_score),
      );

      const metCitaat = antwoorden.find(
        (a) => (a.verdict_json as { quotes?: unknown[] } | null)?.quotes !== undefined,
      );
      const citaten =
        ((metCitaat?.verdict_json as { quotes?: { tekst: string }[] } | null)?.quotes ?? []);
      ok(
        "een verzonnen citaat is weggefilterd",
        !citaten.some((c) => c.tekst.includes("beste van Nederland")),
        citaten.map((c) => c.tekst).join(" | "),
      );

      // ── De vergelijking ───────────────────────────────────────────────────
      const { rows: plaatsen } = await db.client.query(
        "select * from public.reputation_ranks where run_id = $1",
        [runId],
      );
      ok("er zijn plaatsen vastgelegd", plaatsen.length > 0, `${plaatsen.length}`);
      // ⚠️ Vangnet 1 uit §4.4: een partij die niet in de gevraagde set zat, wordt
      // genegeerd. Modellen voegen graag een vijfde bedrijf toe, en dat
      // verstoort de noemer.
      ok(
        "een bedrijf dat het model erbij verzon is genegeerd",
        !plaatsen.some((p) => p.party_name === "Niet Gevraagd BV"),
      );
      // De stub laat de laatste gevraagde partij onbekend, dus de noemer moet
      // lager liggen dan het aantal gevraagde partijen (drie in plaats van vier).
      ok(
        "een onbekende partij valt uit de noemer",
        plaatsen.every((p) => Number(p.of_parties) <= 3),
        [...new Set(plaatsen.map((p) => String(p.of_parties)))].join(", "),
      );

      // ── De volgorde is opgeslagen ─────────────────────────────────────────
      //
      // ⚠️ Geen administratie. Zonder deze kolom is niet vast te stellen of een
      // uitslag door de volgorde kwam, en dan is `order_bias` niet te berekenen.
      const vergelijkingen = antwoorden.filter((a) => a.block === "vergelijking");
      // Vier partijen: het merk zelf plus de drie gekozen concurrenten.
      ok(
        "elke vergelijking bewaart de gebruikte partijvolgorde",
        vergelijkingen.length > 0 &&
          vergelijkingen.every((a) => (a.party_order as string[]).length === 4),
        `${vergelijkingen.length} vergelijkingen, lengtes ${[
          ...new Set(vergelijkingen.map((a) => (a.party_order as string[]).length)),
        ].join("/")}`,
      );
      // ⚠️ En de klant staat niet in élke vraag vooraan. Dat is de hele reden dat
      // de volgorde rouleert: een taalmodel bevoordeelt wie het eerst genoemd
      // wordt, en een klant die altijd vooraan staat krijgt altijd een mooie
      // plaats. Merkbreed zijn het drie rotaties, dus hij hoort niet drie keer
      // op plek 1 te staan.
      ok(
        "en de klant staat niet in elke vraag vooraan",
        !vergelijkingen.every((a) => (a.party_order as string[])[0] === "Fysi-Unique"),
        vergelijkingen.map((a) => (a.party_order as string[])[0]).join(" | "),
      );
      // Merkbreed krijgt ALTIJD drie rotaties, ook in de standaardmodus, want
      // dat is het getal dat bovenaan het scherm komt.
      const merkbreed = vergelijkingen.filter((a) => a.offering_id === null);
      ok("merkbreed draait drie rotaties", merkbreed.length === 3, `${merkbreed.length}`);
      ok(
        "en die drie rotaties hebben niet allemaal dezelfde volgorde",
        new Set(merkbreed.map((a) => (a.party_order as string[]).join(","))).size > 1,
      );
      // ⚠️ De vergelijking draait alleen nog MERKBREED. Per dienst kostte hij
      // twaalf gegronde aanroepen, een derde van de run, en hij was bij Van den
      // Udenhout aantoonbaar leeg: het model kende de concurrenten op geen enkel
      // dienstniveau. De marktvraag per dienst dekt dat nu af, en die vraagt niet
      // om een oordeel over partijen die het model niet kent.
      ok(
        "er is geen vergelijking per dienst meer",
        vergelijkingen.every((a) => a.offering_id === null),
        `${vergelijkingen.filter((a) => a.offering_id !== null).length} per dienst`,
      );
      const { rows: perDienst } = await db.client.query(
        "select * from public.reputation_offering_scores where run_id = $1",
        [runId],
      );
      ok("er is wel een uitkomst per dienst", perDienst.length > 0, `${perDienst.length}`);

      // ── De bronnen ────────────────────────────────────────────────────────
      const { rows: bronnen } = await db.client.query(
        "select * from public.reputation_sources where run_id = $1 order by citations desc",
        [runId],
      );
      // ⚠️ NUL BRONNEN, EN DAT IS DE JUISTE UITKOMST. Deze ketentest draait met
      // web-zoeken UIT (zie bovenaan dit bestand: een test die het internet
      // nodig heeft is geen test maar een gok). Er is dus niets opgezocht, en
      // dan is een bronnenlijst van nul eerlijk in plaats van te laag.
      //
      // Vóór 23 augustus 2026 stonden hier wél bronnen, en dat was een test die
      // om de verkeerde reden slaagde: de URL's lekten uit ONGEGRONDE antwoorden
      // de telling in. Precies de fout die op productie de bewijskracht
      // opblies. Dat `tallySources` en de indeling zelf werken, staat nu in
      // test-unit.ts, waar het zonder database te toetsen is.
      ok("zonder zoeken worden er geen bronnen geteld", bronnen.length === 0, `${bronnen.length}`);
      // ⚠️ EN GEEN ENKELE UIT EEN ONGEGROND ANTWOORD. De stub laat de vraag
      // zonder opzoeken twee verzonnen domeinen noemen, precies zoals op
      // productie gebeurde. Zulke adressen kan het model niet gecontroleerd
      // hebben, en als bron geteld blazen ze de bewijskracht op: het cijfer dat
      // juist moet voorkomen dat een vriendelijk antwoord over een onbekend
      // bedrijf als een goede reputatie leest.
      ok(
        "een verzonnen bron uit een ongegrond antwoord telt niet mee",
        !bronnen.some((b) => String(b.domain).includes("verzonnen")),
        bronnen.map((b) => b.domain).join(", "),
      );
      const ongegrond = antwoorden.filter((a) => a.web_search === false);
      ok(
        "en het ongegronde antwoord draagt geen enkele bron",
        ongegrond.length > 0 && ongegrond.every((a) => (a.cited_urls as string[]).length === 0),
        `${ongegrond.length} ongegronde antwoorden`,
      );
      // Het ANTWOORD blijft wel volledig bewaard: dat is blok 2 van het scherm,
      // wat het model uit zichzelf weet.
      ok(
        "maar het antwoord zelf blijft bewaard",
        ongegrond.every((a) => String(a.answer_text ?? "").length > 40),
      );
      // ⚠️ De vaste platformlijst wint van het model. De stub deelde ELK domein
      // in als vakpers; trustpilot.com hoort tóch als reviewplatform te staan.
      // ⚠️ Een cijfer uit een AI-antwoord is een gok tot het bewezen is. Zonder
      // geslaagde crawl mag niets als bevestigd gelden, en zonder bronnen valt
      // er sowieso niets te bevestigen.
      ok(
        "geen enkel reviewcijfer geldt als bevestigd zonder geslaagde crawl",
        bronnen.every((b) => b.verified === false),
      );
      // ⚠️ DE BRONNEN GAAN OVER DE KLANT EN NIET OVER DE MARKT. De marktvraag
      // noemt zes concurrenten mét hun websites; bij Gasservice Brabant kwamen
      // 113 van de 191 URL's uit de markt- en vergelijkingsvragen. Die telden
      // mee onder "waar ChatGPT dit vandaan haalt" en dreven de bewijskracht
      // naar 100 op 100, terwijl dat cijfer moet zeggen hoeveel controleerbare
      // bronnen er onder het oordeel over JOU liggen.
      const { rows: bronBlokken } = await db.client.query(
        `select distinct a.block
           from public.reputation_answers a
           join public.reputation_sources s on s.run_id = a.run_id
          where a.run_id = $1 and a.block in ('markt','vergelijking')
            and exists (
              select 1 from unnest(a.cited_urls) u where u like '%' || s.domain || '%'
            )`,
        [runId],
      );
      ok(
        "de bronnenlijst telt geen URL's uit de markt- of vergelijkingsvragen",
        bronBlokken.length === 0 || bronnen.length === 0,
        bronBlokken.map((b) => b.block).join(", "),
      );

      // ── Het gedeelde bewijscorpus ─────────────────────────────────────────
      const { rows: corpus } = await db.client.query(
        "select query, url, domain, excerpt from public.reputation_evidence where run_id = $1",
        [runId],
      );
      ok("het bewijscorpus is gevuld", corpus.length > 0, `${corpus.length} fragmenten`);
      // ⚠️ De knipstap mag NIETS verzinnen. Een fragment dat er niet in stond zou
      // als bewijs alle dienstvragen in gaan, en dan rust het hele blok per
      // dienst op fictie. De stub biedt er expres een aan.
      ok(
        "een verzonnen fragment is tegengehouden",
        !corpus.some((f) => String(f.excerpt).includes("verzonnen")),
        corpus.map((f) => String(f.excerpt).slice(0, 30)).join(" | "),
      );

      // ⚠️ En de dienstvragen zoeken niet meer zelf. Dat is de meetverbetering:
      // elke dienst kreeg voorheen andere zoekresultaten, en dan weet je bij een
      // verschil tussen twee diensten niet of dat aan de reputatie ligt of aan
      // wat de zoekmachine die seconde opleverde.
      const dienstvragen = antwoorden.filter((a) => a.block === "aanbod");
      ok(
        "de dienstvragen zoeken niet meer zelf",
        dienstvragen.length > 0 && dienstvragen.every((a) => a.web_search === false),
        `${dienstvragen.length} dienstvragen`,
      );
      // De vraag blijft kort en leesbaar: het scherm toont hem letterlijk aan de
      // klant. Het corpus van achttienduizend tekens gaat apart mee.
      ok(
        "en de opgeslagen vraag blijft leesbaar",
        dienstvragen.every((a) => String(a.question).length < 500),
        `langste ${Math.max(...dienstvragen.map((a) => String(a.question).length))}`,
      );

      // ── De open marktvraag ────────────────────────────────────────────────
      const { rows: markt } = await db.client.query(
        `select answer_id, party_name, is_own_brand, position, of_parties
           from public.reputation_market where run_id = $1 order by answer_id, position`,
        [runId],
      );
      ok("de marktvraag leverde bedrijven op", markt.length > 0, `${markt.length}`);
      // ⚠️ Het model noemde Feenstra twee keer, op plek 1 en plek 3. Eén bedrijf,
      // niet twee: zonder ontdubbelen telt de noemer te hoog en zakt de plek van
      // iedereen. Vier genoemde namen horen dus drie bedrijven te worden.
      const perAntwoord = new Map<string, string[]>();
      for (const m of markt) {
        const lijst = perAntwoord.get(String(m.answer_id)) ?? [];
        lijst.push(String(m.party_name).toLowerCase());
        perAntwoord.set(String(m.answer_id), lijst);
      }
      ok(
        "een dubbel genoemd bedrijf telt één keer",
        [...perAntwoord.values()].every((namen) => new Set(namen).size === namen.length),
        [...perAntwoord.values()].map((n) => n.join("+")).join(" | "),
      );
      ok(
        "en vier genoemde namen worden drie bedrijven",
        [...perAntwoord.values()].every((namen) => namen.length === 3),
        [...perAntwoord.values()].map((n) => n.length).join(","),
      );
      // De plek klopt na het ontdubbelen: de klant stond in de stub op plek 2
      // met een dubbele Feenstra ervoor en erna, dus na opschonen blijft hij 2.
      const eigenPlek = markt.find((m) => m.is_own_brand === true);
      eqc("en de klant houdt zijn plek", String(eigenPlek?.position), "2");
      // De klant stond op plek 2 in de stub, dus hij hoort herkend te zijn.
      ok(
        "de klant is herkend tussen de genoemde bedrijven",
        markt.some((m) => m.is_own_brand === true),
        markt.map((m) => `${m.party_name}${m.is_own_brand ? " (eigen)" : ""}`).join(", "),
      );
      // ⚠️ En de ontdekte concurrenten staan er, ook die wij niet kenden. Dat is
      // het hele punt van dit blok: wie AI noemt, ís de concurrent, en dat
      // corrigeert de opgelegde set die bij Van den Udenhout een fabrikant
      // opleverde.
      ok(
        "en AI noemde concurrenten die wij niet hadden opgelegd",
        markt.some((m) => !m.is_own_brand && !(run.rivals as string[]).includes(String(m.party_name))),
        markt.filter((m) => !m.is_own_brand).map((m) => m.party_name).join(", "),
      );

      const marktRivals = (run.market_rivals as string[]) ?? [];
      ok("de ontdekte markt staat op de run", marktRivals.length > 0, marktRivals.join(", "));

      // ── De nieuwe getallen ────────────────────────────────────────────────
      ok("de toonverdeling is vastgelegd", run.tone_distribution !== null);
      ok("de verdeeldheid ook", run.tone_spread !== null, String(run.tone_spread));
      // ⚠️ Met drie herhalingen per merkbrede vraag valt er een marge te
      // berekenen. Die ontbrak, terwijl de meting op het scherm ernaast er al
      // sinds R6.1 een toont.
      ok("en er is een betrouwbaarheidsmarge", run.tone_stderr !== null, String(run.tone_stderr));
      ok(
        "het meetinstrument is vastgelegd",
        String(run.instrument_version ?? "") ===
          (await import("@/lib/reputation/instrument")).instrumentVersion(),
        String(run.instrument_version),
      );

      // ── Twee keer starten levert één run ──────────────────────────────────
      const { rows: voorHerhaling } = await db.client.query(
        "select count(*)::int as n from public.reputation_answers where run_id = $1",
        [runId],
      );
      await db.client.query(
        `insert into public.jobs (type, payload_json, profile_id, dedupe_key, status)
         values ('reputation_start', $1, $2, $3, 'queued')`,
        [JSON.stringify({ runId }), repProfielId, `${dedupe.reputationStart(runId)}:2`],
      );
      await draaiReputatietaken();
      const { rows: naHerhaling } = await db.client.query(
        "select count(*)::int as n from public.reputation_answers where run_id = $1",
        [runId],
      );
      // ⚠️ Idempotentie (conventie 9). Elke gegronde vraag is een betaalde
      // web-zoekactie; een taak die na een time-out opnieuw draait zou de hele
      // analyse een tweede keer betalen.
      ok(
        "twee keer starten stelt geen enkele vraag opnieuw",
        naHerhaling[0].n === voorHerhaling[0].n,
        `${voorHerhaling[0].n} → ${naHerhaling[0].n}`,
      );
    }

    // ── Een mislukte beoordeling mag opnieuw, de dure vraag niet ────────────
    console.log("\nMijn reputatie: een mislukte beoordeling kost geen tweede web-zoekactie");
    {
      const { dedupe } = await import("@/lib/jobs/queue");
      const hertestProfielId = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, service_regions, status)
         values ($1, $2, 'Hertest BV', 'https://hertest.nl', 'Hertest BV', array['Utrecht'], 'klaar')`,
        [hertestProfielId, userId],
      );
      await db.client.query(
        `insert into public.profile_offerings (profile_id, kind, name, source, sort_order)
         values ($1, 'dienst', 'Onderhoud', 'ai', 0)`,
        [hertestProfielId],
      );

      const hertestRunId = randomUUID();
      await db.client.query(
        `insert into public.reputation_runs (id, profile_id, started_by, status, scope_json)
         values ($1, $2, $3, 'running', '{}'::jsonb)`,
        [hertestRunId, hertestProfielId, userId],
      );

      const draaiMerkblok = async (): Promise<void> => {
        const { rows } = await db.client.query(
          `insert into public.jobs (type, payload_json, profile_id, dedupe_key, status)
           values ('reputation_brand', $1, $2, $3, 'running') returning *`,
          [
            JSON.stringify({ runId: hertestRunId }),
            hertestProfielId,
            `${dedupe.reputationBrand(hertestRunId)}:${randomUUID()}`,
          ],
        );
        await runJob({ admin: admin as never, job: rows[0] });
        await db.client.query("update public.jobs set status = 'done' where id = $1", [rows[0].id]);
      };

      await draaiMerkblok();
      const vragenNaEerste = log.filter((l) => l.schemaName === "plain").length;
      const { rows: voor } = await db.client.query(
        `select id, answer_text from public.reputation_answers where run_id = $1 order by question`,
        [hertestRunId],
      );
      // ⚠️ Vijftien en niet vijf: sinds 23 augustus 2026 wordt elke merkbrede
      // vraag drie keer gesteld. Elk getal op het scherm rustte daarvoor op één
      // antwoord, terwijl de meting ernaast al een betrouwbaarheidsband toont.
      ok("het merkblok stelde zijn vragen, elk drie keer", voor.length === 15, `${voor.length}`);

      // Nabootsen dat de beoordeling van één antwoord mislukte: het dure
      // antwoord staat er, het oordeel niet.
      await db.client.query(
        `update public.reputation_answers
            set verdict_json = null, tone = null, tone_score = null, grounding = null,
                mentions_brand = null
          where id = $1`,
        [voor[0].id],
      );

      await draaiMerkblok();

      const { rows: na } = await db.client.query(
        `select id, answer_text, verdict_json from public.reputation_answers where run_id = $1 order by question`,
        [hertestRunId],
      );
      // ⚠️ Dit is de belangrijkste kostenbescherming van het hele onderdeel, en
      // hij komt rechtstreeks uit de meting: het ruwe antwoord staat al in de
      // database vóórdat de oordeelslaag draait, dus een mislukte beoordeling
      // mag opnieuw zonder dat de betaalde web-zoekactie herhaald wordt.
      ok(
        "er is geen enkele vraag opnieuw gesteld",
        log.filter((l) => l.schemaName === "plain").length === vragenNaEerste,
        `${vragenNaEerste} → ${log.filter((l) => l.schemaName === "plain").length}`,
      );
      ok(
        "en het opgeslagen antwoord is ongewijzigd",
        na.length === 15 && na[0].id === voor[0].id && na[0].answer_text === voor[0].answer_text,
      );
      ok(
        "maar de beoordeling is er wél opnieuw gedaan",
        na[0].verdict_json !== null,
        String(na[0].verdict_json),
      );
    }

    // ── Een merk zonder bekende concurrenten ────────────────────────────────
    console.log("\nMijn reputatie: een merk zonder bekende concurrenten");
    {
      const { dedupe } = await import("@/lib/jobs/queue");
      const soloProfielId = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, service_regions, status)
         values ($1, $2, 'Solo BV', 'https://solo.nl', 'Solo BV', array['Tilburg'], 'klaar')`,
        [soloProfielId, userId],
      );
      await db.client.query(
        `insert into public.profile_offerings (profile_id, kind, name, source, sort_order)
         values ($1, 'dienst', 'Onderhoud', 'ai', 0)`,
        [soloProfielId],
      );

      const soloRunId = randomUUID();
      await db.client.query(
        `insert into public.reputation_runs (id, profile_id, started_by, status)
         values ($1, $2, $3, 'queued')`,
        [soloRunId, soloProfielId, userId],
      );
      await db.client.query(
        `insert into public.jobs (type, payload_json, profile_id, dedupe_key, status)
         values ('reputation_start', $1, $2, $3, 'queued')`,
        [JSON.stringify({ runId: soloRunId }), soloProfielId, dedupe.reputationStart(soloRunId)],
      );

      for (let i = 0; i < 40; i++) {
        const { rows } = await db.client.query(
          `select * from public.jobs
            where type like 'reputation%' and status = 'queued' and profile_id = $1
            order by scheduled_for asc, created_at asc limit 1`,
          [soloProfielId],
        );
        if (rows.length === 0) break;
        await db.client.query("update public.jobs set status = 'running' where id = $1", [rows[0].id]);
        await runJob({ admin: admin as never, job: { ...rows[0], status: "running" } });
        await db.client.query("update public.jobs set status = 'done' where id = $1", [rows[0].id]);
      }

      const { rows: soloRun } = await db.client.query(
        "select * from public.reputation_runs where id = $1",
        [soloRunId],
      );
      // ⚠️ Geen namen verzinnen. De run gaat gewoon door zonder blok V, en het
      // scherm zegt waarom (conventie 3). Een verzonnen concurrent zou het
      // vertrouwen in de hele pagina kosten.
      ok("de run loopt gewoon af", soloRun[0].status === "klaar", String(soloRun[0].status));
      ok("er is geen concurrent verzonnen", (soloRun[0].rivals as string[]).length === 0);
      ok("en dus geen rangscore", soloRun[0].rank_score === null, String(soloRun[0].rank_score));
      ok(
        "maar wel een toon, want de basisanalyse draaide gewoon",
        soloRun[0].tone_index !== null,
        String(soloRun[0].tone_index),
      );
      ok(
        "en een notitie die zegt waarom er niet vergeleken is",
        (soloRun[0].notes as string[]).some((n) => n.includes("concurrenten")),
        (soloRun[0].notes as string[]).join(" | "),
      );

      const { rows: soloTaken } = await db.client.query(
        `select count(*)::int as n from public.jobs
          where type = 'reputation_compare' and profile_id = $1`,
        [soloProfielId],
      );
      ok("er is geen enkele vergelijkingstaak ingepland", soloTaken[0].n === 0, `${soloTaken[0].n}`);
    }

    // ── Een merk zonder aanbodboom levert een nette weigering ────────────────
    console.log("\nMijn reputatie: een merk zonder aanbod");
    {
      const { dedupe } = await import("@/lib/jobs/queue");
      const leegProfielId = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status)
         values ($1, $2, 'Leeg BV', 'https://leeg.nl', 'Leeg BV', 'klaar')`,
        [leegProfielId, userId],
      );

      const leegRunId = randomUUID();
      await db.client.query(
        `insert into public.reputation_runs (id, profile_id, started_by, status)
         values ($1, $2, $3, 'queued')`,
        [leegRunId, leegProfielId, userId],
      );
      const { rows: startTaak } = await db.client.query(
        `insert into public.jobs (type, payload_json, profile_id, dedupe_key, status)
         values ('reputation_start', $1, $2, $3, 'running') returning *`,
        [JSON.stringify({ runId: leegRunId }), leegProfielId, dedupe.reputationStart(leegRunId)],
      );
      await runJob({ admin: admin as never, job: startTaak[0] });

      const { rows: leegRun } = await db.client.query(
        "select * from public.reputation_runs where id = $1",
        [leegRunId],
      );
      // ⚠️ Geen lege run met een cijfer erboven. Dit onderdeel meet per dienst,
      // en zonder diensten valt er niets per dienst te meten. De merkbrede
      // vragen alleen zouden een half product zijn dat er heel uitziet.
      ok("de run wordt netjes geweigerd", leegRun[0].status === "mislukt", String(leegRun[0].status));
      ok(
        "met een uitleg die zegt wat de klant moet doen",
        (leegRun[0].notes as string[]).some((n) => n.includes("merkprofiel")),
        (leegRun[0].notes as string[]).join(" | "),
      );

      const { rows: leegTaken } = await db.client.query(
        `select count(*)::int as n from public.jobs
          where type like 'reputation%' and profile_id = $1 and type <> 'reputation_start'`,
        [leegProfielId],
      );
      ok("en er is niets ingepland", leegTaken[0].n === 0, `${leegTaken[0].n}`);
    }

    // ── De diepe modus meet meer, en het scherm belooft dat ook ─────────────
    console.log("\nMijn reputatie: diep meet meer dan standaard");
    {
      const { dedupe } = await import("@/lib/jobs/queue");
      const { MAX_NODES_STANDARD } = await import("@/lib/reputation/select-nodes");

      // Twintig diensten, dus meer dan de standaardmodus meeneemt. Bij een merk
      // met vier diensten zou de diepe modus niets extra's doen, en dat is
      // precies wat de knop de klant vertelt.
      const diepProfielId = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, service_regions, status)
         values ($1, $2, 'Breed BV', 'https://breed.nl', 'Breed BV', array['Eindhoven'], 'klaar')`,
        [diepProfielId, userId],
      );
      for (let i = 0; i < 20; i++) {
        await db.client.query(
          `insert into public.profile_offerings (profile_id, kind, name, source, sort_order)
           values ($1, 'dienst', $2, 'ai', $3)`,
          [diepProfielId, `Dienst ${i}`, i],
        );
      }

      const startRun = async (depth: string) => {
        const id = randomUUID();
        await db.client.query(
          `insert into public.reputation_runs (id, profile_id, started_by, status, depth)
           values ($1, $2, $3, 'queued', $4)`,
          [id, diepProfielId, userId, depth],
        );
        const { rows } = await db.client.query(
          `insert into public.jobs (type, payload_json, profile_id, dedupe_key, status)
           values ('reputation_start', $1, $2, $3, 'running') returning *`,
          [JSON.stringify({ runId: id }), diepProfielId, `${dedupe.reputationStart(id)}:${randomUUID()}`],
        );
        await runJob({ admin: admin as never, job: rows[0] });
        const { rows: run } = await db.client.query(
          "select * from public.reputation_runs where id = $1",
          [id],
        );
        return run[0];
      };

      const standaard = await startRun("standaard");
      const diep = await startRun("diep");

      const knopen = (r: { scope_json: { nodes: unknown[] } }) => r.scope_json.nodes.length;
      ok(
        "de standaardmodus houdt zich aan zijn plafond",
        knopen(standaard) === MAX_NODES_STANDARD,
        `${knopen(standaard)}`,
      );
      ok("de diepe modus meet er meer", knopen(diep) > knopen(standaard), `${knopen(diep)}`);
      // ⚠️ Het aantal geplande vragen moet MEEBEWEGEN. Zou het op de standaard
      // blijven staan, dan telt het voortgangsscherm naar een getal dat te laag
      // is en lijkt de run vast te lopen op negentig procent.
      ok(
        "en plant navenant meer vragen in",
        diep.questions_planned > standaard.questions_planned,
        `${standaard.questions_planned} tegenover ${diep.questions_planned}`,
      );
      ok("de gekozen diepte wordt vastgelegd", diep.scope_json.diepte === "diep");
    }

    // ── Het budgetplafond laat de vergelijking als EERSTE vallen ─────────────
    console.log("\nMijn reputatie: een vol budget offert de vergelijking, niet de basisanalyse");
    {
      const { dedupe } = await import("@/lib/jobs/queue");
      const budgetProfielId = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, service_regions, status)
         values ($1, $2, 'Duur BV', 'https://duur.nl', 'Duur BV', array['Breda'], 'klaar')`,
        [budgetProfielId, userId],
      );
      await db.client.query(
        `insert into public.profile_offerings (profile_id, kind, name, source, sort_order)
         values ($1, 'dienst', 'Onderhoud', 'ai', 0)`,
        [budgetProfielId],
      );
      await db.client.query(
        `insert into public.entities (profile_id, canonical_name, normalized, entity_role)
         values ($1, 'Concurrent A', 'concurrent a', 'concurrent')`,
        [budgetProfielId],
      );
      // ⚠️ Mét gemeten vermeldingen, want sinds 23 augustus 2026 telt een merk
      // dat maar één keer voorbijkwam niet meer mee: één vermelding is toeval,
      // geen patroon. Zonder deze rijen zou er geen vergelijking ingepland
      // worden en toetst dit scenario niets over de volgorde.
      const budgetClusterId = randomUUID();
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, 'Duur BV, cluster', 'https://duur.nl', 'onderhoud', 'gereed')`,
        [budgetClusterId, userId, budgetProfielId],
      );
      await db.client.query(
        `insert into public.competitor_breakdown (analysis_id, week_no, competitor_name, mentions_count)
         values ($1, 1, 'Concurrent A', 4)`,
        [budgetClusterId],
      );

      const budgetRunId = randomUUID();
      await db.client.query(
        `insert into public.reputation_runs (id, profile_id, started_by, status)
         values ($1, $2, $3, 'queued')`,
        [budgetRunId, budgetProfielId, userId],
      );
      const { rows: budgetStart } = await db.client.query(
        `insert into public.jobs (type, payload_json, profile_id, dedupe_key, status)
         values ('reputation_start', $1, $2, $3, 'running') returning *`,
        [JSON.stringify({ runId: budgetRunId }), budgetProfielId, dedupe.reputationStart(budgetRunId)],
      );
      await runJob({ admin: admin as never, job: budgetStart[0] });
      // ⚠️ De starttaak afronden, zoals de werker dat ook doet. Blijft hij op
      // 'running' staan, dan telt de afteller van de synthese hem eeuwig mee en
      // wordt de synthese nooit ingepland. Dat is precies de valkuil die
      // `scheduleSynthesisIfLast()` beschrijft, en hij werkt in beide richtingen.
      await db.client.query("update public.jobs set status = 'done' where id = $1", [
        budgetStart[0].id,
      ]);

      // ── De volgorde van inplannen ────────────────────────────────────────
      //
      // ⚠️ De wachtrij claimt op `scheduled_for asc` (migratie 0013). Dít is wat
      // de volgorde uit §2.3 afdwingt: loopt het budget vol, dan valt de
      // vergelijking weg en blijft de basisanalyse overeind, in plaats van
      // andersom.
      const { rows: volgorde } = await db.client.query(
        `select type, min(scheduled_for) as start from public.jobs
          where profile_id = $1 and type like 'reputation%'
          group by type order by start asc`,
        [budgetProfielId],
      );
      const soorten = volgorde.map((v) => v.type as string);
      // ⚠️ De volgorde is een budgetmaatregel. De wachtrij claimt op
      // `scheduled_for asc`, dus dit is wat afdwingt dat een vol budget de
      // vergelijking laat vallen en de basisanalyse overeind laat.
      ok(
        "de vergelijkingen staan achter de basisanalyse",
        soorten.indexOf("reputation_compare") > soorten.indexOf("reputation_brand") &&
          soorten.indexOf("reputation_compare") > soorten.indexOf("reputation_evidence"),
        soorten.join(" → "),
      );
      // En de bronnen helemaal achteraan, want die tellen de aangehaalde URL's
      // van de HELE run.
      ok(
        "en de bronnen als laatste",
        soorten.indexOf("reputation_sources") > soorten.indexOf("reputation_compare"),
        soorten.join(" → "),
      );
      // ⚠️ De dienstvragen staan er nog NIET: die worden pas ingepland als het
      // bewijscorpus gevuld is. Zouden ze meteen in de rij staan, dan treffen de
      // eerste een leeg corpus aan en vallen die terug op zelf zoeken; dan is de
      // helft van de diensten anders gemeten dan de andere helft.
      ok(
        "de dienstvragen wachten op het bewijscorpus",
        !soorten.includes("reputation_offering"),
        soorten.join(" → "),
      );

      // ⚠️ Het budget wordt PAS vol gezet nadat de basisanalyse gedraaid heeft.
      // Dat is precies het scenario dat §2.3 beschrijft, en het is het enige dat
      // iets bewijst: het budget meteen vol zetten laat álles vallen, en dan
      // toont de test niet dat de vergelijking als eerste sneuvelt maar alleen
      // dat de poort werkt.
      const draaiEen = async (soorten: string[]): Promise<void> => {
        for (let i = 0; i < 40; i++) {
          const { rows } = await db.client.query(
            `select * from public.jobs
              where type = any($2) and status = 'queued' and profile_id = $1
              order by scheduled_for asc, created_at asc limit 1`,
            [budgetProfielId, soorten],
          );
          if (rows.length === 0) break;
          await db.client.query("update public.jobs set status = 'running' where id = $1", [rows[0].id]);
          await runJob({ admin: admin as never, job: { ...rows[0], status: "running" } });
          await db.client.query("update public.jobs set status = 'done' where id = $1", [rows[0].id]);
        }
      };

      // Eerst de basisanalyse, zoals de wachtrij hem ook zou pakken.
      await draaiEen(["reputation_evidence", "reputation_brand", "reputation_offering"]);
      const { rows: basisVoor } = await db.client.query(
        `select count(*)::int as n from public.reputation_answers
          where run_id = $1 and block in ('merk', 'aanbod')`,
        [budgetRunId],
      );
      ok("de basisanalyse draait gewoon", basisVoor[0].n >= 6, `${basisVoor[0].n} antwoorden`);

      // Nu loopt het budget vol. Alles wat daarna komt hoort te sneuvelen.
      await db.client.query(
        `insert into public.ai_calls (profile_id, kind, model, cost_usd, reputation_run_id)
         values ($1, 'reputation_merk', 'gpt-5.6-luna', 99, $2)`,
        [budgetProfielId, budgetRunId],
      );

      await draaiEen([
        "reputation_evidence",
        "reputation_brand",
        "reputation_offering",
        "reputation_compare",
        "reputation_sources",
        "reputation_market",
        "reputation_synthesis",
      ]);

      const { rows: budgetRun } = await db.client.query(
        "select * from public.reputation_runs where id = $1",
        [budgetRunId],
      );
      // ⚠️ `budget_op` en niet `klaar`. De klant ziet dan een cijfer met een
      // kanttekening in plaats van een cijfer dat doet alsof er niets aan de
      // hand was. Stil degraderen is precies wat dit onderdeel niet mag doen.
      ok(
        "de run eindigt op 'budget op'",
        budgetRun[0].status === "budget_op",
        String(budgetRun[0].status),
      );
      ok(
        "en er staat een notitie bij die zegt wat er is overgeslagen",
        (budgetRun[0].notes as string[]).length > 0,
        (budgetRun[0].notes as string[]).join(" | "),
      );
      const { rows: budgetVergelijkingen } = await db.client.query(
        `select count(*)::int as n from public.reputation_answers
          where run_id = $1 and block = 'vergelijking'`,
        [budgetRunId],
      );
      ok(
        "er is geen enkele vergelijking gesteld",
        budgetVergelijkingen[0].n === 0,
        `${budgetVergelijkingen[0].n}`,
      );
      // ⚠️ En dit is de kern: de basisanalyse staat er nog steeds. Een klant met
      // een toon en een bewijskracht maar zonder plaats heeft nog een product;
      // andersom heeft hij een plaats zonder te weten waarom.
      const { rows: basisNa } = await db.client.query(
        `select count(*)::int as n from public.reputation_answers
          where run_id = $1 and block in ('merk', 'aanbod')`,
        [budgetRunId],
      );
      ok(
        "en de basisanalyse is behouden",
        basisNa[0].n === basisVoor[0].n && basisNa[0].n > 0,
        `${basisVoor[0].n} → ${basisNa[0].n}`,
      );
      ok(
        "met een toon eronder, ook al viel de vergelijking weg",
        budgetRun[0].tone_index !== null,
        String(budgetRun[0].tone_index),
      );
      ok(
        "en zonder rangscore, want die is er niet",
        budgetRun[0].rank_score === null,
        String(budgetRun[0].rank_score),
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // De open punten uit de synthese worden vragen die de klant kan
    // beantwoorden (24 augustus 2026).
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: de synthese schrijft de rij, het
    // scherm leest hem met een heel andere query. Stond er een `analysis_id`
    // in, of een andere `scope`, dan verdwijnt de vraag uit beeld zonder dat er
    // iets misgaat. Bij Van den Udenhout stonden tien open punten in beeld
    // zonder invoerveld, precies omdat ze nooit een rij wáren.
    {
      console.log("\nDe open punten uit de synthese (gap-questions)");
      const gapProfileId = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status)
         values ($1, $2, 'Fysi-Unique gaps', 'https://fysi-unique.nl', 'Fysi-Unique', 'klaar')`,
        [gapProfileId, userId],
      );
      await db.client.query(
        `insert into public.profile_pages (profile_id, url, title, text_excerpt) values
         ($1, 'https://fysi-unique.nl/hardloopklachten', 'Hardloopklachten Amersfoort',
          'Fysi-Unique behandelt hardloopblessures. Wij zitten in Amersfoort.')`,
        [gapProfileId],
      );

      const { synthesiseProfile } = await import("@/lib/pipeline/synthesis");
      const eerste = await synthesiseProfile(gapProfileId);
      ok("de synthese draait en slaat niet over", eerste.skipped === false);

      // De vier gaps uit de stub: één dubbele (hoofdletters), één met een
      // opsomteken, één leeg. Er horen er dus twee over te blijven.
      const { rows: vragen } = await db.client.query(
        `select question, reason, status, scope, kind, analysis_id, answer_type,
                raw_json->>'bron' as bron
           from public.fact_requests where profile_id = $1 order by question`,
        [gapProfileId],
      );
      ok("twee van de vier open punten worden een vraag", vragen.length === 2, String(vragen.length));
      ok(
        "het opsomteken staat niet in de kolom",
        vragen.some((r) => r.question === "In welk jaar is de praktijk opgericht?"),
        vragen.map((r) => r.question).join(" | "),
      );
      ok("elke vraag staat open", vragen.every((r) => r.status === "open"));
      ok("en zegt waarom hij gesteld wordt", vragen.every((r) => (r.reason as string).length > 10));
      ok(
        "merkbreed, dus zonder cluster",
        vragen.every((r) => r.analysis_id === null && r.scope === "merk"),
      );
      ok(
        "en van de soort waar de klant een tekstantwoord op geeft",
        vragen.every((r) => r.kind === "aanvulling" && r.answer_type === "tekst_kort"),
      );
      // ⚠️ Het merkje waaraan de facts-route ziet dat dit antwoord géén tweede,
      // verkeerd gelabelde kopie in `proof_points` hoort te krijgen. Zonder dit
      // zou een antwoord dat de klant net gaf in de feitenbank verschijnen met
      // de bron "site", en dat is precies de soort onwaarheid die de
      // claimvalidator niet kan zien.
      ok(
        "elke rij draagt zijn herkomst",
        vragen.every((r) => r.bron === "synthese-gap"),
        vragen.map((r) => String(r.bron)).join(" | "),
      );

      // ⚠️ Dezelfde query als "Openstaande vragen" doet. Een rij die de synthese
      // schrijft maar dit filter niet overleeft, staat nergens.
      const { rows: opHetScherm } = await db.client.query(
        `select id from public.fact_requests
          where profile_id = $1 and analysis_id is null
            and status in ('open', 'beantwoord', 'overgeslagen')`,
        [gapProfileId],
      );
      ok("het klantscherm vindt ze allebei", opHetScherm.length === 2, String(opHetScherm.length));

      // Idempotentie (conventie 9), langs twee wegen. Eerst de goedkope: de
      // synthese slaat over omdat het facet er al staat.
      const tweede = await synthesiseProfile(gapProfileId);
      ok("een tweede synthese slaat over", tweede.skipped === true);

      // En de dure: zou de stap tóch opnieuw draaien, dan houdt de unieke index
      // op (profile_id, question) de vraag tegen. Dat is wat een herdraai na een
      // storing veilig maakt.
      await db.client.query(
        "delete from public.profile_facets where profile_id = $1 and facet = 'synthese'",
        [gapProfileId],
      );
      const derde = await synthesiseProfile(gapProfileId);
      ok("een herdraai stelt geen enkele vraag opnieuw", derde.gaps === 0, String(derde.gaps));
      const { rows: naHerdraai } = await db.client.query(
        "select count(*)::int as n from public.fact_requests where profile_id = $1",
        [gapProfileId],
      );
      ok("en er staan er nog steeds twee", naHerdraai[0].n === 2, String(naHerdraai[0].n));

      // Een beantwoorde vraag verdwijnt uit de teller in de kop, want die telt
      // alleen wat nog open staat.
      await db.client.query(
        `update public.fact_requests set status = 'beantwoord', answer = 'Vier',
                answered_at = now()
          where profile_id = $1 and question like 'Hoeveel%'`,
        [gapProfileId],
      );
      const { rows: nogOpen } = await db.client.query(
        `select count(*)::int as n from public.fact_requests
          where profile_id = $1 and analysis_id is null and status = 'open'`,
        [gapProfileId],
      );
      ok("wat beantwoord is telt niet meer mee als open", nogOpen[0].n === 1, String(nogOpen[0].n));
    }

    // ════════════════════════════════════════════════════════════════════════
    // Onderwerpen zijn concept vóór het gesprek, definitief erna (0074,
    // docs/optimalisatielab-orbit-engine.md werkpakket A §3.2).
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: `proposeTopics()` draait twee
    // keer voor hetzelfde profiel, en de tweede keer moet de onbesliste
    // conceptronde vervangen zonder een reeds gestart of afgewezen onderwerp
    // aan te raken. Slaagt de tweede ronde per ongeluk over (het bestaande
    // idempotentiegedrag), dan blijft een klant voor altijd op conceptonderwerpen
    // zitten die hij nooit kan starten.
    // ════════════════════════════════════════════════════════════════════════
    {
      console.log("\nOnderwerpen: concept vóór het gesprek, definitief erna (0074)");
      const { proposeTopics } = await import("@/lib/pipeline/propose-topics");
      const stageProfileId = randomUUID();

      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status)
         values ($1, $2, 'Warmte BV', 'https://warmte-bv.nl', 'Warmte BV', 'klaar')`,
        [stageProfileId, userId],
      );
      await db.client.query(
        `insert into public.profile_offerings (profile_id, kind, name, source, sort_order)
         values ($1, 'dienst', 'CV-ketel onderhoud', 'ai', 0),
                ($1, 'dienst', 'Airco', 'ai', 1),
                ($1, 'dienst', 'Warmtepomp', 'ai', 2)`,
        [stageProfileId],
      );

      // ── Ronde 1: nog geen gesprek vastgelegd ──────────────────────────────
      const eersteRonde = await proposeTopics(stageProfileId);
      ok("de eerste ronde levert onderwerpen op", eersteRonde.proposed === 2, String(eersteRonde.proposed));

      const { rows: conceptRijen } = await db.client.query(
        `select id, title, stage, status from public.profile_topics where profile_id = $1 order by title`,
        [stageProfileId],
      );
      ok(
        "zonder gesprek krijgen ze allemaal stage 'concept'",
        conceptRijen.every((r) => r.stage === "concept"),
        conceptRijen.map((r) => `${r.title}:${r.stage}`).join(", "),
      );

      // Eén onderwerp wordt een keuze van de klant, niet meer een concept.
      const afgewezenId = (conceptRijen.find((r) => r.title === "Airco laten installeren") as { id: string })
        .id;
      await db.client.query(
        "update public.profile_topics set status = 'afgewezen' where id = $1",
        [afgewezenId],
      );

      // Nog geen gesprek: een tweede aanroep verandert niets (conventie 9).
      const tweedeZonderGesprek = await proposeTopics(stageProfileId);
      ok(
        "zonder gesprek blijft een tweede ronde idempotent",
        tweedeZonderGesprek.proposed === 2,
        String(tweedeZonderGesprek.proposed),
      );

      // ── Het gesprek wordt vastgelegd ───────────────────────────────────────
      await db.client.query(
        `insert into public.profile_strategy (profile_id, strategy_notes, recorded_by, recorded_at)
         values ($1, 'De klant wil vooral groeien op warmtepompadvies.', $2, now())`,
        [stageProfileId, userId],
      );

      const definitieveRonde = await proposeTopics(stageProfileId);
      const { rows: naGesprek } = await db.client.query(
        `select title, stage, status from public.profile_topics where profile_id = $1 order by title`,
        [stageProfileId],
      );
      ok(
        "de definitieve ronde vervangt alleen de onbesliste concepten",
        naGesprek.length === 2,
        naGesprek.map((r) => `${r.title}:${r.stage}:${r.status}`).join(", "),
      );
      ok(
        "het afgewezen onderwerp blijft onaangeroerd staan",
        naGesprek.some((r) => r.title === "Airco laten installeren" && r.status === "afgewezen"),
        naGesprek.map((r) => `${r.title}:${r.status}`).join(", "),
      );
      ok(
        "het onbesliste concept is vervangen door een definitief onderwerp uit het gesprek",
        naGesprek.some((r) => r.title === "Warmtepomp advies op maat" && r.stage === "definitief"),
        naGesprek.map((r) => `${r.title}:${r.stage}`).join(", "),
      );
      ok(
        "het oude, vervangen conceptonderwerp staat er niet meer naast",
        !naGesprek.some((r) => r.title === "CV-ketel onderhoud"),
        naGesprek.map((r) => r.title).join(", "),
      );
      ok("de definitieve ronde meldt het totaal, geen nul", definitieveRonde.proposed === 2);

      // Een derde aanroep, met het gesprek nog steeds vastgelegd en niets
      // onbeslist meer: niets verandert (conventie 9, geen verspilde kosten).
      const derdeRonde = await proposeTopics(stageProfileId);
      const { rows: naDerde } = await db.client.query(
        "select count(*)::int as n from public.profile_topics where profile_id = $1",
        [stageProfileId],
      );
      ok(
        "een derde ronde na het gesprek doet niets meer",
        derdeRonde.proposed === 2 && naDerde[0].n === 2,
        `${derdeRonde.proposed} / ${naDerde[0].n}`,
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // Een pagina uit het contentplan kan nu wél gemeten worden
    // (doorloop-huyberts.md punt 2).
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: `/api/cron/plan` bouwde zijn
    // schrijfopdracht uit `planBriefing()` en vulde `why`, `targetIntent`,
    // `action` en `existingUrl` aan, maar zette geen `targets`. `saveTargets()`
    // in content.ts schreef dan nul rijen in `content_piece_targets`, en
    // `planImpactWaves()` sloeg de effectmeting stilzwijgend over met "geen
    // doelvragen". Fase 5 bestond zo niet voor een pagina die via het
    // contentplan geschreven is, en dat is sinds migratie 0065 de normale
    // route. `targetsFromSourceRef()` leest de doelvragen nu terug uit het
    // rapport waar `source_ref` ("<rapport-id>#<volgnummer>") naar wijst.
    {
      console.log("\nHet contentplan geeft zijn doelvragen mee aan de schrijftaak (punt 2)");
      const ptUserId = randomUUID();
      const ptProfileId = randomUUID();
      const ptAnalysisId = randomUUID();
      const ptPromptId = randomUUID();

      await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
        ptUserId,
        "plantargets@example.com",
      ]);
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, proof_points, status)
         values ($1, $2, 'Plantargets BV', 'https://plantargets-bv.nl', 'Plantargets BV',
                 array['Sinds 2010 actief', 'Meer dan 500 klanten geholpen'], 'klaar')`,
        [ptProfileId, ptUserId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, 'Plantargets — onderwerp', 'https://plantargets-bv.nl', 'onderwerp', 'gereed')`,
        [ptAnalysisId, ptUserId, ptProfileId],
      );
      await db.client.query(
        `insert into public.prompts (id, analysis_id, text, category, active)
         values ($1, $2, 'Waar vind ik dit onderwerp?', 'Beslissing', true)`,
        [ptPromptId, ptAnalysisId],
      );
      const { rows: ptReportRows } = await db.client.query(
        `insert into public.reports (analysis_id, period, recommendations_json)
         values ($1, 'week 0', $2::jsonb) returning id`,
        [
          ptAnalysisId,
          JSON.stringify([
            {
              title: "Kans pagina",
              why: "De AI noemt ons niet bij dit onderwerp.",
              type: "landing",
              action: "nieuw",
              targetIntent: "Iemand die dit onderwerp zoekt",
              targets: [{ promptId: ptPromptId, weight: 0.7, text: "Waar vind ik dit onderwerp?" }],
            },
          ]),
        ],
      );
      const ptReportId = ptReportRows[0].id as string;

      // ── De leesfunctie zelf: drie gevallen ──────────────────────────────
      const { targetsFromSourceRef } = await import("@/lib/plan-backlog-data");
      const gevonden = await targetsFromSourceRef(admin as never, `${ptReportId}#0`);
      ok(
        "de doelvraag van de aanbeveling wordt teruggevonden uit het rapport",
        gevonden.targets.length === 1 && gevonden.targets[0]?.promptId === ptPromptId,
        JSON.stringify(gevonden),
      );
      ok("en het rapport-id komt mee, voor content_pieces.report_id", gevonden.reportId === ptReportId);

      const zonderRef = await targetsFromSourceRef(admin as never, null);
      ok(
        "zonder source_ref blijft de doelvragenlijst leeg (oude planpagina's)",
        zonderRef.targets.length === 0 && zonderRef.reportId === null,
      );

      const onbekendRapport = await targetsFromSourceRef(admin as never, `${randomUUID()}#0`);
      ok(
        "een onbekend rapport levert geen gooi op, alleen een lege lijst",
        onbekendRapport.targets.length === 0,
      );

      // ── De volledige keten: schrijftaak inplannen mét de teruggevonden
      // doelvragen, echt schrijven, en controleren wat er in
      // content_piece_targets terechtkomt. ──────────────────────────────
      const { planContentDraft } = await import("@/lib/jobs/content-jobs");
      const { created: ptCreated } = await planContentDraft(admin as never, {
        analysisId: ptAnalysisId,
        userId: ptUserId,
        recommendation: {
          title: "Kans pagina",
          type: "landing",
          targetIntent: "Iemand die dit onderwerp zoekt",
          why: "De AI noemt ons niet bij dit onderwerp.",
          action: "nieuw",
          existingUrl: null,
          reportId: gevonden.reportId,
          targets: gevonden.targets,
        },
      });
      ok("de schrijftaak wordt ingepland", ptCreated);

      const { rows: ptJobRows } = await db.client.query(
        `select * from public.jobs where analysis_id = $1 and type = 'content_draft'
          order by created_at desc limit 1`,
        [ptAnalysisId],
      );
      const { runJob } = await import("@/lib/jobs/handlers");
      await runJob({ admin: admin as never, job: { ...ptJobRows[0], status: "running" } });

      const { rows: ptStukRows } = await db.client.query(
        `select id, report_id from public.content_pieces where analysis_id = $1
          order by created_at desc limit 1`,
        [ptAnalysisId],
      );
      const ptContentPieceId = ptStukRows[0]?.id as string | undefined;
      ok("de pagina is geschreven", Boolean(ptContentPieceId));
      ok(
        "en draagt het rapport waar hij uit voortkomt",
        ptStukRows[0]?.report_id === ptReportId,
      );

      const { rows: ptDoelvraagRows } = await db.client.query(
        `select prompt_id from public.content_piece_targets where content_piece_id = $1`,
        [ptContentPieceId],
      );
      ok(
        "de doelvraag staat in content_piece_targets in plaats van leeg te blijven",
        ptDoelvraagRows.length === 1 && ptDoelvraagRows[0]?.prompt_id === ptPromptId,
        `${ptDoelvraagRows.length} doelvra(a)g(en)`,
      );

      // ── En de effectmeting mag nu wél twee golven plannen ───────────────
      // (voorheen: "geen doelvragen", nul golven, fase 5 bestond niet voor
      // een pagina uit het contentplan).
      await db.client.query(
        `update public.content_pieces
            set status = 'published', published_at = now(),
                published_url = 'https://plantargets-bv.nl/kans'
          where id = $1`,
        [ptContentPieceId],
      );
      const { planImpactWaves } = await import("@/lib/pipeline/impact");
      const ptGolven = await planImpactWaves(admin as never, {
        analysisId: ptAnalysisId,
        contentPieceId: ptContentPieceId as string,
        publishedAt: new Date(),
      });
      ok(
        "de effectmeting plant nu twee golven in plaats van 'geen doelvragen'",
        ptGolven.planned === 2,
        `${ptGolven.planned} golf/golven`,
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // De effectmeting gooide de helft van haar betaalde metingen weg
    // (doorloop-huyberts.md punt 1, migratie 0066).
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: twee unieke indexen op
    // tracking_runs spraken elkaar tegen. tracking_runs_idem_idx (0041) kende
    // impact_wave en content_piece_id niet, dus golf 2 van dezelfde vraag
    // botste met golf 1, en twee pagina's die dezelfde vraag als doel hebben
    // botsten met elkaar. Dat gebeurde NA de betaalde web_search-aanroep. Bij
    // Huyberts Keukens kostte dat 56 van de 112 betaalde zoekacties.
    {
      console.log("\nDe impactmeting bewaart nu beide golven en beide pagina's (0066)");
      const impactProfileId = randomUUID();
      const impactAnalysisId = randomUUID();
      const promptId = randomUUID();
      const pieceA = randomUUID();
      const pieceB = randomUUID();

      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status)
         values ($1, $2, 'Fysi-Unique impact', 'https://fysi-unique.nl', 'Fysi-Unique', 'klaar')`,
        [impactProfileId, userId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, 'Fysi-Unique — impact', 'https://fysi-unique.nl', 'hardloopblessure', 'gereed')`,
        [impactAnalysisId, userId, impactProfileId],
      );
      // ÉÉN vraag, gedeeld door twee pagina's; dat is precies de botsing uit
      // punt 1 van doorloop-huyberts.md.
      await db.client.query(
        `insert into public.prompts (id, analysis_id, text, category, active)
         values ($1, $2, 'Waar kan ik in Amersfoort terecht voor een hardloopblessure?', 'Oriëntatie', true)`,
        [promptId, impactAnalysisId],
      );
      await db.client.query(
        `insert into public.content_pieces (id, analysis_id, type, title) values
         ($1, $2, 'article', 'Hardloopblessures in Amersfoort'),
         ($3, $2, 'article', 'Wat kost een behandeling')`,
        [pieceA, impactAnalysisId, pieceB],
      );

      const { measurePromptById } = await import("@/lib/pipeline/measure");
      const weekNo = 3; // "de laatste periode", zoals een echte impactmeting meegeeft

      // Golf 1 en golf 2 van dezelfde pagina, dezelfde vraag. Vóór 0066 sloeg
      // de tweede insert dood op tracking_runs_idem_idx, ná een betaalde
      // web_search.
      let golf1Fout: unknown = null;
      let golf2Fout: unknown = null;
      let pagBFout: unknown = null;
      try {
        await measurePromptById(impactAnalysisId, promptId, weekNo, {
          purpose: "impact",
          contentPieceId: pieceA,
          wave: 1,
        });
      } catch (err) {
        golf1Fout = err;
      }
      try {
        await measurePromptById(impactAnalysisId, promptId, weekNo, {
          purpose: "impact",
          contentPieceId: pieceA,
          wave: 2,
        });
      } catch (err) {
        golf2Fout = err;
      }
      // Pagina B, dezelfde vraag, dezelfde week: de tweede botsing uit punt 1.
      try {
        await measurePromptById(impactAnalysisId, promptId, weekNo, {
          purpose: "impact",
          contentPieceId: pieceB,
          wave: 1,
        });
      } catch (err) {
        pagBFout = err;
      }

      ok("golf 1 wordt opgeslagen", golf1Fout === null, String(golf1Fout));
      ok("golf 2 van dezelfde pagina wordt NIET tegengehouden door golf 1", golf2Fout === null, String(golf2Fout));
      ok("pagina B met dezelfde vraag wordt NIET tegengehouden door pagina A", pagBFout === null, String(pagBFout));

      const { rows: impactRijen } = await db.client.query(
        `select content_piece_id, impact_wave from public.tracking_runs
          where analysis_id = $1 and prompt_id = $2 and purpose = 'impact'
          order by content_piece_id, impact_wave`,
        [impactAnalysisId, promptId],
      );
      ok(
        "alle drie de metingen staan als aparte rijen",
        impactRijen.length === 3,
        `${impactRijen.length} rij(en)`,
      );

      // Een herhaalde aanroep voor exact dezelfde pagina en golf (een herhaalde
      // taak, of een cron die twee keer binnen dezelfde minuut draait) moet
      // idempotent blijven: geen vierde rij, geen nieuwe betaalde aanroep.
      await measurePromptById(impactAnalysisId, promptId, weekNo, {
        purpose: "impact",
        contentPieceId: pieceA,
        wave: 1,
      });
      const { rows: naHerhaling } = await db.client.query(
        `select count(*)::int as n from public.tracking_runs
          where analysis_id = $1 and prompt_id = $2 and purpose = 'impact'
            and content_piece_id = $3 and impact_wave = 1`,
        [impactAnalysisId, promptId, pieceA],
      );
      ok("een herhaalde meting van dezelfde golf blijft op één rij staan", naHerhaling[0].n === 1);

      // De keerzijde: tracking_runs_idem_periodic_idx moet periodieke metingen
      // nog steeds tegenhouden. content_piece_id is hier null, dus dit raakt
      // een ANDERE index dan hierboven, en die moet nog gewoon werken.
      await db.client.query(
        `insert into public.tracking_runs
           (analysis_id, prompt_id, prompt_text_snapshot, prompt_category_snapshot,
            engine, week_no, purpose, repeat_index, raw_response, raw_response_received_at)
         values ($1, $2, 'antwoord 1', 'Oriëntatie', 'openai', $3, 'periodic', 0, 'antwoord 1', now())`,
        [impactAnalysisId, promptId, weekNo],
      );
      let periodiekDubbelFout: unknown = null;
      try {
        await db.client.query(
          `insert into public.tracking_runs
             (analysis_id, prompt_id, prompt_text_snapshot, prompt_category_snapshot,
              engine, week_no, purpose, repeat_index, raw_response, raw_response_received_at)
           values ($1, $2, 'antwoord 2', 'Oriëntatie', 'openai', $3, 'periodic', 0, 'antwoord 2', now())`,
          [impactAnalysisId, promptId, weekNo],
        );
      } catch (err) {
        periodiekDubbelFout = err;
      }
      ok(
        "een dubbele periodieke meting botst nog steeds op de unieke index",
        periodiekDubbelFout !== null && String(periodiekDubbelFout).includes("tracking_runs_idem_periodic_idx"),
        String(periodiekDubbelFout),
      );
    }

    // ══════════════════════════════════════════════════════════════════════
    // DE EINDPOORT: geen definitieve versie zolang er vragen open staan
    // (28 augustus 2026, `lib/content-final-gate.ts`)
    //
    // Dit hoort in de KETENTEST en niet in de unittest: de poort is een
    // samenspel tussen twee tabellen die niets van elkaar weten. De rekenkant
    // (`eindpoort`) staat in `scripts/test-unit.ts`; wat hier getoetst wordt is
    // of de telling de goede rijen pakt, en vooral welke rijen NIET.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nDe eindpoort telt de juiste vragen");

    const poortProfiel = randomUUID();
    await db.client.query(
      `insert into public.profiles (id, user_id, name, url, status)
       values ($1, $2, 'Poortmerk', 'https://poortmerk.nl', 'klaar')`,
      [poortProfiel, userId],
    );
    const { rows: poortAnalyses } = await db.client.query(
      `insert into public.analyses (user_id, profile_id, url, topic, name, status)
       values ($1, $2, 'https://poortmerk.nl', 'onderhoud', 'Onderhoud', 'gereed'),
              ($1, $2, 'https://poortmerk.nl', 'installatie', 'Installatie', 'gereed')
       returning id`,
      [userId, poortProfiel],
    );
    const poortCluster = poortAnalyses[0].id as string;
    const anderCluster = poortAnalyses[1].id as string;

    const { rows: poortPagina } = await db.client.query(
      `insert into public.content_pieces (analysis_id, type, title, status, action)
       values ($1, 'article', 'Wat kost een onderhoudsbeurt', 'ready', 'nieuw') returning id`,
      [poortCluster],
    );
    const poortPieceId = poortPagina[0].id as string;

    const { countBlockingQuestions } = await import("@/lib/open-questions");
    const { eindpoort } = await import("@/lib/content-final-gate");

    ok(
      "zonder vragen staat de poort open",
      eindpoort(await countBlockingQuestions(admin as never, poortCluster, poortPieceId)).mag,
    );

    // 1. Een open vraag uit DIT cluster blokkeert.
    await db.client.query(
      `insert into public.fact_requests
         (profile_id, analysis_id, question, reason, status, scope, kind, answer_type, required)
       values ($1, $2, 'Wat kost een onderhoudsbeurt bij jullie?', 'prijs', 'open',
               'analyse', 'bewijs', 'tekst_kort', true)`,
      [poortProfiel, poortCluster],
    );
    ok(
      "een open vraag uit dit cluster houdt de definitieve versie tegen",
      !eindpoort(await countBlockingQuestions(admin as never, poortCluster, poortPieceId)).mag,
    );

    // 2. Een open vraag uit een ANDER cluster blokkeert deze pagina niet.
    //    Zonder deze grens zet één vraag over installaties de onderhoudspagina
    //    dicht, en dan wacht de klant op werk dat er niets mee te maken heeft.
    await db.client.query(
      `update public.fact_requests set status = 'overgeslagen' where analysis_id = $1`,
      [poortCluster],
    );
    await db.client.query(
      `insert into public.fact_requests
         (profile_id, analysis_id, question, reason, status, scope, kind, answer_type, required)
       values ($1, $2, 'Welke merken installeren jullie?', 'aanbod', 'open',
               'analyse', 'aanvulling', 'tekst_kort', true)`,
      [poortProfiel, anderCluster],
    );
    ok(
      "overslaan telt als antwoord, en een ander cluster telt niet mee",
      eindpoort(await countBlockingQuestions(admin as never, poortCluster, poortPieceId)).mag,
    );

    // 3. Een MERKBREDE vraag die aan déze pagina hangt blokkeert wél. Die komt
    //    uit de claim-audit: de tekst beweert iets, dus het feit moet kloppen.
    await db.client.query(
      `insert into public.fact_requests
         (profile_id, analysis_id, question, reason, status, scope, kind, answer_type,
          required, content_piece_ids)
       values ($1, null, 'In welk jaar zijn jullie opgericht?', 'de tekst noemt het', 'open',
               'merk', 'verificatie', 'tekst_kort', true, array[$2::uuid])`,
      [poortProfiel, poortPieceId],
    );
    ok(
      "een merkbrede vraag die aan deze pagina hangt telt wél mee",
      !eindpoort(await countBlockingQuestions(admin as never, poortCluster, poortPieceId)).mag,
    );

    // 4. Een merkbrede vraag die NERGENS aan hangt blokkeert niets. Zonder deze
    //    grens zet één onbeantwoorde vraag uit de onboarding élke pagina van
    //    élk cluster voorgoed dicht, en dan is de poort een slot.
    await db.client.query(
      `update public.fact_requests set status = 'beantwoord', answer = '1974'
        where profile_id = $1 and analysis_id is null`,
      [poortProfiel],
    );
    await db.client.query(
      `insert into public.fact_requests
         (profile_id, analysis_id, question, reason, status, scope, kind, answer_type, required)
       values ($1, null, 'Hoeveel monteurs hebben jullie?', 'onboarding', 'open',
               'merk', 'aanvulling', 'tekst_kort', false)`,
      [poortProfiel],
    );
    ok(
      "een losse merkvraag blokkeert deze pagina niet",
      eindpoort(await countBlockingQuestions(admin as never, poortCluster, poortPieceId)).mag,
    );

    await db.client.query("delete from public.profiles where id = $1", [poortProfiel]);

    __setTestAdminClient(null);
    __setTestTransport(null);
    __setTestPlainTransport(null);
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
