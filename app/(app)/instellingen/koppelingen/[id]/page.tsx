import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listBrands } from "@/lib/workspace";
import { isStaff } from "@/lib/staff";
import { PageHeader } from "@/components/page-header";
import { SearchConsoleBox } from "@/app/(app)/merk/[id]/_components/search-console-box";
import { serviceAccountEmail } from "@/lib/search-console/auth";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search Console" };

/**
 * De Search Console-koppeling van één klant: het formulier dat tot
 * 28 september 2026 per merk onder elkaar op `../page.tsx` stond.
 *
 * Dezelfde toegangsregel als het overzicht: alleen de beheerder, en een 404
 * voor iedereen anders (zie de toelichting daar).
 */
export default async function KoppelingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  // Via `listBrands` en niet rechtstreeks op id: een gearchiveerd merk staat
  // daar niet in, en hoort hier dus ook geen koppeling te krijgen.
  const merk = (await listBrands(user.id)).find((m) => m.id === id);
  if (!merk) notFound();

  const admin = createAdminClient();
  const [{ data: p }, { data: dagRijen }] = await Promise.all([
    admin
      .from("profiles")
      .select("gsc_property, gsc_verified_at, gsc_last_error")
      .eq("id", id)
      .maybeSingle(),
    // ⚠️ Dagen tellen, geen rijen: de tabel heeft één rij per dag én per
    // pagina (`lib/search-console/sync.ts`). Tot 22 september 2026 stond hier
    // "1000 dagen", de standaard paginagrootte van Supabase. De limiet ligt
    // ruim boven wat realistisch is (16 maanden × honderden pagina's).
    admin.from("search_console_days").select("day").eq("profile_id", id).limit(200000),
  ]);

  const profiel = p as {
    gsc_property: string | null;
    gsc_verified_at: string | null;
    gsc_last_error: string | null;
  } | null;
  const dagen = new Set(((dagRijen ?? []) as { day: string }[]).map((r) => r.day)).size;

  return (
    // `wil-lezen`: een instellingenscherm is formulierpatroon (§8.6/§8.8), dus
    // 720px in plaats van de standaard 1440px. Zie `.stand` in app/globals.css.
    <div className="flex flex-col gap-6 wil-lezen">
      <Link
        href="/instellingen/koppelingen"
        className="mono-label inline-flex w-fit items-center gap-1 hover:underline"
      >
        <Icon naam="terug" size={12} />
        Alle klanten
      </Link>
      <PageHeader
        eyebrow="Search Console"
        title={merk.name}
        description="Waar ORBIT ENGINE de klikken uit Google vandaan haalt."
        action={
          <Link
            href={`/merk/${merk.id}/analytics/zoekverkeer`}
            className="mono-label inline-flex items-center gap-1 hover:underline"
          >
            Naar de cijfers
            <Icon naam="naar" size={12} />
          </Link>
        }
      />
      <SearchConsoleBox
        profileId={merk.id}
        property={profiel?.gsc_property ?? null}
        verifiedAt={profiel?.gsc_verified_at ?? null}
        lastError={profiel?.gsc_last_error ?? null}
        serviceAccountEmail={serviceAccountEmail()}
        dagen={dagen}
      />
    </div>
  );
}
