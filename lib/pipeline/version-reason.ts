/**
 * Waarom een contentversie bestaat, in mensentaal (C.24, naar Nova's
 * `versionCategory`: original / aiChanges / manualEdit, zie
 * `docs/tasks/nova-analyse.md` §3.2).
 *
 * Geen nieuwe kolom nodig: de drie velden waaruit dit af te leiden is
 * (`version`, `revision_note`, `edited_by_user`) bestaan al sinds migratie
 * `0019`/`0024`. Dit is puur een leesbare laag erover, geen extra opslag, dus
 * geen migratie en geen risico dat oude versies plotseling "onbekend" tonen.
 *
 * Bewust ZONDER `server-only`: pure afleiding, testbaar vanuit
 * scripts/test-unit.ts.
 */

export interface VersionReasonInput {
  version: number;
  revisionNote: string | null;
  editedByUser: boolean;
}

export type VersionReasonKind = "origineel" | "op_verzoek" | "bewerkt" | "herschreven";

export interface VersionReason {
  kind: VersionReasonKind;
  /** Eén zin, klaar om naast de versie te tonen. */
  label: string;
}

/**
 * Volgorde van de aannames, van specifiek naar generiek:
 *
 * 1. Versie 1 is altijd "door ORBIT ENGINE geschreven": er is nog niets te herschrijven.
 * 2. Heeft de klant zelf getypt (`edited_by_user`), dan telt dat zwaarder dan
 *    een eerder verzoek, want het is de laatste handeling op déze versie.
 * 3. Een `revision_note` betekent dat de klant om een herschrijving vroeg en
 *    ORBIT ENGINE die uitvoerde.
 * 4. Alles daarna (een latere versie zonder notitie en zonder klant-bewerking)
 *    komt uit de automatische kritiekronde: ORBIT ENGINE herschreef zichzelf.
 */
export function versionReasonOf(input: VersionReasonInput): VersionReason {
  if (input.version <= 1) {
    return { kind: "origineel", label: "Door ORBIT ENGINE geschreven" };
  }
  if (input.editedByUser) {
    return { kind: "bewerkt", label: "Door jou bewerkt" };
  }
  if (input.revisionNote && input.revisionNote.trim()) {
    return {
      kind: "op_verzoek",
      label: `Op jouw verzoek herschreven: "${input.revisionNote.trim()}"`,
    };
  }
  return { kind: "herschreven", label: "Door ORBIT ENGINE herschreven na eigen kritiekronde" };
}

/** Kort label voor een badge, waar de volledige zin met notitie niet past. */
export function versionReasonLabel(input: VersionReasonInput): string {
  const reason = versionReasonOf(input);
  if (reason.kind === "op_verzoek") return "Op jouw verzoek herschreven";
  return reason.label;
}
