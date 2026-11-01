import { useState } from 'react'
import { repo } from '../dados/repo'
import { buscarPorNome, limpar } from '../dominio/catalogo'
import { brl, lerCent } from '../dominio/dinheiro'
import type { Ctx } from '../contexto'

const VAZIO = { nome: '', marca: '', categoria: '', qtd: '', preco: '' }

export default function Adicionar({ c }: { c: Ctx }) {
  const [f, setF] = useState(VAZIO)
  const achados = buscarPorNome(c.catalogo, f.nome)

  function mudaNome(nome: string) {
    const e = buscarPorNome(c.catalogo, nome)
    setF((x) => ({
      ...x,
      nome,
      ...(e.length === 1
        ? { categoria: x.categoria || e[0].categoria || '', marca: x.marca || e[0].marca || '' }
        : {}),
    }))
  }
  function ler() {
    const nome = limpar(f.nome)
    if (!nome) return void alert('Informe o nome do produto.')
    const qtd = f.qtd.trim() ? parseInt(f.qtd, 10) : 1
    if (!(qtd > 0)) return void alert('A quantidade deve ser maior que zero.')
    const precoCent = lerCent(f.preco)
    if (f.preco.trim() && !(precoCent && precoCent > 0))
      return void alert('Informe um preço válido maior que zero, ou deixe em branco.')
    return { nome, marca: limpar(f.marca) || null, categoria: limpar(f.categoria) || null, qtd, precoCent }
  }
  async function paraLista() {
    const d = ler()
    if (!d) return
    await repo.adicionarItemLista(d)
    setF(VAZIO)
    c.avisar('Adicionado à lista prévia')
  }
  async function paraCarrinho() {
    const d = ler()
    if (!d) return
    if (!d.precoCent)
      return void alert(
        "Para ir direto ao carrinho, informe o preço. Sem preço, use 'Adicionar à lista prévia'.",
      )
    await repo.adicionarCompra({ ...d, precoCent: d.precoCent })
    setF(VAZIO)
    c.avisar('Adicionado ao carrinho')
  }

  return (
    <section id="adicionar" className="form-section menu-secao">
      <h2>➕ Adicionar item</h2>
      <p className="ajuda">
        Em casa: preencha o que souber e mande para a <strong>lista prévia</strong>. No mercado: confirme o
        preço e mande direto ao <strong>carrinho</strong>.
      </p>
      <input
        id="nome"
        placeholder="Produto"
        list="sugestoes-produtos"
        value={f.nome}
        onChange={(e) => mudaNome(e.target.value)}
      />
      {f.nome.trim() !== '' &&
        (achados.length === 0 ? (
          <p className="hint hint-novo">🆕 Produto novo: preço e categoria ainda não cadastrados.</p>
        ) : achados.length === 1 ? (
          <p className="hint">
            🔁 comprado {achados[0].vezes}x antes{achados[0].marca ? ` · marca: ${achados[0].marca}` : ''} ·
            último preço {brl(achados[0].ultimoPrecoCent)}
          </p>
        ) : (
          <p className="hint">
            🔁 conhecido em {achados.length} marcas:{' '}
            {[...achados]
              .sort((a, b) => b.vezes - a.vezes)
              .map((e) => `${e.marca || 'sem marca'} (${brl(e.ultimoPrecoCent)})`)
              .join(', ')}{' '}
            — informe a marca para diferenciar.
          </p>
        ))}
      <input
        id="marca"
        placeholder="Marca (opcional)"
        list="sugestoes-marcas"
        value={f.marca}
        onChange={(e) => setF({ ...f, marca: e.target.value })}
      />
      <input
        id="categoria"
        placeholder="Categoria (opcional)"
        value={f.categoria}
        onChange={(e) => setF({ ...f, categoria: e.target.value })}
      />
      <input
        id="quantidade"
        type="number"
        min="1"
        step="1"
        placeholder="Quantidade (padrão: 1)"
        value={f.qtd}
        onChange={(e) => setF({ ...f, qtd: e.target.value })}
      />
      <input
        id="preco"
        type="number"
        min="0"
        step="0.01"
        placeholder="Preço (opcional para lista prévia)"
        value={f.preco}
        onChange={(e) => setF({ ...f, preco: e.target.value })}
      />
      <div className="form-botoes">
        <button type="button" className="botao-previa" onClick={paraLista}>
          📝 Adicionar à lista prévia
        </button>
        <button type="button" className="botao-carrinho" onClick={paraCarrinho}>
          🛒 Adicionar ao carrinho
        </button>
      </div>
    </section>
  )
}
