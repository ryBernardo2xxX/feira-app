# 🛒 Feira Inteligente

App simples de controle de orçamento e lista de compras, com catálogo de produtos, lista pré-definida, edição da lista atual, estimativas de preço, histórico de feiras e funcionamento offline como PWA.

## Como funciona a lista

Cada item da lista atual possui um estado:

- **Pendente:** é um lembrete. Pode ter apenas o nome.
- **Confirmado:** possui preço informado e entra como compra real.

Quando um item pendente já existe no catálogo, o último preço conhecido aparece como **estimativa** e entra no total planejado e na barra de orçamento. Essa estimativa não altera o catálogo nem conta como uma nova compra.

Quando o preço atual é informado na edição, o item passa a **confirmado** e o catálogo é atualizado com a nova compra.

Para um produto que ainda não existe no catálogo, a lista mostra claramente que não há preço conhecido. O item continua pendente sem inventar um valor.

## Edição

A edição acontece no mesmo formulário usado para adicionar itens. Ao tocar em **Editar** no overview:

1. Os dados do item são carregados no formulário.
2. O botão muda para **Salvar alteração**.
3. O item pode ter nome, preço, quantidade e categoria alterados.
4. Um item pendente pode continuar pendente se o preço ficar vazio.
5. Ao preencher um preço, o item passa a confirmado.

Assim, uma lista importada de um backup continua sendo uma lista realmente utilizável e editável.

## Finalizar feira

Ao finalizar:

- itens confirmados são arquivados no histórico;
- itens pendentes permanecem na lista atual para a próxima feira;
- o catálogo é reconstruído somente a partir de compras confirmadas.

## Backup

O JSON exportado contém a lista atual, orçamento, catálogo e histórico. Backups antigos continuam sendo aceitos: itens que não possuem `status` são tratados como confirmados, preservando o comportamento dos dados antigos.

## Publicação no GitHub Pages

1. Crie um repositório e envie os arquivos desta pasta para a raiz.
2. Vá em **Settings → Pages**.
3. Selecione a branch `main` e a pasta `/ (root)`.
4. Acesse o endereço fornecido pelo GitHub Pages.
5. No celular, abra o endereço e use a opção de adicionar à tela inicial.

## Atualização do PWA

Sempre que alterar `app.js`, `index.html`, `style.css`, `manifest.json` ou `icon.svg`, incremente a constante `CACHE` em `service-worker.js`, por exemplo:

```js
const CACHE = "feira-cache-v5";
```

Isso força os clientes a abandonar o cache anterior.
