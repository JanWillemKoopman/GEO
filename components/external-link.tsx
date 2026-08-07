/**
 * Een link die de app verlaat (H.64).
 *
 * Overal in de app stond `target="_blank" rel="noopener noreferrer"` los
 * getypt, zonder enig visueel signaal dat de klik de app verlaat. Bij een
 * dossier van vier hoofdstukken is dat een vindbaarheidsprobleem: een klant
 * die per ongeluk zijn plek in de tekst kwijtraakt, moet weer helemaal
 * terugscrollen.
 *
 * Het pijltje staat ná de tekst, in dezelfde regel: `↗` is het teken dat het
 * duidelijkst "dit gaat ergens anders heen" zegt zonder een los icoon te laden.
 */
export function ExternalLink({
  href,
  children,
  className = "underline",
  showArrow = true,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  showArrow?: boolean;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      {showArrow && (
        <span aria-hidden style={{ marginLeft: "0.2em", fontSize: "0.85em" }}>
          ↗
        </span>
      )}
    </a>
  );
}
