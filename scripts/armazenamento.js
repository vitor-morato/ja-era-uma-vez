const chave = 'ja_era_uma_vez_partida_v1';
export function validarSalvamento(e) {
  if (e?.trovadorRapido !== undefined && typeof e.trovadorRapido !== 'boolean') return false;
  if (e?.solo !== undefined && !['normal', 'dificil'].includes(e.solo)) return false;
  if (
    !e ||
    e.versao !== 1 ||
    !Array.isArray(e.jogadores) ||
    e.jogadores.length !== 2 ||
    !e.jogadores.every((n) => typeof n === 'string' && n.length <= 40)
  )
    return false;
  if (
    ![0, 1].includes(e.atual) ||
    !Number.isInteger(e.acoes) ||
    e.acoes < 0 ||
    e.acoes > 3 ||
    !['jogo', 'passagem', 'decisao', 'fim'].includes(e.fase)
  )
    return false;
  if (
    !Array.isArray(e.maos) ||
    e.maos.length !== 2 ||
    ![e.fila, e.baralho, e.descarte, ...e.maos].every(Array.isArray)
  )
    return false;
  const todas = [...e.fila, ...e.baralho, ...e.descarte, ...e.maos.flat()];
  if (
    todas.length !== 22 ||
    !todas.every((c) => c && Number.isInteger(c.id) && c.id >= 1 && c.id <= 22) ||
    new Set(todas.map((c) => c.id)).size !== 22
  )
    return false;
  if (
    ![...e.fila, ...e.maos.flat()].every((c) => [0, 1].includes(c.controlador)) ||
    !e.maos.every((mao, j) => mao.every((c) => c.controlador === j))
  )
    return false;
  if (
    !e.usos ||
    typeof e.usos !== 'object' ||
    !e.espelhos ||
    typeof e.espelhos !== 'object' ||
    !Array.isArray(e.historico) ||
    !e.historico.every((x) => typeof x === 'string')
  )
    return false;
  if (
    Array.isArray(e.usos) ||
    Array.isArray(e.espelhos) ||
    !Object.values(e.usos).every((n) => Number.isInteger(n) && n >= 0 && n <= 2) ||
    !Object.entries(e.espelhos).every(
      ([id, n]) => Number(id) >= 1 && Number(id) <= 22 && Number.isInteger(n) && n >= 1 && n <= 22,
    )
  )
    return false;
  if (![null, 0, 1, 'empate'].includes(e.resultado) || !Number.isInteger(e.turno) || e.turno < 1)
    return false;
  if (
    e.pendente &&
    (!e.fila.some((c) => c.id === e.pendente.alvo) ||
      !e.fila.some((c) => c.id === e.pendente.protetor) ||
      ![0, 1].includes(e.pendente.jogador) ||
      !Array.isArray(e.pendente.recusados))
  )
    return false;
  if (e.fase === 'decisao' && !e.pendente) return false;
  if (
    e.etapa &&
    (!Array.isArray(e.etapa.cartas) ||
      !e.etapa.cartas.every((id) => Number.isInteger(id) && id >= 1 && id <= 22) ||
      typeof e.etapa.traseira !== 'boolean')
  )
    return false;
  if (
    e.resumoTurno &&
    (![0, 1].includes(e.resumoTurno.jogador) ||
      !Number.isInteger(e.resumoTurno.turno) ||
      e.resumoTurno.turno < 1)
  )
    return false;
  const registrosValidos = (lista) =>
    Array.isArray(lista) &&
    lista.every(
      (c) =>
        c && Number.isInteger(c.id) && c.id >= 1 && c.id <= 22 && [0, 1].includes(c.controlador),
    );
  if (e.descartesTurno !== undefined && !registrosValidos(e.descartesTurno)) return false;
  if (e.resumoTurno?.descartadas !== undefined && !registrosValidos(e.resumoTurno.descartadas))
    return false;
  return true;
}
export function salvar(e) {
  try {
    localStorage.setItem(chave, JSON.stringify(e));
    return null;
  } catch {
    return 'Não foi possível salvar neste navegador. A partida continua apenas nesta aba.';
  }
}
export function carregar() {
  try {
    const texto = localStorage.getItem(chave);
    if (!texto) return { estado: null };
    const e = JSON.parse(texto);
    return validarSalvamento(e)
      ? { estado: e }
      : { estado: null, erro: 'Salvamento inválido ou incompatível. Inicie uma nova partida.' };
  } catch {
    return { estado: null, erro: 'Armazenamento indisponível ou salvamento ilegível.' };
  }
}

export function apagarPartida() {
  try {
    localStorage.removeItem(chave);
    return null;
  } catch {
    return 'Não foi possível apagar o salvamento. A partida foi mantida; tente novamente.';
  }
}
