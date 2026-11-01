export const VERSAO_DADOS = 5
export type Base = {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  deviceId: string
}
export type Produto = Base & {
  nome: string
  marca: string | null
  variedade: string | null
  categoria: string | null
  unidadeBase: 'un' | 'kg' | 'L'
  chave: string
  hortifrutiId: string | null
}
export type HortiLista = { pesoMedioG: number | null; precoKgRefCent: number | null; fonte: string | null }
export type ItemLista = Base & {
  produtoId: string
  qtd: number
  precoEstimadoCent: number | null
  horti: HortiLista | null
}
export type Feira = Base & {
  data: string
  mercado: string | null
  orcamentoCent: number
  fechadaEm: string | null
}
export type Compra = Base & {
  feiraId: string
  produtoId: string
  qtd: number
  precoCent: number
  pesoG: number | null
  precoKgCent: number | null
  variacaoCent: number | null
  foraDaLista: boolean
}
export type HortiRef = Base & { precoKgCent: number; fonte: string | null }
export type Dados = {
  produtos: Produto[]
  itensLista: ItemLista[]
  feiras: Feira[]
  compras: Compra[]
  hortiRefs: HortiRef[]
}
