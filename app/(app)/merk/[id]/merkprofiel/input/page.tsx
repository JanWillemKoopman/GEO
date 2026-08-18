import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { InfoHint } from "@/components/info-hint";
import { FactRequests } from "../../_components/fact-requests";
import { findGaps } from "@/lib/profile-gaps";
import type { FactRequest } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vraagt jouw input" };

/**
 * VRAAGT JOUW INPUT: feitenvragen en open punten op één scherm.
 *
 * ── WAAROM DEZE TWEE SAMEN ───────────────────────────────────────────────────
 *
 * Ze stonden op twee adressen ("Feitenvragen" en "Openstaande punten"), en voor
 * de klant is dat één vraag: moet ik hier nog iets aanvullen? Het onderscheid
 * dat wij maakten, invulveld tegenover gesprek, is onze indeling en niet de
 * zijne. Sinds 17 augustus 2026 staat het op één pagina met de teller in de kop.
 *
 * ⚠️ **Alleen de merkbrede vragen.** `fact_requests` krijgt ook rijen mét een
 * `analysis_id`: die kwamen uit één specifiek cluster en horen bij hoofdstuk 03
 * van dát cluster, niet hier. Die scheiding is op 14 augustus 2026 bewust
 * aangebracht.
 *
 * ⚠️ **De gespreksnotities staan hier niet meer.** Ze stonden onderaan dit
 * scherm, afgeschermd voor de klant, en zijn op 17 augustus 2026 naar
 * `/merk/[id]/admin` verhuisd. Wegvouwen is niet afschermen: het waren
 * aantekeningen óver de klant op een scherm dat voor hém bedoeld is, en dan sta
 * je in een demo één misklik van een ongemakkelijk gesprek af (besluit 4).
 */
export default async function InputPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  await requireUser();

  const supabase = await createClient();
  const [{ data: factRows }, { data: synthesisRow }] = await Promise.all([
    supabase
      .from("fact_requests")
      .select("*")
      .eq("profile_id", id)
      .is("analysis_id", null)
      .in("status", ["open", "beantwoord"])
      .order("created_at"),
    supabase
      .from("profile_facets")
      .select("raw_json")
      .eq("profile_id", id)
      .eq("facet", "synthese")
      .maybeSingle(),
  ]);

  const facts = (factRows ?? []) as FactRequest[];
  const openFacts = facts.filter((f) => f.status === "open").length;

  const researchGaps = (
    ((synthesisRow as { raw_json?: { gaps?: unknown } } | null)?.raw_json?.gaps ??
      []) as unknown[]
  ).filter((g): g is string => typeof g === "string" && g.trim().length > 0);
  const gaps = findGaps(profile);

  // De teller in de kop telt alles wat nog open staat, want dat is het getal
  // waar de klant op afgaat: één vraag "moet ik hier nog iets?".
  const open = openFacts + researchGaps.length + gaps.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Merkprofiel"
        title={open === 0 ? "Vraagt jouw input" : `Vraagt jouw input · ${open} open`}
        backHref={`/merk/${id}/merkprofiel`}
        backLabel="Merkdossier"
        description="Elk antwoord maakt de meting scherper en de teksten concreter. Overslaan mag altijd."
      />

      {/* ── 1. Feitenvragen ────────────────────────────────────────────────── */}
      {facts.length === 0 ? (
        <div className="card card-success flex flex-col gap-1">
          <span className="mono-label">Geen feitenvragen open</span>
          <p className="text-secondary">
            ORBIT ENGINE heeft alles wat het nodig heeft uit de nulmeting. Komen er bij een
            volgende meting nieuwe vragen bij, dan staan ze hier.
          </p>
        </div>
      ) : (
        <FactRequests profileId={id} initial={facts} />
      )}

      {/* ── 2. Openstaande punten ──────────────────────────────────────────── */}
      {researchGaps.length === 0 && gaps.length === 0 ? (
        <div className="card card-success flex flex-col gap-1">
          <span className="mono-label">Niets open</span>
          <p className="text-secondary">
            Er staat op dit moment niets open dat de meting scherper zou maken.
          </p>
        </div>
      ) : (
        <div className="card flex flex-col gap-3">
          <span className="mono-label flex items-center gap-1">
            Dit zou de meting scherper maken
            <InfoHint label="Moet dit?">
              Nee, alles werkt ook zonder. Maar elk punt hieronder haalt één specifieke
              onnauwkeurigheid weg, en daarom staat er per punt bij wát het verbetert.
            </InfoHint>
          </span>

          {researchGaps.length > 0 && (
            <ul className="flex flex-col gap-2">
              {researchGaps.map((vraag) => (
                <li key={vraag} className="text-sm font-medium">
                  {vraag}
                </li>
              ))}
            </ul>
          )}

          {gaps.length > 0 && (
            <ul className="flex flex-col gap-2">
              {gaps.map((gap) => (
                <li key={gap.label} className="text-sm">
                  <span className="font-medium">{gap.label}</span>
                  <span className="text-secondary">: {gap.effect}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

    </div>
  );
}
