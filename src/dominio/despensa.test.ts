import { describe, expect, it } from 'vitest'
import { avisosDespensa, contagemAvisos, diaLocal, mediana } from './despensa'
import type { Compra, EventoDespensa } from './tipos'

const b = { createdAt: '2026-01-01T12:00:00.000Z', updatedAt: '', deletedAt: null, deviceId: 'd' }
const dia = (n: number) => new Date(Date.UTC(2026, 0, 1 + n, 12)).toISOString()
const hoje = (n: number) => diaLocal(dia(n))
const compra = (produtoId: string, n: number, extra = ''): Compra => ({
  ...b,
  id: `c${produtoId}${n}${extra}`,
  createdAt: dia(n),
  feiraId: 'f',
  produtoId,
  qtd: 1,
  precoCent: 100,
  pesoG: null,
  precoKgCent: null,
  variacaoCent: null,
  foraDaLista: false,
})
const compras = (produtoId: string, ...ns: number[]) => ns.map((n) => compra(produtoId, n))
const disp = (
  produtoId: string,
  cicloDia: number,
  diasDesde: number,
  deletedAt: string | null = null,
): EventoDespensa => ({
  ...b,
  id: `e${produtoId}${diasDesde}`,
  deletedAt,
  produtoId,
  tipo: 'dispensado',
  cicloDia,
  diasDesde,
})
const nenhum = new Set<string>()

describe('despensa', () => {
  it('mediana', () => {
    expect(mediana([3, 1, 2])).toBe(2)
    expect(mediana([1, 2, 3, 4])).toBe(2.5)
  })
  it('não avisa com menos de 3 dias de compra', () => {
    expect(avisosDespensa(compras('p1', 0, 14), [], nenhum, hoje(60))).toEqual([])
  })
  it('avisa quando os dias desde a última compra alcançam o ritmo', () => {
    const cs = compras('p1', 0, 14, 28)
    expect(avisosDespensa(cs, [], nenhum, hoje(41))).toEqual([])
    expect(avisosDespensa(cs, [], nenhum, hoje(42))).toEqual([
      { produtoId: 'p1', compras: 3, ritmo: 14, diasDesde: 14, cicloDia: hoje(28) },
    ])
  })
  it('não avisa de item que já está na lista ou no carrinho', () => {
    expect(avisosDespensa(compras('p1', 0, 14, 28), [], new Set(['p1']), hoje(50))).toEqual([])
  })
  it('várias compras no mesmo dia contam como uma só', () => {
    expect(avisosDespensa([...compras('p1', 0, 0, 14), compra('p1', 14, 'b')], [], nenhum, hoje(40))).toEqual(
      [],
    )
    expect(avisosDespensa(compras('p1', 0, 0, 14, 28), [], nenhum, hoje(42))).toHaveLength(1)
  })
  it('um intervalo atípico não desloca o ritmo (mediana)', () => {
    const [a] = avisosDespensa(compras('p1', 0, 7, 14, 56), [], nenhum, hoje(63))
    expect(a).toMatchObject({ ritmo: 7, diasDesde: 7 })
  })
  it('"não preciso" adia o aviso; duas dispensas silenciam o ciclo', () => {
    const cs = compras('p1', 0, 14, 28)
    const ciclo = hoje(28)
    expect(avisosDespensa(cs, [disp('p1', ciclo, 14)], nenhum, hoje(45))).toEqual([])
    expect(avisosDespensa(cs, [disp('p1', ciclo, 14)], nenhum, hoje(46))).toHaveLength(1)
    expect(avisosDespensa(cs, [disp('p1', ciclo, 14), disp('p1', ciclo, 18)], nenhum, hoje(60))).toEqual([])
  })
  it('nova compra encerra o ciclo e ignora dispensas antigas', () => {
    const cs = compras('p1', 0, 14, 28, 42)
    expect(
      avisosDespensa(cs, [disp('p1', hoje(28), 14), disp('p1', hoje(28), 18)], nenhum, hoje(56)),
    ).toHaveLength(1)
  })
  it('dispensa desfeita (apagada) não adia nada', () => {
    expect(
      avisosDespensa(compras('p1', 0, 14, 28), [disp('p1', hoje(28), 14, 'x')], nenhum, hoje(42)),
    ).toHaveLength(1)
  })
  it('hábito interrompido (além de 3× o ritmo) deixa de avisar', () => {
    const cs = compras('p1', 0, 14, 28)
    expect(avisosDespensa(cs, [], nenhum, hoje(70))).toHaveLength(1)
    expect(avisosDespensa(cs, [], nenhum, hoje(71))).toEqual([])
  })
  it('ordena pelo maior atraso relativo', () => {
    const cs = [...compras('p2', 79, 86, 93), ...compras('p1', 44, 58, 72)]
    expect(avisosDespensa(cs, [], nenhum, hoje(100)).map((a) => a.produtoId)).toEqual(['p1', 'p2'])
  })
  it('conta avisos aceitos e dispensados, sem os desfeitos', () => {
    const aceito: EventoDespensa = { ...disp('p1', 1, 1), id: 'a', tipo: 'aceito' }
    expect(contagemAvisos([aceito, disp('p1', 1, 5), disp('p1', 1, 6, 'x')])).toEqual({
      aceitos: 1,
      dispensados: 1,
    })
  })
})
