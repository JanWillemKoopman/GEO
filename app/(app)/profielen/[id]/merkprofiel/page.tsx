import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BrandWizard } from "./brand-wizard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  return { title: profile ? `Merkprofiel · ${profile.brand_name ?? profile.name}` : "Merkprofiel" };
}

/**
 * Het merkprofiel nakijken en aanvullen.
 *
 * ── WAAROM DIT EEN EIGEN SCHERM IS EN GEEN BLOK IN HET DOSSIER ──────────────
 *
 * Het merkdossier is een leesscherm: het vertelt wat Aura vond en hoe het merk
 * ervoor staat. Dit is een werkscherm: dertig velden nakijken en aanvullen. Die
 * twee door elkaar zetten maakt het dossier weer wat het in de ronde van
 * 10 augustus net niet meer was, een pagina van meters lang.
 *
 * Sinds de herstructurering van augustus 2026 staat dit als eigen subpagina
 * "Merkprofiel" in de zijbalk onder Merkdossier, naast "Aanvullen" (de losse
 * feitenvragen uit de nulmeting) en "Toevoegingen" (wat een gesprek vraagt).
 * Drie werkschermen met elk één invoersoort, in plaats van één blok dat ze
 * alle drie probeerde te zijn.
 */
export default async function MerkprofielPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  // `requireUser` beschermt de route; `getProfile` leest via RLS en geeft
  // niets terug voor een merk dat niet van deze gebruiker is. Twee sloten op
  // dezelfde deur, zoals overal in dit project.
  await requireUser();

  const supabase = await createClient();
  const { data: sourceRows } = await supabase
    .from("profile_field_sources")
    .select("field, source")
    .eq("profile_id", id);

  // Per veld waar de waarde vandaan komt. Dit is wat het label "uit je website
  // gehaald" mogelijk maakt (Nova's `draftedBadge`), en het is de reden dat de
  // klant geen leeg formulier ziet maar iets om na te kijken.
  const sources: Record<string, string> = {};
  for (const row of sourceRows ?? []) {
    sources[row.field as string] = row.source as string;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Merkprofiel"
        title={profile.brand_name ?? profile.name}
        backHref={`/profielen/${id}`}
        backLabel="Merkdossier"
        description="Aura heeft het meeste al van je website gehaald. Kijk het na, corrigeer wat niet klopt, en vul aan wat het niet kon weten. Alles wat je hier vastlegt blijft staan, ook als het onderzoek opnieuw draait."
      />

      <BrandWizard profileId={id} initial={profile} sources={sources} />
    </div>
  );
}
