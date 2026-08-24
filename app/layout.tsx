import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Geist Sans en Geist Mono, het paar dat de NOVA-workspace zelf gebruikt.
// Mono was JetBrains Mono: twee families van twee makers naast elkaar is precies
// het soort verschil dat je niet ziet maar wel voelt. Zie designsystem.md §3.

// A.4: elke pagina een eigen tabbladtitel. Het sjabloon hier is de bodem: een
// pagina die alleen `title: "Merken"` opgeeft wordt automatisch "Merken · ORBIT ENGINE".
// `analyses/[id]/layout.tsx` legt voor alles daaronder een eigen, specifieker
// sjabloon overheen (met de analysenaam erin); die van dichterbij wint.
export const metadata: Metadata = {
  title: {
    template: "%s · ORBIT ENGINE",
    default: "ORBIT ENGINE · AI-zichtbaarheid, gemeten",
  },
  description:
    "ORBIT ENGINE meet hoe vaak AI-assistenten jouw merk noemen, laat zien waar je mist en schrijft de pagina's die dat verhelpen.",
};

export const viewport: Viewport = {
  // Twee kleuren, want de app heeft sinds 24 augustus 2026 twee standen. Dit is
  // de kleur van de browserbalk op een telefoon; stond hij op één waarde, dan
  // zat er in donkere modus een lichte balk boven een donkere pagina.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121a22" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Het anti-flitsscript.
 *
 * De keuze licht of donker staat in `localStorage`, en die kan de server niet
 * lezen. Zonder dit script rendert de server dus altijd de lichte stand, en ziet
 * iemand met een donkere voorkeur bij elke paginaovergang een witte flits
 * voordat React de kant weer goedzet.
 *
 * Daarom staat het als kaal `<script>` in de `<head>`, en niet via
 * `next/script`: een gewoon scripttag daar blokkeert het tekenen, en dat is
 * precies wat hier nodig is. Het zet alleen een attribuut op het wortelelement,
 * en het zet dat attribuut ALLEEN als de gebruiker zelf gekozen heeft. Koos hij niet, dan blijft het attribuut weg en beslist de mediaquery in
 * `globals.css` op basis van de systeemvoorkeur.
 *
 * ⚠️ `data-theme` staat bewust NIET in de JSX hieronder. Zou React het
 * renderen, dan ziet hij bij hydratie een ander attribuut dan hij zelf schreef
 * en klaagt hij over een verschil tussen server en browser. Wat React nooit
 * gerenderd heeft, beheert hij ook niet.
 */
const THEMA_SCRIPT = `try{var t=localStorage.getItem("orbit-thema");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEMA_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
