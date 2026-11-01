import { db, gravarDados } from './db'
import { migrarBackup, type CtxMig } from '../dominio/migracao'

const CHAVES = ['itens', 'listaPrevia', 'orcamento', 'historicoFeiras', 'hortifrutiReferencias']

export function lerLocalStorageV4(ls: Storage): Record<string, unknown> | null {
  const o: Record<string, unknown> = {}
  let achou = false
  for (const k of CHAVES) {
    const v = ls.getItem(k)
    if (v === null) continue
    achou = true
    try {
      o[k] = JSON.parse(v)
    } catch {
      /* valor corrompido: ignora só essa chave */
    }
  }
  return achou ? o : null
}

// Roda uma única vez. Guarda a cópia original em meta e NUNCA apaga o localStorage da v0.
export async function migrarLocalStorage(ls: Storage, ctx: CtxMig): Promise<boolean> {
  if (await db.meta.get('migradoV4')) return false
  const raw = lerLocalStorageV4(ls)
  await db.transaction('rw', db.tables, async () => {
    if (raw) {
      await db.meta.put({ chave: 'backupPreMigracao', valor: JSON.stringify(raw) })
      await gravarDados(migrarBackup(raw, ctx))
    }
    await db.meta.put({ chave: 'migradoV4', valor: ctx.agora })
  })
  return raw !== null
}
