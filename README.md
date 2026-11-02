# 🛒 Feira Inteligente

PWA offline-first de lista de compras e orçamento. Sem conta: os dados ficam só no aparelho (IndexedDB, via Dexie).

## Stack

Vite · React · TypeScript · Dexie · vite-plugin-pwa · Vitest · Playwright · GitHub Actions → GitHub Pages

## Comandos

- `npm ci` — instala
- `npm run dev` — desenvolvimento
- `npm test` — testes de lógica, migração e repositório
- `npm run lint` · `npm run format`
- `npm run build` — checagem de tipos + build (use `BASE_PATH=/nome-do-repo/` para Pages)
- `npm run e2e` — smoke test (antes: `npx playwright install chromium`)

## Estrutura

- `src/dominio` — lógica pura e testada (centavos, catálogo, hortifrúti, migração)
- `src/dados` — Dexie + repositório + migração do localStorage
- `src/telas` — UI
- `docs/decisoes` — decisões de arquitetura
- `legado/` — v0 estática, só referência (tag `v0-estavel`)

## Funcionalidades

- **Modo Mercado** (`/mercado`): tela única, letra grande; 1 toque registra o item pelo preço estimado; desfazer em vez de confirmar.
- **Despensa**: avisa "talvez esteja acabando" pelo ritmo de compra de cada item (a partir de 3 compras); "Não preciso" adia o aviso.
- **Preço-alvo e alternativas**: alvo sugerido pela mediana dos preços pagos; o carrinho e o Modo Mercado mostram se o preço está dentro ou acima do alvo.
- **Resumo da feira**: da lista × fora da lista e o que mudou desde a feira anterior (quantidade, preço, itens novos e deixados).
- **Compartilhar lista**: texto por categoria, via compartilhamento do sistema ou WhatsApp.

Decisões e fórmulas: `docs/decisoes/002-nucleo-de-valor.md`.

## Dados e backup

Dinheiro em centavos, IDs ULID, soft delete, `versaoDados: 6` no backup. Backups v1–v5 continuam importáveis. Na primeira abertura, os dados do `localStorage` da v0 são importados; a cópia original fica guardada e pode ser baixada em Início → Backup.

## Publicação

Settings → Pages → Source: **GitHub Actions**. O workflow define `BASE_PATH` com o nome do repositório.
