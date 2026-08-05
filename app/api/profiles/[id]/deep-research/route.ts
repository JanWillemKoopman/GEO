import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { enqueue, dedupe } from "@/lib/jobs/queue";

/**
 * Onderzoek opnieuw draaien (docs/tasks/onboarding-2.0.md §8, punt 3).
 *
 * ── WAAROM DEZE KNOP MOEST BESTAAN ──────────────────────────────────────────
 *
 * In het gesprek blijkt geregeld dat de site net vernieuwd is, of dat er sinds
 * de crawl diensten bij zijn gekomen. Zonder deze knop is het antwoord daarop
 * "maak een nieuw merk aan", en dan ben je alle correcties, topics en de
 * kennisbasislijn kwijt.
 *
 * ── WAT ER BLIJFT STAAN, EN WAAROM ──────────────────────────────────────────
 *
 * Dit is het verschil tussen een bruikbare knop en een gevaarlijke:
 *
 *   • Profielvelden die een MENS zette blijven staan. Afgedwongen in
 *     `field-merge.ts`, niet in een instructie.
 *   • Aanbodknopen met bron `klant` of `gesprek` blijven staan; die met bron
 *     `ai` gaan weg, want die worden opnieuw afgeleid. Zou je ze laten staan,
 *     dan slaat `buildOfferingTree()` zichzelf over (hij is idempotent op "staat
 *     er al iets") en verandert er niets.
 *   • Topics blijven staan. Dat zijn beslissingen van de klant, soms al met een
 *     lopende analyse eraan.
 *   • De kennisbasislijn blijft staan. Dat is een meting op een moment, en
 *     opnieuw draaien kost geld zonder dat iemand erom vroeg.
 *
 * ── EN WAT ER WÉL OPNIEUW GEBEURT ───────────────────────────────────────────
 *
 * De crawl, de facetten en het merkonderzoek. Samen ~$0,10, de dure stappen
 * (kennistest) blijven buiten schot, dus deze knop is goedkoop genoeg om te
 * gebruiken wanneer het nodig is.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile)
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  if (profile.status === "bezig") {
    return NextResponse.json(
      { error: "Er loopt al een onderzoek voor dit merk." },
      { status: 409 },
    );
  }

  // Facetten weg: die worden opnieuw geschreven, en een oude samenvatting laten
  // staan zou het voortgangsscherm laten zeggen dat een stap klaar is terwijl
  // hij nog moet draaien.
  await admin.from("profile_facets").delete().eq("profile_id", id);

  // Alleen de door AI afgeleide aanbodknopen. Wat een mens toevoegde blijft.
  const { count: verwijderd } = await admin
    .from("profile_offerings")
    .delete({ count: "exact" })
    .eq("profile_id", id)
    .eq("source", "ai");

  // Status terug op 'bezig', anders slaat `prepareProfile()` zichzelf over,
  // die controleert bovenaan of het profiel al klaar is.
  await admin.from("profiles").update({ status: "bezig" }).eq("id", id);

  await enqueue(admin, {
    type: "profile_discover",
    payload: {},
    profileId: id,
    // Zonder de datum in de sleutel zou een tweede ronde als duplicaat gelden
    // van de eerste, de partiële dedupe-index kijkt alleen naar queued/running,
    // maar een afgeronde taak met dezelfde sleutel maakt de bedoeling onnavolgbaar.
    dedupeKey: `${dedupe.profileDiscover(id)}:${Date.now()}`,
  });

  return NextResponse.json({ ok: true, removedAiOfferings: verwijderd ?? 0 });
}
