import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { FactRequests } from "../fact-requests";
import type { FactRequest } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  return {
    title: profile ? `Feitenvragen · ${profile.brand_name ?? profile.name}` : "Feitenvragen",
  };
}

/**
 * Wat ORBIT ENGINE na de nulmeting nog van de klant wil weten (optimalisatie.md 4.6).
 *
 * ── WAAROM ALLEEN DE ONBOARDING-VRAGEN ──────────────────────────────────────
 *
 * `fact_requests` krijgt ook rijen ná de nulmeting, met een `analysis_id`: dat
 * zijn vragen die uit één specifieke analyse kwamen (bv. "CV-ketel onderhoud"),
 * bedoeld om de content van dié analyse concreter te maken. Die horen niet hier
 * maar bij de analyse zelf ("Wat je nu moet doen"), want ze gaan niet over het
 * merk in het algemeen. Deze pagina toont uitsluitend wat de nulmeting zelf
 * openliet: `analysis_id is null`.
 */
export default async function AanvullenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  await requireUser();

  const supabase = await createClient();
  const { data: factRows } = await supabase
    .from("fact_requests")
    .select("*")
    .eq("profile_id", id)
    .is("analysis_id", null)
    .in("status", ["open", "beantwoord"])
    .order("created_at");

  const facts = (factRows ?? []) as FactRequest[];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Merkdossier"
        title="Feitenvragen"
        backHref={`/profielen/${id}`}
        backLabel="Merkdossier"
        description="Elk antwoord maakt de meting scherper en de teksten concreter. Overslaan mag altijd."
      />

      {facts.length === 0 ? (
        <div className="card card-success flex flex-col gap-1">
          <span className="mono-label">Niets open</span>
          <p className="text-secondary">
            ORBIT ENGINE heeft alles wat het nodig heeft uit de nulmeting. Komen er bij een volgende meting
            nieuwe vragen bij, dan staan ze hier.
          </p>
        </div>
      ) : (
        <FactRequests profileId={id} initial={facts} />
      )}
    </div>
  );
}
