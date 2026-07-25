import "server-only";

/**
 * Admin Supabase-client met de SERVICE-ROLE key. Omzeilt RLS.
 *
 * ⚠️ Uitsluitend in API-routes / server-side pipeline-code. Elke schrijfactie
 * hiermee MOET voorafgegaan worden door een expliciete ownership-check
 * (analysis.user_id === ingelogde user), zie abcplan.md §5/§12.20. De
 * service-role key komt nooit in de browser.
 */
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

export function createAdminClient() {
  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
