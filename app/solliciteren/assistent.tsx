"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MODELLEN,
  REDENEERSTANDEN,
  STANDAARD_MODEL,
  STANDAARD_STAND,
  vindModel,
  type SollicitatieModelId,
} from "@/lib/solliciteren/modellen";
import { EERSTE_VRAAG, MAX_BERICHT_TEKENS } from "@/lib/solliciteren/prompt";
import type { ReasoningEffort } from "@/lib/openai/sampling";
import type { SollicitatieBericht, SollicitatieChat } from "@/lib/types/database";
import { Bericht } from "./bericht";
import { Contextpaneel } from "./contextpaneel";
import { Sleutelwoordenpaneel } from "./sleutelwoordenpaneel";

/**
 * Het werkblad: links het bronmateriaal, rechts het gesprek.
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
}: {
  chat: SollicitatieChat;
  berichten: SollicitatieBericht[];
}) {
  const router = useRouter();

  // De teksten in de vakken, en daarnaast wat er gekoppeld IS. Het verschil
  // tussen die twee is precies wat de knop "Koppel aan dit gesprek" oplost.
  const [cv, setCv] = useState(chat.cv_tekst);
  const [brieven, setBrieven] = useState(chat.brieven_tekst);
  const [vacature, setVacature] = useState(chat.vacature_tekst);
  const [gekoppeld, setGekoppeld] = useState({
    cv: chat.cv_tekst,
    brieven: chat.brieven_tekst,
    vacature: chat.vacature_tekst,
    op: chat.context_bijgewerkt_op,
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

  const gewijzigd =
    cv !== gekoppeld.cv || brieven !== gekoppeld.brieven || vacature !== gekoppeld.vacature;
  const heeftContext = Boolean(
    gekoppeld.cv.trim() || gekoppeld.brieven.trim() || gekoppeld.vacature.trim(),
  );

  function wijzig(veld: "cv" | "brieven" | "vacature", waarde: string) {
    if (veld === "cv") setCv(waarde);
    if (veld === "brieven") setBrieven(waarde);
    if (veld === "vacature") setVacature(waarde);
  }

  async function koppel() {
    setKoppelen(true);
    setFout(null);
    try {
      const res = await fetch(`/api/solliciteren/chats/${chat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv, brieven, vacature }),
      });
      const data = (await res.json()) as { chat?: SollicitatieChat; error?: string };
      if (!res.ok || !data.chat) {
        setFout(data.error ?? "Het koppelen is niet gelukt.");
        return;
      }
      setGekoppeld({
        cv: data.chat.cv_tekst,
        brieven: data.chat.brieven_tekst,
        vacature: data.chat.vacature_tekst,
        op: data.chat.context_bijgewerkt_op,
      });
    } catch {
      setFout("De verbinding viel weg. Probeer het opnieuw.");
    } finally {
      setKoppelen(false);
    }
  }

  async function stuur(vraag: string) {
    const schoon = vraag.trim();
    if (!schoon || bezig) return;

    setBezig(true);
    setFout(null);
    setLopend("");

    // De eigen vraag staat meteen op het scherm, met een tijdelijk id. De echte
    // rij komt bij het verversen mee; tot die tijd is dit wat je typte.
    const tijdelijk: SollicitatieBericht = {
      id: `nieuw-${Date.now()}`,
      chat_id: chat.id,
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
      const res = await fetch(`/api/solliciteren/chats/${chat.id}/berichten`, {
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
          let gebeurtenis: { t?: string; tekst?: string; bericht?: SollicitatieBericht; melding?: string };
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
      // De lijst met gesprekken en de titel van dit gesprek kunnen veranderd
      // zijn; die staan in de server component.
      router.refresh();
    }
  }

  const gekozenModel = vindModel(model);

  return (
    <div className="sol-werkblad">
      <div className="sol-kolom">
        <Contextpaneel
          cv={cv}
          brieven={brieven}
          vacature={vacature}
          gewijzigd={gewijzigd}
          gekoppeldOp={gekoppeld.op}
          bezig={koppelen}
          onWijzig={wijzig}
          onKoppel={koppel}
        />
        <Sleutelwoordenpaneel cv={cv} vacature={vacature} />
      </div>

      <div className="sol-kolom">
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
            Je kiest dit per bericht. Wat een antwoord gemaakt heeft, staat erboven zodra het er is.
          </p>
        </section>

        <section className="sol-kaart sol-gesprek">
          <h2 className="sol-kaart__titel">Gesprek</h2>

          {berichten.length === 0 && !lopend ? (
            <div className="sol-leeg">
              <p className="sol-kaart__tekst">
                {heeftContext
                  ? "Het bronmateriaal staat klaar. Laat de assistent de vacature ontleden en een eerste brief schrijven."
                  : "Koppel eerst je CV en de vacature, dan heeft de assistent iets om mee te werken."}
              </p>
              <button
                type="button"
                className="sol-knop"
                onClick={() => stuur(EERSTE_VRAAG)}
                disabled={bezig || !heeftContext}
              >
                Ontleed de vacature en schrijf een eerste brief
              </button>
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
