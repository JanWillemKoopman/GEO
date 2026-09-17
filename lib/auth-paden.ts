/**
 * WELKE ADRESSEN ZONDER INLOG BEREIKBAAR ZIJN, EN VERDER GEEN ENKEL.
 *
 * ── DE LIJST STAAT OM, SINDS 17 SEPTEMBER 2026 ──────────────────────────────
 *
 * Hiervoor stond in `lib/supabase/middleware.ts` een lijst van zes beschermde
 * secties, en alles wat daar niet in stond was open. Die vorm is twee keer
 * misgegaan: op 17 augustus 2026 verhuisde het merendeel van de app naar
 * `/merk` en viel daarmee buiten de controle, en `/support` heeft er sinds zijn
 * bouw nooit in gestaan. Beide keren lekte er niets, want elk scherm roept zelf
 * `requireUser()` aan, maar een bezoeker zonder sessie kreeg eerst een
 * server-render van een leeg scherm en pas daarna het inlogscherm. De fout zit
 * in de vorm: wie een scherm bouwt moet eraan dénken een tweede bestand bij te
 * werken, en dat gebeurt niet.
 *
 * Nu is het andersom: **alles is beschermd, behalve wat hieronder staat**. Een
 * nieuw scherm zit daarmee vanzelf achter de inlog, ook als niemand aan dit
 * bestand denkt. Vergeten kost nu hooguit een scherm dat te streng is, en dat
 * merkt de eerste bezoeker meteen; vergeten kostte eerst een scherm dat te open
 * was, en dat merkte niemand.
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS EN NIET IN DE MIDDLEWARE STAAT ───────────
 *
 * Conventie 2: pure logica staat in een module zonder `server-only`, zodat
 * `scripts/test-unit.ts` hem echt kan aanroepen in plaats van de brontekst te
 * lezen. Die test loopt élke `page.tsx` in `app/` na en eist per adres dat het
 * beschermd is, of dat het hieronder met reden genoemd wordt.
 */

export type PubliekPad = {
  /** Het adres, zonder afsluitende schuine streep. */
  pad: string;
  /** Telt alles eronder mee (`/markt/makelaar-eindhoven`), of alleen dit adres? */
  prefix: boolean;
  /** Waarom dit adres zonder sessie moet werken. Geen versiering: zie hieronder. */
  reden: string;
};

/**
 * De acht adressen die zonder sessie bereikbaar blijven.
 *
 * Dit is geen lijst van schermen die zonder inlog "wel mogen", het is de lijst
 * van schermen die zonder inlog **moeten** werken omdat ze anders onbereikbaar
 * zijn: je kunt niet inloggen op een inlogscherm waar je voor moet inloggen.
 * Staat er iets bij waar die zin niet voor opgaat, dan hoort het er niet.
 */
export const PUBLIEKE_PADEN: PubliekPad[] = [
  {
    pad: "/login",
    prefix: false,
    reden: "het inlogscherm zelf; hierachter zetten is de deur op slot met de sleutel erin",
  },
  {
    pad: "/register",
    prefix: false,
    reden: "het registratiescherm, de tweede deur naar binnen",
  },
  {
    pad: "/wachtwoord-vergeten",
    prefix: false,
    reden: "wie zijn wachtwoord kwijt is, heeft per definitie geen sessie",
  },
  {
    pad: "/wachtwoord",
    prefix: false,
    reden: "het herstelformulier; daar komt de sessie pas uit de link in de mail",
  },
  {
    pad: "/uitnodiging",
    prefix: true,
    reden: "het token in het adres is het bewijs, want er is nog geen account",
  },
  {
    pad: "/auth/wachtwoord",
    prefix: true,
    reden: "waar de herstel-link binnenkomt en de code wordt ingewisseld voor een sessie",
  },
  {
    // ⚠️ Dit is geen dashboardscherm maar het publieke marktrapport uit de
    // Sales-module (`docs/tasks/geo-prospect-engine.md` hoofdstuk 20): "de
    // verkoper zegt kijk zelf, en de prospect hoeft geen account". Een inlog
    // hier haalt de werking van dat rapport helemaal weg. De pagina toont
    // daarom met opzet geen personen, geen contactgegevens en geen oordeel over
    // een bedrijf, en leest alleen een markt die op publiek staat.
    pad: "/markt",
    prefix: true,
    reden: "het publieke marktrapport, bedoeld voor een prospect zonder account",
  },
  {
    // De kaart die verschijnt als iemand een link plakt in Slack of WhatsApp.
    // Next.js hangt deze afbeelding aan élk adres dat er zelf geen heeft, dus
    // ook aan het publieke marktrapport. Achter de inlog krijgt een prospect
    // die zo'n link doorstuurt een kale URL zonder voorvertoning.
    pad: "/opengraph-image",
    prefix: true,
    reden: "de voorvertoning van een gedeelde link, opgehaald door een crawler zonder sessie",
  },
];

/**
 * Mag dit adres zonder sessie bekeken worden?
 *
 * Alles waarvoor dit `false` teruggeeft, stuurt de middleware naar het
 * inlogscherm. Ook een adres dat niet bestaat: een bezoeker zonder sessie hoort
 * geen 404 te krijgen, want daarmee vertelt de app hem welke adressen er wél
 * zijn.
 */
export function isPubliekPad(pad: string): boolean {
  // Een afsluitende schuine streep is hetzelfde adres. Zonder deze regel is
  // `/login/` beschermd en `/login` niet, en dat verschil ziet niemand aankomen.
  const schoon = pad.length > 1 && pad.endsWith("/") ? pad.slice(0, -1) : pad;
  return PUBLIEKE_PADEN.some(({ pad: p, prefix }) =>
    prefix ? schoon === p || schoon.startsWith(`${p}/`) : schoon === p,
  );
}
