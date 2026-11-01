import { describe, expect, it } from 'vitest'
import { brl, emCent, lerCent } from './dinheiro'
import { estimativaHorti, subtotalCompra, totalCompras } from './subtotais'
import { buscarPorNome, precoEstimadoCent, reconstruirCatalogo, sugestoes, variacaoCent } from './catalogo'
import type { Compra, ItemLista, Produto } from './tipos'

const b = {
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
  deviceId: 'd',
}
const prod = (id: string, nome: string, marca: string | null = null): Produto => ({
  ...b,
  id,
  nome,
  marca,
  variedade: null,
  categoria: null,
  unidadeBase: 'un',
  chave: id,
  hortifrutiId: null,
})
const compra = (
  id: string,
  produtoId: string,
  precoCent: number,
  createdAt = b.createdAt,
  qtd = 1,
): Compra => ({
  ...b,
  id,
  createdAt,
  feiraId: 'f',
  produtoId,
  qtd,
  precoCent,
  pesoG: null,
  precoKgCent: null,
  variacaoCent: null,
  foraDaLista: false,
})
const lista = (produtoId: string, precoEstimadoCent: number | null = null): ItemLista => ({
  ...b,
  id: 'i',
  produtoId,
  qtd: 2,
  precoEstimadoCent,
  horti: null,
})

describe('dinheiro', () => {
  it('converte reais em centavos sem erro de ponto flutuante', () => {
    for (let c = 0; c <= 20000; c++) expect(emCent(c / 100)).toBe(c)
    expect(emCent(1.005)).toBe(101)
  })
  it('lê vírgula e ponto, rejeita lixo e negativos', () => {
    expect(lerCent('12,5')).toBe(1250)
    expect(lerCent('7.99')).toBe(799)
    expect(lerCent('')).toBeNull()
    expect(lerCent('abc')).toBeNull()
    expect(lerCent('-1')).toBeNull()
  })
  it('formata em BRL', () => expect(brl(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56'))
})

describe('subtotais', () => {
  it('estima hortifrúti arredondando em centavos', () => {
    expect(estimativaHorti(3, 120, 799)).toEqual({ pesoTotalG: 360, valorCent: 288 })
    expect(estimativaHorti(0, 120, 799)).toBeNull()
    expect(estimativaHorti(3, null, 799)).toBeNull()
    expect(estimativaHorti(3, 120, null)).toBeNull()
  })
  it('calcula subtotal de item normal e de hortifrúti', () => {
    const n = compra('a', 'p', 250, b.createdAt, 3)
    const h = { ...compra('h', 'p', 0), pesoG: 1350, precoKgCent: 499 }
    expect(subtotalCompra(n)).toBe(750)
    expect(subtotalCompra(h)).toBe(674)
    expect(totalCompras([n, h])).toBe(1424)
  })
})

describe('catálogo', () => {
  const ps = [prod('p1', 'Arroz', 'Tio João'), prod('p2', 'Feijão')]
  it('usa o último preço e conta compras, em qualquer ordem de entrada', () => {
    const cs = [
      compra('c2', 'p1', 600, '2026-02-01T00:00:00.000Z'),
      compra('c1', 'p1', 500),
      compra('c0', 'p1', 0, '2026-03-01T00:00:00.000Z'),
    ]
    const cat = reconstruirCatalogo(cs, ps)
    expect(cat.p1).toMatchObject({ ultimoPrecoCent: 600, vezes: 2 })
    expect(cat.p2).toBeUndefined()
    expect(reconstruirCatalogo(cs, ps, 'c2').p1.ultimoPrecoCent).toBe(500)
  })
  it('estima preço: digitado > catálogo > único por nome', () => {
    const cat = reconstruirCatalogo([compra('c1', 'p1', 500)], ps)
    expect(precoEstimadoCent(lista('p1', 700), ps[0], cat)).toBe(700)
    expect(precoEstimadoCent(lista('p1'), ps[0], cat)).toBe(500)
    expect(precoEstimadoCent(lista('p3'), prod('p3', 'Arroz', 'Camil'), cat)).toBe(500)
    expect(precoEstimadoCent(lista('p2'), ps[1], cat)).toBeNull()
  })
  it('calcula variação contra a última compra', () => {
    const cat = reconstruirCatalogo([compra('c1', 'p1', 500)], ps)
    expect(variacaoCent(cat, 'p1', 650)).toBe(150)
    expect(variacaoCent(cat, 'p1', 500)).toBeNull()
    expect(variacaoCent(cat, 'p2', 100)).toBeNull()
  })
  it('sugere itens comprados 2+ vezes que ainda não estão presentes', () => {
    const cat = reconstruirCatalogo(
      [compra('c1', 'p1', 500), compra('c2', 'p1', 510, '2026-02-01T00:00:00.000Z'), compra('c3', 'p2', 300)],
      ps,
    )
    expect(sugestoes(cat, new Set()).map((e) => e.produtoId)).toEqual(['p1'])
    expect(sugestoes(cat, new Set(['p1']))).toEqual([])
  })
  it('busca por nome ignorando caixa e espaços', () => {
    const cat = reconstruirCatalogo([compra('c1', 'p1', 500)], ps)
    expect(buscarPorNome(cat, '  arroz ')).toHaveLength(1)
    expect(buscarPorNome(cat, '')).toEqual([])
  })
})
