/* Demonstrações vivas dos projetos — cada painel mostra o produto funcionando,
   recriado em código (DOM + canvas 2D, sem bibliotecas).
   Cada demonstração tem um relógio próprio: só anda enquanto o painel está na
   tela, e pausar congela tudo — esperas, digitação e física. Com movimento
   reduzido, o roteiro roda uma vez, sem esperas, e para no quadro final. */

const limitar = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sortear = (a, b) => a + Math.random() * (b - a);
const escolher = (lista) => lista[Math.floor(Math.random() * lista.length)];
const decimal = (v, casas) => v.toFixed(casas).replace('.', ',');
const milhar = (v) => Math.round(v).toLocaleString('pt-BR');

/* ------------------------------------------------------------------ */
/* Relógio: esperas e tiques que só andam enquanto a demo toca         */
/* ------------------------------------------------------------------ */
function criarRelogio(reduzido) {
  let t = 0;
  let tocando = false;
  let congelado = false;
  let raf = 0;
  let ultimo = 0;
  let esperas = [];
  const tiques = new Set();
  const finais = [];

  function passo(agora) {
    if (!tocando) return;
    const dt = Math.min(0.05, Math.max(0, (agora - ultimo) / 1000));
    ultimo = agora;
    t += dt;
    if (esperas.length) {
      const prontas = esperas.filter((e) => e.ate <= t);
      if (prontas.length) {
        esperas = esperas.filter((e) => e.ate > t);
        prontas.forEach((e) => e.r());
      }
    }
    for (const f of tiques) f(dt, t, true);
    raf = requestAnimationFrame(passo);
  }

  const rel = {
    reduzido,
    vivo: true,
    get t() { return t; },
    esperar(ms) {
      if (reduzido || !rel.vivo) return Promise.resolve();
      return new Promise((r) => esperas.push({ ate: t + ms / 1000, r }));
    },
    aCada(f) { tiques.add(f); return () => tiques.delete(f); },
    aoDestruir(f) { finais.push(f); },
    /* redesenha o quadro atual sem avançar o tempo (ex.: a tela mudou de tamanho) */
    desenharAgora() { if (rel.vivo) for (const f of tiques) f(0, t, true); },
    /* o roteiro continua em laço? (no movimento reduzido, roda uma vez só) */
    seguir() { return rel.vivo && !reduzido; },
    tocar() {
      if (!rel.vivo || tocando) return;
      if (reduzido) {
        // simula alguns segundos de uma vez e congela no último quadro
        if (congelado) return;
        congelado = true;
        for (let i = 0; i < 300; i++) {
          t += 1 / 60;
          for (const f of tiques) f(1 / 60, t, i === 299);
        }
        return;
      }
      tocando = true;
      ultimo = performance.now();
      raf = requestAnimationFrame(passo);
    },
    pausar() {
      tocando = false;
      cancelAnimationFrame(raf);
    },
    destruir() {
      rel.pausar();
      rel.vivo = false;
      esperas.forEach((e) => e.r());
      esperas = [];
      tiques.clear();
      finais.forEach((f) => f());
    },
  };
  return rel;
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
function no(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto != null) el.textContent = texto;
  return el;
}

async function digitar(alvo, texto, rel, cps = 30) {
  if (rel.reduzido) { alvo.textContent = texto; return; }
  for (let i = 1; i <= texto.length && rel.vivo; i++) {
    alvo.textContent = texto.slice(0, i);
    await rel.esperar(1000 / cps);
  }
}

/* número que corre de um valor a outro, no tempo da demo */
function contar(rel, de, para, ms, aplicar) {
  if (rel.reduzido) { aplicar(para); return Promise.resolve(); }
  return new Promise((resolve) => {
    const t0 = rel.t;
    const parar = rel.aCada((dt, t) => {
      const k = limitar((t - t0) / (ms / 1000));
      aplicar(de + (para - de) * (1 - Math.pow(1 - k, 3)));
      if (k >= 1) { parar(); resolve(); }
    });
  });
}

/* canvas que acompanha o tamanho da caixa (DPR até 2) */
function criarTela(raiz, rel, aoMudar) {
  const tela = no('canvas', 'd-tela');
  tela.setAttribute('aria-hidden', 'true');
  raiz.prepend(tela);
  const ctx = tela.getContext('2d');
  const m = { tela, ctx, w: 1, h: 1, dpr: 1 };
  // tamanho de layout (clientWidth), não o da caixa transformada: o painel
  // encolhe e inclina com transform, e o canvas não deve acompanhar isso
  const ajustar = () => {
    const w = tela.clientWidth;
    const h = tela.clientHeight;
    if (w < 2 || h < 2) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (w === m.w && h === m.h && dpr === m.dpr) return;
    m.w = w; m.h = h; m.dpr = dpr;
    tela.width = Math.round(w * dpr);
    tela.height = Math.round(h * dpr);
    aoMudar?.(m);
    rel.desenharAgora(); // trocar o tamanho apaga o canvas: redesenha mesmo pausado
  };
  const ro = new ResizeObserver(ajustar);
  ro.observe(tela);
  ajustar();
  rel.aoDestruir(() => ro.disconnect());
  return m;
}

/* lista curta que guarda só os últimos itens (feeds das lives) */
function empurrar(lista, item, max) {
  lista.append(item);
  while (lista.children.length > max) lista.firstElementChild.remove();
}

/* ================================================================== */
/* Atendo — conversa real de atendimento, com o custo correndo         */
/* ================================================================== */
function atendo(raiz, rel) {
  raiz.innerHTML = `
    <div class="d-at">
      <div class="d-at__chat">
        <div class="d-at__topo"><b class="d-at__av">CS</b><p><strong>Clínica Sorriso</strong><span>online · responde com IA</span></p></div>
        <div class="d-at__msgs"></div>
        <div class="d-at__campo"><span>Mensagem</span><i></i></div>
      </div>
      <aside class="d-at__painel">
        <div class="d-bloco d-bloco--custo"><p class="d-rot">custo desta conversa</p><p class="d-at__custo">US$ 0,0000</p><p class="d-nota">medido a cada resposta</p></div>
        <div class="d-bloco d-bloco--fontes"><p class="d-rot">o agente consultou</p><ul class="d-at__fontes"></ul></div>
        <div class="d-bloco d-bloco--estado"><p class="d-rot">situação</p><p class="d-at__estado">esperando mensagem</p></div>
      </aside>
    </div>`;
  const msgs = raiz.querySelector('.d-at__msgs');
  const custoEl = raiz.querySelector('.d-at__custo');
  const fontes = raiz.querySelector('.d-at__fontes');
  const estadoEl = raiz.querySelector('.d-at__estado');

  const roteiro = [
    { cli: 'Oi! Vocês atendem no sábado?' },
    { bot: 'Atendemos, sim: sábado das 8h às 12h. Quer que eu reserve um horário?', fonte: 'horarios.pdf', custo: 0.0011, estado: 'respondido pelos documentos' },
    { cli: 'Quero às 9h, para uma limpeza.' },
    { bot: 'Pronto! Sábado, 9h — limpeza. Na sexta eu te mando um lembrete.', fonte: 'agenda', custo: 0.0009, estado: 'horário marcado', tipo: 'ok' },
    { cli: 'Consigo um desconto no pacote?' },
    { bot: 'Desconto quem decide é a recepção — já chamei alguém da equipe para falar com você.', custo: 0.0006, estado: 'passado para um humano', tipo: 'humano' },
  ];

  const estado = (texto, tipo = '') => {
    estadoEl.textContent = texto;
    estadoEl.className = 'd-at__estado' + (tipo ? ' d-at__estado--' + tipo : '');
  };

  (async () => {
    do {
      msgs.classList.remove('d-sai');
      msgs.replaceChildren();
      fontes.replaceChildren();
      custoEl.textContent = 'US$ 0,0000';
      estado('esperando mensagem');
      let custo = 0;
      await rel.esperar(600);
      for (const passo of roteiro) {
        if (!rel.vivo) return;
        if (passo.cli) {
          msgs.append(no('p', 'd-at__msg d-at__msg--cli', passo.cli));
          await rel.esperar(950);
          continue;
        }
        const pontos = no('p', 'd-at__msg d-at__msg--bot d-at__digita');
        pontos.innerHTML = '<i></i><i></i><i></i>';
        if (!rel.reduzido) msgs.append(pontos);
        estado('lendo os documentos…');
        await rel.esperar(1150);
        pontos.remove();
        msgs.append(no('p', 'd-at__msg d-at__msg--bot' + (passo.tipo === 'humano' ? ' d-at__msg--humano' : ''), passo.bot));
        if (passo.fonte && ![...fontes.children].some((li) => li.textContent === passo.fonte)) {
          fontes.append(no('li', '', passo.fonte));
        }
        estado(passo.estado, passo.tipo);
        const de = custo;
        custo += passo.custo;
        await contar(rel, de, custo, 700, (v) => { custoEl.textContent = 'US$ ' + decimal(v, 4); });
        await rel.esperar(1400);
      }
      if (!rel.seguir()) return;
      await rel.esperar(2400);
      msgs.classList.add('d-sai');
      await rel.esperar(500);
    } while (rel.seguir());
  })();
}

/* ================================================================== */
/* BodyFlow — a refeição (texto ou foto) vira macros                   */
/* ================================================================== */
function bodyflow(raiz, rel) {
  raiz.innerHTML = `
    <div class="d-bf">
      <div class="d-bf__app">
        <p class="d-bf__dia"><span>Hoje</span><b class="d-bf__ref">Almoço</b></p>
        <div class="d-bf__entrada"><span class="d-bf__texto"></span><i class="d-bf__cursor"></i></div>
        <div class="d-bf__foto"><div class="d-bf__prato"><i></i><i></i><i></i></div><i class="d-bf__scan"></i></div>
        <p class="d-bf__lendo">a IA está lendo a refeição…</p>
        <ul class="d-bf__itens"></ul>
      </div>
      <aside class="d-bf__macros">
        <div class="d-bf__anel">
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="fundo" cx="60" cy="60" r="52"/><circle class="valor" cx="60" cy="60" r="52" pathLength="100"/></svg>
          <p><b class="d-bf__kcal">0</b><span>kcal</span></p>
        </div>
        <div class="d-bf__m" data-m="p"><span>Proteína</span><i><em></em></i><b>0 g</b></div>
        <div class="d-bf__m" data-m="c"><span>Carboidrato</span><i><em></em></i><b>0 g</b></div>
        <div class="d-bf__m" data-m="g"><span>Gordura</span><i><em></em></i><b>0 g</b></div>
      </aside>
      <p class="d-ilustra">ilustração do fluxo</p>
    </div>`;
  const $ = (s) => raiz.querySelector(s);
  const app = $('.d-bf__app');
  const ref = $('.d-bf__ref');
  const texto = $('.d-bf__texto');
  const itens = $('.d-bf__itens');
  const kcalEl = $('.d-bf__kcal');
  const anel = $('.d-bf__anel .valor');
  const barras = { p: $('[data-m="p"]'), c: $('[data-m="c"]'), g: $('[data-m="g"]') };
  const tetos = { p: 60, c: 80, g: 25 };

  const refeicoes = [
    { ref: 'Almoço', modo: 'texto', texto: 'arroz, feijão, 150 g de frango grelhado e salada',
      itens: [['Arroz branco', '4 colheres', 172], ['Feijão', '1 concha', 106], ['Frango grelhado', '150 g', 240], ['Salada verde', '1 prato', 18]],
      p: 52, c: 58, g: 9 },
    { ref: 'Café da manhã', modo: 'foto',
      itens: [['Ovos mexidos', '2 unidades', 182], ['Pão francês', '1 unidade', 135], ['Café com leite', '1 xícara', 64]],
      p: 21, c: 36, g: 15 },
  ];

  const macros = (k, r) => {
    const kcal = r.itens.reduce((s, i) => s + i[2], 0) * k;
    kcalEl.textContent = milhar(kcal);
    anel.style.strokeDashoffset = String(100 - limitar(kcal / 700) * 100);
    for (const m of ['p', 'c', 'g']) {
      barras[m].querySelector('em').style.transform = `scaleX(${limitar((r[m] * k) / tetos[m])})`;
      barras[m].querySelector('b').textContent = Math.round(r[m] * k) + ' g';
    }
  };

  (async () => {
    do {
      for (const r of refeicoes) {
        if (!rel.vivo) return;
        app.className = 'd-bf__app d-bf__app--' + r.modo;
        ref.textContent = r.ref;
        texto.textContent = '';
        itens.replaceChildren();
        macros(0, r);
        await rel.esperar(500);
        if (r.modo === 'texto') {
          await digitar(texto, r.texto, rel, 26);
        } else {
          app.classList.add('d-bf__app--escaneando');
          await rel.esperar(1700);
          app.classList.remove('d-bf__app--escaneando');
        }
        app.classList.add('d-bf__app--lendo');
        await rel.esperar(900);
        app.classList.remove('d-bf__app--lendo');
        const corrida = contar(rel, 0, 1, 1300, (k) => macros(k, r));
        for (const [nome, qtd, kcal] of r.itens) {
          const li = no('li');
          li.append(no('span', '', nome), no('em', '', qtd), no('b', '', kcal + ' kcal'));
          itens.append(li);
          await rel.esperar(260);
        }
        await corrida;
        if (!rel.seguir()) return;
        await rel.esperar(2600);
      }
    } while (rel.seguir());
  })();
}

/* ================================================================== */
/* Atlas — o agente monta o treino só com o que está no catálogo       */
/* ================================================================== */
function atlas(raiz, rel) {
  raiz.innerHTML = `
    <div class="d-tl">
      <div class="d-tl__nav"><i></i><i></i><i></i><span>atlas · treine com inteligência</span></div>
      <div class="d-tl__tela"><img src="assets/img/projetos/atlas-tela.webp" alt="" width="1280" height="719" decoding="async"></div>
      <aside class="d-tl__agente">
        <p class="d-tl__cab"><i></i>Agente do Atlas</p>
        <p class="d-tl__pedido"></p>
        <p class="d-tl__consulta"><span>consultando o catálogo</span><i><em></em></i></p>
        <ul class="d-tl__lista"></ul>
        <p class="d-tl__fim"></p>
      </aside>
    </div>`;
  const $ = (s) => raiz.querySelector(s);
  const agente = $('.d-tl__agente');
  const pedido = $('.d-tl__pedido');
  const lista = $('.d-tl__lista');
  const fim = $('.d-tl__fim');

  const treinos = [
    { pedido: 'Monta um treino de peito para hoje, 45 minutos.',
      itens: [['Supino reto com barra', '4 × 8'], ['Supino inclinado com halteres', '3 × 10'], ['Supino no bosu com elástico', null], ['Crucifixo na polia', '3 × 12'], ['Tríceps na polia', '3 × 12']],
      fim: 'Treino salvo · 4 exercícios · 45 min' },
    { pedido: 'Treino de costas, 40 minutos.',
      itens: [['Puxada frontal', '4 × 10'], ['Remada curvada', '4 × 8'], ['Remada no TRX com salto', null], ['Remada baixa na polia', '3 × 12'], ['Rosca direta', '3 × 10']],
      fim: 'Treino salvo · 4 exercícios · 40 min' },
  ];

  (async () => {
    do {
      for (const tr of treinos) {
        if (!rel.vivo) return;
        agente.className = 'd-tl__agente';
        pedido.textContent = '';
        lista.replaceChildren();
        fim.textContent = '';
        await rel.esperar(500);
        await digitar(pedido, tr.pedido, rel, 34);
        agente.classList.add('d-tl__agente--busca');
        await rel.esperar(1300);
        agente.classList.remove('d-tl__agente--busca');
        for (const [nome, series] of tr.itens) {
          const li = no('li', series ? '' : 'fora');
          li.append(no('span', '', nome), no('em', '', series || '—'), no('b', '', series ? 'catálogo' : 'fora do catálogo'));
          lista.append(li);
          await rel.esperar(series ? 520 : 1100);
          if (!series) li.classList.add('riscado');
        }
        fim.textContent = tr.fim;
        agente.classList.add('d-tl__agente--pronto');
        if (!rel.seguir()) return;
        await rel.esperar(3000);
      }
    } while (rel.seguir());
  })();
}

/* ================================================================== */
/* Widgetok — meta, ranking, alerta e o pote que enche com física      */
/* ================================================================== */
const NOMES_LIVE = ['@ana.luz', '@leo.gamer', '@biazinha', '@caio_rx', '@duda.mp3', '@gui.tv'];
const PRESENTES = [['rosa', 'rosas'], ['coração', 'corações'], ['estrela', 'estrelas']];

function desenharIcone(ctx, tipo, x, y, r) {
  ctx.beginPath();
  if (tipo === 1) { // coração
    const s = r * 0.5;
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.7, y - s * 1.3, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  } else if (tipo === 2) { // estrela
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.24 : r * 0.55;
      ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  } else { // rosa: espiral de pétalas
    ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
    ctx.moveTo(x + r * 0.22, y);
    ctx.arc(x, y, r * 0.22, 0, Math.PI * 1.5);
  }
}

function widgetok(raiz, rel) {
  raiz.innerHTML = `
    <div class="d-wt">
      <div class="d-wt__lado">
        <div class="d-wt__meta d-vidro"><p class="d-rot">meta da live</p><p class="d-wt__num"><b>0</b> / 40 presentes</p><i><em></em></i></div>
        <div class="d-wt__enquete d-vidro"><p class="d-rot">enquete · próximo jogo</p>
          <div class="d-wt__opc"><span>Minecraft</span><b>50%</b><i><em></em></i></div>
          <div class="d-wt__opc"><span>Corrida</span><b>50%</b><i><em></em></i></div>
        </div>
        <div class="d-wt__rank d-vidro"><p class="d-rot">quem mais enviou</p><ol></ol></div>
      </div>
      <p class="d-wt__alerta"><b></b><span></span></p>
      <p class="d-wt__selo"><i></i>rodando neste computador · sem nuvem</p>
    </div>`;
  const caixa = raiz.querySelector('.d-wt');
  const numEl = raiz.querySelector('.d-wt__num b');
  const barra = raiz.querySelector('.d-wt__meta em');
  const rank = raiz.querySelector('.d-wt__rank ol');
  const alerta = raiz.querySelector('.d-wt__alerta');
  const opcoes = [...raiz.querySelectorAll('.d-wt__opc')];
  const votos = [5, 4];
  const votar = () => {
    votos[Math.random() < 0.58 ? 0 : 1] += 1 + Math.floor(Math.random() * 3);
    const total = votos[0] + votos[1];
    opcoes.forEach((o, i) => {
      o.querySelector('b').textContent = Math.round((votos[i] / total) * 100) + '%';
      o.querySelector('em').style.transform = `scaleX(${(votos[i] / total).toFixed(3)})`;
    });
  };
  votar();
  const META = 40;
  const totais = new Map();
  const bolas = [];
  const cores = ['#22d3ee', '#f472b6', '#fbbf24', '#a78bfa'];
  let pote = { x0: 0, x1: 0, topo: 0, base: 0, r: 10 };
  let meta = 0;

  const m = criarTela(caixa, rel, ({ w, h }) => {
    const largo = w > 520;
    const jw = largo ? Math.min(w * 0.36, h * 0.6) : Math.min(w * 0.46, h * 0.5);
    const cx = largo ? w * 0.7 : w * 0.73;
    const base = h * (largo ? 0.9 : 0.88);
    const jh = Math.min(jw * 1.18, h * 0.66);
    pote = { x0: cx - jw / 2, x1: cx + jw / 2, topo: base - jh, base, r: jw / 14 };
  });

  const desenharRank = () => {
    const ordem = [...totais.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    rank.replaceChildren(...ordem.map(([nome, n], i) => {
      const li = no('li');
      li.append(no('b', '', String(i + 1)), no('span', '', nome), no('em', '', String(n)));
      return li;
    }));
  };

  function soltar(qtd, tipo) {
    for (let i = 0; i < qtd; i++) {
      bolas.push({
        x: sortear(pote.x0 + pote.r * 1.5, pote.x1 - pote.r * 1.5),
        y: pote.topo - pote.r * (2 + i * 2.4),
        vx: sortear(-60, 60), vy: sortear(0, 80),
        r: pote.r * sortear(0.92, 1.08), tipo, cor: cores[tipo % cores.length],
        a: 1, saindo: false,
      });
    }
  }

  rel.aCada((dt, t, desenhar) => {
    const { ctx, w, h, dpr } = m;
    // física: 2 subpassos, colisão bola a bola, paredes do pote
    const sub = 2;
    const g = 1500;
    for (let s = 0; s < sub; s++) {
      const d = dt / sub;
      for (const b of bolas) {
        b.vy += g * d * (b.saindo ? -0.35 : 1);
        b.x += b.vx * d;
        b.y += b.vy * d;
        if (b.saindo) { b.a -= d * 1.4; continue; }
        if (b.y > pote.topo - b.r) {
          if (b.x - b.r < pote.x0) { b.x = pote.x0 + b.r; b.vx = Math.abs(b.vx) * 0.4; }
          if (b.x + b.r > pote.x1) { b.x = pote.x1 - b.r; b.vx = -Math.abs(b.vx) * 0.4; }
        }
        if (b.y + b.r > pote.base) { b.y = pote.base - b.r; b.vy *= -0.25; b.vx *= 0.94; }
      }
      for (let i = 0; i < bolas.length; i++) {
        const a = bolas[i];
        if (a.saindo) continue;
        for (let j = i + 1; j < bolas.length; j++) {
          const b = bolas[j];
          if (b.saindo) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const min = a.r + b.r;
          const d2 = dx * dx + dy * dy;
          if (d2 >= min * min || d2 < 1e-6) continue;
          const dist = Math.sqrt(d2);
          const nx = dx / dist;
          const ny = dy / dist;
          const sobra = (min - dist) / 2;
          a.x -= nx * sobra; a.y -= ny * sobra;
          b.x += nx * sobra; b.y += ny * sobra;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) {
            const imp = -rv * 0.65;
            a.vx -= nx * imp; a.vy -= ny * imp;
            b.vx += nx * imp; b.vy += ny * imp;
          }
        }
      }
    }
    for (let i = bolas.length - 1; i >= 0; i--) if (bolas[i].a <= 0) bolas.splice(i, 1);
    if (!desenhar) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // brilho atrás do pote
    const brilho = ctx.createRadialGradient((pote.x0 + pote.x1) / 2, pote.base - 30, 10, (pote.x0 + pote.x1) / 2, pote.base - 30, (pote.x1 - pote.x0) * 1.1);
    brilho.addColorStop(0, 'rgba(34, 211, 238, .22)');
    brilho.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = brilho;
    ctx.fillRect(0, 0, w, h);
    // bolas
    for (const b of bolas) {
      ctx.globalAlpha = limitar(b.a);
      const grad = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, b.cor);
      grad.addColorStop(1, b.cor + '99');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      desenharIcone(ctx, b.tipo, b.x, b.y + b.r * 0.05, b.r);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // o pote de vidro (boca aberta, cantos arredondados embaixo)
    const raio = (pote.x1 - pote.x0) * 0.16;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(210, 245, 255, .55)';
    ctx.beginPath();
    ctx.moveTo(pote.x0, pote.topo);
    ctx.lineTo(pote.x0, pote.base - raio);
    ctx.quadraticCurveTo(pote.x0, pote.base, pote.x0 + raio, pote.base);
    ctx.lineTo(pote.x1 - raio, pote.base);
    ctx.quadraticCurveTo(pote.x1, pote.base, pote.x1, pote.base - raio);
    ctx.lineTo(pote.x1, pote.topo);
    ctx.stroke();
    ctx.fillStyle = 'rgba(210, 245, 255, .05)';
    ctx.fill();
    // aro da boca
    ctx.fillStyle = 'rgba(34, 211, 238, .85)';
    ctx.fillRect(pote.x0 - 8, pote.topo - 9, pote.x1 - pote.x0 + 16, 7);
    // reflexo
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(pote.x0 + 14, pote.topo + 20);
    ctx.lineTo(pote.x0 + 14, pote.base - raio - 10);
    ctx.stroke();
  });

  const avisar = async (quem, texto) => {
    alerta.querySelector('b').textContent = quem;
    alerta.querySelector('span').textContent = texto;
    alerta.classList.remove('in');
    void alerta.offsetWidth;
    alerta.classList.add('in');
  };

  (async () => {
    do {
      meta = 0;
      totais.clear();
      desenharRank();
      numEl.textContent = '0';
      barra.style.transform = 'scaleX(0)';
      await rel.esperar(500);
      while (meta < META && rel.vivo) {
        const quem = escolher(NOMES_LIVE);
        const tipo = Math.floor(Math.random() * PRESENTES.length);
        const qtd = Math.min(META - meta, escolher([1, 1, 2, 3, 5]));
        const [um, varios] = PRESENTES[tipo];
        avisar(quem, `enviou ${qtd} ${qtd > 1 ? varios : um}`);
        soltar(qtd, tipo);
        votar();
        totais.set(quem, (totais.get(quem) || 0) + qtd);
        desenharRank();
        const de = meta;
        meta += qtd;
        contar(rel, de, meta, 600, (v) => {
          numEl.textContent = String(Math.round(v));
          barra.style.transform = `scaleX(${limitar(v / META)})`;
        });
        await rel.esperar(sortear(850, 1500));
      }
      if (!rel.seguir()) return;
      avisar('Meta batida!', 'obrigado, chat');
      caixa.classList.add('d-wt--festa');
      await rel.esperar(2600);
      caixa.classList.remove('d-wt--festa');
      for (const b of bolas) { b.saindo = true; b.vy = -sortear(200, 520); b.vx = sortear(-160, 160); }
      await rel.esperar(1400);
    } while (rel.seguir());
  })();
}

/* ================================================================== */
/* Palco — o presente vira personagem e disputa na tela                */
/* ================================================================== */
const JOGADORES = ['ana', 'leo', 'bia', 'caio', 'duda', 'gui', 'malu', 'rafa', 'teo', 'nina', 'juca', 'lia'];

function palco(raiz, rel) {
  raiz.innerHTML = `
    <div class="d-pc">
      <div class="d-pc__placar d-vidro">
        <p class="d-pc__lado d-pc__lado--a"><b>Time Rosa</b><span>50%</span></p>
        <i class="d-pc__barra"><em></em></i>
        <p class="d-pc__lado d-pc__lado--b"><b>Time Azul</b><span>50%</span></p>
      </div>
      <ul class="d-pc__feed"></ul>
    </div>`;
  const caixa = raiz.querySelector('.d-pc');
  const feed = raiz.querySelector('.d-pc__feed');
  const barra = raiz.querySelector('.d-pc__barra em');
  const pa = raiz.querySelector('.d-pc__lado--a span');
  const pb = raiz.querySelector('.d-pc__lado--b span');
  const COR = ['#f472b6', '#38bdf8'];
  const bonecos = [];
  const faiscas = [];
  const placar = [1, 1];
  let piso = 0;
  let raioB = 20;
  let proxAtaque = 1.2;
  let proxNome = 0;

  const m = criarTela(caixa, rel, ({ w, h }) => {
    piso = h * 0.9;
    raioB = limitar(Math.min(w, h) / 14.5, 15, 36);
  });

  function entrar() {
    const time = bonecos.filter((b) => b.time === 0).length > bonecos.filter((b) => b.time === 1).length ? 1 : (Math.random() < 0.5 ? 0 : 1);
    const nome = JOGADORES[proxNome++ % JOGADORES.length];
    bonecos.push({
      x: time === 0 ? sortear(m.w * 0.12, m.w * 0.45) : sortear(m.w * 0.55, m.w * 0.88),
      y: -raioB * 2, vx: 0, vy: sortear(60, 160),
      r: raioB * sortear(0.9, 1.1), time, nome, a: 0, saindo: false, pisca: 0,
    });
    const li = no('li');
    li.append(no('b', '', '@' + nome), document.createTextNode(' mandou um presente → '), no('em', '', time === 0 ? 'Time Rosa' : 'Time Azul'));
    li.querySelector('em').style.color = COR[time];
    empurrar(feed, li, 3);
    if (bonecos.filter((b) => !b.saindo).length > 12) {
      const velho = bonecos.find((b) => !b.saindo);
      if (velho) velho.saindo = true;
    }
  }

  function faiscar(x, y, cor) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = sortear(120, 380);
      faiscas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, vida: sortear(0.35, 0.7), cor });
    }
  }

  rel.aCada((dt, t, desenhar) => {
    const { ctx, w, h, dpr } = m;
    proxAtaque -= dt;
    const vivos = bonecos.filter((b) => !b.saindo && b.y > 0);
    if (proxAtaque <= 0 && vivos.length > 1) {
      proxAtaque = sortear(0.5, 1.1);
      const at = escolher(vivos);
      const alvos = vivos.filter((b) => b.time !== at.time);
      if (alvos.length) {
        const alvo = alvos.reduce((p, b) => (Math.abs(b.x - at.x) < Math.abs(p.x - at.x) ? b : p));
        at.vx = Math.sign(alvo.x - at.x) * sortear(420, 680);
        at.vy = -sortear(380, 560);
        at.atacando = 0.8;
      }
    }
    for (const b of bonecos) {
      b.a = b.saindo ? b.a - dt * 2 : Math.min(1, b.a + dt * 3);
      b.vy += 1400 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.atacando = Math.max(0, (b.atacando || 0) - dt);
      b.pisca = Math.max(0, b.pisca - dt);
      if (b.y + b.r > piso) { b.y = piso - b.r; b.vy *= -0.35; b.vx *= 0.86; if (Math.abs(b.vy) < 40) b.vy = 0; }
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.6; }
      if (b.x + b.r > w) { b.x = w - b.r; b.vx = -Math.abs(b.vx) * 0.6; }
    }
    for (let i = 0; i < bonecos.length; i++) {
      for (let j = i + 1; j < bonecos.length; j++) {
        const a = bonecos[i];
        const b = bonecos[j];
        if (a.saindo || b.saindo) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const sobra = (min - d) / 2;
        a.x -= nx * sobra; a.y -= ny * sobra;
        b.x += nx * sobra; b.y += ny * sobra;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const imp = -rv * 0.9;
          a.vx -= nx * imp; a.vy -= ny * imp;
          b.vx += nx * imp; b.vy += ny * imp;
          if (a.time !== b.time && -rv > 260) {
            const forte = (a.atacando || 0) > (b.atacando || 0) ? a : b;
            const fraco = forte === a ? b : a;
            placar[forte.time] += 1;
            fraco.pisca = 0.35;
            faiscar((a.x + b.x) / 2, (a.y + b.y) / 2, COR[forte.time]);
          }
        }
      }
    }
    for (let i = bonecos.length - 1; i >= 0; i--) if (bonecos[i].saindo && bonecos[i].a <= 0) bonecos.splice(i, 1);
    for (const f of faiscas) { f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vida -= dt; }
    for (let i = faiscas.length - 1; i >= 0; i--) if (faiscas[i].vida <= 0) faiscas.splice(i, 1);
    if (!desenhar) return;

    const pA = placar[0] / (placar[0] + placar[1]);
    barra.style.transform = `scaleX(${pA.toFixed(3)})`;
    pa.textContent = Math.round(pA * 100) + '%';
    pb.textContent = (100 - Math.round(pA * 100)) + '%';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // palco: piso com linha de luz e reflexo dos times
    const chao = ctx.createLinearGradient(0, piso, 0, h);
    chao.addColorStop(0, 'rgba(244, 114, 182, .16)');
    chao.addColorStop(1, 'rgba(244, 114, 182, 0)');
    ctx.fillStyle = chao;
    ctx.fillRect(0, piso, w, h - piso);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(0, piso, w, 1);
    // dois canhões de luz, um por time, balançando devagar
    for (const [x0, cor, fase] of [[w * 0.12, '244, 114, 182', 0], [w * 0.88, '56, 189, 248', 2]]) {
      const alvo = w * 0.5 + Math.sin(t * 0.5 + fase) * w * 0.22;
      const luz = ctx.createLinearGradient(x0, 0, alvo, piso);
      luz.addColorStop(0, `rgba(${cor}, .22)`);
      luz.addColorStop(1, `rgba(${cor}, 0)`);
      ctx.fillStyle = luz;
      ctx.beginPath();
      ctx.moveTo(x0 - w * 0.02, 0);
      ctx.lineTo(x0 + w * 0.02, 0);
      ctx.lineTo(alvo + w * 0.16, piso);
      ctx.lineTo(alvo - w * 0.16, piso);
      ctx.closePath();
      ctx.fill();
    }
    ctx.font = `600 ${Math.round(raioB * 0.78)}px Archivo, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const b of bonecos) {
      ctx.globalAlpha = limitar(b.a);
      const cor = COR[b.time];
      // sombra no chão
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.ellipse(b.x, piso + 3, b.r * 0.8 * limitar(1 - (piso - b.y - b.r) / 300, 0.3, 1), 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // corpo: avatar com aro do time
      ctx.fillStyle = b.pisca > 0 ? '#ffffff' : '#101a33';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = Math.max(2.5, b.r * 0.16);
      ctx.strokeStyle = cor;
      ctx.stroke();
      if (b.atacando > 0) {
        ctx.strokeStyle = cor + '55';
        ctx.lineWidth = b.r * 0.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 1.3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = b.pisca > 0 ? '#101a33' : '#e8ebf3';
      ctx.fillText(b.nome.slice(0, 2).toUpperCase(), b.x, b.y + 1);
    }
    ctx.globalAlpha = 1;
    for (const f of faiscas) {
      ctx.globalAlpha = limitar(f.vida * 2);
      ctx.fillStyle = f.cor;
      ctx.fillRect(f.x - 2, f.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  });

  (async () => {
    for (let i = 0; i < 6; i++) { entrar(); await rel.esperar(260); }
    while (rel.seguir()) {
      await rel.esperar(sortear(1300, 2300));
      if (!rel.vivo) return;
      entrar();
      if (placar[0] + placar[1] > 60) { placar[0] = 1 + Math.round(placar[0] / 8); placar[1] = 1 + Math.round(placar[1] / 8); }
    }
  })();
}

/* ================================================================== */
/* GiftCraft — o presente vira mob, chuva ou TNT num mundo em pixel    */
/* ================================================================== */
const SPRITES = {
  zumbi: {
    cores: { G: '#5aa04a', g: '#3d7a33', K: '#14210f', C: '#2f9e9e', B: '#3b45a8', D: '#262c6b' },
    corpo: [
      '.GGGGGG.',
      '.GGGGGG.',
      '.KKGGKK.',
      '.GGGGGG.',
      '.GgggGG.',
      '.GGGGGG.',
      'GCCCCCCG',
      'GCCCCCCG',
      'GCCCCCCG',
      'gCCCCCCg',
      '.CCCCCC.',
      '.BBBBBB.',
    ],
    pernas: [
      ['.BB..BB.', '.BB..BB.', '.DD..DD.'],
      ['.BB...BB', 'BB....BB', 'DD....DD'],
    ],
  },
  creeper: {
    cores: { L: '#6cc24a', M: '#4f9a35', N: '#2f6b22', K: '#0d140a' },
    corpo: [
      'LLMLLLML',
      'LMLLMLLL',
      'LKKLLKKL',
      'LKKLLKKL',
      'MLLKKLLM',
      'LLKKKKLL',
      'LLKLLKLL',
      '.LMLLML.',
      '.LLMLLL.',
      '.MLLLLM.',
      '.LLMLML.',
    ],
    pernas: [
      ['LL....LL', 'NN....NN'],
      ['.LL..LL.', '.NN..NN.'],
    ],
  },
  tnt: {
    cores: { R: '#d33a2c', r: '#a8281e', W: '#f2f2f2', K: '#2a2a2a' },
    corpo: ['RRRRRRRR', 'RrRRrRRr', 'WWWWWWWW', 'WKWKKWKW', 'WWWWWWWW', 'RRRRRRRR', 'RrRRrRRr', 'RRRRRRRR'],
  },
  diamante: {
    cores: { C: '#4fe0e0', c: '#e8ffff', D: '#1aa3a3' },
    corpo: ['..CC..', '.CcCC.', 'CcCCCC', 'CCCCCD', '.CCCD.', '..DD..'],
  },
};

function desenharSprite(ctx, sprite, linhas, x, y, P, virar = false) {
  const larg = linhas[0].length;
  for (let j = 0; j < linhas.length; j++) {
    const linha = linhas[j];
    for (let i = 0; i < larg; i++) {
      const c = linha[virar ? larg - 1 - i : i];
      if (c === '.') continue;
      ctx.fillStyle = sprite.cores[c];
      ctx.fillRect(Math.round(x + i * P), Math.round(y + j * P), Math.ceil(P), Math.ceil(P));
    }
  }
}

function giftcraft(raiz, rel) {
  raiz.innerHTML = `
    <div class="d-gc">
      <ul class="d-gc__feed"></ul>
      <p class="d-gc__selo"><i></i>servidor ao vivo</p>
    </div>`;
  const caixa = raiz.querySelector('.d-gc');
  const feed = raiz.querySelector('.d-gc__feed');
  const fundo = document.createElement('canvas');
  const mobs = [];
  const itens = [];
  const blocos = [];
  const particulas = [];
  let P = 6;
  let chaoY = 0;
  let tremor = 0;

  const m = criarTela(caixa, rel, ({ w, h, dpr }) => {
    P = Math.max(3, Math.round(h / 92));
    chaoY = Math.round((h * 0.76) / P) * P;
    // cenário pré-desenhado: céu da noite, lua, estrelas, árvore e chão em camadas
    fundo.width = Math.round(w * dpr);
    fundo.height = Math.round(h * dpr);
    const c = fundo.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ceu = c.createLinearGradient(0, 0, 0, chaoY);
    ceu.addColorStop(0, '#070b1f');
    ceu.addColorStop(1, '#1b2350');
    c.fillStyle = ceu;
    c.fillRect(0, 0, w, chaoY);
    let semente = 7;
    const aleat = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);
    c.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < 70; i++) c.fillRect(Math.floor((aleat() * w) / P) * P, Math.floor((aleat() * chaoY * 0.7) / P) * P, P * (aleat() < 0.15 ? 1 : 0.5), P * (aleat() < 0.15 ? 1 : 0.5));
    const lx = Math.round((w * 0.6) / P) * P;
    c.fillStyle = 'rgba(244, 241, 208, .08)';
    c.fillRect(lx - P * 3, P * 9, P * 12, P * 12);
    c.fillStyle = '#f4f1d0';
    c.fillRect(lx, P * 12, P * 6, P * 6);
    c.fillStyle = '#d9d4ad';
    c.fillRect(lx + P, P * 13, P * 2, P * 2);
    c.fillRect(lx + P * 4, P * 15, P, P);
    // árvore à esquerda
    const tx = Math.round((w * 0.1) / P) * P;
    c.fillStyle = '#6b4a2b';
    c.fillRect(tx + P * 2, chaoY - P * 9, P * 2, P * 9);
    for (let j = 0; j < 5; j++) {
      for (let i = -1; i < 7; i++) {
        if ((j === 0 || j === 4) && (i < 0 || i > 5)) continue;
        c.fillStyle = aleat() < 0.3 ? '#2f7a2a' : '#3a9433';
        c.fillRect(tx + i * P, chaoY - P * (14 - j), P, P);
      }
    }
    // chão: grama, terra e pedra, com ruído de textura
    for (let y = chaoY; y < h; y += P) {
      const camada = (y - chaoY) / P;
      for (let x = 0; x < w; x += P) {
        const r = aleat();
        if (camada < 1) c.fillStyle = r < 0.3 ? '#4ca82e' : '#5fbf3a';
        else if (camada < 2) c.fillStyle = r < 0.5 ? '#4ca82e' : '#7a5230';
        else if (camada < 7) c.fillStyle = r < 0.2 ? '#5e3f22' : r < 0.3 ? '#8a6038' : '#7a5230';
        else c.fillStyle = r < 0.25 ? '#55555e' : r < 0.35 ? '#7d7d88' : '#6a6a74';
        c.fillRect(x, y, P, P);
      }
    }
  });

  function aviso(quem, presente, acao) {
    const li = no('li');
    li.append(no('b', '', quem), document.createTextNode(` enviou ${presente} → `), no('em', '', acao));
    empurrar(feed, li, 4);
  }

  function poeira(x, y, cores, n = 16, forca = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = sortear(60, 260) * forca;
      particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140 * forca, vida: sortear(0.4, 0.9), cor: escolher(cores), t: sortear(0.6, 1.2) });
    }
  }

  function mob(tipo) {
    const sp = SPRITES[tipo];
    const larg = 8 * P;
    const x = sortear(m.w * 0.25, m.w * 0.85 - larg);
    const altura = (sp.corpo.length + sp.pernas[0].length) * P;
    mobs.push({ tipo, x, y: -altura - sortear(0, 60), vy: 0, dir: Math.random() < 0.5 ? -1 : 1, fase: 0, altura, a: 1, sumindo: false });
    poeira(x + larg / 2, P * 10, ['#b07cff', '#7c4dff', '#e0ccff'], 18, 0.8);
    const vivos = mobs.filter((q) => !q.sumindo);
    if (vivos.length > 5) sumir(vivos[0]);
  }

  function sumir(q) {
    q.sumindo = true;
    poeira(q.x + 4 * P, q.y + q.altura / 2, ['#cccccc', '#999999', '#ffffff'], 14, 0.7);
  }

  function chuva() {
    for (let i = 0; i < 9; i++) {
      itens.push({ x: sortear(m.w * 0.2, m.w * 0.9), y: -sortear(10, 220), vy: 0, vida: 3.2, quica: 0 });
    }
  }

  function tnt() {
    blocos.push({ x: Math.round(sortear(m.w * 0.35, m.w * 0.75) / P) * P, y: -8 * P, vy: 0, pavio: 1.8, pousou: false });
  }

  function explodir(b) {
    const cx = b.x + 4 * P;
    const cy = b.y + 4 * P;
    poeira(cx, cy, ['#ffb547', '#ff6a2b', '#ffe08a', '#777777', '#ffffff'], 46, 1.8);
    tremor = 0.45;
    for (const q of mobs) {
      if (!q.sumindo && Math.abs(q.x + 4 * P - cx) < 26 * P) sumir(q);
    }
  }

  rel.aCada((dt, t, desenhar) => {
    const { ctx, w, h, dpr } = m;
    for (const q of mobs) {
      if (q.sumindo) { q.a -= dt * 3; continue; }
      const base = chaoY - q.altura;
      if (q.y < base) { q.vy += 1300 * dt; q.y = Math.min(base, q.y + q.vy * dt); if (q.y === base) poeira(q.x + 4 * P, chaoY, ['#7a5230', '#5fbf3a'], 8, 0.4); continue; }
      q.fase += dt;
      q.x += q.dir * P * 3.2 * dt;
      if (q.x < w * 0.04) q.dir = 1;
      if (q.x > w * 0.96 - 8 * P) q.dir = -1;
    }
    for (let i = mobs.length - 1; i >= 0; i--) if (mobs[i].a <= 0) mobs.splice(i, 1);
    for (const it of itens) {
      it.vy += 1100 * dt;
      it.y += it.vy * dt;
      if (it.y + 6 * P > chaoY) { it.y = chaoY - 6 * P; it.vy *= -0.45; }
      it.vida -= dt;
    }
    for (let i = itens.length - 1; i >= 0; i--) if (itens[i].vida <= 0) { poeira(itens[i].x + 3 * P, itens[i].y + 3 * P, ['#4fe0e0', '#e8ffff'], 6, 0.4); itens.splice(i, 1); }
    for (const b of blocos) {
      if (!b.pousou) {
        b.vy += 1300 * dt;
        b.y += b.vy * dt;
        if (b.y + 8 * P >= chaoY) { b.y = chaoY - 8 * P; b.pousou = true; }
      } else {
        b.pavio -= dt;
      }
    }
    for (let i = blocos.length - 1; i >= 0; i--) if (blocos[i].pavio <= 0) { explodir(blocos[i]); blocos.splice(i, 1); }
    for (const p of particulas) { p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt; }
    for (let i = particulas.length - 1; i >= 0; i--) if (particulas[i].vida <= 0) particulas.splice(i, 1);
    tremor = Math.max(0, tremor - dt);
    if (!desenhar) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, m.tela.width, m.tela.height);
    const sx = tremor > 0 ? sortear(-1, 1) * tremor * 14 : 0;
    const sy = tremor > 0 ? sortear(-1, 1) * tremor * 10 : 0;
    ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
    ctx.drawImage(fundo, 0, 0, w, h);
    for (const b of blocos) {
      const branco = b.pousou && Math.floor(b.pavio * 6) % 2 === 0;
      desenharSprite(ctx, SPRITES.tnt, SPRITES.tnt.corpo, b.x, b.y, P);
      if (branco) { ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.fillRect(b.x, b.y, 8 * P, 8 * P); }
    }
    for (const q of mobs) {
      const sp = SPRITES[q.tipo];
      ctx.globalAlpha = limitar(q.a);
      const quadroPerna = q.y >= chaoY - q.altura - 0.5 ? Math.floor(q.fase * 4) % 2 : 0;
      desenharSprite(ctx, sp, sp.corpo, q.x, q.y, P, q.dir < 0);
      desenharSprite(ctx, sp, sp.pernas[quadroPerna], q.x, q.y + sp.corpo.length * P, P, q.dir < 0);
    }
    ctx.globalAlpha = 1;
    for (const it of itens) {
      ctx.globalAlpha = limitar(it.vida * 2);
      desenharSprite(ctx, SPRITES.diamante, SPRITES.diamante.corpo, it.x, it.y, P);
    }
    for (const p of particulas) {
      ctx.globalAlpha = limitar(p.vida * 2);
      ctx.fillStyle = p.cor;
      ctx.fillRect(p.x, p.y, P * p.t, P * p.t);
    }
    ctx.globalAlpha = 1;
  });

  const eventos = [
    ['@lucas', 'uma rosa', 'zumbi', () => mob('zumbi')],
    ['@bia', 'um coração', 'chuva de diamantes', chuva],
    ['@caio', 'um GG', 'creeper', () => mob('creeper')],
    ['@nina', 'um leão', 'TNT', tnt],
    ['@rafa', 'uma rosa', 'zumbi', () => mob('zumbi')],
  ];

  (async () => {
    mob('zumbi');
    mob('creeper');
    let i = 0;
    do {
      await rel.esperar(i === 0 ? 900 : sortear(2000, 2800));
      if (!rel.vivo) return;
      const [quem, presente, acao, fazer] = eventos[i % eventos.length];
      aviso(quem, presente, acao);
      fazer();
      i++;
    } while (rel.seguir() || i < 3);
  })();
}

/* ------------------------------------------------------------------ */
const DEMOS = { atendo, bodyflow, atlas, widgetok, palco, giftcraft };

/* Monta a demonstração dentro de `raiz` e devolve o controle
   { tocar, pausar, destruir }. Começa pausada. */
export function montarDemo(tipo, raiz, { reduzido = false } = {}) {
  const fazer = DEMOS[tipo];
  if (!fazer) return null;
  const rel = criarRelogio(reduzido);
  const caixa = no('div', 'demo');
  caixa.setAttribute('aria-hidden', 'true');
  raiz.append(caixa);
  fazer(caixa, rel);
  rel.aoDestruir(() => caixa.remove());
  return rel;
}
