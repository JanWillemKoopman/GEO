import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * De knop "Beheer" in de bovenbalk, naast de wissel tussen Beheerder en Klant
 * (1 oktober 2026). Hij opent het klantenoverzicht: één tabel met alle klanten.
 *
 * Alleen getoond als de beheerder op "Beheerder" staat. In de klantweergave zou
 * hij naar een pagina wijzen die dan een 404 geeft (`isStaff` is daar uit), en
 * een knop die altijd op niets uitkomt is erger dan geen knop.
 *
 * Zelfde vorm als het belletje ernaast (`.notificatie-knop`): een icoon met een
 * label dat op een smal scherm wegvalt.
 */
export function BeheerKnop() {
  return (
    <Link href="/beheer/klanten" className="notificatie-knop" aria-label="Beheer: alle klanten">
      <Icon naam="admin" size={18} />
      <span className="hidden sm:inline">Beheer</span>
    </Link>
  );
}
