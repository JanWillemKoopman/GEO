import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  SollicitatieBericht,
  SollicitatieChat,
  SollicitatieDocument,
} from "@/lib/types/database";
import { Assistent } from "./assistent";
import { Gesprekkenbalk } from "./gesprekkenbalk";

/**
 * De sollicitatieassistent: de enige pagina van het zijproject.
 *
 * `requireUser()` staat ook in `layout.tsx`, maar is gememoïseerd per verzoek
 * (`lib/auth.ts`): hem hier opnieuw vragen kost geen tweede netwerkronde naar
 * de Auth-server.
 *
 * ── WAAROM DE PAGINA LEEST EN DE ROUTES SCHRIJVEN ──────────────────────────
 *
 * Lezen gebeurt hier, op de server, met de service-role plus een expliciete
 * controle op `user_id`. Schrijven gebeurt nergens vanaf de client rechtstreeks
 * maar altijd via `app/api/solliciteren/` (conventie 6). Dat is dezelfde
 * verdeling als in de rest van de app, en de reden dat migratie 0095 wel een
 * selectpolicy heeft en geen insertpolicy.
 */
export default async function SolliciterenPagina({
  searchParams,
}: {
  searchParams: Promise<{ gesprek?: string }>;
}) {
  const user = await requireUser();
  const { gesprek } = await searchParams;

  const admin = createAdminClient();
  const { data: chatData } = await admin
    .from("sollicitatie_chats")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  const chats = (chatData ?? []) as SollicitatieChat[];

  // Het gevraagde gesprek, anders het laatste waaraan gewerkt is. Een id uit de
  // adresbalk dat niet van deze gebruiker is, staat niet in `chats` en valt dus
  // vanzelf terug: de lijst is al op `user_id` gefilterd.
  const actief = chats.find((c) => c.id === gesprek) ?? chats[0] ?? null;

  // Het dossier hangt aan de persoon en niet aan het gesprek (migratie 0096),
  // dus het wordt één keer geladen en geldt voor elk gesprek.
  const { data: documentData } = await admin
    .from("sollicitatie_documenten")
    .select("*")
    .eq("user_id", user.id);
  const documenten = (documentData ?? []) as SollicitatieDocument[];

  let berichten: SollicitatieBericht[] = [];
  if (actief) {
    const { data } = await admin
      .from("sollicitatie_berichten")
      .select("*")
      .eq("chat_id", actief.id)
      .order("created_at", { ascending: true });
    berichten = (data ?? []) as SollicitatieBericht[];
  }

  return (
    <div className="sol-binnen sol-binnen--breed">
      <header className="sol-kop">
        <div>
          <p className="sol-kop__label">Zijproject</p>
          <h1 className="sol-titel">Solliciteren</h1>
        </div>
        <div className="sol-kop__rechts">
          <span>Ingelogd als {user.email}</span>
          <Link className="sol-terug" href="/">
            Terug naar ORBIT ENGINE
          </Link>
        </div>
      </header>

      <Gesprekkenbalk chats={chats} actiefId={actief?.id ?? null} />

      {/* Ook zonder gesprek: je dossier staat er, en zodra je een vacature
          plakt maakt het werkblad zelf een gesprek aan. Dat scheelt een
          handeling bij elke sollicitatie. */}
      <Assistent
        key={actief?.id ?? "nieuw"}
        chat={actief}
        berichten={berichten}
        documenten={documenten}
      />
    </div>
  );
}
