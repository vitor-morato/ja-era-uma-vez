import { audioJogo } from './audio.js';
import { validar } from './regras.js';
// A troca é apenas visual durante o gesto; a regra só é executada ao soltar.
export function instalarMovimento(
  app,
  {
    obterEstado,
    obterModo,
    agir,
    avisar,
    podeAtalho = () => false,
    entrarModo = () => {},
    temAtiva = () => false,
    limparAvisoBloqueio = () => {},
  },
) {
  let gesto = null,
    bloquearClique = false,
    espera = null,
    ultimoClique = null;
  const retornos = new Set();
  function limparBloqueio(g) {
    g.sinalBloqueio?.classList.remove('bloqueio_movimento');
    g.sinalBloqueio = null;
    if (g.alertado) {
      limparAvisoBloqueio();
      g.alertado = null;
    }
  }
  function sinalizarBloqueio(g, direcao, motivo) {
    const sinal = g.vizinhas.get(direcao)?.elemento;
    if (!sinal) return;
    if (g.sinalBloqueio !== sinal) {
      g.sinalBloqueio?.classList.remove('bloqueio_movimento');
      g.sinalBloqueio = sinal;
    }
    sinal.classList.add('bloqueio_movimento');
    if (g.alertado !== motivo) {
      g.alertado = motivo;
      avisar(motivo + ' Nenhuma ação foi gasta.', 'bloqueio');
    }
  }
  function limparVizinhas() {
    app
      .querySelectorAll('.vizinha_disponivel,.vizinha_movimento')
      .forEach((c) => c.classList.remove('vizinha_disponivel', 'vizinha_movimento'));
  }
  function mostrarVizinhas(id) {
    limparVizinhas();
    const e = obterEstado(),
      i = e.fila.findIndex((c) => c.id === id);
    for (const direcao of [-1, 1])
      if (!validar(e, { tipo: 'mover', carta: id, direcao }))
        app
          .querySelector('.fila_compartilhada [data-carta="' + e.fila[i + direcao].id + '"]')
          .classList.add('vizinha_disponivel');
  }
  function cancelarEspera() {
    espera = null;
    delete app.dataset.preparandoMovimento;
    limparVizinhas();
  }
  function pararRetornos() {
    for (const fim of [...retornos]) fim();
  }
  function restaurar(g) {
    g.elemento.style.cssText = g.estilo;
    g.elemento.classList.remove('arrastando', 'carta_pressionada');
    for (const alvo of g.vizinhas.values()) {
      alvo.elemento.style.cssText = alvo.estilo;
      alvo.elemento.classList.remove('previa_troca');
    }
  }
  function terminarAnimacao(camada, destino, aoTerminar) {
    let animacao,
      concluida = false;
    const fim = () => {
      if (concluida) return;
      concluida = true;
      retornos.delete(fim);
      animacao?.cancel();
      camada.remove();
      aoTerminar();
    };
    retornos.add(fim);
    const r = camada.getBoundingClientRect();
    animacao = camada.animate(
      [
        { left: r.left + 'px', top: r.top + 'px' },
        { left: destino.left + 'px', top: destino.top + 'px' },
      ],
      { duration: 2000, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' },
    );
    animacao.finished.then(fim, () => {});
  }
  function capturar(elemento, ev, origem = elemento.getBoundingClientRect()) {
    const estilo = elemento.style.cssText;
    elemento.style.setProperty('transition', 'none', 'important');
    elemento.style.setProperty('translate', '0 0', 'important');
    elemento.classList.add('carta_pressionada', 'arrastando');
    const base = elemento.getBoundingClientRect(),
      e = obterEstado(),
      i = e.fila.findIndex((c) => c.id === Number(elemento.dataset.carta));
    const vizinhas = new Map();
    for (const direcao of [-1, 1]) {
      const carta = e.fila[i + direcao];
      if (!carta) continue;
      const el = app.querySelector('.fila_compartilhada [data-carta="' + carta.id + '"]');
      vizinhas.set(direcao, {
        elemento: el,
        caixa: el.getBoundingClientRect(),
        estilo: el.style.cssText,
      });
    }
    gesto = {
      elemento,
      id: Number(elemento.dataset.carta),
      estilo,
      base,
      vizinhas,
      inicioX: ev.clientX,
      inicioY: ev.clientY,
      agarreX: ev.clientX - base.left,
      agarreY: ev.clientY - base.top,
      ponteiro: ev.pointerId,
      direcao: null,
      arrastou: false,
      sobreposta: null,
    };
    elemento.setPointerCapture(ev.pointerId);
    mostrarVizinhas(gesto.id);
  }
  function sobrepor(g) {
    if (g.sobreposta) return;
    audioJogo.tocar('pegar');
    const camada = document.createElement('div');
    camada.className = 'jogo carta_arraste_sobreposta';
    camada.setAttribute('aria-hidden', 'true');
    camada.inert = true;
    const estilo = getComputedStyle(g.elemento);
    for (const v of ['--largura_carta', '--lado_retrato', '--altura_carta', '--desnivel_j2'])
      camada.style.setProperty(v, estilo.getPropertyValue(v));
    Object.assign(camada.style, {
      width: g.base.width + 'px',
      height: g.base.height + 'px',
      left: g.base.left + 'px',
      top: g.base.top + 'px',
    });
    const copia = g.elemento.cloneNode(true);
    copia.removeAttribute('data-carta');
    copia.removeAttribute('id');
    copia.className = 'carta arrastando';
    copia.style.cssText = '';
    copia.style.setProperty('margin', '0', 'important');
    copia.style.setProperty('translate', '0 0', 'important');
    Object.assign(copia.style, { width: g.base.width + 'px', height: g.base.height + 'px' });
    const originais = [g.elemento, ...g.elemento.querySelectorAll('*')],
      copias = [copia, ...copia.querySelectorAll('*')];
    originais.forEach((original, i) => {
      const css = getComputedStyle(original);
      for (const propriedade of [
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'letter-spacing',
        'text-transform',
        'color',
      ])
        copias[i].style.setProperty(propriedade, css.getPropertyValue(propriedade));
    });
    camada.append(copia);
    document.body.append(camada);
    g.sobreposta = camada;
    g.elemento.style.opacity = '0';
  }
  function previa(g, direcao) {
    if (g.direcao === direcao) return;
    if (g.direcao !== null) {
      const anterior = g.vizinhas.get(g.direcao);
      anterior.elemento.classList.remove('previa_troca');
      anterior.elemento.style.setProperty('translate', '0 0', 'important');
    }
    g.direcao = direcao;
    if (direcao !== null) audioJogo.tocar('troca');
    if (direcao !== null) {
      const alvo = g.vizinhas.get(direcao);
      alvo.elemento.classList.add('previa_troca');
      alvo.elemento.style.setProperty(
        'transition',
        'translate 2000ms cubic-bezier(.2,.7,.2,1)',
        'important',
      );
      alvo.elemento.style.setProperty(
        'translate',
        g.base.left - alvo.caixa.left + 'px 0px',
        'important',
      );
    }
  }
  function atualizarGesto(ev) {
    const g = gesto;
    if (!g || ev.pointerId !== g.ponteiro) return;
    const dx = ev.clientX - g.inicioX,
      dy = ev.clientY - g.inicioY;
    if (Math.hypot(dx, dy) < 12 && !g.arrastou) return;
    g.arrastou = true;
    ev.preventDefault();
    g.elemento.classList.add('arrastando');
    sobrepor(g);
    const fila = g.elemento.closest('.fila_compartilhada').getBoundingClientRect();
    const posicoes = [
      g.base,
      ...[...g.vizinhas]
        .filter(([direcao]) => !validar(obterEstado(), { tipo: 'mover', carta: g.id, direcao }))
        .map(([, alvo]) => alvo.caixa),
    ];
    const minimoX = Math.min(
        fila.right - g.base.width,
        Math.max(fila.left, Math.min(...posicoes.map((r) => r.left))),
      ),
      maximoX = Math.max(
        minimoX,
        Math.min(fila.right - g.base.width, Math.max(...posicoes.map((r) => r.left))),
      );
    const minimoY = Math.min(
        fila.bottom - g.base.height,
        Math.max(fila.top, Math.min(...posicoes.map((r) => r.top))),
      ),
      maximoY = Math.max(
        minimoY,
        Math.min(fila.bottom - g.base.height, Math.max(...posicoes.map((r) => r.top))),
      );
    // Os limites vêm do layout: arredondá-los criava uma faixa de até um pixel.
    const limitar = (valor, minimo, maximo) => Math.max(minimo, Math.min(maximo, valor));
    let x = limitar(ev.clientX - g.agarreX, minimoX, maximoX),
      y = limitar(ev.clientY - g.agarreY, minimoY, maximoY);
    for (const caixa of posicoes) {
      if (Math.abs(x - caixa.left) <= 12) x = limitar(caixa.left, minimoX, maximoX);
      if (Math.abs(y - caixa.top) <= 12) y = limitar(caixa.top, minimoY, maximoY);
    }
    g.posicao = { x, y };
    Object.assign(g.sobreposta.style, { left: x + 'px', top: y + 'px' });
    g.elemento.style.setProperty(
      'translate',
      x - g.base.left + 'px ' + (y - g.base.top) + 'px',
      'important',
    );
    const centro = x + g.base.width / 2,
      pretendido = ev.clientX - g.agarreX + g.base.width / 2,
      e = obterEstado();
    let destino = null;
    g.bloqueio = null;
    for (const [direcao, alvo] of g.vizinhas) {
      const meio = (g.base.left + g.base.width / 2 + alvo.caixa.left + alvo.caixa.width / 2) / 2;
      const cruzou = direcao === 1 ? centro < meio : centro > meio,
        tentou = direcao === 1 ? pretendido < meio : pretendido > meio;
      const motivo = validar(e, { tipo: 'mover', carta: g.id, direcao });
      if (motivo && tentou) {
        g.bloqueio = motivo;
        sinalizarBloqueio(g, direcao, motivo);
      } else if (!motivo && cruzou) destino = direcao;
    }
    if (!g.bloqueio) limparBloqueio(g);
    previa(g, destino);
  }
  function terminar(confirmar, ev) {
    const g = gesto;
    if (!g) return;
    gesto = null;
    limparBloqueio(g);
    limparVizinhas();
    delete app.dataset.preparandoMovimento;
    const faixa = g.elemento.closest('.fila_compartilhada').getBoundingClientRect();
    const dentro =
      g.posicao &&
      g.posicao.x >= faixa.left - 1 &&
      g.posicao.x + g.base.width <= faixa.right + 1 &&
      g.posicao.y >= faixa.top - 1 &&
      g.posicao.y + g.base.height <= faixa.bottom + 1;
    const mover =
      confirmar &&
      g.arrastou &&
      g.direcao !== null &&
      dentro &&
      !validar(obterEstado(), { tipo: 'mover', carta: g.id, direcao: g.direcao });
    if (g.arrastou) {
      bloquearClique = true;
      setTimeout(() => {
        bloquearClique = false;
      }, 0);
    }
    if (mover) {
      agir({ tipo: 'mover', carta: g.id, direcao: g.direcao });
      const nova = app.querySelector('.fila_compartilhada [data-carta="' + g.id + '"]');
      if (nova && nova !== g.elemento) {
        for (const a of nova.getAnimations()) a.cancel();
        const destino = nova.getBoundingClientRect();
        nova.style.visibility = 'hidden';
        terminarAnimacao(g.sobreposta, destino, () => {
          if (nova.isConnected) nova.style.visibility = '';
        });
      } else {
        restaurar(g);
        g.sobreposta?.remove();
      }
      return;
    }
    previa(g, null);
    if (g.sobreposta) terminarAnimacao(g.sobreposta, g.base, () => restaurar(g));
    else restaurar(g);
  }
  app.addEventListener(
    'pointerdown',
    (ev) => {
      pararRetornos();
      if (ev.button !== 0 || !ev.isPrimary || !podeAtalho()) return;
      const elemento = ev.target.closest('.fila_compartilhada .carta[data-propria="true"]');
      if (!elemento) return;
      const id = Number(elemento.dataset.carta),
        agora = performance.now();
      if (
        ultimoClique?.id === id &&
        agora - ultimoClique.tempo < 350 &&
        Math.hypot(ev.clientX - ultimoClique.x, ev.clientY - ultimoClique.y) < 16 &&
        temAtiva(id)
      ) {
        ultimoClique = null;
        cancelarEspera();
        bloquearClique = true;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        entrarModo('ativar', id);
        return;
      }
      if (obterModo() === 'mover') return;
      if (obterEstado().fila.length < 2) return;
      cancelarEspera();
      app.dataset.preparandoMovimento = 'true';
      espera = {
        id,
        x: ev.clientX,
        y: ev.clientY,
        ponteiro: ev.pointerId,
        inicio: ev,
        origem: elemento.getBoundingClientRect(),
      };
      mostrarVizinhas(id);
    },
    { capture: true },
  );
  app.addEventListener(
    'pointermove',
    (ev) => {
      if (!espera || ev.pointerId !== espera.ponteiro || Math.abs(ev.clientX - espera.x) < 6)
        return;
      if (!podeAtalho()) {
        cancelarEspera();
        return;
      }
      const { id, inicio, origem } = espera;
      cancelarEspera();
      ultimoClique = null;
      ev.preventDefault();
      entrarModo('mover', id);
      const atual = app.querySelector('.fila_compartilhada [data-carta="' + id + '"]');
      if (atual) capturar(atual, inicio, origem);
    },
    { capture: true, passive: false },
  );
  app.addEventListener(
    'pointerup',
    (ev) => {
      cancelarEspera();
      const elemento = ev.target.closest('.fila_compartilhada .carta[data-propria="true"]');
      if (elemento && !gesto?.arrastou && !bloquearClique && podeAtalho())
        ultimoClique = {
          id: Number(elemento.dataset.carta),
          tempo: performance.now(),
          x: ev.clientX,
          y: ev.clientY,
        };
      setTimeout(() => {
        bloquearClique = false;
      }, 0);
    },
    { capture: true },
  );
  app.addEventListener('pointerdown', (ev) => {
    if (obterModo() !== 'mover' || ev.button !== 0 || !ev.isPrimary) return;
    const elemento = ev.target.closest('.fila_compartilhada .carta[data-propria="true"]');
    if (elemento) capturar(elemento, ev);
  });
  app.addEventListener('pointermove', atualizarGesto, { passive: false });
  app.addEventListener('pointerup', (ev) => {
    if (gesto && ev.pointerId === gesto.ponteiro) terminar(true, ev);
  });
  app.addEventListener('pointercancel', () => {
    cancelarEspera();
    ultimoClique = null;
    terminar(false);
  });
  app.addEventListener('lostpointercapture', () => terminar(false));
  app.addEventListener(
    'click',
    (ev) => {
      if (bloquearClique) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
  app.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && gesto) {
      ev.preventDefault();
      terminar(false);
      return;
    }
    if (obterModo() !== 'mover' || !['ArrowLeft', 'ArrowRight'].includes(ev.key)) return;
    const elemento = ev.target.closest('.fila_compartilhada .carta');
    if (!elemento) return;
    ev.preventDefault();
    pararRetornos();
    agir({
      tipo: 'mover',
      carta: Number(elemento.dataset.carta),
      direcao: ev.key === 'ArrowLeft' ? 1 : -1,
    });
  });
  window.addEventListener('blur', () => {
    cancelarEspera();
    terminar(false);
    pararRetornos();
  });
}

// O fundo navega a fila; cartas próprias disponíveis iniciam Mover ao arrastar.
export function instalarRolagem(app, { obterModo }) {
  let arraste = null,
    suprimir = false;
  app.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || !ev.isPrimary || ev.pointerType === 'touch') return;
    const faixa = ev.target.closest('.faixa');
    if (!faixa) return;
    if (
      obterModo() === 'mover' &&
      ev.target.closest('.fila_compartilhada .carta[data-propria="true"]')
    )
      return;
    if (ev.target.closest('.faixa_mao .carta')) return;
    arraste = {
      faixa,
      x: ev.clientX,
      inicio: faixa.scrollLeft,
      ponteiro: ev.pointerId,
      moveu: false,
    };
  });
  app.addEventListener(
    'pointermove',
    (ev) => {
      if (!arraste || ev.pointerId !== arraste.ponteiro) return;
      if (
        obterModo() === 'mover' &&
        arraste.faixa.querySelector('.carta_pressionada,[data-movivel="true"]')
      ) {
        arraste = null;
        return;
      }
      const dx = ev.clientX - arraste.x;
      if (!arraste.moveu && Math.abs(dx) < 6) return;
      if (!arraste.moveu) arraste.faixa.setPointerCapture(ev.pointerId);
      arraste.moveu = true;
      app.dataset.deslizando = 'true';
      arraste.faixa.classList.add('deslizando');
      ev.preventDefault();
      arraste.faixa.scrollLeft = arraste.inicio - dx;
    },
    { passive: false },
  );
  function terminar() {
    if (!arraste) return;
    suprimir = arraste.moveu;
    arraste.faixa.classList.remove('deslizando');
    arraste = null;
    app.dataset.deslizando = 'false';
    setTimeout(() => {
      suprimir = false;
    }, 0);
  }
  app.addEventListener('pointerup', terminar);
  app.addEventListener('pointercancel', terminar);
  app.addEventListener('lostpointercapture', terminar);
  app.addEventListener(
    'click',
    (ev) => {
      if (suprimir) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
  app.addEventListener(
    'wheel',
    (ev) => {
      const faixa = ev.target.closest('.faixa');
      if (!faixa || faixa.scrollWidth <= faixa.clientWidth) return;
      ev.preventDefault();
      faixa.scrollLeft += Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
    },
    { passive: false },
  );
}
