import "server-only";

/**
 * Server-side helper: haal de ingelogde user op, of redirect naar /login.
 * Gebruik dit in Server Components en API-routes die een user vereisen.
 *
 * ── ⚠️ WAAROM DIT GEMEMOÏSEERD IS (28 AUGUSTUS 2026) ────────────────────────
 *
 * `supabase.auth.getUser()` is géén cookie-lezing. Hij stuurt het token naar
 * de Auth-server van Supabase om het te laten valideren, en dat is precies
 * waarom hij veiliger is dan `getSession()`. Maar het betekent ook: elke
 * aanroep is een volledige netwerkronde, en die telt op.
 *
 * Op het merkoverzicht werd hij drie keer gedaan binnen één paginaweergave:
 * `app/(app)/layout.tsx` voor de shell, `app/(app)/merk/[id]/layout.tsx` voor
 * de rechtencontrole, en de pagina zelf voor `user.id`. Drie keer dezelfde
 * vraag over dezelfde cookie, achter elkaar, met het scherm in de wacht.
 *
 * `cache()` van React is per verzoek, niet per proces: twee bezoekers delen
 * niets, en een tweede verzoek van dezelfde bezoeker vraagt het opnieuw. De
 * geldigheid van het token wordt dus nog steeds bij Supabase gecontroleerd,
 * één keer in plaats van drie keer. Zelfde patroon als `isStaff` in
 * `lib/staff.ts` en `getProfile` in `lib/profiles.ts`.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * De enige plek die de Auth-server echt bevraagt. Alles hieronder leest hem.
 *
 * ⚠️ De `redirect()` staat bewust búiten deze functie. `redirect()` werkt door
 * te gooien, en een gegooide fout binnen een `cache()`-functie wordt onthouden
 * en bij elke volgende aanroep opnieuw gegooid. Dat gaat hier goed, maar het
 * maakt het gedrag van de cache afhankelijk van wie er als eerste vraagt, en
 * dat is precies het soort stille afwijking dat niemand terugvindt.
 */
const loadUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

export async function requireUser(): Promise<User> {
  const user = await loadUser();
  if (!user) redirect("/login");
  return user;
}

/** Zoals requireUser, maar geeft null terug i.p.v. te redirecten (voor API-routes die zelf 401 willen sturen). */
export async function getUser(): Promise<User | null> {
  return loadUser();
}
