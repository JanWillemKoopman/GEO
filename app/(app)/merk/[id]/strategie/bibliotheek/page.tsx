import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedProfile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { laadPaginas } from "@/lib/pagina-data";
import { LibraryView } from "./library-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bibliotheek" };

/**
 * De bibliotheek van dit merk: elke pagina, van gepland tot live.
 *
 * Sinds 23 september 2026 (`docs/tasks/contentflow-een-lijn.md` §4.6a) staan
 * hier ook de pagina's die nog geen tekst hebben, zodra ze in het plan staan,
 * met dezelfde stand als op het paginascherm, in het contentplan en in "Jouw
 * beurt". Eén lader (`laadPaginas()`), zodat die vier schermen nooit meer iets
 * anders zeggen over dezelfde pagina.
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

  // Alleen wat in een vrijgegeven maand staat, of al tekst heeft: een pagina
  // die ergens in maand 7 gepland staat, hoort in het contentplan en nog niet
  // in de bibliotheek.
  const rows = (await laadPaginas(admin, id)).filter((r) => r.stand.sleutel !== "gepland");

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
