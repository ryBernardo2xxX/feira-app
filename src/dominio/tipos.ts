export const VERSAO_DADOS = 6
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
  // quanto o usuário aceita pagar (por unidade; por kg no hortifrúti)
  precoAlvoCent: number | null
  // ids de produtos aceitos no lugar deste
  alternativas: string[]
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
// foraDaLista: true = comprou sem estar na lista; false = veio da lista; null = origem desconhecida (dados da v0)
export type Compra = Base & {
  feiraId: string
  produtoId: string
  qtd: number
  precoCent: number
  pesoG: number | null
  precoKgCent: number | null
  variacaoCent: number | null
  foraDaLista: boolean | null
}
export type HortiRef = Base & { precoKgCent: number; fonte: string | null }
// Resposta a um aviso de despensa. cicloDia = dia (local) da última compra do produto quando o aviso foi respondido.
export type EventoDespensa = Base & {
  produtoId: string
  tipo: 'aceito' | 'dispensado'
  cicloDia: number
  diasDesde: number
}
export type Dados = {
  produtos: Produto[]
  itensLista: ItemLista[]
  feiras: Feira[]
  compras: Compra[]
  hortiRefs: HortiRef[]
  eventosDespensa: EventoDespensa[]
}
