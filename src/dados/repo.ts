import { monotonicFactory } from 'ulid'
import { db, gravarDados } from './db'
import { migrarLocalStorage } from './migracaoLS'
import { HORTIFRUTI_BASE } from '../dominio/hortifruti'
import {
  chaveHorti,
  chaveProduto,
  limpar,
  normalizar,
  reconstruirCatalogo,
  variacaoCent,
} from '../dominio/catalogo'
import { lerBackup, type CtxMig } from '../dominio/migracao'
import { VERSAO_DADOS, type Base, type Dados, type Produto } from '../dominio/tipos'

const ulid = monotonicFactory()
let dev = ''
const agora = () => new Date().toISOString()
const novo = (): Base => {
  const t = agora()
  return { id: ulid(), createdAt: t, updatedAt: t, deletedAt: null, deviceId: dev }
}
const toque = <T extends Base>(o: T, p: Partial<T> = {}): T => ({
  ...o,
  ...p,
  updatedAt: agora(),
  deviceId: dev,
})
const vivos = <T extends Base>(a: T[]) => a.filter((x) => !x.deletedAt)
const ctx = (): CtxMig => ({ agora: agora(), deviceId: dev, novoId: ulid })
const tx = <T>(fn: () => Promise<T>) => db.transaction('rw', db.tables, fn)

const abertaOuNada = async () => (await db.feiras.toArray()).find((f) => !f.fechadaEm && !f.deletedAt)
const aberta = async () => (await abertaOuNada())!
const catalogoAtual = async (excluirId?: string) => {
  const [cs, ps] = await Promise.all([db.compras.toArray(), db.produtos.toArray()])
  return reconstruirCatalogo(vivos(cs), vivos(ps), excluirId)
}

type EntradaProduto = {
  nome: string
  marca?: string | null
  categoria?: string | null
  variedade?: string | null
  hortifrutiId?: string | null
  horti?: boolean
}
// Acha o produto por nome+marca (ou nome+variedade no hortifrúti); cria se não existir.
async function obterProduto(i: EntradaProduto): Promise<Produto> {
  const horti = !!i.horti
  const nome = limpar(i.nome)
  const marca = horti ? null : limpar(i.marca) || null
  const variedade = horti ? limpar(i.variedade) || null : null
  const chave = horti ? chaveHorti(nome, variedade) : chaveProduto(nome, marca)
  const cat = limpar(i.categoria) || null
  const ex = await db.produtos
    .where('chave')
    .equals(chave)
    .filter((p) => !p.deletedAt)
    .first()
  if (ex) {
    if (cat && cat !== ex.categoria) {
      const u = toque(ex, { categoria: cat })
      await db.produtos.put(u)
      return u
    }
    return ex
  }
  const mesmoNome =
    cat || horti
      ? []
      : (await db.produtos.toArray()).filter((p) => !p.deletedAt && normalizar(p.nome) === normalizar(nome))
  const p: Produto = {
    ...novo(),
    nome,
    marca,
    variedade,
    chave,
    categoria: cat ?? (horti ? 'Hortifruti' : mesmoNome.length === 1 ? mesmoNome[0].categoria : null),
    unidadeBase: horti ? 'kg' : 'un',
    hortifrutiId: horti ? (i.hortifrutiId ?? null) : null,
  }
  await db.produtos.add(p)
  return p
}

const todas = async (): Promise<Dados> => {
  const [produtos, itensLista, feiras, compras, hortiRefs] = await Promise.all([
    db.produtos.toArray(),
    db.itensLista.toArray(),
    db.feiras.toArray(),
    db.compras.toArray(),
    db.hortiRefs.toArray(),
  ])
  return { produtos, itensLista, feiras, compras, hortiRefs }
}
async function carregar(): Promise<Dados> {
  const d = await todas()
  return {
    produtos: vivos(d.produtos),
    itensLista: vivos(d.itensLista),
    feiras: vivos(d.feiras),
    compras: vivos(d.compras),
    hortiRefs: vivos(d.hortiRefs),
  }
}
const exportar = async () => ({ versaoDados: VERSAO_DADOS, exportadoEm: agora(), ...(await todas()) })
const substituirTudo = (d: Dados) =>
  tx(async () => {
    await Promise.all(db.tables.filter((t) => t.name !== 'meta').map((t) => t.clear()))
    await gravarDados(d)
  })
const importarArquivo = async (texto: string) => substituirTudo(lerBackup(JSON.parse(texto), ctx()))
const resetar = () => substituirTudo(lerBackup({}, ctx()))
const backupPreMigracao = async () => (await db.meta.get('backupPreMigracao'))?.valor as string | undefined

async function iniciar() {
  const m = await db.meta.get('deviceId')
  dev = (m?.valor as string | undefined) ?? ulid()
  if (!m) await db.meta.put({ chave: 'deviceId', valor: dev })
  await migrarLocalStorage(localStorage, ctx())
  await tx(async () => {
    if (!(await abertaOuNada()))
      await db.feiras.add({ ...novo(), data: agora(), mercado: null, orcamentoCent: 0, fechadaEm: null })
  })
  await Promise.resolve(navigator.storage?.persist?.()).catch(() => undefined)
}

export type NovoItem = {
  nome: string
  marca: string | null
  categoria: string | null
  qtd: number
  precoCent: number | null
}
type ComPreco = NovoItem & { precoCent: number }
type NovoHorti = {
  hortifrutiId: string
  nome: string
  variedade: string
  qtd: number
  pesoMedioG: number
  precoKgRefCent: number | null
  fonte: string | null
}

const definirOrcamento = (cent: number) =>
  tx(async () => {
    await db.feiras.put(toque(await aberta(), { orcamentoCent: cent }))
  })
const finalizarFeira = () =>
  tx(async () => {
    const f = await aberta()
    const t = agora()
    await db.feiras.put(toque(f, { fechadaEm: t }))
    await db.feiras.add({
      ...novo(),
      data: t,
      mercado: null,
      orcamentoCent: f.orcamentoCent,
      fechadaEm: null,
    })
  })

const adicionarItemLista = (d: NovoItem) =>
  tx(async () => {
    const p = await obterProduto(d)
    await db.itensLista.add({
      ...novo(),
      produtoId: p.id,
      qtd: d.qtd,
      precoEstimadoCent: d.precoCent,
      horti: null,
    })
  })
const adicionarSugestao = (produtoId: string) =>
  tx(async () => {
    await db.itensLista.add({ ...novo(), produtoId, qtd: 1, precoEstimadoCent: null, horti: null })
  })
const adicionarHortiLista = (d: NovoHorti) =>
  tx(async () => {
    const p = await obterProduto({ ...d, horti: true })
    await db.itensLista.add({
      ...novo(),
      produtoId: p.id,
      qtd: d.qtd,
      precoEstimadoCent: null,
      horti: { pesoMedioG: d.pesoMedioG, precoKgRefCent: d.precoKgRefCent, fonte: d.fonte },
    })
  })
const adicionarCompra = (d: ComPreco) =>
  tx(async () => {
    const p = await obterProduto(d)
    const v = variacaoCent(await catalogoAtual(), p.id, d.precoCent)
    await db.compras.add({
      ...novo(),
      feiraId: (await aberta()).id,
      produtoId: p.id,
      qtd: d.qtd,
      precoCent: d.precoCent,
      pesoG: null,
      precoKgCent: null,
      variacaoCent: v,
      foraDaLista: true,
    })
  })

const editarItemLista = (id: string, d: NovoItem) =>
  tx(async () => {
    const it = await db.itensLista.get(id)
    if (!it) return
    const p = await obterProduto(d)
    await db.itensLista.put(toque(it, { produtoId: p.id, qtd: d.qtd, precoEstimadoCent: d.precoCent }))
  })
const editarHortiLista = (
  id: string,
  d: { qtd: number; pesoMedioG: number; precoKgRefCent: number | null; fonte: string | null },
) =>
  tx(async () => {
    const it = await db.itensLista.get(id)
    if (it?.horti)
      await db.itensLista.put(
        toque(it, {
          qtd: d.qtd,
          horti: { pesoMedioG: d.pesoMedioG, precoKgRefCent: d.precoKgRefCent, fonte: d.fonte },
        }),
      )
  })
const editarCompra = (id: string, d: ComPreco) =>
  tx(async () => {
    const c = await db.compras.get(id)
    if (!c) return
    const p = await obterProduto(d)
    await db.compras.put(
      toque(c, {
        produtoId: p.id,
        qtd: d.qtd,
        precoCent: d.precoCent,
        variacaoCent: variacaoCent(await catalogoAtual(id), p.id, d.precoCent),
      }),
    )
  })
const editarCompraHorti = (id: string, d: { qtd: number; pesoG: number; precoKgCent: number }) =>
  tx(async () => {
    const c = await db.compras.get(id)
    if (c) await db.compras.put(toque(c, d))
  })

const removerItemLista = (id: string) =>
  tx(async () => {
    const it = await db.itensLista.get(id)
    if (it) await db.itensLista.put(toque(it, { deletedAt: agora() }))
  })
const removerCompra = (id: string) =>
  tx(async () => {
    const c = await db.compras.get(id)
    if (c) await db.compras.put(toque(c, { deletedAt: agora() }))
  })

// Normal: informe precoCent. Hortifrúti: informe pesoG e precoKgCent reais da compra.
const listaParaCompra = (id: string, d: { precoCent?: number; pesoG?: number; precoKgCent?: number }) =>
  tx(async () => {
    const it = await db.itensLista.get(id)
    if (!it) return
    const horti = d.pesoG != null
    await db.compras.add({
      ...novo(),
      feiraId: (await aberta()).id,
      produtoId: it.produtoId,
      qtd: it.qtd,
      precoCent: horti ? 0 : (d.precoCent ?? 0),
      pesoG: horti ? d.pesoG! : null,
      precoKgCent: horti ? (d.precoKgCent ?? null) : null,
      variacaoCent: horti ? null : variacaoCent(await catalogoAtual(), it.produtoId, d.precoCent ?? 0),
      foraDaLista: false,
    })
    await db.itensLista.put(toque(it, { deletedAt: agora() }))
  })
const compraParaLista = (id: string) =>
  tx(async () => {
    const c = await db.compras.get(id)
    if (!c) return
    const p = (await db.produtos.get(c.produtoId))!
    const horti = p.unidadeBase === 'kg'
    const ref = p.hortifrutiId ? await db.hortiRefs.get(p.hortifrutiId) : undefined
    const bs = HORTIFRUTI_BASE.find((x) => x.id === p.hortifrutiId)
    await db.itensLista.add({
      ...novo(),
      produtoId: p.id,
      qtd: c.qtd,
      precoEstimadoCent: horti ? null : c.precoCent,
      horti: horti
        ? {
            pesoMedioG: bs?.pesoMedioG ?? null,
            precoKgRefCent: ref?.precoKgCent ?? c.precoKgCent,
            fonte: ref?.fonte ?? null,
          }
        : null,
    })
    await db.compras.put(toque(c, { deletedAt: agora() }))
  })

const salvarHortiRef = (id: string, precoKgCent: number, fonte: string | null) =>
  tx(async () => {
    const r = await db.hortiRefs.get(id)
    await db.hortiRefs.put(
      r ? toque(r, { precoKgCent, fonte, deletedAt: null }) : { ...novo(), id, precoKgCent, fonte },
    )
  })

// Contrato que a UI usa. Para trocar o backend (Ramo A), reimplemente este objeto.
export const repo = {
  iniciar,
  carregar,
  exportar,
  importarArquivo,
  resetar,
  backupPreMigracao,
  definirOrcamento,
  finalizarFeira,
  adicionarItemLista,
  adicionarSugestao,
  adicionarHortiLista,
  adicionarCompra,
  editarItemLista,
  editarHortiLista,
  editarCompra,
  editarCompraHorti,
  removerItemLista,
  removerCompra,
  listaParaCompra,
  compraParaLista,
  salvarHortiRef,
}
export type Repositorio = typeof repo
