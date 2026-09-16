import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPlanVersions } from "@/lib/plans";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Eerdere planvoorstellen" };

const STATUS_LABEL: Record<string, string> = {
  concept: "In opbouw",
  actief: "Actief",
  gestopt: "Vervangen door een nieuwer voorstel",
};

/**
 * Elk planvoorstel van dit merk (blok A punt 7,
 * `docs/tasks/nova-vergelijking-verbeterpunten.md`).
 *
 * Alleen-lezen, zoals Nova's oudere rondes ook alleen-lezen zijn: dit scherm
 * heeft geen enkele actie, alleen wat er van elk voorstel geworden is. Zie
 * `loadPlanVersions()` (`lib/plans.ts`) voor waarom dat geen goedgekeurd/
 * afgewezen-label heeft zoals Nova: die informatie bestaat hier niet.
 */
export default async function PlanVersiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const admin = createAdminClient();
  const versies = await loadPlanVersions(admin, id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Strategie · Contentplan"
        title="Eerdere planvoorstellen"
        description="Elke keer dat het contentplan opnieuw is opgezet, blijft het vorige voorstel hier staan, met wat ervan geworden is."
        action={
          <Link href={`/merk/${id}/strategie/plan`} className="btn-outline">
            Terug naar het huidige plan
          </Link>
        }
      />

      {versies.length === 0 ? (
        <EmptyState title="Nog geen planvoorstellen">
          Zodra er een contentplan wordt opgesteld, staat het hier.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {versies.map((v) => (
            <li key={v.id} className="card flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  Voorstel {v.version} · gestart {formatDatum(v.startedOn)}
                </span>
                <span className="chip chip-neutral">{STATUS_LABEL[v.status] ?? v.status}</span>
              </div>
              <p className="text-sm text-secondary">
                Pakket van {v.pagesPerMonth} pagina&apos;s per maand.{" "}
                {v.maandenGoedgekeurd === 0
                  ? "Geen enkele maand is ooit vrijgegeven."
                  : v.maandenGoedgekeurd === 1
                    ? "Eén maand is vrijgegeven."
                    : `${v.maandenGoedgekeurd} van de ${v.maandenTotaal} maanden zijn vrijgegeven.`}{" "}
                {v.paginasLive === 0
                  ? "Er staat niets uit dit voorstel live."
                  : v.paginasLive === 1
                    ? "Eén pagina uit dit voorstel staat live."
                    : `${v.paginasLive} pagina's uit dit voorstel staan live.`}
              </p>
              {v.strategyNote && (
                <p className="text-sm text-muted">Notitie bij dit voorstel: &ldquo;{v.strategyNote}&rdquo;</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDatum(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}
