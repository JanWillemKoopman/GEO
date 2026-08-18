import { redirect } from "next/navigation";

/**
 * OVERZICHT: de startpagina van een merk.
 *
 * Nog niet gebouwd. Fase 5 van `docs/tasks/appstructuur.md` zet hier de zeven
 * blokken neer (hoofdcijfer, wachtrij, funnel-voortgang, contentmix, wat ORBIT
 * ENGINE deze week deed, waar je begint). Tot die tijd is het merkdossier de
 * startpagina, precies zoals `/profielen/[id]` dat was.
 *
 * Bewust een tijdelijke doorverwijzing (307) en geen permanente: dit adres
 * krijgt in fase 5 een eigen scherm, en een 308 zou dan in de browsercache van
 * iedereen die hier langskwam blijven hangen.
 */
export default async function MerkOverzichtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/merk/${id}/merkprofiel`);
}
