/**
 * Decoratieve achtergrond voor losse auth-schermen (inloggen, wachtwoord vergeten).
 * Vast gepositioneerd en met een negatieve z-index, dus onafhankelijk van de
 * `relative z-10`-wrapper in `layout.tsx` die de kaart zelf erboven houdt.
 * Alleen op de pagina's die hem expliciet importeren, niet op alle auth-routes
 * (registreren, wachtwoord instellen, uitnodiging), zodat een latere wens om
 * die schermen anders te houden geen aparte laag hoeft terug te draaien.
 */
export function AuthBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundColor: "#f8fafc",
        opacity: 0.4,
        background:
          "repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 3.2px, #788795 3.2px, #788795 4px, transparent 4px, transparent 8px)",
        maskImage:
          "radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.6) 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.6) 100%)",
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  );
}
