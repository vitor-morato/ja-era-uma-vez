import { escolherJogada } from './ia.js';
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ acao: escolherJogada(data.estado, data.nivel) });
  } catch (erro) {
    self.postMessage({ erro: erro.message });
  }
};
