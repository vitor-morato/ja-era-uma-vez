import { definicao } from './cartas.js';
export const precisaEscolherAlvo = (efeito) => [3, 8, 12, 13, 16, 19, 21].includes(efeito);
export function orientarPoder(e, escolha) {
  const nome = definicao(escolha.carta)?.nome || 'Poder',
    efeito = escolha.efeito;
  let instrucao;
  switch (efeito) {
    case 3:
      instrucao = 'Escolha OUTRA CARTA para destruir.';
      break;
    case 8:
      instrucao = 'Escolha uma CARTA INIMIGA para copiar seu poder.';
      break;
    case 12:
      instrucao = 'Escolha OUTRA CARTA para colocar logo atrás desta.';
      break;
    case 13:
      instrucao = 'Escolha OUTRA CARTA para levar à FRENTE da fila.';
      break;
    case 16:
      instrucao = 'Escolha OUTRA CARTA para trocar de posição.';
      break;
    case 19:
      instrucao = 'Escolha uma CARTA ENTRE DUAS SUAS para destruir.';
      break;
    case 21:
      instrucao = 'Escolha OUTRA CARTA INIMIGA. Troque o controle das duas; posições iguais.';
      break;
    case 1:
      instrucao = 'Escolha a carta logo atrás para levar à TRASEIRA.';
      break;
    case 5:
      instrucao = 'Escolha a carta logo à frente para destruir.';
      break;
    case 7:
      instrucao = 'Escolha a carta logo atrás para destruir.';
      break;
    case 14:
      instrucao = 'Escolha a carta da FRENTE para levar à TRASEIRA.';
      break;
    case 17:
      instrucao = 'Escolha a carta duas posições à frente para destruir.';
      break;
    default:
      instrucao = 'Escolha um ALVO VÁLIDO para concluir o poder.';
  }
  if (escolha.espelho) instrucao = 'PODER COPIADO · ' + instrucao;
  return nome + ' — ' + instrucao + ' Alvos piscam em branco.';
}
