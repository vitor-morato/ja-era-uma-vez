import { definicao } from './cartas.js';
import { iconeCaveira } from './icones.js';
const seta =
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M12 3v17m-6-6 6 6 6-6"/></svg>';
export function descricaoVoz({ id, motivo }) {
  const nome = definicao(id)?.nome;
  if (!nome) return null;
  const plural = id === 5,
    final = plural ? 'os' : [1, 12, 18].includes(id) ? 'a' : 'o',
    verbo = plural ? 'foram' : 'foi';
  const mapa = {
    comprar: { cor: 'comprar', icone: seta, texto: nome + ' ' + verbo + ' comprad' + final + '.' },
    receber: {
      cor: 'comprar',
      icone: seta,
      texto: nome + (plural ? ' voltaram' : ' voltou') + ' para a mão.',
    },
    construir: {
      cor: 'construir',
      icone: '+',
      texto: nome + ' ' + verbo + ' construíd' + final + '.',
    },
    mover: { cor: 'mover', icone: '↔', texto: nome + ' ' + verbo + ' movid' + final + '.' },
    ativar: {
      cor: 'ativar',
      icone: '!',
      texto: nome + (plural ? ' usaram' : ' usou') + ' seu poder.',
    },
    controle: {
      cor: 'ativar',
      icone: '↔',
      texto: nome + (plural ? ' mudaram' : ' mudou') + ' de controle.',
    },
    descarte: {
      cor: 'descarte',
      icone: iconeCaveira(),
      texto: nome + ' ' + verbo + ' descartad' + final + '.',
    },
  };
  return mapa[motivo] || null;
}
export function instalarAvisosPersonagens() {
  const aviso = document.createElement('p');
  aviso.id = 'aviso_personagem';
  aviso.hidden = true;
  aviso.setAttribute('role', 'status');
  aviso.setAttribute('aria-live', 'polite');
  if (typeof aviso.showPopover === 'function') aviso.setAttribute('popover', 'manual');
  document.body.append(aviso);
  function ajustar() {
    if (aviso.hidden) return;
    aviso.style.bottom = Math.max(96, Math.min(160, innerHeight * 0.18)) + 'px';
  }

  function esconder() {
    if (aviso.hasAttribute('popover') && aviso.matches(':popover-open')) aviso.hidePopover();
    aviso.hidden = true;
  }
  function mostrar(evento) {
    const dados = descricaoVoz(evento);
    if (!dados) {
      esconder();
      return;
    }
    const simbolo = document.createElement('span');
    simbolo.className = 'simbolo_aviso_personagem';
    simbolo.setAttribute('aria-hidden', 'true');
    simbolo.innerHTML = dados.icone;
    const texto = document.createElement('span');
    texto.className = 'texto_aviso_personagem';
    texto.textContent = dados.texto;
    aviso.replaceChildren(simbolo, texto);
    aviso.dataset.acao = dados.cor;
    aviso.dataset.personagem = evento.id;
    aviso.hidden = false;
    ajustar();
    if (aviso.hasAttribute('popover') && !aviso.matches(':popover-open'))
      try {
        aviso.showPopover();
      } catch {
        aviso.removeAttribute('popover');
      }
  }
  let fila = [],
    esperando = null,
    timer = null,
    ativo = false;
  function proxima() {
    if (ativo || esperando || !fila.length || document.hidden) return;
    esperando = fila.shift();
    agendar();
  }
  function agendar() {
    clearTimeout(timer);
    timer = setTimeout(
      () => {
        const evento = esperando;
        esperando = null;
        ativo = true;
        mostrar(evento);
        timer = setTimeout(() => {
          ativo = false;
          esconder();
          proxima();
        }, 2000);
      },
      Math.max(0, esperando.quando - performance.now()),
    );
  }
  function cancelar() {
    clearTimeout(timer);
    fila = [];
    esperando = null;
    ativo = false;
    esconder();
  }
  function enfileirar(eventos) {
    if (esperando) {
      clearTimeout(timer);
      esperando = null;
    }
    fila = [];
    fila.push(
      ...eventos.map((e) => ({ ...e, quando: performance.now() + (e.atraso || 0) * 1000 })),
    );
    fila = fila.slice(-3);
    proxima();
  }
  function sincronizar(segundos) {
    for (const e of [...fila, ...(esperando ? [esperando] : [])])
      if (e.atraso > 0) e.quando = performance.now() + segundos * 1000;
    if (esperando) agendar();
  }
  window.addEventListener('resize', ajustar);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelar();
  });
  return { mostrar, esconder, cancelar, enfileirar, sincronizar };
}
