import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { repo } from '../dados/repo'
import { agruparPorCategoria, buscarPorNome, limpar, precoEstimadoCent } from '../dominio/catalogo'
import { brl, lerCent, lerNum } from '../dominio/dinheiro'
import { pesoKg } from '../dominio/hortifruti'
import { subtotalCompra, totalCompras } from '../dominio/subtotais'
import { finalizar } from './acoes'
import Alvo from './Alvo'
import { precoUnitCent } from '../dominio/alvo'
import type { Ctx } from '../contexto'
import type { Compra, ItemLista, Produto } from '../dominio/tipos'
import s from './Mercado.module.css'

const detalhe = (p: Produto) => (p.unidadeBase === 'kg' ? p.variedade : p.marca)

function Pendente({ c, it, p }: { c: Ctx; it: ItemLista; p: Produto }) {
  const h = it.horti
  const est = precoEstimadoCent(it, p, c.catalogo)
  const [aberto, setAberto] = useState(false)
  const [f, setF] = useState({
    preco: '',
    peso: '',
    kg: h?.precoKgRefCent ? String(h.precoKgRefCent / 100) : '',
  })
  const [erro, setErro] = useState('')
  const tag = detalhe(p)
  const digitado = h ? lerCent(f.kg) : lerCent(f.preco)
  const ref = aberto ? digitado : h ? (h.precoKgRefCent ?? null) : est
  async function registrar(d: { precoCent?: number; pesoG?: number; precoKgCent?: number }) {
    const r = await repo.listaParaCompra(it.id, d)
    c.avisar(`${p.nome} no carrinho`, () => repo.desfazerListaParaCompra(r))
  }
  function enviar(e: FormEvent) {
    e.preventDefault()
    if (h) {
      const g = lerNum(f.peso)
      const k = lerCent(f.kg)
      if (!(g > 0) || !k) return setErro('Informe o peso (g) e o preço por kg.')
      return void registrar({ pesoG: g, precoKgCent: k })
    }
    const v = lerCent(f.preco)
    if (!v) return setErro('Informe o preço.')
    void registrar({ precoCent: v })
  }
  return (
    <div className={s.card}>
      <div>
        <span className={s.nome}>{p.nome}</span>
        {tag && <span className="marca"> {tag}</span>}
        <span className={s.qtd}>
          ×{it.qtd}
          {h?.pesoMedioG ? ` · ~${pesoKg(h.pesoMedioG * it.qtd)}` : ''}
        </span>
      </div>
      <div className={s.meta}>
        {h
          ? h.precoKgRefCent
            ? `ref. ${brl(h.precoKgRefCent)}/kg`
            : 'sem preço de referência'
          : est
            ? `${brl(est)} cada · ${brl(est * it.qtd)}`
            : 'preço ainda não definido'}
      </div>
      {ref ? <Alvo c={c} p={p} cent={ref} grande /> : null}
      {!aberto ? (
        <div className={s.acoes}>
          {!h && est ? (
            <button className={s.grande} onClick={() => registrar({ precoCent: est })}>
              ✓ {brl(est)}
            </button>
          ) : null}
          <button className={!h && est ? s.sec : s.grande} onClick={() => setAberto(true)}>
            {h ? '⚖️ Pesar e comprar' : est ? 'Outro preço' : 'Informar preço'}
          </button>
          <button
            className={s.sec}
            aria-label="Tirar da lista"
            onClick={async () => {
              await repo.removerItemLista(it.id)
              c.avisar(`${p.nome} saiu da lista`, () => repo.restaurarItemLista(it.id))
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <form onSubmit={enviar}>
          {h ? (
            <>
              <input
                className={s.campo}
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="Peso real (g)"
                autoFocus
                value={f.peso}
                onChange={(e) => setF({ ...f, peso: e.target.value })}
              />
              <input
                className={s.campo}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="Preço real por kg"
                value={f.kg}
                onChange={(e) => setF({ ...f, kg: e.target.value })}
              />
            </>
          ) : (
            <input
              className={s.campo}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="Preço unitário"
              autoFocus
              value={f.preco}
              onChange={(e) => setF({ ...f, preco: e.target.value })}
            />
          )}
          {erro && <div className={s.erro}>{erro}</div>}
          <div className={s.acoes}>
            <button type="submit" className={s.grande}>
              ✓ Comprei
            </button>
            <button type="button" className={s.sec} onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Feito({ c, it, p }: { c: Ctx; it: Compra; p: Produto }) {
  const tag = detalhe(p)
  return (
    <div className={s.feito}>
      <div>
        <strong>{p.nome}</strong>
        {tag ? ` · ${tag}` : ''} ×{it.qtd}
        <Alvo c={c} p={p} cent={precoUnitCent(it)} grande />
      </div>
      <strong>{brl(subtotalCompra(it))}</strong>
      <button
        type="button"
        className={s.sec}
        aria-label="Voltar para a lista"
        onClick={() => repo.compraParaLista(it.id)}
      >
        ↩️
      </button>
    </div>
  )
}

function Avulso({ c }: { c: Ctx }) {
  const [f, setF] = useState({ nome: '', preco: '', qtd: '1' })
  const [erro, setErro] = useState('')
  const achado = buscarPorNome(c.catalogo, f.nome)
  const unico = achado.length === 1 ? achado[0] : null
  function mudaNome(v: string) {
    const e = buscarPorNome(c.catalogo, v)
    setF((x) => ({
      ...x,
      nome: v,
      preco: e.length === 1 && !x.preco.trim() ? String(e[0].ultimoPrecoCent / 100) : x.preco,
    }))
  }
  async function enviar(e: FormEvent) {
    e.preventDefault()
    const nome = limpar(f.nome)
    const precoCent = lerCent(f.preco)
    const qtd = parseInt(f.qtd, 10)
    if (!nome || !precoCent || !(qtd > 0)) return setErro('Informe produto, preço e quantidade.')
    setErro('')
    const id = await repo.adicionarCompra({
      nome,
      marca: unico?.marca ?? null,
      categoria: unico?.categoria ?? null,
      qtd,
      precoCent,
    })
    setF({ nome: '', preco: '', qtd: '1' })
    c.avisar(`${nome} no carrinho`, () => repo.removerCompra(id))
  }
  return (
    <form className={s.card} onSubmit={enviar}>
      <div className={s.nome}>➕ Fora da lista</div>
      <div className={s.linha2} style={{ marginTop: 10 }}>
        <input
          className={s.campo}
          list="sugestoes-produtos"
          placeholder="Produto"
          value={f.nome}
          onChange={(e) => mudaNome(e.target.value)}
        />
        <input
          className={s.campo}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="Preço"
          value={f.preco}
          onChange={(e) => setF({ ...f, preco: e.target.value })}
        />
      </div>
      {erro && <div className={s.erro}>{erro}</div>}
      <div className={s.acoes}>
        <input
          className={`${s.campo} ${s.qtdCampo}`}
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          aria-label="Quantidade"
          value={f.qtd}
          onChange={(e) => setF({ ...f, qtd: e.target.value })}
        />
        <button type="submit" className={s.grande}>
          Adicionar ao carrinho
        </button>
      </div>
    </form>
  )
}

export default function Mercado({ c }: { c: Ctx }) {
  const nav = useNavigate()
  const carrinho = c.dados.compras.filter((x) => x.feiraId === c.feira.id)
  const total = totalCompras(carrinho)
  const orc = c.feira.orcamentoCent
  const com = <T extends { produtoId: string }>(a: T[]) =>
    a.flatMap((it) => {
      const p = c.prod.get(it.produtoId)
      return p ? [{ it, p }] : []
    })
  const pend = com(c.dados.itensLista)
  const feitos = com(carrinho)
  const pct = orc > 0 ? Math.min((total / orc) * 100, 100) : 0
  return (
    <section className={s.tela}>
      <div className={s.topo}>
        <button type="button" className={s.sair} onClick={() => nav('/')}>
          ← Sair do modo Mercado
        </button>
        <div className={s.total}>
          {brl(total)}
          {orc > 0 && <span className={s.de}> de {brl(orc)}</span>}
        </div>
        {orc > 0 && (
          <>
            <div className="progress-bar" aria-label="Consumo do orçamento">
              <div
                id="progress"
                className={pct < 70 ? 'baixo' : pct < 100 ? 'medio' : 'alto'}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className={s.sub}>
              {total <= orc ? `Restam ${brl(orc - total)}` : `${brl(total - orc)} acima do orçamento`}
            </div>
          </>
        )}
        <div className={s.sub}>
          {pend.length
            ? `Faltam ${pend.length} ${pend.length === 1 ? 'item' : 'itens'} da lista`
            : 'Lista concluída'}{' '}
          · {carrinho.length} no carrinho
        </div>
      </div>
      {pend.length === 0 && (
        <p className="vazio">
          Nada pendente na lista. Use “Fora da lista” para o que mais entrar no carrinho.
        </p>
      )}
      {agruparPorCategoria(pend).map(([cat, ls]) => (
        <div key={cat}>
          <div className={s.cat}>{cat}</div>
          {ls.map(({ it, p }) => (
            <Pendente key={it.id} c={c} it={it} p={p} />
          ))}
        </div>
      ))}
      <Avulso c={c} />
      {feitos.length > 0 && (
        <>
          <div className={s.cat}>No carrinho</div>
          {feitos.map(({ it, p }) => (
            <Feito key={it.id} c={c} it={it} p={p} />
          ))}
        </>
      )}
      <button
        type="button"
        className={s.grande}
        style={{ width: '100%', marginTop: 16 }}
        onClick={() => finalizar(c, nav, '/mercado')}
      >
        ✅ Finalizar feira
      </button>
    </section>
  )
}
