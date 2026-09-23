import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid, spoorPaginering } from "@/lib/spoor";

/**
 * GET /api/beheer/spoor/[profileId], het spoor van één merk: elke AI-aanroep en
 * elke taak, in tijdsvolgorde (docs/tasks/kwaliteitsdoorlichting-pijplijn.md §4,
 * stap 0.3).
 *
 * ── WAAROM EEN ROUTE EN GEEN DATABASEVRAAG ──────────────────────────────────
 *
 * De doorlichting moet per stap kunnen nalezen welke opdracht er naar de AI ging
 * en wat er terugkwam. Sinds migratie 0112 staat dat in `ai_calls.input_json`,
 * maar één schrijfopdracht is al ongeveer 90 KB. Een merk telt na een volledige
 * doorloop honderden aanroepen; dat hoort als bestand uit de app te komen, niet
 * in brokjes uit een beheerconsole.
 *
 * ── ALLEEN VOOR BEHEERDERS, ALLEEN LEZEN ────────────────────────────────────
 *
 * `ai_calls` en `jobs` hebben nul RLS-policies (migratie 0012 en 0013): dit is
 * bedrijfsinformatie van ORBIT ENGINE, geen klantdata. Een gewone gebruiker
 * krijgt een 404, net als bij `/api/beheer/kwaliteit`: een 403 bevestigt dat het
 * bestaat. De route schrijft niets.
 *
 * ── PAGINEREN ───────────────────────────────────────────────────────────────
 *
 * `?na=<ISO-tijd>` geeft de aanroepen van ná dat moment, hooguit `?aantal=`
 * (standaard 50, maximaal 200) tegelijk. `?invoer=0` laat de opdrachten weg,
 * voor een snel overzicht. Het antwoord zegt met `volgende` waar de volgende
 * bladzijde begint, of `null` als dit de laatste was.
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isStaff(user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  if (!isUuid(profileId)) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const url = new URL(request.url);
  const { na, aantal, metInvoer } = spoorPaginering(url.searchParams);

  const admin = createAdminClient();
  const { data: profiel } = await admin
    .from("profiles")
    .select("id, name")
    .eq("id", profileId)
    .maybeSingle();
  if (!profiel) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  // Een aanroep hangt aan het merk, aan een analyse van het merk, of aan allebei.
  const { data: analyses } = await admin
    .from("analyses")
    .select("id")
    .eq("profile_id", profileId);
  const analyseIds = (analyses ?? []).map((a) => a.id as string);
  const filter = analyseIds.length
    ? `profile_id.eq.${profileId},analysis_id.in.(${analyseIds.join(",")})`
    : `profile_id.eq.${profileId}`;

  const kolommen =
    "id, created_at, kind, model, engine, analysis_id, content_piece_id, input_tokens, output_tokens, cost_usd, web_search, prompt_hash, raw_json" +
    (metInvoer ? ", input_json" : "");

  let vraag = admin
    .from("ai_calls")
    .select(kolommen)
    .or(filter)
    .order("created_at", { ascending: true })
    .limit(aantal + 1);
  if (na) vraag = vraag.gt("created_at", na);
  const { data: aanroepen, error } = await vraag;
  if (error) {
    return NextResponse.json({ error: "Het spoor kon niet worden opgehaald." }, { status: 500 });
  }

  const rijen = (aanroepen ?? []) as unknown as { created_at: string }[];
  const meer = rijen.length > aantal;
  const pagina = meer ? rijen.slice(0, aantal) : rijen;

  // De taken alleen bij de eerste bladzijde: het zijn er tientallen, geen honderden.
  const taken = na
    ? null
    : (
        await admin
          .from("jobs")
          .select("id, type, status, attempts, analysis_id, created_at, started_at, finished_at, last_error")
          .or(analyseIds.length ? `profile_id.eq.${profileId},analysis_id.in.(${analyseIds.join(",")})` : `profile_id.eq.${profileId}`)
          .order("created_at", { ascending: true })
          .limit(1000)
      ).data;

  return NextResponse.json({
    merk: profiel,
    aanroepen: pagina,
    taken,
    volgende: meer ? pagina[pagina.length - 1].created_at : null,
  });
}
