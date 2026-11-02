// Recorte em resolução nativa: a textura ampliada nunca contém o personagem vizinho.
const recortes = new Map();
function isolarSprite(retrato) {
  const img = retrato.querySelector('img');
  if (!img || img.dataset.spriteIsolado) return;
  if (!img.complete || !img.naturalWidth) {
    if (!img.dataset.recorteAgendado) {
      img.dataset.recorteAgendado = '1';
      img.addEventListener('load', () => isolarSprite(retrato), { once: true });
    }
    return;
  }
  const coluna = Number(retrato.style.getPropertyValue('--sprite_coluna'));
  if (!Number.isInteger(coluna) || img.naturalHeight !== 16 || img.naturalWidth < 16 * (coluna + 1))
    return;
  const chave = img.currentSrc + ':' + coluna;
  let fonte = recortes.get(chave);
  if (!fonte) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, coluna * 16, 0, 16, 16, 0, 0, 16, 16);
    fonte = canvas.toDataURL('image/png');
    recortes.set(chave, fonte);
  }
  img.dataset.spriteIsolado = '1';
  img.src = fonte;
  img.style.setProperty('width', '16px');
  img.style.setProperty('transform', 'scale(var(--sprite_escala,1))');
}
// Cada pixel da arte ocupa um número inteiro de pixels físicos da tela.
function ajustarNomes(raiz) {
  for (const nome of raiz.querySelectorAll(
    '.privacidade h1,.resultado_vencedor strong,.encerramento_principal>p,.anuncio_turno_solo>p,.resolucao_efeito>header>.sobretitulo',
  )) {
    nome.style.removeProperty('font-size');
    if (nome.textContent.split(/\s+/).some((p) => p.length > 20)) {
      const base = parseFloat(getComputedStyle(nome).fontSize);
      nome.style.fontSize =
        Math.min(base, nome.matches('h1') ? 28 : nome.classList.contains('sobretitulo') ? 13 : 15) +
        'px';
    }
  }
  for (const nome of raiz.querySelectorAll('.manual_identidade h3,.identidade_carta h2')) {
    nome.style.removeProperty('font-size');
    let tamanho = parseFloat(getComputedStyle(nome).fontSize);
    if (!nome.clientWidth) continue;
    while (nome.scrollWidth > nome.clientWidth + 1 && tamanho > 10) {
      tamanho -= 0.25;
      nome.style.fontSize = tamanho + 'px';
    }
  }
}
export function ajustarSprites(raiz = document) {
  ajustarNomes(raiz);
  const dpr = window.devicePixelRatio || 1;
  for (const retrato of raiz.querySelectorAll('.retrato_sprite')) {
    isolarSprite(retrato);
    const r = retrato.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const escala = Math.floor((Math.min(r.width, r.height) * dpr) / 16);
    if (escala < 1) continue;
    const lado = (16 * escala) / dpr;
    const x = Math.round((r.left + (r.width - lado) / 2) * dpr) / dpr - r.left;
    const y = Math.round((r.top + (r.height - lado) / 2) * dpr) / dpr - r.top;
    retrato.style.setProperty('--sprite_lado', lado + 'px');
    retrato.style.setProperty('--sprite_escala', String(escala / dpr));
    retrato.style.setProperty('--sprite_x', x + 'px');
    retrato.style.setProperty('--sprite_y', y + 'px');
  }
}
