import Dexie, { type Table } from 'dexie'
import type { Compra, Dados, Feira, HortiRef, ItemLista, Produto } from '../dominio/tipos'

export type Meta = { chave: string; valor: unknown }
export class FeiraDB extends Dexie {
  produtos!: Table<Produto, string>
  itensLista!: Table<ItemLista, string>
  feiras!: Table<Feira, string>
  compras!: Table<Compra, string>
  hortiRefs!: Table<HortiRef, string>
  meta!: Table<Meta, string>
  constructor() {
    super('feira')
    this.version(1).stores({
      produtos: 'id,chave',
      itensLista: 'id,produtoId',
      feiras: 'id',
      compras: 'id,feiraId,produtoId',
      hortiRefs: 'id',
      meta: 'chave',
    })
  }
}
export const db = new FeiraDB()
export const gravarDados = async (d: Dados) => {
  await Promise.all([
    db.produtos.bulkPut(d.produtos),
    db.itensLista.bulkPut(d.itensLista),
    db.feiras.bulkPut(d.feiras),
    db.compras.bulkPut(d.compras),
    db.hortiRefs.bulkPut(d.hortiRefs),
  ])
}
