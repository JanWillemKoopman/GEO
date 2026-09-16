import { notFound, redirect } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";

export const metadata = { title: "Bibliotheek" };

/**
 * De bibliotheek per cluster, sinds 16 september 2026 een doorverwijzing.
 *
 * ── WAAROM DIT SCHERM WEG IS ────────────────────────────────────────────────
 *
 * Er waren twee bibliotheken: deze, per cluster, en de merkbrede op
 * `/merk/[id]/strategie/bibliotheek`. De tweede kwam er op 17 augustus 2026 bij
 * met als reden dat een klant met vier clusters nergens kon zien wat hij
 * gekocht had (besluit 5). De eerste bleef staan "als doorklik vanuit het
 * dossier", en daarmee had diezelfde klant er vijf.
 *
 * Dat is niet alleen een scherm te veel. Het waren twee LIJSTEN over dezelfde
 * rijen, met twee weergaven, twee manieren om te filteren en twee tellingen die
 * gelijk hoorden te zijn zonder dat iets dat afdwong. De merkbrede heeft een
 * clusterfilter, kerncijfers, paginering en zoeken; deze had een platte lijst.
 *
 * Wat de doorklik waard was, blijft: `?cluster=` zet het clusterfilter meteen
 * goed, dus wie vanuit een cluster op "Bibliotheek" klikt ziet precies de
 * pagina's van dat cluster, nu in het scherm dat er het meeste van weet.
 *
 * ⚠️ De detailpagina eronder (`/analyses/[id]/bibliotheek/[pieceId]`) blijft
 * bestaan en is onveranderd: dát is de plek waar de tekst zelf staat, en elke
 * rij in de merkbrede bibliotheek linkt ernaartoe.
 */
export default async function BibliotheekPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();
  redirect(`/merk/${analysis.profile_id}/strategie/bibliotheek?cluster=${id}`);
}
