export const emCent = (reais: number) => Math.round(Number((reais * 100).toFixed(6)))
export const brl = (cent: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cent / 100)
const ler = (s: string) => {
  const t = s.trim().replace(',', '.')
  const n = Number(t)
  return t !== '' && Number.isFinite(n) ? n : null
}
export const lerCent = (s: string) => {
  const n = ler(s)
  return n !== null && n >= 0 ? emCent(n) : null
}
export const lerNum = (s: string) => ler(s) ?? 0
