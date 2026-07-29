import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { determineStage } from "@/lib/pipeline/stage";
import { loadPeriods, resolvePeriod } from "@/lib/pipeline/periods";
import { PrepareProgress } from "./prepare-progress";
import { MeasureProgress } from "./measure-progress";
import { Chapter } from "@/components/chapter";
import { SectionRail } from "@/components/section-rail";
import { PeriodPicker } from "@/components/period-picker";
import { ChapterSkeleton } from "@/components/skeleton";
import { StandChapter } from "./_chapters/stand";
import { BewijsChapter } from "./_chapters/bewijs";
import { WerkChapter } from "./_chapters/werk";
import { ResultaatChapter } from "./_chapters/resultaat";
import { countNow, loadWork } from "@/lib/work";

/**
 * HET DOSSIER — één analyse, van boven naar beneden te lezen.
 *
 * ── WAAROM DIT GEEN TABBLADEN MEER ZIJN ─────────────────────────────────────
 *
 * Een analyse was verdeeld over vijf tabbladen. Dat is een platte, volgordeloze
 * structuur voor werk dat juist een strikte volgorde heeft: je meet, je ziet
 * waar je mist, je doet er iets aan, en weken later zie je of het gewerkt heeft.
 *
 * Erger nog: één stuk werk kruiste vier schermen. Een aanbevolen pagina begon op
 * het rapport-tabblad, verhuisde naar de bibliotheek, werd daar op een
 * detailpagina gepubliceerd en dook weer op als resultaat op het
 * overzicht-tabblad. Dezelfde pagina, vier plekken.
 *
 * Nu vier hoofdstukken in vaste leesvolgorde. De volgorde ís de logica, en
 * hoofdstuk 04 voedt volgende periode hoofdstuk 01.
 *
 * ── STREAMEN, NIET BLOKKEREN ────────────────────────────────────────────────
 *
 * Elk hoofdstuk is een eigen async component achter een `<Suspense>`. De score
 * verschijnt zodra die er is, terwijl het bewijs nog geladen wordt. Voorheen
 * blokkeerde het rapport-tabblad op zeven queries vóór er één byte HTML de deur
 * uit ging — één pagina met streaming is dus sneller dan vijf zonder.
 */
export default async function DossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periode?: string; runs?: string }>;
}) {
  const { id } = await params;
  const { periode, runs } = await searchParams;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  // Wacht het concept op goedkeuring, dan is dát het scherm — één taak, geen
  // hoofdstukken die toch nog leeg zijn.
  if (analysis.status === "concept_klaar") redirect(`/analyses/${id}/concept`);

  const supabase = await createClient();

  // Loopt de voorbereiding of de meting nog, dan is er geen dossier om te tonen
  // maar voortgang om te volgen. Dat is geen hoofdstuk maar een andere toestand
  // van hetzelfde scherm.
  if (analysis.status === "bezig" || analysis.status === "mislukt") {
    const stage = await determineStage(supabase, id);
    if (stage === "prepare") {
      return <PrepareProgress analysisId={id} initialStatus={analysis.status} />;
    }
    if (stage === "measure") {
      return <MeasureProgress analysisId={id} initialStatus={analysis.status} />;
    }
    // stage === "report": de meting is gelukt, val door naar het dossier.
  }

  if (analysis.status === "meten") {
    return <MeasureProgress analysisId={id} initialStatus={analysis.status} />;
  }

  // De periode wordt hier één keer bepaald en aan alle hoofdstukken doorgegeven.
  // Voorheen gold de periodekiezer alleen op het rapport-tabblad, waardoor je
  // een rapport van april kon lezen met de score van juli ernaast.
  const periods = await loadPeriods(supabase, id);
  const weekNo = resolvePeriod(periods, periode);

  // Voor de rail: hoeveel er in hoofdstuk 03 op de klant wacht. Dat is het enige
  // wat een tabbalk nooit deed — laten zien waar iets op je ligt te wachten.
  const work = await loadWork(supabase, analysis);
  const openCount = countNow(work);
  const running = work.some((w) => w.state === "loopt");

  return (
    // Mobiel: de rail is een meescrollende chiprij bóven de inhoud. Desktop:
    // een verticale rail ernaast.
    <div className="flex flex-col lg:flex-row lg:gap-10">
      <SectionRail
        sections={[
          { id: "stand", label: "Stand" },
          { id: "bewijs", label: "Waar je mist" },
          {
            id: "werk",
            label: "Wat je moet doen",
            badge: openCount > 0 ? `${openCount} open` : running ? "loopt" : undefined,
            live: running,
          },
          { id: "resultaat", label: "Opgeleverd" },
        ]}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-16">
        <Chapter
          id="stand"
          number="01"
          title="Hoe je ervoor"
          accent="staat"
          intro="Hoe vaak een AI-assistent jou noemt op de vragen die er voor jouw markt toe doen."
          aside={<PeriodPicker analysisId={id} periods={periods} selected={weekNo} />}
        >
          <Suspense fallback={<ChapterSkeleton blocks={2} />}>
            <StandChapter analysis={analysis} weekNo={weekNo} />
          </Suspense>
        </Chapter>

        <Chapter
          id="bewijs"
          number="02"
          title="Waar je wint"
          accent="en mist"
          intro="Het bewijs onder het cijfer: tegen wie je het opneemt en op welke vragen je nu niet genoemd wordt."
        >
          <Suspense fallback={<ChapterSkeleton blocks={2} />}>
            <BewijsChapter analysis={analysis} weekNo={weekNo} focusRuns={runs} />
          </Suspense>
        </Chapter>

        <Chapter
          id="werk"
          number="03"
          title="Wat je nu"
          accent="moet doen"
          intro="Alles wat er te doen valt, op volgorde van belang. Bovenaan staat waar het vastloopt zonder jou."
        >
          <Suspense fallback={<ChapterSkeleton blocks={2} />}>
            <WerkChapter analysis={analysis} />
          </Suspense>
        </Chapter>

        <Chapter
          id="resultaat"
          number="04"
          title="Wat het heeft"
          accent="opgeleverd"
          intro="Wat de pagina's die je publiceerde met je zichtbaarheid gedaan hebben — afgezet tegen vragen waarvoor je niets deed."
        >
          <Suspense fallback={<ChapterSkeleton blocks={1} />}>
            <ResultaatChapter analysis={analysis} />
          </Suspense>
        </Chapter>

        <p className="text-sm text-muted">
          Klopt er iets niet aan de vragen of de scope?{" "}
          <Link href={`/analyses/${id}/instellingen`} className="underline">
            Naar de instellingen van deze analyse
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
