import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileStatusBadge } from "@/components/profile-status-badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { activeOnly } from "@/lib/archive";
import type { Profile } from "@/lib/types/database";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ProfielenPage() {
  await requireUser();
  const supabase = await createClient();

  // Gearchiveerde merken blijven in de database staan maar horen hier niet
  // (migratie 0044). Zie lib/archive.ts.
  const { data } = await activeOnly(supabase.from("profiles").select("*")).order(
    "created_at",
    { ascending: false },
  );

  const profiles = (data ?? []) as Profile[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Aura · merkdossiers"
        title="Merken"
        description="Aura leert je merk eerst kennen: branche, aanbod, concurrenten, doelgroep en tone-of-voice. Dat onderzoek doen we één keer per merk, en elke analyse eronder bouwt erop voort."
        action={
          <Link href="/profielen/nieuw" className="btn-primary">
            + Nieuw merk
          </Link>
        }
      />

      {profiles.length === 0 ? (
        <EmptyState
          title="Nog geen merken"
          action={{ href: "/profielen/nieuw", label: "Eerste merk toevoegen" }}
        >
          Begin met het merk waarvan je de zichtbaarheid wilt meten. Aura brengt het in kaart;
          daarna koppel je er analyses aan voor losse producten en onderwerpen.
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
                  <p className="mono-label mt-1">
                    {p.url} · Bijgewerkt {formatDate(p.updated_at)}
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
