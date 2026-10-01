import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { loadKlantenoverzicht } from "@/lib/klantenoverzicht-data";
import { PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/tabs";
import { KlantenTabel } from "./klanten-tabel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Klanten" };

/**
 * Het klantenoverzicht: alle klanten in één tabel (1 oktober 2026).
 *
 * Bereikbaar via de knop "Beheer" rechtsboven. Eén regel per klant (account);
 * een schakelaar boven de tabel kiest welke zes kolomgroepen je ziet. De
 * kolommen en wat ze betekenen staan in `lib/klantenoverzicht.ts`.
 *
 * ⚠️ Alleen voor beheerders, en bij een gewone gebruiker een 404 en geen 403,
 * net als "Alle merken": een 403 bevestigt dat het scherm bestaat.
 */
export default async function KlantenPage() {
  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  const nu = new Date();
  const klanten = await loadKlantenoverzicht(nu);

  return (
    // `wil-data`: een tabel met veel kolommen krijgt de brede stand (designsystem §8).
    <div className="flex flex-col gap-6 wil-data">
      <PageHeader
        eyebrow="Beheer"
        title="Klanten"
        description="Alle klanten in één tabel. Kies bovenaan welke gegevens je wilt zien."
      />
      <Tabs
        label="Beheer"
        items={[
          { label: "Klanten", href: "/beheer/klanten", actief: true, aantal: klanten.length },
          { label: "Alle merken", href: "/beheer", actief: false },
        ]}
      />
      <KlantenTabel klanten={klanten} nuIso={nu.toISOString()} />
    </div>
  );
}
