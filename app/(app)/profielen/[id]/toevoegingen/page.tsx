import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { InfoHint } from "@/components/info-hint";
import { StrategyBox } from "../strategy-box";
import { parseContextFactors } from "@/lib/pipeline/context-factors";
import type { Profile } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  return {
    title: profile ? `Openstaande punten · ${profile.brand_name ?? profile.name}` : "Openstaande punten",
  };
}

interface Gap {
  label: string;
  effect: string;
}

/**
 * Wat het onderzoek zelf niet met zekerheid kon vaststellen (optimalisatie.md
 * blok B fase 5), zie ook `open-questions.tsx` waar dit vandaan komt.
 */
function findGaps(profile: Profile): Gap[] {
  const gaps: Gap[] = [];

  if (profile.aliases.length === 0) {
    gaps.push({
      label: "Andere schrijfwijzen van je naam",
      effect:
        'Noemt een AI je als "Jansen BV" terwijl je dossier "Bakkerij Jansen" zegt, dan telt die vermelding niet mee. Je score valt dan te laag uit.',
    });
  }

  if (profile.proof_points.length < 3) {
    gaps.push({
      label: "Concrete feiten over je bedrijf",
      effect:
        "Cijfers, jaartallen en termijnen zijn wat een AI-assistent aanhaalt. Zonder die feiten wordt elke tekst die Aura schrijft noodgedwongen algemeen, en algemeen wordt niet geciteerd.",
    });
  }

  if (profile.service_scope === "lokaal" && profile.service_regions.length === 0) {
    gaps.push({
      label: "In welke plaats of streek je werkt",
      effect:
        "Aura ziet dat je lokaal werkt, maar niet waar. Zonder plaatsnaam gaan de vragen landelijk, en meet je jezelf af tegen partijen waar je nooit tegenaan loopt.",
    });
  }

  if (!profile.business_model) {
    gaps.push({
      label: "Wat voor bedrijf je bent",
      effect:
        "Dienstverlener, retailer, fabrikant of platform: dat bepaalt waar Aura in je aanbod naar zoekt en welke vragen het straks stelt. Met zekerheid afleiden lukte niet.",
    });
  }

  return gaps;
}

/**
 * "Dit zou de meting scherper maken" + "Het gesprek" (optimalisatie.md 4.6 en
 * blok C), sinds de herstructurering van augustus 2026 samen op één subpagina.
 *
 * ── WAAROM DEZE TWEE SAMEN ───────────────────────────────────────────────────
 *
 * Allebei zijn het aanvullingen op het dossier die geen simpel invulveld hebben
 * en dus een gesprek vragen, in plaats van vragen die de klant in dertig
 * seconden zelf beantwoordt (dat is "Feitenvragen", een eigen subpagina). De open
 * punten zijn de agenda van dat gesprek; de gespreksnotities zijn wat eruit
 * kwam. Het tweede blok is alleen zichtbaar voor de beheerder: dit zijn
 * aantekeningen ÓVER de klant, niet vóór hem.
 */
export default async function ToevoegingenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const user = await requireUser();
  const staff = await isStaff(user.id);

  const supabase = await createClient();
  const { data: strategyRow } = await supabase
    .from("profile_strategy")
    .select("*")
    .eq("profile_id", id)
    .maybeSingle();
  const { data: synthesisRow } = await supabase
    .from("profile_facets")
    .select("raw_json")
    .eq("profile_id", id)
    .eq("facet", "synthese")
    .maybeSingle();

  const researchGaps = (
    ((synthesisRow as { raw_json?: { gaps?: unknown } } | null)?.raw_json?.gaps ??
      []) as unknown[]
  ).filter((g): g is string => typeof g === "string" && g.trim().length > 0);
  const gaps = findGaps(profile);
  const factors = parseContextFactors(
    (strategyRow as { context_factors?: unknown } | null)?.context_factors,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Merkdossier"
        title="Openstaande punten"
        backHref={`/profielen/${id}`}
        backLabel="Merkdossier"
        description="Wat een gesprek vraagt, niet een invulveld: de open punten uit het onderzoek en de aantekeningen die daarbij horen."
      />

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

      {staff && (
        <div className="flex flex-col gap-2">
          <span className="mono-label">Het gesprek</span>
          <p className="text-sm text-muted">
            Je aantekeningen bij dit merk, en wat er speelt dat het advies beïnvloedt. Alleen jij
            ziet dit.
          </p>
          <StrategyBox
            profileId={id}
            initialNotes={
              (strategyRow as { strategy_notes?: string | null } | null)?.strategy_notes ?? null
            }
            initialFactors={factors}
          />
        </div>
      )}
    </div>
  );
}
