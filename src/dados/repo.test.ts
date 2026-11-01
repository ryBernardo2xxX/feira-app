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
