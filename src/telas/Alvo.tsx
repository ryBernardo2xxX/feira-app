import { alternativasDe, situacaoAlvo } from '../dominio/alvo'
import { brl } from '../dominio/dinheiro'
import type { Ctx } from '../contexto'
import type { Produto } from '../dominio/tipos'
import s from './telas.module.css'

const un = (p: Produto) => (p.unidadeBase === 'kg' ? '/kg' : '')

// Situação de um preço (por unidade, ou por kg nas pesadas) frente ao alvo do produto; acima do alvo, lembra as alternativas.
export default function Alvo({ c, p, cent, grande }: { c: Ctx; p: Produto; cent: number; grande?: boolean }) {
  const sit = situacaoAlvo(cent, p.precoAlvoCent)
  if (!sit) return null
  const alts =
    sit.estado === 'acima'
      ? alternativasDe(p, c.prod, c.dados.compras).filter((a) => a.precoCent != null)
      : []
  return (
    <div className={grande ? s.grande : undefined}>
      {sit.estado === 'dentro' ? (
        <span className={s.dentro}>
          ✅ Dentro do alvo ({brl(p.precoAlvoCent!)}
          {un(p)})
        </span>
      ) : (
        <span className={s.acima}>
          ⚠️ {brl(sit.difCent)}
          {un(p)} acima do alvo ({brl(p.precoAlvoCent!)}
          {un(p)})
        </span>
      )}
      {alts.length > 0 && (
        <div className={s.alts}>
          Aceita também: {alts.map((a) => `${a.rotulo} ${brl(a.precoCent!)}${un(p)}`).join(' · ')}
        </div>
      )}
    </div>
  )
}

// Linha informativa na lista: alvo e alternativas aceitas.
export function MetaAlvo({ c, p }: { c: Ctx; p: Produto }) {
  const alts = alternativasDe(p, c.prod, c.dados.compras)
  if (!p.precoAlvoCent && !alts.length) return null
  return (
    <div className="horti-meta">
      {p.precoAlvoCent ? `Alvo: ${brl(p.precoAlvoCent)}${un(p)}` : ''}
      {p.precoAlvoCent && alts.length ? ' · ' : ''}
      {alts.length ? `aceita: ${alts.map((a) => a.rotulo).join(', ')}` : ''}
    </div>
  )
}
