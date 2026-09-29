import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { OnboardingSession } from "../../_components/onboarding-session";
import { parseContextFactors } from "@/lib/pipeline/context-factors";
import type { FieldState } from "@/lib/profile-meter";
import { ordenKansen, type KansBewijs, type KansHandeling, type CommercieleWaarde } from "@/lib/kansen/prioriteit";
import { kennisrondeVoorMerk, type KennisrondeDomein } from "@/lib/kansen/kennisronde";
import type { Behoefte } from "@/lib/kansen/kennisgat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Onboardinggesprek" };

/**
 * DE ONBOARDINGSESSIE, het werk mét de klant.
 *
 * ── ⚠️ HET ENIGE STAFSCHERM DAT GEDEELD WORDT ──────────────────────────────
 *
 * Deze pagina staat onder `admin/` omdat dat segment de afscherming al heeft en
 * een klant die het adres raadt een 404 krijgt in plaats van een 403. Een 403
 * bevestigt dat het scherm bestaat, en dat is precies wat hij niet hoort te
 * weten.
 *
 * Maar anders dan de rest van `admin/` is dit scherm bedoeld om te DELEN: de
 * klant zit ernaast en kijkt mee. Wat daaruit volgt staat in
 * `onboarding-session.tsx` en wordt door een test bewaakt: geen taaknamen, geen
 * bedragen, geen foutcodes.
 *
 * ── DIAGNOSE IS HIER OPGEGAAN (30 september 2026) ──────────────────────────
 *
 * Het scherm Diagnose is verwijderd. De onboardingtaken staan nu als één
 * statusoverzicht in het blok Voorbereiding, zonder taaknamen, kosten of
 * foutcodes: dit scherm wordt gedeeld met de klant.
 */
export default async function OnboardingSessiePagina({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  const admin = createAdminClient();
  const [{ data: bronRijen }, { data: strategieRij }, { data: analyseRijen }, { data: kansRijen }] =
    await Promise.all([
      admin
        .from("profile_field_sources")
        // ⚠️ Bewust niet het bewijs erbij (`evidence_quote`, `evidence_url`): dat
        // is onderzoeksdetail en de klant kijkt mee.
        .select("field, source, not_applicable, set_at")
        .eq("profile_id", id),
      admin
        .from("profile_strategy")
        .select("strategy_notes, context_factors, recorded_at")
        .eq("profile_id", id)
        .maybeSingle(),
      // Analyses waarvan de vragen nog opnieuw opgesteld kunnen worden. Bij een
      // analyse die al gemeten is zou een nieuwe vragenset de trendlijn breken.
      admin
        .from("analyses")
        .select("id")
        .eq("profile_id", id)
        .is("archived_at", null)
        .in("status", ["bezig", "concept_klaar"]),
      // A4: de kennisronde. Alleen kansen die nog geschreven moeten worden, want
      // het gesprek bereidt de volgende pagina's voor, niet de al geschreven of
      // gepubliceerde.
      admin
        .from("kansen")
        .select("id, titel, handeling, commerciele_waarde, potentie, kennis_ontbreekt")
        .eq("profile_id", id)
        .in("status", ["open", "ingepland", "in_voorbereiding"]),
    ]);

  const states: Record<string, FieldState> = {};
  for (const rij of (bronRijen ?? []) as {
    field: string;
    source: string;
    not_applicable: boolean;
  }[]) {
    states[rij.field] = {
      source: rij.source as FieldState["source"],
      notApplicable: rij.not_applicable,
    };
  }

  const strategie = strategieRij as {
    strategy_notes: string | null;
    context_factors: unknown;
    recorded_at: string | null;
  } | null;

  // Wat er sinds de laatste onderzoeksronde door een mens is gezet. Bepaalt
  // welke stappen het afrondblok aanbiedt om opnieuw te draaien. De abonnee
  // `onderzoek_refresh` houdt dit bij (migratie 0127, G4); geen live
  // vergelijking meer tegen `profile_field_sources` en `deep_research_at`.
  const gewijzigd = profile.velden_te_verversen ?? [];

  const merknaam = profile.brand_name ?? profile.name;

  // A4: dezelfde volgorde als het kansenscherm (N1, `ordenKansen()`), zodat er
  // maar één plek is die "hoogste kans" bepaalt.
  const kansen = (kansRijen ?? []) as {
    id: string;
    titel: string;
    handeling: KansHandeling;
    commerciele_waarde: CommercieleWaarde | null;
    potentie: number | null;
    kennis_ontbreekt: string[] | null;
  }[];
  const kansIds = kansen.map((k) => k.id);
  const { data: bewijsRijen } = kansIds.length
    ? await admin
        .from("kans_bewijs")
        .select("kans_id, bron, vragen_gemeten, vragen_genoemd, eigen_site_geciteerd, vertoningen")
        .in("kans_id", kansIds)
    : { data: [] };
  const bewijsPerKans = new Map<string, KansBewijs[]>();
  for (const r of (bewijsRijen ?? []) as {
    kans_id: string;
    bron: KansBewijs["bron"];
    vragen_gemeten: number | null;
    vragen_genoemd: number | null;
    eigen_site_geciteerd: boolean | null;
    vertoningen: number | null;
  }[]) {
    const lijst = bewijsPerKans.get(r.kans_id) ?? [];
    lijst.push({
      bron: r.bron,
      vragenGemeten: r.vragen_gemeten,
      vragenGenoemd: r.vragen_genoemd,
      eigenSiteGeciteerd: r.eigen_site_geciteerd,
      vertoningen: r.vertoningen,
    });
    bewijsPerKans.set(r.kans_id, lijst);
  }
  const kansenGeordend = ordenKansen(
    kansen.map((k) => ({
      id: k.id,
      titel: k.titel,
      handeling: k.handeling,
      commercieleWaarde: k.commerciele_waarde,
      potentie: k.potentie,
      bewijs: bewijsPerKans.get(k.id) ?? [],
      kennisOntbreekt: k.kennis_ontbreekt as Behoefte[] | null,
    })),
  );
  const kennisronde: KennisrondeDomein[] = kennisrondeVoorMerk(
    kansenGeordend.map((k) => ({ titel: k.titel, kennisOntbreekt: k.kennisOntbreekt as readonly Behoefte[] | null })),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Onboardinggesprek"
        description={`Samen nalopen wat ORBIT ENGINE over ${merknaam} heeft gevonden, aanvullen wat een website niet kan vertellen, en vastleggen wat we afspreken. Alles wat je hier invult wordt meteen bewaard.`}
      />

      {/* De twee schermen die op Diagnose hingen (verdwenen op 30 september
          2026). Een open tegenstrijdigheid houdt een pagina tegen, dus hier
          blijven ze één klik weg. */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <Link href={`/merk/${id}/admin/feiten`} className="link">
          Tegenstrijdige feiten
        </Link>
        <Link href={`/merk/${id}/admin/kennis`} className="link">
          Kennisoverzicht
        </Link>
      </div>

      <OnboardingSession
        profileId={id}
        brandName={merknaam}
        initial={profile}
        initialStates={states}
        strategyNotes={strategie?.strategy_notes ?? null}
        strategyFactors={parseContextFactors(strategie?.context_factors)}
        recordedAt={strategie?.recorded_at ?? null}
        changedSinceResearch={gewijzigd}
        openAnalyses={(analyseRijen ?? []).length}
        kennisronde={kennisronde}
      />
    </div>
  );
}
