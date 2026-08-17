import "server-only";

/**
 * De merk-werkruimte: welk merk kijk je nu aan?
 *
 * ── WAAROM DIT ER MOEST KOMEN ───────────────────────────────────────────────
 *
 * Besluit 1: je kiest bovenin een merk, en daarna gaat de
 * hele app over dat merk. Dat is Nova's model, en het is de reden dat hun app
 * met twintig klanten nog te overzien is: er is altijd precies één context, en
 * elk scherm hoort erbij.
 *
 * ORBIT ENGINE had twee losse lijsten, Analyses en Merken, die naast elkaar stonden
 * zonder dat er ergens stond welk merk bij welke analyse hoorde. De gebruiker
 * legde dat verband zelf, elke keer opnieuw.
 *
 * ── WAAROM EEN COOKIE EN NIET DE URL ────────────────────────────────────────
 *
 * De keuze moet blijven staan als je van scherm wisselt, ook op schermen die
 * geen merk in hun pad hebben (`/analyses`, `/instellingen`). Een querystring
 * zou aan élke link geplakt moeten worden, en één vergeten link zet de gebruiker
 * dan onopgemerkt terug in "alle merken".
 *
 * ⚠️ Een cookie is een voorkeur, nooit een recht. `activeBrand()` controleert
 * altijd opnieuw of deze gebruiker bij dit merk mag; een geplakte cookie levert
 * niets op. De toegangscontrole zelf zit in `getOwnedProfile()`.
 */
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { accountIdsOf } from "@/lib/accounts";
import { isStaff } from "@/lib/staff";
import type { Profile } from "@/lib/types/database";

export const BRAND_COOKIE = "orbit_engine_merk";

/** Wat de kiezer nodig heeft. Bewust smal: dit gaat over elke pagina mee. */
export interface BrandOption {
  id: string;
  name: string;
  url: string;
  /** Nog bezig met onderzoek? Dan mag de kiezer dat laten zien. */
  busy: boolean;
}

/**
 * Alle merken die deze gebruiker mag zien, voor de kiezer.
 *
 * Dezelfde drie lagen als `getOwnedProfile()`: account, historische eigenaar,
 * beheerder. Gearchiveerde merken blijven eruit (`lib/archive.ts`).
 */
export async function listBrands(userId: string): Promise<BrandOption[]> {
  const admin = createAdminClient();
  const accountIds = await accountIdsOf(userId);
  const staff = await isStaff(userId);

  let query = admin
    .from("profiles")
    .select("id, name, brand_name, url, status, account_id, user_id")
    .is("archived_at", null)
    .order("name");

  // Een beheerder ziet alles; iedereen anders alleen zijn eigen accounts plus
  // de merken die nog op de oude eigenaarskolom staan. `or()` met een lege
  // `in()`-lijst geeft een syntaxfout, vandaar de opbouw in stappen.
  if (!staff) {
    const filters = [`user_id.eq.${userId}`];
    if (accountIds.length > 0) {
      filters.push(`account_id.in.(${accountIds.join(",")})`);
    }
    query = query.or(filters.join(","));
  }

  const { data, error } = await query;
  if (error) {
    console.error("Merken ophalen mislukt:", error.message);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id as string,
    name: (p.brand_name as string | null) ?? (p.name as string),
    url: p.url as string,
    busy: p.status === "bezig",
  }));
}

/**
 * Het merk waar de gebruiker nu in zit.
 *
 * Drie stappen, en de volgorde is de bedoeling:
 *
 *   1. staat er een geldige keuze in de cookie, dan die
 *   2. anders, heeft hij precies één merk, dan dat merk
 *   3. anders niets, en dan toont de app de merkenlijst
 *
 * Stap 2 is wat de kiezer onzichtbaar maakt voor een gewone ondernemer met één
 * website. Nova doet hetzelfde: een kiezer met één optie is geen keuze maar
 * ruis. Pas een bureau (besluit 9) ziet hem echt.
 */
export async function activeBrand(userId: string): Promise<BrandOption | null> {
  const brands = await listBrands(userId);
  if (brands.length === 0) return null;

  const jar = await cookies();
  const gekozen = jar.get(BRAND_COOKIE)?.value;
  if (gekozen) {
    const match = brands.find((b) => b.id === gekozen);
    // Geen match betekent: verwijderd, gearchiveerd, of nooit van jou geweest.
    // In alle drie de gevallen val je terug, en nooit met een foutmelding.
    if (match) return match;
  }

  if (brands.length === 1) return brands[0];
  return null;
}

/** Alles wat de shell in één keer nodig heeft, zodat elke pagina niet apart gaat vragen. */
export interface Workspace {
  brands: BrandOption[];
  active: BrandOption | null;
}

export async function loadWorkspace(userId: string): Promise<Workspace> {
  const brands = await listBrands(userId);
  if (brands.length === 0) return { brands, active: null };

  const jar = await cookies();
  const gekozen = jar.get(BRAND_COOKIE)?.value;
  const match = gekozen ? brands.find((b) => b.id === gekozen) : undefined;
  return {
    brands,
    active: match ?? (brands.length === 1 ? brands[0] : null),
  };
}

/** Handig voor schermen die het volledige profiel willen, niet alleen de kiezerregel. */
export async function activeBrandProfile(userId: string): Promise<Profile | null> {
  const brand = await activeBrand(userId);
  if (!brand) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("*").eq("id", brand.id).maybeSingle();
  return (data as Profile | null) ?? null;
}
