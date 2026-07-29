import "server-only";

/**
 * Server-side helper: haal de ingelogde user op, of redirect naar /login.
 * Gebruik dit in Server Components en API-routes die een user vereisen.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/** Zoals requireUser, maar geeft null terug i.p.v. te redirecten (voor API-routes die zelf 401 willen sturen). */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
