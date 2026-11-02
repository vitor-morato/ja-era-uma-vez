// Timbres originais: papel, madeira e cordas. Sem arquivos ou serviços externos.
export const nomesTimbres = [
  'aviso',
  'confirmar',
  'recusar',
  'hover',
  'clique',
  'pegar',
  'encaixe',
  'troca',
  'construir',
  'mover',
  'comprar',
  'ativar',
  'modo',
  'cancelar',
  'bloqueio',
  'pagina',
  'abrir',
  'fechar',
  'inspecao',
  'gastar',
  'esgotadas',
  'proteger',
  'descartar',
  'inicio',
  'vez',
  'trovador',
  'vitoria',
  'derrota',
  'risada_trovador',
  'empate',
  'abortar',
];
export function criarTimbre(contexto, nome) {
  if (!nomesTimbres.includes(nome)) return null;
  const duracoes = {
    aviso: 0.32,
    confirmar: 0.25,
    recusar: 0.28,
    hover: 0.14,
    clique: 0.15,
    pegar: 0.18,
    encaixe: 0.24,
    troca: 0.28,
    construir: 0.45,
    mover: 0.35,
    comprar: 0.65,
    ativar: 0.9,
    modo: 0.26,
    cancelar: 0.24,
    bloqueio: 0.3,
    pagina: 0.65,
    abrir: 0.26,
    fechar: 0.22,
    inspecao: 0.19,
    gastar: 0.12,
    esgotadas: 0.75,
    proteger: 0.85,
    descartar: 0.6,
    inicio: 0.8,
    vez: 0.65,
    trovador: 0.7,
    vitoria: 2.6,
    derrota: 1.8,
    risada_trovador: 2,
    empate: 1.5,
    abortar: 0.6,
  };
  const sr = contexto.sampleRate,
    n = Math.ceil(sr * duracoes[nome]),
    dados = new Float32Array(n);
  let seed = nome.split('').reduce((a, c) => Math.imul(a, 31) + c.charCodeAt(0), 91) >>> 0;
  const ruido = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
  // Corda excitada por ruído e amortecida, sem oscilador de tom puro.
  function corda(midi, inicio = 0, ganho = 0.4, vida = 0.6, madeira = false) {
    const f = 440 * 2 ** ((midi - 69) / 12),
      tamanho = Math.max(8, Math.round(sr / f)),
      linha = new Float64Array(tamanho),
      a = Math.floor(inicio * sr);
    let suavizado = 0;
    for (let k = 0; k < tamanho; k++) {
      suavizado = 0.55 * suavizado + 0.45 * ruido();
      linha[k] = suavizado;
    }
    const amortecimento = madeira ? 0.94 : 0.992;
    let cursor = 0;
    for (let j = a; j < Math.min(n, a + vida * sr); j++) {
      const t = (j - a) / sr,
        v = linha[cursor],
        seguinte = linha[(cursor + 1) % tamanho];
      linha[cursor] = (v + seguinte) * 0.5 * amortecimento;
      cursor = (cursor + 1) % tamanho;
      dados[j] += v * ganho * 2.3 * (1 - Math.exp(-t * 600)) * Math.min(1, (vida - t) / 0.06);
    }
  }

  function papel(inicio, vida, ganho, corte = 0.35) {
    let filtro = 0,
      anterior = 0;
    const a = Math.floor(inicio * sr);
    for (let j = a; j < Math.min(n, a + vida * sr); j++) {
      const t = (j - a) / sr,
        r = ruido();
      filtro += corte * (r - filtro);
      const seco = filtro - anterior * 0.65;
      anterior = filtro;
      dados[j] += ganho * seco * Math.sin((Math.PI * t) / vida) * Math.exp((-t * 2.5) / vida);
    }
  }
  function golpe(f, inicio, ganho, vida = 0.12) {
    const a = Math.floor(inicio * sr);
    let corpo = 0,
      raspagem = 0;
    for (let j = a; j < Math.min(n, a + vida * sr); j++) {
      const t = (j - a) / sr,
        r = ruido();
      corpo += 0.08 * (r - corpo);
      raspagem += 0.5 * (r - raspagem);
      const ressonancia =
        Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 65) +
        0.37 * Math.sin(2 * Math.PI * f * 1.59 * t) * Math.exp(-t * 95);
      dados[j] +=
        ganho *
        (corpo * 2.4 + raspagem * 0.55 + ressonancia * 0.22) *
        Math.exp(-t * 32) *
        (1 - Math.exp(-t * 1200)) *
        Math.min(1, (vida - t) / 0.015);
    }
  }

  // Estalo de cartão: ruído curto, sem grave tonal de impacto.
  function estalo(inicio = 0, ganho = 0.5, vida = 0.045) {
    let rapido = 0,
      lento = 0;
    const a = Math.floor(inicio * sr);
    for (let j = a; j < Math.min(n, a + vida * sr); j++) {
      const t = (j - a) / sr,
        r = ruido();
      rapido += 0.36 * (r - rapido);
      lento += 0.075 * (r - lento);
      dados[j] +=
        ganho *
        (rapido - lento) *
        Math.exp(-t * 125) *
        (1 - Math.exp(-t * 1800)) *
        Math.min(1, (vida - t) / 0.008);
    }
  }

  switch (nome) {
    case 'aviso':
      estalo(0, 0.4, 0.05);
      papel(0.008, 0.28, 0.75, 0.17);
      break;
    case 'confirmar':
      estalo(0, 0.7, 0.055);
      papel(0.008, 0.12, 0.48, 0.2);
      break;
    case 'recusar':
      papel(0, 0.19, 0.95, 0.16);
      golpe(170, 0.015, 0.65, 0.13);
      papel(0.08, 0.14, 0.5, 0.28);
      break;
    case 'hover':
      papel(0, 0.12, 0.32, 0.055);
      break;
    case 'clique':
      estalo(0, 0.85, 0.045);
      papel(0.004, 0.08, 0.32, 0.16);
      break;
    case 'pegar':
      papel(0, 0.16, 0.9);
      golpe(280, 0, 0.35, 0.08);
      break;
    case 'encaixe':
      estalo(0, 0.65, 0.055);
      papel(0.008, 0.17, 0.5, 0.18);
      break;
    case 'troca':
      papel(0, 0.25, 0.85);
      golpe(240, 0.04, 0.5);
      golpe(310, 0.12, 0.35);
      break;
    case 'construir':
      papel(0, 0.32, 0.8, 0.22);
      estalo(0.02, 0.6, 0.055);
      golpe(135, 0.045, 0.25, 0.1);
      papel(0.07, 0.3, 0.45, 0.12);
      break;
    case 'mover':
      papel(0, 0.29, 0.95);
      golpe(235, 0.02, 0.5);
      golpe(295, 0.15, 0.65);
      break;
    case 'comprar':
      papel(0, 0.42, 1, 0.28);
      papel(0.12, 0.32, 0.6, 0.46);
      golpe(180, 0.38, 0.4, 0.12);
      break;
    case 'ativar':
      papel(0, 0.62, 0.85, 0.12);
      papel(0.08, 0.65, 0.38, 0.25);
      estalo(0.035, 0.42, 0.07);
      break;
    case 'modo':
      estalo(0, 0.45, 0.04);
      papel(0.004, 0.15, 0.6, 0.18);
      break;
    case 'cancelar':
      papel(0, 0.22, 0.85, 0.12);
      estalo(0.025, 0.25, 0.04);
      break;
    case 'bloqueio':
      golpe(74, 0, 1, 0.18);
      golpe(145, 0.024, 0.5, 0.1);
      papel(0.008, 0.15, 0.7, 0.12);
      break;
    case 'pagina':
      papel(0, 0.48, 1, 0.19);
      papel(0.12, 0.5, 0.6, 0.5);
      golpe(160, 0.42, 0.3);
      break;
    case 'abrir':
      papel(0, 0.24, 0.85, 0.25);
      golpe(150, 0.02, 0.18, 0.1);
      break;
    case 'fechar':
      papel(0, 0.2, 0.7);
      golpe(180, 0.08, 0.35);
      break;
    case 'inspecao':
      papel(0, 0.17, 0.36, 0.065);
      break;
    case 'gastar':
      estalo(0, 0.45, 0.035);
      papel(0.004, 0.07, 0.3, 0.15);
      break;
    case 'esgotadas':
      papel(0, 0.45, 0.75, 0.16);
      golpe(92, 0.18, 0.85, 0.22);
      break;
    case 'proteger':
      papel(0, 0.6, 0.65, 0.12);
      papel(0.08, 0.65, 0.4, 0.2);
      estalo(0.03, 0.4, 0.06);
      golpe(105, 0.06, 0.18, 0.12);
      break;
    case 'descartar':
      papel(0, 0.5, 1, 0.18);
      papel(0.07, 0.45, 0.48, 0.1);
      estalo(0.26, 0.4, 0.05);
      break;
    case 'inicio':
      golpe(125, 0, 0.3);
      papel(0.025, 0.55, 1, 0.18);
      papel(0.18, 0.5, 0.6, 0.4);
      golpe(150, 0.54, 0.2);
      break;
    case 'vez':
      papel(0, 0.48, 1, 0.19);
      papel(0.12, 0.5, 0.6, 0.5);
      golpe(160, 0.42, 0.3);
      break;
    case 'trovador':
      papel(0, 0.5, 1, 0.18);
      papel(0.14, 0.45, 0.6, 0.4);
      golpe(125, 0.46, 0.2);
      break;
    case 'vitoria':
      [62, 65, 69, 74, 77, 81, 86].forEach((m, i) => corda(m, i * 0.15, 0.4, 1.5));
      golpe(125, 0, 0.4);
      break;
    case 'risada_trovador': {
      // Mesma excitação vocal e formantes das vozes dos personagens, sem ruído contínuo.
      const tempos = [0.04, 0.3, 0.58, 0.89, 1.22, 1.57];
      tempos.forEach((inicio, k) => {
        const vida = k === 5 ? 0.38 : 0.23;
        const base = [132, 155, 144, 169, 138, 111][k];
        const filtros = [620, 980, 2100].map((f, j) => {
          const r = Math.exp((-Math.PI * [100, 160, 260][j]) / sr);
          const c = 2 * r * Math.cos((2 * Math.PI * f) / sr);
          let a = 0,
            b = 0;
          return (x) => {
            const y = (1 - r) * x + c * a - r * r * b;
            b = a;
            a = y;
            return y;
          };
        });
        let fase = 0,
          anterior = 0;
        for (let j = 0; j < vida * sr; j++) {
          const t = j / sr,
            u = t / vida;
          fase = (fase + (base * (1 - 0.22 * u + 0.012 * Math.sin(t * 31))) / sr) % 1;
          const fluxo = fase < 0.63 ? Math.sin((Math.PI * fase) / 0.63) ** 2 : 0;
          const pulso = fluxo - anterior;
          anterior = fluxo;
          const vocal = filtros.reduce((v, fil, i) => v + fil(pulso) * [1, 0.56, 0.23][i], 0);
          const env = Math.max(0, Math.min(1, t / 0.015, (vida - t) / 0.045));
          const idx = Math.floor(inicio * sr) + j;
          if (idx < n) dados[idx] += Math.tanh(vocal * 7) * env * (k === 5 ? 0.78 : 1);
        }
      });
      break;
    }
    case 'derrota':
      [65, 62, 57, 50].forEach((m, i) => corda(m, i * 0.22, 0.4, 1));
      break;
    case 'empate':
      [62, 67, 69, 62].forEach((m, i) => corda(m, i * 0.2, 0.35, 0.8));
      break;
    case 'abortar':
      papel(0, 0.5, 0.9, 0.13);
      estalo(0.06, 0.35, 0.055);
      golpe(105, 0.08, 0.2, 0.12);
      break;
  }
  let pico = 0;
  for (const x of dados) pico = Math.max(pico, Math.abs(x));
  const escala = pico > 0.001 ? 0.82 / pico : 1;
  for (let i = 0; i < n; i++) dados[i] *= escala * Math.min(1, (n - i) / (sr * 0.012));
  const buffer = contexto.createBuffer(1, n, sr);
  buffer.copyToChannel(dados, 0);
  return buffer;
}
