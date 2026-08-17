import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileStatusBadge } from "@/components/profile-status-badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { activeOnly } from "@/lib/archive";
import type { Profile } from "@/lib/types/database";
import { LastUpdated } from "@/components/last-updated";

export const dynamic = "force-dynamic";
export const metadata = { title: "Merken" };

export default async function ProfielenPage() {
  await requireUser();
  const supabase = await createClient();

  // Gearchiveerde merken blijven in de database staan maar horen hier niet
  // (migratie 0044). Zie lib/archive.ts.
  const { data } = await activeOnly(supabase.from("profiles").select("*")).order(
    "created_at",
    { ascending: false },
  );

  let profiles = (data ?? []) as Profile[];

  // E, "centrale foutmeldingenplek": mislukte merkonderzoeken bovenaan, zelfde
  // reden als bij "Mijn analyses". Stabiele sort, dus binnen elke groep blijft
  // de bestaande volgorde (nieuwste eerst) staan.
  const failedProfiles = profiles.filter((p) => p.status === "mislukt");
  profiles = [...failedProfiles, ...profiles.filter((p) => p.status !== "mislukt")];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="ORBIT ENGINE · merkdossiers"
        title="Merken"
        description="ORBIT ENGINE leert je merk eerst kennen: branche, aanbod, concurrenten, doelgroep en tone-of-voice. Dat onderzoek doen we één keer per merk, en elk cluster eronder bouwt erop voort."
        action={
          <Link href="/profielen/nieuw" className="btn-primary">
            + Nieuw merk
          </Link>
        }
      />

      {failedProfiles.length > 0 && (
        <div className="card card-danger flex flex-col gap-2">
          <span className="chip chip-danger w-fit">
            {failedProfiles.length === 1
              ? "1 merkonderzoek niet gelukt"
              : `${failedProfiles.length} merkonderzoeken niet gelukt`}
          </span>
          <ul className="flex flex-col gap-1">
            {failedProfiles.map((p) => (
              <li key={p.id}>
                <Link href={`/profielen/${p.id}`} className="text-sm underline">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {profiles.length === 0 ? (
        <EmptyState
          title="Nog geen merken"
          action={{ href: "/profielen/nieuw", label: "Eerste merk toevoegen" }}
        >
          Begin met het merk waarvan je de zichtbaarheid wilt meten. ORBIT ENGINE brengt het in kaart;
          daarna koppel je er clusters aan voor losse producten en onderwerpen.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {profiles.map((p) => (
            <li key={p.id}>
              <Link
                href={`/profielen/${p.id}`}
                className="card card-interactive flex flex-wrap items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{p.name}</p>
                  <p className="mono-label break-url mt-1">
                    {p.url} · <LastUpdated at={p.updated_at} className="" />
                  </p>
                </div>
                <ProfileStatusBadge status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
