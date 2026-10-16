/* Cena da trajetória: um sinal de sensor — a linha de um osciloscópio que
   atravessa a tela, presa no centro, e fica mais rica conforme a rolagem
   passa pelos marcos. Na troca de marco, o sinal pulsa visivelmente.
   Um plano, um shader, nenhuma textura. Paleta da marca (azul → ciano),
   com o âmbar dos LEDs no flash do pulso. */
import { WebGLRenderer, Scene, PerspectiveCamera, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three';

const VERTICE = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENTO = /* glsl */ `
precision highp float;
uniform vec2 uTela;
uniform float uTempo;
uniform float uProgresso; // 0..1 ao longo da seção
uniform float uPulso;     // 1 na troca de marco, decai
uniform vec2 uMouse;      // -1..1

const vec3 AZUL  = vec3(0.184, 0.420, 1.0);   // #2f6bff
const vec3 CIANO = vec3(0.220, 0.741, 0.973); // #38bdf8
const vec3 AMBAR = vec3(1.0, 0.710, 0.278);   // #ffb547

// o sinal: começa um pulso tímido e vira uma forma de onda rica
float sinal(float x, float t, float p) {
  float s = sin(x * 2.1 - t * 0.9) * 0.16;                       // portadora calma
  s += sin(x * 5.3 + t * 0.6) * 0.085 * smoothstep(0.12, 0.5, p); // 2020: ganha corpo
  s += sin(x * 11.0 - t * 1.7) * 0.055 * smoothstep(0.4, 0.75, p); // 2021-24: indústria
  s += sin(x * 23.0 + t * 2.3) * 0.028 * smoothstep(0.7, 1.0, p);  // hoje: detalhe fino
  // batimento cardíaco ocasional, mais forte no pulso de troca
  float fase = fract(x * 0.16 - t * 0.11);
  float batida = exp(-pow((fase - 0.5) * 22.0, 2.0));
  s += batida * (0.1 + 0.42 * uPulso) * sin(x * 30.0);
  return s * (0.55 + 0.45 * p + uPulso * 0.35);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uTela;
  float prop = uTela.x / uTela.y;
  float x = (uv.x - 0.5) * prop * 6.2831;
  float t = uTempo;

  // leve inclinação do plano do sinal com o mouse
  float centro = 0.5 + uMouse.y * 0.02 + (uv.x - 0.5) * uMouse.x * 0.03;
  float y = uv.y - centro;

  float s = sinal(x, t, uProgresso);
  float d = abs(y - s * 0.32);

  // linha fina + halo largo
  float linha = 0.0028 / max(d, 0.0012);
  float halo = exp(-d * 14.0) * 0.5;

  // rastro "fósforo de osciloscópio": a mesma linha, um instante atrás
  float s2 = sinal(x, t - 0.35, uProgresso);
  float d2 = abs(y - s2 * 0.32);
  float rastro = exp(-d2 * 26.0) * 0.16;

  vec3 cor = mix(AZUL, CIANO, clamp(uv.x * 0.4 + uProgresso * 0.7, 0.0, 1.0));
  cor = mix(cor, AMBAR, uPulso * 0.55);

  vec3 luz = cor * (linha * 0.35 + halo) + cor * rastro;
  // vinheta: concentra a atenção no centro
  luz *= smoothstep(1.05, 0.35, abs(uv.y - 0.5) * 2.0);
  luz *= 0.85 + uPulso * 0.5;

  // leve ruído quebra as faixas do degradê
  float grao = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.012;
  gl_FragColor = vec4(luz + grao * luz, 1.0);
}
`;

export function criarMundo(caixa, { toque = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new WebGLRenderer({ canvas, antialias: false, stencil: false, depth: false, powerPreference: 'high-performance' });
  renderer.debug.checkShaderErrors = false;
  caixa.append(canvas);
  renderer.setClearColor('#050a16', 1);

  const cena = new Scene();
  const camera = new PerspectiveCamera(); // o shader posiciona os vértices direto em clip space
  const uniformes = {
    uTela: { value: new Vector2(1, 1) },
    uTempo: { value: 0 },
    uProgresso: { value: 0 },
    uPulso: { value: 0 },
    uMouse: { value: new Vector2(0, 0) },
  };
  cena.add(new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ uniforms: uniformes, vertexShader: VERTICE, fragmentShader: FRAGMENTO })));

  const mouse = new Vector2();
  if (!toque) {
    addEventListener('pointermove', (e) => {
      mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    }, { passive: true });
  }

  function redimensionar() {
    const largura = Math.max(1, caixa.clientWidth);
    const altura = Math.max(1, caixa.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(largura, altura, false);
    uniformes.uTela.value.set(largura * renderer.getPixelRatio(), altura * renderer.getPixelRatio());
  }
  redimensionar();
  new ResizeObserver(redimensionar).observe(caixa);

  let aoPerderContexto = null;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    aoPerderContexto?.();
  });

  let progresso = 0;
  return {
    quadro(dt, alvoProgresso) {
      uniformes.uTempo.value += dt;
      progresso += (alvoProgresso - progresso) * (1 - Math.exp(-dt * 4));
      uniformes.uProgresso.value = progresso;
      uniformes.uPulso.value *= Math.exp(-dt * 3.2);
      uniformes.uMouse.value.lerp(mouse, 1 - Math.exp(-dt * 3));
      renderer.render(cena, camera);
    },
    pulsar() {
      uniformes.uPulso.value = 1;
    },
    set aoPerderContexto(fn) {
      aoPerderContexto = fn;
    },
  };
}
