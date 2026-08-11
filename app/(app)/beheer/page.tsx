import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCsmBrands } from "@/lib/csm-data";
import { totals } from "@/lib/csm";
import { PageHeader } from "@/components/page-header";
import { CsmView } from "./csm-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Beheer" };

/**
 * Het CSM-paneel (fase 8, `docs/Nova.md` §3.8).
 *
 * ── WAAROM DIT ER NU IS EN NIET LATER ───────────────────────────────────────
 *
 * Het stond oorspronkelijk achteraan met de redenering "bij minder dan tien
 * klanten kun je dit met SQL". Besluit 11 haalde die redenering onderuit:
 * twintig klanten in het eerste jaar, die allemaal meerdere websites kunnen
 * hebben en deels via bureaus binnenkomen. Vandaar plek 6, direct na fase 4.
 *
 * ── HET IS EEN OPERATIONEEL SCHERM, GEEN ANALYTISCH ─────────────────────────
 *
 * Nova's kop is letterlijk "where we are falling behind on generating and
 * posting client content". Er staan geen grafieken op en geen trends. De enige
 * vraag is: waar loopt het vast, en bij wie ligt de bal.
 *
 * ⚠️ Alleen voor beheerders, en bij een gewone gebruiker een 404 en geen 403.
 * Een 403 bevestigt dat het scherm bestaat.
 */
export default async function BeheerPage() {
  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  const admin = createAdminClient();
  const brands = await loadCsmBrands(admin);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Beheer"
        title="Waar lopen we achter?"
        description="Alle merken van alle klanten, gesorteerd op wat het eerst aandacht vraagt. Dit scherm ziet alleen jij."
      />
      <CsmView brands={brands} kpi={totals(brands)} />
    </div>
  );
}
