import "server-only";

/**
 * Eén vriendelijke herinnering bij klaarliggende content (optimalisatie.md 5.8).
 *
 * Ligt er langer dan een week een pagina klaar zonder gepubliceerd te zijn, dan
 * is dát het punt waar het spaak loopt — niet het schrijven. Meer content
 * aanbieden helpt dan niet; even vragen of er iets in de weg zit wel.
 *
 * ÉÉN KEER. Een app die blijft herinneren wordt een app die je wegklikt, en
 * daarna lees je ook de mail niet meer die er wél toe doet. Vandaar
 * `publish_reminder_sent_at` als kolom en niet als teller.
 */
import { Resend } from "resend";
import { emailsEnabled, publicEnv } from "@/lib/env";
import type { Analysis } from "@/lib/types/database";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendPublishReminder(
  analysis: Analysis,
  toEmail: string,
  waitingCount: number,
): Promise<void> {
  // Laatste vangnet: ook als een aanroeper de schakelaar vergeet te checken,
  // gaat er hier niets de deur uit.
  if (!emailsEnabled()) {
    console.log(`E-mail staat uit (EMAILS_ENABLED) — herinnering overgeslagen voor analyse ${analysis.id}.`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`Resend niet geconfigureerd — herinnering overgeslagen voor analyse ${analysis.id}.`);
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "Aura <onboarding@resend.dev>";
  const libraryUrl = `${publicEnv.siteUrl}/analyses/${analysis.id}/bibliotheek`;
  const pages = waitingCount === 1 ? "een pagina" : `${waitingCount} pagina's`;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #0b0b0c;">
      <h1 style="font-size: 20px;">Er ${waitingCount === 1 ? "ligt" : "liggen"} nog ${pages} klaar</h1>
      <p>
        Voor <strong>${escapeHtml(analysis.name)}</strong> ${waitingCount === 1 ? "staat" : "staan"}
        ${pages} klaar die nog niet live ${waitingCount === 1 ? "staat" : "staan"}. Zolang dat zo
        is, beweegt je zichtbaarheid in AI-antwoorden niet: de tekst moet op je website staan
        voordat een AI hem kan vinden.
      </p>
      <p>
        Loop je ergens tegenaan? De meeste mensen blijven hangen op waar de pagina precies moet
        staan, of op de gestructureerde data. Bij elke pagina in je bibliotheek staat een
        stappenplan — en je mag ons altijd mailen als het niet lukt.
      </p>
      <p style="margin-top: 24px;">
        <a href="${libraryUrl}" style="color: #8511D9;">Naar je bibliotheek in Aura →</a>
      </p>
      <p style="font-size: 12px; color: #6b6b70; margin-top: 32px;">
        Dit is de enige herinnering die Aura hierover stuurt.
      </p>
    </div>
  `;

  await resend.emails.send({
    from,
    to: toEmail,
    subject: `Er ${waitingCount === 1 ? "ligt" : "liggen"} nog ${pages} klaar voor ${analysis.name}`,
    html,
  });
}
