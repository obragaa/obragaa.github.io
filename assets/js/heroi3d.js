/* Cena do topo: o que eu entrego (janelas de sistema, balões de chat,
   engrenagens de automação, teclas) e de onde eu vim (LEDs, um chip e o
   sensor ultrassônico HC-SR04) flutuando no escuro.

   O cursor funciona como um sensor de proximidade: telas acordam, LEDs
   acendem, engrenagens giram e as peças se afastam. O HC-SR04 mostra a
   distância até o cursor, como no teste de 2021 com Arduino.

   Física própria, em passo fixo: cada peça é um corpo rígido feito de uma ou
   duas esferas, preso por uma mola à sua "casa" na composição. Sem
   interação, a cena assenta e para de desenhar. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, Fog, PMREMGenerator, Group, Mesh, Sprite,
  DirectionalLight, PointLight, MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial, SpriteMaterial,
  BoxGeometry, CylinderGeometry, SphereGeometry, PlaneGeometry, ConeGeometry, ExtrudeGeometry, Shape, Path,
  BufferGeometry, BufferAttribute, CanvasTexture, SRGBColorSpace, NeutralToneMapping, AdditiveBlending,
  Matrix4, Euler, Vector2, Vector3, Quaternion, Raycaster, MathUtils,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const COR = {
  noite: '#050a16',
  azul: '#2f6bff',
  ciano: '#38bdf8',
  ambar: '#ffb547',
  porcelana: '#e6e9f2',
  grafite: '#1c2236',
  grafiteClaro: '#2b3350',
  metal: '#c9ced8',
  placa: '#1f4be0',
};

const PASSO = 1 / 60;
const AMORTECIMENTO = 1.6;
const RESTITUICAO = 0.3;
const MOLA_CASA = 1.15;
const OCIOSO_ATE_PARAR = 6;

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */
function semente(s) {
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// junta geometrias (posição, normal e uv) numa só, para desenhar numa chamada
function juntar(lista) {
  const prontas = lista;
  let nv = 0;
  let ni = 0;
  for (const g of prontas) {
    nv += g.attributes.position.count;
    ni += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const uv = new Float32Array(nv * 2);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let ov = 0;
  let oi = 0;
  for (const g of prontas) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, ov * 3);
    nor.set(g.attributes.normal.array, ov * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, ov * 2);
    if (g.index) for (const k of g.index.array) idx[oi++] = k + ov;
    else for (let k = 0; k < n; k++) idx[oi++] = k + ov;
    ov += n;
    g.dispose();
  }
  const r = new BufferGeometry();
  r.setAttribute('position', new BufferAttribute(pos, 3));
  r.setAttribute('normal', new BufferAttribute(nor, 3));
  r.setAttribute('uv', new BufferAttribute(uv, 2));
  r.setIndex(new BufferAttribute(idx, 1));
  r.computeBoundingSphere();
  return r;
}

const euler = new Euler();
function posto(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new Matrix4().makeRotationFromEuler(euler.set(rx, ry, rz));
  m.setPosition(x, y, z);
  return g.applyMatrix4(m);
}

function novaTela(largura, altura) {
  const c = document.createElement('canvas');
  c.width = largura;
  c.height = altura;
  return [c, c.getContext('2d')];
}

function texturaDe(c) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function retangulo(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function texturaDeTexto(texto, { largura = 256, altura = 256, tamanho = 120, cor = '#ffffff', peso = 600, larga = false } = {}) {
  const [c, ctx] = novaTela(largura, altura);
  ctx.fillStyle = cor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${peso} ${tamanho}px Archivo, system-ui, sans-serif`;
  if (larga && 'fontStretch' in ctx) ctx.fontStretch = 'expanded';
  ctx.fillText(texto, largura / 2, altura / 2 + tamanho * 0.04);
  return texturaDe(c);
}

function texturaDeBrilho() {
  const [c, ctx] = novaTela(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,.55)');
  g.addColorStop(0.45, 'rgba(255,255,255,.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  // um pouco de ruído quebra as faixas do degradê em telas de 8 bits
  const img = ctx.getImageData(0, 0, 128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const r = (Math.random() - 0.5) * 6;
    img.data[i] += r;
    img.data[i + 1] += r;
    img.data[i + 2] += r;
  }
  ctx.putImageData(img, 0, 0);
  return texturaDe(c);
}

/* telas das janelas: ilustrações de interface, sem dado real */
function moldura(ctx, w, h) {
  ctx.fillStyle = '#0b1226';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#121b36';
  ctx.fillRect(0, 0, w, 34);
  ['#3a4466', '#3a4466', '#3a4466'].forEach((cor, i) => {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(20 + i * 18, 17, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function telaPainel() {
  const [c, ctx] = novaTela(512, 320);
  moldura(ctx, 512, 320);
  ctx.fillStyle = '#16213f';
  retangulo(ctx, 16, 50, 110, 254, 10);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i === 1 ? '#2f6bff' : '#2a3557';
    retangulo(ctx, 28, 66 + i * 34, i === 1 ? 86 : 70, 12, 6);
  }
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#16213f';
    retangulo(ctx, 140 + i * 122, 50, 110, 64, 10);
    ctx.fillStyle = ['#38bdf8', '#e6e9f2', '#2f6bff'][i];
    retangulo(ctx, 154 + i * 122, 66, 46, 14, 7);
    ctx.fillStyle = '#2a3557';
    retangulo(ctx, 154 + i * 122, 90, 70, 9, 4);
  }
  ctx.fillStyle = '#16213f';
  retangulo(ctx, 140, 126, 354, 178, 10);
  const barras = [0.35, 0.55, 0.42, 0.7, 0.62, 0.85, 0.74, 0.92];
  barras.forEach((b, i) => {
    ctx.fillStyle = i === barras.length - 1 ? '#38bdf8' : '#2f6bff';
    const alt = b * 140;
    retangulo(ctx, 160 + i * 41, 290 - alt, 24, alt, 5);
  });
  return texturaDe(c);
}

function telaConversa() {
  const [c, ctx] = novaTela(512, 320);
  moldura(ctx, 512, 320);
  const baloes = [
    [false, 40, 180, 'cliente'], [true, 92, 220], [false, 150, 150], [true, 202, 250], [false, 258, 120],
  ];
  for (const [meu, y, largura] of baloes) {
    ctx.fillStyle = meu ? '#2f6bff' : '#1c2849';
    const x = meu ? 512 - 24 - largura : 24;
    retangulo(ctx, x, y + 8, largura, 40, 16);
    ctx.fillStyle = meu ? 'rgba(255,255,255,.75)' : '#3a4870';
    retangulo(ctx, x + 16, y + 22, largura - 60, 10, 5);
  }
  return texturaDe(c);
}

function telaCodigo() {
  const [c, ctx] = novaTela(512, 320);
  moldura(ctx, 512, 320);
  const cores = ['#38bdf8', '#e6e9f2', '#7c93ff', '#ffb547', '#8a94b3'];
  const sorteio = semente(9);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = '#26314f';
    retangulo(ctx, 18, 52 + i * 26, 18, 9, 4);
    let x = 50 + (i % 4 === 0 ? 0 : (i % 3) * 22);
    const pedacos = 1 + Math.floor(sorteio() * 3);
    for (let k = 0; k < pedacos; k++) {
      const w = 30 + sorteio() * 110;
      ctx.fillStyle = cores[Math.floor(sorteio() * cores.length)];
      retangulo(ctx, x, 52 + i * 26, w, 10, 5);
      x += w + 10;
      if (x > 470) break;
    }
  }
  return texturaDe(c);
}

function telaFluxo() {
  const [c, ctx] = novaTela(512, 320);
  moldura(ctx, 512, 320);
  const nos = [[60, 120], [200, 80], [200, 220], [350, 150], [470, 150]];
  ctx.strokeStyle = '#3a4a80';
  ctx.lineWidth = 4;
  const ligar = (a, b) => {
    ctx.beginPath();
    ctx.moveTo(nos[a][0] + 34, nos[a][1]);
    ctx.bezierCurveTo(nos[a][0] + 90, nos[a][1], nos[b][0] - 90, nos[b][1], nos[b][0] - 34, nos[b][1]);
    ctx.stroke();
  };
  ligar(0, 1); ligar(0, 2); ligar(1, 3); ligar(2, 3); ligar(3, 4);
  nos.forEach(([x, y], i) => {
    ctx.fillStyle = i === 3 ? '#2f6bff' : '#1c2849';
    retangulo(ctx, x - 34, y - 22, 68, 44, 12);
    ctx.fillStyle = i === 3 ? '#e6e9f2' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(x - 14, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a4870';
    retangulo(ctx, x - 2, y - 4, 22, 8, 4);
  });
  return texturaDe(c);
}

/* ------------------------------------------------------------------ */
/* as peças                                                            */
/* ------------------------------------------------------------------ */
function criarFabrica() {
  const mat = {
    grafite: new MeshPhysicalMaterial({ color: COR.grafite, roughness: 0.34, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.22 }),
    grafiteClaro: new MeshPhysicalMaterial({ color: COR.grafiteClaro, roughness: 0.4, metalness: 0, clearcoat: 0.3 }),
    metal: new MeshStandardMaterial({ color: COR.metal, roughness: 0.26, metalness: 1 }),
    placa: new MeshStandardMaterial({ color: COR.placa, roughness: 0.5, metalness: 0.05 }),
    porcelana: new MeshStandardMaterial({ color: COR.porcelana, roughness: 0.42, metalness: 0 }),
    azul: new MeshPhysicalMaterial({ color: COR.azul, roughness: 0.3, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    tela: new MeshStandardMaterial({ color: '#14161c', roughness: 0.8, metalness: 0.1 }),
    ouro: new MeshStandardMaterial({ color: '#d9b45a', roughness: 0.35, metalness: 1 }),
  };
  const brilho = texturaDeBrilho();
  const telas = [telaPainel(), telaConversa(), telaCodigo(), telaFluxo()];

  const geo = {};
  // janela de sistema
  geo.janelaCorpo = new RoundedBoxGeometry(2.05, 1.32, 0.12, 3, 0.07);
  geo.janelaTela = posto(new PlaneGeometry(1.93, 1.2), 0, 0, 0.062);

  // balão de chat com rabinho e três pontos de "digitando"
  geo.balao = juntar([
    new RoundedBoxGeometry(1.2, 0.74, 0.34, 4, 0.17),
    posto(new ConeGeometry(0.15, 0.34, 14), -0.36, -0.42, 0, 0, 0, Math.PI * 0.82),
  ]);
  geo.balaoPontos = juntar([-0.24, 0, 0.24].map((x) => posto(new SphereGeometry(0.075, 16, 12), x, 0, 0.17)));

  // engrenagem de automação
  {
    const forma = new Shape();
    const dentes = 10;
    const rExt = 0.6;
    const rInt = 0.47;
    for (let i = 0; i < dentes; i++) {
      const a = (i / dentes) * Math.PI * 2;
      const p = (Math.PI * 2) / dentes;
      const ponto = (r, ang) => [Math.cos(ang) * r, Math.sin(ang) * r];
      const pts = [ponto(rInt, a), ponto(rExt, a + p * 0.12), ponto(rExt, a + p * 0.4), ponto(rInt, a + p * 0.52)];
      pts.forEach(([x, y], k) => (i === 0 && k === 0 ? forma.moveTo(x, y) : forma.lineTo(x, y)));
      forma.absarc(0, 0, rInt, a + p * 0.52, a + p, false);
    }
    const furo = new Path();
    furo.absarc(0, 0, 0.17, 0, Math.PI * 2, true);
    forma.holes.push(furo);
    geo.engrenagem = new ExtrudeGeometry(forma, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6 });
    geo.engrenagem.center();
  }

  // tecla que afina no topo, com legenda iluminável
  geo.tecla = new RoundedBoxGeometry(1, 0.52, 1, 4, 0.12);
  {
    const p = geo.tecla.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const f = 1 - (Math.max(0, p.getY(i) + 0.26) / 0.52) * 0.16;
      p.setX(i, p.getX(i) * f);
      p.setZ(i, p.getZ(i) * f);
    }
    geo.tecla.computeVertexNormals();
  }
  geo.teclaLegenda = posto(new PlaneGeometry(0.66, 0.66), 0, 0.265, 0, -Math.PI / 2);

  // LED de 5 mm
  geo.ledCupula = juntar([
    posto(new CylinderGeometry(0.26, 0.26, 0.42, 28, 1, true), 0, 0.21, 0),
    posto(new SphereGeometry(0.26, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.42, 0),
  ]);
  geo.ledAba = new CylinderGeometry(0.3, 0.3, 0.06, 28);
  geo.ledPernas = juntar([
    posto(new CylinderGeometry(0.022, 0.022, 1.05, 8), -0.1, -0.53, 0),
    posto(new CylinderGeometry(0.022, 0.022, 0.85, 8), 0.1, -0.43, 0),
  ]);

  // chip DIP
  geo.chipCorpo = new RoundedBoxGeometry(1.7, 0.34, 0.8, 3, 0.05);
  {
    const pernas = [];
    for (let lado = -1; lado <= 1; lado += 2) {
      for (let k = 0; k < 4; k++) {
        const x = -0.6 + k * 0.4;
        pernas.push(posto(new BoxGeometry(0.11, 0.05, 0.16), x, -0.04, lado * 0.47));
        pernas.push(posto(new BoxGeometry(0.07, 0.36, 0.05), x, -0.25, lado * 0.55));
      }
    }
    geo.chipPernas = juntar(pernas);
  }
  geo.chipRotulo = posto(new PlaneGeometry(1.2, 0.45), 0, 0.176, 0, -Math.PI / 2);

  // sensor ultrassônico HC-SR04
  geo.sensorPlaca = new RoundedBoxGeometry(2.3, 0.07, 1.05, 2, 0.025);
  geo.sensorLatas = juntar([
    posto(new CylinderGeometry(0.4, 0.4, 0.5, 36), -0.62, 0.285, 0.02),
    posto(new CylinderGeometry(0.4, 0.4, 0.5, 36), 0.62, 0.285, 0.02),
  ]);
  geo.sensorTelas = juntar([
    posto(new CylinderGeometry(0.34, 0.34, 0.02, 36), -0.62, 0.545, 0.02),
    posto(new CylinderGeometry(0.34, 0.34, 0.02, 36), 0.62, 0.545, 0.02),
  ]);
  geo.sensorCristal = posto(new RoundedBoxGeometry(0.42, 0.14, 0.16, 2, 0.05), 0, 0.1, -0.33);
  {
    const pinos = [];
    for (let k = 0; k < 4; k++) pinos.push(posto(new BoxGeometry(0.06, 0.06, 0.42), -0.3 + k * 0.2, -0.02, 0.68));
    geo.sensorPinos = juntar(pinos);
  }

  const rotuloChip = texturaDeTexto('FB 2019', { largura: 512, altura: 192, tamanho: 96, cor: '#8f97ab', peso: 500 });

  const fabricar = {
    janela(qual) {
      const g = new Group();
      const tela = new MeshStandardMaterial({
        map: telas[qual], emissive: new Color('#ffffff'), emissiveMap: telas[qual], emissiveIntensity: 0.3, roughness: 0.45,
      });
      g.add(new Mesh(geo.janelaCorpo, mat.grafiteClaro), new Mesh(geo.janelaTela, tela));
      return { grupo: g, esferas: [[-0.5, 0, 0, 0.64], [0.5, 0, 0, 0.64]], acende: { tipo: 'tela', material: tela, nivel: 0, ponto: new Vector3(0, 0, 0.1) } };
    },
    balao(claro) {
      const g = new Group();
      const pontos = new MeshStandardMaterial({ color: claro ? '#1c2236' : '#e6e9f2', emissive: new Color(COR.ciano), emissiveIntensity: 0, roughness: 0.4 });
      g.add(new Mesh(geo.balao, claro ? mat.porcelana : mat.azul), new Mesh(geo.balaoPontos, pontos));
      return { grupo: g, esferas: [[0, 0, 0, 0.62]], acende: { tipo: 'pontos', material: pontos, nivel: 0, ponto: new Vector3(0, 0, 0.2) } };
    },
    engrenagem() {
      const g = new Group();
      g.add(new Mesh(geo.engrenagem, mat.metal));
      return { grupo: g, esferas: [[0, 0, 0, 0.66]], acende: { tipo: 'giro', nivel: 0, ponto: new Vector3() } };
    },
    tecla(texto, clara) {
      const g = new Group();
      g.add(new Mesh(geo.tecla, clara ? mat.porcelana : mat.grafite));
      const tex = texturaDeTexto(texto, { tamanho: texto.length > 2 ? 92 : 118, cor: clara ? '#1c2236' : '#e6e9f2', peso: 600, larga: true });
      const legenda = new MeshStandardMaterial({
        map: tex, transparent: true, depthWrite: false,
        emissive: new Color(COR.ciano), emissiveMap: tex, emissiveIntensity: 0, roughness: 0.6,
      });
      g.add(new Mesh(geo.teclaLegenda, legenda));
      return { grupo: g, esferas: [[0, 0, 0, 0.62]], acende: { tipo: 'legenda', material: legenda, nivel: 0, ponto: new Vector3(0, 0.26, 0) } };
    },
    led(cor) {
      const g = new Group();
      const c = new Color(cor);
      const cupula = new MeshPhysicalMaterial({
        color: c, emissive: c, emissiveIntensity: 0.25,
        roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05,
        transparent: true, opacity: 0.92,
      });
      g.add(new Mesh(geo.ledCupula, cupula), new Mesh(geo.ledAba, cupula), new Mesh(geo.ledPernas, mat.metal));
      const halo = new Sprite(new SpriteMaterial({ map: brilho, color: c, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
      halo.position.set(0, 0.3, 0);
      g.add(halo);
      return { grupo: g, esferas: [[0, 0.3, 0, 0.34], [0, -0.42, 0, 0.2]], acende: { tipo: 'led', material: cupula, halo, nivel: 0, ponto: new Vector3(0, 0.3, 0) } };
    },
    chip() {
      const g = new Group();
      g.add(new Mesh(geo.chipCorpo, mat.grafite), new Mesh(geo.chipPernas, mat.metal));
      g.add(new Mesh(geo.chipRotulo, new MeshBasicMaterial({ map: rotuloChip, transparent: true, depthWrite: false })));
      return { grupo: g, esferas: [[-0.48, 0, 0, 0.44], [0.48, 0, 0, 0.44]] };
    },
    sensor() {
      const g = new Group();
      g.add(
        new Mesh(geo.sensorPlaca, mat.placa),
        new Mesh(geo.sensorLatas, mat.metal),
        new Mesh(geo.sensorTelas, mat.tela),
        new Mesh(geo.sensorCristal, mat.metal),
        new Mesh(geo.sensorPinos, mat.ouro),
      );
      return { grupo: g, esferas: [[-0.62, 0.15, 0, 0.6], [0.62, 0.15, 0, 0.6]], sensor: true };
    },
  };

  return fabricar;
}

/* ------------------------------------------------------------------ */
/* a cena                                                              */
/* ------------------------------------------------------------------ */
export function criarHeroi(caixa, { reduzido = false, toque = false } = {}) {
  const secao = caixa.closest('section') || caixa.parentElement;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, stencil: false, powerPreference: 'high-performance' });
  renderer.debug.checkShaderErrors = false;
  caixa.append(canvas);

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;

  const cena = new Scene();
  cena.fog = new Fog(new Color(COR.noite), 13, 26);
  const pmrem = new PMREMGenerator(renderer);
  const sala = new RoomEnvironment();
  cena.environment = pmrem.fromScene(sala, 0.04).texture;
  cena.environmentIntensity = 0.55;
  sala.dispose?.();
  pmrem.dispose();

  const camera = new PerspectiveCamera(32, 1, 0.1, 80);
  camera.position.set(0, 0, 14);

  const chave = new DirectionalLight(0xffffff, 1.5);
  chave.position.set(5, 8, 9);
  const recorte = new DirectionalLight(new Color(COR.ciano), 1.4);
  recorte.position.set(-9, -3, -4);
  const sonda = new PointLight(new Color(COR.azul), 0, 8, 1.4);
  cena.add(chave, recorte, sonda);

  const fabricar = criarFabrica();

  /* ---------- elenco: a maioria é o que eu entrego; o hardware é a origem ---------- */
  const pouco = toque || innerWidth < 760;
  // onda 0 = o protagonista; onda 1 = janelas e balões; onda 2 = o resto
  const elenco = pouco
    ? ['sensor@0', 'janela:1@1', 'balao:c@1', 'engrenagem@2', 'led:ciano@2', 'led:ambar@2', 'chip@2']
    : ['sensor@0', 'janela:0@1', 'janela:3@1', 'balao:c@1', 'balao:e@1',
      'engrenagem@2', 'tecla:IA:e@2', 'led:ciano@2', 'led:azul@2', 'led:ambar@2', 'chip@2'];

  const aleatorio = semente(2021);
  const corpos = elenco.map((item) => {
    const [pecaTexto, ondaTexto] = item.split('@');
    const onda = +ondaTexto || 0;
    const [tipo, a, b] = pecaTexto.split(':');
    let peca;
    if (tipo === 'janela') peca = fabricar.janela(+a);
    else if (tipo === 'balao') peca = fabricar.balao(a === 'c');
    else if (tipo === 'tecla') peca = fabricar.tecla(a, b === 'c');
    else if (tipo === 'led') peca = fabricar.led(COR[a]);
    else peca = fabricar[tipo]();
    cena.add(peca.grupo);
    const esferas = peca.esferas.map(([x, y, z, r]) => ({ o: new Vector3(x, y, z), r, mundo: new Vector3() }));
    let massa = 0;
    let alcance = 0;
    for (const e of esferas) {
      massa += e.r ** 3;
      alcance = Math.max(alcance, e.o.length() + e.r);
    }
    const giroBase = new Vector3(aleatorio() - 0.5, aleatorio() - 0.5, aleatorio() - 0.5).normalize().multiplyScalar(0.06 + aleatorio() * 0.1);
    // janelas e balões começam virados para a câmera; o resto, em qualquer ângulo
    if (tipo === 'janela' || tipo === 'balao') peca.grupo.rotation.set((aleatorio() - 0.5) * 0.5, (aleatorio() - 0.5) * 0.7, (aleatorio() - 0.5) * 0.3);
    else peca.grupo.quaternion.setFromAxisAngle(new Vector3(aleatorio() - 0.5, aleatorio() - 0.5, aleatorio() - 0.5).normalize(), aleatorio() * Math.PI * 2);
    return {
      tipo, onda, grupo: peca.grupo, esferas, acende: peca.acende, sensor: peca.sensor,
      massa, alcance, inercia: 0.4 * massa * alcance * alcance,
      escala: 1,
      p: new Vector3(), v: new Vector3(), w: giroBase.clone(), giroBase,
      casa: new Vector3(),
      fase: [aleatorio() * 6.28, aleatorio() * 6.28, aleatorio() * 6.28],
    };
  });
  const sensor = corpos.find((c) => c.sensor);

  /* ---------- composição: casas longe do texto ---------- */
  let meiaAlt = 1;
  let meiaLarg = 1;
  let escalaPecas = 1;
  const projetado = new Vector3();

  function zonas(seletor) {
    const base = caixa.getBoundingClientRect();
    return [...secao.querySelectorAll(seletor)].map((el) => {
      const r = el.getBoundingClientRect();
      return { x0: r.left - base.left, x1: r.right - base.left, y0: r.top - base.top, y1: r.bottom - base.top };
    });
  }

  function distribuirCasas() {
    const sorteio = semente(77);
    const base = caixa.getBoundingClientRect();
    const livres = zonas('[data-zona-livre]');
    const nomes = zonas('[data-zona-nome]');
    // a folga cresce com a tela: peça grande (janela, painel) não pode encostar no texto
    const folga = Math.max(46 * escalaPecas, Math.min(base.width, base.height) * 0.14);
    const casas = [];
    const minimo = 1.7 * escalaPecas;
    const dentro = (z, x, y) => x > z.x0 - folga && x < z.x1 + folga && y > z.y0 - folga && y < z.y1 + folga;
    // o protagonista tem posto fixo: centro-direita, abaixo da linha do nome
    const ordem = [...corpos].sort((a, b) => Number(Boolean(b.sensor)) - Number(Boolean(a.sensor)));
    for (const c of ordem) {
      if (c.sensor) {
        const casaSensor = new Vector3(pouco ? 0 : meiaLarg * 0.46, pouco ? -meiaAlt * 0.06 : -meiaAlt * 0.16, 0.7);
        casas.push(casaSensor);
        c.casa.copy(casaSensor);
        continue;
      }
      let melhor = null;
      for (let tentativa = 0; tentativa < 90; tentativa++) {
        const x = (sorteio() * 2 - 1) * meiaLarg * 0.94;
        const y = (sorteio() * 2 - 1) * meiaAlt * 0.86;
        const z = (sorteio() * 2 - 1) * 1.4;
        projetado.set(x, y, z).project(camera);
        const px = (projetado.x * 0.5 + 0.5) * base.width;
        const py = (-projetado.y * 0.5 + 0.5) * base.height;
        if (livres.some((zona) => dentro(zona, px, py))) continue;
        // o sensor (com a etiqueta de distância) nunca cobre o nome; em tela estreita, quase nada cobre
        const evitarNome = c.sensor ? 1 : pouco ? 0.9 : 0.6;
        if (nomes.some((zona) => dentro(zona, px, py)) && sorteio() < evitarNome) continue;
        const ok = casas.every((o, oi) => Math.hypot(o.x - x, o.y - y, (o.z - z) * 0.6) > (oi === 0 ? minimo * 2.1 : minimo));
        melhor = new Vector3(x, y, z);
        if (ok) break;
      }
      if (!melhor) melhor = new Vector3((sorteio() * 2 - 1) * meiaLarg * 0.8, meiaAlt * 0.7, -1.2);
      casas.push(melhor);
      c.casa.copy(melhor);
    }
  }

  function ajustar(largura, altura) {
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
    meiaAlt = camera.position.z * Math.tan(MathUtils.degToRad(camera.fov / 2));
    meiaLarg = meiaAlt * camera.aspect;
    escalaPecas = MathUtils.clamp(Math.min(meiaLarg / 6.6, meiaAlt / 3.7), 0.56, 0.96);
    for (const c of corpos) {
      c.escala = escalaPecas * (c.sensor ? (pouco ? 1.55 : 1.78) : 0.94);
      c.grupo.scale.setScalar(c.escala);
    }
    distribuirCasas();
  }

  /* ---------- tamanho e qualidade ---------- */
  let pixelRatio = Math.min(window.devicePixelRatio || 1, toque ? 1.5 : 1.6);
  let precisaDesenhar = true;
  function redimensionar() {
    const largura = Math.max(1, caixa.clientWidth);
    const altura = Math.max(1, caixa.clientHeight);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(largura, altura, false);
    ajustar(largura, altura);
    precisaDesenhar = true;
    acordar();
  }

  /* ---------- ponteiro (escutado na janela: o canvas não bloqueia nada) ---------- */
  const ponteiro = { ndc: new Vector2(), ativoAte: -1, forca: 0, pulso: 0, novo: true, mundo: new Vector3(), anterior: new Vector3(), vel: new Vector3() };
  const raycaster = new Raycaster();
  const raio = { origem: new Vector3(), direcao: new Vector3() };
  const posSonda = new Vector3();
  let relogio = 0;
  let ultimaInteracao = 0;
  let dormindo = false;

  function acordar() {
    ultimaInteracao = relogio;
    dormindo = false;
  }
  function dentroDoTopo(x, y) {
    const r = caixa.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  function mover(x, y) {
    const r = caixa.getBoundingClientRect();
    ponteiro.ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    if (relogio > ponteiro.ativoAte) ponteiro.novo = true;
    ponteiro.ativoAte = relogio + 2.5;
    acordar();
  }
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    if (dentroDoTopo(e.clientX, e.clientY)) mover(e.clientX, e.clientY);
    else ponteiro.ativoAte = Math.min(ponteiro.ativoAte, relogio);
  }, { passive: true });
  // no toque não existe "aproximar": o toque é um pulso do sensor naquele ponto
  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || !dentroDoTopo(e.clientX, e.clientY)) return;
    mover(e.clientX, e.clientY);
    ponteiro.pulso = 1;
  }, { passive: true });
  addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t && dentroDoTopo(t.clientX, t.clientY)) mover(t.clientX, t.clientY);
  }, { passive: true });

  /* ---------- física de corpo rígido ---------- */
  const n = new Vector3();
  const d = new Vector3();
  const ra = new Vector3();
  const rb = new Vector3();
  const va = new Vector3();
  const vb = new Vector3();
  const vrel = new Vector3();
  const tmp = new Vector3();
  const perto = new Vector3();
  const eixo = new Vector3();
  const torque = new Vector3();
  const impulso = new Vector3();
  const dq = new Quaternion();
  let empurraoRolagem = 0;
  let lancamento = 0; // a rolagem lança as peças para cima, entregando a seção seguinte
  let deriva = 1;

  function atualizarEsferas(c) {
    for (const e of c.esferas) e.mundo.copy(e.o).multiplyScalar(c.escala).applyQuaternion(c.grupo.quaternion).add(c.p);
  }
  function aplicarImpulso(c, j, r) {
    c.v.addScaledVector(j, 1 / c.massa);
    torque.crossVectors(r, j);
    c.w.addScaledVector(torque, 1 / (c.inercia * c.escala * c.escala));
  }
  function velocidadeNoPonto(c, r, saida) {
    return saida.crossVectors(c.w, r).add(c.v);
  }

  function passo(h) {
    for (const c of corpos) {
      c.v.x += (-MOLA_CASA * (c.p.x - c.casa.x) + Math.sin(relogio * 0.5 + c.fase[0]) * 0.16 * deriva) * h;
      c.v.y += (-MOLA_CASA * (c.p.y - (c.casa.y + lancamento * (c.sensor ? 0.8 : 1 + c.onda * 0.18))) + Math.sin(relogio * 0.43 + c.fase[1]) * 0.16 * deriva + empurraoRolagem) * h;
      c.v.z += (-MOLA_CASA * (c.p.z - c.casa.z) + Math.sin(relogio * 0.57 + c.fase[2]) * 0.1 * deriva) * h;
      c.v.multiplyScalar(Math.exp(-AMORTECIMENTO * h));
      c.p.addScaledVector(c.v, h);
      tmp.copy(c.giroBase).multiplyScalar(deriva);
      c.w.lerp(tmp, 1 - Math.exp(-0.7 * h));
      const vel = c.w.length();
      if (vel > 6) c.w.multiplyScalar(6 / vel);
      if (vel > 1e-5) {
        eixo.copy(c.w).normalize();
        dq.setFromAxisAngle(eixo, Math.min(vel, 6) * h);
        c.grupo.quaternion.premultiply(dq);
      }
      atualizarEsferas(c);
    }

    // peça contra peça, esfera por esfera
    for (let i = 0; i < corpos.length; i++) {
      const A = corpos[i];
      for (let j = i + 1; j < corpos.length; j++) {
        const B = corpos[j];
        const limite = A.alcance * A.escala + B.alcance * B.escala;
        if (A.p.distanceToSquared(B.p) > limite * limite) continue;
        for (const ea of A.esferas) {
          for (const eb of B.esferas) {
            d.subVectors(eb.mundo, ea.mundo);
            const soma = (ea.r + eb.r) * A.escala;
            const dist2 = d.lengthSq();
            if (dist2 >= soma * soma || dist2 < 1e-9) continue;
            const dist = Math.sqrt(dist2);
            n.copy(d).divideScalar(dist);
            const pen = soma - dist;
            const invA = 1 / A.massa;
            const invB = 1 / B.massa;
            A.p.addScaledVector(n, -pen * (invA / (invA + invB)) * 0.8);
            B.p.addScaledVector(n, pen * (invB / (invA + invB)) * 0.8);
            tmp.copy(ea.mundo).addScaledVector(n, ea.r * A.escala);
            ra.subVectors(tmp, A.p);
            rb.subVectors(tmp, B.p);
            vrel.subVectors(velocidadeNoPonto(B, rb, vb), velocidadeNoPonto(A, ra, va));
            const vn = vrel.dot(n);
            if (vn >= 0) continue;
            const kA = tmp.crossVectors(ra, n).lengthSq() / (A.inercia * A.escala * A.escala);
            const kB = tmp.crossVectors(rb, n).lengthSq() / (B.inercia * B.escala * B.escala);
            const jn = (-(1 + RESTITUICAO) * vn) / (invA + invB + kA + kB);
            impulso.copy(n).multiplyScalar(jn);
            aplicarImpulso(B, impulso, rb);
            impulso.multiplyScalar(-1);
            aplicarImpulso(A, impulso, ra);
          }
        }
      }
    }

    // peça contra o cursor: um cilindro ao longo do raio do mouse
    const forcaEmpurrao = Math.max(ponteiro.forca, ponteiro.pulso);
    if (forcaEmpurrao > 0.02) {
      const alcance = (0.95 + ponteiro.pulso * 0.9) * escalaPecas * forcaEmpurrao;
      for (const c of corpos) {
        for (const e of c.esferas) {
          d.subVectors(e.mundo, raio.origem);
          perto.copy(raio.direcao).multiplyScalar(d.dot(raio.direcao)).add(raio.origem);
          n.subVectors(e.mundo, perto);
          const dist = n.length();
          const lim = alcance + e.r * c.escala;
          if (dist >= lim) continue;
          if (dist < 1e-5) n.set(1, 0, 0);
          else n.divideScalar(dist);
          c.p.addScaledVector(n, (lim - dist) * 0.45);
          ra.subVectors(e.mundo, c.p);
          vrel.subVectors(velocidadeNoPonto(c, ra, va), ponteiro.vel);
          const vn = vrel.dot(n);
          if (vn < 0) {
            const k = tmp.crossVectors(ra, n).lengthSq() / (c.inercia * c.escala * c.escala);
            impulso.copy(n).multiplyScalar((-1.5 * vn) / (1 / c.massa + k));
            aplicarImpulso(c, impulso, ra);
          }
        }
      }
    }
  }

  /* ---------- o que acende com a proximidade ---------- */
  const pontoMundo = new Vector3();
  function acender(dt, intensidade, fixo = false) {
    // acender em ~150 ms e apagar em ~400 ms: nada pisca mais de 3 vezes por segundo
    const subir = fixo ? 1 : 1 - Math.exp(-dt * 7);
    const descer = fixo ? 1 : 1 - Math.exp(-dt * 2.5);
    let aceso = 0;
    for (const c of corpos) {
      const a = c.acende;
      if (!a) continue;
      pontoMundo.copy(a.ponto).multiplyScalar(c.escala).applyQuaternion(c.grupo.quaternion).add(c.p);
      d.subVectors(pontoMundo, raio.origem);
      perto.copy(raio.direcao).multiplyScalar(d.dot(raio.direcao)).add(raio.origem);
      const dist = pontoMundo.distanceTo(perto) / escalaPecas;
      const alvo = (1 - MathUtils.smoothstep(dist, 0.7, 2.9)) * intensidade;
      const final = Math.max(alvo, c.reserva || 0);
      a.nivel += (final - a.nivel) * (final > a.nivel ? subir : descer);
      aceso = Math.max(aceso, a.nivel);
      if (a.tipo === 'led') {
        a.material.emissiveIntensity = 0.25 + a.nivel * 3.2;
        a.halo.material.opacity = a.nivel * 0.95;
        a.halo.scale.setScalar(1.3 + a.nivel * 1.4);
      } else if (a.tipo === 'tela') {
        a.material.emissiveIntensity = 0.3 + a.nivel * 0.95;
      } else if (a.tipo === 'pontos' || a.tipo === 'legenda') {
        a.material.emissiveIntensity = a.nivel * 2.4;
      } else if (a.tipo === 'giro') {
        // engrenagem perto do cursor gira em torno do próprio eixo
        eixo.set(0, 0, 1).applyQuaternion(c.grupo.quaternion);
        c.w.addScaledVector(eixo, a.nivel * 3 * dt);
      }
    }
    return aceso;
  }

  /* ---------- leitura do sensor: distância até o cursor ---------- */
  const leitura = document.createElement('div');
  leitura.className = 'heroi__leitura';
  leitura.innerHTML = '<div><span>distância</span><b>— cm</b></div>';
  caixa.append(leitura);
  const valorLeitura = leitura.querySelector('b');
  let ultimoCm = -1;
  let ultimaEscrita = 0;
  const olhos = new Vector3();
  function atualizarLeitura(mostrar) {
    if (!sensor) return;
    olhos.set(0, 0.6, 0).multiplyScalar(sensor.escala).applyQuaternion(sensor.grupo.quaternion).add(sensor.p);
    const cm = Math.round(MathUtils.clamp(2 + olhos.distanceTo(posSonda) * 38, 2, 400));
    olhos.project(camera);
    const x = (olhos.x * 0.5 + 0.5) * caixa.clientWidth;
    const y = (-olhos.y * 0.5 + 0.5) * caixa.clientHeight;
    leitura.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    leitura.classList.toggle('visivel', mostrar);
    if (cm !== ultimoCm && relogio - ultimaEscrita > 0.08) {
      valorLeitura.textContent = `${cm} cm`;
      ultimoCm = cm;
      ultimaEscrita = relogio;
    }
  }

  /* ---------- posições iniciais ---------- */
  function colocarEmCasa() {
    for (const c of corpos) {
      c.p.copy(c.casa);
      c.v.set(0, 0, 0);
      c.grupo.position.copy(c.p);
      atualizarEsferas(c);
    }
  }
  function colocarAoFundo() {
    corpos.forEach((c, i) => {
      // onda 0 chega primeiro; cada onda parte ~9 unidades mais fundo
      c.p.set(c.casa.x * 0.35, c.casa.y * 0.35, -17 - c.onda * 9 - (i % 4) * 1.1);
      c.v.set(0, 0, 11 + aleatorio() * 3);
      c.grupo.position.copy(c.p);
      atualizarEsferas(c);
    });
  }

  /* ---------- quadro ---------- */
  let ativo = false;
  let visivel = true;
  let tempoEntrada = 0;
  let acumulado = 0;
  let somaDt = 0;
  let quadros = 0;
  let rolagemCamera = 0;
  const alvoCamera = new Vector3(0, 0, 14);

  function quadro(dt, velRolagem = 0, progressoRolagem = 0) {
    if (!visivel) return;
    relogio += dt;
    if (Math.abs(velRolagem) > 0.5) acordar();
    if (!ativo) {
      if (precisaDesenhar) {
        renderer.render(cena, camera);
        precisaDesenhar = false;
      }
      return;
    }
    if (dormindo && !precisaDesenhar) return;

    tempoEntrada += dt;
    const ocioso = relogio - ultimaInteracao;
    const naEntrada = tempoEntrada < 4.2;
    // sem interação, a deriva some aos poucos e a cena assenta
    deriva = naEntrada ? 1 : MathUtils.clamp(1 - (ocioso - (OCIOSO_ATE_PARAR - 2)) / 2, 0, 1);

    const usandoPonteiro = relogio < ponteiro.ativoAte;
    ponteiro.forca += ((usandoPonteiro ? 1 : 0) - ponteiro.forca) * (1 - Math.exp(-dt * 6));
    ponteiro.pulso *= Math.exp(-dt * 2.6);

    if (usandoPonteiro || ponteiro.forca > 0.02) {
      raycaster.setFromCamera(ponteiro.ndc, camera);
      raio.origem.copy(raycaster.ray.origin);
      raio.direcao.copy(raycaster.ray.direction);
      const t = (1.2 - raio.origem.z) / raio.direcao.z;
      ponteiro.mundo.copy(raio.direcao).multiplyScalar(t).add(raio.origem);
      if (ponteiro.novo) { ponteiro.anterior.copy(ponteiro.mundo); ponteiro.novo = false; }
      tmp.subVectors(ponteiro.mundo, ponteiro.anterior).divideScalar(Math.max(dt, 1 / 240));
      if (tmp.length() > 30) tmp.setLength(30);
      ponteiro.vel.lerp(tmp, 0.5);
      ponteiro.anterior.copy(ponteiro.mundo);
      posSonda.copy(ponteiro.mundo);
    } else if (naEntrada) {
      // na entrada, uma sonda varre a cena da esquerda para a direita
      const k = MathUtils.clamp((tempoEntrada - 1.0) / 1.6, 0, 1);
      posSonda.set(MathUtils.lerp(-meiaLarg * 1.1, meiaLarg * 1.1, k), Math.sin(k * Math.PI * 2) * meiaAlt * 0.25, 1.2);
      raio.origem.copy(camera.position);
      raio.direcao.subVectors(posSonda, camera.position).normalize();
      ponteiro.vel.set(0, 0, 0);
    } else {
      // sem cursor e fora da entrada: a sonda sai de cena
      posSonda.set(meiaLarg * 3, meiaAlt * 3, 1.2);
      raio.origem.copy(camera.position);
      raio.direcao.subVectors(posSonda, camera.position).normalize();
    }

    empurraoRolagem = MathUtils.clamp(-velRolagem * 0.25, -10, 10);
    lancamento = Math.pow(MathUtils.clamp(progressoRolagem * 1.3, 0, 1), 2.4) * meiaAlt * 3.4;
    acumulado += Math.min(dt, 1 / 20);
    let passos = 0;
    while (acumulado >= PASSO && passos < 4) {
      passo(PASSO);
      acumulado -= PASSO;
      passos++;
    }
    if (passos === 4) acumulado = 0;
    for (const c of corpos) c.grupo.position.copy(c.p);

    const forcaLuz = usandoPonteiro || ponteiro.forca > 0.05 ? 0.6 + ponteiro.forca * 0.4 : naEntrada ? 0.85 : 0;
    sonda.position.set(posSonda.x, posSonda.y, 2.6);
    sonda.intensity += (26 * forcaLuz - sonda.intensity) * (1 - Math.exp(-dt * 5));
    const aceso = acender(dt, Math.max(forcaLuz, ponteiro.pulso));
    atualizarLeitura(tempoEntrada > 1.1 && lancamento < meiaAlt * 0.4 && (usandoPonteiro || naEntrada));

    // câmera: leve paralaxe com o cursor e desce um pouco com a rolagem
    rolagemCamera += (progressoRolagem - rolagemCamera) * (1 - Math.exp(-dt * 8));
    alvoCamera.set(ponteiro.ndc.x * 0.5 * ponteiro.forca, ponteiro.ndc.y * 0.3 * ponteiro.forca - rolagemCamera * meiaAlt * 0.6, 14);
    camera.position.lerp(alvoCamera, 1 - Math.exp(-dt * 3));
    camera.lookAt(camera.position.x * 0.5, camera.position.y, 0);

    renderer.render(cena, camera);
    precisaDesenhar = false;

    // dorme quando tudo assentou, as luzes apagaram e ninguém mexe
    if (!naEntrada && ocioso > OCIOSO_ATE_PARAR && aceso < 0.01 && sonda.intensity < 0.2) {
      let energia = 0;
      for (const c of corpos) energia += c.v.lengthSq() + c.w.lengthSq();
      if (energia < 0.004) dormindo = true;
    }

    // se a máquina sofrer, desenha com menos pixels
    somaDt += dt;
    if (++quadros === 90) {
      if (somaDt / quadros > 1 / 40 && pixelRatio > 1) {
        pixelRatio = Math.max(1, pixelRatio - 0.3);
        redimensionar();
      }
      somaDt = 0;
      quadros = 0;
    }
  }

  redimensionar();
  new ResizeObserver(redimensionar).observe(caixa);
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; if (visivel) acordar(); }, { rootMargin: '80px' }).observe(caixa);

  colocarEmCasa();
  if (reduzido) {
    // sem animação: peças paradas nas casas e algumas luzes acesas
    corpos.forEach((c, i) => { if (c.acende) c.reserva = i % 2 ? 0.7 : 0.3; });
    raio.origem.set(0, 0, 14);
    raio.direcao.set(0, 0, -1);
    acender(1, 0, true);
  }

  let aoPerderContexto = null;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    ativo = false;
    aoPerderContexto?.();
  });

  // primeiro desenho compila os shaders enquanto a tela de carregamento cobre tudo
  const pronto = new Promise((resolver) => {
    requestAnimationFrame(() => {
      renderer.render(cena, camera);
      if (!reduzido) colocarAoFundo();
      precisaDesenhar = true;
      resolver();
    });
  });

  return {
    pronto,
    quadro,
    entrar() {
      if (reduzido) {
        precisaDesenhar = true;
        return;
      }
      ativo = true;
      acordar();
    },
    redistribuir() {
      distribuirCasas();
      acordar();
    },
    set aoPerderContexto(fn) {
      aoPerderContexto = fn;
    },
  };
}
