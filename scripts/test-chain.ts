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

    // Eén geschreven pagina onder deze analyse, voor de tests die een bestaande
    // tekst nodig hebben (archiveren, het slot van de PATCH-route). De
    // contentketen zelf wordt vanaf WP5 van contentketen-opnieuw.md getoetst.
    await db.client.query(
      `insert into public.content_pieces (analysis_id, title, type, status, version, is_current, body_markdown, needs_review)
       values ($1, 'Pagina over hardloopblessures', 'article', 'ready', 1, true,
               '# Hardloopblessures\n\nFysi-Unique behandelt runnersknie en shin splints in Amersfoort.', true)`,
      [analysisId],
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
    // De admin is het vaste adres uit `lib/roles.ts`, met een bevestigd adres.
    // Een rij in `staff_users` alleen is sinds 30 september 2026 geen recht meer.
    await db.client.query(
      "insert into auth.users (id, email, email_confirmed_at) values ($1, $2, null), ($3, $4, now())",
      [vreemdeId, "vreemde@example.com", beheerderId, "koopman.janwillem@gmail.com"],
    );
    await db.client.query("insert into public.staff_users (user_id, role) values ($1, 'superuser')", [beheerderId]);

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
      (naOnderzoek[0].summary ?? "").includes("Amersfoort"),
    );
    // Sinds K8 komen de bewijspunten van het model niet meer op het profiel
    // (niemand las ze), alleen als vermoeden in de kennislaag.
    const { rows: bewijspunten } = await db.client.query(
      "select status, gebruik from public.klantkennis where profile_id = $1 and soort = 'bewijspunt'",
      [preboardId],
    );
    ok("de bewijspunten niet meer op het profiel", (naOnderzoek[0].proof_points ?? []).length === 0);
    ok(
      "maar als vermoeden in de kennislaag",
      bewijspunten.length > 0 && bewijspunten.every((r) => r.status === "afgeleid" && r.gebruik === "intern"),
      JSON.stringify(bewijspunten),
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
    // De aanbodboom bewerkbaar: toevoegen, wijzigen, verwijderen, hercrawl
    // (onboarding Ronde C, documentatie/onboarding_optimalisatie.md §16, migratie 0079)
    //
    // C3 t/m C5 in één doorloop, tegen dezelfde route-logica als
    // `app/api/profiles/[id]/offerings/route.ts`: de pure functies uit
    // `lib/offerings-validate.ts`, en de gedeelde lezer uit `lib/offerings.ts`.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nDe aanbodboom bewerkbaar: toevoegen, wijzigen, verwijderen, hercrawl");

    const { activeOfferings, activeOfferingCount, removedOfferings } = await import(
      "@/lib/offerings"
    );
    const { nextSortOrder: berekenSortOrder, wouldCreateCycle: geeftLus } = await import(
      "@/lib/offerings-validate"
    );

    // Schone lei: de knopen uit het 0043-scenario hierboven horen hier niet bij.
    await db.client.query("delete from public.profile_offerings where profile_id = $1", [
      profileId,
    ]);

    // ── C3, toevoegen: de eerste knoop krijgt sort_order 10 ───────────────────
    const eersteVolgorde = berekenSortOrder(await activeOfferings(admin as never, profileId));
    ok("C3: een lege boom begint bij sort_order 10", eersteVolgorde === 10);
    const { rows: [onderhoud] } = await db.client.query(
      `insert into public.profile_offerings (profile_id, kind, name, source, sort_order, note)
       values ($1, 'dienst', 'Onderhoudsabonnement', 'gesprek', $2, 'levert 40% van de omzet')
       returning id`,
      [profileId, eersteVolgorde],
    );

    // ── C3, toevoegen onder een knoop: de tweede komt op sort_order 20 ────────
    const tweedeVolgorde = berekenSortOrder(await activeOfferings(admin as never, profileId));
    ok("C3: de tweede knoop komt op sort_order 20", tweedeVolgorde === 20);
    const { rows: [reparatie] } = await db.client.query(
      `insert into public.profile_offerings (profile_id, parent_id, kind, name, source, sort_order)
       values ($1, $2, 'dienst', 'Reparatie', 'ai', $3)
       returning id`,
      [profileId, onderhoud.id, tweedeVolgorde],
    );

    // ── C3, de lus-controle: Reparatie mag niet de ouder van Onderhoudsabonnement worden ──
    const { rows: bomenVoorLus } = await db.client.query(
      "select id, parent_id from public.profile_offerings where profile_id = $1",
      [profileId],
    );
    ok(
      "C3: Onderhoudsabonnement onder Reparatie hangen zou een lus zijn",
      geeftLus(
        bomenVoorLus as { id: string; parent_id: string | null }[],
        onderhoud.id as string,
        reparatie.id as string,
      ),
    );
    ok(
      "C3: Reparatie onder Onderhoudsabonnement hangen (waar hij al hangt) is geen lus",
      !geeftLus(
        bomenVoorLus as { id: string; parent_id: string | null }[],
        reparatie.id as string,
        onderhoud.id as string,
      ),
    );

    // ── C3, wijzigen: de PATCH-route zet source en updated_by, altijd ─────────
    const bewerkerId = randomUUID();
    await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
      bewerkerId,
      "bewerker@example.com",
    ]);
    await db.client.query(
      `update public.profile_offerings
       set name = 'Onderhoudsabonnement (jaarlijks)', source = 'klant', updated_by = $2
       where id = $1`,
      [onderhoud.id, bewerkerId],
    );
    const { rows: [naWijziging] } = await db.client.query(
      "select name, source, updated_by from public.profile_offerings where id = $1",
      [onderhoud.id],
    );
    ok("C3: de wijziging is doorgevoerd", naWijziging.name === "Onderhoudsabonnement (jaarlijks)");
    ok("C3: en de herkomst is bijgewerkt naar wie hem zette", naWijziging.source === "klant");

    // ── C3, verwijderen: uitzetten met de onderliggende knopen mee ────────────
    const nu = new Date().toISOString();
    await db.client.query(
      `update public.profile_offerings set removed_at = $2, removed_by = $3
       where id in ($1, (select id from public.profile_offerings where parent_id = $1))`,
      [onderhoud.id, nu, bewerkerId],
    );

    const actiefNaVerwijderen = await activeOfferings(admin as never, profileId);
    ok(
      "C3: na verwijderen staat de boom leeg voor de actieve lezers",
      actiefNaVerwijderen.length === 0,
      `${actiefNaVerwijderen.length} nog actief`,
    );
    const verwijderdeKnopen = await removedOfferings(admin as never, profileId);
    ok(
      "C3: de knoop en zijn kind staan allebei bij de verwijderde knopen",
      verwijderdeKnopen.length === 2,
      `${verwijderdeKnopen.length} verwijderd`,
    );
    ok(
      "C2: de notitie uit het gesprek is bewaard, ook na verwijderen",
      verwijderdeKnopen.some((o) => o.note === "levert 40% van de omzet"),
    );

    // ── C4, hercrawlbescherming: alleen de AI-knopen gaan weg ──────────────────
    //
    // Onderhoudsabonnement is hier bewust 'klant' (handmatig gewijzigd) en al
    // verwijderd; Reparatie is 'ai' en zou van een nieuwe crawl komen. Zet ze
    // allebei terug op actief, simuleer daarna wat de deep-research-route doet
    // (`.eq("source", "ai")`), en controleer dat alleen de AI-knoop verdwijnt.
    await db.client.query(
      "update public.profile_offerings set removed_at = null, removed_by = null where profile_id = $1",
      [profileId],
    );
    await db.client.query(
      "delete from public.profile_offerings where profile_id = $1 and source = 'ai'",
      [profileId],
    );
    const naHercrawl = await activeOfferings(admin as never, profileId);
    ok(
      "C4: de handmatig gewijzigde dienst overleeft de hercrawl",
      naHercrawl.some((o) => o.id === onderhoud.id),
    );
    ok(
      "C4: en de AI-knoop is weg, precies zoals vóór deze ronde al gebeurde",
      !naHercrawl.some((o) => o.id === reparatie.id),
    );

    // ── C4, de idempotentiecontrole van offering.ts telt alleen AI-knopen ─────
    //
    // Zonder de §16.5.2-reparatie zou deze telling ook de knoop van de klant
    // meetellen, en dan zou `buildOfferingTree()` nooit meer draaien zodra er
    // één handmatige dienst bij staat, ook niet als de crawl daarna veel meer
    // vindt.
    const aiTellingNaHercrawl = await activeOfferingCount(admin as never, profileId);
    const { rows: [{ count: aiRijen }] } = await db.client.query(
      "select count(*) from public.profile_offerings where profile_id = $1 and source = 'ai'",
      [profileId],
    );
    ok(
      "C4: geen AI-knopen meer, dus de aanbodstap mag opnieuw draaien",
      Number(aiRijen) === 0,
    );
    ok(
      "C2/C5: de actieve telling ziet de overgebleven klantknoop",
      aiTellingNaHercrawl === 1,
      `${aiTellingNaHercrawl}`,
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

    const { runJob } = await import("@/lib/jobs/handlers");
    const { handleFailure } = await import("@/lib/jobs/worker");

    // ── Een definitief mislukte Gemini-meting laat de analyse niet hangen ──
    // Gevonden op 24 september 2026 in de kwaliteitsdoorlichting: alle 90
    // Gemini-taken van drie clusters gaven op (limiet bij DataForSEO) en de
    // analyses bleven op 'meten' staan, omdat alleen een opgegeven
    // `measure_prompt` de aggregatie inplande.
    {
      const week = 97;
      const { rows: geminiTaak } = await db.client.query(
        `insert into public.jobs (analysis_id, type, payload_json, dedupe_key, status, attempts)
         values ($1, 'measure_llm_response', $2, $3, 'running', 4) returning *`,
        [
          analysisId,
          JSON.stringify({ promptId: "00000000-0000-0000-0000-000000000097", weekNo: week }),
          `chain-gemini-fout:${analysisId}`,
        ],
      );
      await handleFailure(admin as never, geminiTaak[0], "rate_limit_exceeded");
      const { rows: aggregatie } = await db.client.query(
        `select id from public.jobs
          where analysis_id = $1 and type = 'aggregate_week' and payload_json->>'weekNo' = $2`,
        [analysisId, String(week)],
      );
      ok(
        "een opgegeven Gemini-meting plant de aggregatie alsnog in",
        aggregatie.length === 1,
        `aantal aggregatietaken: ${aggregatie.length}`,
      );
    }


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
    // Elke klant komt binnen met alle rechten (migratie 0135), ook als de
    // uitnodiging nog de oude rol `member` droeg.
    ok("als volwaardige klant, ook met een oude lidrol in de uitnodiging", lidmaatschap[0].role === "admin");

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
    // Toewijzen per e-mailadres, zonder eerst in Supabase een gebruiker aan
    // te maken (28 september 2026, `lib/profile-assign.ts`)
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nToewijzen per e-mailadres");
    {
      const { wijsToeAanGebruiker, wijsToeAanNieuwAccount } = await import("@/lib/profile-assign");
      const { findUserByEmail } = await import("@/lib/invites");

      const consultantId = randomUUID();
      const profielNieuwEmail = randomUUID();
      await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
        consultantId,
        "consultant-email-toewijzen@voorbeeld.nl",
      ]);
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status)
         values ($1, $2, 'Nog geen accountklant', 'https://nog-geen-account.nl', 'Nog geen accountklant', 'klaar')`,
        [profielNieuwEmail, consultantId],
      );

      // Een e-mailadres zonder gebruiker: er moet een nieuw account komen, met
      // een uitnodiging, geen 500 en geen halve toewijzing.
      ok("dit adres heeft nog geen gebruiker", (await findUserByEmail("nieuwe-klant@voorbeeld.nl")) === null);

      const nieuw = await wijsToeAanNieuwAccount(adminClient, {
        profileId: profielNieuwEmail,
        profileName: "Nog geen accountklant",
        email: "nieuwe-klant@voorbeeld.nl",
        invitedBy: consultantId,
      });
      ok("het nieuwe account wordt aangemaakt", nieuw.ok, nieuw.error ?? "");
      ok(
        "er komt een uitnodigingslink terug",
        typeof nieuw.inviteLink === "string" && nieuw.inviteLink.includes("/uitnodiging/"),
        nieuw.inviteLink ?? "geen link",
      );

      const { rows: naNieuwAccount } = await db.client.query(
        `select account_id, assigned_at from public.profiles where id = $1`,
        [profielNieuwEmail],
      );
      ok("het profiel staat op een account", naNieuwAccount[0]?.account_id != null);
      ok("de toewijsdatum is gezet", naNieuwAccount[0]?.assigned_at != null);

      const { rows: uitnodigingRijen } = await db.client.query(
        `select account_id, email, role from public.account_invites where account_id = $1`,
        [naNieuwAccount[0]?.account_id],
      );
      ok("er staat precies één uitnodiging voor dit account", uitnodigingRijen.length === 1);
      ok(
        "op het opgegeven adres, als beheerder",
        uitnodigingRijen[0]?.email === "nieuwe-klant@voorbeeld.nl" && uitnodigingRijen[0]?.role === "admin",
      );

      // Een adres dat al een gebruiker heeft: geen tweede account, gewoon
      // dezelfde toewijzing als de keuzelijst zou geven.
      const bestaandeKlantId = randomUUID();
      const profielBestaandeEmail = randomUUID();
      await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
        bestaandeKlantId,
        "bestaande-klant-email@voorbeeld.nl",
      ]);
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status)
         values ($1, $2, 'Al een accountklant', 'https://al-een-account.nl', 'Al een accountklant', 'klaar')`,
        [profielBestaandeEmail, consultantId],
      );

      const gevondenUserId = await findUserByEmail("bestaande-klant-email@voorbeeld.nl");
      ok("dit adres heeft al een gebruiker", gevondenUserId === bestaandeKlantId);

      const bestaand = await wijsToeAanGebruiker(adminClient, profielBestaandeEmail, gevondenUserId as string);
      ok("de toewijzing aan de bestaande gebruiker lukt", bestaand.ok, bestaand.error ?? "");
      ok("er komt geen uitnodigingslink bij, die gebruiker kan al inloggen", bestaand.inviteLink === undefined);

      const { rows: naBestaandeGebruiker } = await db.client.query(
        `select user_id from public.profiles where id = $1`,
        [profielBestaandeEmail],
      );
      ok("het profiel staat op de bestaande gebruiker", naBestaandeGebruiker[0]?.user_id === bestaandeKlantId);
    }

    // ══════════════════════════════════════════════════════════════════════
    // Het budgetplafond (F1, migratie 0053; herstelplan na audit T5, migratie
    // 0089: het accountplafond is een dagplafond geworden, `daily_budget_eur`
    // in plaats van `monthly_budget_eur`)
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

    // Nu de rem zelf. Het account krijgt een dagplafond van €1; er staat $2
    // op, oftewel ~€1,85, dus het is op.
    const budgetAccount = viaProfiel[0].account_id as string;
    await db.client.query(
      "update public.accounts set daily_budget_eur = 1 where id = $1",
      [budgetAccount],
    );
    const geblokkeerd = await checkBudget(budgetAccount);
    ok("boven het dagplafond blokkeert het", !geblokkeerd.ok);
    ok("en het zegt welk plafond", geblokkeerd.scope === "account");
    ok(
      "en de melding noemt een bedrag in euro's",
      (geblokkeerd.message ?? "").includes("€"),
    );

    // ⚠️ Nul is een echte waarde en geen "niet ingesteld". Zonder deze regel
    // zou `?? standaard` of `||` een account op slot stilletjes weer openzetten.
    await db.client.query(
      "update public.accounts set daily_budget_eur = 0 where id = $1",
      [budgetAccount],
    );
    ok("een plafond van nul zet het account op slot", !(await checkBudget(budgetAccount)).ok);

    // Ruim plafond: het mag weer.
    await db.client.query(
      "update public.accounts set daily_budget_eur = 500 where id = $1",
      [budgetAccount],
    );
    ok("met een ruim plafond mag het weer", (await checkBudget(budgetAccount)).ok);

    // De route-ingang loopt via het profiel en hoort hetzelfde te zeggen.
    await db.client.query(
      "update public.accounts set daily_budget_eur = 1 where id = $1",
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
    await db.client.query("insert into public.staff_users (user_id, role) values ($1, 'superuser')", [matrixStaffId]);
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
    // Punt 56: een mislukte rapportpoging is nog geen vastgelopen meting
    //
    // De AI-stub kent de rapportschema's niet en gooit dus, precies zoals
    // OpenAI toen het tegoed op was. Na de eerste poging moet de analyse op
    // 'gemeten' blijven staan (de wachtrij probeert het opnieuw); pas na de
    // laatste toegestane poging mag de klant "vastgelopen" zien.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nPunt 56: een mislukte rapportpoging is nog geen vastgelopen meting");

    const rapportAnalyse = randomUUID();
    await db.client.query(
      `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
       values ($1, $2, $3, 'Rapport faalt', 'https://fysi-unique.nl', 'iets', 'gemeten')`,
      [rapportAnalyse, userId, profileId],
    );
    await db.client.query(
      "insert into public.visibility_scores (analysis_id, week_no, score) values ($1, 0, 40)",
      [rapportAnalyse],
    );
    await db.client.query(
      `insert into public.jobs (analysis_id, type, payload_json, dedupe_key, status, scheduled_for)
       values ($1, 'generate_report', '{"weekNo":0}'::jsonb, $2, 'queued', now())`,
      [rapportAnalyse, `chain-rapport-faalt:${rapportAnalyse}`],
    );

    await runWorker();
    const { rows: rapportNaEerste } = await db.client.query(
      `select a.status as analyse, j.status as taak, j.attempts
         from public.analyses a join public.jobs j on j.analysis_id = a.id where a.id = $1`,
      [rapportAnalyse],
    );
    ok(
      "punt 56: na de eerste mislukte poging probeert de wachtrij het opnieuw",
      rapportNaEerste[0]?.taak === "queued" && rapportNaEerste[0]?.attempts === 1,
      JSON.stringify(rapportNaEerste[0] ?? null),
    );
    ok(
      "punt 56: en ziet de klant nog geen vastgelopen meting",
      rapportNaEerste[0]?.analyse === "gemeten",
      JSON.stringify(rapportNaEerste[0] ?? null),
    );

    // De laatste poging: nu mag, en moet, de klant het zien.
    await db.client.query(
      "update public.jobs set attempts = 3, scheduled_for = now() where analysis_id = $1",
      [rapportAnalyse],
    );
    await runWorker();
    const { rows: rapportNaLaatste } = await db.client.query(
      `select a.status as analyse, j.status as taak, j.attempts
         from public.analyses a join public.jobs j on j.analysis_id = a.id where a.id = $1`,
      [rapportAnalyse],
    );
    ok(
      "punt 56: na de laatste poging staat de analyse wel op mislukt",
      rapportNaLaatste[0]?.taak === "failed" && rapportNaLaatste[0]?.analyse === "mislukt",
      JSON.stringify(rapportNaLaatste[0] ?? null),
    );

    // ══════════════════════════════════════════════════════════════════════
    // Labels op clusters, en wat de prullenbak echt stopt (migratie 0083)
    //
    // ⚠️ Hier en niet in test-unit.ts: dit gaat over wat de DATABASE afdwingt
    // en over de samenhang tussen twee tabellen. Het uitklapmenu normaliseert
    // een labelnaam al, maar twee tabbladen die tegelijk hetzelfde label
    // aanmaken komen alleen op de unieke index tot stilstand. En de duurste
    // vraag van deze functie ("wordt er echt niet meer gemeten") is alleen te
    // beantwoorden door de maandronde zijn eigen lijst te laten trekken.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nLabels op clusters, en wat de prullenbak stopt (0083)");

    const { rows: labelRij } = await db.client.query(
      "insert into public.cluster_labels (profile_id, name) values ($1, 'Onderhoud') returning id",
      [profileId],
    );
    const labelId = labelRij[0].id as string;

    let dubbelGeweigerd = false;
    try {
      await db.client.query(
        "insert into public.cluster_labels (profile_id, name) values ($1, 'onderhoud')",
        [profileId],
      );
    } catch {
      dubbelGeweigerd = true;
    }
    ok("hetzelfde label kan niet twee keer onder één merk", dubbelGeweigerd);

    const gelabeld = randomUUID();
    await db.client.query(
      `insert into public.analyses (id, user_id, profile_id, name, url, topic, status, tracking_enabled, label_id)
       values ($1, $2, $3, 'Met label', 'https://fysi-unique.nl', 'onderhoud', 'gemeten', true, $4)`,
      [gelabeld, userId, profileId, labelId],
    );

    // Een label weggooien mag nooit het cluster meenemen: het cluster draagt
    // maanden meetdata, het label draagt een woord (`on delete set null`).
    await db.client.query("delete from public.cluster_labels where id = $1", [labelId]);
    const { rows: naLabelWeg } = await db.client.query(
      "select label_id from public.analyses where id = $1",
      [gelabeld],
    );
    ok(
      "een label weggooien laat het cluster staan, zonder label",
      naLabelWeg.length === 1 && naLabelWeg[0].label_id === null,
    );

    // ── De belofte van de prullenbakknop ────────────────────────────────────
    //
    // Exact de query van `/api/cron/tracking`: actief, meting aan, en in een
    // meetbare stand. Vóór het archiveren staat het cluster erin, erna niet.
    async function inDeMaandronde(): Promise<boolean> {
      const { rows } = await db.client.query(
        `select 1 from public.analyses
          where id = $1 and archived_at is null and tracking_enabled = true
            and status in ('gemeten', 'gereed')`,
        [gelabeld],
      );
      return rows.length === 1;
    }

    ok("een gewoon cluster staat in de maandronde", await inDeMaandronde());
    await db.client.query("update public.analyses set archived_at = now() where id = $1", [gelabeld]);
    ok("in de prullenbak valt het eruit, dus er wordt niet meer gemeten", !(await inDeMaandronde()));
    await db.client.query("update public.analyses set archived_at = null where id = $1", [gelabeld]);
    ok("en terugzetten laat het meten weer meedoen", await inDeMaandronde());

    // ── Hernoemen raakt één rij en verhuist de clusters mee ────────────────
    //
    // Precies waarvoor `cluster_labels` een tabel is en geen tekstkolom: het
    // cluster wijst naar het id, dus de naam wijzigt op één plek.
    const { rows: hernoemRij } = await db.client.query(
      "insert into public.cluster_labels (profile_id, name) values ($1, 'Storing') returning id",
      [profileId],
    );
    const hernoemId = hernoemRij[0].id as string;
    await db.client.query("update public.analyses set label_id = $1 where id = $2", [
      hernoemId,
      gelabeld,
    ]);
    await db.client.query("update public.cluster_labels set name = 'Storing en spoed' where id = $1", [
      hernoemId,
    ]);
    const { rows: naHernoemen } = await db.client.query(
      `select l.name from public.analyses a
         join public.cluster_labels l on l.id = a.label_id
        where a.id = $1`,
      [gelabeld],
    );
    ok(
      "hernoemen verhuist het cluster mee, zonder het cluster aan te raken",
      naHernoemen[0]?.name === "Storing en spoed",
      `naam was ${naHernoemen[0]?.name}`,
    );

    // Opruimen: dit cluster hoort niet mee te tellen in de scenario's hierna.
    await db.client.query("delete from public.analyses where id = $1", [gelabeld]);
    await db.client.query("delete from public.cluster_labels where id = $1", [hernoemId]);

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

    // Blok C, §3.2 deel B: zonder DATAFORSEO-sleutel in deze test blijft elke
    // vraag op 'geschat' staan, precies het gedrag van vóór die bouwronde.
    const { rows: volumeBronnen } = await db.client.query(
      "select volume_source from public.prompts where analysis_id = $1",
      [mixAnalyse],
    );
    ok(
      "zonder zoekvolumeleverancier blijft volume_source 'geschat'",
      volumeBronnen.every((r) => r.volume_source === "geschat"),
      volumeBronnen.map((r) => r.volume_source).join(", "),
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

    const { createPlan, loadPlanVersions } = await import("@/lib/plans");

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
    // Werkpakket C §5.1: dit cluster overwoog ook een tweede gemis, maar dat
    // werd geen aanbeveling. `loadPlan()` moet dat teruggeven in `declined`.
    await db.client.query(
      `update public.reports set declined_json = $1::jsonb
        where analysis_id = $2`,
      [
        JSON.stringify([
          { cluster: "lage potentie", problem: "AI noemt geen enkele aanbieder", reason: "geen bestaand aanbod om over te schrijven" },
        ]),
        lagePotentie.analyseId,
      ],
    );
    // Nog nergens zichtbaar en veel zoekvolume: dít is de kans. Potentie ≈ 90.
    const hogePotentie = await clusterMetKans("hoge potentie", false, 90);

    // ⚠️ Eén pagina per maand, zodat maand 1 moet KIEZEN tussen de twee kansen.
    // Sinds blok A punt 1 (`vulOpenMaanden()`, lib/plans.ts) vult het plan élke
    // openstaande maand vooraf, dus de kans die maand 1 niet kreeg komt niet
    // meer in de voorraad terecht maar in maand 2: dat is verderop de eerste
    // controle die bewijst dat de sortering ook na maand 1 nog doorwerkt.
    //
    // ⚠️ Vaste `startedOn`, een heel jaar verderop. Zonder dat argument leest
    // `createPlan()` de echte klok, en de rest van dit scenario (verderop
    // `assignToMonth()` en `setPageDate()`, die geen `now` kunnen krijgen)
    // rekent ALTIJD tegen de echte klok, ongeacht wat hier staat. Ligt een van
    // de twaalf maanden van dit plan toevallig in dezelfde kalendermaand als
    // vandaag, dan geldt daar dezelfde grens als in `maandIsVol()` (punt 5 van
    // docs/tasks/opdracht-bevindingen-5-tot-9.md) en breekt dat bij "de datum
    // zelf zetten" verderop in dit scenario met "Die dag is al voorbij".
    // Zelfde reden waarom de tests in `plan-schedule` een `now` gebruiken die
    // een jaar van de geteste maand vandaan ligt.
    const planResultaat = await createPlan(admin as never, {
      profileId: planPotProfileId,
      pagesPerMonth: 1,
      startedOn: new Date("2027-06-10T00:00:00Z"),
    });
    ok(
      "het plan wordt gemaakt",
      planResultaat.ok,
      planResultaat.ok ? "" : JSON.stringify((planResultaat as { problems: string[] }).problems),
    );
    // T8.10: hier is geen tekort (1 gevraagd, 2 beschikbaar), dus geen regressie.
    ok(
      "T8.10: geen tekort als de voorraad groot genoeg is",
      planResultaat.ok && planResultaat.plannedCount === planResultaat.requestedCount,
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

    // ⚠️ Blok A punt 1 (docs/tasks/nova-vergelijking-verbeterpunten.md):
    // sinds `vulOpenMaanden()` niet langer alleen maand 1 vult maar élke
    // openstaande maand, komt de andere kans niet meer in de voorraad terecht
    // maar in maand 2 (pagesPerMonth is 1, dus maand 1 was al vol). Dát is nu
    // precies het verschil met de oude jaarverdeling, die alle twaalf maanden
    // in één keer met verzonnen combinaties volstopte: hier komt maand 2 pas
    // aan de beurt ná maand 1, met een échte gemeten kans, niet met invulsel.
    const { rows: voorraadLeeg } = await db.client.query(
      `select id from public.planned_pages
        where profile_id = $1 and plan_month_id is null and status = 'gepland'`,
      [planPotProfileId],
    );
    ok(
      "de voorraad is leeg: er waren precies genoeg kansen voor twee maanden",
      voorraadLeeg.length === 0,
      `${voorraadLeeg.length} nog in de voorraad`,
    );

    const { rows: maand2Paginas } = await db.client.query(
      `select pp.topic_id, pp.scheduled_for from public.planned_pages pp
         join public.plan_months pm on pm.id = pp.plan_month_id
         join public.content_plans cp on cp.id = pm.plan_id
        where cp.profile_id = $1 and pm.month_number = 2 and pp.is_buffer = false`,
      [planPotProfileId],
    );
    ok(
      "de andere kans komt in maand 2 terecht",
      maand2Paginas.length === 1 && maand2Paginas[0]?.topic_id === lagePotentie.topicId,
      `${maand2Paginas.length} pagina's in maand 2`,
    );
    ok(
      "en heeft, net als maand 1, een publicatiedatum",
      Boolean(maand2Paginas[0]?.scheduled_for),
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
      "twee ingeplande pagina's, blok A punt 1 vulde beide maanden",
      bundel?.pages.length === 2 && bundel?.backlog.length === 0,
      `${bundel?.pages.length} ingepland, ${bundel?.backlog.length} in de voorraad`,
    );
    ok(
      "de clusters die al kansen leverden staan apart, zodat het scherm niet om een meting vraagt die er is",
      bundel?.metKansen.length === 2,
      `${bundel?.metKansen.length} clusters met kansen`,
    );
    ok(
      "de afgevallen kans van het rapport komt mee in de bundel (0078)",
      bundel?.declined.length === 1 && bundel?.declined[0]?.reason.includes("geen bestaand aanbod"),
      JSON.stringify(bundel?.declined),
    );

    // ── Een verse kans die nog in de voorraad staat ─────────────────────────
    //
    // ⚠️ Met beide maanden al vol (hierboven) is dit de enige manier om nu nog
    // een kans in de voorraad te zien: gemeten ná het aanmaken van het plan,
    // en uitgelezen met `{ sync: false }` zodat `vulOpenMaanden()` niet alvast
    // meeloopt. Dat is ook het echte moment waarop een klant een voorraadkaart
    // te zien krijgt: het venster tussen een nieuwe meting en de eerstvolgende
    // schermopening die wél synchroniseert.
    const derdeKans = await clusterMetKans("derde potentie", true, 5);
    const { syncBacklog: syncVoorDerde } = await import("@/lib/plan-backlog-data");
    await syncVoorDerde(admin as never, planPotProfileId);
    const bundelMetVoorraad = await leesPlan(admin as never, planPotProfileId, { sync: false });
    ok(
      "de verse kans staat in de voorraad en nergens anders",
      bundelMetVoorraad?.backlog.length === 1 && bundelMetVoorraad.pages.length === 2,
      `${bundelMetVoorraad?.backlog.length} in de voorraad, ${bundelMetVoorraad?.pages.length} ingepland`,
    );
    ok(
      "de voorraadkaart draagt de naam van zijn cluster",
      bundelMetVoorraad?.backlog[0]?.cluster === "derde potentie",
      `cluster was ${bundelMetVoorraad?.backlog[0]?.cluster}`,
    );
    ok(
      "en zijn doelvragen, met de noemer erbij",
      bundelMetVoorraad?.backlog[0]?.raakt === 1 && bundelMetVoorraad?.backlog[0]?.gemeten === 1,
      `raakt ${bundelMetVoorraad?.backlog[0]?.raakt} van ${bundelMetVoorraad?.backlog[0]?.gemeten}`,
    );
    // ⚠️ `numeric` komt als TEKST binnen bij de JS-client. Zonder de `Number()`
    // in `naarBacklogItem()` sorteert "9" boven "80", en dan staat de zwakste
    // kans bovenaan zonder dat er iets kapot lijkt.
    ok(
      "de potentie is een getal en geen tekst",
      typeof bundelMetVoorraad?.backlog[0]?.potentie === "number" ||
        bundelMetVoorraad?.backlog[0]?.potentie === null,
      `type was ${typeof bundelMetVoorraad?.backlog[0]?.potentie}`,
    );
    // N6 en V20: de voorraadkaart weet uit welke kans hij komt, en het plan
    // geeft de zin voor de consultant mee. Deze kans rust op één meetvraag.
    const kansVanKaart = bundelMetVoorraad?.backlog[0]?.kansId ?? "";
    ok(
      "de voorraadkaart wijst naar zijn kans, en de kaart zegt dat hij op één meetvraag rust",
      kansVanKaart !== "" && bundelMetVoorraad?.kaartZin[kansVanKaart] === "Rust op één meetvraag.",
      JSON.stringify(bundelMetVoorraad?.kaartZin[kansVanKaart] ?? null),
    );
    const voorraad = [{ id: bundelMetVoorraad!.backlog[0]!.id }];

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
      naDrieRondes[0].n === 3,
      `${naDrieRondes[0].n} kaarten in plaats van 3`,
    );
    // B33 (migratie 0130): elke kaart draagt de soort van zijn aanbeveling, ook
    // de kaarten die er al stonden, zodat een FAQ geen artikel meer wordt.
    const { rows: soorten } = await db.client.query(
      `select content_type from public.planned_pages where profile_id = $1`,
      [planPotProfileId],
    );
    ok(
      "B33: elke kaart draagt de soort van zijn aanbeveling",
      soorten.length === 3 && soorten.every((r: { content_type: string | null }) => r.content_type === "landing"),
      soorten.map((r: { content_type: string | null }) => r.content_type ?? "leeg").join(", "),
    );

    // ── De fase in de klantreis (docs/tasks/funnelfase-nooit-gevuld.md) ─────
    //
    // Tot 23 september 2026 schreef niets `funnel_stage_id`, en stond hij op
    // productie bij 0 van de 18 pagina's. Elke kans hier hangt aan één doelvraag
    // in de fase "Beslissing", en die hoort bij de merkfase "Kiezen". Ook de
    // twee kaarten die al bestonden vóórdat het plan de fasen aanmaakte, horen
    // hem na een synchronisatie te hebben.
    const { rows: fases } = await db.client.query(
      `select fs.label from public.planned_pages pp
         left join public.profile_funnel_stages fs on fs.id = pp.funnel_stage_id
        where pp.profile_id = $1`,
      [planPotProfileId],
    );
    ok(
      "elke kaart krijgt de fase van zijn doelvragen, ook de oudere",
      fases.length === 3 && fases.every((f: { label: string | null }) => f.label === "Kiezen"),
      fases.map((f: { label: string | null }) => f.label ?? "leeg").join(", "),
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

    // ⚠️ Bug van 21 september 2026: vulOpenMaanden() greep een kaart die de
    // klant net bewust terugsleepte (taken_out = true) meteen weer terug in
    // een open maand, nog vóór de klant hem ooit in de voorraad zag staan. De
    // volgende schermopening (zoals hier, via loadPlan() met sync: true) moet
    // die kaart laten liggen.
    const { loadPlan: leesPlanNaTerugleggen } = await import("@/lib/plans");
    await leesPlanNaTerugleggen(admin as never, planPotProfileId);
    const { rows: naSchermopening } = await db.client.query(
      `select plan_month_id, taken_out from public.planned_pages where id = $1`,
      [inMaand3[0].id],
    );
    ok(
      "een bewust teruggelegde kaart wordt niet meteen weer automatisch ingepland",
      naSchermopening[0].plan_month_id === null && naSchermopening[0].taken_out === true,
      `plan_month_id ${naSchermopening[0].plan_month_id}, taken_out ${naSchermopening[0].taken_out}`,
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

    // ── De publicatiedatum zelf zetten (migratie 0070) ──────────────────────
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

    // ── Elk planvoorstel blijft bewaard, met wat ervan geworden is (blok A
    // punt 7) ────────────────────────────────────────────────────────────────
    {
      const maand1 = maandRijen.find((m: { month_number: number }) => m.month_number === 1);
      const goedgekeurd = await approveMonth(admin as never, maand1.id, planPotUserId);
      ok("maand 1 van het eerste voorstel wordt vrijgegeven", goedgekeurd === true);

      // Een vers gemeten kans, anders heeft `createPlan()` niets meer om een
      // tweede voorstel mee te vullen: de eerdere twee kansen zitten allebei
      // al in een maand van het eerste voorstel.
      await clusterMetKans("derde voorstel", false, 40);

      // Nog een keer opzetten: dit stopt versie 1 en maakt versie 2, zonder dat
      // versie 1 of zijn maanden verdwijnen (conventie 8).
      const tweedeVersie = await createPlan(admin as never, {
        profileId: planPotProfileId,
        pagesPerMonth: 1,
        startedOn: new Date("2027-06-10T00:00:00Z"),
      });
      ok("het tweede voorstel wordt gemaakt", tweedeVersie.ok);

      const versies = await loadPlanVersions(admin as never, planPotProfileId);
      ok("er staan nu twee voorstellen", versies.length === 2);
      ok("het nieuwste staat vooraan", versies[0]?.version === 2 && versies[1]?.version === 1);
      ok("het oudste voorstel is gestopt, niet verwijderd", versies[1]?.status === "gestopt");
      ok(
        "het oudste voorstel onthoudt dat één maand is vrijgegeven",
        versies[1]?.maandenGoedgekeurd === 1 && versies[1]?.maandenTotaal === 12,
      );
      ok("het nieuwe voorstel heeft nog geen enkele maand vrijgegeven", versies[0]?.maandenGoedgekeurd === 0);

      // Punt 32 van de kwaliteitsdoorlichting: nog een keer opzetten ZONDER
      // nieuwe kans. Alle kansen staan in het tweede voorstel; vroeger
      // antwoordde dit "er zijn nog geen gemeten kansen om in te plannen".
      const { rows: inVoorstel2 } = await db.client.query(
        `select pp.id from public.planned_pages pp
           join public.plan_months m on m.id = pp.plan_month_id
           join public.content_plans c on c.id = m.plan_id
          where c.profile_id = $1 and c.version = 2 and m.status <> 'goedgekeurd' and pp.status = 'gepland'`,
        [planPotProfileId],
      );
      const derdeVersie = await createPlan(admin as never, {
        profileId: planPotProfileId,
        pagesPerMonth: 1,
        startedOn: new Date("2027-06-10T00:00:00Z"),
      });
      ok(
        "punt 32: opnieuw opzetten lukt ook als alle kansen al in het plan staan",
        derdeVersie.ok && inVoorstel2.length > 0,
        JSON.stringify({ derdeVersie, inVoorstel2: inVoorstel2.length }),
      );
      const { rows: waarNu } = await db.client.query(
        `select c.version from public.planned_pages pp
           join public.plan_months m on m.id = pp.plan_month_id
           join public.content_plans c on c.id = m.plan_id
          where pp.id = any($1)`,
        [inVoorstel2.map((r: { id: string }) => r.id)],
      );
      ok(
        "punt 32: en de kansen uit het vorige voorstel staan nu in het nieuwe",
        waarNu.length > 0 && waarNu.every((r: { version: number }) => r.version === 3),
        JSON.stringify(waarNu),
      );
    }

    // ══════════════════════════════════════════════════════════════════════
    // Een plan dat te laat in de maand start, begint in maand 2
    // (punt 5, docs/tasks/opdracht-bevindingen-5-tot-9.md)
    // ══════════════════════════════════════════════════════════════════════
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: `spreadDates()` geeft terecht
    // een lege lijst terug als maand 1 geen bruikbare dag meer over heeft,
    // maar `createPlan()` moet die lege lijst OPVANGEN en de voorzet naar
    // maand 2 zetten in plaats van pagina's zonder datum in maand 1 achter te
    // laten. Geen enkele unittest op `spreadDates()` alleen kan zien of de
    // aanroeper dat ook echt doet: dat is precies waar het bij Wouter
    // Warmtepomp misging op 31 augustus 2026, toen alle zeven pagina's van
    // maand 1 een publicatiedatum in het verleden kregen.
    console.log("\nEen plan dat te laat in de maand start, begint in maand 2 (punt 5)");
    {
      const teLaatUserId = randomUUID();
      const teLaatProfileId = randomUUID();
      const teLaatAnalyseId = randomUUID();
      const teLaatTopicId = randomUUID();
      const teLaatPromptId = randomUUID();
      const teLaatRunId = randomUUID();

      await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
        teLaatUserId,
        "telaatinmaand@example.com",
      ]);
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status)
         values ($1, $2, 'Te Laat BV', 'https://telaat-bv.nl', 'Te Laat BV', 'klaar')`,
        [teLaatProfileId, teLaatUserId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, 'warmtepomp', 'https://telaat-bv.nl', 'warmtepomp', 'gereed')`,
        [teLaatAnalyseId, teLaatUserId, teLaatProfileId],
      );
      await db.client.query(
        `insert into public.profile_topics (id, profile_id, analysis_id, title, priority, status, search_volume_index)
         values ($1, $2, $3, 'warmtepomp', 5, 'goedgekeurd', 50)`,
        [teLaatTopicId, teLaatProfileId, teLaatAnalyseId],
      );
      await db.client.query(
        `insert into public.prompts (id, analysis_id, text, category, active)
         values ($1, $2, 'Waar vind ik een warmtepomp?', 'Beslissing', true)`,
        [teLaatPromptId, teLaatAnalyseId],
      );
      await db.client.query(
        `insert into public.tracking_runs
           (id, analysis_id, prompt_id, prompt_text_snapshot, prompt_category_snapshot, week_no, purpose)
         values ($1, $2, $3, 'Waar vind ik een warmtepomp?', 'Beslissing', 0, 'periodic')`,
        [teLaatRunId, teLaatAnalyseId, teLaatPromptId],
      );
      await db.client.query(
        `insert into public.tracking_run_mentions (tracking_run_id, entity_name, is_own_brand, mentioned)
         values ($1, 'Te Laat BV', true, false)`,
        [teLaatRunId],
      );
      await db.client.query(
        "insert into public.visibility_scores (analysis_id, week_no, score) values ($1, 0, 0)",
        [teLaatAnalyseId],
      );
      await db.client.query(
        `insert into public.reports (analysis_id, period, recommendations_json)
         values ($1, 'week 0', $2::jsonb)`,
        [
          teLaatAnalyseId,
          JSON.stringify([
            {
              title: "Warmtepomp laten installeren in een bestaande woning",
              why: "De AI noemt ons niet.",
              type: "landing",
              action: "nieuw",
              targetIntent: "Iemand die een warmtepomp zoekt",
              targets: [
                { promptId: teLaatPromptId, weight: 1, text: "Waar vind ik een warmtepomp?" },
              ],
            },
          ]),
        ],
      );

      // Exact het scenario van Wouter Warmtepomp: het plan wordt op de
      // laatste dag van de maand opgesteld. `now` gaat expliciet mee zodat
      // deze test hetzelfde uitkomt ongeacht de werkelijke datum waarop hij
      // draait (dezelfde reden waarom `spreadDates()`-tests altijd een vaste
      // `now` meegeven).
      const opDe31e = new Date("2026-08-31T09:00:00Z");
      const planResultaat = await createPlan(admin as never, {
        profileId: teLaatProfileId,
        pagesPerMonth: 5,
        startedOn: opDe31e,
        now: opDe31e,
      });
      ok(
        "het plan wordt gemaakt, ook als maand 1 vol is",
        planResultaat.ok,
        planResultaat.ok ? "" : JSON.stringify((planResultaat as { problems: string[] }).problems),
      );

      // ⚠️ Herstelplan na audit T8.10: dit profiel heeft maar één gemeten kans,
      // terwijl er vijf per maand gevraagd zijn. Op productie meldde niets dat
      // de andere vier ontbraken; nu draagt het resultaat zelf de twee tellingen.
      ok(
        "T8.10: het resultaat meldt hoeveel er écht gepland zijn",
        planResultaat.ok && planResultaat.plannedCount === 1,
        planResultaat.ok ? String(planResultaat.plannedCount) : "",
      );
      ok(
        "T8.10: en hoeveel er gevraagd waren, zodat het tekort zichtbaar is",
        planResultaat.ok && planResultaat.requestedCount === 5,
        planResultaat.ok ? String(planResultaat.requestedCount) : "",
      );

      const { rows: teLaatMaanden } = await db.client.query(
        `select pm.month_number, pm.status,
                (select count(*)::int from public.planned_pages pp
                  where pp.plan_month_id = pm.id and pp.is_buffer = false) as aantal
           from public.plan_months pm
           join public.content_plans cp on cp.id = pm.plan_id
          where cp.profile_id = $1 and cp.status <> 'gestopt'
          order by pm.month_number`,
        [teLaatProfileId],
      );
      const teLaatMaand1 = teLaatMaanden.find((m: { month_number: number }) => m.month_number === 1);
      const teLaatMaand2 = teLaatMaanden.find((m: { month_number: number }) => m.month_number === 2);

      ok(
        "maand 1 blijft leeg",
        teLaatMaand1?.aantal === 0,
        `maand 1 kreeg ${teLaatMaand1?.aantal} pagina's`,
      );
      ok(
        "en blijft dus concept, er is niets om aan de klant voor te leggen",
        teLaatMaand1?.status === "concept",
        `status was ${teLaatMaand1?.status}`,
      );
      ok(
        "de voorzet staat in maand 2",
        teLaatMaand2?.aantal === 1,
        `maand 2 kreeg ${teLaatMaand2?.aantal} pagina's`,
      );
      ok(
        "en maand 2 staat ter goedkeuring",
        teLaatMaand2?.status === "ter_goedkeuring",
        `status was ${teLaatMaand2?.status}`,
      );

      const { rows: teLaatPagina } = await db.client.query(
        `select pp.scheduled_for from public.planned_pages pp
           join public.plan_months pm on pm.id = pp.plan_month_id
          where pm.month_number = 2 and pp.profile_id = $1`,
        [teLaatProfileId],
      );
      const teLaatDatum = teLaatPagina[0]?.scheduled_for
        ? new Date(teLaatPagina[0].scheduled_for).toISOString().slice(0, 10)
        : null;
      // September 2026: geen enkele datum meer in augustus, en binnen dag 28.
      ok(
        "die pagina krijgt een datum in september, niet in het verleden",
        typeof teLaatDatum === "string" && teLaatDatum >= "2026-09-01" && teLaatDatum <= "2026-09-28",
        `datum was ${teLaatDatum}`,
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
    // Twee klanten plus de admin, die sinds migratie 0134 in elk account zit.
    ok("en de twee mensen erin, plus de admin", plan?.counts.gebruikers === 3);
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
      const antwoord = (body: string) => ({ ok: true, status: 200, headers: new Headers(), text: async () => body });

      if (url.endsWith("/robots.txt")) return { ok: false, status: 404, headers: new Headers(), text: async () => "" };
      if (url.endsWith("/sitemap.xml")) {
        return antwoord(
          `<?xml version="1.0"?><urlset>${alleUrls
            .map((u) => `<loc>${u}</loc>`)
            .join("")}</urlset>`,
        );
      }
      if (url.endsWith("/sitemap_index.xml")) return { ok: false, status: 404, headers: new Headers(), text: async () => "" };
      if (alleUrls.includes(url)) {
        return antwoord(
          `<html><head><title>${url}</title></head><body><p>${"Inhoud van deze pagina. ".repeat(20)}</p></body></html>`,
        );
      }
      return { ok: false, status: 404, headers: new Headers(), text: async () => "" };
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
    // Crawlbeheer: "meer" vult aan, "opnieuw" vervangt (onboarding Ronde D,
    // documentatie/onboarding_optimalisatie.md §17.8, migratie 0080)
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nCrawlbeheer: aanvullen zonder te vervangen, en vervangen zonder handwerk te verliezen");
    {
      const crawlProfielId = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status, max_inventory_pages)
         values ($1, $2, 'Crawltest', 'https://crawltest.nl', 'Crawltest', 'klaar', 10)`,
        [crawlProfielId, userId],
      );
      await db.client.query(
        `insert into public.profile_pages (profile_id, url, title, text_excerpt, source) values
         ($1, 'https://crawltest.nl/handmatig', 'Met de hand toegevoegd',
          'Deze pagina blijft bij elke ronde staan.', 'handmatig')`,
        [crawlProfielId],
      );

      const crawlUrls = Array.from({ length: 8 }, (_, i) => `https://crawltest.nl/pagina-${i}`);

      const origineleFetch2 = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = String(input);
        const antwoord = (body: string) => ({ ok: true, status: 200, headers: new Headers(), text: async () => body });
        if (url.endsWith("/robots.txt")) return { ok: false, status: 404, headers: new Headers(), text: async () => "" };
        if (url.endsWith("/sitemap.xml")) {
          return antwoord(
            `<?xml version="1.0"?><urlset>${crawlUrls
              .map((u) => `<loc>${u}</loc>`)
              .join("")}</urlset>`,
          );
        }
        if (url.endsWith("/sitemap_index.xml")) return { ok: false, status: 404, headers: new Headers(), text: async () => "" };
        if (crawlUrls.includes(url)) {
          return antwoord(
            `<html><head><title>${url}</title></head><body><p>${"Inhoud van deze pagina. ".repeat(20)}</p></body></html>`,
          );
        }
        return { ok: false, status: 404, headers: new Headers(), text: async () => "" };
      }) as typeof globalThis.fetch;

      try {
        const { refreshInventory } = await import("@/lib/pipeline/refresh-inventory");

        // ── Ronde 1: "opnieuw" op vijf pagina's ──────────────────────────────
        // ⚠️ `refreshInventory()` klemt `maxPages` op minimaal 5 (zelfde
        // ondergrens als de PATCH-route voor `max_inventory_pages`), dus dat
        // is ook de kleinste zinvolle waarde voor deze test.
        const ronde1 = await refreshInventory(crawlProfielId, {
          mode: "opnieuw",
          maxPages: 5,
          speed: "snel", // geen pauzes, dit is een test en geen echte site
        });
        ok("ronde 1: geen blokkade", !ronde1.blocked);
        eqc("ronde 1: vijf plus de handmatige", String(ronde1.count), "6");

        const { rows: naRonde1 } = await db.client.query(
          "select url, source from public.profile_pages where profile_id = $1",
          [crawlProfielId],
        );
        const crawlUrlsRonde1 = naRonde1
          .filter((p) => p.source === "crawl")
          .map((p) => p.url as string);
        eqc("ronde 1: precies vijf gecrawlde pagina's", String(crawlUrlsRonde1.length), "5");
        ok(
          "ronde 1: de handmatige pagina staat er nog",
          naRonde1.some((p) => p.url.endsWith("/handmatig") && p.source === "handmatig"),
        );

        // ── Ronde 2: "meer" vult aan met de drie overgebleven pagina's ──────
        // Van de acht kandidaten zijn er vijf al bekend; "meer" kan er dus
        // hoogstens drie nieuwe bij vinden, ook al is er om vijf gevraagd.
        const ronde2 = await refreshInventory(crawlProfielId, {
          mode: "meer",
          maxPages: 5,
          speed: "snel",
        });
        ok("ronde 2: geen blokkade", !ronde2.blocked);

        const { rows: naRonde2 } = await db.client.query(
          "select url, source from public.profile_pages where profile_id = $1",
          [crawlProfielId],
        );
        eqc(
          "ronde 2: de vijf van ronde 1 staan er nog, plus drie nieuwe, plus de handmatige (9)",
          String(naRonde2.length),
          "9",
        );
        const crawlUrlsRonde2 = naRonde2
          .filter((p) => p.source === "crawl")
          .map((p) => p.url as string);
        ok(
          "ronde 2: geen enkele URL van ronde 1 is dubbel opgehaald",
          crawlUrlsRonde1.every((u) => crawlUrlsRonde2.filter((x) => x === u).length === 1),
        );
        ok(
          "ronde 2: er staan nu ook URL's bij die in ronde 1 nog niet gekozen waren",
          crawlUrlsRonde2.some((u) => !crawlUrlsRonde1.includes(u)),
        );

        // ── Ronde 3: "opnieuw" vervangt alles wat "crawl" is, handwerk blijft ─
        const ronde3 = await refreshInventory(crawlProfielId, {
          mode: "opnieuw",
          maxPages: 6,
          speed: "snel",
        });
        ok("ronde 3: geen blokkade", !ronde3.blocked);

        const { rows: naRonde3 } = await db.client.query(
          "select url, source from public.profile_pages where profile_id = $1",
          [crawlProfielId],
        );
        eqc(
          "ronde 3: precies zes gecrawlde pagina's plus de handmatige (7)",
          String(naRonde3.length),
          "7",
        );
        ok(
          "ronde 3: de handmatige pagina overleeft ook de vervangronde",
          naRonde3.some((p) => p.url.endsWith("/handmatig") && p.source === "handmatig"),
        );

        // ── En de crawlvelden op het profiel zelf zijn bijgewerkt ───────────
        const { rows: profielNaRondes } = await db.client.query(
          "select crawl_last_run_at, crawl_last_mode, crawl_speed, crawl_last_blocked_at from public.profiles where id = $1",
          [crawlProfielId],
        );
        ok("crawl_last_run_at staat gezet", profielNaRondes[0].crawl_last_run_at !== null);
        eqc("crawl_last_mode is de laatste modus", profielNaRondes[0].crawl_last_mode, "opnieuw");
        eqc("crawl_speed is de gekozen stand", profielNaRondes[0].crawl_speed, "snel");
        ok("geen blokkade gemeld", profielNaRondes[0].crawl_last_blocked_at === null);
      } finally {
        globalThis.fetch = origineleFetch2;
      }

      // ── Een 403 stopt de crawl in plaats van door te gaan met lege pagina's ─
      const origineleFetch3 = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/robots.txt")) return { ok: false, status: 404, headers: new Headers(), text: async () => "" };
        if (url.endsWith("/sitemap.xml")) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              `<?xml version="1.0"?><urlset>${crawlUrls.map((u) => `<loc>${u}</loc>`).join("")}</urlset>`,
          };
        }
        if (url.endsWith("/sitemap_index.xml")) return { ok: false, status: 404, headers: new Headers(), text: async () => "" };
        // De site weert ons vanaf hier volledig.
        return { ok: false, status: 403, headers: new Headers(), text: async () => "" };
      }) as typeof globalThis.fetch;

      try {
        const { refreshInventory } = await import("@/lib/pipeline/refresh-inventory");
        const geblokkeerd = await refreshInventory(crawlProfielId, {
          mode: "opnieuw",
          maxPages: 5,
          speed: "snel",
        });
        ok("een 403 wordt herkend als blokkade", geblokkeerd.blocked);

        const { rows: profielGeblokkeerd } = await db.client.query(
          "select crawl_last_blocked_at from public.profiles where id = $1",
          [crawlProfielId],
        );
        ok(
          "en dat wordt vastgelegd op het profiel",
          profielGeblokkeerd[0].crawl_last_blocked_at !== null,
        );

        // ⚠️ DE FOUT DIE DIT MOET VANGEN: een blokkade vóór de eerste pagina
        // levert nul bruikbare pagina's op. Zou "opnieuw" dan gewoon de tabel
        // vervangen, dan wist de blokkade van vandaag de zeven pagina's die
        // ronde 3 zonet opsloeg.
        const { rows: naBlokkade } = await db.client.query(
          "select url, source from public.profile_pages where profile_id = $1",
          [crawlProfielId],
        );
        eqc(
          "de zeven pagina's van vóór de blokkade staan er nog, niets is gewist",
          String(naBlokkade.length),
          "7",
        );
        ok(
          "de handmatige pagina overleeft ook een geblokkeerde ronde",
          naBlokkade.some((p) => p.url.endsWith("/handmatig") && p.source === "handmatig"),
        );
      } finally {
        globalThis.fetch = origineleFetch3;
      }
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
    // De open punten uit de synthese (24 augustus 2026 vragen aan de klant,
    // sinds A3 van `van-pijplijn-naar-kennissysteem.md` onderwerpen voor het
    // gesprek op het kennisoverzicht, besluit V3).
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

      // Sinds A3 (besluit V3) worden de open punten geen vragen aan de klant meer:
      // ze staan in het verslag, en het kennisoverzicht toont ze de consultant.
      const { rows: vragen } = await db.client.query("select count(*)::int as n from public.fact_requests where profile_id = $1", [gapProfileId]);
      eqc("de synthese stelt de klant geen vragen meer (A3)", String(vragen[0].n), "0");
      const { rows: facet } = await db.client.query("select facet, raw_json from public.profile_facets where profile_id = $1 and facet = 'synthese'", [gapProfileId]);
      const { openPuntenUitOnderzoek } = await import("@/lib/kennis/overzicht");
      const punten = openPuntenUitOnderzoek(facet as { facet: string; raw_json: unknown }[]);
      // De vier gaps uit de stub: één dubbele (hoofdletters), één met een
      // opsomteken, één leeg. Er horen er dus twee over te blijven.
      eqc("de open punten staan in het verslag, zonder dubbele en zonder opsomteken", String(punten.length), "2");
      ok("het opsomteken staat er niet in", punten.some((p) => p.punt === "In welk jaar is de praktijk opgericht?"), punten.map((p) => p.punt).join(" | "));

      // Idempotentie (conventie 9): de synthese slaat over omdat het facet er al staat.
      const tweede = await synthesiseProfile(gapProfileId);
      ok("een tweede synthese slaat over", tweede.skipped === true);
    }

    // ════════════════════════════════════════════════════════════════════════
    // De uitleg bij een marktclaim blijft nooit meer weg (punt 6,
    // docs/tasks/opdracht-bevindingen-5-tot-9.md)
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: `answerFact()` moet twee
    // besluiten LOS van elkaar nemen. Vóór de reparatie hing de uitleg aan de
    // vertakking op `isGapQuestion()`, die meteen terugkeerde: een gapvraag
    // met een superlatief liet dan geen enkele uitleg zien. Deze vier
    // gevallen (gap × wel/geen claim, clustervraag × wel/geen claim) zijn
    // precies de vier combinaties uit het verificatiecriterium, tegen de
    // echte functie en de echte database.
    // ════════════════════════════════════════════════════════════════════════
    console.log("\nDe uitleg bij een marktclaim blijft nooit meer weg (punt 6)");
    {
      const { answerFact } = await import("@/lib/facts");

      const marktclaimUserId = randomUUID();
      const marktclaimProfileId = randomUUID();
      await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
        marktclaimUserId,
        "marktclaimtest@example.com",
      ]);
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status, proof_points)
         values ($1, $2, 'Marktclaim BV', 'https://marktclaim-bv.nl', 'Marktclaim BV', 'klaar', '{}')`,
        [marktclaimProfileId, marktclaimUserId],
      );

      async function nieuweVraag(vraag: string, gap: boolean): Promise<string> {
        const factId = randomUUID();
        await db.client.query(
          `insert into public.fact_requests (id, profile_id, question, reason, status, raw_json)
           values ($1, $2, $3, 'test', 'open', $4::jsonb)`,
          [factId, marktclaimProfileId, vraag, gap ? JSON.stringify({ bron: "synthese-gap" }) : null],
        );
        return factId;
      }

      // ── 1. Gapvraag met een superlatief ─────────────────────────────────
      const gapMetClaim = await nieuweVraag(
        "Binnen hoeveel uur wordt normaal gereageerd op een storing?",
        true,
      );
      const uitkomst1 = await answerFact(admin as never, {
        profileId: marktclaimProfileId,
        factId: gapMetClaim,
        answer: "Wij zijn de snelste van de regio en reageren sneller dan elke concurrent.",
        gebruikerId: userId,
      });
      ok(
        "een gapvraag met een superlatief levert needsEvidence op",
        uitkomst1.ok && uitkomst1.outcome.needsEvidence === true,
      );
      ok(
        "en verandert proof_points niet",
        (await proofPointsVan(marktclaimProfileId)).length === 0,
      );

      // ── 2. Gapvraag met een gewoon antwoord ─────────────────────────────
      const gapZonderClaim = await nieuweVraag("In welk jaar is het bedrijf opgericht?", true);
      const uitkomst2 = await answerFact(admin as never, {
        profileId: marktclaimProfileId,
        factId: gapZonderClaim,
        answer: "1998",
        gebruikerId: userId,
      });
      ok(
        "een gapvraag met een gewoon antwoord levert geen needsEvidence op",
        uitkomst2.ok && uitkomst2.outcome.needsEvidence === false,
      );
      ok(
        "en verandert proof_points ook niet (gapvragen promoveren nooit)",
        (await proofPointsVan(marktclaimProfileId)).length === 0,
      );

      // ── 3. Clustervraag met een superlatief ─────────────────────────────
      const clusterMetClaim = await nieuweVraag("Waarom kiezen klanten voor jullie?", false);
      const uitkomst3 = await answerFact(admin as never, {
        profileId: marktclaimProfileId,
        factId: clusterMetClaim,
        answer: "Omdat wij marktleider zijn in de regio.",
        gebruikerId: userId,
      });
      ok(
        "een clustervraag met een superlatief levert óók needsEvidence op",
        uitkomst3.ok && uitkomst3.outcome.needsEvidence === true,
      );
      ok(
        "met de specifieke uitleg erbij (marktleider vraagt om een bron), niet de algemene",
        uitkomst3.ok && (uitkomst3.outcome.evidenceHint ?? "").includes("Noem de bron erbij"),
        uitkomst3.ok ? (uitkomst3.outcome.evidenceHint ?? "") : "",
      );
      ok(
        "en verandert proof_points niet",
        (await proofPointsVan(marktclaimProfileId)).length === 0,
      );

      // ── 4. Clustervraag met een gewoon antwoord ─────────────────────────
      const clusterZonderClaim = await nieuweVraag("Hoe lang bestaat het bedrijf al?", false);
      const uitkomst4 = await answerFact(admin as never, {
        profileId: marktclaimProfileId,
        factId: clusterZonderClaim,
        answer: "Al 25 jaar.",
        gebruikerId: userId,
      });
      ok(
        "een clustervraag met een gewoon antwoord levert geen needsEvidence op",
        uitkomst4.ok && uitkomst4.outcome.needsEvidence === false,
      );
      // Sinds K8 gaat geen antwoord meer naar proof_points (niemand las ze);
      // het antwoord staat verklaard in de kennislaag, en zo bereikt het de schrijver.
      ok("en komt niet meer in proof_points (K8)", (await proofPointsVan(marktclaimProfileId)).length === 0);
      const { rows: kennisVier } = await db.client.query(
        "select status, bewering from public.klantkennis where profile_id = $1 and herkomst_tabel = 'fact_requests' and herkomst_id = $2",
        [marktclaimProfileId, clusterZonderClaim],
      );
      ok(
        "maar staat verklaard in de kennislaag, met vraag en antwoord",
        kennisVier.length === 1 && kennisVier[0].status === "verklaard" && String(kennisVier[0].bewering).includes("Al 25 jaar."),
        JSON.stringify(kennisVier),
      );

      async function proofPointsVan(profileId: string): Promise<string[]> {
        const { rows } = await db.client.query(
          "select proof_points from public.profiles where id = $1",
          [profileId],
        );
        return (rows[0]?.proof_points as string[] | null) ?? [];
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // De open vraag per pagina (contentketen-opnieuw.md WP4, besluit B3)
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: de voorbereiding kan twee keer
    // starten (vrijgeven en de nachtelijke controle). Er mag dan nog steeds
    // één open vraag per pagina staan, en een lang antwoord erop hoort bij die
    // pagina en niet als bewijspunt in het merkprofiel.
    // ════════════════════════════════════════════════════════════════════════
    console.log("\nDe open vraag per pagina (WP4)");
    {
      const { maakOpenVraag } = await import("@/lib/pagina/open-vraag");
      const { answerFact } = await import("@/lib/facts");
      const { rows: stuk } = await db.client.query(
        "select id from public.content_pieces where analysis_id = $1 limit 1",
        [analysisId],
      );
      const pieceId = stuk[0].id as string;
      const invoer = { profileId, analysisId, pieceId, paginaTitel: "Pagina over hardloopblessures", onderwerp: "hardloopblessures" };
      await maakOpenVraag(admin as never, invoer);
      await maakOpenVraag(admin as never, invoer);
      const { rows: vragen } = await db.client.query(
        "select id, answer_type from public.fact_requests where open_vraag and $1 = any(content_piece_ids)",
        [pieceId],
      );
      ok("twee keer voorbereiden geeft één open vraag", vragen.length === 1, String(vragen.length));
      ok("met ruimte voor een lang antwoord", vragen[0]?.answer_type === "tekst_lang");

      const { rows: voor } = await db.client.query("select proof_points from public.profiles where id = $1", [profileId]);
      const lang = "Wij begonnen in 2004 in een garagebox. ".repeat(65).trim();
      ok("het antwoord is echt lang", lang.length > 2400, String(lang.length));
      const uitkomst = await answerFact(admin as never, {
        profileId,
        factId: vragen[0].id as string,
        answer: lang,
        gebruikerId: userId,
      });
      ok("het antwoord wordt opgeslagen", uitkomst.ok);
      const { rows: na } = await db.client.query(
        "select p.proof_points, f.answer, f.status from public.profiles p, public.fact_requests f where p.id = $1 and f.id = $2",
        [profileId, vragen[0].id],
      );
      ok("helemaal, niet ingekort", (na[0]?.answer as string)?.length === lang.length);
      ok(
        "en het merkprofiel blijft zoals het was",
        JSON.stringify(na[0]?.proof_points) === JSON.stringify(voor[0]?.proof_points),
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // De content brief (contentketen-opnieuw.md WP5, §6.1)
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: de briefs van een maand draaien na
    // elkaar, zodat de tweede de vragen van de eerste ziet. Draaien ze naast
    // elkaar, of ziet de tweede de eerste niet, dan stellen vijf pagina's
    // dezelfde vraag in vijf varianten. En een brief die opgeeft mag de rij
    // en de pagina niet ophouden.
    // ════════════════════════════════════════════════════════════════════════
    console.log("\nDe content brief (WP5)");
    {
      const { runJob } = await import("@/lib/jobs/handlers");
      const { handleFailure } = await import("@/lib/jobs/worker");
      const { planBriefs } = await import("@/lib/pagina/start");
      const { maakOpenVraag } = await import("@/lib/pagina/open-vraag");
      const { MAX_ATTEMPTS } = await import("@/lib/jobs/types");

      const eigenaar = randomUUID();
      const merk = randomUUID();
      const ander = randomUUID();
      const cluster = randomUUID();
      await db.client.query("insert into auth.users (id, email) values ($1, 'brieftest@example.com')", [eigenaar]);
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status, service_regions, verhalen)
         values ($1, $3, 'Rijschool Rem', 'https://rijschool-rem.nl', 'Rijschool Rem', 'klaar', '{Zwolle}',
                 'Onze eerste leerling was de buurvrouw.'),
                ($2, $3, 'Ander Merk', 'https://ander-merk.nl', 'Ander Merk', 'klaar', '{}', null)`,
        [merk, ander, eigenaar],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, 'Rijschool Rem, rijlessen', 'https://rijschool-rem.nl', 'rijlessen', 'gereed')`,
        [cluster, eigenaar, merk],
      );
      await db.client.query(
        `insert into public.brand_facts (profile_id, text, source, kind, fact_key)
         values ($1, 'Een rijles duurt 60 minuten.', 'site', 'site', 'rijles-duur')`,
        [merk],
      );
      const { rows: bestaand } = await db.client.query(
        `insert into public.fact_requests (profile_id, question, reason, status, scope, answer)
         values ($1, 'Hoeveel lessen heeft een leerling gemiddeld nodig?', 'test', 'open', 'merk', null),
                ($1, 'Wat kost een rijles?', 'test', 'beantwoord', 'merk', 'Een rijles kost 62 euro.'),
                ($2, 'Een vraag van een ander merk?', 'test', 'open', 'merk', null)
         returning id, profile_id, question`,
        [merk, ander],
      );
      // K6 (B20): blok A komt uit de kennislaag. Daar komt dit in het echt via het
      // terugvullen (K3) en de antwoordroute (K5); hier via dezelfde schrijfingang.
      {
        const { legVast } = await import("@/lib/kennis/vastleggen");
        const beantwoord = bestaand.find((r) => r.question.startsWith("Wat kost")).id as string;
        const kennis = [
          [{ profileId: merk, domein: "aanbod", soort: "termijn", bewering: "Een rijles duurt 60 minuten.", status: "waargenomen", bron: "website", bronUrl: "https://rijschool-rem.nl/les", citaat: "Elke les duurt 60 minuten", gebruik: "content", herkomst: { tabel: "brand_facts", id: randomUUID() } }, { actor: "code", taak: "kennis_terugvullen" }],
          [{ profileId: merk, domein: "verhaal", soort: "verhalen van de ondernemer", bewering: "Onze eerste leerling was de buurvrouw.", status: "verklaard", bron: "gesprek", gebruik: "content" }, { actor: "mens", gebruikerId: eigenaar }],
          [{ profileId: merk, domein: "aanbod", soort: "antwoord", bewering: "Wat kost een rijles?\nEen rijles kost 62 euro.", status: "verklaard", bron: "klant", gebruik: "content", herkomst: { tabel: "fact_requests", id: beantwoord } }, { actor: "mens", gebruikerId: eigenaar }],
        ] as const;
        for (const [item, door] of kennis) {
          const uit = await legVast(admin as never, item as never, door as never);
          if (uit.soort === "geweigerd") throw new Error(`Testkennis geweigerd: ${uit.fouten.join(" ")}`);
        }
      }
      const openVanMerk = bestaand.find((r) => r.question.startsWith("Hoeveel")).id as string;
      const vanAnder = bestaand.find((r) => r.profile_id === ander).id as string;

      const stukken: string[] = [];
      for (const titel of ["Rijles in Zwolle", "Faalangst bij rijles", "Spoedcursus rijbewijs"]) {
        const { rows } = await db.client.query(
          `insert into public.content_pieces (analysis_id, title, type, status, action)
           values ($1, $2, 'landing', 'briefing', 'nieuw') returning id`,
          [cluster, titel],
        );
        stukken.push(rows[0].id as string);
        await maakOpenVraag(admin as never, { profileId: merk, analysisId: cluster, pieceId: rows[0].id, paginaTitel: titel, onderwerp: titel });
      }

      const briefLog: string[] = [];
      const brief = (vragen: { vraag: string; merkbreed?: boolean; kern?: boolean }[], ookVoor: string[]) => ({
        zoekintentie: "Een goede rijschool in de buurt vinden",
        deelvragen: ["Hoeveel lessen heb ik nodig?"],
        concurrentie: { goed: ["Duidelijke prijzen"], gaten: ["Geen uitleg over het examen"] },
        vakkennis: [
          { uitleg: "Het praktijkexamen duurt 55 minuten.", bron_url: "https://www.cbr.nl/nl/rijbewijs-halen" },
          { uitleg: "Een uitleg zonder bron.", bron_url: "" },
        ],
        valkuilen: ["Denken dat een pakket altijd goedkoper is"],
        vragen: vragen.map((v) => ({
          vraag: v.vraag,
          waarom: "Dan staat er een echt voorbeeld op de pagina.",
          soort: "praktijk",
          antwoord_type: "tekst_lang",
          opties: null,
          merkbreed: v.merkbreed ?? false,
          kern: v.kern ?? false,
        })),
        ook_voor_deze_pagina: ookVoor,
        kern_eerder: null,
      });
      let beurt = 0;
      __setTestTransport((async (opts: { schemaName: string; user: string; schema: { parse: (x: unknown) => unknown } }) => {
        if (opts.schemaName !== "content_brief") throw new Error(`onverwacht schema ${opts.schemaName}`);
        briefLog.push(opts.user);
        beurt++;
        const antwoord =
          beurt === 1
            ? brief(
                [
                  { vraag: "Wat kost een rijles." },
                  ...Array.from({ length: 10 }, (_, i) => ({ vraag: `Welk voorbeeld nummer ${i + 1} kun je geven?`, kern: i === 0 })),
                ],
                [openVanMerk, vanAnder, "verzonnen-id"],
              )
            : brief([{ vraag: "Welk voorbeeld nummer 1 kun je geven?" }, { vraag: "Hoe begin je met een bange leerling?", merkbreed: true }], []);
        return { parsed: opts.schema.parse(antwoord), raw: { stub: true } };
      }) as never);

      async function briefTaken(): Promise<{ id: string; payload_json: { pieceId: string } }[]> {
        const { rows } = await db.client.query(
          "select * from public.jobs where type = 'pagina_brief' and status = 'queued' order by created_at asc",
        );
        return rows;
      }
      async function draaiEen(): Promise<void> {
        const [taak] = await briefTaken();
        await db.client.query("update public.jobs set status = 'running' where id = $1", [taak.id]);
        await runJob({ admin: admin as never, job: { ...(taak as never as object), status: "running" } as never });
        await db.client.query("update public.jobs set status = 'done' where id = $1", [taak.id]);
      }

      await planBriefs(admin as never, stukken);
      const eerste = await briefTaken();
      ok("de briefs van een maand staan na elkaar: één taak in de rij", eerste.length === 1, String(eerste.length));
      ok("en die taak is voor de eerste pagina", eerste[0]?.payload_json.pieceId === stukken[0]);

      await draaiEen();
      const { rows: na1 } = await db.client.query("select brief_json from public.content_pieces where id = $1", [stukken[0]]);
      const b1 = na1[0].brief_json as { onderzoek: { vakkennis: { bron_url: string }[] }; versie: number };
      const { BRIEF_VERSIE } = await import("@/lib/pagina/brief-regels");
      ok("de brief is bewaard, met het versienummer", Boolean(b1?.onderzoek) && b1.versie === BRIEF_VERSIE);
      ok("vakkennis zonder adres valt weg", b1.onderzoek.vakkennis.length === 1);
      const { rows: vragen1 } = await db.client.query(
        `select question, reason from public.fact_requests
          where $1 = any(content_piece_ids) and not open_vraag and profile_id = $2 and question like 'Welk%'`,
        [stukken[0], merk],
      );
      ok("hooguit 8 vragen", vragen1.length === 8, String(vragen1.length));
      ok("elk met een reden", vragen1.every((v) => Boolean(v.reason)));
      // V8 (besluit B-c): de kernvraag staat bovenaan, en de pagina weet welke het is.
      const { rows: kernRij } = await db.client.query(
        "select id, question, required from public.fact_requests where $1 = any(content_piece_ids) and required",
        [stukken[0]],
      );
      const kernId = (na1[0].brief_json as { kernvraagId?: string | null }).kernvraagId;
      ok(
        "V8: één kernvraag, gemarkeerd, en de brief wijst hem aan",
        kernRij.length === 1 && kernRij[0].question.startsWith("Welk voorbeeld nummer 1") && kernId === kernRij[0].id,
        JSON.stringify({ kernRij, kernId }),
      );
      const { rows: dubbel } = await db.client.query(
        "select count(*)::int as n from public.fact_requests where profile_id = $1 and lower(question) like 'wat kost een rijles%'",
        [merk],
      );
      ok("een vraag die het merk al kreeg, komt er niet nog eens", dubbel[0].n === 1, String(dubbel[0].n));
      const { rows: koppeling } = await db.client.query(
        "select id, content_piece_ids from public.fact_requests where id = any($1::uuid[])",
        [[openVanMerk, vanAnder]],
      );
      ok(
        "een open vraag uit ook_voor_deze_pagina hangt nu ook aan de pagina",
        (koppeling.find((r) => r.id === openVanMerk)?.content_piece_ids as string[]).includes(stukken[0]),
      );
      ok(
        "een vraag van een ander merk niet",
        !((koppeling.find((r) => r.id === vanAnder)?.content_piece_ids as string[]) ?? []).includes(stukken[0]),
      );
      ok("het model kreeg blok A mee", briefLog[0].includes("Een rijles duurt 60 minuten.") && briefLog[0].includes("Onze eerste leerling"));
      ok("en het merkbrede antwoord", briefLog[0].includes("Een rijles kost 62 euro."));

      const tweede = await briefTaken();
      ok("daarna is de volgende pagina aan de beurt", tweede.length === 1 && tweede[0].payload_json.pieceId === stukken[1]);
      await draaiEen();
      ok("de tweede brief ziet de vragen van de eerste", briefLog[1].includes("Welk voorbeeld nummer 3 kun je geven?"));
      const { rows: vragen2 } = await db.client.query(
        "select question, scope, analysis_id from public.fact_requests where $1 = any(content_piece_ids) and not open_vraag",
        [stukken[1]],
      );
      ok("en stelt de vraag van de eerste niet opnieuw", vragen2.length === 1, vragen2.map((v) => v.question).join(" | "));
      ok("een merkbrede vraag hangt aan geen cluster", vragen2[0]?.scope === "merk" && vragen2[0]?.analysis_id === null);

      const aantalAanroepen = briefLog.length;
      await db.client.query(
        "insert into public.jobs (type, payload_json, analysis_id, dedupe_key, status) values ('pagina_brief', $1, $2, 'test-herhaal', 'queued')",
        [JSON.stringify({ pieceId: stukken[0], rij: [] }), cluster],
      );
      const herhaal = (await briefTaken()).find((t) => t.payload_json.pieceId === stukken[0])!;
      await db.client.query("update public.jobs set status = 'running' where id = $1", [herhaal.id]);
      await runJob({ admin: admin as never, job: { ...(herhaal as never as object), status: "running" } as never });
      await db.client.query("update public.jobs set status = 'done' where id = $1", [herhaal.id]);
      ok("een tweede run doet geen aanroep", briefLog.length === aantalAanroepen);

      // De derde brief geeft definitief op: de rij loopt af, de pagina gaat door.
      const [derde] = await briefTaken();
      ok("de derde pagina is aan de beurt", derde?.payload_json.pieceId === stukken[2]);
      await handleFailure(admin as never, { ...(derde as never as object), attempts: MAX_ATTEMPTS } as never, "model onbereikbaar");
      const { rows: na3 } = await db.client.query("select brief_json from public.content_pieces where id = $1", [stukken[2]]);
      ok("een opgegeven brief krijgt een brief zonder onderzoek", na3[0].brief_json && na3[0].brief_json.onderzoek === null);
      const { rows: vragen3 } = await db.client.query(
        "select open_vraag from public.fact_requests where $1 = any(content_piece_ids)",
        [stukken[2]],
      );
      ok("en heeft alleen de open vraag", vragen3.length === 1 && vragen3[0].open_vraag === true);

      __setTestTransport(createOpenAiStub(log));
    }

    // ════════════════════════════════════════════════════════════════════════
    // Van plan tot goedgekeurde pagina (contentketen-opnieuw.md WP6 en WP7)
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: zes ingangen kunnen een pagina aan
    // het schrijven zetten (vrijgeven, inplannen, antwoord, overslaan, de
    // ochtendronde, "nu laten schrijven"), en geen van allen mag dat doen zolang
    // er een vraag open staat. Daarna: schrijven in de achtergrondmodus zonder
    // dubbele aanroep, één controle, hooguit één herschrijving, en goedkeuren
    // pas als elke gele zin bevestigd is.
    // ════════════════════════════════════════════════════════════════════════
    console.log("\nVan plan tot goedgekeurde pagina (WP6 en WP7)");
    {
      const { runJob } = await import("@/lib/jobs/handlers");
      const { handleFailure } = await import("@/lib/jobs/worker");
      const { MAX_ATTEMPTS } = await import("@/lib/jobs/types");
      const { bereidMaandVoor, bereidVoor, probeerTeSchrijven, probeerNaAntwoord, ochtendronde } = await import("@/lib/pagina/start");
      const { answerFact } = await import("@/lib/facts");
      const { bevestigZin, keurGoed } = await import("@/lib/pagina/goedkeuren");
      const { __aantalAchtergrondStarts, __zetAchtergrondBezig } = await import("@/lib/openai/structured");

      const eigenaar = randomUUID();
      const merk = randomUUID();
      const cluster = randomUUID();
      await db.client.query("insert into auth.users (id, email) values ($1, 'plantest@example.com')", [eigenaar]);
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status, stem_voorbeelden, taboo_phrases)
         values ($1, $2, 'Hovenier Groen', 'https://hovenier-groen.nl', 'Hovenier Groen', 'klaar', $3::jsonb, '{tuinman}')`,
        [merk, eigenaar, JSON.stringify([{ url: "https://hovenier-groen.nl/over", tekst: "Wij zijn nuchtere tuinmensen uit Ede.", opgehaald_op: "2026-09-25", fout: null }])],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, 'Hovenier Groen, tuinen', 'https://hovenier-groen.nl', 'tuinen', 'gereed')`,
        [cluster, eigenaar, merk],
      );
      await db.client.query(
        `insert into public.brand_facts (profile_id, text, source, kind, fact_key)
         values ($1, 'Een tuinontwerp kost vanaf 450 euro.', 'site', 'site', 'ontwerp-prijs')`,
        [merk],
      );
      // Een vraag uit het rapport van dit cluster, al beantwoord, en een uit een
      // ander cluster (besluit B17): de eerste hoort bij de schrijver, de tweede niet.
      const anderCluster = randomUUID();
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, 'Hovenier Groen, vijvers', 'https://hovenier-groen.nl', 'vijvers', 'gereed')`,
        [anderCluster, eigenaar, merk],
      );
      const { rows: rapportVragen } = await db.client.query(
        `insert into public.fact_requests (profile_id, analysis_id, question, reason, status, answer)
         values ($1, $2, 'Hoeveel tuinen leggen jullie per jaar aan?', 'test', 'beantwoord', 'Ongeveer veertig tuinen per jaar.'),
                ($1, $3, 'Graven jullie ook vijvers uit?', 'test', 'beantwoord', 'Alleen kleine vijvers tot vier meter.')
         returning id, analysis_id`,
        [merk, cluster, anderCluster],
      );
      // K6 (B20): dezelfde kennis in de kennislaag, zoals het terugvullen (K3) en
      // de antwoordroute (K5) hem daar zetten; blok A leest nu alleen daar.
      {
        const { legVast } = await import("@/lib/kennis/vastleggen");
        const vraagVan = (a: string) => rapportVragen.find((r: { analysis_id: string }) => r.analysis_id === a).id as string;
        const kennis = [
          [{ profileId: merk, domein: "aanbod", soort: "prijs", bewering: "Een tuinontwerp kost vanaf 450 euro.", status: "waargenomen", bron: "website", bronUrl: "https://hovenier-groen.nl/ontwerp", citaat: "Een tuinontwerp vanaf 450 euro", gebruik: "content", herkomst: { tabel: "brand_facts", id: randomUUID() } }, { actor: "code", taak: "kennis_terugvullen" }],
          [{ profileId: merk, domein: "aanbod", soort: "antwoord", bewering: "Hoeveel tuinen leggen jullie per jaar aan?\nOngeveer veertig tuinen per jaar.", status: "verklaard", bron: "klant", gebruik: "content", analysisId: cluster, herkomst: { tabel: "fact_requests", id: vraagVan(cluster) } }, { actor: "mens", gebruikerId: eigenaar }],
          [{ profileId: merk, domein: "aanbod", soort: "antwoord", bewering: "Graven jullie ook vijvers uit?\nAlleen kleine vijvers tot vier meter.", status: "verklaard", bron: "klant", gebruik: "content", analysisId: anderCluster, herkomst: { tabel: "fact_requests", id: vraagVan(anderCluster) } }, { actor: "mens", gebruikerId: eigenaar }],
        ] as const;
        for (const [item, door] of kennis) {
          const uit = await legVast(admin as never, item as never, door as never);
          if (uit.soort === "geweigerd") throw new Error(`Testkennis geweigerd: ${uit.fouten.join(" ")}`);
        }
      }
      const { rows: plan } = await db.client.query(
        "insert into public.content_plans (profile_id, pages_per_month, status) values ($1, 3, 'actief') returning id",
        [merk],
      );
      const { rows: maanden } = await db.client.query(
        `insert into public.plan_months (plan_id, month_number, status) values ($1, 1, 'goedgekeurd'), ($1, 2, 'concept')
         returning id, month_number`,
        [plan[0].id],
      );
      const vrij = maanden.find((m) => m.month_number === 1).id as string;
      const dicht = maanden.find((m) => m.month_number === 2).id as string;
      const dag = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
      const { rows: planPaginas } = await db.client.query(
        `insert into public.planned_pages (plan_month_id, profile_id, title, page_type, status, source_analysis_id, scheduled_for, sort_order, content_type)
         values ($1, $3, 'Tuinontwerp laten maken', 'dienst', 'gepland', $4, $5, 1, null),
                ($1, $3, 'Onderhoud van je tuin', 'dienst', 'gepland', $4, $6, 2, 'gids'),
                ($2, $3, 'Schutting plaatsen', 'dienst', 'gepland', $4, $6, 1, null)
         returning id, title`,
        [vrij, dicht, merk, cluster, dag(3), dag(40)],
      );
      const planId = (t: string) => planPaginas.find((r) => r.title === t).id as string;

      const aanroepen: { schema: string; user: string }[] = [];
      const tekstEen = "## Tuinontwerp\n\nEen goed ontwerp begint bij hoe je je tuin gebruikt—en dat vragen we eerst. Een tuinontwerp kost vanaf 450 euro. Wij geven 10 jaar garantie op elke tuin.";
      const tekstTwee = "## Tuinontwerp\n\nEen goed ontwerp begint bij hoe je je tuin gebruikt. Een tuinontwerp kost vanaf 450 euro.";
      __setTestTransport((async (opts: { schemaName: string; user: string; schema: { parse: (x: unknown) => unknown } }) => {
        aanroepen.push({ schema: opts.schemaName, user: opts.user });
        // Op de kop van de invoer en niet op de hele tekst: de titels van de
        // andere pagina's van het merk staan er ook in.
        const isOnderhoud = /[Pp]agina: Onderhoud van je tuin/.test(opts.user);
        const isSlechter = /[Pp]agina: Borders aanleggen/.test(opts.user);
        let antwoord: unknown;
        if (opts.schemaName === "content_brief") {
          antwoord = {
            zoekintentie: "Een tuin laten ontwerpen",
            deelvragen: [],
            concurrentie: { goed: [], gaten: [] },
            vakkennis: [],
            valkuilen: [],
            vragen: isOnderhoud
              ? []
              : [{ vraag: "Hoe verloopt een eerste gesprek bij jullie?", waarom: "Dan weet de lezer wat hij kan verwachten.", soort: "werkwijze", antwoord_type: "tekst_lang", opties: null, merkbreed: false, kern: true }],
            ook_voor_deze_pagina: [],
            kern_eerder: null,
          };
        } else if (opts.schemaName === "pagina") {
          const herschrijf = opts.user.includes("SCHRIJF EEN BETERE VERSIE");
          const klant = opts.user.includes("Wat de ondernemer anders wil");
          antwoord = {
            titel: "Tuinontwerp laten maken",
            meta_titel: "Tuinontwerp laten maken",
            meta_beschrijving: "Een tuin die past bij hoe je leeft.",
            tekst_markdown: isSlechter
              ? "## Borders\n\nWij leggen borders aan binnen 3 dagen. Wij zijn de beste van Ede."
              : isOnderhoud
                ? "## Onderhoud\n\nEen tuin vraagt elk seizoen iets anders."
                : klant
                  ? `${tekstTwee}\n\nWe beginnen altijd met koffie.`
                  : herschrijf
                    ? tekstTwee
                    : tekstEen,
            faq: [],
            // V16: de schrijver van de onderhoudspagina had nog iets willen weten.
            notitie_voor_ondernemer: isOnderhoud && !herschrijf && !klant ? "Hoe vaak per jaar komen jullie langs voor onderhoud?" : null,
          };
        } else if (opts.schemaName === "pagina_controle") {
          antwoord = isOnderhoud
            ? { oordeel: "goed", verzonnen: [], punten: [] }
            : {
                oordeel: "niet_goed",
                verzonnen: [{ zin: "Wij geven 10 jaar garantie op elke tuin.", waarom: "Staat nergens." }],
                punten: [{ waar: "de opening", probleem: "te algemeen", hoe: "begin met de vraag van de bezoeker" }],
              };
        } else throw new Error(`onverwacht schema ${opts.schemaName}`);
        return { parsed: opts.schema.parse(antwoord), raw: { stub: true } };
      }) as never);

      async function wachtrij(type: string): Promise<Record<string, unknown>[]> {
        const { rows } = await db.client.query(
          "select * from public.jobs where type = $1 and status = 'queued' and analysis_id = $2 order by created_at asc",
          [type, cluster],
        );
        return rows;
      }
      async function draai(type: string): Promise<number> {
        let n = 0;
        for (let i = 0; i < 20; i++) {
          const [taak] = await wachtrij(type);
          if (!taak) break;
          await db.client.query("update public.jobs set status = 'running' where id = $1", [taak.id]);
          await runJob({ admin: admin as never, job: { ...taak, status: "running" } as never });
          await db.client.query("update public.jobs set status = 'done' where id = $1", [taak.id]);
          n++;
        }
        return n;
      }
      async function stuk(pieceId: string): Promise<Record<string, unknown>> {
        const { rows } = await db.client.query("select * from public.content_pieces where id = $1", [pieceId]);
        return rows[0];
      }
      async function stukVan(planPaginaId: string): Promise<string | null> {
        const { rows } = await db.client.query("select content_piece_id from public.planned_pages where id = $1", [planPaginaId]);
        return rows[0]?.content_piece_id ?? null;
      }
      const geenSchrijftaak = async () => (await wachtrij("pagina_schrijven")).length === 0;

      // ── Vrijgeven: rijen, open vragen, briefs na elkaar ─────────────────────
      const uitslag = await bereidMaandVoor(admin as never, vrij);
      ok("vrijgeven bereidt de twee pagina's van de maand voor", uitslag.voorbereid === 2, JSON.stringify(uitslag));
      const ontwerp = (await stukVan(planId("Tuinontwerp laten maken")))!;
      const onderhoud = (await stukVan(planId("Onderhoud van je tuin")))!;
      ok("elke plan-pagina wijst naar zijn rij", Boolean(ontwerp && onderhoud));
      ok("een pagina in een maand die niet vrij is, niet", (await stukVan(planId("Schutting plaatsen"))) === null);
      await bereidVoor(admin as never, [planId("Schutting plaatsen")]);
      ok("inplannen in een maand die niet vrij is, doet niets", (await stukVan(planId("Schutting plaatsen"))) === null);
      const { rows: registers } = await db.client.query("select count(*)::int as n from public.jobs where type = 'fact_register' and profile_id = $1", [merk]);
      ok("het feitenregister gaat vóór de briefs", registers[0].n === 1);

      // ── B33 en B34: de soort van de plan-pagina, en de zoekresultaten van Google ──
      // De onderhoudspagina staat in het plan als gids, de ontwerppagina heeft geen
      // soort en valt terug op zijn paginatype (dienst, dus een dienstpagina).
      // DataForSEO wordt nagebootst: één vaste resultatenpagina, met een resultaat
      // van de eigen site en een zin met de naam van het merk, die er allebei uit
      // moeten.
      ok("B33: een plan-pagina zonder soort wordt een dienstpagina", (await stuk(ontwerp)).type === "landing");
      ok("B33: de soort van de plan-pagina gaat mee", (await stuk(onderhoud)).type === "gids");
      const echteFetch = globalThis.fetch;
      const serpAanroepen: string[] = [];
      process.env.BRIEF_ZOEKRESULTATEN_ENABLED = "true";
      process.env.DATAFORSEO_LOGIN = "test";
      process.env.DATAFORSEO_PASSWORD = "test";
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const adres = String(url instanceof Request ? url.url : url);
        if (!adres.startsWith("https://api.dataforseo.com/")) return echteFetch(url as never, init);
        serpAanroepen.push(String(JSON.parse(String(init?.body ?? "[]"))[0]?.keyword ?? ""));
        return new Response(
          JSON.stringify({
            tasks: [{
              status_code: 20000, cost: 0.004,
              result: [{ items: [
                { type: "ai_overview", markdown: "Een tuin onderhoud je het beste in het voorjaar. Hovenier Groen biedt gratis snoeiwerk aan." , references: [{ domain: "tuinkennis.nl" }] },
                { type: "organic", rank_group: 1, title: "Tuinonderhoud per seizoen", url: "https://tuinkennis.nl/onderhoud", domain: "tuinkennis.nl", description: "Wat je in welk seizoen doet." },
                { type: "organic", rank_group: 2, title: "Onze tuinen", url: "https://hovenier-groen.nl/tuinen", domain: "hovenier-groen.nl", description: "Eigen site." },
                { type: "people_also_ask", items: [{ type: "people_also_ask_element", title: "Wanneer moet je een haag snoeien?" }] },
              ] }],
            }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }) as typeof fetch;
      try {
        await draai("pagina_brief");
      } finally {
        globalThis.fetch = echteFetch;
        delete process.env.BRIEF_ZOEKRESULTATEN_ENABLED;
        delete process.env.DATAFORSEO_LOGIN;
        delete process.env.DATAFORSEO_PASSWORD;
      }
      ok("na de briefs geen schrijftaak: er staan vragen open", await geenSchrijftaak());

      const briefInvoerVan = (titel: string) => aanroepen.find((a) => a.schema === "content_brief" && a.user.includes(`Pagina: ${titel}`))?.user ?? "";
      const invoerOntwerp = briefInvoerVan("Tuinontwerp laten maken");
      const invoerOnderhoud = briefInvoerVan("Onderhoud van je tuin");
      ok("B34: de dienstpagina haalt geen zoekresultaten op", !invoerOntwerp.includes("ZOEKRESULTATEN VAN GOOGLE") && !invoerOntwerp.includes("Wat de lezer van deze soort pagina wil"));
      ok("B34: de gids krijgt de zoekresultaten en zijn beschrijving", invoerOnderhoud.includes("ZOEKRESULTATEN VAN GOOGLE") && invoerOnderhoud.includes("Wat de lezer van deze soort pagina wil"));
      ok("B34: een zoekopdracht per titel, geen voor de dienstpagina", serpAanroepen.length >= 1 && serpAanroepen.includes("Onderhoud van je tuin") && !serpAanroepen.includes("Tuinontwerp laten maken"), serpAanroepen.join(" | "));
      ok("B34: de eigen site en de zin met de merknaam gaan er niet in", !invoerOnderhoud.includes("hovenier-groen.nl/tuinen") && !invoerOnderhoud.includes("gratis snoeiwerk") && invoerOnderhoud.includes("Wanneer moet je een haag snoeien?"));
      const briefOnderhoud = (await stuk(onderhoud)).brief_json as { versie?: number; zoekresultaten?: { zoekopdrachten?: unknown[]; kostenUsd?: number } | null };
      ok("B34: de zoekresultaten staan in de brief, met de kosten", (briefOnderhoud.zoekresultaten?.zoekopdrachten?.length ?? 0) === serpAanroepen.length && (briefOnderhoud.zoekresultaten?.kostenUsd ?? 0) > 0);
      ok("B34: de dienstpagina heeft geen zoekresultaten in zijn brief", ((await stuk(ontwerp)).brief_json as { zoekresultaten?: unknown }).zoekresultaten === null);
      const { rows: serpKosten } = await db.client.query(
        "select count(*)::int as n from public.ai_calls where kind = 'pagina_zoekresultaten' and content_piece_id = $1",
        [onderhoud],
      );
      ok("B34: elke zoekopdracht staat in het kostenlog", serpKosten[0].n === serpAanroepen.length, String(serpKosten[0].n));
      const { rows: extern } = await db.client.query(
        "select count(*)::int as n from public.klantkennis where profile_id = $1 and (bewering ilike '%snoei%' or bewering ilike '%seizoen%')",
        [merk],
      );
      ok("B34: niets uit de zoekresultaten komt in de kennislaag", extern[0].n === 0);

      // ── Elke ingang, met open vragen: geen schrijftaak ─────────────────────
      const nuSchrijven = await probeerTeSchrijven(admin as never, ontwerp, { negeerDatum: true });
      ok("nu laten schrijven met een open vraag: wacht", nuSchrijven.uitkomst === "wacht" && nuSchrijven.reden === "vragen_open");
      await ochtendronde(admin as never);
      ok("de ochtendronde met open vragen: geen schrijftaak", await geenSchrijftaak());
      await bereidVoor(admin as never, [planId("Tuinontwerp laten maken")]);
      ok("opnieuw inplannen: geen schrijftaak, geen tweede brief", (await geenSchrijftaak()) && (await wachtrij("pagina_brief")).length === 0);

      const { rows: vragenOntwerp } = await db.client.query(
        "select id, open_vraag from public.fact_requests where $1 = any(content_piece_ids) order by open_vraag desc",
        [ontwerp],
      );
      ok("de ontwerppagina heeft de open vraag en één gerichte vraag", vragenOntwerp.length === 2);
      const openVraag = vragenOntwerp.find((v) => v.open_vraag).id as string;
      const gericht = vragenOntwerp.find((v) => !v.open_vraag).id as string;
      await answerFact(admin as never, { profileId: merk, factId: openVraag, answer: "We tekenen altijd met de klant samen aan de keukentafel.", gebruikerId: userId });
      await probeerNaAntwoord(admin as never, openVraag);
      ok("een antwoord met nog één open vraag: geen schrijftaak", await geenSchrijftaak());

      await db.client.query("update public.fact_requests set status = 'overgeslagen' where id = $1", [gericht]);
      await probeerNaAntwoord(admin as never, gericht);
      const schrijfTaken = await wachtrij("pagina_schrijven");
      ok("overslaan van de laatste vraag start het schrijven", schrijfTaken.length === 1);
      ok("de pagina staat op schrijven", (await stuk(ontwerp)).status === "draft");
      const { rows: planStand } = await db.client.query("select status from public.planned_pages where id = $1", [planId("Tuinontwerp laten maken")]);
      ok("en de plan-pagina ook", planStand[0].status === "schrijven");
      await probeerNaAntwoord(admin as never, gericht);
      ok("een tweede keer vragen levert geen tweede schrijftaak", (await wachtrij("pagina_schrijven")).length === 1);

      // De onderhoudspagina heeft alleen de open vraag, en een datum over 40 dagen.
      const { rows: vragenOnderhoud } = await db.client.query("select id from public.fact_requests where $1 = any(content_piece_ids)", [onderhoud]);
      ok("de onderhoudspagina heeft alleen de open vraag", vragenOnderhoud.length === 1);
      await db.client.query("update public.fact_requests set status = 'overgeslagen' where id = $1", [vragenOnderhoud[0].id]);
      const teVroeg = await probeerTeSchrijven(admin as never, onderhoud);
      ok("vragen klaar, datum ver weg: wachten", teVroeg.uitkomst === "wacht" && teVroeg.reden === "nog_niet_aan_de_beurt");

      // ── Schrijven in de achtergrondmodus ──────────────────────────────────
      const startsVoor = __aantalAchtergrondStarts();
      await draai("pagina_schrijven");
      // Die ene ronde startte de aanroep en plande de ophaalronde; de lus hierboven
      // draaide die meteen mee. Opnieuw, nu met een ophaalronde die nog bezig is.
      ok("schrijven start precies één aanroep", __aantalAchtergrondStarts() === startsVoor + 1);
      ok("de tekst staat er", Boolean((await stuk(ontwerp)).body_markdown));

      const nu = await probeerTeSchrijven(admin as never, onderhoud, { negeerDatum: true });
      ok("nu laten schrijven zonder open vraag: ingepland", nu.uitkomst === "ingepland");
      const [start] = await wachtrij("pagina_schrijven");
      await db.client.query("update public.jobs set status = 'running' where id = $1", [start.id]);
      await runJob({ admin: admin as never, job: { ...start, status: "running" } as never });
      await db.client.query("update public.jobs set status = 'done' where id = $1", [start.id]);
      const na = __aantalAchtergrondStarts();
      __zetAchtergrondBezig(1);
      const [ophaal] = await wachtrij("pagina_schrijven");
      await db.client.query("update public.jobs set status = 'running' where id = $1", [ophaal.id]);
      await runJob({ admin: admin as never, job: { ...ophaal, status: "running" } as never });
      await db.client.query("update public.jobs set status = 'done' where id = $1", [ophaal.id]);
      const volgende = await wachtrij("pagina_schrijven");
      ok("een ophaalronde die nog bezig is, plant zichzelf opnieuw in", volgende.length === 1 && (volgende[0].payload_json as { poging: number }).poging === 1);
      ok("zonder tweede aanroep", __aantalAchtergrondStarts() === na);
      await draai("pagina_schrijven");

      const geschreven = await stuk(ontwerp);
      ok("een verboden teken is gerepareerd", !(geschreven.body_markdown as string).includes("—"));
      const { SCHRIJFOPDRACHT_VERSIE } = await import("@/lib/pagina/schrijfopdracht");
      ok("de ruwe uitvoer en het versienummer van de opdracht zijn bewaard", (geschreven.raw_json as { schrijfopdracht_versie: number }).schrijfopdracht_versie === SCHRIJFOPDRACHT_VERSIE);
      ok("versie 1", geschreven.version === 1);
      ok("de schrijver kreeg het eigen verhaal letterlijk", aanroepen.some((a) => a.schema === "pagina" && a.user.includes("aan de keukentafel")));
      ok("en de stemvoorbeelden", aanroepen.some((a) => a.schema === "pagina" && a.user.includes("nuchtere tuinmensen")));
      ok("een beantwoorde vraag uit het rapport van dit cluster gaat mee naar de schrijver (B17)", aanroepen.some((a) => a.schema === "pagina" && a.user.includes("veertig tuinen per jaar")));
      ok("en naar de brief", aanroepen.some((a) => a.schema === "content_brief" && a.user.includes("veertig tuinen per jaar")));
      // V17: de brief ziet eerdere antwoorden, ook uit een ander cluster, om niet
      // opnieuw te vragen; de schrijver krijgt ze alleen als de brief ze koppelt.
      ok("een antwoord uit een ander cluster niet naar de schrijver", !aanroepen.some((a) => a.schema === "pagina" && a.user.includes("kleine vijvers")));
      ok("wel naar de brief, als eerder antwoord (V17)", aanroepen.some((a) => a.schema === "content_brief" && a.user.includes("kleine vijvers")));
      ok("de controle is ingepland", (await wachtrij("pagina_controle")).length === 2);
      const { rows: notitieVraag } = await db.client.query(
        "select status, scope, analysis_id, content_piece_ids, raw_json from public.fact_requests where question = 'Hoe vaak per jaar komen jullie langs voor onderhoud?'",
      );
      ok(
        "V16: de notitie van de schrijver is een open vraag bij de pagina, in zijn cluster",
        notitieVraag.length === 1 && notitieVraag[0].status === "open" && notitieVraag[0].content_piece_ids.includes(onderhoud) && notitieVraag[0].analysis_id === cluster && notitieVraag[0].raw_json?.bron === "notitie_schrijver",
        JSON.stringify(notitieVraag),
      );

      // ── Controle en hooguit één herschrijving ─────────────────────────────
      await draai("pagina_controle");
      const goed = await stuk(onderhoud);
      ok("goed zonder ongedekte zinnen: klaar zonder herschrijving", goed.status === "ready" && goed.needs_review === true && !(goed.controle_json as { herschreven: boolean }).herschreven);
      ok("niet goed: er komt precies één herschrijving", (await wachtrij("pagina_herschrijven")).length === 1);
      await draai("pagina_herschrijven");
      const herschreven = await stuk(ontwerp);
      const cj = herschreven.controle_json as { herschreven: boolean; herschrijving: { behouden: string }; gele_zinnen: string[] };
      ok("de herschreven versie is bewaard", cj.herschreven && cj.herschrijving.behouden === "nieuw" && !(herschreven.body_markdown as string).includes("garantie"));
      ok("en staat klaar om te lezen", herschreven.status === "ready" && herschreven.needs_review === true);
      ok("geen tweede controle, geen tweede herschrijving", (await wachtrij("pagina_controle")).length === 0 && (await wachtrij("pagina_herschrijven")).length === 0);
      const { rows: planKlaar } = await db.client.query("select status from public.planned_pages where id = $1", [planId("Tuinontwerp laten maken")]);
      ok("de plan-pagina staat op goedkeuren", planKlaar[0].status === "ter_goedkeuring");

      // ── V15 (besluit B-e): een herschrijving met een nieuwe ongedekte zin
      //    blijft, en die zin wordt geel ──────────────────────────────────
      const { rows: border } = await db.client.query(
        `insert into public.content_pieces (analysis_id, title, type, status, action, body_markdown, brief_json, controle_json)
         values ($1, 'Borders aanleggen', 'landing', 'draft', 'nieuw', 'Een border geeft kleur aan je tuin.', '{"onderzoek":null,"bedrijf":{"feiten":[]},"versie":1}',
                 '{"ongedekt":[],"beoordeling":{"oordeel":"niet_goed","verzonnen":[],"punten":[]},"herschreven":false,"gele_zinnen":[],"bevestigd":[]}')
         returning id`,
        [cluster],
      );
      await enqueueHerschrijven(border[0].id);
      await draai("pagina_herschrijven");
      const slechter = await stuk(border[0].id);
      const scj = slechter.controle_json as { herschrijving: { behouden: string; nieuw_ongedekt?: string[] }; gele_zinnen: string[] };
      ok(
        "V15: de herschrijving blijft, ook met een nieuwe ongedekte zin",
        (slechter.body_markdown as string) !== "Een border geeft kleur aan je tuin." && scj.herschrijving.behouden === "nieuw",
        JSON.stringify(scj),
      );
      ok(
        "V15: wat de herschrijving bijzette, is geel en staat apart",
        (scj.herschrijving.nieuw_ongedekt ?? []).length > 0 && (scj.herschrijving.nieuw_ongedekt ?? []).every((z) => scj.gele_zinnen.includes(z)),
        JSON.stringify(scj),
      );

      // ── Een mislukte controle: klaar, met gele zinnen ─────────────────────
      const { rows: mislukt } = await db.client.query(
        `insert into public.content_pieces (analysis_id, title, type, status, action, body_markdown, brief_json)
         values ($1, 'Vijver aanleggen', 'landing', 'draft', 'nieuw', 'Wij leggen een vijver aan in 2 dagen. Onze tuinman denkt graag met je mee.', '{"onderzoek":null,"bedrijf":{"feiten":[]},"versie":1}')
         returning id`,
        [cluster],
      );
      const { rows: controleTaak } = await db.client.query(
        `insert into public.jobs (type, payload_json, analysis_id, dedupe_key, status, attempts)
         values ('pagina_controle', $1, $2, 'test-controle-mislukt', 'running', $3) returning *`,
        [JSON.stringify({ pieceId: mislukt[0].id }), cluster, MAX_ATTEMPTS],
      );
      await handleFailure(admin as never, controleTaak[0], "model onbereikbaar");
      const vijver = await stuk(mislukt[0].id);
      const vcj = vijver.controle_json as { beoordeling: unknown; gele_zinnen: string[] };
      ok("een mislukte controle gaat naar klaar", vijver.status === "ready" && vcj.beoordeling === null);

      // V21 punt 3 (besluit B-h): een verbeterpagina waarvan de nieuwe tekst
      // het keurmerk en de termijn van de huidige pagina mist.
      const { rows: verbeter } = await db.client.query(
        `insert into public.content_pieces (analysis_id, title, type, status, action, existing_url, existing_page_text, body_markdown, brief_json)
         values ($1, 'Sloten vervangen', 'landing', 'draft', 'verbeteren', 'https://tuin.nl/sloten', 'Wij plaatsen SKG*** sloten binnen 2 dagen. Een cilinder kost € 89.',
                 'Een cilinder kost € 89. Je kiest zelf het slot.', '{"onderzoek":null,"bedrijf":{"feiten":[]},"versie":1}')
         returning id`,
        [cluster],
      );
      const { rows: verbeterTaak } = await db.client.query(
        `insert into public.jobs (type, payload_json, analysis_id, dedupe_key, status, attempts)
         values ('pagina_controle', $1, $2, 'test-controle-verdwenen', 'running', $3) returning *`,
        [JSON.stringify({ pieceId: verbeter[0].id }), cluster, MAX_ATTEMPTS],
      );
      await handleFailure(admin as never, verbeterTaak[0], "model onbereikbaar");
      const sloten = await stuk(verbeter[0].id);
      const verdwenen = (sloten.controle_json as { verdwenen?: string[] }).verdwenen ?? [];
      ok(
        "V21: de ondernemer ziet welke gegevens van de huidige pagina ontbreken, en het bedrag dat bleef niet",
        verdwenen.includes("SKG***") && verdwenen.some((g) => g.includes("2 dagen")) && !verdwenen.some((g) => g.includes("89")),
        JSON.stringify(verdwenen),
      );
      ok("met de ongedekte zin geel", vcj.gele_zinnen.some((z) => z.includes("2 dagen")));
      ok("en de zin met een verboden woord ook (B16)", vcj.gele_zinnen.length === 2 && vcj.gele_zinnen.some((z) => z.includes("tuinman")));

      // ── Goedkeuren pas als elke gele zin bevestigd is ─────────────────────
      const eerst = await keurGoed(admin as never, { pieceId: mislukt[0].id, analysisId: cluster, userId: eigenaar });
      ok("goedkeuren met een gele zin kan niet", !eerst.ok && eerst.status === 409);
      const vreemd = await bevestigZin(admin as never, { pieceId: mislukt[0].id, analysisId: cluster, zin: "Een zin die niet geel is." });
      ok("een zin die niet geel is, kan niet bevestigd worden", !vreemd.ok);
      await bevestigZin(admin as never, { pieceId: mislukt[0].id, analysisId: cluster, zin: vcj.gele_zinnen[0] });
      const halverwege = await keurGoed(admin as never, { pieceId: mislukt[0].id, analysisId: cluster, userId: eigenaar });
      ok("met één van de twee bevestigd kan het nog niet", !halverwege.ok);
      await bevestigZin(admin as never, { pieceId: mislukt[0].id, analysisId: cluster, zin: vcj.gele_zinnen[1] });
      const daarna = await keurGoed(admin as never, { pieceId: mislukt[0].id, analysisId: cluster, userId: eigenaar });
      ok("na bevestigen wel", daarna.ok && (await stuk(mislukt[0].id)).needs_review === false);

      // ── Een aanpassing van de klant: versie 2, zonder nieuwe beoordeling ──
      await db.client.query(
        "insert into public.jobs (type, payload_json, analysis_id, dedupe_key, status) values ('pagina_herschrijven', $1, $2, 'test-klant', 'queued')",
        [JSON.stringify({ pieceId: ontwerp, klantNotitie: "Vertel ook dat we met koffie beginnen." }), cluster],
      );
      const controlesVoor = aanroepen.filter((a) => a.schema === "pagina_controle").length;
      await draai("pagina_herschrijven");
      const { rows: versies } = await db.client.query(
        "select id, version, is_current, supersedes_id, status, revision_note from public.content_pieces where analysis_id = $1 and title = 'Tuinontwerp laten maken' order by version",
        [cluster],
      );
      ok("een aanpassing maakt versie 2", versies.length === 2 && versies[1].version === 2 && versies[1].supersedes_id === ontwerp);
      ok("de wens van de klant staat bij de nieuwe versie", versies[1].revision_note === "Vertel ook dat we met koffie beginnen.");
      ok("de nieuwe is de actuele", versies[1].is_current === true && versies[0].is_current === false && versies[1].status === "ready");
      ok("zonder nieuwe beoordeling", aanroepen.filter((a) => a.schema === "pagina_controle").length === controlesVoor && (await wachtrij("pagina_controle")).length === 0);
      ok("de plan-pagina wijst naar versie 2", (await stukVan(planId("Tuinontwerp laten maken"))) === versies[1].id);

      // ── V0: opnieuw schrijven met dezelfde invoer (B27) ───────────────────
      const { schrijfOpnieuwMetZelfdeInvoer } = await import("@/lib/pagina/taken");
      const schrijfVoor = aanroepen.filter((a) => a.schema === "pagina").length;
      const briefsVoor = aanroepen.filter((a) => a.schema === "content_brief").length;
      const opnieuw = await schrijfOpnieuwMetZelfdeInvoer(admin as never, versies[1].id);
      ok("V0: opnieuw schrijven start", opnieuw.uitkomst === "gestart");
      await draai("pagina_schrijven");
      const { rows: v3 } = await db.client.query(
        "select id, version, is_current, supersedes_id, brief_json, body_markdown from public.content_pieces where analysis_id = $1 and title = 'Tuinontwerp laten maken' order by version",
        [cluster],
      );
      ok("V0: er is een derde versie, en die is de actuele", v3.length === 3 && v3[2].version === 3 && v3[2].is_current === true && v3[1].is_current === false);
      ok("V0: met dezelfde brief", JSON.stringify(v3[2].brief_json) === JSON.stringify(v3[1].brief_json));
      ok("V0: zonder nieuwe brief", aanroepen.filter((a) => a.schema === "content_brief").length === briefsVoor);
      ok("V0: precies één nieuwe schrijfbeurt", aanroepen.filter((a) => a.schema === "pagina").length === schrijfVoor + 1);
      ok("V0: de schrijver kreeg de antwoorden van de klant weer", aanroepen.filter((a) => a.schema === "pagina").slice(-1)[0]?.user.includes("aan de keukentafel") === true);
      ok("V0: en de nieuwe versie gaat door de gewone controle", (await wachtrij("pagina_controle")).length === 1);
      ok("V0: de plan-pagina wijst naar versie 3", (await stukVan(planId("Tuinontwerp laten maken"))) === v3[2].id);
      await draai("pagina_controle");
      await draai("pagina_herschrijven");
      const nietGeschreven = await schrijfOpnieuwMetZelfdeInvoer(admin as never, randomUUID());
      ok("V0: een onbekende pagina geeft geen_pagina", nietGeschreven.uitkomst === "geen_pagina");

      async function enqueueHerschrijven(pieceId: string): Promise<void> {
        await db.client.query(
          "insert into public.jobs (type, payload_json, analysis_id, dedupe_key, status) values ('pagina_herschrijven', $1, $2, $3, 'queued')",
          [JSON.stringify({ pieceId }), cluster, `test-herschrijven-${pieceId}`],
        );
      }

      __setTestTransport(createOpenAiStub(log));
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
        `select id, title, stage, status, origin, search_volume_source, search_volume_absolute
           from public.profile_topics where profile_id = $1 order by title`,
        [stageProfileId],
      );
      ok(
        "zonder gesprek krijgen ze allemaal stage 'concept'",
        conceptRijen.every((r) => r.stage === "concept"),
        conceptRijen.map((r) => `${r.title}:${r.stage}`).join(", "),
      );
      // Blok C, §3.1: zonder DATAFORSEO-sleutel in deze test blijft dit exact
      // het gedrag van vóór die bouwronde, "geschat" en geen absoluut volume.
      ok(
        "zonder zoekvolumeleverancier blijft search_volume_source 'geschat'",
        conceptRijen.every((r) => r.search_volume_source === "geschat"),
        conceptRijen.map((r) => `${r.title}:${r.search_volume_source}`).join(", "),
      );
      ok(
        "en search_volume_absolute onbekend, geen 0",
        conceptRijen.every((r) => r.search_volume_absolute === null),
      );
      ok(
        "en herkomst 'aanbod' (0076), er was nog geen gesprek",
        conceptRijen.every((r) => r.origin === "aanbod"),
        conceptRijen.map((r) => `${r.title}:${r.origin}`).join(", "),
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
        `select title, stage, status, origin from public.profile_topics where profile_id = $1 order by title`,
        [stageProfileId],
      );
      ok(
        "het nieuwe onderwerp draagt de herkomst 'aanbod_en_gesprek'",
        naGesprek.find((r) => r.title === "Warmtepomp advies op maat")?.origin === "aanbod_en_gesprek",
        naGesprek.map((r) => `${r.title}:${r.origin}`).join(", "),
      );
      ok(
        "het afgewezen onderwerp behoudt zijn oude herkomst 'aanbod'",
        naGesprek.find((r) => r.title === "Airco laten installeren")?.origin === "aanbod",
        naGesprek.map((r) => `${r.title}:${r.origin}`).join(", "),
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
    // De knop "Stel nieuwe clusters voor" (0077, werkpakket A §3.5)
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: een aanvullende ronde die een
    // onderwerp voorstelt dat er al staat, kost geld voor niets én verwart de
    // beheerder ("waarom stelt hij dit nog een keer voor?"). En een tweede
    // klik zonder nieuwe informatie moet GEEN aanroep doen, anders is de knop
    // een manier om geld te verbranden in plaats van een regieknop.
    // ════════════════════════════════════════════════════════════════════════
    {
      console.log("\nDe knop 'Stel nieuwe clusters voor' (0077)");
      const { proposeAdditionalTopics, previewAdditionalRound } = await import(
        "@/lib/pipeline/propose-more-topics"
      );
      const moreProfileId = randomUUID();

      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status)
         values ($1, $2, 'Klimaat BV', 'https://klimaat-bv.nl', 'Klimaat BV', 'klaar')`,
        [moreProfileId, userId],
      );
      await db.client.query(
        `insert into public.profile_offerings (profile_id, kind, name, source, sort_order)
         values ($1, 'dienst', 'CV-ketel onderhoud', 'ai', 0),
                ($1, 'dienst', 'Airco', 'ai', 1)`,
        [moreProfileId],
      );

      // Een lopend cluster met een gemeten gap, zodat deze ronde kan tonen dat
      // hij meetbewijs meeneemt.
      const moreAnalysisId = randomUUID();
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, 'CV-ketel onderhoud', 'https://klimaat-bv.nl', 'CV-ketel onderhoud', 'gereed')`,
        [moreAnalysisId, userId, moreProfileId],
      );
      await db.client.query(
        `insert into public.reports (analysis_id, gaps_json)
         values ($1, $2::jsonb)`,
        [
          moreAnalysisId,
          JSON.stringify([
            { cluster: "onderhoud", problem: "AI noemt Feenstra, Klimaat BV niet", evidenceRunIds: [] },
          ]),
        ],
      );
      // Dit onderwerp bestaat al (goedgekeurd, met cluster): een aanvullende
      // ronde mag hem niet nog een keer voorstellen, ook al geeft de
      // teststub 'm standaard terug.
      await db.client.query(
        `insert into public.profile_topics (profile_id, title, status, stage, analysis_id)
         values ($1, 'CV-ketel onderhoud', 'goedgekeurd', 'definitief', $2)`,
        [moreProfileId, moreAnalysisId],
      );
      // En dit onderwerp is met reden afgewezen: de instructie voor de
      // volgende ronde, ook al kan de teststub er niet inhoudelijk op reageren.
      await db.client.query(
        `insert into public.profile_topics (profile_id, title, status, rejection_reason)
         values ($1, 'Warmtepomp advies op maat', 'afgewezen', 'te duur voor deze doelgroep')`,
        [moreProfileId],
      );

      const preview = await previewAdditionalRound(moreProfileId);
      ok("de eerste keer is er altijd een reden om te draaien", preview.aanraden === true);

      const eersteKlik = await proposeAdditionalTopics(moreProfileId);
      ok("de eerste klik draait echt", eersteKlik.gedraaid === true);

      const { rows: naEersteKlik } = await db.client.query(
        `select title, origin, origin_uses_measurement from public.profile_topics
          where profile_id = $1 order by title`,
        [moreProfileId],
      );
      ok(
        "het bestaande onderwerp wordt niet nog een keer voorgesteld",
        naEersteKlik.filter((r) => r.title === "CV-ketel onderhoud").length === 1,
        naEersteKlik.map((r) => r.title).join(", "),
      );
      ok(
        "het nieuwe onderwerp draagt dat er gemeten bewijs was",
        naEersteKlik.some((r) => r.title === "Airco laten installeren" && r.origin_uses_measurement === true),
        naEersteKlik.map((r) => `${r.title}:${r.origin_uses_measurement}`).join(", "),
      );

      const { rows: rondeRijen } = await db.client.query(
        `select proposed_count, cost_usd from public.profile_topic_rounds where profile_id = $1`,
        [moreProfileId],
      );
      ok("de ronde is gelogd", rondeRijen.length === 1, String(rondeRijen.length));
      ok(
        "met het aantal en de kosten erbij",
        rondeRijen[0].proposed_count > 0 && rondeRijen[0].cost_usd !== null,
        JSON.stringify(rondeRijen[0]),
      );

      // Tweede klik, niets veranderd: geen nieuwe aanroep, geen nieuwe rijen.
      const tweedeKlik = await proposeAdditionalTopics(moreProfileId);
      ok("zonder nieuwe informatie draait de tweede klik niet echt", tweedeKlik.gedraaid === false);
      ok("en levert dus ook niets op", tweedeKlik.voorgesteld === 0);

      const previewNa = await previewAdditionalRound(moreProfileId);
      ok(
        "de preview raadt de knop nu af",
        previewNa.aanraden === false,
        previewNa.melding,
      );

      const { rows: naTweedeKlik } = await db.client.query(
        "select count(*)::int as n from public.profile_topics where profile_id = $1",
        [moreProfileId],
      );
      ok(
        "er is geen enkel onderwerp bij gekomen",
        naTweedeKlik[0].n === naEersteKlik.length,
        `${naTweedeKlik[0].n} / ${naEersteKlik.length}`,
      );

      // Er komt een klantantwoord bij: dat is nieuwe informatie.
      await db.client.query(
        `insert into public.fact_requests (profile_id, question, status, scope)
         values ($1, 'Wat is de gemiddelde levertijd?', 'beantwoord', 'merk')`,
        [moreProfileId],
      );
      const previewNaAntwoord = await previewAdditionalRound(moreProfileId);
      ok(
        "een nieuw klantantwoord maakt de knop weer de moeite waard",
        previewNaAntwoord.aanraden === true,
        previewNaAntwoord.melding,
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // Clusters ontdekken (docs/tasks/clusters-ontdekken.md, migratie 0109)
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: vier taken die elkaar via de
    // status van de ronde inplannen. Plant een stap zijn opvolger niet in, of
    // geeft hij op zonder de ronde af te sluiten, dan blijft het scherm eeuwig
    // op "Ontdekkingsronde loopt" staan. En het model mag bundelen maar niet
    // verzinnen: een kandidaat met alleen onbestaande zoektermen hoort nooit
    // bij de consultant aan te komen.
    //
    // Zonder CLUSTER_DISCOVERY_ENABLED draait de ronde op Search Console en het
    // aanbod alleen; dat is ook precies wat hier getest wordt (geen netwerk).
    // ════════════════════════════════════════════════════════════════════════
    {
      console.log("\nClusters ontdekken: van ronde tot kandidaten (0109)");
      const cd = await import("@/lib/pipeline/cluster-discovery");
      const cdProfileId = randomUUID();
      const cdAnalysisId = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status, gsc_property, service_regions)
         values ($1, $2, 'Klimaat BV', 'https://www.klimaat-bv.nl', 'Klimaat BV', 'klaar',
                 'https://www.klimaat-bv.nl/', array['Tilburg'])`,
        [cdProfileId, userId],
      );
      await db.client.query(
        `insert into public.profile_offerings (profile_id, kind, name, source, sort_order)
         values ($1, 'dienst', 'CV-ketel onderhoud', 'ai', 0), ($1, 'dienst', 'Airco', 'ai', 1)`,
        [cdProfileId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, 'CV-ketel onderhoud', 'https://klimaat-bv.nl', 'CV-ketel onderhoud', 'gereed')`,
        [cdAnalysisId, userId, cdProfileId],
      );
      const vandaag = new Date().toISOString().slice(0, 10);
      await db.client.query(
        `insert into public.search_console_queries (profile_id, day, query, page, clicks, impressions, position) values
           ($1, $2, 'airco laten plaatsen tilburg', 'https://www.klimaat-bv.nl/airco', 3, 300, 8),
           ($1, $2, 'airco installeren kosten', 'https://www.klimaat-bv.nl/airco', 1, 200, 12),
           ($1, $2, 'cv ketel onderhoud tilburg', 'https://www.klimaat-bv.nl/cv', 9, 150, 5),
           ($1, $2, 'capcut apk', 'https://www.klimaat-bv.nl/', 0, 90, 30),
           ($1, $2, 'klimaat bv', 'https://www.klimaat-bv.nl/', 40, 500, 1)`,
        [cdProfileId, vandaag],
      );

      const { rows: rondeRij } = await db.client.query(
        `insert into public.cluster_discovery_runs (profile_id, started_by, status, theme)
         values ($1, $2, 'verzamelen', 'Airco') returning id`,
        [cdProfileId, userId],
      );
      const runId = rondeRij[0].id as string;

      await cd.discoveryCollect(admin as never, runId);
      const { rows: naVerzamelen } = await db.client.query(
        "select status, input_json from public.cluster_discovery_runs where id = $1",
        [runId],
      );
      eqc("na verzamelen staat de ronde op verbreden", naVerzamelen[0].status, "verbreden");
      const invoer = naVerzamelen[0].input_json as {
        thema: string | null;
        beginpunten: string[];
        gsc: { keyword: string }[];
        bestaand: string[];
      };
      // Het thema (migratie 0111) moet elke stap bereiken, anders zoekt de
      // ronde toch weer over het hele aanbod.
      eqc("het thema gaat mee in de invoer van de ronde", String(invoer.thema), "Airco");
      ok(
        "de beginpunten krijgen het thema",
        log.some((l) => l.schemaName === "discovery_seeds" && l.user.includes("THEMA: Airco")),
      );
      ok(
        "een beginpunt met de merknaam valt eruit",
        !invoer.beginpunten.some((b) => b.includes("klimaat bv")),
        invoer.beginpunten.join(", "),
      );
      ok("Search Console gaat mee", invoer.gsc.length === 5, String(invoer.gsc.length));
      ok("het lopende cluster staat bij wat er al is", invoer.bestaand.includes("CV-ketel onderhoud"));

      const { rows: volgendeTaak } = await db.client.query(
        "select type from public.jobs where profile_id = $1 and type like 'discovery_%'",
        [cdProfileId],
      );
      ok("verzamelen plant verbreden in", volgendeTaak.some((j) => j.type === "discovery_expand"));

      // Nog een keer verzamelen: de ronde is al verder, dus er gebeurt niets.
      const aanroepenVoor = log.filter((l) => l.schemaName === "discovery_seeds").length;
      await cd.discoveryCollect(admin as never, runId);
      ok(
        "een herhaalde taak doet geen tweede aanroep",
        log.filter((l) => l.schemaName === "discovery_seeds").length === aanroepenVoor,
      );

      await cd.discoveryExpand(admin as never, runId);
      await cd.discoverySift(admin as never, runId);
      const { rows: naSchiften } = await db.client.query(
        "select status, status_note, sifted_json from public.cluster_discovery_runs where id = $1",
        [runId],
      );
      eqc("na schiften staat de ronde op bundelen", naSchiften[0].status, "bundelen");
      ok(
        "zonder zoekdata zegt de ronde dat erbij",
        String(naSchiften[0].status_note ?? "").includes("stond uit"),
        String(naSchiften[0].status_note),
      );
      const geschift = naSchiften[0].sifted_json as { keyword: string }[];
      ok("de merkterm is er vóór het model al uit", !geschift.some((t) => t.keyword === "klimaat bv"));
      ok("de homoniem is eruit geschift", !geschift.some((t) => t.keyword.includes("capcut")));
      ok("een onbestaand nummer van het model telt niet", geschift.length === 3, String(geschift.length));

      ok(
        "het schiften krijgt het thema",
        log.some((l) => l.schemaName === "discovery_sift" && l.user.includes("THEMA: Airco")),
      );
      await cd.discoveryBundle(admin as never, runId);
      ok(
        "het bundelen krijgt het thema",
        log.some((l) => l.schemaName === "discovery_bundle" && l.user.includes("THEMA: Airco")),
      );
      const { rows: kand } = await db.client.query(
        `select title, kind, overlaps_with, total_volume, own_position, terms_json
           from public.cluster_discovery_candidates where run_id = $1 order by score desc`,
        [runId],
      );
      ok("de verzonnen kandidaat sneuvelt", !kand.some((k) => k.title === "Zonnepanelen"), kand.map((k) => k.title).join(", "));
      const airco = kand.find((k) => k.title === "Airco laten installeren");
      ok("de airco-kandidaat is er", Boolean(airco));
      eqc("met plek 8 is dat snelle winst", String(airco?.kind), "snelle_winst");
      ok("zonder zoekdata is het volume onbekend, niet nul", airco?.total_volume === null, String(airco?.total_volume));
      const ketel = kand.find((k) => k.title === "CV-ketel onderhoud in Tilburg");
      ok(
        "een verzonnen term binnen een echte kandidaat valt weg, de kandidaat niet",
        ketel === undefined || !(ketel.terms_json as { keyword: string }[]).some((t) => t.keyword.includes("verzonnen")),
      );
      const { rows: rondeKlaar } = await db.client.query(
        "select status, finished_at from public.cluster_discovery_runs where id = $1",
        [runId],
      );
      eqc("de ronde is klaar", rondeKlaar[0].status, "klaar");

      // Een tweede ronde waarvan een stap definitief opgeeft.
      const { rows: tweede } = await db.client.query(
        `insert into public.cluster_discovery_runs (profile_id, started_by, status)
         values ($1, $2, 'verbreden') returning id`,
        [cdProfileId, userId],
      );
      const { rows: taak } = await db.client.query(
        `insert into public.jobs (profile_id, type, payload_json, dedupe_key, status, attempts)
         values ($1, 'discovery_expand', $2, $3, 'running', 4) returning *`,
        [cdProfileId, JSON.stringify({ runId: tweede[0].id }), `chain-discovery-fout:${tweede[0].id}`],
      );
      const { handleFailure } = await import("@/lib/jobs/worker");
      await handleFailure(admin as never, taak[0], "DataForSEO lag eruit");
      const { rows: naFout } = await db.client.query(
        "select status, status_note from public.cluster_discovery_runs where id = $1",
        [tweede[0].id],
      );
      eqc("een opgegeven stap zet de ronde op mislukt", naFout[0].status, "mislukt");
      ok("met een zin voor het scherm", String(naFout[0].status_note ?? "").length > 20);
    }

    // ════════════════════════════════════════════════════════════════════════
    // De effectmeting gooide de helft van haar betaalde metingen weg
    // (doorloop-huyberts.md punt 1, migratie 0069).
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

      // ══════════════════════════════════════════════════════════════════
      // EEN TWEEDE BRON MAG DE SCORE NIET AANRAKEN (20 september 2026)
      //
      // ⚠️ DIT IS DE FOUT DIE GEEN UNITTEST VANGT, en die lib/jobs/queue.ts al
      // in woorden beschreef: computeAggregates() bevatte geen engine-filter.
      //
      // Het is niet simpelweg dubbeltellen. shareByRun() ziet twee metingen van
      // dezelfde vraag aan voor twee HERHALINGEN en geeft ze elk gewicht 1/2.
      // Eén vraag, bij ChatGPT wél genoemd en bij Google niet, zou dan als
      // "half genoemd" de score in gaan: 50 in plaats van 100. Het cijfer blijft
      // plausibel en slaat nergens meer op. Vandaar dat dit scenario het
      // verschil tussen 100 en 50 toetst en niet alleen "er komt iets uit".
      const { rows: primaireRun } = await db.client.query(
        `select id from public.tracking_runs
           where analysis_id = $1 and prompt_id = $2 and week_no = $3
             and purpose = 'periodic' and engine = 'openai'`,
        [impactAnalysisId, promptId, weekNo],
      );
      const primaireRunId = String(primaireRun[0].id);

      // De tweede bron: dezelfde vraag, dezelfde periode, andere engine. De
      // unieke index laat dit toe omdat de engine in de sleutel zit (0041).
      const { rows: tweedeRun } = await db.client.query(
        `insert into public.tracking_runs
           (analysis_id, prompt_id, prompt_text_snapshot, prompt_category_snapshot,
            engine, week_no, purpose, repeat_index, raw_response, raw_response_received_at,
            mention_json)
         values ($1, $2, 'antwoord van de tweede bron', 'Oriëntatie', 'gemini', $3,
                 'periodic', 0, 'antwoord van de tweede bron', now(), '{"mentions":[]}'::jsonb)
         returning id`,
        [impactAnalysisId, promptId, weekNo],
      );
      const tweedeRunId = String(tweedeRun[0].id);

      await db.client.query(
        "update public.tracking_runs set mention_json = '{\"mentions\":[]}'::jsonb where id = $1",
        [primaireRunId],
      );

      // Bij ChatGPT wél genoemd, bij de tweede bron niet. Allebei winbaar, want
      // in allebei noemt de AI een aanbieder.
      for (const [runId, eigenGenoemd] of [
        [primaireRunId, true],
        [tweedeRunId, false],
      ] as [string, boolean][]) {
        await db.client.query(
          `insert into public.tracking_run_mentions
             (tracking_run_id, entity_name, is_own_brand, mentioned, cited_sources)
           values ($1, 'Fysi-Unique', true, $2, '{}')`,
          [runId, eigenGenoemd],
        );
        await db.client.query(
          `insert into public.tracking_run_mentions
             (tracking_run_id, entity_name, is_own_brand, mentioned, cited_sources)
           values ($1, 'Fysio Amersfoort', false, true, '{}')`,
          [runId],
        );
      }

      const { computeAggregates } = await import("@/lib/pipeline/measure");
      await computeAggregates(admin as never, impactAnalysisId, weekNo);

      const { rows: scoreNa } = await db.client.query(
        "select score, judged_runs, winnable_runs, per_engine_json from public.visibility_scores where analysis_id = $1 and week_no = $2",
        [impactAnalysisId, weekNo],
      );
      eqc("de score rust op één vraag", String(scoreNa[0].judged_runs), "1");
      eqc("en die vraag is winbaar", String(scoreNa[0].winnable_runs), "1");
      // 100 en niet 50: de tweede bron telt niet als halve herhaling mee.
      // `score` is numeric(5,2), dus "100.00"; vandaar de vergelijking op getal.
      eqc(
        "de tweede bron verlaagt de score niet tot de helft",
        String(Number(scoreNa[0].score)),
        "100",
      );

      // En hij is niet weggegooid: hij staat apart, met zijn eigen cijfer.
      const perEngine = (scoreNa[0].per_engine_json ?? {}) as Record<
        string,
        { score: number | null; judged_runs: number }
      >;
      eqc("ChatGPT staat apart met zijn eigen cijfer", String(perEngine.openai?.score), "100");
      eqc("en de tweede bron ook", String(perEngine.gemini?.score), "0");
      eqc("elk met één beoordeelde vraag", String(perEngine.gemini?.judged_runs), "1");
    }

    // ══════════════════════════════════════════════════════════════════════
    // HERSTELPLAN NA AUDIT T3.2: de controle op de publicatie grijpt in
    //
    // Op 2 september 2026 schreef `verify_publication` voor een onbereikbare
    // pagina netjes op wat er mis was, en gebeurde er daarna niets: de stand
    // bleef 'published'. Deze test toont aan dat de pagina nu terugvalt op
    // 'nog niet gepubliceerd', met de reden in `review_notes`, en dat de nog
    // niet gedraaide hermetingen worden opgeruimd (meten wat een pagina doet
    // die er niet staat, is geld uitgeven aan ruis).
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nDe publicatiecontrole zet een mislukte publicatie terug (T3.2)");

    const t3Profiel = randomUUID();
    await db.client.query(
      `insert into public.profiles (id, user_id, name, url, status)
       values ($1, $2, 'T3-merk', 'https://t3-merk.nl', 'klaar')`,
      [t3Profiel, userId],
    );
    const { rows: t3Analyses } = await db.client.query(
      `insert into public.analyses (user_id, profile_id, url, topic, name, status)
       values ($1, $2, 'https://t3-merk.nl', 'onderhoud', 'Onderhoud', 'gereed') returning id`,
      [userId, t3Profiel],
    );
    const t3AnalysisId = t3Analyses[0].id as string;

    const t3PublishedUrl = "https://t3-merk.nl/onderhoud";
    const { rows: t3Pagina } = await db.client.query(
      `insert into public.content_pieces
         (analysis_id, type, title, status, action, body_markdown, needs_review,
          published_at, published_url)
       values ($1, 'article', 'Onderhoud aan je installatie', 'published', 'nieuw',
               'Dit is de eerste zin die lang genoeg is om als controlezin te dienen bij het testen.',
               false, now(), $2)
       returning id`,
      [t3AnalysisId, t3PublishedUrl],
    );
    const t3PieceId = t3Pagina[0].id as string;

    // Een hermeting die nog moet draaien: die hoort te verdwijnen zodra de
    // publicatie mislukt blijkt (meten wat er niet staat is geld voor ruis).
    await db.client.query(
      `insert into public.jobs (analysis_id, type, payload_json, dedupe_key, status)
       values ($1, 'measure_impact', $2, $3, 'queued')`,
      [t3AnalysisId, { contentPieceId: t3PieceId }, `impact:${t3PieceId}:w1`],
    );

    const { verifyPublication } = await import("@/lib/pipeline/publish");

    const t3OrigineleFetch = globalThis.fetch;
    globalThis.fetch = (async (_input: RequestInfo | URL) => ({
      ok: false,
      status: 404,
      headers: new Headers(),
      text: async () => "",
    })) as typeof globalThis.fetch;

    try {
      const t3Check = await verifyPublication(admin as never, t3PieceId);
      ok("de controle meldt onbereikbaar", t3Check?.reachable === false);

      const { rows: t3Na } = await db.client.query(
        `select status, published_at, needs_review, review_notes
           from public.content_pieces where id = $1`,
        [t3PieceId],
      );
      ok("de pagina valt terug op 'nog niet gepubliceerd'", t3Na[0]?.status === "ready");
      ok("de publicatiedatum is weg", t3Na[0]?.published_at === null);
      ok("de pagina staat weer op nakijken", t3Na[0]?.needs_review === true);
      const t3Notes = (t3Na[0]?.review_notes ?? []) as string[];
      ok(
        "de reden staat in de opmerkingen",
        t3Notes.some((n) => n.includes("Publicatie mislukt")),
        t3Notes.join(" | "),
      );

      const { rows: t3Jobs } = await db.client.query(
        `select id from public.jobs where analysis_id = $1 and type = 'measure_impact' and status = 'queued'`,
        [t3AnalysisId],
      );
      ok("de nog niet gedraaide hermeting is opgeruimd", t3Jobs.length === 0);
    } finally {
      globalThis.fetch = t3OrigineleFetch;
    }

    // ── Een link die doorstuurt naar een andere pagina ─────────────────────
    //
    // Bevinding 1 van de verificatie van 22 september 2026: `finalUrl` werd
    // altijd gelijkgezet aan het opgegeven adres, dus een doorverwijzing viel
    // nooit op. Hier staat onze tekst WEL op de pagina waar de link naartoe
    // stuurt: de pagina blijft gepubliceerd (hij staat echt live), maar de
    // klant krijgt te zien dat hij beter het echte adres kan invullen.
    console.log("\nDe publicatiecontrole meldt een doorverwijzing naar een andere pagina");
    await db.client.query(
      `update public.content_pieces
          set status = 'published', published_at = now(), needs_review = false, review_notes = '{}'
        where id = $1`,
      [t3PieceId],
    );
    const t3Doel = "https://t3-merk.nl/diensten/onderhoud-2026";
    const t3Html =
      "<html><body><p>Dit is de eerste zin die lang genoeg is om als controlezin te dienen bij het testen.</p></body></html>";
    globalThis.fetch = (async (_input: RequestInfo | URL) => ({
      ok: true,
      status: 200,
      url: t3Doel,
      headers: new Headers(),
      text: async () => t3Html,
    })) as typeof globalThis.fetch;
    try {
      const t3Door = await verifyPublication(admin as never, t3PieceId);
      ok("het eindadres wordt bewaard", t3Door?.finalUrl === t3Doel, t3Door?.finalUrl ?? "null");
      ok(
        "de klant krijgt de doorverwijzing te zien, met het echte adres",
        (t3Door?.problems ?? []).some((p) => p.includes("stuurt door") && p.includes(t3Doel)),
        (t3Door?.problems ?? []).join(" | "),
      );
      const { rows: t3DoorNa } = await db.client.query(
        `select status from public.content_pieces where id = $1`,
        [t3PieceId],
      );
      ok("de tekst staat live, dus de pagina blijft gepubliceerd", t3DoorNa[0]?.status === "published");

      // Alleen een slash aan het eind of https erbij is geen doorverwijzing.
      globalThis.fetch = (async (_input: RequestInfo | URL) => ({
        ok: true,
        status: 200,
        url: `${t3PublishedUrl}/`,
        headers: new Headers(),
        text: async () => t3Html,
      })) as typeof globalThis.fetch;
      const t3Slash = await verifyPublication(admin as never, t3PieceId);
      ok(
        "een slash aan het eind telt niet als doorverwijzing",
        !(t3Slash?.problems ?? []).some((p) => p.includes("stuurt door")),
        (t3Slash?.problems ?? []).join(" | "),
      );
    } finally {
      globalThis.fetch = t3OrigineleFetch;
    }

    await db.client.query("delete from public.profiles where id = $1", [t3Profiel]);

    // ══════════════════════════════════════════════════════════════════════
    // HERSTELPLAN NA AUDIT T8.1: dubbele vragen over de funnelfasen heen
    //
    // Op productie zaten er in één meting van dertig vragen twee letterlijk
    // identieke, in twee verschillende funnelfasen: de dedup binnen
    // `generateForFunnelStage` ziet alleen zijn eigen fase. Deze test simuleert
    // precies dat (twee fasen die toevallig dezelfde vraag bedachten) en toont
    // aan dat `finishPromptGeneration` de latere kopie opruimt vóórdat de poort
    // naar 'concept_klaar' opengaat.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nDubbele vragen over de funnelfasen heen worden opgeruimd (T8.1)");

    const t81Profiel = randomUUID();
    await db.client.query(
      `insert into public.profiles (id, user_id, name, url, status)
       values ($1, $2, 'T8.1-merk', 'https://t81-merk.nl', 'klaar')`,
      [t81Profiel, userId],
    );
    const { rows: t81Analyses } = await db.client.query(
      `insert into public.analyses (user_id, profile_id, url, topic, name, status)
       values ($1, $2, 'https://t81-merk.nl', 'onderhoud', 'Onderhoud', 'bezig') returning id`,
      [userId, t81Profiel],
    );
    const t81AnalysisId = t81Analyses[0].id as string;

    await db.client.query(
      `insert into public.prompts (analysis_id, text, category, created_at)
       values
         ($1, 'Wat kost cv-ketel onderhoud?', 'Oriëntatie', now() - interval '2 seconds'),
         ($1, 'Wat kost cv-ketel onderhoud?', 'Overweging', now()),
         ($1, 'Welke aanbieder is het beste?', 'Beslissing', now())`,
      [t81AnalysisId],
    );

    const { finishPromptGeneration } = await import("@/lib/pipeline/prepare");
    await finishPromptGeneration(t81AnalysisId);

    const { rows: t81Na } = await db.client.query(
      `select text, category from public.prompts where analysis_id = $1 order by created_at`,
      [t81AnalysisId],
    );
    ok("de dubbele vraag is weg, twee vragen blijven over", t81Na.length === 2, String(t81Na.length));
    ok(
      "de OUDSTE van de twee identieke vragen (Oriëntatie) bleef staan",
      t81Na.some((r: { text: string; category: string }) => r.category === "Oriëntatie"),
    );
    ok(
      "de latere kopie (Overweging) is verwijderd",
      !t81Na.some((r: { text: string; category: string }) => r.category === "Overweging"),
    );

    const { rows: t81Status } = await db.client.query(
      "select status from public.analyses where id = $1",
      [t81AnalysisId],
    );
    ok("de poort ging alsnog open naar concept_klaar", t81Status[0]?.status === "concept_klaar");

    await db.client.query("delete from public.profiles where id = $1", [t81Profiel]);

    // ══════════════════════════════════════════════════════════════════════
    // BUG GEVONDEN OP EEN ECHTE TESTRONDE (19/20 september 2026, zie
    // docs/logbook.md): calibratePromptVolumes() overschreef de band van een
    // vraag die al een echt DataForSEO-volume had met een verse AI-schatting,
    // terwijl volume_source op 'gemeten' bleef staan. Het label zei "gemeten",
    // het cijfer erachter was intussen weer een gok.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nDe nakalibratie laat een echt gemeten vraag met rust (T8.2)");

    const t82Profiel = randomUUID();
    await db.client.query(
      `insert into public.profiles (id, user_id, name, url, status)
       values ($1, $2, 'T8.2-merk', 'https://t82-merk.nl', 'klaar')`,
      [t82Profiel, userId],
    );
    const { rows: t82Analyses } = await db.client.query(
      `insert into public.analyses (user_id, profile_id, url, topic, name, status)
       values ($1, $2, 'https://t82-merk.nl', 'occasions', 'Occasions', 'bezig') returning id`,
      [userId, t82Profiel],
    );
    const t82AnalysisId = t82Analyses[0].id as string;

    const { rows: t82Prompts } = await db.client.query(
      `insert into public.prompts (analysis_id, text, category, volume_estimate, volume_band, volume_source)
       values
         ($1, 'Financiering occasion Boxtel', 'Beslissing', 32, 'midden', 'gemeten'),
         ($1, 'Wat kost een occasion in Oss?', 'Oriëntatie', 50, 'midden', 'geschat'),
         ($1, 'Welke garantie krijg ik bij een occasion?', 'Overweging', 50, 'midden', 'geschat')
       returning id, text`,
      [t82AnalysisId],
    );

    const { calibratePromptVolumes } = await import("@/lib/pipeline/prepare");
    await calibratePromptVolumes(t82AnalysisId);

    const { rows: t82Na } = await db.client.query(
      `select text, volume_estimate, volume_band, volume_source from public.prompts
        where analysis_id = $1 order by text`,
      [t82AnalysisId],
    );
    const gemetenNa = t82Na.find((r: { text: string }) => r.text === "Financiering occasion Boxtel");
    ok(
      "de al gemeten vraag behoudt haar echte volume en band",
      gemetenNa?.volume_estimate === 32 && gemetenNa?.volume_band === "midden",
      JSON.stringify(gemetenNa),
    );
    ok(
      "en blijft op 'gemeten' staan, geen stille terugval naar 'geschat'",
      gemetenNa?.volume_source === "gemeten",
    );
    ok(
      "de twee geschatte vragen deden wél mee aan de nakalibratie",
      t82Na
        .filter((r: { text: string }) => r.text !== "Financiering occasion Boxtel")
        .every((r: { volume_source: string }) => r.volume_source === "geschat"),
    );

    await db.client.query("delete from public.profiles where id = $1", [t82Profiel]);

    // ── Scenario 18: sitefeiten indelen in de kennislaag (WP2, sinds K8 deel 2) ──
    //
    // Het feitenregister deelde tot K8 feiten in op `brand_facts` en liet een
    // model elk paar beoordelen. Nu deelt de taak `fact_register` de sitefeiten
    // in op het kennisitem zelf, en zoekt de code de botsingen (V14): twee
    // intakes voor verschillende producten botsen niet, twee ketelprijzen wel.
    // Een tweede run deelt niets opnieuw in, en een ingedeeld item houdt zijn
    // bewering, citaat en status.
    console.log("\nScenario 18: sitefeiten indelen in de kennislaag (K8 deel 2)");
    {
      const { deelKennisIn, nogInTeDelen } = await import("@/lib/kennis/indelen");
      const { legVast } = await import("@/lib/kennis/vastleggen");
      const { kennisUitSynthese } = await import("@/lib/kennis/onderzoek");
      const reg = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status)
         values ($1, $2, 'Registertest', 'https://registertest.nl', 'Registertest', 'klaar')`,
        [reg, userId],
      );
      const shim = createShimClient(db.client) as never;
      const code = { actor: "code", taak: "test" } as const;
      // Twee producten in het aanbod, met een kennisitem, zoals het onderzoek ze vastlegt.
      for (const naam of ["Intake op kantoor", "Intake in de auto", "CV-ketel vervangen"]) {
        const { rows } = await db.client.query(
          `insert into public.profile_offerings (profile_id, kind, name, source) values ($1, 'dienst', $2, 'ai') returning id`,
          [reg, naam],
        );
        const u = await legVast(shim, {
          profileId: reg, domein: "aanbod", soort: "dienst", bewering: naam, status: "waargenomen", bron: "website",
          bronUrl: "https://registertest.nl/aanbod", citaat: naam, gebruik: "content", herkomst: { tabel: "profile_offerings", id: rows[0].id },
        } as never, code);
        if (u.soort !== "vastgelegd") throw new Error(`Testaanbod: ${u.soort}`);
      }
      const { rows: facet } = await db.client.query(
        `insert into public.profile_facets (profile_id, facet, raw_json) values ($1, 'synthese', '{}'::jsonb) returning id`,
        [reg],
      );
      const zinnen = [
        "Een intake op kantoor kost € 50.",
        "Een intake in de auto kost € 80.",
        "Een nieuwe cv-ketel kost € 2.200.",
        "Een cv-ketel vervangen kost bij ons € 2.500.",
      ];
      for (const item of kennisUitSynthese(facet[0].id as string, zinnen.map((z) => ({ text: z, sourceUrl: "https://registertest.nl/prijzen", quote: z })))) {
        await legVast(shim, {
          profileId: reg, domein: item.domein, soort: item.soort, bewering: item.bewering, status: item.status, bron: item.bron,
          bronUrl: item.bronUrl, citaat: item.citaat, gebruik: item.gebruik, herkomst: item.herkomst,
        } as never, code);
      }
      eqc("scenario 18: vier sitefeiten wachten op een indeling", String(await nogInTeDelen(shim, reg)), "4");
      const indelingenVoor = log.filter((l) => l.schemaName === "fact_classification").length;
      const eerste = await deelKennisIn(shim, reg);
      eqc("scenario 18: alle vier ingedeeld", String(eerste.ingedeeld), "4");
      eqc("scenario 18: en er wacht er geen meer", String(await nogInTeDelen(shim, reg)), "0");
      const { rows: feiten } = await db.client.query(
        `select k.bewering, k.soort, k.domein, k.status, k.citaat, k.waarde, k.sleutel,
                (select string_agg(a.bewering, ',' order by a.bewering) from public.klantkennis a where a.id = any(k.geldt_voor)) as voor
           from public.klantkennis k where k.profile_id = $1 and k.herkomst_tabel = 'profile_facets' order by k.bewering`,
        [reg],
      );
      ok("scenario 18: een prijs is een prijs, met waarde", feiten.every((f) => f.soort === "prijs" && f.waarde && f.waarde.min > 0), JSON.stringify(feiten));
      ok("scenario 18: bewering, citaat en status blijven zoals ze waren", feiten.every((f) => f.status === "waargenomen" && f.citaat === f.bewering));
      ok("scenario 18: met een nieuwe sleutel die de soort draagt", feiten.every((f) => String(f.sleutel).startsWith("aanbod|prijs|")), JSON.stringify(feiten.map((f) => f.sleutel)));
      eqc(
        "scenario 18: elke intake hangt aan zijn eigen product",
        feiten.filter((f) => /intake/.test(f.bewering)).map((f) => f.voor).join(" / "),
        "Intake in de auto / Intake op kantoor",
      );
      const { rows: botsingen } = await db.client.query(
        `select k.bewering from public.fact_conflicts c join public.klantkennis k on k.id = any(c.kennis_ids)
          where c.profile_id = $1 and c.status = 'open' order by k.bewering`,
        [reg],
      );
      eqc(
        "scenario 18: de twee ketelprijzen botsen, de intakes niet",
        botsingen.map((b) => b.bewering).join(" | "),
        "Een cv-ketel vervangen kost bij ons € 2.500. | Een nieuwe cv-ketel kost € 2.200.",
      );
      const tweede = await deelKennisIn(shim, reg);
      eqc("scenario 18: een tweede run deelt niets opnieuw in", String(tweede.ingedeeld), "0");
      eqc(
        "scenario 18: en roept het model niet opnieuw aan (conventie 9)",
        String(log.filter((l) => l.schemaName === "fact_classification").length - indelingenVoor),
        "1",
      );
      eqc("scenario 18: er schrijft niemand meer in brand_facts", String((await db.client.query("select count(*)::int as n from public.brand_facts where profile_id = $1", [reg])).rows[0].n), "0");
    }

    // ── Scenario 19: de schrijfingang van de kennislaag (K2) ───────────────
    //
    // docs/tasks/van-pijplijn-naar-kennissysteem.md K2, "klaar als": vastleggen,
    // vervangen en bevestigen, met de herkomst intact. Daarbij: ontdubbelen, een
    // botsing op de conflictlijst, afwijzen, en dat een model niets verklaart.
    console.log("\nScenario 19: de schrijfingang van de kennislaag (K2)");
    {
      const { legVast, bevestig, wijsAf, vervang } = await import("@/lib/kennis/vastleggen");
      const merk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status)
         values ($1, $2, 'Kennistest', 'https://kennistest.nl', 'Kennistest', 'klaar')`,
        [merk, userId],
      );
      const shim = createShimClient(db.client) as never;
      const feitId = randomUUID();
      const mens = { actor: "mens" as const, gebruikerId: userId };
      const code = { actor: "code" as const, taak: "kennis_terugvullen" };

      const eerste = await legVast(shim, {
        profileId: merk, domein: "aanbod", soort: "prijs", bewering: "Een proefles kost € 45.",
        waarde: { min: 45, max: 45, eenheid: "EUR" }, status: "waargenomen", bron: "website",
        bronUrl: "https://kennistest.nl/prijzen", citaat: "Proefles € 45", gebruik: "content",
        herkomst: { tabel: "brand_facts", id: feitId },
      }, code);
      eqc("scenario 19: vastgelegd", eerste.soort, "vastgelegd");
      const eersteId = eerste.soort === "vastgelegd" ? eerste.item.id : "";

      const nogmaals = await legVast(shim, {
        profileId: merk, domein: "aanbod", soort: "prijs", bewering: "Kost een proefles € 45?",
        waarde: { min: 45, max: 45, eenheid: "EUR" }, status: "waargenomen", bron: "website",
        bronUrl: "https://kennistest.nl/prijzen", citaat: "Proefles € 45", gebruik: "content",
        herkomst: { tabel: "brand_facts", id: randomUUID() },
      }, code);
      eqc("scenario 19: dezelfde bewering in andere woorden wordt niet dubbel vastgelegd", nogmaals.soort, "bestond");

      const model = await legVast(shim, {
        profileId: merk, domein: "positionering", bewering: "Klanten kiezen voor de vaste instructeur.",
        status: "verklaard", bron: "ai", gebruik: "intern", herkomst: { tabel: "profile_facets", id: randomUUID() },
      }, { actor: "model", taak: "profile_market" });
      eqc("scenario 19: een model kan niets verklaren", model.soort, "geweigerd");
      let dbWeigert = false;
      try {
        await db.client.query(
          `insert into public.klantkennis (profile_id, domein, bewering, status, bron, gebruik, vastgelegd_door_taak)
           values ($1, 'positionering', 'x', 'verklaard', 'ai', 'intern', 'omweg')`,
          [merk],
        );
      } catch {
        dbWeigert = true;
      }
      ok("scenario 19: en de database weigert het ook buiten de schrijfingang om", dbWeigert);

      const botsend = await legVast(shim, {
        profileId: merk, domein: "aanbod", soort: "prijs", bewering: "De proefles kost bij ons € 50.",
        waarde: { min: 50, max: 50, eenheid: "EUR" }, status: "verklaard", bron: "gesprek", gebruik: "content",
        herkomst: { tabel: "fact_requests", id: randomUUID() },
      }, mens);
      eqc("scenario 19: een tweede prijs voor hetzelfde botst", botsend.soort === "vastgelegd" ? String(botsend.botsingen) : botsend.soort, "1");
      const { rows: conflict } = await db.client.query(
        "select feit_ids, kennis_ids, status, soort from public.fact_conflicts where profile_id = $1",
        [merk],
      );
      eqc("scenario 19: de botsing staat open op de conflictlijst, met verwijzingen naar de kennis", conflict.map((c) => `${c.status}/${c.soort}/${(c.kennis_ids ?? []).length}/${(c.feit_ids ?? []).length}`).join(","), "open/prijs/2/0");

      const nieuw = await vervang(shim, {
        profileId: merk, oudId: eersteId,
        nieuw: {
          profileId: merk, domein: "aanbod", soort: "prijs", bewering: "Een proefles kost € 50.",
          waarde: { min: 50, max: 50, eenheid: "EUR" }, status: "waargenomen", bron: "website",
          bronUrl: "https://kennistest.nl/prijzen", citaat: "Proefles € 50", gebruik: "content",
          herkomst: { tabel: "brand_facts", id: feitId },
        },
      }, code);
      ok("scenario 19: vervangen", nieuw.ok, nieuw.ok ? "" : nieuw.fout);
      const nieuwId = nieuw.ok ? nieuw.item.id : "";
      const bevestigd = await bevestig(shim, { profileId: merk, itemId: nieuwId }, mens);
      ok("scenario 19: bevestigd door een mens", bevestigd.ok, bevestigd.ok ? "" : bevestigd.fout);

      const { rows: rijen } = await db.client.query(
        "select id, status, vervangen_door, herkomst_tabel, herkomst_id, bevestigd_door, vastgelegd_door_taak, sleutel from public.klantkennis where profile_id = $1 and domein = 'aanbod' order by created_at",
        [merk],
      );
      const oud = rijen.find((r) => r.id === eersteId);
      const nw = rijen.find((r) => r.id === nieuwId);
      eqc("scenario 19: de oude versie bestaat nog en wijst naar de nieuwe", String(oud?.vervangen_door), nieuwId);
      eqc("scenario 19: de herkomst van de oude versie is intact", `${oud?.herkomst_tabel}/${oud?.herkomst_id}`, `brand_facts/${feitId}`);
      eqc("scenario 19: de nieuwe versie heeft zijn eigen herkomst", `${nw?.herkomst_tabel}/${nw?.herkomst_id}`, `brand_facts/${feitId}`);
      eqc("scenario 19: de nieuwe versie is bevestigd, door deze mens", `${nw?.status}/${nw?.bevestigd_door}`, `bevestigd/${userId}`);
      eqc("scenario 19: wie hem vastlegde blijft zichtbaar", String(nw?.vastgelegd_door_taak), "kennis_terugvullen");
      ok("scenario 19: de nieuwe versie is de ontdubbelingsrij", Boolean(nw?.sleutel));

      const nogEensBevestigen = await bevestig(shim, { profileId: merk, itemId: eersteId }, mens);
      ok("scenario 19: een vervangen versie kan niet meer bevestigd worden", !nogEensBevestigen.ok);

      const gedacht = await legVast(shim, {
        profileId: merk, domein: "positionering", bewering: "Klanten kiezen vooral op prijs.",
        status: "afgeleid", bron: "ai", gebruik: "intern", herkomst: { tabel: "profile_facets", id: randomUUID() },
      }, { actor: "model", taak: "profile_market" });
      eqc("scenario 19: een model legt een vermoeden vast", gedacht.soort, "vastgelegd");
      const gedachtId = gedacht.soort === "vastgelegd" ? gedacht.item.id : "";
      const af = await wijsAf(shim, { profileId: merk, itemId: gedachtId }, mens);
      ok("scenario 19: een mens wijst het af", af.ok && Boolean(af.item.afgewezen_op));
      const terug = await legVast(shim, {
        profileId: merk, domein: "positionering", bewering: "Klanten kiezen vooral op prijs.",
        status: "afgeleid", bron: "ai", gebruik: "intern", herkomst: { tabel: "profile_facets", id: randomUUID() },
      }, { actor: "model", taak: "profile_market" });
      eqc("scenario 19: bij een volgende ronde komt het niet stil terug", terug.soort, "eerder_afgewezen");
      const { rows: telling } = await db.client.query("select count(*)::int as n from public.klantkennis where profile_id = $1", [merk]);
      eqc("scenario 19: er is niets verwijderd", String(telling[0].n), "4");
    }

    // ── Scenario 20: het terugvullen van de kennislaag (K3) ────────────────
    //
    // docs/tasks/van-pijplijn-naar-kennissysteem.md K3, route van besluit V15:
    // de leesquery, het plan, dezelfde controles als legVast(), de schrijfquery.
    // Tegen de echte constraints van 0116 en 0117. Daarna een tweede run die
    // niets schrijft, en een antwoord dat aan een verwijderde pagina hing.
    console.log("\nScenario 20: het terugvullen van de kennislaag (K3)");
    {
      const { EXPORT_SQL, INSERT_SQL, maakTerugvulplan, dekking, zetOm } = await import("@/lib/kennis/terugvullen");
      const merk = randomUUID();
      const analyse = randomUUID();
      const pagina = randomUUID();
      const weg = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status, aliases, service_regions, growth_regions, taboo_phrases, value_props, proof_points, verhalen, pronoun_preference)
         values ($1, $2, 'Terugvultest', 'https://terugvul.nl', 'Terugvultest', 'klaar', '{TV}', '{Eindhoven}', '{Eindhoven}', '{gratis}',
                 '{Persoonlijk}', '{"Hoe lang duurt een les? Een uur","Al 20 jaar actief"}', 'We begonnen in 2004.', 'je')`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.profile_field_sources (profile_id, field, source, set_by) values
         ($1, 'aliases', 'gesprek', $2), ($1, 'taboo_phrases', 'gesprek', $2), ($1, 'verhalen', 'gesprek', $2),
         ($1, 'service_regions', 'gesprek', $2), ($1, 'growth_regions', 'gesprek', $2), ($1, 'pronoun_preference', 'consultant', $2)`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status) values ($1, $2, $3, 'Terugvultest', 'https://terugvul.nl', 'rijlessen', 'gereed')`,
        [analyse, userId, merk],
      );
      await db.client.query(
        `insert into public.content_pieces (id, analysis_id, title, type, status, version, is_current) values ($1, $2, 'Rijlessen', 'article', 'ready', 1, true)`,
        [pagina, analyse],
      );
      const knoop = randomUUID();
      await db.client.query(
        `insert into public.profile_offerings (id, profile_id, kind, name, description, price_indication, evidence_url, evidence_quote, confidence, source, sort_order)
         values ($1, $2, 'dienst', 'Rijlessen', 'Lessen in een Golf.', '€ 55', 'https://terugvul.nl/les', 'Een rijles kost € 55', 0.9, 'ai', 1)`,
        [knoop, merk],
      );
      const feit = randomUUID();
      await db.client.query(
        `insert into public.brand_facts (id, profile_id, text, source, source_url, kind, fact_key, soort, geldt_voor, stand, bewijskracht)
         values ($1, $2, 'Een rijles duurt 60 minuten.', 'site /les', 'https://terugvul.nl/les', 'site', 'duurt minuten rijle', 'termijn', 'rijlessen', 'site', 'gewoon')`,
        [feit, merk],
      );
      await db.client.query(
        `insert into public.profile_facets (profile_id, facet, summary, raw_json, engine, cost_usd, researched_at)
         values ($1, 'synthese', 's', $2, 'test', 0, now())`,
        [merk, JSON.stringify({ output_parsed: { facts: [{ text: "Een rijles duurt 60 minuten.", quote: "Elke les duurt 60 minuten", sourceUrl: "https://terugvul.nl/les" }] } })],
      );
      await db.client.query(
        `insert into public.fact_requests (profile_id, analysis_id, question, reason, answer, status, scope, content_piece_ids, open_vraag, answered_at)
         values ($1, null, 'Hoe lang duurt een les?', 'r', 'Een uur', 'beantwoord', 'merk', '{}', false, now()),
                ($1, $2, 'Wat wil je zelf vertellen?', 'r', 'Onze eerste leerling slaagde in één keer.', 'beantwoord', 'pagina', $3, true, now())`,
        [merk, analyse, [pagina, weg]],
      );

      const leesMerk = async () => {
        const { rows } = await db.client.query(`select * from (${EXPORT_SQL.replace(/;\s*$/, "")}) x where (x.merk->'profiel'->>'id') = $1`, [merk]);
        return rows[0].merk;
      };
      const bron = await leesMerk();
      const plan = maakTerugvulplan(bron);
      eqc("scenario 20: elke oude rij is een item of een bewuste uitsluiting", dekking(bron, plan).join(", "), "");
      const om = zetOm(plan, randomUUID, new Map(Object.entries(bron.bestaandeSleutels ?? {})));
      eqc("scenario 20: alles haalt de regels van legVast()", om.geweigerd.map((g) => g.ref).join(", "), "");
      const eerste = await db.client.query(INSERT_SQL, [JSON.stringify(om.rijen)]);
      eqc("scenario 20: de database neemt elke rij aan", String(eerste.rowCount), String(om.rijen.length));

      const { rows: feitRij } = await db.client.query(
        "select status, citaat, geldt_voor from public.klantkennis where herkomst_tabel = 'brand_facts' and herkomst_id = $1",
        [feit],
      );
      const { rows: knoopRij } = await db.client.query(
        "select id from public.klantkennis where herkomst_tabel = 'profile_offerings' and herkomst_id = $1 and soort = 'dienst'",
        [knoop],
      );
      eqc("scenario 20: het sitefeit is waargenomen, met het citaat uit de samenvatting", `${feitRij[0]?.status}/${feitRij[0]?.citaat}`, "waargenomen/Elke les duurt 60 minuten");
      eqc("scenario 20: en geldt voor de dienst Rijlessen", (feitRij[0]?.geldt_voor ?? []).join(","), knoopRij[0]?.id ?? "?");
      const { rows: verhaal } = await db.client.query(
        "select content_piece_id from public.klantkennis where profile_id = $1 and domein = 'verhaal' and herkomst_tabel = 'fact_requests'",
        [merk],
      );
      eqc("scenario 20: het verhaal hangt alleen aan de pagina die nog bestaat", verhaal.map((r) => r.content_piece_id).join(","), pagina);
      ok("scenario 20: en de verdwenen pagina staat op de lijst voor de consultant", plan.voorConsultant.some((c) => c.reden.includes("niet meer bestaan")));
      const { rows: kopie } = await db.client.query(
        "select count(*)::int as n from public.klantkennis where profile_id = $1 and bewering like 'Hoe lang duurt een les? Een uur%' and herkomst_tabel = 'profiles'",
        [merk],
      );
      eqc("scenario 20: de kopie van het antwoord in proof_points gaat niet dubbel mee", String(kopie[0].n), "0");
      const { rows: vp } = await db.client.query(
        "select status, gebruik from public.klantkennis where profile_id = $1 and soort = 'waardepropositie'",
        [merk],
      );
      eqc("scenario 20: een waardepropositie van het model wordt geen paginatekst", vp.map((r) => `${r.status}/${r.gebruik}`).join(","), "afgeleid/intern");

      const tweedeBron = await leesMerk();
      const tweede = zetOm(maakTerugvulplan(tweedeBron), randomUUID, new Map(Object.entries(tweedeBron.bestaandeSleutels ?? {})));
      eqc("scenario 20: een tweede run heeft niets nieuws", String(tweede.rijen.length), "0");
      const nogmaals = await db.client.query(INSERT_SQL, [JSON.stringify(om.rijen.map((r) => ({ ...r, id: randomUUID() })))]);
      eqc("scenario 20: en ook dezelfde rijen nog eens schrijven doet niets", String(nogmaals.rowCount), "0");
    }

    // ── Scenario 21: het onderzoek schrijft in de kennislaag (K4) ──────────
    //
    // docs/tasks/van-pijplijn-naar-kennissysteem.md K4: de vijf onderzoeks-
    // stappen draaien echt, met de gestubde AI, en daarna staat in de
    // kennislaag wat ze vonden, met de goede status en herkomst. Waargenomen
    // alleen waar de code het citaat op de pagina terugvond. De oude tabellen
    // worden tijdens de overgang nog gewoon geschreven.
    console.log("\nScenario 21: het onderzoek schrijft in de kennislaag (K4)");
    {
      const { prepareProfile: onderzoek } = await import("@/lib/pipeline/prepare-profile");
      const { buildOfferingTree } = await import("@/lib/pipeline/offering");
      const { researchMarket } = await import("@/lib/pipeline/market");
      const { runLlmBaseline } = await import("@/lib/pipeline/llm-baseline");
      const { synthesiseProfile } = await import("@/lib/pipeline/synthesis");
      const { legOnderzoekVast } = await import("@/lib/kennis/uit-onderzoek");
      const { kennisUitAanbod } = await import("@/lib/kennis/onderzoek");
      const merk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, status)
         values ($1, $2, 'Fysi-Unique', 'https://fysi-unique.nl', 'bezig')`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.profile_pages (profile_id, url, title, text_excerpt) values
         ($1, 'https://fysi-unique.nl/hardloopklachten', 'Hardloopklachten',
          'Wij zitten in Amersfoort. Hardloopklachten behandelen wij met dry needling en oefentherapie.'),
         ($1, 'https://fysi-unique.nl/dry-needling', 'Dry needling',
          'Dry needling voor sporters kost € 65 per behandeling van een half uur.'),
         ($1, 'https://fysi-unique.nl/nieuws/marathon', 'Weer op weg',
          'Vorige maand hielpen we een marathonloper uit Leusden weer op weg na een achillespeesblessure.')`,
        [merk],
      );
      const kennis = async (taak: string) =>
        (await db.client.query(
          `select id, domein, soort, bewering, status, bron, bron_url, citaat, gebruik, geldt_voor, herkomst_tabel, herkomst_id
           from public.klantkennis where profile_id = $1 and vastgelegd_door_taak = $2 order by vastgelegd_op, bewering`,
          [merk, taak],
        )).rows as { id: string; domein: string; soort: string | null; bewering: string; status: string; bron: string; bron_url: string | null; citaat: string | null; gebruik: string; geldt_voor: string[]; herkomst_tabel: string; herkomst_id: string }[];

      await onderzoek(merk);
      const merkonderzoek = await kennis("profile_research");
      ok("scenario 21: het merkonderzoek legde kennis vast", merkonderzoek.length > 0);
      eqc("scenario 21: alles uit het merkonderzoek is een vermoeden van het model", [...new Set(merkonderzoek.map((r) => `${r.status}/${r.bron}/${r.gebruik}`))].join(","), "afgeleid/ai/intern");
      eqc("scenario 21: de waardepropositie staat erin, als vermoeden", merkonderzoek.filter((r) => r.soort === "waardepropositie").map((r) => r.bewering).join(","), "Ruime openingstijden");
      ok("scenario 21: met het profiel als herkomst", merkonderzoek.every((r) => r.herkomst_tabel === "profiles" && r.herkomst_id === merk));

      await buildOfferingTree(merk);
      const aanbod = await kennis("profile_offering");
      const knoop = (soort: string, begin: string) => aanbod.find((r) => r.soort === soort && r.bewering.startsWith(begin));
      const needling = knoop("dienst", "Dry needling");
      eqc("scenario 21: een dienst waarvan de code het citaat vond is waargenomen", `${needling?.status}/${needling?.citaat}/${needling?.bron_url}`, "waargenomen/Dry needling voor sporters kost € 65/https://fysi-unique.nl/dry-needling");
      eqc("scenario 21: en hangt aan zijn categorie", (needling?.geldt_voor ?? []).join(","), knoop("categorie", "Behandelingen")?.id ?? "?");
      eqc("scenario 21: de prijs uit dat citaat is waargenomen", knoop("prijs", "Dry needling")?.status ?? "", "waargenomen");
      const massage = knoop("dienst", "Sportmassage");
      eqc("scenario 21: een citaat dat niet op de pagina staat maakt een vermoeden", `${massage?.status}/${massage?.citaat}/${massage?.gebruik}`, "afgeleid/null/intern");
      const { rows: oudAanbod } = await db.client.query("select count(*)::int as n from public.profile_offerings where profile_id = $1", [merk]);
      eqc("scenario 21: de oude tabel wordt tijdens de overgang nog geschreven", String(oudAanbod[0].n), "3");

      await researchMarket(merk);
      const markt = await kennis("profile_market");
      const { rows: marktFacet } = await db.client.query("select id from public.profile_facets where profile_id = $1 and facet = 'markt'", [merk]);
      eqc("scenario 21: de markt legt positie en redenen vast", markt.filter((r) => r.soort !== "concurrent").map((r) => r.soort).sort().join(","), "positie in de markt,waarom een concurrent wint,waarom een concurrent wint");
      ok("scenario 21: allemaal als vermoeden, met het marktverslag als herkomst", markt.length > 0 && markt.every((r) => r.status === "afgeleid" && r.herkomst_tabel === "profile_facets" && r.herkomst_id === marktFacet[0]?.id));

      // De kennistest zonder budget: geen vragen, maar het voorstel voor de
      // gelijknamige bedrijven komt uit wat er al gemeten was.
      await db.client.query("update public.profiles set onboarding_budget_usd = 0 where id = $1", [merk]);
      await db.client.query(
        `insert into public.profile_llm_baseline (profile_id, engine, block, question, verdict_json)
         values ($1, 'openai', 'verwarring', 'Welke Fysi-Unique bedoel je?', '{"confusions": ["Fysi-Unique Rotterdam"]}')`,
        [merk],
      );
      await runLlmBaseline(merk);
      const test = await kennis("profile_llm_baseline");
      eqc("scenario 21: het gelijknamige bedrijf uit de kennistest is een vermoeden", test.map((r) => `${r.soort}/${r.bewering}/${r.status}/${r.gebruik}`).join(","), "niet ons merk/Fysi-Unique Rotterdam/afgeleid/intern");
      await db.client.query("update public.profiles set onboarding_budget_usd = 2.15 where id = $1", [merk]);

      await synthesiseProfile(merk);
      const alleSynthese = await kennis("profile_synthesis");
      const synthese = alleSynthese.filter((r) => r.soort !== "klus");
      // V9: de klus van de site is een verhaal, waargenomen; de klus zonder letterlijk citaat valt weg.
      eqc(
        "V9: één klus van de site in de kennislaag, met het gevonden citaat",
        alleSynthese.filter((r) => r.soort === "klus").map((r) => `${r.domein}/${r.status}/${r.gebruik}/${r.citaat}`).join(","),
        "verhaal/waargenomen/content/hielpen we een marathonloper uit Leusden weer op weg",
      );
      const { rows: feit } = await db.client.query("select id from public.profile_facets where profile_id = $1 and facet = 'synthese'", [merk]);
      eqc("scenario 21: het sitefeit is waargenomen, met het gevonden citaat", synthese.map((r) => `${r.bewering}/${r.status}/${r.citaat}/${r.gebruik}`).join(","), "De praktijk zit in Amersfoort./waargenomen/Wij zitten in Amersfoort./content");
      eqc("scenario 21: en verwijst naar het verslag van de samenvatting (sinds K8 deel 2)", `${synthese[0]?.herkomst_tabel}/${synthese[0]?.herkomst_id}`, `profile_facets/${feit[0]?.id}`);

      const { rows: alles } = await db.client.query("select status from public.klantkennis where profile_id = $1", [merk]);
      ok("scenario 21: het onderzoek zet nooit verklaard of bevestigd", alles.length > 0 && alles.every((r: { status: string }) => r.status === "waargenomen" || r.status === "afgeleid"));

      const { rows: knopen } = await db.client.query("select * from public.profile_offerings where profile_id = $1", [merk]);
      const tweede = await legOnderzoekVast(createShimClient(db.client) as never, merk, kennisUitAanbod(knopen), "profile_offering");
      eqc("scenario 21: dezelfde knopen nog eens vastleggen legt niets nieuws vast", String(tweede.vastgelegd), "0");
    }

    // ── Scenario 22: het gesprek en de antwoorden schrijven in de kennislaag (K5) ──
    //
    // docs/tasks/van-pijplijn-naar-kennissysteem.md K5: de ondernemer beantwoordt
    // een gerichte vraag, de open vraag en een vraag voor het hele merk via
    // `answerFact()`, precies wat de route voor klantantwoorden aanroept. Daarna
    // staan ze in de kennislaag als verklaard, met de reikwijdte van de vraag.
    // Dan het gesprek (velden, aantekeningen) en de keuze bij een
    // tegenstrijdigheid, met dezelfde functies die de routes aanroepen.
    console.log("\nScenario 22: het gesprek en de antwoorden schrijven in de kennislaag (K5)");
    {
      const { answerFact } = await import("@/lib/facts");
      const { legProfielVast, legGesprekVast } = await import("@/lib/kennis/uit-gesprek");
      const { losKennisconflictOp } = await import("@/lib/kennis/uit-overzicht");
      const { legVast } = await import("@/lib/kennis/vastleggen");
      const { setVoorBlokA } = await import("@/lib/kennis/regels");
      const shim = createShimClient(db.client) as never;
      const mens = { actor: "mens" as const, gebruikerId: userId };
      const merk = randomUUID();
      const analyse = randomUUID();
      const pagina = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status, value_props, service_regions)
         values ($1, $2, 'Gesprektest', 'https://gesprek.nl', 'Gesprektest', 'klaar', '{Persoonlijk}', '{Eindhoven}')`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status) values ($1, $2, $3, 'Gesprektest', 'https://gesprek.nl', 'rijlessen', 'gereed')`,
        [analyse, userId, merk],
      );
      await db.client.query(
        `insert into public.content_pieces (id, analysis_id, title, type, status, version, is_current) values ($1, $2, 'Rijlessen', 'article', 'ready', 1, true)`,
        [pagina, analyse],
      );
      const { rows: vragen } = await db.client.query(
        `insert into public.fact_requests (profile_id, analysis_id, question, reason, status, scope, content_piece_ids, open_vraag, raw_json) values
           ($1, $2, 'Hoe ziet een eerste les eruit?', 'r', 'open', 'pagina', $3, false, '{"bron": "pagina_brief", "soort": "werkwijze"}'),
           ($1, $2, 'Wat wil je zelf op deze pagina vertellen?', 'r', 'open', 'pagina', $3, true, null),
           ($1, null, 'Hoeveel leerlingen slagen in één keer?', 'r', 'open', 'merk', '{}', false, '{"bron": "pagina_brief"}')
         returning id, question`,
        [merk, analyse, [pagina]],
      );
      const vraagId = (begin: string) => vragen.find((v: { question: string }) => v.question.startsWith(begin))!.id as string;
      const antwoord = (factId: string, answer: string) =>
        answerFact(shim, { profileId: merk, factId, answer, gebruikerId: userId });

      await antwoord(vraagId("Hoe ziet"), "We rijden eerst op een rustig industrieterrein.");
      await antwoord(vraagId("Wat wil je"), "Onze oudste instructeur geeft al dertig jaar les en kent elke rotonde in Eindhoven.");
      await antwoord(vraagId("Hoeveel"), "80 procent");

      type KennisRij = { id: string; domein: string; soort: string | null; bewering: string; status: string; bron: string; gebruik: string; geldt_voor: string[]; analysis_id: string | null; content_piece_id: string | null; herkomst_tabel: string | null; herkomst_id: string | null; vastgelegd_door: string | null; vervangen_door: string | null; afgewezen_op: string | null; bevestigd_door: string | null; bevestigd_op: string | null; citaat: string | null; bron_url: string | null; verloopt_op: string | null; bewijskracht: string | null };
      const kennis = async () => (await db.client.query("select * from public.klantkennis where profile_id = $1 order by vastgelegd_op, bewering", [merk])).rows as KennisRij[];
      const vanVraag = (rijen: KennisRij[], id: string) => rijen.filter((r) => r.herkomst_tabel === "fact_requests" && r.herkomst_id === id);

      let rijen = await kennis();
      const gericht = vanVraag(rijen, vraagId("Hoe ziet"));
      eqc("scenario 22: de gerichte vraag is één item", String(gericht.length), "1");
      eqc("scenario 22: verklaard, door de klant, als paginatekst", `${gericht[0]?.status}/${gericht[0]?.bron}/${gericht[0]?.gebruik}`, "verklaard/klant/content");
      // V17 (besluit B32): een gericht antwoord geldt voor het hele cluster.
      eqc("scenario 22: met de reikwijdte van de vraag: het cluster, niet alleen deze pagina", `${gericht[0]?.content_piece_id}/${gericht[0]?.analysis_id}`, `null/${analyse}`);
      eqc("scenario 22: geldt voor verwijst naar geen ander item (V13)", (gericht[0]?.geldt_voor ?? []).join(","), "");
      eqc("scenario 22: vastgelegd door wie antwoordde", String(gericht[0]?.vastgelegd_door), userId);
      eqc("scenario 22: met vraag en antwoord samen", gericht[0]?.bewering ?? "", "Hoe ziet een eerste les eruit?\nWe rijden eerst op een rustig industrieterrein.");

      const open = vanVraag(rijen, vraagId("Wat wil je"));
      eqc(
        "scenario 22: de open vraag is een verhaal, letterlijk, verklaard",
        `${open[0]?.domein}/${open[0]?.status}/${open[0]?.bewering}`,
        "verhaal/verklaard/Onze oudste instructeur geeft al dertig jaar les en kent elke rotonde in Eindhoven.",
      );
      eqc("scenario 22: alleen voor deze pagina (B3)", `${open[0]?.content_piece_id}/${open[0]?.analysis_id}`, `${pagina}/${analyse}`);
      const { rows: oudePlek } = await db.client.query("select proof_points from public.profiles where id = $1", [merk]);
      ok("scenario 22: de open vraag gaat nog steeds niet naar de oude bewijspunten", !(oudePlek[0].proof_points ?? []).some((p: string) => p.includes("oudste instructeur")));

      const merkbreed = vanVraag(rijen, vraagId("Hoeveel"));
      eqc("scenario 22: een vraag voor het hele merk geldt merkbreed", `${merkbreed[0]?.status}/${merkbreed[0]?.content_piece_id}/${merkbreed[0]?.analysis_id}`, "verklaard/null/null");

      // Blok A (K6) zal alle drie mogen gebruiken: gezegd door de klant.
      const blokA = setVoorBlokA(rijen, new Date());
      eqc("scenario 22: alle drie mogen straks op een pagina", String(blokA.beweringen.length), "3");

      // Een gewijzigd antwoord: een nieuwe versie, de oude blijft bewaard.
      await antwoord(vraagId("Hoeveel"), "85 procent");
      rijen = await kennis();
      const versies = vanVraag(rijen, vraagId("Hoeveel"));
      const actueel = versies.filter((r) => !r.vervangen_door);
      eqc("scenario 22: een gewijzigd antwoord is een nieuwe versie", actueel.map((r) => r.bewering).join(","), "Hoeveel leerlingen slagen in één keer?\n85 procent");
      eqc("scenario 22: de oude versie wijst naar de nieuwe", String(versies.find((r) => r.vervangen_door)?.vervangen_door), actueel[0]?.id ?? "?");
      const aantal = rijen.length;
      await antwoord(vraagId("Hoeveel"), "85 procent");
      eqc("scenario 22: hetzelfde antwoord opnieuw opslaan legt niets vast", String((await kennis()).length), String(aantal));

      // Het gespreksscherm: een vermoeden van het model weghalen, een plaats
      // toevoegen, en het onderscheid invullen en daarna aanpassen.
      const vermoeden = await legVast(shim, {
        profileId: merk, domein: "positionering", soort: "waardepropositie", bewering: "Persoonlijk",
        status: "afgeleid", bron: "ai", gebruik: "intern", herkomst: { tabel: "profiles", id: merk },
      }, { actor: "model", taak: "profile_research" });
      eqc("scenario 22: het model dacht iets", vermoeden.soort, "vastgelegd");
      const profiel = { value_props: ["Persoonlijk"], service_regions: ["Eindhoven"], differentiator: null as string | null };
      const naGesprek = { value_props: [] as string[], service_regions: ["Eindhoven", "Best"], differentiator: "Elke leerling houdt dezelfde instructeur." };
      const t1 = await legProfielVast(shim, {
        profileId: merk, url: "https://gesprek.nl", velden: ["value_props", "service_regions", "differentiator"],
        oud: profiel, nieuw: naGesprek, bron: "gesprek",
      }, mens);
      eqc("scenario 22: het gesprek: twee nieuw, één weggehaald", `${t1.vastgelegd}/${t1.afgewezen}/${t1.geweigerd}`, "2/1/0");
      rijen = await kennis();
      const best = rijen.find((r) => r.soort === "werkgebied" && r.bewering === "Best");
      eqc("scenario 22: een plaats uit het gesprek is verklaard, door het gesprek", `${best?.status}/${best?.bron}/${best?.gebruik}`, "verklaard/gesprek/content");
      ok("scenario 22: het vermoeden dat de consultant weghaalde, is afgewezen en blijft bewaard", Boolean(rijen.find((r) => r.soort === "waardepropositie")?.afgewezen_op));
      const t2 = await legProfielVast(shim, {
        profileId: merk, url: "https://gesprek.nl", velden: ["differentiator"],
        oud: naGesprek, nieuw: { ...naGesprek, differentiator: "Elke leerling houdt van begin tot eind dezelfde instructeur." }, bron: "gesprek",
      }, mens);
      eqc("scenario 22: een aangepast veld is een nieuwe versie", String(t2.vervangen), "1");
      const onderscheid = (await kennis()).filter((r) => r.soort === "onderscheid");
      eqc("scenario 22: één actuele versie, de oude bewaard", `${onderscheid.length}/${onderscheid.filter((r) => !r.vervangen_door).map((r) => r.bewering).join(",")}`, "2/Elke leerling houdt van begin tot eind dezelfde instructeur.");
      const t3 = await legProfielVast(shim, {
        profileId: merk, url: "https://gesprek.nl", velden: ["service_regions"], oud: naGesprek, nieuw: naGesprek, bron: "gesprek",
      }, mens);
      eqc("scenario 22: een veld opslaan zonder wijziging doet niets", `${t3.vastgelegd}/${t3.vervangen}/${t3.afgewezen}`, "0/0/0");

      // De aantekeningen van het gesprek.
      await legGesprekVast(shim, { profileId: merk, vorige: null, nu: { profile_id: merk, strategy_notes: "Focus op spoedcursussen in de zomer.", context_factors: [] } }, mens);
      const notitie = (await kennis()).find((r) => r.herkomst_tabel === "profile_strategy");
      eqc("scenario 22: de aantekening is verklaard, door het gesprek", `${notitie?.domein}/${notitie?.status}/${notitie?.bron}/${notitie?.vastgelegd_door}`, `positionering/verklaard/gesprek/${userId}`);

      // De keuze bij een tegenstrijdigheid: twee prijzen van de site, die in de
      // kennislaag botsen (sinds K8 deel 2 de enige conflictlijst).
      const feitA = randomUUID();
      const feitB = randomUUID();
      const prijsIds: Record<string, string> = {};
      for (const [id, tekst, url, bedrag] of [[feitA, "Een proefles kost € 45.", "https://gesprek.nl/prijzen", 45], [feitB, "Een proefles kost € 50.", "https://gesprek.nl/acties", 50]] as const) {
        const u = await legVast(shim, {
          profileId: merk, domein: "aanbod", soort: "prijs", bewering: tekst, waarde: { min: bedrag, max: bedrag, eenheid: "EUR" }, status: "waargenomen", bron: "website",
          bronUrl: url, citaat: tekst, gebruik: "content", herkomst: { tabel: "profile_facets", id },
        }, { actor: "code", taak: "profile_synthesis" });
        eqc(`scenario 22: de prijs ${tekst} staat apart in de kennislaag`, u.soort, "vastgelegd");
        if (u.soort === "vastgelegd") prijsIds[id] = u.item.id;
      }
      const { rows: botsing } = await db.client.query("select id from public.fact_conflicts where profile_id = $1 and status = 'open' and kennis_ids is not null", [merk]);
      eqc("scenario 22: de twee prijzen botsen", String(botsing.length), "1");
      const fout = await losKennisconflictOp(shim, { profileId: merk, conflictId: botsing[0].id, winnaarId: prijsIds[feitB] }, userId);
      const keuze = { bevestigd: fout ? 0 : 1, afgewezen: fout ? 0 : 1, geweigerd: fout ? 1 : 0 };
      eqc("scenario 22: de keuze bevestigt er één en wijst er één af", `${keuze.bevestigd}/${keuze.afgewezen}/${keuze.geweigerd}`, "1/1/0");
      rijen = await kennis();
      const prijzen = rijen.filter((r) => r.soort === "prijs");
      const gekozen = prijzen.find((r) => r.herkomst_id === feitB);
      eqc("scenario 22: de gekozen prijs is bevestigd, door de consultant", `${gekozen?.status}/${gekozen?.bevestigd_door}`, `bevestigd/${userId}`);
      ok("scenario 22: de andere prijs is afgewezen, en bewaard", Boolean(prijzen.find((r) => r.herkomst_id === feitA)?.afgewezen_op));
      eqc("scenario 22: en alleen de gekozen prijs mag straks op een pagina", setVoorBlokA(prijzen, new Date()).beweringen.map((r) => r.bewering).join(","), "Een proefles kost € 50.");

      const { rows: statussen } = await db.client.query(
        "select distinct status, case when status = 'bevestigd' then bevestigd_door::text else vastgelegd_door::text end as wie from public.klantkennis where profile_id = $1 and status in ('verklaard', 'bevestigd')",
        [merk],
      );
      ok("scenario 22: verklaard en bevestigd komen alleen van een mens", statussen.length === 2 && statussen.every((r: { wie: string }) => r.wie === userId), JSON.stringify(statussen));
    }

    // ── Scenario 23: van meting naar kans naar voorraad (N2) ──────────────────
    //
    // docs/tasks/van-pijplijn-naar-kennissysteem.md N2: een gemeten cluster met
    // een rapport van twee aanbevelingen. `legKansenVast()` is precies de aanroep
    // die `generateReport()` doet na het opslaan (de AI-stub kent het
    // rapportschema niet, en punt 56 hierboven leunt daarop, dus het rapport zelf
    // staat hier als rij). Dan de voorraad: dezelfde kaarten als vóór N2, nu met
    // hun kans erbij, en een kaart die al bestond vindt zijn kans terug.
    console.log("\nScenario 23: van meting naar kans naar voorraad (N2)");
    {
      const { legKansenVast } = await import("@/lib/kansen/uit-rapport");
      const { syncBacklog } = await import("@/lib/plan-backlog-data");
      const shim = createShimClient(db.client) as never;
      const merk = randomUUID();
      const analyse = randomUUID();
      const aanbod = randomUUID();
      const [p1, p2] = [randomUUID(), randomUUID()];
      const rapport = randomUUID();

      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status, priority_offerings)
         values ($1, $2, 'Kansentest', 'https://kansentest.nl', 'Kansentest', 'klaar', '{Rijles}')`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status)
         values ($1, $2, $3, 'Rijles', 'https://kansentest.nl', 'rijles', 'gereed')`,
        [analyse, userId, merk],
      );
      await db.client.query(
        `insert into public.profile_topics (profile_id, analysis_id, title, priority, status, offering_ids, offering_names)
         values ($1, $2, 'Rijles', 5, 'goedgekeurd', $3, '{Rijles}')`,
        [merk, analyse, [aanbod]],
      );
      // De kennislaag: de dienst van het onderwerp, en twee plaatsen.
      const { rows: kennisRijen } = await db.client.query(
        `insert into public.klantkennis (profile_id, domein, soort, bewering, status, bron, gebruik, vastgelegd_door_taak, herkomst_tabel, herkomst_id) values
           ($1, 'aanbod', 'dienst', 'Rijles', 'afgeleid', 'ai', 'intern', 'kennis_terugvullen', 'profile_offerings', $2),
           ($1, 'identiteit', 'werkgebied', 'Best', 'afgeleid', 'ai', 'intern', 'kennis_terugvullen', 'profiles', null),
           ($1, 'identiteit', 'werkgebied', 'Veldhoven', 'afgeleid', 'ai', 'intern', 'kennis_terugvullen', 'profiles', null)
         returning id, bewering`,
        [merk, aanbod],
      );
      const kennisId = (b: string) => kennisRijen.find((r: { bewering: string }) => r.bewering === b)!.id as string;

      // De meting: ChatGPT mist p1 (en noemt twee concurrenten), noemt p2;
      // AI Overview meet p1 drie keer en mist hem twee keer.
      const meting = async (prompt: string, tekst: string, engine: string, herhaling: number, genoemd: boolean, anderen: string[]): Promise<string> => {
        const run = randomUUID();
        await db.client.query(
          `insert into public.tracking_runs (id, analysis_id, prompt_id, prompt_text_snapshot, prompt_category_snapshot, week_no, purpose, engine, repeat_index, brands_in_answer)
           values ($1, $2, $3, $4, 'Beslissing', 0, 'periodic', $5, $6, $7)`,
          [run, analyse, prompt, tekst, engine, herhaling, anderen.length + (genoemd ? 1 : 0)],
        );
        await db.client.query(
          "insert into public.tracking_run_mentions (tracking_run_id, entity_name, is_own_brand, mentioned) values ($1, 'Kansentest', true, $2)",
          [run, genoemd],
        );
        for (const a of anderen) {
          await db.client.query(
            "insert into public.tracking_run_mentions (tracking_run_id, entity_name, is_own_brand, mentioned) values ($1, $2, false, true)",
            [run, a],
          );
        }
        return run;
      };
      await db.client.query(
        `insert into public.prompts (id, analysis_id, text, category, active) values
           ($1, $3, 'Welke rijschool in Best is goed?', 'Beslissing', true),
           ($2, $3, 'Wat kost rijles?', 'Beslissing', true)`,
        [p1, p2, analyse],
      );
      const chatgptP1 = await meting(p1, "Welke rijschool in Best is goed?", "openai", 0, false, ["Rijschool Wit", "Rijschool Zwart"]);
      // Terloops genoemd (de examenorganisatie): geen concurrent.
      await db.client.query(
        "insert into public.tracking_run_mentions (tracking_run_id, entity_name, is_own_brand, mentioned, mention_role) values ($1, 'CBR', false, true, 'zijdelings')",
        [chatgptP1],
      );
      await meting(p2, "Wat kost rijles?", "openai", 0, true, []);
      await meting(p1, "Welke rijschool in Best is goed?", "google_ai_overview", 0, false, ["Rijschool Wit"]);
      await meting(p1, "Welke rijschool in Best is goed?", "google_ai_overview", 1, false, ["Rijschool Wit"]);
      await meting(p1, "Welke rijschool in Best is goed?", "google_ai_overview", 2, true, []);

      await db.client.query(
        `insert into public.reports (id, analysis_id, period, week_no, recommendations_json) values ($1, $2, 'nulmeting', 0, $3::jsonb)`,
        [
          rapport,
          analyse,
          JSON.stringify([
            {
              title: "Rijles in Best",
              why: "ChatGPT noemt ons niet in Best.",
              type: "landing",
              action: "nieuw",
              existingUrl: "null",
              targetIntent: "Iemand uit Best die een rijschool zoekt",
              targets: [
                { promptId: p1, weight: 0.5, text: "Welke rijschool in Best is goed?" },
                { promptId: p2, weight: 0.3, text: "Wat kost rijles?" },
              ],
            },
            {
              title: "Tarievenpagina verbeteren",
              why: "De prijzen staan verstopt.",
              type: "article",
              action: "verbeteren",
              existingUrl: "https://kansentest.nl/tarieven/",
              targetIntent: "Iemand die wil weten wat rijles kost",
              targets: [{ promptId: p2, weight: 0.3, text: "Wat kost rijles?" }],
            },
          ]),
        ],
      );

      // Een kaart van vóór N2: hij stond al in de voorraad, zonder kans.
      const { rows: oudeKaart } = await db.client.query(
        `insert into public.planned_pages (profile_id, title, page_type, status, sort_order, is_buffer, source, source_analysis_id, source_ref, recommendation_action)
         values ($1, 'Rijles in Best', 'dienst', 'gepland', 0, false, 'aanbeveling', $2, $3, 'nieuw') returning id`,
        [merk, analyse, `${rapport}#0`],
      );

      const eerste = await legKansenVast(shim, rapport);
      eqc("scenario 23: twee aanbevelingen, twee kansen", `${eerste.aangemaakt}/${eerste.bestond}/${eerste.mislukt}`, "2/0/0");
      const tweede = await legKansenVast(shim, rapport);
      eqc("scenario 23: nog een keer maakt niets dubbel (conventie 9)", `${tweede.aangemaakt}/${tweede.bestond}/${tweede.ververst}`, "0/2/0");

      type KansRij = { id: string; sleutel: string; titel: string; lezer: string | null; handeling: string; bestaande_url: string | null; geldt_voor: string[]; commerciele_waarde: string | null; status: string; uitleg: string | null; rapport_id: string; analysis_id: string; vastgelegd_door_taak: string; potentie: string | null };
      const kansen = (await db.client.query("select * from public.kansen where profile_id = $1 order by sleutel", [merk])).rows as KansRij[];
      eqc("scenario 23: de sleutels zijn de oude source_ref", kansen.map((k) => k.sleutel).join(","), `${rapport}#0,${rapport}#1`);
      const [best, tarieven] = kansen;
      eqc("scenario 23: een nieuwe pagina, zonder het adres 'null'", `${best?.handeling}/${best?.bestaande_url}`, "nieuwe_pagina/null");
      eqc("scenario 23: verbeteren met zijn adres", `${tarieven?.handeling}/${tarieven?.bestaande_url}`, "pagina_verbeteren/https://kansentest.nl/tarieven/");
      eqc("scenario 23: met herkomst: rapport, cluster, taak", `${best?.rapport_id}/${best?.analysis_id}/${best?.vastgelegd_door_taak}`, `${rapport}/${analyse}/generate_report`);
      eqc("scenario 23: de dienst heeft voorrang bij dit merk", String(best?.commerciele_waarde), "voorrang");
      // Besluit B32: een kans hangt niet meer aan een dienst, alleen aan de plaats die hij noemt.
      eqc("scenario 23: geldt voor de plaats uit de titel, niet voor een dienst of een andere plaats", [...(best?.geldt_voor ?? [])].sort().join(","), kennisId("Best"));
      eqc("scenario 23: de tarievenkans hangt nergens aan", (tarieven?.geldt_voor ?? []).join(","), "");

      type BewijsRij = { kans_id: string; bron: string; vragen_gemeten: number; vragen_genoemd: number; concurrenten: string[]; run_ids: string[] };
      const bewijs = (await db.client.query("select * from public.kans_bewijs where profile_id = $1 order by bron", [merk])).rows as BewijsRij[];
      const vanKans = (id: string | undefined) => bewijs.filter((b) => b.kans_id === id);
      eqc(
        "scenario 23: het bewijs per bron, met de meerderheid binnen AI Overview",
        vanKans(best?.id).map((b) => `${b.bron}:${b.vragen_genoemd}/${b.vragen_gemeten}:${(b.concurrenten ?? []).join("+")}`).join(" "),
        "ai_overview:0/1:Rijschool Wit chatgpt:1/2:Rijschool Wit+Rijschool Zwart",
      );
      ok("scenario 23: een terloops genoemde naam is geen concurrent", !bewijs.some((b) => (b.concurrenten ?? []).includes("CBR")));
      eqc("scenario 23: het bewijs draagt de regel waarmee het geteld is", String((await db.client.query("select count(*)::int n from public.kans_bewijs where profile_id = $1 and (ruw->>'regel')::int = 2", [merk])).rows[0].n), String(bewijs.length));

      // Bewijs van een oudere regel wordt één keer opnieuw geteld.
      await db.client.query(
        "update public.kans_bewijs set concurrenten = '{CBR}', ruw = '{\"regel\": 1}'::jsonb where kans_id = $1 and bron = 'chatgpt'",
        [best?.id],
      );
      await db.client.query("update public.kansen set uitleg = 'oud' where id = $1", [best?.id]);
      const derde = await legKansenVast(shim, rapport);
      eqc("scenario 23: een kans met oud bewijs wordt opnieuw geteld", `${derde.aangemaakt}/${derde.ververst}`, "0/1");
      const { rows: ververst } = await db.client.query("select b.concurrenten, k.uitleg from public.kans_bewijs b join public.kansen k on k.id = b.kans_id where b.kans_id = $1 and b.bron = 'chatgpt'", [best?.id]);
      eqc("scenario 23: met de juiste concurrenten, en de uitleg mee", `${(ververst[0]?.concurrenten ?? []).join("+")}|${ververst[0]?.uitleg !== "oud"}`, "Rijschool Wit+Rijschool Zwart|true");
      const vierde = await legKansenVast(shim, rapport);
      eqc("scenario 23: en daarna niet nog eens", String(vierde.ververst), "0");

      eqc("scenario 23: de metingen zelf staan erbij", String(vanKans(best?.id).reduce((n, b) => n + (b.run_ids ?? []).length, 0)), "5");
      eqc(
        "scenario 23: de uitleg komt uit het bewijs",
        String(best?.uitleg),
        "ChatGPT noemt je bij 1 van de 2 vragen en noemt twee concurrenten wel. Google AI Overview noemt je niet bij de enige gemeten vraag en noemt één concurrent wel en citeert je site niet.",
      );
      eqc(
        "scenario 23: zonder gemis zegt de uitleg dat ook",
        String(tarieven?.uitleg),
        "ChatGPT noemt je al bij de enige gemeten vraag. Je huidige pagina gaat er deels over.",
      );

      // ── De voorraad ──
      await syncBacklog(shim, merk);
      await syncBacklog(shim, merk);
      type KaartRij = { id: string; title: string; source_ref: string; kans_id: string | null; recommendation_action: string; existing_url: string | null; why: string | null; target_intent: string | null; potential: string | null; target_count: number | null };
      const kaarten = (await db.client.query("select * from public.planned_pages where profile_id = $1 order by source_ref", [merk])).rows as KaartRij[];
      eqc("scenario 23: twee kaarten, geen dubbele na twee rondes", String(kaarten.length), "2");
      eqc("scenario 23: de oude kaart vond zijn kans terug", `${kaarten[0]?.id}/${kaarten[0]?.kans_id}`, `${oudeKaart[0].id}/${best?.id}`);
      eqc("scenario 23: de nieuwe kaart komt uit zijn kans", `${kaarten[1]?.kans_id}/${kaarten[1]?.source_ref}`, `${tarieven?.id}/${rapport}#1`);
      eqc(
        "scenario 23: dezelfde kaart als vóór N2: handeling, adres, tekst, lezer, doelvragen",
        `${kaarten[1]?.recommendation_action}|${kaarten[1]?.existing_url}|${kaarten[1]?.why}|${kaarten[1]?.target_intent}|${kaarten[1]?.target_count}`,
        "verbeteren|https://kansentest.nl/tarieven/|De prijzen staan verstopt.|Iemand die wil weten wat rijles kost|1",
      );
      const naSync = (await db.client.query("select id, potentie from public.kansen where profile_id = $1", [merk])).rows as { id: string; potentie: string | null }[];
      for (const k of kaarten) {
        const kans = naSync.find((r) => r.id === k.kans_id);
        eqc(`scenario 23: de potentie op de kans is die van de kaart (${k.title})`, String(kans?.potentie === null || kans?.potentie === undefined ? null : Number(kans.potentie)), String(k.potential === null ? null : Number(k.potential)));
      }

      // ── Het kennisgat (N6) ──
      const gatVan = async (id: string | undefined) =>
        (await db.client.query("select kennis_ontbreekt, kennis_bekend from public.kansen where id = $1", [id])).rows[0] as { kennis_ontbreekt: string[] | null; kennis_bekend: string[] | null };
      eqc("scenario 23: na de synchronisatie is het kennisgat uitgerekend: bij dit merk ontbreekt alles", (await gatVan(best?.id)).kennis_ontbreekt?.join(",") ?? "null", "werkwijze,prijs,termijn,voorbeeld,voor_wie_niet,bewijs");
      // De klant vertelt hoe het werkt; het model vermoedt een prijs; en er is een
      // verhaal bij een eerdere versie van de pagina van deze kaart.
      const [v1, v2] = [randomUUID(), randomUUID()];
      await db.client.query(
        `insert into public.content_pieces (id, analysis_id, title, type, status, version, is_current) values
           ($1, $3, 'Rijles in Best', 'landing', 'ready', 1, false),
           ($2, $3, 'Rijles in Best', 'landing', 'ready', 2, true)`,
        [v1, v2, analyse],
      );
      await db.client.query("update public.planned_pages set content_piece_id = $1 where id = $2", [v2, oudeKaart[0].id]);
      const { rows: nieuweKennis } = await db.client.query(
        `insert into public.klantkennis (profile_id, domein, soort, bewering, status, bron, gebruik, vastgelegd_door, vastgelegd_door_taak, geldt_voor, analysis_id, content_piece_id) values
           ($1, 'aanbod', 'werkwijze', 'Eerst een proefles.', 'verklaard', 'klant', 'content', $2, null, '{}', null, null),
           ($1, 'aanbod', 'prijs', 'Ongeveer € 60 per les.', 'afgeleid', 'ai', 'intern', null, 'profile_offering', $3, null, null),
           ($1, 'verhaal', 'eigen verhaal', 'Een leerling uit Best slaagde na twee keer.', 'verklaard', 'klant', 'content', $2, null, '{}', $4, $5)
         returning id, soort`,
        [merk, userId, [kennisId("Rijles")], analyse, v1],
      );
      await syncBacklog(shim, merk);
      const naAntwoord = await gatVan(best?.id);
      eqc("scenario 23: wat de klant vertelde, telt; een vermoeden niet", naAntwoord.kennis_ontbreekt?.join(",") ?? "null", "prijs,termijn,voor_wie_niet,bewijs");
      eqc(
        "scenario 23: het verhaal bij de eerdere versie van de pagina telt mee (gevonden in K5)",
        [...(naAntwoord.kennis_bekend ?? [])].sort().join(","),
        nieuweKennis.filter((r: { soort: string }) => r.soort !== "prijs").map((r: { id: string }) => r.id).sort().join(","),
      );
      eqc("scenario 23: de tarievenkans (een artikel) heeft geen verhaal van een andere pagina", (await gatVan(tarieven?.id)).kennis_ontbreekt?.join(",") ?? "null", "voorbeeld,bewijs");

      // V19 (besluit B31): het kennisgat gaat niet meer naar de brief; het
      // wordt nog wel uitgerekend en gelezen.
      const { kennisgatVoorPagina } = await import("@/lib/kennis/voor-pagina");
      ok("scenario 23: het kennisgat van de kans is er nog", (await kennisgatVoorPagina(shim, v2)) !== null);
      eqc("scenario 23: een pagina zonder kans heeft geen kennisgat", String(await kennisgatVoorPagina(shim, v1)), "null");

      // Een rapport zonder kansen (van vóór N2): de voorraad maakt ze alsnog.
      const analyse2 = randomUUID();
      const rapport2 = randomUUID();
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status) values ($1, $2, $3, 'Theorie', 'https://kansentest.nl', 'theorie', 'gereed')`,
        [analyse2, userId, merk],
      );
      await db.client.query(
        `insert into public.reports (id, analysis_id, period, recommendations_json) values ($1, $2, 'nulmeting', $3::jsonb)`,
        [rapport2, analyse2, JSON.stringify([{ title: "Theorie-examen oefenen", action: "nieuw", type: "article" }])],
      );
      await syncBacklog(shim, merk);
      const { rows: vangnet } = await db.client.query(
        "select k.id as kans, p.kans_id from public.kansen k left join public.planned_pages p on p.kans_id = k.id where k.rapport_id = $1",
        [rapport2],
      );
      eqc("scenario 23: een rapport van vóór N2 krijgt zijn kans bij de volgende synchronisatie, met kaart", `${vangnet.length}/${vangnet[0]?.kans === vangnet[0]?.kans_id}`, "1/true");
      const { rows: zonderBewijs } = await db.client.query("select uitleg from public.kansen where rapport_id = $1", [rapport2]);
      eqc("scenario 23: zonder meting: geen gegevens, geen nul", String(zonderBewijs[0]?.uitleg), "Voor deze kans zijn er nog geen gegevens.");

      // V7 en V20: een ander cluster wil dezelfde tarievenpagina verbeteren
      // (andere schrijfwijze van het adres). Dat wordt bewijs bij de kans die
      // er al is, geen tweede kaart.
      const analyse3 = randomUUID();
      const rapport3 = randomUUID();
      const p3 = randomUUID();
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status) values ($1, $2, $3, 'Prijzen', 'https://kansentest.nl', 'prijzen', 'gereed')`,
        [analyse3, userId, merk],
      );
      await db.client.query(
        "insert into public.prompts (id, analysis_id, text, category, active) values ($1, $2, 'Hoeveel kost een rijbewijs in totaal?', 'Beslissing', true)",
        [p3, analyse3],
      );
      const run3 = randomUUID();
      await db.client.query(
        `insert into public.tracking_runs (id, analysis_id, prompt_id, prompt_text_snapshot, prompt_category_snapshot, week_no, purpose, engine, repeat_index, brands_in_answer)
         values ($1, $2, $3, 'Hoeveel kost een rijbewijs in totaal?', 'Beslissing', 0, 'periodic', 'openai', 0, 1)`,
        [run3, analyse3, p3],
      );
      await db.client.query(
        "insert into public.tracking_run_mentions (tracking_run_id, entity_name, is_own_brand, mentioned) values ($1, 'Kansentest', true, false), ($1, 'Rijschool Rood', false, true)",
        [run3],
      );
      await db.client.query(
        `insert into public.reports (id, analysis_id, period, week_no, recommendations_json) values ($1, $2, 'nulmeting', 0, $3::jsonb)`,
        [rapport3, analyse3, JSON.stringify([{
          title: "Wat kost een rijbewijs", why: "x", type: "article", action: "verbeteren",
          existingUrl: "https://www.kansentest.nl/tarieven", targetIntent: "Iemand die de totale prijs wil weten",
          targets: [{ promptId: p3, weight: 0.4, text: "Hoeveel kost een rijbewijs in totaal?" }],
        }])],
      );
      const { rows: tarievenVoor } = await db.client.query(
        "select id from public.kansen where profile_id = $1 and bestaande_url = 'https://kansentest.nl/tarieven/' and status <> 'vervallen'",
        [merk],
      );
      const samen = await legKansenVast(shim, rapport3);
      eqc("V7: een tweede verbetering van dezelfde pagina wordt bewijs", `${samen.aangemaakt}/${samen.samengevoegd}/${samen.mislukt}`, "0/1/0");
      const { rows: tarievenNa } = await db.client.query(
        "select id from public.kansen where profile_id = $1 and handeling = 'pagina_verbeteren' and status <> 'vervallen'",
        [merk],
      );
      eqc("V7: nog steeds één kaart voor die pagina", `${tarievenNa.length}/${tarievenNa[0]?.id === tarievenVoor[0]?.id}`, "1/true");
      const { rows: bewijsNa } = await db.client.query(
        "select vragen_gemeten, concurrenten from public.kans_bewijs where kans_id = $1 and bron = 'chatgpt'",
        [tarievenVoor[0]?.id],
      );
      eqc("V7: het bewijs van het andere cluster telt mee", `${bewijsNa[0]?.vragen_gemeten}/${(bewijsNa[0]?.concurrenten ?? []).includes("Rijschool Rood")}`, "2/true");
      const nogEens = await legKansenVast(shim, rapport3);
      eqc("V7: nog eens aanroepen telt niets dubbel (conventie 9)", `${nogEens.aangemaakt}/${nogEens.samengevoegd}/${nogEens.bestond}`, "0/0/1");
      const { rows: geraakt } = await db.client.query("select count(*)::int as n from public.kansen where rapport_id = $1 and status = 'vervallen'", [rapport3]);
      const { geraaktOverzicht } = await import("@/lib/kansen/impact");
      const overzicht = await geraaktOverzicht(shim, merk);
      ok("V7: de samengevoegde kans staat niet bij 'geraakt door een kenniswijziging'", geraakt[0].n === 1 && overzicht.kansen.every((k) => k.titel !== "Wat kost een rijbewijs"));
    }

    // ── Scenario 24: blok A leest uit de kennislaag (K6, B20) ─────────────────
    //
    // De echte `laadSchrijfbasis()`: wat de schrijver en de controle krijgen. Een
    // vermoeden van het model komt er niet in, wat de klant zei wel; de prijs van
    // de dienst van de kans wel, die van een andere dienst niet; het verhaal bij
    // een eerdere versie van de pagina wel (gevonden in K5); een verbod uit de
    // kennislaag gaat als verbod mee.
    console.log("\nScenario 24: blok A leest uit de kennislaag (K6)");
    {
      const { laadSchrijfbasis } = await import("@/lib/pagina/schrijven");
      const { legVast } = await import("@/lib/kennis/vastleggen");
      const shim = createShimClient(db.client) as never;
      const merk = randomUUID();
      const cluster = randomUUID();
      const [v1, v2] = [randomUUID(), randomUUID()];
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status, value_props)
         values ($1, $2, 'Blok A Test', 'https://blok-a.nl', 'Blok A Test', 'klaar', '{"Snelle service volgens het model"}')`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status) values ($1, $2, $3, 'Blok A', 'https://blok-a.nl', 'ketels', 'gereed')`,
        [cluster, userId, merk],
      );
      await db.client.query(
        `insert into public.content_pieces (id, analysis_id, title, type, status, action, version, is_current) values
           ($1, $3, 'Cv-ketel vervangen', 'landing', 'ready', 'nieuw', 1, false),
           ($2, $3, 'Cv-ketel vervangen', 'landing', 'briefing', 'nieuw', 2, true)`,
        [v1, v2, cluster],
      );
      const site = (bewering: string, extra: Record<string, unknown> = {}) => ({
        profileId: merk, domein: "aanbod", bewering, status: "waargenomen", bron: "website", bronUrl: "https://blok-a.nl", citaat: bewering, gebruik: "content",
        herkomst: { tabel: "profile_offerings", id: randomUUID() }, ...extra,
      });
      const code = { actor: "code", taak: "kennis_terugvullen" } as const;
      const mens = { actor: "mens", gebruikerId: userId } as const;
      const leg = async (item: Record<string, unknown>, door: unknown) => {
        const uit = await legVast(shim, item as never, door as never);
        if (uit.soort === "geweigerd") throw new Error(`Testkennis geweigerd: ${uit.fouten.join(" ")}`);
        return uit.item.id;
      };
      const cv = await leg(site("CV-ketel vervangen: een oude ketel vervangen.", { soort: "dienst" }), code);
      const zon = await leg(site("Zonnepanelen: leggen op het dak.", { soort: "dienst" }), code);
      await leg(site("Een nieuwe cv-ketel kost € 2.400.", { soort: "prijs", geldtVoor: [cv] }), code);
      await leg(site("Zonnepanelen kosten € 4.000.", { soort: "prijs", geldtVoor: [zon] }), code);
      await leg({ profileId: merk, domein: "positionering", soort: "waardepropositie", bewering: "Waarschijnlijk is snelheid het belangrijkste.", status: "afgeleid", bron: "ai", gebruik: "intern", herkomst: { tabel: "profiles", id: merk } }, { actor: "model", taak: "profile_research" });
      await leg({ profileId: merk, domein: "doelgroep", soort: "bezwaar", bewering: "Klanten vinden een ketel duur; wij leggen het verschil in verbruik uit.", status: "verklaard", bron: "gesprek", gebruik: "content" }, mens);
      await leg({ profileId: merk, domein: "verhaal", soort: "eigen verhaal", bewering: "Vorige winter vervingen we in één dag de ketel van een bakkerij.", status: "verklaard", bron: "klant", gebruik: "content", analysisId: cluster, contentPieceId: v1 }, mens);
      await leg({ profileId: merk, domein: "grens", soort: "verboden woord", bewering: "goedkoopste", status: "verklaard", bron: "gesprek", gebruik: "verboden" }, mens);
      const { rows: kans } = await db.client.query(
        `insert into public.kansen (profile_id, analysis_id, titel, handeling, geldt_voor, vastgelegd_door_taak) values ($1, $2, 'Cv-ketel vervangen', 'nieuwe_pagina', $3, 'test') returning id`,
        [merk, cluster, [cv]],
      );
      await db.client.query(
        `insert into public.planned_pages (profile_id, title, page_type, status, sort_order, is_buffer, content_piece_id, kans_id) values ($1, 'Cv-ketel vervangen', 'dienst', 'gepland', 0, false, $2, $3)`,
        [merk, v2, kans[0].id],
      );

      const basis = await laadSchrijfbasis(shim, v2);
      const a = basis?.blokken.bedrijf ?? "";
      ok("scenario 24: een vermoeden van het model komt niet bij de schrijver", !a.includes("Waarschijnlijk") && !a.includes("volgens het model"), a);
      ok("scenario 24: wat de klant in het gesprek zei wel", a.includes("wij leggen het verschil in verbruik uit"));
      ok("scenario 24: de prijs van de dienst van de kans wel, van een andere dienst niet", a.includes("€ 2.400") && !a.includes("€ 4.000"), a);
      ok("scenario 24: het verhaal bij een eerdere versie van de pagina telt mee", a.includes("bakkerij"));
      ok("scenario 24: het verbod gaat mee als verbod, niet als bewering", (basis?.merk.verbodenWoorden ?? []).includes("goedkoopste") && !a.includes("goedkoopste"));
      ok("scenario 24: de controle op harde beweringen gebruikt dezelfde set", (basis?.bronnen ?? []).some((b) => b.includes("€ 2.400")) && !(basis?.bronnen ?? []).some((b) => b.includes("€ 4.000")));
    }

    // ── Scenario 25: het kennisoverzicht (K7) ─────────────────────────────────
    //
    // De vier handelingen van de consultant via `handelOpOverzicht()`, en wat de
    // schrijver daarna krijgt (de echte `laadSchrijfbasis()`): bevestigen zet de
    // status, afwijzen haalt een item uit blok A, aanpassen maakt een nieuwe
    // versie die wel meegaat, "niet op de site" houdt het eruit, en een bevestigd
    // vermoeden mag op een pagina.
    console.log("\nScenario 25: het kennisoverzicht (K7)");
    {
      const { laadSchrijfbasis } = await import("@/lib/pagina/schrijven");
      const { legVast } = await import("@/lib/kennis/vastleggen");
      const { handelOpOverzicht } = await import("@/lib/kennis/uit-overzicht");
      const shim = createShimClient(db.client) as never;
      const merk = randomUUID();
      const cluster = randomUUID();
      const stuk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Overzicht Test', 'https://overzicht.nl', 'Overzicht Test', 'klaar')`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status) values ($1, $2, $3, 'Overzicht', 'https://overzicht.nl', 'dakgoten', 'gereed')`,
        [cluster, userId, merk],
      );
      await db.client.query(
        `insert into public.content_pieces (id, analysis_id, title, type, status, action, version, is_current) values ($1, $2, 'Dakgoot vervangen', 'landing', 'briefing', 'nieuw', 1, true)`,
        [stuk, cluster],
      );
      const code = { actor: "code", taak: "kennis_terugvullen" } as const;
      const mens = { actor: "mens", gebruikerId: userId } as const;
      const leg = async (item: Record<string, unknown>, door: unknown) => {
        const uit = await legVast(shim, { profileId: merk, domein: "aanbod", ...item } as never, door as never);
        if (uit.soort === "geweigerd") throw new Error(`Testkennis geweigerd: ${uit.fouten.join(" ")}`);
        return uit.item.id;
      };
      const site = { status: "waargenomen", bron: "website", bronUrl: "https://overzicht.nl", gebruik: "content", herkomst: { tabel: "profiles", id: merk } };
      const gezien = await leg({ bewering: "Wij werken al 22 jaar in de regio.", citaat: "Wij werken al 22 jaar in de regio.", ...site }, code);
      const fout = await leg({ bewering: "Wij leveren ook zonnepanelen.", citaat: "Wij leveren ook zonnepanelen.", ...site }, code);
      const oud = await leg({ bewering: "Een dakgoot vervangen duurt een dag.", status: "verklaard", bron: "gesprek", gebruik: "content" }, mens);
      const geheim = await leg({ bewering: "Wij werken met onderaannemers uit Polen.", status: "verklaard", bron: "gesprek", gebruik: "content" }, mens);
      const vermoeden = await leg({ domein: "positionering", bewering: "Het bedrijf is sterk in spoedreparaties.", status: "afgeleid", bron: "ai", gebruik: "intern", herkomst: { tabel: "profiles", id: merk } }, { actor: "model", taak: "profile_research" });
      const doe = (itemId: string, actie: string, bewering?: string) => handelOpOverzicht(shim, { profileId: merk, itemId, actie: actie as never, bewering }, userId);
      const rij = async (id: string) => (await db.client.query(`select * from public.klantkennis where id = $1`, [id])).rows[0];

      const bevestigd = await doe(gezien, "bevestigen");
      const r1 = await rij(gezien);
      ok("scenario 25: bevestigen zet de status, met wie en wanneer", bevestigd.ok && r1.status === "bevestigd" && r1.bevestigd_door === userId && r1.bevestigd_op != null, JSON.stringify(bevestigd));
      ok("scenario 25: nog eens bevestigen kan niet", !(await doe(gezien, "bevestigen")).ok);

      const afgewezen = await doe(fout, "afwijzen");
      ok("scenario 25: afwijzen bewaart het item met wie", afgewezen.ok && (await rij(fout)).afgewezen_door === userId);
      ok("scenario 25: een afgewezen item kan niet meer bevestigd worden", !(await doe(fout, "bevestigen")).ok);

      ok("scenario 25: aanpassen zonder nieuwe tekst kan niet", !(await doe(oud, "aanpassen", "  ")).ok);
      const aangepast = await doe(oud, "aanpassen", "Een dakgoot vervangen duurt meestal twee dagen.");
      const r3 = await rij(oud);
      const nieuw = aangepast.ok ? await rij(aangepast.item.id) : null;
      ok(
        "scenario 25: aanpassen maakt een nieuwe versie, verklaard uit het gesprek",
        aangepast.ok && r3.vervangen_door === nieuw?.id && nieuw?.status === "verklaard" && nieuw?.bron === "gesprek" && nieuw?.gebruik === "content",
        JSON.stringify({ r3, nieuw }),
      );
      ok("scenario 25: de oude versie kan niet meer aangepast worden", !(await doe(oud, "aanpassen", "Iets anders.")).ok);

      const eraf = await doe(geheim, "niet_op_site");
      const r4 = await rij(geheim);
      ok("scenario 25: niet op de site zet het gebruik op intern, zelfde rij en status", eraf.ok && r4.gebruik === "intern" && r4.status === "verklaard" && r4.vervangen_door == null);

      const zeker = await doe(vermoeden, "bevestigen");
      const r5 = await rij(vermoeden);
      ok("scenario 25: een bevestigd vermoeden is een feit en mag op een pagina", zeker.ok && r5.status === "bevestigd" && r5.gebruik === "content", r5);

      const ander = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Ander', 'https://ander.nl', 'Ander', 'klaar')`,
        [ander, userId],
      );
      const vreemd = await handelOpOverzicht(shim, { profileId: ander, itemId: gezien, actie: "afwijzen" }, userId);
      ok("scenario 25: een item van een ander merk bestaat hier niet", !vreemd.ok && (await rij(gezien)).afgewezen_op == null);

      const basis = await laadSchrijfbasis(shim, stuk);
      const a = basis?.blokken.bedrijf ?? "";
      ok("scenario 25: het bevestigde item gaat naar de schrijver", a.includes("22 jaar"), a);
      ok("scenario 25: het afgewezen item niet", !a.includes("zonnepanelen"), a);
      ok("scenario 25: de aangepaste tekst wel, de oude niet", a.includes("meestal twee dagen") && !a.includes("duurt een dag"), a);
      ok("scenario 25: wat niet op de site mag niet", !a.includes("Polen"), a);
      ok("scenario 25: het bevestigde vermoeden wel", a.includes("spoedreparaties"), a);

      // Terugzetten (30 september 2026): een afkeuring ongedaan maken.
      ok("scenario 25: terugzetten kan alleen bij een afgekeurd item", !(await doe(gezien, "terugzetten")).ok);
      ok("scenario 25: een vervangen item komt niet terug", !(await doe(oud, "terugzetten")).ok);
      const terug = await doe(fout, "terugzetten");
      const r6 = await rij(fout);
      ok("scenario 25: terugzetten maakt het item weer actueel, zonder wie het afwees", terug.ok && r6.afgewezen_op == null && r6.afgewezen_door == null && r6.status === "waargenomen", JSON.stringify(r6));
      const basis2 = await laadSchrijfbasis(shim, stuk);
      ok("scenario 25: het teruggezette item gaat weer naar de schrijver", (basis2?.blokken.bedrijf ?? "").includes("zonnepanelen"), basis2?.blokken.bedrijf);
      ok("scenario 25: nog eens terugzetten kan niet", !(await doe(fout, "terugzetten")).ok);
      const afgewezenOpnieuw = await doe(fout, "afwijzen");
      ok("scenario 25: en opnieuw afkeuren kan gewoon", afgewezenOpnieuw.ok && (await rij(fout)).afgewezen_op != null);
    }

    // ── Scenario 26: tegenstrijdigheden en "niet van toepassing" (K7 deel 2) ──
    //
    // Sinds K6 leest blok A uit de kennislaag. Wat op de conflictlijst staat,
    // mag daar niet in: sinds K8 deel 2 is dat een botsing tussen kennisitems
    // (het oude feitenregister is weg). De consultant lost een
    // botsing op het conflictscherm op; daarna gaat de gekozen versie wel mee.
    // En "niet van toepassing" op het gespreksscherm wijst af wat er stond.
    console.log("\nScenario 26: tegenstrijdigheden en niet van toepassing (K7)");
    {
      const { laadSchrijfbasis } = await import("@/lib/pagina/schrijven");
      const { legVast } = await import("@/lib/kennis/vastleggen");
      const { losKennisconflictOp } = await import("@/lib/kennis/uit-overzicht");
      const { legProfielVast } = await import("@/lib/kennis/uit-gesprek");
      const { nietVanToepassingVelden, zonderNietVanToepassing } = await import("@/lib/kennis/gesprek");
      const shim = createShimClient(db.client) as never;
      const merk = randomUUID();
      const cluster = randomUUID();
      const stuk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status, differentiator) values ($1, $2, 'Conflict Test', 'https://conflict.nl', 'Conflict Test', 'klaar', 'Wij komen altijd binnen een uur.')`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status) values ($1, $2, $3, 'Conflict', 'https://conflict.nl', 'lekkage', 'gereed')`,
        [cluster, userId, merk],
      );
      await db.client.query(
        `insert into public.content_pieces (id, analysis_id, title, type, status, action, version, is_current) values ($1, $2, 'Lekkage verhelpen', 'landing', 'briefing', 'nieuw', 1, true)`,
        [stuk, cluster],
      );
      const code = { actor: "code", taak: "profile_synthesis" } as const;
      const mens = { actor: "mens", gebruikerId: userId } as const;
      // Sinds K8 deel 2 is er geen oud feitenregister meer dat iets betwist of
      // vervangen noemt; alleen een botsing in de kennislaag houdt iets tegen.
      const siteFeit = async (tekst: string) => {
        const u = await legVast(shim, {
          profileId: merk, domein: "aanbod", soort: "termijn", bewering: tekst, status: "waargenomen", bron: "website",
          bronUrl: "https://conflict.nl", citaat: tekst, gebruik: "content", herkomst: { tabel: "profile_facets", id: randomUUID() },
        } as never, code);
        if (u.soort !== "vastgelegd") throw new Error(`Testkennis: ${u.soort}`);
      };
      await siteFeit("Wij geven vijf jaar garantie.");

      const prijs = (bedrag: number, bron: "website" | "gesprek") =>
        legVast(shim, {
          profileId: merk, domein: "aanbod", soort: "prijs", bewering: `Een lekkage opsporen kost € ${bedrag}.`,
          waarde: { min: bedrag, max: bedrag, eenheid: "EUR" }, status: bron === "website" ? "waargenomen" : "verklaard", bron,
          ...(bron === "website" ? { bronUrl: "https://conflict.nl/prijzen", citaat: `Een lekkage opsporen kost € ${bedrag}.` } : {}),
          gebruik: "content", herkomst: { tabel: "fact_requests", id: randomUUID() },
        } as never, bron === "website" ? code : mens);
      const p1 = await prijs(95, "website");
      const p2 = await prijs(120, "gesprek");
      eqc("scenario 26: twee prijzen voor hetzelfde botsen", p2.soort === "vastgelegd" ? String(p2.botsingen) : p2.soort, "1");

      let a = (await laadSchrijfbasis(shim, stuk))?.blokken.bedrijf ?? "";
      ok("scenario 26: een botsing tussen kennisitems: geen van beide", !a.includes("€ 95") && !a.includes("€ 120"), a);
      ok("scenario 26: wat nergens op botst, gaat wel mee", a.includes("vijf jaar garantie"), a);

      const { rows: botsing } = await db.client.query(`select id from public.fact_conflicts where profile_id = $1 and kennis_ids is not null`, [merk]);
      const winnaarId = p2.soort === "vastgelegd" ? p2.item.id : "";
      const verliezerId = p1.soort === "vastgelegd" ? p1.item.id : "";
      ok("scenario 26: kiezen voor iets buiten de botsing kan niet", Boolean(await losKennisconflictOp(shim, { profileId: merk, conflictId: botsing[0].id, winnaarId: randomUUID() }, userId)));
      const fout = await losKennisconflictOp(shim, { profileId: merk, conflictId: botsing[0].id, winnaarId }, userId);
      const { rows: na } = await db.client.query(`select id, status, afgewezen_op from public.klantkennis where id = any($1)`, [[winnaarId, verliezerId]]);
      const { rows: c2 } = await db.client.query(`select status, opgelost_door from public.fact_conflicts where id = $1`, [botsing[0].id]);
      ok(
        "scenario 26: de keuze bevestigt de ene prijs, wijst de andere af en lost de botsing op",
        !fout && na.find((r) => r.id === winnaarId)?.status === "bevestigd" && Boolean(na.find((r) => r.id === verliezerId)?.afgewezen_op) && c2[0].status === "opgelost" && c2[0].opgelost_door === userId,
        JSON.stringify({ fout, na, c2 }),
      );
      ok("scenario 26: een opgeloste botsing nog eens oplossen kan niet", Boolean(await losKennisconflictOp(shim, { profileId: merk, conflictId: botsing[0].id, winnaarId }, userId)));
      a = (await laadSchrijfbasis(shim, stuk))?.blokken.bedrijf ?? "";
      ok("scenario 26: daarna gaat de gekozen prijs mee, de andere niet", a.includes("€ 120") && !a.includes("€ 95"), a);

      // "Niet van toepassing" op het gespreksscherm.
      const profiel = { differentiator: "Wij komen altijd binnen een uur." };
      await legProfielVast(shim, { profileId: merk, url: "https://conflict.nl", velden: ["differentiator"], oud: {}, nieuw: profiel, bron: "gesprek" }, mens);
      const nvt = nietVanToepassingVelden({ differentiator: true, bestaat_niet: true, value_props: false });
      eqc("scenario 26: alleen de velden die op niet van toepassing gaan", nvt.join(","), "differentiator");
      const t = await legProfielVast(shim, {
        profileId: merk, url: "https://conflict.nl", velden: nvt, oud: profiel, nieuw: zonderNietVanToepassing(profiel, nvt), bron: "gesprek",
      }, mens);
      const { rows: onderscheid } = await db.client.query(
        `select afgewezen_door from public.klantkennis where profile_id = $1 and soort = 'onderscheid' and vervangen_door is null`,
        [merk],
      );
      ok("scenario 26: niet van toepassing wijst af wat er stond, door wie het aanvinkte", t.afgewezen === 1 && onderscheid.length === 1 && onderscheid[0].afgewezen_door === userId, JSON.stringify({ t, onderscheid }));
      a = (await laadSchrijfbasis(shim, stuk))?.blokken.bedrijf ?? "";
      ok("scenario 26: en de schrijver krijgt het niet meer", !a.includes("binnen een uur"), a);
    }

    // ── Scenario 27: stemvoorbeelden en merkdossier in de kennislaag (K8 deel 1) ──
    //
    // Twee plekken schreven klantkennis tot K8 alleen in de oude tabel. De tekst
    // van een stemvoorbeeld wordt waargenomen, een nieuwe tekst op hetzelfde
    // adres een nieuwe versie, een weggehaald adres afgewezen door de mens. Een
    // feit uit een aangeleverd document wordt verklaard met de zin als citaat,
    // en een latere wijziging van dat antwoord een nieuwe versie van dat item.
    console.log("\nScenario 27: stemvoorbeelden en merkdossier in de kennislaag (K8)");
    {
      const { legStemVast } = await import("@/lib/kennis/uit-stem");
      const { legDocumentVast } = await import("@/lib/kennis/uit-gesprek");
      const { answerFact } = await import("@/lib/facts");
      const shim = createShimClient(db.client) as never;
      const merk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Stem Test', 'https://stem.nl', 'Stem Test', 'klaar')`,
        [merk, userId],
      );
      const mens = { actor: "mens", gebruikerId: userId } as const;
      const stemItems = async () =>
        (
          await db.client.query(
            `select id, bron_url, bewering, status, vastgelegd_door_taak, afgewezen_door, vervangen_door from public.klantkennis where profile_id = $1 and soort = 'stemvoorbeeld' order by vastgelegd_op`,
            [merk],
          )
        ).rows;
      const a = "https://stem.nl/over-ons";
      const b = "https://stem.nl/werkwijze";
      const vb = (url: string, tekst: string) => ({ url, tekst, opgehaald_op: new Date().toISOString(), fout: null });
      // Zoals de profielroute: eerst de adressen op het profiel, dan het ophalen.
      const kies = (adressen: string[]) =>
        db.client.query("update public.profiles set stem_voorbeelden = $1::jsonb where id = $2", [JSON.stringify(adressen.map((url) => ({ url, tekst: null, opgehaald_op: null, fout: null }))), merk]);
      const verkeerd = await legStemVast(shim, { profileId: merk, url: "https://stem.nl", voorbeelden: [vb(a, "Oud.")], gekozen: [a] }, mens);
      ok("scenario 27: kloppen de adressen niet meer met het profiel, dan wordt niets bewaard", !verkeerd.bewaard && verkeerd.vastgelegd === 0);
      await kies([a, b]);
      await legStemVast(shim, { profileId: merk, url: "https://stem.nl", voorbeelden: [vb(a, "Wij zijn een familiebedrijf."), vb(b, "Eerst kijken, dan pas prijzen.")], gekozen: [a, b] }, mens);
      const { rows: kopie } = await db.client.query("select stem_voorbeelden from public.profiles where id = $1", [merk]);
      ok("scenario 27: de opgehaalde tekst staat ook op het profiel, de kopie voor de schrijver", (kopie[0].stem_voorbeelden ?? []).every((v: { tekst: string | null }) => v.tekst), JSON.stringify(kopie[0].stem_voorbeelden));
      let rijen = await stemItems();
      ok(
        "scenario 27: twee stemvoorbeelden, waargenomen, vastgelegd door de code",
        rijen.length === 2 && rijen.every((r) => r.status === "waargenomen" && r.vastgelegd_door_taak === "stemvoorbeelden"),
        JSON.stringify(rijen),
      );
      await kies([a]);
      await legStemVast(shim, { profileId: merk, url: "https://stem.nl", voorbeelden: [vb(a, "Wij zijn al dertig jaar een familiebedrijf.")], gekozen: [a] }, mens);
      rijen = await stemItems();
      const actueel = rijen.filter((r) => !r.vervangen_door && !r.afgewezen_door);
      ok("scenario 27: een nieuwe tekst op hetzelfde adres wordt een nieuwe versie", rijen.some((r) => r.bron_url === a && r.vervangen_door) && actueel.some((r) => r.bron_url === a && String(r.bewering).includes("dertig")), JSON.stringify(rijen));
      ok("scenario 27: een weggehaald adres wijst de mens af", rijen.some((r) => r.bron_url === b && r.afgewezen_door === userId), JSON.stringify(rijen));
      eqc("scenario 27: er is één actueel stemvoorbeeld", String(actueel.length), "1");
      await kies([a]);
      await legStemVast(shim, { profileId: merk, url: "https://stem.nl", voorbeelden: [vb(a, "Wij zijn al dertig jaar een familiebedrijf.")], gekozen: [a] }, mens);
      eqc("scenario 27: nog eens opslaan verandert niets", String((await stemItems()).length), String(rijen.length));

      const vraag = randomUUID();
      const documentId = randomUUID();
      await db.client.query(
        `insert into public.brand_documents (id, profile_id, body, content_hash, chars) values ($1, $2, 'Een proefles kost € 45.', 'hash-k8', 23)`,
        [documentId, merk],
      );
      await db.client.query(
        `insert into public.fact_requests (id, profile_id, question, reason, answer, status, scope, raw_json) values ($1, $2, 'Wat kost een proefles?', 'test', '€ 45', 'beantwoord', 'merk', $3::jsonb)`,
        [vraag, merk, JSON.stringify({ bron: "merkdossier" })],
      );
      await legDocumentVast(shim, { profileId: merk, documentId, feiten: [{ vraagId: vraag, question: "Wat kost een proefles?", answer: "€ 45", zin: "Een proefles kost € 45.", verlooptOp: "2027-03-27" }] }, mens);
      const { rows: doc } = await db.client.query(
        `select id, status, bron, citaat, herkomst_tabel, herkomst_id, vastgelegd_door, verloopt_op::text as verloopt_op from public.klantkennis where profile_id = $1 and bron = 'document'`,
        [merk],
      );
      ok(
        "scenario 27: het documentfeit is verklaard, met de zin als citaat en het document als herkomst",
        doc.length === 1 && doc[0].status === "verklaard" && doc[0].citaat === "Een proefles kost € 45." && doc[0].herkomst_tabel === "brand_documents" && doc[0].herkomst_id === documentId && doc[0].vastgelegd_door === userId,
        JSON.stringify(doc),
      );
      ok("scenario 27: en verloopt zoals het document het zei", String(doc[0]?.verloopt_op).startsWith("2027-03-27"), String(doc[0]?.verloopt_op));
      await answerFact(shim, { profileId: merk, factId: vraag, answer: "€ 50", gebruikerId: userId });
      const { rows: na } = await db.client.query(
        `select bewering, bron, vervangen_door from public.klantkennis where profile_id = $1 and (herkomst_tabel = 'fact_requests' or bron = 'document') order by vastgelegd_op`,
        [merk],
      );
      ok(
        "scenario 27: een gewijzigd antwoord wordt een nieuwe versie van het documentfeit",
        na.length === 2 && na[0].bron === "document" && na[0].vervangen_door && na[1].bron === "klant" && String(na[1].bewering).includes("€ 50"),
        JSON.stringify(na),
      );
    }

    // ── Scenario 28: het merkprofiel als kopie van de kennislaag (K8 deel 3) ──
    //
    // Alleen lib/kennis/ schrijft een kennisveld op profiles (V22). Het
    // gespreksscherm slaat de kopie en de kennis in één handeling op; wijst de
    // consultant op het kennisoverzicht een naam af, of past hij een concurrent
    // aan, dan volgt de kopie die de meting leest.
    console.log("\nScenario 28: het merkprofiel als kopie van de kennislaag (K8 deel 3)");
    {
      const { slaProfielOp } = await import("@/lib/kennis/uit-gesprek");
      const { handelOpOverzicht } = await import("@/lib/kennis/uit-overzicht");
      const shim = createShimClient(db.client) as never;
      const merk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Kopie Test', 'https://kopie.nl', 'Kopie Test', 'klaar')`,
        [merk, userId],
      );
      const mens = { actor: "mens", gebruikerId: userId } as const;
      const { error } = await slaProfielOp(shim, {
        profileId: merk, url: "https://kopie.nl",
        kolommen: { aliases: ["Kopie", "KT Installatie"], competitors: ["Warmte Oost"], edited_by_user: true },
        oud: { aliases: [], competitors: [] }, velden: ["aliases", "competitors"], bron: "gesprek",
      }, mens);
      ok("scenario 28: opslaan lukt", error === null, String(error));
      const profiel = async () => (await db.client.query("select aliases, competitors, edited_by_user from public.profiles where id = $1", [merk])).rows[0];
      const p1 = await profiel();
      ok("scenario 28: de kopie staat op het profiel", JSON.stringify(p1.aliases) === JSON.stringify(["Kopie", "KT Installatie"]) && p1.edited_by_user === true, JSON.stringify(p1));
      const item = async (bewering: string) =>
        (await db.client.query("select id, status from public.klantkennis where profile_id = $1 and bewering = $2 and vervangen_door is null", [merk, bewering])).rows[0];
      eqc("scenario 28: en de kennis is verklaard", String((await item("KT Installatie"))?.status), "verklaard");

      const af = await handelOpOverzicht(shim, { profileId: merk, itemId: (await item("KT Installatie")).id, actie: "afwijzen" }, userId);
      ok("scenario 28: de consultant wijst een naam af", af.ok);
      eqc("scenario 28: de meting telt er niet meer op", JSON.stringify((await profiel()).aliases), JSON.stringify(["Kopie"]));
      const aan = await handelOpOverzicht(shim, { profileId: merk, itemId: (await item("Warmte Oost")).id, actie: "aanpassen", bewering: "Warmte Oost BV" }, userId);
      ok("scenario 28: de consultant past een concurrent aan", aan.ok);
      eqc("scenario 28: de kopie volgt", JSON.stringify((await profiel()).competitors), JSON.stringify(["Warmte Oost BV"]));
    }

    // ── Scenario 29: de aanbodboom via de kennislaag (K8 deel 4) ─────────────
    //
    // Een mens voegt een dienst toe onder een categorie, past hem aan, haalt hem
    // weg en zet hem terug. Elke stap verandert de tabel (de kopie die de
    // onderwerpen lezen) en de kennislaag: toevoegen en aanpassen is verklaard,
    // met de ouder in geldt_voor; weghalen wijst af, door wie het deed.
    console.log("\nScenario 29: de aanbodboom via de kennislaag (K8 deel 4)");
    {
      const { voegKnoopToe, werkKnoopBij, haalKnopenWeg, zetKnoopTerug } = await import("@/lib/kennis/uit-aanbod");
      const shim = createShimClient(db.client) as never;
      const merk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Aanbod Test', 'https://aanbod.nl', 'Aanbod Test', 'klaar')`,
        [merk, userId],
      );
      const mens = { actor: "mens", gebruikerId: userId } as const;
      const cat = await voegKnoopToe(shim, { profileId: merk, rij: { kind: "categorie", name: "Verwarming", source: "consultant", sort_order: 0 } }, mens);
      const dienst = await voegKnoopToe(shim, { profileId: merk, rij: { kind: "dienst", name: "Warmtepomp", price_indication: "vanaf € 9.500", parent_id: cat.id, source: "consultant", sort_order: 1 } }, mens);
      ok("scenario 29: twee knopen toegevoegd", Boolean(cat.id && dienst.id), JSON.stringify({ cat, dienst }));
      const items = async () =>
        (
          await db.client.query(
            `select id, soort, bewering, status, geldt_voor, vervangen_door, afgewezen_door from public.klantkennis where profile_id = $1 and herkomst_tabel = 'profile_offerings' order by vastgelegd_op, bewering`,
            [merk],
          )
        ).rows;
      let rijen = await items();
      const catItem = rijen.find((r) => r.bewering === "Verwarming");
      const dienstItem = rijen.find((r) => r.soort === "dienst" && !r.vervangen_door);
      const prijsItem = rijen.find((r) => r.soort === "prijs");
      ok("scenario 29: de dienst is verklaard en hangt aan zijn categorie", dienstItem?.status === "verklaard" && (dienstItem?.geldt_voor ?? []).includes(catItem?.id), JSON.stringify(rijen));
      ok("scenario 29: de prijs hangt aan de dienst", (prijsItem?.geldt_voor ?? []).includes(dienstItem?.id), JSON.stringify(prijsItem));

      // Een sitefeit dat bij de dienst hoort (zoals de indeling hem koppelt).
      const { legVast } = await import("@/lib/kennis/vastleggen");
      const { naarActueleVersies } = await import("@/lib/kennis/versies");
      const feit = await legVast(shim, {
        profileId: merk, domein: "aanbod", soort: "termijn", bewering: "Een warmtepomp hangt binnen twee weken.", status: "waargenomen", bron: "website",
        bronUrl: "https://aanbod.nl/warmtepomp", citaat: "binnen twee weken", gebruik: "content", geldtVoor: [dienstItem!.id], herkomst: { tabel: "profile_facets", id: randomUUID() },
      } as never, { actor: "code", taak: "test" });
      await werkKnoopBij(shim, { profileId: merk, knoopId: dienst.id!, wijziging: { name: "Hybride warmtepomp", source: "consultant" } }, mens);
      rijen = await items();
      const nieuweDienst = rijen.find((r) => r.soort === "dienst" && !r.vervangen_door && !r.afgewezen_door);
      eqc("scenario 29: aanpassen maakt een nieuwe versie", String(nieuweDienst?.bewering), "Hybride warmtepomp");
      ok("scenario 29: de oude versie blijft bewaard", rijen.some((r) => r.bewering === "Warmtepomp" && r.vervangen_door));
      const { rows: tabel } = await db.client.query("select name from public.profile_offerings where id = $1", [dienst.id]);
      eqc("scenario 29: en de tabel volgt", String(tabel[0]?.name), "Hybride warmtepomp");
      const { rows: feitNa } = await db.client.query("select geldt_voor from public.klantkennis where id = $1", [feit.soort === "vastgelegd" ? feit.item.id : ""]);
      ok("scenario 29: wat bij de dienst hoorde, wijst nu naar de nieuwe versie", (feitNa[0]?.geldt_voor ?? []).includes(nieuweDienst?.id), JSON.stringify(feitNa));
      eqc("scenario 29: en een kans die de oude versie noemt, vindt de nieuwe", (await naarActueleVersies(shim, merk, [dienstItem!.id])).join(","), String(nieuweDienst?.id));

      await haalKnopenWeg(shim, { profileId: merk, knoopIds: [dienst.id!] }, mens);
      rijen = await items();
      ok("scenario 29: weghalen wijst de dienst en zijn prijs af, door wie het deed", rijen.filter((r) => !r.vervangen_door && r.bewering !== "Verwarming").every((r) => r.afgewezen_door === userId), JSON.stringify(rijen));
      await zetKnoopTerug(shim, { profileId: merk, knoopId: dienst.id! }, mens);
      rijen = await items();
      ok("scenario 29: terugzetten maakt hem weer actueel", rijen.some((r) => r.soort === "dienst" && r.bewering === "Hybride warmtepomp" && !r.vervangen_door && !r.afgewezen_door), JSON.stringify(rijen));
    }

    // ── Scenario 30: één keer vertellen, altijd gebruikt (A2) ───────────────
    //
    // Twee pagina's over dezelfde dienst. De ondernemer beantwoordt een vraag
    // van de eerste over hoe het in zijn werk gaat, en vertelt een voorbeeld uit
    // de praktijk. Het antwoord over de werkwijze geldt voor de dienst: de
    // tweede pagina krijgt het in blok A, en het kennisgat van haar kans vraagt
    // er niet meer naar. Het voorbeeld blijft bij de eerste pagina (B3).
    console.log("\nScenario 30: één keer vertellen, altijd gebruikt (A2)");
    {
      const { answerFact } = await import("@/lib/facts");
      const { kennisVoor } = await import("@/lib/kennis/voor-pagina");
      const { werkKennisgatBij } = await import("@/lib/kansen/uit-rapport");
      const shim = createShimClient(db.client) as never;
      const merk = randomUUID();
      const cluster = randomUUID();
      const [p1, p2] = [randomUUID(), randomUUID()];
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Dienst Test', 'https://dienst.nl', 'Dienst Test', 'klaar')`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status) values ($1, $2, $3, 'Warmtepompen', 'https://dienst.nl', 'warmtepomp', 'gereed')`,
        [cluster, userId, merk],
      );
      await db.client.query(
        `insert into public.content_pieces (id, analysis_id, title, type, status, action, version, is_current) values
           ($1, $3, 'Warmtepomp installeren', 'landing', 'briefing', 'nieuw', 1, true),
           ($2, $3, 'Warmtepomp onderhoud', 'landing', 'briefing', 'nieuw', 1, true)`,
        [p1, p2, cluster],
      );
      const { rows: dienst } = await db.client.query(
        `insert into public.klantkennis (profile_id, domein, soort, bewering, status, bron, bron_url, citaat, gebruik, vastgelegd_door_taak, herkomst_tabel) values
           ($1, 'aanbod', 'dienst', 'Warmtepomp', 'waargenomen', 'website', 'https://dienst.nl', 'Warmtepomp', 'content', 'test', 'profile_offerings')
         returning id`,
        [merk],
      );
      const dienstId = dienst[0].id as string;
      const kans = async (titel: string, stuk: string) => {
        const { rows } = await db.client.query(
          `insert into public.kansen (profile_id, analysis_id, titel, handeling, geldt_voor, ruw, vastgelegd_door_taak) values ($1, $2, $3, 'nieuwe_pagina', $4, '{"type":"landing"}'::jsonb, 'test') returning id`,
          [merk, cluster, titel, [dienstId]],
        );
        await db.client.query(`insert into public.planned_pages (profile_id, title, content_piece_id, kans_id) values ($1, $2, $3, $4)`, [merk, titel, stuk, rows[0].id]);
        return rows[0].id as string;
      };
      await kans("Warmtepomp installeren", p1);
      const kans2 = await kans("Warmtepomp onderhoud", p2);
      const vraag = async (tekst: string, soort: string) => {
        const { rows } = await db.client.query(
          `insert into public.fact_requests (profile_id, analysis_id, question, reason, status, scope, content_piece_ids, raw_json) values ($1, $2, $3, 'test', 'open', 'pagina', $4, $5::jsonb) returning id`,
          [merk, cluster, tekst, [p1], JSON.stringify({ bron: "pagina_brief", soort })],
        );
        return rows[0].id as string;
      };
      const werkwijze = await vraag("Hoe verloopt een installatie bij jullie?", "werkwijze");
      const praktijk = await vraag("Kun je een voorbeeld geven van een recente installatie?", "praktijk");
      await answerFact(shim, { profileId: merk, factId: werkwijze, answer: "Eerst een adviesbezoek, dan binnen twee weken de installatie in één dag.", gebruikerId: userId });
      await answerFact(shim, { profileId: merk, factId: praktijk, answer: "Vorige maand een jaren-dertigwoning in Tiel, met vloerverwarming beneden.", gebruikerId: userId });

      const { rows: items } = await db.client.query(
        `select herkomst_id, geldt_voor, content_piece_id, analysis_id, soort from public.klantkennis where profile_id = $1 and herkomst_tabel = 'fact_requests'`,
        [merk],
      );
      const vanVraag = (id: string) => items.find((r) => r.herkomst_id === id);
      // V17 (besluit B32): voor het cluster, niet meer voor een dienst.
      ok("scenario 30: het antwoord over de werkwijze geldt voor het cluster", vanVraag(werkwijze)?.analysis_id === cluster && (vanVraag(werkwijze)?.geldt_voor ?? []).length === 0 && !vanVraag(werkwijze)?.content_piece_id, JSON.stringify(items));
      eqc("scenario 30: het voorbeeld blijft bij de eerste pagina", String(vanVraag(praktijk)?.content_piece_id), p1);

      const blokA2 = await kennisVoor(shim, { profileId: merk, analysisId: cluster, pieceId: p2, titel: "Warmtepomp onderhoud", zoekintentie: null });
      const teksten2 = blokA2.beweringen.map((b) => b.bewering).join(" | ");
      ok("scenario 30: de tweede pagina krijgt het antwoord in blok A", teksten2.includes("adviesbezoek"), teksten2);
      ok("scenario 30: maar niet het voorbeeld van de eerste", !teksten2.includes("Tiel"), teksten2);

      await werkKennisgatBij(shim, merk);
      const { rows: gat } = await db.client.query("select kennis_ontbreekt from public.kansen where id = $1", [kans2]);
      ok("scenario 30: het kennisgat van de tweede kans vraagt niet meer naar de werkwijze", !(gat[0]?.kennis_ontbreekt ?? ["werkwijze"]).includes("werkwijze"), JSON.stringify(gat));
      ok("scenario 30: wel nog naar een eigen voorbeeld", (gat[0]?.kennis_ontbreekt ?? []).includes("voorbeeld"), JSON.stringify(gat));
      // De brief van de tweede pagina (A1) krijgt daardoor één punt minder om naar te vragen.
      const { kennisgatVoorPagina } = await import("@/lib/kennis/voor-pagina");
      const gatBrief = (await kennisgatVoorPagina(shim, p2)) ?? [];
      ok("scenario 30: de brief van de tweede pagina vraagt niet meer hoe het in zijn werk gaat", !gatBrief.includes("hoe het in zijn werk gaat") && gatBrief.includes("een voorbeeld uit de praktijk"), gatBrief.join(" | "));

      // Een gewijzigd antwoord blijft voor de dienst gelden, als nieuwe versie.
      await answerFact(shim, { profileId: merk, factId: werkwijze, answer: "Eerst een adviesbezoek, dan binnen drie weken de installatie in één dag.", gebruikerId: userId });
      const { rows: versies } = await db.client.query(
        `select bewering, geldt_voor, analysis_id, vervangen_door from public.klantkennis where profile_id = $1 and herkomst_id = $2 order by vastgelegd_op`,
        [merk, werkwijze],
      );
      ok(
        "scenario 30: een gewijzigd antwoord is een nieuwe versie, weer voor het cluster",
        versies.length === 2 && Boolean(versies[0].vervangen_door) && versies[1].analysis_id === cluster && String(versies[1].bewering).includes("drie weken"),
        JSON.stringify(versies),
      );
    }

    // ── Scenario 31: de controle leest ook de FAQ en de metabeschrijving (C1, B19) ──
    //
    // Een verzonnen prijs die alleen in een FAQ-antwoord staat, en een verzonnen
    // belofte die alleen in de metabeschrijving staat: allebei worden ze geel,
    // net als een zin in de hoofdtekst. De eindredacteur krijgt de FAQ en de
    // metabeschrijving in zijn invoer. Goedkeuren kan pas als ook die gele
    // zinnen bevestigd zijn.
    console.log("\nScenario 31: de controle leest ook de FAQ en de metabeschrijving (C1, B19)");
    {
      const { runJob } = await import("@/lib/jobs/handlers");
      const { bevestigZin, keurGoed } = await import("@/lib/pagina/goedkeuren");
      const merk = randomUUID();
      const cluster = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Hovenier C1', 'https://hovenier-c1.nl', 'Hovenier C1', 'klaar')`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status) values ($1, $2, $3, 'Hovenier C1, tuinen', 'https://hovenier-c1.nl', 'tuinen', 'gereed')`,
        [cluster, userId, merk],
      );
      const { rows: stuk } = await db.client.query(
        `insert into public.content_pieces
           (analysis_id, title, type, status, action, version, is_current, body_markdown, meta_description, faq_json, brief_json)
         values ($1, 'Tuinontwerp laten maken', 'landing', 'draft', 'nieuw', 1, true,
           'Wij ontwerpen tuinen op maat, passend bij hoe je leeft.',
           'Tuinontwerp met 10 jaar garantie.',
           $2::jsonb,
           '{"onderzoek":null,"bedrijf":{"feiten":[]},"versie":1}')
         returning id`,
        [cluster, JSON.stringify([{ q: "Wat kost een tuinontwerp?", a: "Een tuinontwerp kost € 900." }])],
      );
      const pieceId = stuk[0].id as string;

      const aanroepen: { schema: string; user: string }[] = [];
      __setTestTransport((async (opts: { schemaName: string; user: string; schema: { parse: (x: unknown) => unknown } }) => {
        aanroepen.push({ schema: opts.schemaName, user: opts.user });
        let antwoord: unknown;
        if (opts.schemaName === "pagina_controle") {
          antwoord = { oordeel: "goed", verzonnen: [], punten: [] };
        } else if (opts.schemaName === "pagina") {
          // De herschrijving houdt dezelfde onbewezen prijs en belofte vast: de
          // schrijver corrigeert niet vanzelf, en dat is precies waarom code het
          // moet vinden.
          antwoord = {
            titel: "Tuinontwerp laten maken",
            meta_titel: "Tuinontwerp laten maken",
            meta_beschrijving: "Tuinontwerp met 10 jaar garantie.",
            tekst_markdown: "Wij ontwerpen tuinen op maat, passend bij hoe je leeft.",
            faq: [{ vraag: "Wat kost een tuinontwerp?", antwoord: "Een tuinontwerp kost € 900." }],
            notitie_voor_ondernemer: null,
          };
        } else throw new Error(`onverwacht schema ${opts.schemaName}`);
        return { parsed: opts.schema.parse(antwoord), raw: { stub: true } };
      }) as never);

      async function wachtrij(type: string): Promise<Record<string, unknown>[]> {
        const { rows } = await db.client.query(
          "select * from public.jobs where type = $1 and status = 'queued' and analysis_id = $2 order by created_at asc",
          [type, cluster],
        );
        return rows;
      }
      async function draai(type: string): Promise<void> {
        for (let i = 0; i < 20; i++) {
          const [taak] = await wachtrij(type);
          if (!taak) break;
          await db.client.query("update public.jobs set status = 'running' where id = $1", [taak.id]);
          await runJob({ admin: admin as never, job: { ...taak, status: "running" } as never });
          await db.client.query("update public.jobs set status = 'done' where id = $1", [taak.id]);
        }
      }
      async function haalStuk(): Promise<Record<string, unknown>> {
        const { rows } = await db.client.query("select * from public.content_pieces where id = $1", [pieceId]);
        return rows[0];
      }

      await db.client.query(
        "insert into public.jobs (type, payload_json, analysis_id, dedupe_key, status) values ('pagina_controle', $1, $2, 'test-c1-controle', 'queued')",
        [JSON.stringify({ pieceId }), cluster],
      );
      await draai("pagina_controle");

      const controleAanroep = aanroepen.find((a) => a.schema === "pagina_controle");
      ok(
        "scenario 31: de eindredacteur krijgt de metabeschrijving en de FAQ mee",
        Boolean(
          controleAanroep?.user.includes("DE METABESCHRIJVING VOOR ZOEKMACHINES") &&
            controleAanroep.user.includes("10 jaar garantie") &&
            controleAanroep.user.includes("DE VEELGESTELDE VRAGEN") &&
            controleAanroep.user.includes("Een tuinontwerp kost € 900."),
        ),
        controleAanroep?.user,
      );

      const naControle = await haalStuk();
      const cj1 = naControle.controle_json as { ongedekt: string[] };
      ok(
        "scenario 31: de onbewezen prijs in de FAQ en de belofte in de metabeschrijving zijn ongedekt, de hoofdtekst niet",
        cj1.ongedekt.some((z) => z.includes("€ 900")) &&
          cj1.ongedekt.some((z) => z.includes("10 jaar garantie")) &&
          !cj1.ongedekt.some((z) => z.includes("op maat")),
        JSON.stringify(cj1),
      );
      // V15 (besluit B-e): alleen een ongedekte zin in code is geen reden om te
      // herschrijven. De zinnen worden geel en de ondernemer beslist.
      ok("scenario 31: ongedekt in code alleen herschrijft niet (V15)", (await wachtrij("pagina_herschrijven")).length === 0);

      const naHerschrijven = await haalStuk();
      ok("scenario 31: direct klaar om te lezen", naHerschrijven.status === "ready" && naHerschrijven.needs_review === true);
      const cj2 = naHerschrijven.controle_json as { gele_zinnen: string[] };
      ok(
        "scenario 31: de twee zinnen zijn geel",
        cj2.gele_zinnen.some((z) => z.includes("€ 900")) && cj2.gele_zinnen.some((z) => z.includes("10 jaar garantie")),
        JSON.stringify(cj2),
      );

      const nogGeel1 = await keurGoed(admin as never, { pieceId, analysisId: cluster, userId });
      ok("scenario 31: goedkeuren kan niet met de FAQ-zin en de metabeschrijving nog geel", !nogGeel1.ok && nogGeel1.status === 409 && nogGeel1.geel === 2, JSON.stringify(nogGeel1));

      const faqZin = cj2.gele_zinnen.find((z) => z.includes("€ 900"))!;
      const metaZin = cj2.gele_zinnen.find((z) => z.includes("10 jaar garantie"))!;
      const bevestigdFaq = await bevestigZin(admin as never, { pieceId, analysisId: cluster, zin: faqZin });
      ok("scenario 31: de FAQ-zin is te bevestigen als elke andere gele zin", bevestigdFaq.ok);
      const nogEen = await keurGoed(admin as never, { pieceId, analysisId: cluster, userId });
      ok("scenario 31: met de metabeschrijving nog open kan het nog niet", !nogEen.ok && nogEen.geel === 1);
      await bevestigZin(admin as never, { pieceId, analysisId: cluster, zin: metaZin });
      const klaar = await keurGoed(admin as never, { pieceId, analysisId: cluster, userId });
      ok("scenario 31: na bevestigen van beide kan het goedgekeurd worden", klaar.ok && (await haalStuk()).needs_review === false, JSON.stringify(klaar));

      __setTestTransport(createOpenAiStub(log));
    }

    // ── Scenario 32: M3, AI Overview meet ook mee, en de eigen pagina wordt herkend
    // in citaten (van-pijplijn-naar-kennissysteem.md, migratie 0120) ─────────
    //
    // Twee losse dingen, allebei zonder een echte AI-aanroep te doen: (1) staat
    // AI_OVERVIEW_ENABLED aan, dan plant `planImpactMeasurements()` naast de
    // ChatGPT-taak ook een `measure_ai_overview`-taak, met dezelfde
    // impact-markering (pagina, golf, soort); (2) `computeImpact()` rekent uit of
    // het gepubliceerde adres geciteerd is, over BEIDE bronnen tegelijk (geen
    // filter op `engine`), met dezelfde normalisatie als `isRedirectedElsewhere()`.
    console.log("\nScenario 32: M3, AI Overview bij de effectmeting en de citatie van de eigen pagina");
    {
      const { planImpactMeasurements, computeImpact } = await import("@/lib/pipeline/impact");
      const merk = randomUUID();
      const cluster = randomUUID();
      const stuk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Zonnehof Makelaars', 'https://zonnehof-makelaars.nl', 'Zonnehof Makelaars', 'klaar')`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status) values ($1, $2, $3, 'Zonnehof, huis verkopen', 'https://zonnehof-makelaars.nl', 'huis verkopen', 'gereed')`,
        [cluster, userId, merk],
      );
      // Precies één actieve vraag, en die is meteen de doelvraag: dan kiest
      // `pickControlPrompts()` niets (er is niets onbeclaimds), en blijft de
      // telling hieronder simpel: één kandidaat, geen controlegroep.
      const { rows: prompts } = await db.client.query(
        `insert into public.prompts (analysis_id, text, category, active) values
           ($1, 'Wat kost een makelaar bij het verkopen van je huis?', 'Oriëntatie', true)
         returning id, text`,
        [cluster],
      );
      const doelvraag = prompts[0].id as string;
      await db.client.query(
        `insert into public.content_pieces (id, analysis_id, title, type, status, action, is_current, published_at, published_url)
         values ($1, $2, 'Wat kost een makelaar', 'article', 'ready', 'nieuw', true, now(), 'https://zonnehof-makelaars.nl/wat-kost-een-makelaar')`,
        [stuk, cluster],
      );
      // Sinds M1 leest planImpactMeasurements() het meetplan (bevroren bij het
      // goedkeuren), niet meer content_piece_targets. `bronnen` bevriest welke
      // motoren op dát moment meededen; hieronder simuleren we eerst een
      // goedkeuring vóórdat AI Overview aanstond, en daarna eentje waarbij het
      // wél aanstond, zonder de omgevingsvariabele zelf aan te raken.
      await db.client.query(
        `insert into public.meetplannen (content_piece_id, analysis_id, doelvragen, bronnen)
         values ($1, $2, $3::jsonb, '{openai}')`,
        [stuk, cluster, JSON.stringify([{ promptId: doelvraag, tekst: "Wat kost een makelaar bij het verkopen van je huis?" }])],
      );

      // ── (1) Inplannen: alleen de bronnen die het meetplan bevroor ─────────
      const taken = async () =>
        (
          await db.client.query(
            "select type, payload_json from public.jobs where analysis_id = $1 and (payload_json->'impact'->>'contentPieceId') = $2 order by type",
            [cluster, stuk],
          )
        ).rows as { type: string; payload_json: { impact?: { purpose: string; wave: number } } }[];
      const zonderAio = await planImpactMeasurements(admin as never, { analysisId: cluster, contentPieceId: stuk, wave: 1 });
      eqc("scenario 32: bevroren zonder AI Overview: alleen de ChatGPT-taak", String(zonderAio.planned), "1");
      ok("scenario 32: en geen measure_ai_overview", !(await taken()).some((t) => t.type === "measure_ai_overview"));

      await db.client.query("delete from public.jobs where analysis_id = $1", [cluster]);
      await db.client.query("update public.meetplannen set bronnen = '{openai,ai_overview}' where content_piece_id = $1", [stuk]);
      const metAio = await planImpactMeasurements(admin as never, { analysisId: cluster, contentPieceId: stuk, wave: 1 });
      eqc("scenario 32: bevroren mét AI Overview: ook de Google-taak, dezelfde golf", String(metAio.planned), "2");
      const beide = await taken();
      ok(
        "scenario 32: allebei met dezelfde impact-markering (pagina, golf, soort)",
        beide.every((t) => t.payload_json.impact?.purpose === "impact" && t.payload_json.impact?.wave === 1) &&
          beide.some((t) => t.type === "measure_prompt") &&
          beide.some((t) => t.type === "measure_ai_overview"),
        JSON.stringify(beide),
      );
      const nogEens = await planImpactMeasurements(admin as never, { analysisId: cluster, contentPieceId: stuk, wave: 1 });
      eqc("scenario 32: nog eens inplannen levert niets extra's op (al ingepland)", String(nogEens.planned), "0");

      // ── (2) computeImpact(): de citatie over beide bronnen tegelijk ───────
      // Een periodieke meting van vóór publicatie, zodat er een eerlijke "voor"-stand is.
      const { rows: voorRun } = await db.client.query(
        `insert into public.tracking_runs (analysis_id, prompt_id, prompt_text_snapshot, prompt_category_snapshot, engine, week_no, purpose, ran_at)
         values ($1, $2, 'Wat kost een makelaar bij het verkopen van je huis?', 'Oriëntatie', 'openai', 3, 'periodic', now() - interval '30 days')
         returning id`,
        [cluster, doelvraag],
      );
      await db.client.query(
        `insert into public.tracking_run_mentions (tracking_run_id, entity_name, is_own_brand, mentioned) values ($1, 'Zonnehof Makelaars', true, false)`,
        [voorRun[0].id],
      );

      // Golf 1: twee bronnen, allebei genoemd; alleen AI Overview citeert de
      // eigen pagina, met een trackingcode erachter (moet nog steeds tellen).
      const { rows: golf1 } = await db.client.query(
        `insert into public.tracking_runs (analysis_id, prompt_id, prompt_text_snapshot, prompt_category_snapshot, engine, week_no, purpose, content_piece_id, impact_wave)
         values
           ($1, $2, 'Wat kost een makelaar bij het verkopen van je huis?', 'Oriëntatie', 'openai', 0, 'impact', $3, 1),
           ($1, $2, 'Wat kost een makelaar bij het verkopen van je huis?', 'Oriëntatie', 'ai_overview', 0, 'impact', $3, 1)
         returning id, engine`,
        [cluster, doelvraag, stuk],
      );
      const chatgptRun = golf1.find((r) => r.engine === "openai")!.id as string;
      const aioRun = golf1.find((r) => r.engine === "ai_overview")!.id as string;
      await db.client.query(
        `insert into public.tracking_run_mentions (tracking_run_id, entity_name, is_own_brand, mentioned, cited_sources) values
           ($1, 'Zonnehof Makelaars', true, true, array['https://funda.nl/koop']),
           ($2, 'Zonnehof Makelaars', true, true, array['https://Zonnehof-Makelaars.nl/wat-kost-een-makelaar/?utm_source=google'])`,
        [chatgptRun, aioRun],
      );

      await computeImpact(admin as never, { analysisId: cluster, contentPieceId: stuk, wave: 1 });
      const { rows: golf1Uitkomst } = await db.client.query(
        "select target_cited_own_page, target_after_mentioned, verdict from public.content_impact where content_piece_id = $1 and wave = 1",
        [stuk],
      );
      ok(
        "scenario 32: de citatie van AI Overview telt mee, ook al citeerde ChatGPT een andere bron (www, hoofdletters, slash en trackingcode maken niets uit)",
        golf1Uitkomst[0]?.target_cited_own_page === true,
        JSON.stringify(golf1Uitkomst[0]),
      );

      // Golf 2: gemeten, maar geen van beide citeert de eigen pagina: false, geen null.
      const { rows: golf2 } = await db.client.query(
        `insert into public.tracking_runs (analysis_id, prompt_id, prompt_text_snapshot, prompt_category_snapshot, engine, week_no, purpose, content_piece_id, impact_wave)
         values ($1, $2, 'Wat kost een makelaar bij het verkopen van je huis?', 'Oriëntatie', 'openai', 0, 'impact', $3, 2)
         returning id`,
        [cluster, doelvraag, stuk],
      );
      await db.client.query(
        `insert into public.tracking_run_mentions (tracking_run_id, entity_name, is_own_brand, mentioned, cited_sources) values ($1, 'Zonnehof Makelaars', true, true, array['https://funda.nl/koop'])`,
        [golf2[0].id],
      );
      await computeImpact(admin as never, { analysisId: cluster, contentPieceId: stuk, wave: 2 });
      const { rows: golf2Uitkomst } = await db.client.query(
        "select target_cited_own_page from public.content_impact where content_piece_id = $1 and wave = 2",
        [stuk],
      );
      ok("scenario 32: wel gemeten maar geen citatie: false, geen null", golf2Uitkomst[0]?.target_cited_own_page === false, JSON.stringify(golf2Uitkomst[0]));

      // Golf 3: geen enkele impactmeting voor deze golf: onbekend, geen "nee".
      await computeImpact(admin as never, { analysisId: cluster, contentPieceId: stuk, wave: 3 });
      const { rows: golf3Uitkomst } = await db.client.query(
        "select target_cited_own_page from public.content_impact where content_piece_id = $1 and wave = 3",
        [stuk],
      );
      ok("scenario 32: zonder gemeten golf: onbekend (null), geen 'nee'", golf3Uitkomst[0]?.target_cited_own_page === null, JSON.stringify(golf3Uitkomst[0]));
    }

    // ── Scenario 33: M1, het meetplan vanaf het goedkeuren ───────────────────
    //
    // Sinds de contentketen opnieuw gebouwd is (WP1) schreef niemand meer in
    // `content_piece_targets`: elke pagina uit de nieuwe keten had daardoor
    // stil geen doelvragen, en de effectmeting is sindsdien nooit meer gestart.
    // `maakMeetplan()` leest de doelvragen terug uit het rapport (dezelfde bron
    // als `laadDoelvragen()`), bevriest de controlegroep, en legt vast welke
    // bronnen meededen. `keurGoed()` roept hem aan; `koppelAdresAanMeetplan()`
    // (via `markPublished()`) zet het adres erbij.
    console.log("\nScenario 33: M1, het meetplan vanaf het goedkeuren");
    {
      const { maakMeetplan } = await import("@/lib/pipeline/meetplan");
      const { markPublished } = await import("@/lib/pipeline/publish");
      const { keurGoed } = await import("@/lib/pagina/goedkeuren");
      const merk = randomUUID();
      const cluster = randomUUID();
      const stuk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Warmtehuis Techniek', 'https://warmtehuis-techniek.nl', 'Warmtehuis Techniek', 'klaar')`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status) values ($1, $2, $3, 'Warmtehuis, warmtepompen', 'https://warmtehuis-techniek.nl', 'warmtepompen', 'gereed')`,
        [cluster, userId, merk],
      );
      // Twee actieve vragen: één wordt de doelvraag (via het rapport), de
      // andere blijft over voor de controlegroep.
      const { rows: prompts } = await db.client.query(
        `insert into public.prompts (analysis_id, text, category, active) values
           ($1, 'Wat kost een warmtepomp inclusief installatie?', 'Oriëntatie', true),
           ($1, 'Welke subsidie geldt er voor een warmtepomp?', 'Oriëntatie', true)
         returning id, text`,
        [cluster],
      );
      const doelPrompt = prompts.find((p) => p.text.includes("kost"))!.id as string;
      const { rows: run } = await db.client.query(
        `insert into public.tracking_runs (analysis_id, prompt_id, prompt_text_snapshot, prompt_category_snapshot, engine, week_no, purpose, mention_json)
         values ($1, $2, 'Wat kost een warmtepomp inclusief installatie?', 'Oriëntatie', 'openai', 2, 'periodic', '{}'::jsonb) returning id`,
        [cluster, doelPrompt],
      );
      const { rows: rapport } = await db.client.query(
        `insert into public.reports (analysis_id, week_no, recommendations_json)
         values ($1, 2, $2::jsonb) returning id`,
        [
          cluster,
          JSON.stringify([
            { title: "Maak een pagina over de prijs van een warmtepomp", targets: [{ text: "Wat kost een warmtepomp inclusief installatie?", runId: run[0].id }] },
          ]),
        ],
      );
      const sourceRef = `${rapport[0].id}#0`;
      await db.client.query(
        `insert into public.content_pieces (id, analysis_id, title, type, status, action, is_current, body_markdown, needs_review)
         values ($1, $2, 'Wat kost een warmtepomp', 'article', 'ready', 'nieuw', true, 'De tekst.', false)`,
        [stuk, cluster],
      );
      await db.client.query(
        `insert into public.planned_pages (profile_id, title, content_piece_id, source_ref) values ($1, 'Wat kost een warmtepomp', $2, $3)`,
        [merk, stuk, sourceRef],
      );

      const oudSchakelaar = process.env.AI_OVERVIEW_ENABLED;
      delete process.env.AI_OVERVIEW_ENABLED;

      const gemaakt = await maakMeetplan(admin as never, stuk);
      ok("scenario 33: het meetplan wordt gemaakt", gemaakt.ok && !gemaakt.bestondAl, JSON.stringify(gemaakt));
      const { rows: plan } = await db.client.query(
        "select doelvragen, controlegroep, bronnen, adres from public.meetplannen where content_piece_id = $1",
        [stuk],
      );
      ok(
        "scenario 33: de doelvraag komt uit het rapport, met zijn prompt-id",
        plan[0].doelvragen.length === 1 && plan[0].doelvragen[0].promptId === doelPrompt && plan[0].doelvragen[0].tekst === "Wat kost een warmtepomp inclusief installatie?",
        JSON.stringify(plan[0].doelvragen),
      );
      ok("scenario 33: de andere actieve vraag wordt de bevroren controlegroep", plan[0].controlegroep.length === 1 && plan[0].controlegroep[0].promptId === prompts.find((p) => p.text.includes("subsidie"))!.id, JSON.stringify(plan[0]));
      eqc("scenario 33: zonder de schakelaar alleen openai bevroren", plan[0].bronnen.join(","), "openai");
      ok("scenario 33: nog geen adres vóór publicatie", plan[0].adres === null);

      const nogEens = await maakMeetplan(admin as never, stuk);
      ok("scenario 33: nog een keer maken doet niets (idempotent)", nogEens.ok && nogEens.bestondAl);
      const { rows: aantal } = await db.client.query("select count(*)::int as n from public.meetplannen where content_piece_id = $1", [stuk]);
      eqc("scenario 33: precies één rij", String(aantal[0].n), "1");

      // keurGoed() roept maakMeetplan() zelf aan; op een pagina zonder eigen
      // gele zinnen (needs_review al false, geen controle_json) mag dat niet
      // struikelen over het meetplan dat er al staat.
      const goedgekeurd = await keurGoed(admin as never, { pieceId: stuk, analysisId: cluster, userId });
      ok("scenario 33: goedkeuren blijft werken met een bestaand meetplan", goedgekeurd.ok, JSON.stringify(goedgekeurd));

      // Publiceren zet het adres op het meetplan.
      const url = "https://warmtehuis-techniek.nl/wat-kost-een-warmtepomp";
      await markPublished(admin as never, { analysisId: cluster, contentPieceId: stuk, url });
      const { rows: naPublicatie } = await db.client.query(
        "select adres, gepubliceerd_op from public.meetplannen where content_piece_id = $1",
        [stuk],
      );
      ok("scenario 33: het adres staat op het meetplan na publicatie", naPublicatie[0]?.adres === url && naPublicatie[0]?.gepubliceerd_op != null, JSON.stringify(naPublicatie[0]));

      // Een pagina zonder rapport/kans (bijvoorbeeld een handmatige, V2): geen
      // meetplan, geen fout.
      const zonderRapport = randomUUID();
      await db.client.query(
        `insert into public.content_pieces (id, analysis_id, title, type, status, action, is_current) values ($1, $2, 'Losse pagina', 'article', 'ready', 'nieuw', true)`,
        [zonderRapport, cluster],
      );
      const geenDoelvragen = await maakMeetplan(admin as never, zonderRapport);
      ok("scenario 33: zonder rapport geen meetplan, geen fout", !geenDoelvragen.ok && geenDoelvragen.reden.includes("geen doelvragen"), JSON.stringify(geenDoelvragen));

      if (oudSchakelaar === undefined) delete process.env.AI_OVERVIEW_ENABLED;
      else process.env.AI_OVERVIEW_ENABLED = oudSchakelaar;
    }

    // ── Scenario 34: N5, de handmatige kans ──────────────────────────────────
    //
    // De consultant zet een kans klaar die de meting niet vond (besluit V2).
    // `voegHandmatigeKansToe()` legt de kans vast zonder gemeten cluster
    // (`analysis_id` blijft NULL, het "niet gemeten"-label op het scherm), en
    // maakt er een schaduwanalyse bij die alleen bestaat om
    // `content_pieces.analysis_id NOT NULL` te dekken: gearchiveerd, dus
    // onzichtbaar tussen de echte clusters. `bereidVoor()` (dezelfde ketting als
    // elke andere kans) leest hem via `planned_pages.source_analysis_id` en
    // maakt de pagina aan; de rest van de ketting (brief, schrijven, keuren) is
    // dezelfde gedeelde pijplijn die de andere scenario's al dekken.
    console.log("\nScenario 34: N5, de handmatige kans");
    {
      const { voegHandmatigeKansToe } = await import("@/lib/kansen/handmatig");
      const { bereidVoor } = await import("@/lib/pagina/start");
      const merk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Isolatiebedrijf Oisterwijk', 'https://isolatiebedrijf-oisterwijk.nl', 'Isolatiebedrijf Oisterwijk', 'klaar')`,
        [merk, userId],
      );

      const uitkomst = await voegHandmatigeKansToe(admin as never, {
        profileId: merk,
        titel: "Prijzen dakisolatie Oisterwijk",
        lezer: "Iemand die de prijs van dakisolatie wil weten",
        handeling: "nieuwe_pagina",
        bestaandeUrl: null,
        geldtVoor: [],
        doelvragen: ["Wat kost dakisolatie in Oisterwijk?", "Welke subsidie geldt er voor dakisolatie?"],
        gebruikerId: userId,
      });
      ok("scenario 34: de kans wordt aangemaakt", uitkomst.ok, JSON.stringify(uitkomst));
      const kansId = uitkomst.ok ? uitkomst.kansId : "";

      const { rows: kansRows } = await db.client.query("select * from public.kansen where id = $1", [kansId]);
      ok("scenario 34: geen gemeten cluster, bron consultant", kansRows[0].analysis_id === null && kansRows[0].status === "open", JSON.stringify(kansRows[0]));
      const { rows: bewijsRows } = await db.client.query("select bron from public.kans_bewijs where kans_id = $1", [kansId]);
      eqc("scenario 34: het bewijs is 'je consultant zette hem erbij'", bewijsRows.map((b) => b.bron).join(","), "consultant");

      const { rows: kaartRows } = await db.client.query(
        "select id, source_analysis_id, kans_id, status, plan_month_id from public.planned_pages where kans_id = $1",
        [kansId],
      );
      ok("scenario 34: de voorraadkaart hangt aan de kans en staat nog nergens in een maand", kaartRows.length === 1 && kaartRows[0].plan_month_id === null, JSON.stringify(kaartRows[0]));
      const planPaginaId = kaartRows[0].id as string;
      const schaduwAnalyseId = kaartRows[0].source_analysis_id as string;

      const { rows: analyseRows } = await db.client.query("select status, archived_at, profile_id from public.analyses where id = $1", [schaduwAnalyseId]);
      ok("scenario 34: de schaduwanalyse is meteen gearchiveerd, dus onzichtbaar tussen de echte clusters", analyseRows[0].archived_at !== null && analyseRows[0].profile_id === merk, JSON.stringify(analyseRows[0]));

      const { rows: promptRows } = await db.client.query("select text from public.prompts where analysis_id = $1 order by text", [schaduwAnalyseId]);
      eqc("scenario 34: de opgegeven doelvragen staan als prompts klaar voor de latere nulmeting", promptRows.map((p) => p.text).join(" | "), "Wat kost dakisolatie in Oisterwijk? | Welke subsidie geldt er voor dakisolatie?");

      // Net als elke andere kans wacht de voorbereiding op een vrijgegeven
      // maand: de kaart moet eerst ingepland worden, zoals de consultant hem
      // zou slepen.
      const { rows: planRows } = await db.client.query(
        `insert into public.content_plans (profile_id, pages_per_month, started_on, version, status) values ($1, 1, current_date, 1, 'actief') returning id`,
        [merk],
      );
      const { rows: maandRows } = await db.client.query(
        `insert into public.plan_months (plan_id, month_number, status) values ($1, 1, 'goedgekeurd') returning id`,
        [planRows[0].id],
      );
      await db.client.query("update public.planned_pages set plan_month_id = $1 where id = $2", [maandRows[0].id, planPaginaId]);

      // Dezelfde ketting als elke andere kans: bereidVoor() leest het cluster
      // via source_analysis_id en maakt de pagina, zonder dat clusterVan() ook
      // maar hoeft te weten dat dit een handmatige kans is.
      await bereidVoor(admin as never, [planPaginaId]);
      const { rows: stukRows } = await db.client.query(
        "select cp.analysis_id, cp.status, cp.title, cp.type from public.content_pieces cp join public.planned_pages pp on pp.content_piece_id = cp.id where pp.id = $1",
        [planPaginaId],
      );
      ok(
        "scenario 34: de pagina wordt aangemaakt onder de schaduwanalyse, klaar voor de brief",
        stukRows.length === 1 && stukRows[0].analysis_id === schaduwAnalyseId && stukRows[0].status === "briefing",
        JSON.stringify(stukRows[0]),
      );
      ok("scenario 34, B33: zonder keuze wordt een handmatige kans een artikel, zoals voorheen", stukRows[0].type === "article", String(stukRows[0].type));

      // 30 september 2026: de doelvragen van een eigen idee komen aan bij de
      // brief en de schrijver. Tot die dag zocht de keten ze alleen via een
      // aanbeveling uit een rapport, en die heeft een eigen idee niet.
      const { laadPagina: laadEigenIdee, laadDoelvragen: doelvragenVanIdee } = await import("@/lib/pagina/context");
      const { rows: stukId } = await db.client.query("select content_piece_id from public.planned_pages where id = $1", [planPaginaId]);
      const eigenIdee = await laadEigenIdee(admin as never, stukId[0].content_piece_id as string);
      ok("scenario 34: de pagina weet dat hij een eigen idee is", eigenIdee?.eigenIdeeAnalyse === schaduwAnalyseId, String(eigenIdee?.eigenIdeeAnalyse));
      const vragenVanIdee = await doelvragenVanIdee(admin as never, eigenIdee!.sourceRef, [], eigenIdee!.eigenIdeeAnalyse);
      eqc(
        "scenario 34: de doelvragen van de consultant gaan mee naar de brief, zonder verzonnen antwoord",
        vragenVanIdee.map((v) => `${v.vraag}|${v.antwoord ?? "-"}`).join(" ; "),
        "Wat kost dakisolatie in Oisterwijk?|- ; Welke subsidie geldt er voor dakisolatie?|-",
      );

      // B33: de consultant kiest de soort. De kaart draagt hem, het paginatype
      // volgt voor de contentmix, en de kans kent hem voor het kennisgat (N6).
      const vergelijking = await voegHandmatigeKansToe(admin as never, {
        profileId: merk,
        titel: "Dakisolatie of spouwmuurisolatie",
        lezer: null,
        handeling: "nieuwe_pagina",
        bestaandeUrl: null,
        geldtVoor: [],
        doelvragen: [],
        contentType: "comparison",
        gebruikerId: userId,
      });
      const { rows: vergelijkingKaart } = await db.client.query(
        "select pp.content_type, pp.page_type, k.ruw from public.planned_pages pp join public.kansen k on k.id = pp.kans_id where pp.kans_id = $1",
        [vergelijking.ok ? vergelijking.kansId : ""],
      );
      ok(
        "scenario 34, B33: een gekozen vergelijking blijft een vergelijking",
        vergelijkingKaart[0]?.content_type === "comparison" && vergelijkingKaart[0]?.page_type === "categorie" && vergelijkingKaart[0]?.ruw?.type === "comparison",
        JSON.stringify(vergelijkingKaart[0]),
      );
    }

    // ── Scenario 35: G1, de gebeurtenissenlaag ───────────────────────────────
    //
    // Een wijziging in de kennislaag publiceert een gebeurtenis (`meldWijziging()`
    // in `lib/kennis/vastleggen.ts`), en een abonnee verwerkt diezelfde
    // gebeurtenis precies één keer, ook als de werker de taak twee keer
    // probeert (`verwerkGebeurtenis()` in `lib/gebeurtenissen/verwerken.ts`
    // controleert `gebeurtenis_verwerkingen` vóór het werk, conventie 9). Het
    // register (`lib/gebeurtenissen/register.ts`) bevat in G1 nog geen echte
    // abonnee (dat is G3 en G4), dus de tweede helft van dit scenario geeft een
    // eigen testabonnee mee in plaats van uit het echte register te lezen.
    console.log("\nScenario 35: G1, de gebeurtenissenlaag");
    {
      const { legVast } = await import("@/lib/kennis/vastleggen");
      const { publiceer } = await import("@/lib/gebeurtenissen/publiceer");
      const { verwerkGebeurtenis } = await import("@/lib/gebeurtenissen/verwerken");
      const merk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Dakdekkersbedrijf Odijk', 'https://dakdekkers-odijk.nl', 'Dakdekkersbedrijf Odijk', 'klaar')`,
        [merk, userId],
      );

      const uit = await legVast(
        admin as never,
        {
          profileId: merk,
          domein: "aanbod",
          soort: "termijn",
          bewering: "Een plat dak vervangen duurt gemiddeld twee dagen.",
          status: "waargenomen",
          bron: "website",
          bronUrl: "https://dakdekkers-odijk.nl/plat-dak",
          citaat: "Reken op twee dagen voor een compleet nieuw dak.",
          gebruik: "content",
          herkomst: { tabel: "brand_facts", id: randomUUID() },
        } as never,
        { actor: "code", taak: "kennis_terugvullen" } as never,
      );
      if (uit.soort !== "vastgelegd") throw new Error(`Testkennis geweigerd: ${JSON.stringify(uit)}`);
      const itemId = uit.item.id;

      const { rows: gebRows } = await db.client.query(
        "select id, profile_id, soort, object_tabel, object_id from public.gebeurtenissen where object_id = $1",
        [itemId],
      );
      ok(
        "scenario 35: legVast() publiceert 'kennis gewijzigd'",
        gebRows.length === 1 && gebRows[0].profile_id === merk && gebRows[0].soort === "kennis_gewijzigd" && gebRows[0].object_tabel === "klantkennis",
        JSON.stringify(gebRows),
      );
      const gebeurtenisId1 = gebRows[0].id as string;

      // Sinds G3 en G4 staan er in dit gedeelde testproces al echte abonnees
      // geregistreerd (via de importbijwerking in `lib/jobs/handlers.ts`); elk
      // krijgt voor élke gebeurtenis een taak, ook als hij er intern niets aan
      // doet (dit item heeft geen enkele afhankelijke kans of pagina, en is
      // geen profielveld). Het aantal is dus het aantal geregistreerde
      // abonnees op "kennis gewijzigd", niet een vast getal: een volgende
      // abonnee (G5 of later) mag deze test niet breken.
      const { abonneesVoor } = await import("@/lib/gebeurtenissen/register");
      const { rows: taakRows } = await db.client.query(
        "select id, dedupe_key from public.jobs where type = 'gebeurtenis_verwerken' and dedupe_key like $1",
        [`%:${gebeurtenisId1}`],
      );
      eqc(
        "scenario 35: elke geregistreerde abonnee krijgt een taak voor deze gebeurtenis",
        String(taakRows.length),
        String(abonneesVoor("kennis_gewijzigd").length),
      );

      // Precies één keer verwerkt, ook bij een tweede poging van de werker.
      let teller = 0;
      const testAbonnee = {
        naam: "test_scenario35",
        soorten: ["kennis_gewijzigd"] as const,
        verwerk: async () => {
          teller++;
        },
      };
      const gebeurtenisId = await publiceer(
        admin as never,
        { profileId: merk, soort: "kennis_gewijzigd", objectTabel: "klantkennis", objectId: itemId },
        [testAbonnee],
      );
      const { rows: taakRows2 } = await db.client.query(
        "select dedupe_key from public.jobs where type = 'gebeurtenis_verwerken' and dedupe_key = $1",
        [`gebeurtenis:test_scenario35:${gebeurtenisId}`],
      );
      ok(
        "scenario 35: mét abonnee plant publiceer() precies één taak in, met de juiste sleutel",
        taakRows2.length === 1,
        JSON.stringify(taakRows2),
      );

      await verwerkGebeurtenis(admin as never, gebeurtenisId, "test_scenario35", [testAbonnee]);
      await verwerkGebeurtenis(admin as never, gebeurtenisId, "test_scenario35", [testAbonnee]);
      ok("scenario 35: de abonnee draait precies één keer, ook bij een tweede poging", teller === 1, `teller=${teller}`);

      const { rows: verwerkRows } = await db.client.query(
        "select abonnee from public.gebeurtenis_verwerkingen where gebeurtenis_id = $1",
        [gebeurtenisId],
      );
      ok("scenario 35: precies één verwerkingsrij, geen dubbele", verwerkRows.length === 1, JSON.stringify(verwerkRows));
    }

    // ── Scenario 36: C3, welke kennis in een versie zat ──────────────────────
    //
    // `tekstKolommen()` legt vast welke kennisitems in blok A van DEZE versie
    // stonden, uit dezelfde keuze die de schrijver kreeg (`laadSchrijfbasis()`).
    // De schrijver wijst zelf niets aan (B9 blijft staan); de kolom is voer voor
    // G2 (afhankelijkheden).
    console.log("\nScenario 36: C3, welke kennis in een versie zat");
    {
      const { laadSchrijfbasis, tekstKolommen, gerepareerd } = await import("@/lib/pagina/schrijven");
      const { legVast } = await import("@/lib/kennis/vastleggen");
      const shim = createShimClient(db.client) as never;
      const merk = randomUUID();
      const cluster = randomUUID();
      const stuk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Kennisspoor Test', 'https://kennisspoor.nl', 'Kennisspoor Test', 'klaar')`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status) values ($1, $2, $3, 'Kennisspoor', 'https://kennisspoor.nl', 'dakisolatie', 'gereed')`,
        [cluster, userId, merk],
      );
      await db.client.query(
        `insert into public.content_pieces (id, analysis_id, title, type, status, action, version, is_current) values ($1, $2, 'Dakisolatie laten aanbrengen', 'landing', 'briefing', 'nieuw', 1, true)`,
        [stuk, cluster],
      );
      const uit1 = await legVast(
        shim,
        { profileId: merk, domein: "aanbod", soort: "dienst", bewering: "Dakisolatie aanbrengen.", status: "waargenomen", bron: "website", bronUrl: "https://kennisspoor.nl", citaat: "Dakisolatie aanbrengen.", gebruik: "content", herkomst: { tabel: "profile_offerings", id: randomUUID() } } as never,
        { actor: "code", taak: "kennis_terugvullen" } as never,
      );
      const uit2 = await legVast(
        shim,
        { profileId: merk, domein: "verhaal", soort: "eigen verhaal", bewering: "Vorige maand isoleerden we een boerderij in één dag.", status: "verklaard", bron: "klant", gebruik: "content" } as never,
        { actor: "mens", gebruikerId: userId } as never,
      );
      if (uit1.soort !== "vastgelegd" || uit2.soort !== "vastgelegd") throw new Error("Testkennis geweigerd voor scenario 36.");
      const verwachteIds = [uit1.item.id, uit2.item.id].sort();

      const basis = await laadSchrijfbasis(shim, stuk);
      if (!basis) throw new Error("Geen schrijfbasis voor scenario 36.");
      eqc("scenario 36: laadSchrijfbasis() kiest beide kennisitems voor blok A", basis.bedrijf.kennis.map((k) => k.id).sort().join(","), verwachteIds.join(","));

      const uitvoer = { titel: "Dakisolatie laten aanbrengen", meta_titel: "Dakisolatie laten aanbrengen", meta_beschrijving: "Alles over dakisolatie.", tekst_markdown: "Wij isoleren daken.", faq: [], notitie_voor_ondernemer: null };
      const tekst = gerepareerd(uitvoer, "Kennisspoor Test");
      const kolommen = await tekstKolommen(shim, basis, tekst, { uitvoer, soort: "schrijven" });
      eqc("scenario 36: tekstKolommen() legt precies die kennisitems vast", ((kolommen.gebruikte_kennis as string[]) ?? []).sort().join(","), verwachteIds.join(","));

      await db.client.query("update public.content_pieces set gebruikte_kennis = $2 where id = $1", [stuk, kolommen.gebruikte_kennis]);
      const { rows: opgeslagen } = await db.client.query("select gebruikte_kennis from public.content_pieces where id = $1", [stuk]);
      eqc("scenario 36: en staat na opslaan op de rij", ([...(opgeslagen[0]?.gebruikte_kennis ?? [])] as string[]).sort().join(","), verwachteIds.join(","));
    }

    // ── Scenario 37: G2, afhankelijkheden vastleggen ─────────────────────────
    //
    // "Wat hangt er aan deze dienst" (G2 klaar-als): een handmatige kans (N5)
    // die op een dienst geldt, en een pagina die dezelfde dienst in blok A kreeg
    // (C3), leunen allebei op hetzelfde kennisitem. `afhankelijkVan()` moet
    // beide terugvinden.
    console.log("\nScenario 37: G2, afhankelijkheden vastleggen");
    {
      const { legVast } = await import("@/lib/kennis/vastleggen");
      const { voegHandmatigeKansToe } = await import("@/lib/kansen/handmatig");
      const { legAfhankelijkhedenVast, afhankelijkVan } = await import("@/lib/afhankelijkheden/vastleggen");
      const shim = createShimClient(db.client) as never;
      const merk = randomUUID();
      const stuk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Afhankelijkheden Test', 'https://afhankelijkheden-test.nl', 'Afhankelijkheden Test', 'klaar')`,
        [merk, userId],
      );
      const dienst = await legVast(
        shim,
        { profileId: merk, domein: "aanbod", soort: "dienst", bewering: "Kozijnen plaatsen.", status: "waargenomen", bron: "website", bronUrl: "https://afhankelijkheden-test.nl", citaat: "Kozijnen plaatsen.", gebruik: "content", herkomst: { tabel: "profile_offerings", id: randomUUID() } } as never,
        { actor: "code", taak: "kennis_terugvullen" } as never,
      );
      if (dienst.soort !== "vastgelegd") throw new Error("Testkennis geweigerd voor scenario 37.");
      const dienstId = dienst.item.id;

      const kans = await voegHandmatigeKansToe(shim, {
        profileId: merk,
        titel: "Kozijnen plaatsen in Bunnik",
        lezer: "Iemand die nieuwe kozijnen wil",
        handeling: "nieuwe_pagina",
        bestaandeUrl: null,
        geldtVoor: [dienstId],
        doelvragen: [],
        gebruikerId: userId,
      });
      ok("scenario 37: de handmatige kans wordt aangemaakt", kans.ok, JSON.stringify(kans));
      const kansId = kans.ok ? kans.kansId : "";

      const { rows: kansAfh } = await db.client.query(
        "select van_id from public.afhankelijkheden where van_tabel = 'kansen' and kennis_id = $1",
        [dienstId],
      );
      eqc("scenario 37: legKansenVast/handmatig legt de afhankelijkheid van de kans vast", kansAfh.map((r) => r.van_id).join(","), kansId);

      // Een pagina die dezelfde dienst in blok A kreeg (zoals lib/pagina/taken.ts
      // na tekstKolommen() doet).
      await legAfhankelijkhedenVast(shim, { profileId: merk, vanTabel: "content_pieces", vanId: stuk, kennisIds: [dienstId] });

      const hangenAan = await afhankelijkVan(shim, dienstId);
      const gevonden = new Set(hangenAan.map((h) => `${h.vanTabel}:${h.vanId}`));
      ok(
        "scenario 37: 'wat hangt er aan deze dienst' vindt zowel de kans als de pagina",
        gevonden.has(`kansen:${kansId}`) && gevonden.has(`content_pieces:${stuk}`) && hangenAan.length === 2,
        JSON.stringify(hangenAan),
      );

      // Nog eens vastleggen (zoals een herschrijving die dezelfde kennis weer
      // kiest) mag geen tweede rij geven: de unieke index vangt dat op.
      await legAfhankelijkhedenVast(shim, { profileId: merk, vanTabel: "content_pieces", vanId: stuk, kennisIds: [dienstId] });
      const { rows: nogEens } = await db.client.query(
        "select count(*)::int as n from public.afhankelijkheden where van_tabel = 'content_pieces' and van_id = $1 and kennis_id = $2",
        [stuk, dienstId],
      );
      eqc("scenario 37: nog eens vastleggen geeft geen dubbele rij", String(nogEens[0]?.n), "1");
    }

    // ── Scenario 38: G3, een wijziging maakt zichtbaar wat er geraakt wordt ──
    //
    // Precies het voorbeeld uit het plan: "wij doen geen warmtepompen meer"
    // (een dienst afwijzen) zet de kans die erop leunt op 'vervallen' en meldt
    // het bij de pagina die dezelfde kennis gebruikte; een gewone wijziging
    // (een nieuwe versie van een antwoord) zet 'te_herzien'. Niets wordt
    // herschreven of opnieuw gemeten (§4 regel 5): alleen de status en de
    // melding veranderen. De echte weg: legVast/wijsAf/vervang publiceren de
    // gebeurtenis, die zet een taak klaar, en `runJob()` voert 'm net als de
    // werker uit.
    console.log("\nScenario 38: G3, een wijziging maakt zichtbaar wat er geraakt wordt");
    {
      const { runJob } = await import("@/lib/jobs/handlers");
      const { legVast, wijsAf, vervang } = await import("@/lib/kennis/vastleggen");
      const { legAfhankelijkhedenVast } = await import("@/lib/afhankelijkheden/vastleggen");
      const shim = createShimClient(db.client) as never;
      const merk = randomUUID();
      const cluster = randomUUID();
      const pagina1 = randomUUID();
      const pagina2 = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status) values ($1, $2, 'Warmtepomp Test', 'https://warmtepomp-test.nl', 'Warmtepomp Test', 'klaar')`,
        [merk, userId],
      );
      await db.client.query(
        `insert into public.analyses (id, user_id, profile_id, name, url, topic, status) values ($1, $2, $3, 'Warmtepomp', 'https://warmtepomp-test.nl', 'warmtepomp', 'gereed')`,
        [cluster, userId, merk],
      );
      await db.client.query(
        `insert into public.content_pieces (id, analysis_id, title, type, status, action, version, is_current) values
           ($1, $3, 'Warmtepomp laten plaatsen', 'landing', 'ready', 'nieuw', 1, true),
           ($2, $3, 'Cv-ketel vervangen', 'landing', 'ready', 'nieuw', 1, true)`,
        [pagina1, pagina2, cluster],
      );

      // ── Deel 1: een dienst afwijzen ("wij doen geen warmtepompen meer") ────
      const warmtepomp = await legVast(
        shim,
        { profileId: merk, domein: "aanbod", soort: "dienst", bewering: "Warmtepompen installeren.", status: "waargenomen", bron: "website", bronUrl: "https://warmtepomp-test.nl", citaat: "Warmtepompen installeren.", gebruik: "content", herkomst: { tabel: "profile_offerings", id: randomUUID() } } as never,
        { actor: "code", taak: "kennis_terugvullen" } as never,
      );
      if (warmtepomp.soort !== "vastgelegd") throw new Error("Testkennis geweigerd voor scenario 38.");
      const warmtepompId = warmtepomp.item.id;

      const { rows: kansRows } = await db.client.query(
        `insert into public.kansen (profile_id, titel, handeling, geldt_voor, vastgelegd_door_taak) values ($1, 'Warmtepomp laten plaatsen', 'nieuwe_pagina', $2, 'test') returning id`,
        [merk, [warmtepompId]],
      );
      const kansId = kansRows[0].id as string;
      await legAfhankelijkhedenVast(shim, { profileId: merk, vanTabel: "kansen", vanId: kansId, kennisIds: [warmtepompId] });
      await legAfhankelijkhedenVast(shim, { profileId: merk, vanTabel: "content_pieces", vanId: pagina1, kennisIds: [warmtepompId] });

      const uitkomst = await wijsAf(shim, { profileId: merk, itemId: warmtepompId }, { actor: "mens", gebruikerId: userId });
      ok("scenario 38: de dienst wordt afgewezen", uitkomst.ok, JSON.stringify(uitkomst));

      // `legVast()` van de dienst zelf publiceerde óók al een gebeurtenis (zonder
      // afhankelijken, dus zonder effect); de LAATSTE gebeurtenis op dit item is
      // die van het afwijzen, en zíjn taak is waar dit deel om gaat.
      const { rows: gebAf } = await db.client.query(
        "select id from public.gebeurtenissen where object_id = $1 order by aangemaakt_op desc limit 1",
        [warmtepompId],
      );
      const { rows: taakRows } = await db.client.query(
        "select * from public.jobs where type = 'gebeurtenis_verwerken' and dedupe_key = $1",
        [`gebeurtenis:kennis_wijziging_impact:${gebAf[0].id}`],
      );
      eqc("scenario 38: afwijzen zet precies één taak klaar voor de echte abonnee", String(taakRows.length), "1");
      await runJob({ admin: shim, job: taakRows[0] as never });

      const { rows: kansNa } = await db.client.query("select status from public.kansen where id = $1", [kansId]);
      eqc("scenario 38: de kans die op de dienst leunde is vervallen", kansNa[0]?.status, "vervallen");
      const { rows: paginaNa } = await db.client.query("select kennis_gewijzigd_op from public.content_pieces where id = $1", [pagina1]);
      ok("scenario 38: de pagina die dezelfde dienst gebruikte krijgt een melding", paginaNa[0]?.kennis_gewijzigd_op != null, JSON.stringify(paginaNa));

      // Nog eens uitvoeren (de werker die het twee keer probeert) verandert er niets aan.
      await runJob({ admin: shim, job: taakRows[0] as never });
      const { rows: kansNogEens } = await db.client.query("select status from public.kansen where id = $1", [kansId]);
      eqc("scenario 38: nog eens uitvoeren verandert de status niet nog eens", kansNogEens[0]?.status, "vervallen");

      // ── Deel 2: een gewone wijziging (geen afwijzing) ──────────────────────
      const prijs = await legVast(
        shim,
        { profileId: merk, domein: "aanbod", soort: "prijs", bewering: "Een cv-ketel kost € 2.000.", status: "waargenomen", bron: "website", bronUrl: "https://warmtepomp-test.nl", citaat: "Een cv-ketel kost € 2.000.", gebruik: "content", herkomst: { tabel: "profile_offerings", id: randomUUID() } } as never,
        { actor: "code", taak: "kennis_terugvullen" } as never,
      );
      if (prijs.soort !== "vastgelegd") throw new Error("Testkennis (prijs) geweigerd voor scenario 38.");
      const { rows: kansRows2 } = await db.client.query(
        `insert into public.kansen (profile_id, titel, handeling, geldt_voor, vastgelegd_door_taak) values ($1, 'Cv-ketel vervangen', 'nieuwe_pagina', $2, 'test') returning id`,
        [merk, [prijs.item.id]],
      );
      const kansId2 = kansRows2[0].id as string;
      await legAfhankelijkhedenVast(shim, { profileId: merk, vanTabel: "kansen", vanId: kansId2, kennisIds: [prijs.item.id] });
      await legAfhankelijkhedenVast(shim, { profileId: merk, vanTabel: "content_pieces", vanId: pagina2, kennisIds: [prijs.item.id] });

      const vervangen = await vervang(
        shim,
        { profileId: merk, oudId: prijs.item.id, nieuw: { profileId: merk, domein: "aanbod", soort: "prijs", bewering: "Een cv-ketel kost € 2.100.", status: "waargenomen", bron: "website", bronUrl: "https://warmtepomp-test.nl", citaat: "Een cv-ketel kost € 2.100.", gebruik: "content", herkomst: { tabel: "profile_offerings", id: randomUUID() } } },
        { actor: "code", taak: "kennis_terugvullen" },
      );
      ok("scenario 38: de prijs krijgt een nieuwe versie", vervangen.ok, JSON.stringify(vervangen));

      // Zelfde verhaal: `legVast()` van de prijs publiceerde al een gebeurtenis
      // op zijn eigen id; `vervang()` publiceert een TWEEDE op datzelfde
      // (oude) id, waar de kans en de pagina op leunen. De laatste is die van
      // de vervanging.
      const { rows: gebVervang } = await db.client.query(
        "select id from public.gebeurtenissen where object_id = $1 order by aangemaakt_op desc limit 1",
        [prijs.item.id],
      );
      const { rows: taakRows2 } = await db.client.query(
        "select * from public.jobs where type = 'gebeurtenis_verwerken' and dedupe_key = $1",
        [`gebeurtenis:kennis_wijziging_impact:${gebVervang[0].id}`],
      );
      ok("scenario 38: de nieuwe versie zet ook een taak klaar, tegen de OUDE id (waar de kans op leunt)", taakRows2.length === 1, JSON.stringify(taakRows2));
      await runJob({ admin: shim, job: taakRows2[0] as never });

      const { rows: kansNa2 } = await db.client.query("select status from public.kansen where id = $1", [kansId2]);
      eqc("scenario 38: een gewone wijziging zet de kans op 'te herzien', niet 'vervallen'", kansNa2[0]?.status, "te_herzien");
      const { rows: pagina2Na } = await db.client.query("select kennis_gewijzigd_op from public.content_pieces where id = $1", [pagina2]);
      ok("scenario 38: en de pagina van de prijs krijgt ook een melding", pagina2Na[0]?.kennis_gewijzigd_op != null, JSON.stringify(pagina2Na));

      // Het kennisoverzicht (G3 klaar-als): de consultant ziet beide kansen en
      // beide pagina's terug, met een kosteninschatting.
      const { geraaktOverzicht, HERSCHRIJF_KOSTEN_USD_PER_PAGINA } = await import("@/lib/kansen/impact");
      const geraakt = await geraaktOverzicht(shim, merk);
      eqc(
        "scenario 38: het kennisoverzicht toont beide geraakte kansen",
        geraakt.kansen.map((k) => `${k.titel}:${k.status}`).sort().join(","),
        "Cv-ketel vervangen:te_herzien,Warmtepomp laten plaatsen:vervallen",
      );
      eqc(
        "scenario 38: en beide pagina's met een melding",
        geraakt.paginas.map((p) => p.titel).sort().join(","),
        "Cv-ketel vervangen,Warmtepomp laten plaatsen",
      );
      eqc(
        "scenario 38: de kosteninschatting is het aantal pagina's keer de bovengrens per pagina",
        String(geraakt.geschatteKostenUsd),
        String(2 * HERSCHRIJF_KOSTEN_USD_PER_PAGINA),
      );
    }

    // ── Scenario 39: G4, de verversingslogica als abonnee ────────────────────
    //
    // `slaProfielOp()` publiceert nu een gebeurtenis met de gezette velden; de
    // abonnee `onderzoek_refresh` houdt ze bij op `profiles.velden_te_verversen`
    // (migratie 0127), wat de bijwerkroute vroeger zelf uitrekende met een live
    // vergelijking tegen `profile_field_sources`. De regels zelf
    // (`planRefresh()`) veranderen niet: dezelfde velden geven dezelfde taken.
    // Een nieuwe onderzoeksronde (`legOnderzoeksveldenVast()`, zoals
    // `prepare-profile.ts` doet) maakt de lijst weer leeg.
    console.log("\nScenario 39: G4, de verversingslogica als abonnee");
    {
      const { runJob } = await import("@/lib/jobs/handlers");
      const { slaProfielOp } = await import("@/lib/kennis/uit-gesprek");
      const { legOnderzoeksveldenVast } = await import("@/lib/kennis/uit-onderzoek");
      const { planRefresh } = await import("@/lib/pipeline/onboarding-refresh");
      const shim = createShimClient(db.client) as never;
      const merk = randomUUID();
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status, deep_research_at) values ($1, $2, 'Refresh Test', 'https://refresh-test.nl', 'Refresh Test', 'klaar', now() - interval '1 day')`,
        [merk, userId],
      );
      const mens = { actor: "mens", gebruikerId: userId } as const;

      const { error } = await slaProfielOp(
        shim,
        {
          profileId: merk,
          url: "https://refresh-test.nl",
          kolommen: { competitors: ["Warmte Oost"] },
          oud: { competitors: [] },
          velden: ["competitors"],
          bron: "gesprek",
        },
        mens,
      );
      ok("scenario 39: het gesprek slaat de concurrent op", error === null, String(error));

      const { rows: gebRows } = await db.client.query(
        "select id from public.gebeurtenissen where object_tabel = 'profiles' and object_id = $1 order by aangemaakt_op desc limit 1",
        [merk],
      );
      ok("scenario 39: slaProfielOp() publiceert 'kennis gewijzigd' met de gezette velden", gebRows.length === 1, JSON.stringify(gebRows));

      const { rows: taakRows } = await db.client.query(
        "select * from public.jobs where type = 'gebeurtenis_verwerken' and dedupe_key = $1",
        [`gebeurtenis:onderzoek_refresh:${gebRows[0].id}`],
      );
      eqc("scenario 39: precies één taak voor de onderzoek_refresh-abonnee", String(taakRows.length), "1");
      await runJob({ admin: shim, job: taakRows[0] as never });

      const { rows: profielNa } = await db.client.query("select velden_te_verversen from public.profiles where id = $1", [merk]);
      eqc("scenario 39: de abonnee houdt bij dat 'competitors' een mens zette", (profielNa[0]?.velden_te_verversen ?? []).join(","), "competitors");

      // Precies wat de bijwerkroute nu doet: rechtstreeks lezen, geen live query.
      const veranderd = profielNa[0]?.velden_te_verversen ?? [];
      const plan = planRefresh(veranderd, { analyses: 0 });
      ok("scenario 39: dezelfde regels geven dezelfde uitkomst: het marktonderzoek moet opnieuw", plan.tasks.includes("markt"), plan.tasks.join(","));

      // Nog eens dezelfde wijziging opslaan voegt niets dubbels toe.
      await slaProfielOp(shim, { profileId: merk, url: "https://refresh-test.nl", kolommen: { competitors: ["Warmte Oost"] }, oud: { competitors: ["Warmte Oost"] }, velden: ["competitors"], bron: "gesprek" }, mens);
      const { rows: gebRows2 } = await db.client.query(
        "select id from public.gebeurtenissen where object_tabel = 'profiles' and object_id = $1 order by aangemaakt_op desc limit 1",
        [merk],
      );
      const { rows: taakRows2 } = await db.client.query(
        "select * from public.jobs where type = 'gebeurtenis_verwerken' and dedupe_key = $1",
        [`gebeurtenis:onderzoek_refresh:${gebRows2[0].id}`],
      );
      await runJob({ admin: shim, job: taakRows2[0] as never });
      const { rows: profielNa2 } = await db.client.query("select velden_te_verversen from public.profiles where id = $1", [merk]);
      eqc("scenario 39: geen dubbele vermelding van hetzelfde veld", (profielNa2[0]?.velden_te_verversen ?? []).join(","), "competitors");

      // Een nieuwe onderzoeksronde wist de lijst.
      const { error: onderzoekFout } = await legOnderzoeksveldenVast(shim, merk, {
        kolommen: { deep_research_at: new Date().toISOString(), status: "klaar", velden_te_verversen: [] },
        items: [],
        taak: "profile_research",
      });
      ok("scenario 39: een nieuwe onderzoeksronde slaagt", onderzoekFout === null, String(onderzoekFout));
      const { rows: profielNa3 } = await db.client.query("select velden_te_verversen from public.profiles where id = $1", [merk]);
      eqc("scenario 39: en maakt de lijst weer leeg", (profielNa3[0]?.velden_te_verversen ?? []).join(","), "");
    }

    // ══════════════════════════════════════════════════════════════════════
    // Scenario 40: N3, Search Console als kansbron
    //
    // ⚠️ DE SAMENHANG DIE HIER FOUT KAN GAAN: `legZoekverkeerBewijsVast()`
    // raakt drie tabellen (`search_console_queries` lezen, `kans_bewijs`
    // schrijven, `kansen.uitleg` herschrijven) en moet daarbij de kans met een
    // andere dienst met rust laten. Geen van die drie is te zien vanuit een
    // pure eenheidstest op `matchendeZoekopdrachten()`/`zoekverkeerBewijsVan()`
    // alleen: die weet niets van een kans die al bewijs van een andere bron
    // had, of van een kans die niets met zoekverkeer te maken heeft.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\nScenario 40: N3, Search Console als kansbron");
    {
      const { legZoekverkeerBewijsVast } = await import("@/lib/kansen/uit-search-console");
      const shim = createShimClient(db.client) as never;

      const merk = randomUUID();
      const gebruiker = randomUUID();
      await db.client.query("insert into auth.users (id, email) values ($1, $2)", [
        gebruiker,
        "zoekverkeer-kansbron@voorbeeld.nl",
      ]);
      await db.client.query(
        `insert into public.profiles (id, user_id, name, url, brand_name, status, gsc_verified_at)
         values ($1, $2, 'Zoekverkeer BV', 'https://zoekverkeer-bv.nl', 'Zoekverkeer BV', 'klaar', now())`,
        [merk, gebruiker],
      );

      const { rows: kennisRijen } = await db.client.query(
        `insert into public.klantkennis (profile_id, domein, soort, bewering, status, bron, gebruik, vastgelegd_door_taak, herkomst_tabel, herkomst_id)
         values ($1, 'aanbod', 'dienst', 'Financiering', 'afgeleid', 'ai', 'intern', 'kennis_terugvullen', 'profile_offerings', gen_random_uuid())
         returning id`,
        [merk],
      );
      const dienstId = kennisRijen[0].id as string;

      // Twee kansen: één die over financiering gaat (moet bewijs krijgen), één
      // zonder enige koppeling (moet met rust gelaten worden, want er is niets
      // om een zoekopdracht aan te herkennen).
      const { rows: kansRijen } = await db.client.query(
        `insert into public.kansen (profile_id, titel, handeling, geldt_voor, status, vastgelegd_door_taak, uitleg)
         values
           ($1, 'Pagina over financiering', 'nieuwe_pagina', $2, 'open', 'test', 'Uitleg zonder Search Console.'),
           ($1, 'Kans zonder koppeling', 'nieuwe_pagina', '{}', 'open', 'test', 'Blijft ongemoeid.')
         returning id, titel`,
        [merk, [dienstId]],
      );
      const kansMetDienst = (kansRijen as { id: string; titel: string }[]).find((k) => k.titel === "Pagina over financiering")!.id;
      const kansZonderKoppeling = (kansRijen as { id: string; titel: string }[]).find((k) => k.titel === "Kans zonder koppeling")!.id;

      // Alle rijen op dezelfde dag: het venster van `vergelijkingsvenster()`
      // eindigt op de laatste dag in de data, dus dit garandeert dat alles
      // binnen de 28 dagen valt zonder een echte kalender na te bootsen.
      await db.client.query(
        `insert into public.search_console_queries (profile_id, day, query, page, clicks, impressions, position) values
           ($1, '2026-09-20', 'auto financiering udenhout', '/diensten/financieringen', 2, 40, 8),
           ($1, '2026-09-20', 'financiering audi', '/diensten/financieringen/audi-financiering', 1, 15, 12),
           ($1, '2026-09-20', 'auto huren eindhoven', '/verhuur', 5, 30, 4)`,
        [merk],
      );

      const telling = await legZoekverkeerBewijsVast(shim, merk);
      ok("scenario 40: één kans bijgewerkt, geen mislukking", telling.bijgewerkt === 1 && telling.mislukt === 0, JSON.stringify(telling));

      const { rows: bewijsRijen } = await db.client.query(
        `select kans_id, bron, vertoningen, klikken, positie, periode_dagen, zoekopdrachten
           from public.kans_bewijs where kans_id = $1`,
        [kansMetDienst],
      );
      ok("scenario 40: precies één bewijsrij, bron search_console", bewijsRijen.length === 1 && bewijsRijen[0].bron === "search_console");
      ok("scenario 40: vertoningen en klikken zijn de som van de matchende zoekopdrachten", Number(bewijsRijen[0].vertoningen) === 55 && Number(bewijsRijen[0].klikken) === 3);
      // Gewogen op vertoningen: (8*40 + 12*15) / 55 ≈ 8,91, niet het gewone gemiddelde (10).
      ok(
        "scenario 40: de positie is gewogen op vertoningen",
        Math.abs(Number(bewijsRijen[0].positie) - (8 * 40 + 12 * 15) / 55) < 0.01,
        String(bewijsRijen[0].positie),
      );
      eqc("scenario 40: 28 dagen, dezelfde periode als de rest van het zoekverkeerscherm", String(bewijsRijen[0].periode_dagen), "28");
      eqc(
        "scenario 40: de niet-matchende zoekopdracht ('auto huren') staat er niet bij",
        (bewijsRijen[0].zoekopdrachten as string[]).sort().join(","),
        ["auto financiering udenhout", "financiering audi"].sort().join(","),
      );

      const { rows: kansNa } = await db.client.query("select uitleg from public.kansen where id = $1", [kansMetDienst]);
      ok(
        "scenario 40: de uitleg van de kans noemt het zoekverkeer, met het echte aantal vertoningen",
        typeof kansNa[0].uitleg === "string" && kansNa[0].uitleg.includes("Mensen zoeken hiernaar") && kansNa[0].uitleg.includes("55 vertoningen"),
        kansNa[0].uitleg,
      );

      const { rows: bewijsAndereKans } = await db.client.query(
        "select count(*)::int as n from public.kans_bewijs where kans_id = $1",
        [kansZonderKoppeling],
      );
      ok("scenario 40: de kans zonder dienst of werkgebied krijgt geen bewijs", Number(bewijsAndereKans[0].n) === 0);
      const { rows: kansZonderKoppelingNa } = await db.client.query("select uitleg from public.kansen where id = $1", [kansZonderKoppeling]);
      eqc("scenario 40: en zijn uitleg blijft ongemoeid", kansZonderKoppelingNa[0].uitleg, "Blijft ongemoeid.");

      // Nog eens aanroepen (zoals een tweede gsc_sync de volgende nacht) mag
      // geen tweede bewijsrij maken, alleen de bestaande overschrijven
      // (conventie 9, dezelfde `onConflict` als `uit-rapport.ts`).
      const tellingNogEens = await legZoekverkeerBewijsVast(shim, merk);
      ok("scenario 40: nog eens aanroepen blijft idempotent op de bewijsrij", tellingNogEens.bijgewerkt === 1 && tellingNogEens.mislukt === 0);
      const { rows: bewijsNogEens } = await db.client.query(
        "select count(*)::int as n from public.kans_bewijs where kans_id = $1",
        [kansMetDienst],
      );
      eqc("scenario 40: nog steeds precies één bewijsrij, geen dubbele", String(bewijsNogEens[0].n), "1");
    }

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
