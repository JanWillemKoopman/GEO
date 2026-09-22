"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import type { ClusterMelding } from "@/lib/cluster-melding";

/**
 * DE MELDER: hij zegt het als een meting klaar is, waar je ook bent in de app.
 *
 * ── WAAROM DIT ER IS ────────────────────────────────────────────────────────
 *
 * De resultatenpagina van een cluster is op 22 september 2026 weggehaald
 * (`docs/tasks/clusterresultaat-zonder-eigen-scherm.md`). Die pagina was ook
 * het wachtscherm, en daarmee de enige plek die merkte dat de meting klaar was.
 * Een meetronde duurt minuten; de klant staat dan ergens anders in de app, of
 * zit koffie te drinken. Zonder deze melder gaat de uitslag stil voorbij.
 *
 * ── WAAROM HIJ IN DE SCHIL STAAT EN NIET OP HET CLUSTERSCHERM ───────────────
 *
 * Omdat dat precies het scherm is waar je níét staat te wachten. De hele
 * verbouwing gaat erover dat je na het starten van een cluster gewoon verder
 * werkt. Dan hoort de melding je te volgen, niet andersom.
 *
 * ── WAAROM ELKE 20 SECONDEN EN NIET ELKE 2 ─────────────────────────────────
 *
 * Een meetronde duurt minuten. Twintig seconden later horen dat je meting klaar
 * is, merkt niemand; honderdtachtig aanroepen per uur per ingelogde gebruiker
 * merkt de database wel. Bij een verborgen tabblad stopt de klok helemaal: dan
 * is er niemand die het leest, en bij terugkomst wordt meteen één keer
 * gekeken.
 */
const INTERVAL_MS = 20_000;

export function ClusterMelder({ profileId }: { profileId: string }) {
  const toast = useToast();
  const router = useRouter();
  // Wat in dit tabblad al voorbij is gekomen. De server onthoudt het ook
  // (`resultaat_gezien_at`), maar die schrijfactie is een netwerkronde later:
  // zonder dit setje zou een tweede poll in dat gaatje dezelfde melding nog een
  // keer tonen.
  const gemeld = useRef(new Set<string>());

  const kijk = useCallback(async () => {
    let json: { meldingen?: ClusterMelding[]; gezien?: string[] };
    try {
      const res = await fetch(`/api/profiles/${profileId}/clusters/melding`);
      if (!res.ok) return;
      json = (await res.json()) as typeof json;
    } catch {
      // Geen verbinding: dan is er niets te melden. Een foutmelding over een
      // mislukte achtergrondcontrole is ruis over iets waar de gebruiker niets
      // mee kan.
      return;
    }

    const meldingen = (json.meldingen ?? []).filter((m) => !gemeld.current.has(m.analysisId));
    const gezien = json.gezien ?? [];
    if (gezien.length === 0) return;

    for (const m of meldingen) {
      gemeld.current.add(m.analysisId);
      toast({
        title: m.titel,
        description: m.regel,
        intent: m.soort === "mislukt" ? "fout" : "succes",
        // Een geslaagde meting mag vanzelf weggaan: de cijfers staan op
        // Analytics, de vragen bij Openstaande vragen en de pagina's in het
        // Contentplan. Een mislukking blijft staan tot je hem wegklikt, want
        // daar moet iemand iets mee.
        duration: m.soort === "mislukt" ? 0 : 10_000,
      });
    }

    // Ook wat de grens van drie meldingen niet haalde gaat als gezien weg, zie
    // `lib/cluster-melding.ts`.
    for (const id of gezien) gemeld.current.add(id);
    try {
      await fetch(`/api/profiles/${profileId}/clusters/melding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: gezien }),
      });
    } catch {
      /* lukt het wegzetten niet, dan komt de melding straks nog een keer; dat
         is beter dan een uitslag die niemand ooit gezien heeft */
    }

    // Het scherm waar je op staat toont nu oude cijfers: het clusteroverzicht
    // zegt nog "meting loopt", Analytics kent de nieuwe ronde nog niet.
    if (meldingen.length > 0) router.refresh();
  }, [profileId, toast, router]);

  useEffect(() => {
    let klok: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (klok) return;
      void kijk();
      klok = setInterval(() => void kijk(), INTERVAL_MS);
    }
    function stop() {
      if (!klok) return;
      clearInterval(klok);
      klok = null;
    }
    function zichtbaarheid() {
      if (document.visibilityState === "visible") start();
      else stop();
    }

    zichtbaarheid();
    document.addEventListener("visibilitychange", zichtbaarheid);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", zichtbaarheid);
    };
  }, [kijk]);

  return null;
}
