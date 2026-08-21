/**
 * Een link die de app verlaat (H.64).
 *
 * Overal in de app stond `target="_blank" rel="noopener noreferrer"` los
 * getypt, zonder enig visueel signaal dat de klik de app verlaat. Bij een
 * dossier van vier hoofdstukken is dat een vindbaarheidsprobleem: een klant
 * die per ongeluk zijn plek in de tekst kwijtraakt, moet weer helemaal
 * terugscrollen.
 *
 * Het pijltje staat ná de tekst, in dezelfde regel: schuin omhoog is het
 * gebaar dat het duidelijkst "dit gaat ergens anders heen" zegt.
 *
 * ⚠️ Hier stond het letterteken `↗`, met de opmerking erbij dat dat "geen los
 * icoon hoeft te laden". Dat klopte, maar het gevolg was dat de pijl uit een
 * ander lettertype kwam dan de tekst eromheen zodra Geist het teken niet had,
 * en dan verspringt hij van dikte en hoogte per apparaat. Sinds 21 augustus
 * 2026 komt hij uit `lib/icons.ts` en is hij overal dezelfde tekening.
 */
import { Icon } from "@/components/icon";

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
        // `inline-block` met een klein negatief verzet: zo zit de pijl op de
        // hoogte van de kleine letters en niet op de basislijn eronder.
        <span
          className="inline-block align-text-top"
          style={{ marginLeft: "0.15em", transform: "translateY(0.05em)" }}
        >
          <Icon naam="extern" size={13} />
        </span>
      )}
    </a>
  );
}
