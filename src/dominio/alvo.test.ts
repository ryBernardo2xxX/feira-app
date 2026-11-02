import { describe, expect, it } from 'vitest'
import { alternativasDe, alvoSugerido, precoUnitCent, situacaoAlvo, ultimoPrecoUnit } from './alvo'
import type { Compra, Produto } from './tipos'

const b = { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '', deletedAt: null, deviceId: 'd' }
const prod = (
  id: string,
  nome: string,
  marca: string | null = null,
  extra: Partial<Produto> = {},
): Produto => ({
  ...b,
  id,
  nome,
  marca,
  variedade: null,
  categoria: null,
  unidadeBase: 'un',
  chave: id,
  hortifrutiId: null,
  precoAlvoCent: null,
  alternativas: [],
  ...extra,
})
const compra = (
  id: string,
  produtoId: string,
  precoCent: number,
  mes = 1,
  extra: Partial<Compra> = {},
): Compra => ({
  ...b,
  id,
  createdAt: `2026-0${mes}-01T00:00:00.000Z`,
  feiraId: 'f',
  produtoId,
  qtd: 1,
  precoCent,
  pesoG: null,
  precoKgCent: null,
  variacaoCent: null,
  foraDaLista: false,
  ...extra,
})

describe('preço-alvo', () => {
  it('preço unitário: por kg nas pesadas, por unidade nas demais', () => {
    expect(precoUnitCent(compra('a', 'p', 250))).toBe(250)
    expect(precoUnitCent(compra('a', 'p', 0, 1, { pesoG: 800, precoKgCent: 799 }))).toBe(799)
  })
  it('sugere a mediana dos preços pagos, com ao menos 2 compras', () => {
    expect(alvoSugerido([compra('a', 'p', 2000)], 'p')).toBeNull()
    expect(
      alvoSugerido([compra('a', 'p', 2000), compra('b', 'p', 2200), compra('c', 'p', 2100)], 'p'),
    ).toEqual({ cent: 2100, n: 3 })
    expect(alvoSugerido([compra('a', 'p', 100), compra('b', 'p', 101)], 'p')).toEqual({ cent: 101, n: 2 })
    expect(alvoSugerido([compra('a', 'p', 0), compra('b', 'p', 500), compra('c', 'q', 900)], 'p')).toBeNull()
  })
  it('para pesados usa o preço por kg', () => {
    const cs = [
      compra('a', 'p', 0, 1, { pesoG: 500, precoKgCent: 700 }),
      compra('b', 'p', 0, 2, { pesoG: 900, precoKgCent: 900 }),
    ]
    expect(alvoSugerido(cs, 'p')).toEqual({ cent: 800, n: 2 })
  })
  it('situação: dentro (≤ alvo) ou acima, com a diferença', () => {
    expect(situacaoAlvo(2000, null)).toBeNull()
    expect(situacaoAlvo(2000, 0)).toBeNull()
    expect(situacaoAlvo(2000, 2000)).toEqual({ estado: 'dentro', difCent: 0 })
    expect(situacaoAlvo(1900, 2000)).toEqual({ estado: 'dentro', difCent: 100 })
    expect(situacaoAlvo(2290, 2000)).toEqual({ estado: 'acima', difCent: 290 })
  })
  it('último preço unitário usa a compra mais recente', () => {
    expect(
      ultimoPrecoUnit([compra('a', 'p', 500, 3), compra('b', 'p', 400, 5), compra('c', 'p', 450, 4)], 'p'),
    ).toBe(400)
    expect(ultimoPrecoUnit([], 'p')).toBeNull()
  })
  it('alternativas: rótulo curto, último preço e ignora ids desconhecidos', () => {
    const tio = prod('t', 'Arroz', 'Tio João')
    const camil = prod('c', 'Arroz', 'Camil')
    const feijao = prod('f', 'Feijão', 'Kicaldo')
    const mapa = new Map([tio, camil, feijao].map((x) => [x.id, x]))
    const p = { ...tio, alternativas: ['c', 'f', 'x'] }
    expect(alternativasDe(p, mapa, [compra('a', 'c', 1900), compra('b', 'f', 800)])).toEqual([
      { id: 'c', rotulo: 'Camil', precoCent: 1900 },
      { id: 'f', rotulo: 'Feijão Kicaldo', precoCent: 800 },
    ])
    expect(alternativasDe(p, mapa, [])[0].precoCent).toBeNull()
  })
})
