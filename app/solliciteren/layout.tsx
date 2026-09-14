import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import "./solliciteren.css";

/**
 * Het zijproject "Solliciteren": een eigen app van één pagina, in dezelfde
 * codebase als ORBIT ENGINE en achter dezelfde inlog.
 *
 * ── WAT HIJ DEELT EN WAT NIET (14 september 2026) ───────────────────────────
 *
 * Deelt: de inlog van Supabase (`requireUser` hieronder), het project op
 * Vercel, en dus ook de publicatie. Er is niets bijgezet in de database en
 * niets veranderd aan de instellingen van Vercel: deze pagina leest alleen wie
 * er is ingelogd.
 *
 * Deelt niet: de opmaak. `solliciteren.css` staat los van `app/globals.css` en
 * gebruikt geen enkel token daaruit, en deze map gebruikt geen enkel component
 * uit `components/`. `scripts/test-unit.ts` bewaakt allebei die grenzen, want
 * één import is genoeg om ze stilletjes te laten vervagen (conventie 1).
 *
 * ── WAAROM HIJ BUITEN `app/(app)` STAAT ─────────────────────────────────────
 *
 * Alles onder `app/(app)` krijgt de schil van ORBIT ENGINE eromheen: zijbalk,
 * merkkiezer, bovenbalk. Dat is precies wat dit zijproject niet moet hebben.
 * Vandaar een eigen map naast die groep, met een eigen layout.
 *
 * ── WIE ERIN MAG ────────────────────────────────────────────────────────────
 *
 * Alleen een account van ORBIT ENGINE zelf (`staff_users`). Een klant heeft
 * hier niets te zoeken, en zoals overal in de app is `isStaff` het effectieve
 * recht: staat de klantweergave aan, dan is deze pagina ook voor de eigenaar
 * weg. Anders zou de klantweergave laten zien wat een klant juist niet ziet.
 * `notFound()` en geen foutmelding: een pagina die niet voor jou is, hoort niet
 * te verraden dat hij bestaat.
 */
export const metadata: Metadata = {
  // `absolute` doorbreekt het sjabloon "%s · ORBIT ENGINE" uit `app/layout.tsx`:
  // dit is een eigen app en geen scherm van het product.
  title: { absolute: "Solliciteren" },
  robots: { index: false, follow: false },
};

export default async function SolliciterenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  return <div className="sol-app">{children}</div>;
}
