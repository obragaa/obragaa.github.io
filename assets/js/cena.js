/* ==========================================================================
   cena.js — o fundo que dá a sensação de atravessar o sistema por dentro.
   Canvas 2D com projeção de perspectiva feita à mão: nenhuma biblioteca.
   A rolagem move a câmera no eixo Z; rolar rápido estica os pontos em rastro.
   ========================================================================== */

export function criarCena(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });

  // --- constantes da "ótica" ---
  const FOCO = 560;         // distância focal: quanto maior, menos distorção
  const PROFUNDIDADE = 1500; // até onde o mundo existe à frente da câmera
  const ESPACO_ANEL = 190;   // distância entre os anéis do corredor
  const RAIO_ANEL = 980;     // meia-largura do corredor

  let L = 0, A = 0, cx = 0, cy = 0, dpr = 1;
  let pontos = [];
  let camZ = 0, camZAlvo = 0, velocidade = 0;
  let tempo = 0, rodando = false, ultimo = 0;

  // ponteiro: desloca o ponto de fuga de leve (parallax)
  let apX = 0, apY = 0, pX = 0, pY = 0;

  // cor de acento, interpolada suavemente entre as seções
  const cor = { r: 56, g: 189, b: 248 };
  const corAlvo = { r: 56, g: 189, b: 248 };

  function semear() {
    // densidade proporcional à área, com teto para telas grandes e celular
    const alvo = Math.round(Math.min(760, Math.max(190, (L * A) / 2150)));
    pontos = new Array(alvo).fill(0).map(() => novoPonto(Math.random() * PROFUNDIDADE));
  }

  function novoPonto(z) {
    const ang = Math.random() * Math.PI * 2;
    // distribuição em anel: mais pontos nas bordas do corredor que no centro
    const raio = RAIO_ANEL * (0.26 + Math.pow(Math.random(), 0.55) * 0.9);
    return {
      x: Math.cos(ang) * raio,
      y: Math.sin(ang) * raio * 0.72,
      z,
      t: Math.random(),          // brilho/tamanho próprio
      f: 0.45 + Math.random()    // fator de cintilação
    };
  }

  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    L = canvas.clientWidth;
    A = canvas.clientHeight;
    canvas.width = Math.round(L * dpr);
    canvas.height = Math.round(A * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    semear();
  }

  function corridor(z, alpha) {
    // um anel do corredor, em perspectiva
    const zz = z - (camZ % ESPACO_ANEL);
    if (zz <= 6) return;
    const k = FOCO / zz;
    const w = RAIO_ANEL * k;
    const h = RAIO_ANEL * 0.72 * k;
    const a = alpha * Math.max(0, 1 - zz / PROFUNDIDADE);
    if (a <= 0.004) return;
    ctx.strokeStyle = `rgba(${cor.r},${cor.g},${cor.b},${a})`;
    ctx.lineWidth = Math.max(0.5, k * 1.1);
    ctx.beginPath();
    ctx.rect(cx - w, cy - h, w * 2, h * 2);
    ctx.stroke();
  }

  function quadro(agora) {
    if (!rodando) return;
    const dt = Math.min(64, agora - (ultimo || agora));
    ultimo = agora;
    tempo += dt;

    // a câmera persegue o alvo definido pela rolagem; a diferença vira "rastro"
    const antes = camZ;
    camZ += (camZAlvo - camZ) * 0.085 + dt * 0.012; // deriva lenta mesmo parado
    velocidade = camZ - antes;

    pX += (apX - pX) * 0.06;
    pY += (apY - pY) * 0.06;
    cx = L / 2 + pX * 46;
    cy = A / 2 + pY * 34;

    cor.r += (corAlvo.r - cor.r) * 0.045;
    cor.g += (corAlvo.g - cor.g) * 0.045;
    cor.b += (corAlvo.b - cor.b) * 0.045;

    ctx.clearRect(0, 0, L, A);

    // 1) corredor
    for (let i = 0; i < 10; i++) corridor(i * ESPACO_ANEL + 40, 0.22);

    // 2) pontos (com rastro quando a rolagem é rápida)
    const rastro = Math.min(26, Math.abs(velocidade) * 0.9);
    for (let i = 0; i < pontos.length; i++) {
      const p = pontos[i];
      let zz = p.z - camZ;

      // reciclagem: o que passou pela câmera volta para o fundo, e vice-versa
      if (zz <= 8) { p.z += PROFUNDIDADE; zz = p.z - camZ; }
      else if (zz > PROFUNDIDADE) { p.z -= PROFUNDIDADE; zz = p.z - camZ; }

      const k = FOCO / zz;
      const sx = cx + p.x * k;
      const sy = cy + p.y * k;
      if (sx < -80 || sx > L + 80 || sy < -80 || sy > A + 80) continue;

      // some ao longe e ao chegar perto demais (evita bolhas enormes)
      const longe = 1 - zz / PROFUNDIDADE;
      const perto = Math.min(1, (zz - 8) / 150);
      const cintila = 0.72 + 0.28 * Math.sin(tempo * 0.0013 * p.f + i);
      const a = Math.max(0, longe * perto * cintila) * (0.45 + p.t * 0.85);
      if (a <= 0.01) continue;

      const r = Math.min(4.2, Math.max(0.45, (0.6 + p.t * 1.9) * k * 1.7));

      if (rastro > 1.2) {
        const k2 = FOCO / (zz + rastro);
        ctx.strokeStyle = `rgba(${cor.r},${cor.g},${cor.b},${a * 0.6})`;
        ctx.lineWidth = r * 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(cx + p.x * k2, cy + p.y * k2);
        ctx.stroke();
      } else {
        // os pontos mais próximos puxam para o branco; os distantes, para o acento
        const b = Math.min(1, perto * 0.55 + p.t * 0.4);
        const R = Math.round(cor.r + (232 - cor.r) * b);
        const G = Math.round(cor.g + (238 - cor.g) * b);
        const B = Math.round(cor.b + (252 - cor.b) * b);
        ctx.fillStyle = `rgba(${R},${G},${B},${a})`;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3) brilho no ponto de fuga
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(L, A) * 0.42);
    halo.addColorStop(0, `rgba(${cor.r},${cor.g},${cor.b},0.20)`);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, L, A);

    requestAnimationFrame(quadro);
  }

  function ligar() {
    if (rodando) return;
    rodando = true;
    ultimo = 0;
    requestAnimationFrame(quadro);
  }

  function desligar() {
    rodando = false;
  }

  // --- eventos ---
  let redimensionando;
  window.addEventListener('resize', () => {
    clearTimeout(redimensionando);
    redimensionando = setTimeout(medir, 160);
  }, { passive: true });

  window.addEventListener('pointermove', (e) => {
    apX = (e.clientX / window.innerWidth) * 2 - 1;
    apY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    document.hidden ? desligar() : ligar();
  });

  medir();
  ligar();

  return {
    /** progresso 0→1 do documento inteiro */
    definirProgresso(p) {
      camZAlvo = p * PROFUNDIDADE * 5.2;
    },
    /** cor de acento da seção atual, em hexadecimal */
    definirAcento(hex) {
      const n = parseInt(hex.replace('#', ''), 16);
      corAlvo.r = (n >> 16) & 255;
      corAlvo.g = (n >> 8) & 255;
      corAlvo.b = n & 255;
    },
    ligar,
    desligar
  };
}
