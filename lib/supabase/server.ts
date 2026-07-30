import "server-only";

/**
 * Server Supabase-client met de sessie van de ingelogde user (via cookies).
 * Voor Server Components en API-routes die NAMENS de user lezen (RLS actief).
 * Voor schrijfacties: gebruik `createAdminClient` + expliciete ownership-check.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` kan vanuit een Server Component worden aangeroepen; dat mag
          // genegeerd worden als er middleware is die de sessie ververst.
        }
      },
    },
  });
}
