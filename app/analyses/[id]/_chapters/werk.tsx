import { createClient } from "@/lib/supabase/server";
import { WorkList } from "@/components/work-list";
import { loadWork } from "@/lib/work";
import type { Analysis } from "@/lib/types/database";

/**
 * Hoofdstuk 03 — "Wat je nu moet doen".
 *
 * Eén lijst voor al het werk van deze analyse: technische blokkades, pagina's
 * die klaarliggen, punten buiten je eigen site, feitenvragen. Die stonden
 * eerder op vier plekken, waarvan er twee niet eens in deze analyse zaten maar
 * op het merkscherm.
 *
 * Gegroepeerd op STAAT en niet op soort — zie `lib/work.ts` voor waarom.
 */
export async function WerkChapter({ analysis }: { analysis: Analysis }) {
  const supabase = await createClient();
  const work = await loadWork(supabase, analysis);

  return <WorkList items={work} />;
}
