import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { InfoHint } from "@/components/info-hint";
import { CollapsibleSection } from "@/components/collapsible-section";
import { ExternalLink } from "@/components/external-link";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { spreadSentence } from "@/lib/reputation/score";
import { sourceMixSentence } from "@/lib/reputation/sources";
import { compareRuns, snapshotFromRun } from "@/lib/reputation/compare";
import {
  buildOfferingViews,
  groupOfferings,
  evidenceGapSentence,
  evidenceWord,
  countPerProduct,
  marketSplitSentence,
  reputationHeadline,
  reviewRatings,
  type ToneShape,
} from "@/lib/reputation/screen";
import { StartReputationButton } from "./_components/start-reputation-button";
import { ChangeBlock } from "./_components/change-block";
import { ToneMeter } from "./_components/tone-meter";
import { RivalTable } from "./_components/rival-table";
import { ReputationCriteria } from "@/components/reputation-criteria";
import { ReputationToneDistribution } from "@/components/reputation-tone-distribution";
import { ReputationOfferings } from "@/components/reputation-offerings";
import { ReputationEvidence } from "@/components/reputation-evidence";
import type {
  ReputationAnswer,
  ReputationMarketRow,
  ReputationOfferingScore,
  ReputationRank,
  ReputationRun,
  ReputationSource,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn reputatie" };

/**
 * MIJN REPUTATIE: hoe AI over dit merk praat, per product en tegenover de
 * concurrenten.
 *
 * ── DE VIJFDE VRAAG, EN HIJ STAAT OP ZICHZELF ───────────────────────────────
 *
 * De app meet al drie dingen: word je genoemd bij een koopvraag (de meting),
 * weet een assistent wie je bent (de kennistest), en welke sites bepalen je
 * markt (het bronnenlandschap). Alle drie gaan over AANWEZIGHEID. Geen van
 * drieën gaat over TOON.
 *
 * ── ⚠️ TWEE GETALLEN, NOOIT ÉÉN ─────────────────────────────────────────────
 *
 * De toon staat op dit scherm nooit alleen. Er staat altijd bij waar dat oordeel
 * op rust: hoeveel echte bronnen eronder liggen. Een taalmodel is standaard
 * vriendelijk over een bedrijf waar het niets van weet, en zonder die tweede
 * waarde maakt dit scherm van een onzichtbaar bedrijf een gerustgesteld bedrijf.
 * Dat is de gevaarlijkste uitkomst die dit product kan geven, en de meest
 * voorkomende uitslag bij een MKB-bedrijf.
 *
 * ── DE HERBOUW VAN 25 AUGUSTUS 2026, EN WAAROM ──────────────────────────────
 *
 * Het scherm telde acht blokken op hoofdniveau en veertien uitklapkoppen, alle
 * met hetzelfde grijze mono-label en hetzelfde gewicht. Nergens was zichtbaar
 * wat het antwoord was en wat de voetnoot. De drie zwaarste fouten:
 *
 *   1. **Het hoofdgetal sprak zichzelf tegen.** Bovenaan stond de chip "neutraal
 *      0", twee regels lager de zin "bij 22 van de 22 vragen noemt ChatGPT zowel
 *      lof als kritiek". Het etiket `gemengd` scoort altijd 0 en 0 heet
 *      neutraal, dus de zwaarste mededeling van het scherm ontkende de op één na
 *      zwaarste. De kop komt nu uit `reputationHeadline()` en zegt "verdeeld".
 *   2. **Per product stond er twaalf keer hetzelfde.** Zie `offering-list.tsx`.
 *   3. **De beste data werd niet uitgelezen.** `reputation_market` bevat per
 *      product wie ChatGPT aanraadt en op welke plek de klant staat. Dit scherm
 *      raakte die tabel niet aan, terwijl dat het enige cijfer op dit scherm is
 *      waar rechtstreeks geld aan hangt.
 *
 * De volgorde is nu: de uitspraak, per product, wat terugkomt, waar het vandaan
 * komt, en pas dan wat er sinds de vorige meting veranderde. Meta-informatie
 * over onze eigen meting staat nooit meer boven de inhoud.
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
  const magStarten = await mayTriggerCost(user.id, "reputatie_starten");

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
  // de pijplijn nooit iets anders zeggen. Dit onderdeel meet PER PRODUCT, dus
  // zonder aanbod valt er niets te meten, en dan is een knop die tot een
  // mislukte run leidt erger dan geen knop.
  if (meetbareKnopen === 0 && laatste === null) {
    return (
      <div className="flex flex-col gap-8">
        <Kop />
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Kan nog niet</span>
          <p className="text-secondary">
            Een reputatieanalyse meet per product of dienst hoe AI over je praat. In het
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
      <div className="flex flex-col gap-8">
        <Kop />
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Nog niet gemeten</span>
          <p className="text-secondary">
            ORBIT ENGINE vraagt ChatGPT hoe er over {merk} gepraat wordt: per product, met de
            bronnen erbij, en met de vraag die een koper stelt. Je ziet per product of ChatGPT je
            noemt als iemand kiest, wie hij anders noemt, en welke bezwaren hij aan je koppelt.
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
      <div className="flex flex-col gap-8">
        <Kop />
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
      <div className="flex flex-col gap-8">
        <Kop />
        <div className="card card-danger flex flex-col gap-2">
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
  const [
    { data: answerRows },
    { data: rankRows },
    { data: scoreRows },
    { data: sourceRows },
    { data: marketRows },
  ] = await Promise.all([
    supabase.from("reputation_answers").select("*").eq("run_id", laatste.id),
    supabase.from("reputation_ranks").select("*").eq("run_id", laatste.id),
    supabase.from("reputation_offering_scores").select("*").eq("run_id", laatste.id),
    supabase
      .from("reputation_sources")
      .select("*")
      .eq("run_id", laatste.id)
      .order("citations", { ascending: false }),
    // ⚠️ Deze tabel werd door dit scherm nooit uitgelezen, terwijl er per product
    // in staat wie ChatGPT aanraadt en op welke plek de klant staat. Dat is de
    // kern van hoofdstuk 02.
    supabase.from("reputation_market").select("*").eq("run_id", laatste.id),
  ]);

  const answers = (answerRows ?? []) as ReputationAnswer[];
  const ranks = (rankRows ?? []) as ReputationRank[];
  const scores = (scoreRows ?? []) as ReputationOfferingScore[];
  const sources = (sourceRows ?? []) as ReputationSource[];
  const market = (marketRows ?? []) as ReputationMarketRow[];

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
  const verdeling = laatste.tone_distribution as ToneShape | null;
  const verdeeldheid = verdeling ? spreadSentence(verdeling) : null;
  const vragen = answers.filter((a) => (a.answer_text ?? "").length > 0).length;

  const kop = reputationHeadline({
    toneIndex: laatste.tone_index,
    distribution: verdeling,
    brand: merk,
  });

  const views = buildOfferingViews({ scores, answers, market });
  const groepen = groupOfferings(views);
  const cijfers = reviewRatings(sources);
  const bewijsgat = evidenceGapSentence(views);

  // Blok "uit zichzelf": zonder opzoeken tegenover met opzoeken. Het VERSCHIL is
  // het inzicht, en het staat bij de herkomst en niet meer bovenaan.
  const zonderZoeken = answers.find((a) => a.block === "merk" && !a.web_search) ?? null;
  const metZoeken =
    answers.find((a) => a.block === "merk" && a.web_search && a.grounding !== "geen") ?? null;

  return (
    // Het ritme drukt de groepering uit: 32 pixels tussen hoofdstukken, 12
    // erbinnen (`ux-design.md`, de ronde van 25 augustus 2026 op het overzicht).
    <div className="flex flex-col gap-8">
      <Kop
        action={
          magStarten ? (
            /* max-w-sm en geen w-full: de knop zelf is smal, maar de
               bevestigingsuitleg die eronder uitklapt zou zonder grens de halve
               kop breed worden. Met w-full brak hij de kopregel in tweeën. */
            <div className="max-w-sm">
              <StartReputationButton
                profileId={id}
                mayStart={magStarten}
                deniedMessage={COST_DENIED.reputatie_starten}
                repeat
              />
            </div>
          ) : undefined
        }
      />

      {/* ══ 01 · DE UITSPRAAK ═══════════════════════════════════════════════
          Eén schermhoogte, en verder niets. Wie dit scherm opent moet binnen tien
          seconden weten hoe hij ervoor staat. */}
      <SectionErrorBoundary label="De uitspraak">
        <section className="flex flex-col gap-3">
          <div className="card card-rail flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="type-section">{kop.kop}</h2>
              {verdeeldheid && <p className="text-secondary">{verdeeldheid}</p>}
            </div>

            {/* ── R2: de toon als verdeling, het hoofdbeeld ─────────────────
                De toonindex blijft bestaan, alleen niet meer als grootste
                element: 22 van de 22 antwoorden op "gemengd" zet de meter per
                definitie in het midden, terwijl deze balk dat in één oogopslag
                toont. */}
            <ReputationToneDistribution verdeling={verdeling} />
            <details className="type-caption">
              <summary className="cursor-pointer text-muted">De toonindex, voor de vergelijking over de tijd</summary>
              <div className="mt-2">
                <ToneMeter index={laatste.tone_index} stderr={laatste.tone_stderr} woord={kop.woord} />
              </div>
            </details>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="mono-label">
                ChatGPT ·{" "}
                {new Date(laatste.started_at).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                · {vragen} vragen · {views.length}{" "}
                {views.length === 1 ? "product" : "producten"}
              </span>
              <InfoHint label="Hoe lees je dit?">
                De <strong>toon</strong> zegt hoe er over je gepraat wordt, van heel negatief tot
                heel positief. Daarnaast staat altijd waar dat op rust: hoeveel controleerbare
                bronnen ChatGPT aanhaalt en hoeveel daarvan niet je eigen site zijn. Die twee horen
                bij elkaar. Een mooie toon met weinig bronnen betekent dat ChatGPT aardig tegen je
                doet zonder je te kennen, en dat is iets anders dan een goede reputatie.
              </InfoHint>
            </div>

            {/* Staat 6: budget op. Wat er wél gemeten is en wat is overgeslagen.
                ⚠️ Nooit stil, maar ook nooit meer in een omkaderd blok dat met de
                uitslag concurreert: het is een voetnoot bij de meting en geen
                bevinding over het merk. */}
            {laatste.notes.length > 0 && (
              <details className="type-caption">
                <summary className="cursor-pointer text-muted">
                  Let op bij deze meting ({laatste.notes.length})
                </summary>
                <div className="mt-2 flex flex-col gap-1">
                  {laatste.notes.map((n) => (
                    <p key={n} className="text-secondary">
                      {n}
                    </p>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* ── R1: de vier criteria als hoofdbeeld ───────────────────────
              Letterlijk het antwoord op "hoe positioneert AI mij tegenover
              mijn concurrenten"; stond weggeklapt achter "Naast je
              concurrenten gelegd" (nu op niveau 3, iets verderop). */}
          {merkbredeRanks.length > 0 && <ReputationCriteria ranks={merkbredeRanks} />}

          {/* De twee steunfeiten. Niet vijf chips op één rij, maar de twee vragen
              die een ondernemer echt stelt: kiest AI mij, en waar rust dit op? */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="card flex flex-col gap-1">
              <span className="mono-label">Als een koper kiest</span>
              <span className="stat-value text-2xl">
                {groepen.genoemd.length} van de {groepen.genoemd.length + groepen.nietGenoemd.length}
              </span>
              <p className="type-compact text-secondary">
                producten waarbij ChatGPT je noemt als iemand vraagt welk bedrijf hij moet hebben.
                Welke dat zijn, staat hieronder.
              </p>
              {/* ⚠️ HIER STOND "gemiddeld op plek 2,3 van 6", EN DAT KON NIET KLOPPEN
                  MET DE LIJST ERONDER. Dat gemiddelde loopt over alle marktvragen,
                  ook de merkbrede, en die kende zes partijen. De vier producten
                  eronder staan op plek 2 van 3, 2 van 5, 3 van 5 en 2 van 4: nergens
                  een noemer van 6. Twee tellingen van hetzelfde die elkaar
                  tegenspreken gelden als een fout (`ux-design.md`, 25 augustus 2026),
                  en van de twee is de lijst de concrete. Het gemiddelde blijft
                  opgeslagen in `market_position` voor de vergelijking over de tijd. */}
            </div>

            <div className="card flex flex-col gap-2">
              <span className="mono-label">Waar dit beeld op rust</span>
              <span className="stat-value text-2xl">{evidenceWord(laatste.evidence_score)}</span>
              {/* ── R5: de samenstelling, niet alleen het woord ───────────── */}
              <ReputationEvidence sources={sources} />
              <p className="type-compact text-secondary">
                {sourceMixSentence(sources.map((s) => ({ domain: s.domain, kind: s.kind })))}
                {cijfers.length > 0 && (
                  <>
                    {" "}
                    ChatGPT leest onder meer een {nl(cijfers[0].rating as number)} op{" "}
                    {cijfers[0].domain}
                    {cijfers[0].rating_count !== null &&
                      ` over ${cijfers[0].rating_count} beoordelingen`}
                    .
                  </>
                )}
              </p>
            </div>
          </div>
        </section>
      </SectionErrorBoundary>

      {/* ══ 02 · PER PRODUCT EN DIENST (R3, R4) ═════════════════════════════ */}
      <SectionErrorBoundary label="Per product en dienst">
        <section className="flex flex-col gap-3">
          <SectionHeading title="Per product en dienst" />
          <ReputationOfferings views={views} brand={merk} />
        </section>
      </SectionErrorBoundary>

      {/* ══ 03 · WAT ER OVER JE TERUGKOMT ═══════════════════════════════════
          De patronen uit de synthese, met de telling erbij uit hoeveel producten
          ze terugkomen. Een bezwaar dat bij zeven producten opduikt is werk voor
          morgen; een bezwaar bij één product is een incident. */}
      <SectionErrorBoundary label="Wat er over je terugkomt">
        <section className="flex flex-col gap-3">
          <SectionHeading title="Wat er over je terugkomt" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Patroon
              kop="Waar ChatGPT je om prijst"
              punten={countPerProduct(laatste.strengths, views, (v) => v.pros)}
              leeg="Niets dat in meer dan één antwoord terugkwam. Eén keer iets noemen is toeval, geen patroon."
            />
            <Patroon
              kop="Welke bezwaren terugkomen"
              punten={countPerProduct(laatste.weaknesses, views, (v) => v.cons)}
              leeg="Geen bezwaar kwam in meer dan één antwoord terug. ORBIT ENGINE heeft er wél expliciet naar gevraagd."
            />
          </div>
          {bewijsgat && (
            <div className="card flex flex-col gap-1">
              <span className="mono-label">Waar niets over te vinden was</span>
              <p className="text-secondary">{bewijsgat}</p>
            </div>
          )}
        </section>
      </SectionErrorBoundary>

      {/* ══ 04 · WAAR DIT BEELD VANDAAN KOMT ════════════════════════════════ */}
      <SectionErrorBoundary label="Waar dit beeld vandaan komt">
        <section className="flex flex-col gap-3">
          <SectionHeading title="Waar dit beeld vandaan komt" />

          {cijfers.length > 0 && (
            <div className="card flex flex-col gap-2">
              <span className="mono-label">De cijfers die ChatGPT over je leest</span>
              <ul className="flex flex-col gap-2">
                {cijfers.map((c) => (
                  <li key={c.domain} className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="break-url">
                      {c.url ? <ExternalLink href={c.url}>{c.domain}</ExternalLink> : c.domain}
                      {c.rating_count !== null && (
                        <span className="type-caption text-muted">
                          {" "}
                          over {c.rating_count} beoordelingen
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="stat-value">{nl(c.rating as number)}</span>
                      {/* ⚠️ Een cijfer uit een AI-antwoord is een gok tot het
                          bewezen is. Bevestigd betekent: onze eigen crawler heeft
                          de pagina opgehaald en er stond een hard cijfer op. */}
                      <span className={`chip ${c.verified ? "chip-success" : "chip-warning"}`}>
                        {c.verified ? "bevestigd" : "onbevestigd"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="type-caption text-muted">
                Dit is het concreetste bewijs op dit scherm, en het enige dat je zelf kunt laten
                groeien: elke nieuwe review verandert wat AI over je leest.
              </p>
            </div>
          )}

          <CollapsibleSection
            title="Alle bronnen die ChatGPT aanhaalt"
            badge={sources.length === 1 ? "1 bron" : `${sources.length} bronnen`}
            defaultOpen={false}
          >
            {sources.length === 0 ? (
              <p className="text-secondary">
                ChatGPT haalt geen enkele controleerbare bron aan over {merk}. Dat is de zwaarste
                uitkomst die dit blok kan geven: wat AI over je zegt, rust dan nergens op.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sources.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="break-url min-w-0 flex-1">
                      {b.url ? <ExternalLink href={b.url}>{b.domain}</ExternalLink> : b.domain}
                    </span>
                    <span className="mono-label">
                      {SOORT_LABEL[b.kind] ?? b.kind} ·{" "}
                      {b.citations === 1 ? "1 keer aangehaald" : `${b.citations} keer aangehaald`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Wat ChatGPT uit zichzelf weet, en wat hij opzoekt"
            defaultOpen={false}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="mono-label">Zonder opzoeken</span>
                <p className="type-compact text-secondary">
                  {zonderZoeken?.answer_text ?? "Deze vraag is niet gesteld."}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="mono-label">Met opzoeken</span>
                <p className="type-compact text-secondary">
                  {metZoeken?.answer_text ?? "Deze vraag leverde niets op."}
                </p>
              </div>
            </div>
            <p className="type-caption text-muted">
              Het verschil is het inzicht. Weet ChatGPT uit zichzelf niets en met opzoeken alles,
              dan hangt je reputatie volledig af van wat er online over je staat. Weet hij uit
              zichzelf iets verouderds, dan los je dat met nieuwe content niet op.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Naast je concurrenten gelegd" defaultOpen={false}>
            <RivalTable run={laatste} ranks={merkbredeRanks} brandName={merk} />
          </CollapsibleSection>

          {laatste.market_rivals.length > 0 && (
            <p className="type-compact text-muted">
              De bedrijven die ChatGPT het vaakst zelf noemt in jouw markt:{" "}
              {laatste.market_rivals.slice(0, 5).join(", ")}
              {laatste.market_rivals.length > 5 && ` en ${laatste.market_rivals.length - 5} andere`}
              .{" "}
              <Link href={`/merk/${id}/analytics/concurrenten`} className="underline">
                Bekijk je concurrenten
              </Link>
              .
            </p>
          )}
        </section>
      </SectionErrorBoundary>

      {/* ══ 05 · SINDS DE VORIGE METING ═════════════════════════════════════
          ⚠️ Onderaan en niet bovenaan. Dit hoofdstuk gaat over onze meting en
          niet over het merk, en het stond eerder op plek twee: boven alles wat
          een klant komt halen. Bestaat er nog geen tweede meting, dan staat er
          niets. Een leeg blok met "nog geen vergelijking" voegt geen feit toe. */}
      {vergelijking && (
        <SectionErrorBoundary label="Sinds de vorige meting">
          <section className="flex flex-col gap-3">
            <SectionHeading title="Sinds de vorige meting" />
            <ChangeBlock c={vergelijking} merk={merk} />
          </section>
        </SectionErrorBoundary>
      )}

      {/* ⚠️ Dit blok verdwijnt nooit en wordt nooit ingeklapt. */}
      <Voorbehoud run={laatste} vragen={vragen} />
    </div>
  );
}

/**
 * Een getal in het Nederlands: 2.3 wordt 2,3 en 8.2 wordt 8,2.
 *
 * ⚠️ Stond er niet, waardoor de gemiddelde plek als "2.3" op het scherm kwam en
 * een reviewcijfer als "8.2". Dat leest als een versienummer.
 */
function nl(waarde: number): string {
  return waarde.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
}

function Kop({ action }: { action?: React.ReactNode }) {
  return (
    <PageHeader
      eyebrow="Analytics"
      title="Mijn reputatie"
      description="Wat AI over je zegt, per product, en of hij je noemt als een koper vraagt wie hij moet hebben."
      action={action}
    />
  );
}

/** Eén patroon met de telling uit hoeveel producten het terugkomt. */
function Patroon({
  kop,
  punten,
  leeg,
}: {
  kop: string;
  punten: { punt: string; producten: number }[];
  leeg: string;
}) {
  return (
    <div className="card flex flex-col gap-2">
      <span className="mono-label">{kop}</span>
      {punten.length === 0 ? (
        <p className="type-compact text-muted">{leeg}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {punten.map((p) => (
            // ⚠️ Geen `flex-wrap`. Een punt van meer dan een regel duwde de
            // telling naar een eigen regel eronder, en dan leest hij als een
            // nieuw punt in plaats van als het aantal bij het punt erboven.
            <li key={p.punt} className="flex items-baseline justify-between gap-3">
              <span className="type-compact min-w-0 flex-1 text-secondary">{p.punt}</span>
              {/* ⚠️ Alleen bij twee of meer producten. Bij één zegt de telling
                  niets wat de regel zelf niet al zegt, en dan is het een cijfer
                  om het cijfer. */}
              {p.producten > 1 && (
                <span className="type-caption shrink-0 text-muted">bij {p.producten} producten</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
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
 * Wat dit niet is.
 *
 * ⚠️ Altijd zichtbaar, nooit ingeklapt, en ook aanwezig op de schermen waar nog
 * geen uitslag staat. De reden is richtlijn 8 uit `docs/schrijfstijl.md`: bewijs
 * boven belofte. Een meetinstrument dat zijn eigen grenzen benoemt is meer waard
 * dan een meetinstrument met een voorbehoud in de kleine lettertjes.
 *
 * Wat wél veranderd is: het staat als laatste, in één gedempt blok, en niet meer
 * in dezelfde opmaak als de bevindingen erboven.
 */
function Voorbehoud({ run, vragen }: { run: ReputationRun | null; vragen?: number }) {
  return (
    <div className="flex flex-col gap-1 border-t border-[var(--border-subtle)] pt-4 type-caption text-muted">
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
