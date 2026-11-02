import { cartas, configuracao, definicao } from './cartas.js';
const copiar = (valor) => JSON.parse(JSON.stringify(valor));
const localizar = (e, id) => e.fila.find((c) => c.id === id);
export function novaPartida(nomes = ['Jogador 1', 'Jogador 2'], sorteio = Math.random) {
  const baralho = cartas.map((c) => ({ id: c.id, controlador: null }));
  for (let i = baralho.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1));
    [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
  }
  const atual = Math.floor(sorteio() * 2),
    fila = [],
    maos = [[], []];
  for (const jogador of [1 - atual, atual])
    for (let i = 0; i < configuracao.filaInicial; i++)
      fila.push({ ...baralho.pop(), controlador: jogador });
  for (let jogador = 0; jogador < 2; jogador++)
    for (let i = 0; i < configuracao.maoInicial; i++)
      maos[jogador].push({ ...baralho.pop(), controlador: jogador });
  return {
    versao: 1,
    jogadores: nomes,
    atual,
    fila,
    maos,
    baralho,
    descarte: [],
    acoes: 3,
    usos: {},
    espelhos: {},
    fase: 'passagem',
    pendente: null,
    etapa: null,
    resultado: null,
    historico: ['Partida iniciada.'],
    turno: 1,
  };
}
// Primeiro resolve cópias sem supressão. Reis assim encontrados suprimem os vizinhos.
// Isso evita oscilações de ativação entre Reis e cartas que os copiam.
function poderBruto(e, c, visitados = []) {
  if (!c || visitados.includes(c.id)) return null;
  const trilha = [...visitados, c.id];
  if (e.espelhos[c.id]) return e.espelhos[c.id];
  if (c.id === 4) return poderBruto(e, e.descarte.at(-1), trilha);
  if (c.id === 18) return poderBruto(e, e.fila[e.fila.findIndex((x) => x.id === c.id) - 1], trilha);
  return c.id;
}
export function poder(e, c) {
  const i = e.fila.findIndex((x) => x.id === c?.id);
  if (i < 0) return poderBruto(e, c);
  if ([e.fila[i - 1], e.fila[i + 1]].some((v) => v && poderBruto(e, v) === 2)) return null;
  // Uma fonte desativada também não fornece poderes para uma cópia.
  if (c.id === 18 && !e.espelhos[c.id]) {
    const origem = e.fila[i - 1];
    if (!origem || [e.fila[i - 2], c].some((v) => v && poderBruto(e, v) === 2)) return null;
  }
  return poderBruto(e, c);
}
function registrar(e, texto) {
  e.historico.push(texto);
  e.historico = e.historico.slice(-35);
}
function comprar(e, j, n) {
  let total = 0;
  while (n-- && e.baralho.length) {
    e.maos[j].push({ ...e.baralho.pop(), controlador: j });
    total++;
  }
  if (total)
    registrar(e, `${e.jogadores[j]} comprou ${total === 1 ? 'uma carta' : total + ' cartas'}.`);
}
export function verificarResultado(e) {
  const quantidades = [0, 1].map((j) => e.fila.filter((c) => c.controlador === j).length);
  if (quantidades.includes(0)) {
    e.resultado =
      quantidades[0] === 0 && quantidades[1] === 0 ? 'empate' : quantidades[0] === 0 ? 1 : 0;
    e.fase = 'fim';
    e.etapa = null;
    e.pendente = null;
  }
}
function destruirAgora(e, id) {
  const carta = localizar(e, id);
  if (!carta) return;
  const efeito = poder(e, carta);
  e.fila.splice(e.fila.indexOf(carta), 1);
  registrar(e, `${definicao(id).nome} saiu da história.`);
  if (efeito === 9) comprar(e, carta.controlador, 2);
  e.descarte.push(carta);
  (e.descartesTurno ??= []).push({ ...carta });
  verificarResultado(e);
}
function tentarDestruir(e, id, recusados = []) {
  if (!localizar(e, id)) return;
  const protetor = e.fila.find(
    (c) => c.id !== id && poder(e, c) === 15 && !recusados.includes(c.id),
  );
  if (protetor) {
    e.pendente = { alvo: id, protetor: protetor.id, jogador: protetor.controlador, recusados };
    e.fase = 'decisao';
  } else destruirAgora(e, id);
}
function continuarFinal(e) {
  while (e.etapa && !e.pendente && !e.resultado && e.resultado !== 0) {
    if (e.etapa.cartas.length) {
      const id = e.etapa.cartas.shift(),
        c = localizar(e, id);
      if (c && poder(e, c) === 22) {
        const i = e.fila.indexOf(c);
        if (e.fila[i + 1]) tentarDestruir(e, e.fila[i + 1].id);
      }
    } else if (!e.etapa.traseira) {
      e.etapa.traseira = true;
      if (e.fila.length) tentarDestruir(e, e.fila.at(-1).id);
    } else {
      e.etapa = null;
      e.atual = 1 - e.atual;
      e.acoes = 3;
      e.usos = {};
      e.espelhos = {};
      e.turno++;
      e.fase = 'passagem';
      registrar(e, `Turno de ${e.jogadores[e.atual]}.`);
    }
  }
}
export function alvosPoder(e, c, efeito = poder(e, c)) {
  const i = e.fila.indexOf(c),
    todos = e.fila.map((x) => x.id);
  switch (efeito) {
    case 1:
    case 7:
      return e.fila[i + 1] ? [e.fila[i + 1].id] : [];
    case 3:
      return i === e.fila.length - 1 ? todos.filter((id) => id !== c.id) : [];
    case 5:
      return e.fila[i - 1] ? [e.fila[i - 1].id] : [];
    case 6:
      return e.descarte.length ? [0] : [];
    case 8:
      return e.fila
        .filter((x) => x.controlador !== c.controlador && poder(e, x) !== null && poder(e, x) !== 8)
        .map((x) => x.id);
    case 12:
    case 13:
    case 16:
      return todos.filter((id) => id !== c.id);
    case 14:
      return e.fila.length > 1 ? [e.fila[0].id] : [];
    case 17:
      return e.fila[i - 2] ? [e.fila[i - 2].id] : [];
    case 19:
      return e.fila
        .filter(
          (x, j) => Math.abs(j - i) === 1 && e.fila[j + (j - i)]?.controlador === c.controlador,
        )
        .map((x) => x.id);
    case 21:
      return e.fila.filter((x) => x.controlador !== c.controlador).map((x) => x.id);
    default:
      return [];
  }
}
function gratuito(e, c) {
  return poder(e, e.fila[e.fila.indexOf(c) + 1]) === 11;
}
function aplicarPoder(e, c, efeito, alvo) {
  const destino = localizar(e, alvo),
    i = e.fila.indexOf(c);
  const retirar = () => e.fila.splice(e.fila.indexOf(destino), 1)[0];
  switch (efeito) {
    case 1:
      e.fila.push(retirar());
      break;
    case 3:
    case 5:
    case 7:
    case 17:
    case 19:
      tentarDestruir(e, alvo);
      break;
    case 6:
      e.maos[e.atual].push({ ...e.descarte.pop(), controlador: e.atual });
      break;
    case 12:
      retirar();
      e.fila.splice(e.fila.indexOf(c) + 1, 0, destino);
      break;
    case 13:
      e.fila.unshift(retirar());
      break;
    case 14:
      e.fila.push(e.fila.shift());
      break;
    case 16: {
      const j = e.fila.indexOf(destino);
      [e.fila[i], e.fila[j]] = [e.fila[j], e.fila[i]];
      break;
    }
    case 21:
      [c.controlador, destino.controlador] = [destino.controlador, c.controlador];
      break;
  }
}
function exigir(condicao, mensagem) {
  if (!condicao) throw Error(mensagem);
}
function executarInterno(e, a) {
  if (a.tipo === 'seguir_turno') {
    exigir(e.resumoTurno, 'Não há encerramento para confirmar.');
    e.resumoTurno = null;
    return;
  }
  exigir(!e.resumoTurno, 'Confirme a tela de turno encerrado para continuar.');
  if (a.tipo === 'pronto') {
    exigir(e.fase === 'passagem', 'Aguarde a passagem.');
    e.fase = e.pendente ? 'decisao' : 'jogo';
    return;
  }
  if (a.tipo === 'proteger') {
    exigir(e.fase === 'decisao' && e.pendente, 'Não há decisão pendente.');
    const p = e.pendente;
    e.pendente = null;
    e.fase = 'jogo';
    if (a.aceitar) destruirAgora(e, p.protetor);
    else tentarDestruir(e, p.alvo, [...p.recusados, p.protetor]);
    if (e.fase !== 'fim' && !e.pendente) {
      continuarFinal(e);
      if (e.fase === 'jogo') e.fase = 'passagem';
    }
    return;
  }
  exigir(e.fase === 'jogo' && e.resultado === null, 'A partida não está na fase de ações.');
  if (a.tipo === 'encerrar') {
    verificarResultado(e);
    if (e.fase === 'fim') return;
    e.etapa = { cartas: e.fila.map((c) => c.id), traseira: false };
    continuarFinal(e);
    return;
  }
  const c = localizar(e, a.carta);
  if (a.tipo === 'comprar') {
    exigir(e.acoes > 0, 'Sem ações restantes.');
    exigir(e.baralho.length, 'O baralho está vazio.');
    e.acoes--;
    comprar(e, e.atual, 1);
    return;
  }
  if (a.tipo === 'construir') {
    const mao = e.maos[e.atual],
      indice = mao.findIndex((x) => x.id === a.carta);
    exigir(e.acoes > 0, 'Sem ações restantes.');
    exigir(indice >= 0, 'Escolha uma carta da sua mão.');
    const carta = mao.splice(indice, 1)[0];
    // O poder de entrada é avaliado antes da inserção; adjacência só existe depois.
    if (poderBruto(e, carta) === 9) e.fila.push(carta);
    else e.fila.unshift(carta);
    e.acoes--;
    registrar(e, `${e.jogadores[e.atual]} construiu ${definicao(carta.id).nome}.`);
    return;
  }
  exigir(c && c.controlador === e.atual, 'Escolha uma carta que você controla.');
  if (a.tipo === 'mover') {
    exigir(e.acoes > 0, 'Sem ações restantes.');
    exigir([-1, 1].includes(a.direcao), 'Direção inválida.');
    const i = e.fila.indexOf(c),
      vizinho = e.fila[i + a.direcao];
    exigir(vizinho, 'Não há posição nessa direção.');
    // A troca move as duas cartas: ambas respeitam restrições de MOVER.
    const bloqueio = motivoMovimento(e, c, a.direcao);
    exigir(!bloqueio, bloqueio);
    [e.fila[i], e.fila[i + a.direcao]] = [vizinho, c];
    e.acoes--;
    registrar(e, `${definicao(c.id).nome} moveu uma posição.`);
    return;
  }
  if (a.tipo === 'genio') {
    exigir(poder(e, c) === 20 && e.fila[0] === c, 'O Gênio precisa estar na FRENTE.');
    exigir(!e.usos['genio' + c.id], 'Compra gratuita já utilizada.');
    exigir(e.baralho.length, 'O baralho está vazio.');
    e.usos['genio' + c.id] = 1;
    comprar(e, e.atual, 1);
    return;
  }
  exigir(a.tipo === 'poder', 'Ação desconhecida.');
  const efeito = poder(e, c);
  exigir(
    efeito && ['ativo', 'ambos'].includes(definicao(efeito).tipo),
    'Esta carta não tem poder ativo disponível.',
  );
  exigir((e.usos[c.id] || 0) < 1, 'Poder já utilizado neste turno.');
  exigir(gratuito(e, c) || e.acoes > 0, 'Sem ações restantes e sem uso gratuito.');
  exigir(alvosPoder(e, c).includes(a.alvo), 'Escolha um alvo válido.');
  let executar = efeito,
    alvo = a.alvo;
  if (efeito === 8) {
    executar = poder(e, localizar(e, alvo));
    if (['ativo', 'ambos'].includes(definicao(executar).tipo)) {
      exigir(
        alvosPoder(e, c, executar).includes(a.segundoAlvo),
        'Escolha um alvo válido para o poder copiado.',
      );
      alvo = a.segundoAlvo;
      if (definicao(executar).tipo === 'ambos') e.espelhos[c.id] = executar;
    } else {
      e.espelhos[c.id] = executar;
      executar = null;
    }
  }
  if (!gratuito(e, c)) e.acoes--;
  e.usos[c.id] = (e.usos[c.id] || 0) + 1;
  registrar(e, `${definicao(c.id).nome} utilizou seu poder.`);
  if (executar) aplicarPoder(e, c, executar, alvo);
}
export function executar(estado, acao, opcoes = {}) {
  const proximo = copiar(estado);
  try {
    if (acao.tipo === 'encerrar') delete proximo.encerramentoPendente;
    executarInterno(proximo, acao);
    if (proximo.fase === 'jogo') verificarResultado(proximo);
    // Uma proteção pendente termina primeiro; só depois começam os efeitos finais.
    if (
      proximo.acoes === 0 &&
      proximo.resultado === null &&
      !proximo.pendente &&
      !proximo.etapa &&
      ['jogo', 'passagem'].includes(proximo.fase)
    ) {
      if (opcoes.adiarEncerramento && acao.tipo !== 'encerrar') proximo.encerramentoPendente = true;
      else {
        delete proximo.encerramentoPendente;
        proximo.fase = 'jogo';
        executarInterno(proximo, { tipo: 'encerrar' });
      }
    }
    if (
      proximo.turno > estado.turno ||
      (estado.resultado === null &&
        proximo.resultado !== null &&
        (acao.tipo === 'encerrar' || estado.etapa || (estado.acoes > 0 && proximo.acoes === 0)))
    ) {
      proximo.resumoTurno = {
        jogador: estado.atual,
        turno: estado.turno,
        descartadas: proximo.descartesTurno || [],
      };
      proximo.descartesTurno = [];
    }
    return { estado: proximo, erro: null };
  } catch (erro) {
    return { estado, erro: erro.message };
  }
}
export function validar(e, a) {
  return executar(e, a).erro;
}
export function alvosValidos(e, c, escolha = {}) {
  const efeito = escolha.efeito ?? poder(e, c);
  return alvosPoder(e, c, efeito).filter((alvo) => {
    if (escolha.espelho)
      return !validar(e, { tipo: 'poder', carta: c.id, alvo: escolha.espelho, segundoAlvo: alvo });
    if (efeito === 8) {
      const copiado = poder(e, localizar(e, alvo));
      if (['ativo', 'ambos'].includes(definicao(copiado).tipo))
        return alvosPoder(e, c, copiado).some(
          (segundoAlvo) => !validar(e, { tipo: 'poder', carta: c.id, alvo, segundoAlvo }),
        );
    }
    return !validar(e, { tipo: 'poder', carta: c.id, alvo });
  });
}

export function motivoMovimento(e, c, direcao) {
  const i = e.fila.indexOf(c),
    vizinho = e.fila[i + direcao];
  if (!vizinho) return 'Não existe carta vizinha nessa direção.';
  for (const [carta, deslocamento] of [
    [c, direcao],
    [vizinho, -direcao],
  ]) {
    const efeito = poder(e, carta);
    if ((efeito === 5 && deslocamento === 1) || (efeito === 7 && deslocamento === -1)) {
      const nome = definicao(carta.id).nome,
        origem = efeito !== carta.id ? ' (passiva copiada de ' + definicao(efeito).nome + ')' : '';
      return (
        'Bloqueado por ' +
        nome +
        origem +
        ': sua passiva impede que seja movida para ' +
        (deslocamento === 1 ? 'trás' : 'a frente') +
        '. A troca também deslocaria essa carta.'
      );
    }
  }
  return null;
}
export function motivoPoder(e, c) {
  if (!c) return 'Nenhuma carta foi selecionada.';
  if (e.descarte.some((x) => x.id === c.id))
    return 'No descarte. Recupere e CONSTRUA antes de ativar.';
  if (!e.fila.some((x) => x.id === c.id)) return 'Na mão. CONSTRUA antes de ativar.';
  if (c.controlador !== e.atual) return 'Carta do adversário. Ative apenas suas cartas.';
  const efeito = poder(e, c),
    i = e.fila.indexOf(c);
  if (efeito === null) {
    const rei = [e.fila[i - 1], e.fila[i + 1]].find((x) => x && poderBruto(e, x) === 2);
    if (rei)
      return (
        'Poder bloqueado por ' +
        definicao(rei.id).nome +
        ': a passiva do Rei desativa cartas adjacentes.'
      );
    if (c.id === 4 && !e.descarte.length)
      return 'O Golem está sem poder: a pilha de descarte está vazia.';
    if (c.id === 18 && !e.fila[i - 1])
      return 'A Sombra está sem poder: não há carta imediatamente à sua frente.';
    return 'Não há poder copiado disponível: a fonte está desativada, ausente ou forma uma cópia circular.';
  }
  if (!['ativo', 'ambos'].includes(definicao(efeito).tipo))
    return 'O poder atual é passivo e não precisa ser ativado.';
  if (e.usos[c.id]) return 'A ativa desta carta já foi utilizada neste turno.';
  if (!gratuito(e, c) && e.acoes === 0)
    return 'Não há ações restantes nem efeito de uso gratuito para esta carta.';
  if (alvosValidos(e, c).length) return null;
  switch (efeito) {
    case 3:
      return 'O Caçador só pode ativar este poder quando está na TRASEIRA da fila.';
    case 6:
      return 'A pilha de descarte está vazia. Não há carta para recuperar.';
    case 17:
      return 'Não existe carta duas posições à frente para destruir.';
    case 1:
    case 7:
      return 'Não existe carta imediatamente atrás para este poder atingir.';
    case 5:
      return 'Não existe carta imediatamente à frente para destruir.';
    case 19:
      return 'Falta um alvo diretamente entre esta carta e outra carta que você controle.';
    case 8:
      return 'Nenhuma carta inimiga oferece um poder que o Espelho consiga executar desta posição.';
    case 21:
      return 'Não há carta inimiga válida para trocar o controle.';
    default:
      return 'Não há outra carta em uma posição válida para este poder.';
  }
}
