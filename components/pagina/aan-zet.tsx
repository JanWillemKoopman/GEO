import type { PaginaStand } from "@/lib/pagina-stand";

/**
 * De kaart "Aan zet" (`docs/tasks/contentflow-een-lijn.md` §4.6a).
 *
 * De enige plek op het paginascherm met een hoofdknop. Tot 23 september 2026
 * stond de groene knop "Zet deze pagina live" vast in de bovenbalk, ook boven
 * een pagina zonder tekst en boven een tekst met vijf punten die publicatie
 * tegenhielden. De knop volgt nu de stand: kan de handeling niet, dan staat hij
 * er niet.
 *
 * De stang links volgt wie aan zet is: groen als de klant iets moet doen of
 * het werk af is, accent als ORBIT ENGINE bezig is
 * (`docs/designsystem.md` §5.5).
 */
export function AanZet({
  stand,
  actie,
  tweede,
  children,
}: {
  stand: PaginaStand;
  /** De hoofdknop. Alleen meegeven als de klant aan zet is. */
  actie?: React.ReactNode;
  /** Een tweede, rustige handeling ("Vraag een aanpassing"). */
  tweede?: React.ReactNode;
  /** Extra inhoud onder de zin, bijvoorbeeld het adresveld bij "Zet hem live". */
  children?: React.ReactNode;
}) {
  // Groen als de klant aan zet is (23 september 2026, besluit van de
  // eigenaar): oranje is op het paginascherm voorbehouden aan "Te verbeteren",
  // de ene plek waar nog iets moet gebeuren aan de tekst. Twee oranje vlakken
  // boven elkaar lieten niet meer zien welke van de twee het werk was.
  const rail =
    stand.aanZet === "klant" || stand.toon === "klaar" ? "card-rail-success" : "card-rail-accent";
  const wie =
    stand.aanZet === "klant" ? "Aan zet: jij" : stand.aanZet === "orbit_engine" ? "Aan zet: ORBIT ENGINE" : null;

  return (
    <section className={`card card-rail ${rail} flex flex-col gap-3`} aria-label="Wat er nu gebeurt">
      <div className="flex flex-col gap-1">
        {wie && <span className="type-caption-emphasis text-secondary">{wie}</span>}
        <p className="type-body">{stand.zin}</p>
      </div>
      {children}
      {(actie || tweede) && (
        <div className="flex flex-wrap items-center gap-3">
          {actie}
          {tweede}
        </div>
      )}
    </section>
  );
}
