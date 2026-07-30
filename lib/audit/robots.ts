/**
 * robots.txt lezen en toepassen (optimalisatie.md 3.5).
 *
 * `lib/crawler.ts` haalde robots.txt al op — maar alleen om de `Sitemap:`-regels
 * eruit te vissen; de rest werd weggegooid. Precies dáár staat of de AI-crawlers
 * überhaupt binnen mogen. Zonder die controle kan de app perfecte content laten
 * schrijven voor een site die ChatGPT de deur wijst.
 *
 * Bewust ZONDER `server-only`: pure tekstbewerking, testbaar in een kaal script.
 */

export interface RobotsRule {
  allow: boolean;
  /** Het pad-patroon zoals het in robots.txt staat, inclusief `*` en `$`. */
  path: string;
}

export interface RobotsGroup {
  /** Alle user-agents van deze groep, in kleine letters. */
  agents: string[];
  rules: RobotsRule[];
}

/**
 * Splitst robots.txt in groepen.
 *
 * Een groep is één of meer opeenvolgende `User-agent:`-regels gevolgd door de
 * regels die voor die agents gelden. Zodra er ná een regel weer een
 * `User-agent:` komt, begint een nieuwe groep — dat onderscheid is nodig, want
 *
 *     User-agent: A
 *     User-agent: B
 *     Disallow: /
 *
 * betekent iets anders dan twee losse groepen.
 *
 * Onbekende richtlijnen (`Crawl-delay`, `Sitemap`, `Host`) worden genegeerd:
 * die zeggen niets over toegang.
 */
export function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  // Stond de vorige regel ook op User-agent? Dan hoort deze bij dezelfde groep.
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;

    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      if (value) current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }

    if (field !== "allow" && field !== "disallow") continue;
    // Een regel zonder voorafgaande User-agent hoort nergens bij; overslaan.
    if (!current) continue;

    lastWasAgent = false;
    // "Disallow:" zonder waarde betekent "niets verboden" — geen regel dus.
    if (field === "disallow" && value === "") continue;
    current.rules.push({ allow: field === "allow", path: value });
  }

  return groups;
}

/**
 * Zet een robots.txt-patroon om in een reguliere expressie.
 *
 *   `*` staat voor "wat dan ook"
 *   `$` aan het eind betekent "en hier houdt de URL op"
 *   al het andere is letterlijk, dus moet ontsnapt worden
 */
function patternToRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;

  const escaped = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");

  return new RegExp(`^${escaped}${anchored ? "$" : ""}`);
}

/**
 * Kiest de groep die voor deze user-agent geldt.
 *
 * De regel uit de robots.txt-standaard: de LANGSTE naam die een prefix is van de
 * user-agent wint. Een site die `User-agent: *` op disallow zet maar
 * `User-agent: GPTBot` op allow, laat GPTBot dus wél binnen — en andersom. Alleen
 * kijken naar `*` zou hier precies het verkeerde antwoord geven.
 */
function selectGroup(groups: RobotsGroup[], userAgent: string): RobotsGroup | null {
  const ua = userAgent.toLowerCase();
  let best: { group: RobotsGroup; length: number } | null = null;
  let wildcard: RobotsGroup | null = null;

  for (const group of groups) {
    for (const agent of group.agents) {
      if (agent === "*") {
        wildcard ??= group;
        continue;
      }
      if (!ua.startsWith(agent)) continue;
      if (!best || agent.length > best.length) best = { group, length: agent.length };
    }
  }

  return best?.group ?? wildcard;
}

/**
 * Mag deze user-agent dit pad ophalen?
 *
 * Binnen de gekozen groep wint de LANGSTE overeenkomende regel; is er een
 * gelijkspel, dan wint Allow. Dat is de gangbare interpretatie (Google, en
 * inmiddels RFC 9309) en hij is niet vrijblijvend: bij
 *
 *     Disallow: /
 *     Allow: /blog
 *
 * is /blog toegestaan en de rest niet — met "eerste regel wint" zou de hele site
 * dicht zitten en zouden we de klant een blokkade melden die er niet is.
 */
export function isAllowed(groups: RobotsGroup[], userAgent: string, path = "/"): boolean {
  const group = selectGroup(groups, userAgent);
  if (!group) return true; // geen groep = geen beperking

  let bestLength = -1;
  let bestAllow = true;

  for (const rule of group.rules) {
    if (!patternToRegex(rule.path).test(path)) continue;
    // Bij gelijke lengte wint Allow, dus alleen overschrijven bij een LANGERE
    // regel — of bij dezelfde lengte als deze regel een Allow is.
    if (rule.path.length > bestLength || (rule.path.length === bestLength && rule.allow)) {
      bestLength = rule.path.length;
      bestAllow = rule.allow;
    }
  }

  return bestLength === -1 ? true : bestAllow;
}

/** De `Sitemap:`-regels. Gelden voor het hele bestand, los van de groepen. */
export function sitemapsFrom(text: string): string[] {
  return Array.from(text.matchAll(/^\s*sitemap:\s*(\S+)/gim)).map((m) => m[1].trim());
}
