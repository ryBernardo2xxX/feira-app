// ===== ESTADO =====
let itens = carregarJSON("itens", []);
let orcamento = parseFloat(localStorage.getItem("orcamento")) || 0;
let timestamp = localStorage.getItem("timestamp") || "";
let catalogo = carregarJSON("catalogo", {});
let historicoFeiras = carregarJSON("historicoFeiras", []);
let itemEmEdicao = null;

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

// ===== HELPERS =====
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

function normalizar(nome) {
  return String(nome ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function limparNome(nome) {
  return String(nome ?? "").trim().replace(/\s+/g, " ");
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function dinheiro(valor) {
  return Number(valor || 0).toFixed(2);
}

function itemEhPendente(item) {
  return item.status === "pendente";
}

function garantirEstruturaItem(item) {
  const chave = normalizar(item.nome);
  const entradaCatalogo = catalogo[chave];
  const status = item.status === "pendente" ? "pendente" : "confirmado";
  const precoOriginal = Number(item.preco);
  const temPreco = Number.isFinite(precoOriginal) && precoOriginal > 0;
  const precoEstimado = status === "pendente" && !temPreco && !!entradaCatalogo;

  return {
    id: item.id || novoId(),
    nome: limparNome(item.nome),
    preco: temPreco ? precoOriginal : (precoEstimado ? Number(entradaCatalogo.ultimoPreco) : 0),
    quantidade: Number.isFinite(Number(item.quantidade)) && Number(item.quantidade) > 0 ? Number(item.quantidade) : 1,
    categoria: item.categoria || (entradaCatalogo?.categoria || null),
    status,
    precoEstimado: status === "pendente" ? (item.precoEstimado ?? precoEstimado) : false,
    variacao: status === "confirmado" ? (item.variacao || null) : null
  };
}

itens = Array.isArray(itens) ? itens.map(garantirEstruturaItem).filter(i => i.nome) : [];
historicoFeiras = Array.isArray(historicoFeiras) ? historicoFeiras.map(normalizarHistorico) : [];

function normalizarHistorico(feira) {
  return {
    data: feira?.data || "",
    itens: Array.isArray(feira?.itens)
      ? feira.itens.map(item => ({
          ...garantirEstruturaItem({ ...item, status: "confirmado", precoEstimado: false }),
          status: "confirmado",
          precoEstimado: false,
          variacao: item.variacao || null
        }))
      : [],
    total: Number(feira?.total) || 0,
    orcamento: Number(feira?.orcamento) || 0
  };
}

// ===== STORAGE =====
function salvar() {
  localStorage.setItem("itens", JSON.stringify(itens));
  localStorage.setItem("orcamento", String(orcamento));
  localStorage.setItem("catalogo", JSON.stringify(catalogo));
  localStorage.setItem("historicoFeiras", JSON.stringify(historicoFeiras));

  const now = new Date().toLocaleString();
  localStorage.setItem("timestamp", now);
  timestamp = now;
}

// ===== CATÁLOGO =====
// O catálogo representa compras confirmadas. Itens pendentes nunca alteram suas estatísticas.
function reconstruirCatalogo() {
  const novoCatalogo = {};

  const registrarCompra = item => {
    if (itemEhPendente(item) || !item.nome || !(Number(item.preco) > 0)) return;

    const chave = normalizar(item.nome);
    const anterior = novoCatalogo[chave];

    novoCatalogo[chave] = {
      nome: item.nome,
      ultimoPreco: Number(item.preco),
      categoria: item.categoria || anterior?.categoria || null,
      vezesComprado: (anterior?.vezesComprado || 0) + 1
    };
  };

  // Histórico está do mais recente para o mais antigo; aplicamos do antigo para o novo.
  [...historicoFeiras].reverse().forEach(feira => {
    feira.itens.forEach(registrarCompra);
  });

  // A feira atual ainda não foi arquivada, mas seus itens confirmados já podem alimentar o catálogo.
  itens.forEach(registrarCompra);

  catalogo = novoCatalogo;
}

// ===== ORÇAMENTO =====
function setOrcamento() {
  const valor = parseFloat(document.getElementById("orcamento").value);
  orcamento = Number.isFinite(valor) && valor >= 0 ? valor : 0;
  salvar();
  render();
}

function calcularVariacao(nome, precoNovo, ignorarPrecoAtual = false) {
  const chave = normalizar(nome);
  const anterior = catalogo[chave];
  if (!anterior) return null;

  const diff = precoNovo - anterior.ultimoPreco;
  if (Math.abs(diff) < 0.01 || (ignorarPrecoAtual && Math.abs(diff) < 0.01)) return null;

  return {
    valor: diff,
    texto: (diff > 0 ? "🔺 +R$ " : "🔻 -R$ ") + Math.abs(diff).toFixed(2) + " vs última compra"
  };
}

function popularDatalist() {
  const dl = document.getElementById("sugestoes-produtos");
  dl.innerHTML = Object.values(catalogo)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map(i => `<option value="${escaparHTML(i.nome)}">`)
    .join("");
}

function preencherAuto() {
  const nomeInput = document.getElementById("nome");
  const precoInput = document.getElementById("preco");
  const categoriaInput = document.getElementById("categoria");
  const hint = document.getElementById("hint-produto");

  const chave = normalizar(nomeInput.value);
  const item = catalogo[chave];

  if (!item) {
    hint.innerText = nomeInput.value.trim()
      ? "🆕 Produto novo: preço e categoria ainda não cadastrados."
      : "";
    hint.className = "hint hint-novo";
    hint.style.display = nomeInput.value.trim() ? "block" : "none";
    return;
  }

  // O último preço não é colocado no campo automaticamente.
  // Assim, digitar apenas o nome continua criando um lembrete pendente.
  if (!categoriaInput.value && item.categoria) categoriaInput.value = item.categoria;

  hint.innerText = `🔁 comprado ${item.vezesComprado}x antes · último preço R$ ${dinheiro(item.ultimoPreco)}`;
  hint.className = "hint";
  hint.style.display = "block";
}

// ===== FORMULÁRIO / EDIÇÃO =====
function resetarFormulario() {
  itemEmEdicao = null;
  document.getElementById("nome").value = "";
  document.getElementById("preco").value = "";
  document.getElementById("quantidade").value = "";
  document.getElementById("categoria").value = "";
  document.getElementById("hint-produto").style.display = "none";
  document.getElementById("form-titulo").innerText = "Adicionar item";
  document.getElementById("botao-form").innerText = "Adicionar";
  document.getElementById("botao-cancelar").style.display = "none";
}

function iniciarEdicao(id) {
  const item = itens.find(i => i.id === id);
  if (!item) return;

  itemEmEdicao = id;
  document.getElementById("nome").value = item.nome;
  document.getElementById("preco").value = itemEhPendente(item) ? "" : item.preco;
  document.getElementById("quantidade").value = item.quantidade;
  document.getElementById("categoria").value = item.categoria || "";
  document.getElementById("form-titulo").innerText = "Editar item";
  document.getElementById("botao-form").innerText = "Salvar alteração";
  document.getElementById("botao-cancelar").style.display = "block";

  const catalogado = catalogo[normalizar(item.nome)];
  const hint = document.getElementById("hint-produto");

  if (catalogado) {
    hint.innerText = itemEhPendente(item)
      ? `💡 Último preço conhecido: R$ ${dinheiro(catalogado.ultimoPreco)}. Informe o preço atual para confirmar a compra.`
      : `🔁 comprado ${catalogado.vezesComprado}x antes · último preço R$ ${dinheiro(catalogado.ultimoPreco)}`;
    hint.className = "hint";
    hint.style.display = "block";
  } else if (itemEhPendente(item)) {
    hint.innerText = "🆕 Produto novo: informe o preço quando encontrar no mercado.";
    hint.className = "hint hint-novo";
    hint.style.display = "block";
  }

  document.getElementById("nome").focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelarEdicao() {
  resetarFormulario();
}

function salvarItemDoFormulario() {
  const nomeInput = document.getElementById("nome");
  const precoInput = document.getElementById("preco");
  const quantidadeInput = document.getElementById("quantidade");
  const categoriaInput = document.getElementById("categoria");

  const nome = limparNome(nomeInput.value);
  const precoInformado = precoInput.value.trim() !== "" ? parseFloat(precoInput.value) : NaN;
  const quantidadeInformada = quantidadeInput.value.trim() !== "" ? parseInt(quantidadeInput.value, 10) : 1;
  const categoriaInformada = limparNome(categoriaInput.value);

  if (!nome) {
    alert("Informe o nome do produto.");
    nomeInput.focus();
    return;
  }

  if (!Number.isFinite(quantidadeInformada) || quantidadeInformada <= 0) {
    alert("A quantidade deve ser maior que zero.");
    quantidadeInput.focus();
    return;
  }

  if (precoInput.value.trim() !== "" && (!Number.isFinite(precoInformado) || precoInformado <= 0)) {
    alert("Informe um preço válido maior que zero.");
    precoInput.focus();
    return;
  }

  const categoria = categoriaInformada || catalogo[normalizar(nome)]?.categoria || null;
  const confirmado = Number.isFinite(precoInformado) && precoInformado > 0;
  const catalogoAnterior = catalogo[normalizar(nome)];

  if (itemEmEdicao) {
    const index = itens.findIndex(i => i.id === itemEmEdicao);
    if (index === -1) {
      resetarFormulario();
      return;
    }

    const anterior = itens[index];
    const variacao = confirmado
      ? calcularVariacao(nome, precoInformado)
      : null;

    itens[index] = {
      ...anterior,
      nome,
      preco: confirmado ? precoInformado : (catalogoAnterior?.ultimoPreco || anterior.preco || 0),
      quantidade: quantidadeInformada,
      categoria,
      status: confirmado ? "confirmado" : "pendente",
      precoEstimado: confirmado ? false : !!catalogoAnterior,
      variacao: confirmado ? (variacao?.texto || null) : null
    };
  } else {
    const novoItem = {
      id: novoId(),
      nome,
      preco: confirmado ? precoInformado : (catalogoAnterior?.ultimoPreco || 0),
      quantidade: quantidadeInformada,
      categoria,
      status: confirmado ? "confirmado" : "pendente",
      precoEstimado: !confirmado && !!catalogoAnterior,
      variacao: confirmado ? (calcularVariacao(nome, precoInformado)?.texto || null) : null
    };

    itens.push(novoItem);
  }

  reconstruirCatalogo();
  resetarFormulario();
  salvar();
  render();
}

// ===== AÇÕES DA LISTA =====
function remover(id) {
  itens = itens.filter(item => item.id !== id);
  reconstruirCatalogo();
  salvar();
  render();
}

function adicionarSugestao(chave) {
  const item = catalogo[chave];
  if (!item) return;

  itens.push({
    id: novoId(),
    nome: item.nome,
    preco: item.ultimoPreco,
    quantidade: 1,
    categoria: item.categoria || null,
    status: "pendente",
    precoEstimado: true,
    variacao: null
  });

  salvar();
  render();
}

// ===== SUGESTÕES DE LISTA =====
function renderSugestoes() {
  const box = document.getElementById("sugestoesLista");
  const jaNaLista = new Set(itens.map(i => normalizar(i.nome)));

  const sugestoes = Object.entries(catalogo)
    .filter(([chave, i]) => i.vezesComprado >= 2 && !jaNaLista.has(chave))
    .sort((a, b) => b[1].vezesComprado - a[1].vezesComprado)
    .slice(0, 12);

  if (sugestoes.length === 0) {
    box.innerHTML = "<p class='vazio'>Compre algumas vezes para ver sugestões automáticas aqui.</p>";
    return;
  }

  box.innerHTML = sugestoes.map(([chave, i]) => `
    <button class="chip" onclick="adicionarSugestao('${escaparHTML(chave)}')">
      + ${escaparHTML(i.nome)} <span class="chip-preco">R$ ${dinheiro(i.ultimoPreco)}</span>
    </button>
  `).join("");
}

// ===== TOTAIS =====
function calcularTotais() {
  return itens.reduce((acc, item) => {
    const subtotal = Number(item.preco || 0) * Number(item.quantidade || 0);
    acc.total += subtotal;
    if (itemEhPendente(item)) acc.estimado += subtotal;
    else acc.confirmado += subtotal;
    if (itemEhPendente(item)) acc.pendentes += 1;
    return acc;
  }, { total: 0, estimado: 0, confirmado: 0, pendentes: 0 });
}

// ===== EXPORT / IMPORT =====
function exportar() {
  const data = {
    versaoDados: 2,
    itens,
    orcamento,
    timestamp,
    catalogo,
    historicoFeiras
  };

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

  reader.onload = function() {
    try {
      const data = JSON.parse(reader.result);

      itens = Array.isArray(data.itens)
        ? data.itens.map(garantirEstruturaItem).filter(i => i.nome)
        : [];
      orcamento = Number(data.orcamento) || 0;
      historicoFeiras = Array.isArray(data.historicoFeiras)
        ? data.historicoFeiras.map(normalizarHistorico)
        : [];

      // O catálogo passa a ser derivado de compras confirmadas.
      reconstruirCatalogo();

      resetarFormulario();
      salvar();
      render();
      alert("Importado com sucesso!");
    } catch {
      alert("Arquivo inválido");
    }
  };

  reader.readAsText(file);
  e.target.value = "";
}

// ===== FINALIZAR FEIRA =====
function finalizarFeira() {
  if (itens.length === 0) {
    alert("Adicione itens antes de finalizar a feira.");
    return;
  }

  const pendentes = itens.filter(itemEhPendente);
  const mensagem = pendentes.length
    ? `Ainda existem ${pendentes.length} item(ns) pendente(s). Apenas os itens confirmados serão arquivados; os pendentes permanecerão na lista.\n\nDeseja finalizar?`
    : "Finalizar esta feira? Ela será salva no histórico e a lista atual será limpa.";

  if (!confirm(mensagem)) return;

  const confirmados = itens.filter(item => !itemEhPendente(item));

  if (confirmados.length > 0) {
    const totalConfirmado = confirmados.reduce((s, i) => s + i.preco * i.quantidade, 0);
    historicoFeiras.unshift({
      data: new Date().toLocaleString(),
      itens: confirmados.map(item => ({ ...item, status: "confirmado", precoEstimado: false })),
      total: Number(totalConfirmado.toFixed(2)),
      orcamento
    });
    historicoFeiras = historicoFeiras.slice(0, 20);
  }

  itens = pendentes;
  reconstruirCatalogo();
  salvar();
  render();
}

// ===== RESET TOTAL =====
function resetar() {
  if (!confirm("Isso vai apagar TUDO, incluindo catálogo e histórico. Tem certeza?")) return;

  itens = [];
  orcamento = 0;
  catalogo = {};
  historicoFeiras = [];
  resetarFormulario();
  salvar();
  render();
}

// ===== HISTÓRICO =====
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
      <div class="categoria">${f.itens.length} itens confirmados</div>
    </div>
  `).join("");
}

// ===== RENDER =====
function render() {
  document.getElementById("timestamp").innerText =
    "Última atualização: " + (timestamp || "—");

  document.getElementById("orcamento").value = orcamento || "";

  const totais = calcularTotais();
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  const resumo = document.getElementById("resumoLista");
  if (itens.length === 0) {
    resumo.innerHTML = "<span>Nenhum item na lista.</span>";
  } else {
    resumo.innerHTML = `
      <span><strong>${itens.length}</strong> item(ns)</span>
      ${totais.pendentes ? `<span class="resumo-pendente">${totais.pendentes} pendente(s)</span>` : ""}
    `;
  }

  const grupos = {};
  itens.forEach(item => {
    const cat = item.categoria || "Outros";
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(item);
  });

  const categoriasOrdenadas = Object.keys(grupos).sort((a, b) => {
    const ia = ORDEM_CATEGORIAS.indexOf(a);
    const ib = ORDEM_CATEGORIAS.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  categoriasOrdenadas.forEach(cat => {
    lista.innerHTML += `<div class="categoria-titulo">${escaparHTML(cat)}</div>`;

    grupos[cat].forEach(item => {
      const sub = Number(item.preco || 0) * Number(item.quantidade || 0);
      const pendente = itemEhPendente(item);
      const conhecido = !!catalogo[normalizar(item.nome)];
      const estadoTexto = pendente
        ? (conhecido ? "🟡 Pendente · preço estimado" : "🟠 Pendente · preço ainda não cadastrado")
        : "✅ Confirmado";

      const precoExibido = sub > 0
        ? `R$ ${dinheiro(sub)}`
        : "Preço não definido";

      lista.innerHTML += `
        <div class="item ${pendente ? "item-pendente" : "item-confirmado"}">
          <div class="item-top">
            <div class="item-principal">
              <strong>${escaparHTML(item.nome)}</strong>
              <span>x${item.quantidade}</span>
            </div>
            <div class="item-subtotal ${pendente && !conhecido ? "sem-preco" : ""}">${precoExibido}</div>
          </div>
          <div class="item-meta">${estadoTexto}</div>
          ${pendente && conhecido ? `<div class="estimativa">Estimativa usando última compra: R$ ${dinheiro(item.preco)} · ajuste no mercado para confirmar.</div>` : ""}
          ${pendente && !conhecido ? `<div class="novo-produto">Este produto ainda não existe no catálogo. Informe o preço no mercado para cadastrá-lo.</div>` : ""}
          ${item.variacao ? `<div class="variacao">${escaparHTML(item.variacao)}</div>` : ""}
          <div class="item-acoes">
            <button class="botao-editar" onclick="iniciarEdicao('${item.id}')">✏️ Editar</button>
            <button class="botao-remover" onclick="remover('${item.id}')">🗑️ Remover</button>
          </div>
        </div>
      `;
    });
  });

  document.getElementById("total").innerText = dinheiro(totais.total);
  document.getElementById("totalConfirmado").innerText = dinheiro(totais.confirmado);
  document.getElementById("totalEstimado").innerText = dinheiro(totais.estimado);

  const indicadorEstimativa = document.getElementById("indicadorEstimativa");
  indicadorEstimativa.style.display = totais.estimado > 0 ? "block" : "none";

  const bar = document.getElementById("progress");
  if (orcamento > 0) {
    const percentual = (totais.total / orcamento) * 100;
    bar.style.width = Math.min(percentual, 100) + "%";
    bar.className = percentual < 70 ? "baixo" : percentual < 100 ? "medio" : "alto";
  } else {
    bar.style.width = "0%";
    bar.className = "baixo";
  }

  popularDatalist();
  renderSugestoes();
  renderHistorico();
}

// ===== PWA =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(console.error);
}

// Migra dados antigos sem alterar seu significado.
reconstruirCatalogo();
salvar();
render();
