# Plano do site — obragaa.github.io

Documento de direção. O site em si é `index.html` (sem build, sem servidor).

---

## 1. Endereço e custo

O repositório se chama exatamente `obragaa.github.io`, por isso o GitHub Pages o serve
no endereço raiz **https://obragaa.github.io**. O site antigo
(`felipebragaduarte.github.io`, maio de 2024) continua no ar como arquivo.

**Custo: zero.** GitHub Pages é gratuito para repositório público. Domínio próprio é
opcional (só o domínio é pago, o Pages aceita de graça).

## 2. Histórico de versões

| Versão | Ideia | Resultado |
|---|---|---|
| v1 | Canvas 2D com "voo em profundidade"; cada projeto numa parada fixa animada pela rolagem | No ar em 15/10/2026. Reprovada: "a rolagem não tá muito legal". |
| v2 | Clara, no estilo do lusion.co, com objetos 3D com física dentro de um card | Interação aprovada; visual reprovado: "muito branco, muito padrão"; foto com filtro azul reprovada. |
| v3 | Escura do começo ao fim, com a cena 3D ocupando a tela inteira | Construída, não publicada; virou a base da v4. |
| v4 | Decidida por um time de 6 skills debatendo (arte, engenharia, performance, marketing, conteúdo, motion) + crítico adversarial. Sensor HC-SR04 protagonista; oferta como manchete; ordem da página para o comprador; trajetória vira sinal de osciloscópio; arquivo denso após o contato. | Esta versão. Atas do debate e decisão em `.time/` (pasta local, fora do git). |
| v4.1 | Cards trocados por painéis que se empilham na rolagem, cada um com a demonstração do produto rodando em código (chat do Atendo com custo medido, macros do BodyFlow, agente do Atlas recusando exercício fora do catálogo, pote com física do Widgetok, arena do Palco, mundo em pixel do GiftCraft); cor própria por projeto; a ficha virou a página do caso, que se abre a partir do painel. | Pedido dele em 16/10: cards "sem vida", caixas vazias, pop-up fraco. |

## 3. Como a v3 foi decidida: as skills conversando

O pedido foi rodar várias skills de análise e fazer uma questionar a outra. Cada uma
entrou como uma voz, nesta ordem.

**Matéria-prima levantada antes das vozes**
- Os 49 repositórios públicos do GitHub (README de cada um, datas e dependências).
- O Atlas clonado e rodando localmente, para capturar a tela real.
- Dez sites de referência estudados: lusion.co, basement.studio, darkroom.engineering,
  linear.app, resend.com, dennissnellenberg.com, activetheory.net, igloo.inc, cuberto.com
  e exoape.com. O que se tirou deles: **confiança vem de mostrar o trabalho real**
  (Linear, Resend); **surpresa vem de um mundo próprio e interativo** (Basement,
  Darkroom); **para freelancer, nome e rosto vendem** (Snellenberg).

**1. Direção de arte (frontend-design).** Ancorar o visual no universo do Felipe, gastar
a ousadia num lugar só (a entrada) e tirar os vícios de página gerada: rótulos em
maiúsculas por toda parte, numeração 01–06 em algo que não é sequência, separadores
com ponto no meio e fade-up em toda seção. Paleta escura no azul-noite da marca; uma
família tipográfica (Archivo variável), larga nos títulos.

**2. Ideias (idea-refine).** Sete variações da entrada em três famílias: "sinal físico"
(o cursor vira sensor, como no teste de 2021 com Arduino), "projetos como objetos" e
"nome ou rosto como objeto". Venceu o sinal físico: é a única que só ele pode ter.
*Não fazer:* demonstração de IA ao vivo (exige servidor pago, e demo falsa derruba
confiança), zoom do LED até o app (três vezes o trabalho), nuvem de pontos do rosto
(risco de cafona), objetos-brinquedo dos projetos.

**3. Crítica adversarial (doubt-driven-development).** Um revisor de contexto limpo
recebeu só a proposta e as restrições, com a ordem de achar falhas. Achou 16. Os que
mudaram o rumo:
- *A cena mostrava a origem (hardware), não o que ele vende (software).* → A maioria
  das peças passou a ser o que ele entrega: janelas de sistema (painel, conversa,
  código, fluxo de automação), balões de chat, engrenagens, teclas. Ficaram 3 LEDs, um
  chip e o sensor como origem. A oferta subiu para a primeira tela.
- *"Na área desde 2020" junto de "IA" sugeria IA desde 2020.* → Duas frases separadas.
- *Animação sem fim gasta bateria e exige botão de pausa (WCAG 2.2.2).* → A cena assenta
  e para de desenhar depois de ~6 s sem interação; acorda com mouse, toque ou rolagem.
- *No celular, o dedo que segue a cena briga com a rolagem.* → O canvas não captura
  eventos; o toque vira um "pulso" do sensor e a rolagem continua livre.
- *Brilho atrás do texto derruba o contraste.* → Véu escuro atrás do texto e casas das
  peças calculadas fora das áreas de texto.
- *#2f6bff não passa contraste AA para texto pequeno no fundo escuro (≈4,4:1).* → Links e
  foco em ciano #38bdf8 (≈9:1); o azul fica para elementos grandes.
- A melhor ideia de surpresa veio dele: **o HC-SR04 da cena mede a distância até o seu
  cursor**, em cm, numa etiqueta que acompanha a peça.

Segunda opinião de outro modelo (Gemini ou Codex): indisponível, nenhum dos dois está
instalado. Seguiu só com a revisão de um modelo.

**4. Textos (ux-writing).** Frases de 8 a 14 palavras, primeira pessoa, sem caixa-alta
em rótulos, botões no formato verbo + objeto ("Copiar e-mail" → "E-mail copiado"),
nada de frase de efeito. Cada frase tem um fato que a sustenta (tabela na seção 7).

**5. Segurança (security-and-hardening).** Ver seção 6. No próprio site: política de
segurança de conteúdo (CSP) por `<meta>`, com hash exato dos dois scripts embutidos, e
política de referência `strict-origin-when-cross-origin`.

## 4. Estrutura da página

1. **Topo** — nome gigante (HTML) atrás da cena 3D; oferta, papel e dois botões;
   dica que leva ao teste de 2021.
2. **Sobre** — "Faço o sistema inteiro.", foto sem filtro, o que entrega e com o quê.
3. **Projetos** — Atlas, Atendo, BodyFlow (para cliente), Widgetok, Palco, GiftCraft.
   Clicar abre a ficha com descrição, stack e link quando é público.
4. **Hardware** — os quatro testes de sensores com Arduino de 2021, cada um com link.
5. **Mais no GitHub** — nove repositórios de estudo e ferramentas (2022–2024).
6. **Ferramentas** — seis grupos, sem numeração.
7. **Trajetória** — 2019, 2020, 2021–2024 e hoje, um marco por trecho de rolagem.
8. **Contato** — e-mail, copiar, LinkedIn e GitHub.

## 5. Decisões técnicas

| Decisão | Por quê |
|---|---|
| three.js 0.186.1 e Lenis 1.3.27 servidos pelo próprio site (`assets/vendor`) | Sem depender de CDN de terceiros; licenças MIT em `LICENCAS.txt`. |
| Física própria em passo fixo (1/60 s) | Cada peça é um corpo rígido de 1–2 esferas: gira quando é empurrada pela ponta. Leve, sem biblioteca de física. |
| Peças modeladas por código | Nada de modelo baixado: chip, LED, sensor, janelas e engrenagens saem de geometria do three.js. |
| A cena dorme quando assenta | Economiza bateria e atende a regra de movimento automático. |
| Teto de 2,6 s na tela de carregamento | Se o 3D demorar (4G fraco), a página entra e a cena chega depois. |
| Imagem de reserva (`heroi-poster.webp`) | Sem WebGL, sem JavaScript, com economia de dados ou se o navegador perder o contexto 3D. |
| Archivo variável auto-hospedada (90 KB, subconjunto latino) | Um arquivo serve todos os pesos e larguras. |
| `prefers-reduced-motion` | Cena parada com algumas luzes acesas; trajetória vira lista. |
| three.js enxuto (`three.slim.min.js`) | Bundle tree-shaken gerado offline por `ferramentas/gerar-three-enxuto` (script commitado); 143 KB gzip contra 189 KB do pacote cheio. |

**Orçamento medido (v4):** primeira carga **278 KB gzip** (teto do contrato: 350 KB);
cortina de carregamento com teto de 1,5 s e progresso real; a oferta está em HTML no
primeiro quadro.

## 6. GitHub: o que entrou, o que ficou de fora e por quê

**Entraram:** Atlas e Atendo (projetos principais), os quatro sensores (hardware) e nove
repositórios de 2022–2024: Sonhos Lúcidos, FinancialMarketPredictor, PySpeakBot,
DynamicPriceTracker, FinDataViz, análise de sentimentos, StarGazer, backup.api e
Rename-bulk-files.

**Ficaram de fora:**
- Um repositório antigo de estudo tem uma credencial escrita no código (detalhe passado
  em particular). Entra depois que a credencial for trocada e movida para variável de ambiente.
- Um projeto de faculdade tem dados acadêmicos pessoais no README. Entra quando saírem.
- *buy-extra-ball* — automação de compra em jogo de bingo; não combina com a vitrine.
- *FirstClass-Oswaldo-Cruz* — cita um hospital real num trabalho de escola; pode ser lido
  como cliente.
- Forks (Dash_Board, send-email, Repografia_SENAI ×2, CSGO_login, workshop-react-pokedex)
  e exercícios de curso (GS, PythonGuppe, screenmatch etc.): não vendem o trabalho de hoje.

**Higiene recomendada nos repositórios de estudo:** configurações de desenvolvimento no
código e pastas de ambiente virtual commitadas (lista passada em particular).

## 7. Cada frase pública e o fato que a sustenta

| Frase no site | Fonte |
|---|---|
| Desenvolvedor full stack e de IA aplicada. | Título do LinkedIn dele. |
| Na área desde 2020. / Primeiras linhas de código em 2019. | Confirmado por ele. |
| Sistemas, automações e sites sob medida para empresas. | Título do LinkedIn dele. |
| Teste de 2021 com sensor ultrassônico e Arduino que acende LEDs pela aproximação | README do repositório SensorUltrassonico (maio de 2021). |
| De 2021 a 2024, projetos de IoT e Indústria 4.0 | Trajetória confirmada. |
| Atlas: plataforma de treino com IA; agente que monta treinos pelo catálogo | Código e README do Project-Atlas. |
| BodyFlow feito para cliente, em produção, com IA | Confirmado por ele; cliente não é citado. |
| Descrições da lista do GitHub | README e descrição de cada repositório. |

**Ainda a confirmar com você:** formação atual (o README do perfil cita Engenharia de
Software).

## 8. Próximos passos

1. Você aprova a v3 olhando localmente.
2. Publicar (`.\publicar-no-github.ps1 -Projetos 'obragaa.github.io'`, device flow).
3. Trocar o link do site no README do perfil `obragaa` e no LinkedIn.
4. Trocar a credencial antiga e limpar os repositórios de estudo (seção 6).
