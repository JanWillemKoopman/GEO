import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { activeBrand, listBrands } from "@/lib/workspace";

/**
 * De losse clusterlijst bestaat niet meer als scherm.
 *
 * ── WAAROM HIJ WEG IS ───────────────────────────────────────────────────────
 *
 * Er waren twee clusterlijsten: deze, over álle merken heen, en die onder het
 * merk zelf (`/merk/[id]/strategie/clusters`). Alleen de tweede stond in het
 * menu. De eerste kende de klant niet, en toch kwam hij er voortdurend terecht:
 * de terugknop boven elk clusterdossier heette "Mijn clusters" en wees hierheen.
 * Wie op een tekst zat te werken en terugklikte, stond ineens in een lijst met
 * de clusters van een ánder merk ertussen.
 *
 * De inhoud is niet verdwenen. De storingenlijst, de kaarten met hun cijfers en
 * de knop voor een nieuw cluster staan alle drie op de merkversie van dit
 * scherm; dat is dezelfde lijst, alleen met de merkgrens erin.
 *
 * `?merk=` blijft werken omdat oudere links en `lib/redirects.ts` hem gebruiken.
 * Zonder dat parameter kiest `activeBrand()` het merk uit de cookie, met
 * dezelfde rechtencontrole als overal (`lib/workspace.ts`): die cookie is een
 * voorkeur, nooit een recht.
 */
export const dynamic = "force-dynamic";

export default async function AnalysesRedirect({
  searchParams,
}: {
  searchParams: Promise<{ merk?: string }>;
}) {
  const user = await requireUser();
  const { merk } = await searchParams;

  if (merk) {
    // `listBrands` levert alleen merken waar deze gebruiker bij mag, dus een
    // meegegeven merk-id uit een oude link kan nooit een deur openzetten.
    const brands = await listBrands(user.id);
    const gekozen = brands.find((b) => b.id === merk);
    if (gekozen) redirect(`/merk/${gekozen.id}/strategie/clusters`);
  }

  const actief = await activeBrand(user.id);
  redirect(actief ? `/merk/${actief.id}/strategie/clusters` : "/merk");
}
