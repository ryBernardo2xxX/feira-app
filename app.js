// =====================================================================
// ESTADO
// =====================================================================
// Modelo de dados (v3):
// - listaPrevia: itens de planejamento (podem não ter preço ainda).
//                Não entra no total do orçamento.
// - itens:       o carrinho da feira em andamento. Todo item aqui tem
//                preço confirmado e É o que conta pro orçamento.
// - catalogo:    derivado de compras confirmadas (itens do carrinho +
//                itens arquivados no histórico). Chave = nome + marca.
// =====================================================================

const ORDEM_CATEGORIAS = [
  "Hortifruti",
  "Açougue/Congelados",
  "Congelados",
  "Laticínios",
  "Mercearia",
  "Limpeza",
  "Higiene",
  "Papelaria",
  "Outros"
];

function carregarJSON(chave, padrao) {
  try {
    const valor = localStorage.getItem(chave);
    return valor ? JSON.parse(valor) : padrao;
  } catch {
    return padrao;
  }
}

function novoId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizar(valor) {
  return String(valor ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function limparNome(valor) {
  return String(valor ?? "").trim().replace(/\s+/g, " ");
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Usado para inserir valores dinâmicos dentro de onclick="...('valor')"
// (o HTML já cuida das aspas duplas via escaparHTML; isto protege as
// aspas simples do literal JavaScript dentro do atributo).
function escaparAtributoJS(valor) {
  return String(valor ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function dinheiro(valor) {
  return Number(valor || 0).toFixed(2);
}

// Identidade de um produto no catálogo: nome + marca (marca opcional).
function chaveProduto(nome, marca) {
  return `${normalizar(nome)}::${normalizar(marca || "")}`;
}

// =====================================================================
// NORMALIZAÇÃO / MIGRAÇÃO DE DADOS
// =====================================================================

function garantirItemPrevia(item) {
  const preco = Number(item.precoEstimado ?? item.preco);
  return {
    id: item.id || novoId(),
    nome: limparNome(item.nome),
    marca: item.marca ? limparNome(item.marca) : null,
    categoria: item.categoria || null,
    quantidade: Number.isFinite(Number(item.quantidade)) && Number(item.quantidade) > 0
      ? Number(item.quantidade) : 1,
    precoEstimado: Number.isFinite(preco) && preco > 0 ? preco : null
  };
}

function garantirItemCarrinho(item) {
  return {
    id: item.id || novoId(),
    nome: limparNome(item.nome),
    marca: item.marca ? limparNome(item.marca) : null,
    categoria: item.categoria || null,
    quantidade: Number.isFinite(Number(item.quantidade)) && Number(item.quantidade) > 0
      ? Number(item.quantidade) : 1,
    preco: Number(item.preco) > 0 ? Number(item.preco) : 0,
    variacao: item.variacao || null
  };
}

function normalizarItemHistorico(item) {
  return {
    nome: limparNome(item.nome),
    marca: item.marca ? limparNome(item.marca) : null,
    preco: Number(item.preco) || 0,
    quantidade: Number(item.quantidade) || 1,
    categoria: item.categoria || null
  };
}

function normalizarFeira(feira) {
  return {
    data: feira?.data || "",
    itens: Array.isArray(feira?.itens) ? feira.itens.map(normalizarItemHistorico) : [],
    total: Number(feira?.total) || 0,
    orcamento: Number(feira?.orcamento) || 0
  };
}

// Aceita três formatos de entrada:
// - v3 (atual): já tem "listaPrevia" como array próprio.
// - v2: itens tinham campo "status" ("pendente"/"confirmado").
// - v1: itens sem "status" nenhum (tudo era considerado comprado).
// Em todos os casos, devolve sempre o formato v3.
function migrarParaV3(data) {
  const itensOriginais = Array.isArray(data.itens) ? data.itens : [];
  const jaEhV3 = Array.isArray(data.listaPrevia);

  let itensCarrinhoBrutos = itensOriginais;
  let listaPreviaBruta = jaEhV3 ? data.listaPrevia : [];

  if (!jaEhV3) {
    const pendentesAntigos = itensOriginais.filter(i => i.status === "pendente");
    itensCarrinhoBrutos = itensOriginais.filter(i => i.status !== "pendente");

    listaPreviaBruta = pendentesAntigos.map(i => ({
      nome: i.nome,
      marca: null,
      categoria: i.categoria,
      quantidade: i.quantidade,
      precoEstimado: Number(i.preco) > 0 ? i.preco : null
    }));
  }

  return {
    itens: itensCarrinhoBrutos.map(garantirItemCarrinho).filter(i => i.nome),
    listaPrevia: listaPreviaBruta.map(garantirItemPrevia).filter(i => i.nome),
    orcamento: Number(data.orcamento) || 0,
    timestamp: data.timestamp || "",
    historicoFeiras: Array.isArray(data.historicoFeiras) ? data.historicoFeiras.map(normalizarFeira) : []
  };
}

// =====================================================================
// CARREGAMENTO INICIAL
// =====================================================================

const dadosIniciais = migrarParaV3({
  itens: carregarJSON("itens", []),
  listaPrevia: localStorage.getItem("listaPrevia") !== null ? carregarJSON("listaPrevia", []) : undefined,
  orcamento: parseFloat(localStorage.getItem("orcamento")) || 0,
  timestamp: localStorage.getItem("timestamp") || "",
  historicoFeiras: carregarJSON("historicoFeiras", [])
});

let itens = dadosIniciais.itens;
let listaPrevia = dadosIniciais.listaPrevia;
let orcamento = dadosIniciais.orcamento;
let timestamp = dadosIniciais.timestamp;
let historicoFeiras = dadosIniciais.historicoFeiras;
let catalogo = {};

let edicaoInline = null; // { contexto: "previa" | "carrinho", id }
let ordenacao = localStorage.getItem("ordenacao") === "alfabetica" ? "alfabetica" : "padrao";
let categoriasColapsadas = carregarJSON("categoriasColapsadas", { previa: {}, carrinho: {} });

// =====================================================================
// STORAGE
// =====================================================================

function salvar() {
  localStorage.setItem("itens", JSON.stringify(itens));
  localStorage.setItem("listaPrevia", JSON.stringify(listaPrevia));
  localStorage.setItem("orcamento", String(orcamento));
  localStorage.setItem("catalogo", JSON.stringify(catalogo));
  localStorage.setItem("historicoFeiras", JSON.stringify(historicoFeiras));

  const now = new Date().toLocaleString();
  localStorage.setItem("timestamp", now);
  timestamp = now;
}

// =====================================================================
// CATÁLOGO (derivado só de compras confirmadas)
// =====================================================================

function reconstruirCatalogo() {
  const novoCatalogo = {};

  const registrarCompra = item => {
    if (!item.nome || !(Number(item.preco) > 0)) return;
    const chave = chaveProduto(item.nome, item.marca);
    const anterior = novoCatalogo[chave];

    novoCatalogo[chave] = {
      nome: item.nome,
      marca: item.marca || anterior?.marca || null,
      categoria: item.categoria || anterior?.categoria || null,
      ultimoPreco: Number(item.preco),
      vezesComprado: (anterior?.vezesComprado || 0) + 1
    };
  };

  [...historicoFeiras].reverse().forEach(feira => feira.itens.forEach(registrarCompra));
  itens.forEach(registrarCompra);

  catalogo = novoCatalogo;
}

function buscarCatalogoPorNome(nome) {
  const chaveNome = normalizar(nome);
  if (!chaveNome) return [];
  return Object.values(catalogo).filter(i => normalizar(i.nome) === chaveNome);
}

// Preço a considerar para um item da lista prévia: o que o usuário
// digitou manualmente (se digitou), senão o último preço conhecido
// no catálogo para aquele nome+marca, senão (sem marca definida) o
// preço conhecido caso exista uma única marca cadastrada pra esse nome.
function precoEstimadoAtual(itemPrevia) {
  if (Number(itemPrevia.precoEstimado) > 0) return Number(itemPrevia.precoEstimado);

  const doCatalogo = catalogo[chaveProduto(itemPrevia.nome, itemPrevia.marca)];
  if (doCatalogo) return doCatalogo.ultimoPreco;

  const porNome = buscarCatalogoPorNome(itemPrevia.nome);
  if (porNome.length === 1) return porNome[0].ultimoPreco;

  return null;
}

function calcularVariacao(nome, marca, precoNovo) {
  const anterior = catalogo[chaveProduto(nome, marca)];
  if (!anterior) return null;

  const diff = precoNovo - anterior.ultimoPreco;
  if (Math.abs(diff) < 0.01) return null;

  return {
    valor: diff,
    texto: (diff > 0 ? "🔺 +R$ " : "🔻 -R$ ") + Math.abs(diff).toFixed(2) + " vs última compra"
  };
}

function popularDatalists() {
  const nomesUnicos = [...new Set(Object.values(catalogo).map(i => i.nome))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  document.getElementById("sugestoes-produtos").innerHTML =
    nomesUnicos.map(n => `<option value="${escaparHTML(n)}">`).join("");

  const marcasUnicas = [...new Set(Object.values(catalogo).map(i => i.marca).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  document.getElementById("sugestoes-marcas").innerHTML =
    marcasUnicas.map(m => `<option value="${escaparHTML(m)}">`).join("");
}

// Dica de autocomplete no formulário de criação (não roda na edição inline,
// que já tem os campos preenchidos e datalist para digitação assistida).
function preencherAuto() {
  const nomeInput = document.getElementById("nome");
  const marcaInput = document.getElementById("marca");
  const categoriaInput = document.getElementById("categoria");
  const hint = document.getElementById("hint-produto");

  const nomeDigitado = nomeInput.value.trim();
  if (!nomeDigitado) {
    hint.style.display = "none";
    return;
  }

  const encontrados = buscarCatalogoPorNome(nomeDigitado);

  if (encontrados.length === 0) {
    hint.innerText = "🆕 Produto novo: preço e categoria ainda não cadastrados.";
    hint.className = "hint hint-novo";
    hint.style.display = "block";
    return;
  }

  if (encontrados.length === 1) {
    const item = encontrados[0];
    if (!categoriaInput.value && item.categoria) categoriaInput.value = item.categoria;
    if (!marcaInput.value && item.marca) marcaInput.value = item.marca;
    hint.innerText = `🔁 comprado ${item.vezesComprado}x antes` +
      (item.marca ? ` · marca: ${item.marca}` : "") +
      ` · último preço R$ ${dinheiro(item.ultimoPreco)}`;
    hint.className = "hint";
    hint.style.display = "block";
    return;
  }

  const opcoes = [...encontrados]
    .sort((a, b) => b.vezesComprado - a.vezesComprado)
    .map(i => `${i.marca || "sem marca"} (R$ ${dinheiro(i.ultimoPreco)})`)
    .join(", ");
  hint.innerText = `🔁 conhecido em ${encontrados.length} marcas: ${opcoes} — informe a marca para diferenciar.`;
  hint.className = "hint";
  hint.style.display = "block";
}

// =====================================================================
// ORÇAMENTO
// =====================================================================

function setOrcamento() {
  const valor = parseFloat(document.getElementById("orcamento").value);
  orcamento = Number.isFinite(valor) && valor >= 0 ? valor : 0;
  salvar();
  render();
}

// =====================================================================
// FORMULÁRIO DE CRIAÇÃO (topo) — alimenta lista prévia OU carrinho
// =====================================================================

function limparFormulario() {
  document.getElementById("nome").value = "";
  document.getElementById("marca").value = "";
  document.getElementById("preco").value = "";
  document.getElementById("quantidade").value = "";
  document.getElementById("categoria").value = "";
  document.getElementById("hint-produto").style.display = "none";
  document.getElementById("nome").focus();
}

function lerFormulario() {
  const nome = limparNome(document.getElementById("nome").value);
  const marca = limparNome(document.getElementById("marca").value) || null;
  const categoria = limparNome(document.getElementById("categoria").value) || null;

  const quantidadeValor = document.getElementById("quantidade").value.trim();
  const quantidade = quantidadeValor !== "" ? parseInt(quantidadeValor, 10) : 1;

  const precoValor = document.getElementById("preco").value.trim();
  const preco = precoValor !== "" ? parseFloat(precoValor) : NaN;

  if (!nome) {
    alert("Informe o nome do produto.");
    document.getElementById("nome").focus();
    return null;
  }
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    alert("A quantidade deve ser maior que zero.");
    document.getElementById("quantidade").focus();
    return null;
  }
  if (precoValor !== "" && (!Number.isFinite(preco) || preco <= 0)) {
    alert("Informe um preço válido maior que zero, ou deixe em branco.");
    document.getElementById("preco").focus();
    return null;
  }

  return { nome, marca, categoria, quantidade, preco: Number.isFinite(preco) ? preco : null };
}

function categoriaSugerida(nome, categoriaDigitada) {
  if (categoriaDigitada) return categoriaDigitada;
  const encontrados = buscarCatalogoPorNome(nome);
  return encontrados.length === 1 ? encontrados[0].categoria : null;
}

function adicionarAListaPrevia() {
  const dados = lerFormulario();
  if (!dados) return;

  listaPrevia.push({
    id: novoId(),
    nome: dados.nome,
    marca: dados.marca,
    categoria: categoriaSugerida(dados.nome, dados.categoria),
    quantidade: dados.quantidade,
    precoEstimado: dados.preco
  });

  limparFormulario();
  salvar();
  render();
}

function adicionarAoCarrinho() {
  const dados = lerFormulario();
  if (!dados) return;

  if (!dados.preco) {
    alert("Para ir direto ao carrinho, informe o preço. Sem preço, use 'Adicionar à lista prévia'.");
    document.getElementById("preco").focus();
    return;
  }

  const categoria = categoriaSugerida(dados.nome, dados.categoria);
  const variacao = calcularVariacao(dados.nome, dados.marca, dados.preco);

  itens.push({
    id: novoId(),
    nome: dados.nome,
    marca: dados.marca,
    categoria,
    quantidade: dados.quantidade,
    preco: dados.preco,
    variacao: variacao?.texto || null
  });

  limparFormulario();
  reconstruirCatalogo();
  salvar();
  render();
}

// =====================================================================
// MOVIMENTAÇÃO ENTRE LISTAS
// =====================================================================

function adicionarAoCarrinhoDaPrevia(id) {
  const item = listaPrevia.find(i => i.id === id);
  if (!item) return;

  const preco = precoEstimadoAtual(item);
  if (!preco || preco <= 0) {
    alert("Informe o preço deste item antes de adicionar ao carrinho.");
    iniciarEdicaoInline("previa", id);
    return;
  }

  const variacao = calcularVariacao(item.nome, item.marca, preco);

  itens.push({
    id: novoId(),
    nome: item.nome,
    marca: item.marca,
    categoria: item.categoria,
    quantidade: item.quantidade,
    preco,
    variacao: variacao?.texto || null
  });

  listaPrevia = listaPrevia.filter(i => i.id !== id);
  reconstruirCatalogo();
  salvar();
  render();
}

function moverParaListaPrevia(id) {
  const item = itens.find(i => i.id === id);
  if (!item) return;

  listaPrevia.push({
    id: novoId(),
    nome: item.nome,
    marca: item.marca,
    categoria: item.categoria,
    quantidade: item.quantidade,
    precoEstimado: item.preco
  });

  itens = itens.filter(i => i.id !== id);
  edicaoInline = null;
  reconstruirCatalogo();
  salvar();
  render();
}

function removerDaPrevia(id) {
  listaPrevia = listaPrevia.filter(i => i.id !== id);
  if (edicaoInline?.contexto === "previa" && edicaoInline.id === id) edicaoInline = null;
  salvar();
  render();
}

function removerDoCarrinho(id) {
  itens = itens.filter(i => i.id !== id);
  if (edicaoInline?.contexto === "carrinho" && edicaoInline.id === id) edicaoInline = null;
  reconstruirCatalogo();
  salvar();
  render();
}

// =====================================================================
// SUGESTÕES RÁPIDAS (agora alimentam a lista prévia, não o carrinho)
// =====================================================================

function adicionarSugestaoAPrevia(chave) {
  const item = catalogo[chave];
  if (!item) return;

  const jaPresente = [...listaPrevia, ...itens]
    .some(i => chaveProduto(i.nome, i.marca) === chave);
  if (jaPresente) return;

  listaPrevia.push({
    id: novoId(),
    nome: item.nome,
    marca: item.marca || null,
    categoria: item.categoria,
    quantidade: 1,
    precoEstimado: null // deixa em aberto pra sempre refletir o preço mais atual do catálogo
  });

  salvar();
  render();
}

function renderSugestoes() {
  const box = document.getElementById("sugestoesLista");
  const jaPresente = new Set([
    ...listaPrevia.map(i => chaveProduto(i.nome, i.marca)),
    ...itens.map(i => chaveProduto(i.nome, i.marca))
  ]);

  const sugestoes = Object.entries(catalogo)
    .filter(([chave, i]) => i.vezesComprado >= 2 && !jaPresente.has(chave))
    .sort((a, b) => b[1].vezesComprado - a[1].vezesComprado)
    .slice(0, 12);

  if (sugestoes.length === 0) {
    box.innerHTML = "<p class='vazio'>Compre alguns itens 2+ vezes para ver sugestões automáticas aqui.</p>";
    return;
  }

  box.innerHTML = sugestoes.map(([chave, i]) => `
    <button class="chip" onclick="adicionarSugestaoAPrevia('${escaparAtributoJS(chave)}')">
      + ${escaparHTML(i.nome)}${i.marca ? " (" + escaparHTML(i.marca) + ")" : ""}
      <span class="chip-preco">R$ ${dinheiro(i.ultimoPreco)}</span>
    </button>
  `).join("");
}

// =====================================================================
// EDIÇÃO INLINE
// =====================================================================

function iniciarEdicaoInline(contexto, id) {
  edicaoInline = { contexto, id };
  render();

  // rola até o card em edição, já que ele pode estar no meio de uma lista longa
  const agendar = window.requestAnimationFrame || (fn => setTimeout(fn, 0));
  agendar(() => {
    document.getElementById(`item-${contexto}-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function cancelarEdicaoInline() {
  edicaoInline = null;
  render();
}

function lerCamposEdicao(id) {
  const nome = limparNome(document.getElementById(`edit-nome-${id}`).value);
  const marca = limparNome(document.getElementById(`edit-marca-${id}`).value) || null;
  const categoria = limparNome(document.getElementById(`edit-categoria-${id}`).value) || null;

  const quantidadeValor = document.getElementById(`edit-quantidade-${id}`).value.trim();
  const quantidade = quantidadeValor !== "" ? parseInt(quantidadeValor, 10) : 1;

  const precoValor = document.getElementById(`edit-preco-${id}`).value.trim();
  const preco = precoValor !== "" ? parseFloat(precoValor) : NaN;

  if (!nome) {
    alert("Informe o nome do produto.");
    return null;
  }
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    alert("A quantidade deve ser maior que zero.");
    return null;
  }

  return { nome, marca, categoria, quantidade, precoValor, preco };
}

function salvarEdicaoPrevia(id) {
  const item = listaPrevia.find(i => i.id === id);
  if (!item) return;

  const dados = lerCamposEdicao(id);
  if (!dados) return;

  if (dados.precoValor !== "" && (!Number.isFinite(dados.preco) || dados.preco <= 0)) {
    alert("Informe um preço válido, ou deixe em branco para usar a estimativa do catálogo.");
    return;
  }

  item.nome = dados.nome;
  item.marca = dados.marca;
  item.categoria = dados.categoria;
  item.quantidade = dados.quantidade;
  item.precoEstimado = Number.isFinite(dados.preco) ? dados.preco : null;

  edicaoInline = null;
  salvar();
  render();
}

function salvarEdicaoCarrinho(id) {
  const item = itens.find(i => i.id === id);
  if (!item) return;

  const dados = lerCamposEdicao(id);
  if (!dados) return;

  if (!Number.isFinite(dados.preco) || dados.preco <= 0) {
    alert("Informe um preço válido maior que zero.");
    return;
  }

  const variacao = calcularVariacao(dados.nome, dados.marca, dados.preco);

  item.nome = dados.nome;
  item.marca = dados.marca;
  item.categoria = dados.categoria;
  item.quantidade = dados.quantidade;
  item.preco = dados.preco;
  item.variacao = variacao?.texto || null;

  edicaoInline = null;
  reconstruirCatalogo();
  salvar();
  render();
}

// =====================================================================
// CATEGORIAS: colapsar/expandir e ordenação
// =====================================================================

function toggleCategoria(contexto, categoria) {
  if (!categoriasColapsadas[contexto]) categoriasColapsadas[contexto] = {};
  categoriasColapsadas[contexto][categoria] = !categoriasColapsadas[contexto][categoria];
  localStorage.setItem("categoriasColapsadas", JSON.stringify(categoriasColapsadas));
  render();
}

function categoriaEstaColapsada(contexto, categoria) {
  return !!categoriasColapsadas?.[contexto]?.[categoria];
}

function setOrdenacao(valor) {
  ordenacao = valor === "alfabetica" ? "alfabetica" : "padrao";
  localStorage.setItem("ordenacao", ordenacao);
  render();
}

function ordenarItens(lista) {
  if (ordenacao !== "alfabetica") return lista;
  return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function agruparPorCategoria(lista) {
  const grupos = {};
  lista.forEach(item => {
    const cat = item.categoria || "Outros";
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(item);
  });
  return grupos;
}

function categoriasOrdenadas(grupos) {
  return Object.keys(grupos).sort((a, b) => {
    const ia = ORDEM_CATEGORIAS.indexOf(a);
    const ib = ORDEM_CATEGORIAS.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

// =====================================================================
// RENDER — itens individuais
// =====================================================================

function renderEdicaoPrevia(item) {
  return `
    <div class="item item-previa item-editando" id="item-previa-${item.id}">
      <input id="edit-nome-${item.id}" value="${escaparHTML(item.nome)}" placeholder="Produto" list="sugestoes-produtos">
      <input id="edit-marca-${item.id}" value="${escaparHTML(item.marca || "")}" placeholder="Marca (opcional)" list="sugestoes-marcas">
      <input id="edit-categoria-${item.id}" value="${escaparHTML(item.categoria || "")}" placeholder="Categoria (opcional)">
      <input id="edit-quantidade-${item.id}" type="number" min="1" step="1" value="${item.quantidade}" placeholder="Quantidade">
      <input id="edit-preco-${item.id}" type="number" min="0" step="0.01" value="${item.precoEstimado ?? ""}" placeholder="Preço estimado (opcional)">
      <div class="item-acoes">
        <button class="botao-salvar" onclick="salvarEdicaoPrevia('${escaparAtributoJS(item.id)}')">💾 Salvar</button>
        <button class="botao-secundario" onclick="cancelarEdicaoInline()">✖️ Cancelar</button>
      </div>
    </div>
  `;
}

function renderEdicaoCarrinho(item) {
  return `
    <div class="item item-carrinho item-editando" id="item-carrinho-${item.id}">
      <input id="edit-nome-${item.id}" value="${escaparHTML(item.nome)}" placeholder="Produto" list="sugestoes-produtos">
      <input id="edit-marca-${item.id}" value="${escaparHTML(item.marca || "")}" placeholder="Marca (opcional)" list="sugestoes-marcas">
      <input id="edit-categoria-${item.id}" value="${escaparHTML(item.categoria || "")}" placeholder="Categoria (opcional)">
      <input id="edit-quantidade-${item.id}" type="number" min="1" step="1" value="${item.quantidade}" placeholder="Quantidade">
      <input id="edit-preco-${item.id}" type="number" min="0" step="0.01" value="${item.preco}" placeholder="Preço">
      <div class="item-acoes">
        <button class="botao-salvar" onclick="salvarEdicaoCarrinho('${escaparAtributoJS(item.id)}')">💾 Salvar</button>
        <button class="botao-secundario" onclick="cancelarEdicaoInline()">✖️ Cancelar</button>
      </div>
    </div>
  `;
}

function renderItemPrevia(item) {
  if (edicaoInline?.contexto === "previa" && edicaoInline.id === item.id) {
    return renderEdicaoPrevia(item);
  }

  const preco = precoEstimadoAtual(item);
  const precoTexto = preco
    ? `≈ R$ ${dinheiro(preco * item.quantidade)}`
    : "Preço ainda não definido";

  return `
    <div class="item item-previa" id="item-previa-${item.id}">
      <div class="item-top">
        <div class="item-principal">
          <strong>${escaparHTML(item.nome)}</strong>
          ${item.marca ? `<span class="marca">${escaparHTML(item.marca)}</span>` : ""}
          <span class="qtd">x${item.quantidade}</span>
        </div>
        <div class="item-subtotal ${preco ? "estimado" : "sem-preco"}">${precoTexto}</div>
      </div>
      <div class="item-acoes">
        <button class="botao-editar" onclick="iniciarEdicaoInline('previa','${escaparAtributoJS(item.id)}')">✏️ Editar</button>
        <button class="botao-carrinho" onclick="adicionarAoCarrinhoDaPrevia('${escaparAtributoJS(item.id)}')">🛒 Ao carrinho</button>
        <button class="botao-remover" onclick="removerDaPrevia('${escaparAtributoJS(item.id)}')">🗑️</button>
      </div>
    </div>
  `;
}

function renderItemCarrinho(item) {
  if (edicaoInline?.contexto === "carrinho" && edicaoInline.id === item.id) {
    return renderEdicaoCarrinho(item);
  }

  const sub = Number(item.preco || 0) * Number(item.quantidade || 0);

  return `
    <div class="item item-carrinho" id="item-carrinho-${item.id}">
      <div class="item-top">
        <div class="item-principal">
          <strong>${escaparHTML(item.nome)}</strong>
          ${item.marca ? `<span class="marca">${escaparHTML(item.marca)}</span>` : ""}
          <span class="qtd">x${item.quantidade}</span>
        </div>
        <div class="item-subtotal">R$ ${dinheiro(sub)}</div>
      </div>
      ${item.variacao ? `<div class="variacao">${escaparHTML(item.variacao)}</div>` : ""}
      <div class="item-acoes">
        <button class="botao-editar" onclick="iniciarEdicaoInline('carrinho','${escaparAtributoJS(item.id)}')">✏️ Editar</button>
        <button class="botao-secundario" onclick="moverParaListaPrevia('${escaparAtributoJS(item.id)}')">↩️ Lista prévia</button>
        <button class="botao-remover" onclick="removerDoCarrinho('${escaparAtributoJS(item.id)}')">🗑️</button>
      </div>
    </div>
  `;
}

// =====================================================================
// RENDER — bloco agrupado por categoria (compartilhado pelas duas listas)
// =====================================================================

function renderListaAgrupada(containerId, contexto, lista, renderItemFn, mensagemVazia) {
  const container = document.getElementById(containerId);

  if (lista.length === 0) {
    container.innerHTML = `<p class="vazio">${mensagemVazia}</p>`;
    return;
  }

  const grupos = agruparPorCategoria(lista);
  const categorias = categoriasOrdenadas(grupos);

  container.innerHTML = categorias.map(cat => {
    const colapsada = categoriaEstaColapsada(contexto, cat);
    const itensDaCategoria = ordenarItens(grupos[cat]);
    const itensHTML = colapsada ? "" : itensDaCategoria.map(renderItemFn).join("");

    return `
      <div class="categoria-bloco">
        <div class="categoria-titulo" onclick="toggleCategoria('${contexto}','${escaparAtributoJS(cat)}')">
          <span class="seta ${colapsada ? "seta-fechada" : ""}">▾</span>
          <span>${escaparHTML(cat)}</span>
          <span class="categoria-contagem">${grupos[cat].length}</span>
        </div>
        ${itensHTML}
      </div>
    `;
  }).join("");
}

// =====================================================================
// HISTÓRICO
// =====================================================================

function toggleHistorico() {
  const box = document.getElementById("historicoContainer");
  box.style.display = box.style.display === "none" ? "block" : "none";
}

function renderHistorico() {
  const box = document.getElementById("historicoContainer");

  if (historicoFeiras.length === 0) {
    box.innerHTML = "<p class='vazio'>Nenhuma feira finalizada ainda.</p>";
    return;
  }

  box.innerHTML = historicoFeiras.map(f => `
    <div class="historico-item">
      <div><strong>${escaparHTML(f.data)}</strong></div>
      <div>Total: R$ ${dinheiro(f.total)} ${f.orcamento ? "/ Orçamento: R$ " + dinheiro(f.orcamento) : ""}</div>
      <div class="categoria">${f.itens.length} itens</div>
    </div>
  `).join("");
}

// =====================================================================
// FINALIZAR FEIRA / RESET
// =====================================================================

function finalizarFeira() {
  if (itens.length === 0) {
    alert("Adicione itens ao carrinho antes de finalizar a feira.");
    return;
  }

  if (!confirm("Finalizar esta feira? Os itens do carrinho vão para o histórico e o carrinho fica vazio. A lista prévia não é afetada.")) return;

  const total = itens.reduce((s, i) => s + i.preco * i.quantidade, 0);

  historicoFeiras.unshift({
    data: new Date().toLocaleString(),
    itens: itens.map(i => ({
      nome: i.nome, marca: i.marca, preco: i.preco, quantidade: i.quantidade, categoria: i.categoria
    })),
    total: Number(total.toFixed(2)),
    orcamento
  });
  historicoFeiras = historicoFeiras.slice(0, 20);

  itens = [];
  edicaoInline = null;
  reconstruirCatalogo();
  salvar();
  render();
}

function resetar() {
  if (!confirm("Isso vai apagar TUDO: carrinho, lista prévia, catálogo e histórico. Tem certeza?")) return;

  itens = [];
  listaPrevia = [];
  orcamento = 0;
  catalogo = {};
  historicoFeiras = [];
  edicaoInline = null;

  salvar();
  render();
}

// =====================================================================
// EXPORT / IMPORT
// =====================================================================

function exportar() {
  const data = { versaoDados: 3, itens, listaPrevia, orcamento, timestamp, catalogo, historicoFeiras };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = "feira-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importar(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function () {
    try {
      const data = JSON.parse(reader.result);
      const migrado = migrarParaV3(data);

      itens = migrado.itens;
      listaPrevia = migrado.listaPrevia;
      orcamento = migrado.orcamento;
      if (migrado.timestamp) timestamp = migrado.timestamp;
      historicoFeiras = migrado.historicoFeiras;
      edicaoInline = null;

      reconstruirCatalogo();
      salvar();
      render();
      alert("Importado com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Arquivo inválido");
    }
  };

  reader.readAsText(file);
  e.target.value = "";
}

// =====================================================================
// RENDER PRINCIPAL
// =====================================================================

function render() {
  document.getElementById("timestamp").innerText = "Última atualização: " + (timestamp || "—");
  document.getElementById("orcamento").value = orcamento || "";
  document.getElementById("ordenacao").value = ordenacao;

  const totalCarrinho = itens.reduce((s, i) => s + Number(i.preco || 0) * Number(i.quantidade || 0), 0);
  document.getElementById("total").innerText = dinheiro(totalCarrinho);

  const bar = document.getElementById("progress");
  if (orcamento > 0) {
    const p = (totalCarrinho / orcamento) * 100;
    bar.style.width = Math.min(p, 100) + "%";
    bar.className = p < 70 ? "baixo" : p < 100 ? "medio" : "alto";
  } else {
    bar.style.width = "0%";
    bar.className = "baixo";
  }

  const totalEstimadoPrevia = listaPrevia.reduce((s, i) => s + (precoEstimadoAtual(i) || 0) * i.quantidade, 0);
  document.getElementById("totalPrevia").innerText = dinheiro(totalEstimadoPrevia);

  document.getElementById("resumoCarrinho").innerText =
    itens.length ? `${itens.length} item(ns) no carrinho` : "Carrinho vazio";
  document.getElementById("resumoPrevia").innerText =
    listaPrevia.length ? `${listaPrevia.length} item(ns) na lista prévia` : "Lista prévia vazia";

  renderListaAgrupada(
    "listaPreviaContainer", "previa", listaPrevia, renderItemPrevia,
    "Nenhum item na lista prévia. Adicione produtos para planejar a próxima feira."
  );
  renderListaAgrupada(
    "listaCarrinhoContainer", "carrinho", itens, renderItemCarrinho,
    "Carrinho vazio. Adicione itens direto ou traga da lista prévia."
  );

  popularDatalists();
  renderSugestoes();
  renderHistorico();
}

// =====================================================================
// PWA + INICIALIZAÇÃO
// =====================================================================

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(console.error);
}

reconstruirCatalogo();
salvar();
render();
