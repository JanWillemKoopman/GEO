import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { InfoHint } from "@/components/info-hint";
import { CollapsibleSection } from "@/components/collapsible-section";
import { ExternalLink } from "@/components/external-link";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { toneSentence } from "@/lib/reputation/tone";
import { spreadSentence } from "@/lib/reputation/score";
import { sourceMixSentence } from "@/lib/reputation/sources";
import { compareRuns, snapshotFromRun } from "@/lib/reputation/compare";
import { StartReputationButton } from "./_components/start-reputation-button";
import { ChangeBlock } from "./_components/change-block";
import { ToneChip, EvidenceChip, RankChip } from "./_components/tone-chip";
import { OfferingRows } from "./_components/offering-rows";
import { RivalTable } from "./_components/rival-table";
import type {
  ReputationAnswer,
  ReputationOfferingScore,
  ReputationRank,
  ReputationRun,
  ReputationSource,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn reputatie" };

/**
 * MIJN REPUTATIE: hoe AI over dit merk praat, per dienst en tegenover de
 * concurrenten (docs/tasks/mijn-reputatie.md).
 *
 * ── DE VIJFDE VRAAG, EN HIJ STAAT OP ZICHZELF ───────────────────────────────
 *
 * De app meet al drie dingen: word je genoemd bij een koopvraag (de meting),
 * weet een assistent wie je bent (de kennistest), en welke sites bepalen je
 * markt (het bronnenlandschap). Alle drie gaan over AANWEZIGHEID. Geen van
 * drieën gaat over TOON.
 *
 * Een merk kan bij elke koopvraag genoemd worden en er tegelijk om bekend staan
 * dat de levering altijd te laat is. Dat zag de app tot nu toe niet, en het is
 * precies wat een ondernemer als eerste wil weten.
 *
 * ── ⚠️ TWEE GETALLEN, NOOIT ÉÉN ─────────────────────────────────────────────
 *
 * De toon staat op dit scherm nooit alleen. Er staat altijd de bewijskracht
 * naast: hoeveel echte bronnen er onder dat oordeel liggen. Een taalmodel is
 * standaard vriendelijk over een bedrijf waar het niets van weet, en zonder die
 * tweede kolom maakt dit scherm van een onzichtbaar bedrijf een gerustgesteld
 * bedrijf. Dat is de gevaarlijkste uitkomst die dit product kan geven, en het is
 * de meest voorkomende uitslag bij een MKB-bedrijf.
 *
 * ── WAT DE KLANT BINNEN TIEN SECONDEN ZIET ──────────────────────────────────
 *
 * Blok 1 en verder niets. De zeven blokken eronder zijn er om na te lezen, en de
 * meeste staan daarom ingeklapt. Acht blokken op één pagina is veel; acht
 * blokken die allemaal tegelijk om aandacht vragen is onleesbaar.
 */
export default async function ReputatiePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();
  const user = await requireUser();

  const supabase = await createClient();
  const merk = profile.brand_name ?? profile.name;

  // ⚠️ Zien mag iedereen die bij het merk mag (RLS, de drie lagen uit
  // `lib/access.ts`); STARTEN alleen de beheerder. Die twee vragen worden hier
  // apart gesteld, want het antwoord verschilt en het scherm verschilt mee.
  const magStarten = await mayTriggerCost(user.id);

  const [{ data: runRows }, { data: offeringRows }] = await Promise.all([
    supabase
      .from("reputation_runs")
      .select("*")
      .eq("profile_id", id)
      .order("started_at", { ascending: false })
      .limit(5),
    supabase
      .from("profile_offerings")
      .select("id, kind")
      .eq("profile_id", id)
      .in("kind", ["dienst", "product", "categorie"]),
  ]);

  const runs = (runRows ?? []) as ReputationRun[];
  const laatste = runs[0] ?? null;
  const meetbareKnopen = (offeringRows ?? []).length;

  // ── Staat 1: kan nog niet ─────────────────────────────────────────────────
  //
  // Dezelfde voorwaarde als `startReputationRun()` hanteert, zodat het scherm en
  // de pijplijn nooit iets anders zeggen. Dit onderdeel meet PER DIENST, dus
  // zonder diensten valt er niets te meten, en dan is een knop die tot een
  // mislukte run leidt erger dan geen knop.
  if (meetbareKnopen === 0 && laatste === null) {
    return (
      <div className="flex flex-col gap-6">
        <Kop id={id} />
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Kan nog niet</span>
          <p className="text-secondary">
            Een reputatieanalyse meet per dienst of product hoe AI over je praat. In het
            merkprofiel van {merk} staan nog geen diensten of producten, dus er valt nog niets te
            meten.
          </p>
          <Link className="btn-outline btn-sm w-fit" href={`/merk/${id}/merkprofiel/bewerken`}>
            Vul het aanbod aan
          </Link>
        </div>
      </div>
    );
  }

  // ── Staat 2 en 3: klaar om te starten ─────────────────────────────────────
  if (laatste === null) {
    return (
      <div className="flex flex-col gap-6">
        <Kop id={id} />
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Nog niet gemeten</span>
          <p className="text-secondary">
            ORBIT ENGINE vraagt ChatGPT hoe er over {merk} gepraat wordt: per dienst, met de
            bronnen erbij, en naast de concurrenten die uit je metingen zijn gekomen. Je krijgt
            een toon, de bewijskracht eronder, en de plaats die AI je geeft als hij moet kiezen.
          </p>
          <p className="text-sm text-muted">
            Ongeveer 50 vragen aan ChatGPT, een halfuur werk, ongeveer 75 cent.
          </p>
        </div>
        <StartReputationButton
          profileId={id}
          mayStart={magStarten}
          deniedMessage={COST_DENIED.reputatie_starten}
          repeat={false}
        />
        <Voorbehoud run={null} />
      </div>
    );
  }

  // ── Staat 4: loopt ────────────────────────────────────────────────────────
  if (laatste.status === "queued" || laatste.status === "running") {
    const admin = createAdminClient();
    const { count: open } = await admin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id)
      .like("type", "reputation%")
      .in("status", ["queued", "running"]);

    return (
      <div className="flex flex-col gap-6">
        <Kop id={id} />
        <div className="card flex flex-col gap-2">
          <span className="mono-label">De analyse loopt</span>
          <p className="text-secondary">
            ORBIT ENGINE heeft {laatste.questions_done} van de {laatste.questions_planned || "?"}{" "}
            vragen gesteld. Er {open === 1 ? "staat nog 1 stap" : `staan nog ${open ?? 0} stappen`}{" "}
            open.
          </p>
          <p className="text-sm text-muted">
            Je hoeft hier niet bij te wachten. Kom over een paar minuten terug, of ververs deze
            pagina.
          </p>
        </div>
        <Voorbehoud run={laatste} />
      </div>
    );
  }

  // ── Staat 7: mislukt ──────────────────────────────────────────────────────
  if (laatste.status === "mislukt") {
    return (
      <div className="flex flex-col gap-6">
        <Kop id={id} />
        <div className="card flex flex-col gap-2">
          <span className="mono-label">De analyse is niet gelukt</span>
          {/* ⚠️ Geen half cijfer. Een cijfer op twee antwoorden is geen cijfer,
              en zo eentje één keer tonen kost het vertrouwen in alle volgende. */}
          {laatste.notes.length > 0 ? (
            laatste.notes.map((n) => (
              <p key={n} className="text-secondary">
                {n}
              </p>
            ))
          ) : (
            <p className="text-secondary">
              Er kwamen te weinig bruikbare antwoorden terug om iets over de reputatie van {merk}{" "}
              te zeggen.
            </p>
          )}
        </div>
        <StartReputationButton
          profileId={id}
          mayStart={magStarten}
          deniedMessage={COST_DENIED.reputatie_starten}
          repeat
        />
        <Voorbehoud run={laatste} />
      </div>
    );
  }

  // ── Staat 5 en 6: klaar, of klaar met een kanttekening ────────────────────
  const [{ data: answerRows }, { data: rankRows }, { data: scoreRows }, { data: sourceRows }] =
    await Promise.all([
      supabase.from("reputation_answers").select("*").eq("run_id", laatste.id),
      supabase.from("reputation_ranks").select("*").eq("run_id", laatste.id),
      supabase.from("reputation_offering_scores").select("*").eq("run_id", laatste.id),
      supabase
        .from("reputation_sources")
        .select("*")
        .eq("run_id", laatste.id)
        .order("citations", { ascending: false }),
    ]);

  const answers = (answerRows ?? []) as ReputationAnswer[];
  const ranks = (rankRows ?? []) as ReputationRank[];
  const scores = (scoreRows ?? []) as ReputationOfferingScore[];
  const sources = (sourceRows ?? []) as ReputationSource[];

  const merkbredeRanks = ranks.filter((r) => r.offering_id === null);

  // ── De vorige meting ──────────────────────────────────────────────────────
  //
  // Alleen een AFGERONDE run telt mee. Een mislukte of halve run naast deze
  // leggen zou een verschil tonen dat over de meting gaat en niet over het merk,
  // en dat is precies de fout waar `compare.ts` tegen ontworpen is.
  const vorige = runs.slice(1).find((r) => r.status === "klaar" && r.id !== laatste.id) ?? null;
  const vergelijking = vorige
    ? compareRuns(snapshotFromRun(laatste), snapshotFromRun(vorige))
    : null;

  // De verdeeldheid komt uit de opgeslagen verdeling, zodat het scherm hem niet
  // opnieuw uitrekent uit de antwoorden. Eén feit, één eigenaar.
  const verdeling = laatste.tone_distribution as
    | { counts: Record<string, number>; spread: number; n: number }
    | null;
  const verdeeldheid = verdeling ? spreadSentence(verdeling) : null;
  const vragen = answers.filter((a) => (a.answer_text ?? "").length > 0).length;

  // Blok 2: zonder opzoeken tegenover met opzoeken. Het VERSCHIL is het inzicht.
  const zonderZoeken = answers.find((a) => a.block === "merk" && !a.web_search) ?? null;
  const metZoeken =
    answers.find((a) => a.block === "merk" && a.web_search && a.grounding !== "geen") ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Kop id={id} />

      {/* ── BLOK 1 · De uitspraak ──────────────────────────────────────────
          Eén zin in gewone taal, dan pas de getallen. Wie dit scherm opent moet
          binnen tien seconden zien hoe hij ervoor staat. */}
      <div className="card flex flex-col gap-3">
        <p className="text-lg">{laatste.summary ?? toneSentence(laatste.tone_index, merk)}</p>

        {/* ── De marktzin, en die staat bovenaan met opzet ──────────────────
            Dit is het commercieel scherpste getal dat dit product heeft: niet
            hoe er over je gepraat wordt, maar of AI je noemt als een koper
            vraagt wie hij moet hebben. Een ondernemer die leest dat hij bij geen
            enkele koopvraag genoemd wordt, heeft binnen één zin begrepen waarom
            dit product bestaat. */}
        {laatste.market_hit_rate !== null && (
          <p className="text-secondary">
            {laatste.market_position === null ? (
              <>
                Vraagt een koper wie hij moet hebben, dan noemt ChatGPT {merk}{" "}
                <strong>bij geen enkele vraag</strong>. Je bent niet zichtbaar op het moment dat
                iemand kiest.
              </>
            ) : (
              <>
                Vraagt een koper wie hij moet hebben, dan noemt ChatGPT {merk} bij{" "}
                <strong>{Math.round(laatste.market_hit_rate * 100)}% van de vragen</strong>,
                gemiddeld op plek {laatste.market_position}
                {laatste.market_of !== null && ` van ${laatste.market_of}`}.
              </>
            )}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <ToneChip index={laatste.tone_index} />
          {/* ⚠️ De marge hoort bij de toon en niet erna: een cijfer zonder marge
              leest als exact, en dit cijfer is dat niet. */}
          {laatste.tone_stderr !== null && laatste.tone_index !== null && (
            <span className="chip chip-neutral">
              marge ±{Math.round(laatste.tone_stderr * 1.96)}
            </span>
          )}
          <EvidenceChip score={laatste.evidence_score} />
          <RankChip
            position={laatste.rank_position}
            of={laatste.rank_of}
            indicative={laatste.rank_indicative}
          />
          {/* ⚠️ Alleen bij herhalingen gevuld, dus vandaag zelden. `null` tonen
              als "100% eenduidig" zou een zekerheid suggereren die alleen
              bestaat omdat er niets vergeleken is. */}
          {laatste.consistency !== null && (
            <span className="chip chip-neutral">eenduidigheid {laatste.consistency}</span>
          )}
          <InfoHint label="Wat betekenen deze getallen?">
            De <strong>toon</strong> zegt hoe er over je gepraat wordt, van heel negatief tot heel
            positief. De <strong>bewijskracht</strong> zegt waar dat op rust: hoeveel
            controleerbare bronnen ChatGPT aanhaalt en hoeveel daarvan niet je eigen site zijn.
            Die twee horen bij elkaar. Een mooie toon met een lage bewijskracht betekent dat
            ChatGPT aardig tegen je doet zonder je te kennen, en dat is iets anders dan een goede
            reputatie. De <strong>plaats</strong> zegt wie ChatGPT kiest als hij jou naast je
            concurrenten legt.
          </InfoHint>
        </div>

        {/* ── De zin die het verschil maakt tussen een cijfer en een bevinding ──
            Tien keer "gemengd" en tien keer "neutraal" leveren allebei een toon
            van nul op, en dat zijn compleet verschillende merken. Het eerste
            heeft lof én kritiek, het tweede heeft geen profiel. Deze zin is wat
            een consultant voorleest. */}
        {verdeeldheid && <p className="text-secondary">{verdeeldheid}</p>}

        <span className="mono-label">
          ChatGPT · {new Date(laatste.started_at).toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          · {vragen} vragen ·{" "}
          {laatste.rivals.length === 0
            ? "geen concurrenten"
            : laatste.rivals.length === 1
              ? "1 concurrent"
              : `${laatste.rivals.length} concurrenten`}
        </span>

        {/* Staat 6: budget op. Wat er wél gemeten is, en wat er is overgeslagen.
            Nooit stil: een cijfer dat doet alsof er niets aan de hand was, is
            erger dan geen cijfer. */}
        {laatste.notes.length > 0 && (
          <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
            <span className="mono-label">Kanttekening bij deze meting</span>
            {laatste.notes.map((n) => (
              <p key={n} className="text-sm text-secondary">
                {n}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* ── BLOK 1b · Vergeleken met de vorige meting ──────────────────────
          Staat direct onder de uitspraak, want wie voor de tweede keer kijkt
          komt hiervoor. Bestaat er nog geen tweede meting, dan staat er niets:
          een leeg blok met "nog geen vergelijking" voegt geen feit toe. */}
      {vergelijking && <ChangeBlock c={vergelijking} merk={merk} />}

      {/* ── BLOK 2 · Zonder opzoeken tegenover met opzoeken ────────────────
          Dezelfde woorden als de kennistest gebruikt, zodat een klant die beide
          ziet niet twee talen hoeft te leren. */}
      <CollapsibleSection title="Wat ChatGPT uit zichzelf weet, en wat hij vindt" defaultOpen={false}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="mono-label">Zonder opzoeken</span>
            <p className="text-sm text-secondary">
              {zonderZoeken?.answer_text ?? "Deze vraag is niet gesteld."}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="mono-label">Met opzoeken</span>
            <p className="text-sm text-secondary">
              {metZoeken?.answer_text ?? "Deze vraag leverde niets op."}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          Het verschil is het inzicht. Weet ChatGPT uit zichzelf niets en met opzoeken alles, dan
          hangt je reputatie volledig af van wat er online over je staat. Weet hij uit zichzelf
          iets verouderds, dan los je dat met nieuwe content niet op.
        </p>
      </CollapsibleSection>

      {/* ── BLOK 3 · Waar AI dit vandaan haalt ─────────────────────────────── */}
      <CollapsibleSection
        title="Waar ChatGPT dit vandaan haalt"
        badge={sources.length === 1 ? "1 bron" : `${sources.length} bronnen`}
        defaultOpen={false}
      >
        {sources.length === 0 ? (
          <p className="text-secondary">
            ChatGPT haalt geen enkele controleerbare bron aan over {merk}. Dat is de zwaarste
            uitkomst die dit blok kan geven: wat AI over je zegt, rust dan nergens op.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <ul className="flex flex-col gap-2">
              {sources.slice(0, 15).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="break-url block font-medium">
                      {b.url ? <ExternalLink href={b.url}>{b.domain}</ExternalLink> : b.domain}
                    </span>
                    <span className="mono-label">
                      {SOORT_LABEL[b.kind] ?? b.kind} ·{" "}
                      {b.citations === 1 ? "1 keer aangehaald" : `${b.citations} keer aangehaald`}
                    </span>
                  </span>
                  {b.rating !== null && (
                    <span className="flex items-center gap-2">
                      <span className="stat-value">
                        {b.rating}
                        {b.rating_count !== null && (
                          <span className="text-muted"> ({b.rating_count})</span>
                        )}
                      </span>
                      {/* ⚠️ Een cijfer uit een AI-antwoord is een gok tot het
                          bewezen is. Bevestigd betekent: onze eigen crawler heeft
                          de pagina opgehaald en er stond een hard cijfer op. */}
                      <span className={`chip ${b.verified ? "chip-success" : "chip-warning"}`}>
                        {b.verified ? "bevestigd" : "onbevestigd"}
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted">
              {sourceMixSentence(sources.map((s) => ({ domain: s.domain, kind: s.kind })))}
            </p>
          </div>
        )}
      </CollapsibleSection>

      {/* ── BLOK 4 · Per product en dienst, de kern ────────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">Per product en dienst</span>
        <p className="text-sm text-muted">
          Het probleem staat bovenaan. Klap een regel open om te zien wat er precies gevraagd is
          en wat ChatGPT letterlijk antwoordde.
        </p>
        <OfferingRows scores={scores} answers={answers} ranks={ranks} />
      </div>

      {/* ── BLOK 5 · Tegenover je concurrenten ─────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">Wie ChatGPT aanraadt in jouw markt</span>
        <p className="text-sm text-muted">
          Hier is niet gevraagd om jou met iemand te vergelijken. Er is gevraagd wat een koper
          vraagt: welke bedrijven raad je aan. Wie ChatGPT dan noemt, is je echte concurrent.
        </p>
        {laatste.market_rivals.length === 0 ? (
          <div className="card flex flex-col gap-1">
            <span className="mono-label">Geen namen</span>
            <p className="text-secondary">
              ChatGPT noemt geen enkel bedrijf als een koper vraagt wie hij moet hebben. Dat
              betekent dat er in jouw markt weinig te verliezen valt op zo&apos;n vraag, maar ook
              weinig te winnen.
            </p>
          </div>
        ) : (
          <div className="card flex flex-col gap-2">
            <span className="mono-label">De bedrijven die ChatGPT zelf noemt</span>
            <ol className="flex flex-col gap-1 text-sm text-secondary">
              {laatste.market_rivals.map((naam, i) => (
                <li key={naam}>
                  {i + 1}. {naam}
                </li>
              ))}
            </ol>
            <p className="text-sm text-muted">
              Op volgorde van hoe vaak ChatGPT ze noemde. Staan hier namen die je niet kent, dan
              zijn dat de partijen waar je klanten wél op stuiten.
            </p>
          </div>
        )}
      </div>

      {/* ── BLOK 5b · De benoemde vergelijking ──────────────────────────────
          Blijft bestaan naast de marktvraag, maar niet meer als hoofdmechanisme.
          Bij een merk waarvan AI de concurrenten kent, levert een gedwongen
          rangschikking scherpere uitspraken op; bij een regionaal bedrijf levert
          hij niets op en neemt de marktvraag het over. */}
      <CollapsibleSection title="Naast je concurrenten gelegd" defaultOpen={false}>
        <RivalTable run={laatste} ranks={merkbredeRanks} brandName={merk} />
      </CollapsibleSection>

      {/* ── BLOK 6 · Sterk en kwetsbaar ────────────────────────────────────── */}
      <CollapsibleSection title="Sterk en kwetsbaar" defaultOpen={false}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="mono-label">Wat AI structureel aan je koppelt</span>
            {laatste.strengths.length === 0 ? (
              <p className="text-sm text-muted">
                Niets dat in meer dan één antwoord terugkwam. Eén keer iets noemen is toeval, geen
                patroon.
              </p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-secondary">
                {laatste.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="mono-label">Welke bezwaren terugkomen</span>
            {laatste.weaknesses.length === 0 ? (
              <p className="text-sm text-muted">
                Geen bezwaar kwam in meer dan één antwoord terug. ORBIT ENGINE heeft er wél
                expliciet naar gevraagd.
              </p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-secondary">
                {laatste.weaknesses.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          Alleen punten die in minstens twee antwoorden voorkomen staan hier. Anders is het
          toeval en geen patroon.
        </p>
      </CollapsibleSection>

      {/* ── BLOK 7 · Wat dit niet is ───────────────────────────────────────
          ⚠️ Dit blok verdwijnt nooit en wordt nooit ingeklapt. */}
      <Voorbehoud run={laatste} vragen={vragen} />

      {/* ── BLOK 8 · De vervolgstap ────────────────────────────────────────
          ⚠️ Er komt GEEN knop die iets belooft wat er niet is. Van reputatie naar
          content is fase 2 en die bestaat nog niet; een knop hier zou zeggen dat
          hij wel bestaat. */}
      <div className="card flex flex-col gap-1">
        <span className="mono-label">En nu</span>
        <p className="text-secondary">
          Dit scherm laat zien hoe je ervoor staat. Wat je eraan doet, bepaal je met je
          consultant.
        </p>
      </div>

      {magStarten && (
        <StartReputationButton
          profileId={id}
          mayStart={magStarten}
          deniedMessage={COST_DENIED.reputatie_starten}
          repeat
        />
      )}
    </div>
  );
}

function Kop({ id }: { id: string }) {
  return (
    <PageHeader
      eyebrow="Analytics"
      title="Mijn reputatie"
      description="Hoe AI over je praat, per dienst, hoe je het doet tegenover je concurrenten, en waar dat beeld vandaan komt."
    />
  );
}

const SOORT_LABEL: Record<string, string> = {
  review: "reviewplatform",
  vakpers: "vakpers",
  eigen: "je eigen site",
  sociaal: "sociale media",
  register: "register",
  overig: "overig",
};

/**
 * Blok 7: wat dit niet is.
 *
 * ⚠️ Altijd zichtbaar, nooit ingeklapt, en ook aanwezig op de schermen waar nog
 * geen uitslag staat. De reden is richtlijn 8 uit `docs/schrijfstijl.md`: bewijs
 * boven belofte. Een meetinstrument dat zijn eigen grenzen benoemt is meer waard
 * dan een meetinstrument met een voorbehoud in de kleine lettertjes, en de klant
 * hoort die grenzen te kennen vóórdat hij het cijfer leest, niet erna.
 */
function Voorbehoud({ run, vragen }: { run: ReputationRun | null; vragen?: number }) {
  return (
    <div className="flex flex-col gap-1 text-sm text-muted">
      <span className="mono-label">Wat dit niet is</span>
      <p>Eén AI-assistent: ChatGPT. Andere assistenten kunnen iets anders zeggen.</p>
      <p>
        Eén moment{run && `, ${new Date(run.started_at).toLocaleDateString("nl-NL")}`}
        {vragen !== undefined && `, op ${vragen} vragen`}. Geen doorlopende meting.
      </p>
      <p>
        Gemeten via de API van ChatGPT. Een antwoord in de app van je klant kan iets afwijken,
        want die kent zijn eigen gespreksgeschiedenis en eigen instellingen.
      </p>
      <p>
        Wat AI over je reviews zegt is gemeten, de reviewteksten zelf niet: die zijn niet op te
        halen zonder koppeling met de platforms.
      </p>
      {/* ⚠️ Het gemeten volgorde-effect, in gewone taal. Een meting die zijn
          eigen betrouwbaarheid kan aantonen is meer waard dan een meting met een
          voorbehoud eronder. */}
      {run?.order_bias !== null && run?.order_bias !== undefined && (
        <p>
          Bij deze meting koos ChatGPT in {Math.round(run.order_bias * 100)}% van de gevallen het
          bedrijf dat als eerste in de vraag stond.{" "}
          {run.order_bias > 0.45
            ? "Dat is meer dan verwacht, dus de plaatsen hierboven zijn een indicatie en geen uitslag."
            : "Dat is ongeveer wat je bij toeval verwacht, dus de volgorde van de vraag heeft de uitslag niet gekleurd."}
        </p>
      )}
    </div>
  );
}
