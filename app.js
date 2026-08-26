let itens = JSON.parse(localStorage.getItem("itens")) || [];
let orcamento = parseFloat(localStorage.getItem("orcamento")) || 0;
let timestamp = localStorage.getItem("timestamp") || "";
let catalogo = JSON.parse(localStorage.getItem("catalogo")) || {};

// Ordem "física" sugerida de categorias (ajuste conforme o layout do seu mercado)
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
function normalizar(nome) {
  return nome.trim().replace(/\s+/g, " ").toLowerCase();
}

function limparNome(nome) {
  return nome.trim().replace(/\s+/g, " ");
}

// ===== STORAGE =====
function salvar() {
  localStorage.setItem("itens", JSON.stringify(itens));
  localStorage.setItem("orcamento", orcamento);
  localStorage.setItem("catalogo", JSON.stringify(catalogo));

  const now = new Date().toLocaleString();
  localStorage.setItem("timestamp", now);
  timestamp = now;
}

// ===== CATÁLOGO =====
// Guarda, por produto, o último preço, categoria e quantas vezes já foi comprado.
// É a base de dados que alimenta autocomplete, alerta de preço e sugestões.
function atualizarCatalogo(item) {
  const chave = normalizar(item.nome);
  const anterior = catalogo[chave];

  catalogo[chave] = {
    nome: item.nome,
    ultimoPreco: item.preco,
    categoria: item.categoria || (anterior ? anterior.categoria : null),
    vezesComprado: (anterior?.vezesComprado || 0) + 1
  };
}

// ===== ORÇAMENTO =====
function setOrcamento() {
  orcamento = parseFloat(document.getElementById("orcamento").value);
  salvar();
  render();
}

function calcularVariacao(nome, precoNovo) {
  const chave = normalizar(nome);
  const anterior = catalogo[chave];
  if (!anterior) return null;

  const diff = precoNovo - anterior.ultimoPreco;
  if (Math.abs(diff) < 0.01) return null;

  return {
    valor: diff,
    texto: (diff > 0 ? "🔺 +R$ " : "🔻 -R$ ") + Math.abs(diff).toFixed(2) + " vs última compra"
  };
}

function popularDatalist() {
  const dl = document.getElementById("sugestoes-produtos");
  dl.innerHTML = Object.values(catalogo)
    .map(i => `<option value="${i.nome}">`)
    .join("");
}

// Preenche preço/categoria automaticamente ao digitar um nome já conhecido
function preencherAuto() {
  const nomeInput = document.getElementById("nome");
  const precoInput = document.getElementById("preco");
  const categoriaInput = document.getElementById("categoria");

  const chave = normalizar(nomeInput.value);
  const item = catalogo[chave];

  const hint = document.getElementById("hint-produto");

  if (item) {
    if (!precoInput.value) precoInput.value = item.ultimoPreco;
    if (!categoriaInput.value && item.categoria) categoriaInput.value = item.categoria;
    hint.innerText = `🔁 comprado ${item.vezesComprado}x antes · último preço R$ ${item.ultimoPreco.toFixed(2)}`;
    hint.style.display = "block";
  } else {
    hint.style.display = "none";
  }
}

// ===== COMPRA =====
function addItem() {
  const nomeInput = document.getElementById("nome");
  const precoInput = document.getElementById("preco");
  const quantidadeInput = document.getElementById("quantidade");
  const categoriaInput = document.getElementById("categoria");

  const nome = limparNome(nomeInput.value);
  const preco = parseFloat(precoInput.value);
  const quantidade = parseInt(quantidadeInput.value);
  const categoria = categoriaInput.value.trim();

  if (!nome || isNaN(preco) || isNaN(quantidade)) return;

  const variacao = calcularVariacao(nome, preco);

  const novoItem = {
    nome,
    preco,
    quantidade,
    categoria: categoria || null,
    variacao: variacao ? variacao.texto : null
  };

  itens.push(novoItem);
  atualizarCatalogo(novoItem);

  // 🔥 LIMPAR CAMPOS (aqui está o ganho real)
  nomeInput.value = "";
  precoInput.value = "";
  quantidadeInput.value = "";
  categoriaInput.value = "";
  document.getElementById("hint-produto").style.display = "none";

  // opcional: focar no primeiro campo automaticamente
  nomeInput.focus();

  salvar();
  render();
}

function remover(i) {
  itens.splice(i, 1);
  salvar();
  render();
}

// Adiciona rapidamente um item sugerido (a partir do catálogo) com qtd = 1
function adicionarSugestao(chave) {
  const item = catalogo[chave];
  if (!item) return;

  itens.push({
    nome: item.nome,
    preco: item.ultimoPreco,
    quantidade: 1,
    categoria: item.categoria || null,
    variacao: null
  });

  atualizarCatalogo(item);
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
    <div class="chip" onclick="adicionarSugestao('${chave}')">
      + ${i.nome} <span class="chip-preco">R$ ${i.ultimoPreco.toFixed(2)}</span>
    </div>
  `).join("");
}

// ===== EXPORT / IMPORT =====
function exportar() {
  const data = { itens, orcamento, timestamp };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "feira-backup.json";
  a.click();
}

function importar(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function() {
    try {
      const data = JSON.parse(reader.result);

      itens = data.itens || [];
      orcamento = data.orcamento || 0;

      salvar();
      render();
    } catch {
      alert("Arquivo inválido");
    }
  };

  reader.readAsText(file);
}

// ===== RESET =====
function resetar() {
  if (!confirm("Apagar tudo?")) return;

  itens = [];
  orcamento = 0;

  salvar();
  render();
}

// ===== RENDER =====
function render() {
  document.getElementById("timestamp").innerText =
    "Última atualização: " + (timestamp || "—");

  let total = 0;
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  // agrupar por categoria, respeitando a ordem "física" do mercado
  const grupos = {};
  itens.forEach((item, i) => {
    const cat = item.categoria || "Outros";
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push({ ...item, index: i });
  });

  const categoriasOrdenadas = Object.keys(grupos).sort((a, b) => {
    const ia = ORDEM_CATEGORIAS.indexOf(a);
    const ib = ORDEM_CATEGORIAS.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  categoriasOrdenadas.forEach(cat => {
    lista.innerHTML += `<div class="categoria-titulo">${cat}</div>`;

    grupos[cat].forEach(item => {
      const sub = item.preco * item.quantidade;
      total += sub;

      lista.innerHTML += `
        <div class="item">
          <div class="item-top">
            <div>${item.nome} x${item.quantidade}</div>
            <div>R$ ${sub.toFixed(2)}</div>
            <div class="remover" onclick="remover(${item.index})">❌</div>
          </div>
          ${item.variacao ? `<div class="variacao">${item.variacao}</div>` : ""}
        </div>
      `;
    });
  });

  document.getElementById("total").innerText = total.toFixed(2);

  if (orcamento > 0) {
    const p = (total / orcamento) * 100;
    const bar = document.getElementById("progress");

    bar.style.width = p + "%";

    if (p < 70) bar.style.background = "green";
    else if (p < 100) bar.style.background = "orange";
    else bar.style.background = "red";
  }

  popularDatalist();
  renderSugestoes();
}

// ===== PWA =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

render();
