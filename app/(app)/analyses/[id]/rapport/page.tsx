import { redirect } from "next/navigation";

/**
 * Het rapport was een eigen tabblad, werd daarna een hoofdstuk van het
 * clusterdossier, en dat dossier is op 22 september 2026 zelf weggehaald
 * (`docs/tasks/clusterresultaat-zonder-eigen-scherm.md`).
 *
 * Deze route blijft bestaan omdat er links naar staan in eerder verstuurde
 * e-mails en in bladwijzers van klanten. Hij stuurt door naar het adres
 * erboven, dat op zijn beurt de weg wijst naar het clusteroverzicht. Eén
 * doorverwijzing meer dan nodig, maar wel eentje die blijft kloppen als dat
 * eindadres ooit weer verandert.
 */
export default async function RapportRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/analyses/${id}`);
}
