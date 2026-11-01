import { useState } from 'react'
import { brl } from '../dominio/dinheiro'
import { totalCompras } from '../dominio/subtotais'
import type { Ctx } from '../contexto'

export default function Historico({ c }: { c: Ctx }) {
  const [ver, setVer] = useState(false)
  const fechadas = c.dados.feiras
    .filter((f) => f.fechadaEm)
    .sort((a, b) => b.fechadaEm!.localeCompare(a.fechadaEm!))
  return (
    <section id="historico" className="historico-section menu-secao">
      <h2>📜 Histórico de feiras</h2>
      <button type="button" className="botao-secundario" onClick={() => setVer(!ver)}>
        Ver/ocultar histórico
      </button>
      {ver && (
        <div id="historicoContainer">
          {fechadas.length ? (
            fechadas.map((f) => {
              const cs = c.dados.compras.filter((x) => x.feiraId === f.id)
              return (
                <div className="historico-item" key={f.id}>
                  <div>
                    <strong>{new Date(f.fechadaEm!).toLocaleString('pt-BR')}</strong>
                  </div>
                  <div>
                    Total: {brl(totalCompras(cs))}
                    {f.orcamentoCent ? ` / Orçamento: ${brl(f.orcamentoCent)}` : ''}
                  </div>
                  <div className="categoria">{cs.length} itens</div>
                </div>
              )
            })
          ) : (
            <p className="vazio">Nenhuma feira finalizada ainda.</p>
          )}
        </div>
      )}
    </section>
  )
}
