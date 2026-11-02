// Fluxo de apresentação do solo, sem alterar as regras da partida.
export function cenaSolo(e) {
  if (!e?.solo) return null;
  if (e.resumoTurno) return 'resumo';
  if (e.resultado !== null) return null;
  if (e.pendente?.jogador === 1 || (e.atual === 1 && e.fase !== 'decisao')) return 'aguardar';
  return null;
}
export function duracaoResumoSolo(e) {
  if (!e?.solo || !e.resumoTurno) return 0;
  const total = new Set((e.resumoTurno.descartadas || []).map((c) => c.id)).size;
  return Math.min(8000, 6000 + Math.max(0, total - 1) * 500);
}

export const tempoMinimoTrovador = 3000;
export function chaveEsperaTrovador(e) {
  if (cenaSolo(e) !== 'aguardar') return null;
  // Jogadas e proteções compartilham a mesma espera; não reinicia a cada decisão.
  return e.turno + ':trovador';
}
export function restanteEsperaTrovador(inicio, agora = Date.now()) {
  return Math.max(0, tempoMinimoTrovador - (agora - inicio));
}
