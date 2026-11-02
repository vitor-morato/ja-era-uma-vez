// Fita ancorada à linha inferior do sumário; acompanha a área de leitura sem deslocar o texto.
export function instalarMarcadorSumario(dialogo, conteudo) {
  const camada = dialogo.querySelector('.camada_marcador_sumario'),
    botao = camada.querySelector('[data-capitulo]'),
    fechar = camada.querySelector('#fechar_consulta');
  let quadro = null;
  function atualizar() {
    if (!dialogo.open) {
      camada.hidden = true;
      return;
    }
    const indice = conteudo.querySelector('#sumario_manual'),
      vermelho = conteudo.querySelector('.marcador_livro');
    if (!indice || !vermelho) {
      camada.hidden = true;
      return;
    }
    const area = conteudo.getBoundingClientRect(),
      folha = dialogo.getBoundingClientRect(),
      linha = indice.getBoundingClientRect().bottom,
      referencia = vermelho.getBoundingClientRect();
    const celular = window.innerWidth <= 650;
    const origem = linha - area.top,
      altura = celular ? 52 : referencia.height,
      largura = celular ? 32 : referencia.width;
    const esquerda = Math.max(0, indice.getBoundingClientRect().right - area.left - largura);
    camada.hidden = false;
    botao.hidden = linha >= area.bottom;
    Object.assign(camada.style, {
      left: area.left - folha.left - dialogo.clientLeft + 'px',
      top: area.top - folha.top - dialogo.clientTop + 'px',
      width: conteudo.clientWidth + 'px',
      height: conteudo.clientHeight + 'px',
    });
    Object.assign(fechar.style, {
      left: esquerda + 'px',
      top: '0px',
      width: largura + 'px',
      height: altura + 'px',
    });
    Object.assign(botao.style, {
      left: Math.max(0, esquerda - largura - (celular ? 4 : 8)) + 'px',
      top: Math.max(0, origem) + 'px',
      width: largura + 'px',
      height: altura + 'px',
    });
  }
  function agendar() {
    if (quadro !== null) return;
    quadro = requestAnimationFrame(() => {
      quadro = null;
      atualizar();
    });
  }
  conteudo.addEventListener('scroll', agendar, { passive: true });
  conteudo.addEventListener('input', agendar);
  window.addEventListener('resize', agendar);
  dialogo.addEventListener('close', () => {
    camada.hidden = true;
  });
  document.fonts.ready.then(agendar);
  return agendar;
}
