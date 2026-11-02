import Dexie, { type Table } from 'dexie'
import { origemDesconhecida } from '../dominio/migracao'
import type { Compra, Dados, EventoDespensa, Feira, HortiRef, ItemLista, Produto } from '../dominio/tipos'

export type Meta = { chave: string; valor: unknown }
export class FeiraDB extends Dexie {
  produtos!: Table<Produto, string>
  itensLista!: Table<ItemLista, string>
  feiras!: Table<Feira, string>
  compras!: Table<Compra, string>
  hortiRefs!: Table<HortiRef, string>
  eventosDespensa!: Table<EventoDespensa, string>
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
    // v2 (F2): preço-alvo e alternativas no produto, origem da compra e eventos de despensa
    this.version(2)
      .stores({ eventosDespensa: 'id,produtoId' })
      .upgrade(async (t) => {
        const feiras = new Map((await t.table<Feira>('feiras').toArray()).map((f) => [f.id, f]))
        await t
          .table<Produto>('produtos')
          .toCollection()
          .modify((p) => {
            p.precoAlvoCent ??= null
            p.alternativas ??= []
          })
        await t
          .table<Compra>('compras')
          .toCollection()
          .modify((c) => {
            c.foraDaLista = origemDesconhecida(c, feiras.get(c.feiraId)) ? null : (c.foraDaLista ?? false)
          })
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
    db.eventosDespensa.bulkPut(d.eventosDespensa),
  ])
}
