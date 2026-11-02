export const titulo = 'Já era uma vez.';
export const configuracao = { copias: 1, filaInicial: 4, maoInicial: 4, acoes: 3 };
const dados = [
  ['Rapunzel', 'ativo', 'Mova a carta logo atrás para a TRASEIRA.'],
  ['O Rei', 'passivo', 'Desativa os poderes dos dois vizinhos enquanto estiverem ao lado do Rei.'],
  [
    'O Caçador',
    'ativo',
    'Se esta carta estiver na TRASEIRA, destrua qualquer outra carta da fila.',
  ],
  [
    'O Golem',
    'copia',
    'Copia os poderes e tipos da carta no topo do descarte. Descarte vazio: sem poder.',
  ],
  [
    'João e Maria',
    'ambos',
    'PASSIVO: Não recua por MOVER. ATIVO: Destrua a carta imediatamente à frente. Poderes podem reposicioná-la.',
  ],
  [
    'Dr. Victor Frankenstein',
    'ativo',
    'Leve o topo do descarte para sua mão. Exige descarte com cartas.',
  ],
  [
    'O Lobo Mau',
    'ambos',
    'PASSIVO: Não avança por MOVER. ATIVO: Destrua a carta imediatamente atrás. Poderes podem reposicioná-la.',
  ],
  [
    'O Espelho Mágico',
    'ativo',
    'Por 1 ação, use o poder de uma carta inimiga na fila como seu. Mantenha os alvos e as condições exigidos.',
  ],
  [
    'O Patinho Feio',
    'passivo',
    'Ao CONSTRUIR, entra na TRASEIRA. Ao ser destruída, seu controlador compra 2 cartas.',
  ],
  [
    'O Coelho',
    'passivo',
    'Permite usar as ativas desta carta até 2 vezes por turno. Cada uso custa 1 ação.',
  ],
  [
    'O Grilo Falante',
    'passivo',
    'A carta logo à frente pode usar seu poder sem gastar ação. Mantém o limite de uso.',
  ],
  ['A Sereia', 'ativo', 'Mova qualquer carta da fila para logo atrás desta carta.'],
  [
    'O Flautista de Hamelin',
    'ativo',
    'Escolha qualquer outra carta da fila e mova-a para a FRENTE.',
  ],
  ['O Chapeleiro Maluco', 'ativo', 'Mova a carta da FRENTE para a TRASEIRA.'],
  [
    'Dom Quixote',
    'passivo',
    'Quando outra carta for destruída, você pode destruir esta carta no lugar dela. A carta protegida fica na fila.',
  ],
  ['Robin Hood', 'ativo', 'Troque a posição desta carta com qualquer outra carta da fila.'],
  ['Pinóquio', 'ativo', 'Destrua a carta 2 posições à frente. Exige carta nessa posição.'],
  [
    'A Sombra do Peter Pan',
    'copia',
    'Copia os poderes e tipos da carta logo à frente. Sem vizinha à frente: sem poder.',
  ],
  [
    'O Porquinho Construtor',
    'ativo',
    'Destrua qualquer carta diretamente entre esta carta e outra carta que você controle: o alvo deve estar entre duas cartas suas.',
  ],
  [
    'O Gênio da Lâmpada',
    'passivo',
    'Na FRENTE, permite ao controlador comprar 1 carta grátis por turno.',
  ],
  [
    'Rumpelstiltskin',
    'ativo',
    'Troque o controle desta carta e de uma carta inimiga. As duas ficam nas mesmas posições.',
  ],
  [
    'O Curupira',
    'passivo',
    'No fim de cada turno, antes da destruição da TRASEIRA, destrua a carta logo atrás. Sem vizinha atrás: sem efeito.',
  ],
];
const cores = ['#E01A4F', '#F15946', '#F9C22E', '#53B3CB', '#0C090D'];
export const cartas = dados.map(([nome, tipo, descricao], i) => ({
  id: i + 1,
  nome,
  tipo,
  descricao,
  cor: cores[i % cores.length],
  imagem: './Personagens/Personagens.png',
  sprite: { coluna: i, colunas: 22, lado: 16 },
}));
export const definicao = (id) => cartas[id - 1];
