import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listBrands } from "@/lib/workspace";
import { isStaff } from "@/lib/staff";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { serviceAccountEmail } from "@/lib/search-console/auth";
import { koppelStatus } from "@/lib/search-console/koppelstatus";
import { KoppelStatusLabel } from "./_components/koppel-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search Console" };

/**
 * KOPPELINGEN: welke klant heeft een werkende Search Console-koppeling.
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
 * waar de klant naar cijfers gaat kijken.
 *
 * ⚠️ **Een tabel, en het formulier per klant op een eigen pagina** (besluit
 * 28 september 2026). Tot dan stonden alle merken met hun volledige formulier
 * onder elkaar: bij vier merken leesbaar, maar elk formulier is een
 * schermhoogte, en de vraag "welke werken er niet?" moest je beantwoorden door
 * te scrollen. Nu staat de status per klant in één regel met een groen of rood
 * bolletje, en het formulier achter een klik (`./[id]/page.tsx`).
 *
 * ⚠️ **Alleen de beheerder mag hier komen** (besluit 25 augustus 2026). Een
 * verborgen menu-item is nog steeds een adres dat te raden is, vandaar
 * `isStaff` hier ook, met een 404 en niet een 403: een 403 bevestigt dat het
 * scherm bestaat, en dat is precies wat een klant van een ander bureau niet
 * hoort te weten.
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
    .select("id, created_at, gsc_property, gsc_verified_at, gsc_last_error")
    .in(
      "id",
      merken.map((m) => m.id),
    );

  const profielen = new Map(
    ((profielRijen ?? []) as {
      id: string;
      created_at: string;
      gsc_property: string | null;
      gsc_verified_at: string | null;
      gsc_last_error: string | null;
    }[]).map((p) => [p.id, p]),
  );

  const adres = serviceAccountEmail();

  // Nieuwste klant bovenaan: die is het vaakst nog niet gekoppeld, en dat is
  // het werk waarvoor iemand dit scherm opent.
  const rijen = merken
    .map((merk) => {
      const p = profielen.get(merk.id);
      return {
        merk,
        toegevoegd: p?.created_at ?? null,
        status: koppelStatus({
          property: p?.gsc_property ?? null,
          verifiedAt: p?.gsc_verified_at ?? null,
          lastError: p?.gsc_last_error ?? null,
          sleutelIngesteld: Boolean(adres),
        }),
      };
    })
    .sort((a, b) => (b.toegevoegd ?? "").localeCompare(a.toegevoegd ?? ""));

  const aantalGoed = rijen.filter((r) => r.status.goed).length;

  return (
    <div className="flex flex-col gap-6">
      <Kop />

      {/* ⚠️ Zonder sleutel werkt geen enkele koppeling, en dat is geen fout van
          de klant. Het staat er één keer bovenaan in plaats van per merk. */}
      {!adres && (
        <div className="card card-warning flex flex-col gap-1">
          <h2 className="type-body-emphasis">De Google-sleutel staat nog niet ingesteld</h2>
          <p className="text-secondary">
            Zolang die ontbreekt kan ORBIT ENGINE geen cijfers ophalen, ook niet voor een merk dat
            al een property heeft. Daarom staat hieronder alles op rood.
          </p>
        </div>
      )}

      <p className="text-secondary">
        {aantalGoed} van de {rijen.length} {rijen.length === 1 ? "klant heeft" : "klanten hebben"}{" "}
        een werkende koppeling.
        {aantalGoed < rijen.length &&
          " Bij de klanten met een rood bolletje komen er geen zoekcijfers binnen tot de koppeling hersteld is."}
      </p>

      <div className="overflow-x-auto">
        <table className="tabel tabel-klikbaar">
          <thead>
            <tr>
              <th>Toegevoegd</th>
              <th>Klant</th>
              <th>Website</th>
              <th>Search Console</th>
            </tr>
          </thead>
          <tbody>
            {rijen.map(({ merk, toegevoegd, status }) => (
              // `relative` op de rij en de link over de hele rij gespannen: zo
              // is de rij klikbaar zonder JavaScript, en blijft de klantnaam
              // een gewone link voor het toetsenbord en de schermlezer.
              <tr key={merk.id} className="relative">
                <td className="whitespace-nowrap tabular-nums text-secondary">
                  {toegevoegd ? datum(toegevoegd) : "Onbekend"}
                </td>
                <td className="font-medium">
                  <Link
                    href={`/instellingen/koppelingen/${merk.id}`}
                    className="after:absolute after:inset-0 hover:underline"
                  >
                    {merk.name}
                  </Link>
                </td>
                <td className="break-url text-secondary">{kaalAdres(merk.url)}</td>
                <td>
                  <KoppelStatusLabel status={status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function datum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  });
}

/** `https://www.voorbeeld.nl/` wordt `voorbeeld.nl`: in een tabelcel telt elke letter. */
function kaalAdres(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

function Kop() {
  return (
    <PageHeader
      eyebrow="Beheer"
      title="Search Console"
      description="Waar ORBIT ENGINE zijn cijfers vandaan haalt. Eén keer instellen per klant; klik op een klant om de koppeling te leggen of te controleren."
    />
  );
}
