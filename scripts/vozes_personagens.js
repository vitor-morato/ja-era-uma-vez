import { poder } from './regras.js';
// Eventos públicos: a voz pertence à carta física, inclusive quando copia poderes.
export function eventosVoz(acao, antes, depois) {
  const eventos = [];
  const animada =
    ['construir', 'mover', 'poder', 'genio', 'comprar'].includes(acao.tipo) &&
    depois.fase === 'jogo' &&
    !depois.resumoTurno &&
    !depois.pendente;
  const atraso = animada ? 2 : 0;
  if (['construir', 'poder', 'genio', 'mover'].includes(acao.tipo) && Number.isInteger(acao.carta))
    eventos.push({
      id: acao.carta,
      motivo: acao.tipo === 'construir' ? 'construir' : acao.tipo === 'mover' ? 'mover' : 'ativar',
      atraso,
    });
  if (acao.tipo === 'encerrar')
    for (let i = 0; i < antes.fila.length - 1; i++)
      if (poder(antes, antes.fila[i]) === 22)
        eventos.push({ id: antes.fila[i].id, motivo: 'ativar' });
  const idsAntes = new Set(antes.fila.map((c) => c.id)),
    idsDepois = new Set(depois.fila.map((c) => c.id));
  const comunsAntes = antes.fila.filter((c) => idsDepois.has(c.id)).map((c) => c.id),
    comunsDepois = depois.fila.filter((c) => idsAntes.has(c.id)).map((c) => c.id);
  const deslocados = comunsAntes.map((id, i) => ({
      id,
      distancia: Math.abs(comunsDepois.indexOf(id) - i),
    })),
    maior = Math.max(0, ...deslocados.map((c) => c.distancia));
  if (maior)
    for (const c of deslocados)
      if (c.distancia === maior) eventos.push({ id: c.id, motivo: 'mover', atraso });
  for (const c of depois.fila) {
    const anterior = antes.fila.find((a) => a.id === c.id);
    if (anterior && anterior.controlador !== c.controlador)
      eventos.push({ id: c.id, motivo: 'controle', atraso });
  }
  const maoAnterior = new Set(antes.maos?.[antes.atual]?.map((c) => c.id) || []);
  for (const c of depois.maos?.[antes.atual] || [])
    if (!maoAnterior.has(c.id))
      eventos.push({
        id: c.id,
        motivo: acao.tipo === 'poder' ? 'receber' : 'comprar',
        atraso: animada ? 2 : 0,
      });
  const anteriores = new Set(antes.descarte.map((c) => c.id));
  for (const c of depois.descarte)
    if (!anteriores.has(c.id))
      eventos.push({ id: c.id, motivo: 'descarte', turno: antes.turno, atraso });
  return eventos
    .filter((e, i, a) => a.findIndex((v) => v.id === e.id) === i)
    .sort(
      (a, b) =>
        ['comprar', 'receber'].includes(b.motivo) - ['comprar', 'receber'].includes(a.motivo),
    );
}
export function criarVozesPersonagens({
  contexto,
  saida,
  podeTocar,
  aoIniciar = () => {},
  aoTerminar = () => {},
}) {
  let geracao = 0,
    atual = null,
    fila = [],
    executando = false,
    manifesto = null,
    carregandoManifesto = null,
    preparadas = false,
    emitidos = 0,
    maxSimultaneas = 0,
    ultimo = null,
    espera = null,
    aguardando = null;
  const buffers = new Map(),
    cargas = new Map(),
    niveis = new Map();
  async function catalogo() {
    if (manifesto) return manifesto;
    if (!carregandoManifesto)
      carregandoManifesto = (async () => {
        try {
          const r = await fetch(new URL('../audio/personagens/manifesto.json', import.meta.url));
          if (!r.ok) return [];
          const dados = await r.json();
          manifesto = Array.isArray(dados) ? dados : [];
          return manifesto;
        } catch {
          return [];
        } finally {
          carregandoManifesto = null;
        }
      })();
    return carregandoManifesto;
  }
  async function carregar(id) {
    if (buffers.has(id)) return buffers.get(id);
    if (cargas.has(id)) return cargas.get(id);
    const tarefa = (async () => {
      try {
        const entrada = (await catalogo()).find((c) => c.id === id);
        if (!entrada) return null;
        const r = await fetch(new URL('../audio/personagens/' + entrada.arquivo, import.meta.url));
        if (!r.ok) return null;
        const buffer = await contexto.decodeAudioData(await r.arrayBuffer());
        let energia = 0;
        const amostras = buffer.getChannelData(0);
        for (const x of amostras) energia += x * x;
        const rms = Math.sqrt(energia / amostras.length);
        niveis.set(id, Math.max(0.4, Math.min(1, 0.22 / Math.max(0.001, rms))));
        buffers.set(id, buffer);
        return buffer;
      } catch {
        return null;
      } finally {
        cargas.delete(id);
      }
    })();
    cargas.set(id, tarefa);
    return tarefa;
  }
  function pararAtual() {
    if (!atual) return;
    const antiga = atual;
    atual = null;
    antiga.fonte.onended = null;
    const t = contexto.currentTime;
    antiga.ganho.gain.cancelScheduledValues(t);
    antiga.ganho.gain.setTargetAtTime(0, t, 0.007);
    try {
      antiga.fonte.stop(t + 0.025);
    } catch {}
    antiga.fonte.onended = () => {
      antiga.fonte.disconnect();
      antiga.ganho.disconnect();
    };
    aoTerminar();
  }
  function cancelar({ manterAtual = false } = {}) {
    geracao++;
    fila = [];
    executando = false;
    aguardando = null;
    if (espera) {
      clearTimeout(espera.timer);
      espera.resolver();
      espera = null;
    }
    if (!manterAtual) pararAtual();
  }
  async function proxima() {
    if (executando || atual || !fila.length || !podeTocar()) return;
    executando = true;
    const versao = geracao,
      evento = fila.shift();
    aguardando = evento;
    const buffer = await carregar(evento.id);
    if (versao !== geracao) return;
    const restante = evento.quando - contexto.currentTime;
    if (buffer && restante > 0)
      await new Promise((resolver) => {
        espera = {
          resolver,
          evento,
          timer: setTimeout(() => {
            espera = null;
            resolver();
          }, restante * 1000),
        };
      });
    if (versao !== geracao) return;
    aguardando = null;
    executando = false;
    if (!buffer || !podeTocar()) {
      if (podeTocar()) proxima();
      return;
    }
    const fonte = contexto.createBufferSource(),
      ganho = contexto.createGain(),
      inicio = contexto.currentTime + 0.03;
    fonte.buffer = buffer;
    fonte.connect(ganho).connect(saida);
    ganho.gain.setValueAtTime(0, inicio);
    const nivel = 0.8 * (niveis.get(evento.id) || 1);
    ganho.gain.linearRampToValueAtTime(nivel, inicio + 0.015);
    ganho.gain.setValueAtTime(nivel, inicio + buffer.duration - 0.06);
    ganho.gain.linearRampToValueAtTime(0, inicio + buffer.duration);
    const item = { fonte, ganho, id: evento.id };
    atual = item;
    ultimo = { ...evento };
    emitidos++;
    maxSimultaneas = Math.max(maxSimultaneas, 1);
    aoIniciar(evento, buffer.duration);
    fonte.onended = () => {
      fonte.disconnect();
      ganho.disconnect();
      if (atual !== item) return;
      atual = null;
      aoTerminar();
      proxima();
    };
    fonte.start(inicio);
  }
  function enfileirar(eventos) {
    if (!podeTocar()) return;
    const validos = eventos.filter((e) => Number.isInteger(e.id) && e.id >= 1 && e.id <= 22);
    fila.push(...validos.map((e) => ({ ...e, quando: contexto.currentTime + (e.atraso || 0) })));
    fila = fila.slice(-3);
    proxima();
  }
  async function precarregar() {
    if (preparadas) return;
    preparadas = true;
    const entradas = await catalogo();
    let cursor = 0;
    await Promise.all(
      [0, 1].map(async () => {
        while (cursor < entradas.length) {
          const id = entradas[cursor++].id;
          await carregar(id);
        }
      }),
    );
  }
  function sincronizar(segundos = 2) {
    const agora = contexto.currentTime;
    for (const e of [...fila, ...(aguardando ? [aguardando] : [])])
      if (e.atraso > 0) e.quando = agora + segundos;
    if (espera) {
      clearTimeout(espera.timer);
      const atualEspera = espera;
      espera.timer = setTimeout(
        () => {
          if (espera === atualEspera) espera = null;
          atualEspera.resolver();
        },
        Math.max(0, atualEspera.evento.quando - agora) * 1000,
      );
    }
  }
  return {
    cancelar,
    enfileirar,
    precarregar,
    sincronizar,
    diagnostico: () => ({
      ativa: atual?.id || null,
      pendentes: [...(aguardando ? [aguardando.id] : []), ...fila.map((e) => e.id)],
      emitidos,
      maxSimultaneas,
      ultimo,
      carregadas: buffers.size,
    }),
  };
}
