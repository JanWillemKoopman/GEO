import { ChartColumn, Search, Sparkles, Target } from "lucide-react";
import { OrbitMark } from "../orbit-mark";

/**
 * Het beeld in het merkpaneel: het merkteken in het midden, drie banen
 * eromheen, en op de hoeken de vier dingen die ORBIT ENGINE met een merk doet.
 *
 * ── WAAROM DE ICONEN HIER NIET UIT `lib/icons.ts` KOMEN ─────────────────────
 *
 * Die set is een betekenisregister voor de app-chrome: een naam is daar een
 * betekenis en geen tekening ("overzicht", niet "cirkel"). Deze vier zijn geen
 * navigatie en geen status, ze zijn decor met een knipoog naar wat het product
 * doet: opvallen, meten, vinden, raken. Ze in dat register persen zou er vier
 * namen aan toevoegen die nergens anders opgaan.
 *
 * De hele figuur staat op `aria-hidden`. Een schermlezer die "vergrootglas,
 * staafdiagram, vonken, schietschijf" voorleest boven een inlogformulier krijgt
 * vier woorden zonder betekenis; de belofte staat als tekst in het paneel
 * ernaast en die wordt wél voorgelezen.
 */
export function OrbitVisual() {
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-[330px]">
      {/* Drie banen, als percentage van de figuur en niet in pixels: op een
          tablet is het paneel smaller en moet de hele figuur meekrimpen, niet
          alleen zijn buitenrand. */}
      <div className="auth-viz-ring h-[72.7%] w-[72.7%]" />
      <div className="auth-viz-ring h-[51.5%] w-[51.5%]" />
      <div className="auth-viz-ring h-[31.5%] w-[31.5%]" />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <OrbitMark size={58} gradientId="orbit-mark-paneel" />
      </div>

      {/* Drie lichamen, elk op een andere hoogte in de baan, zodat het oog ziet
          dat het er drie zijn en geen driehoek. */}
      <span
        className="absolute h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: "79.8%", top: "29.1%", backgroundColor: "#8511d9", opacity: 0.5 }}
      />
      <span
        className="absolute h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: "41.2%", top: "74.2%", backgroundColor: "#37941c", opacity: 0.55 }}
      />
      <span
        className="absolute h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: "57.6%", top: "85.6%", backgroundColor: "#8511d9", opacity: 0.35 }}
      />

      {/* Opvallen en meten in paars, vinden en raken in groen: dezelfde
          tweedeling als in het woordmerk, en dus geen willekeurige kleuring. */}
      <span className="auth-tile left-0 top-0">
        <Sparkles size={22} strokeWidth={1.75} style={{ color: "#8511d9" }} />
      </span>
      <span className="auth-tile right-0 top-0">
        <ChartColumn size={22} strokeWidth={1.75} style={{ color: "#8511d9" }} />
      </span>
      <span className="auth-tile bottom-0 left-0">
        <Search size={22} strokeWidth={1.75} style={{ color: "#37941c" }} />
      </span>
      <span className="auth-tile bottom-0 right-0">
        <Target size={22} strokeWidth={1.75} style={{ color: "#37941c" }} />
      </span>
    </div>
  );
}
