import { NextResponse } from "next/server";
import { eisBeheerder } from "@/lib/solliciteren/toegang";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SollicitatieChat } from "@/lib/types/database";

/**
 * Een nieuw sollicitatiegesprek beginnen (migratie 0095).
 *
 * Schrijven via de service-role met een expliciete rechtencontrole, nooit
 * rechtstreeks vanaf de client (conventie 6). Lezen doet de pagina zelf, als
 * server component; daarom staat er hier geen GET.
 */
export async function POST() {
  const toegang = await eisBeheerder();
  if (!toegang.ok) {
    return NextResponse.json({ error: toegang.melding }, { status: toegang.status });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sollicitatie_chats")
    .insert({ user_id: toegang.userId })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Het gesprek aanmaken is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ chat: data as SollicitatieChat }, { status: 201 });
}
