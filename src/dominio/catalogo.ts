import type { Compra, ItemLista, Produto } from './tipos'
import { brl } from './dinheiro'
import { estimativaHorti } from './subtotais'
export const ORDEM_CATEGORIAS = [
  'Hortifruti',
  'Açougue/Congelados',
  'Congelados',
  'Laticínios',
  'Mercearia',
  'Limpeza',
  'Higiene',
  'Papelaria',
  'Outros',
]
export const normalizar = (v: unknown) =>
  String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
export const limpar = (v: unknown) =>
  String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
export const chaveProduto = (nome: string, marca?: string | null) =>
  `${normalizar(nome)}::${normalizar(marca)}`
export const chaveHorti = (nome: string, variedade?: string | null) =>
  `horti::${normalizar(nome)}::${normalizar(variedade)}`
export type EntradaCatalogo = {
  produtoId: string
  nome: string
  marca: string | null
  categoria: string | null
  ultimoPrecoCent: number
  vezes: number
}
export type Catalogo = Record<string, EntradaCatalogo>
export function reconstruirCatalogo(compras: Compra[], produtos: Produto[], excluirId?: string): Catalogo {
  const ps = new Map(produtos.map((p) => [p.id, p]))
  const cat: Catalogo = {}
  const ord = compras
    .filter((c) => c.id !== excluirId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  for (const c of ord) {
    const p = ps.get(c.produtoId)
    if (!p || !(c.precoCent > 0)) continue
    cat[p.id] = {
      produtoId: p.id,
      nome: p.nome,
      marca: p.marca,
      categoria: p.categoria,
      ultimoPrecoCent: c.precoCent,
      vezes: (cat[p.id]?.vezes ?? 0) + 1,
    }
  }
  return cat
}
export const buscarPorNome = (cat: Catalogo, nome: string) => {
  const n = normalizar(nome)
  return n ? Object.values(cat).filter((e) => normalizar(e.nome) === n) : []
}
export function precoEstimadoCent(item: ItemLista, p: Produto, cat: Catalogo): number | null {
  if (item.horti) return null
  if ((item.precoEstimadoCent ?? 0) > 0) return item.precoEstimadoCent
  if (cat[p.id]) return cat[p.id].ultimoPrecoCent
  const n = buscarPorNome(cat, p.nome)
  return n.length === 1 ? n[0].ultimoPrecoCent : null
}
export function estimativaItemLista(item: ItemLista, p: Produto, cat: Catalogo): number | null {
  if (item.horti)
    return estimativaHorti(item.qtd, item.horti.pesoMedioG, item.horti.precoKgRefCent)?.valorCent ?? null
  const pr = precoEstimadoCent(item, p, cat)
  return pr ? pr * item.qtd : null
}
export function variacaoCent(cat: Catalogo, produtoId: string, novoCent: number): number | null {
  const a = cat[produtoId]
  return a && novoCent !== a.ultimoPrecoCent ? novoCent - a.ultimoPrecoCent : null
}
export const textoVariacao = (d: number) => `${d > 0 ? '🔺 +' : '🔻 -'}${brl(Math.abs(d))} vs última compra`
export const sugestoes = (cat: Catalogo, presentes: Set<string>) =>
  Object.values(cat)
    .filter((e) => e.vezes >= 2 && !presentes.has(e.produtoId))
    .sort((a, b) => b.vezes - a.vezes)
    .slice(0, 12)
export function agruparPorCategoria<T extends { p: Produto }>(linhas: T[]): [string, T[]][] {
  const g = new Map<string, T[]>()
  for (const l of linhas) {
    const k = l.p.categoria || 'Outros'
    g.set(k, [...(g.get(k) ?? []), l])
  }
  const rank = (x: string) => {
    const i = ORDEM_CATEGORIAS.indexOf(x)
    return i < 0 ? 999 : i
  }
  return [...g.entries()].sort((a, b) => rank(a[0]) - rank(b[0]))
}
