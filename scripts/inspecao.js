// Inspeção transitória. O intervalo permite ir da miniatura ao bloco ativo ampliado.
export function instalarInspecao(
  app,
  { obterSelecao, podeInspecionar, podeInspecionarToque = () => true, mostrar, fechar },
) {
  let abrir = null,
    sair = null,
    toque = null,
    bloquearClique = false,
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
      if (!toque && !sobreInspecao(alvo) && !foco?.closest?.('.carta_ampliada')) fechar();
    }, 260);
  }
  app.addEventListener('pointerover', (ev) => {
    if (ev.pointerType !== 'mouse') return;
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
    if (toque && !toque.aberto && Math.hypot(ev.clientX - toque.x, ev.clientY - toque.y) > 10)
      cancelarAbertura();
  });
  app.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType !== 'touch' || !podeInspecionar() || !podeInspecionarToque()) return;
    const carta = ev.target.closest('[data-carta]');
    if (!carta) return;
    cancelarAbertura();
    cancelarSaida();
    bloquearClique = true;
    toque = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, aberto: false };
    const id = Number(carta.dataset.carta);
    abrir = setTimeout(() => {
      if (toque && podeInspecionar()) {
        toque.aberto = true;
        mostrar(id);
      }
    }, 300);
  });
  function terminarToque(ev) {
    if (!toque || ev.pointerId !== toque.id) return;
    cancelarAbertura();
    const abriu = toque.aberto;
    toque = null;
    if (abriu && ev.type === 'pointerup') {
      const botao = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest?.('.carta_ampliada button');
      // Segure a miniatura, deslize até o bloco ativo e solte para confirmar a ativação.
      if (botao && !botao.disabled) botao.click();
    }
    if (abriu) fechar();
    setTimeout(() => {
      bloquearClique = false;
    }, 100);
  }
  document.addEventListener('pointerup', terminarToque);
  document.addEventListener('pointercancel', terminarToque);
  app.addEventListener(
    'click',
    (ev) => {
      if (bloquearClique && ev.isTrusted) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
  // Ativações programáticas de teclado continuam acessíveis.
  app.addEventListener('focusin', (ev) => {
    if (ev.target.closest('.carta_ampliada')) cancelarSaida();
  });
  app.addEventListener('focusout', fecharDepois);
  document.addEventListener('pointerout', (ev) => {
    if (ev.pointerType === 'mouse' && !ev.relatedTarget) {
      ponteiro = null;
      fecharDepois();
    }
  });
  window.addEventListener('blur', () => {
    cancelarAbertura();
    cancelarSaida();
    toque = null;
    ponteiro = null;
    bloquearClique = false;
    fechar();
  });
}

// Gavetas abertas por clique/pressão: sair da região recolhe sem botão extra.
export function instalarGavetas(
  app,
  { obterAberta, abrir, fechar, construindo, podeFechar = () => true },
) {
  let saida = null,
    toque = null,
    bloquear = false;
  const cancelar = () => {
    clearTimeout(saida);
    saida = null;
  };
  function dentro(alvo) {
    const tipo = obterAberta();
    if (!tipo) return false;
    return Boolean(
      alvo?.closest?.(tipo === 'mao' ? '.mao_recolhida' : '.descarte_aberto, .abrir_descarte') ||
      alvo?.closest?.('.carta_ampliada'),
    );
  }
  function agendar() {
    if (saida || !obterAberta()) return;
    saida = setTimeout(() => {
      saida = null;
      if (!toque) {
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
  app.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType !== 'touch') return;
    const controle = ev.target.closest('.abrir_mao,.abrir_descarte');
    if (!controle && !dentro(ev.target)) return;
    cancelar();
    toque = { id: ev.pointerId, controle: Boolean(controle) };
    if (controle) {
      bloquear = true;
      abrir(controle.classList.contains('abrir_mao') ? 'mao' : 'descarte');
    }
  });
  function terminar(ev) {
    if (!toque || ev.pointerId !== toque.id) return;
    const iniciouControle = toque.controle;
    toque = null;
    cancelar();
    if (app.dataset.gestoConstrucaoConcluido === 'true') {
      bloquear = false;
      return;
    }
    const alvo = document.elementFromPoint(ev.clientX, ev.clientY);
    if (ev.type === 'pointerup' && construindo() && alvo?.closest?.('.faixa_mao [data-carta]')) {
      bloquear = true;
      alvo.closest('[data-carta]').click();
    } else if (ev.type === 'pointerup' && iniciouControle && alvo?.closest?.('[data-carta]'))
      alvo.closest('[data-carta]').click();
    // Deixa o clique nativo de uma carta terminar antes de recolher a região.
    setTimeout(() => {
      if (podeFechar()) fechar();
      else agendar();
      bloquear = false;
    }, 80);
  }
  document.addEventListener('pointerup', terminar);
  document.addEventListener('pointercancel', terminar);
  app.addEventListener(
    'click',
    (ev) => {
      if (bloquear && ev.isTrusted) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
  app.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && obterAberta() && podeFechar()) {
      cancelar();
      fechar();
    }
  });
  window.addEventListener('blur', () => {
    cancelar();
    toque = null;
    bloquear = false;
    fechar();
  });
}
