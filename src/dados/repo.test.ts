import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { repo } from './repo'
import { migrarLocalStorage } from './migracaoLS'
import { totalCompras } from '../dominio/subtotais'

beforeEach(async () => {
  localStorage.clear()
  await db.delete()
  await db.open()
})
const item = (nome: string, precoCent: number | null = null) => ({
  nome,
  marca: null,
  categoria: 'Mercearia',
  qtd: 1,
  precoCent,
})

describe('migração do localStorage', () => {
  it('importa a v0 uma única vez e guarda o backup original', async () => {
    localStorage.setItem('itens', JSON.stringify([{ id: 'a', nome: 'Arroz', quantidade: 2, preco: 25.9 }]))
    localStorage.setItem(
      'listaPrevia',
      JSON.stringify([{ id: 'b', nome: 'Feijão', quantidade: 1, precoEstimado: 8.5 }]),
    )
    localStorage.setItem('orcamento', '300')
    await repo.iniciar()
    let d = await repo.carregar()
    expect(d.compras).toHaveLength(1)
    expect(d.itensLista).toHaveLength(1)
    expect(totalCompras(d.compras)).toBe(5180)
    expect(d.feiras.find((f) => !f.fechadaEm)?.orcamentoCent).toBe(30000)
    expect(await repo.backupPreMigracao()).toContain('Arroz')
    localStorage.setItem('itens', '[]')
    await repo.iniciar()
    expect(await migrarLocalStorage(localStorage, { agora: 'x', deviceId: 'd', novoId: () => 'z' })).toBe(
      false,
    )
    d = await repo.carregar()
    expect(d.compras).toHaveLength(1)
    expect(d.feiras).toHaveLength(1)
    expect(localStorage.getItem('listaPrevia')).not.toBeNull()
  })
  it('usuário novo começa com uma feira aberta e nenhum dado', async () => {
    await repo.iniciar()
    const d = await repo.carregar()
    expect(d.feiras.filter((f) => !f.fechadaEm)).toHaveLength(1)
    expect(d.compras).toHaveLength(0)
    expect(await repo.backupPreMigracao()).toBeUndefined()
  })
})

describe('fluxos do repositório', () => {
  it('lista → carrinho → lista, com variação de preço e fechamento de feira', async () => {
    await repo.iniciar()
    await repo.adicionarCompra({ ...item('Café', 1500), precoCent: 1500 })
    await repo.finalizarFeira()
    await repo.adicionarItemLista(item('Café', 1700))
    let d = await repo.carregar()
    await repo.listaParaCompra(d.itensLista[0].id, { precoCent: 1700 })
    d = await repo.carregar()
    const aberta = d.feiras.find((f) => !f.fechadaEm)!
    const nova = d.compras.find((c) => c.feiraId === aberta.id)!
    expect(d.itensLista).toHaveLength(0)
    expect(nova).toMatchObject({ variacaoCent: 200, foraDaLista: false })
    expect(d.feiras.filter((f) => f.fechadaEm)).toHaveLength(1)
    await repo.compraParaLista(nova.id)
    d = await repo.carregar()
    expect(d.compras.filter((c) => c.feiraId === aberta.id)).toHaveLength(0)
    expect(d.itensLista[0].precoEstimadoCent).toBe(1700)
  })
  it('hortifrúti: estimativa na lista e valor real na compra', async () => {
    await repo.iniciar()
    await repo.salvarHortiRef('banana-prata', 799, 'Feira')
    await repo.adicionarHortiLista({
      hortifrutiId: 'banana-prata',
      nome: 'Banana',
      variedade: 'Prata',
      qtd: 6,
      pesoMedioG: 120,
      precoKgRefCent: 799,
      fonte: 'Feira',
    })
    let d = await repo.carregar()
    await repo.listaParaCompra(d.itensLista[0].id, { pesoG: 800, precoKgCent: 850 })
    d = await repo.carregar()
    expect(totalCompras(d.compras)).toBe(680)
    expect(d.hortiRefs[0]).toMatchObject({ id: 'banana-prata', precoKgCent: 799 })
    expect(d.produtos[0]).toMatchObject({ unidadeBase: 'kg', categoria: 'Hortifruti' })
  })
  it('remoção é soft delete: some da UI e continua no backup', async () => {
    await repo.iniciar()
    await repo.adicionarCompra({ ...item('Sal', 300), precoCent: 300 })
    const id = (await repo.carregar()).compras[0].id
    await repo.removerCompra(id)
    expect((await repo.carregar()).compras).toHaveLength(0)
    expect((await repo.exportar()).compras[0].deletedAt).not.toBeNull()
  })
  it('exporta, reseta e restaura um backup', async () => {
    await repo.iniciar()
    await repo.adicionarCompra({ ...item('Leite', 599), precoCent: 599 })
    const backup = JSON.stringify(await repo.exportar())
    await repo.resetar()
    expect((await repo.carregar()).compras).toHaveLength(0)
    await repo.importarArquivo(backup)
    const d = await repo.carregar()
    expect(d.compras).toHaveLength(1)
    expect(d.feiras).toHaveLength(1)
    await expect(repo.importarArquivo('{"versaoDados":99}')).rejects.toThrow()
  })
})

describe('atualização do banco (v1 → v2)', () => {
  it('preserva os dados da F1 e marca só as compras vindas da v0', async () => {
    await db.delete()
    const v1 = new Dexie('feira')
    v1.version(1).stores({
      produtos: 'id,chave',
      itensLista: 'id,produtoId',
      feiras: 'id',
      compras: 'id,feiraId,produtoId',
      hortiRefs: 'id',
      meta: 'chave',
    })
    await v1.open()
    const b = {
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
      deletedAt: null,
      deviceId: 'd',
    }
    const compra = (id: string, createdAt: string, foraDaLista: boolean) => ({
      ...b,
      id,
      createdAt,
      feiraId: 'f1',
      produtoId: 'p1',
      qtd: 1,
      precoCent: 500,
      pesoG: null,
      precoKgCent: null,
      variacaoCent: null,
      foraDaLista,
    })
    await v1.table('produtos').add({
      ...b,
      id: 'p1',
      nome: 'Arroz',
      marca: null,
      variedade: null,
      categoria: null,
      unidadeBase: 'un',
      chave: 'arroz::',
      hortifrutiId: null,
    })
    await v1.table('feiras').add({
      ...b,
      id: 'f1',
      data: b.createdAt,
      mercado: null,
      orcamentoCent: 0,
      fechadaEm: '2026-10-02T10:00:00.000Z',
    })
    await v1
      .table('compras')
      .bulkAdd([
        compra('c1', '2026-10-02T10:00:00.000Z', false),
        compra('c2', '2026-10-01T12:00:00.000Z', true),
      ])
    v1.close()
    await db.open()
    const d = await repo.carregar()
    expect(d.produtos[0]).toMatchObject({ nome: 'Arroz', precoAlvoCent: null, alternativas: [] })
    expect(d.compras.find((c) => c.id === 'c1')?.foraDaLista).toBeNull()
    expect(d.compras.find((c) => c.id === 'c2')?.foraDaLista).toBe(true)
    expect(d.eventosDespensa).toEqual([])
  })
})

describe('desfazer', () => {
  it('desfaz lista → carrinho e a finalização da feira (só com a nova feira vazia)', async () => {
    await repo.iniciar()
    await repo.adicionarItemLista(item('Sal', 300))
    const id = (await repo.carregar()).itensLista[0].id
    const r = await repo.listaParaCompra(id, { precoCent: 300 })
    expect((await repo.carregar()).compras).toHaveLength(1)
    await repo.desfazerListaParaCompra(r)
    let d = await repo.carregar()
    expect([d.compras.length, d.itensLista.length]).toEqual([0, 1])
    await repo.adicionarCompra({ ...item('Sal', 300), precoCent: 300 })
    const f = await repo.finalizarFeira()
    expect(await repo.reabrirFeira(f)).toBe(true)
    d = await repo.carregar()
    expect(d.feiras.filter((x) => !x.fechadaEm)).toHaveLength(1)
    expect(d.feiras).toHaveLength(1)
    const f2 = await repo.finalizarFeira()
    await repo.adicionarCompra({ ...item('Pão', 500), precoCent: 500 })
    expect(await repo.reabrirFeira(f2)).toBe(false)
    expect((await repo.carregar()).feiras.filter((x) => x.fechadaEm)).toHaveLength(1)
  })
  it('restaura item e compra removidos', async () => {
    await repo.iniciar()
    await repo.adicionarItemLista(item('Sal', 300))
    await repo.adicionarCompra({ ...item('Leite', 599), precoCent: 599 })
    let d = await repo.carregar()
    await repo.removerItemLista(d.itensLista[0].id)
    await repo.removerCompra(d.compras[0].id)
    d = await repo.carregar()
    expect([d.itensLista.length, d.compras.length]).toEqual([0, 0])
    const e = await repo.exportar()
    await repo.restaurarItemLista(e.itensLista[0].id)
    await repo.restaurarCompra(e.compras[0].id)
    d = await repo.carregar()
    expect([d.itensLista.length, d.compras.length]).toEqual([1, 1])
  })
})

describe('despensa', () => {
  it('aceitar adiciona à lista e registra o evento; dispensar registra e desfaz', async () => {
    await repo.iniciar()
    await repo.adicionarCompra({ ...item('Café', 1500), precoCent: 1500 })
    const p = (await repo.carregar()).produtos[0]
    const aviso = { produtoId: p.id, cicloDia: 20000, diasDesde: 15 }
    await repo.aceitarAviso(aviso)
    let d = await repo.carregar()
    expect(d.itensLista).toHaveLength(1)
    expect(d.eventosDespensa).toMatchObject([
      { tipo: 'aceito', produtoId: p.id, cicloDia: 20000, diasDesde: 15 },
    ])
    const id = await repo.dispensarAviso(aviso)
    expect((await repo.carregar()).eventosDespensa).toHaveLength(2)
    await repo.desfazerEvento(id)
    d = await repo.carregar()
    expect(d.eventosDespensa.map((e) => e.tipo)).toEqual(['aceito'])
  })
  it('aceitar aviso de produto pesado cria item de hortifrúti completo', async () => {
    await repo.iniciar()
    await repo.salvarHortiRef('banana-prata', 799, 'Feira')
    await repo.adicionarHortiLista({
      hortifrutiId: 'banana-prata',
      nome: 'Banana',
      variedade: 'Prata',
      qtd: 6,
      pesoMedioG: 120,
      precoKgRefCent: 799,
      fonte: 'Feira',
    })
    let d = await repo.carregar()
    await repo.listaParaCompra(d.itensLista[0].id, { pesoG: 800, precoKgCent: 850 })
    d = await repo.carregar()
    await repo.aceitarAviso({ produtoId: d.produtos[0].id, cicloDia: 1, diasDesde: 5 })
    d = await repo.carregar()
    expect(d.itensLista[0]).toMatchObject({
      qtd: 1,
      precoEstimadoCent: null,
      horti: { pesoMedioG: 120, precoKgRefCent: 799, fonte: 'Feira' },
    })
  })
})

describe('preço-alvo e alternativas', () => {
  it('salva no produto, sem duplicar nem aceitar a si mesmo', async () => {
    await repo.iniciar()
    await repo.adicionarItemLista(item('Arroz', 2300))
    await repo.adicionarItemLista({ ...item('Arroz', 1900), marca: 'Camil' })
    const d = await repo.carregar()
    const [tio, camil] = d.produtos
    await repo.editarItemLista(d.itensLista[0].id, item('Arroz', 2300), {
      precoAlvoCent: 2100,
      alternativas: [camil.id, camil.id, tio.id],
    })
    expect((await repo.carregar()).produtos.find((x) => x.id === tio.id)).toMatchObject({
      precoAlvoCent: 2100,
      alternativas: [camil.id],
    })
  })
  it('edição de compra pesada também grava as preferências do produto', async () => {
    await repo.iniciar()
    await repo.adicionarHortiLista({
      hortifrutiId: 'banana-prata',
      nome: 'Banana',
      variedade: 'Prata',
      qtd: 6,
      pesoMedioG: 120,
      precoKgRefCent: 799,
      fonte: null,
    })
    let d = await repo.carregar()
    await repo.listaParaCompra(d.itensLista[0].id, { pesoG: 800, precoKgCent: 850 })
    d = await repo.carregar()
    await repo.editarCompraHorti(
      d.compras[0].id,
      { qtd: 6, pesoG: 900, precoKgCent: 850 },
      { precoAlvoCent: 800, alternativas: [] },
    )
    d = await repo.carregar()
    expect(d.compras[0]).toMatchObject({ pesoG: 900, precoKgCent: 850 })
    expect(d.produtos[0].precoAlvoCent).toBe(800)
  })
})
