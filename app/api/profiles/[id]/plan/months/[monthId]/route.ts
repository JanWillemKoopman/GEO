import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { approveMonth, markPosted } from "@/lib/plans";
import { kiesVoorBulk, bulkMelding, OVERSLAAN_TEKST, type BulkKandidaat } from "@/lib/plan-bulk";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { checkBudgetForProfile } from "@/lib/spend-limit";
import { bereidMaandVoor } from "@/lib/pagina/start";

/**
 * POST /api/profiles/[id]/plan/months/[monthId], een hele maand goedkeuren of
 * afwijzen.
 *
 * ── WAAROM AFWIJZEN GEEN "NEE" IS MAAR "OPNIEUW" ────────────────────────────
 *
 * Nova is hier expliciet over (`approveMonthly.declineNote`: "Declining
 * discards this strategy and generates a new one"). Afwijzen is geen discussie
 * maar een nieuwe ronde van de machine. Dat is hier overgenomen: de maand gaat
 * op `afgewezen`, en het scherm biedt daarna aan een nieuw plan op te stellen.
 *
 * Bewust NIET automatisch hergenereren in deze route: dat zou betekenen dat één
 * klik het hele jaarplan vervangt, inclusief maanden die de klant al had
 * goedgekeurd. Twee handelingen, twee bevestigingen.
 *
 * ── DE DERDE HANDELING KOST NIETS, EN VALT DUS BUITEN DE REM ────────────────
 *
 * "Markeer alles als geplaatst" (17 augustus 2026) zet geen enkel schrijfwerk in
 * gang: het legt vast dat pagina's die er al zijn nu live staan. Besluit 8 zegt
 * bovendien dat zowel de eigenaar als de klant dat mag. De rechtencontrole
 * `mayTriggerCost` staat daarom niet meer bovenaan de route maar bij de twee
 * handelingen die hem nodig hebben.
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; monthId: string }> },
) {
  const { id, monthId } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  // De maand moet bij een plan van dít merk horen. Zonder deze controle kan
  // iemand met toegang tot merk A een maand van merk B goedkeuren.
  const { data: month } = await admin
    .from("plan_months")
    .select("id, plan_id, content_plans!inner(profile_id)")
    .eq("id", monthId)
    .maybeSingle();

  const hoortErbij =
    (month as { content_plans?: { profile_id?: string } } | null)?.content_plans
      ?.profile_id === id;
  if (!month || !hoortErbij) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: { actie?: string };
  try {
    body = (await request.json()) as { actie?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  // ⚠️ Een maand goedkeuren is de duurste knop van de app: hij zet tien pagina's
  // op het premium model in gang, ~$2,80 bij pakket 10. Alleen de beheerder
  // (besluit 18). De klant zegt akkoord, de consultant drukt.
  //
  // Afwijzen valt hier bewust ook onder. Dat kost niets, maar het gaat over
  // dezelfde maand en dezelfde afspraak, en twee verschillende rechten op één
  // scherm is precies het soort verschil dat niemand kan uitleggen.
  if (body.actie === "goedkeuren" || body.actie === "afwijzen") {
    if (!(await mayTriggerCost(user.id, "plan_goedkeuren"))) {
      return NextResponse.json({ error: COST_DENIED.plan_goedkeuren }, { status: 403 });
    }
  }

  if (body.actie === "goedkeuren") {
    // ⚠️ De TWEEDE rem (F1, lib/spend-limit.ts), en hij staat bewust hier en
    // niet bij `mayTriggerCost` hierboven. Goedkeuren zet ~$2,80 aan schrijfwerk
    // in gang, afwijzen kost niets. Die twee mogen dezelfde rechten delen, maar
    // niet hetzelfde budget: een account met een vol plafond moet zijn maand nog
    // wél kunnen afwijzen.
    const budget = await checkBudgetForProfile(id);
    if (!budget.ok) {
      return NextResponse.json({ error: budget.message }, { status: 402 });
    }

    const ok = await approveMonth(admin, monthId, user.id);
    if (!ok) {
      return NextResponse.json({ error: "Goedkeuren is niet gelukt." }, { status: 500 });
    }

    // ── Vrijgeven start de voorbereiding van de hele maand (23 september 2026) ──
    //
    // Eén vragenmoment per maand in plaats van vijf losse
    // (`docs/tasks/contentflow-een-lijn.md` §3.1). Voorheen gebeurde er na deze
    // klik tot tien dagen voor de eerste datum niets, en daarna werd er
    // geschreven zonder één vraag. Nu staan binnen een paar minuten alle vragen
    // van deze maand klaar. Het schrijven zelf wacht op de antwoorden.
    //
    // Mislukt dit, dan blijft de maand wel vrijgegeven: de cron pakt de
    // voorbereiding morgenochtend op, en het scherm zegt eerlijk dat die nog loopt.
    let voorbereid = 0;
    let zonderOnderwerp = 0;
    try {
      const uitslag = await bereidMaandVoor(admin, monthId);
      voorbereid = uitslag.voorbereid;
      zonderOnderwerp = uitslag.zonderCluster;
    } catch (err) {
      console.error(`Voorbereiding van maand ${monthId} mislukte, de ochtendronde pakt hem op:`, err);
    }
    return NextResponse.json({ ok: true, voorbereid, zonderOnderwerp });
  }

  if (body.actie === "afwijzen") {
    const { error } = await admin
      .from("plan_months")
      .update({ status: "afgewezen" })
      .eq("id", monthId);
    if (error) {
      return NextResponse.json({ error: "Afwijzen is niet gelukt." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.actie === "alles_geplaatst") {
    // ── K5: eerlijk zijn over gedeeltelijk succes ──────────────────────────
    //
    // Welke pagina's mee mogen en waarom een pagina afvalt, staat puur en
    // getest in `lib/plan-bulk.ts`. Deze route voert alleen uit en vertaalt de
    // uitkomst naar één melding.
    const { data: paginaRijen } = await admin
      .from("planned_pages")
      .select("id, title, status, url_path, is_buffer")
      .eq("plan_month_id", monthId)
      .eq("profile_id", id)
      .order("sort_order");

    const selectie = kiesVoorBulk((paginaRijen ?? []) as BulkKandidaat[]);

    const gelukt: string[] = [];
    const mislukt = selectie.overslaan.map((o) => ({
      title: o.title,
      reden: OVERSLAAN_TEKST[o.reden],
    }));

    // Eén voor één, want `markPosted` legt per pagina een eigen adres en een
    // eigen tijdstip vast. Een `update ... in (...)` zou ze allemaal hetzelfde
    // adres geven, en dat is precies de meting die nergens over gaat.
    for (const p of selectie.mee) {
      const uitkomst = await markPosted(admin, p.id, { url: p.url, userId: user.id });
      if (uitkomst.ok) gelukt.push(p.title);
      else mislukt.push({ title: p.title, reden: uitkomst.reden });
    }

    return NextResponse.json({
      ok: true,
      melding: bulkMelding({ gelukt, mislukt, alGeplaatst: selectie.alGeplaatst }),
    });
  }

  return NextResponse.json({ error: "Onbekende handeling." }, { status: 400 });
}
