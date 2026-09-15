"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SollicitatieChat } from "@/lib/types/database";

/**
 * De rij met gesprekken bovenaan, plus de knop om er een te beginnen.
 *
 * Waarom een rij knoppen en geen zijbalk: dit scherm is van één persoon met een
 * handvol vacatures tegelijk, niet van iemand met honderd gesprekken. Een
 * zijbalk zou ruimte kosten die de brief beter kan gebruiken.
 */
export function Gesprekkenbalk({
  chats,
  actiefId,
}: {
  chats: SollicitatieChat[];
  actiefId: string | null;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function nieuw() {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/solliciteren/chats", { method: "POST" });
      const data = (await res.json()) as { chat?: SollicitatieChat; error?: string };
      if (!res.ok || !data.chat) {
        setFout(data.error ?? "Het gesprek aanmaken is niet gelukt.");
        return;
      }
      router.push(`/solliciteren?gesprek=${data.chat.id}`);
      router.refresh();
    } catch {
      setFout("De verbinding viel weg. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  async function verwijder(id: string) {
    if (!window.confirm("Dit gesprek en alle berichten erin verdwijnen. Doorgaan?")) return;
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/solliciteren/chats/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setFout(data.error ?? "Het verwijderen is niet gelukt.");
        return;
      }
      router.push("/solliciteren");
      router.refresh();
    } catch {
      setFout("De verbinding viel weg. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <nav className="sol-gesprekken" aria-label="Gesprekken">
      <button type="button" className="sol-knop sol-knop--klein" onClick={nieuw} disabled={bezig}>
        Nieuw gesprek
      </button>

      <ul className="sol-gesprekken__lijst">
        {chats.map((chat) => {
          const actief = chat.id === actiefId;
          return (
            <li key={chat.id}>
              <Link
                className={`sol-tab${actief ? " sol-tab--actief" : ""}`}
                href={`/solliciteren?gesprek=${chat.id}`}
                aria-current={actief ? "page" : undefined}
                title={chat.titel}
              >
                {chat.titel}
              </Link>
              {actief ? (
                <button
                  type="button"
                  className="sol-tab__weg"
                  onClick={() => verwijder(chat.id)}
                  disabled={bezig}
                  aria-label={`Gesprek "${chat.titel}" verwijderen`}
                >
                  ×
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {fout ? <p className="sol-fout">{fout}</p> : null}
    </nav>
  );
}
