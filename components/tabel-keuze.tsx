"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Segment } from "@/components/tabs";

export type TabelSoort = "ai-vragen" | "concurrenten";

/**
 * De keuze tussen twee tabellen onder "Zichtbaarheid in AI": de AI-vragen of de
 * concurrenten.
 *
 * Een segment en geen tabblad: je verandert hoe je naar dezelfde pagina kijkt en
 * je gaat nergens heen (`components/tabs.tsx`). De keuze staat wel in het adres
 * (`?tabel=concurrenten`), zodat hij te delen is en de filters erboven hem niet
 * kwijtraken. AI-vragen is de standaard en krijgt daarom geen parameter.
 */
export function TabelKeuze({ gekozen }: { gekozen: TabelSoort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function kies(waarde: TabelSoort) {
    const params = new URLSearchParams(searchParams.toString());
    if (waarde === "ai-vragen") params.delete("tabel");
    else params.set("tabel", waarde);
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  }

  return (
    <Segment
      label="Tabel"
      gekozen={gekozen}
      onKies={kies}
      opties={[
        { waarde: "ai-vragen", label: "AI-vragen" },
        { waarde: "concurrenten", label: "Concurrenten" },
      ]}
    />
  );
}
