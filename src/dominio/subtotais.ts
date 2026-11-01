import type { Compra } from './tipos'
type Sub = Pick<Compra, 'qtd' | 'precoCent' | 'pesoG' | 'precoKgCent'>
export function estimativaHorti(qtd: number, pesoMedioG: number | null, precoKgCent: number | null) {
  if (!(qtd > 0) || !pesoMedioG || !(pesoMedioG > 0) || !precoKgCent || !(precoKgCent > 0)) return null
  const pesoTotalG = qtd * pesoMedioG
  return { pesoTotalG, valorCent: Math.round((pesoTotalG * precoKgCent) / 1000) }
}
export const subtotalCompra = (c: Sub) =>
  c.pesoG && c.precoKgCent ? Math.round((c.pesoG * c.precoKgCent) / 1000) : c.precoCent * c.qtd
export const totalCompras = (cs: Sub[]) => cs.reduce((s, c) => s + subtotalCompra(c), 0)
