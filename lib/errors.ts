/**
 * Best-effort, leesbare foutomschrijving — ook voor OpenAI/Supabase SDK-errors
 * die hun eigenlijke boodschap verstoppen in geneste velden (error.error.message,
 * status codes, etc.). Puur voor logging/debug-weergave, geen gevoelige data.
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) {
    const anyErr = err as Error & { status?: number; error?: { message?: string } };
    const nested = anyErr.error?.message;
    const status = anyErr.status;
    const message = nested ?? anyErr.message;
    return status ? `[${status}] ${message}` : message;
  }
  return String(err);
}

/**
 * ── Begrijpelijke foutmeldingen (optimalisatie.md 0.11) ─────────────────────
 *
 * De voortgangsschermen toonden tot nu toe de ruwe serverfout in monospace —
 * inclusief statuscodes en SDK-jargon — aan een ondernemer zonder technische
 * achtergrond. In de code stond zelf al "⚠️ Tijdelijk: detail meesturen voor
 * debugging tijdens de bouwfase".
 *
 * Elke fout valt nu in één van vier categorieën, elk met een boodschap die zegt
 * wat er gebeurd is en wat de klant kan doen. De technische tekst blijft
 * bestaan, maar verhuist naar een uitklapper: nodig voor support, niet het
 * eerste wat iemand leest.
 */
export type ErrorKind = "website_unreachable" | "ai_unavailable" | "configuration" | "unknown";

export interface UserFacingError {
  kind: ErrorKind;
  /** Korte kop, in gewone taal. */
  title: string;
  /** Wat er aan de hand is en wat de klant kan doen. */
  message: string;
  /** Heeft opnieuw proberen zin? Stuurt of de retry-knop getoond wordt. */
  canRetry: boolean;
  /** De ruwe technische tekst — alleen achter "technische details". */
  detail: string;
}

/** HTTP-statussen die duiden op een tijdelijk probleem aan de kant van de AI-dienst. */
function isTransientStatus(status: number | undefined): boolean {
  if (status == null) return false;
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

export function classifyError(err: unknown): UserFacingError {
  const detail = describeError(err);
  const lower = detail.toLowerCase();
  const status = (err as { status?: number } | null)?.status;

  // 1. Configuratie: een ontbrekende omgevingsvariabele is een probleem van ONS,
  //    niet van de klant. Geen retry-knop — opnieuw proberen lost niets op.
  if (lower.includes("ontbrekende omgevingsvariabele")) {
    return {
      kind: "configuration",
      title: "De app is niet volledig ingesteld",
      message:
        "Er ontbreekt een instelling aan onze kant. Opnieuw proberen helpt niet — " +
        "laat het ons weten, dan lossen we het op.",
      canRetry: false,
      detail,
    };
  }

  // 2. Website onbereikbaar: hier kan de klant zelf iets aan doen (URL nakijken).
  if (
    lower.includes("enotfound") ||
    lower.includes("econnrefused") ||
    lower.includes("getaddrinfo") ||
    lower.includes("website niet bereikbaar") ||
    lower.includes("certificate")
  ) {
    return {
      kind: "website_unreachable",
      title: "We konden je website niet bereiken",
      message:
        "Controleer of het webadres klopt en of de site online is. Staat er een " +
        "beveiliging of firewall voor? Dan kunnen wij er mogelijk niet bij.",
      canRetry: true,
      detail,
    };
  }

  // 3. AI-dienst tijdelijk niet beschikbaar. De client probeert zelf al opnieuw
  //    (lib/openai/client.ts); komt het hier, dan hielp dat niet.
  if (
    isTransientStatus(status) ||
    lower.includes("rate limit") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("econnreset") ||
    lower.includes("overloaded") ||
    lower.includes("service unavailable")
  ) {
    return {
      kind: "ai_unavailable",
      title: "De AI-dienst was even niet beschikbaar",
      message:
        "Dit gebeurt af en toe bij drukte en gaat vanzelf weer over. Wat al gelukt " +
        "is blijft bewaard — een nieuwe poging pakt alleen op wat nog mist.",
      canRetry: true,
      detail,
    };
  }

  return {
    kind: "unknown",
    title: "Er ging iets onverwachts mis",
    message:
      "We weten niet precies wat. Probeer het opnieuw; blijft het misgaan, laat " +
      "het ons dan weten met de technische details hieronder.",
    canRetry: true,
    detail,
  };
}
