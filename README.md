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

## Dados e backup

Dinheiro em centavos, IDs ULID, soft delete, `versaoDados: 5` no backup. Backups v1–v4 continuam importáveis. Na primeira abertura, os dados do `localStorage` da v0 são importados; a cópia original fica guardada e pode ser baixada em Início → Backup.

## Publicação

Settings → Pages → Source: **GitHub Actions**. O workflow define `BASE_PATH` com o nome do repositório.
