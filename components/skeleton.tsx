/**
 * Wachtvormen voor routeovergangen.
 *
 * De app had geen enkele `loading.tsx`, terwijl een lijstpagina vier
 * database-queries doet en een analysepagina er zeven, allemaal server-side,
 * allemaal vóór de eerste byte HTML. Tussen klik en scherm gebeurde er dus
 * niets zichtbaars: de app voelde traag terwijl hij dat niet per se was.
 *
 * De vorm van de skeleton volgt de vorm van wat eronder komt. Dat is het punt:
 * de gebruiker ziet de indeling al staan voordat de inhoud er is, en herkent
 * het scherm dus zodra het vult.
 */
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden />;
}

/** Lijstpagina's: kop + een paar kaartregels. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Bezig met laden">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-56" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-[88px]" style={{ borderRadius: "var(--radius-lg)" }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Het merkoverzicht: kop, de stand-kaart, en de regels die erop wachten.
 *
 * ⚠️ `ChapterSkeleton` stond hier eerst, en die tekent drie grijze blokken
 * zonder kop. Het overzicht opent met een kicker en een titel, en daaronder één
 * brede kaart met het hoofdcijfer. Een laadvorm die daar niet op lijkt, laat de
 * pagina bij het vullen verspringen en doet precies wat een spinner doet: hij
 * zegt dát er gewacht wordt, niet waarop.
 */
/**
 * De startpagina.
 *
 * ⚠️ Het skelet volgt de indeling van `app/(app)/merk/[id]/page.tsx`, inclusief
 * de afstanden: 32 pixels tussen de secties, 12 binnen een sectie. Het toonde
 * drie blokken waar er zes komen, en de kop zat op 24 pixels afstand terwijl de
 * pagina er 32 gebruikt. Daardoor sprong het scherm zichtbaar op het moment dat
 * de data binnenkwam, en dat is precies het eerste wat iemand na inloggen ziet.
 */
export function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Bezig met laden">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      {/* De standkaart. */}
      <Skeleton className="h-48" style={{ borderRadius: "var(--radius-lg)" }} />
      {/* Wat op je wacht: kop plus één regel. */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-24" style={{ borderRadius: "var(--radius-lg)" }} />
      </div>
      {/* Waar je begint: kop, de gemarkeerde eerste kans, dan de lijst. */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32" style={{ borderRadius: "var(--radius-lg)" }} />
        <Skeleton className="h-64" style={{ borderRadius: "var(--radius-lg)" }} />
      </div>
    </div>
  );
}

/** Eén hoofdstuk in het dossier: kop + twee blokken. */
export function ChapterSkeleton({ blocks = 2 }: { blocks?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Bezig met laden">
      {Array.from({ length: blocks }).map((_, i) => (
        <Skeleton
          key={i}
          className={i === 0 ? "h-40" : "h-56"}
          style={{ borderRadius: "var(--radius-lg)" }}
        />
      ))}
    </div>
  );
}

/** Detailpagina's: terug-link, titel, inhoud. */
export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Bezig met laden">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-64" style={{ borderRadius: "var(--radius-lg)" }} />
    </div>
  );
}
