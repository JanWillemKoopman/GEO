import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedProfile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { laadPaginas } from "@/lib/pagina-data";
import { groepVan } from "@/lib/pagina-lijst";
import { LibraryView } from "./library-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bibliotheek" };

/**
 * De bibliotheek van dit merk: elke pagina vanaf het moment dat zijn maand is
 * vrijgegeven, in drie groepen (`groepVan()`): wacht op jou, wordt binnenkort
 * geschreven, staat live. Wat in een maand staat die nog niet vrij is, staat
 * alleen in het contentplan.
 *
 * Eén lader (`laadPaginas()`) voor de bibliotheek, het contentplan, "Openstaande
 * vragen" en het paginascherm, zodat die vier nooit iets anders zeggen over
 * dezelfde pagina.
 *
 * Op 23 september 2026 toonde dit scherm een paar uur alleen pagina's met
 * tekst. Daardoor stond een pagina zonder plek in het plan ("Nog niet
 * ingepland") op geen enkel scherm meer, en zag de eigenaar niet wat er
 * binnenkort geschreven werd. De eigenaar wil elke pagina op het contentplan
 * of hier zien; daarom staan ze terug, met per rij een zin die zegt waarop hij
 * wacht (`statusRegel()`).
 */
export default async function BibliotheekPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cluster?: string }>;
}) {
  const { id } = await params;
  const { cluster: clusterUitAdres } = await searchParams;
  const gebruiker = await requireUser();
  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, gebruiker.id);
  if (!profile) notFound();

  const rows = (await laadPaginas(admin, id)).filter((r) => groepVan(r.stand) !== null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Strategie"
        title="Bibliotheek"
        description="Alle pagina's van dit merk, van de eerste vragen tot het gemeten effect."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Nog geen pagina's"
          action={{ href: `/merk/${id}/strategie/plan`, label: "Naar het contentplan" }}
        >
          Pagina&apos;s verschijnen hier zodra je een maand in het contentplan vrijgeeft. Dan zetten we
          de vragen voor die maand klaar, en daarna schrijven we de pagina&apos;s.
        </EmptyState>
      ) : (
        // `?cluster=` komt van de doorverwijzing die de bibliotheek per cluster
        // vervangt. Een onbekend cluster-id valt terug op "alles": een filter
        // dat niets oplevert is verwarrender dan geen filter.
        <LibraryView
          profileId={id}
          rows={rows}
          beginCluster={rows.some((r) => r.clusterId === clusterUitAdres) ? clusterUitAdres! : ""}
        />
      )}
    </div>
  );
}
