const secoes=['inicio','adicionar','lista-previa','hortifruti','carrinho','historico'];

function mostrarSecao(id){
  const secao=document.getElementById(id);
  if(!secao){console.error(`Seção "${id}" não encontrada.`);return}
  secoes.forEach(s=>{const el=document.getElementById(s);if(el)el.hidden=true});
  secao.hidden=false;
  document.querySelectorAll('.especifications button[data-secao]').forEach(b=>{
    const ativo=b.dataset.secao===id;
    b.classList.toggle('active',ativo);
    ativo?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');
  });
  window.scrollTo({top:0,behavior:'smooth'});
}

// Aviso rápido (toast)
function avisar(msg){
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.appendChild(t)}
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove('show'),1800);
}

// Envolve funções do app.js: só avisa se os dados realmente mudaram
const estado=()=>JSON.stringify([listaPrevia,itens,orcamento,hortifrutiReferencias]);
[
  ['adicionarAListaPrevia','Adicionado à lista prévia'],
  ['adicionarAoCarrinho','Adicionado ao carrinho'],
  ['adicionarHortifrutiAPrevia','Adicionado à lista prévia'],
  ['adicionarSugestaoAPrevia','Adicionado à lista prévia'],
  ['adicionarAoCarrinhoDaPrevia','Item enviado ao carrinho'],
  ['confirmarHortifrutiDaPrevia','Compra confirmada'],
  ['salvarReferenciaHortifruti','Preço/kg salvo'],
  ['setOrcamento','Orçamento salvo']
].forEach(([nome,msg])=>{
  const original=window[nome];
  if(typeof original!=='function')return;
  window[nome]=function(...args){
    const antes=estado();
    const r=original.apply(this,args);
    if(estado()!==antes)avisar(msg);
    return r;
  };
});

document.addEventListener('DOMContentLoaded',()=>mostrarSecao('inicio'));