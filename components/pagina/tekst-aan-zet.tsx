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
    // Zolang er punten zijn die publicatie tegenhouden, is "Keur goed" niet de
    // volgende stap: de eindpoort zou hem toch weigeren. Dan wijst de knop naar
    // die punten, en zegt de zin hoeveel het er zijn.
    if (blokkades > 0) {
      return (
        <AanZet
          stand={{
            ...stand,
            zin: `De tekst is klaar, maar ${blokkades === 1 ? "er staat nog 1 punt" : `er staan nog ${blokkades} punten`} open die publicatie tegenhouden. Los ze op, of vraag een aanpassing.`,
          }}
          actie={
            <a href="#rail" className="btn-primary">
              {blokkades === 1 ? "Bekijk het punt" : `Bekijk de ${blokkades} punten`}
            </a>
          }
          tweede={
            <a href="#aanpassen" className="btn-outline">
              Vraag een aanpassing
            </a>
          }
        />
      );
    }
    return (
      <AanZet
        stand={stand}
        actie={<KeurGoedKnop analysisId={analysisId} pieceId={pieceId} />}
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

