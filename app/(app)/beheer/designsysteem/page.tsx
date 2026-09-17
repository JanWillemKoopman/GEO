import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { PageHeader } from "@/components/page-header";
import { Gallerij } from "./gallerij";

export const metadata: Metadata = { title: "Designsysteem" };

/**
 * De etalage van het design system: elk token, elke klasse en elk component in
 * al zijn staten, op één scherm.
 *
 * ── WAAROM DIT SCHERM BESTAAT ───────────────────────────────────────────────
 *
 * `CLAUDE.md` conventie 10: gebouwd is niet geverifieerd. Voor rekenkunde is
 * dat een test in `scripts/test-unit.ts`, maar voor vormgeving bestaat die test
 * niet: of een knop er goed uitziet is niet af te leiden uit een groene build.
 * Tot dit scherm er was, was de enige manier om de vormgeving te controleren
 * het doorklikken van vijftig echte schermen, en dan mis je per definitie elke
 * staat die er op dat moment toevallig niet is (uitgeschakeld, bezig, leeg,
 * fout).
 *
 * Hier staat alles naast elkaar. Wissel van stand met de knop in de bovenbalk
 * en je ziet in één blik of beide standen kloppen.
 *
 * ── HET IS BEWUST GEEN DOCUMENTATIE ─────────────────────────────────────────
 *
 * `docs/designsystem.md` beschrijft de regels en `redesign2026.md` de
 * herkomst. Dit scherm beschrijft niets, het TOONT. Eén feit heeft één
 * eigenaar: staat een waarde hier in een bijschrift, dan is dat om te kunnen
 * nakijken wat je ziet, niet om het ergens anders te vervangen.
 *
 * ⚠️ Alleen voor de eigen organisatie, en bij een gewone gebruiker een 404 en
 * geen 403. Een 403 bevestigt dat het scherm bestaat. Zelfde patroon als
 * `/beheer`.
 */
export default async function DesignsysteemPage() {
  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Intern"
        title="Designsysteem"
        description="Elk token, elke klasse en elk component in al zijn staten. Wissel van stand met de knop rechtsboven om beide kanten te controleren."
      />
      <Gallerij />
    </div>
  );
}
