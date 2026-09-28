"use client";

import { useRouter } from "next/navigation";
import { WorkInProgress, useStatusPoll } from "@/components/work-in-progress";

/**
 * Het voortgangsblok zolang een ronde loopt. Pollt de stand en ververst het
 * scherm zodra de ronde klaar of mislukt is, zodat de kandidaten verschijnen
 * zonder dat iemand hoeft te herladen.
 */
const STAPPEN = [
  { status: "verzamelen", label: "Verzamelen wat we al over je weten" },
  { status: "verbreden", label: "Opzoeken waar in Google naar je aanbod gezocht wordt" },
  { status: "schiften", label: "Schiften op wat echt bij je past" },
  { status: "bundelen", label: "Bundelen tot onderwerpen" },
] as const;

export function RondeVoortgang({ merkId, status }: { merkId: string; status: string }) {
  const router = useRouter();
  const live = useStatusPoll<{ status: string }>(
    `/api/profiles/${merkId}/discovery`,
    (d) => d.status === "klaar" || d.status === "mislukt" || d.status === "geen",
    () => router.refresh(),
    5000,
  );
  const huidig = live?.status ?? status;
  const index = STAPPEN.findIndex((s) => s.status === huidig);

  return (
    <WorkInProgress
      title="Ontdekkingsronde loopt"
      explanation="ORBIT ENGINE zoekt uit je Search Console, je onboarding en de zoekdata van Google naar onderwerpen die bij je passen en nog niet gemeten worden."
      etaText="meestal 5 tot 10 minuten"
      steps={STAPPEN.map((s, i) => ({ label: s.label, done: index > i }))}
    />
  );
}
