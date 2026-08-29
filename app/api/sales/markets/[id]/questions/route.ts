import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSales } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PATCH /api/sales/markets/[id]/questions, één vraag in of uit de meting zetten.
 *
 * Het handwerk van poort 2 (plan §8.1), en de tegenhanger van de bedrijvenlijst
 * bij poort 1: de admin leest de vragen en haalt eruit wat deze markt niet meet.
 *
 * ⚠️ **`isSales` en niet `isSalesAdmin`**, om dezelfde reden als bij de
 * bedrijven: een vraag weghalen kost niets en zet niets in gang, het maakt de
 * lijst beter. Het GOEDKEUREN van de meting blijft bij de admin, want dat is het
 * besluit dat geld uitgeeft.
 *
 * ⚠️ **Weghalen is uitzetten en niet verwijderen.** Wie bij de volgende ronde
 * wil weten waarom een intentie dunner gemeten is dan de rest, moet kunnen zien
 * welke vragen eruit gehaald zijn. Een verwijderde rij zegt niets, een rij op
 * `active = false` zegt precies wat er gebeurd is.
 */
interface Body {
  questionId?: string;
  active?: boolean;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }
  if (!(await isSales(user.id))) {
    return new NextResponse(null, { status: 404 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (typeof body.questionId !== "string" || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const admin = createAdminClient();

  // De vraag moet bij een ronde van DEZE markt horen, en die ronde mag nog niet
  // gemeten hebben. Een vraag uitzetten terwijl de meting loopt, verandert de
  // noemer van een score die al half gerekend is.
  const { data: vraag } = await admin
    .from("sales_questions")
    .select("id, run_id, sales_runs(market_id, status)")
    .eq("id", body.questionId)
    .maybeSingle();

  type Rij = { id: string; run_id: string; sales_runs: { market_id: string; status: string } | null };
  const rij = vraag as unknown as Rij | null;

  if (!rij?.sales_runs || rij.sales_runs.market_id !== id) {
    return NextResponse.json({ error: "Deze vraag hoort niet bij deze markt." }, { status: 404 });
  }
  if (rij.sales_runs.status !== "vragen_klaar") {
    return NextResponse.json(
      {
        error:
          "Deze meting is al goedgekeurd. Een vraag weghalen zou de noemer veranderen van cijfers " +
          "die al gerekend zijn.",
      },
      { status: 409 },
    );
  }

  const { error } = await admin
    .from("sales_questions")
    .update({ active: body.active })
    .eq("id", body.questionId);

  if (error) {
    console.error(`Vraag ${body.questionId} bijwerken mislukt:`, error.message);
    return NextResponse.json({ error: "Het opslaan is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
