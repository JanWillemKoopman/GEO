"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNotice, networkProblem, problemFromResponse } from "@/components/error-notice";
import type { FaqEditItem } from "@/components/faq-editor";
import type { UserFacingError } from "@/lib/errors";
import { extractHeadings, renderMarkdown } from "@/lib/markdown";
import { markeerZinnen, zinInBron } from "@/lib/tekst-markering";
import { ContentCanvas, NieuweVersieBalk } from "./content-canvas";
import { ContentTopbar, Menu, StatusChip, type PaginaStand } from "./content-topbar";
import { ContextRail } from "./context-rail";
import { QualityFindings, useLaatStaan } from "./quality-findings";
import type { Bevindingengroepen, GegroepeerdeBevinding } from "@/lib/pipeline/quality-groups";
import { HerschrijfProvider, type Herschrijfopdracht } from "./herschrijf-context";
import { Puntvenster } from "./puntvenster";
import { PUNTEN_OPLOSSEN } from "@/components/pagina/punten-knop";
import { isAccepteerbaar } from "@/lib/geaccepteerde-zinnen";
import {
  lijstVoorOrbit,
  opdrachtVan,
  puntSleutel,
  rondeVolgorde,
  schrijfopdracht,
  telKeuzes,
  vervangBereik,
  volgendOpen,
  type Keuze,
  type Keuzes,
} from "@/lib/puntenronde";
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
  bewustLatenStaan,
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
  /** Zinnen zonder bron die de klant bewust laat staan (migratie 0110). */
  bewustLatenStaan: string[];
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

  // ── De punten één voor één (`lib/puntenronde.ts`, `puntvenster.tsx`) ──────
  //
  // De keuzes leven alleen in dit scherm: wie de pagina ververst voordat hij
  // iets verstuurt of opslaat, begint opnieuw. Dat is bewust. Een keuze die
  // nergens toe geleid heeft, hoort niet als half werk in de database te staan,
  // en wat er wél toe leidt (een zin laten staan, opslaan, een nieuwe versie)
  // gaat direct naar de server.
  const [keuzes, setKeuzes] = useState<Keuzes>({});
  const [venster, setVenster] = useState<{ sleutel: string } | "slot" | null>(null);
  const [rondeBezig, setRondeBezig] = useState(false);
  const [rondeFout, setRondeFout] = useState<string | null>(null);
  const [rondeProbleem, setRondeProbleem] = useState<UserFacingError | null>(null);
  const laatStaan = useLaatStaan(analysisId, pieceId);

  const volgorde = useMemo(() => rondeVolgorde(groepen.blokkades), [groepen]);
  const telling = useMemo(() => telKeuzes(volgorde, keuzes), [volgorde, keuzes]);
  const lijst = useMemo(
    () =>
      volgorde
        .filter((item) => keuzes[puntSleutel(item)]?.soort === "orbit")
        .map((item) => ({ sleutel: puntSleutel(item), tekst: opdrachtVan(item) })),
    [volgorde, keuzes],
  );
  const orbitMag: { mag: true } | { mag: false; reden: string } =
    poortOpen && !schrijft
      ? { mag: true }
      : {
          mag: false,
          reden: schrijft
            ? "ORBIT ENGINE schrijft al aan deze pagina. Wacht tot die versie klaar is."
            : "Dit kan pas als je openstaande vragen beantwoord zijn. Je vindt ze onder Openstaande vragen.",
        };

  const sluitVenster = useCallback(() => setVenster(null), []);

  const openPunt = useCallback((item: GegroepeerdeBevinding) => {
    setRondeFout(null);
    setRondeProbleem(null);
    setVenster({ sleutel: puntSleutel(item) });
  }, []);

  const startRonde = useCallback(() => {
    setRondeFout(null);
    setRondeProbleem(null);
    const eerste = volgendOpen(volgorde, keuzes, null);
    setVenster(eerste ? { sleutel: eerste } : volgorde.length > 0 ? "slot" : null);
  }, [volgorde, keuzes]);

  // De knop in de kaart "Aan zet" staat in een servercomponent en kan dit
  // scherm niet rechtstreeks aanroepen; hij stuurt een gebeurtenis.
  useEffect(() => {
    window.addEventListener(PUNTEN_OPLOSSEN, startRonde);
    return () => window.removeEventListener(PUNTEN_OPLOSSEN, startRonde);
  }, [startRonde]);

  const huidigeSleutel = venster && venster !== "slot" ? venster.sleutel : null;
  const huidigItem = huidigeSleutel ? volgorde.find((i) => puntSleutel(i) === huidigeSleutel) ?? null : null;

  // Het punt in beeld verdween (bijvoorbeeld na "Klopt, laat staan" en de
  // verversing daarna): door naar het volgende.
  useEffect(() => {
    if (huidigeSleutel && !huidigItem) {
      const volgende = volgendOpen(volgorde, keuzes, null);
      setVenster(volgende ? { sleutel: volgende } : volgorde.length > 0 ? "slot" : null);
    }
  }, [huidigeSleutel, huidigItem, volgorde, keuzes]);

  /** Leg de keuze voor dit punt vast en ga naar het volgende punt zonder keuze. */
  function legVast(sleutel: string, keuze: Keuze) {
    const nieuw = { ...keuzes, [sleutel]: keuze };
    setKeuzes(nieuw);
    const volgende = volgendOpen(volgorde, nieuw, sleutel);
    setVenster(volgende ? { sleutel: volgende } : "slot");
  }

  function blad(stap: 1 | -1) {
    if (venster === "slot") {
      // Terug vanaf het slot: naar het eerste punt zonder keuze, anders het laatste.
      const open = volgendOpen(volgorde, keuzes, null);
      const doel = open ?? (volgorde.length > 0 ? puntSleutel(volgorde[volgorde.length - 1]) : null);
      if (doel) setVenster({ sleutel: doel });
      return;
    }
    const i = volgorde.findIndex((it) => puntSleutel(it) === huidigeSleutel);
    const j = i + stap;
    if (j >= volgorde.length) setVenster("slot");
    else if (j >= 0) setVenster({ sleutel: puntSleutel(volgorde[j]) });
  }

  async function kies(soort: "orbit" | "staan" | "overslaan") {
    if (!huidigItem || !huidigeSleutel) return;
    setRondeFout(null);
    if (soort === "staan") {
      // Direct naar de server, net als de knop in de rail altijd deed: de zin
      // laten staan is een besluit, geen voorlopige keuze.
      // Mislukt het, dan staat de melding van `useLaatStaan` in het venster.
      if (!(await laatStaan.doe([huidigItem.issue.evidence ?? ""], false))) return;
    }
    legVast(huidigeSleutel, { soort });
  }

  function zelfInTekst(nieuw: string) {
    if (!huidigItem || !huidigeSleutel) return;
    const bereik = zinInBron(tekst, huidigItem.issue.evidence ?? "");
    if (!bereik) return;
    setTekst(vervangBereik(tekst, bereik, nieuw));
    legVast(huidigeSleutel, { soort: "zelf" });
  }

  function zelfInBewerken() {
    if (!huidigItem || !huidigeSleutel) return;
    setKeuzes((k) => ({ ...k, [huidigeSleutel]: { soort: "zelf" } }));
    setVenster(null);
    pasZelfAan(huidigItem.issue.evidence ?? "");
  }

  /** Alles zonder keuze op de lijst, en meteen naar het slot. */
  function allesNaarOrbit() {
    const nieuw: Partial<Record<string, Keuze>> = { ...keuzes };
    for (const item of volgorde) nieuw[puntSleutel(item)] ??= { soort: "orbit" };
    setKeuzes(nieuw);
    setRondeFout(null);
    setRondeProbleem(null);
    setVenster("slot");
  }

  /** De lijst is verstuurd: van de lijst af, en het scherm weet dat er geschreven wordt. */
  const naVersturen = useCallback(() => {
    setKeuzes((k) => Object.fromEntries(Object.entries(k).filter(([, v]) => v?.soort !== "orbit")));
    setSchrijft(true);
  }, []);

  async function verstuur(extra: string) {
    const opdracht = schrijfopdracht(lijstVoorOrbit(volgorde, keuzes), extra);
    if (!opdracht) return;
    setRondeBezig(true);
    setRondeFout(null);
    setRondeProbleem(null);
    try {
      // Eigen aanpassingen eerst vastleggen: de nieuwe versie bouwt voort op
      // de tekst die op de server staat, en anders gaat dat werk verloren.
      if (eigenWerk && !(await bewaar())) {
        setRondeFout("Je aanpassingen konden niet worden opgeslagen. Er is nog niets naar ORBIT ENGINE gegaan.");
        return;
      }
      const res = await fetch(`/api/analyses/${analysisId}/content/${pieceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: opdracht }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRondeProbleem(problemFromResponse(json));
        return;
      }
      naVersturen();
      setVenster(null);
      router.refresh();
    } catch (err) {
      setRondeProbleem(networkProblem(err));
    } finally {
      setRondeBezig(false);
    }
  }

  async function opslaanUitVenster() {
    setRondeBezig(true);
    setRondeFout(null);
    const ok = await bewaar();
    setRondeBezig(false);
    if (ok) setVenster(null);
    else setRondeFout("Opslaan is niet gelukt. De melding staat boven de tekst.");
  }

  /** Slaat de tekst op. `true` als dat lukte. */
  async function bewaar(): Promise<boolean> {
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
        return false;
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
      return true;
    } catch (err) {
      setOpslaan("rust");
      setProbleem(networkProblem(err));
      return false;
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
        <div
          className="content-canvas-kolom flex flex-col gap-6"
          // Een klik op een oranje zin in de leestekst opent zijn punt. De
          // markeringen staan in HTML uit `markeerZinnen()`, dus één luisteraar
          // hier in plaats van een knop per zin.
          onClick={(e) => {
            const mark = (e.target as HTMLElement).closest<HTMLElement>("mark.tekst-punt");
            const index = mark ? Number(mark.id.replace("punt-", "")) : NaN;
            const item = Number.isInteger(index) ? groepen.blokkades[index] : undefined;
            if (item) openPunt(item);
          }}
        >
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

          {!venster && lijst.length > 0 && !schrijft && (
            // Zolang er iets op de lijst staat, blijft dat in beeld: anders
            // vergeet je dat er nog een knop te drukken valt.
            <div className="lijstbalk card flex flex-wrap items-center justify-between gap-3" role="status">
              <span className="text-sm">
                <span className="font-medium">
                  {lijst.length === 1 ? "1 punt" : `${lijst.length} punten`} op je lijst voor ORBIT ENGINE
                </span>
                {telling.open > 0 && (
                  <span className="text-secondary">
                    {" "}
                    · {telling.open === 1 ? "nog 1 punt zonder keuze" : `nog ${telling.open} punten zonder keuze`}
                  </span>
                )}
              </span>
              <span className="flex flex-wrap items-center gap-3">
                {telling.open > 0 && (
                  <button type="button" onClick={startRonde} className="text-sm text-secondary hover:underline">
                    Verder met de punten
                  </button>
                )}
                <button type="button" onClick={() => setVenster("slot")} className="btn-primary btn-sm">
                  Bekijk en verstuur
                </button>
              </span>
            </div>
          )}

          <div id="aanpassen" className="content-canvas-maat flex flex-col gap-3 scroll-mt-24">
            {kop && (
              <div className="flex flex-col gap-1">
                <h2 className="type-section">Laat ORBIT ENGINE iets aanpassen</h2>
                <p className="text-sm text-secondary">
                  Voor alles wat niet onder Te verbeteren staat: een andere toon, iets korter, een onderwerp dat
                  ontbreekt.
                </p>
              </div>
            )}
            <HerschrijfProvider
              value={{
                opdracht,
                bezig: schrijft,
                lijst,
                onVanLijst: (sleutel) =>
                  setKeuzes((k) => Object.fromEntries(Object.entries(k).filter(([s]) => s !== sleutel))),
                onVerstuurd: naVersturen,
              }}
            >
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
              analysisId={analysisId}
              pieceId={pieceId}
              bewustLatenStaan={bewustLatenStaan}
              score={score}
              gevonden={markering.gevonden}
              sectieBestaat={sectieBestaat}
              onGaNaarSectie={gaNaarSectie}
              onOpenPunt={openPunt}
              onStartRonde={startRonde}
              onAllesNaarOrbit={allesNaarOrbit}
              keuzes={keuzes}
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

      {venster && (
        <Puntvenster
          stap={
            huidigItem && huidigeSleutel
              ? {
                  item: huidigItem,
                  sleutel: huidigeSleutel,
                  positie: volgorde.indexOf(huidigItem) + 1,
                  keuze: keuzes[huidigeSleutel],
                  zinInTekst: zinUitBron(tekst, huidigItem),
                  gemarkeerd: markering.gevonden[groepen.blokkades.indexOf(huidigItem)] === true,
                  accepteerbaar: isAccepteerbaar(huidigItem.issue),
                }
              : null
          }
          totaal={volgorde.length}
          voortgang={volgorde.map((item) => ({
            soort: keuzes[puntSleutel(item)]?.soort ?? null,
            huidig: puntSleutel(item) === huidigeSleutel,
          }))}
          telling={telling}
          orbit={orbitMag}
          eigenWerk={eigenWerk}
          bezig={rondeBezig || laatStaan.bezig}
          fout={rondeFout ?? laatStaan.fout}
          probleem={rondeProbleem}
          onKies={(soort) => void kies(soort)}
          onZelfInTekst={zelfInTekst}
          onZelfInBewerken={zelfInBewerken}
          onVorige={() => blad(-1)}
          onVolgende={() => blad(1)}
          onNaarEinde={() => setVenster("slot")}
          onToonInTekst={() => {
            const index = huidigItem ? groepen.blokkades.indexOf(huidigItem) : -1;
            setVenster(null);
            if (index >= 0) toonInTekst(index);
          }}
          onVerstuur={(extra) => void verstuur(extra)}
          onOpslaan={() => void opslaanUitVenster()}
          onSluit={sluitVenster}
        />
      )}
    </div>
  );
}

/** De zin van een punt zoals hij letterlijk in de brontekst staat, of `null`. */
function zinUitBron(tekst: string, item: GegroepeerdeBevinding): string | null {
  const bereik = zinInBron(tekst, item.issue.evidence ?? "");
  return bereik ? tekst.slice(bereik.begin, bereik.eind) : null;
}

/** Selecteer een stuk tekst in het meegroeiende tekstvak en scrol ernaartoe. */
function zetSelectie(veld: HTMLTextAreaElement, bereik: { begin: number; eind: number }) {
  veld.focus({ preventScroll: true });
  veld.setSelectionRange(bereik.begin, bereik.eind);
  const deel = veld.value.length > 0 ? bereik.begin / veld.value.length : 0;
  const boven = veld.getBoundingClientRect().top + window.scrollY + deel * veld.scrollHeight;
  window.scrollTo({ top: Math.max(0, boven - window.innerHeight / 3), behavior: "smooth" });
}
