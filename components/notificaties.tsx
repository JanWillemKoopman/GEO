"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/drawer";
import { Icon } from "@/components/icon";
import { intentVoorKleur, useToast } from "@/components/toast";
import { useNotificatiePaneel } from "@/components/notificatie-paneel";
import { nieuwTeTonen, toonSleutel, wanneer, type Notificatie } from "@/lib/notificaties";

/**
 * De notificaties: ophalen, als kleine melding tonen, en de lijst rechts.
 *
 * ── WAAR ZE VANDAAN KOMEN ──────────────────────────────────────────────────
 *
 * De database legt elke gebeurtenis vast (migratie 0133), `lib/notificaties.ts`
 * maakt er een zin, een kleur en een link van, en `/api/notificaties` geeft ze
 * hier af. Dit onderdeel vraagt elke 20 seconden of er iets bij is, zolang het
 * tabblad zichtbaar is. Dat is dezelfde maat als de clustermelder die hier
 * vóór 29 september 2026 stond: een meting duurt minuten, twintig seconden
 * later horen is ruim op tijd.
 *
 * ── WAT ALS KLEINE MELDING VERSCHIJNT ──────────────────────────────────────
 *
 * Alleen wat er ná het openen van de app bijkomt (`nieuwTeTonen`). Wat er
 * gebeurde terwijl je weg was, staat in de lijst en telt mee op het belletje:
 * acht blokjes tegelijk bij het inloggen zijn een muur, geen melding.
 *
 * De meldingen die een knop zelf geeft ("Opgeslagen") gaan buiten deze lijst
 * om, via `useToast`. Die bevestigen alleen je eigen klik en staan dus niet in
 * de lijst: daar hoort alleen wat je anders zou missen.
 */

const INTERVAL_MS = 20_000;

export function NotificatieMelder({ profileId }: { profileId: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const { open, sluiten, meldingen, gezienTot, zetStand } = useNotificatiePaneel();
  // Vanaf wanneer een melding als "nieuw" in beeld mag springen: het moment
  // dat dit scherm openging. Een ref en geen state: hij verandert nooit.
  const sinds = useRef(new Date().toISOString());
  const getoond = useRef(new Set<string>());
  // Tot wanneer alles gezien was toen de lijst deze keer openging. Blijft
  // staan zolang hij open is, zodat de stippen niet verdwijnen terwijl je leest.
  const [stipTot, setStipTot] = useState<string | null>(null);

  const kijk = useCallback(async () => {
    let json: { meldingen?: Notificatie[]; ongelezen?: number; gezienTot?: string | null };
    try {
      const res = await fetch(`/api/notificaties${profileId ? `?merk=${profileId}` : ""}`, { cache: "no-store" });
      if (!res.ok) return;
      json = (await res.json()) as typeof json;
    } catch {
      // Geen verbinding: dan is er niets te melden. Een foutmelding over een
      // mislukte achtergrondcontrole is ruis over iets waar niemand iets mee kan.
      return;
    }
    const lijst = json.meldingen ?? [];
    zetStand({ meldingen: lijst, ongelezen: json.ongelezen ?? 0, gezienTot: json.gezienTot ?? null });

    const nieuw = nieuwTeTonen(lijst, sinds.current, getoond.current);
    for (const m of nieuw) {
      getoond.current.add(toonSleutel(m));
      toast({ title: m.titel, intent: intentVoorKleur(m.kleur), href: m.href });
    }
    // Er is iets gebeurd, dus wat er op het scherm staat kan verouderd zijn:
    // een pagina die net klaar is, een meting met een nieuw cijfer.
    if (nieuw.length > 0) router.refresh();
  }, [profileId, toast, router, zetStand]);

  useEffect(() => {
    void kijk();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void kijk();
    }, INTERVAL_MS);
    const opnieuw = () => {
      if (document.visibilityState === "visible") void kijk();
    };
    document.addEventListener("visibilitychange", opnieuw);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", opnieuw);
    };
  }, [kijk]);

  // Openen = alles gelezen. Eén tijdstip per gebruiker op de server
  // (`notificaties_gezien`); de teller gaat hier meteen naar nul.
  useEffect(() => {
    if (!open) return;
    setStipTot(gezienTot);
    zetStand({ meldingen, ongelezen: 0, gezienTot: new Date().toISOString() });
    void fetch("/api/notificaties/gezien", { method: "POST" }).catch(() => {});
    // Alleen bij het openen, niet bij elke nieuwe lijst terwijl hij open staat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Drawer open={open} titel="Notificaties" onSluit={sluiten} breed>
      {meldingen.length === 0 ? (
        <p className="text-sm text-secondary">
          Nog geen notificaties. Zodra er iets klaar is of er iets van je nodig is, staat het hier.
        </p>
      ) : (
        <ul className="notificatie-lijst">
          {meldingen.map((m) => (
            <li key={m.id}>
              <NotificatieRij
                melding={m}
                nieuw={stipTot === null || Date.parse(m.aangemaaktOp) > Date.parse(stipTot)}
                onKies={sluiten}
              />
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

function NotificatieRij({ melding, nieuw, onKies }: { melding: Notificatie; nieuw: boolean; onKies: () => void }) {
  const inhoud = (
    <>
      <span className="toast-stip" aria-hidden />
      <span className="notificatie-rij-tekst">
        <span className="notificatie-rij-titel">{melding.titel}</span>
        <span className="notificatie-rij-tijd">
          {wanneer(melding.aangemaaktOp)}
          {nieuw && <span className="sr-only">, nieuw</span>}
        </span>
      </span>
    </>
  );
  const attrs = { "data-kleur": melding.kleur, "data-nieuw": nieuw ? "" : undefined };
  return melding.href ? (
    <Link href={melding.href} className="notificatie-rij" onClick={onKies} {...attrs}>
      {inhoud}
    </Link>
  ) : (
    <div className="notificatie-rij" {...attrs}>
      {inhoud}
    </div>
  );
}

/**
 * Het belletje in de bovenbalk, met het woord erbij op een breed scherm en het
 * aantal ongelezen meldingen erachter. Zelfde vorm als de teller van
 * openstaande vragen ernaast (`components/open-questions-badge.tsx`), zodat de
 * twee als één rij lezen.
 */
export function NotificatieKnop() {
  const { openen, ongelezen } = useNotificatiePaneel();
  const label = ongelezen > 0 ? `Notificaties, ${ongelezen} nieuw` : "Notificaties";
  return (
    <button type="button" onClick={openen} className="notificatie-knop" aria-label={label}>
      <Icon naam="notificaties" size={18} />
      <span className="hidden sm:inline">Notificaties</span>
      {ongelezen > 0 && (
        <span className="notificatie-teller" aria-hidden>
          {ongelezen > 9 ? "9+" : ongelezen}
        </span>
      )}
    </button>
  );
}
