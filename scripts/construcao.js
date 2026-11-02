import { iconeNavegacao } from './icones.js';
import { audioJogo } from './audio.js';
import { poder, validar } from './regras.js';
export function destinoConstrucao(e, id) {
  const carta = e.maos[e.atual].find((c) => c.id === id);
  return poder(e, carta) === 9 ? 'traseira' : 'frente';
}
// O estado da partida só muda ao soltar no encaixe correto.
export function instalarConstrucao(
  app,
  {
    obterEstado,
    obterModo,
    obterSelecao,
    podeInteragir,
    ativarConstrucao,
    atualizarDivisorias = () => {},
    fecharInspecao = () => {},
    reabrirInspecao = () => {},
    agir,
    avisar,
  },
) {
  let gesto = null,
    suprimir = false,
    retorno = null,
    mouse = null;
  document.addEventListener(
    'pointermove',
    (ev) => {
      if (ev.pointerType === 'mouse') mouse = { x: ev.clientX, y: ev.clientY };
    },
    { passive: true },
  );
  document.addEventListener('pointerout', (ev) => {
    if (ev.pointerType === 'mouse' && !ev.relatedTarget) mouse = null;
  });
  function limparZonas() {
    app
      .querySelectorAll('.zona_construcao')
      .forEach((z) => z.classList.remove('destino_esperado', 'encaixe_valido'));
  }
  function pararRetorno(concluido = false) {
    if (retorno) {
      const r = retorno;
      retorno = null;
      r.animacao.cancel();
      r.camada.remove();
      if (r.elemento.isConnected) r.elemento.style.cssText = r.estilo;
      delete app.dataset.construindoArraste;
      if (concluido && r.mouse)
        requestAnimationFrame(() => {
          if (
            !gesto &&
            !retorno &&
            mouse &&
            r.elemento.isConnected &&
            podeInteragir() &&
            document.elementFromPoint(mouse.x, mouse.y)?.closest?.('.faixa_mao [data-carta]') ===
              r.elemento
          )
            reabrirInspecao(Number(r.elemento.dataset.carta));
        });
    }
  }
  function criarCopia(g) {
    const camada = document.createElement('div');
    camada.className = 'jogo carta_arraste_sobreposta arraste_construcao';
    camada.setAttribute('aria-hidden', 'true');
    camada.inert = true;
    const css = getComputedStyle(g.elemento);
    for (const v of ['--largura_carta', '--lado_retrato', '--altura_carta', '--desnivel_j2'])
      camada.style.setProperty(v, css.getPropertyValue(v));
    Object.assign(camada.style, {
      width: g.base.width + 'px',
      height: g.base.height + 'px',
      left: g.base.left + 'px',
      top: g.base.top + 'px',
    });
    const copia = g.elemento.cloneNode(true);
    copia.removeAttribute('data-carta');
    copia.className = 'carta arrastando';
    copia.style.cssText = '';
    copia.style.setProperty('margin', '0', 'important');
    copia.style.setProperty('translate', '0 0', 'important');
    Object.assign(copia.style, { width: g.base.width + 'px', height: g.base.height + 'px' });
    const originais = [g.elemento, ...g.elemento.querySelectorAll('*')],
      copias = [copia, ...copia.querySelectorAll('*')];
    originais.forEach((el, i) => {
      const s = getComputedStyle(el);
      for (const nome of [
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'letter-spacing',
        'text-transform',
        'color',
      ])
        copias[i].style.setProperty(nome, s.getPropertyValue(nome));
    });
    copia.querySelectorAll('.sinal_compra').forEach((fita) => fita.remove());
    if (!copia.querySelector('.sinal_construir')) {
      const fita = document.createElement('span');
      fita.className = 'sinal_construir';
      fita.textContent = '+';
      fita.setAttribute('aria-hidden', 'true');
      copia.append(fita);
    }
    camada.append(copia);
    document.body.append(camada);
    g.camada = camada;
    g.elemento.style.opacity = '0';
  }
  function posicionarReal(g, x, y) {
    const r = g.elemento.getBoundingClientRect();
    const dx = x - (r.left - (g.dx || 0)),
      dy = y - (r.top - (g.dy || 0));
    g.elemento.style.setProperty('translate', dx + 'px ' + dy + 'px', 'important');
    g.dx = dx;
    g.dy = dy;
  }
  function zonaCorreta(g) {
    return app.querySelector('[data-destino-construcao="' + g.destino + '"]');
  }
  function sobreZona(g) {
    const alvo = document
      .elementFromPoint(g.x + g.base.width / 2, g.y + g.base.height / 2)
      ?.closest?.('[data-destino-construcao]');
    return alvo === zonaCorreta(g) ? alvo : null;
  }
  function limpar() {
    delete app.dataset.construindoArraste;
    app.classList.remove('arrastando_construcao');
    limparZonas();
    atualizarDivisorias();
  }
  function terminar(confirmar, ev) {
    const g = gesto;
    if (!g) return;
    gesto = null;
    const zona = g.arrastou && ev ? sobreZona(g, ev) : null;
    limpar();
    if (!g.arrastou) {
      g.elemento.style.cssText = g.estilo;
      return;
    }
    suprimir = true;
    app.dataset.gestoConstrucaoConcluido = 'true';
    setTimeout(() => {
      suprimir = false;
      delete app.dataset.gestoConstrucaoConcluido;
    }, 0);
    if (confirmar && zona && !validar(obterEstado(), { tipo: 'construir', carta: g.id })) {
      g.elemento.classList.remove('carta_recebida');
      g.elemento.querySelectorAll('.sinal_compra').forEach((fita) => fita.remove());
      posicionarReal(g, g.x, g.y);
      g.elemento.style.opacity = '1';
      g.camada.remove();
      agir({ tipo: 'construir', carta: g.id });
      return;
    }
    fecharInspecao();
    avisar('Construção cancelada. Nenhuma ação foi gasta.', 'informacao');
    g.camada.classList.remove('construcao_no_encaixe');
    const fita = g.camada.querySelector('.sinal_construir');
    if (fita) fita.textContent = '+';
    app.dataset.construindoArraste = 'true';
    g.elemento.style.cssText = g.estilo;
    g.elemento.style.opacity = '0';
    const destino = g.elemento.getBoundingClientRect(),
      inicio = g.camada.getBoundingClientRect();
    const animacao = g.camada.animate(
      [
        { left: inicio.left + 'px', top: inicio.top + 'px' },
        { left: destino.left + 'px', top: destino.top + 'px' },
      ],
      { duration: 2000, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' },
    );
    const r = {
      animacao,
      camada: g.camada,
      elemento: g.elemento,
      estilo: g.estilo,
      mouse: g.tipoPonteiro === 'mouse',
    };
    retorno = r;
    animacao.finished.then(
      () => {
        if (retorno === r) pararRetorno(true);
      },
      () => {},
    );
  }
  function preparar(elemento, ev) {
    const id = Number(elemento.dataset.carta),
      e = obterEstado();
    if (validar(e, { tipo: 'construir', carta: id })) return;
    const base = elemento.getBoundingClientRect();
    gesto = {
      elemento,
      id,
      base,
      estilo: elemento.style.cssText,
      inicioX: ev.clientX,
      inicioY: ev.clientY,
      agarreX: ev.clientX - base.left,
      agarreY: ev.clientY - base.top,
      ponteiro: ev.pointerId,
      tipoPonteiro: ev.pointerType,
      destino: destinoConstrucao(e, id),
      arrastou: false,
      dx: 0,
      dy: 0,
    };
    if (obterModo() === 'construir') app.dataset.construindoArraste = 'true';
  }
  app.addEventListener(
    'pointerdown',
    (ev) => {
      pararRetorno();
      if (ev.button !== 0 || !ev.isPrimary || !podeInteragir()) return;
      const elemento = ev.target.closest('.faixa_mao .carta');
      if (elemento) preparar(elemento, ev);
    },
    { capture: true },
  );
  app.addEventListener(
    'pointermove',
    (ev) => {
      if (
        !gesto &&
        ev.pointerType === 'touch' &&
        ev.isPrimary &&
        podeInteragir() &&
        !app.querySelector('.fila_compartilhada .carta.arrastando')
      ) {
        const elemento = document
          .elementFromPoint(ev.clientX, ev.clientY)
          ?.closest?.('.faixa_mao .carta');
        if (elemento) preparar(elemento, ev);
      }
      const g = gesto;
      if (!g || ev.pointerId !== g.ponteiro) return;
      if (!g.arrastou && Math.hypot(ev.clientX - g.inicioX, ev.clientY - g.inicioY) < 8) return;
      ev.preventDefault();
      if (!g.arrastou) {
        const atual = app.querySelector('.faixa_mao [data-carta="' + g.id + '"]');
        if (!atual) {
          terminar(false);
          return;
        }
        g.elemento = atual;
        g.estilo = atual.style.cssText;
        g.arrastou = true;
        audioJogo.tocar('pegar');
        criarCopia(g);
        app.dataset.construindoArraste = 'true';
        app.classList.add('arrastando_construcao');
        g.reconectando = true;
        if (obterModo() !== 'construir') ativarConstrucao(g.id);
        const nova = app.querySelector('.faixa_mao [data-carta="' + g.id + '"]');
        if (!nova) {
          terminar(false);
          return;
        }
        if (nova !== g.elemento) {
          g.elemento = nova;
          g.estilo = nova.style.cssText;
          g.dx = 0;
          g.dy = 0;
          g.elemento.style.opacity = '0';
        }
        g.elemento.setPointerCapture(ev.pointerId);
        g.reconectando = false;
        atualizarDivisorias();
        const zona = zonaCorreta(g),
          fila = app.querySelector('.fila_compartilhada');
        fila.scrollLeft = g.destino === 'traseira' ? 0 : fila.scrollWidth;
        zona?.classList.add('destino_esperado');
      }
      const fila = app.querySelector('.fila_compartilhada'),
        r = fila.getBoundingClientRect(),
        css = getComputedStyle(fila),
        dpr = window.devicePixelRatio || 1;
      const minX = r.left + parseFloat(css.paddingLeft),
        maxX = Math.max(minX, r.right - parseFloat(css.paddingRight) - g.base.width),
        minY = r.top + parseFloat(css.paddingTop),
        maxY = Math.max(minY, r.bottom - parseFloat(css.paddingBottom) - g.base.height);
      const limitar = (valor, min, max) =>
        Math.max(
          Math.ceil(min * dpr) / dpr,
          Math.min(Math.floor(max * dpr) / dpr, Math.round(valor * dpr) / dpr),
        );
      g.x = limitar(ev.clientX - g.agarreX, minX, maxX);
      g.y = limitar(ev.clientY - g.agarreY, minY, maxY);
      Object.assign(g.camada.style, { left: g.x + 'px', top: g.y + 'px' });
      posicionarReal(g, g.x, g.y);
      const zona = zonaCorreta(g),
        valido = Boolean(sobreZona(g, ev));
      if (valido && !g.noEncaixe) audioJogo.tocar('encaixe');
      g.noEncaixe = valido;
      zona?.classList.toggle('encaixe_valido', valido);
      g.camada.classList.toggle('construcao_no_encaixe', valido);
      const fita = g.camada.querySelector('.sinal_construir');
      if (fita) fita.innerHTML = valido ? iconeNavegacao('✓') : '+';
    },
    { passive: false },
  );
  app.addEventListener('pointerup', (ev) => {
    if (gesto && ev.pointerId === gesto.ponteiro) terminar(true, ev);
  });
  app.addEventListener('pointercancel', () => terminar(false));
  app.addEventListener('lostpointercapture', (ev) => {
    if (gesto && !gesto.reconectando && ev.target === gesto.elemento) terminar(false);
  });
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
  app.addEventListener('click', (ev) => {
    const zona = ev.target.closest('[data-destino-construcao]');
    if (!zona || ev.detail !== 0 || obterModo() !== 'construir' || !podeInteragir()) return;
    const id = obterSelecao(),
      e = obterEstado();
    if (!e.maos[e.atual].some((c) => c.id === id)) {
      avisar('Selecione uma carta da mão.');
      return;
    }
    if (destinoConstrucao(e, id) !== zona.dataset.destinoConstrucao) {
      avisar('Use o encaixe indicado para esta carta.');
      return;
    }
    agir({ tipo: 'construir', carta: id });
  });
  app.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && gesto) {
      ev.preventDefault();
      terminar(false);
    }
  });
  window.addEventListener('blur', () => {
    mouse = null;
    terminar(false);
    pararRetorno();
  });
}
