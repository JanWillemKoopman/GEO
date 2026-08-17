import { ImageResponse } from "next/og";

/**
 * Deelvoorbeeld (B.14): de kaart die verschijnt zodra iemand een link naar
 * ORBIT ENGINE plakt in Slack, e-mail of WhatsApp. Zonder dit bestand toont zo'n link
 * een kale URL, geen enkele indruk van wat erachter zit.
 *
 * `next/og` rendert dit via Satori, dat CSS-custom-properties niet kent
 * (`app/globals.css` §1), vandaar letterlijke kleurwaarden hier, hetzelfde
 * uitzonderingspatroon als `lib/email/*.ts` (zie designsystem.md §11): geen
 * gemiste opruiming, een technische grens van de renderer.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#f8fafc",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", gap: 14, marginBottom: 28 }}>
          <div style={{ width: 14, height: 56, borderRadius: 7, background: "#37941c", display: "flex" }} />
          <div style={{ width: 14, height: 56, borderRadius: 7, background: "#8511d9", display: "flex" }} />
        </div>
        <div style={{ display: "flex", fontSize: 128, fontWeight: 700, color: "#17212b", letterSpacing: "-0.03em" }}>
          ORBIT ENGINE
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#43505d", marginTop: 18 }}>
          AI-zichtbaarheid, gemeten
        </div>
      </div>
    ),
    { ...size },
  );
}
