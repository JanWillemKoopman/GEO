"use server";

/**
 * Het merk wisselen.
 *
 * Een server action en geen API-route: dit zet alleen een voorkeur in een
 * cookie, er gaat geen data mee de database in. De toegangscontrole zit waar hij
 * hoort, in `getOwnedProfile()` en in `listBrands()`: deze cookie is een
 * voorkeur, nooit een recht (zie de toelichting in `lib/workspace.ts`).
 *
 * Toch wordt hier gecontroleerd of het merk bestaat en van deze gebruiker is.
 * Niet omdat het onveilig zou zijn zonder, maar omdat een cookie met een merk
 * dat je niet mag zien de kiezer in een vreemde staat zet: hij toont dan een
 * naam die nergens meer bij hoort.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listBrands, BRAND_COOKIE } from "@/lib/workspace";

/** Eén jaar. Een werkruimtekeuze hoort niet elke week te vervallen. */
const EEN_JAAR = 60 * 60 * 24 * 365;

export async function selectBrand(brandId: string, goTo?: string) {
  const user = await requireUser();
  const jar = await cookies();

  // Leeg = terug naar alle merken. Dat is een geldige keuze, geen fout.
  if (!brandId) {
    jar.delete(BRAND_COOKIE);
    redirect(goTo ?? "/merk");
  }

  const brands = await listBrands(user.id);
  const match = brands.find((b) => b.id === brandId);
  if (!match) {
    // Stil terugvallen. Dit overkomt iemand die een merk archiveert in het ene
    // tabblad en het in het andere nog in zijn kiezer heeft staan.
    jar.delete(BRAND_COOKIE);
    redirect("/merk");
  }

  jar.set(BRAND_COOKIE, brandId, {
    path: "/",
    maxAge: EEN_JAAR,
    sameSite: "lax",
    httpOnly: true,
  });

  redirect(goTo ?? `/merk/${brandId}`);
}
