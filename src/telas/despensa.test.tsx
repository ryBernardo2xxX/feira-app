import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../dados/db'
import { repo } from '../dados/repo'
import { botao, clicar, desmontar, esperar, montar, texto } from '../testes/ui'

beforeEach(async () => {
  localStorage.clear()
  await db.delete()
  await db.open()
  await repo.iniciar()
})
afterEach(desmontar)

const dia = (n: number) => {
  const t = new Date()
  t.setHours(12, 0, 0, 0)
  t.setDate(t.getDate() - n)
  return t.toISOString()
}
const b = (createdAt: string) => ({ createdAt, updatedAt: createdAt, deletedAt: null, deviceId: 'd' })
const feira = (id: string, n: number | null) => ({
  ...b(dia(n ?? 0)),
  id,
  data: dia(n ?? 0),
  mercado: null,
  orcamentoCent: 0,
  fechadaEm: n === null ? null : dia(n),
})
const compra = (id: string, feiraId: string, n: number) => ({
  ...b(dia(n)),
  id,
  feiraId,
  produtoId: 'p1',
  qtd: 1,
  precoCent: 1500,
  pesoG: null,
  precoKgCent: null,
  variacaoCent: null,
  foraDaLista: true,
})
const cafe = JSON.stringify({
  versaoDados: 6,
  itensLista: [],
  hortiRefs: [],
  eventosDespensa: [],
  produtos: [
    {
      ...b(dia(60)),
      id: 'p1',
      nome: 'Café',
      marca: null,
      variedade: null,
      categoria: 'Mercearia',
      unidadeBase: 'un',
      chave: 'café::',
      hortifrutiId: null,
      precoAlvoCent: null,
      alternativas: [],
    },
  ],
  feiras: [feira('f0', 42), feira('f1', 28), feira('f2', 14), feira('fa', null)],
  compras: [compra('c0', 'f0', 42), compra('c1', 'f1', 28), compra('c2', 'f2', 14)],
})

describe('Despensa', () => {
  it('avisa, adia com "Não preciso", desfaz e aceita', async () => {
    await repo.importarArquivo(cafe)
    await montar('/')
    await esperar(() => botao('Não preciso'))
    expect(texto()).toContain('a cada ~14 dias')
    await clicar(botao('Não preciso'))
    await esperar(() => !botao('Não preciso'))
    expect((await repo.carregar()).eventosDespensa).toMatchObject([{ tipo: 'dispensado', diasDesde: 14 }])
    await clicar(botao('Desfazer'))
    await esperar(() => botao('Não preciso'))
    await clicar(botao('+ Lista prévia'))
    await esperar(() => !botao('Não preciso'))
    const d = await repo.carregar()
    expect(d.itensLista).toHaveLength(1)
    expect(d.eventosDespensa.filter((e) => e.tipo === 'aceito')).toHaveLength(1)
    expect(texto()).toContain('aceitos: 1')
  })
  it('sem histórico suficiente, explica quando os avisos aparecem', async () => {
    await montar('/')
    await esperar(() => texto().includes('Talvez esteja acabando'))
    expect(texto()).toContain('depois de 3 compras')
  })
})
