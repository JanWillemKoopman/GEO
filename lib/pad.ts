import { headers } from "next/headers";

/**
 * Het pad van het huidige verzoek. Gezet in `middleware.ts`, gelezen hier.
 * Zelfde patroon als `lib/apparaat.ts`: geen extra netwerkronde, de
 * middleware draait al op elke pagina voor de sessie.
 */
export async function huidigPad() {
  return (await headers()).get("x-pad") ?? "";
}
