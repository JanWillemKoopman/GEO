import type { KoppelStatus } from "@/lib/search-console/koppelstatus";

/**
 * Het bolletje met de tekst ernaast. Eén component voor de tabel en het
 * formulier, zodat groen op beide plekken hetzelfde betekent.
 */
export function KoppelStatusLabel({ status }: { status: KoppelStatus }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden
        className={`status-dot ${status.goed ? "status-dot-goed" : "status-dot-fout"}`}
      />
      <span className={status.goed ? "" : "text-secondary"}>{status.label}</span>
    </span>
  );
}
