import type { Compra, EventoDespensa } from './tipos'

export const MIN_COMPRAS = 3 // dias de compra distintos para existir um ritmo
export const MAX_DISPENSAS = 2 // depois de 2 "não preciso" no mesmo ciclo, silencia até a próxima compra
const JANELA = 3 // além de 3× o ritmo o hábito é considerado interrompido

// Número do dia no calendário local (dois instantes do mesmo dia local dão o mesmo número).
export const diaLocal = (iso: string) => {
  const d = new Date(iso)
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000)
}
export const mediana = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export type Aviso = { produtoId: string; compras: number; ritmo: number; diasDesde: number; cicloDia: number }

// Ritmo = mediana dos intervalos (em dias) entre dias de compra do produto.
// Avisa quando os dias desde a última compra alcançam o ritmo. "Não preciso" empurra o próximo aviso
// (maior entre ritmo e o ponto da dispensa, mais 25% do ritmo); a compra seguinte encerra o ciclo.
export function avisosDespensa(
  compras: Compra[],
  eventos: EventoDespensa[],
  presentes: Set<string>,
  hoje: number,
): Aviso[] {
  const dias = new Map<string, Set<number>>()
  for (const c of compras)
    dias.set(c.produtoId, (dias.get(c.produtoId) ?? new Set<number>()).add(diaLocal(c.createdAt)))
  const out: Aviso[] = []
  for (const [produtoId, set] of dias) {
    const ds = [...set].sort((a, b) => a - b)
    if (ds.length < MIN_COMPRAS || presentes.has(produtoId)) continue
    const ritmo = mediana(ds.slice(1).map((d, i) => d - ds[i]))
    const cicloDia = ds[ds.length - 1]
    const diasDesde = hoje - cicloDia
    const disp = eventos.filter(
      (e) => e.produtoId === produtoId && e.tipo === 'dispensado' && e.cicloDia === cicloDia && !e.deletedAt,
    )
    if (disp.length >= MAX_DISPENSAS || diasDesde > ritmo * JANELA) continue
    const passo = Math.max(1, Math.ceil(ritmo * 0.25))
    const limiar = disp.length ? Math.max(ritmo, ...disp.map((e) => e.diasDesde)) + passo : ritmo
    if (diasDesde >= limiar) out.push({ produtoId, compras: ds.length, ritmo, diasDesde, cicloDia })
  }
  return out.sort((a, b) => b.diasDesde / b.ritmo - a.diasDesde / a.ritmo)
}

export function contagemAvisos(eventos: EventoDespensa[]) {
  const v = eventos.filter((e) => !e.deletedAt)
  return {
    aceitos: v.filter((e) => e.tipo === 'aceito').length,
    dispensados: v.filter((e) => e.tipo === 'dispensado').length,
  }
}
