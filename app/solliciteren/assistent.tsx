"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { brievenUit, feitenmateriaalUit, pasDossierIn } from "@/lib/solliciteren/dossier";
import type { Feitcategorie } from "@/lib/solliciteren/feiten";
import {
  MODELLEN,
  REDENEERSTANDEN,
  STANDAARD_MODEL,
  STANDAARD_STAND,
  vindModel,
  type SollicitatieModelId,
} from "@/lib/solliciteren/modellen";
import { EERSTE_VRAAG, MAX_BERICHT_TEKENS } from "@/lib/solliciteren/prompt";
import { meetStem } from "@/lib/solliciteren/stem";
import type { ReasoningEffort } from "@/lib/openai/sampling";
import type {
  SollicitatieBericht,
  SollicitatieChat,
  SollicitatieDocument,
  SollicitatieDocumentSoort,
  SollicitatieFeit,
} from "@/lib/types/database";
import { Bericht } from "./bericht";
import { Dossierpaneel } from "./dossierpaneel";
import { Feitenpaneel } from "./feitenpaneel";
import { Sleutelwoordenpaneel } from "./sleutelwoordenpaneel";
import { Stempaneel } from "./stempaneel";
import { Vacaturepaneel } from "./vacaturepaneel";

/**
 * Het werkblad: links jouw dossier, rechts deze vacature en het gesprek.
 *
 * ── DE SNELSTE WEG NAAR EEN BRIEF ──────────────────────────────────────────
 *
 * Er hoeft geen gesprek te bestaan om te beginnen. Plak je de vacature en druk
 * je op de knop, dan maakt deze component het gesprek aan, koppelt de vacature
 * en stuurt de eerste vraag, in die volgorde. Dat scheelt twee handelingen bij
 * elke sollicitatie, en dat is precies waar dit scherm voor is.
 *
 * ── HOE HET ANTWOORD BINNENKOMT ────────────────────────────────────────────
 *
 * De route stuurt per regel één JSON-object terug (zie
 * `app/api/solliciteren/chats/[id]/berichten/route.ts`). Deze component leest ze
 * op volgorde binnen en laat de tekst meegroeien. Een brief van 400 woorden
 * duurt tientallen seconden, en zonder dit zou het scherm al die tijd stilstaan.
 *
 * ── WAT ER GEBEURT ALS HET MISGAAT ─────────────────────────────────────────
 *
 * Een afgebroken antwoord blijft staan met de tekst die er wél was: de aanroep
 * is toch al betaald, en een halve brief is meer waard dan een foutmelding.
 * Kwam er niets binnen, dan staat de reden op het scherm en blijft de vraag in
 * het invoerveld staan, zodat je hem niet opnieuw hoeft te typen.
 */
export function Assistent({
  chat,
  berichten: beginberichten,
  documenten: begindocumenten,
  feiten: beginfeiten,
}: {
  chat: SollicitatieChat | null;
  berichten: SollicitatieBericht[];
  documenten: SollicitatieDocument[];
  feiten: SollicitatieFeit[];
}) {
  const router = useRouter();

  const [chatId, setChatId] = useState<string | null>(chat?.id ?? null);
  const [documenten, setDocumenten] = useState<SollicitatieDocument[]>(begindocumenten);
  const [dossierBezig, setDossierBezig] = useState(false);
  const [feiten, setFeiten] = useState<SollicitatieFeit[]>(beginfeiten);
  const [uitlezen, setUitlezen] = useState(false);
  const [laatsteRonde, setLaatsteRonde] = useState<{
    aangeleverd: number;
    aangenomen: number;
    behouden: number;
  } | null>(null);

  const [vacature, setVacature] = useState(chat?.vacature_tekst ?? "");
  const [gekoppeld, setGekoppeld] = useState({
    vacature: chat?.vacature_tekst ?? "",
    op: chat?.context_bijgewerkt_op ?? null,
  });
  const [koppelen, setKoppelen] = useState(false);

  const [model, setModel] = useState<SollicitatieModelId>(STANDAARD_MODEL);
  const [stand, setStand] = useState<ReasoningEffort>(STANDAARD_STAND);

  const [berichten, setBerichten] = useState<SollicitatieBericht[]>(beginberichten);
  const [invoer, setInvoer] = useState("");
  const [lopend, setLopend] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const onderkant = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    onderkant.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [berichten.length, lopend]);

  const stukken = useMemo(
    () => documenten.map((d) => ({ id: d.id, soort: d.soort, titel: d.titel, inhoud: d.inhoud })),
    [documenten],
  );
  // Dezelfde meting die de server doet vlak vóór de aanroep, zodat het scherm
  // toont wat de assistent werkelijk te horen krijgt (lib/solliciteren/stem.ts).
  const stem = useMemo(() => meetStem(brievenUit(stukken)), [stukken]);
  const omvang = useMemo(() => pasDossierIn(stukken).omvang, [stukken]);
  const feitenmateriaal = useMemo(() => feitenmateriaalUit(stukken), [stukken]);
  // Alles wat als bron telt, als één tekst: het dossier plus de vacature. Daarin
  // zoekt `zoekOnvindbaar()` de getallen en namen uit een geschreven brief op.
  // De vacature hoort erbij, want de bedrijfsnaam en de functietitel komen
  // daarvandaan en zijn dus geen verzinsel.
  const bronnen = useMemo(
    () => [...stukken.map((s) => s.inhoud), vacature].join("\n\n"),
    [stukken, vacature],
  );

  const vacatureGewijzigd = vacature !== gekoppeld.vacature;
  const heeftVacature = Boolean(gekoppeld.vacature.trim()) || Boolean(vacature.trim());

  /**
   * Geeft het id van het huidige gesprek, en maakt er een aan als er nog geen
   * is. Zo hoeft niemand eerst op "Nieuw gesprek" te drukken voordat hij een
   * vacature kan plakken.
   */
  async function zorgVoorGesprek(): Promise<string | null> {
    if (chatId) return chatId;
    const res = await fetch("/api/solliciteren/chats", { method: "POST" });
    const data = (await res.json()) as { chat?: SollicitatieChat; error?: string };
    if (!res.ok || !data.chat) {
      setFout(data.error ?? "Het gesprek aanmaken is niet gelukt.");
      return null;
    }
    setChatId(data.chat.id);
    return data.chat.id;
  }

  async function koppelVacature(): Promise<string | null> {
    setKoppelen(true);
    setFout(null);
    try {
      const id = await zorgVoorGesprek();
      if (!id) return null;

      const res = await fetch(`/api/solliciteren/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacature }),
      });
      const data = (await res.json()) as { chat?: SollicitatieChat; error?: string };
      if (!res.ok || !data.chat) {
        setFout(data.error ?? "Het koppelen is niet gelukt.");
        return null;
      }
      setGekoppeld({ vacature: data.chat.vacature_tekst, op: data.chat.context_bijgewerkt_op });
      return id;
    } catch {
      setFout("De verbinding viel weg. Probeer het opnieuw.");
      return null;
    } finally {
      setKoppelen(false);
    }
  }

  async function bewaarStuk(stuk: {
    id: string | null;
    soort: SollicitatieDocumentSoort;
    titel: string;
    inhoud: string;
  }): Promise<boolean> {
    setDossierBezig(true);
    setFout(null);
    try {
      const res = await fetch(
        stuk.id ? `/api/solliciteren/documenten/${stuk.id}` : "/api/solliciteren/documenten",
        {
          method: stuk.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ soort: stuk.soort, titel: stuk.titel, inhoud: stuk.inhoud }),
        },
      );
      const data = (await res.json()) as { document?: SollicitatieDocument; error?: string };
      if (!res.ok || !data.document) {
        setFout(data.error ?? "Het opslaan is niet gelukt.");
        return false;
      }
      const bewaard = data.document;
      setDocumenten((eerder) =>
        stuk.id ? eerder.map((d) => (d.id === bewaard.id ? bewaard : d)) : [...eerder, bewaard],
      );
      router.refresh();
      return true;
    } catch {
      setFout("De verbinding viel weg. Probeer het opnieuw.");
      return false;
    } finally {
      setDossierBezig(false);
    }
  }

  async function verwijderStuk(id: string) {
    setDossierBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/solliciteren/documenten/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setFout(data.error ?? "Het verwijderen is niet gelukt.");
        return;
      }
      setDocumenten((eerder) => eerder.filter((d) => d.id !== id));
      router.refresh();
    } catch {
      setFout("De verbinding viel weg. Probeer het opnieuw.");
    } finally {
      setDossierBezig(false);
    }
  }

  async function leesDossierUit() {
    setUitlezen(true);
    setFout(null);
    try {
      const res = await fetch("/api/solliciteren/feiten/uitlezen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      const data = (await res.json()) as {
        feiten?: SollicitatieFeit[];
        aangeleverd?: number;
        aangenomen?: number;
        behouden?: number;
        error?: string;
      };
      if (!res.ok || !data.feiten) {
        setFout(data.error ?? "Het uitlezen is niet gelukt.");
        return;
      }
      setFeiten(data.feiten);
      setLaatsteRonde({
        aangeleverd: data.aangeleverd ?? 0,
        aangenomen: data.aangenomen ?? 0,
        behouden: data.behouden ?? 0,
      });
      router.refresh();
    } catch {
      setFout("De verbinding viel weg tijdens het uitlezen.");
    } finally {
      setUitlezen(false);
    }
  }

  async function voegFeitToe(feit: {
    categorie: Feitcategorie;
    tekst: string;
    periode: string;
  }): Promise<boolean> {
    setDossierBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/solliciteren/feiten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feit),
      });
      const data = (await res.json()) as { feit?: SollicitatieFeit; error?: string };
      if (!res.ok || !data.feit) {
        setFout(data.error ?? "Het opslaan is niet gelukt.");
        return false;
      }
      const nieuw = data.feit;
      setFeiten((eerder) => [...eerder, nieuw].sort((a, b) => a.nummer - b.nummer));
      router.refresh();
      return true;
    } catch {
      setFout("De verbinding viel weg. Probeer het opnieuw.");
      return false;
    } finally {
      setDossierBezig(false);
    }
  }

  async function wijzigFeit(
    id: string,
    feit: { tekst: string; periode: string },
  ): Promise<boolean> {
    setDossierBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/solliciteren/feiten/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feit),
      });
      const data = (await res.json()) as { feit?: SollicitatieFeit; error?: string };
      if (!res.ok || !data.feit) {
        setFout(data.error ?? "Het opslaan is niet gelukt.");
        return false;
      }
      const bewaard = data.feit;
      setFeiten((eerder) => eerder.map((f) => (f.id === bewaard.id ? bewaard : f)));
      router.refresh();
      return true;
    } catch {
      setFout("De verbinding viel weg. Probeer het opnieuw.");
      return false;
    } finally {
      setDossierBezig(false);
    }
  }

  async function verwijderFeit(id: string) {
    setDossierBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/solliciteren/feiten/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setFout(data.error ?? "Het verwijderen is niet gelukt.");
        return;
      }
      setFeiten((eerder) => eerder.filter((f) => f.id !== id));
      router.refresh();
    } catch {
      setFout("De verbinding viel weg. Probeer het opnieuw.");
    } finally {
      setDossierBezig(false);
    }
  }

  async function stuur(vraag: string) {
    const schoon = vraag.trim();
    if (!schoon || bezig) return;

    setBezig(true);
    setFout(null);

    // Eerst zorgen dat er een gesprek is en dat de vacature erin staat. Anders
    // zou de eerste brief geschreven worden zonder de tekst die je net plakte.
    const id = vacatureGewijzigd ? await koppelVacature() : await zorgVoorGesprek();
    if (!id) {
      setBezig(false);
      return;
    }

    setLopend("");

    // De eigen vraag staat meteen op het scherm, met een tijdelijk id. De echte
    // rij komt bij het verversen mee; tot die tijd is dit wat je typte.
    const tijdelijk: SollicitatieBericht = {
      id: `nieuw-${Date.now()}`,
      chat_id: id,
      rol: "gebruiker",
      inhoud: schoon,
      model: null,
      reasoning_effort: null,
      temperatuur: null,
      input_tokens: null,
      output_tokens: null,
      cost_usd: null,
      raw_json: null,
      fout: null,
      created_at: new Date().toISOString(),
    };
    setBerichten((eerder) => [...eerder, tijdelijk]);

    try {
      const res = await fetch(`/api/solliciteren/chats/${id}/berichten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vraag: schoon, model, stand }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setFout(data.error ?? "Het versturen is niet gelukt.");
        setBerichten((eerder) => eerder.filter((b) => b.id !== tijdelijk.id));
        setInvoer(schoon);
        return;
      }

      setInvoer("");
      const lezer = res.body.getReader();
      const decoder = new TextDecoder();
      let rest = "";
      let tekst = "";

      for (;;) {
        const { done, value } = await lezer.read();
        if (done) break;
        rest += decoder.decode(value, { stream: true });

        // Het laatste stuk kan een halve regel zijn; dat blijft staan tot de
        // rest binnen is. Zonder dit breekt een JSON-object middenin een woord.
        const regels = rest.split("\n");
        rest = regels.pop() ?? "";

        for (const regel of regels) {
          if (!regel.trim()) continue;
          let gebeurtenis: {
            t?: string;
            tekst?: string;
            bericht?: SollicitatieBericht;
            melding?: string;
          };
          try {
            gebeurtenis = JSON.parse(regel);
          } catch {
            continue;
          }

          if (gebeurtenis.t === "stukje" && typeof gebeurtenis.tekst === "string") {
            tekst += gebeurtenis.tekst;
            setLopend(tekst);
          } else if (gebeurtenis.t === "klaar" && gebeurtenis.bericht) {
            setBerichten((eerder) => [...eerder, gebeurtenis.bericht as SollicitatieBericht]);
            setLopend(null);
          } else if (gebeurtenis.t === "fout") {
            setFout(gebeurtenis.melding ?? "Het antwoord is niet gelukt.");
            setLopend(null);
          }
        }
      }
    } catch {
      setFout("De verbinding viel weg terwijl het antwoord binnenkwam.");
    } finally {
      setLopend(null);
      setBezig(false);
      // Pas nu naar het gesprek navigeren, niet tijdens het streamen: een
      // verversing halverwege zou deze component opnieuw opbouwen en de tekst
      // die binnenkomt kwijtraken.
      if (!chat || chat.id !== id) router.replace(`/solliciteren?gesprek=${id}`);
      router.refresh();
    }
  }

  const gekozenModel = vindModel(model);

  return (
    <div className="sol-werkblad">
      <div className="sol-kolom">
        <Dossierpaneel
          documenten={documenten}
          bezig={dossierBezig || bezig}
          onOpslaan={bewaarStuk}
          onVerwijderen={verwijderStuk}
        />
        <Feitenpaneel
          feiten={feiten}
          bezig={dossierBezig || bezig}
          uitlezen={uitlezen}
          laatsteRonde={laatsteRonde}
          onUitlezen={() => void leesDossierUit()}
          onToevoegen={voegFeitToe}
          onWijzigen={wijzigFeit}
          onVerwijderen={verwijderFeit}
        />
        <Stempaneel documenten={documenten} />
      </div>

      <div className="sol-kolom">
        <Vacaturepaneel
          vacature={vacature}
          gewijzigd={vacatureGewijzigd}
          gekoppeldOp={gekoppeld.op}
          bezig={koppelen}
          onWijzig={setVacature}
          onKoppel={() => void koppelVacature()}
        />

        <Sleutelwoordenpaneel cv={feitenmateriaal} vacature={vacature} />

        <section className="sol-kaart sol-paneel">
          <h2 className="sol-kaart__titel">Model en redeneerstand</h2>
          <div className="sol-keuzes">
            <div className="sol-veld">
              <label className="sol-veld__label" htmlFor="sol-model">
                Model
              </label>
              <select
                id="sol-model"
                className="sol-invoer"
                value={model}
                onChange={(e) => setModel(e.target.value as SollicitatieModelId)}
              >
                {MODELLEN.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.naam}
                  </option>
                ))}
              </select>
              <p className="sol-veld__uitleg">{gekozenModel.waarvoor}</p>
            </div>

            <div className="sol-veld">
              <label className="sol-veld__label" htmlFor="sol-stand">
                Redeneerstand
              </label>
              <select
                id="sol-stand"
                className="sol-invoer"
                value={stand}
                onChange={(e) => setStand(e.target.value as ReasoningEffort)}
              >
                {REDENEERSTANDEN.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.naam}
                  </option>
                ))}
              </select>
              <p className="sol-veld__uitleg">
                {REDENEERSTANDEN.find((s) => s.id === stand)?.wanneer}
              </p>
            </div>
          </div>
          <p className="sol-veld__teller">
            Je hele dossier gaat elk bericht mee, {omvang.stukken}{" "}
            {omvang.stukken === 1 ? "stuk" : "stukken"} en ongeveer{" "}
            {omvang.tokens.toLocaleString("nl-NL")} tokens.
            {omvang.afgevallen.length > 0
              ? ` Te groot geworden, deze gaan niet mee: ${omvang.afgevallen.join(", ")}.`
              : ""}
          </p>
        </section>

        <section className="sol-kaart sol-gesprek">
          <h2 className="sol-kaart__titel">Gesprek</h2>

          {berichten.length === 0 && !lopend ? (
            <div className="sol-leeg">
              <p className="sol-kaart__tekst">
                {heeftVacature
                  ? "De vacature staat klaar. Eén knop, en de assistent ontleedt hem, legt hem naast je dossier en schrijft een eerste brief."
                  : "Plak hiernaast de vacature. Je dossier staat er al, dus meer is er niet nodig."}
              </p>
              <button
                type="button"
                className="sol-knop"
                onClick={() => void stuur(EERSTE_VRAAG)}
                disabled={bezig || !heeftVacature}
              >
                Ontleed de vacature en schrijf een eerste brief
              </button>
              {documenten.length === 0 ? (
                <p className="sol-veld__teller">
                  Je dossier is nog leeg. Het werkt ook zonder, maar dan heeft de assistent niets
                  over jou om mee te schrijven.
                </p>
              ) : feiten.length === 0 ? (
                <p className="sol-veld__teller">
                  Je feitenkaart is nog leeg. Lees eerst je dossier uit, dan staat elke zin in de
                  brief straks op een feit dat je kunt aanwijzen.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* `aria-live`: zonder dit merkt een schermlezer niet dat er een
              antwoord binnenkomt, want er wordt niets aangeklikt en de focus
              verspringt niet. `polite` en niet `assertive`: het antwoord mag
              wachten tot de gebruiker is uitgesproken. */}
          <div className="sol-berichten" aria-live="polite" aria-busy={bezig}>
            {berichten.map((bericht) => (
              <Bericht
                key={bericht.id}
                rol={bericht.rol}
                inhoud={bericht.inhoud}
                model={bericht.model}
                stand={bericht.reasoning_effort}
                kosten={bericht.cost_usd}
                fout={bericht.fout}
                stem={stem}
                bronnen={bronnen}
              />
            ))}

            {lopend !== null ? (
              <Bericht
                rol="assistent"
                inhoud={lopend || "Aan het nadenken"}
                model={model}
                stand={stand}
                kosten={null}
                fout={null}
                stem={stem}
                bronnen={bronnen}
                bezig
              />
            ) : null}

            <div ref={onderkant} />
          </div>

          {fout ? <p className="sol-fout">{fout}</p> : null}

          <form
            className="sol-opsteller"
            onSubmit={(e) => {
              e.preventDefault();
              void stuur(invoer);
            }}
          >
            <label className="sol-veld__label" htmlFor="sol-invoer">
              Jouw aanwijzing
            </label>
            <textarea
              id="sol-invoer"
              className="sol-invoer sol-invoer--tekstvak"
              rows={3}
              value={invoer}
              maxLength={MAX_BERICHT_TEKENS}
              onChange={(e) => setInvoer(e.target.value)}
              onKeyDown={(e) => {
                // Enter verstuurt, shift+enter maakt een nieuwe regel. Zo werkt
                // elk chatvenster, en een brief herschrijven gaat in korte zinnen.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void stuur(invoer);
                }
              }}
              placeholder="Bijvoorbeeld: maak de toon wat enthousiaster, of kort de alinea over mijn studie in"
              disabled={bezig}
            />
            <div className="sol-opsteller__voet">
              <button type="submit" className="sol-knop" disabled={bezig || !invoer.trim()}>
                {bezig ? "Aan het schrijven" : "Versturen"}
              </button>
              <span className="sol-veld__teller">
                Enter verstuurt, shift en enter maken een nieuwe regel.
              </span>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
