// Abre por hover, foco ou pressão; só consulta, nunca gasta ações.
export function instalarConsultaPoderes(app) {
  let saida = null,
    toque = null;
  function fechar() {
    clearTimeout(saida);
    saida = null;
    for (const botao of app.querySelectorAll('.abrir_poderes'))
      botao.setAttribute('aria-expanded', 'false');
    for (const painel of app.querySelectorAll('.painel_poderes')) painel.hidden = true;
  }
  function abrir(botao) {
    fechar();
    botao.setAttribute('aria-expanded', 'true');
    const painel = document.getElementById(botao.getAttribute('aria-controls'));
    if (painel) painel.hidden = false;
  }
  function naLista(alvo) {
    return alvo?.closest?.('.consulta_poderes');
  }
  app.addEventListener('pointerover', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const botao = ev.target.closest('.abrir_poderes');
    if (botao) abrir(botao);
    else if (naLista(ev.target)) {
      clearTimeout(saida);
      saida = null;
    }
  });
  app.addEventListener('pointerout', (ev) => {
    if (ev.pointerType === 'mouse' && !naLista(ev.relatedTarget)) {
      clearTimeout(saida);
      saida = setTimeout(fechar, 220);
    }
  });
  app.addEventListener('focusin', (ev) => {
    const botao = ev.target.closest('.abrir_poderes');
    if (botao && !toque) abrir(botao);
  });
  app.addEventListener('focusout', (ev) => {
    if (!toque && !naLista(ev.relatedTarget)) saida = setTimeout(fechar, 220);
  });
  app.addEventListener(
    'pointerdown',
    (ev) => {
      toque = ev.pointerType !== 'mouse';
    },
    { capture: true },
  );
  app.addEventListener('click', (ev) => {
    if (!toque) return;
    const botao = ev.target.closest('.abrir_poderes');
    if (botao) {
      if (botao.getAttribute('aria-expanded') === 'true') fechar();
      else abrir(botao);
    }
  });
  document.addEventListener('click', (ev) => {
    if (toque && !naLista(ev.target)) fechar();
  });
  app.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') fechar();
  });
  window.addEventListener('blur', fechar);
}
