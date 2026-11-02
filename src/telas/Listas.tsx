import { useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { repo, type NovoItem } from '../dados/repo'
import {
  estimativaItemLista,
  agruparPorCategoria,
  limpar,
  precoEstimadoCent,
  textoVariacao,
} from '../dominio/catalogo'
import { brl, lerCent, lerNum } from '../dominio/dinheiro'
import { pesoKg } from '../dominio/hortifruti'
import { subtotalCompra } from '../dominio/subtotais'
import type { Ctx } from '../contexto'
import Despensa from './Despensa'
import Alvo, { MetaAlvo } from './Alvo'
import PrefsPreco, { lerPrefs, prefsIniciais, type PrefsSalvas } from './PrefsPreco'
import { precoUnitCent } from '../dominio/alvo'
import { linkWhatsApp, textoLista } from '../dominio/compartilhar'
import type { Compra, HortiLista, ItemLista, Produto } from '../dominio/tipos'

type Linha<T> = { it: T; p: Produto }
const D = { type: 'number', min: 0, step: 0.01 } as const
const Q = { type: 'number', min: 1, step: 1 } as const
const campo =
  <F extends Record<string, string>>(f: F, setF: (v: F) => void) =>
  (n: keyof F & string) => ({
    value: f[n],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [n]: e.target.value }),
  })

function Agrupada<T>({
  c,
  k,
  linhas,
  vazio,
  render,
}: {
  c: Ctx
  k: 'previa' | 'carrinho'
  linhas: Linha<T>[]
  vazio: string
  render: (l: Linha<T>) => ReactNode
}) {
  if (!linhas.length) return <p className="vazio">{vazio}</p>
  return (
    <div>
      {agruparPorCategoria(linhas).map(([cat, g]) => {
        const col = !!c.colapsadas[k]?.[cat]
        const ls =
          c.ordenacao === 'alfabetica' ? [...g].sort((a, b) => a.p.nome.localeCompare(b.p.nome, 'pt-BR')) : g
        return (
          <div className="categoria-bloco" key={cat}>
            <div className="categoria-titulo" onClick={() => c.toggleCat(k, cat)}>
              <span className={`seta${col ? ' seta-fechada' : ''}`}>▾</span>
              <span>{cat}</span>
              <span className="categoria-contagem">{g.length}</span>
            </div>
            {!col && ls.map((l) => render(l))}
          </div>
        )
      })}
    </div>
  )
}

function EdNormal({
  c,
  k,
  p,
  qtd,
  precoCent,
  exigePreco,
  salvar,
  cancelar,
}: {
  c: Ctx
  k: 'previa' | 'carrinho'
  p: Produto
  qtd: number
  precoCent: number | null
  exigePreco: boolean
  salvar: (d: NovoItem, pr: PrefsSalvas) => Promise<void>
  cancelar: () => void
}) {
  const [f, setF] = useState({
    nome: p.nome,
    marca: p.marca ?? '',
    categoria: p.categoria ?? '',
    qtd: String(qtd),
    preco: precoCent != null ? String(precoCent / 100) : '',
  })
  const [pf, setPf] = useState(prefsIniciais(p))
  const i = campo(f, setF)
  async function ok() {
    const nome = limpar(f.nome)
    if (!nome) return void alert('Informe o nome do produto.')
    const q = f.qtd.trim() ? parseInt(f.qtd, 10) : 1
    if (!(q > 0)) return void alert('A quantidade deve ser maior que zero.')
    const pr = lerCent(f.preco)
    if (f.preco.trim() ? !(pr && pr > 0) : exigePreco)
      return void alert('Informe um preço válido maior que zero.')
    await salvar(
      { nome, marca: limpar(f.marca) || null, categoria: limpar(f.categoria) || null, qtd: q, precoCent: pr },
      lerPrefs(pf),
    )
  }
  return (
    <div className={`item item-${k} item-editando`}>
      <input {...i('nome')} placeholder="Produto" list="sugestoes-produtos" />
      <input {...i('marca')} placeholder="Marca (opcional)" list="sugestoes-marcas" />
      <input {...i('categoria')} placeholder="Categoria (opcional)" />
      <input {...Q} {...i('qtd')} placeholder="Quantidade" />
      <input {...D} {...i('preco')} placeholder={exigePreco ? 'Preço' : 'Preço estimado (opcional)'} />
      <PrefsPreco c={c} p={p} v={pf} set={setPf} />
      <div className="item-acoes">
        <button className="botao-salvar" onClick={ok}>
          💾 Salvar
        </button>
        <button className="botao-secundario" onClick={cancelar}>
          ✖️ Cancelar
        </button>
      </div>
    </div>
  )
}

function EdHortiPrevia({
  c,
  it,
  h,
  p,
  foco,
  fechar,
}: {
  c: Ctx
  it: ItemLista
  h: HortiLista
  p: Produto
  foco: boolean
  fechar: () => void
}) {
  const [f, setF] = useState({
    qtd: String(it.qtd),
    peso: h.pesoMedioG != null ? String(h.pesoMedioG) : '',
    ref: h.precoKgRefCent != null ? String(h.precoKgRefCent / 100) : '',
    fonte: h.fonte ?? '',
    pesoReal: '',
    precoReal: '',
  })
  const [pf, setPf] = useState(prefsIniciais(p))
  const i = campo(f, setF)
  async function salvarEst() {
    const q = lerNum(f.qtd)
    const pm = lerNum(f.peso)
    if (!(q > 0)) return void alert('A quantidade deve ser maior que zero.')
    if (!(pm > 0)) return void alert('Informe um peso médio válido.')
    await repo.editarHortiLista(
      it.id,
      { qtd: q, pesoMedioG: pm, precoKgRefCent: lerCent(f.ref) || null, fonte: limpar(f.fonte) || null },
      lerPrefs(pf),
    )
    fechar()
  }
  async function confirmar() {
    const g = lerNum(f.pesoReal)
    const kg = lerCent(f.precoReal)
    if (!(g > 0)) return void alert('Informe o peso real da compra em gramas.')
    if (!kg || kg <= 0) return void alert('Informe o preço real por kg da compra.')
    await repo.listaParaCompra(it.id, { pesoG: g, precoKgCent: kg })
    c.avisar('Compra confirmada')
  }
  return (
    <div className="item item-previa item-editando item-hortifruti">
      <strong>{p.nome}</strong>
      <span className="horti-variedade">{p.variedade || 'Variedade não informada'}</span>
      <input {...Q} {...i('qtd')} placeholder="Quantidade (unidades)" />
      <input {...Q} {...i('peso')} placeholder="Peso médio (g)" />
      <input {...D} {...i('ref')} placeholder="Preço de referência/kg" />
      <input {...i('fonte')} placeholder="Fonte do preço (opcional)" />
      <PrefsPreco c={c} p={p} v={pf} set={setPf} />
      <div className="hortifruti-confirmacao">
        <strong>Confirmar compra no carrinho</strong>
        <input {...Q} {...i('pesoReal')} placeholder="Peso real da compra (g)" autoFocus={foco} />
        <input {...D} {...i('precoReal')} placeholder="Preço real/kg" />
        <small>Use os valores reais do estabelecimento. Eles, e não a referência, entram no orçamento.</small>
      </div>
      <div className="item-acoes">
        <button className="botao-salvar" onClick={salvarEst}>
          💾 Salvar estimativa
        </button>
        <button className="botao-carrinho" onClick={confirmar}>
          🛒 Confirmar compra
        </button>
        <button className="botao-secundario" onClick={fechar}>
          ✖️ Cancelar
        </button>
      </div>
    </div>
  )
}

function EdHortiCarrinho({ c, it, p, fechar }: { c: Ctx; it: Compra; p: Produto; fechar: () => void }) {
  const [f, setF] = useState({
    qtd: String(it.qtd),
    peso: it.pesoG != null ? String(it.pesoG) : '',
    preco: it.precoKgCent != null ? String(it.precoKgCent / 100) : '',
  })
  const [pf, setPf] = useState(prefsIniciais(p))
  const i = campo(f, setF)
  async function ok() {
    const q = lerNum(f.qtd)
    const g = lerNum(f.peso)
    const kg = lerCent(f.preco)
    if (!(q > 0)) return void alert('A quantidade deve ser maior que zero.')
    if (!(g > 0)) return void alert('Informe o peso real da compra em gramas.')
    if (!kg || kg <= 0) return void alert('Informe o preço real por kg.')
    await repo.editarCompraHorti(it.id, { qtd: q, pesoG: g, precoKgCent: kg }, lerPrefs(pf))
    fechar()
  }
  return (
    <div className="item item-carrinho item-editando item-hortifruti">
      <strong>{p.nome}</strong>
      <span className="horti-variedade">{p.variedade || 'Variedade não informada'}</span>
      <input {...Q} {...i('qtd')} placeholder="Quantidade (unidades)" />
      <input {...Q} {...i('peso')} placeholder="Peso real (g)" />
      <input {...D} {...i('preco')} placeholder="Preço real/kg" />
      <PrefsPreco c={c} p={p} v={pf} set={setPf} />
      <div className="item-acoes">
        <button className="botao-salvar" onClick={ok}>
          💾 Salvar
        </button>
        <button className="botao-secundario" onClick={fechar}>
          ✖️ Cancelar
        </button>
      </div>
    </div>
  )
}

function ItemPrevia({ c, it, p }: { c: Ctx; it: ItemLista; p: Produto }) {
  const [ed, setEd] = useState<'' | 'editar' | 'confirmar'>('')
  const h = it.horti
  const est = estimativaItemLista(it, p, c.catalogo)
  const fechar = () => setEd('')
  if (ed && h) return <EdHortiPrevia c={c} it={it} h={h} p={p} foco={ed === 'confirmar'} fechar={fechar} />
  if (ed)
    return (
      <EdNormal
        c={c}
        k="previa"
        p={p}
        qtd={it.qtd}
        precoCent={it.precoEstimadoCent}
        exigePreco={false}
        cancelar={fechar}
        salvar={(d, pr) => repo.editarItemLista(it.id, d, pr).then(fechar)}
      />
    )
  async function paraCarrinho() {
    if (h) return setEd('confirmar')
    const pr = precoEstimadoCent(it, p, c.catalogo)
    if (!pr || pr <= 0) {
      alert('Informe o preço deste item antes de adicionar ao carrinho.')
      return setEd('editar')
    }
    await repo.listaParaCompra(it.id, { precoCent: pr })
    c.avisar('Item enviado ao carrinho')
  }
  const tag = h ? p.variedade || 'Hortifrúti' : p.marca
  return (
    <div className={`item item-previa${h ? ' item-hortifruti' : ''}`}>
      <div className="item-top">
        <div className="item-principal">
          <strong>{p.nome}</strong>
          {tag && <span className="marca">{tag}</span>}
          <span className="qtd">
            x{it.qtd}
            {h && ` · ${h.pesoMedioG ? `~${pesoKg(h.pesoMedioG * it.qtd)}` : 'peso não definido'}`}
          </span>
        </div>
        <div className={`item-subtotal ${est ? 'estimado' : 'sem-preco'}`}>
          {est ? `≈ ${brl(est)}` : h ? 'Preço/kg ainda não definido' : 'Preço ainda não definido'}
        </div>
      </div>
      {h && (
        <div className="horti-meta">
          Peso médio: {h.pesoMedioG ? `${h.pesoMedioG} g/un.` : '—'} · Referência:{' '}
          {h.precoKgRefCent ? `${brl(h.precoKgRefCent)}/kg` : 'não cadastrada'}
        </div>
      )}
      <MetaAlvo c={c} p={p} />
      <div className="item-acoes">
        <button className="botao-editar" onClick={() => setEd('editar')}>
          ✏️ Editar
        </button>
        <button className="botao-carrinho" onClick={paraCarrinho}>
          {h ? '🛒 Confirmar compra' : '🛒 Ao carrinho'}
        </button>
        <button
          className="botao-remover"
          onClick={async () => {
            await repo.removerItemLista(it.id)
            c.avisar(`${p.nome} removido`, () => repo.restaurarItemLista(it.id))
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  )
}

function ItemCarrinho({ c, it, p }: { c: Ctx; it: Compra; p: Produto }) {
  const [ed, setEd] = useState(false)
  const horti = p.unidadeBase === 'kg'
  const fechar = () => setEd(false)
  if (ed && horti) return <EdHortiCarrinho c={c} it={it} p={p} fechar={fechar} />
  if (ed)
    return (
      <EdNormal
        c={c}
        k="carrinho"
        p={p}
        qtd={it.qtd}
        precoCent={it.precoCent}
        exigePreco
        cancelar={fechar}
        salvar={(d, pr) => repo.editarCompra(it.id, { ...d, precoCent: d.precoCent ?? 0 }, pr).then(fechar)}
      />
    )
  const tag = horti ? p.variedade || 'Hortifrúti' : p.marca
  return (
    <div className={`item item-carrinho${horti ? ' item-hortifruti' : ''}`}>
      <div className="item-top">
        <div className="item-principal">
          <strong>{p.nome}</strong>
          {tag && <span className="marca">{tag}</span>}
          <span className="qtd">
            x{it.qtd}
            {horti && ` · ${pesoKg(it.pesoG ?? 0)}`}
          </span>
        </div>
        <div className="item-subtotal">{brl(subtotalCompra(it))}</div>
      </div>
      {horti && <div className="horti-meta">Preço confirmado: {brl(it.precoKgCent ?? 0)}/kg</div>}
      {!horti && it.variacaoCent != null && <div className="variacao">{textoVariacao(it.variacaoCent)}</div>}
      <Alvo c={c} p={p} cent={precoUnitCent(it)} />
      <div className="item-acoes">
        <button className="botao-editar" onClick={() => setEd(true)}>
          ✏️ Editar
        </button>
        <button className="botao-secundario" onClick={() => repo.compraParaLista(it.id)}>
          ↩️ Lista prévia
        </button>
        <button
          className="botao-remover"
          onClick={async () => {
            await repo.removerCompra(it.id)
            c.avisar(`${p.nome} removido`, () => repo.restaurarCompra(it.id))
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  )
}

export function ListaPrevia({ c }: { c: Ctx }) {
  const nav = useNavigate()
  const montarTexto = () => textoLista(c.dados.itensLista, c.prod, new Date())
  // Web Share quando existe (celular); senão abre o WhatsApp pelo link wa.me.
  async function compartilhar() {
    const t = montarTexto()
    if (!t) return
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Lista de compras', text: t })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    window.open(linkWhatsApp(t), '_blank', 'noopener')
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(montarTexto())
      c.avisar('Lista copiada')
    } catch {
      c.avisar('Não foi possível copiar')
    }
  }
  const linhas = c.dados.itensLista.flatMap((it) => {
    const p = c.prod.get(it.produtoId)
    return p ? [{ it, p }] : []
  })
  const total = linhas.reduce((s, l) => s + (estimativaItemLista(l.it, l.p, c.catalogo) ?? 0), 0)
  return (
    <section id="lista-previa" className="lista_previa-section menu-secao">
      <div className="secao-cabecalho">
        <h2>📝 Lista prévia</h2>
        <span id="resumoPrevia" className="resumo-lista">
          {linhas.length ? `${linhas.length} item(ns) na lista prévia` : 'Lista prévia vazia'}
        </span>
      </div>
      <div className="total-secundario">
        Estimativa total: {brl(total)} <span className="ajuda-inline">(não conta no orçamento)</span>{' '}
      </div>
      <button type="button" className="botao-carrinho" onClick={() => nav('/mercado')}>
        🛍️ Ir ao mercado
      </button>
      {linhas.length > 0 && (
        <div className="form-botoes">
          <button type="button" className="botao-secundario" onClick={compartilhar}>
            📤 Compartilhar lista
          </button>
          <button type="button" className="botao-secundario" onClick={copiar}>
            📋 Copiar texto
          </button>
        </div>
      )}
      <Despensa c={c} compacto />
      <Agrupada
        c={c}
        k="previa"
        linhas={linhas}
        vazio="Nenhum item na lista prévia. Adicione produtos para planejar a próxima feira."
        render={(l) => <ItemPrevia key={l.it.id} c={c} it={l.it} p={l.p} />}
      />
    </section>
  )
}

export function Carrinho({ c }: { c: Ctx }) {
  const linhas = c.dados.compras
    .filter((x) => x.feiraId === c.feira.id)
    .flatMap((it) => {
      const p = c.prod.get(it.produtoId)
      return p ? [{ it, p }] : []
    })
  return (
    <section id="carrinho" className="carrinho-section menu-secao">
      <div className="secao-cabecalho">
        <h2>🧾 Carrinho (feira em andamento)</h2>
        <span id="resumoCarrinho" className="resumo-lista">
          {linhas.length ? `${linhas.length} item(ns) no carrinho` : 'Carrinho vazio'}
        </span>
      </div>
      <Agrupada
        c={c}
        k="carrinho"
        linhas={linhas}
        vazio="Carrinho vazio. Adicione itens direto ou traga da lista prévia."
        render={(l) => <ItemCarrinho key={l.it.id} c={c} it={l.it} p={l.p} />}
      />
    </section>
  )
}
