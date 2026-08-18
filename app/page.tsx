import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { activeBrand } from "@/lib/workspace";

/**
 * Root: stuur door naar waar de gebruiker hoort te beginnen.
 *
 * ── DE BESTEMMING NA INLOGGEN IS SINDS 17 AUGUSTUS 2026 HET OVERZICHT ───────
 *
 * Dit stuurde naar `/analyses`, en dat was een lijst en geen startpagina. Wie
 * inlogde zag zijn clusters en moest zelf bedenken waar hij moest kijken. Nu is
 * er wél een startpagina (`/merk/[id]`, fase 5 van
 * `docs/tasks/appstructuur.md`), dus gaat hij daarheen.
 *
 * Drie uitkomsten, en de volgorde is de bedoeling:
 *
 *   1. niet ingelogd            → `/login`
 *   2. één merk, of een keuze   → het overzicht van dat merk
 *   3. meerdere merken, geen keuze → de merkenlijst
 *
 * `activeBrand()` doet stap 2 en 3 samen, en controleert daarbij opnieuw of de
 * gebruiker bij het merk in zijn cookie mag: die cookie is een voorkeur, nooit
 * een recht (`lib/workspace.ts`).
 */
export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");

  const merk = await activeBrand(user.id);
  redirect(merk ? `/merk/${merk.id}` : "/merk");
}
