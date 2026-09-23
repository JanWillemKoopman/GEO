import { AanZet } from "@/components/pagina/aan-zet";
import { KeurGoedKnop } from "@/components/pagina/knoppen";
import type { PaginaStand } from "@/lib/pagina-stand";

/** De kaart "Aan zet" zodra er tekst is. Eén hoofdknop, die de stand volgt. */
export function TekstAanZet({
  stand,
  analysisId,
  pieceId,
  blokkades,
  publiceren,
}: {
  stand: PaginaStand;
  analysisId: string;
  pieceId: string;
  blokkades: number;
  publiceren: React.ReactNode;
}) {
  if (stand.sleutel === "goedkeuren") {
    // Met open punten blijft "Keur goed" de hoofdknop (23 september 2026): de
    // klant beslist of de tekst goed genoeg is, en de knop vraagt dan één keer
    // extra bevestiging. De zin zegt waar de punten staan, want dat is wat
    // iemand hierna wil weten.
    const zin =
      blokkades > 0
        ? `De tekst is klaar om te beoordelen. ${blokkades === 1 ? "Er staat nog 1 punt" : `Er staan nog ${blokkades} punten`} open onder "Te verbeteren". Los ${blokkades === 1 ? "het" : "ze"} op, of keur de tekst toch goed.`
        : stand.zin;
    return (
      <AanZet
        stand={{ ...stand, zin }}
        actie={<KeurGoedKnop analysisId={analysisId} pieceId={pieceId} openPunten={blokkades} />}
        tweede={
          <a href="#aanpassen" className="btn-outline">
            Vraag een aanpassing
          </a>
        }
      />
    );
  }
  // Live zetten en daarna: het adresveld en de uitslag van de controle staan in
  // dezelfde kaart, zodat de handeling en de uitleg bij elkaar horen.
  return <AanZet stand={stand}>{publiceren}</AanZet>;
}

