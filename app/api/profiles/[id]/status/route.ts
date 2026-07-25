import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/profiles/[id]/status — lichte poll-endpoint voor het onderzoeks-
 * voortgangsscherm. Leest via de user-sessie (RLS = ownership).
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  return NextResponse.json({ status: profile.status });
}
