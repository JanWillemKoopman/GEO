import Link from "next/link";

/**
 * "Deze pagina bestaat niet", binnen de app (UX-audit 23 september 2026, P2.12).
 *
 * `app/not-found.tsx` staat buiten de app-schil: geen zijbalk, geen bovenbalk,
 * alleen het woordmerk. Dat is goed voor een adres dat helemaal niet bestaat,
 * maar de meeste 404's in de app komen uit `notFound()` op een bestaande route
 * (een merk of cluster dat weg is, een stafscherm voor een klant). Wie daar
 * landt, zat net nog in de app en hoort zijn menu te houden. Deze vangt die
 * gevallen op, binnen de layout van `(app)` en dus binnen `AppShell`.
 */
export default function NietGevonden() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="mono-label">404</span>
      <h1 className="type-heading-lg">Deze pagina bestaat niet</h1>
      <p className="text-secondary">
        De link klopt niet meer, of het item is verwijderd. Via het menu kom je overal.
      </p>
      <Link href="/" className="btn-primary">
        Naar je overzicht
      </Link>
    </div>
  );
}
