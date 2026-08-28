import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ErrorNotice } from "@/components/error-notice";
import { FactRequests } from "../../_components/fact-requests";
import { gapLink } from "@/lib/profile-gaps";
import { loadOpenQuestions } from "@/lib/open-questions";
import { activeOnly } from "@/lib/archive";
import type { UserFacingError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const metadata = { title: "Openstaande vragen" };

/**
 * OPENSTAANDE VRAGEN: alles wat ORBIT ENGINE nog van de klant wil weten.
 *
 * ── ⚠️ DIT SCHERM STOND TOT 28 AUGUSTUS 2026 ONDER MERKPROFIEL ──────────────
 *
 * Als "Vraagt jouw input", op `/merk/[id]/merkprofiel/input`, en het toonde
 * alleen de vragen uit het merkonderzoek. De vragen die uit het rapport van een
 * cluster kwamen stonden ergens anders: in hoofdstuk 03 van dát cluster. Voor
 * de klant is dat één vraag ("moet ik nog iets aanvullen?") op twee plekken, en
 * dat is precies de splitsing die op 17 augustus 2026 al eens is opgeheven toen
 * "Feitenvragen" en "Openstaande punten" samengingen.
 *
 * Nu staan ze hier allemaal, met een filter per cluster. Het oude adres
 * verwijst permanent hierheen (`lib/redirects.ts`), want het stond in de
 * werklijst, in bladwijzers en in de onboardingsessie.
 *
 * ── ⚠️ WAAROM ONDER STRATEGIE EN NIET ONDER MERKPROFIEL ─────────────────────
 *
 * Merkprofiel beantwoordt "wie ben ik volgens ORBIT ENGINE, en klopt dat".
 * Strategie beantwoordt "wat gaan we doen". Deze vragen bepalen wat er
 * geschreven wordt, en sinds de eindpoort (`lib/content-final-gate.ts`) bepalen
 * ze zelfs of een pagina afgerond kan worden. Dat is strategiewerk geworden,
 * geen profielonderhoud. Het staat daarom tussen Clusters en Contentplan in: de
 * meting levert de vragen, de antwoorden voeden het plan.
 *
 * ── ⚠️ ELKE REGEL IN BEELD IS TE BEANTWOORDEN (24 AUGUSTUS 2026) ────────────
 *
 * Die regel blijft staan. De open punten uit de synthese stonden hier ooit als
 * platte tekst: bij Van den Udenhout tien vragen onder de kop "10 open", zonder
 * één invoerveld eronder. Ze zijn sindsdien gewone feitenvragen
 * (`lib/pipeline/gap-questions.ts`). Wat er nu staat is twee soorten, en met
 * allebei kun je iets: een vraag beantwoorden of overslaan, of een open punt
 * invullen op het bewerkscherm.
 *
 * ── ⚠️ DE GESPREKSNOTITIES STAAN HIER NIET ─────────────────────────────────
 *
 * Ze stonden ooit onderaan dit scherm, afgeschermd voor de klant, en zijn op 17
 * augustus 2026 naar `/merk/[id]/admin` verhuisd. Wegvouwen is niet afschermen:
 * het waren aantekeningen óver de klant op een scherm dat voor hém bedoeld is,
 * en dan sta je in een demo één misklik van een ongemakkelijk gesprek af.
 */
export default async function VragenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  await requireUser();

  const supabase = await createClient();

  // De clusternamen dragen het filter. Gearchiveerde clusters blijven eruit
  // (migratie 0044): een vraag uit een cluster dat niet meer meedoet is geen
  // werk meer.
  const [vragen, { data: analysisRows }] = await Promise.all([
    loadOpenQuestions(supabase, profile),
    activeOnly(supabase.from("analyses").select("id, topic").eq("profile_id", id)),
  ]);

  const analyses = (analysisRows ?? []) as { id: string; topic: string | null }[];
  const actieveIds = new Set(analyses.map((a) => a.id));

  // ⚠️ Vragen uit een gearchiveerd cluster vallen weg. Zonder dit filter staan
  // ze onder een filterknop die er niet is, en dan zijn ze alleen zichtbaar via
  // "Alles" zonder dat iemand ziet waar ze vandaan komen.
  const facts = vragen.facts.filter((f) => f.analysis_id === null || actieveIds.has(f.analysis_id));

  // De volgorde van het filter: eerst het merk, dan de clusters op naam. Het
  // merk staat vooraan omdat die antwoorden élke pagina van élk cluster
  // verbeteren, en de clustervragen maar één cluster.
  const groepen = [
    { id: "merk", naam: "Over je merk" },
    ...analyses
      .map((a) => ({ id: a.id, naam: a.topic ?? "Cluster" }))
      .sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
  ];

  const mislukt: UserFacingError | null = vragen.fout
    ? {
        kind: "unknown",
        title: "ORBIT ENGINE kon je vragen nu niet ophalen",
        message:
          "Er ging iets mis bij het ophalen. Ververs de pagina. Blijft het misgaan, laat het ons dan weten.",
        canRetry: false,
        detail: "",
      }
    : null;

  const gaps = vragen.gaps;
  const open = facts.filter((f) => f.status === "open").length + gaps.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Strategie"
        title={open === 0 ? "Openstaande vragen" : `Openstaande vragen · ${open} open`}
        // ⚠️ De tweede zin is nieuw en hij is de reden dat dit scherm ertoe doet:
        // sinds de eindpoort houdt een openstaande vraag een pagina tegen. Dat
        // hoort de klant hier te lezen en niet pas bij een geblokkeerde knop.
        description="Elk antwoord maakt de meting scherper en de teksten concreter. Zolang er vragen open staan, kan ORBIT ENGINE een pagina niet afronden. Overslaan mag altijd en telt als antwoord."
      />

      {mislukt && <ErrorNotice error={mislukt} />}

      {/* ── 1. De vragen, met filter en invoerveld ─────────────────────────── */}
      {facts.length > 0 && (
        <FactRequests
          profileId={id}
          initial={facts}
          groepen={groepen}
          kop="Wat ORBIT ENGINE nog van je wil weten"
        />
      )}

      {/* ── 2. Open punten in het profiel ──────────────────────────────────── */}
      {gaps.length > 0 && (
        <div className="card flex flex-col gap-3">
          <span className="mono-label">Dit zou de meting scherper maken</span>
          <ul className="flex flex-col gap-3">
            {gaps.map((gap) => {
              const href = gapLink(id, gap.field);
              return (
                <li
                  key={gap.field}
                  className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-medium">{gap.label}</span>
                    <p className="text-sm text-secondary">{gap.effect}</p>
                  </div>
                  {href && (
                    <Link href={href} className="btn-outline w-fit shrink-0">
                      Invullen
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── 3. Niets open ──────────────────────────────────────────────────────
          Eén bevestiging waar er twee stonden. Twee groene kaarten onder elkaar
          die allebei "er is niets" zeggen lezen als een fout in het scherm. Bij
          een mislukte query verschijnt hij niet: dan weten we het niet. */}
      {!mislukt && facts.length === 0 && gaps.length === 0 && (
        <div className="card card-success flex flex-col gap-1">
          <span className="mono-label">Niets open</span>
          <p className="text-secondary">
            ORBIT ENGINE heeft alles wat het nodig heeft. Komen er bij een volgende meting
            nieuwe vragen bij, dan staan ze hier.
          </p>
        </div>
      )}
    </div>
  );
}
