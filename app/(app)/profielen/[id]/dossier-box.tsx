"use client";

import { useState } from "react";

/**
 * Het merkdossier (implementatieplan.md S5, contentbriefing.md §8).
 *
 * ── WAAROM DIT VELD ER STAAT ────────────────────────────────────────────────
 *
 * De briefing stelt maximaal 8 vragen per contentbatch. Over vijf testklanten
 * leverde dat 21 beantwoorde vragen op, waarvan 8 praktisch (telefoon, URL). Van
 * de 35 gestelde "wat wij niet kunnen weten"-vragen werden er 7 beantwoord.
 *
 * Voor de klant is dat ook logisch: elke vraag kost hem dertig seconden nadenken
 * en formuleren. Eén tarievenpagina plakken kost hem tien seconden en levert er
 * tien op. Dat is het hele idee — bevestigen is goedkoper dan formuleren
 * (contentbriefing.md §4, regel 3), en dat geldt op schaal net zo goed.
 *
 * ── WAAROM HIER EN NIET BIJ HET AANMELDEN ───────────────────────────────────
 *
 * Bewust ná het profielonderzoek. Dan staat er al iets: de klant ziet wat de app
 * zélf gevonden heeft en vult aan wat ontbreekt, in plaats van te beginnen met
 * een leeg veld en de vraag "wat wil je dat ik weet?". Een extra veld bij het
 * aanmelden is bovendien een extra reden om af te haken, en dat is de duurste
 * plek in de hele flow.
 */

interface DossierFact {
  id: string;
  question: string;
  answer: string;
  verifyAfter: string | null;
}

export function DossierBox({ profileId }: { profileId: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facts, setFacts] = useState<DossierFact[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [alKnown, setAlKnown] = useState(false);
  const [verwijderd, setVerwijderd] = useState<Set<string>>(new Set());

  async function verwerk() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/dossier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        facts?: DossierFact[];
        skipped?: number;
        alreadyKnown?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Verwerken is niet gelukt.");
      setFacts(json.facts ?? []);
      setSkipped(json.skipped ?? 0);
      // Sinds migratie 0035 herkent de app dezelfde tekst aan zijn hash. Zonder
      // dit onderscheid kreeg de klant "hier kwamen geen harde feiten uit" te
      // zien op zijn tarievenpagina — een onjuiste conclusie over een prima
      // document, en precies het soort melding dat vertrouwen kost.
      setAlKnown(Boolean(json.alreadyKnown));
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Doorstrepen in plaats van formuleren. Gebruikt de bestaande facts-route, die
   * een feit op 'overgeslagen' zet: het blijft als rij bestaan zodat dezelfde
   * vraag niet bij elke volgende ronde opnieuw opduikt.
   */
  async function verwijder(id: string) {
    setVerwijderd((v) => new Set(v).add(id));
    await fetch(`/api/profiles/${profileId}/facts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factId: id, skip: true }),
    }).catch(() => {
      // Mislukt het, dan blijft het feit gewoon staan. Dat is de veilige kant:
      // een feit dat de klant wilde weghalen en dat blijft staan is vervelend,
      // een feit dat stilletjes verdwijnt terwijl de app zegt dat het bewaard is,
      // is erger.
      setVerwijderd((v) => {
        const kopie = new Set(v);
        kopie.delete(id);
        return kopie;
      });
    });
  }

  const zichtbaar = (facts ?? []).filter((f) => !verwijderd.has(f.id));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-secondary">
        Staan je tarieven, voorwaarden of veelgestelde vragen al ergens? Plak ze hier. Aura haalt er
        de harde feiten uit — bedragen, termijnen, wat er wel en niet bij zit — en gebruikt die bij
        het schrijven. Wat er niet letterlijk in staat, neemt het niet over.
      </p>

      <textarea
        className="min-h-[140px] w-full"
        placeholder="Plak hier bijvoorbeeld je tarievenpagina, een brochure of je veelgestelde vragen…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void verwerk()}
          disabled={busy || text.trim().length < 40}
          className="btn-outline disabled:opacity-60"
        >
          {busy ? "Aura leest…" : "Haal de feiten eruit"}
        </button>
        {error && <span className="text-sm text-[var(--status-error)]">{error}</span>}
      </div>

      {facts !== null && (
        <div className="flex flex-col gap-2">
          {alKnown ? (
            <p className="text-sm text-muted">
              Deze tekst heb je al eerder aangeleverd — de feiten eruit staan er dus al. Je hoeft
              niets te doen.
            </p>
          ) : zichtbaar.length === 0 ? (
            <p className="text-sm text-muted">
              Hier kwamen geen harde feiten uit. Dat gebeurt bij sfeerteksten: er staat niets in dat
              een pagina kan bewijzen. Probeer een tarievenpagina of een lijst met voorwaarden.
            </p>
          ) : (
            <>
              <span className="mono-label">
                {zichtbaar.length} {zichtbaar.length === 1 ? "feit" : "feiten"} toegevoegd
              </span>
              <ul className="flex flex-col gap-1.5">
                {zichtbaar.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="text-secondary">{f.question}</span>
                    <span className="font-medium">{f.answer}</span>
                    {f.verifyAfter && (
                      <span className="text-muted">
                        — vragen we opnieuw na {new Date(f.verifyAfter).toLocaleDateString("nl-NL")}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void verwijder(f.id)}
                      className="mono-label underline transition-colors hover:text-[var(--text-primary)]"
                    >
                      klopt niet
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {/* Eerlijk zijn over wat er niet doorkwam. Dit is het vangnet dat
              afgeronde bedragen en samengevatte voorwaarden tegenhoudt; als de
              klant een feit mist, is dít de verklaring. */}
          {skipped > 0 && (
            <p className="text-sm text-muted">
              {skipped}{" "}
              {skipped === 1 ? "voorstel stond niet" : "voorstellen stonden niet"} letterlijk in je
              tekst en {skipped === 1 ? "is" : "zijn"} daarom weggelaten.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
