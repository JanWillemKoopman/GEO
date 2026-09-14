import "server-only";

/**
 * Wie mag bij een sollicitatiegesprek, en bij welk gesprek.
 *
 * Eén functie voor alle routes van het zijproject, om de reden uit conventie 6:
 * schrijven loopt met de service-role, die RLS omzeilt, dus de eigenaarscontrole
 * moet expliciet in de route staan. Staat die controle op vier plekken los
 * opgeschreven, dan is de vijfde route degene waar hij ontbreekt.
 *
 * Er zitten twee sloten op, niet één:
 *
 * 1. `isStaff()`, hetzelfde recht dat de layout van het zijproject afdwingt.
 *    Ook de klantweergave telt mee: staat die aan, dan is dit scherm er voor de
 *    eigenaar net zo goed niet, precies zoals in de rest van de app.
 * 2. `user_id` van het gesprek. Twee beheerders delen dit scherm niet: de
 *    sollicitatiebrief van de één gaat de ander niets aan, ook al mogen ze
 *    allebei bij de Sales-module en bij elk merk.
 */
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SollicitatieChat } from "@/lib/types/database";

export type Toegangsuitkomst =
  | { ok: true; userId: string; chat: SollicitatieChat }
  | { ok: false; status: 401 | 404; melding: string };

/**
 * Haalt het gesprek op en controleert of deze gebruiker erbij mag.
 *
 * Een gesprek van iemand anders geeft 404 en geen 403: een adres dat niet van
 * jou is, hoort niet te verraden dat het bestaat. Zelfde keuze als de
 * `notFound()` in de layout van het zijproject.
 */
export async function laadEigenGesprek(chatId: string): Promise<Toegangsuitkomst> {
  const user = await getUser();
  if (!user) return { ok: false, status: 401, melding: "Je bent niet ingelogd." };
  if (!(await isStaff(user.id))) {
    return { ok: false, status: 404, melding: "Dit gesprek bestaat niet." };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("sollicitatie_chats")
    .select("*")
    .eq("id", chatId)
    .maybeSingle();

  const chat = data as SollicitatieChat | null;
  if (!chat || chat.user_id !== user.id) {
    return { ok: false, status: 404, melding: "Dit gesprek bestaat niet." };
  }

  return { ok: true, userId: user.id, chat };
}

/** Alleen het slot op het scherm zelf, voor een route die nog geen gesprek heeft. */
export async function eisBeheerder(): Promise<
  { ok: true; userId: string } | { ok: false; status: 401 | 404; melding: string }
> {
  const user = await getUser();
  if (!user) return { ok: false, status: 401, melding: "Je bent niet ingelogd." };
  if (!(await isStaff(user.id))) {
    return { ok: false, status: 404, melding: "Deze pagina bestaat niet." };
  }
  return { ok: true, userId: user.id };
}
