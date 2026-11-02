// Apresentação visível desde o HTML; a aplicação e o cache carregam ao fundo.
const inicio = performance.now(),
  duracao = 3000;
const barra = document.querySelector('.apresentacao_barra'),
  preenchimento = barra?.firstElementChild;
const progressoConcluido = new Promise((resolve) => {
  function avancar() {
    const progresso = Math.min(1, (performance.now() - inicio) / duracao);
    if (preenchimento) preenchimento.style.width = progresso * 100 + '%';
    barra?.setAttribute('aria-valuenow', String(Math.round(progresso * 100)));
    if (progresso < 1) requestAnimationFrame(avancar);
    else resolve();
  }
  requestAnimationFrame(avancar);
});
await import('./principal.js');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./servico.js', { updateViaCache: 'none' })
    .then((registro) => registro.update())
    .catch((erro) => console.info('Atualização offline indisponível.', erro));
}
await progressoConcluido;
const apresentacao = document.querySelector('#apresentacao');
if (apresentacao) {
  apresentacao.classList.add('saindo');
  await new Promise((resolve) => setTimeout(resolve, 250));
  apresentacao.remove();
}
document.body.classList.remove('apresentando');
document.dispatchEvent(new Event('apresentacao-concluida'));
