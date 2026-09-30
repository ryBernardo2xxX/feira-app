# Implementação do módulo de hortifrúti

A funcionalidade foi integrada ao modelo existente de lista prévia e carrinho.

### Estrutura do produto

A base inicial em `hortifruti.js` fornece:

- nome;
- variedade;
- peso médio por unidade.

Os preços não são fixados na base porque variam com o tempo. O usuário cadastra uma referência por kg no próprio app, junto com a fonte e a data.

### Estimativa

`peso estimado = quantidade × peso médio`

`valor estimado = (peso estimado / 1000) × preço por kg`

### Confirmação

A referência de preço nunca é tratada automaticamente como preço real da compra. Na passagem da lista prévia para o carrinho, o usuário informa o peso real e o preço real/kg. O subtotal do hortifrúti é calculado com esses valores.

### Limpeza

O script `migrar-backup-antigo.py` foi removido da raiz porque o app atual já possui migração e importação de dados internamente.

O `icon.svg` não foi alterado; mantenha o arquivo atual do seu repositório. Ele não estava presente no material fornecido para esta implementação.
