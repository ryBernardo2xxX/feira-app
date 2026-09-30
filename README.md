# 🛒 Feira Inteligente

App de controle de orçamento e lista de compras, com catálogo de produtos, lista prévia separada do carrinho, edição inline, histórico de feiras e um módulo de hortifrúti com estimativa por peso. O projeto continua sendo uma PWA estática, adequada ao GitHub Pages e ao uso offline.

## Lista prévia vs. carrinho

O app mantém duas listas independentes:

- **Lista prévia** — planejamento. Pode conter itens sem preço confirmado e não entra no orçamento.
- **Carrinho** — compras confirmadas. É o que entra no total e na barra de orçamento.

## Hortifrúti

O módulo de hortifrúti usa uma base inicial de produtos (`hortifruti.js`) com nome, variedade e peso médio por unidade. O peso é uma referência inicial e pode ser ajustado na própria estimativa.

O preço de mercado é tratado como referência separada dos preços confirmados de compra. Cada referência pode receber:

- preço por kg;
- fonte informada pelo usuário;
- data da atualização.

A estimativa segue:

```text
peso_estimado = quantidade × peso_médio
valor_estimado = (peso_estimado / 1000) × preço_por_kg
```

O resultado aparece como **valor estimado**. Um item de hortifrúti pode ser enviado à lista prévia. Para confirmar a compra, o app pede peso real e preço real por kg; somente esses valores entram no orçamento.

As referências de preço ficam no `localStorage` e também são incluídas no backup JSON.

## Catálogo normal

O catálogo de compras continua separado do módulo de hortifrúti. Produtos normais usam preço por unidade e histórico de compras; itens hortifrúti usam peso e preço por kg. Essa separação evita comparar grandezas diferentes.

## Backup

O formato atual é `versaoDados: 4`. Backups anteriores continuam sendo migrados automaticamente. O backup novo inclui as referências de preço do hortifrúti.

## Publicação

O projeto continua adequado ao GitHub Pages e ao uso como PWA. O service worker também faz cache de `hortifruti.js`. Depois de alterar arquivos em cache, incremente a constante `CACHE` em `service-worker.js`.
