"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNotice, networkProblem } from "@/components/error-notice";
import type { FaqEditItem } from "@/components/faq-editor";
import type { UserFacingError } from "@/lib/errors";
import { extractHeadings, renderMarkdown } from "@/lib/markdown";
import { markeerZinnen, zinInBron } from "@/lib/tekst-markering";
import { ContentCanvas, NieuweVersieBalk } from "./content-canvas";
import { ContentTopbar, Menu, StatusChip, type PaginaStand } from "./content-topbar";
import { ContextRail } from "./context-rail";
import { QualityFindings } from "./quality-findings";
import type { Bevindingengroepen } from "@/lib/pipeline/quality-groups";
import { HerschrijfProvider, type Herschrijfopdracht } from "./herschrijf-context";
import type { ContentStatusResponse } from "@/app/api/analyses/[id]/content/[pieceId]/status/route";

/**
 * Het WERKBLAD: de enige eigenaar van de stand op de contentpagina
 * (`docs/tasks/herontwerp-contentpagina.md` §3).
 *
 * ── WAAROM ÉÉN EIGENAAR ─────────────────────────────────────────────────────
 *
 * De drie zones hebben dezelfde feiten nodig. De balk bovenin moet weten of er
 * iets onopgeslagen is, de rail moet weten welke koppen er op dit moment in de
 * tekst staan (niet in de opgeslagen tekst), en het canvas moet weten of ORBIT
 * ENGINE ondertussen zelf een nieuwe versie schrijft. Drie zones met elk hun
 * eigen kopie van die stand is drie keer bijna hetzelfde, en dat loopt uit
 * elkaar.
 *
 * De server-componenten eromheen (het vrijgavepaneel, "waarom deze pagina", de
 * versiegeschiedenis) komen als `ReactNode` binnen en blijven dus gewoon op de
 * server gerenderd. Dit bestand is een wikkel om stand, geen wikkel om data.
 *
 * ── DE DRIE STANDEN VAN EEN VERSIEBOTSING (§5.2) ────────────────────────────
 *
 * `ContentEditor` vulde zijn velden één keer bij het monteren en vergeleek
 * daarna met de verse serverwaarde. Zolang de editor na elk opslaan dichtklapte
 * viel dat niet op. Bij een canvas dat altijd openstaat wel, en op een
 * vervelende manier: haalt een verversing nieuwe tekst binnen, dan zegt het
 * scherm "je hebt wijzigingen" over tekst die niemand getypt heeft.
 *
 *   serverversie veranderd?  eigen werk open?  wat er gebeurt
 *   nee                      maakt niet uit    niets
 *   ja                       nee               het canvas neemt de tekst over
 *   ja                       ja                een keuze, want werk weggooien
 *                                              is aan de gebruiker
 *
 * Die derde regel is precies de situatie die de herschrijfroute zelf aanmaakt.
 */
export function ContentWerkblad({
  analysisId,
  pieceId,
  terug,
  initieel,
  previewUrl,
  isCurrent,
  publishedAt,
  liveSinds,
  poortOpen,
  groepen,
  pogingen,
  klantzin,
  score,
  kwaliteitBadge,
  onderbouwingBadge,
  versieBadge,
  verschilHref,
  menu,
  publiceren,
  onderbouwing,
  waarom,
  versies,
  intern,
  inhoud,
  herschrijfvak,
  kop,
  leesTitel,
}: {
  /**
   * De kop van het paginascherm met de kaart "Aan zet" (23 september 2026).
   * Staat hij er, dan krimpt de oude paginabalk tot het menu: de stand en de
   * hoofdknop staan dan al in de kop.
   */
  kop?: React.ReactNode;
  /** De naam van de pagina in de leesweergave (`paginaNaam()`). */
  leesTitel?: string;
  analysisId: string;
  pieceId: string;
  terug: { href: string; label: string };
  initieel: {
    title: string;
    bodyMarkdown: string;
    metaTitle: string;
    metaDescription: string;
    faq: FaqEditItem[];
    updatedAt: string;
  };
  previewUrl: { url: string; isReal: boolean };
  isCurrent: boolean;
  publishedAt: string | null;
  liveSinds: string | null;
  /** Mag er een nieuwe versie geschreven worden? Zie `lib/content-final-gate.ts`. */
  poortOpen: boolean;
  groepen: Bevindingengroepen;
  pogingen: string;
  klantzin: string;
  score: number | null;
  kwaliteitBadge?: string;
  onderbouwingBadge?: string;
  versieBadge?: string;
  /** Naar de vergelijking met de nieuwere versie, als die er is. */
  verschilHref: string | null;
  menu: React.ReactNode;
  publiceren: React.ReactNode;
  onderbouwing: React.ReactNode;
  waarom: React.ReactNode;
  versies: React.ReactNode;
  intern: React.ReactNode;
  inhoud: React.ReactNode;
  /**
   * Het herschrijfvak, als kant-en-klaar element.
   *
   * ⚠️ Bewust een `ReactNode` en geen functie die er een maakt. `page.tsx` is
   * een servercomponent en dit een clientcomponent; over die grens gaat alleen
   * wat te serialiseren is, en een functie is dat niet. Wat het vak nodig heeft
   * om te weten (de opdracht uit de rail, en of er al een ronde loopt) komt
   * daarom via `HerschrijfProvider` hieronder, aan de clientkant. Zie
   * `herschrijf-context.tsx` voor de fout die dit repareert.
   */
  herschrijfvak: React.ReactNode;
}) {
  const router = useRouter();

  const [titel, setTitel] = useState(initieel.title);
  const [tekst, setTekst] = useState(initieel.bodyMarkdown);
  const [metaTitle, setMetaTitle] = useState(initieel.metaTitle);
  const [metaDescription, setMetaDescription] = useState(initieel.metaDescription);
  const [faq, setFaq] = useState<FaqEditItem[]>(initieel.faq);
  const [updatedAt, setUpdatedAt] = useState(initieel.updatedAt);

  const [opslaan, setOpslaan] = useState<"rust" | "bezig" | "bewaard">("rust");
  const [probleem, setProbleem] = useState<UserFacingError | null>(null);
  const [drempelGezien, setDrempelGezien] = useState(false);
  const [schrijft, setSchrijft] = useState(false);
  const [botsing, setBotsing] = useState(false);
  const [opdracht, setOpdracht] = useState<Herschrijfopdracht | null>(null);
  const [weergave, setWeergave] = useState<"schrijven" | "opgemaakt">("opgemaakt");
  // Een selectie die gezet moet worden zodra het tekstvak er staat. Het vak
  // bestaat alleen in de bewerkstand, dus een klik vanuit de leesstand moet
  // eerst omschakelen en pas daarna selecteren.
  const teSelecteren = useRef<{ begin: number; eind: number } | null>(null);

  const tekstRef = useRef<HTMLTextAreaElement | null>(null);
  const opslaanRef = useRef<HTMLDivElement | null>(null);

  // De stand waarmee vergeleken wordt. Dit is NIET de serverprop maar de laatst
  // geaccepteerde stand: neemt iemand een nieuwe versie over, dan is dát de
  // nieuwe nullijn, en niet de tekst waarmee de pagina ooit geladen werd.
  const [basis, setBasis] = useState(initieel);

  const eigenWerk =
    titel !== basis.title ||
    tekst !== basis.bodyMarkdown ||
    metaTitle !== basis.metaTitle ||
    metaDescription !== basis.metaDescription ||
    JSON.stringify(faq) !== JSON.stringify(basis.faq);

  // ── De serverstand veranderde ─────────────────────────────────────────────
  useEffect(() => {
    if (initieel.updatedAt === basis.updatedAt) return;

    if (!eigenWerk) {
      // Niets van jezelf open: gewoon overnemen, zonder iets te vragen.
      setBasis(initieel);
      setTitel(initieel.title);
      setTekst(initieel.bodyMarkdown);
      setMetaTitle(initieel.metaTitle);
      setMetaDescription(initieel.metaDescription);
      setFaq(initieel.faq);
      setUpdatedAt(initieel.updatedAt);
      return;
    }
    // Wel eigen werk: de gebruiker kiest. Nooit stil overschrijven.
    setBotsing(true);
  }, [initieel, basis.updatedAt, eigenWerk]);

  // ── Loopt er een herschrijving? (§5.4) ────────────────────────────────────
  //
  // Elke 15 seconden, en alleen zolang het tabblad zichtbaar is: dit scherm
  // blijft vaak minutenlang openstaan, en een poll die op een verborgen tabblad
  // doorloopt kost de server werk waar niemand naar kijkt.
  useEffect(() => {
    let gestopt = false;

    async function kijk() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/analyses/${analysisId}/content/${pieceId}/status`);
        if (!res.ok || gestopt) return;
        const stand = (await res.json()) as ContentStatusResponse;
        if (gestopt) return;

        setSchrijft(stand.schrijft);

        // De server heeft nieuwere tekst dan de stand waarop dit scherm rust.
        // `router.refresh()` haalt hem op; de effect hierboven beslist dan of
        // hij stil overgenomen wordt of dat er een keuze komt.
        if (stand.updatedAt && stand.updatedAt !== updatedAt) router.refresh();
        // De pagina is vervangen door een nieuwere versie.
        if (stand.nieuwereVersie) setBotsing(true);
      } catch {
        // Een mislukte peiling is geen fout om te tonen: het scherm werkt
        // gewoon door, alleen weet het even niet of er werk loopt.
      }
    }

    void kijk();
    const timer = setInterval(() => void kijk(), 15_000);
    document.addEventListener("visibilitychange", kijk);
    return () => {
      gestopt = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", kijk);
    };
  }, [analysisId, pieceId, updatedAt, router]);

  // ── De koppen die NU in de tekst staan (§5.3) ─────────────────────────────
  //
  // Uit de tekst in het canvas en niet uit de opgeslagen tekst: wie een kop
  // hernoemt zonder op te slaan, hoort geen knop te zien die nergens heen gaat.
  // Dezelfde functie die de server gebruikt, dus dezelfde ontdubbeling.
  const koppen = useMemo(() => extractHeadings(tekst).map((h) => h.text), [tekst]);

  const sectieBestaat = useCallback(
    (sectie: string) => koppen.some((k) => k.trim().toLowerCase() === sectie.trim().toLowerCase()),
    [koppen],
  );

  // ── De zinnen van de verbeterpunten, gemarkeerd in de leestekst ───────────
  //
  // Uit de tekst in het canvas, net als de koppen hierboven: wie een zin zelf
  // herschrijft, ziet de markering verdwijnen, en dat is precies het signaal
  // dat hij weg is.
  const blokZinnen = useMemo(() => groepen.blokkades.map((b) => b.issue.evidence ?? ""), [groepen]);
  const markering = useMemo(() => markeerZinnen(renderMarkdown(tekst), blokZinnen), [tekst, blokZinnen]);

  // De selectie zetten zodra het tekstvak in beeld is. Het vak groeit mee en
  // schuift zelf dus niet: de pagina moet naar de plek scrollen, en die wordt
  // geschat uit waar de selectie in de tekst valt. Een schatting, maar een
  // selectie die zichtbaar is en een regel of wat verschuift is beter dan een
  // selectie die onder de vouw staat.
  useEffect(() => {
    const doel = teSelecteren.current;
    const veld = tekstRef.current;
    if (weergave !== "schrijven" || !doel || !veld) return;
    teSelecteren.current = null;
    zetSelectie(veld, doel);
  }, [weergave, tekst]);

  const selecteer = useCallback((bereik: { begin: number; eind: number }) => {
    teSelecteren.current = bereik;
    setWeergave("schrijven");
    // Stond hij al in de bewerkstand, dan verandert `weergave` niet en loopt de
    // effect hierboven niet vanzelf. Een nieuwe `tekst`-waarde komt er ook niet,
    // dus hier direct.
    const veld = tekstRef.current;
    if (veld) {
      teSelecteren.current = null;
      zetSelectie(veld, bereik);
    }
  }, []);

  const gaNaarSectie = useCallback(
    (sectie: string) => {
      // De kopregel terugzoeken in de ruwe markdown. Op de regel zelf en niet
      // op de eerste de beste plek waar die woorden staan: een kop komt vaak
      // ook in een zin voor.
      const regels = tekst.split("\n");
      const doel = sectie.trim().toLowerCase();
      let positie = 0;
      for (const regel of regels) {
        const kop = /^#{1,6}\s+(.*)$/.exec(regel);
        if (kop && kop[1].trim().toLowerCase() === doel) {
          selecteer({ begin: positie, eind: positie + regel.length });
          return;
        }
        positie += regel.length + 1;
      }
    },
    [tekst, selecteer],
  );

  /** Zelf aanpassen: naar de bewerkstand, met de zin geselecteerd. */
  const pasZelfAan = useCallback(
    (zin: string) => {
      const bereik = zinInBron(tekst, zin);
      if (bereik) selecteer(bereik);
      else setWeergave("schrijven");
    },
    [tekst, selecteer],
  );

  /** Naar de gemarkeerde zin in de leestekst, en hem even aanwijzen. */
  const toonInTekst = useCallback((index: number) => {
    setWeergave("opgemaakt");
    requestAnimationFrame(() => {
      const el = document.getElementById(`punt-${index}`);
      if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.classList.add("is-aangewezen");
      setTimeout(() => el.classList.remove("is-aangewezen"), 2000);
    });
  }, []);

  // Het herschrijfvak staat onder de tekst. Zonder deze sprong vult een klik in
  // de rail een vak dat buiten beeld staat, en lijkt de knop niets te doen.
  const laatOplossen = useCallback((opdrachten: string[]) => {
    setOpdracht({ tekst: opdrachten.join("\n"), sleutel: Date.now() });
    requestAnimationFrame(() =>
      document.getElementById("aanpassen")?.scrollIntoView({ block: "start", behavior: "smooth" }),
    );
  }, []);

  async function bewaar() {
    setOpslaan("bezig");
    setProbleem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/content/${pieceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titel,
          body_markdown: tekst,
          meta_title: metaTitle,
          meta_description: metaDescription,
          faq_json: faq,
          updated_at: updatedAt,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        updatedAt?: string;
      } | null;

      if (!res.ok) {
        setOpslaan("rust");
        // De tekst die de route teruggeeft is al specifiek (welke controle
        // faalde, of iemand anders je voor was). Die hoort de kop te zijn die
        // iemand leest, niet iets onder "technische details".
        setProbleem({
          kind: "unknown",
          title:
            res.status === 409
              ? "Iemand anders was je voor"
              : res.status === 422
                ? "Dit kan nog niet opgeslagen worden"
                : "Opslaan is niet gelukt",
          message: json?.error ?? "Probeer het opnieuw.",
          canRetry: res.status !== 409,
          detail: "",
        });
        return;
      }

      const nieuweStand = typeof json?.updatedAt === "string" ? json.updatedAt : updatedAt;
      setUpdatedAt(nieuweStand);
      // Wat er nu staat is de nieuwe nullijn, inclusief het tijdstip: anders
      // zou de effect hierboven de verse serverprop straks als botsing zien.
      setBasis({
        title: titel,
        bodyMarkdown: tekst,
        metaTitle,
        metaDescription,
        faq,
        updatedAt: nieuweStand,
      });
      setOpslaan("bewaard");
      router.refresh();
    } catch (err) {
      setOpslaan("rust");
      setProbleem(networkProblem(err));
    }
  }

  // "Opgeslagen" is een bevestiging en geen toestand: na een paar seconden is
  // het weer gewoon een concept.
  useEffect(() => {
    if (opslaan !== "bewaard") return;
    const timer = setTimeout(() => setOpslaan("rust"), 4000);
    return () => clearTimeout(timer);
  }, [opslaan]);

  const stand: PaginaStand = !isCurrent
    ? "oudere-versie"
    : schrijft
      ? "schrijft"
      : eigenWerk
        ? "niet-opgeslagen"
        : opslaan === "bewaard"
          ? "opgeslagen"
          : publishedAt
            ? "live"
            : "concept";

  return (
    <div className="content-zones flex flex-col gap-5">
      {kop}
      {/* Onder de kop van het paginascherm staat de paginabalk niet meer als
          eigen regel (23 september 2026): daar bleef alleen een losse `⋯`
          over, op een rij van zestig pixels. Het menu staat nu in de werkbalk
          van de tekst. De volledige balk blijft voor een oudere versie, die
          geen kop heeft. */}
      {!kop && (
        <ContentTopbar
          terug={terug}
          titel={titel}
          stand={stand}
          liveSinds={liveSinds}
          onNaarOpslaan={() => opslaanRef.current?.scrollIntoView({ block: "center" })}
          menu={menu}
          publiceren={publiceren}
        />
      )}

      {probleem && <ErrorNotice error={probleem} onRetry={() => void bewaar()} />}

      {botsing && (
        <NieuweVersieBalk
          verschilHref={verschilHref}
          onOvernemen={() => {
            setBotsing(false);
            // Alles verversen en opnieuw vanaf de serverstand beginnen. Het is
            // een bewuste keuze van de gebruiker, dus hier mag het eigen werk
            // wel wijken.
            setBasis(initieel);
            setTitel(initieel.title);
            setTekst(initieel.bodyMarkdown);
            setMetaTitle(initieel.metaTitle);
            setMetaDescription(initieel.metaDescription);
            setFaq(initieel.faq);
            setUpdatedAt(initieel.updatedAt);
            router.refresh();
          }}
          onHouden={() => {
            setBotsing(false);
            // De nullijn meeschuiven zonder de tekst aan te raken: het eigen
            // werk blijft staan, en de volgende opslag botst op het slot van de
            // server in plaats van hier. Dat is de juiste plek: daar ligt de
            // echte waarheid.
            setBasis((b) => ({ ...b, updatedAt: initieel.updatedAt }));
          }}
        />
      )}

      <div className="content-split">
        <div className="content-canvas-kolom flex flex-col gap-6">
          <ContentCanvas
            titel={titel}
            tekst={tekst}
            metaTitle={metaTitle}
            metaDescription={metaDescription}
            faq={faq}
            onTitel={setTitel}
            onTekst={setTekst}
            onMetaTitle={setMetaTitle}
            onMetaDescription={setMetaDescription}
            onFaq={setFaq}
            onEerstePoging={() => setDrempelGezien(true)}
            drempelGezien={drempelGezien}
            previewUrl={previewUrl}
            tekstRef={tekstRef}
            schrijft={schrijft}
            leesTitel={leesTitel}
            weergave={weergave}
            onWeergave={setWeergave}
            leesHtml={markering.html}
            werkbalk={
              <div ref={opslaanRef} className="flex flex-wrap items-center justify-end gap-2">
                {eigenWerk && (
                  <button
                    type="button"
                    onClick={() => {
                      setTitel(basis.title);
                      setTekst(basis.bodyMarkdown);
                      setMetaTitle(basis.metaTitle);
                      setMetaDescription(basis.metaDescription);
                      setFaq(basis.faq);
                    }}
                    className="text-sm text-secondary hover:underline"
                  >
                    Ongedaan maken
                  </button>
                )}
                {(eigenWerk || opslaan === "bezig") && (
                  <button
                    type="button"
                    onClick={() => void bewaar()}
                    disabled={opslaan === "bezig"}
                    className="btn-primary btn-sm"
                  >
                    {opslaan === "bezig" ? "Opslaan…" : "Opslaan"}
                  </button>
                )}
                {kop && (stand === "opgeslagen" || stand === "schrijft") && (
                  <StatusChip stand={stand} liveSinds={liveSinds} onNaarOpslaan={() => undefined} />
                )}
                {kop && <Menu>{menu}</Menu>}
              </div>
            }
          />

          <div id="aanpassen" className="content-canvas-maat flex flex-col gap-3 scroll-mt-24">
            {kop && <h2 className="type-section">Een aanpassing vragen</h2>}
            <HerschrijfProvider value={{ opdracht, bezig: schrijft }}>
              {herschrijfvak}
            </HerschrijfProvider>
          </div>
        </div>

        <ContextRail
          kwaliteit={
            <QualityFindings
              groepen={groepen}
              pogingen={pogingen}
              klantzin={klantzin}
              score={score}
              gevonden={markering.gevonden}
              sectieBestaat={sectieBestaat}
              onGaNaarSectie={gaNaarSectie}
              onToonInTekst={toonInTekst}
              onPasZelfAan={pasZelfAan}
              onLaatOplossen={laatOplossen}
              kanOplossen={poortOpen && !schrijft}
            />
          }
          kwaliteitBadge={kwaliteitBadge}
          onderbouwing={onderbouwing}
          onderbouwingBadge={onderbouwingBadge}
          waarom={waarom}
          versies={versies}
          versieBadge={versieBadge}
          intern={intern}
          inhoud={inhoud}
        />
      </div>
    </div>
  );
}

/** Selecteer een stuk tekst in het meegroeiende tekstvak en scrol ernaartoe. */
function zetSelectie(veld: HTMLTextAreaElement, bereik: { begin: number; eind: number }) {
  veld.focus({ preventScroll: true });
  veld.setSelectionRange(bereik.begin, bereik.eind);
  const deel = veld.value.length > 0 ? bereik.begin / veld.value.length : 0;
  const boven = veld.getBoundingClientRect().top + window.scrollY + deel * veld.scrollHeight;
  window.scrollTo({ top: Math.max(0, boven - window.innerHeight / 3), behavior: "smooth" });
}
