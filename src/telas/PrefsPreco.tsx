import { alvoSugerido } from '../dominio/alvo'
import { brl, lerCent } from '../dominio/dinheiro'
import type { Ctx } from '../contexto'
import type { Produto } from '../dominio/tipos'

export type Prefs = { alvo: string; alts: string[] }
export type PrefsSalvas = { precoAlvoCent: number | null; alternativas: string[] }
export const prefsIniciais = (p: Produto): Prefs => ({
  alvo: p.precoAlvoCent != null ? String(p.precoAlvoCent / 100) : '',
  alts: p.alternativas,
})
export const lerPrefs = (v: Prefs): PrefsSalvas => ({
  precoAlvoCent: lerCent(v.alvo) || null,
  alternativas: v.alts,
})
const rotulo = (p: Produto) =>
  `${p.nome}${(p.unidadeBase === 'kg' ? p.variedade : p.marca) ? ` ${p.unidadeBase === 'kg' ? p.variedade : p.marca}` : ''}`

// Campos de preço-alvo e alternativas aceitas, embutidos nos editores de item.
export default function PrefsPreco({
  c,
  p,
  v,
  set,
}: {
  c: Ctx
  p: Produto
  v: Prefs
  set: (v: Prefs) => void
}) {
  const un = p.unidadeBase === 'kg' ? '/kg' : ''
  const sug = alvoSugerido(c.dados.compras, p.id)
  const opcoes = c.dados.produtos
    .filter((x) => x.id !== p.id && x.unidadeBase === p.unidadeBase && !v.alts.includes(x.id))
    .sort(
      (a, b) =>
        Number(b.categoria === p.categoria) - Number(a.categoria === p.categoria) ||
        a.nome.localeCompare(b.nome, 'pt-BR'),
    )
  return (
    <>
      <label>Preço-alvo{un} — quanto você aceita pagar</label>
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="Opcional"
        value={v.alvo}
        onChange={(e) => set({ ...v, alvo: e.target.value })}
      />
      {sug && lerCent(v.alvo) !== sug.cent && (
        <button type="button" className="chip" onClick={() => set({ ...v, alvo: String(sug.cent / 100) })}>
          Sugerido: {brl(sug.cent)}
          {un} (mediana de {sug.n} compras)
        </button>
      )}
      <label>Alternativas aceitas</label>
      {v.alts.map((id) => {
        const a = c.prod.get(id)
        return a ? (
          <button
            key={id}
            type="button"
            className="chip"
            onClick={() => set({ ...v, alts: v.alts.filter((x) => x !== id) })}
          >
            {rotulo(a)} ✕
          </button>
        ) : null
      })}
      <select value="" onChange={(e) => e.target.value && set({ ...v, alts: [...v.alts, e.target.value] })}>
        <option value="">+ Adicionar alternativa…</option>
        {opcoes.map((x) => (
          <option key={x.id} value={x.id}>
            {rotulo(x)}
          </option>
        ))}
      </select>
    </>
  )
}
