import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BrandWizard } from "../../_components/brand-wizard";
import { ProfileEditor } from "../../_components/profile-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bewerken" };

/**
 * Het merkprofiel nakijken en aanvullen.
 *
 * ── WAAROM DIT EEN EIGEN SCHERM IS EN GEEN BLOK IN HET DOSSIER ──────────────
 *
 * Het merkdossier is een leesscherm: het vertelt wat ORBIT ENGINE vond en hoe
 * het merk ervoor staat. Dit is een werkscherm: veertig velden nakijken en
 * aanvullen. Die twee door elkaar zetten maakt het dossier weer wat het in de
 * ronde van 10 augustus net niet meer was, een pagina van meters lang.
 *
 * ── ⚠️ TWEE FORMULIEREN, TIJDELIJK ──────────────────────────────────────────
 *
 * Dit scherm toont nu de wizard (27 velden) én de platte editor (41 velden).
 * Dat is bewust en tijdelijk. Ze stonden tot 17 augustus 2026 op twee adressen
 * (`/profielen/[id]/merkprofiel` en `/profielen/[id]/profielgegevens`), allebei
 * met een eigen opslagroute voor dezelfde kolommen, en het ene scherm was een
 * deelverzameling van het andere. Fase 1 van `docs/tasks/appstructuur.md` haalt
 * die twee adressen weg en zet ze op één adres; fase 2 voegt ze samen tot één
 * wizard van zeven stappen met alle 41 velden, en dan vervalt `ProfileEditor`.
 *
 * De volgorde is zo omdat een permanente doorverwijzing permanent hoort te
 * zijn: `/profielgegevens` wijst meteen naar zijn eindadres, en niet naar een
 * tussenstation dat volgende week weer verdwijnt.
 */
export default async function BewerkenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const supabase = await createClient();
  const [{ data: sourceRows }, { count }] = await Promise.all([
    supabase.from("profile_field_sources").select("field, source").eq("profile_id", id),
    supabase
      .from("profile_pages")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id),
  ]);

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
        backHref={`/merk/${id}/merkprofiel`}
        backLabel="Merkdossier"
        description="ORBIT ENGINE heeft het meeste al van je website gehaald. Kijk het na, corrigeer wat niet klopt, en vul aan wat het niet kon weten. Alles wat je hier vastlegt blijft staan, ook als het onderzoek opnieuw draait."
      />

      <BrandWizard profileId={id} initial={profile} sources={sources} />

      <div className="flex flex-col gap-2">
        <span className="mono-label">Alle gegevens · losse velden</span>
        <p className="text-sm text-muted">
          Dezelfde gegevens als hierboven, plus de velden die nog geen plek in de stappen
          hebben. Fase 2 voegt deze twee formulieren samen tot één.
        </p>
        <ProfileEditor initial={profile} inventoryCount={count ?? 0} />
      </div>
    </div>
  );
}
