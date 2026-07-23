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
