/**
 * De clusterlaag samenvatten tot één leesbare tekst (werkpakket A, punt 3,
 * docs/optimalisatielab-orbit-engine.md §3.1).
 *
 * ── WAAROM DIT EEN APARTE, PURE MODULE IS (conventie 2) ─────────────────────
 *
 * `profile_topics` heeft sinds migratie 0075 drie gerichte velden in plaats
 * van één generieke notitie: wat klanten het vaakst vragen, wat er vaak
 * misgaat, en het onderscheid met de concurrent. Twee plekken hebben daar
 * één lopende tekst van nodig, geen drie losse kolommen: de kaart in
 * `topics-panel.tsx` ("Uit het gesprek") en `analyses.content_brief` zodra
 * een cluster start (`app/api/profiles/[id]/topics/route.ts`, POST). Die
 * laatste voedt op zijn beurt het rapport en de schrijfinstructie
 * (`lib/pipeline/report.ts`, `lib/pipeline/content.ts`), dus deze functie
 * bepaalt mee wat er straks bij de klant op het scherm komt. Vandaar een
 * pure module, testbaar vanuit `scripts/test-unit.ts` zonder database.
 */
import type { ProfileTopic } from "@/lib/types/database";

type TopicBriefInput = Pick<
  ProfileTopic,
  "client_questions" | "client_friction" | "client_edge" | "client_note"
>;

/**
 * Eén lopende tekst uit de drie clusterlaagvelden, of `null` als er niets
 * is ingevuld.
 *
 * Valt terug op `client_note` (het legacy vrije veld, migratie 0040) zolang
 * geen van de drie nieuwe velden is gezet: bestaande aantekeningen van vóór
 * 0075 mogen niet stil verdwijnen uit het rapport en de schrijfinstructie
 * omdat het scherm inmiddels andere kolommen gebruikt.
 */
export function buildTopicBrief(topic: TopicBriefInput): string | null {
  const delen: string[] = [];
  if (topic.client_questions?.trim()) {
    delen.push(`Vaakst gestelde klantvraag: ${topic.client_questions.trim()}`);
  }
  if (topic.client_friction?.trim()) {
    delen.push(`Wat er vaak misgaat: ${topic.client_friction.trim()}`);
  }
  if (topic.client_edge?.trim()) {
    delen.push(`Onderscheid met de concurrent: ${topic.client_edge.trim()}`);
  }

  if (delen.length > 0) return delen.join(" ");
  return topic.client_note?.trim() || null;
}
