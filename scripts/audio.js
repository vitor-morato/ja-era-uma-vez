import { instalarAvisosPersonagens } from './avisos_personagens.js';
import { criarVozesPersonagens, eventosVoz } from './vozes_personagens.js';
import { iconeNavegacao } from './icones.js';
import { criarTimbre } from './timbres.js';
const CHAVE = 'ja_era_uma_vez_audio_v1';
const padrao = { ligado: true, musica: 0.5, efeitos: 1 };
function ler() {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    return {
      ligado: typeof p?.ligado === 'boolean' ? p.ligado : true,
      musica: volume(p?.musica, padrao.musica),
      efeitos: volume(p?.efeitos, padrao.efeitos),
    };
  } catch {
    return { ...padrao };
  }
}
function volume(v, p) {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : p;
}
const icone =
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M3 9h4l5-5v16l-5-5H3Z"/><path class="ondas_som" d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="corte_som" d="m16 9 5 6m0-6-5 6"/></svg>';
export function criarAudioJogo() {
  let preferencias = ler(),
    ctx = null,
    master,
    efeitos,
    musica,
    filtro,
    liberado = false,
    instalado = false,
    dialogo,
    botao,
    painel,
    ultimo = null,
    tema = null,
    carregando = null,
    proximaMusica = 0,
    relogio = null,
    atenuadoAte = 0,
    falas = null,
    avisosFalas = null;
  const descartesAnunciados = new Set();
  const buffers = new Map(),
    vozes = new Set(),
    trilhas = new Set(),
    ultimos = new Map(),
    registro = [];
  let emitidos = 0,
    maxVozes = 0;
  const prioridade = {
    confirmar: 4,
    recusar: 3,
    hover: 0,
    inspecao: 0,
    abrir: 1,
    fechar: 1,
    clique: 2,
    modo: 2,
    pegar: 2,
    encaixe: 3,
    troca: 3,
    bloqueio: 5,
    esgotadas: 6,
    vitoria: 8,
    derrota: 8,
    risada_trovador: 8,
    empate: 8,
  };
  function criar() {
    if (ctx) return;
    const Contexto = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Contexto) return;
    try {
      ctx = new Contexto({ latencyHint: 'interactive' });
      master = ctx.createGain();
      master.gain.value = 0.8;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.16;
      const limite = ctx.createWaveShaper(),
        curva = new Float32Array(1025);
      for (let i = 0; i < curva.length; i++) {
        const x = (i * 2) / (curva.length - 1) - 1;
        curva[i] = (0.95 * Math.tanh(1.1 * x)) / Math.tanh(1.1);
      }
      limite.curve = curva;
      limite.oversample = '2x';
      master.connect(compressor).connect(limite).connect(ctx.destination);
      efeitos = ctx.createGain();
      efeitos.connect(master);
      falas = criarVozesPersonagens({
        contexto: ctx,
        saida: efeitos,
        podeTocar: () =>
          ctx.state === 'running' &&
          !document.hidden &&
          preferencias.ligado &&
          preferencias.efeitos > 0,
        aoIniciar: (evento) => {
          while (vozes.size >= 4) {
            const menor = [...vozes].sort((a, b) => a.prioridade - b.prioridade)[0];
            pararVoz(menor);
          }
          maxVozes = Math.max(maxVozes, vozes.size + 1);
          if (evento.motivo === 'previa')
            document.dispatchEvent(
              new CustomEvent('previa-personagem', { detail: { id: evento.id } }),
            );
          registro.push('personagem:' + evento.id);
          if (registro.length > 40) registro.shift();
          aplicar();
        },
        aoTerminar: () => {
          document.dispatchEvent(new CustomEvent('previa-personagem', { detail: { id: null } }));
          aplicar();
        },
      });
      musica = ctx.createGain();
      filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 6200;
      musica.connect(filtro).connect(master);
      aplicar();
    } catch {
      ctx = null;
    }
  }
  function fatorMusica() {
    return ultimo?.tela === 'trovador' ? 0.29 : ultimo?.tela === 'jogo' ? 0.4 : 0.72;
  }
  function aplicar() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(preferencias.ligado ? 0.8 : 0, t, 0.04);
    efeitos.gain.setTargetAtTime(preferencias.efeitos * 0.68, t, 0.025);
    const dialogoAberto = Boolean(document.querySelector('dialog[open]'));
    musica.gain.setTargetAtTime(
      preferencias.musica *
        fatorMusica() *
        (t < atenuadoAte || falas?.diagnostico().ativa ? 0.72 : 1) *
        (dialogoAberto ? 0.8 : 1),
      t,
      0.3,
    );
    filtro.frequency.setTargetAtTime(ultimo?.tela === 'jogo' ? 4600 : 6200, t, 0.4);
  }
  async function despertar() {
    liberado = true;
    criar();
    if (!ctx || document.hidden) return;
    try {
      if (ctx.state !== 'running') await ctx.resume();
      if (ctx.state === 'running') {
        carregarTema();
        falas?.precarregar();
        iniciarRelogio();
      }
    } catch {}
  }
  function guardar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(preferencias));
    } catch {}
    atualizarControles();
    aplicar();
    if (!preferencias.ligado) {
      for (const v of [...vozes]) pararVoz(v);
    }
    if (!preferencias.ligado || preferencias.efeitos === 0) falas?.cancelar();
    if (liberado && preferencias.ligado) despertar();
  }
  function pararVoz(v) {
    try {
      v.fonte.stop();
    } catch {}
    v.fonte.disconnect();
    v.ganho.disconnect();
    vozes.delete(v);
  }
  function tocar(nome, { prioridade: forca = prioridade[nome] ?? 4, pan = 0 } = {}) {
    if (
      !ctx ||
      ctx.state !== 'running' ||
      document.hidden ||
      !preferencias.ligado ||
      preferencias.efeitos === 0
    )
      return false;
    const agora = ctx.currentTime,
      intervalo =
        { hover: 0.18, inspecao: 0.22, bloqueio: 0.5, encaixe: 0.22, troca: 0.18, clique: 0.055 }[
          nome
        ] ?? 0.09;
    if (agora - (ultimos.get(nome) ?? -100) < intervalo) return false;
    if (forca < 2 && (falas?.diagnostico().ativa || [...vozes].some((v) => v.prioridade >= 4)))
      return false;
    if (vozes.size >= (falas?.diagnostico().ativa ? 3 : 4)) {
      const fraca = [...vozes].sort((a, b) => a.prioridade - b.prioridade)[0];
      if (fraca.prioridade > forca) return false;
      pararVoz(fraca);
    }
    let buffer = buffers.get(nome);
    if (!buffer) {
      buffer = criarTimbre(ctx, nome);
      if (!buffer) return false;
      buffers.set(nome, buffer);
    }
    const fonte = ctx.createBufferSource(),
      ganho = ctx.createGain();
    fonte.buffer = buffer;
    fonte.playbackRate.value = [
      'vitoria',
      'derrota',
      'risada_trovador',
      'empate',
      'inicio',
      'vez',
    ].includes(nome)
      ? 1
      : 0.975 + Math.random() * 0.05;
    ganho.gain.value =
      {
        confirmar: 0.46,
        recusar: 0.5,
        hover: 0.105,
        inspecao: 0.115,
        abrir: 0.24,
        fechar: 0.22,
        clique: 0.46,
        pegar: 0.44,
        encaixe: 0.34,
        troca: 0.43,
        gastar: 0.28,
        esgotadas: 0.4,
        modo: 0.28,
        bloqueio: 0.68,
        pagina: 0.48,
        descartar: 0.57,
      }[nome] ?? 0.64;
    fonte.connect(ganho);
    let panner;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.35, Math.min(0.35, pan));
      ganho.connect(panner).connect(efeitos);
    } else ganho.connect(efeitos);
    const voz = { fonte, ganho, prioridade: forca };
    vozes.add(voz);
    maxVozes = Math.max(maxVozes, vozes.size + (falas?.diagnostico().ativa ? 1 : 0));
    fonte.onended = () => {
      vozes.delete(voz);
      fonte.disconnect();
      ganho.disconnect();
      panner?.disconnect();
    };
    fonte.start();
    ultimos.set(nome, agora);
    emitidos++;
    registro.push(nome);
    if (registro.length > 40) registro.shift();
    if (forca >= 4) {
      atenuadoAte = agora + Math.min(1.4, buffer.duration);
      aplicar();
    }
    return true;
  }
  async function carregarTema() {
    if (tema || carregando || !ctx) return;
    carregando = (async () => {
      try {
        const resposta = await fetch(new URL('../audio/tema_principal.wav', import.meta.url));
        if (!resposta.ok) throw Error('Tema indisponível');
        tema = await ctx.decodeAudioData(await resposta.arrayBuffer());
        proximaMusica = ctx.currentTime + 0.1;
        agendarMusica();
      } catch {
      } finally {
        carregando = null;
      }
    })();
  }
  function agendarMusica() {
    if (
      !tema ||
      !ctx ||
      ctx.state !== 'running' ||
      document.hidden ||
      !preferencias.ligado ||
      preferencias.musica === 0
    )
      return;
    if (proximaMusica < ctx.currentTime) proximaMusica = ctx.currentTime + 0.08;
    if (proximaMusica > ctx.currentTime + 8) return;
    const fonte = ctx.createBufferSource(),
      ganho = ctx.createGain(),
      inicio = proximaMusica;
    fonte.buffer = tema;
    fonte.connect(ganho).connect(musica);
    ganho.gain.setValueAtTime(0, inicio);
    ganho.gain.linearRampToValueAtTime(1, inicio + 1.2);
    ganho.gain.setValueAtTime(1, inicio + tema.duration - 2);
    ganho.gain.linearRampToValueAtTime(0, inicio + tema.duration);
    const item = { fonte, ganho };
    trilhas.add(item);
    fonte.onended = () => {
      trilhas.delete(item);
      fonte.disconnect();
      ganho.disconnect();
    };
    fonte.start(inicio);
    proximaMusica = inicio + tema.duration - 1.5;
  }
  function iniciarRelogio() {
    if (relogio) return;
    relogio = setInterval(() => {
      agendarMusica();
      aplicar();
    }, 400);
  }
  function suspender() {
    falas?.cancelar();
    clearInterval(relogio);
    relogio = null;
    for (const v of [...vozes]) pararVoz(v);
    for (const t of [...trilhas]) {
      try {
        t.fonte.stop();
      } catch {}
      t.fonte.disconnect();
      t.ganho.disconnect();
    }
    trilhas.clear();
    proximaMusica = 0;
    ctx?.suspend().catch(() => {});
  }
  function tela(e) {
    if (!e) return 'inicio';
    if (e.resumoTurno) return 'resumo';
    if (e.resultado !== null) return 'fim';
    if (e.solo && (e.pendente ? e.pendente.jogador === 1 : e.atual === 1)) return 'trovador';
    if (e.fase === 'decisao') return 'protecao';
    if (e.fase === 'passagem') return 'passagem';
    return 'jogo';
  }
  function atualizar(e, opcoes = {}) {
    const atual = {
      tela: !e && opcoes.configuracao ? 'configuracao' : tela(e),
      turno: e?.turno,
      atual: e?.atual,
      modo: opcoes.modo,
      mao: opcoes.maoAberta,
      descarte: opcoes.descarteAberto,
      selecao: opcoes.selecao,
      resultado: e?.resultado,
    };
    const ant = ultimo;
    ultimo = atual;
    aplicar();
    if (atual.tela === 'resumo') falas?.cancelar();
    if (atual.tela === 'inicio' || atual.tela === 'trovador') {
      falas?.cancelar();
      avisosFalas?.cancelar();
      if (atual.tela === 'inicio') descartesAnunciados.clear();
    }
    if (!ant) return;
    if (atual.tela === 'resumo' && (ant.tela !== 'resumo' || ant.turno !== atual.turno)) {
      const novas = (e.resumoTurno.descartadas || [])
        .filter((c) => !descartesAnunciados.has(e.resumoTurno.turno + ':' + c.id))
        .map((c) => ({ id: c.id, motivo: 'descarte', turno: e.resumoTurno.turno }));
      for (const c of novas) descartesAnunciados.add(c.turno + ':' + c.id);
      avisosFalas?.enfileirar(novas);
    }
    if (atual.tela === 'fim' && ant.tela !== 'fim')
      tocar(
        e.resultado === 'empate'
          ? 'empate'
          : e.solo && e.resultado === 1
            ? 'risada_trovador'
            : 'vitoria',
      );
    else if (atual.tela === 'resumo' && (ant.tela !== 'resumo' || ant.turno !== atual.turno))
      tocar('pagina');
    else if (atual.tela === 'trovador' && ant.tela !== 'trovador') tocar('pagina');
    else if (atual.tela === 'protecao' && ant.tela !== 'protecao') tocar('pagina');
    else if (atual.tela === 'jogo' && ant.tela !== 'jogo')
      tocar(ant.tela === 'inicio' ? 'inicio' : 'pagina');
    else if (atual.tela !== ant.tela && ['inicio', 'configuracao', 'passagem'].includes(atual.tela))
      tocar('pagina');
    else if (atual.tela === 'jogo') {
      if (atual.modo && atual.modo !== ant.modo) tocar('modo');
      else if (atual.mao !== ant.mao || atual.descarte !== ant.descarte)
        tocar(atual.mao || atual.descarte ? 'abrir' : 'fechar');
      else if (atual.selecao !== null && atual.selecao !== ant.selecao && !opcoes.escolha)
        tocar('inspecao');
    }
  }
  function acao(a, antes, depois, { oculta = false } = {}) {
    falas?.cancelar({ manterAtual: !oculta });
    if (oculta) {
      avisosFalas?.cancelar();
      return;
    }
    const eventos = eventosVoz(a, antes, depois);
    avisosFalas?.enfileirar(eventos);
    for (const e of eventos)
      if (e.motivo === 'descarte') descartesAnunciados.add(e.turno + ':' + e.id);
    if (!depois.resumoTurno) falas?.enfileirar(eventos);
    const nome = {
      comprar: 'comprar',
      construir: 'construir',
      mover: 'mover',
      poder: 'ativar',
      proteger: a.aceitar ? 'proteger' : 'descartar',
      encerrar: 'pagina',
      seguir_turno: 'pagina',
    }[a.tipo];
    if (nome) tocar(nome);
    if (antes.acoes > 0 && depois.acoes === 0) tocar('esgotadas');
    else if (antes.acoes > depois.acoes && !nome) tocar('gastar');
    if (
      depois.descarte.length > antes.descarte.length &&
      !depois.resumoTurno &&
      a.tipo !== 'proteger'
    )
      tocar('descartar');
  }
  let geracaoPrevia = 0,
    previaSolicitada = false;
  async function ouvirPersonagem(id) {
    if (
      !Number.isInteger(id) ||
      id < 1 ||
      id > 22 ||
      !preferencias.ligado ||
      preferencias.efeitos === 0
    )
      return false;
    const pedido = ++geracaoPrevia;
    await despertar();
    if (pedido !== geracaoPrevia || !ctx || ctx.state !== 'running') return false;
    falas.cancelar();
    previaSolicitada = true;
    falas.enfileirar([{ id, motivo: 'previa' }]);
    return true;
  }
  function pararPrevia() {
    geracaoPrevia++;
    if (previaSolicitada || falas?.diagnostico().ultimo?.motivo === 'previa') falas.cancelar();
    previaSolicitada = false;
  }
  function aviso(texto, tipo) {
    if (!texto) return;
    if (tipo === 'bloqueio') tocar('bloqueio');
    else if (tipo === 'erro') tocar('recusar');
    else if (tipo === 'partida_abortada') tocar('abortar');
    else if (/cancelad/i.test(texto)) tocar('recusar');
    else tocar('aviso');
  }
  function atualizarControles() {
    if (!botao) return;
    botao.dataset.silenciado = String(!preferencias.ligado);
    botao.setAttribute(
      'aria-label',
      preferencias.ligado ? 'Ajustar som' : 'Ajustar som: silenciado',
    );
    if (!dialogo) return;
    dialogo.querySelector('#audio_ligado').checked = preferencias.ligado;
    dialogo.querySelector('#rotulo_audio').textContent = preferencias.ligado
      ? 'ÁUDIO ATIVADO'
      : 'ÁUDIO SILENCIADO';
    for (const tipo of ['musica', 'efeitos']) {
      const v = Math.round(preferencias[tipo] * 100);
      dialogo.querySelector('#audio_' + tipo).value = v;
      dialogo.querySelector('#valor_' + tipo).value = v + '%';
    }
  }
  function instalar(app) {
    if (instalado) return;
    instalado = true;
    painel = app;
    avisosFalas = instalarAvisosPersonagens();
    botao = document.createElement('button');
    botao.id = 'ajustar_som';
    botao.type = 'button';
    botao.className = 'controle_fita fita_som';
    botao.innerHTML = '<span>' + icone + '</span>';
    botao.title = 'Som';
    botao.setAttribute('aria-haspopup', 'dialog');
    document.body.append(botao);
    dialogo = document.createElement('dialog');
    dialogo.id = 'ajustes_audio';
    dialogo.setAttribute('aria-labelledby', 'titulo_audio');
    dialogo.innerHTML =
      '<form method="dialog"><h2 id="titulo_audio">SOM</h2><label class="audio_ligar"><input id="audio_ligado" type="checkbox"><span class="audio_estado" aria-hidden="true"><span class="audio_check">' +
      iconeNavegacao('✓') +
      '</span><span class="audio_x">' +
      iconeNavegacao('×') +
      '</span></span><strong id="rotulo_audio">ÁUDIO ATIVADO</strong></label><label for="audio_musica">MÚSICA <output id="valor_musica"></output></label><input id="audio_musica" type="range" min="0" max="100" step="1"><label for="audio_efeitos">EFEITOS <output id="valor_efeitos"></output></label><input id="audio_efeitos" type="range" min="0" max="100" step="1"><div class="audio_rodape navegacao_fitas"><button type="submit" class="controle_fita fita_confirmar" aria-label="Confirmar ajustes de som" title="Confirmar ajustes de som"><span>' +
      iconeNavegacao('✓') +
      '</span></button></div></form>';
    document.body.append(dialogo);
    atualizarControles();
    botao.addEventListener('click', () => {
      dialogo.showModal();
      aplicar();
    });
    dialogo.addEventListener('close', () => {
      aplicar();
      botao.focus({ preventScroll: true });
    });
    dialogo.addEventListener('click', (ev) => {
      if (ev.target === dialogo) {
        const r = dialogo.getBoundingClientRect();
        if (
          ev.clientX < r.left ||
          ev.clientX > r.right ||
          ev.clientY < r.top ||
          ev.clientY > r.bottom
        )
          dialogo.close();
      }
    });
    dialogo.addEventListener('input', (ev) => {
      const tipo = ev.target.id.replace('audio_', '');
      if (tipo === 'ligado') preferencias.ligado = ev.target.checked;
      else if (['musica', 'efeitos'].includes(tipo))
        preferencias[tipo] = Number(ev.target.value) / 100;
      guardar();
    });
    const alvoClicavel = (alvo) =>
      alvo?.closest?.(
        'button:not(:disabled),summary,a[href],select,input[type="checkbox"],input[type="radio"]',
      );

    function somControle(alvo) {
      if (
        alvo.matches(
          '.fita_confirmar,#aceitar_confirmacao,#ajustes_audio button[type="submit"],[data-comando="proteger"]',
        )
      )
        return 'confirmar';
      if (
        alvo.matches(
          '.fita_perigo,.marcador_fechar,#fechar_consulta,[value="cancelar"],[data-comando="recusar"]',
        )
      )
        return 'recusar';
      if (alvo.matches('.fita_voltar,.marcador_sumario')) return 'cancelar';
      return 'clique';
    }
    document.addEventListener(
      'pointerdown',
      (ev) => {
        if (!ev.isPrimary || ev.button !== 0) return;
        const alvo = alvoClicavel(ev.target),
          som = alvo && somControle(alvo);
        despertar().then(() => {
          if (
            alvo &&
            som === 'clique' &&
            !alvo.matches(
              '[data-carta],[data-destino-construcao],[data-comando="comprar"],[data-comando="selecionar_poder"]',
            )
          )
            tocar('clique');
        });
      },
      { capture: true },
    );
    document.addEventListener(
      'click',
      (ev) => {
        despertar();
        const alvo = alvoClicavel(ev.target);
        if (!alvo) return;
        const som = somControle(alvo);
        if (som !== 'clique') despertar().then(() => tocar(som));
      },
      { capture: true },
    );
    document.addEventListener(
      'keydown',
      (ev) => {
        if (!ev.repeat) despertar();
        if (ev.repeat || !['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(ev.key))
          return;
        const alvo = alvoClicavel(ev.target);
        despertar().then(() => {
          if (['Enter', ' '].includes(ev.key) && alvo && somControle(alvo) === 'clique')
            tocar('clique');
        });
      },
      { capture: true },
    );
    document.addEventListener('pointerover', (ev) => {
      if (ev.pointerType !== 'mouse') return;
      const alvo = alvoClicavel(ev.target);
      if (
        !alvo ||
        alvo.contains(ev.relatedTarget) ||
        alvo.closest('.carta,.carta_ampliada') ||
        alvo.matches('.abrir_mao,.abrir_descarte')
      )
        return;
      tocar('hover');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) suspender();
      else if (liberado) despertar();
    });
    window.addEventListener('pagehide', suspender);
    window.addEventListener('pageshow', () => {
      if (liberado) despertar();
    });

    for (const tipo of ['pointerup', 'touchend'])
      document.addEventListener(
        tipo,
        () => {
          if (preferencias.ligado && ctx?.state !== 'running') despertar();
        },
        { capture: true, passive: true },
      );
    const observador = new MutationObserver((registros) => {
      aplicar();
      for (const r of registros) if (r.target.id === 'confirmacao' && r.target.open) tocar('aviso');
      for (const r of registros)
        if (r.target.id === 'consulta') tocar(r.target.open ? 'abrir' : 'fechar');
    });
    for (const d of document.querySelectorAll('dialog'))
      observador.observe(d, { attributes: true, attributeFilter: ['open'] });
    if (preferencias.ligado) {
      criar();
      if (preferencias.musica > 0) carregarTema();
      despertar();
    }
  }
  return {
    instalar,
    atualizar,
    acao,
    aviso,
    tocar,
    despertar,
    ouvirPersonagem,
    pararPrevia,
    sincronizar: (segundos) => {
      falas?.sincronizar(segundos);
      avisosFalas?.sincronizar(segundos);
    },
    diagnostico: () => ({
      suportaAudio: Boolean(globalThis.AudioContext || globalThis.webkitAudioContext),
      estado: ctx?.state || 'bloqueado',
      liberado,
      preferencias: { ...preferencias },
      vozes: vozes.size + (falas?.diagnostico().ativa ? 1 : 0),
      personagens: falas?.diagnostico() || null,
      maxVozes,
      trilhas: trilhas.size,
      temaPronto: Boolean(tema),
      duracaoTema: tema?.duration || 0,
      emitidos,
      ultimos: [...registro],
    }),
  };
}
export const audioJogo = criarAudioJogo();
