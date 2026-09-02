/**
 * Gedeeld fundament voor de vier Analytics-schermen (plan analytics-herontwerp.md, F1).
 *
 * ⚠️ **Uitsluitend desktop, en dat is een besluit, geen omissie.** De inhoud is
 * ontworpen voor 1280 tot 1600 pixels; er komt geen tweede, smallere compositie.
 * Onder 1280 pixels breedte krijgt de pagina daarom één horizontale schuifbalk
 * en deze regel die zegt waarom. De schuifbalk komt uit `.analytics-shell` in
 * `app/globals.css`, niet uit een losse Tailwind-utility: zie de toelichting
 * daar over waarom `overflow-x` alleen ónder 1280px aan mag staan.
 * `components/workspace-chrome.tsx` verruimt de kolom zelf al tot 1600px,
 * alleen voor `/analytics`-routes.
 */
export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="analytics-shell">
      <p className="mono-label mb-4 hidden text-muted max-[1279px]:block">
        Dit onderdeel is gemaakt voor een groot beeldscherm. Scroll opzij om alles te zien, of open
        ORBIT ENGINE op een breder scherm voor het volledige beeld.
      </p>
      {children}
    </div>
  );
}
