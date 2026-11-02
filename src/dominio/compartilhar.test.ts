import { describe, expect, it } from 'vitest'
import { linkWhatsApp, textoLista } from './compartilhar'
import type { ItemLista, Produto } from './tipos'

const b = { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '', deletedAt: null, deviceId: 'd' }
const prod = (id: string, nome: string, extra: Partial<Produto> = {}): Produto => ({
  ...b,
  id,
  nome,
  marca: null,
  variedade: null,
  categoria: null,
  unidadeBase: 'un',
  chave: id,
  hortifrutiId: null,
  precoAlvoCent: null,
  alternativas: [],
  ...extra,
})
const item = (produtoId: string, qtd: number, horti: ItemLista['horti'] = null): ItemLista => ({
  ...b,
  id: `i${produtoId}`,
  produtoId,
  qtd,
  precoEstimadoCent: null,
  horti,
})
const mapa = (...ps: Produto[]) => new Map(ps.map((p) => [p.id, p]))
const dia = new Date(2026, 10, 1)

describe('texto da lista para compartilhar', () => {
  it('agrupa por categoria na ordem do mercado, com alvo e alternativas', () => {
    const tio = prod('t', 'Arroz', {
      marca: 'Tio João',
      categoria: 'Mercearia',
      precoAlvoCent: 2500,
      alternativas: ['c'],
    })
    const camil = prod('c', 'Arroz', { marca: 'Camil', categoria: 'Mercearia' })
    const banana = prod('b', 'Banana', { variedade: 'Prata', categoria: 'Hortifruti', unidadeBase: 'kg' })
    const sabao = prod('s', 'Sabão')
    const texto = textoLista(
      [item('t', 2), item('s', 1), item('b', 6, { pesoMedioG: 120, precoKgRefCent: 799, fonte: null })],
      mapa(tio, camil, banana, sabao),
      dia,
    )
    expect(texto).toBe(
      [
        '🛒 Lista de compras — 01/11/2026',
        '',
        '*Hortifruti*',
        '• 6× Banana (Prata) ~0,72 kg',
        '',
        '*Mercearia*',
        '• 2× Arroz Tio João — até R$ 25,00 (pode ser: Camil)',
        '',
        '*Outros*',
        '• 1× Sabão',
      ].join('\n'),
    )
  })
  it('ordena por nome dentro da categoria; alvo de pesados é por kg', () => {
    const a = prod('a', 'Feijão', { categoria: 'Mercearia' })
    const b2 = prod('b', 'Arroz', { categoria: 'Mercearia' })
    const t = prod('t', 'Tomate', {
      categoria: 'Hortifruti',
      unidadeBase: 'kg',
      variedade: 'Comum',
      precoAlvoCent: 800,
    })
    const texto = textoLista([item('a', 1), item('b', 3), item('t', 2)], mapa(a, b2, t), dia)
    expect(texto.indexOf('Arroz')).toBeLessThan(texto.indexOf('Feijão'))
    expect(texto).toContain('• 2× Tomate (Comum) — até R$ 8,00/kg')
  })
  it('lista vazia (ou só com itens desconhecidos) dá texto vazio', () => {
    expect(textoLista([], mapa(), dia)).toBe('')
    expect(textoLista([item('x', 1)], mapa(), dia)).toBe('')
  })
  it('não deixa espaço não separável no texto', () => {
    expect(textoLista([item('a', 1)], mapa(prod('a', 'Leite', { precoAlvoCent: 599 })), dia)).not.toContain(
      '\u00a0',
    )
  })
  it('link do WhatsApp preserva o texto', () => {
    const t = '🛒 Lista\n• 2× Arroz'
    const link = linkWhatsApp(t)
    expect(link.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(link.split('text=')[1])).toBe(t)
  })
})
