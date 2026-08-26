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
import { ChapterTabs } from "@/components/chapter-tabs";
import { PeriodPicker } from "@/components/period-picker";
import { ChapterSkeleton } from "@/components/skeleton";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { StandChapter } from "./_chapters/stand";
import { BewijsChapter } from "./_chapters/bewijs";
import { WerkChapter } from "./_chapters/werk";
import { ResultaatChapter } from "./_chapters/resultaat";
import { countNow, loadWork } from "@/lib/work";

/** De vier hoofdstukken van het dossier, in vaste leesvolgorde. */
const HOOFDSTUKKEN = ["stand", "bewijs", "werk", "resultaat"] as const;
type Hoofdstuk = (typeof HOOFDSTUKKEN)[number];

function isHoofdstuk(value: string | undefined): value is Hoofdstuk {
  return HOOFDSTUKKEN.includes(value as Hoofdstuk);
}

/**
 * HET DOSSIER: één analyse, als vier losse tabbladen.
 *
 * ── VAN DOORLOPENDE PAGINA NAAR TABBLADEN (26 augustus 2026) ────────────────
 *
 * Dit was één doorlopende scrollpagina met vier hoofdstukken onder elkaar en
 * een rail ernaast, zie de git-historie voor de toenmalige redenen (werk dat
 * tabbladen kruiste, hoofdstuk 04 dat hoofdstuk 01 voedt). Op expliciet
 * verzoek staat de balk nu boven de inhoud, sticky, en toont hij één
 * hoofdstuk tegelijk: `?hoofdstuk=stand|bewijs|werk|resultaat` in de URL.
 *
 * De risico's van de oude opzet blijven staan, ze zijn alleen niet meer met
 * schermruimte opgelost: de vier hoofdstukken lezen nog altijd op volgorde
 * (de nummering 01 t/m 04 in de tabbalk blijft), en hoofdstuk 04 benoemt in
 * zijn eigen tekst nog steeds dat hij hoofdstuk 01 van de volgende periode
 * voedt. Wat wél vervalt: je kunt niet meer met één scroll van meting naar
 * bewijs naar werk lopen, dat is nu drie klikken.
 *
 * ── STREAMEN, NIET BLOKKEREN ────────────────────────────────────────────────
 *
 * Alleen het actieve hoofdstuk rendert, achter zijn eigen `<Suspense>`. De
 * badges op de andere tabbladen (open werk, "loopt") komen uit data die sowieso
 * al geladen wordt (`loadWork`, voor de rail), dus die kosten geen extra call
 * bovenop het actieve hoofdstuk.
 */
export default async function DossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periode?: string; runs?: string; hoofdstuk?: string }>;
}) {
  const { id } = await params;
  const { periode, runs, hoofdstuk } = await searchParams;
  // Een link met `runs` erin wijst altijd naar het bewijs, ook zonder expliciet
  // gekozen tabblad. Zonder deze regel opent zo'n link stil op "Stand" en lijkt
  // de link kapot.
  const actief: Hoofdstuk = isHoofdstuk(hoofdstuk) ? hoofdstuk : runs ? "bewijs" : "stand";
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  // Wacht het concept op goedkeuring, dan is dát het scherm, één taak, geen
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

  // Voor de tabbalk: hoeveel er in hoofdstuk 03 op de klant wacht, ongeacht
  // welk hoofdstuk nu open staat.
  const work = await loadWork(supabase, analysis);
  const openCount = countNow(work);
  const running = work.some((w) => w.state === "loopt");

  // Bouwt de URL voor een tabblad, met behoud van `periode` (die geldt voor
  // meer dan één hoofdstuk) maar zonder `runs` (die hoort alleen bij de link
  // die je hier naartoe bracht, niet bij tabbladen die je daarna zelf kiest).
  const hrefFor = (tab: string) => {
    const query = new URLSearchParams();
    if (tab !== "stand") query.set("hoofdstuk", tab);
    if (periode) query.set("periode", periode);
    const qs = query.toString();
    return `/analyses/${id}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col">
      <ChapterTabs
        active={actief}
        hrefFor={hrefFor}
        tabs={[
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
        {actief === "stand" && (
          <Chapter
            id="stand"
            number="01"
            title="Hoe je ervoor"
            accent="staat"
            intro="Eén cijfer: hoe vaak AI-assistenten jou noemen op de vragen die er in jouw markt toe doen."
            aside={<PeriodPicker analysisId={id} periods={periods} selected={weekNo} />}
          >
            <SectionErrorBoundary label="Hoofdstuk 01, Hoe je ervoor staat">
              <Suspense fallback={<ChapterSkeleton blocks={2} />}>
                <StandChapter analysis={analysis} weekNo={weekNo} />
              </Suspense>
            </SectionErrorBoundary>
          </Chapter>
        )}

        {actief === "bewijs" && (
          <Chapter
            id="bewijs"
            number="02"
            title="Waar je wint"
            accent="en mist"
            intro="Het bewijs onder het cijfer. Tegen wie je het opneemt, en op welke vragen je nu niet genoemd wordt."
          >
            <SectionErrorBoundary label="Hoofdstuk 02, Waar je wint en mist">
              <Suspense fallback={<ChapterSkeleton blocks={2} />}>
                <BewijsChapter analysis={analysis} weekNo={weekNo} focusRuns={runs} />
              </Suspense>
            </SectionErrorBoundary>
          </Chapter>
        )}

        {actief === "werk" && (
          <Chapter
            id="werk"
            number="03"
            title="Wat je nu"
            accent="moet doen"
            intro="Alles wat er te doen valt, op volgorde van belang. Bovenaan staat wat zonder jou stilligt."
          >
            <SectionErrorBoundary label="Hoofdstuk 03, Wat je nu moet doen">
              <Suspense fallback={<ChapterSkeleton blocks={2} />}>
                <WerkChapter analysis={analysis} work={work} />
              </Suspense>
            </SectionErrorBoundary>
          </Chapter>
        )}

        {actief === "resultaat" && (
          <Chapter
            id="resultaat"
            number="04"
            title="Wat het heeft"
            accent="opgeleverd"
            intro="Wat je gepubliceerde pagina's met je zichtbaarheid deden, afgezet tegen vragen waarvoor je niets deed. Gemeten, niet beloofd."
          >
            <SectionErrorBoundary label="Hoofdstuk 04, Wat het heeft opgeleverd">
              <Suspense fallback={<ChapterSkeleton blocks={1} />}>
                <ResultaatChapter analysis={analysis} />
              </Suspense>
            </SectionErrorBoundary>
          </Chapter>
        )}

        <p className="text-sm text-muted">
          Klopt er iets niet aan de vragen of de afbakening?{" "}
          <Link href={`/analyses/${id}/instellingen`} className="underline">
            Naar de instellingen van dit cluster
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
