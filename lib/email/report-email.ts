import "server-only";

/**
 * Rapport-e-mail via Resend (abcplan.md §7 B2). Best-effort: als RESEND_API_KEY
 * ontbreekt, wordt de mail stil overgeslagen — dit mag de statusovergang naar
 * 'gereed' nooit blokkeren (de klant kan het rapport ook gewoon in de app zien).
 */
import { Resend } from "resend";
import { publicEnv } from "@/lib/env";
import type { Analysis } from "@/lib/types/database";
import type { Report } from "@/lib/schemas/report";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendReportEmail(analysis: Analysis, toEmail: string, report: Report): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`Resend niet geconfigureerd — rapport-mail overgeslagen voor analyse ${analysis.id}.`);
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "GEO Tracker <onboarding@resend.dev>";
  const reportUrl = `${publicEnv.siteUrl}/analyses/${analysis.id}/rapport`;
  const topRecommendations = [...report.recommendations].sort((a, b) => a.priority - b.priority).slice(0, 3);

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #0b0b0c;">
      <h1 style="font-size: 20px;">Je GEO-rapport is klaar</h1>
      <p style="font-size: 32px; font-weight: 700; margin: 8px 0;">${report.headlineScore}/100</p>
      <p>${escapeHtml(report.summary)}</p>
      <h2 style="font-size: 16px; margin-top: 24px;">Prioriteiten</h2>
      <ol>
        ${topRecommendations
          .map((r) => `<li style="margin-bottom: 8px;"><strong>${escapeHtml(r.title)}</strong><br/>${escapeHtml(r.why)}</li>`)
          .join("")}
      </ol>
      <p style="margin-top: 24px;">
        <a href="${reportUrl}" style="color: #8511D9;">Bekijk het volledige rapport →</a>
      </p>
    </div>
  `;

  await resend.emails.send({
    from,
    to: toEmail,
    subject: `Je GEO-rapport voor ${analysis.name}`,
    html,
  });
}
