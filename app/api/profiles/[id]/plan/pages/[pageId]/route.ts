import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { markPosted, removePage, assignToMonth, moveToBacklog, setPageDate } from "@/lib/plans";
import { swapWithNeighbour, type OrderablePage } from "@/lib/plan-order";
import { isStaff } from "@/lib/staff";
import { checkBudgetForProfile } from "@/lib/spend-limit";
import {
  startPaginaSchrijven,
  SCHRIJFPAGINA_KOLOMMEN,
  SCHRIJFBLOKKADE_TEKST,
  type TeSchrijvenPagina,
} from "@/lib/plan-write-start";

/**
 * POST /api/profiles/[id]/plan/pages/[pageId], een handeling op één pagina.
 *
 * Eén route met een `actie` in de body en geen drie routes: de drie handelingen
 * delen dezelfde toegangscontrole en dezelfde foutafhandeling, en die drie keer
 * uitschrijven is drie plekken om uit elkaar te laten lopen.
 *
 * ⚠️ De controle op `profile_id` is geen dubbelop. Zonder die regel kan een
 * gebruiker met toegang tot merk A een pagina van merk B goedkeuren door het id
 * te raden.
 */
export const dynamic = "force-dynamic";

type Actie =
  | "schrijf_nu"
  | "goedkeuren"
  | "afwijzen"
  | "geplaatst"
  | "verplaats"
  | "inplannen"
  | "naar_voorraad"
  | "datum";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const { id, pageId } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  // De pagina moet écht bij dít merk horen.
  const { data: page } = await admin
    .from("planned_pages")
    .select("id, profile_id, status, plan_month_id")
    .eq("id", pageId)
    .eq("profile_id", id)
    .maybeSingle();
  if (!page) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  let body: {
    actie?: string;
    url?: string;
    richting?: string;
    maandId?: string;
    index?: number;
    datum?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const actie = body.actie as Actie | undefined;

  // ── Nu laten schrijven (22 september 2026) ───────────────────────────────
  //
  // ⚠️ ALLEEN DE BEHEERDER, en dat is een strengere regel dan bij het schrijven
  // zelf (`content_schrijven` staat sinds 27 augustus 2026 open voor de klant).
  // Reden: deze knop slaat de twee wachtregels over die de klant juist
  // beschermen, de goedkeuring van de maand en het tiendaagse venster
  // (`lib/plan-write-start.ts`). Zonder die regels kan één klik een pagina laten
  // schrijven voor een maand die de klant nooit heeft vrijgegeven, en dat is
  // precies het scenario waarvoor besluit 18 bestaat.
  //
  // Het dagplafond geldt onverkort, ook voor de beheerder (`lib/spend-limit.ts`).
  if (actie === "schrijf_nu") {
    if (!(await isStaff(user.id))) {
      return NextResponse.json(
        { error: "Alleen een beheerder kan een pagina nu laten schrijven." },
        { status: 403 },
      );
    }

    const budget = await checkBudgetForProfile(id);
    if (!budget.ok) return NextResponse.json({ error: budget.message }, { status: 402 });

    const { data: volledig } = await admin
      .from("planned_pages")
      .select(SCHRIJFPAGINA_KOLOMMEN)
      .eq("id", pageId)
      .eq("profile_id", id)
      .maybeSingle();

    if (!volledig) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

    const uitkomst = await startPaginaSchrijven(
      admin,
      volledig as unknown as TeSchrijvenPagina,
      new Date(),
      { negeerPlanning: true },
    );

    if (uitkomst.uitkomst === "geblokkeerd") {
      // 409 en geen 500: dit is een regel die de beheerder kan begrijpen en
      // meestal zelf kan oplossen, geen storing.
      return NextResponse.json({ error: SCHRIJFBLOKKADE_TEKST[uitkomst.reden] }, { status: 409 });
    }
    if (uitkomst.uitkomst === "mislukt") {
      return NextResponse.json(
        { error: "ORBIT ENGINE kon het schrijven niet starten." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      // Wat er gebeurd is, in gewone taal, want de drie uitkomsten voelen op het
      // scherm hetzelfde maar betekenen iets anders.
      melding:
        uitkomst.uitkomst === "ingepland"
          ? "ORBIT ENGINE begint nu aan deze pagina."
          : uitkomst.uitkomst === "al_bezig"
            ? "Deze pagina stond al in de rij om geschreven te worden."
            : "Er stond al een afgeronde tekst voor deze pagina klaar.",
    });
  }

  // ── Inplannen en terugleggen ─────────────────────────────────────────────
  //
  // ⚠️ Deze twee kosten NIETS en vallen dus bewust buiten `mayTriggerCost`. Een
  // kaart in een maand zetten zet geen schrijfwerk in gang; dat doet pas het
  // vrijgeven van de maand, en dáár staat de rem (besluit 18). Zou het slepen
  // zelf beheerdersrechten vragen, dan kan de klant zijn eigen plan niet
  // samenstellen, en dat is precies waarvoor dit scherm bestaat.
  if (actie === "inplannen") {
    const maandId = String(body.maandId ?? "").trim();
    if (!maandId) {
      return NextResponse.json({ error: "Er is geen maand meegegeven." }, { status: 400 });
    }
    const index =
      typeof body.index === "number" && Number.isFinite(body.index)
        ? Math.max(0, Math.floor(body.index))
        : null;

    const result = await assignToMonth(admin, {
      profileId: id,
      pageId,
      monthId: maandId,
      index,
    });
    if (!result.ok) {
      // 409 en geen 500: dit zijn regels die de gebruiker kan begrijpen en
      // omzeilen (een pagina die al live staat), geen storing.
      return NextResponse.json({ error: result.probleem }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  if (actie === "naar_voorraad") {
    const result = await moveToBacklog(admin, { profileId: id, pageId });
    if (!result.ok) {
      return NextResponse.json({ error: result.probleem }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  // ── De publicatiedatum zelf zetten ───────────────────────────────────────
  //
  // ⚠️ Kost net als inplannen niets: de datum bepaalt wannéér ORBIT ENGINE
  // begint, niet dát hij begint. Dat laatste blijft aan het vrijgeven van de
  // maand hangen (besluit 18), dus dit mag de klant zelf.
  if (actie === "datum") {
    const rauw = body.datum;
    const datum = typeof rauw === "string" && rauw.trim() !== "" ? rauw.trim() : null;
    const result = await setPageDate(admin, { profileId: id, pageId, datum });
    if (!result.ok) {
      return NextResponse.json({ error: result.probleem }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  if (actie === "verplaats") {
    const richting = body.richting === "omhoog" ? "omhoog" : "omlaag";

    // De hele maand, want verwisselen gaat over twee rijen en welke tweede dat
    // is, hangt van de volgorde af.
    const { data: maandPaginas } = await admin
      .from("planned_pages")
      .select("id, sort_order, scheduled_for, is_buffer, status, scheduled_manual")
      .eq("plan_month_id", page.plan_month_id as string)
      .order("sort_order");

    const result = swapWithNeighbour(
      (maandPaginas ?? []) as OrderablePage[],
      pageId,
      richting,
    );
    if (result.problem) {
      return NextResponse.json({ error: result.problem }, { status: 409 });
    }

    // Twee losse updates en geen transactie: gaat de tweede mis, dan staan er
    // twee pagina's op dezelfde plek in de lijst. Vervelend, en zelf te
    // herstellen met nog een klik. Een transactie zou hier een databasefunctie
    // vragen voor iets wat de klant hooguit een verkeerde volgorde kost.
    for (const u of result.updates) {
      const { error } = await admin
        .from("planned_pages")
        .update({ sort_order: u.sort_order, scheduled_for: u.scheduled_for })
        .eq("id", u.id);
      if (error) {
        return NextResponse.json({ error: "Verplaatsen is niet gelukt." }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (actie === "goedkeuren") {
    const { error } = await admin
      .from("planned_pages")
      .update({ status: "goedgekeurd" })
      .eq("id", pageId)
      .eq("status", "ter_goedkeuring");
    if (error) {
      return NextResponse.json({ error: "Goedkeuren is niet gelukt." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (actie === "afwijzen") {
    const result = await removePage(admin, pageId);
    if (!result.ok) {
      return NextResponse.json({ error: "Verwijderen is niet gelukt." }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      // De klant hoort te weten dát er een reserve is ingeschoven, anders lijkt
      // het aantal pagina's van die maand ongewijzigd zonder verklaring.
      bufferUsed: result.bufferUsed,
    });
  }

  if (actie === "geplaatst") {
    const url = String(body.url ?? "").trim();
    if (!url) {
      return NextResponse.json(
        { error: "Vul het pad in waar de pagina live staat." },
        { status: 400 },
      );
    }
    const ok = await markPosted(admin, pageId, { url, userId: user.id });
    if (!ok) {
      return NextResponse.json({ error: "Markeren is niet gelukt." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Onbekende handeling." }, { status: 400 });
}
