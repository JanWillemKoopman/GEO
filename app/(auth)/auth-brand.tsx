import Link from "next/link";
import { OrbitMark } from "./orbit-mark";

/**
 * De kop boven elke inlogkaart: merkteken, woordmerk, belofte.
 *
 * Het woordmerk gebruikt dezelfde `.brand-wordmark` als de header binnen de
 * app. Dat is sinds 24 augustus 2026 zo: hiervóór stond ORBIT hier in groen en
 * ENGINE in paars, en dan zag een klant vóór het inloggen een ander logo dan
 * erna. Eén regel in `app/globals.css` bepaalt nu hoe de naam er overal
 * uitziet.
 *
 * De kleur zit in het merkteken erboven en niet in de letters: een gekleurd
 * symbool met een neutrale naam eronder leest als een merk, twee gekleurde
 * dingen naast elkaar als versiering.
 */
export function AuthBrand() {
  return (
    <div className="mb-8 flex flex-col items-center text-center sm:mb-10">
      <Link href="/" className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)]">
        <OrbitMark
          size={72}
          gradientId="orbit-mark-kop"
          className="h-16 w-16 sm:h-[72px] sm:w-[72px]"
        />
        {/* Geen `tracking`-utility hier: `.brand-wordmark` zet de letterafstand
            zelf, en twee plekken die daarover gaan lopen gegarandeerd uiteen. */}
        <span className="brand-wordmark text-[1.75rem] font-bold leading-none sm:text-[2rem]">
          ORBIT ENGINE
        </span>
      </Link>
      <p className="mt-3 text-sm text-secondary">
        Zichtbaar zijn in AI-antwoorden. Gemeten, niet gegokt.
      </p>
    </div>
  );
}
