import { NextResponse } from "next/server";
import { envStatus } from "@/lib/env";

/**
 * Health-check. Retourneert ALLEEN booleans over of env-variabelen gezet zijn —
 * nooit de waarden zelf. Handig om na deploy te zien of Vercel goed geconfigureerd is.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "geo-tracker",
    env: envStatus(),
    time: new Date().toISOString(),
  });
}
