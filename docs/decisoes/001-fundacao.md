# 001 — Fundação sync-ready (F1)

**Contexto.** A v0 era JS puro com `localStorage`, dinheiro em `number` decimal e sem testes. O plano pede paridade funcional em Vite + React + TS antes de qualquer funcionalidade nova, deixando o app pronto para sincronizar sem implementar sincronização.

**Decisões**

- Dinheiro em centavos inteiros; formatação (`Intl`, pt-BR) só na UI.
- IDs ULID (monotônicos) gerados no cliente; toda entidade tem `id, createdAt, updatedAt, deletedAt, deviceId`; remoção é soft delete.
- Catálogo, sugestões e variação de preço são projeções recalculadas de `Compra` (`reconstruirCatalogo`), nunca gravadas.
- `Compra` é editável só enquanto a feira está aberta; feira fechada é histórico imutável. O histórico não tem mais o corte de 20 feiras da v0.
- Contrato de dados = objeto `repo` (`src/dados/repo.ts`); a UI só conhece `typeof repo`. Trocar o backend = reimplementar esse objeto.
- Um único app-level `schemaVersion` (`VERSAO_DADOS = 5`) vai no backup; v1–v4 são migrados por `migrarBackup`, v5 é lido como está, versão futura é recusada.
- Migração do `localStorage` roda uma vez (flag `migradoV4`), guarda o JSON original em `meta.backupPreMigracao` e nunca apaga o `localStorage` da v0.
- CSS: reaproveitado como está (global) para garantir paridade visual; CSS Modules entram nos componentes novos da F2.
- A v0 fica em `legado/` como referência até a F2 terminar; a tag `v0-estavel` é o plano de retorno.

**Gatilho para rever.** Ramo A (sincronização): revisar o objeto `repo` e a estratégia de conflito (last-write-wins por registro, via `updatedAt`).
