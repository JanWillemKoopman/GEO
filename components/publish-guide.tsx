import { InfoHint } from "@/components/info-hint";
import { ExternalLink } from "@/components/external-link";
import { suggestedPath } from "@/lib/pipeline/slug";
import type { ContentAction, ContentType } from "@/lib/types/database";

/**
 * Wat moet de klant hier nu mee? (optimalisatie.md 4.15)
 *
 * De app levert tekst, metagegevens en gestructureerde data, en geen woord
 * uitleg over wat je daarmee doet. Zonder dat blijft de content in de
 * bibliotheek liggen, en dan gebeurt er niets, hoe goed hij ook is. Dit is de
 * laatste meter tussen "de app heeft iets gemaakt" en "het staat live".
 *
 * De toon is die van een collega die het even voordoet, niet die van een
 * handleiding: de doelgroep is een ondernemer, niet een webbouwer.
 */

export function PublishGuide({
  title,
  type,
  action,
  existingUrl,
  siteUrl,
  hasSchema,
}: {
  title: string;
  type: ContentType;
  action: ContentAction;
  existingUrl: string | null;
  siteUrl: string;
  hasSchema: boolean;
}) {
  const path = suggestedPath(title, type);
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  return (
    <div className="card flex flex-col gap-3">
      <span className="mono-label flex items-center gap-1">
        Wat doe je hiermee?
        <InfoHint label="Publiceren">
          Een tekst die in je bibliotheek blijft liggen, levert niets op. Deze stappen zijn alles
          wat er nog tussen zit.
        </InfoHint>
      </span>

      <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm text-secondary">
        <li>
          {action === "verbeteren" && existingUrl ? (
            <>
              <span className="font-medium text-[var(--text-primary)]">
                Werk je bestaande pagina bij.
              </span>{" "}
              Deze tekst is bedoeld als vervanging voor{" "}
              <ExternalLink href={existingUrl}>{existingUrl}</ExternalLink>
              . Houd dezelfde URL aan, want die heeft al waarde opgebouwd. Een nieuwe URL begint
              weer bij nul.
            </>
          ) : (
            <>
              <span className="font-medium text-[var(--text-primary)]">Maak een nieuwe pagina.</span>{" "}
              Voorstel voor het adres:{" "}
              <code className="rounded bg-[var(--bg-elevated)] px-1 py-0.5 text-xs">
                {host}
                {path}
              </code>
              . Kort, met woorden uit de vraag erin, en zonder datum of nummers.
            </>
          )}
        </li>

        <li>
          <span className="font-medium text-[var(--text-primary)]">Plak de tekst.</span> Gebruik de
          knop &ldquo;Kopieer als HTML&rdquo; hierboven als je CMS een tekstveld heeft, of de
          Markdown-versie als het daarmee werkt. Zet de meta-title en meta-description in de
          SEO-velden van je CMS, meestal onderaan de pagina-instellingen.
        </li>

        {hasSchema && (
          <li>
            <span className="font-medium text-[var(--text-primary)]">
              Zet de gestructureerde data erbij.
            </span>{" "}
            Dat is het JSON-LD-blok hierboven. Het hoort in de <code>&lt;head&gt;</code> van deze
            ene pagina. In WordPress kan dat met een SEO-plugin of een blokje &ldquo;custom
            HTML&rdquo;; weet je het niet zeker, dan is dit het stukje waarvoor je je webbouwer
            even nodig hebt. Het is geen verplichting, maar het helpt AI-assistenten begrijpen
            waar de pagina over gaat.
          </li>
        )}

        <li>
          <span className="font-medium text-[var(--text-primary)]">Link ernaartoe.</span> Zet vanaf
          je homepage of een relevante bestaande pagina een link naar deze nieuwe pagina. Een pagina
          waar nergens naartoe gelinkt wordt, wordt slecht gevonden, ook door AI-crawlers.
        </li>
      </ol>

      <p className="text-sm text-muted">
        Staat hij live? Dan zie je het effect bij de volgende maandelijkse meting. AI-assistenten
        pikken een nieuwe pagina meestal binnen enkele weken op.
      </p>
    </div>
  );
}
