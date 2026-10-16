/* Orquestra a página: cortina de carregamento honesta, rolagem suave (Lenis),
   revelações, menu acessível, painéis de projeto empilhados com demonstrações
   vivas (demos.js) e o caso de cada projeto, com rota própria (#projeto/<nome>),
   que se abre a partir do próprio painel.
   As cenas 3D ficam em heroi3d.js e mundo3d.js e só carregam se houver
   WebGL — sem elas a página continua inteira, com a imagem de reserva. */
import Lenis from '../vendor/lenis.mjs';

window.__siteOk = true;

const raiz = document.documentElement;
const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const toque = matchMedia('(hover: none), (pointer: coarse)').matches;
const economia = Boolean(navigator.connection && navigator.connection.saveData);
const resgatado = Boolean(window.__resgatou);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const limitar = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/* ------------------------------------------------------------------ */
/* Palavras que sobem de dentro de uma máscara                         */
/* ------------------------------------------------------------------ */
function dividirPalavras(el) {
  let i = 0;
  const percorrer = (no) => {
    for (const filho of [...no.childNodes]) {
      if (filho.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const parte of filho.textContent.split(/(\s+)/)) {
          if (!parte) continue;
          if (/^\s+$/.test(parte)) { frag.append(' '); continue; }
          const pal = document.createElement('span');
          pal.className = 'pal';
          const dentro = document.createElement('span');
          dentro.textContent = parte;
          dentro.style.setProperty('--i', i++);
          pal.append(dentro);
          frag.append(pal);
        }
        filho.replaceWith(frag);
      } else if (filho.nodeType === Node.ELEMENT_NODE) {
        percorrer(filho);
      }
    }
  };
  percorrer(el);
}
$$('[data-revela="palavras"]').forEach(dividirPalavras);

function trocarRotulo(el, texto) {
  const s = $('.rola > span', el);
  if (!s) return;
  s.textContent = texto;
  s.dataset.t = texto;
}

/* ------------------------------------------------------------------ */
/* Rolagem suave                                                       */
/* ------------------------------------------------------------------ */
let lenis = null;
if (!reduzido) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.4, autoRaf: false });
  lenis.stop();
}

function irPara(alvo) {
  if (lenis) {
    lenis.scrollTo(alvo, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), force: true });
  } else if (alvo === 0) {
    window.scrollTo(0, 0);
  } else {
    alvo.scrollIntoView();
  }
}

/* ------------------------------------------------------------------ */
/* Cena do topo                                                        */
/* ------------------------------------------------------------------ */
const secHeroi = $('.heroi');
const cenaHeroi = $('.heroi__cena');
let heroi3d = null;
let entrouNoTopo = false;

const tarefaHeroi = (async () => {
  if (economia) {
    secHeroi.classList.add('sem-3d');
    return;
  }
  try {
    // as legendas das teclas e do chip são desenhadas com a fonte do site
    await Promise.race([document.fonts?.load('600 64px Archivo') ?? Promise.resolve(), esperar(1200)]);
    const { criarHeroi } = await import('./heroi3d.js');
    heroi3d = criarHeroi(cenaHeroi, { reduzido, toque });
    heroi3d.aoPerderContexto = () => secHeroi.classList.add('sem-3d');
    await heroi3d.pronto;
    secHeroi.classList.add('com-3d');
    // se a cena chegou depois da cortina, entra agora, com um fade próprio
    if (entrouNoTopo) heroi3d.entrar();
  } catch (erro) {
    console.warn('Cena 3D do topo indisponível:', erro);
    secHeroi.classList.add('sem-3d');
  }
})();

/* ------------------------------------------------------------------ */
/* Trajetória                                                          */
/* ------------------------------------------------------------------ */
const secMundo = $('.mundo');
const marcos = $$('.marco', secMundo);
const contadorMundo = $('.mundo__contador span', secMundo);
const barraMundo = $('.mundo__barra', secMundo);
let mundo3d = null;
let mundoVisivel = false;
let marcoAtual = -2;

if (!reduzido) {
  secMundo.classList.add('mundo--cena');

  if (!economia) {
    // a cena só é carregada quando a seção se aproxima
    const perto = new IntersectionObserver(async (entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return;
      perto.disconnect();
      try {
        const { criarMundo } = await import('./mundo3d.js');
        mundo3d = criarMundo($('.mundo__cena', secMundo), { toque });
        mundo3d.aoPerderContexto = () => secMundo.classList.add('mundo--sem-3d');
      } catch (erro) {
        console.warn('Cena da trajetória indisponível:', erro);
        secMundo.classList.add('mundo--sem-3d');
      }
    }, { rootMargin: '120% 0px' });
    perto.observe(secMundo);
  } else {
    secMundo.classList.add('mundo--sem-3d');
  }

  new IntersectionObserver(([e]) => { mundoVisivel = e.isIntersecting; }).observe(secMundo);
}

function trocarMarco(novo) {
  marcos.forEach((m, i) => {
    m.classList.toggle('ativo', i === novo);
    m.classList.toggle('saiu', novo >= 0 && i < novo);
  });
  if (novo >= 0) {
    contadorMundo.textContent = String(novo + 1).padStart(2, '0');
    if (marcoAtual >= 0) mundo3d?.pulsar();
  }
  marcoAtual = novo;
}

/* ------------------------------------------------------------------ */
/* Projetos: painéis empilhados com a demonstração viva de cada um     */
/* ------------------------------------------------------------------ */
const projs = $$('.proj[data-slug]');
const palcos = projs.map((el) => $('.proj__palco', el));
const demos = []; // por painel: { inst, visivel, tocando }
let casoAberto = false;
let modDemos = null;
const carregarDemos = () => (modDemos ??= import('./demos.js'));

const ioDemo = new IntersectionObserver((entradas) => {
  for (const e of entradas) {
    const d = demos[palcos.indexOf(e.target)];
    if (d) d.visivel = e.isIntersecting;
  }
}, { threshold: 0.12 });

// as demonstrações são montadas quando a seção se aproxima
const pertoDosProjetos = new IntersectionObserver(async (entradas) => {
  if (!entradas.some((e) => e.isIntersecting)) return;
  pertoDosProjetos.disconnect();
  try {
    const { montarDemo } = await carregarDemos();
    palcos.forEach((el, i) => {
      const inst = montarDemo(el.dataset.demo, el, { reduzido });
      if (!inst) return;
      el.classList.add('vivo');
      demos[i] = { inst, visivel: false, tocando: false };
      ioDemo.observe(el);
    });
  } catch (erro) {
    console.warn('Demonstrações dos projetos indisponíveis:', erro);
  }
}, { rootMargin: '150% 0px' });
pertoDosProjetos.observe($('.pilha'));

/* o painel de baixo cobre o de cima, que recua e escurece; só toca a
   demonstração do painel que está de fato à vista */
function aplicarPilha(y, vh) {
  const pilha = medidas.pilha;
  for (let i = 0; i < pilha.length; i++) {
    const prox = pilha[i + 1];
    const cobre = prox ? limitar((vh - (prox.nat - y)) / Math.max(1, vh - prox.stick)) : 0;
    if (!reduzido && Math.abs(cobre - pilha[i].cobre) > 0.002) {
      pilha[i].alvo.style.setProperty('--cobre', cobre.toFixed(3));
    }
    pilha[i].cobre = cobre;
    const d = demos[i];
    if (!d) continue;
    const deve = d.visivel && cobre < 0.85 && !casoAberto;
    if (deve !== d.tocando) {
      d.tocando = deve;
      if (deve) d.inst.tocar();
      else d.inst.pausar();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Medidas (recalculadas só quando o layout muda)                      */
/* ------------------------------------------------------------------ */
const medidas = { pilha: [], mundo: { topo: 0, altura: 1 }, vh: innerHeight };

function medir() {
  const y = window.scrollY;
  const topoDe = (el) => el.getBoundingClientRect().top + y;
  medidas.vh = innerHeight;
  // posição natural (sem o sticky) de cada painel da pilha
  const pilha = $('.pilha');
  const vao = parseFloat(getComputedStyle(pilha).rowGap) || 0;
  let natural = topoDe(pilha);
  medidas.pilha = projs.map((el) => {
    const item = { alvo: $('.proj__alvo', el), nat: natural, stick: parseFloat(getComputedStyle(el).top) || 0, cobre: -1 };
    natural += el.offsetHeight + vao;
    return item;
  });
  medidas.mundo = { topo: topoDe(secMundo), altura: secMundo.offsetHeight };
}
medir();

let esperaMedida;
const remedir = () => { clearTimeout(esperaMedida); esperaMedida = setTimeout(() => { medir(); heroi3d?.redistribuir?.(); }, 140); };
addEventListener('resize', remedir);
new ResizeObserver(() => { clearTimeout(esperaMedida); esperaMedida = setTimeout(medir, 140); }).observe(document.body);

/* ------------------------------------------------------------------ */
/* Cursor "abrir" sobre os projetos, luz e inclinação que seguem o mouse */
/* ------------------------------------------------------------------ */
const cursor = $('.cursor');
const cur = { mx: -300, my: -300, x: -300, y: -300, s: 0, alvo: 0 };

if (!toque) {
  addEventListener('pointermove', (e) => { cur.mx = e.clientX; cur.my = e.clientY; }, { passive: true });
  $$('.proj__alvo').forEach((el) => {
    const cor = el.closest('.proj').style.getPropertyValue('--cor').trim();
    el.addEventListener('pointerenter', () => {
      cur.alvo = 1;
      cursor.style.background = cor;
      cursor.style.color = '#050a16';
    });
    el.addEventListener('pointerleave', () => {
      cur.alvo = 0;
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      if (!reduzido) {
        el.style.setProperty('--rx', ((0.5 - py) * 4).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ((px - 0.5) * 6).toFixed(2) + 'deg');
      }
    }, { passive: true });
  });
  document.addEventListener('pointerleave', () => { cur.alvo = 0; });
}

/* ------------------------------------------------------------------ */
/* Laço de animação único                                              */
/* ------------------------------------------------------------------ */
let marcaOculta = false;
let yAnterior = 0;
let anterior = performance.now();

function quadro(agora) {
  requestAnimationFrame(quadro); // agenda antes: um erro num quadro não para o laço
  const dt = Math.min(0.05, Math.max(0, (agora - anterior) / 1000));
  anterior = agora;

  if (lenis) lenis.raf(agora);
  const y = lenis ? lenis.scroll : window.scrollY;
  const vel = lenis ? lenis.velocity : y - yAnterior;
  yAnterior = y;
  const vh = medidas.vh;

  aplicarPilha(y, vh);

  // o nome no cabeçalho sai do caminho ao descer e volta ao subir
  const ocultar = y > vh * 0.6 && (vel > 0.4 || (vel >= -0.4 && marcaOculta));
  if (ocultar !== marcaOculta && !menu.classList.contains('aberto')) {
    marcaOculta = ocultar;
    raiz.classList.toggle('marca-oculta', ocultar);
  }

  // trajetória: um marco por trecho de rolagem
  if (secMundo.classList.contains('mundo--cena')) {
    const m = medidas.mundo;
    const pMundo = limitar((y - m.topo) / Math.max(1, m.altura - vh));
    const naTela = y + vh > m.topo + vh * 0.35 && y < m.topo + m.altura;
    const novo = naTela ? Math.min(marcos.length - 1, Math.floor(pMundo * marcos.length)) : -1;
    if (novo !== marcoAtual) trocarMarco(novo);
    barraMundo.style.setProperty('--mp', pMundo.toFixed(4));
    if (mundo3d && mundoVisivel) mundo3d.quadro(dt, pMundo);
  }

  heroi3d?.quadro(dt, vel, limitar(y / vh));

  if (!toque) {
    const k = 1 - Math.exp(-dt * 18);
    if (cur.s < 0.02) { cur.x = cur.mx; cur.y = cur.my; }
    cur.x += (cur.mx - cur.x) * k;
    cur.y += (cur.my - cur.y) * k;
    cur.s += (cur.alvo - cur.s) * (1 - Math.exp(-dt * 11));
    cursor.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0) scale(${cur.s.toFixed(3)})`;
  }
}
requestAnimationFrame(quadro);

/* ------------------------------------------------------------------ */
/* Revelações pela rolagem                                             */
/* ------------------------------------------------------------------ */
function iniciarRevelacoes() {
  const alvos = $$('[data-revela]');
  if (reduzido || !('IntersectionObserver' in window)) {
    alvos.forEach((el) => el.classList.add('visivel'));
    $('.sensores')?.classList.add('acesa');
    return;
  }
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('visivel');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  alvos.forEach((el) => io.observe(el));

  // os LEDs do arquivo acendem em cascata quando a seção aparece
  const sensores = $('.sensores');
  if (sensores) {
    const ioLed = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      sensores.classList.add('acesa');
      ioLed.disconnect();
    }, { rootMargin: '0px 0px -20% 0px' });
    ioLed.observe(sensores);
  }
}

/* ------------------------------------------------------------------ */
/* Cortina de carregamento — honesta: progresso real, teto de 1,5 s    */
/* ------------------------------------------------------------------ */
const pre = $('.pre');
const numPre = $('.pre__num b', pre);

let progressoAlvo = 0;
let progressoMostrado = 0;
let tudoPronto = false;
let entradaFeita = false;

function tarefa(promessa, peso, limite) {
  return Promise.race([promessa, esperar(limite)]).catch(() => {}).finally(() => { progressoAlvo += peso; });
}

if (resgatado) {
  // o resgate já derrubou a cortina: entra sem teatro e sem flash duplo
  raiz.classList.add('js', 'sem-entrada');
  concluirEntrada(true);
  setTimeout(() => raiz.classList.remove('sem-entrada'), 200);
} else {
  Promise.all([
    tarefa(document.fonts ? document.fonts.ready : Promise.resolve(), 30, 1200),
    tarefa(tarefaHeroi, 70, 1400),
  ]).then(() => { tudoPronto = true; });
  setTimeout(() => { tudoPronto = true; }, 1500); // teto duro: a cortina nunca passa de 1,5 s

  let anteriorPre = performance.now();
  const passoPre = (agora) => {
    const dt = Math.min(0.05, (agora - anteriorPre) / 1000);
    anteriorPre = agora;
    const destino = tudoPronto ? 100 : progressoAlvo;
    progressoMostrado += (destino - progressoMostrado) * Math.min(1, dt * (tudoPronto ? 14 : 8));
    if (tudoPronto && progressoMostrado > 99.2) progressoMostrado = 100;
    numPre.textContent = Math.floor(progressoMostrado) + '%';
    if (progressoMostrado >= 100) concluirEntrada();
    else requestAnimationFrame(passoPre);
  };
  requestAnimationFrame(passoPre);
}

async function concluirEntrada(imediato = false) {
  if (entradaFeita) return;
  entradaFeita = true;
  if (!imediato && !reduzido) {
    pre.classList.add('saindo');
    await esperar(120);
  }
  raiz.classList.add('pronto');
  raiz.classList.add('entrou-topo');
  secHeroi.classList.add('entrou');
  entrouNoTopo = true;
  heroi3d?.entrar();
  lenis?.start();
  medir();
  iniciarRevelacoes();
  setTimeout(() => pre.remove(), 1200);

  // chegou com uma rota? abre o caso ou rola até a âncora
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash.startsWith('projeto/')) {
    abrirCasoPorSlug(hash.slice(8), { empurrarHistorico: false, animar: false });
  } else if (hash.length > 1) {
    const alvo = document.getElementById(hash);
    if (alvo) setTimeout(() => irPara(alvo), 500);
  }
}

/* ------------------------------------------------------------------ */
/* Âncoras internas com rolagem suave                                  */
/* ------------------------------------------------------------------ */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.hasAttribute('data-projeto') || a.classList.contains('pular')) return;
  const id = a.getAttribute('href').slice(1);
  if (!id) return;
  const alvo = id === 'topo' ? 0 : document.getElementById(id);
  if (alvo === null) return;
  e.preventDefault();
  if (menu.classList.contains('aberto')) fecharMenu();
  irPara(alvo);
});

/* ------------------------------------------------------------------ */
/* Menu (modal de verdade: foco preso, resto da página inerte)         */
/* ------------------------------------------------------------------ */
const menu = $('#menu');
const botaoMenu = $('.acoes__menu');
const inertes = [$('main'), $('header'), $('.pular')].filter(Boolean);

function prenderFoco(e) {
  if (e.key !== 'Tab') return;
  const focaveis = $$('a, button', menu).filter((el) => el.offsetParent !== null);
  if (!focaveis.length) return;
  const primeiro = focaveis[0];
  const ultimo = focaveis[focaveis.length - 1];
  if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
}
function abrirMenu() {
  menu.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('aberto')));
  botaoMenu.setAttribute('aria-expanded', 'true');
  trocarRotulo(botaoMenu, 'Fechar');
  inertes.forEach((el) => { if ('inert' in el) el.inert = true; });
  menu.addEventListener('keydown', prenderFoco);
  $('a', menu).focus({ preventScroll: true });
}
function fecharMenu() {
  menu.classList.remove('aberto');
  botaoMenu.setAttribute('aria-expanded', 'false');
  trocarRotulo(botaoMenu, 'Menu');
  inertes.forEach((el) => { if ('inert' in el) el.inert = false; });
  menu.removeEventListener('keydown', prenderFoco);
  botaoMenu.focus({ preventScroll: true });
  setTimeout(() => { if (!menu.classList.contains('aberto')) menu.hidden = true; }, 650);
}
botaoMenu.addEventListener('click', () => (menu.classList.contains('aberto') ? fecharMenu() : abrirMenu()));
$('[data-fechar-menu]', menu).addEventListener('click', fecharMenu);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menu.classList.contains('aberto')) fecharMenu();
});

/* ------------------------------------------------------------------ */
/* Caso do projeto — rota #projeto/<nome>; o painel se abre até a tela */
/* ------------------------------------------------------------------ */
const caso = $('.caso');
const rolagemCaso = $('.caso__rolagem', caso);
const palcoCaso = $('.caso__palco', caso);
const slugs = projs.map((el) => el.dataset.slug);
let casoAtual = 0;
let casoEmpurrado = false; // a rota atual foi empurrada por um clique nosso?
let demoCaso = null;
let fechando = false;

const corDe = (i) => projs[i].style.getPropertyValue('--cor').trim();
const naTela = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 10 && r.bottom > 0 && r.top < innerHeight;
};
const inteiroNaTela = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 10 && r.top >= -2 && r.bottom <= innerHeight + 2;
};
function recorteDe(el) {
  const r = el.getBoundingClientRect();
  const raio = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 24;
  return `inset(${r.top.toFixed(1)}px ${(innerWidth - r.right).toFixed(1)}px ${(innerHeight - r.bottom).toFixed(1)}px ${r.left.toFixed(1)}px round ${raio}px)`;
}

async function montarDemoDoCaso(i) {
  demoCaso?.destruir();
  demoCaso = null;
  try {
    const { montarDemo } = await carregarDemos();
    if (casoAtual !== i || !caso.open) return;
    demoCaso = montarDemo($('.proj__palco', projs[i]).dataset.demo, palcoCaso, { reduzido });
    demoCaso?.tocar();
  } catch (erro) {
    console.warn('Demonstração indisponível:', erro);
  }
}

function preencherCaso(i) {
  const proj = projs[i];
  const mais = $('.proj__mais', proj);
  const prox = (i + 1) % projs.length;
  casoAtual = i;
  $('.caso__indice span', caso).textContent = String(i + 1).padStart(2, '0');
  $('.caso__indice', caso).lastChild.textContent = ` / ${String(projs.length).padStart(2, '0')}`;
  caso.style.setProperty('--cor', corDe(i));
  $('.caso__status', caso).textContent = $('.mais__status', mais).textContent;
  $('.caso__nome', caso).textContent = $('.proj__nome', proj).textContent;
  $('.caso__linha', caso).textContent = $('.proj__desc', proj).textContent;
  $('.caso__problema', caso).textContent = $('.mais__problema', mais).textContent;
  $('.caso__solucao', caso).textContent = $('.mais__solucao', mais).textContent;
  $('.caso__passos', caso).replaceChildren(...$$('.mais__passos li', mais).map((li) => li.cloneNode(true)));
  $('.caso__stack', caso).replaceChildren(...$$('.mais__stack li', mais).map((li) => li.cloneNode(true)));
  const nota = $('.mais__nota', mais);
  const notaCaso = $('.caso__nota', caso);
  notaCaso.hidden = !nota;
  notaCaso.textContent = nota ? nota.textContent : '';
  const link = $('.mais__link', mais);
  const botao = $('.caso__link', caso);
  botao.hidden = !link;
  if (link) botao.href = link.href;
  $('.caso__proximo-nome', caso).textContent = $('.proj__nome', projs[prox]).textContent;
  $('.caso__proximo', caso).setAttribute('aria-label', `Próximo projeto: ${$('.proj__nome', projs[prox]).textContent}`);
  rolagemCaso.scrollTop = 0;
  montarDemoDoCaso(i);
}

function abrirCaso(i, { animar = true } = {}) {
  casoAberto = true;
  cur.alvo = 0;
  lenis?.stop();
  const alvo = $('.proj__alvo', projs[i]);
  const doPainel = animar && !reduzido && naTela(alvo);
  caso.style.transition = 'none';
  caso.style.clipPath = doPainel ? recorteDe(alvo) : 'inset(0px 0px 0px 0px round 0px)';
  caso.showModal();
  preencherCaso(i);
  caso.getBoundingClientRect(); // fixa o recorte inicial antes de animar
  caso.style.transition = '';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    caso.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';
    caso.classList.add('aberto');
  }));
}

function abrirCasoPorSlug(slug, { empurrarHistorico = true, animar = true } = {}) {
  const i = slugs.indexOf(slug);
  if (i < 0) return false;
  if (empurrarHistorico) {
    history.pushState({ caso: slug }, '', '#projeto/' + slug);
    casoEmpurrado = true;
  }
  if (caso.open && !fechando) preencherCaso(i);
  else if (!caso.open) abrirCaso(i, { animar });
  return true;
}

function fecharCaso({ pelaNavegacao = false } = {}) {
  if (!caso.open || fechando) return;
  fechando = true;
  caso.classList.remove('aberto');
  const alvo = $('.proj__alvo', projs[casoAtual]);
  if (!reduzido) {
    // se o caso mudou pelo "próximo", a página volta ao painel dele antes de fechar
    const item = medidas.pilha[casoAtual];
    if (item && (item.cobre > 0.05 || !inteiroNaTela(alvo))) {
      const destino = item.nat - item.stick;
      if (lenis) lenis.scrollTo(destino, { immediate: true, force: true });
      else window.scrollTo(0, destino);
      aplicarPilha(destino, medidas.vh);
    }
  }
  caso.style.clipPath = !reduzido && naTela(alvo) ? recorteDe(alvo) : 'inset(50% 0px 50% 0px round 0px)';
  setTimeout(() => {
    caso.close();
    demoCaso?.destruir();
    demoCaso = null;
    casoAberto = false;
    fechando = false;
    lenis?.start();
  }, reduzido ? 0 : 860);
  if (!pelaNavegacao) {
    if (casoEmpurrado) history.back();
    else history.replaceState(null, '', location.pathname + '#projetos');
  }
  casoEmpurrado = false;
}

projs.forEach((proj, i) => {
  $('.proj__alvo', proj).addEventListener('click', (e) => {
    // Ctrl/Cmd/Shift e botão do meio: deixa o navegador abrir em outra aba
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
    e.preventDefault();
    abrirCasoPorSlug(slugs[i]);
  });
});
caso.addEventListener('cancel', (e) => { e.preventDefault(); fecharCaso(); });
// a barra do caso ganha fundo só depois que o conteúdo começa a passar por baixo dela
rolagemCaso.addEventListener('scroll', () => caso.classList.toggle('rolou', rolagemCaso.scrollTop > 40), { passive: true });
$('[data-fechar-caso]', caso).addEventListener('click', () => fecharCaso());
$('.caso__proximo', caso).addEventListener('click', () => {
  const prox = (casoAtual + 1) % projs.length;
  caso.classList.add('trocando');
  setTimeout(() => {
    history.replaceState({ caso: slugs[prox] }, '', '#projeto/' + slugs[prox]);
    caso.classList.remove('aberto');
    preencherCaso(prox);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      caso.classList.remove('trocando');
      caso.classList.add('aberto');
    }));
  }, reduzido ? 0 : 380);
});

// Voltar/avançar do navegador abre e fecha o caso
addEventListener('popstate', () => {
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash.startsWith('projeto/')) {
    abrirCasoPorSlug(hash.slice(8), { empurrarHistorico: false });
  } else if (caso.open) {
    fecharCaso({ pelaNavegacao: true });
  }
});

/* ------------------------------------------------------------------ */
/* Copiar e-mail                                                       */
/* ------------------------------------------------------------------ */
const aviso = $('.contato__aviso');
$$('[data-copiar]').forEach((botao) => {
  const original = $('.rola > span', botao)?.textContent ?? '';
  botao.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(botao.dataset.copiar);
      trocarRotulo(botao, 'E-mail copiado');
      if (aviso) aviso.textContent = 'E-mail copiado.';
    } catch {
      trocarRotulo(botao, 'Copie o endereço acima');
      if (aviso) aviso.textContent = 'Não foi possível copiar. Selecione o endereço acima.';
    }
    setTimeout(() => {
      trocarRotulo(botao, original);
      if (aviso) aviso.textContent = '';
    }, 2600);
  });
});
