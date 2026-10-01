/** Eén pagina van het voorbeeldaccount: wat de schrijver normaal oplevert. */
export interface DemoTekst {
  metaTitel: string;
  metaBeschrijving: string;
  /** Markdown, met ## als hoogste kop: de titel staat er los boven. */
  tekst: string;
  faq: { q: string; a: string }[];
}

/** Extra secties voor een pagina, ingevoegd vóór de afsluitende sectie (`uitbreiden()`). */
export interface Uitbreiding {
  tekst: string;
  faq?: { q: string; a: string }[];
}
