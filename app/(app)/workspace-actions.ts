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
import { isStaffAccount, PREVIEW_COOKIE } from "@/lib/staff";

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

/**
 * Aan of uit zetten: kijk mee zoals een klant kijkt.
 *
 * ── WAAROM DIT NIET ONVEILIG KAN ZIJN, OOK ZONDER DE STAF-CHECK HIERONDER ───
 *
 * Deze cookie kan van niemand méér maken dan hij al is. `isStaff()` in
 * `lib/staff.ts` gebruikt hem alleen om een echte beheerder tijdelijk als
 * klant te laten tellen, nooit andersom. Een klant die deze actie zelf aanroept
 * zet een vlag die voor hem toch nergens naar verwijst.
 *
 * De controle hier is dus geen beveiliging maar netheid: hij voorkomt dat de
 * cookie blijft hangen bij een account waar hij nooit iets betekent, en dat de
 * knop een gebruiker die geen beheerder is per ongeluk in een "aan"-stand zet
 * die hij nooit kan uitzetten via de knop zelf, want die knop wordt alleen aan
 * beheerders getoond.
 *
 * Geen `maxAge`: dit is een sessiecookie. Een klantweergave die een week blijft
 * hangen omdat je hem vergat uit te zetten, is een groter risico dan hem elke
 * keer opnieuw te moeten aanzetten.
 */
export async function setClientPreview(aan: boolean, terugNaar?: string) {
  const user = await requireUser();
  const jar = await cookies();

  if (!aan || !(await isStaffAccount(user.id))) {
    jar.delete(PREVIEW_COOKIE);
  } else {
    jar.set(PREVIEW_COOKIE, "1", {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });
  }

  redirect(terugNaar ?? "/");
}
