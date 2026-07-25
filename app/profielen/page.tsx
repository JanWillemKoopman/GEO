import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileStatusBadge } from "@/components/profile-status-badge";
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mono-label">Klantprofielen</span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Overzicht</h1>
          <p className="mt-2 max-w-xl text-secondary">
            Eén profiel per merk: het grondige merkonderzoek (branche, concurrenten, persona&apos;s,
            tone-of-voice) gebeurt hier één keer en wordt door al je analyses voor dat merk hergebruikt.
          </p>
        </div>
        <Link href="/profielen/nieuw" className="btn-primary">
          + Nieuw klantprofiel
        </Link>
      </div>

      {profiles.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-16 text-center">
          <span className="live-dot" />
          <h2 className="text-xl font-semibold">Nog geen klantprofielen</h2>
          <p className="max-w-md text-secondary">
            Maak eerst een klantprofiel aan voor een merk — daarna kun je er analyses op verschillende
            producten/onderwerpen aan koppelen.
          </p>
          <Link href="/profielen/nieuw" className="btn-primary mt-2">
            Eerste klantprofiel aanmaken
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {profiles.map((p) => (
            <li key={p.id}>
              <Link
                href={`/profielen/${p.id}`}
                className="card flex flex-wrap items-center justify-between gap-4 hover:cursor-pointer"
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
