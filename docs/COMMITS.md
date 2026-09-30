# Commits sugeridos

## 1. `feat(hortifruti): add produce base and weight estimator`
- adiciona `hortifruti.js` como base estática de produtos;
- adiciona nome, variedade e peso médio inicial;
- adiciona cálculo de peso estimado e valor estimado por kg;
- permite editar o peso médio usado na estimativa.

## 2. `feat(hortifruti): separate reference prices from confirmed purchases`
- salva preço de referência, fonte e data no `localStorage`;
- mantém referência de mercado separada do preço confirmado da compra;
- envia itens de hortifrúti para a lista prévia sem tratá-los como compra confirmada;
- exige peso real e preço real/kg para colocar hortifrúti no carrinho;
- calcula subtotal do carrinho por peso para itens de hortifrúti.

## 3. `refactor(storage): migrate shopping data to version 4`
- introduz `tipo: normal | hortifruti` nos itens;
- migra formatos anteriores automaticamente para o modelo v4;
- inclui referências de hortifrúti no export/import JSON;
- impede que preços por kg sejam misturados ao catálogo tradicional de preços por unidade.

## 4. `chore(pwa): update cache and remove obsolete migration utility`
- adiciona `hortifruti.js` ao cache offline;
- atualiza o cache do service worker para `v7`;
- remove `migrar-backup-antigo.py`, que era uma migração pontual fora do fluxo atual do app;
- atualiza README e manifest.
