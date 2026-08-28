import Link from "next/link";
import { openVragenLabel } from "@/lib/open-questions-count";

/**
 * "3 openstaande vragen", rechts in de bovenbalk (28 augustus 2026).
 *
 * ── WAAROM DIT IN DE BOVENBALK STAAT EN NIET OP EEN SCHERM ──────────────────
 *
 * De vragen bepalen de kwaliteit van élke pagina die ORBIT ENGINE schrijft, en
 * sinds de eindpoort (`lib/content-final-gate.ts`) houdt een openstaande vraag
 * een pagina zelfs tegen. Stond die telling alleen op de vragenpagina, dan zag
 * de klant hem precies dán niet: als hij ergens anders in de app bezig is met
 * het werk dat erdoor geblokkeerd wordt.
 *
 * ── DRIE REGELS DIE HEM RUSTIG HOUDEN ───────────────────────────────────────
 *
 * 1. **Nul is weg, niet nul.** Bij niets open verdwijnt de hele melding. Een
 *    balk die naast élk scherm "0 openstaande vragen" meldt, vraagt aandacht
 *    voor niets en went binnen een dag weg.
 * 2. **Geen icoon, geen kader, geen chip.** Alleen het bolletje en de tekst. De
 *    bovenbalk draagt al een merkkiezer, een themaschakelaar en een
 *    accountmenu; een vierde omkaderd element maakt er een werkbalk van.
 * 3. **Tekstkleur, geen groene tekst.** Het bolletje draagt de kleur, de tekst
 *    blijft secundair. Groene tekst in de bovenbalk zou zwaarder wegen dan de
 *    merknaam ernaast.
 *
 * Op smalle schermen blijft alleen het getal over: "3", met het bolletje ervoor.
 * De volledige tekst staat in `title` en in `aria-label`, dus wie hem voorleest
 * of erover zweeft krijgt hem alsnog.
 */
export function OpenQuestionsBadge({
  aantal,
  href,
}: {
  aantal: number;
  /** Waar de vragen staan. `null` als er geen merk gekozen is. */
  href: string | null;
}) {
  const label = openVragenLabel(aantal);
  if (!label || !href) return null;

  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1 text-sm text-secondary transition-colors hover:bg-[var(--wash-hover)] hover:text-[var(--text-primary)]"
    >
      <span className="vraag-dot" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{aantal}</span>
    </Link>
  );
}
