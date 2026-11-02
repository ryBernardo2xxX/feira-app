import { mediana } from './despensa'
import type { Compra, Produto } from './tipos'

// Preço unitário de uma compra: por kg nas pesadas, por unidade nas demais.
export const precoUnitCent = (c: Pick<Compra, 'precoCent' | 'pesoG' | 'precoKgCent'>) =>
  c.pesoG != null && c.precoKgCent != null ? c.precoKgCent : c.precoCent

// Alvo sugerido = mediana dos preços unitários já pagos (precisa de ao menos 2 compras).
export function alvoSugerido(compras: Compra[], produtoId: string, minimo = 2) {
  const ps = compras
    .filter((c) => c.produtoId === produtoId)
    .map(precoUnitCent)
    .filter((x) => x > 0)
  return ps.length >= minimo ? { cent: Math.round(mediana(ps)), n: ps.length } : null
}

export function situacaoAlvo(precoCent: number, alvoCent: number | null) {
  if (!alvoCent || alvoCent <= 0) return null
  return precoCent <= alvoCent
    ? { estado: 'dentro' as const, difCent: alvoCent - precoCent }
    : { estado: 'acima' as const, difCent: precoCent - alvoCent }
}

export function ultimoPrecoUnit(compras: Compra[], produtoId: string) {
  const cs = compras.filter((c) => c.produtoId === produtoId && precoUnitCent(c) > 0)
  if (!cs.length) return null
  const u = cs.reduce((a, b) =>
    (a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)) >= 0 ? a : b,
  )
  return precoUnitCent(u)
}

// Alternativas aceitas, com rótulo curto (só a marca quando o nome é o mesmo) e último preço pago.
export function alternativasDe(p: Produto, prod: Map<string, Produto>, compras: Compra[]) {
  return p.alternativas.flatMap((id) => {
    const a = prod.get(id)
    if (!a) return []
    const det = a.unidadeBase === 'kg' ? a.variedade : a.marca
    return [
      {
        id,
        rotulo: a.nome === p.nome ? (det ?? a.nome) : `${a.nome}${det ? ` ${det}` : ''}`,
        precoCent: ultimoPrecoUnit(compras, id),
      },
    ]
  })
}
