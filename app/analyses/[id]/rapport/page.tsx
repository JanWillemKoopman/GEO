import { redirect } from "next/navigation";

/**
 * Het rapport was een eigen tabblad. De inhoud ervan is verdeeld over de
 * hoofdstukken waar hij thuishoort: de samenvatting bij de score (01), de
 * gaten bij het bewijs (02), de aanbevelingen en het off-site werk bij wat je
 * moet doen (03).
 *
 * Deze route blijft bestaan omdat er links naar staan in eerder verstuurde
 * e-mails en in bladwijzers van klanten.
 */
export default async function RapportRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periode?: string }>;
}) {
  const { id } = await params;
  const { periode } = await searchParams;
  redirect(periode ? `/analyses/${id}?periode=${periode}` : `/analyses/${id}`);
}
