import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getOwnedProfile, getProfile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DE MERK-WERKRUIMTE: één routesegment voor alles wat over dít merk gaat.
 *
 * ── WAAROM DE ADRESSEN VERHUISD ZIJN ────────────────────────────────────────
 *
 * Tot augustus 2026 stond élk merkscherm onder `/profielen/[id]/`. Dat viel niet
 * op zolang het merkdossier het enige was wat daar stond, maar zodra Analytics
 * en Strategie er ook onder zouden vallen leest de adresbalk als "profielen" op
 * een scherm dat over zoekverkeer gaat. Besluit 8 van 17 augustus 2026 heeft de
 * merkschermen daarom onder `/merk/[id]/` gezet, met een permanente
 * doorverwijzing (308) vanaf elk oud adres in `next.config.mjs`. Bladwijzers en
 * gedeelde demolinks blijven zo werken; de eigenaar deelt die links in demo's,
 * dus een dood adres kost hier een gesprek.
 *
 * ── ÉÉN TOEGANGSCONTROLE VOOR ALLES HIERONDER ───────────────────────────────
 *
 * De losse schermen deden elk hun eigen `getProfile()`, die via RLS leest en
 * `null` teruggeeft voor een merk dat niet van je is. Dat werkte, maar het was
 * elf keer dezelfde beslissing. Deze layout stelt hem één keer, met
 * `getOwnedProfile()` uit `lib/profiles.ts`: dezelfde drie lagen (account,
 * historische eigenaar, beheerder) die de schrijfroutes ook gebruiken. Er is
 * dus geen tweede route naar dezelfde beslissing.
 *
 * ⚠️ **Een 404 en geen 403.** Een 403 bevestigt dat het merk bestaat, en dat is
 * precies wat een klant van een ander bureau niet hoort te weten. Zelfde
 * antwoord als op het oude adres.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) return {};
  const naam = profile.brand_name ?? profile.name;
  return {
    title: { template: `%s · ${naam} · ORBIT ENGINE`, default: `${naam} · ORBIT ENGINE` },
  };
}

export default async function MerkLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  // De admin-client omzeilt RLS, dus `getOwnedProfile` doet de rechtenvraag
  // zelf en expliciet. Dat is bewust: RLS werkt op rijniveau en kan de drie
  // lagen uit `lib/access.ts` niet uitdrukken.
  const profile = await getOwnedProfile(createAdminClient(), id, user.id);
  if (!profile) notFound();

  return <>{children}</>;
}
