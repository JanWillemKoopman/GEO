import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gesprekBeantwoordt, zelfdeVraag, type GespreksVelden } from "@/lib/vraag-dekking";

type Admin = ReturnType<typeof createAdminClient>;

/** Het voorvoegsel waaraan te zien is dat de app de vraag sloot, niet de klant. */
export const GESPREK_ANTWOORD = "Beantwoord in het gesprek: ";

async function gespreksVelden(admin: Admin, profileId: string): Promise<GespreksVelden | null> {
  const { data } = await admin
    .from("profiles")
    .select("offline_proof, service_regions, growth_regions")
    .eq("id", profileId)
    .maybeSingle();
  return (data as GespreksVelden | null) ?? null;
}

/**
 * Sluit de open merkvragen die het gesprek al beantwoordde (punt 35 van de
 * kwaliteitsdoorlichting).
 *
 * Alleen vragen die niet aan een pagina hangen: een paginavraag hangt aan een
 * bewering van de voorbereiding (`claim_key`), en die telt pas als onderbouwd
 * via een echt antwoord. Die hier stil sluiten zou de keuring van die pagina
 * laten struikelen over een feit dat hij niet ziet.
 *
 * Status `verlopen` en niet `beantwoord`: het feit staat al in het gesprek
 * (`offline_proof`, het werkgebied) en gaat van daaruit naar de schrijver. Als
 * `beantwoord` kwam het een tweede keer op de feitenkaart, en dubbele feiten
 * zijn precies wat de teksten als een formulier liet lezen (punt 48). Het
 * antwoord staat er wel bij, zodat te zien is waarom de vraag dicht ging.
 *
 * Geeft het aantal gesloten vragen terug. Faalt nooit hard: een vraag die open
 * blijft, is het oude gedrag.
 */
export async function sluitVragenUitGesprek(admin: Admin, profileId: string): Promise<number> {
  const velden = await gespreksVelden(admin, profileId);
  if (!velden) return 0;

  const { data: open } = await admin
    .from("fact_requests")
    .select("id, question, content_piece_ids")
    .eq("profile_id", profileId)
    .eq("status", "open");

  let gesloten = 0;
  for (const rij of (open ?? []) as { id: string; question: string; content_piece_ids: string[] | null }[]) {
    if ((rij.content_piece_ids ?? []).length > 0) continue;
    const antwoord = gesprekBeantwoordt(rij.question, velden);
    if (!antwoord) continue;
    const { error } = await admin
      .from("fact_requests")
      .update({ status: "verlopen", answer: `${GESPREK_ANTWOORD}${antwoord}` })
      .eq("id", rij.id)
      .eq("status", "open");
    if (error) {
      console.warn(`Vraag ${rij.id} sluiten na het gesprek mislukt: ${error.message}`);
      continue;
    }
    gesloten++;
  }
  return gesloten;
}

/**
 * Laat alleen de nieuwe vragen door die het gesprek niet al beantwoordt en die
 * niet al (in andere woorden) bij dit merk staan, open of afgehandeld
 * (punt 35 en 36). Een overgeslagen vraag telt ook: de klant zei al dat hij het
 * niet weet, en dezelfde vraag in andere woorden is dan zeuren.
 */
export async function filterNieuweMerkvragen<T extends { question: string }>(
  admin: Admin,
  profileId: string,
  kandidaten: T[],
): Promise<{ door: T[]; weg: { vraag: string; reden: string }[] }> {
  if (kandidaten.length === 0) return { door: [], weg: [] };
  const [velden, { data: bestaand }] = await Promise.all([
    gespreksVelden(admin, profileId),
    admin.from("fact_requests").select("question").eq("profile_id", profileId),
  ]);
  const al = ((bestaand ?? []) as { question: string }[]).map((r) => r.question);

  const door: T[] = [];
  const weg: { vraag: string; reden: string }[] = [];
  for (const k of kandidaten) {
    const uitGesprek = velden ? gesprekBeantwoordt(k.question, velden) : null;
    if (uitGesprek) {
      weg.push({ vraag: k.question, reden: `het gesprek zegt al: ${uitGesprek}` });
      continue;
    }
    const dubbel = [...al, ...door.map((d) => d.question)].find((q) => zelfdeVraag(q, k.question));
    if (dubbel) {
      weg.push({ vraag: k.question, reden: `staat er al als: ${dubbel}` });
      continue;
    }
    door.push(k);
  }
  return { door, weg };
}
