import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { loadLabPaginas, loadBenchmarkSets } from "@/lib/quality-lab";
import { vergelijkMetMens, ijkingStand } from "@/lib/quality-benchmark";
import { formatDateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Kwaliteitslab" };

/**
 * HET KWALITEITSLAB
 * (docs/tasks/contentkwaliteit-framework.md §6, punt 25 van de opdracht)
 *
 * ── WAAROM DIT SCHERM BESTAAT ───────────────────────────────────────────────
 *
 * Voor de meting bestaat een evaluatieset (`npm run eval:mention`). Voor het
 * schrijven bestond niets, en daardoor is elke wijziging aan de
 * schrijfinstructie een gok met een overtuigend verhaal eromheen (herstelplan
 * T2). Hier staat wat de app van elke pagina vond, wat een mens ervan vond, en
 * waar die twee uit elkaar lopen.
 *
 * ── DE BOVENSTE REGEL IS DE BELANGRIJKSTE ───────────────────────────────────
 *
 * "Ten onrechte goedgekeurd": de app zei klaar, een mens zou hem niet sturen.
 * Dat is de fout die de ondernemer raakt. De andere kant op kost een
 * herstelronde en verder niets.
 *
 * ⚠️ Alleen voor beheerders, en bij een gewone gebruiker een 404 en geen 403.
 * Een 403 bevestigt dat het scherm bestaat.
 */
export default async function KwaliteitslabPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>;
}) {
  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  const gekozenSet = (await searchParams).set?.trim() || null;
  const admin = createAdminClient();
  const [paginas, sets] = await Promise.all([
    loadLabPaginas(admin, { benchmarkSet: gekozenSet }),
    loadBenchmarkSets(admin),
  ]);

  const benchmark = vergelijkMetMens(
    paginas.map((p) => ({
      pieceId: p.pieceId,
      score: p.score,
      verdict: p.verdict,
      wouldSend: p.review?.would_send ?? null,
      copywriterEquivalence: p.review?.copywriter_equivalence ?? null,
      correctionEffort: p.review?.correction_effort ?? null,
    })),
  );
  const beoordeeld = paginas.filter((p) => p.review !== null).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Beheer"
        title="Kwaliteitslab"
        description="Wat ORBIT ENGINE van elke geschreven pagina vond, wat een mens ervan vond, en waar die twee uit elkaar lopen. Dit scherm ziet alleen jij."
      />

      <div className="card flex flex-col gap-3">
        <span className="mono-label">Klopt ons eigen oordeel?</span>
        <p className="text-sm text-secondary">{ijkingStand(beoordeeld)}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span>
            <span className="text-muted">Vergeleken: </span>
            <span className="font-medium">{benchmark.vergelijkbaar}</span>
          </span>
          <span>
            <span className="text-muted">Ten onrechte goedgekeurd: </span>
            <span className="font-medium">{benchmark.tenOnrechteGoedgekeurd}</span>
          </span>
          <span>
            <span className="text-muted">Ten onrechte tegengehouden: </span>
            <span className="font-medium">{benchmark.tenOnrechteTegengehouden}</span>
          </span>
          {benchmark.overeenstemming !== null && (
            <span>
              <span className="text-muted">Overeenstemming: </span>
              <span className="font-medium">{benchmark.overeenstemming}%</span>
            </span>
          )}
          {benchmark.onderscheidendVermogen !== null && (
            <span>
              <span className="text-muted">Onderscheidend vermogen: </span>
              <span className="font-medium">{benchmark.onderscheidendVermogen} punten</span>
            </span>
          )}
        </div>
        {benchmark.onderscheidendVermogen !== null && benchmark.onderscheidendVermogen < 5 && (
          <p className="text-sm text-secondary">
            Het cijfer van de app onderscheidt goede content nauwelijks van slechte. Zolang dat zo is,
            zegt een hoge score weinig, hoe precies hij ook oogt.
          </p>
        )}
      </div>

      {sets.length > 0 && (
        <div className="card flex flex-wrap items-center gap-3">
          <span className="mono-label">Benchmark</span>
          <Link
            href="/beheer/kwaliteit"
            className={gekozenSet === null ? "text-sm font-medium" : "text-sm text-secondary"}
          >
            Alles
          </Link>
          {sets.map((set) => (
            <Link
              key={set.naam}
              href={`/beheer/kwaliteit?set=${encodeURIComponent(set.naam)}`}
              className={gekozenSet === set.naam ? "text-sm font-medium" : "text-sm text-secondary"}
            >
              {set.naam} ({set.paginas})
            </Link>
          ))}
        </div>
      )}

      {paginas.length === 0 ? (
        <EmptyState title="Nog geen beoordeelde pagina's">
          Zodra ORBIT ENGINE een pagina schrijft, komt hij hier te staan met zijn kwaliteitsanalyse.
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-2 pr-4 font-normal">Pagina</th>
                <th className="pb-2 pr-4 font-normal">Type</th>
                <th className="pb-2 pr-4 font-normal">Oordeel</th>
                <th className="pb-2 pr-4 font-normal">Kwaliteit</th>
                <th className="pb-2 pr-4 font-normal">Zekerheid</th>
                <th className="pb-2 pr-4 font-normal">Bron</th>
                <th className="pb-2 pr-4 font-normal">Rondes</th>
                <th className="pb-2 pr-4 font-normal">Mens</th>
                <th className="pb-2 font-normal">Datum</th>
              </tr>
            </thead>
            <tbody>
              {paginas.map((p) => (
                <tr key={p.pieceId} className="border-t border-[var(--border-subtle)]">
                  <td className="py-2 pr-4">
                    <Link href={`/beheer/kwaliteit/${p.pieceId}`} className="font-medium">
                      {p.titel}
                    </Link>
                    <div className="text-xs text-muted">
                      {p.merk}
                      {p.cluster ? ` · ${p.cluster}` : ""}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-secondary">{p.type}</td>
                  <td className="py-2 pr-4 text-secondary">{p.verdict ?? "niet beoordeeld"}</td>
                  <td className="py-2 pr-4 text-secondary">
                    {p.score === null ? "-" : Math.round(p.score)}
                  </td>
                  <td className="py-2 pr-4 text-secondary">
                    {p.confidence === null ? "-" : `${Math.round(p.confidence)}%`}
                  </td>
                  <td className="py-2 pr-4 text-secondary">
                    {p.bronherleidbaarheid === null ? "-" : `${Math.round(p.bronherleidbaarheid)}%`}
                  </td>
                  <td className="py-2 pr-4 text-secondary">{p.rondes}</td>
                  <td className="py-2 pr-4 text-secondary">
                    {p.review === null
                      ? "nog niet"
                      : p.review.would_send === true
                        ? "zou versturen"
                        : p.review.would_send === false
                          ? "niet versturen"
                          : "beoordeeld"}
                  </td>
                  <td className="py-2 text-secondary">{formatDateShort(p.aangemaakt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
