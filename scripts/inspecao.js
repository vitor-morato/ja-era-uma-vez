// Inspeção transitória. O intervalo permite ir da miniatura ao bloco ativo ampliado.
export function instalarInspecao(app, { obterSelecao, podeInspecionar, mostrar, fechar }) {
  let abrir = null,
    sair = null,
    ponteiro = null;
  const cancelarAbertura = () => {
    clearTimeout(abrir);
    abrir = null;
  };
  const cancelarSaida = () => {
    clearTimeout(sair);
    sair = null;
  };
  function sobreInspecao(alvo) {
    return Boolean(
      alvo?.closest?.('.carta_ampliada') ||
      Number(alvo?.closest?.('[data-carta]')?.dataset.carta) === obterSelecao(),
    );
  }
  function fecharDepois() {
    if (sair || obterSelecao() === null) return;
    sair = setTimeout(() => {
      sair = null;
      const alvo = ponteiro ? document.elementFromPoint(ponteiro.x, ponteiro.y) : null;
      const foco = document.activeElement;
      if (!entradaToque && !sobreInspecao(alvo) && !foco?.closest?.('.carta_ampliada')) fechar();
    }, 260);
  }
  app.addEventListener('pointerover', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    entradaToque = false;
    ponteiro = { x: ev.clientX, y: ev.clientY };
    if (sobreInspecao(ev.target)) cancelarSaida();
    const carta = ev.target.closest('[data-carta]');
    if (!carta || !podeInspecionar()) return;
    const id = Number(carta.dataset.carta);
    cancelarAbertura();
    abrir = setTimeout(() => {
      if (podeInspecionar()) mostrar(id);
    }, 180);
  });
  app.addEventListener('pointerout', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    cancelarAbertura();
    if (sobreInspecao(ev.relatedTarget)) cancelarSaida();
    else fecharDepois();
  });
  document.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'mouse') {
      ponteiro = { x: ev.clientX, y: ev.clientY };
      if (sobreInspecao(ev.target)) cancelarSaida();
      else fecharDepois();
    }
  });
  let entradaToque = false;
  app.addEventListener(
    'click',
    (ev) => {
      if (!ev.target.closest('[data-fechar-carta]')) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      cancelarAbertura();
      cancelarSaida();
      fechar();
    },
    { capture: true },
  );
  app.addEventListener('pointerdown', (ev) => {
    entradaToque = ev.pointerType !== 'mouse';
    if (entradaToque) {
      cancelarAbertura();
      cancelarSaida();
    }
  });
  // A seleção usa o clique nativo: levantar o dedo não fecha a carta.
  document.addEventListener('click', (ev) => {
    if (
      !entradaToque ||
      ev.target.closest('[data-carta],.carta_ampliada,.abrir_mao,.abrir_descarte,.consulta_poderes')
    )
      return;
    cancelarSaida();
    fechar();
  });
  // Ativações programáticas de teclado continuam acessíveis.
  app.addEventListener('focusin', (ev) => {
    if (ev.target.closest('.carta_ampliada')) cancelarSaida();
  });
  app.addEventListener('focusout', () => {
    if (!entradaToque) fecharDepois();
  });
  document.addEventListener('pointerout', (ev) => {
    if (ev.pointerType === 'mouse' && !ev.relatedTarget) {
      ponteiro = null;
      fecharDepois();
    }
  });
  window.addEventListener('blur', () => {
    cancelarAbertura();
    cancelarSaida();
    ponteiro = null;
    fechar();
  });
}

// Mouse abre por hover; no toque, a gaveta permanece até tocar fora.
export function instalarGavetas(app, { obterAberta, abrir, fechar, podeFechar = () => true }) {
  let saida = null;
  const cancelar = () => {
    clearTimeout(saida);
    saida = null;
  };
  function dentro(alvo) {
    const tipo = obterAberta();
    if (!tipo) return false;
    return Boolean(
      alvo?.closest?.(tipo === 'mao' ? '.mao_recolhida' : '.descarte_aberto, .abrir_descarte') ||
      alvo?.closest?.('.carta_ampliada,.consulta_poderes'),
    );
  }
  function agendar() {
    if (saida || !obterAberta()) return;
    saida = setTimeout(() => {
      saida = null;
      if (!entradaToque) {
        if (podeFechar()) fechar();
        else agendar();
      }
    }, 300);
  }
  app.addEventListener('pointerover', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const controle = ev.target.closest('.abrir_mao,.abrir_descarte');
    if (controle) {
      cancelar();
      const tipo = controle.classList.contains('abrir_mao') ? 'mao' : 'descarte';
      if (obterAberta() !== tipo) abrir(tipo);
    } else if (dentro(ev.target)) cancelar();
  });
  app.addEventListener('pointerout', (ev) => {
    if (ev.pointerType === 'mouse' && !dentro(ev.relatedTarget)) agendar();
  });
  document.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'mouse') {
      if (dentro(ev.target)) cancelar();
      else agendar();
    }
  });
  let entradaToque = false;
  app.addEventListener('pointerdown', (ev) => {
    entradaToque = ev.pointerType !== 'mouse';
    if (entradaToque) cancelar();
  });
  document.addEventListener('click', (ev) => {
    if (!entradaToque || !obterAberta() || dentro(ev.target) || !podeFechar()) return;
    cancelar();
    fechar({ preservarSelecao: Boolean(ev.target.closest('[data-carta],.carta_ampliada')) });
  });
  app.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && obterAberta() && podeFechar()) {
      cancelar();
      fechar();
    }
  });
  window.addEventListener('blur', () => {
    cancelar();
    fechar();
  });
}
