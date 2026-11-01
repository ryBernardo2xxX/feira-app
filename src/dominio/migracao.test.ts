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
