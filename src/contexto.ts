import type { Catalogo } from './dominio/catalogo'
import type { Dados, Feira, Produto } from './dominio/tipos'
export type Ctx = {
  dados: Dados
  prod: Map<string, Produto>
  feira: Feira
  catalogo: Catalogo
  // desfazer (opcional) mostra o botão "Desfazer"; devolver false cancela a mensagem "Desfeito"
  avisar: (msg: string, desfazer?: () => unknown) => void
  // dia local atual (ver diaLocal em dominio/despensa)
  hoje: number
  ordenacao: 'padrao' | 'alfabetica'
  setOrdenacao: (v: 'padrao' | 'alfabetica') => void
  colapsadas: Record<string, Record<string, boolean>>
  toggleCat: (contexto: string, cat: string) => void
}
