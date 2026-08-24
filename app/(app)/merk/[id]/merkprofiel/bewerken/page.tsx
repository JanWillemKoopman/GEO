import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { CollapsibleSection } from "@/components/collapsible-section";
import { BrandWizard } from "../../_components/brand-wizard";
import { CLIENT_STEPS, type BrandStep } from "@/lib/pipeline/brand-fields";
import { InventoryBox } from "../../_components/inventory-box";
import { DossierBox } from "../../_components/dossier-box";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bewerken" };

/**
 * Het merkprofiel nakijken en aanvullen: 41 velden in zeven stappen.
 *
 * ── WAAROM DIT EEN EIGEN SCHERM IS EN GEEN BLOK IN HET DOSSIER ──────────────
 *
 * Het merkdossier is een leesscherm: het vertelt wat ORBIT ENGINE vond en hoe
 * het merk ervoor staat. Dit is een werkscherm: 41 velden nakijken en aanvullen.
 * Die twee door elkaar zetten maakt het dossier weer wat het in de ronde van
 * 10 augustus net niet meer was, een pagina van meters lang.
 *
 * ── EEN SCHERM WAAR ER TWEE WAREN ───────────────────────────────────────────
 *
 * Tot 17 augustus 2026 stonden hier twee formulieren voor dezelfde kolommen: de
 * wizard (27 velden, `/profielen/[id]/merkprofiel`) en een platte editor
 * (41 velden, `/profielen/[id]/profielgegevens`), elk met een eigen opslagroute.
 * Het ene scherm was een deelverzameling van het andere, en de klant kon niet
 * zien welk van de twee won. De wizard heeft gewonnen omdat hij per veld toont
 * waar de waarde vandaan komt; de veertien ontbrekende velden hebben een stap
 * gekregen.
 *
 * De twee blokken onderaan zijn géén merkvelden maar gereedschap: hoe grondig
 * ORBIT ENGINE de site uitleest, en waar het extra brontekst vandaan haalt. Ze
 * staan bewust buiten de wizard, want dan blijft de teller "41 in, 41 uit"
 * eerlijk (`lib/pipeline/brand-fields.ts`).
 *
 * ── ⚠️ HIER STAAN 41 VAN DE 56 VELDEN, EN DAT IS GEEN OMISSIE ───────────────
 *
 * Sinds migratie 0060 telt de catalogus 56 velden: de 41 hier, plus twaalf
 * commerciële velden en drie contactvelden. Die vijftien verschijnen op dit
 * scherm NIET, en dat is de enige plek waar het klantoppervlak en het
 * consultantoppervlak met opzet van elkaar verschillen.
 *
 * De reden: "waar wil je op groeien en waar juist niet" is een gesprek, geen
 * invulveld dat een ondernemer in zijn eentje beantwoordt. Het antwoord
 * verandert bovendien wat ORBIT ENGINE gaat voorstellen en schrijven, dus een
 * half doordacht antwoord is duurder dan geen antwoord. En de contactpersoon
 * gaat over ons, niet over zijn merk.
 *
 * Ze staan wél in dezelfde catalogus, worden door dezelfde route opgeslagen en
 * tegen dezelfde lijst gevalideerd; het verschil zit alleen in wélke stappen dit
 * scherm toont (`CLIENT_STEPS` tegenover `SESSION_STEPS`). Herstel dit dus niet
 * als een vergeten stap: de onboardingsessie is de plek waar die vijftien
 * ingevuld worden.
 */
export default async function BewerkenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stap?: string }>;
}) {
  const { id } = await params;
  const { stap } = await searchParams;
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
  // klant geen leeg formulier van 41 velden ziet maar 41 velden die hij mág
  // nakijken.
  const sources: Record<string, string> = {};
  for (const row of sourceRows ?? []) {
    sources[row.field as string] = row.source as string;
  }

  // ⚠️ Alleen een stap die de klant ook echt ziet. `?stap=strategie` zou anders
  // een stap openen die op dit scherm met opzet niet bestaat, en dan staat de
  // wizard leeg. Een onbekende waarde valt terug op stap 1.
  const startStap: BrandStep = CLIENT_STEPS.includes(stap as BrandStep)
    ? (stap as BrandStep)
    : "bedrijf";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Merkprofiel"
        title="Bewerken"
        backHref={`/merk/${id}/merkprofiel`}
        backLabel="Merkdossier"
        description="ORBIT ENGINE heeft het meeste al van je website gehaald. Kijk het na, corrigeer wat niet klopt, en vul aan wat het niet kon weten. Alles wat je hier vastlegt blijft staan, ook als het onderzoek opnieuw draait."
      />

      <BrandWizard
        profileId={id}
        initial={profile}
        sources={sources}
        startStap={startStap}
      />

      {/* ── Gereedschap ─────────────────────────────────────────────────────
          Ingeklapt, want dit is naslag en niet de stap waar de klant voor kwam.
          Zie `docs/ux-design.md` §5: `naslag` staat overal dicht. */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">Gereedschap</span>
        <CollapsibleSection title="Wat er al op je site staat">
          <InventoryBox
            profileId={id}
            initialCount={count ?? 0}
            initialMax={profile.max_inventory_pages}
            initialTotalFound={profile.sitemap_total_urls}
            initialPriorityPaths={profile.crawl_priority_paths ?? []}
          />
        </CollapsibleSection>
        <CollapsibleSection title="Wat je al hebt liggen">
          <DossierBox profileId={id} />
        </CollapsibleSection>
      </div>
    </div>
  );
}
