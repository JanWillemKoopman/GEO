import { NextResponse } from "next/server";

/**
 * De versie die op dit moment daadwerkelijk op de server draait, om te
 * vergelijken met de versie die in de browser gebakken zit
 * (`NEXT_PUBLIC_APP_VERSION`, zie next.config.ts en
 * `components/deployment-banner.tsx`). Verschillen ze, dan heeft Vercel een
 * nieuwe deploy gedraaid sinds de klant deze pagina laadde.
 *
 * `force-dynamic`: dit mag nooit gecachet worden, anders vertelt de route
 * eeuwig de versie van het moment waarop hij voor het eerst gebouwd is.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    version: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_APP_VERSION ?? "",
  });
}
