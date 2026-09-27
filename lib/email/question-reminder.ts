import "server-only";

/**
 * Eén vriendelijke herinnering bij openstaande vragen (A5 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Blijft een pagina langer dan een week in de briefing steken, dan schrijft
 * ORBIT ENGINE hem niet: die staat pas in de rij zodra de klant "Schrijf mijn
 * pagina" klikt. Zonder herinnering ligt zo'n pagina onopgemerkt stil.
 *
 * ÉÉN KEER, per analyse en niet per pagina (zelfde reden als
 * `publish-reminder.ts`): een klant met vijf briefings krijgt niet vijf
 * mails. `question_reminder_sent_at` (migratie 0128) is dus een kolom en geen
 * teller.
 */
import { Resend } from "resend";
import { emailsEnabled, publicEnv } from "@/lib/env";
import type { Analysis } from "@/lib/types/database";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendQuestionReminder(
  analysis: Analysis,
  toEmail: string,
  waitingCount: number,
): Promise<void> {
  // Laatste vangnet: ook als een aanroeper de schakelaar vergeet te checken,
  // gaat er hier niets de deur uit.
  if (!emailsEnabled()) {
    console.log(`E-mail staat uit (EMAILS_ENABLED), vraagherinnering overgeslagen voor analyse ${analysis.id}.`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`Resend niet geconfigureerd, vraagherinnering overgeslagen voor analyse ${analysis.id}.`);
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "ORBIT ENGINE <onboarding@resend.dev>";
  const libraryUrl = `${publicEnv.siteUrl}/analyses/${analysis.id}/bibliotheek`;
  const pages = waitingCount === 1 ? "een pagina" : `${waitingCount} pagina's`;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #0b0b0c;">
      <h1 style="font-size: 20px;">${waitingCount === 1 ? "Er wacht nog een pagina" : "Er wachten nog pagina's"} op je antwoorden</h1>
      <p>
        Voor <strong>${escapeHtml(analysis.name)}</strong> ${waitingCount === 1 ? "staat" : "staan"}
        ${pages} klaar om te schrijven, zodra jij de vragen erbij hebt beantwoord. Zolang dat niet
        gebeurt, schrijft ORBIT ENGINE die pagina niet.
      </p>
      <p>
        De vragen kosten meestal een paar minuten. Hoe concreter het antwoord, hoe minder algemeen de
        tekst wordt: een AI-assistent citeert een cijfer of een voorbeeld, geen "wij doen dit al
        jaren".
      </p>
      <p style="margin-top: 24px;">
        <a href="${libraryUrl}" style="color: #8511D9;">Naar je bibliotheek in ORBIT ENGINE →</a>
      </p>
      <p style="font-size: 12px; color: #6b6b70; margin-top: 32px;">
        Dit is de enige herinnering die ORBIT ENGINE hierover stuurt.
      </p>
    </div>
  `;

  await resend.emails.send({
    from,
    to: toEmail,
    subject: waitingCount === 1 ? `Een pagina wacht op je antwoorden voor ${analysis.name}` : `Pagina's wachten op je antwoorden voor ${analysis.name}`,
    html,
  });
}
