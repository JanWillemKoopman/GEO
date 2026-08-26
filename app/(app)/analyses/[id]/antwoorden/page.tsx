import { redirect } from "next/navigation";

/**
 * "Vragen & antwoorden" was een eigen tabblad, terwijl het rapport er voor elk
 * punt naartoe moest linken om zijn eigen bewering te onderbouwen. Het staat nu
 * in hoofdstuk 02, direct onder die bewering.
 *
 * Deze route blijft bestaan voor bestaande links; de `runs`-filter gaat mee.
 */
export default async function AntwoordenRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ runs?: string }>;
}) {
  const { id } = await params;
  const { runs } = await searchParams;
  redirect(
    runs
      ? `/analyses/${id}?hoofdstuk=bewijs&runs=${runs}#antwoorden`
      : `/analyses/${id}?hoofdstuk=bewijs`,
  );
}
