import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileStatusBadge } from "@/components/profile-status-badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import type { Profile } from "@/lib/types/database";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ProfielenPage() {
  await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const profiles = (data ?? []) as Profile[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="GEO Tracker"
        title="Merken"
        description="Het grondige merkonderzoek — branche, concurrenten, persona's, tone-of-voice — gebeurt hier één keer per merk, en wordt door al je analyses voor dat merk hergebruikt."
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
          Voeg eerst het merk toe waarvan je de zichtbaarheid wilt meten. Daarna koppel je er
          analyses aan voor de losse producten en onderwerpen.
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
