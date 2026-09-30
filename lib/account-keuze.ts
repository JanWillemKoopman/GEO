/**
 * Welk account toont "Mijn account"? Puur uitgerekend, zonder `server-only`,
 * zodat de volgorde te testen is vanuit `scripts/test-unit.ts` (conventie 2).
 *
 * ── WAAROM ÉÉN ACCOUNT TEGELIJK ─────────────────────────────────────────────
 *
 * De pagina liet voor elk account een blok bedrijfsgegevens en een blok team
 * zien. Sinds migratie 0134 is de superuser lid van elk klantaccount, dus die
 * zag er zes onder elkaar, met zes keer dezelfde lege velden. Een klant heeft er
 * één; ook een bureau vult bedrijfsgegevens één keer tegelijk in. De volgorde:
 *
 *   1. het account dat iemand zelf in de kiezer aanwees (`?account=`)
 *   2. het account van het merk waar iemand nu in zit
 *   3. een account waar iemand als enige in zit (zijn eigen account)
 *   4. het oudste account
 */
export interface KiesbaarAccount {
  id: string;
  created_at: string;
}

export function kiesAccount<T extends KiesbaarAccount>({
  accounts,
  gevraagd,
  merkAccountId,
  eigenIds,
}: {
  accounts: T[];
  gevraagd?: string | null;
  merkAccountId?: string | null;
  eigenIds: string[];
}): T | null {
  if (accounts.length === 0) return null;
  const opId = (id?: string | null) => (id ? accounts.find((a) => a.id === id) : undefined);

  const oudste = [...accounts].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    opId(gevraagd) ??
    opId(merkAccountId) ??
    oudste.find((a) => eigenIds.includes(a.id)) ??
    oudste[0]
  );
}
