import { precisaEscolherAlvo, orientarPoder } from './orientacoes_poderes.js';
import { iconeNavegacao } from './icones.js';
import { audioJogo } from './audio.js';
import { instalarConstrucao } from './construcao.js';
import { instalarMarcadorSumario } from './marcador_sumario.js';
import {
  cenaSolo,
  duracaoResumoSolo,
  chaveEsperaTrovador,
  restanteEsperaTrovador,
  tempoMinimoTrovador,
} from './solo.js';
import { observar } from './ia.js';
import { ajustarSprites } from './sprites.js';
import { destinatario, faseParaAparelho } from './fluxo_jogadores.js';
import { instalarConsultaPoderes } from './consulta_poderes.js';
import { instalarInspecao, instalarGavetas } from './inspecao.js';
import {
  capturarTela,
  animarTela,
  animarAviso,
  instalarPulso,
  planejarTransicao,
} from './animacoes.js';
import { instalarMovimento, instalarRolagem } from './movimento.js';
import {
  novaPartida,
  executar,
  alvosPoder,
  alvosValidos,
  poder,
  motivoPoder,
  validar,
} from './regras.js';
import { definicao } from './cartas.js';
import { carregar, salvar, apagarPartida } from './armazenamento.js';
import { inicial, configurarPartida, partida, consulta, referenciasDetalhes } from './interface.js';
const app = document.querySelector('#aplicacao'),
  mensagem = document.querySelector('#mensagem');
if (typeof mensagem.showPopover === 'function') mensagem.setAttribute('popover', 'manual');
let nivelConfiguracao = null,
  rascunhoNomes = ['Jogador 1', 'Jogador 2'];
let salvo = carregar(),
  estado = null,
  selecao = null,
  escolha = null,
  modo = null,
  maoAberta = false,
  descarteAberto = false;
let estadoMaquina = null,
  timerMaquina = null,
  workerMaquina = null,
  liberarMaquinaEm = 0,
  contextoMaquina = null,
  estadoResumoSolo = null,
  timerResumoSolo = null,
  relogioResumoSolo = null,
  prazoResumoSolo = 0,
  duracaoResumoAtual = 0;
let chaveTelaEspera = null,
  inicioTelaEspera = 0,
  relogioTelaEspera = null;
let encerrandoTurno = false,
  resolucaoDepois = null,
  jogadorComAparelho = null;
let tempoAviso = null,
  maoAnimadaAte = 0,
  entradaMaoAte = 0,
  construcaoRecente = null,
  compraRecente = null;
function avisar(texto = '', tipo = 'aviso') {
  clearTimeout(tempoAviso);
  mensagem.replaceChildren();
  mensagem.className = tipo;
  if (!texto) {
    if (mensagem.hasAttribute('popover') && mensagem.matches(':popover-open'))
      mensagem.hidePopover();
    mensagem.hidden = true;
    return;
  }
  mensagem.hidden = false;
  audioJogo.aviso(texto, tipo);
  const cancelada = /cancelad[ao]/i.test(texto);
  mensagem.classList.toggle('cancelamento', cancelada);
  if (cancelada) {
    const icone = document.createElement('span');
    icone.className = 'icone_aviso_cancelado';
    icone.setAttribute('aria-hidden', 'true');
    icone.innerHTML = iconeNavegacao('×');
    const conteudo = document.createElement('span');
    conteudo.className = 'texto_aviso_cancelado';
    const titulo = document.createElement('strong');
    titulo.textContent = 'AÇÃO CANCELADA';
    const detalhe = document.createElement('span');
    detalhe.textContent = texto.replace(
      /^(?:Construção|Escolha|Movimento|Ação) cancelad[ao][.!:]?\s*/i,
      '',
    );
    conteudo.append(titulo, detalhe);
    mensagem.append(icone, conteudo);
  } else {
    const conteudo = document.createElement('span');
    conteudo.textContent = texto;
    mensagem.append(conteudo);
  }
  if (mensagem.hasAttribute('popover') && !mensagem.matches(':popover-open'))
    try {
      mensagem.showPopover();
    } catch {
      mensagem.removeAttribute('popover');
    }
  if (tipo !== 'bloqueio')
    tempoAviso = setTimeout(() => avisar(), cancelada ? 3000 : tipo === 'erro' ? 6500 : 4000);
}
function confirmarAcao(titulo, texto, rotulo = 'CONFIRMAR', perigoso = false) {
  const dialogo = document.querySelector('#confirmacao');
  if (dialogo.open) return Promise.resolve(false);
  dialogo.classList.toggle('confirmacao_perigosa', perigoso);
  document.querySelector('#titulo_confirmacao').textContent = titulo;
  document.querySelector('#texto_confirmacao').textContent = texto;
  const aceitar = document.querySelector('#aceitar_confirmacao');
  aceitar.innerHTML =
    '<span aria-hidden="true"><svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="m4 12 5 5L20 6"/></svg></span>';
  aceitar.setAttribute('aria-label', rotulo);
  aceitar.title = rotulo;
  aceitar.classList.toggle('fita_perigo', perigoso);
  dialogo.returnValue = '';
  dialogo.showModal();
  animarAviso(dialogo);
  return new Promise((resolve) =>
    dialogo.addEventListener('close', () => resolve(dialogo.returnValue === 'confirmar'), {
      once: true,
    }),
  );
}
for (const tipo of ['click', 'pointerdown', 'pointerup', 'keydown', 'submit'])
  document.addEventListener(
    tipo,
    (ev) => {
      if (encerrandoTurno) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
audioJogo.instalar(app);
instalarPulso(app);
instalarConsultaPoderes(app);
const ajustesDetalhes = new Map();
function ajustarDetalhes() {
  const painel = app.querySelector('.carta_ampliada');
  if (!painel) return;
  const margem = 10,
    alturaDisponivel = window.innerHeight - margem * 2;
  const larguraInicial = Math.min(420, window.innerWidth - margem * 2);
  const chave = window.innerWidth + 'x' + window.innerHeight;
  let ajuste = ajustesDetalhes.get(chave);
  if (!ajuste) {
    const prova = painel.cloneNode(true);
    prova.classList.add('prova_detalhes');
    Object.assign(prova.style, { top: '0', bottom: 'auto', height: 'auto', maxHeight: 'none' });
    const conteudo = prova.querySelector('.conteudo_detalhes');
    Object.assign(conteudo.style, {
      flex: 'none',
      height: 'auto',
      maxHeight: 'none',
      overflow: 'visible',
    });
    document.body.append(prova);
    const originais = referenciasDetalhes();
    const referencias = [...originais];
    // Cópias também podem combinar um título longo com habilidades de duas partes.
    for (const nome of ['O Golem', 'O Espelho Mágico', 'A Sombra do Peter Pan'])
      for (const html of originais) {
        let copia = html.replace(/<h2>[^<]*<\/h2>/, '<h2>' + nome + '</h2>');
        if (!copia.includes('Poder copiado de'))
          copia = copia.replace(
            '<div class="blocos_habilidades">',
            '<p>Poder copiado de <strong>O Flautista de Hamelin</strong>.</p><div class="blocos_habilidades">',
          );
        referencias.push(copia);
      }
    referencias.push(painel.querySelector('.conteudo_detalhes').innerHTML);
    // Mede todos os personagens com altura natural: nenhum bloco é comprimido.
    for (const largura of [
      ...new Set([larguraInicial, Math.min(480, window.innerWidth - margem * 2)]),
    ]) {
      prova.style.width = largura + 'px';
      for (const fonte of window.innerWidth <= 650 ? [14, 13] : [16, 15, 14]) {
        prova.style.setProperty('--texto_detalhes', fonte + 'px');
        let altura = 0;
        for (const html of referencias) {
          conteudo.innerHTML = html;
          const estilo = getComputedStyle(prova);
          const bordas = parseFloat(estilo.borderTopWidth) + parseFloat(estilo.borderBottomWidth);
          const cabecalho =
            prova.querySelector('.topo_detalhes')?.getBoundingClientRect().height || 0;
          altura = Math.max(altura, Math.ceil(cabecalho + conteudo.scrollHeight + bordas + 4));
        }
        ajuste = { fonte, largura, altura: Math.max(360, altura) };
        if (ajuste.altura <= alturaDisponivel) break;
      }
      if (ajuste.altura <= alturaDisponivel) break;
    }
    prova.remove();
    ajustesDetalhes.set(chave, ajuste);
  }
  painel.style.width = ajuste.largura + 'px';
  painel.style.setProperty('--texto_detalhes', ajuste.fonte + 'px');
  // Mantém o topo e libera crescimento para baixo, limitado pela janela.
  const linha = app.querySelector('.area_fila .direcao');
  const base = linha ? linha.getBoundingClientRect().top + 72 : window.innerHeight - 64;
  const altura = Math.min(ajuste.altura, alturaDisponivel);
  const topoPreferido = Math.max(margem, base - Math.min(440, altura));
  const topo = Math.min(topoPreferido, Math.max(margem, window.innerHeight - margem - altura));
  painel.style.top = Math.round(topo) + 'px';
  painel.style.bottom = 'auto';
  painel.style.height = Math.ceil(altura) + 'px';
}

function ajustarFilaCelular() {
  const fila = app.querySelector('.fila_compartilhada');
  if (!fila) return;
  for (const nome of ['--altura_carta', '--lado_retrato', '--largura_carta', '--desnivel_j2'])
    fila.style.removeProperty(nome);
  if (window.innerWidth > 700) return;
  const r = fila.getBoundingClientRect(),
    estilo = getComputedStyle(fila);
  const jogo = app.querySelector('.jogo').getBoundingClientRect();
  // Reserva a barra da mão mesmo quando a gaveta está aberta sobre a mesa.
  const fim = Math.min(r.bottom, jogo.bottom - 54);
  const disponivel = fim - r.top - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
  const ladoMinimo = window.innerHeight <= 600 ? 48 : 64;
  const lado = Math.max(ladoMinimo, Math.min(104, Math.floor((disponivel - 106) / 8) * 8));
  const altura = lado + 90;
  fila.style.setProperty('--lado_retrato', lado + 'px');
  fila.style.setProperty('--largura_carta', Math.max(112, lado + 24) + 'px');
  fila.style.setProperty('--altura_carta', altura + 'px');
  fila.style.setProperty(
    '--desnivel_j2',
    Math.max(0, Math.min(altura / 2, disponivel - altura)) + 'px',
  );
}

function separarExtremidades() {
  ajustarFilaCelular();
  const fila = app.querySelector('.fila_compartilhada');
  if (!fila) return;
  fila.querySelectorAll('.divisoria_fila').forEach((el) => el.remove());
  const cartas = [...fila.querySelectorAll(':scope > [data-carta]')];
  if (cartas.length < 2) return;
  const recente = cartas.findIndex((c) => c.classList.contains('chegada_construcao'));
  const zonaTraseira = fila.querySelector('[data-destino-construcao="traseira"]'),
    zonaFrente = fila.querySelector('[data-destino-construcao="frente"]');
  const limites = new Map();
  function adicionar(referencia, tipo) {
    if (!referencia) return;
    const tipos = limites.get(referencia) || new Set();
    tipos.add(tipo);
    limites.set(referencia, tipos);
  }
  adicionar(zonaTraseira ? cartas[0] : cartas[1], 'traseira');
  adicionar(zonaFrente || cartas.at(-1), 'frente');
  if (recente >= 0) adicionar(cartas[recente === 0 ? 1 : recente], 'construcao');
  for (const [referencia, tipos] of limites) {
    const ambas = tipos.has('traseira') && tipos.has('frente');
    const linha = document.createElement('span');
    linha.className =
      'divisoria_fila ' +
      [...tipos].map((t) => 'divisoria_' + t).join(' ') +
      (ambas ? ' divisoria_ambas' : '');
    linha.setAttribute('aria-hidden', 'true');
    fila.insertBefore(linha, referencia);
    const area = fila.getBoundingClientRect(),
      titulo = fila.previousElementSibling.getBoundingClientRect(),
      mao = app.querySelector('.mao_recolhida').getBoundingClientRect();
    const topo = titulo.bottom + 18,
      fim = Math.min(area.bottom, mao.top) - 18;
    linha.style.alignSelf = 'flex-start';
    linha.style.marginTop = topo - area.top - parseFloat(getComputedStyle(fila).paddingTop) + 'px';
    linha.style.marginBottom = '0';
    linha.style.height = Math.max(6, fim - topo) + 'px';
    const quantidade = Math.max(2, Math.floor((linha.getBoundingClientRect().height + 8) / 14));
    for (let n = 0; n < quantidade; n++) linha.append(document.createElement('i'));
  }
}

function vezDoTrovador() {
  return Boolean(
    estado?.solo &&
    !estado.resumoTurno &&
    estado.resultado === null &&
    (estado.pendente ? estado.pendente.jogador === 1 : estado.atual === 1),
  );
}
function atualizarBarraTrovador() {
  const barra = app.querySelector('.progresso_trovador');
  if (!barra || !chaveTelaEspera) return;
  const fracao = Math.min(1, Math.max(0, (Date.now() - inicioTelaEspera) / tempoMinimoTrovador));
  barra.querySelector('i').style.transform = 'scaleX(' + fracao + ')';
  barra.setAttribute('aria-valuemin', '0');
  barra.setAttribute('aria-valuemax', '100');
  barra.setAttribute('aria-valuenow', String(Math.round(fracao * 100)));
}
function atualizarTelaEspera() {
  const chave = chaveEsperaTrovador(estado);
  if (chave !== chaveTelaEspera) {
    clearInterval(relogioTelaEspera);
    chaveTelaEspera = chave;
    inicioTelaEspera = chave ? Date.now() : 0;
    if (chave) relogioTelaEspera = setInterval(atualizarBarraTrovador, 50);
  }
  atualizarBarraTrovador();
}
function atualizarBarraResumoSolo() {
  const barra = app.querySelector('.barra_tempo_resumo');
  if (!barra) return;
  const restante = Math.max(0, prazoResumoSolo - Date.now()),
    segundos = Math.ceil(restante / 1000),
    fracao = duracaoResumoAtual ? restante / duracaoResumoAtual : 0;
  barra.querySelector('span').style.transform = 'scaleX(' + Math.min(1, fracao) + ')';
  barra.setAttribute('aria-valuenow', String(segundos));
  const texto = app.querySelector('.tempo_restante');
  if (texto) texto.textContent = segundos + ' s';
}
function programarResumoSolo() {
  if (!estado?.solo || !estado.resumoTurno) {
    clearTimeout(timerResumoSolo);
    clearInterval(relogioResumoSolo);
    estadoResumoSolo = null;
    prazoResumoSolo = 0;
    return;
  }
  if (estadoResumoSolo === estado) {
    atualizarBarraResumoSolo();
    return;
  }
  clearTimeout(timerResumoSolo);
  clearInterval(relogioResumoSolo);
  const referencia = estado;
  estadoResumoSolo = referencia;
  duracaoResumoAtual = duracaoResumoSolo(estado);
  prazoResumoSolo = Date.now() + duracaoResumoAtual;
  atualizarBarraResumoSolo();
  relogioResumoSolo = setInterval(atualizarBarraResumoSolo, 100);
  timerResumoSolo = setTimeout(() => {
    if (estado !== referencia || !estado?.solo || !estado.resumoTurno) return;
    estadoResumoSolo = null;
    agir({ tipo: 'seguir_turno' });
  }, duracaoResumoAtual);
}
function programarMaquina() {
  if (!vezDoTrovador()) {
    clearTimeout(timerMaquina);
    workerMaquina?.terminate();
    workerMaquina = null;
    estadoMaquina = null;
    contextoMaquina = null;
    return;
  }
  if (encerrandoTurno || estadoMaquina === estado) return;
  clearTimeout(timerMaquina);
  workerMaquina?.terminate();
  workerMaquina = null;
  const referencia = estado,
    primeira = contextoMaquina !== estado.turno;
  contextoMaquina = estado.turno;
  estadoMaquina = referencia;
  timerMaquina = setTimeout(
    () => {
      if (estado !== referencia || !vezDoTrovador() || encerrandoTurno) {
        estadoMaquina = null;
        return;
      }
      const observacao = observar(estado, 1);
      const concluir = (acao) => {
        workerMaquina?.terminate();
        workerMaquina = null;
        if (estado !== referencia || !vezDoTrovador()) return;
        estadoMaquina = null;
        liberarMaquinaEm = Date.now() + 140;
        agir(acao || { tipo: 'encerrar' });
      };
      const alternativa = async () => {
        workerMaquina?.terminate();
        workerMaquina = null;
        const { escolherJogada } = await import('./ia.js');
        if (estado === referencia) concluir(escolherJogada(observacao, 'normal'));
      };
      try {
        workerMaquina = new Worker(new URL('./ia_worker.js', import.meta.url), { type: 'module' });
        workerMaquina.onmessage = (ev) => (ev.data.acao ? concluir(ev.data.acao) : alternativa());
        workerMaquina.onerror = alternativa;
        workerMaquina.postMessage({ estado: observacao, nivel: estado.solo });
      } catch {
        alternativa();
      }
    },
    Math.max(primeira ? 900 : 140, liberarMaquinaEm - Date.now(), entradaMaoAte - Date.now()),
  );
}
// A vez do Trovador não apresenta a mesa nem aceita comandos de jogo.
for (const tipo of ['click', 'pointerdown', 'keydown', 'submit'])
  app.addEventListener(
    tipo,
    (ev) => {
      if (!vezDoTrovador()) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
    },
    { capture: true },
  );

function ajustarFitaInicio() {
  const fita = app.querySelector('.marcador_inicio'),
    titulo = app.querySelector('.apresentacao_inicio h1'),
    cabecalho = document.querySelector('.cabecalho');
  if (!fita || !titulo || !cabecalho) return;
  const inicio = cabecalho.getBoundingClientRect().bottom - 6,
    limite = titulo.getBoundingClientRect();
  fita.style.top = inicio + 'px';
  fita.style.left = limite.left + 'px';
  fita.style.height = Math.max(28, limite.top - inicio - 20) + 'px';
}
let reposicionandoAte = 0;
function desenhar(animarCartas = false, transicao = null, semAnimacao = false) {
  if (
    (encerrandoTurno || Date.now() < entradaMaoAte || Date.now() < reposicionandoAte) &&
    !animarCartas
  )
    return;
  document.body.classList.toggle('turno_do_trovador', vezDoTrovador());
  const controle = document.querySelector('#regras');
  controle.innerHTML =
    '<span aria-hidden="true"><svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="m6 6 12 12M18 6 6 18"/></svg></span>';
  controle.setAttribute('aria-label', 'Abortar partida');
  controle.title = 'Abortar partida';
  controle.classList.add('controle_fita', 'fita_perigo');
  controle.classList.toggle('abortar_partida', Boolean(estado));
  controle.hidden = !estado;
  const antes = capturarTela(app);
  if (escolha) antes.paineis.delete('.carta_ampliada');
  const posicaoFila = app.querySelector('.fila_compartilhada')?.scrollLeft || 0,
    posicaoMao = app.querySelector('.faixa_mao')?.scrollLeft || 0;
  document.body.classList.toggle(
    'em_partida',
    estado?.fase === 'jogo' && !estado?.resumoTurno && cenaSolo(estado) !== 'aguardar',
  );
  document.body.classList.toggle('na_tela_inicial', !estado);
  document.body.classList.toggle('configurando_partida', !estado && nivelConfiguracao !== null);
  app.innerHTML = estado
    ? partida(estado, selecao, escolha, modo, maoAberta, descarteAberto)
    : nivelConfiguracao !== null
      ? configurarPartida(nivelConfiguracao, rascunhoNomes)
      : inicial(salvo.estado);

  const fila = app.querySelector('.fila_compartilhada'),
    mao = app.querySelector('.faixa_mao');
  if (fila) fila.scrollLeft = posicaoFila;
  if (mao) mao.scrollLeft = posicaoMao;
  if (transicao?.tipo === 'construir' && fila) {
    const posicao = estado.fila.findIndex((c) => c.id === transicao.carta);
    fila.scrollLeft = posicao === 0 ? fila.scrollWidth : 0;
  }
  if (transicao?.tipo === 'reposicionar' && fila) {
    const destino = fila.querySelector('[data-carta="' + transicao.movidas[0] + '"]');
    if (destino) {
      const r = destino.getBoundingClientRect(),
        f = fila.getBoundingClientRect();
      if (r.left < f.left || r.right > f.right)
        fila.scrollLeft += r.left - f.left - (f.width - r.width) / 2;
    }
  }
  if (transicao?.novas.length && mao) mao.scrollLeft = 0;
  const botaoDescarte = app.querySelector('.abrir_descarte'),
    painelDescarte = app.querySelector('.descarte_aberto');
  if (botaoDescarte && painelDescarte) {
    const origem = painelDescarte.parentElement.getBoundingClientRect(),
      botao = botaoDescarte.getBoundingClientRect();
    painelDescarte.style.width = botao.width + 'px';
    painelDescarte.style.left = botao.left - origem.left + 'px';
    painelDescarte.style.top = botao.bottom - origem.top + 'px';
  }
  if (construcaoRecente && Date.now() < construcaoRecente.ate) {
    const carta = app.querySelector(
      '.fila_compartilhada [data-carta="' + construcaoRecente.id + '"]',
    );
    if (carta) {
      carta.classList.add('chegada_construcao');
      if (!carta.querySelector('.sinal_construir'))
        carta.insertAdjacentHTML(
          'beforeend',
          '<span class="sinal_construir" aria-label="Carta construída">+</span>',
        );
    }
  }
  if (modo !== 'construir' && compraRecente && Date.now() < compraRecente.ate)
    for (const id of compraRecente.ids) {
      const carta = app.querySelector('.faixa_mao [data-carta="' + id + '"]');
      if (carta) {
        carta.classList.add('carta_recebida');
        carta.insertAdjacentHTML(
          'beforeend',
          '<span class="sinal_compra" aria-label="Carta comprada">↓</span>',
        );
      }
    }
  atualizarPrevisaoAcao();
  separarExtremidades();
  if (transicao?.tipo === 'construir' && fila)
    fila.scrollLeft = estado.fila[0]?.id === transicao.carta ? fila.scrollWidth : 0;
  ajustarDetalhes();
  ajustarSprites(app);
  ajustarFitaInicio();
  if (cenaSolo(estado) === 'aguardar') {
    for (const fantasma of document.querySelectorAll('.fantasma_movimento')) fantasma.remove();
  } else
    animarTela(
      app,
      antes,
      estado ? estado.fase + ':' + estado.atual + ':' + estado.turno : null,
      animarCartas && !semAnimacao,
      semAnimacao ? null : transicao,
    );
  audioJogo.atualizar(estado, {
    modo,
    maoAberta,
    descarteAberto,
    selecao,
    escolha,
    configuracao: nivelConfiguracao !== null,
  });
  atualizarTelaEspera();
  programarMaquina();
  programarResumoSolo();
}
// Previsão visual não gasta ações; o destaque termina ao confirmar a jogada.
let botaoAcaoPrevista = null;
function atualizarPrevisaoAcao() {
  const pontos = [...app.querySelectorAll('.pontos_acoes>span')];
  pontos.forEach((p) => p.classList.remove('acao_prevista', 'acao_gasta'));
  if (
    !estado ||
    estado.fase !== 'jogo' ||
    estado.resumoTurno ||
    encerrandoTurno ||
    vezDoTrovador() ||
    estado.acoes <= 0
  )
    return;
  const origem = escolha?.carta ?? (modo === 'ativar' ? selecao : null),
    indice = estado.fila.findIndex((c) => c.id === origem);
  const gratuita =
    (Boolean(escolha) || modo === 'ativar') &&
    indice >= 0 &&
    poder(estado, estado.fila[indice + 1]) === 11;
  const botao =
    botaoAcaoPrevista?.isConnected && !botaoAcaoPrevista.disabled ? botaoAcaoPrevista : null;
  const comando = botao?.dataset.comando;
  const botaoPago =
    ['construir', 'mover', 'comprar', 'ativar'].includes(comando) ||
    (comando === 'selecionar_poder' && !gratuita);
  if (((modo || escolha) && !gratuita) || botaoPago)
    pontos[estado.acoes - 1]?.classList.add('acao_prevista');
}
function preverBotao(alvo) {
  botaoAcaoPrevista = alvo?.closest?.('button') || null;
  atualizarPrevisaoAcao();
}
app.addEventListener('pointerover', (ev) => preverBotao(ev.target));
app.addEventListener('pointerout', (ev) => preverBotao(ev.relatedTarget));
app.addEventListener('focusin', (ev) => preverBotao(ev.target));
app.addEventListener('focusout', (ev) => preverBotao(ev.relatedTarget));
window.addEventListener('resize', () => {
  ajustarFitaInicio();
  ajustesDetalhes.clear();
  ajustarDetalhes();
  separarExtremidades();
  ajustarSprites();
});
document.fonts.ready.then(() => {
  ajustarFitaInicio();
  ajustesDetalhes.clear();
  ajustarDetalhes();
  ajustarSprites();
});
function guardar() {
  const paraSalvar = resolucaoDepois || estado;
  const erro = salvar(paraSalvar);
  if (erro) avisar(erro);
  salvo = { estado: paraSalvar };
}
function agir(acao) {
  if (encerrandoTurno) return;
  const animacaoRapida = Boolean(estado?.solo && (estado.atual === 1 || vezDoTrovador()));
  const r = executar(estado, acao, { adiarEncerramento: true });
  if (r.erro) {
    avisar(r.erro + ' Nenhuma ação foi gasta.', 'erro');
    return;
  }
  // A espera já terminou antes desta decisão: prossiga sem repetir o aviso vermelho.
  if (
    acao.tipo === 'proteger' &&
    estado.acoes === 0 &&
    !r.estado.pendente &&
    r.estado.encerramentoPendente
  ) {
    const final = executar({ ...r.estado, fase: 'jogo' }, { tipo: 'encerrar' });
    if (!final.erro) r.estado = final.estado;
  }
  // Só troca a tela depois do mínimo de leitura, sem atrasar cada jogada interna.
  const proximaTela = { ...r.estado, fase: faseParaAparelho(r.estado, jogadorComAparelho) };
  const chaveAtual = chaveEsperaTrovador(estado);
  if (chaveAtual && chaveAtual !== chaveEsperaTrovador(proximaTela)) {
    const restante = restanteEsperaTrovador(inicioTelaEspera);
    if (restante > 0) {
      const referencia = estado;
      clearTimeout(timerMaquina);
      estadoMaquina = referencia;
      timerMaquina = setTimeout(() => {
        if (estado !== referencia) return;
        estadoMaquina = null;
        agir(acao);
      }, restante);
      return;
    }
  }
  audioJogo.acao(acao, estado, r.estado, { oculta: animacaoRapida });
  if (acao.tipo === 'pronto') jogadorComAparelho = destinatario(estado);
  const aguardarResolucao = estado.acoes > 0 && r.estado.acoes === 0 && Boolean(r.estado.pendente);
  const transicao = planejarTransicao(estado, r.estado, acao);
  if (transicao?.novas.length) {
    const compra = { ids: transicao.novas, ate: Date.now() + 4000 };
    compraRecente = compra;
    setTimeout(() => {
      if (compraRecente !== compra) return;
      compraRecente = null;
      for (const id of compra.ids) {
        const carta = app.querySelector('.faixa_mao [data-carta="' + id + '"]');
        carta?.classList.remove('carta_recebida');
        carta?.querySelector('.sinal_compra')?.remove();
      }
    }, 4000);
  }
  if (acao.tipo === 'construir') {
    const recente = { id: acao.carta, ate: Date.now() + 4000 };
    construcaoRecente = recente;
    setTimeout(() => {
      if (construcaoRecente !== recente) return;
      construcaoRecente = null;
      const carta = app.querySelector('.fila_compartilhada [data-carta="' + recente.id + '"]');
      carta?.classList.remove('chegada_construcao');
      carta?.querySelector('.sinal_construir')?.remove();
      separarExtremidades();
    }, 4000);
  }
  // Abre a mão antiga primeiro: suas cartas são as posições iniciais da compra.
  if (transicao?.novas.length && !(estado.solo && estado.atual === 1)) {
    maoAberta = true;
    descarteAberto = false;
    desenhar();
    const faixa = app.querySelector('.faixa_mao');
    if (faixa) faixa.scrollLeft = 0;
    maoAnimadaAte = Date.now() + 5000;
    entradaMaoAte = Date.now() + 2100;
  } else {
    maoAnimadaAte = 0;
    entradaMaoAte = 0;
  }
  estado = r.estado;
  descarteAberto = false;
  maoAberta = Boolean(transicao?.novas.length) && !(estado.solo && r.estado.atual === 1);
  modo = null;
  escolha = null;
  selecao = null;
  avisar();
  estado.fase = faseParaAparelho(estado, jogadorComAparelho);
  if (aguardarResolucao) {
    resolucaoDepois = { ...estado };
    estado = { ...estado, fase: 'jogo' };
  }
  if (transicao?.tipo === 'reposicionar' && !animacaoRapida)
    reposicionandoAte = Date.now() + (transicao.duracao || 2000);
  guardar();
  desenhar(true, transicao, animacaoRapida);
  audioJogo.sincronizar(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      !transicao?.novas.length &&
      transicao?.tipo !== 'reposicionar' &&
      transicao?.tipo !== 'construir'
      ? 0
      : (transicao?.duracao || 2000) / 1000,
  );
  if ((estado.encerramentoPendente || resolucaoDepois) && estado.fase === 'jogo') {
    encerrandoTurno = true;
    document.body.classList.add('encerrando_turno');
    const animacoes = document
      .getAnimations()
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .map((a) => a.finished);
    Promise.allSettled(animacoes).then(async () => {
      if ((estado?.encerramentoPendente || resolucaoDepois) && estado.fase === 'jogo')
        app
          .querySelector('.estado_mesa')
          ?.insertAdjacentHTML(
            'beforebegin',
            '<div class="transicao_turno" role="alert" aria-live="assertive"><div class="aviso_acoes_esgotadas"><span class="acoes_esgotadas_pontos" aria-hidden="true">● ● ●</span><strong>AÇÕES ESGOTADAS</strong><span>3 de 3 ações usadas.</span><p>Encerrando turno…</p></div></div>',
          );
      await new Promise((resolve) => setTimeout(resolve, animacaoRapida ? 180 : 3000));
      encerrandoTurno = false;
      entradaMaoAte = 0;
      maoAnimadaAte = 0;
      document.body.classList.remove('encerrando_turno');
      if (resolucaoDepois) {
        estado = resolucaoDepois;
        resolucaoDepois = null;
        guardar();
        desenhar();
      } else if (estado?.encerramentoPendente) agir({ tipo: 'encerrar' });
    });
  }
}

function iniciarAtiva(id) {
  const c = estado.fila.find((c) => c.id === id);
  if (!c || !alvosValidos(estado, c).length) {
    avisar(motivoPoder(estado, c) || 'Escolha uma carta destacada com ativa disponível.', 'erro');
    return;
  }
  modo = null;
  selecao = id;
  avisar();
  const efeito = poder(estado, c),
    alvos = alvosValidos(estado, c);
  if (alvos.length === 1 && !precisaEscolherAlvo(efeito))
    agir({ tipo: 'poder', carta: id, alvo: alvos[0] });
  else {
    escolha = { carta: id, efeito };
    selecao = null;
    desenhar();
  }
}
function escolherModo(nivel) {
  const form = app.querySelector('#nova');
  if (!form || !nivel) return;
  nivelConfiguracao = nivel;
  form.querySelector('#modo_partida').value = nivel;
  const descricao = form.querySelector('.descricao_solo');
  descricao.dataset.nivel = nivel;
  descricao.querySelector('strong').textContent = nivel === 'dificil' ? 'DIFÍCIL' : 'NORMAL';
  descricao.querySelector('span').textContent =
    nivel === 'dificil'
      ? 'Planeja sequências e aproveita poderes gratuitos.'
      : 'Avalia cada jogada e o fim do turno.';
}
app.addEventListener('change', (ev) => {
  if (ev.target.name === 'dificuldade') escolherModo(ev.target.value);
});
app.addEventListener('click', (ev) => {
  const botao = ev.target.closest('[data-modo-partida]');
  if (!botao || estado) return;
  nivelConfiguracao = botao.dataset.modoPartida;
  desenhar();
  window.scrollTo(0, 0);
  app.querySelector('#titulo_configuracao')?.focus({ preventScroll: true });
});
app.addEventListener('submit', async (ev) => {
  if (ev.target.id !== 'nova') return;
  ev.preventDefault();
  const f = new FormData(ev.target);
  rascunhoNomes = [f.get('jogador_um') || 'Jogador 1', f.get('jogador_dois') || rascunhoNomes[1]];
  if (
    salvo.estado?.resultado === null &&
    !(await confirmarAcao(
      'SUBSTITUIR PARTIDA?',
      'O progresso da partida atual será substituído. Essa mudança não pode ser desfeita.',
      'NOVA PARTIDA',
    ))
  )
    return;
  jogadorComAparelho = null;
  estado = novaPartida([
    f.get('jogador_um').trim() || 'Jogador 1',
    f.get('modo_partida') ? 'O Trovador' : f.get('jogador_dois').trim() || 'Jogador 2',
  ]);
  if (f.get('modo_partida')) {
    estado.solo = f.get('modo_partida');
    jogadorComAparelho = 0;
    estado.fase = 'jogo';
  }
  nivelConfiguracao = null;
  contextoMaquina = null;
  liberarMaquinaEm = 0;
  guardar();
  desenhar();
});
let cliqueAlvoPendente = null;
function trocarModo(novo, id = null) {
  clearTimeout(cliqueAlvoPendente);
  maoAnimadaAte = 0;
  modo = novo;
  escolha = null;
  selecao = id;
  descarteAberto = false;
  maoAberta = novo === 'construir';
  avisar();
  desenhar();
  if (novo === 'construir') {
    const fila = app.querySelector('.fila_compartilhada');
    if (fila) fila.scrollLeft = fila.scrollWidth;
  }
}
app.addEventListener('pointerdown', () => clearTimeout(cliqueAlvoPendente), { capture: true });
function cancelarEscolha() {
  clearTimeout(cliqueAlvoPendente);
  if (modo === 'construir') maoAberta = false;
  maoAnimadaAte = 0;
  modo = null;
  escolha = null;
  selecao = null;
  desenhar();
  avisar('Escolha cancelada. Nenhuma ação foi gasta.', 'informacao');
}
// O segundo clique só abre CONSTRUIR; não confirma a carta automaticamente.
let ultimoCliqueMao = null,
  suprimirCliqueConstrucao = false;
app.addEventListener(
  'pointerdown',
  (ev) => {
    if (
      ev.button !== 0 ||
      !ev.isPrimary ||
      estado?.fase !== 'jogo' ||
      estado.resumoTurno ||
      estado.pendente ||
      encerrandoTurno ||
      vezDoTrovador() ||
      modo === 'construir' ||
      Date.now() < entradaMaoAte ||
      document.querySelector('dialog[open]')
    )
      return;
    const carta = ev.target.closest('.faixa_mao .carta[data-zona="mao"]');
    if (!carta) {
      ultimoCliqueMao = null;
      return;
    }
    const id = Number(carta.dataset.carta),
      agora = performance.now();
    if (
      ultimoCliqueMao?.id === id &&
      agora - ultimoCliqueMao.tempo < 350 &&
      Math.hypot(ev.clientX - ultimoCliqueMao.x, ev.clientY - ultimoCliqueMao.y) < 16 &&
      !validar(estado, { tipo: 'construir', carta: id })
    ) {
      ultimoCliqueMao = null;
      suprimirCliqueConstrucao = true;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      trocarModo('construir', id);
      return;
    }
    ultimoCliqueMao = { id, tempo: agora, x: ev.clientX, y: ev.clientY };
  },
  { capture: true },
);
app.addEventListener(
  'click',
  (ev) => {
    if (suprimirCliqueConstrucao) {
      suprimirCliqueConstrucao = false;
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
  },
  { capture: true },
);
document.addEventListener('pointerup', () => {
  if (suprimirCliqueConstrucao)
    setTimeout(() => {
      suprimirCliqueConstrucao = false;
    }, 0);
});
document.addEventListener('pointercancel', () => {
  ultimoCliqueMao = null;
  suprimirCliqueConstrucao = false;
});
let gestoFundo = null;
app.addEventListener('pointerdown', (ev) => {
  gestoFundo = { x: ev.clientX, y: ev.clientY, moveu: false };
});
app.addEventListener('pointermove', (ev) => {
  if (gestoFundo && Math.hypot(ev.clientX - gestoFundo.x, ev.clientY - gestoFundo.y) > 8)
    gestoFundo.moveu = true;
});
app.addEventListener('pointercancel', () => {
  gestoFundo = null;
});
app.addEventListener('click', async (ev) => {
  const botao = ev.target.closest('button');
  if (!botao) {
    const fundo =
      ev.target.matches('.fila_compartilhada,.area_fila,.mesa_compacta,.jogo') ||
      (modo === 'construir' && ev.target.matches('.faixa_mao,.mao_recolhida'));
    if (
      fundo &&
      !gestoFundo?.moveu &&
      (modo || escolha) &&
      estado?.fase === 'jogo' &&
      !estado.resumoTurno &&
      !estado.pendente &&
      !encerrandoTurno &&
      !vezDoTrovador() &&
      Date.now() >= entradaMaoAte &&
      !document.querySelector('dialog[open]')
    )
      cancelarEscolha();
    return;
  }
  if (Date.now() < entradaMaoAte) {
    ev.preventDefault();
    return;
  }
  if (botao.dataset.acao) {
    agir(JSON.parse(botao.dataset.acao));
    return;
  }
  if (botao.dataset.carta) {
    const id = Number(botao.dataset.carta);
    if (botao.dataset.zona === 'descarte') {
      selecao = id;
      avisar();
      desenhar();
      return;
    }
    if (modo === 'ativar') {
      selecao = id;
      avisar();
      desenhar();
      return;
    }
    if (modo === 'construir' && botao.dataset.zona === 'mao') {
      selecao = id;
      avisar();
      desenhar();
      return;
    }
    if (botao.dataset.zona === 'mao' || modo === 'construir') {
      selecao = id;
      avisar();
      desenhar();
      return;
    }
    if (escolha && ev.isTrusted && ev.detail === 1) {
      const referencia = estado,
        alvoPendente = escolha;
      clearTimeout(cliqueAlvoPendente);
      cliqueAlvoPendente = setTimeout(() => {
        if (estado === referencia && escolha === alvoPendente && !encerrandoTurno)
          app.querySelector('.fila_compartilhada [data-carta="' + id + '"]').click();
      }, 350);
      return;
    }
    if (escolha) {
      const origem = estado.fila.find((c) => c.id === escolha.carta);
      if (!alvosValidos(estado, origem, escolha).includes(id)) {
        avisar(orientarPoder(estado, escolha), 'aviso');
        return;
      }
      if (escolha.efeito === 8 && !escolha.espelho) {
        const efeito = poder(
          estado,
          estado.fila.find((c) => c.id === id),
        );
        if (['ativo', 'ambos'].includes(definicao(efeito).tipo)) {
          const alvos = alvosPoder(estado, origem, efeito);
          if (!alvos.length) {
            avisar('Esse poder não possui alvo válido a partir do Espelho.');
            return;
          }
          escolha = { ...escolha, efeito, espelho: id };
          if (alvos.length === 1 && !precisaEscolherAlvo(efeito)) {
            agir({ tipo: 'poder', carta: origem.id, alvo: id, segundoAlvo: alvos[0] });
            return;
          }
          selecao = null;
          desenhar();
          return;
        }
      }
      agir({
        tipo: 'poder',
        carta: origem.id,
        alvo: escolha.espelho || id,
        segundoAlvo: escolha.espelho ? id : undefined,
      });
      return;
    }
    selecao = id;
    avisar();
    desenhar();
    return;
  }
  switch (botao.dataset.comando) {
    case 'consultar_regras':
      abrirManual();
      break;
    case 'consultar_tematica':
      abrirManual();
      document.querySelector('#manual_tematica')?.scrollIntoView({ block: 'start' });
      break;
    case 'voltar_modos': {
      const f = new FormData(app.querySelector('#nova'));
      rascunhoNomes = [
        f.get('jogador_um') || 'Jogador 1',
        f.get('jogador_dois') || rascunhoNomes[1],
      ];
      nivelConfiguracao = null;
      desenhar();
      app.querySelector('[data-modo-partida]')?.focus({ preventScroll: true });
      break;
    }
    case 'continuar':
      jogadorComAparelho = null;
      estado = JSON.parse(JSON.stringify(salvo.estado));
      if (estado.fase !== 'fim')
        estado.fase = estado.solo ? (estado.pendente ? 'decisao' : 'jogo') : 'passagem';
      guardar();
      if (estado.encerramentoPendente && !estado.pendente) agir({ tipo: 'encerrar' });
      else desenhar();
      break;
    case 'revanche':
      if (estado?.resultado !== null) {
        jogadorComAparelho = null;
        const solo = estado.solo;
        contextoMaquina = null;
        liberarMaquinaEm = 0;
        estado = novaPartida([...estado.jogadores]);
        if (solo) {
          estado.solo = solo;
          estado.fase = 'jogo';
          jogadorComAparelho = 0;
        }
        selecao = null;
        escolha = null;
        modo = null;
        maoAberta = false;
        descarteAberto = false;
        avisar();
        guardar();
        desenhar();
      }
      break;
    case 'inicio':
      nivelConfiguracao = null;
      jogadorComAparelho = null;
      modo = null;
      estado = null;
      escolha = null;
      selecao = null;
      desenhar();
      break;
    case 'seguir_turno':
      agir({ tipo: 'seguir_turno' });
      break;
    case 'pronto':
      agir({ tipo: 'pronto' });
      break;
    case 'proteger':
      agir({ tipo: 'proteger', aceitar: true });
      break;
    case 'recusar':
      agir({ tipo: 'proteger', aceitar: false });
      break;
    case 'alternar_descarte':
      if (modo === 'construir') break;
      descarteAberto =
        ev.pointerType === 'touch' || ev.pointerType === 'pen' ? !descarteAberto : true;
      maoAberta = false;
      selecao = null;
      desenhar();
      break;
    case 'alternar_mao':
      descarteAberto = false;
      maoAberta =
        modo === 'construir' ||
        (ev.pointerType === 'touch' || ev.pointerType === 'pen' ? !maoAberta : true);
      selecao = null;
      desenhar();
      break;
    case 'construir':
    case 'mover':
    case 'ativar':
      trocarModo(botao.dataset.comando);
      break;
    case 'comprar':
      agir({ tipo: 'comprar' });
      break;
    case 'encerrar': {
      const turnoAtual = estado.turno;
      if (
        estado.acoes > 0 &&
        !(await confirmarAcao(
          'ENCERRAR TURNO?',
          `Restam ${estado.acoes} ações. Resolva os efeitos finais e destrua a traseira. Não pode desfazer.`,
          'ENCERRAR',
        ))
      )
        break;
      if (estado?.fase === 'jogo' && estado.turno === turnoAtual) agir({ tipo: 'encerrar' });
      break;
    }
    case 'cancelar':
      cancelarEscolha();
      break;
    case 'selecionar_poder':
      iniciarAtiva(selecao);
      break;
  }
});
instalarInspecao(app, {
  obterSelecao: () => selecao,
  podeInspecionar: () =>
    !vezDoTrovador() &&
    Date.now() >= entradaMaoAte &&
    estado?.fase === 'jogo' &&
    !escolha &&
    app.dataset.preparandoMovimento !== 'true' &&
    app.dataset.construindoArraste !== 'true' &&
    modo !== 'mover' &&
    app.dataset.deslizando !== 'true' &&
    !document.querySelector('dialog[open]'),
  mostrar: (id) => {
    if (selecao !== id) {
      selecao = id;
      desenhar();
    }
  },
  fechar: () => {
    if (app.dataset.construindoArraste === 'true') return;
    if (selecao !== null) {
      selecao = null;
      desenhar();
    }
  },
});
instalarGavetas(app, {
  obterAberta: () => (maoAberta ? 'mao' : descarteAberto ? 'descarte' : null),
  podeFechar: () => modo !== 'construir' && Date.now() >= maoAnimadaAte,
  abrir: (tipo) => {
    if (vezDoTrovador()) return;
    if (Date.now() < entradaMaoAte) return;
    if (modo === 'construir' && tipo !== 'mao') return;
    if (tipo === 'mao') {
      maoAberta = true;
      descarteAberto = false;
    } else {
      descarteAberto = true;
      maoAberta = false;
    }
    desenhar();
  },
  fechar: ({ preservarSelecao = false } = {}) => {
    if (modo === 'construir' || Date.now() < maoAnimadaAte) return;
    if (maoAberta || descarteAberto) {
      maoAberta = false;
      descarteAberto = false;
      if (!preservarSelecao) selecao = null;
      desenhar();
    }
  },
});
instalarConstrucao(app, {
  obterEstado: () => estado,
  obterModo: () => modo,
  obterSelecao: () => selecao,
  ativarConstrucao: (id) => trocarModo('construir', id),
  atualizarDivisorias: separarExtremidades,
  reabrirInspecao: (id) => {
    selecao = id;
    desenhar();
  },
  fecharInspecao: () => {
    selecao = null;
    app.querySelector('.carta_ampliada')?.remove();
    for (const carta of app.querySelectorAll('.carta.selecionada')) {
      carta.classList.remove('selecionada');
      carta.setAttribute('aria-pressed', 'false');
    }
  },
  podeInteragir: () =>
    estado?.fase === 'jogo' &&
    !estado.resumoTurno &&
    !estado.pendente &&
    !encerrandoTurno &&
    !vezDoTrovador() &&
    Date.now() >= entradaMaoAte &&
    !document.querySelector('dialog[open]'),
  agir,
  avisar,
});
instalarRolagem(app, { obterModo: () => modo });
instalarMovimento(app, {
  obterEstado: () => estado,
  obterModo: () => modo,
  agir,
  avisar,
  limparAvisoBloqueio: () => {
    if (mensagem.classList.contains('bloqueio')) avisar();
  },
  podeAtalho: () =>
    estado?.fase === 'jogo' &&
    !estado.resumoTurno &&
    !estado.pendente &&
    !encerrandoTurno &&
    !vezDoTrovador() &&
    Date.now() >= entradaMaoAte &&
    !document.querySelector('dialog[open]'),
  temAtiva: (id) =>
    ['ativo', 'ambos'].includes(
      definicao(
        poder(
          estado,
          estado.fila.find((c) => c.id === id),
        ) || id,
      )?.tipo,
    ),
  entrarModo: (novo, id) => trocarModo(novo, novo === 'ativar' ? id : null),
});
const dialogo = document.querySelector('#consulta');
const avisoSomManual = document.createElement('p');
avisoSomManual.className = 'manual_som_status';
avisoSomManual.hidden = true;
avisoSomManual.setAttribute('role', 'status');
avisoSomManual.setAttribute('aria-live', 'polite');
dialogo.append(avisoSomManual);
let timerAvisoSomManual = null,
  pedidoSomManual = 0;
const ajustarMarcadorSumario = instalarMarcadorSumario(
  dialogo,
  document.querySelector('#conteudo_consulta'),
);
function abrirManual() {
  document.querySelector('#conteudo_consulta').innerHTML = consulta();
  dialogo.showModal();
  ajustarSprites(dialogo);
  ajustarMarcadorSumario();
}
document.querySelector('#regras').onclick = async () => {
  if (!estado) {
    abrirManual();
    return;
  }
  if (
    !(await confirmarAcao(
      'ABORTAR PARTIDA?',
      'Tem certeza? A partida e seu salvamento serão apagados. Você voltará à tela principal e não poderá continuar esta partida.',
      'SIM, ABORTAR',
      true,
    ))
  )
    return;
  const erro = apagarPartida();
  if (erro) {
    avisar(erro, 'erro');
    return;
  }
  nivelConfiguracao = null;
  jogadorComAparelho = null;
  estado = null;
  salvo = { estado: null };
  modo = null;
  escolha = null;
  selecao = null;
  maoAberta = false;
  descarteAberto = false;
  avisar();
  desenhar();
  avisar('Partida abortada.', 'partida_abortada');
};
async function ouvirCartaManual(carta) {
  const pedido = ++pedidoSomManual;
  const id = Number(carta.dataset.personagem),
    status = dialogo.querySelector('.manual_som_status');
  clearTimeout(timerAvisoSomManual);
  if (status) {
    status.hidden = false;
    status.textContent = 'Carregando som…';
  }
  const tocou = await audioJogo.ouvirPersonagem(id);
  if (pedido !== pedidoSomManual || !dialogo.open) return;
  if (!tocou && status) {
    status.hidden = false;
    status.textContent = audioJogo.diagnostico().suportaAudio
      ? 'Ative o áudio e aumente EFEITOS nos ajustes de som.'
      : 'Este navegador não oferece áudio. O jogo continua sem som.';
    timerAvisoSomManual = setTimeout(() => {
      status.hidden = true;
    }, 3000);
  }
}
dialogo.addEventListener('click', (ev) => {
  const carta = ev.target.closest('.manual_personagem');
  if (carta) ouvirCartaManual(carta);
});
dialogo.addEventListener('keydown', (ev) => {
  if (!['Enter', ' '].includes(ev.key) || ev.repeat || !ev.target.matches('.manual_personagem'))
    return;
  ev.preventDefault();
  ouvirCartaManual(ev.target);
});
document.addEventListener('previa-personagem', (ev) => {
  const id = ev.detail.id;
  dialogo
    .querySelectorAll('.manual_personagem')
    .forEach((c) => c.classList.toggle('ouvindo_personagem', Number(c.dataset.personagem) === id));
  const status = dialogo.querySelector('.manual_som_status');
  if (status) {
    status.hidden = !id || !dialogo.open;
    status.textContent = id ? 'Ouvindo: ' + definicao(id).nome + '.' : '';
  }
});
dialogo.addEventListener('close', () => {
  pedidoSomManual++;
  audioJogo.pararPrevia();
  clearTimeout(timerAvisoSomManual);
  avisoSomManual.hidden = true;
});
document.querySelector('#fechar_consulta').onclick = () => dialogo.close();
dialogo.addEventListener('click', (ev) => {
  const link = ev.target.closest('[data-capitulo]');
  if (!link) return;
  ev.preventDefault();
  document
    .getElementById(link.dataset.capitulo)
    ?.scrollIntoView({ block: 'start', behavior: 'instant' });
  ajustarMarcadorSumario();
});
document.querySelector('#conteudo_consulta').addEventListener('input', (ev) => {
  if (ev.target.id !== 'busca_manual') return;
  const termo = ev.target.value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  let total = 0;
  for (const carta of dialogo.querySelectorAll('[data-personagem]')) {
    carta.hidden = !carta.dataset.busca.includes(termo);
    if (!carta.hidden) total++;
  }
  document.querySelector('#contagem_manual').textContent = total
    ? total + ' personagem' + (total === 1 ? '' : 's')
    : 'Nenhum personagem encontrado.';
});
desenhar();
if (salvo.erro) avisar(salvo.erro);
let oferta;
const instalar = document.querySelector('#instalar'),
  offline = document.querySelector('#offline');
window.addEventListener('beforeinstallprompt', (ev) => {
  ev.preventDefault();
  oferta = ev;
  instalar.hidden = false;
});
instalar.onclick = async () => {
  if (!oferta) return;
  await oferta.prompt();
  await oferta.userChoice;
  oferta = null;
  instalar.hidden = true;
};
window.addEventListener('appinstalled', () => {
  instalar.hidden = true;
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (ev) => {
    if (ev.data === 'offline_pronto') offline.textContent = 'Recursos salvos. Disponível offline.';
  });
  navigator.serviceWorker
    .register('./servico.js')
    .then(async (registro) => {
      await navigator.serviceWorker.ready;
      const trabalhador = registro.active || navigator.serviceWorker.controller;
      trabalhador?.postMessage('verificar_offline');
    })
    .catch(() => {
      offline.textContent = 'Offline indisponível. Use HTTPS ou localhost.';
    });
} else offline.textContent = 'Use a opção de instalação do menu do navegador, quando disponível.';

// Feedback de toque persiste nas renderizações, sem alterar ações nem gestos.
let timerFeedbackToque;
app.addEventListener(
  'click',
  (ev) => {
    if (
      ev.pointerType !== 'touch' &&
      ev.pointerType !== 'pen' &&
      !matchMedia('(pointer: coarse)').matches
    )
      return;
    const botao = ev.target.closest('.opcoes_turno button:not(:disabled)');
    if (botao?.dataset.comando === 'cancelar') {
      clearTimeout(timerFeedbackToque);
      delete app.dataset.feedbackToque;
      return;
    }
    const tipo = botao?.dataset.tipoAcao || botao?.dataset.comando;
    if (!['comprar', 'construir', 'mover', 'ativar'].includes(tipo)) return;
    clearTimeout(timerFeedbackToque);
    app.dataset.feedbackToque = tipo;
    timerFeedbackToque = setTimeout(() => delete app.dataset.feedbackToque, 2000);
  },
  { capture: true },
);
