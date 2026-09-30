/**
 * Werkt de Search Console-koppeling van dit merk, ja of nee?
 *
 * ── WAAROM EEN APARTE STATUS NAAST `lege-staat.ts` ──────────────────────────
 *
 * `legeStaat` beantwoordt voor de klant waarom er geen zoekverkeer op het scherm
 * staat, en weegt daarvoor ook mee of er al pagina's live staan. Deze functie
 * beantwoordt een smallere vraag voor de consultant op het koppelscherm: kan
 * ORBIT ENGINE vannacht lezen? Dat is groen of rood, niets ertussen.
 *
 * ⚠️ Gevonden 28 september 2026: na "Opnieuw controleren" verscheen een melding
 * die na vier seconden verdween, en daarna zag het scherm er bij een gelukte en
 * een mislukte poging vrijwel hetzelfde uit. Een fout stond alleen als gele
 * balk in beeld, en een property zonder verificatie gaf helemaal geen signaal.
 *
 * Groen vraagt drie dingen tegelijk: een property, een geslaagde leespoging
 * (`gsc_verified_at`), en geen fout sinds die poging (`gsc_last_error`). De
 * nachtelijke ronde zet de fout zonder de verificatiedatum te wissen
 * (`lib/search-console/sync.ts`), dus alleen op de datum afgaan zou een
 * koppeling die gisteren brak nog groen tonen.
 *
 * Puur en zonder `server-only` (conventie 2): dit bepaalt welke kleur de
 * consultant ziet, en dat hoort onder test.
 */

export type KoppelStaat = "werkt" | "niet_gekoppeld" | "geen_sleutel" | "fout" | "niet_gelukt";

export interface KoppelStatusInvoer {
  property: string | null;
  verifiedAt: string | null;
  lastError: string | null;
  /** Staat de Google-sleutel van ORBIT ENGINE zelf ingesteld? */
  sleutelIngesteld: boolean;
}

export interface KoppelStatus {
  staat: KoppelStaat;
  /** Groen als ORBIT ENGINE kan lezen, anders rood. */
  goed: boolean;
  /** De tekst naast het bolletje. Kleur alleen is geen status (designsystem §11 regel 4). */
  label: string;
}

export function koppelStatus(invoer: KoppelStatusInvoer): KoppelStatus {
  if (!invoer.property?.trim()) {
    return { staat: "niet_gekoppeld", goed: false, label: "Niet gekoppeld" };
  }
  // Zonder sleutel leest geen enkele koppeling, ook een die gisteren werkte.
  if (!invoer.sleutelIngesteld) {
    return { staat: "geen_sleutel", goed: false, label: "Google-sleutel ontbreekt" };
  }
  if (invoer.lastError) {
    return { staat: "fout", goed: false, label: "Ophalen niet gelukt" };
  }
  if (!invoer.verifiedAt) {
    return { staat: "niet_gelukt", goed: false, label: "Nog geen toegang" };
  }
  return { staat: "werkt", goed: true, label: "Gekoppeld" };
}
