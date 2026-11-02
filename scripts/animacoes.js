// Efeitos visuais independentes das regras. Nenhuma animação adia uma jogada.
const reduzir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let contextoAnterior = null;
const fantasmas = new Set();
function visivel(r) {
  return (
    r.width > 0 &&
    r.height > 0 &&
    r.bottom > 0 &&
    r.top < innerHeight &&
    r.right > 0 &&
    r.left < innerWidth
  );
}
export function capturarTela(app) {
  const cartas = new Map();
  for (const el of app.querySelectorAll('[data-carta]')) {
    const r = el.getBoundingClientRect();
    if (visivel(r) || el.dataset.zona === 'fila') {
      const copia = el.cloneNode(true),
        estilo = getComputedStyle(el);
      for (const v of ['--largura_carta', '--lado_retrato', '--altura_carta'])
        copia.style.setProperty(v, estilo.getPropertyValue(v));
      cartas.set(el.dataset.carta, { r, el: copia, zona: el.dataset.zona });
    }
  }
  const paineis = new Map();
  for (const seletor of ['.mao_recolhida.aberta', '.descarte_aberto', '.carta_ampliada']) {
    const el = app.querySelector(seletor);
    if (el) paineis.set(seletor, { r: el.getBoundingClientRect(), el: el.cloneNode(true) });
  }
  return {
    cartas,
    paineis,
    descarte: app.querySelector('.abrir_descarte')?.getBoundingClientRect(),
  };
}
function fantasma(item) {
  const el = document.createElement('div');
  el.className = 'jogo fantasma_movimento';
  el.setAttribute('aria-hidden', 'true');
  el.inert = true;
  const copia = item.el;
  copia.removeAttribute('id');
  for (const filho of copia.querySelectorAll('[id]')) filho.removeAttribute('id');
  Object.assign(copia.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    right: 'auto',
    bottom: 'auto',
    width: item.r.width + 'px',
    height: item.r.height + 'px',
    margin: '0',
    minHeight: '0',
    maxHeight: 'none',
    transform: 'none',
    animation: 'none',
  });
  Object.assign(el.style, {
    position: 'fixed',
    left: item.r.left + 'px',
    top: item.r.top + 'px',
    width: item.r.width + 'px',
    height: item.r.height + 'px',
    margin: '0',
    minHeight: '0',
    maxHeight: 'none',
    transform: 'none',
    pointerEvents: 'none',
    zIndex: '20',
  });
  copia.style.setProperty('translate', '0 0', 'important');
  copia.style.opacity = '1';
  copia.style.visibility = 'visible';
  el.append(copia);
  document.body.append(el);
  fantasmas.add(el);
  return el;
}

function executarAnimacao(el, quadros, opcoes) {
  const a = el.animate(quadros, { duration: 2000, easing: 'cubic-bezier(.2,.7,.2,1)', ...opcoes });
  return a.finished.catch(() => {});
}
export function animarTela(app, antes, contexto, animarCartas = false, transicao = null) {
  for (const el of fantasmas) el.remove();
  fantasmas.clear();
  const mesmoContexto = contexto === contextoAnterior;
  contextoAnterior = contexto;
  if (
    !contexto?.startsWith('jogo:') ||
    !mesmoContexto ||
    (reduzir() &&
      !transicao?.novas.length &&
      transicao?.tipo !== 'reposicionar' &&
      transicao?.tipo !== 'construir')
  )
    return;
  if (transicao?.tipo === 'reposicionar' || transicao?.novas.length)
    antes.paineis.delete('.carta_ampliada');
  const presentes = new Set();
  for (const el of app.querySelectorAll('[data-carta]')) {
    presentes.add(el.dataset.carta);
    const atual = el.getBoundingClientRect(),
      anterior = antes.cartas.get(el.dataset.carta);
    if (!visivel(atual) && !(transicao?.tipo === 'reposicionar' && el.dataset.zona === 'fila'))
      continue;
    if (!animarCartas) continue;
    if (
      transicao?.tipo === 'reposicionar' &&
      el.dataset.zona === 'fila' &&
      anterior?.zona === 'fila'
    ) {
      const dx = atual.left - anterior.r.left,
        dy = atual.top - anterior.r.top;
      if (Math.abs(dx) + Math.abs(dy) > 2) {
        const copia = fantasma(anterior),
          principal = transicao.movidas.includes(Number(el.dataset.carta));
        copia.style.zIndex = principal ? '75' : '30';
        el.style.visibility = 'hidden';
        const duracao = transicao.duracao || 2000;
        const borda =
          app.querySelector('.mao_recolhida')?.getBoundingClientRect().top || innerHeight;
        const saida = Math.min(
          innerHeight + 24,
          Math.max(borda, anterior.r.bottom, atual.bottom) + 24,
        );
        const baixo = saida - anterior.r.top;
        // A carta sai abaixo da borda da mão, cruza por baixo e reaparece no destino.
        const quadros = principal
          ? [
              { transform: 'translate(0,0)', opacity: 1, offset: 0 },
              { transform: 'translate(0,' + baixo + 'px)', opacity: 0, offset: 0.28 },
              { transform: 'translate(' + dx + 'px,' + baixo + 'px)', opacity: 0, offset: 0.62 },
              { transform: 'translate(' + dx + 'px,' + dy + 'px)', opacity: 1, offset: 1 },
            ]
          : [
              { transform: 'translate(0,0)', offset: 0 },
              { transform: 'translate(0,0)', offset: 0.25 },
              { transform: 'translate(' + dx + 'px,' + dy + 'px)', offset: 0.7 },
              { transform: 'translate(' + dx + 'px,' + dy + 'px)', offset: 1 },
            ];
        executarAnimacao(copia, quadros, { duration: duracao, easing: 'ease-in-out' }).finally(
          () => {
            el.style.visibility = '';
            copia.remove();
            fantasmas.delete(copia);
          },
        );
      }
      continue;
    }
    if (
      transicao?.tipo === 'construir' &&
      Number(el.dataset.carta) === transicao.carta &&
      el.dataset.zona === 'fila'
    ) {
      el.classList.add('chegada_construcao');
      if (anterior) {
        const copia = fantasma(anterior);
        copia.classList.add('animacao_construcao');
        copia.firstElementChild.classList.remove('selecionada', 'alvo', 'carta_recebida');
        el.style.visibility = 'hidden';
        const dx = atual.left - anterior.r.left,
          dy = atual.top - anterior.r.top;
        executarAnimacao(
          copia,
          [{ transform: 'translate(0,0)' }, { transform: 'translate(' + dx + 'px,' + dy + 'px)' }],
          { duration: 2000 },
        ).finally(() => {
          el.style.visibility = '';
          copia.remove();
          fantasmas.delete(copia);
        });
      } else
        executarAnimacao(
          el,
          [
            { translate: '0 38px', opacity: 0 },
            { translate: '0 0', opacity: 1 },
          ],
          { duration: 2000 },
        );
      continue;
    }
    if (transicao?.novas.includes(Number(el.dataset.carta)) && el.dataset.zona === 'mao') {
      el.classList.add('carta_recebida');
      // Cópia fixa fora da faixa: o overflow da mão não pode cortar o trajeto.
      const recuperada = transicao.recuperadas?.includes(Number(el.dataset.carta));
      const origem = antes.descarte;
      const inicio =
        recuperada && origem
          ? {
              width: atual.width,
              height: atual.height,
              left: origem.left + (origem.width - atual.width) / 2,
              top: origem.bottom + 12,
            }
          : {
              width: atual.width,
              height: atual.height,
              left: -atual.width - 24,
              top: innerHeight + 24,
            };
      const molde = el.cloneNode(true),
        copia = fantasma({ r: inicio, el: molde, zona: 'mao' });
      copia.style.zIndex = '75';
      const estilo = getComputedStyle(el);
      for (const variavel of ['--largura_carta', '--lado_retrato', '--altura_carta'])
        copia.style.setProperty(variavel, estilo.getPropertyValue(variavel));
      el.style.visibility = 'hidden';
      const dx = atual.left - inicio.left,
        dy = atual.top - inicio.top;
      const quaseFora = innerHeight - atual.height * 0.3 - inicio.top;
      executarAnimacao(
        copia,
        [
          { transform: 'translate(0,0)', offset: 0 },
          {
            transform: 'translate(' + dx + 'px,' + (recuperada ? dy * 0.55 : quaseFora) + 'px)',
            offset: recuperada ? 0.55 : 0.15,
          },
          { transform: 'translate(' + dx + 'px,' + dy + 'px)', offset: 1 },
        ],
        { duration: 2000, easing: 'cubic-bezier(.25,.55,.25,1)' },
      ).finally(() => {
        el.style.visibility = '';
        copia.remove();
        fantasmas.delete(copia);
      });
      continue;
    }
    if (anterior) {
      const dx = anterior.r.left - atual.left,
        dy = anterior.r.top - atual.top;
      if (Math.abs(dx) + Math.abs(dy) > 2) {
        if (transicao?.novas.length && el.dataset.zona === 'mao') {
          const copia = fantasma(anterior);
          el.style.visibility = 'hidden';
          executarAnimacao(
            copia,
            [
              { transform: 'translate(0,0)' },
              { transform: 'translate(' + -dx + 'px,' + -dy + 'px)' },
            ],
            { duration: 2000 },
          ).finally(() => {
            el.style.visibility = '';
            copia.remove();
            fantasmas.delete(copia);
          });
        } else
          executarAnimacao(el, [{ translate: dx + 'px ' + dy + 'px' }, { translate: '0 0' }], {
            duration: 2000,
          });
      }
    } else if (el.dataset.zona === 'fila')
      executarAnimacao(el, [
        { translate: '0 18px', opacity: 0 },
        { translate: '0 0', opacity: 1 },
      ]);
  }
  for (const [id, anterior] of antes.cartas) {
    if (!animarCartas || presentes.has(id) || anterior.zona !== 'fila') continue;
    const destino = app.querySelector('.abrir_descarte')?.getBoundingClientRect();
    if (!destino) continue;
    const el = fantasma(anterior),
      dx = destino.left + destino.width / 2 - anterior.r.left - anterior.r.width / 2,
      dy = destino.top + destino.height / 2 - anterior.r.top - anterior.r.height / 2;
    executarAnimacao(
      el,
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.18)', opacity: 0 },
      ],
      { duration: 2000 },
    ).finally(() => {
      el.remove();
      fantasmas.delete(el);
    });
  }
  for (const seletor of ['.mao_recolhida.aberta', '.descarte_aberto', '.carta_ampliada']) {
    const el = app.querySelector(seletor),
      antigo = antes.paineis.get(seletor),
      dy = seletor === '.descarte_aberto' ? -18 : 18;
    if (seletor === '.mao_recolhida.aberta') continue;
    if (el && !antigo) {
      const x = seletor === '.carta_ampliada' ? '-50%' : '0';
      executarAnimacao(el, [
        { translate: x + ' ' + dy + 'px', opacity: 0 },
        { translate: x + ' 0', opacity: 1 },
      ]);
    } else if (!el && antigo) {
      const copia = fantasma(antigo);
      executarAnimacao(
        copia,
        [
          { translate: '0 0', opacity: 1 },
          { translate: '0 ' + dy + 'px', opacity: 0 },
        ],
        { duration: 2000 },
      ).finally(() => {
        copia.remove();
        fantasmas.delete(copia);
      });
    }
  }
}
export function animarAviso(el) {
  if (!reduzir())
    executarAnimacao(
      el,
      [
        { translate: '0 8px', opacity: 0 },
        { translate: '0 0', opacity: 1 },
      ],
      { duration: 2000 },
    );
}

// Relógio único: inspecionar outra carta não reinicia os meios segundos do pisca.
export function instalarPulso(app) {
  let passo = 0,
    intervalo = null;
  app.dataset.fasePulso = 'aceso';
  app.dataset.faseVermelha = 'aceso';
  const iniciar = () => {
    if (intervalo !== null) return;
    intervalo = window.setInterval(() => {
      passo = (passo + 1) % 4;
      app.dataset.fasePulso = passo % 2 === 0 ? 'aceso' : 'apagado';
      app.dataset.faseVermelha = passo < 2 ? 'aceso' : 'apagado';
    }, 500);
  };
  iniciar();
  window.addEventListener('pagehide', () => {
    window.clearInterval(intervalo);
    intervalo = null;
  });
  window.addEventListener('pageshow', iniciar);
}

// Metadados visuais: não revelam uma mão depois de trocar de turno ou de fase.
export function planejarTransicao(anterior, proximo, acao) {
  if (
    !anterior ||
    !proximo ||
    anterior.fase !== 'jogo' ||
    proximo.fase !== 'jogo' ||
    proximo.resumoTurno ||
    proximo.atual !== anterior.atual ||
    proximo.turno !== anterior.turno
  )
    return null;
  const anteriores = new Set(anterior.maos[anterior.atual].map((c) => c.id));
  const novas = proximo.maos[proximo.atual].filter((c) => !anteriores.has(c.id)).map((c) => c.id);
  if (acao.tipo === 'construir') return { tipo: 'construir', carta: acao.carta, novas };
  // O arraste já conduz a troca simples; o percurso por baixo pertence aos poderes.
  if (acao.tipo === 'mover') return { tipo: 'mover', novas };
  const idsAntes = anterior.fila.map((c) => c.id),
    idsDepois = proximo.fila.map((c) => c.id);
  const comuns = idsAntes.filter((id) => idsDepois.includes(id));
  const ordemAntes = comuns,
    ordemDepois = idsDepois.filter((id) => comuns.includes(id));
  if (ordemAntes.some((id, i) => id !== ordemDepois[i])) {
    const distancias = comuns.map((id) => ({
      id,
      distancia: Math.abs(ordemAntes.indexOf(id) - ordemDepois.indexOf(id)),
    }));
    const maior = Math.max(...distancias.map((c) => c.distancia));
    const movidas = distancias.filter((c) => c.distancia === maior).map((c) => c.id);
    return { tipo: 'reposicionar', movidas, novas, duracao: 2000 + Math.max(0, maior - 1) * 300 };
  }
  const recuperadas = novas.filter((id) => anterior.descarte.some((c) => c.id === id));
  return novas.length
    ? { tipo: recuperadas.length ? 'recuperar' : 'receber', novas, recuperadas }
    : null;
}
