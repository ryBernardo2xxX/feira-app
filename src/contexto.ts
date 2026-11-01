import type { Catalogo } from './dominio/catalogo'
import type { Dados, Feira, Produto } from './dominio/tipos'
export type Ctx = {
  dados: Dados
  prod: Map<string, Produto>
  feira: Feira
  catalogo: Catalogo
  avisar: (msg: string) => void
  ordenacao: 'padrao' | 'alfabetica'
  setOrdenacao: (v: 'padrao' | 'alfabetica') => void
  colapsadas: Record<string, Record<string, boolean>>
  toggleCat: (contexto: string, cat: string) => void
}
