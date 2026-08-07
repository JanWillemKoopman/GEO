"use client";

import { Component, type ReactNode } from "react";

/**
 * Foutopvang per sectie, niet voor de hele pagina (B.12).
 *
 * `app/error.tsx` bestaat al, maar dat vangt de HELE pagina: crasht één
 * paneel binnen het dossier (bijvoorbeeld de trendgrafiek op een onverwachte
 * datavorm), dan verdwijnt de rest van het scherm mee, inclusief de knoppen
 * waarmee de klant net iets wilde doen. Dit component isoleert dat: alleen
 * de sectie die crasht toont een foutmelding, de rest van de pagina blijft
 * werken.
 *
 * Moet een class-component zijn: React kent `componentDidCatch` en
 * `getDerivedStateFromError` niet als hooks, alleen als methode op een klasse.
 */
interface Props {
  children: ReactNode;
  /** Naam van de sectie, voor de foutmelding en voor de console-log. */
  label: string;
}

interface State {
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Technische diagnose blijft in de console; de klant leest alleen de
    // gewone-taal-versie hieronder. Zelfde scheiding als ErrorNotice.
    console.error(`Sectie "${this.props.label}" crashte:`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card card-danger flex flex-col gap-2">
          <span className="chip chip-danger w-fit">Niet gelukt</span>
          <p className="text-secondary">
            {this.props.label} kon niet getoond worden. De rest van de pagina werkt gewoon door.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="btn-outline btn-sm w-fit"
          >
            Opnieuw proberen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
