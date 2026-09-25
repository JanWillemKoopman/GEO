import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import type { ContentPiece } from "@/lib/types/database";

/**
 * GET /api/analyses/[id]/content/[pieceId]/status
 *
 * ── WAAROM DEZE ROUTE BESTAAT (22 september 2026) ───────────────────────────
 *
 * De contentpagina kende twee routes: beoordelen en publiceren. De derde,
 * "laat ORBIT ENGINE er een nieuwe versie van maken en kom over een paar
 * minuten terug", had geen enkele weergave. Zolang het bewerken achter een knop
 * zat viel dat niet op. Met een canvas dat altijd bewerkbaar is wel, en op de
 * duurste manier die er is: een herschrijving levert een NIEUWE RIJ met een
 * nieuw adres op, dus wie ondertussen in de oude zit te typen, typt in iets wat
 * straks niet meer de pagina is.
 *
 * Deze route beantwoordt daarom drie vragen die het scherm zelf niet kan zien:
 * loopt er werk voor deze pagina, is er inmiddels een nieuwere versie, en is de
 * tekst op de server veranderd sinds het canvas hem laadde.
 *
 * ── WAAROM DE SERVICE-ROLE SLEUTEL ──────────────────────────────────────────
 *
 * `jobs` staat op deny-all in RLS: dat is afgeleide data die alleen intern
 * gelezen wordt (conventie 6). Zelfde patroon als
 * `app/api/analyses/[id]/status/route.ts` en de kosten-route: admin-client mét
 * een expliciete eigenaarscontrole, nooit een losse admin-query op een id dat
 * uit de URL komt.
 *
 * ── WAAROM OP TITEL EN NIET OP pieceId ──────────────────────────────────────
 *
 * De schrijftaken dragen geen `pieceId` in hun payload; ze dragen de
 * aanbeveling, en `content_pieces.title` is de dedupe-sleutel van de
 * schrijftaak (`lib/jobs/content-jobs.ts`). Nagemeten op productie
 * (22 september 2026): alle 131 taken van de vier soorten hieronder dragen
 * `payload_json -> recommendation -> title`. `content_brief` staat er bewust
 * niet bij: die draait over een hele batch en zegt niets over déze pagina.
 */
export const dynamic = "force-dynamic";

/**
 * De taken die de tekst van deze pagina kunnen vervangen.
 *
 * `content_recheck` hoort hier NIET bij en dat is opzet: die beoordeelt
 * dezelfde tekst opnieuw en schrijft niets. Wie daarop zou blokkeren, zet het
 * canvas op slot voor werk dat de tekst niet aanraakt.
 */
const SCHRIJFTAKEN = ["content_plan", "content_strategy", "content_draft", "content_edit", "content_revise"] as const;

export interface ContentStatusResponse {
  /** Er loopt of wacht een taak die deze pagina herschrijft. */
  schrijft: boolean;
  /** Wanneer de opgeslagen tekst voor het laatst veranderde, voor het conflictslot. */
  updatedAt: string | null;
  /**
   * De huidige versie van deze pagina, als dat een ándere rij is dan degene die
   * je bekijkt. `null` zolang je naar de nieuwste kijkt.
   */
  nieuwereVersie: { id: string; version: number } | null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { id, pieceId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const { data: pieceRow } = await admin
    .from("content_pieces")
    .select("id, title, version, is_current, updated_at")
    .eq("id", pieceId)
    .eq("analysis_id", id)
    .maybeSingle();
  if (!pieceRow) return NextResponse.json({ error: "Pagina niet gevonden." }, { status: 404 });
  const piece = pieceRow as Pick<
    ContentPiece,
    "id" | "title" | "version" | "is_current" | "updated_at"
  >;

  const [{ data: taken }, { data: nieuwste }] = await Promise.all([
    // ⚠️ De titelvergelijking gebeurt hieronder in code en niet als
    // JSON-padfilter in de query. Dat is met opzet: openstaande taken zijn er
    // per analyse hooguit een handvol, dus de winst van filteren in Postgres is
    // nul, terwijl een verkeerd gespeld JSON-pad in PostgREST stil nul rijen
    // teruggeeft. Stil nul betekent hier "er loopt niets", en dat is precies de
    // verkeerde kant om een fout op te laten vallen.
    admin
      .from("jobs")
      .select("id, payload_json")
      .eq("analysis_id", id)
      .in("type", SCHRIJFTAKEN as unknown as string[])
      .in("status", ["queued", "running"]),
    // Alleen opzoeken als je níet naar de huidige versie kijkt: bij de nieuwste
    // is er per definitie niets nieuwers, en dan is dit een query voor niets.
    piece.is_current
      ? Promise.resolve({ data: null })
      : admin
          .from("content_pieces")
          .select("id, version")
          .eq("analysis_id", id)
          .eq("title", piece.title)
          .eq("is_current", true)
          .maybeSingle(),
  ]);

  const nieuwer = nieuwste as { id: string; version: number } | null;

  const schrijft = (taken ?? []).some((taak) => {
    const payload = (taak as { payload_json?: unknown }).payload_json;
    const titel = (payload as { recommendation?: { title?: unknown } } | null)?.recommendation
      ?.title;
    return typeof titel === "string" && titel === piece.title;
  });

  const antwoord: ContentStatusResponse = {
    schrijft,
    updatedAt: piece.updated_at ?? null,
    // Nooit naar jezelf wijzen: dat zou het scherm laten melden dat er een
    // nieuwe versie is van de versie die je al open hebt.
    nieuwereVersie: nieuwer && nieuwer.id !== pieceId ? nieuwer : null,
  };

  return NextResponse.json(antwoord);
}
