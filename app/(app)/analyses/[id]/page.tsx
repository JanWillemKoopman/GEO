import { notFound, redirect } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";

export const dynamic = "force-dynamic";

/**
 * HET CLUSTERDOSSIER BESTAAT NIET MEER. DIT ADRES WIJST DE WEG.
 *
 * ── WAT HIER STOND EN WAAROM HET WEG IS (22 september 2026) ─────────────────
 *
 * Hier stond de resultatenpagina van een cluster: eerst als vier hoofdstukken
 * (26 augustus 2026), daarna als één scherm met de samenvatting, de kansen en
 * de voorgestelde pagina's (16 september 2026). Diezelfde route was ook het
 * wachtscherm: een voortgangsbalk voor werk dat op de server doorloopt, ook als
 * je de tab sluit.
 *
 * Op verzoek van de eigenaar is allebei weggehaald, om dezelfde reden waarom de
 * vier hoofdstukken er drie kwijtraakten: alles wat hier stond, staat ergens
 * anders óók, en dan is dit scherm geen samenvatting maar een tweede waarheid.
 *
 *   • de cijfers van de meting  → Analytics, met een filter per cluster
 *   • de vragen aan de klant    → Strategie → Openstaande vragen
 *   • de voorgestelde pagina's  → Strategie → Contentplan, als voorraad
 *
 * Wat de pagina als enige deed, is vervangen door iets dat niet aan een scherm
 * hangt: melden dat de meting klaar is. Dat doet `components/cluster-melder.tsx`
 * nu, waar je ook bent in de app.
 *
 * ⚠️ Wat er bewust NIET mee verhuisd is: het off-site werk (de acties buiten je
 * eigen website). Dat is uit de schermen gehaald en niet elders neergezet, en
 * dat is een bewuste keuze met een houdbaarheidsdatum. Zie
 * `docs/tasks/clusterresultaat-zonder-eigen-scherm.md`, blok "Off-site".
 *
 * ── WAAROM DIT BESTAND BLIJFT BESTAAN ───────────────────────────────────────
 *
 * Er staan links naar dit adres in verstuurde rapportmails, in bladwijzers van
 * klanten en in gedeelde links uit demogesprekken. Een 404 kost daar een
 * gesprek en niet alleen een klik. Doorverwijzen kan niet in `lib/redirects.ts`
 * (dat zijn statische regels, en hiervoor moet eerst het merk van dit cluster
 * opgezocht worden), dus gebeurt het hier.
 *
 * De onderliggende schermen blijven allemaal gewoon bestaan: het concept, de
 * briefing, de bibliotheek, de antwoorden en de instellingen van dit cluster.
 * Alleen de verzamelpagina erboven is weg.
 */
export default async function ClusterAdres({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  // Wacht het concept op jouw akkoord, of wordt het nog opgesteld, dan is dát
  // het scherm. Dat is de enige plek waar de app echt op jou wacht.
  if (analysis.status === "concept_klaar" || analysis.status === "bezig") {
    redirect(`/analyses/${id}/concept`);
  }

  redirect(`/merk/${analysis.profile_id}/strategie/clusters`);
}
