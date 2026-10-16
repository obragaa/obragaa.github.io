# obragaa.github.io

Site pessoal de **Felipe Braga Duarte** — desenvolvedor full stack e de IA aplicada.

🔗 **https://obragaa.github.io**

Página única, escura. Na entrada, um sensor ultrassônico HC-SR04 em escala de
protagonista mede a distância até o seu cursor — como no teste de 2021 com Arduino
que está no GitHub — cercado por janelas de sistema, balões de chat, engrenagens e
LEDs com física própria: as peças acendem com a proximidade, fogem do mouse e são
lançadas para fora da tela pela rolagem. A trajetória é um sinal de osciloscópio
que fica mais rico a cada marco.

## Como rodar localmente

Não tem build nem servidor de aplicação. Basta servir a pasta:

```bash
python -m http.server 8099
# abre http://127.0.0.1:8099
```

> Precisa ser por HTTP (não `file://`), porque o JavaScript usa módulos ES.

## Estrutura

```
index.html               a página inteira (com CSP por <meta>)
assets/css/site.css      tokens, tipografia e todas as seções
assets/js/main.js        carregamento, rolagem suave, menu, painéis e caso dos projetos
assets/js/heroi3d.js     cena do topo: peças, física própria e o "sensor"
assets/js/mundo3d.js     sinal de osciloscópio da trajetória (shader próprio)
assets/js/demos.js       demonstrações vivas dos projetos (DOM + canvas 2D, sem biblioteca)
assets/vendor/           three.js 0.186.1 enxuto (gerado por ferramentas/) e Lenis 1.3.27 (MIT)
assets/fontes/           Archivo variável (OFL), subconjuntos latino e latino-estendido
assets/img/              foto, imagens dos projetos, imagem de reserva e de compartilhamento
PLANO.md                 decisões de direção, conteúdo e segurança
```

## Como a cena do topo funciona

- Cada peça é modelada por código (sem modelo baixado) e é um corpo rígido feito de
  uma ou duas esferas. A física roda em passo fixo de 1/60 s.
- Uma mola leva cada peça de volta à sua "casa" na composição; as casas são
  sorteadas fora das áreas de texto, medidas no próprio layout.
- O mouse é um cilindro invisível ao longo do raio da câmera: empurra as peças e
  acende o que está perto. No toque, cada toque é um pulso.
- Sem interação por ~6 s, a cena assenta e para de desenhar.

## Acessibilidade e desempenho

- `prefers-reduced-motion`: cena parada com algumas luzes acesas; a trajetória vira
  uma lista.
- Sem JavaScript, sem WebGL ou com economia de dados: imagem de reserva no lugar da
  cena, todo o conteúdo visível.
- Texto e foco com contraste AA no fundo escuro; nome como `<h1>` de verdade.
- Tela de carregamento com teto de 2,6 s; a cena 3D pode chegar depois.

## Publicação

GitHub Pages, branch `main`, pasta raiz.
