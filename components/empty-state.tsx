import Link from "next/link";

/**
 * De lege staat, één vorm voor de hele app.
 *
 * Dit component bestond al, maar werd overal omzeild: `/analyses`,
 * `/profielen` en `/analyses/nieuw` bouwden hun eigen variant met de hand, elk
 * met een andere padding (py-12, py-14, py-16) en twee ervan met een pulserende
 * live-dot die niets aankondigde. De reden was steeds dezelfde: het gedeelde
 * component kon geen knop tonen, en een lege staat zónder volgende stap is
 * precies de helft van een lege staat.
 *
 * Een lege staat is de belangrijkste onboarding-pagina die je hebt. Hij mag
 * maar één ding doen: de volgende échte stap starten.
 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center gap-4 py-14 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="max-w-md text-secondary">{children}</p>
      {action && (
        <Link href={action.href} className="btn-primary mt-1">
          {action.label}
        </Link>
      )}
    </div>
  );
}
