import type { ContentAction, ContentType } from "@/lib/types/database";

/**
 * De voorgestelde URL van een pagina, en welke URL écht klopt (content-editie,
 * onderdeel 2: search preview).
 *
 * Stond eerder alleen lokaal in `publish-guide.tsx` als niet-geëxporteerde
 * `slugFrom()`. De nieuwe `SearchPreview` heeft dezelfde logica nodig, en een
 * tweede kopie zou kunnen gaan afwijken van de eerste (conventie 1: een feit
 * heeft één eigenaar). `publish-guide.tsx` importeert nu hiervandaan.
 */
export function slugFrom(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // diakrieten weg (Unicode-range combining marks), "cafe" blijft "cafe"
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "nieuwe-pagina"
  );
}

/** Waar dit type pagina doorgaans hoort te staan. */
export const CONTENT_TYPE_PATH_HINT: Record<ContentType, string> = {
  article: "kennis",
  faq: "veelgestelde-vragen",
  landing: "",
  comparison: "vergelijken",
};

export function suggestedPath(title: string, type: ContentType): string {
  const slug = slugFrom(title);
  const prefix = CONTENT_TYPE_PATH_HINT[type];
  return prefix ? `/${prefix}/${slug}` : `/${slug}`;
}

export function suggestedUrl(siteUrl: string, title: string, type: ContentType): string {
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${host}${suggestedPath(title, type)}`;
}

export interface ResolvedUrl {
  url: string;
  /** true = dit is een echte, bestaande URL. false = een voorstel, geen belofte. */
  isReal: boolean;
}

/**
 * Welke URL toon je bij deze pagina? Drie mogelijke bronnen, in volgorde van
 * zekerheid: al gepubliceerd (dan is de URL een feit), verbetert een
 * bestaande pagina (dan is die URL ook een feit, ook al staat de nieuwe tekst
 * er nog niet op), of geen van beide (dan is het een voorstel, en dat mag de
 * UI nooit als feit tonen, vandaar `isReal`, conventie 3).
 */
export function resolvedContentUrl(args: {
  publishedUrl: string | null;
  action: ContentAction;
  existingUrl: string | null;
  siteUrl: string;
  title: string;
  type: ContentType;
}): ResolvedUrl {
  if (args.publishedUrl) return { url: args.publishedUrl, isReal: true };
  if (args.action === "verbeteren" && args.existingUrl) {
    return { url: args.existingUrl, isReal: true };
  }
  return { url: suggestedUrl(args.siteUrl, args.title, args.type), isReal: false };
}
