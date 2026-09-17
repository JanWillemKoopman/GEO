import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { isTelefoon } from "@/lib/apparaat";
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

  // De apparaatdetectie zelf (17 september 2026, stap 5): een servercomponent
  // die `isTelefoon()` aanroept en het resultaat toont, is het enige bewijs
  // dat de header echt van `middleware.ts` bij `next/headers` aankomt en niet
  // alleen bij tsc groen ziet. CLAUDE.md conventie 10: gebouwd is niet
  // geverifieerd. Zonder een gebruiker als deze had de eerste bug hierin pas
  // in stap 6 of 7 opgevallen, wanneer er al schermen op leunen.
  const telefoon = await isTelefoon();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Intern"
        title="Designsysteem"
        description="Elk token, elke klasse en elk component in al zijn staten. Wissel van stand met de knop rechtsboven om beide kanten te controleren."
      />
      <div className="card flex items-center gap-3">
        <span className="chip chip-info">isTelefoon()</span>
        <span className="type-compact-emphasis">{telefoon ? "telefoon" : "computer"}</span>
        <span className="type-caption text-muted">
          Gelezen uit de `x-apparaat`-header die `middleware.ts` op dit verzoek zette. Verander de
          useragent om te zien of dit meebeweegt.
        </span>
      </div>
      <Gallerij />
    </div>
  );
}
