"use client";

/**
 * Browser Supabase-client (met de anon key + de sessie van de ingelogde user).
 * Gebruik dit UITSLUITEND om te LEZEN (RLS = SELECT-only). Schrijven loopt
 * altijd via de API-routes (zie abcplan.md §5/§12.20).
 */
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

export function createClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
