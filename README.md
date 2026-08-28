# 🛒 Feira Inteligente

App de controle de orçamento e lista de compras, com catálogo de produtos, lista prévia separada do carrinho, edição inline, marca opcional, histórico de feiras e funcionamento offline como PWA.

## O modelo: lista prévia vs. carrinho

O app trabalha com duas listas independentes:

- **Lista prévia** — planejamento. Um item aqui pode ter só o nome; preço e quantidade são estimativas (o app usa o último preço conhecido no catálogo, se houver). **Não conta no orçamento.**
- **Carrinho** — a feira em andamento de fato. Todo item aqui tem preço confirmado e **é o que conta no total e na barra de orçamento**.

Fluxo típico:

1. Em casa, monte a lista prévia (nome, e opcionalmente marca/categoria/quantidade). Sugestões automáticas de produtos recorrentes aparecem prontas pra adicionar com um toque.
2. No mercado, confira/ajuste o preço de cada item (edição inline, sem sair da lista) e toque em **"🛒 Ao carrinho"**. Isso confirma a compra e desconta do orçamento.
3. Itens novos, não planejados, podem ser adicionados direto ao carrinho pelo formulário do topo (basta informar o preço).
4. No fim, toque em **"✅ Finalizar feira"**: os itens do carrinho vão pro histórico e o catálogo é atualizado. A lista prévia não é afetada — o que sobrou nela continua disponível pra próxima feira.

Um item do carrinho também pode ser devolvido pra lista prévia (botão **"↩️ Lista prévia"**), caso você reconsidere uma compra sem perder o registro do item.

## Marca (opcional)

Cada item pode ter uma marca separada do nome (ex: nome "Leite", marca "Italac"). Isso é opcional — nada obriga a usar. O catálogo identifica produtos por **nome + marca**, então "Leite Italac" e "Leite Piracanjuba" viram entradas diferentes, cada uma com seu próprio histórico de preço.

Se você digitar um nome que já existe no catálogo em mais de uma marca, o app mostra as opções conhecidas (com preço de cada uma) em vez de adivinhar qual você quer.

## Edição inline

Tanto na lista prévia quanto no carrinho, o botão **"✏️ Editar"** transforma o próprio item da lista em um mini-formulário (nome, marca, categoria, quantidade, preço), sem precisar rolar até o topo da página. Isso serve tanto pra corrigir um erro de digitação rápido quanto pra completar informações que faltavam (ex: preço de um item da lista prévia, direto no mercado).

## Categorias: colapsar e ordenar

- Toque no título de uma categoria (ex: "MERCEARIA") pra recolher/expandir os itens dela. O estado fica salvo entre sessões.
- Um seletor de ordenação permite alternar entre "Como foi adicionado" e "Alfabética (A–Z)", aplicado às duas listas. A estrutura já deixa espaço para outros modos de ordenação no futuro (por preço, por categoria isolada, etc.), caso seja necessário.

## Catálogo

O catálogo é reconstruído a partir de compras confirmadas — itens do carrinho e itens arquivados no histórico. A lista prévia nunca altera o catálogo (ela é só planejamento, ainda não é uma compra real).

## Backup

O JSON exportado (`versaoDados: 3`) contém lista prévia, carrinho, orçamento, catálogo e histórico. **Backups antigos continuam funcionando**:

- Backups no formato anterior (com itens marcados como "pendente"/"confirmado") têm os pendentes convertidos automaticamente em itens de lista prévia, e os confirmados em itens de carrinho.
- Backups ainda mais antigos (sem esse campo de status) são tratados como se todos os itens já fossem confirmados — comportamento idêntico ao que tinham originalmente.

## Publicação no GitHub Pages

1. Envie os arquivos desta pasta para a raiz de um repositório.
2. Vá em **Settings → Pages**, selecione a branch `main` e a pasta `/ (root)`.
3. Acesse o endereço fornecido pelo GitHub Pages.
4. No celular, abra o endereço e use "Adicionar à tela inicial".

## Atualizando o app depois de mudanças

Sempre que `app.js`, `index.html`, `style.css`, `manifest.json` ou `icon.svg` forem alterados, suba o número da versão em `service-worker.js`:

```js
const CACHE = "feira-cache-v6"; // por exemplo
```

Isso garante que o celular baixe a versão nova em vez de continuar servindo do cache.
