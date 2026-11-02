import { describe, expect, it } from 'vitest'
import { comparar, resumoFeira } from './fechamento'
import type { Compra, Feira } from './tipos'

const b = { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '', deletedAt: null, deviceId: 'd' }
let n = 0
const compra = (
  feiraId: string,
  produtoId: string,
  qtd: number,
  precoCent: number,
  extra: Partial<Compra> = {},
): Compra => ({
  ...b,
  id: `c${++n}`,
  feiraId,
  produtoId,
  qtd,
  precoCent,
  pesoG: null,
  precoKgCent: null,
  variacaoCent: null,
  foraDaLista: false,
  ...extra,
})
const feira = (id: string, fechadaEm: string | null, orcamentoCent = 0): Feira => ({
  ...b,
  id,
  data: fechadaEm ?? b.createdAt,
  mercado: null,
  orcamentoCent,
  fechadaEm,
})
const identidade = (c: ReturnType<typeof comparar>) =>
  c.precoCent + c.quantidadeCent + c.novosCent - c.deixadosCent

describe('fechamento: planejado × fora da lista', () => {
  it('separa o que veio da lista, o que ficou fora e o que não tem origem', () => {
    const cs = [
      compra('f', 'a', 2, 1000, { foraDaLista: false }),
      compra('f', 'b', 1, 300, { foraDaLista: true }),
      compra('f', 'c', 1, 700, { foraDaLista: true }),
      compra('f', 'd', 1, 500, { foraDaLista: null }),
    ]
    const r = resumoFeira(feira('f', '2026-02-01'), [], cs)
    expect(r).toMatchObject({
      totalCent: 3500,
      itens: 4,
      planejado: { cent: 2000, itens: 1 },
      fora: { cent: 1000, itens: 2 },
      semOrigem: 1,
      comparacao: null,
    })
  })
})

describe('fechamento: quantidade × preço', () => {
  it('exemplo: mais unidades a preço maior, item novo', () => {
    const c = comparar(
      [compra('2', 'arroz', 3, 1100), compra('2', 'chiclete', 1, 200)],
      [compra('1', 'arroz', 2, 1000)],
      '1',
    )
    expect(c).toMatchObject({
      anteriorTotalCent: 2000,
      deltaCent: 1500,
      precoCent: 300,
      quantidadeCent: 1000,
      novosCent: 200,
      deixadosCent: 0,
    })
    expect(c.mudancas).toEqual([{ produtoId: 'arroz', deCent: 1000, paraCent: 1100, efeitoCent: 300 }])
  })
  it('menos unidades e item que ficou de fora', () => {
    const c = comparar(
      [compra('2', 'arroz', 1, 1000)],
      [compra('1', 'arroz', 3, 1000), compra('1', 'leite', 1, 500)],
      '1',
    )
    expect(c).toMatchObject({
      deltaCent: -2500,
      precoCent: 0,
      quantidadeCent: -2000,
      novosCent: 0,
      deixadosCent: 500,
    })
    expect(c.mudancas).toEqual([])
  })
  it('pesados: quantidade em gramas e preço mostrado por kg', () => {
    const antes = [compra('1', 'banana', 1, 0, { pesoG: 1000, precoKgCent: 700 })]
    const depois = [compra('2', 'banana', 1, 0, { pesoG: 1500, precoKgCent: 800 })]
    const c = comparar(depois, antes, '1')
    expect(c).toMatchObject({ deltaCent: 500, precoCent: 150, quantidadeCent: 350 })
    expect(c.mudancas).toEqual([{ produtoId: 'banana', deCent: 700, paraCent: 800, efeitoCent: 150 }])
  })
  it('várias compras do mesmo produto usam o preço médio', () => {
    const c = comparar(
      [compra('2', 'a', 1, 900), compra('2', 'a', 1, 1100)],
      [compra('1', 'a', 2, 1000)],
      '1',
    )
    expect(c).toMatchObject({ deltaCent: 0, precoCent: 0, quantidadeCent: 0 })
  })
  it('a identidade delta = quantidade + preço + novos − deixados vale com arredondamentos', () => {
    let seed = 7
    const rnd = (m: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), 1 + (seed % m))
    for (let i = 0; i < 300; i++) {
      const mk = (f: string) =>
        ['a', 'b', 'c', 'd', 'e'].filter(() => rnd(3) > 1).map((p) => compra(f, p, rnd(5), rnd(2000)))
      const antes = mk('1')
      const depois = mk('2')
      const c = comparar(depois, antes, '1')
      expect(identidade(c)).toBe(c.deltaCent)
    }
  })
})

describe('resumoFeira: escolha da feira anterior', () => {
  const f1 = feira('1', '2026-01-10')
  const f2 = feira('2', '2026-01-20')
  const vazia = feira('v', '2026-01-25')
  const f3 = feira('3', '2026-02-01')
  const aberta = feira('a', null)
  const cs = [
    compra('1', 'x', 1, 100),
    compra('2', 'x', 1, 200),
    compra('3', 'x', 1, 300),
    compra('a', 'x', 1, 400),
  ]
  const todas = [f1, f2, vazia, f3, aberta]
  it('usa a fechada mais recente antes dela, ignorando feiras vazias e a própria', () => {
    expect(resumoFeira(f3, todas, cs).comparacao?.anteriorId).toBe('2')
    expect(resumoFeira(f2, todas, cs).comparacao?.anteriorId).toBe('1')
  })
  it('feira aberta compara com a última fechada que tem compras', () => {
    expect(resumoFeira(aberta, todas, cs).comparacao?.anteriorId).toBe('3')
  })
  it('sem feira anterior ou sem compras, não compara', () => {
    expect(resumoFeira(f1, todas, cs).comparacao).toBeNull()
    expect(resumoFeira(vazia, todas, cs).comparacao).toBeNull()
  })
})
