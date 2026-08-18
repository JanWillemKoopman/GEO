import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TopicsPanel } from "@/app/(app)/merk/[id]/_components/topics-panel";
import { loadAnalysisPotential } from "@/lib/potential-data";
import type { ProfileTopic } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Voorgestelde clusters" };

/**
 * "Onderwerpen om op te meten" (docs/tasks/onboarding-2.0.md, blok D), sinds de
 * herstructurering van augustus 2026 een eigen pagina onder "Clusters" in
 * plaats van een blok op het merkdossier.
 *
 * ── WAAROM ONDER CLUSTERS EN NIET ONDER MERKDOSSIER ─────────────────────────
 *
 * Dit zijn de onderwerpen die de nulmeting aandraagt om een analyse (cluster)
 * op te starten: het is aanbod voor een volgende cluster, geen deel van wat
 * ORBIT ENGINE over het merk weet. Zodra je op "meet dit" klikt, wordt er een analyse
 * van, dus deze lijst hoort thuis naast de analyses zelf en niet op het
 * leesscherm van het dossier.
 */
export default async function AanbevolenClustersPage({
  searchParams,
}: {
  searchParams: Promise<{ merk?: string }>;
}) {
  await requireUser();
  const { merk } = await searchParams;

  if (!merk) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Clusters" title="Voorgestelde clusters" />
        <EmptyState
          title="Kies eerst een merk"
          action={{ href: "/merk", label: "Naar mijn merken" }}
        >
          Voorgestelde clusters horen bij één merk. Kies een merk in de zijbalk om de voorstellen uit
          de nulmeting te zien.
        </EmptyState>
      </div>
    );
  }

  const profile = await getProfile(merk);
  if (!profile) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Clusters" title="Voorgestelde clusters" />
        <EmptyState title="Dit merk bestaat niet meer" action={{ href: "/merk", label: "Naar mijn merken" }}>
          Mogelijk is dit merk gearchiveerd of verwijderd.
        </EmptyState>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: topicRows } = await supabase
    .from("profile_topics")
    .select("*")
    .eq("profile_id", merk)
    .order("priority", { ascending: false });

  const topics = (topicRows ?? []) as ProfileTopic[];

  const admin = createAdminClient();
  const potenties: Record<string, { visibility: number | null; volume: number | null; potential: number | null }> = {};
  await Promise.all(
    topics
      .filter((t) => t.analysis_id)
      .map(async (t) => {
        potenties[t.id] = await loadAnalysisPotential(admin, t.analysis_id!);
      }),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Clusters"
        title="Voorgestelde clusters"
        backHref={`/merk/${merk}/strategie/clusters`}
        backLabel="Clusters"
        description="Waar ORBIT ENGINE je zichtbaarheid op kan gaan volgen. Zet uit wat niet past, start wat wel past."
      />

      {topics.length === 0 ? (
        <p className="text-secondary">
          ORBIT ENGINE heeft voor {profile.brand_name ?? profile.name} nog geen onderwerpen voorgesteld.
          Zodra de nulmeting daar iets over zegt, staat het hier.{" "}
          <Link href={`/merk/${merk}/merkprofiel`} className="underline">
            Terug naar het merkdossier
          </Link>
          .
        </p>
      ) : (
        <TopicsPanel profileId={merk} initial={topics} potenties={potenties} />
      )}
    </div>
  );
}
