import { AanZet } from "@/components/pagina/aan-zet";
import { KeurGoedKnop } from "@/components/pagina/knoppen";
import { PuntenKnop } from "@/components/pagina/punten-knop";
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
    // Met open punten is "Los de punten op" de hoofdknop (23 september 2026,
    // tweede ronde). Daarvoor stond hier "Keur goed" met "Vraag een aanpassing"
    // ernaast, en die tweede knop sprong naar een vak onderaan waar je nog een
    // keer moest klikken; de eigenaar vond hem onduidelijk. Goedkeuren blijft
    // altijd kunnen (Bijlage D punt 1), alleen als tweede knop, en met open
    // punten vraagt hij nog steeds één keer extra bevestiging.
    if (blokkades > 0) {
      const zin = `De tekst is klaar om te beoordelen. ${blokkades === 1 ? "Er staat nog 1 punt" : `Er staan nog ${blokkades} punten`} open. We lopen ${blokkades === 1 ? "het" : "ze"} één voor één met je door, of je keurt de tekst toch goed.`;
      return (
        <AanZet
          stand={{ ...stand, zin }}
          actie={<PuntenKnop aantal={blokkades} />}
          tweede={<KeurGoedKnop analysisId={analysisId} pieceId={pieceId} openPunten={blokkades} rustig />}
        />
      );
    }
    return (
      <AanZet
        stand={stand}
        actie={<KeurGoedKnop analysisId={analysisId} pieceId={pieceId} openPunten={0} />}
        tweede={
          <a href="#aanpassen" className="btn-outline">
            Laat iets aanpassen
          </a>
        }
      />
    );
  }
  // Live zetten en daarna: het adresveld en de uitslag van de controle staan in
  // dezelfde kaart, zodat de handeling en de uitleg bij elkaar horen.
  return <AanZet stand={stand}>{publiceren}</AanZet>;
}

