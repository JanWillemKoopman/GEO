import Link from "next/link";
import { requireUser } from "@/lib/auth";

/**
 * De enige pagina van het zijproject.
 *
 * `requireUser()` staat ook in `layout.tsx`, maar is gememoïseerd per verzoek
 * (`lib/auth.ts`): hem hier opnieuw vragen kost geen tweede netwerkronde naar
 * de Auth-server.
 *
 * ⚠️ De tekst hieronder zegt wat er staat en niet wat er komt: er is nog geen
 * functie gebouwd, en dat hoort op het scherm te staan zolang dat zo is.
 */
export default async function SolliciterenPagina() {
  const user = await requireUser();

  return (
    <div className="sol-binnen">
      <header className="sol-kop">
        <div>
          <p className="sol-kop__label">Zijproject</p>
          <h1 className="sol-titel">Solliciteren</h1>
        </div>
        <div className="sol-kop__rechts">
          <span>Ingelogd als {user.email}</span>
          <Link className="sol-terug" href="/">
            Terug naar ORBIT ENGINE
          </Link>
        </div>
      </header>

      <section className="sol-kaart sol-kaart--leeg">
        <h2 className="sol-kaart__titel">Hier komt de app</h2>
        <p className="sol-kaart__tekst">
          Deze pagina is nog leeg. Het fundament eronder staat klaar: de inlog, een eigen
          vormgeving en de publicatie. Wat de pagina moet gaan doen, is de volgende keuze.
        </p>
      </section>

      <section className="sol-raster">
        <article className="sol-punt">
          <h3 className="sol-punt__titel">Achter dezelfde inlog</h3>
          <p className="sol-punt__tekst">
            Eén account voor allebei. Alleen accounts van ORBIT ENGINE zelf komen hier binnen,
            een klant ziet de knop niet en de pagina evenmin.
          </p>
        </article>
        <article className="sol-punt">
          <h3 className="sol-punt__titel">Eigen vormgeving</h3>
          <p className="sol-punt__tekst">
            Warm papier, een schreefletter, terracotta. Geen kleur, letter of vorm uit het
            ontwerp van ORBIT ENGINE, dus een wijziging hier raakt het hoofdproduct niet.
          </p>
        </article>
        <article className="sol-punt">
          <h3 className="sol-punt__titel">Publiceert vanzelf mee</h3>
          <p className="sol-punt__tekst">
            Dezelfde codebase, hetzelfde project bij Vercel. Er is niets bijgezet in de database
            en niets veranderd aan de instellingen.
          </p>
        </article>
      </section>
    </div>
  );
}
