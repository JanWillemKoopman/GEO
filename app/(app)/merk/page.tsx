import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { ProfileStatusBadge } from "@/components/profile-status-badge";
import { identifyEmptyProfiles } from "@/lib/profile-status";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { activeOnly } from "@/lib/archive";
import type { Profile } from "@/lib/types/database";
import { LastUpdated } from "@/components/last-updated";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Merken" };

export default async function ProfielenPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const staff = await isStaff(user.id);

  // Gearchiveerde merken blijven in de database staan maar horen hier niet
  // (migratie 0044). Zie lib/archive.ts.
  const { data } = await activeOnly(supabase.from("profiles").select("*")).order(
    "created_at",
    { ascending: false },
  );

  let profiles = (data ?? []) as Profile[];

  // ── T8.7: een leeg merk mag niet "klaar" lijken ──────────────────────────
  //
  // Op productie kreeg een merk waarvan de site niet te crawlen was
  // `status = 'klaar'` met nul gecrawlde pagina's, nul aanbodregels en nul
  // onderwerpen, terwijl het profiel er gevuld uitzag (branche, werkgebied en
  // concurrenten kwamen uit algemene web-zoekacties, niet van de site zelf).
  // Voor een consultant die dit vóór een demogesprek klaarzet is dat de
  // gevaarlijkste vorm: hij ziet "klaar" en heeft geen reden om verder te
  // kijken. Eén gegroepeerde telling in plaats van een aparte query per merk.
  const { data: pageRows } =
    profiles.length > 0
      ? await supabase
          .from("profile_pages")
          .select("profile_id")
          .in("profile_id", profiles.map((p) => p.id))
      : { data: [] };
  const paginasPerMerk = new Map<string, number>();
  for (const row of (pageRows ?? []) as { profile_id: string }[]) {
    paginasPerMerk.set(row.profile_id, (paginasPerMerk.get(row.profile_id) ?? 0) + 1);
  }
  const legeMerken = identifyEmptyProfiles(profiles, paginasPerMerk);

  // E, "centrale foutmeldingenplek": mislukte merkonderzoeken bovenaan, zelfde
  // reden als bij "Mijn analyses". Stabiele sort, dus binnen elke groep blijft
  // de bestaande volgorde (nieuwste eerst) staan.
  // ⚠️ Een klant met precies één merk krijgt deze lijst niet te zien, maar zijn
  // merk zelf. Dit scherm is voor hem een keuzemenu, en een keuzemenu met één
  // regel is een tussenstap zonder keuze. De regel eronder is belangrijker: een
  // klant ziet nooit gegevens van meer dan één merk tegelijk, en dit is het
  // enige klantscherm waar er meer dan één in beeld kan komen. Daarom staan er
  // alleen namen op, en geen cijfer, score of stand van het werk.
  if (!staff && profiles.length === 1) redirect(`/merk/${profiles[0].id}`);

  const failedProfiles = profiles.filter((p) => p.status === "mislukt");
  profiles = [...failedProfiles, ...profiles.filter((p) => p.status !== "mislukt")];

  return (
    <div className="flex flex-col gap-6">
      {/* Een klant mag geen merk laten onderzoeken (`merk_onderzoeken` in
          `lib/cost-rules.ts`), dus krijgt hij een rustige knop die zegt dat het
          een aanvraag is; /merk/nieuw toont hem de uitleg in plaats van het
          formulier (UX-audit 23 september 2026, P1.3). */}
      <PageHeader
        title="Merken"
        description="Kies een merk om te zien hoe het ervoor staat."
        action={
          staff ? (
            <Link href="/merk/nieuw" className="btn-primary">
              <Icon naam="toevoegen" size={18} />
              Nieuw merk
            </Link>
          ) : (
            <Link href="/merk/nieuw" className="btn-outline">
              Nieuw merk aanvragen
            </Link>
          )
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
                <Link href={`/merk/${p.id}/merkprofiel/bewerken`} className="link text-sm">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {profiles.length === 0 ? (
        staff ? (
          <EmptyState
            title="Nog geen merken"
            action={{ href: "/merk/nieuw", label: "Eerste merk toevoegen" }}
          >
            Begin met het merk waarvan je de zichtbaarheid wilt meten. ORBIT ENGINE brengt het in
            kaart; daarna koppel je er clusters aan voor losse producten en onderwerpen.
          </EmptyState>
        ) : (
          <EmptyState title="Je consultant zet je merk klaar">
            ORBIT ENGINE onderzoekt eerst je website en je markt. Zodra je consultant je merk aan je
            account heeft gekoppeld, staat het hier en kom je na het inloggen meteen op je overzicht.
          </EmptyState>
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {profiles.map((p) => (
            <li key={p.id}>
              {/* Naar het overzicht, net als na het inloggen (UX-audit P2.4). Tot
                  23 september 2026 opende een merk hier het bewerkscherm van
                  het merkdossier: een formulier waar je een startscherm
                  verwacht. Een mislukt merk gaat wel naar het dossier, want
                  daar staat wat er mis is. */}
              <Link
                href={p.status === "mislukt" ? `/merk/${p.id}/merkprofiel/bewerken` : `/merk/${p.id}`}
                className="card card-interactive flex flex-wrap items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-medium">{p.name}</p>
                  <p className="mono-label break-url mt-1">
                    {p.url} · <LastUpdated at={p.updated_at} className="" />
                  </p>
                  {legeMerken.has(p.id) && (
                    <p className="mono-label mt-1" style={{ color: "var(--intent-warning-content)" }}>
                      De site kon niet gelezen worden, dit dossier is leeg
                    </p>
                  )}
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
