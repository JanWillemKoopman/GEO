/**
 * De kaart die élk inlogscherm draagt: kopje, titel, ondertitel, formulier,
 * afsluiter. Het woordmerk erboven staat sinds stap 8 in `AuthLayout`.
 *
 * ── WAAROM ÉÉN VORM VOOR ALLE SCHERMEN ──────────────────────────────────────
 *
 * Tot 24 augustus 2026 had inloggen een brede kaart met een verkooppaneel
 * ernaast en hadden de andere schermen een smalle kaart. Dat is teruggebracht
 * naar één vorm, op verzoek van de eigenaar: wie zijn wachtwoord opnieuw
 * aanvraagt heeft precies hetzelfde nodig als wie inlogt, namelijk één kolom
 * met één handeling erin. Verschil zit alleen in het kopje, de titel en het
 * formulier; de maatvoering is overal dezelfde.
 *
 * ── DE MAATVOERING IS SINDS STAP 8 DIE VAN `redesign2026.md` §8.2 ──────────
 *
 * Bovenkopje `.mono-label` (heading-overline, dus zonder de pil en het
 * schildje die hier tot dan stonden), titel `.type-heading-lg` (30px, een
 * nieuwe trede die alleen dit scherm gebruikt), onderschrift `.type-compact`
 * op `--text-tertiary`. Geen van de twee schildjes (bij het kopje, bij de
 * afsluitregel) staat in de letterlijke spec, dus die zijn weg: minder
 * versiering, en één minder plek waar een icoon rechtstreeks uit
 * `lucide-react` kwam in plaats van uit `lib/icons.ts` (`docs/designsystem.md`
 * §8 regel 9).
 */
export function AuthCard({
  eyebrow,
  title,
  intro,
  children,
  footer,
}: {
  /** Het bovenkopje, bijvoorbeeld "veilig inloggen". */
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
  /** Wat er onder de knop komt: een link terug, een link naar herstel. */
  footer?: React.ReactNode;
}) {
  return (
    <div className="auth-card">
      <p className="mono-label">{eyebrow}</p>
      <h1 className="type-heading-lg mt-2">{title}</h1>
      <p className="type-compact mt-2 text-[var(--text-tertiary)]">{intro}</p>

      <div className="mt-6">{children}</div>

      {footer && <div className="type-compact mt-6 text-center">{footer}</div>}

      <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
        <p className="type-caption text-center text-[var(--text-subtle)]">
          Je gegevens zijn versleuteld en beveiligd.
        </p>
      </div>
    </div>
  );
}

/** Het label boven een veld, met het rode sterretje voor verplichte velden.
 *  `body-xs-bold` (§7.3), dus gewone kapitalisatie en geen kapitalen: dat is
 *  de generieke labelstijl van elk veld in de app, niet iets eigens van het
 *  inlogtoneel. */
export function AuthLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="type-caption-emphasis block text-[var(--text-tertiary)]">
      {children}
      {required && <span className="text-[var(--intent-danger-text)]"> *</span>}
    </label>
  );
}
