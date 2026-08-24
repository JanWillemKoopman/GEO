import Link from "next/link";
import { OrbitMark } from "./orbit-mark";

/**
 * De kop boven elke inlogkaart: merkteken, woordmerk, belofte.
 *
 * Het woordmerk staat hier in twee volle kleuren en niet in het verloop van
 * `.brand-gradient-text`. Reden: het merkteken erboven draagt het verloop al,
 * en twee verlopen boven elkaar maken van het woord een vlek in plaats van een
 * naam. Groen voor ORBIT en paars voor ENGINE is dezelfde twee-kleurenlogica,
 * maar dan leesbaar op elke schermgrootte.
 */
export function AuthBrand() {
  return (
    <div className="mb-8 flex flex-col items-center text-center sm:mb-10">
      <Link href="/" className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)]">
        <OrbitMark size={72} gradientId="orbit-mark-kop" className="h-16 w-16 sm:h-[72px] sm:w-[72px]" />
        <span className="text-[1.75rem] font-extrabold leading-none tracking-[0.07em] sm:text-[2rem]">
          <span style={{ color: "#37941c" }}>ORBIT</span>{" "}
          <span style={{ color: "#8511d9" }}>ENGINE</span>
        </span>
      </Link>
      <p className="mt-3 text-sm text-secondary">
        Zichtbaar zijn in AI-antwoorden. Gemeten, niet gegokt.
      </p>
    </div>
  );
}
