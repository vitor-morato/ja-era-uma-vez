// Caveira anterior compartilhada pelo jogo e pelo manual.
export function iconeCaveira() {
  return '<svg class="icone_caveira" viewBox="0 0 24 28" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M5 1h14v3h3v14h-4v9h-4v-5h-4v5H6v-9H2V4h3V1Zm1 7v5h5V8H6Zm7 0v5h5V8h-5Zm-2 7-2 4h6l-2-4h-2Z"/></svg>';
}

export function iconeNavegacao(simbolo) {
  const icones = {
    '↩': '<svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M9 7 4 12l5 5M4 12h10a5 5 0 0 0 0-10"/></svg>',
    '×': '<svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    '✓': '<svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="m4 12 5 5L20 6"/></svg>',
    '▶': '<svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M6 3v18l15-9Z" fill="currentColor" stroke="none"/></svg>',
    '↻': '<svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M5 8a8 8 0 1 1-1 8M5 3v6h6"/></svg>',
    '⌂': '<svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/></svg>',
  };
  return icones[simbolo] || simbolo;
}
