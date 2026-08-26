# 🛒 Feira Inteligente

App simples de controle de orçamento e lista de compras, com catálogo de produtos, sugestões automáticas e histórico de feiras. Funciona offline como PWA.

## Como publicar no GitHub Pages

1. Crie um repositório novo no GitHub e suba todos os arquivos desta pasta na raiz dele (não dentro de uma subpasta).
2. Vá em **Settings → Pages**.
3. Em "Source", selecione a branch `main` e a pasta `/ (root)`.
4. Salve. Em alguns minutos o app estará em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
5. No celular, abra esse link no navegador e use "Adicionar à tela inicial" (Android/Chrome) para instalar como app.

## Importando os dados da sua última feira

Este pacote já vem com o arquivo `feira-inicial.json`, gerado a partir do seu backup anterior. Ele contém:

- O **catálogo de produtos** (nome, categoria, último preço, quantas vezes já comprou) — usado para autocompletar e sugerir itens.
- A **feira anterior arquivada no histórico**, para você já começar vendo comparações de preço.

Para carregar isso no celular:

1. Abra o app publicado no GitHub Pages.
2. Na seção "💾 Backup", toque em **escolher arquivo** (o input ao lado de "Exportar JSON").
3. Selecione o arquivo `feira-inicial.json`.
4. Pronto — o app vai mostrar "Importado com sucesso!" e já vai ter o catálogo e o histórico carregados.

> Dica: depois disso, sempre que quiser levar os dados para outro aparelho, use "Exportar JSON" (que agora inclui catálogo e histórico) e importe no outro dispositivo.

## Atualizando o app depois de mudanças

Sempre que você (ou eu) alterar `app.js`, `index.html`, `style.css`, `manifest.json` ou `icon.svg`, é recomendado subir o número da versão do cache em `service-worker.js`:

```js
const CACHE = "feira-cache-v3"; // mude para v4, v5, etc.
```

Isso garante que o celular baixe a versão nova em vez de continuar usando a versão em cache.

## Observações sobre os dados migrados

Ao converter seu backup anterior, dois produtos foram identificados como possivelmente duplicados por erro de digitação e ficaram como itens separados no catálogo:

- `Cheetos assado` e `Chettos assado`
- `Peito de franfo seara` (provável erro de digitação de "frango")

Isso não quebra o app, mas significa que o autocomplete vai sugerir os dois separadamente. Se quiser, você pode simplesmente digitar o nome corrigido na próxima compra — o catálogo vai naturalmente passar a usar a versão certa com o tempo, e as ocorrências antigas continuam só no histórico.
