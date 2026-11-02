import { describe, expect, it } from 'vitest'
import { lerBackup, migrarBackup, parseDataBR } from './migracao'
import { reconstruirCatalogo } from './catalogo'
import { totalCompras } from './subtotais'
import { VERSAO_DADOS } from './tipos'

let n = 0
const ctx = () => ({
  agora: '2026-10-31T12:00:00.000Z',
  deviceId: 'dev',
  novoId: () => `id${String(++n).padStart(4, '0')}`,
})
const v4 = {
  versaoDados: 4,
  itens: [
    {
      id: 'a',
      tipo: 'normal',
      nome: 'Arroz',
      marca: 'Tio João',
      categoria: 'Mercearia',
      quantidade: 2,
      preco: 25.9,
      variacao: null,
    },
    {
      id: 'b',
      tipo: 'hortifruti',
      nome: 'Banana',
      variedade: 'Prata',
      hortifrutiId: 'banana-prata',
      quantidade: 6,
      pesoTotalGramas: 720,
      precoKg: 7.99,
    },
  ],
  listaPrevia: [
    { id: 'c', tipo: 'normal', nome: 'Feijão', quantidade: 1, precoEstimado: 8.5 },
    {
      id: 'd',
      tipo: 'hortifruti',
      nome: 'Tomate',
      variedade: 'Comum',
      hortifrutiId: 'tomate-comum',
      quantidade: 4,
      pesoMedioGramas: 120,
      precoKgReferencia: 6.5,
    },
  ],
  orcamento: 300.5,
  historicoFeiras: [
    {
      data: '15/10/2026 10:30:00',
      total: 24.9,
      orcamento: 200,
      itens: [
        {
          tipo: 'normal',
          nome: 'Arroz',
          marca: 'Tio João',
          preco: 24.9,
          quantidade: 1,
          categoria: 'Mercearia',
        },
      ],
    },
  ],
  hortifrutiReferencias: { 'banana-prata': { precoKg: 7.99, fonte: 'Feira', atualizadoEm: '20/10/2026' } },
}

describe('migração v4 → v5', () => {
  const d = migrarBackup(v4, ctx())
  const aberta = d.feiras.find((f) => !f.fechadaEm)!
  it('converte dinheiro para centavos e separa feira aberta × histórico', () => {
    expect(aberta.orcamentoCent).toBe(30050)
    expect(d.feiras).toHaveLength(2)
    expect(d.feiras.find((f) => f.fechadaEm)?.fechadaEm).toContain('2026-10-15')
    const cart = d.compras.filter((c) => c.feiraId === aberta.id)
    expect(cart).toHaveLength(2)
    expect(cart[0]).toMatchObject({ qtd: 2, precoCent: 2590 })
    expect(cart[1]).toMatchObject({ precoCent: 0, pesoG: 720, precoKgCent: 799 })
    expect(totalCompras(cart)).toBe(5755)
  })
  it('reaproveita o mesmo produto entre histórico e carrinho', () => {
    expect(d.produtos.filter((p) => p.nome === 'Arroz')).toHaveLength(1)
    expect(d.produtos.find((p) => p.nome === 'Banana')).toMatchObject({
      unidadeBase: 'kg',
      categoria: 'Hortifruti',
      hortifrutiId: 'banana-prata',
    })
    const cat = reconstruirCatalogo(d.compras, d.produtos)
    const arroz = Object.values(cat).find((e) => e.nome === 'Arroz')
    expect(arroz).toMatchObject({ ultimoPrecoCent: 2590, vezes: 2 })
  })
  it('converte lista prévia e referências de hortifrúti', () => {
    expect(d.itensLista).toHaveLength(2)
    expect(d.itensLista[0].precoEstimadoCent).toBe(850)
    expect(d.itensLista[1].horti).toEqual({ pesoMedioG: 120, precoKgRefCent: 650, fonte: null })
    expect(d.hortiRefs).toHaveLength(1)
    expect(d.hortiRefs[0]).toMatchObject({ id: 'banana-prata', precoKgCent: 799, fonte: 'Feira' })
  })
  it('todo registro tem campos sync-ready', () => {
    for (const r of [...d.produtos, ...d.itensLista, ...d.feiras, ...d.compras, ...d.hortiRefs])
      expect(r).toMatchObject({ deletedAt: null, deviceId: 'dev' })
  })
})

describe('backups antigos e v5', () => {
  it('v2: itens com status pendente viram lista prévia', () => {
    const d = migrarBackup(
      {
        itens: [
          { nome: 'Leite', quantidade: 1, preco: 5, status: 'confirmado' },
          { nome: 'Ovos', quantidade: 2, preco: 0, status: 'pendente' },
        ],
      },
      ctx(),
    )
    expect(d.compras).toHaveLength(1)
    expect(d.itensLista).toHaveLength(1)
    expect(d.itensLista[0].precoEstimadoCent).toBeNull()
  })
  it('entradas vazias ou inválidas geram só uma feira aberta', () => {
    for (const raw of [null, undefined, {}, 'x', 42]) {
      const d = lerBackup(raw, ctx())
      expect(d.feiras.filter((f) => !f.fechadaEm)).toHaveLength(1)
      expect(d.compras).toHaveLength(0)
    }
  })
  it('v5 faz ida e volta sem perda', () => {
    const d = migrarBackup(v4, ctx())
    const json = JSON.parse(JSON.stringify({ versaoDados: VERSAO_DADOS, ...d }))
    expect(lerBackup(json, ctx())).toEqual(d)
  })
  it('recusa backup de versão futura', () => expect(() => lerBackup({ versaoDados: 99 }, ctx())).toThrow())
  it('parseDataBR entende data e hora pt-BR e rejeita texto', () => {
    expect(parseDataBR('15/10/2026 10:30:00')).toBe(new Date(2026, 9, 15, 10, 30, 0).toISOString())
    expect(parseDataBR('x')).toBeNull()
  })
})

describe('schema v6 (F2)', () => {
  it('migração da v0 grava origem desconhecida e os campos novos', () => {
    const d = migrarBackup(v4, ctx())
    expect(d.compras.every((c) => c.foraDaLista === null)).toBe(true)
    expect(d.produtos.every((p) => p.precoAlvoCent === null && p.alternativas.length === 0)).toBe(true)
    expect(d.eventosDespensa).toEqual([])
  })
  it('backup v5 (F1) sobe para v6 marcando só as compras vindas da v0', () => {
    const b = {
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
      deletedAt: null,
      deviceId: 'd',
    }
    const compra = (id: string, feiraId: string, createdAt: string, foraDaLista: boolean) => ({
      ...b,
      id,
      createdAt,
      feiraId,
      produtoId: 'p1',
      qtd: 1,
      precoCent: 500,
      pesoG: null,
      precoKgCent: null,
      variacaoCent: null,
      foraDaLista,
    })
    const v5 = {
      versaoDados: 5,
      produtos: [
        {
          ...b,
          id: 'p1',
          nome: 'Arroz',
          marca: null,
          variedade: null,
          categoria: null,
          unidadeBase: 'un',
          chave: 'arroz::',
          hortifrutiId: null,
        },
      ],
      itensLista: [],
      hortiRefs: [],
      feiras: [
        {
          ...b,
          id: 'f1',
          data: b.createdAt,
          mercado: null,
          orcamentoCent: 0,
          fechadaEm: '2026-10-02T10:00:00.000Z',
        },
        {
          ...b,
          id: 'f2',
          createdAt: '2026-10-03T10:00:00.000Z',
          data: '2026-10-03T10:00:00.000Z',
          mercado: null,
          orcamentoCent: 0,
          fechadaEm: null,
        },
      ],
      compras: [
        compra('c1', 'f1', '2026-10-02T10:00:00.000Z', false),
        compra('c2', 'f1', '2026-10-01T12:00:00.000Z', true),
        compra('c3', 'f2', '2026-10-03T10:00:00.000Z', false),
        compra('c4', 'f2', '2026-10-03T11:00:00.000Z', false),
      ],
    }
    const d = lerBackup(v5, ctx())
    expect(d.compras.map((c) => c.foraDaLista)).toEqual([null, true, null, false])
    expect(d.produtos[0]).toMatchObject({ precoAlvoCent: null, alternativas: [] })
    expect(d.eventosDespensa).toEqual([])
    expect(lerBackup(JSON.parse(JSON.stringify({ versaoDados: VERSAO_DADOS, ...d })), ctx())).toEqual(d)
  })
})
