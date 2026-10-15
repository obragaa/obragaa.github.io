/* ==========================================================================
   site.js — traduz a rolagem em progresso.
   O JS só calcula números (0 a 1) e os escreve em custom properties;
   quem anima é o CSS. Nenhuma dependência.
   ========================================================================== */

import { criarCena } from './cena.js';

const raiz = document.documentElement;
raiz.classList.remove('sem-js');

const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- cena de fundo ---------- */
let cena = null;
if (!menosMovimento) {
  const canvas = document.getElementById('cena');
  try {
    cena = criarCena(canvas);
  } catch (e) {
    canvas.style.display = 'none'; // sem canvas, o site continua inteiro
  }
}

/* ---------- elementos observados ---------- */
const paradas = [...document.querySelectorAll('.projeto')];
const secoes = [...document.querySelectorAll('[data-secao]')];
const linksMenu = [...document.querySelectorAll('.menu a')];

const ACENTO_PADRAO = '#38bdf8';

/* ---------- laço de rolagem (um rAF para tudo) ---------- */
let pendente = false;

function aoRolar() {
  if (pendente) return;
  pendente = true;
  requestAnimationFrame(atualizar);
}

function atualizar() {
  pendente = false;
  const alturaVisivel = window.innerHeight;
  const rolagem = window.scrollY;

  /* progresso do documento inteiro → avanço da câmera */
  const total = Math.max(1, document.body.scrollHeight - alturaVisivel);
  const pGlobal = Math.min(1, Math.max(0, rolagem / total));
  raiz.style.setProperty('--total', pGlobal.toFixed(4));
  if (cena) cena.definirProgresso(pGlobal);

  /* progresso de cada parada de projeto */
  let acentoAtual = ACENTO_PADRAO;
  let maisVisivel = null;
  let melhorArea = 0;

  for (const parada of paradas) {
    const caixa = parada.getBoundingClientRect();
    const pista = caixa.height - alturaVisivel;
    // 0 quando a parada encosta no topo, 1 quando termina
    const p = pista > 0 ? Math.min(1, Math.max(0, -caixa.top / pista)) : 0;
    parada.style.setProperty('--p', p.toFixed(4));

    // qual parada ocupa mais tela agora define a cor do ambiente
    const visivel = Math.min(caixa.bottom, alturaVisivel) - Math.max(caixa.top, 0);
    if (visivel > melhorArea) {
      melhorArea = visivel;
      maisVisivel = parada;
    }
  }

  if (maisVisivel && melhorArea > alturaVisivel * 0.35) {
    acentoAtual = maisVisivel.dataset.cor || ACENTO_PADRAO;
  }
  raiz.style.setProperty('--acento', acentoAtual);
  if (cena) cena.definirAcento(acentoAtual);

  /* item do menu correspondente à seção no meio da tela */
  let ativa = null;
  for (const secao of secoes) {
    const caixa = secao.getBoundingClientRect();
    if (caixa.top <= alturaVisivel * 0.5 && caixa.bottom >= alturaVisivel * 0.5) {
      ativa = secao.dataset.secao;
    }
  }
  for (const link of linksMenu) {
    const alvo = link.getAttribute('href').slice(1);
    link.setAttribute('aria-current', String(alvo === ativa));
  }
}

window.addEventListener('scroll', aoRolar, { passive: true });
window.addEventListener('resize', aoRolar, { passive: true });
atualizar();

/* ---------- revelação de blocos ---------- */
if ('IntersectionObserver' in window) {
  const olho = new IntersectionObserver((entradas) => {
    for (const entrada of entradas) {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('visivel');
        olho.unobserve(entrada.target);
      }
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

  document.querySelectorAll('.revela').forEach((el) => olho.observe(el));
} else {
  document.querySelectorAll('.revela').forEach((el) => el.classList.add('visivel'));
}

/* ---------- copiar e-mail ---------- */
const botaoCopiar = document.querySelector('[data-copiar]');
if (botaoCopiar) {
  botaoCopiar.addEventListener('click', async (ev) => {
    ev.preventDefault();
    const email = botaoCopiar.dataset.copiar;
    const original = botaoCopiar.textContent;
    try {
      await navigator.clipboard.writeText(email);
      botaoCopiar.textContent = 'copiado';
    } catch {
      botaoCopiar.textContent = email;
    }
    setTimeout(() => { botaoCopiar.textContent = original; }, 2000);
  });
}
