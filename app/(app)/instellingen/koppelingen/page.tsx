import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listBrands } from "@/lib/workspace";
import { isStaff } from "@/lib/staff";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SearchConsoleBox } from "@/app/(app)/merk/[id]/_components/search-console-box";
import { serviceAccountEmail } from "@/lib/search-console/auth";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search Console" };

/**
 * KOPPELINGEN: de Search Console-koppeling, per merk.
 *
 * ── WAAROM DIT BIJ INSTELLINGEN STAAT EN NIET IN DE ONBOARDING ──────────────
 *
 * Nova zet de Search Console- en CMS-koppeling in hun onboardingflow, omdat hún
 * klant die zelf invult. Bij ons zet de consultant het klaar vóór het
 * demogesprek (het product is sales-led, besloten 3 augustus 2026), dus hoort
 * een koppeling bij het inrichten en niet bij het kennismaken.
 *
 * ── DE CIJFERS STAAN HIER NIET ──────────────────────────────────────────────
 *
 * Dit scherm gaat over het leggen van de verbinding. Wat er uit die verbinding
 * komt staat bij Analytics (`/merk/[id]/analytics/zoekverkeer`), want dat is
 * waar de klant naar cijfers gaat kijken. Zonder die scheiding staat een
 * grafiek in Instellingen, en dan is Instellingen geen instellingenscherm meer.
 *
 * ⚠️ **Alle merken op één pagina.** Een bureau met vier merken wil in één
 * oogopslag zien welke er gekoppeld zijn; vier keer een merk kiezen om vier keer
 * dezelfde vraag te beantwoorden is werk dat het scherm hoort te doen.
 *
 * ⚠️ **Alleen de beheerder mag hier komen** (besluit 25 augustus 2026). Een
 * koppeling zet de consultant vóór het demogesprek klaar, de klant maakt hem
 * nooit zelf (het product is sales-led, besloten 3 augustus 2026). De zijbalk
 * verborg dit scherm al voor een klant door het onder Admin te zetten
 * (`lib/nav.ts`), maar een verborgen menu-item is nog steeds een adres dat te
 * raden is. Vandaar `isStaff` hier ook, met een 404 en niet een 403: een 403
 * bevestigt dat het scherm bestaat, en dat is precies wat een klant van een
 * ander bureau niet hoort te weten.
 */
export default async function KoppelingenPage() {
  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  const merken = await listBrands(user.id);

  if (merken.length === 0) {
    return (
      <div className="flex flex-col gap-6 wil-lezen">
        <Kop />
        <EmptyState title="Nog geen merken" action={{ href: "/merk/nieuw", label: "Merk toevoegen" }}>
          Een koppeling hangt aan een merk. Voeg er eerst een toe.
        </EmptyState>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: profielRijen } = await admin
    .from("profiles")
    .select("id, gsc_property, gsc_verified_at, gsc_last_error")
    .in(
      "id",
      merken.map((m) => m.id),
    );

  const profielen = new Map(
    ((profielRijen ?? []) as {
      id: string;
      gsc_property: string | null;
      gsc_verified_at: string | null;
      gsc_last_error: string | null;
    }[]).map((p) => [p.id, p]),
  );

  // Eén query voor alle merken samen: één keer tellen en daarna verdelen is
  // goedkoper dan een query per merk, en bij een bureau met twintig merken is
  // dat het verschil tussen een scherm en een wachttijd.
  //
  // ⚠️ Gevonden 22 september 2026 bij het naverifiëren van de eerste echte
  // koppeling (Van den Udenhout): deze query telde rijen, niet dagen. De
  // tabel heeft één rij per dag én per pagina (`dimensions: ["date", "page"]`,
  // zie `lib/search-console/sync.ts`), dus een merk met 89 dagen aan cijfers
  // over honderden pagina's toonde "1000 dagen", niet toevallig de standaard
  // paginagrootte van Supabase (`.select` zonder `.limit` stopt bij 1000
  // rijen). Nu `day` mee opgehaald en per merk ontdubbeld, met een expliciete
  // limiet ruim boven wat realistisch is (16 maanden × honderden pagina's).
  const { data: dagRijen } = await admin
    .from("search_console_days")
    .select("profile_id, day")
    .in(
      "profile_id",
      merken.map((m) => m.id),
    )
    .limit(200000);

  const dagenSetPerMerk = new Map<string, Set<string>>();
  for (const r of (dagRijen ?? []) as { profile_id: string; day: string }[]) {
    const set = dagenSetPerMerk.get(r.profile_id) ?? new Set<string>();
    set.add(r.day);
    dagenSetPerMerk.set(r.profile_id, set);
  }
  const dagenPerMerk = new Map<string, number>();
  for (const [profileId, set] of dagenSetPerMerk) {
    dagenPerMerk.set(profileId, set.size);
  }

  const adres = serviceAccountEmail();

  return (
    // `wil-lezen`: een instellingenscherm is formulierpatroon (§8.6/§8.8), dus
    // 720px in plaats van de standaard 1440px. Zie `.stand` in app/globals.css.
    <div className="flex flex-col gap-6 wil-lezen">
      <Kop />

      {/* ⚠️ Zonder sleutel werkt geen enkele koppeling, en dat is geen fout van
          de klant. Het staat er één keer bovenaan in plaats van vier keer per
          merk herhaald. */}
      {!adres && (
        <div className="card card-warning flex flex-col gap-1">
          <span className="mono-label">De Google-sleutel staat nog niet ingesteld</span>
          <p className="text-secondary">
            Zolang die ontbreekt kan ORBIT ENGINE geen cijfers ophalen, ook niet voor een merk dat
            al een property heeft. Dit is een handeling van je consultant, niet van jou.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-8">
        {merken.map((merk) => {
          const p = profielen.get(merk.id);
          return (
            <section key={merk.id} className="flex flex-col gap-2">
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-medium">{merk.name}</h2>
                <Link
                  href={`/merk/${merk.id}/analytics/zoekverkeer`}
                  className="mono-label hover:underline"
                >
                  Naar de cijfers
                  <Icon naam="naar" size={12} />
                </Link>
              </span>
              <SearchConsoleBox
                profileId={merk.id}
                property={p?.gsc_property ?? null}
                verifiedAt={p?.gsc_verified_at ?? null}
                lastError={p?.gsc_last_error ?? null}
                serviceAccountEmail={adres}
                dagen={dagenPerMerk.get(merk.id) ?? 0}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Kop() {
  return (
    <PageHeader
      eyebrow="Admin"
      title="Search Console"
      description="Waar ORBIT ENGINE zijn cijfers vandaan haalt. Eén keer instellen per merk."
    />
  );
}
