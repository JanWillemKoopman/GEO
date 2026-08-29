import "server-only";

/**
 * Stap 2: de tweede bron uitlezen, ontdubbelen en de lijst vastleggen
 * (`docs/tasks/geo-prospect-engine.md` 9.1 tot en met 9.3).
 *
 * ── DIT IS DE STAP DIE HET AI-VOOROORDEEL WEGNEEMT ──────────────────────────
 *
 * Stap 1 leverde bedrijven op die een model op het web vond, plus de
 * OVERZICHTSPAGINA'S waar die markt op staat. Deze stap haalt die pagina's zelf
 * op en leest eruit naar welke bedrijven ze linken. Geen model, geen kosten, en
 * bovenal: geen mening. Een ledenlijst van een branchevereniging linkt naar zijn
 * leden, ook naar de leden die geen enkel AI-model ooit noemt.
 *
 * Dat is wat "twee onafhankelijke bronnen" hier betekent, en het is precies wat
 * de zekerheid per bedrijf draagt (plan 9.1).
 *
 * ── GEEN AI-AANROEP ─────────────────────────────────────────────────────────
 *
 * Deze stap kost niets. Dat is geen toeval maar het ontwerp uit plan 21.1: wat
 * meeschaalt met het aantal bedrijven moet gratis zijn, anders wordt een
 * volledige markt duur en gaan mensen bedrijven wegsnijden. Precies de bedrijven
 * die je zoekt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchText } from "@/lib/crawler";
import { normalizeEntityName } from "@/lib/entities/normalize";
import {
  bedrijvenUitBronpagina,
  beschrijfHerkomst,
  voegKandidatenSamen,
  type Kandidaat,
  type SamengevoegdBedrijf,
} from "@/lib/sales/discovery";

type Admin = SupabaseClient;

/**
 * Hoeveel bronpagina's we uitlezen.
 *
 * Twaalf is geen zuinigheid maar een tijdslimiet: elke pagina is een
 * netwerkverzoek en deze taak moet ruim binnen één werker-aanroep passen
 * (`lib/jobs/types.ts`). Twaalf ledenlijsten dekken een lokale markt ruimschoots;
 * daarboven zit vrijwel alleen herhaling.
 */
export const MAX_BRONPAGINAS = 12;

/**
 * Hoeveel bedrijven we per bronpagina meenemen.
 *
 * Een gemeentegids kan duizenden links hebben. Boven de tweehonderd is het geen
 * markt meer maar een index, en dan is de bronpagina verkeerd gekozen. Dat hoort
 * bij poort 1 zichtbaar te zijn, niet stil te worden afgekapt: de kanttekening
 * bij de markt meldt het.
 */
export const MAX_PER_BRONPAGINA = 200;

export interface VerifyUitkomst {
  bedrijven: number;
  nieuw: number;
  bronpaginasGelezen: number;
  bronpaginasMislukt: number;
  afgekapt: string[];
}

/** Leest de bronpagina's uit en levert de kandidaten die erop staan. */
export async function leesBronpaginas(
  urls: readonly string[],
): Promise<{ kandidaten: Kandidaat[]; gelukt: number; mislukt: number; afgekapt: string[] }> {
  const kandidaten: Kandidaat[] = [];
  const afgekapt: string[] = [];
  let gelukt = 0;
  let mislukt = 0;

  for (const url of urls.slice(0, MAX_BRONPAGINAS)) {
    // Eén onbereikbare bronpagina mag de andere elf niet meenemen. Een
    // ledenlijst achter een inlog of een site die onze crawler weert is een
    // gemis, geen storing.
    const html = await fetchText(url);
    if (!html) {
      mislukt++;
      continue;
    }
    gelukt++;
    const gevonden = bedrijvenUitBronpagina(html, url, MAX_PER_BRONPAGINA);
    if (gevonden.length >= MAX_PER_BRONPAGINA) afgekapt.push(url);
    kandidaten.push(...gevonden);
  }

  return { kandidaten, gelukt, mislukt, afgekapt };
}

/**
 * De samengevoegde lijst wegschrijven naar `sales_companies` en de koppeltabel.
 *
 * ── EEN BEDRIJF IS PERMANENT, EEN LIDMAATSCHAP NIET ─────────────────────────
 *
 * Bestaat het bedrijf al (op domein), dan komt er geen tweede rij bij: hetzelfde
 * bedrijf kan in meerdere markten zitten (plan hoofdstuk 6, gevolg 2). Wat er
 * wél bij komt is een lidmaatschap van dít bedrijf in DEZE markt, met zijn eigen
 * zekerheid en zijn eigen vindplaatsen. Dezelfde makelaar kan zeker in
 * "makelaars Eindhoven" horen en twijfelachtig in "aankoopmakelaar Brabant".
 *
 * ⚠️ **`included` blijft leeg.** Dat is poort 1: niemand heeft er nog naar
 * gekeken. Zou deze stap `true` invullen, dan zou de poort niet bestaan en zou er
 * gemeten worden op een lijst die nooit iemand gezien heeft.
 */
export async function slaBedrijvenOp(
  admin: Admin,
  marketId: string,
  bedrijven: readonly SamengevoegdBedrijf[],
): Promise<{ bedrijven: number; nieuw: number }> {
  let nieuw = 0;

  for (const b of bedrijven) {
    let companyId: string | null = null;

    if (b.domain) {
      const { data: bestaand } = await admin
        .from("sales_companies")
        .select("id")
        .eq("domain", b.domain)
        .maybeSingle();
      companyId = (bestaand?.id as string | undefined) ?? null;
    }

    if (!companyId) {
      const { data: ingevoegd, error } = await admin
        .from("sales_companies")
        .insert({
          domain: b.domain,
          name: b.name,
          name_source: b.naamHerkomst,
          city: b.city,
          crawl_status: b.domain ? "open" : "geen_website",
        })
        .select("id")
        .single();
      if (error) {
        // Een botsing op het unieke domein betekent dat een andere taak dit
        // bedrijf net aanmaakte. Dan is er niets mis; we pakken die rij op.
        if (error.code === "23505" && b.domain) {
          const { data: net } = await admin
            .from("sales_companies")
            .select("id")
            .eq("domain", b.domain)
            .maybeSingle();
          companyId = (net?.id as string | undefined) ?? null;
        }
        if (!companyId) {
          console.error(`Bedrijf ${b.name} opslaan mislukt:`, error.message);
          continue;
        }
      } else {
        companyId = ingevoegd.id as string;
        nieuw++;
      }
    }

    const { error: koppelFout } = await admin.from("sales_market_companies").insert({
      market_id: marketId,
      company_id: companyId,
      discovery_sources: b.bronnen,
      confidence: b.confidence,
      evidence_urls: b.evidenceUrls,
      discovery_note: beschrijfHerkomst(b),
    });
    // Bestond het lidmaatschap al, dan is dat precies wat de unieke index moet
    // doen en geen fout (conventie 9).
    if (koppelFout && koppelFout.code !== "23505") {
      console.error(`Lidmaatschap van ${b.name} opslaan mislukt:`, koppelFout.message);
    }
  }

  return { bedrijven: bedrijven.length, nieuw };
}

/** De hele verificatiestap: bronpagina's lezen, samenvoegen, opslaan. */
export async function verifieerMarkt(
  admin: Admin,
  marketId: string,
  kandidatenVanAi: readonly Kandidaat[],
  bronpaginaUrls: readonly string[],
): Promise<VerifyUitkomst> {
  const uitBronnen = await leesBronpaginas(bronpaginaUrls);

  // De naamnormalisatie komt uit `lib/entities/`, dezelfde die de meting straks
  // gebruikt om te bepalen of een bedrijf genoemd is. Eén definitie van "dezelfde
  // naam" door de hele module heen: zou de ontdekking anders normaliseren dan de
  // meting, dan telt een bedrijf bij het meten niet mee onder de naam waaronder
  // het in de lijst staat.
  const samengevoegd = voegKandidatenSamen(
    [...kandidatenVanAi, ...uitBronnen.kandidaten],
    normalizeEntityName,
  );

  const opgeslagen = await slaBedrijvenOp(admin, marketId, samengevoegd);

  return {
    bedrijven: opgeslagen.bedrijven,
    nieuw: opgeslagen.nieuw,
    bronpaginasGelezen: uitBronnen.gelukt,
    bronpaginasMislukt: uitBronnen.mislukt,
    afgekapt: uitBronnen.afgekapt,
  };
}
