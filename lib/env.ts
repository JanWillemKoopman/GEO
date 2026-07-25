/**
 * Centrale, gevalideerde toegang tot omgevingsvariabelen.
 *
 * Server-only secrets (service-role, OpenAI, Resend) worden lazy gelezen zodat
 * het importeren van dit bestand in een client-component niet meteen crasht —
 * pas bij daadwerkelijk gebruik valideren we dat de variabele bestaat.
 *
 * Zie abcplan.md §5/§12.20: de service-role key mag NOOIT in de browser komen.
 */

import { MODELS } from "@/lib/openai/models";

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Ontbrekende omgevingsvariabele: ${name}. Zie .env.example en zet 'm in .env.local (lokaal) of Vercel (productie).`,
    );
  }
  return value;
}

/** Publieke Supabase-config — veilig in de browser. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** Server-only secrets — lazy gevalideerd, nooit naar de client. */
export const serverEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get openaiApiKey() {
    return required("OPENAI_API_KEY", process.env.OPENAI_API_KEY);
  },
  get resendApiKey() {
    return required("RESEND_API_KEY", process.env.RESEND_API_KEY);
  },
  get resendFromEmail() {
    return process.env.RESEND_FROM_EMAIL ?? "GEO Tracker <onboarding@resend.dev>";
  },
  get cronSecret() {
    return required("CRON_SECRET", process.env.CRON_SECRET);
  },
};

/** Niet-gevoelige check of alles geconfigureerd is (voor /api/health). Retourneert alleen booleans. */
export function envStatus() {
  return {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    openaiApiKey: Boolean(process.env.OPENAI_API_KEY),
    resendApiKey: Boolean(process.env.RESEND_API_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
    models: MODELS, // vastgelegd in code (lib/openai/models.ts), geen env-variabele
  };
}
