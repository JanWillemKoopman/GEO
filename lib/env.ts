/**
 * Centrale, gevalideerde toegang tot omgevingsvariabelen.
 *
 * Server-only secrets (service-role, OpenAI, Resend) worden lazy gelezen zodat
 * het importeren van dit bestand in een client-component niet meteen crasht,
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

/** Publieke Supabase-config, veilig in de browser. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** Server-only secrets, lazy gevalideerd, nooit naar de client. */
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
    return process.env.RESEND_FROM_EMAIL ?? "Aura <onboarding@resend.dev>";
  },
  get cronSecret() {
    return required("CRON_SECRET", process.env.CRON_SECRET);
  },
};

/**
 * Hoofdschakelaar voor ALLE uitgaande e-mail (Resend).
 *
 * Standaard UIT. Tijdens het bouwen wil je geen echte mail versturen, en op een
 * gratis Resend-account is elk verstuurd bericht er één van een klein maandbudget.
 * Zet `EMAILS_ENABLED=true` (lokaal in `.env.local`, in productie in Vercel) om
 * ze weer aan te zetten; dan is ook `RESEND_API_KEY` nodig.
 *
 * Bewust niet gekoppeld aan "is RESEND_API_KEY gezet?": je kunt de sleutel dus
 * vast in Vercel zetten zonder dat er iets de deur uit gaat.
 *
 * Wordt bij elke aanroep gelezen, niet bij het laden van de module, zodat de
 * waarde niet in een build vastgebakken wordt.
 */
export function emailsEnabled(): boolean {
  return process.env.EMAILS_ENABLED === "true";
}

/** Niet-gevoelige check of alles geconfigureerd is (voor /api/health). Retourneert alleen booleans. */
export function envStatus() {
  return {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    openaiApiKey: Boolean(process.env.OPENAI_API_KEY),
    resendApiKey: Boolean(process.env.RESEND_API_KEY),
    // Staat de mailfunctionaliteit überhaupt aan? Is dit false, dan doet een
    // ontbrekende RESEND_API_KEY er niet toe, er wordt toch niets verstuurd.
    emailsEnabled: emailsEnabled(),
    cronSecret: Boolean(process.env.CRON_SECRET),
    models: MODELS, // vastgelegd in code (lib/openai/models.ts), geen env-variabele
  };
}
