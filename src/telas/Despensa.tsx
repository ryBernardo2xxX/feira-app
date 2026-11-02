import { repo } from '../dados/repo'
import { avisosDespensa, contagemAvisos, MIN_COMPRAS } from '../dominio/despensa'
import type { Ctx } from '../contexto'

const dias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`

export default function Despensa({ c, compacto }: { c: Ctx; compacto?: boolean }) {
  const presentes = new Set(
    [...c.dados.itensLista, ...c.dados.compras.filter((x) => x.feiraId === c.feira.id)].map(
      (x) => x.produtoId,
    ),
  )
  const avisos = avisosDespensa(c.dados.compras, c.dados.eventosDespensa, presentes, c.hoje)
  const { aceitos, dispensados } = contagemAvisos(c.dados.eventosDespensa)
  if (compacto && !avisos.length) return null
  return (
    <section className="despensa-section">
      <h2>🧺 Talvez esteja acabando</h2>
      {avisos.length ? (
        avisos.map((a) => {
          const p = c.prod.get(a.produtoId)
          if (!p) return null
          const tag = p.unidadeBase === 'kg' ? p.variedade : p.marca
          return (
            <div className="item item-previa" key={a.produtoId}>
              <div className="item-top">
                <div className="item-principal">
                  <strong>{p.nome}</strong>
                  {tag && <span className="marca">{tag}</span>}
                </div>
              </div>
              <div className="horti-meta">
                Você costuma comprar a cada ~{dias(Math.max(1, Math.round(a.ritmo)))} · última compra há{' '}
                {dias(a.diasDesde)}
              </div>
              <div className="item-acoes">
                <button
                  className="botao-carrinho"
                  onClick={async () => {
                    await repo.aceitarAviso(a)
                    c.avisar(`${p.nome} na lista prévia`)
                  }}
                >
                  + Lista prévia
                </button>
                <button
                  className="botao-secundario"
                  onClick={async () => {
                    const id = await repo.dispensarAviso(a)
                    c.avisar(`${p.nome}: aviso adiado`, () => repo.desfazerEvento(id))
                  }}
                >
                  Não preciso
                </button>
              </div>
            </div>
          )
        })
      ) : (
        <p className="vazio">
          Nenhum aviso agora. Eles aparecem depois de {MIN_COMPRAS} compras do mesmo item.
        </p>
      )}
      {!compacto && aceitos + dispensados > 0 && (
        <p className="ajuda">
          Avisos aceitos: {aceitos} · dispensados: {dispensados}
        </p>
      )}
    </section>
  )
}
