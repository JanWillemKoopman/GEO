import "server-only";

/**
 * Admin Supabase-client met de SERVICE-ROLE key. Omzeilt RLS.
 *
 * ⚠️ Uitsluitend in API-routes / server-side pipeline-code. Elke schrijfactie
 * hiermee MOET voorafgegaan worden door een expliciete ownership-check
 * (analysis.user_id === ingelogde user), zie abcplan.md §5/§12.20. De
 * service-role key komt nooit in de browser.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/**
 * Injectiepunt voor de ketentest (implementatieplan.md S7).
 *
 * ── WAAROM DIT IN PRODUCTIECODE STAAT ───────────────────────────────────────
 *
 * Zeven van de zeven fouten in dit traject zaten in de SAMENHANG tussen taken:
 * wat de ene stap opslaat en wat de volgende ervan leest. Geen ervan zat in een
 * pure functie, dus geen ervan kon door `test-unit.ts` gevangen worden. Om die
 * klasse te kunnen testen moeten de échte jobhandlers draaien tegen een échte
 * Postgres, en dan moet `createAdminClient()` iets anders teruggeven.
 *
 * De alternatieven zijn slechter: een loader-hook die modules omleidt is magie
 * die niemand terugvindt, en de handlers een client laten meekrijgen betekent
 * dat elke functie in de pijplijn een extra argument draagt dat in productie
 * altijd hetzelfde is.
 *
 * ── DE GRENDEL ──────────────────────────────────────────────────────────────
 *
 * Zetten kan alleen buiten productie. Zou dit per ongeluk in een productiebuild
 * aangeroepen worden, dan gooit het in plaats van stilletjes de hele app op een
 * testdatabase te zetten. Dat is precies het soort stille afwijking dat dit
 * traject al vijf keer heeft opgeleverd.
 */
let testClient: SupabaseClient | null = null;

export function __setTestAdminClient(client: SupabaseClient | null): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("De testclient mag niet in productie gezet worden.");
  }
  testClient = client;
}

export function createAdminClient() {
  if (testClient) return testClient;

  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
