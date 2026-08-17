/**
 * De Google-sleutel: er niet, kapot, of goed. Drie toestanden, geen twee.
 *
 * ── DE FOUT DIE DIT AFVANGT ─────────────────────────────────────────────────
 *
 * ⚠️ Gevonden op 12 augustus 2026 in de stille-fout-ronde (F5). `serviceAccount()`
 * gaf `null` terug in drie heel verschillende gevallen: de variabele is leeg, de
 * JSON is kapot, of er ontbreken velden. De aanroeper maakte daar één melding
 * van: "De Google-sleutel is nog niet ingesteld. Zet
 * GOOGLE_SERVICE_ACCOUNT_JSON in de omgevingsvariabelen."
 *
 * Bij een kapotte sleutel stuurt die zin je dus iets instellen dat er al staat.
 * Dat is geen onhandige tekst maar een verkeerde diagnose, en een verkeerde
 * diagnose kost meer tijd dan geen diagnose: je gaat de omgevingsvariabele
 * opnieuw zetten, precies het enige wat níet het probleem is.
 *
 * Dit is P1 (`docs/logbook.md`) in zijn zuiverste vorm: een STORING
 * die zich voordoet als een AFWEZIGHEID.
 *
 * Puur, dus testbaar vanuit `scripts/test-unit.ts` (conventie 2). `auth.ts` zelf
 * heeft `server-only`, want die gebruikt `node:crypto`.
 */

export interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

export type KeyState =
  | { state: "ok"; key: ServiceAccountKey }
  /** De variabele is leeg of staat er niet. Een toestand, geen fout. */
  | { state: "afwezig" }
  /** Hij staat er wél, maar we kunnen er niets mee. Dit is een fout. */
  | { state: "onbruikbaar"; reason: string };

/**
 * Leest de ruwe waarde van de omgevingsvariabele uit.
 *
 * De meldingen bij `onbruikbaar` noemen alle drie wát er mis is en niet alleen
 * dát er iets mis is, want dit is het soort probleem dat om drie uur 's nachts
 * gelezen wordt door iemand die de code niet kent.
 */
export function readKey(ruw: string | undefined): KeyState {
  if (!ruw || ruw.trim().length === 0) return { state: "afwezig" };

  let ontleed: unknown;
  try {
    ontleed = JSON.parse(ruw);
  } catch {
    return {
      state: "onbruikbaar",
      reason:
        "De Google-sleutel staat wél in de omgevingsvariabelen, maar het is geen geldige JSON. " +
        "Plak het volledige sleutelbestand opnieuw, inclusief de accolades.",
    };
  }

  const j = ontleed as Partial<ServiceAccountKey>;
  const ontbreekt: string[] = [];
  if (!j.client_email) ontbreekt.push("client_email");
  if (!j.private_key) ontbreekt.push("private_key");
  if (ontbreekt.length > 0) {
    return {
      state: "onbruikbaar",
      reason:
        `De Google-sleutel is geldige JSON maar mist ${ontbreekt.join(" en ")}. ` +
        "Dat wijst er meestal op dat er een deel van het bestand is geplakt in plaats van het geheel.",
    };
  }

  return {
    state: "ok",
    key: {
      client_email: j.client_email!,
      // Sommige omgevingen bewaren `\n` als twee tekens. Dan is de sleutel
      // syntactisch één regel en weigert OpenSSL hem, met een foutmelding die
      // nergens naar de oorzaak wijst.
      private_key: j.private_key!.replace(/\\n/g, "\n"),
    },
  };
}
