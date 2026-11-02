# 002 — Núcleo de valor (F2)

**Contexto.** A F1 deixou o app equivalente à v0. A F2 acrescenta o que o torna mais que uma lista de papel. Cada funcionalidade responde a uma hipótese do plano (§1) e a um sinal que a F4 vai medir.

| Funcionalidade            | Hipótese     | Sinal na F4                               | Onde está                                                   |
| ------------------------- | ------------ | ----------------------------------------- | ----------------------------------------------------------- |
| Modo Mercado              | H1           | tempo por item ≤ 10 s; feiras finalizadas | `telas/Mercado.tsx`, `telas/acoes.ts`                       |
| Despensa                  | H2           | avisos aceitos ÷ (aceitos + dispensados)  | `dominio/despensa.ts`, `telas/Despensa.tsx`                 |
| Preço-alvo e alternativas | H3           | alvo e alternativas vistos no mercado     | `dominio/alvo.ts`, `telas/Alvo.tsx`, `telas/PrefsPreco.tsx` |
| Fechamento                | H1 (insight) | resumos abertos após finalizar            | `dominio/fechamento.ts`, `telas/Fechamento.tsx`             |
| Compartilhar lista        | H4           | envios por WhatsApp ou Share              | `dominio/compartilhar.ts`, `telas/Listas.tsx`               |

Só os avisos de despensa gravam eventos (`eventosDespensa`), porque o algoritmo depende deles. Os demais contadores de uso são da F3.

**Decisões**

1. **Schema v6.** `Produto` ganha `precoAlvoCent` e `alternativas`; `Compra.foraDaLista` passa a `boolean | null` (`null` = origem desconhecida); nova tabela `eventosDespensa`. O Dexie v2 migra bancos da F1 (`dados/db.ts`); `lerBackup` sobe backups v5 e lê v6; `VERSAO_DADOS = 6`. Compras vindas da v0 são reconhecidas por `createdAt` igual ao da feira ou ao do fechamento dela (`origemDesconhecida`): o app, ao registrar, sempre grava um instante estritamente entre os dois.
2. **Alvo e alternativas ficam no produto**, não no item da lista (como esboçado no plano): o item da lista é efêmero, a preferência de preço é durável e vale nas próximas feiras. Alvo sugerido = mediana dos preços unitários já pagos (mínimo 2 compras); nos pesados o preço é por kg. "Dentro" = preço ≤ alvo; acima do alvo, o app lembra as alternativas aceitas com o último preço pago.
3. **Despensa.** Ritmo = mediana dos intervalos (em dias) entre dias de compra distintos; exige 3 dias de compra. Avisa quando os dias desde a última compra alcançam o ritmo; deixa de avisar além de 3× o ritmo (hábito interrompido) e quando o produto já está na lista ou no carrinho. "Não preciso" adia o próximo aviso para `max(ritmo, ponto da dispensa) + 25% do ritmo`; duas dispensas silenciam o ciclo; a compra seguinte encerra o ciclo e o intervalo real entra na mediana. Os eventos são um registro só de inclusão (ULID, sem conflito na futura sincronização); desfazer = soft delete do evento.
4. **Desfazer no lugar de `confirm()`.** Toast com ação (`Ctx.avisar(msg, desfazer)`) em: lista → carrinho (Modo Mercado), remover item ou compra, finalizar feira (só enquanto a nova feira estiver vazia, para não perder registros) e "Não preciso". `confirm()` só resta em "Apagar tudo".
5. **Modo Mercado** é uma rota própria (`/mercado`) sem o menu inferior: total e orçamento fixos no topo e um card por item da lista, com ação de 1 toque (preço estimado), "outro preço" e item fora da lista. No hortifrúti pede o peso real (princípio da v0: só valores reais entram no orçamento).
6. **Fechamento.** Compara com a feira fechada anterior que tenha compras. Nos produtos das duas: preço = Σ q₁·(p₁ − p₀) e quantidade = Σ (q₁ − q₀)·p₀, com p = preço médio (por kg nos pesados). Produtos só da atual são "novos"; só da anterior, "ficaram de fora". Em centavos inteiros vale sempre `diferença = quantidade + preço + novos − deixados` (testado com dados pseudoaleatórios). Texto sem julgamento; "da lista × fora da lista" só usa compras com origem conhecida.
7. **Compartilhar.** Texto agrupado por categoria na ordem do mercado, com `até R$ X` e `(pode ser: …)`. Usa Web Share quando existe, senão o link `wa.me`; também copia o texto.
8. **Interface.** Componentes novos usam CSS Modules (os tokens globais continuam valendo); o toast antigo (`#toast`) foi substituído por `Toast.tsx`. Testes de interface rodam em jsdom (`src/testes/ui.tsx`), sem dependências novas.

**Gatilhos para rever**

- Despensa: aceitos ÷ (aceitos + dispensados) abaixo de ~50% no piloto → revisar o limiar (hoje 1× o ritmo) ou exigir mais compras.
- Alvo: se ninguém definir alvo no piloto → passar a sugerir o alvo automaticamente (mediana), com opção de desligar.
- Fechamento: se quase não for aberto → trazer o resumo para dentro do Modo Mercado.
