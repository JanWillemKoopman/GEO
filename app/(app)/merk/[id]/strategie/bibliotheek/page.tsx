import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedProfile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { laadPaginas } from "@/lib/pagina-data";
import { inBibliotheek } from "@/lib/pagina-stand";
import { LibraryView } from "./library-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bibliotheek" };

/**
 * De bibliotheek van dit merk: de pagina's waar al tekst van is.
 *
 * Eén lader (`laadPaginas()`) voor de bibliotheek, het contentplan, "Openstaande
 * vragen" en het paginascherm, zodat die vier nooit iets anders zeggen over
 * dezelfde pagina.
 *
 * Eerder op 23 september 2026 stonden hier ook de pagina's zonder tekst. De
 * eigenaar kon daardoor niet zien wat op hem wachtte en wat vanzelf liep: vijf
 * van de acht rijen bij Van den Udenhout zeiden "Wordt voorbereid" en waren
 * niet aan te klikken zonder op een leeg scherm te komen. Die pagina's staan
 * nu alleen in het contentplan (`inBibliotheek()`), en hier staat één regel
 * die zegt hoeveel het er zijn.
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

  const alle = await laadPaginas(admin, id);
  const rows = alle.filter((r) => inBibliotheek(r.stand));
  // Wat in een vrijgegeven maand zit maar nog geen tekst heeft: in voorbereiding,
  // wachtend op antwoorden, of aan het schrijven. Pagina's in een maand die nog
  // niet vrij is tellen niet mee; die zijn nog een plan, geen werk.
  const onderweg = alle.filter(
    (r) => !inBibliotheek(r.stand) && r.stand.sleutel !== "gepland" && r.stand.sleutel !== "vervallen",
  ).length;

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
          {onderweg > 0
            ? `${onderweg === 1 ? "Er is 1 pagina" : `Er zijn ${onderweg} pagina's`} in de maak. Een pagina verschijnt hier zodra zijn tekst klaar is om te lezen. Tot die tijd zie je in het contentplan hoe hij ervoor staat.`
            : "Een pagina verschijnt hier zodra zijn tekst klaar is om te lezen. Dat begint als je een maand in het contentplan vrijgeeft."}
        </EmptyState>
      ) : (
        // `?cluster=` komt van de doorverwijzing die de bibliotheek per cluster
        // vervangt. Een onbekend cluster-id valt terug op "alles": een filter
        // dat niets oplevert is verwarrender dan geen filter.
        <LibraryView
          profileId={id}
          rows={rows}
          onderweg={onderweg}
          beginCluster={rows.some((r) => r.clusterId === clusterUitAdres) ? clusterUitAdres! : ""}
        />
      )}
    </div>
  );
}
