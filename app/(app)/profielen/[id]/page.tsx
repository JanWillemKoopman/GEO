import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { ProfileProgress } from "./profile-progress";
import { ProfileEditor } from "./profile-editor";
import { EntitiesManager } from "./entities-manager";
import { AuditPanel } from "@/components/audit-panel";
import { OpenQuestions, countOpenQuestions } from "./open-questions";
import { MilestonesBlock } from "@/components/milestones-block";
import { InsightsBlock, OpportunitiesBlock } from "@/components/loop-blocks";
import { loadLoop } from "@/lib/insights-data";
import { SearchConsoleBox } from "./search-console-box";
import { serviceAccountEmail } from "@/lib/search-console/auth";
import { loadMilestones } from "@/lib/milestones-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { AssignBox } from "./assign-box";
import { TopicsPanel } from "./topics-panel";
import { LlmKnowledgePanel } from "./llm-knowledge-panel";
import { StrategyBox } from "./strategy-box";
import { ProfileReadinessPanel } from "./profile-readiness-panel";
import { OfferingsPanel } from "./offerings-panel";
import { ConfidenceChip } from "@/components/confidence-chip";
import { assessStructureCoverage } from "@/lib/pipeline/structure-gap";
import {
  onboardingStats,
  onboardingHeadline,
} from "@/lib/pipeline/onboarding-summary";
import type {
  BaselineVerdict,
  CategoryVerdict,
} from "@/lib/pipeline/baseline-verdict";
import { ProfileHero } from "./profile-hero";
import { ProfileSection } from "./profile-section";
import {
  parseContextFactors,
  technicalAdviceStale,
  staleAdviceNotice,
} from "@/lib/pipeline/context-factors";
import type { AuditCheck } from "@/lib/audit/technical";
import type {
  Entity,
  FactRequest,
  ProfileLlmBaseline,
  ProfileOffering,
  ProfileTopic,
  TechnicalAudit as TechnicalAuditRow,
} from "@/lib/types/database";

// A.4: geen layout.tsx boven deze route, dus de titel staat direct op de
// pagina. `getProfile` is gememoïseerd (lib/profiles.ts), dus dit is geen
// tweede query naast de pagina zelf.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) return {};
  return { title: profile.brand_name ?? profile.name };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  // De toewijsknop is een beheerdersding: een klant mag zijn eigen merk niet
  // weggeven. Zie lib/staff.ts.
  const user = await requireUser();
  const staff = await isStaff(user.id);

  if (profile.status !== "klaar") {
    return <ProfileProgress profileId={id} initialStatus={profile.status} />;
  }

  const supabase = await createClient();
  const [
    { count },
    { data: pageRows },
    { data: entityRows },
    { data: auditRow },
    { data: factRows },
    { data: topicRows },
    { data: baselineRows },
    { data: strategyRow },
    { data: offeringRows },
    { data: offeringFacetRow },
    { data: synthesisRow },
  ] = await Promise.all([
    supabase
      .from("profile_pages")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id),
    // De gecrawlde pagina's zelf, voor de structurele dekkingsanalyse
    // (docs/tasks/inspace-optimalisaties-1-4.md, 1). Alleen url en titel: de
    // volledige tekst van 150 pagina's door een servercomponent halen om er
    // termen uit te tellen is verspilling, en `scorePage()` heeft aan de titel
    // en de slug genoeg voor het onderscheid "eigen pagina of niet".
    supabase.from("profile_pages").select("url, title").eq("profile_id", id),
    // Concurrenten horen bij het PROFIEL, niet bij één analyse (optimalisatie.md
    // 2.4/2.7): dezelfde concurrent duikt op bij meerdere onderwerpen van
    // hetzelfde merk, en die moet dan één rij zijn.
    supabase
      .from("entities")
      .select("*")
      .eq("profile_id", id)
      .order("canonical_name"),
    // De laatste technische controle (optimalisatie.md 3B).
    supabase
      .from("technical_audits")
      .select("*")
      .eq("profile_id", id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Feitenvragen uit het rapport (optimalisatie.md 4.6). Overgeslagen vragen
    // blijven weg: één keer "weet ik niet" is genoeg.
    supabase
      .from("fact_requests")
      .select("*")
      .eq("profile_id", id)
      .in("status", ["open", "beantwoord"])
      .order("created_at"),
    // De core topics (blok D): afgeleid uit de aanbodboom, handmatig aan of uit.
    supabase
      .from("profile_topics")
      .select("*")
      .eq("profile_id", id)
      .order("priority", { ascending: false }),
    // Wat AI-assistenten al over dit merk weten (blok B fase 3).
    supabase
      .from("profile_llm_baseline")
      .select("*")
      .eq("profile_id", id)
      .order("measured_at"),
    // Wat er uit het gesprek kwam (blok C).
    supabase
      .from("profile_strategy")
      .select("*")
      .eq("profile_id", id)
      .maybeSingle(),
    // De aanbodboom uit fase 1, met bron per knoop, zodat een verkeerde dienst
    // te corrigeren is zonder handmatig uit te zoeken waar hij vandaan kwam.
    supabase
      .from("profile_offerings")
      .select("*")
      .eq("profile_id", id)
      .order("sort_order"),
    // De zekerheid van de aanbodboom: het aandeel knopen dat een geldige bron
    // overleefde (fase 1). Onder de drempel hoort daar een markering bij.
    supabase
      .from("profile_facets")
      .select("confidence")
      .eq("profile_id", id)
      .eq("facet", "aanbod")
      .maybeSingle(),
    // De synthese (fase 5): het dossier in gewone taal plus de gespreksagenda.
    supabase
      .from("profile_facets")
      .select("summary, raw_json, confidence")
      .eq("profile_id", id)
      .eq("facet", "synthese")
      .maybeSingle(),
  ]);

  const audit = auditRow as TechnicalAuditRow | null;

  // Een aanstaande sitemigratie maakt het technische advies tijdelijk
  // waardeloos: die bevindingen gaan over pagina's die straks niet bestaan.
  // Dat hoort bóven de audit te staan, niet als notitie ergens anders.
  const factors = parseContextFactors(
    (strategyRow as { context_factors?: unknown } | null)?.context_factors,
  );
  const staleFactor = technicalAdviceStale(factors);
  const offeringConfidence =
    (offeringFacetRow as { confidence?: number | null } | null)?.confidence ??
    null;

  // Welke onderdelen van het aanbod een eigen pagina hebben. Afgeleid bij het
  // lezen en niet opgeslagen: de uitkomst verandert zodra er een pagina bijkomt,
  // en een opgeslagen kopie zou een vierde plek zijn die kan verouderen.
  const coverage = assessStructureCoverage(
    (offeringRows ?? []) as ProfileOffering[],
    ((pageRows ?? []) as { url: string; title: string | null }[]).map((p) => ({
      url: p.url,
      title: p.title,
      text: "",
    })),
  );

  // ── De kop: één zin en drie cijfers (ux-design.md regel 1) ───────────────
  //
  // De oordelen staan al in `profile_llm_baseline`; hier worden ze alleen
  // uitgesplitst naar de twee soorten. De rekenkant zit in
  // `onboarding-summary.ts`, puur en getest.
  const baselines = (baselineRows ?? []) as ProfileLlmBaseline[];
  const knowsVerdicts = baselines
    .filter((r) => r.block === "kent")
    .map((r) => r.verdict_json as BaselineVerdict | null)
    .filter((v): v is BaselineVerdict => v !== null);
  const categoryVerdicts = baselines
    .filter((r) => r.block === "categorie")
    .map((r) => r.verdict_json as CategoryVerdict | null)
    .filter((v): v is CategoryVerdict => v !== null);

  const merknaam = profile.brand_name ?? profile.name;
  const samenvatting = {
    brandName: merknaam,
    knowsVerdicts,
    categoryVerdicts,
    coverage,
  };

  // De enige primaire actie op dit scherm. Het hoogst geprioriteerde
  // openstaande onderwerp is concreter dan "start een analyse", de klant leest
  // waar hij op gaat meten in plaats van wat de knop technisch doet.
  const topics = (topicRows ?? []) as ProfileTopic[];
  const volgendeTopic = topics
    .filter((t) => t.status !== "afgewezen" && !t.analysis_id)
    .sort((a, b) => b.priority - a.priority)[0];
  const primaryAction = volgendeTopic
    ? {
        href: `/profielen/${id}#onderwerpen`,
        label: `Meet "${volgendeTopic.title}"`,
      }
    : { href: "/analyses/nieuw", label: "Start een analyse" };

  const dossier =
    (synthesisRow as { summary?: string | null } | null)?.summary ?? null;
  const dossierConfidence =
    (synthesisRow as { confidence?: number | null } | null)?.confidence ?? null;
  const researchGaps = (
    ((synthesisRow as { raw_json?: { gaps?: unknown } } | null)?.raw_json
      ?.gaps ?? []) as unknown[]
  ).filter((g): g is string => typeof g === "string" && g.trim().length > 0);

  // De teller in de kop van het vragenblok. Eén bron, zodat de badge en de
  // banner binnenín nooit uit elkaar kunnen lopen.
  // Het opbrengstblok (fase 5, besluit 16). Leest het account, de scores en de
  // gepubliceerde pagina's; dat laatste kan niet met de klant-client, want dat
  // telt over álle analyses van het merk.
  const beheerClient = createAdminClient();
  const mijlpalen = await loadMilestones(beheerClient, id, profile.account_id);

  // Zoekdata (fase 5). Alleen het aantal dagen: de grafiek zelf komt in het
  // analysescherm, hier hoort de stand van de koppeling.
  // De lus (fase 6): drie zinnen over wat er gebeurde, en één kansenlijst.
  const lus = await loadLoop(beheerClient, id);

  const { count: gscDagen } = await beheerClient
    .from("search_console_days")
    .select("day", { count: "exact", head: true })
    .eq("profile_id", id);

  const openVragen = countOpenQuestions(
    profile,
    (factRows ?? []) as FactRequest[],
    researchGaps,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ── 1. Wie is dit, en hoe staat het ervoor ─────────────────────────
          De pagina had geen kop en geen <h1>; de merknaam stond pas halverwege
          in de editor. Dit is het scherm dat de consultant deelt in de demo. */}
      <ProfileHero
        brandName={merknaam}
        url={profile.url}
        headline={onboardingHeadline(samenvatting)}
        stats={onboardingStats(samenvatting)}
        primaryAction={primaryAction}
        showNotes={staff}
      />

      {/* ── Wat dit tot nu toe opleverde ───────────────────────────────────
          `docs/Nova.md` §5: door besluit 7 (doorlopend opzegbaar) is dit het
          blok dat opzeggen tegenhoudt. Het staat daarom hoog en niet weggestopt
          in een analysescherm. */}
      <MilestonesBlock milestones={mijlpalen} />

      {/* ── Wat er deze maand gebeurde ─────────────────────────────────────
          Fase 6. Drie zinnen, en de meetonzekerheid staat erin: een sprong die
          binnen de ruis valt heet hier "gelijk gebleven". */}
      <InsightsBlock insights={lus.insights} />

      {/* Het profiel gaat op 'klaar' na stap 2 van 8. Dit blok toont eerst wat
          er nog binnenkomt, en daarna of het dossier compleet is. Het meldt het
          afrondingsmoment ook actief, met een broodroostermelding. */}
      <ProfileReadinessPanel profileId={id} brandName={merknaam} />

      {/* ── 2. Wat Aura nog van je wil weten ───────────────────────────────
          Stond op twee plekken, allebei onder de vouw: de vragen mét invoerveld
          op plek 7 binnen "Profielgegevens", de open punten op plek 5 binnen
          "Het gesprek". Voor de gebruiker is dat één ding, dus staat het nu op
          één plek, hoog, met de teller in de kop. */}
      <ProfileSection
        id="vragen"
        title="Wat Aura nog van je wil weten"
        description="Elk antwoord maakt de meting scherper en de teksten concreter. Overslaan mag altijd."
        badge={openVragen > 0 ? `${openVragen} open` : "niets open"}
      >
        <OpenQuestions
          profile={profile}
          facts={(factRows ?? []) as FactRequest[]}
          researchGaps={researchGaps}
        />
      </ProfileSection>

      {/* ── Waar begin je ──────────────────────────────────────────────────
          Fase 6: adviezen zaten verspreid over het rapport, de onderwerpen en de
          audit. Eén lijst, gesorteerd op wat het oplevert, met de handeling
          erbij. */}
      <ProfileSection
        id="kansen"
        title="Waar begin je"
        description="Alle kansen op één rij, gesorteerd op wat ze opleveren. Wat al betaald is of alles blokkeert, staat bovenaan."
        badge={lus.opportunities.length > 0 ? `${lus.opportunities.length} open` : "niets open"}
      >
        <OpportunitiesBlock opportunities={lus.opportunities} />
      </ProfileSection>

      {/* ── Zoekdata koppelen ──────────────────────────────────────────────
          Besluit 4: AI-zichtbaarheid is het verhaal, Google is het bewijsstuk.
          Dit is het eerste dat Aura écht van de klant vraagt, dus de instructie
          staat voluit in het scherm. */}
      <ProfileSection
        id="zoekdata"
        title="Zoekdata uit Google"
        description="De klikken uit Google naast je zichtbaarheid in AI-antwoorden. Het bewijsstuk onder het verhaal."
        badge={profile.gsc_verified_at ? "gekoppeld" : "niet gekoppeld"}
      >
        <SearchConsoleBox
          profileId={id}
          property={profile.gsc_property}
          verifiedAt={profile.gsc_verified_at}
          lastError={profile.gsc_last_error}
          serviceAccountEmail={serviceAccountEmail()}
          dagen={gscDagen ?? 0}
        />
      </ProfileSection>

      {/* ── 3. Het verhaal, in de volgorde van de demo ─────────────────────
          Eerst wat we vonden, dan wat we gaan doen. */}
      {dossier && (
        <ProfileSection
          id="dossier"
          title="Het dossier"
          description="Wat Aura van je website begreep, in gewone taal. De basis onder alles hieronder."
        >
          <div className="card flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono-label">Wat Aura van je site begreep</span>
              <ConfidenceChip confidence={dossierConfidence} />
            </div>
            <p className="text-secondary">{dossier}</p>
          </div>
        </ProfileSection>
      )}

      <ProfileSection
        id="ai-kennis"
        title="Wat AI-assistenten over je weten"
        description="De nulmeting, uitgesplitst per vraag: wat ChatGPT antwoordde en waar dat vandaan kwam."
      >
        <LlmKnowledgePanel rows={baselines} />
      </ProfileSection>

      <ProfileSection
        id="aanbod"
        title="Wat je aanbiedt"
        description="Je diensten en producten zoals Aura ze op je site vond, en welke nog geen eigen pagina hebben."
        badge={
          coverage.assessed > 0
            ? `${coverage.missing} zonder eigen pagina`
            : undefined
        }
      >
        <OfferingsPanel
          profileId={id}
          offerings={(offeringRows ?? []) as ProfileOffering[]}
          inventory={profile.inventory_quality_json}
          confidence={offeringConfidence}
          coverage={coverage}
        />
      </ProfileSection>

      <ProfileSection
        id="onderwerpen"
        title="Onderwerpen om op te meten"
        description="Waar Aura je zichtbaarheid op gaat volgen. Zet uit wat niet past, start wat wel past."
        badge={topics.length > 0 ? `${topics.length} voorgesteld` : undefined}
      >
        <TopicsPanel profileId={id} initial={topics} />
      </ProfileSection>

      {/* ── 4. Het gesprek ─────────────────────────────────────────────────
          De werkvloer van het uur consultancy.

          ⚠️ ALLEEN VOOR DE CONSULTANT, NIET VOOR DE KLANT.

          Dit zijn aantekeningen ÓVER de klant, geen aantekeningen vóór hem: wat
          er speelt, wat er gevoelig ligt, welke contextfactoren het advies
          kleuren. Dat hoort niet op het scherm van degene over wie het gaat.

          Zo doet Nova het ook, en dat is na te lezen in hun berichtenbestand:
          een klant ziet daar precies vier bestemmingen (`nav`: Overview,
          Strategy, Analytics, Account). Alles wat de CSM over een klant
          vastlegt zit in de aparte `admin`-namespace, inclusief
          `admin.onboardingProfile` ("View onboarding profile for {domain}").
          Er is geen enkele sleutel waarmee een klant de notities van zijn CSM
          zou kunnen lezen.

          De rest van dit scherm is wél voor allebei: het dossier, de nulmeting,
          het aanbod, de onderwerpen en de vragen zijn precies wat de klant
          komt halen. */}
      {staff && (
        <ProfileSection
          id="gesprek"
          title="Het gesprek"
          description="Je aantekeningen bij dit merk, en wat er speelt dat het advies beïnvloedt. Alleen jij ziet dit."
        >
          <div className="flex flex-col gap-4">
            <StrategyBox
              profileId={id}
              initialNotes={
                (strategyRow as { strategy_notes?: string | null } | null)
                  ?.strategy_notes ?? null
              }
              initialFactors={factors}
            />
          </div>
        </ProfileSection>
      )}

      {/* ── 5. Naslag ──────────────────────────────────────────────────────
          Alles wat je nakijkt of bijstelt, niet wat je presenteert. Standaard
          dicht: dit is gereedschap, geen verhaal. */}
      <ProfileSection
        id="techniek"
        title="Technische controle"
        description="Of AI-assistenten je site mogen lezen, en of je gegevens overal hetzelfde zijn."
        variant="naslag"
      >
        <div className="flex flex-col gap-4">
          {staleFactor && (
            <p
              className="card text-sm text-[var(--status-warning)]"
              role="status"
            >
              {staleAdviceNotice(staleFactor)}
            </p>
          )}
          {audit ? (
            <AuditPanel
              checks={(audit.checks_json ?? []) as AuditCheck[]}
              checkedAt={audit.checked_at}
              siteUrl={audit.site_url}
            />
          ) : (
            <div className="card flex flex-col gap-2">
              <span className="mono-label">Technische controle · loopt</span>
              <p className="text-secondary">
                Aura controleert nog of AI-assistenten je site mogen lezen. De
                uitslag staat hier zodra dat klaar is. Jij hoeft niets te doen.
              </p>
            </div>
          )}
        </div>
      </ProfileSection>

      <ProfileSection
        id="profiel"
        title="Profielgegevens"
        description="De gegevens waar Aura mee rekent: naam, schrijfwijzen, werkgebied en concurrenten."
        variant="naslag"
      >
        <div className="flex flex-col gap-4">
          <ProfileEditor initial={profile} inventoryCount={count ?? 0} />
          <EntitiesManager
            profileId={id}
            initial={(entityRows ?? []) as Entity[]}
          />
        </div>
      </ProfileSection>

      {/* ── 5. Beheer ──────────────────────────────────────────────────────
          Toewijzen stond op plek 4, tussen de bevindingen, op een scherm dat
          de consultant deelt terwijl de klant meekijkt naar de knop waarmee hij
          wordt overgedragen. Het is bovendien een handeling van ná het gesprek,
          niet tijdens. Dus onderaan, en alleen voor beheerders. */}
      {staff && (
        <ProfileSection
          id="beheer"
          title="Beheer"
          description="Dit merk aan een klantaccount koppelen. Doe je ná het gesprek, niet tijdens."
          variant="naslag"
        >
          <AssignBox
            profileId={id}
            currentUserId={profile.user_id}
            assignedAt={profile.assigned_at}
          />
        </ProfileSection>
      )}
    </div>
  );
}
