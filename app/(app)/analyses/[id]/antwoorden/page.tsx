import { redirect } from "next/navigation";

/**
 * "Vragen & antwoorden" was een eigen tabblad, en verhuisde op 26 augustus
 * 2026 naar hoofdstuk 02 van het dossier. Sinds 16 september 2026 staat de
 * letterlijke antwoordenlijst niet meer op het cluster zelf: de cijfers erachter
 * horen op Analytics, en het cluster toont alleen nog de conclusie in gewone
 * taal. Deze route blijft bestaan voor bestaande links, en stuurt door naar het
 * cluster zelf.
 */
export default async function AntwoordenRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/analyses/${id}`);
}
