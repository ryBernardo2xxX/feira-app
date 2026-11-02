import { subtotalCompra, totalCompras } from './subtotais'
import type { Compra, Feira } from './tipos'

type Agg = { v: number; q: number; pesado: boolean }
// Por produto: valor (centavos), quantidade (unidades; gramas nas pesadas) e se foi pesado.
const agrega = (cs: Compra[]) => {
  const m = new Map<string, Agg>()
  for (const c of cs) {
    const a = m.get(c.produtoId) ?? { v: 0, q: 0, pesado: false }
    a.v += subtotalCompra(c)
    a.q += c.pesoG ? c.pesoG : c.qtd
    a.pesado ||= !!c.pesoG
    m.set(c.produtoId, a)
  }
  return m
}

export type Mudanca = { produtoId: string; deCent: number; paraCent: number; efeitoCent: number }
export type Comparacao = {
  anteriorId: string
  anteriorTotalCent: number
  deltaCent: number
  quantidadeCent: number
  precoCent: number
  novosCent: number
  deixadosCent: number
  mudancas: Mudanca[]
}
type Parte = { cent: number; itens: number }
export type Resumo = {
  totalCent: number
  itens: number
  orcamentoCent: number
  planejado: Parte
  fora: Parte
  semOrigem: number
  comparacao: Comparacao | null
}

// Decomposição preço × quantidade (p = preço unitário médio, q = quantidade) nos produtos das duas feiras:
//   preço = Σ q1·(p1 − p0)     quantidade = Σ (q1 − q0)·p0
// Produtos só da feira atual são "novos"; só da anterior, "deixados".
// Sempre: delta = quantidade + preço + novos − deixados (exato, em centavos inteiros).
export function comparar(atual: Compra[], anterior: Compra[], anteriorId: string): Comparacao {
  const a = agrega(atual)
  const b = agrega(anterior)
  const comum = (id: string) => (a.get(id)?.q ?? 0) > 0 && (b.get(id)?.q ?? 0) > 0
  let preco = 0
  let comumA = 0
  let comumB = 0
  let novos = 0
  let deixados = 0
  const mudancas: Mudanca[] = []
  for (const [id, x] of a) {
    if (!comum(id)) {
      novos += x.v
      continue
    }
    const y = b.get(id)!
    const p0 = y.v / y.q
    const k = x.pesado ? 1000 : 1 // pesadas: preço por kg
    preco += x.v - x.q * p0
    comumA += x.v
    comumB += y.v
    mudancas.push({
      produtoId: id,
      deCent: Math.round(p0 * k),
      paraCent: Math.round((x.v / x.q) * k),
      efeitoCent: Math.round(x.v - x.q * p0),
    })
  }
  for (const [id, y] of b) if (!comum(id)) deixados += y.v
  const precoCent = Math.round(preco)
  return {
    anteriorId,
    anteriorTotalCent: totalCompras(anterior),
    deltaCent: totalCompras(atual) - totalCompras(anterior),
    precoCent,
    quantidadeCent: comumA - comumB - precoCent,
    novosCent: novos,
    deixadosCent: deixados,
    mudancas: mudancas
      .filter((m) => m.efeitoCent !== 0)
      .sort((m, n) => Math.abs(n.efeitoCent) - Math.abs(m.efeitoCent))
      .slice(0, 3),
  }
}

// Resumo de uma feira (aberta ou fechada); compara com a feira fechada anterior que tenha compras.
export function resumoFeira(feira: Feira, feiras: Feira[], compras: Compra[]): Resumo {
  const doFeira = (id: string) => compras.filter((c) => c.feiraId === id)
  const cs = doFeira(feira.id)
  const parte = (f: (c: Compra) => boolean): Parte => {
    const x = cs.filter(f)
    return { cent: totalCompras(x), itens: x.length }
  }
  const limite = feira.fechadaEm ?? '9999'
  const ant = feiras
    .filter((f) => f.id !== feira.id && f.fechadaEm && f.fechadaEm < limite && doFeira(f.id).length)
    .sort((x, y) => y.fechadaEm!.localeCompare(x.fechadaEm!))[0]
  return {
    totalCent: totalCompras(cs),
    itens: cs.length,
    orcamentoCent: feira.orcamentoCent,
    planejado: parte((c) => c.foraDaLista === false),
    fora: parte((c) => c.foraDaLista === true),
    semOrigem: cs.filter((c) => c.foraDaLista === null).length,
    comparacao: ant && cs.length ? comparar(cs, doFeira(ant.id), ant.id) : null,
  }
}
