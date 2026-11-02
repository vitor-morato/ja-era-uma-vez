import { orientarPoder } from './orientacoes_poderes.js';
import { destinoConstrucao } from './construcao.js';
import { cenaSolo, duracaoResumoSolo } from './solo.js';
import { iconeCaveira, iconeNavegacao } from './icones.js';
import { montarManual } from './manual.js';
import { cartas, definicao } from './cartas.js';
import { poder, validar, alvosPoder, alvosValidos, motivoPoder } from './regras.js';
export const escapar = (texto) =>
  String(texto).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
function fitaDescarte() {
  return `<span class="fita_descarte" aria-hidden="true">${iconeCaveira()}</span>`;
}
export function retrato(c) {
  const d = definicao(c.id),
    sprite = d.sprite;
  return (
    '<span class="retrato ' +
    (sprite ? 'retrato_sprite' : '') +
    '" style="--cor:' +
    d.cor +
    (sprite ? ';--sprite_coluna:' + sprite.coluna + ';--sprite_colunas:' + sprite.colunas : '') +
    '">' +
    (d.imagem
      ? (sprite ? '<span class="sprite_janela">' : '') +
        '<img src="' +
        escapar(d.imagem) +
        '" alt="Retrato de ' +
        escapar(d.nome) +
        '" draggable="false">' +
        (sprite ? '</span>' : '')
      : '') +
    '</span>'
  );
}

function cabecalhoDetalhes(d, efetiva = d) {
  return (
    '<div class="identidade_carta">' +
    retrato(d) +
    '<div><h2>' +
    escapar(d.nome) +
    '</h2><span class="simbolos_poder">' +
    simbolos(efetiva) +
    '</span></div></div>'
  );
}

export function habilidades(d) {
  if (d.tipo === 'ambos') {
    const partes = d.descricao.split('ATIVO:');
    return [
      { tipo: 'passivo', texto: partes[0].replace('PASSIVO:', '').trim() },
      { tipo: 'ativo', texto: partes[1].trim() },
    ];
  }
  return [{ tipo: d.tipo === 'ativo' ? 'ativo' : 'passivo', texto: d.descricao }];
}
function simbolos(d) {
  return habilidades(d)
    .map(
      (h) =>
        `<span class="simbolo_${h.tipo}" aria-label="${h.tipo === 'ativo' ? 'Ativa' : 'Passiva'}" title="${h.tipo === 'ativo' ? 'Ativa' : 'Passiva'}">${h.tipo === 'ativo' ? 'A' : 'P'}</span>`,
    )
    .join('');
}
export function avisoCarta(titulo, texto, tipo = 'erro') {
  return `<span class="aviso_carta aviso_carta_${tipo}" role="note"><b>${escapar(titulo)}</b><span>${escapar(texto)}</span></span>`;
}
function blocos(
  d,
  compacto = false,
  disponivel = false,
  motivo = 'Carta do adversário. Ative apenas suas cartas.',
) {
  return habilidades(d)
    .map((h) => {
      const conteudo = `<strong>${h.tipo === 'ativo' ? 'ATIVA' : 'PASSIVA'}</strong><span>${escapar(h.texto)}</span>`;
      if (!compacto && h.tipo === 'ativo')
        return `<button class="habilidade habilidade_ativa" data-comando="selecionar_poder" ${disponivel ? '' : 'disabled'}>${conteudo}${disponivel ? '<small>1 ação · salvo poder gratuito</small><span class="fita_bloco_ativa" aria-hidden="true"><svg viewBox="0 0 48 66" focusable="false"><path class="sombra_fita_simples" d="M8 44L24 28L40 44V50L24 34L8 50Z"/><path class="sombra_fita_contornada" d="M2 58.485281L24 36.485281L46 58.485281V64.485281L24 42.485281L2 64.485281Z"/><path class="contorno_fita_unica" d="M2 -6H46V58.485281L24 36.485281L2 58.485281Z"/><path class="corpo_fita_unica" d="M8 -6H40V44L24 28L8 44Z"/></svg><span>!</span></span>' : avisoCarta('INDISPONÍVEL', motivo)}</button>`;
      return `<span class="habilidade habilidade_${h.tipo}">${conteudo}</span>`;
    })
    .join('');
}
// Quebras explícitas para que os 22 nomes ocupem no máximo duas linhas.
export const nomesMiniatura = [
  ['Rapunzel'],
  ['O Rei'],
  ['O Caçador'],
  ['O Golem'],
  ['João e Maria'],
  ['Dr. Victor', 'Frankenstein'],
  ['O Lobo Mau'],
  ['O Espelho', 'Mágico'],
  ['O Patinho', 'Feio'],
  ['O Coelho'],
  ['O Grilo', 'Falante'],
  ['A Sereia'],
  ['O Flautista', 'de Hamelin'],
  ['O Chapeleiro', 'Maluco'],
  ['Dom Quixote'],
  ['Robin Hood'],
  ['Pinóquio'],
  ['A Sombra do', 'Peter Pan'],
  ['O Porquinho', 'Construtor'],
  ['O Gênio da', 'Lâmpada'],
  ['Rumpelstiltskin'],
  ['O Curupira'],
];
function carta(e, c, selecao, alvos, mao = false, modo = null, descartada = false) {
  const d = definicao(c.id),
    p = mao || descartada ? null : poder(e, c),
    efetiva = definicao(p) || d;
  const ativavel = !mao && !descartada && alvosValidos(e, c).length > 0;
  return `<button class="carta ${selecao === c.id ? 'selecionada' : ''} ${alvos.includes(c.id) ? 'alvo' : ''}" data-traseira="${!mao && !descartada && c.id === e.fila.at(-1)?.id}" title="${!mao && !descartada && c.id === e.fila.at(-1)?.id ? 'TRASEIRA: risco de destruição ao encerrar este turno, após os poderes finais.' : escapar(d.nome)}" data-construivel="${mao && modo === 'construir' && !validar(e, { tipo: 'construir', carta: c.id })}" data-zona="${descartada ? 'descarte' : mao ? 'mao' : 'fila'}" data-propria="${!mao && !descartada && c.controlador === e.atual}" data-ativavel="${ativavel}" data-estado-poder="${mao ? 'NA MÃO' : p === null ? 'PODER DESATIVADO / AUSENTE' : e.usos[c.id] ? 'ATIVA UTILIZADA' : ''}" data-movivel="${modo === 'mover' && !mao && !descartada && [-1, 1].some((direcao) => !validar(e, { tipo: 'mover', carta: c.id, direcao }))}" data-controlador="${mao ? '' : c.controlador}" data-carta="${c.id}" aria-label="${escapar(d.nome)} · carta ${c.id}${mao ? ' · na mão' : ' · J' + (c.controlador + 1)}" aria-pressed="${selecao === c.id}"><span class="cabecalho_carta"><span class="simbolos_poder">${simbolos(efetiva)}</span> ${!mao ? `<span class="dono ${!descartada ? 'fita_posse' : ''} ${c.controlador === 1 ? 'j2' : ''}">J${c.controlador + 1}</span>` : ''}</span>${retrato(c)}${descartada ? fitaDescarte().replace('fita_descarte', 'descarte_caveira') : ''}${mao && modo === 'construir' ? '<span class="sinal_construir" aria-label="Construção disponível">+</span>' : ''}${modo === 'ativar' && ativavel && !mao && !descartada ? '<span class="sinal_ativa" aria-label="Poder ativo disponível"><span class="simbolo_exclamacao">!</span></span>' : ''}${!mao && !descartada && c.id === e.fila.at(-1)?.id ? '<span class="sinal_traseira" aria-label="Traseira: em risco no fim do turno">' + iconeCaveira() + '</span>' : ''}<h3 class="nome_miniatura">${nomesMiniatura[c.id - 1].map((linha) => `<span>${escapar(linha)}</span>`).join('')}</h3></button>`;
}
export function consultarPoderes(e) {
  const ativas = [],
    passivas = [];
  for (const carta of e.fila.filter((c) => c.controlador === e.atual)) {
    const efeito = poder(e, carta);
    if (!efeito) continue;
    const d = definicao(efeito),
      partes = habilidades(d),
      nome = definicao(carta.id).nome;
    const fonte = efeito !== carta.id ? d.nome : null;
    const ativa = partes.find((h) => h.tipo === 'ativo');
    if (ativa && alvosValidos(e, carta).length) {
      const gratis = poder(e, e.fila[e.fila.indexOf(carta) + 1]) === 11;
      ativas.push({
        nome,
        fonte,
        texto: ativa.texto,
        estado: gratis ? 'GRATUITA · GRILO FALANTE' : '1 AÇÃO',
      });
    }
    const passiva = partes.find((h) => h.tipo === 'passivo');
    if (passiva) {
      let estado = 'EM VIGOR';
      if (efeito === 20) {
        const erro = validar(e, { tipo: 'genio', carta: carta.id });
        estado = erro
          ? 'COMPRA CONDICIONADA À FRENTE, BARALHO E LIMITE DO TURNO'
          : 'COMPRA GRATUITA DISPONÍVEL';
      }
      if (efeito === 11 && !e.fila[e.fila.indexOf(carta) - 1]) estado = 'SEM CARTA À FRENTE';
      if (efeito === 22 && !e.fila[e.fila.indexOf(carta) + 1]) estado = 'SEM CARTA ATRÁS';
      passivas.push({ nome, fonte, texto: passiva.texto, estado });
    }
  }
  return { ativas, passivas };
}
function botoesPoderes(e) {
  const listas = consultarPoderes(e);
  return `<div class="legenda_poderes consulta_poderes" aria-label="Consultar seus poderes">${[
    ['ativas', 'A', 'ATIVAS'],
    ['passivas', 'P', 'PASSIVAS'],
  ]
    .map(
      ([tipo, icone, rotulo]) =>
        `<div class="grupo_consulta"><button class="abrir_poderes" data-lista-poderes="${tipo}" aria-expanded="false" aria-controls="lista_${tipo}" aria-label="Consultar suas ${rotulo.toLowerCase()}"><span class="texto_indicador">${icone} · ${listas[tipo].length}</span></button><section class="painel_poderes painel_${tipo}" id="lista_${tipo}" hidden aria-label="Suas ${rotulo.toLowerCase()}"><header><strong>SUAS ${rotulo} NA FILA</strong><span>${listas[tipo].length}</span></header><div class="conteudo_lista_poderes">${listas[tipo].length ? listas[tipo].map((item) => `<article><h3>${escapar(item.nome)}</h3><span class="estado_habilidade">${item.estado}</span>${item.fonte ? `<small>COPIADO DE ${escapar(item.fonte)}</small>` : ''}<p>${escapar(item.texto)}</p></article>`).join('') : `<p class="lista_poderes_vazia">${tipo === 'ativas' ? 'Nenhuma ativa disponível.' : 'Nenhuma passiva em vigor.'}</p>`}</div><span class="fita_lista_poderes" aria-hidden="true">${icone}</span></section></div>`,
    )
    .join('')}</div>`;
}
function continuarPartida(salvo) {
  if (!salvo) return '';
  const encerrada = salvo.resultado !== null,
    turno = salvo.resumoTurno?.turno ?? salvo.turno;
  const modo = salvo.solo
    ? 'O TROVADOR · ' + (salvo.solo === 'dificil' ? 'DIFÍCIL' : 'NORMAL')
    : '2 JOGADORES';
  const situacao = encerrada
    ? 'Partida encerrada'
    : salvo.pendente
      ? 'Decisão de ' + salvo.jogadores[salvo.pendente.jogador]
      : salvo.resumoTurno
        ? 'Turno concluído'
        : 'Vez de ' + salvo.jogadores[salvo.atual];
  return (
    '<button class="continuar_salva" type="button" data-comando="continuar"><span class="retomada_icone" aria-hidden="true">↪</span><span class="retomada_texto"><strong>' +
    (encerrada ? 'VER RESULTADO' : 'CONTINUAR PARTIDA') +
    '</strong><span class="retomada_modo">' +
    modo +
    '</span><span class="retomada_situacao">' +
    escapar(situacao) +
    '</span></span><span class="retomada_turno"><small>TURNO</small><b>' +
    String(turno).padStart(2, '0') +
    '</b></span></button>'
  );
}
export function inicial(salvo) {
  return `<section class="inicio inicio_modos"><span class="marcador_livro marcador_inicio" aria-hidden="true"></span><div class="apresentacao_inicio"><h1 class="titulo_marca"><span class="marca_inicio">Já era</span><br><span class="marca_final">uma vez.</span></h1><p class="introducao slogan_pagina"><strong>Vire a página.</strong><span>Continue na história.</span></p><div class="acessos_inicio"><button class="livro_regras" type="button" data-comando="consultar_regras" aria-label="Abrir livro de regras"><img src="./imagens/icones/Icone.png" alt="" draggable="false"><span>LIVRO<br>DE REGRAS</span></button></div></div><section class="selecao_partida" aria-labelledby="titulo_modos"><header class="cabecalho_escolha"><h2 id="titulo_modos">NOVA PARTIDA</h2><p>Como quer jogar?</p></header><div class="opcoes_partida" aria-label="Modo de jogo"><section class="bloco_modo modo_dupla"><button type="button" class="escolher_modo" data-modo-partida=""><span class="marca_modo" aria-hidden="true"><i>J1</i><i>J2</i></span><strong>2 JOGADORES</strong><span>Contra outra pessoa</span><b class="seta_modo" aria-hidden="true">→</b></button></section><section class="bloco_modo modo_solo"><button type="button" class="escolher_modo" data-modo-partida="normal"><span class="marca_modo" aria-hidden="true"><i>T</i></span><strong>O TROVADOR</strong><span>Contra a inteligência artificial</span><b class="seta_modo" aria-hidden="true">→</b></button></section></div></section>${continuarPartida(salvo)}</section>`;
}
export function configurarPartida(nivel, nomes = ['Jogador 1', 'Jogador 2']) {
  const solo = Boolean(nivel);
  return `<section class="pagina_configuracao"><form class="nova ${solo ? 'partida_solo' : ''}" id="nova" aria-labelledby="titulo_configuracao"><button class="controle_fita fita_voltar voltar_modos" data-comando="voltar_modos" aria-label="Modos de jogo" title="Modos de jogo"><span aria-hidden="true"><svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M9 7 4 12l5 5M4 12h10a5 5 0 0 0 0-10"/></svg></span></button><span class="sobretitulo">NOVA PARTIDA</span><header class="identidade_modo"><span class="marca_modo" aria-hidden="true">${solo ? '<i>T</i>' : '<i>J1</i><i>J2</i>'}</span><h2 id="titulo_configuracao" tabindex="-1">${solo ? 'O TROVADOR' : '2 JOGADORES'}</h2></header><input type="hidden" id="modo_partida" name="modo_partida" value="${solo ? nivel : ''}">${
    solo
      ? '<fieldset class="dificuldade_trovador"><legend>DIFICULDADE</legend>' +
        [
          ['normal', 'NORMAL'],
          ['dificil', 'DIFÍCIL'],
        ]
          .map(
            ([valor, rotulo]) =>
              '<label><input type="radio" name="dificuldade" value="' +
              valor +
              '" ' +
              (nivel === valor ? 'checked' : '') +
              '><span>' +
              rotulo +
              '</span></label>',
          )
          .join('') +
        '</fieldset>'
      : ''
  }<div class="campos_jogadores"><div class="campo_jogador_um"><label for="jogador_um">${solo ? 'Seu nome' : 'Jogador 1'} · J1</label><input id="jogador_um" name="jogador_um" maxlength="40" value="${escapar(nomes[0])}" required autocomplete="off"></div>${solo ? '' : '<div class="campo_jogador_dois"><label for="jogador_dois">Jogador 2 · J2</label><input id="jogador_dois" name="jogador_dois" maxlength="40" value="' + escapar(nomes[1]) + '" required autocomplete="off"></div>'}</div>${solo ? '<div class="descricao_solo" data-nivel="' + nivel + '" role="status"><strong>' + (nivel === 'dificil' ? 'DIFÍCIL' : 'NORMAL') + '</strong><span>' + (nivel === 'dificil' ? 'Planeja sequências e aproveita poderes gratuitos.' : 'Avalia cada jogada e o fim do turno.') + '</span></div>' : ''}<div class="navegacao_fitas"><button class="primario iniciar_partida controle_fita fita_iniciar" type="submit" aria-label="${solo ? 'Enfrentar O Trovador' : 'Iniciar partida'}" title="${solo ? 'Enfrentar O Trovador' : 'Iniciar partida'}"><span aria-hidden="true"><svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M6 3v18l15-9Z" fill="currentColor" stroke="none"/></svg></span></button></div></form></section>`;
}
export function privacidade(e) {
  const j = e.pendente ? e.pendente.jogador : e.atual;
  return `<section class="privacidade"><span class="sobretitulo">${e.pendente ? 'DECISÃO DE PROTEÇÃO' : 'TROCA DE JOGADOR'}</span><h1>Passe o aparelho para ${escapar(e.jogadores[j])}.</h1><p>${e.pendente ? 'Confirme para decidir a proteção.' : 'Confirme para iniciar seu turno.'}</p><div class="navegacao_fitas"><button class="controle_fita fita_iniciar primario" data-comando="pronto" aria-label="Estou pronto" title="Estou pronto"><span aria-hidden="true"><svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M6 3v18l15-9Z" fill="currentColor" stroke="none"/></svg></span></button></div></section>`;
}
function miniaturaPublica(c, emRisco = false) {
  return (
    '<article class="resumo_carta ' +
    (emRisco ? 'resolucao_sacrificio' : '') +
    '">' +
    (emRisco ? fitaDescarte().replace('fita_descarte', 'resolucao_caveira') : '') +
    '<span class="dono ' +
    (c.controlador === 1 ? 'j2' : '') +
    '">J' +
    (c.controlador + 1) +
    '</span>' +
    retrato(c) +
    '<h3>' +
    escapar(definicao(c.id).nome) +
    '</h3></article>'
  );
}
export function decisao(e) {
  const p = e.pendente,
    origem = e.fila.find((c) => c.id === p.protetor),
    alvo = e.fila.find((c) => c.id === p.alvo);
  const fonte = poder(e, origem),
    copiada = origem.id !== fonte;
  return (
    '<section class="resolucao_efeito" aria-labelledby="titulo_resolucao"><header><span class="sobretitulo">DECISÃO DE ' +
    escapar(e.jogadores[p.jogador]) +
    '</span><h1 id="titulo_resolucao">PROTEGER?</h1></header><div class="resolucao_cartas"><div><h2>CARTA SACRIFICADA</h2>' +
    miniaturaPublica(origem, true) +
    '</div><span class="resolucao_seta" aria-hidden="true">→</span><div><h2>CARTA EM RISCO</h2>' +
    miniaturaPublica(alvo) +
    '</div></div><div class="resolucao_descricao"><span class="simbolo_passivo">P</span><div><strong>PASSIVA' +
    (copiada ? ' · COPIADA DE ' + escapar(definicao(fonte).nome) : '') +
    '</strong><p>Destrua ' +
    escapar(definicao(origem.id).nome) +
    ' no lugar de ' +
    escapar(definicao(alvo.id).nome) +
    '. A carta protegida permanece na fila.</p></div></div><div class="resolucao_opcoes navegacao_fitas"><button class="controle_fita fita_confirmar" data-comando="proteger" aria-label="Proteger" title="Proteger"><span aria-hidden="true"><svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="m4 12 5 5L20 6"/></svg></span></button><button class="controle_fita fita_perigo" data-comando="recusar" aria-label="Não proteger" title="Não proteger"><span aria-hidden="true"><svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="m6 6 12 12M18 6 6 18"/></svg></span></button></div></section>'
  );
}

function resumoDescartes(e) {
  const registros = e.resumoTurno.descartadas;
  if (!Array.isArray(registros)) return '';
  const unicas = [...new Map(registros.map((c) => [c.id, c])).values()];
  return (
    '<section class="resumo_descartes" aria-label="Cartas descartadas neste turno"><h2>' +
    (registros.length === 1 ? 'CARTA DESCARTADA' : 'CARTAS DESCARTADAS') +
    '</h2>' +
    (unicas.length
      ? '<div class="resumo_cartas">' +
        unicas
          .map(
            (c) =>
              '<article class="resumo_carta descarte_confirmado">' +
              fitaDescarte().replace('fita_descarte', 'descarte_caveira') +
              '<span class="dono ' +
              (c.controlador === 1 ? 'j2' : '') +
              '">J' +
              (c.controlador + 1) +
              '</span>' +
              retrato(c) +
              '<h3>' +
              escapar(definicao(c.id).nome) +
              '</h3></article>',
          )
          .join('') +
        '</div>'
      : '<p>Sem descartes neste turno.</p>') +
    '</section>'
  );
}
function aguardandoTrovador(e) {
  return (
    '<section class="trovador_jogando" aria-labelledby="titulo_trovador" aria-live="polite"><div class="painel_espera_solo"><span class="sobretitulo">TURNO ' +
    String(e.turno).padStart(2, '0') +
    ' · ' +
    'VEZ DO TROVADOR' +
    '</span><h1 id="titulo_trovador">O TROVADOR ESTÁ ' +
    'JOGANDO' +
    '</h1><span class="progresso_trovador" role="progressbar" aria-label="O Trovador está preparando suas jogadas"><i></i></span></div></section>'
  );
}
function resumoSolo(e) {
  const terminou = e.resultado !== null,
    suaVez = e.atual === 0,
    segundos = Math.ceil(duracaoResumoSolo(e) / 1000);
  return (
    '<section class="resumo_solo" aria-labelledby="titulo_resumo_solo" aria-live="polite"><div class="anuncio_turno_solo"><span class="sobretitulo">TURNO ' +
    String(e.resumoTurno.turno).padStart(2, '0') +
    ' · ENCERRADO</span><h1 id="titulo_resumo_solo">' +
    (terminou ? 'PARTIDA ENCERRADA' : suaVez ? 'SUA VEZ' : 'VEZ DO TROVADOR') +
    '</h1>' +
    (terminou
      ? ''
      : '<p class="numero_novo_turno">INÍCIO DO TURNO ' +
        String(e.turno).padStart(2, '0') +
        '</p><p>' +
        (suaVez ? escapar(e.jogadores[0]) : 'O Trovador está preparando suas jogadas.') +
        '</p>') +
    '</div>' +
    resumoDescartes(e) +
    '<div class="navegacao_fitas"><button class="controle_fita fita_iniciar primario continuar_resumo_solo" data-comando="seguir_turno" aria-label="Continuar" title="Continuar"><span aria-hidden="true"><svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M6 3v18l15-9Z" fill="currentColor" stroke="none"/></svg></span></button></div><span class="tempo_restante" aria-hidden="true">' +
    segundos +
    ' s</span><div class="barra_tempo_resumo" role="progressbar" aria-label="Tempo restante nesta tela" aria-valuemin="0" aria-valuemax="' +
    segundos +
    '" aria-valuenow="' +
    segundos +
    '"><span></span></div></section>'
  );
}
export function partida(
  e,
  selecao,
  escolha,
  modo = null,
  maoAberta = false,
  descarteAberto = false,
) {
  const cena = cenaSolo(e);
  if (cena === 'resumo') return resumoSolo(e);
  if (cena === 'aguardar') return aguardandoTrovador(e);
  if (e.resumoTurno)
    return `<section class="turno_encerrado" aria-labelledby="titulo_encerrado"><div class="encerramento_principal"><span class="sobretitulo">TURNO ${String(e.resumoTurno.turno).padStart(2, '0')} · CONCLUÍDO</span><h1 id="titulo_encerrado"><span>TURNO</span><span>ENCERRADO.</span></h1><p>${escapar(e.jogadores[e.resumoTurno.jogador])}</p><div class="navegacao_fitas"><button class="controle_fita fita_iniciar primario" data-comando="seguir_turno" aria-label="Continuar" title="Continuar"><span aria-hidden="true"><svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M6 3v18l15-9Z" fill="currentColor" stroke="none"/></svg></span></button></div></div>${resumoDescartes(e)}</section>`;
  if (e.fase === 'passagem') return privacidade(e);
  if (e.fase === 'decisao') return decisao(e);
  if (e.fase === 'fim') {
    const empate = e.resultado === 'empate',
      vencedor = empate ? null : e.resultado;
    const sobreviventes = empate ? [] : e.fila.filter((c) => c.controlador === vencedor);
    return `<section class="resultado_final ${empate ? 'resultado_empate' : vencedor === 0 ? 'resultado_j1' : 'resultado_j2'}" aria-labelledby="titulo_resultado"><div class="resultado_conteudo"><header class="resultado_abertura"><span class="sobretitulo">PARTIDA ENCERRADA</span><div class="resultado_turno"><span>TURNO FINAL</span><strong>${String(e.turno).padStart(2, '0')}</strong></div><h1 id="titulo_resultado">${empate ? 'EMPATE' : 'VITÓRIA'}</h1></header>${
      empate
        ? '<p class="resultado_sem_cartas">Nenhuma carta permaneceu na fila.</p>'
        : `<div class="resultado_vencedor"><span class="dono ${vencedor === 1 ? 'j2' : ''}">J${vencedor + 1}</span><strong>${escapar(e.jogadores[vencedor])}</strong></div><section class="resultado_sobreviventes" aria-label="Cartas do vencedor"><header><h2>FILA DO VENCEDOR</h2><span>${sobreviventes.length} ${sobreviventes.length === 1 ? 'CARTA' : 'CARTAS'}</span></header><div class="resultado_elenco" style="--total-final:${sobreviventes.length}">${[
            ...sobreviventes,
          ]
            .reverse()
            .map(
              (c) =>
                `<article class="resultado_personagem">${retrato(c)}<h3>${escapar(definicao(c.id).nome)}</h3></article>`,
            )
            .join('')}</div></section>`
    }<div class="resultado_acoes navegacao_fitas"><button class="controle_fita fita_iniciar primario" data-comando="revanche" aria-label="Jogar de novo" title="Jogar de novo"><span aria-hidden="true"><svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="M5 8a8 8 0 1 1-1 8M5 3v6h6"/></svg></span></button><button data-comando="inicio" class="controle_fita fita_voltar" aria-label="Tela principal" title="Tela principal"><span aria-hidden="true"><svg class="icone_navegacao" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/></svg></span></button></div></div></section>`;
  }

  const turnoTrovador = Boolean(e.solo && e.atual === 1);
  if (turnoTrovador) maoAberta = false;
  const c = [...e.fila, ...(turnoTrovador ? [] : e.maos[e.atual]), ...e.descarte].find(
    (c) => c.id === selecao,
  );
  let alvos = [];
  if (escolha) {
    const origem = e.fila.find((x) => x.id === escolha.carta);
    alvos = alvosValidos(e, origem, escolha);
  }
  let detalhes =
    '<h2>Escolha uma carta</h2><p>Toque em um personagem da fila ou da sua mão para ver suas habilidades e ações.</p>';
  if (c) {
    const d = definicao(c.id),
      naFila = e.fila.some((x) => x.id === c.id),
      ef = naFila ? poder(e, c) : null,
      efetiva = definicao(ef) || d;
    const impedimento = motivoPoder(e, c);
    const disponivel = modo === 'ativar' && !impedimento;
    const motivo = impedimento || (modo !== 'ativar' ? 'Selecione ATIVAR para usar.' : '');
    detalhes = cabecalhoDetalhes(d, efetiva);
    if (ef && ef !== c.id)
      detalhes += avisoCarta(
        'PODER COPIADO',
        'Fonte: ' + efetiva.nome + '. Mantém o tipo original.',
        'informacao',
      );
    detalhes += `<div class="blocos_habilidades">${blocos(efetiva, false, disponivel, motivo)}</div>`;
    if (
      e.descarte.some((x) => x.id === c.id) &&
      !habilidades(efetiva).some((h) => h.tipo === 'ativo')
    )
      detalhes += avisoCarta('FORA DA FILA', 'No descarte. Poderes só funcionam na fila.');
    else if (!naFila && !habilidades(efetiva).some((h) => h.tipo === 'ativo'))
      detalhes += avisoCarta('FORA DA FILA', 'Na mão. Poderes valem após CONSTRUIR.');
    else if (naFila && ef === null && !habilidades(efetiva).some((h) => h.tipo === 'ativo'))
      detalhes += avisoCarta(
        'INDISPONÍVEL',
        motivoPoder(e, c) || 'Poder desativado ou sem fonte de cópia disponível.',
      );

    if (naFila && ef === 20) {
      const erro = validar(e, { tipo: 'genio', carta: c.id });
      let motivoCompra = erro;
      if (erro) {
        if (c.controlador !== e.atual)
          motivoCompra =
            'Esta carta pertence ao adversário. A compra gratuita só pode ser feita pelo controlador no próprio turno.';
        else if (e.fila[0]?.id !== c.id)
          motivoCompra = 'O Gênio precisa estar na FRENTE da fila para conceder a compra gratuita.';
        else if (e.usos['genio' + c.id])
          motivoCompra = 'A compra gratuita desta carta já foi utilizada neste turno.';
        else if (!e.baralho.length)
          motivoCompra = 'O baralho está vazio. Não há carta disponível para a compra gratuita.';
      }
      detalhes += `<button class="compra_gratuita" data-acao='${JSON.stringify({ tipo: 'genio', carta: c.id })}' ${erro ? 'disabled' : ''}>COMPRAR GRATUITAMENTE</button>`;
      detalhes += erro
        ? avisoCarta('COMPRA INDISPONÍVEL', motivoCompra)
        : avisoCarta(
            'COMPRA GRATUITA',
            'Disponível uma vez por turno. Não gasta ação.',
            'informacao',
          );
    }
    if (naFila && ef === 11 && !e.fila[e.fila.indexOf(c) - 1])
      detalhes += avisoCarta(
        'SEM BENEFICIÁRIO',
        'Não há carta imediatamente à frente do Grilo para receber o uso gratuito.',
      );
    if (naFila && ef === 22 && !e.fila[e.fila.indexOf(c) + 1])
      detalhes += avisoCarta(
        'SEM ALVO NO FINAL DO TURNO',
        'Não há carta imediatamente atrás do Curupira. Se a fila continuar assim, ele não destruirá uma vizinha.',
        'informacao',
      );
    if (naFila && ef === 10)
      detalhes += avisoCarta(
        'SEM ATIVA PRÓPRIA',
        'O Coelho tem apenas o passivo descrito acima; ele não concede uma ação ativa adicional.',
        'informacao',
      );
  }
  const podeConstruir = e.maos[e.atual].some(
    (c) => !validar(e, { tipo: 'construir', carta: c.id }),
  );
  const podeMover = e.fila.some((c) =>
    [-1, 1].some((direcao) => !validar(e, { tipo: 'mover', carta: c.id, direcao })),
  );
  function botaoAcao(codigo, rotulo, icone, disponivel, descricao) {
    const cancelar = modo === codigo || (codigo === 'ativar' && Boolean(escolha));
    return `<button data-comando="${cancelar ? 'cancelar' : codigo}" class="${cancelar ? 'cancelar_acao' : ''}" title="${cancelar ? 'Cancelar escolha sem gastar ações' : descricao}" aria-pressed="${cancelar}" ${!cancelar && !disponivel ? 'disabled' : ''}><span class="icone_acao" aria-hidden="true">${cancelar ? '×' : icone}</span> ${cancelar ? 'CANCELAR' : rotulo}${!cancelar && ['construir', 'mover', 'ativar'].includes(codigo) ? '<span class="fita_botao fita_botao_' + codigo + '" aria-hidden="true">' + (codigo === 'construir' ? '+' : codigo === 'ativar' ? '!' : '↔') + '</span>' : ''}</button>`;
  }
  const barraAcoes = `<nav class="opcoes_turno" aria-label="Ações do turno">${botaoAcao('construir', 'CONSTRUIR', '＋', podeConstruir, 'Construir · 1 ação. Arraste uma carta da mão até o encaixe.')}${botaoAcao('mover', 'MOVER', '↔', podeMover, 'Mover · 1 ação. Arraste uma carta sua para trocar com uma vizinha.')}<button data-comando="comprar" title="Comprar · 1 ação" ${validar(e, { tipo: 'comprar' }) ? 'disabled' : ''}><span class="icone_acao" aria-hidden="true">↓</span> COMPRAR<span class="fita_botao fita_botao_comprar" aria-hidden="true">↓</span></button>${botaoAcao(
    'ativar',
    'ATIVAR',
    'A',
    e.fila.some((c) => alvosValidos(e, c).length),
    '1 ação · salvo poder gratuito Escolha a carta e seu bloco ativo ampliado.',
  )}</nav>`;

  const dica = escolha
    ? orientarPoder(e, escolha)
    : modo === 'ativar'
      ? 'Escolha uma carta destacada e confirme no bloco ATIVA da carta ampliada.'
      : modo === 'mover'
        ? 'Arraste para trocar com a vizinha. Puxe de volta para desfazer; solte para confirmar.'
        : modo === 'construir'
          ? 'Arraste uma carta da mão até o encaixe indicado e solte para construir.'
          : '';
  const contagem = (j) => e.fila.filter((c) => c.controlador === j).length;
  const temTraseira =
    modo === 'construir' && e.maos[e.atual].some((c) => destinoConstrucao(e, c.id) === 'traseira');
  const zonaConstrucao = (destino) =>
    '<button type="button" class="zona_construcao zona_construcao_' +
    destino +
    '" data-destino-construcao="' +
    destino +
    '" aria-label="Solte uma carta para construir na ' +
    destino +
    '"><span class="icone_zona_construcao" aria-hidden="true">+</span><span class="icone_encaixe_construcao" aria-hidden="true">' +
    iconeNavegacao('✓') +
    '</span><strong>' +
    (destino === 'frente' ? 'CONSTRUIR' : 'TRASEIRA') +
    '</strong></button>';
  const previaConstrucao =
    modo === 'construir' &&
    c &&
    e.maos[e.atual].some((x) => x.id === c.id) &&
    !validar(e, { tipo: 'construir', carta: c.id });
  return `<section class="jogo ${escolha ? 'escolhendo_alvo' : ''} ${modo === 'mover' ? 'modo_mover' : modo === 'ativar' ? 'modo_ativar' : modo === 'construir' ? 'modo_construir' : ''}"><header class="resumo_turno"><div><small class="rotulo_turno">TURNO ${e.turno}${e.solo ? ` · SOLO · ${e.solo === 'dificil' ? 'DIFÍCIL' : 'NORMAL'}` : ''}</small><strong>${escapar(e.jogadores[e.atual])}</strong></div><div class="controles_turno"><span class="pontos_acoes" aria-label="${e.acoes} de 3 ações restantes">${[1, 2, 3].map((n) => `<span class="${n <= e.acoes ? 'restante' : ''}" aria-hidden="true">●</span>`).join('')}<small>${e.acoes}/3</small></span><button class="primario" data-comando="encerrar" title="Encerrar mesmo sem gastar as três ações">ENCERRAR TURNO</button></div></header>${barraAcoes}${turnoTrovador ? '<div class="estado_trovador" role="status">O TROVADOR ESTÁ PLANEJANDO</div>' : ''}<div class="estado_mesa"><div class="resumo_pilhas"><div class="contagens_jogadores"><span class="dono">J1 · ${contagem(0)}</span><span class="dono j2">J2 · ${contagem(1)}</span></div><button class="abrir_descarte" data-comando="alternar_descarte" aria-expanded="${descarteAberto}" aria-controls="cartas_descartadas" title="Abrir a pilha de descarte" aria-label="Pilha de descarte, ${e.descarte.length} cartas"><span class="rotulo_pilha">PILHA DE DESCARTE</span><strong class="total_descarte">${e.descarte.length}</strong> <span class="seta_gaveta" aria-hidden="true">${descarteAberto ? '▲' : '▼'}</span>${descarteAberto ? '' : fitaDescarte()}</button></div><span class="quantidade_baralho" title="Cartas restantes no baralho de compra">BARALHO <strong>${e.baralho.length}</strong></span>${botoesPoderes(e)}</div><section class="descarte_area" aria-label="Cartas descartadas">${descarteAberto ? `<div class="descarte_aberto" id="cartas_descartadas"><header><strong>TOPO DO DESCARTE</strong></header><div class="faixa faixa_descarte">${e.descarte.length ? carta(e, e.descarte.at(-1), selecao, [], false, null, true) : '<div class="descarte_vazio"><span class="marca_descarte_vazio" aria-hidden="true">' + iconeCaveira() + '</span><strong>DESCARTE VAZIO</strong></div>'}</div>${fitaDescarte()}</div>` : ''}</section>${dica ? `<div class="linha_contexto orientacao_acao" role="status"><strong>${escolha ? 'ESCOLHA' : modo.toUpperCase()}</strong><span>${dica}</span></div>` : ''}<div class="mesa_compacta"><section class="area_fila" aria-label="Fila compartilhada"><div class="direcao"><strong title="A carta desta extremidade pode ser destruída ao encerrar o turno">← TRASEIRA</strong><strong>FRENTE →</strong></div><div class="faixa fila_compartilhada">${temTraseira ? zonaConstrucao('traseira') : ''}${[
    ...e.fila,
  ]
    .reverse()
    .map((c) => carta(e, c, selecao, alvos, false, modo))
    .join(
      '',
    )}${modo === 'construir' ? zonaConstrucao('frente') : ''}</div></section>${c ? `<aside class="detalhes carta_ampliada ${previaConstrucao ? 'previa_construcao' : ''}" aria-label="Carta ampliada">${previaConstrucao ? '<span class="fita_previa_construcao" aria-hidden="true">+</span>' : ''}<header class="topo_detalhes"><strong>CARTA</strong></header><div class="conteudo_detalhes">${detalhes}</div></aside>` : ''}</div><section class="mao_recolhida ${maoAberta ? 'aberta' : ''}" aria-label="Sua mão"><button class="abrir_mao" data-comando="alternar_mao" aria-expanded="${maoAberta}"><span>${turnoTrovador ? 'O Trovador · mão oculta' : 'Sua mão · ' + e.maos[e.atual].length}</span><span class="seta_gaveta" aria-hidden="true">${maoAberta ? '▼' : '▲'}</span></button>${
    maoAberta
      ? `<div class="faixa faixa_mao">${
          [...e.maos[e.atual]]
            .reverse()
            .map((c) =>
              carta(
                e,
                c,
                selecao,
                modo === 'construir'
                  ? e.maos[e.atual]
                      .filter((c) => !validar(e, { tipo: 'construir', carta: c.id }))
                      .map((c) => c.id)
                  : [],
                true,
                modo,
              ),
            )
            .join('') || '<p>Mão vazia.</p>'
        }</div>`
      : ''
  }</section></section>`;
}
export function consulta() {
  return montarManual({ cartas, habilidades, simbolos, escapar, retrato });
}

// Conteúdos de referência para dimensionar todos os detalhes pelo maior texto.
export function referenciasDetalhes() {
  return cartas.map(
    (d) =>
      `${cabecalhoDetalhes(d)}${[4, 8, 18].includes(d.id) ? '<p>Poder copiado de <strong>O Grilo Falante</strong>.</p>' : ''}<div class="blocos_habilidades">${blocos(d, false, false)}</div>${d.id === 20 ? '<button disabled>COMPRAR GRATUITAMENTE</button>' + avisoCarta('COMPRA INDISPONÍVEL', 'Esta carta pertence ao adversário. A compra gratuita só pode ser feita pelo controlador no próprio turno.') : ''}${[10, 11, 22].includes(d.id) ? avisoCarta('CONDIÇÃO DO PODER', 'Não há carta na posição exigida. Este efeito passivo não será produzido enquanto essa condição permanecer.', 'informacao') : ''}`,
  );
}
