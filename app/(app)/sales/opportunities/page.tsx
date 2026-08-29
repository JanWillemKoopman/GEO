import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { KANS_LABEL, type KansType } from "@/lib/sales/opportunity";
import { TIER_HOOG, TIER_GEMIDDELD } from "@/lib/sales/opportunity-score";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Opportunities" };

/**
 * De prioriteitenlijst, en het belangrijkste scherm van de module (plan §5.2).
 *
 * ── WAT ER PER REGEL STAAT, EN WAT ER BEWUST NIET STAAT ─────────────────────
 *
 * Per regel lees je binnen twee seconden wie het is, waarom hij interessant is
 * en hoe zeker dat is. Meer niet. Wie meer wil weten klikt door naar het
 * dossier, want daar hoort het bewijs te staan en niet in een lijst.
 *
 * ⚠️ **Er staat GEEN kolom met een zichtbaarheidspercentage.** Dat is de vanity
 * metric uit plan hoofdstuk 2: de laagste zichtbaarheid is niet automatisch de
 * hoogste saleskans, en een kolom die dat cijfer toont nodigt uit tot sorteren
 * op precies het verkeerde signaal. De GEO Opportunity Score staat er wél, en
 * die weegt of dit bedrijf klant kán worden even zwaar als hoeveel er te winnen
 * valt.
 *
 * ── DRIE TEMPERATUREN EN GEEN VIJF ──────────────────────────────────────────
 *
 * Warm, lauw, koud. Een fijnere indeling suggereert dat het verschil tussen 71
 * en 68 bestaat, en dat bestaat niet: naast de score staat een marge, en die is
 * breder dan drie punten.
 */
export default async function SalesOpportunitiesPage() {
  await requireUser();
  const supabase = await createClient();

  // Lezen loopt via de sessie en dus mét RLS (migratie 0072). De poort in
  // `../layout.tsx` is het eerste slot, dit is het tweede.
  const { data } = await supabase
    .from("sales_opportunities")
    .select(
      "id, type, score, tier, confidence, hook_text, hook_source, market_id, company_id, " +
        "sales_companies(name, domain, city), sales_markets(label)",
    )
    .is("superseded_by", null)
    .order("score", { ascending: false })
    .limit(100);

  type Rij = {
    id: string;
    type: string;
    score: number;
    tier: string;
    confidence: string;
    hook_text: string | null;
    hook_source: string | null;
    market_id: string;
    company_id: string;
    sales_companies: { name: string; domain: string | null; city: string | null } | null;
    sales_markets: { label: string } | null;
  };

  const kansen = (data ?? []) as unknown as Rij[];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Sales"
        title="Opportunities"
        description="De bedrijven met de interessantste GEO-kans, op volgorde. Per regel lees je binnen twee seconden wie het is en waarom je belt."
      />

      {kansen.length === 0 ? (
        <EmptyState title="Nog geen kansen gevonden" action={{ href: "/sales/markten", label: "Naar de markten" }}>
          ORBIT ENGINE vult dit scherm nadat een markt gemeten is. Start een markt, keur de
          bedrijvenlijst goed en geef de meting akkoord.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {kansen.map((kans) => (
            <article key={kans.id} className="card flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="font-semibold">
                    {kans.sales_companies?.name ?? "Onbekend bedrijf"}
                  </h2>
                  <span className="mono-label">
                    {kans.sales_markets?.label ?? "onbekende markt"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={temperatuurChip(kans.score)}>{temperatuur(kans.score)}</span>
                  <span className="chip chip-neutral">{kans.score}</span>
                </div>
              </div>

              <p className="text-secondary">{kans.hook_text ?? "Nog geen reden geschreven."}</p>

              <div className="flex flex-wrap items-center gap-2">
                <span className="chip chip-neutral">
                  {KANS_LABEL[kans.type as KansType] ?? kans.type}
                </span>
                {/* ⚠️ Lage zekerheid staat er altijd bij (plan 13.2). Een score
                    zonder die kanttekening leest als een feit, en dan belt
                    iemand met meer stelligheid dan de meting draagt. */}
                {kans.confidence === "laag" && (
                  <span className="chip chip-warning">weinig bewijs</span>
                )}
                {kans.sales_companies?.city && (
                  <span className="mono-label">{kans.sales_companies.city}</span>
                )}
                <Link href={`/sales/prospects/${kans.company_id}`} className="ml-auto btn-ghost">
                  Bekijk het dossier
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/** Warm, lauw of koud. Drie standen, want een fijnere indeling liegt. */
function temperatuur(score: number): string {
  if (score >= TIER_HOOG) return "warm";
  if (score >= TIER_GEMIDDELD) return "lauw";
  return "koud";
}

function temperatuurChip(score: number): string {
  // Koud krijgt geen eigen kleur maar de neutrale chip met gedempte tekst: een
  // rode of grijze markering leest als "afgekeurd", en een koude kans is niet
  // afgekeurd. Hij is alleen niet de eerste die je belt.
  if (score >= TIER_HOOG) return "chip chip-success";
  if (score >= TIER_GEMIDDELD) return "chip chip-info";
  return "chip chip-neutral";
}
