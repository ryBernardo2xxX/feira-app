import { useState } from 'react'
import { repo } from '../dados/repo'
import { limpar } from '../dominio/catalogo'
import { brl, lerCent, lerNum } from '../dominio/dinheiro'
import { HORTIFRUTI_BASE, pesoKg } from '../dominio/hortifruti'
import { estimativaHorti } from '../dominio/subtotais'
import type { Ctx } from '../contexto'

export default function Hortifruti({ c }: { c: Ctx }) {
  const ref = (id: string) => c.dados.hortiRefs.find((r) => r.id === id)
  const estado = (id: string) => {
    const b = HORTIFRUTI_BASE.find((x) => x.id === id)!
    const r = ref(id)
    return {
      id,
      peso: String(b.pesoMedioG),
      preco: r ? String(r.precoKgCent / 100) : '',
      fonte: r?.fonte ?? '',
    }
  }
  const [f, setF] = useState({ ...estado(HORTIFRUTI_BASE[0].id), qtd: '1' })
  const b = HORTIFRUTI_BASE.find((x) => x.id === f.id)!
  const r = ref(f.id)
  const est = estimativaHorti(lerNum(f.qtd), lerNum(f.peso), lerCent(f.preco))

  async function salvarRef() {
    const kg = lerCent(f.preco)
    if (!kg || kg <= 0) return void alert('Informe um preço de referência por kg maior que zero.')
    const fonte = limpar(f.fonte) || 'Não informada'
    await repo.salvarHortiRef(f.id, kg, fonte)
    setF({ ...f, fonte })
    c.avisar('Preço/kg salvo')
  }
  async function adicionar() {
    const qtd = lerNum(f.qtd)
    const pm = lerNum(f.peso)
    if (!(qtd > 0)) return void alert('A quantidade deve ser maior que zero.')
    if (!(pm > 0)) return void alert('Informe um peso médio válido em gramas.')
    const kg = lerCent(f.preco)
    await repo.adicionarHortiLista({
      hortifrutiId: b.id,
      nome: b.nome,
      variedade: b.variedade,
      qtd,
      pesoMedioG: pm,
      precoKgRefCent: kg && kg > 0 ? kg : (r?.precoKgCent ?? null),
      fonte: limpar(f.fonte) || r?.fonte || null,
    })
    c.avisar('Adicionado à lista prévia')
  }

  return (
    <section id="hortifruti" className="hortifruti-section menu-secao">
      <div className="secao-cabecalho">
        <h2>🥬 Hortifrúti</h2>
      </div>
      <p className="ajuda">
        Estime o custo por peso a partir da quantidade e do peso médio. O preço aqui é uma{' '}
        <strong>referência</strong>; ele não entra no orçamento até a compra ser confirmada.
      </p>
      <select
        id="hortifruti-produto"
        aria-label="Produto de hortifrúti"
        value={f.id}
        onChange={(e) => setF({ ...estado(e.target.value), qtd: f.qtd })}
      >
        {HORTIFRUTI_BASE.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nome} — {x.variedade}
          </option>
        ))}
      </select>
      <input id="hortifruti-variedade" readOnly placeholder="Variedade" value={b.variedade} />
      <div className="hortifruti-grade">
        <div>
          <label htmlFor="hortifruti-quantidade">Quantidade</label>
          <input
            id="hortifruti-quantidade"
            type="number"
            min="1"
            step="1"
            value={f.qtd}
            onChange={(e) => setF({ ...f, qtd: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="hortifruti-peso-medio">Peso médio (g/un.)</label>
          <input
            id="hortifruti-peso-medio"
            type="number"
            min="1"
            step="1"
            value={f.peso}
            onChange={(e) => setF({ ...f, peso: e.target.value })}
          />
        </div>
      </div>
      <input
        id="hortifruti-preco-kg"
        type="number"
        min="0"
        step="0.01"
        placeholder="Preço de referência por kg"
        value={f.preco}
        onChange={(e) => setF({ ...f, preco: e.target.value })}
      />
      <input
        id="hortifruti-fonte"
        placeholder="Fonte do preço (ex.: pesquisa própria, feira local)"
        value={f.fonte}
        onChange={(e) => setF({ ...f, fonte: e.target.value })}
      />
      <p id="hortifruti-atualizado" className="hint">
        {r
          ? `Referência atualizada em ${new Date(r.updatedAt).toLocaleDateString('pt-BR')}.`
          : 'Preço de referência ainda não cadastrado.'}
      </p>
      <div className="hortifruti-resultado">
        <div>
          <span>Peso estimado</span>
          <strong id="hortifruti-peso-estimado">{est ? pesoKg(est.pesoTotalG) : '—'}</strong>
        </div>
        <div>
          <span>Valor estimado</span>
          <strong id="hortifruti-valor-estimado">{est ? brl(est.valorCent) : '—'}</strong>
        </div>
      </div>
      <p className="hortifruti-aviso">
        O tamanho real varia entre unidades. Use a média apenas para planejamento.
      </p>
      <div className="form-botoes">
        <button type="button" className="botao-secundario" onClick={salvarRef}>
          💾 Salvar preço/kg
        </button>
        <button type="button" className="botao-previa" onClick={adicionar}>
          📝 Adicionar à lista prévia
        </button>
      </div>
    </section>
  )
}
