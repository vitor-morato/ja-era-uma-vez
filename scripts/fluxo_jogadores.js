// A passagem depende de quem confirmou estar com o aparelho nesta sessão.
export function destinatario(e) {
  return e.pendente?.jogador ?? e.atual;
}
export function faseParaAparelho(e, jogadorComAparelho) {
  if (e.resumoTurno || e.fase === 'fim' || e.resultado !== null) return e.fase;
  if (e.solo) return e.pendente ? 'decisao' : 'jogo';
  if (jogadorComAparelho !== destinatario(e)) return 'passagem';
  return e.pendente ? 'decisao' : 'jogo';
}
