# Plano do site — obragaa.github.io

Documento de direção. O site em si é `index.html` (sem build, sem servidor).

---

## 1. Decisão de endereço (a mais importante)

| | Hoje | Depois deste trabalho |
|---|---|---|
| Endereço | `obragaa.github.io/felipebragaduarte.github.io/` | **`obragaa.github.io`** |
| Repositório | `felipebragaduarte.github.io` (nome de outro usuário → vira "project page") | `obragaa.github.io` (nome exato da conta → vira "user page") |
| Última mexida | maio/2024 | agora |

No GitHub Pages, o repositório chamado **exatamente** `<usuário>.github.io` ganha o
endereço raiz. Como a conta é `obragaa`, o repo precisa se chamar `obragaa.github.io`.
O repo antigo fica no ar como arquivo histórico (nada é apagado); o README do perfil
passa a apontar para o endereço novo.

**Custo: zero.** GitHub Pages é gratuito para repositório público, sem mensalidade.
Se um dia quiser `felipebraga.dev`, só o domínio é pago (~R$ 40/ano) — o Pages aceita
domínio próprio de graça.

## 2. O que o site precisa resolver

O site antigo mostra projetos de 2024 (sensor ultrassônico, ScreenMatch, exercícios de
curso) e uma lista de habilidades que inclui Word, Excel e PowerPoint. Ele conta a
história de um estudante. O trabalho de hoje — Atendo, BodyFlow, Widgetok, Palco,
GiftCraft — não aparece em lugar nenhum.

O site novo é a vitrine de quem vende **sistemas sob medida**: quem chega pelo LinkedIn,
pelo GitHub ou por indicação precisa ver, em 30 segundos de rolagem, o que foi
construído e como falar com você.

Públicos, nesta ordem:
1. **Empresa / cliente** — quer ver o que você entrega e como chamar.
2. **Recrutador técnico** — quer stack, código aberto e consistência.
3. **Par / dev** — quer ver como foi feito.

## 3. Direção criativa

**O conceito: atravessar o sistema por dentro.** A página inteira é uma viagem em
profundidade — uma estrutura de pontos e linhas em perspectiva que avança conforme a
rolagem, como se a câmera entrasse no sistema. Cada projeto é uma parada nessa viagem:
a seção "gruda" na tela (sticky) e a animação do projeto acontece **no ritmo da sua
rolagem**, não sozinha. Rolar é dirigir.

As analogias de cada projeto são as mesmas aprovadas no motion v4, agora animadas e
controladas pelo scroll:

| Projeto | Analogia na tela | Cor |
|---|---|---|
| Atendo | conversa chegando + o recibo de custo aparecendo | âmbar |
| BodyFlow | mensagem de texto virando anéis de macros | verde |
| Widgetok | widgets ocupando os cantos de uma tela 9:16 | roxo |
| Palco | peças caindo com física e empilhando | rosa |
| GiftCraft | presente do TikTok virando bloco no Minecraft | ciano |

**Regra de texto, herdada do que já foi reprovado antes:** nada de slogan, frase de
efeito, pergunta retórica ou "dor do cliente". Cada projeto tem nome, uma etiqueta
seca (o que é), a stack e, quando público, o link. A imersão vem do movimento, não de
adjetivo.

**Paleta e tipografia** são as mesmas da marca já usada no LinkedIn (banner, capas e
foto de perfil), para o site parecer a mesma pessoa:

- fundo `#050a16` → `#0a1630` · azul `#2f6bff` · ciano `#38bdf8` · texto `#e8eefc` / `#9fb3d6`
- Space Grotesk (títulos) + Inter (corpo)

## 4. Estrutura da página

1. **Entrada** — nome, a linha factual do LinkedIn, foto, e o convite a rolar. O nome
   recua na profundidade quando a rolagem começa.
2. **Projetos** — cinco paradas sticky (Atendo, BodyFlow, Widgetok, Palco, GiftCraft).
3. **Como é feito** — a stack real, acendendo conforme entra na tela. Sem adjetivo.
4. **Trajetória** — marcos factuais (2019 primeiro código · 2020 começo na área · hoje).
5. **Contato** — e-mail (com botão de copiar), LinkedIn, GitHub.

## 5. Decisões técnicas

| Decisão | Por quê |
|---|---|
| **Zero dependência** (sem React, sem three.js, sem CDN) | GitHub Pages serve arquivo estático; biblioteca externa é risco de quebrar e peso de carregamento. Tudo é HTML + CSS + JS próprio. |
| Cena de fundo em **canvas 2D com projeção de perspectiva própria** | Dá a sensação 3D de voo com ~100 linhas e roda liso em celular; WebGL seria mais pesado sem ganho visível aqui. |
| Animação dos projetos em **DOM + CSS dirigido por variável `--p`** | O JS só calcula o progresso da rolagem (0 a 1) e escreve numa custom property; o CSS faz o resto. Acessível, leve e fácil de ajustar. |
| **Fontes auto-hospedadas** | Sem chamada ao Google em cada visita: mais rápido e sem depender de terceiro. |
| `prefers-reduced-motion` respeitado | Quem desliga animação no sistema recebe a versão estática, com todo o conteúdo. |
| Imagens em **WebP** | A foto saiu de 1,2 MB para 49 KB. |

**Orçamento de performance:** página inicial abaixo de 400 KB, primeira pintura em menos
de 1 s em 4G, 60 fps na rolagem.

## 6. O que fica de fora (de propósito)

- **Formulário de contato** — exige servidor ou serviço de terceiro; e-mail direto
  resolve e não quebra.
- **Blog** — só faz sentido com ritmo de publicação; hoje o conteúdo mora no LinkedIn.
- **Jogo da memória** (existia no site antigo) — distrai do objetivo de venda.
- **Nome de cliente** — todo trabalho de cliente aparece anônimo, por regra.
- **Instagram/TikTok** — as contas são de outro assunto (fitness); o site aponta para
  LinkedIn, GitHub e e-mail.

## 7. Fatos usados (confirmar antes de publicar)

Só entrou no site o que está confirmado:

- Programa desde **2019**; trabalha na área desde **2020**.
- Projetos próprios: Atendo, BodyFlow, Widgetok, Palco, GiftCraft.
- BodyFlow **usa IA** (registra refeição, acompanha treino, ajusta dieta).
- Contato público: `contato.felipebragaduarte@gmail.com`.
- Linha de apresentação: a mesma do título do LinkedIn.

**A confirmar com você:** formação atual (o site de 2024 cita Engenharia de Software —
segue valendo?), se entra alguma linha sobre atendimento a empresas (PJ) e se o repo
antigo deve redirecionar para o novo endereço.

## 8. Próximos passos

1. Publicar o repositório `obragaa.github.io` (device flow, como nos outros projetos).
2. Ligar o Pages (branch `main`, pasta raiz) e conferir o endereço.
3. Trocar o link no README do perfil e no LinkedIn.
4. Depois: screenshots reais dos projetos rodando para dentro das molduras, e a versão
   em inglês.
