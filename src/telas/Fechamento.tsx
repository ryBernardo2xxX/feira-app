import { useNavigate, useParams } from 'react-router-dom'
import { brl } from '../dominio/dinheiro'
import { resumoFeira } from '../dominio/fechamento'
import type { Ctx } from '../contexto'
import s from './telas.module.css'

const sinal = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${brl(Math.abs(n))}`
const itens = (n: number) => `${n} ${n === 1 ? 'item' : 'itens'}`
const dataBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

// Resumo de uma feira em linguagem simples, sem julgamento: o que veio da lista e o que mudou desde a feira anterior.
export default function Fechamento({ c }: { c: Ctx }) {
  const { id } = useParams()
  const nav = useNavigate()
  const feira = c.dados.feiras.find((f) => f.id === id)
  if (!feira) {
    return (
      <section className="menu-secao">
        <h2>Feira não encontrada</h2>
        <button type="button" className="botao-secundario" onClick={() => nav('/historico')}>
          Voltar ao histórico
        </button>
      </section>
    )
  }
  const r = resumoFeira(feira, c.dados.feiras, c.dados.compras)
  const cmp = r.comparacao
  const anterior = cmp ? c.dados.feiras.find((f) => f.id === cmp.anteriorId) : undefined
  const semOrigem = r.planejado.itens + r.fora.itens === 0
  return (
    <section className="menu-secao">
      <h2>
        🧾 Resumo da feira — {dataBR(feira.fechadaEm ?? feira.data)}
        {!feira.fechadaEm && ' (em andamento)'}
      </h2>
      {r.itens === 0 ? (
        <p className="vazio">Nenhum item comprado nesta feira.</p>
      ) : (
        <>
          <div className={s.linha}>
            <span>Total</span>
            <strong>{brl(r.totalCent)}</strong>
          </div>
          {r.orcamentoCent > 0 && (
            <div className={s.sub}>
              {r.totalCent <= r.orcamentoCent
                ? `${brl(r.orcamentoCent - r.totalCent)} abaixo do orçamento de ${brl(r.orcamentoCent)}`
                : `${brl(r.totalCent - r.orcamentoCent)} acima do orçamento de ${brl(r.orcamentoCent)}`}
            </div>
          )}

          <h3 className={s.h3}>Da lista × fora da lista</h3>
          {semOrigem ? (
            <p className="ajuda">
              Sem registro de origem nesta feira (itens de antes desse registro existir).
            </p>
          ) : (
            <>
              <div className={s.linha}>
                <span>Da lista ({itens(r.planejado.itens)})</span>
                <strong>{brl(r.planejado.cent)}</strong>
              </div>
              <div className={s.linha}>
                <span>Fora da lista ({itens(r.fora.itens)})</span>
                <strong>{brl(r.fora.cent)}</strong>
              </div>
              {r.semOrigem > 0 && (
                <p className="ajuda">
                  {itens(r.semOrigem)} de antes do registro de origem não entram nessa divisão.
                </p>
              )}
            </>
          )}

          {cmp ? (
            <>
              <h3 className={s.h3}>
                Comparado à feira de {anterior?.fechadaEm ? dataBR(anterior.fechadaEm) : 'antes'}
              </h3>
              <div className={s.linha}>
                <span>Diferença no total</span>
                <strong>{sinal(cmp.deltaCent)}</strong>
              </div>
              <div className={s.linha}>
                <span>
                  Quantidade <small>— levou mais ou menos dos mesmos itens</small>
                </span>
                <strong>{sinal(cmp.quantidadeCent)}</strong>
              </div>
              <div className={s.linha}>
                <span>
                  Preço <small>— os mesmos itens custaram diferente</small>
                </span>
                <strong>{sinal(cmp.precoCent)}</strong>
              </div>
              <div className={s.linha}>
                <span>
                  Itens novos <small>— não estavam na outra feira</small>
                </span>
                <strong>{sinal(cmp.novosCent)}</strong>
              </div>
              <div className={s.linha}>
                <span>
                  Itens que ficaram de fora <small>— estavam na outra feira</small>
                </span>
                <strong>{sinal(-cmp.deixadosCent)}</strong>
              </div>
              {cmp.mudancas.length > 0 && (
                <>
                  <h3 className={s.h3}>Preços que mais mudaram</h3>
                  {cmp.mudancas.map((m) => {
                    const p = c.prod.get(m.produtoId)
                    const un = p?.unidadeBase === 'kg' ? '/kg' : ''
                    const det = p ? (p.unidadeBase === 'kg' ? p.variedade : p.marca) : null
                    return (
                      <div className={s.linha} key={m.produtoId}>
                        <span>
                          {p?.nome}
                          {det ? ` ${det}` : ''}
                        </span>
                        <strong>
                          {brl(m.deCent)} → {brl(m.paraCent)}
                          {un}
                        </strong>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          ) : (
            <p className="ajuda">
              Esta é a primeira feira com registros; a comparação aparece a partir da próxima.
            </p>
          )}
        </>
      )}
      <button type="button" className="botao-secundario" onClick={() => nav('/historico')}>
        Ver histórico
      </button>
    </section>
  )
}
