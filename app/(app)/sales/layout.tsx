import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isSales } from "@/lib/sales/access";

/**
 * De poort voor de hele Sales-sectie (`docs/tasks/geo-prospect-engine.md` §4.3).
 *
 * ── WAAROM DIT IN DE LAYOUT ZIT EN NIET IN VIJF PAGINA'S ────────────────────
 *
 * Vijf pagina's die elk hun eigen controle doen, zijn vijf plekken om er één te
 * vergeten, en de zesde pagina die er ooit bij komt vergeet hem gegarandeerd.
 * Een layout in Next.js draait vóór elke pagina eronder, ook vóór pagina's die
 * later worden toegevoegd. Dat is dezelfde gedachte als `lib/access.ts`: één
 * plek waar het oordeel valt.
 *
 * ⚠️ **404 en geen 403.** Een klant die `/sales` intikt krijgt "pagina bestaat
 * niet". Dat is geen woordkeuze maar het punt zelf: een 403 bevestigt dat het
 * scherm bestaat, en een klant mag nooit kunnen zien dat er een module is waar
 * bedrijven met een opportunityscore in staan. De bestaande interne schermen
 * (`/beheer`, `/merk/[id]/admin`) gedragen zich al zo.
 *
 * Dit is de ene helft van de scheiding. De andere twee helften staan in de
 * database (RLS met `is_sales()`, migratie 0065) en in `scripts/test-unit.ts`
 * (geen klantscherm leest uit de Sales-laag). Drie sloten op dezelfde deur, en
 * dat is hier terecht: dit is de enige plek in de app waar gegevens staan over
 * bedrijven die geen klant zijn en er niet om gevraagd hebben.
 */
export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!(await isSales(user.id))) notFound();
  return <>{children}</>;
}
