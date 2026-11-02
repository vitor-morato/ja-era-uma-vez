import { executar, poder, alvosPoder } from './regras.js';
import { definicao } from './cartas.js';
// A busca recebe apenas cartas públicas, a própria mão e quantidades ocultas.
export function observar(e, j = 1) {
  const conhecidos = new Set([...e.fila, ...e.descarte, ...e.maos[j]].map((c) => c.id));
  const desconhecidos = Array.from({ length: 22 }, (_, i) => i + 1).filter(
    (id) => !conhecidos.has(id),
  );
  // Amostra estável, independente da mão real e da ordem real do baralho.
  let s = (e.turno * 997 + e.fila.reduce((n, c) => n + c.id * 31, 0)) >>> 0;
  for (let i = desconhecidos.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const k = s % (i + 1);
    [desconhecidos[i], desconhecidos[k]] = [desconhecidos[k], desconhecidos[i]];
  }
  const copia = JSON.parse(JSON.stringify({ ...e, historico: [] }));
  copia.maos[1 - j] = desconhecidos
    .splice(0, e.maos[1 - j].length)
    .map((id) => ({ id, controlador: 1 - j }));
  copia.baralho = desconhecidos.slice(0, e.baralho.length).map((id) => ({ id, controlador: null }));
  return copia;
}
export function jogadas(e) {
  if (e.resultado !== null || e.resumoTurno) return [];
  if (e.pendente) return [true, false].map((aceitar) => ({ tipo: 'proteger', aceitar }));
  if (e.fase !== 'jogo') return [];
  const a = [
    { tipo: 'encerrar' },
    { tipo: 'comprar' },
    ...e.maos[e.atual].map((c) => ({ tipo: 'construir', carta: c.id })),
  ];
  for (const c of e.fila.filter((c) => c.controlador === e.atual)) {
    a.push(
      { tipo: 'mover', carta: c.id, direcao: -1 },
      { tipo: 'mover', carta: c.id, direcao: 1 },
      { tipo: 'genio', carta: c.id },
    );
    if (e.usos[c.id]) continue;
    const ef = poder(e, c);
    if (!ef || !['ativo', 'ambos'].includes(definicao(ef).tipo)) continue;
    for (const alvo of alvosPoder(e, c)) {
      const cp =
        ef === 8
          ? poder(
              e,
              e.fila.find((c) => c.id === alvo),
            )
          : null;
      if (cp && ['ativo', 'ambos'].includes(definicao(cp).tipo))
        for (const segundoAlvo of alvosPoder(e, c, cp))
          a.push({ tipo: 'poder', carta: c.id, alvo, segundoAlvo });
      else a.push({ tipo: 'poder', carta: c.id, alvo });
    }
  }
  return a.filter((a) => !executar(e, a, { adiarEncerramento: true }).erro);
}
function valorCarta(e, c) {
  const ef = poder(e, c);
  return 14 + (ef ? ([3, 5, 7, 17, 19].includes(ef) ? 10 : [11, 15, 22].includes(ef) ? 8 : 4) : 0);
}
export function avaliar(e, j) {
  if (e.resultado !== null)
    return e.resultado === 'empate' ? 0 : e.resultado === j ? 100000 : -100000;
  let v = 0;
  for (let i = 0; i < e.fila.length; i++) {
    const c = e.fila[i],
      s = c.controlador === j ? 1 : -1;
    v += s * (100 + valorCarta(e, c) + (12 * (e.fila.length - 1 - i)) / Math.max(1, e.fila.length));
  }
  v += 8 * (e.maos[j].length - e.maos[1 - j].length);
  const tras = e.fila.at(-1);
  if (tras) v += tras.controlador === j ? -48 : 48;
  for (let i = 0; i < e.fila.length; i++) {
    const c = e.fila[i];
    if (poder(e, c) === 22 && e.fila[i + 1]) v += e.fila[i + 1].controlador === j ? -50 : 50;
  }
  return v;
}
// As decisões simuladas consideram o interesse de quem controla a proteção.
function resolver(e, j, prof = 0) {
  if (!e.pendente || prof > 4) return e;
  const quien = e.pendente.jogador;
  const ramas = [true, false]
    .map((aceitar) =>
      executar(
        { ...e, fase: 'decisao' },
        { tipo: 'proteger', aceitar },
        { adiarEncerramento: true },
      ),
    )
    .filter((r) => !r.erro)
    .map((r) => resolver(r.estado, j, prof + 1));
  ramas.sort((a, b) => avaliar(b, quien) - avaliar(a, quien));
  return ramas[0] || e;
}
function finalTurno(e, j) {
  if (e.resultado !== null || e.resumoTurno || e.atual !== j) return e;
  e = resolver(e, j);
  if (e.resultado !== null || e.resumoTurno || e.atual !== j) return e;
  const r = executar({ ...e, fase: 'jogo' }, { tipo: 'encerrar' });
  return r.erro ? e : resolver(r.estado, j);
}
function chave(e) {
  return JSON.stringify([
    e.fila,
    e.maos,
    e.baralho,
    e.descarte,
    e.acoes,
    e.usos,
    e.espelhos,
    e.atual,
    e.pendente,
    e.resultado,
  ]);
}
export function escolherJogada(estado, nivel = 'normal', j = 1) {
  const raiz = observar(estado, j);
  raiz.fase = raiz.pendente ? 'decisao' : 'jogo';
  if (raiz.pendente) {
    return jogadas(raiz)
      .map((a) => ({ a, e: resolver(executar(raiz, a, { adiarEncerramento: true }).estado, j) }))
      .sort((a, b) => avaliar(b.e, j) - avaliar(a.e, j))[0]?.a;
  }
  const dificil = nivel === 'dificil',
    largura = dificil ? 12 : 1,
    limite = dificil ? 2200 : 200;
  let fronteira = [{ e: raiz, primeira: null, bonus: 0 }],
    melhor = null,
    visitados = new Set(),
    nos = 0;
  for (let profundidade = 0; profundidade < (dificil ? 7 : 1) && fronteira.length; profundidade++) {
    const proximos = [];
    for (const n of fronteira) {
      for (const a of jogadas(n.e)) {
        if (++nos > limite) break;
        const r = executar(n.e, a, { adiarEncerramento: true });
        if (r.erro) continue;
        let e = resolver(r.estado, j);
        if (e.fase === 'passagem' && !e.resumoTurno && e.atual === j) e = { ...e, fase: 'jogo' };
        const primeira = n.primeira || a,
          gratis = a.tipo === 'genio' || (a.tipo === 'poder' && e.acoes === n.e.acoes);
        const bonus =
          n.bonus + (gratis ? 3 : 0) + (a.tipo !== 'encerrar' && e.acoes < n.e.acoes ? 1 : 0);
        const final = finalTurno(e, j),
          valor = avaliar(final, j) + bonus;
        // A difícil também considera uma resposta imediata do rival após o encerramento.
        let risco = 0;
        if (dificil && final.resultado === null && final.atual !== j) {
          const rival = { ...final, resumoTurno: null, fase: 'jogo' };
          for (const resposta of jogadas(rival)
            .filter((a) => a.tipo === 'poder')
            .slice(0, 20)) {
            const rr = executar(rival, resposta, { adiarEncerramento: true });
            if (!rr.erro)
              risco = Math.min(risco, avaliar(resolver(rr.estado, j), j) - avaliar(final, j));
          }
        }
        const nota = valor + risco * 0.7;
        if (!melhor || nota > melhor.nota) melhor = { a: primeira, nota };
        if (
          a.tipo !== 'encerrar' &&
          !e.resumoTurno &&
          e.resultado === null &&
          e.atual === j &&
          !e.pendente &&
          e.acoes > 0
        ) {
          const k = chave(e);
          if (!visitados.has(k)) {
            visitados.add(k);
            proximos.push({ e, primeira, bonus, nota });
          }
        }
      }
      if (nos > limite) break;
    }
    proximos.sort((a, b) => b.nota - a.nota);
    fronteira = proximos.slice(0, largura);
    if (nos > limite) break;
  }
  return melhor?.a || { tipo: 'encerrar' };
}
