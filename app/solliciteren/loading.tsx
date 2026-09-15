/**
 * De wachtvorm: wat er staat terwijl de pagina wordt klaargezet.
 *
 * Zonder dit bestand laat Next.js na een klik het vorige scherm staan tot het
 * nieuwe klaar is. Er verandert dan niets zichtbaars, en dat leest als een knop
 * die niet werkt. Zelfde afspraak als in de rest van de app, zie de controle
 * "elk scherm met data heeft een wachtvorm" in `scripts/test-unit.ts`.
 */
export default function Laden() {
  return (
    <div className="sol-binnen">
      <div className="sol-skelet sol-skelet--titel" />
      <div className="sol-skelet sol-skelet--blok" />
    </div>
  );
}
