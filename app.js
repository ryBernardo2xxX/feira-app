let itens = JSON.parse(localStorage.getItem("itens")) || [];
let orcamento = parseFloat(localStorage.getItem("orcamento")) || 0;
let timestamp = localStorage.getItem("timestamp") || "";

// ===== STORAGE =====
function salvar() {
  localStorage.setItem("itens", JSON.stringify(itens));
  localStorage.setItem("orcamento", orcamento);

  const now = new Date().toLocaleString();
  localStorage.setItem("timestamp", now);
  timestamp = now;
}

// ===== ORÇAMENTO =====
function setOrcamento() {
  orcamento = parseFloat(document.getElementById("orcamento").value);
  salvar();
  render();
}

// ===== COMPRA =====
function addItem() {
  const nomeInput = document.getElementById("nome");
  const precoInput = document.getElementById("preco");
  const quantidadeInput = document.getElementById("quantidade");
  const categoriaInput = document.getElementById("categoria");

  const nome = nomeInput.value;
  const preco = parseFloat(precoInput.value);
  const quantidade = parseInt(quantidadeInput.value);
  const categoria = categoriaInput.value;

  if (!nome || isNaN(preco) || isNaN(quantidade)) return;

  itens.push({
    nome,
    preco,
    quantidade,
    categoria: categoria || null
  });

  // 🔥 LIMPAR CAMPOS (aqui está o ganho real)
  nomeInput.value = "";
  precoInput.value = "";
  quantidadeInput.value = "";
  categoriaInput.value = "";

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

  itens.forEach((item, i) => {
    const sub = item.preco * item.quantidade;
    total += sub;

  lista.innerHTML += `
    <div class="item">
      <div class="item-top">
        <div>${item.nome} x${item.quantidade}</div>
        <div>R$ ${sub.toFixed(2)}</div>
        <div class="remover" onclick="remover(${i})">❌</div>
      </div>
      ${item.categoria ? `<div class="categoria">${item.categoria}</div>` : ""}
    </div>
  `;
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
}

// ===== PWA =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

render();
