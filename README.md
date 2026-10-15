# obragaa.github.io

Site pessoal de **Felipe Braga Duarte** — desenvolvedor full stack e IA aplicada.

🔗 **https://obragaa.github.io**

Página única com rolagem interativa: a cena de fundo avança em profundidade
conforme o visitante rola, e cada projeto é uma parada onde a animação acontece
no ritmo da rolagem.

## Como rodar localmente

Não tem build, nem dependência, nem servidor de aplicação — é HTML, CSS e
JavaScript puro. Basta servir a pasta:

```bash
python -m http.server 8099
# abre http://127.0.0.1:8099
```

> Precisa ser por HTTP (não `file://`), porque o JavaScript usa módulos ES.

## Estrutura

```
index.html              a página inteira
assets/css/site.css     estilo, paleta e as animações dirigidas por --p
assets/js/cena.js       cena de fundo (canvas 2D, perspectiva feita à mão)
assets/js/site.js       traduz a rolagem em progresso (0→1) para o CSS
assets/fontes/          Space Grotesk e Inter auto-hospedadas
assets/img/             foto, favicon e imagem de compartilhamento
PLANO.md                decisões de direção, estrutura e técnica
```

## Como funciona a rolagem

O JavaScript não anima nada: ele só calcula, a cada quadro, o progresso de cada
seção (um número de 0 a 1) e escreve esse número numa custom property `--p`.
Todo o movimento é CSS reagindo a esse número — o que mantém a página leve e
fácil de ajustar.

A cena de fundo é um canvas 2D com projeção de perspectiva própria: pontos num
volume 3D projetados por `foco / z`, com a câmera avançando conforme a rolagem.
Nenhuma biblioteca.

## Acessibilidade e desempenho

- `prefers-reduced-motion` desliga a cena e o sticky, mostrando todo o conteúdo
  de uma vez.
- Sem JavaScript, o conteúdo continua legível.
- Fontes auto-hospedadas (sem chamada a terceiros), imagens em WebP.

## Publicação

GitHub Pages, branch `main`, pasta raiz. Repositório com o nome exato da conta
(`obragaa.github.io`), o que dá o endereço raiz, sem subpasta.
