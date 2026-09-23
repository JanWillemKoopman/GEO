import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaff } from "@/lib/staff";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { EmptyState } from "@/components/empty-state";
import { COST_DENIED } from "@/lib/cost-guard";
import { formatDateLong, formatNumber, formatUsd } from "@/lib/format";
import { COST_PER_PROMPT_USD, DEFAULT_MIX, mixTotal } from "@/lib/prompt-mix";
import { labsBeschikbaar } from "@/lib/discovery/labs";
import { leesRondes } from "@/lib/discovery/rondes";
import {
  kaartFeiten,
  kandidaatFeiten,
  SOORT_LABEL,
  SOORT_UITLEG,
  type KandidaatSoort,
  type OntdekTerm,
} from "@/lib/cluster-discovery";
import { RondeKnop } from "./ronde-knop";
import { RondeVoortgang } from "./ronde-voortgang";
import { KandidaatKaart, type KandidaatWeergave } from "./kandidaat-kaart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clusters ontdekken" };

/**
 * CLUSTERS ONTDEKKEN (docs/tasks/clusters-ontdekken.md, 23 september 2026).
 *
 * Na de onboarding staan er voorgestelde clusters op Mijn clusters. Dit scherm
 * is voor daarna: gestructureerd méér onderwerpen vinden die bij het
 * merkprofiel passen, uit Search Console, de onboarding, de bestaande clusters,
 * ChatGPT en de zoekdata van Google (DataForSEO).
 *
 * ── WAT HIER STAAT, VAN BOVEN NAAR BENEDEN ─────────────────────────────────
 *
 *   1. Waar we naar kijken: per bron of hij er is, en wat het kost als hij
 *      ontbreekt. Een ronde zonder Search Console mist de snelle winst, en dat
 *      hoort iemand te weten vóór hij betaalt.
 *   2. De ronde: starten (consultant) of de voortgang.
 *   3. De kandidaten van de nieuwste ronde, in drie groepen.
 *   4. Eerdere rondes, met wat ze kostten.
 *
 * ── WIE WAT MAG (besluit 1 van 23 september 2026) ──────────────────────────
 *
 * De consultant start een ronde en voegt toe of wijst af. De klant ziet alles
 * en kan per onderwerp "Dit wil ik" zeggen. Het slot staat in de route, niet
 * alleen hier.
 *
 * ⚠️ Het adres is `/merk/[id]/ontdekken` en niet onder `/strategie/clusters`:
 * de mobiele titel zoekt op voorvoegsel (`isActive()` in lib/nav.ts), en dan
 * zou dit scherm "Mijn clusters" heten.
 */

const SOORT_VOLGORDE: KandidaatSoort[] = ["snelle_winst", "concurrent_voor", "nieuw_terrein"];

interface KandidaatRij {
  id: string;
  run_id: string;
  title: string;
  rationale: string | null;
  kind: KandidaatSoort;
  offering_names: string[];
  terms_json: OntdekTerm[];
  score: number;
  overlaps_with: string | null;
  status: KandidaatWeergave["status"];
  rejection_reason: string | null;
}

function naarWeergave(k: KandidaatRij): KandidaatWeergave {
  const termen = Array.isArray(k.terms_json) ? k.terms_json : [];
  return {
    id: k.id,
    title: k.title,
    rationale: k.rationale,
    soortLabel: SOORT_LABEL[k.kind],
    // De zinnen worden hier opnieuw uit de termen gerekend en niet uit de
    // database gelezen: dan hangt elke zin aan de ruwe data eronder, en een
    // betere formulering geldt meteen ook voor oude rondes.
    feiten: kaartFeiten(kandidaatFeiten(termen), k.kind),
    diensten: k.offering_names ?? [],
    overlap: k.overlaps_with,
    status: k.status,
    reden: k.rejection_reason,
    bewijs: [...termen]
      .sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1))
      .map((t) => ({
        keyword: t.keyword,
        volume: t.volume !== null ? formatNumber(t.volume) : null,
        positie: t.eigenPositie !== null ? `plek ${Math.round(t.eigenPositie)}` : null,
        concurrent: t.concurrent ? `${t.concurrent.domein}, plek ${t.concurrent.positie}` : null,
      })),
  };
}

export default async function OntdekkenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const user = await requireUser();
  const staff = await isStaff(user.id);
  const supabase = await createClient();

  // Lezen via de gebruiker, dus via RLS: een klant ziet alleen zijn eigen merk.
  const [rondes, { data: aangevraagdRijen }] = await Promise.all([
    leesRondes(supabase, id, staff),
    supabase
      .from("cluster_discovery_candidates")
      .select("*")
      .eq("profile_id", id)
      .eq("status", "aangevraagd")
      .order("requested_at", { ascending: false }),
  ]);
  const nieuwste = rondes[0] ?? null;
  const lopend = nieuwste && !["klaar", "mislukt"].includes(nieuwste.status) ? nieuwste : null;
  const laatsteKlare = rondes.find((r) => r.status === "klaar") ?? null;

  let kandidaten: KandidaatRij[] = [];
  if (laatsteKlare) {
    const { data } = await supabase
      .from("cluster_discovery_candidates")
      .select("*")
      .eq("run_id", laatsteKlare.id)
      .order("score", { ascending: false });
    kandidaten = (data ?? []) as KandidaatRij[];
  }
  const aangevraagd = ((aangevraagdRijen ?? []) as KandidaatRij[]).filter((k) => k.run_id !== laatsteKlare?.id);

  // ── De bronnen ──────────────────────────────────────────────────────────
  // Via de admin-client en alleen tellingen: deze getallen gaan over wat ÉÉN
  // ronde zou krijgen, en de eigendomscontrole is hierboven al gedaan
  // (`getProfile` geeft alleen een merk dat deze gebruiker mag lezen).
  const admin = createAdminClient();
  const van90 = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  const [aanbodRes, gesprekRes, clusterRes, gscRes] = await Promise.all([
    admin
      .from("profile_offerings")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id)
      .is("removed_at", null)
      .in("kind", ["dienst", "product"]),
    admin.from("profile_strategy").select("recorded_at").eq("profile_id", id).maybeSingle(),
    admin
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id)
      .is("archived_at", null),
    admin
      .from("search_console_queries")
      .select("day", { count: "exact", head: true })
      .eq("profile_id", id)
      .gte("day", van90),
  ]);
  const aantalAanbod = aanbodRes.count ?? 0;
  const gesprekOp = (gesprekRes.data as { recorded_at: string | null } | null)?.recorded_at ?? null;
  const aantalClusters = clusterRes.count ?? 0;
  const gscRijen = gscRes.count ?? 0;
  const zoekdataAan = labsBeschikbaar();

  const meetKosten = formatUsd(mixTotal(DEFAULT_MIX) * COST_PER_PROMPT_USD);
  const kostenPerMaand = `ongeveer ${meetKosten} per maandelijkse meting`;
  const rondeKosten = zoekdataAan ? "ongeveer $1 tot $1,50" : "ongeveer $0,10";

  const bronnen: { naam: string; stand: string; ok: boolean }[] = [
    {
      naam: "Je aanbod",
      stand: aantalAanbod > 0
        ? `${aantalAanbod} diensten en producten uit je merkprofiel`
        : "Nog geen diensten bekend. Zonder aanbod valt er niets te ontdekken.",
      ok: aantalAanbod > 0,
    },
    {
      naam: "Het strategisch gesprek",
      stand: gesprekOp
        ? `Vastgelegd op ${formatDateLong(gesprekOp)}`
        : "Nog niet vastgelegd. Toegevoegde onderwerpen blijven dan een concept tot het gesprek er is.",
      ok: Boolean(gesprekOp),
    },
    {
      naam: "Search Console",
      stand: profile.gsc_property
        ? gscRijen > 0
          ? "Gekoppeld: we zien waar je al bijna bovenaan staat"
          : "Gekoppeld, maar er zijn nog geen zoekopdrachten binnen"
        : "Niet gekoppeld, dus de groep Snelle winst blijft leeg",
      ok: Boolean(profile.gsc_property) && gscRijen > 0,
    },
    {
      naam: "Zoekdata van Google",
      stand: zoekdataAan
        ? "Aan: hoe vaak er gezocht wordt, en waar je concurrenten staan"
        : "Uit: de ronde ziet geen zoekvolumes en geen concurrenten",
      ok: zoekdataAan,
    },
    {
      naam: "Je bestaande clusters",
      stand: aantalClusters > 0
        ? `${aantalClusters} lopende clusters; wat daarop lijkt wordt gemarkeerd`
        : "Nog geen clusters",
      ok: true,
    },
  ];

  const perSoort = new Map<KandidaatSoort, KandidaatRij[]>();
  for (const k of kandidaten) perSoort.set(k.kind, [...(perSoort.get(k.kind) ?? []), k]);
  const openAantal = kandidaten.filter((k) => k.status === "nieuw" || k.status === "aangevraagd").length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Clusters"
        title="Clusters ontdekken"
        description="Nieuwe onderwerpen die bij je merk passen, gevonden in je eigen Google-cijfers, je onboarding en de zoekdata van Google."
      />

      {/* ── 1. Waar we naar kijken ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <SectionHeading title="Waar we naar kijken" />
        <ul className="grid gap-2 sm:grid-cols-2">
          {bronnen.map((b) => (
            <li key={b.naam} className="card flex flex-col gap-1">
              <span className="flex items-center gap-2">
                <span className={`chip ${b.ok ? "chip-success" : "chip-neutral"}`}>{b.ok ? "Aanwezig" : "Ontbreekt"}</span>
                <span className="type-body-emphasis">{b.naam}</span>
              </span>
              <span className="text-sm text-secondary">{b.stand}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── 2. De ronde ─────────────────────────────────────────────────── */}
      {lopend && <RondeVoortgang merkId={id} status={lopend.status} />}
      {staff && !lopend && (
        <RondeKnop merkId={id} herhaling={rondes.length > 0} kostenTekst={rondeKosten} />
      )}

      {!lopend && nieuwste?.status === "mislukt" && (
        <div className="alert alert-warning">
          {nieuwste.status_note ?? "De laatste ronde is niet afgemaakt."}
          {staff ? " Start een nieuwe ronde om het opnieuw te proberen." : " Je consultant kan een nieuwe ronde starten."}
        </div>
      )}

      {/* Wat de klant heeft gevraagd uit een eerdere ronde, bovenaan voor de consultant. */}
      {staff && aangevraagd.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionHeading title="Gevraagd door de klant" meta={`${aangevraagd.length}`} />
          <ul className="flex flex-col gap-3">
            {aangevraagd.map((k) => (
              <li key={k.id}>
                <KandidaatKaart merkId={id} kandidaat={naarWeergave(k)} staff={staff} kostenPerMaand={kostenPerMaand} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 3. De kandidaten ────────────────────────────────────────────── */}
      {!laatsteKlare && !lopend ? (
        staff ? (
          <EmptyState title="Nog geen ontdekkingsronde voor dit merk">
            Een ronde zoekt in je Search Console, je onboarding en de zoekdata van Google naar
            onderwerpen die nog niet gemeten worden, en bundelt ze tot 8 tot 15 voorstellen. Start er
            hierboven een.
          </EmptyState>
        ) : (
          <EmptyState title="Je consultant zoekt nieuwe onderwerpen voor je">
            {COST_DENIED.clusters_aanvullen} Zodra er een ronde is gedraaid, zie je hier de voorstellen
            en kun je aangeven welke je wilt.
          </EmptyState>
        )
      ) : laatsteKlare ? (
        <div className="flex flex-col gap-6">
          <p className="text-secondary">
            {kandidaten.length === 0
              ? `De ronde van ${formatDateLong(laatsteKlare.created_at)} leverde geen onderwerpen op. ${laatsteKlare.status_note ?? ""}`
              : `${kandidaten.length} onderwerpen uit de ronde van ${formatDateLong(laatsteKlare.created_at)}, ` +
                `${openAantal === kandidaten.length ? "nog allemaal open" : `waarvan ${openAantal} nog open`}. ` +
                "Het zoekvolume is hoe vaak iets in Google gezocht wordt: een aanwijzing voor wat mensen aan een AI-assistent vragen, geen meting daarvan."}
          </p>
          {kandidaten.length > 0 && laatsteKlare.status_note && (
            <p className="text-sm text-muted">{laatsteKlare.status_note}</p>
          )}
          {SOORT_VOLGORDE.filter((s) => (perSoort.get(s) ?? []).length > 0).map((soort) => (
            <div key={soort} className="flex flex-col gap-3">
              <SectionHeading title={SOORT_LABEL[soort]} meta={`${perSoort.get(soort)!.length}`} />
              <p className="text-sm text-secondary">{SOORT_UITLEG[soort]}</p>
              <ul className="flex flex-col gap-3">
                {perSoort.get(soort)!.map((k) => (
                  <li key={k.id}>
                    <KandidaatKaart merkId={id} kandidaat={naarWeergave(k)} staff={staff} kostenPerMaand={kostenPerMaand} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── 4. Eerdere rondes ───────────────────────────────────────────── */}
      {staff && rondes.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionHeading title="Rondes" />
          <ul className="flex flex-col gap-1 text-sm">
            {rondes.map((r) => (
              <li key={r.id} className="flex flex-wrap gap-x-3 text-secondary">
                <span>{formatDateLong(r.created_at)}</span>
                <span>
                  {r.status === "klaar" ? "klaar" : r.status === "mislukt" ? "niet afgemaakt" : "loopt"}
                </span>
                {r.kosten && (
                  <span className="tabular">
                    {formatUsd(r.kosten.zoekdata + r.kosten.ai)} (zoekdata {formatUsd(r.kosten.zoekdata)}, AI{" "}
                    {formatUsd(r.kosten.ai)})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm text-secondary">
        Toegevoegde onderwerpen staan bij Voorgesteld op{" "}
        <Link href={`/merk/${id}/strategie/clusters`} className="underline">
          Mijn clusters
        </Link>
        , samen met de voorstellen uit je onboarding.
      </p>
    </div>
  );
}
