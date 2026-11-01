import { useMemo, useRef, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { repo } from './dados/repo'
import { reconstruirCatalogo } from './dominio/catalogo'
import type { Dados } from './dominio/tipos'
import type { Ctx } from './contexto'
import Inicio from './telas/Inicio'
import Adicionar from './telas/Adicionar'
import { ListaPrevia, Carrinho } from './telas/Listas'
import Hortifruti from './telas/Hortifruti'
import Historico from './telas/Historico'

const ABAS: [string, string][] = [
  ['/', 'Início'],
  ['/adicionar', 'Adicionar'],
  ['/lista-previa', 'Lista Prévia'],
  ['/hortifruti', 'Hortifrúti'],
  ['/carrinho', 'Carrinho'],
  ['/historico', 'Histórico'],
]
const lerColapsadas = (): Ctx['colapsadas'] => {
  try {
    return JSON.parse(localStorage.getItem('categoriasColapsadas') ?? '') ?? { previa: {}, carrinho: {} }
  } catch {
    return { previa: {}, carrinho: {} }
  }
}
const unicos = (a: string[]) => [...new Set(a)].sort((x, y) => x.localeCompare(y, 'pt-BR'))

export default function App() {
  const dados = useLiveQuery(() => repo.carregar())
  return dados ? <Painel dados={dados} /> : null
}

function Painel({ dados }: { dados: Dados }) {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [toast, setToast] = useState({ msg: '', on: false })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [ordenacao, setOrd] = useState<Ctx['ordenacao']>(
    localStorage.getItem('ordenacao') === 'alfabetica' ? 'alfabetica' : 'padrao',
  )
  const [colapsadas, setCol] = useState(lerColapsadas)
  const prod = useMemo(() => new Map(dados.produtos.map((p) => [p.id, p])), [dados])
  const catalogo = useMemo(() => reconstruirCatalogo(dados.compras, dados.produtos), [dados])
  const feira = dados.feiras.find((f) => !f.fechadaEm)
  if (!feira) return null

  const c: Ctx = {
    dados,
    prod,
    feira,
    catalogo,
    ordenacao,
    colapsadas,
    avisar: (msg) => {
      clearTimeout(timer.current)
      setToast({ msg, on: true })
      timer.current = setTimeout(() => setToast((x) => ({ ...x, on: false })), 1800)
    },
    setOrdenacao: (v) => {
      localStorage.setItem('ordenacao', v)
      setOrd(v)
    },
    toggleCat: (k, cat) => {
      const n = { ...colapsadas, [k]: { ...colapsadas[k], [cat]: !colapsadas[k]?.[cat] } }
      localStorage.setItem('categoriasColapsadas', JSON.stringify(n))
      setCol(n)
    },
  }
  const entradas = Object.values(catalogo)

  return (
    <>
      <nav className="especifications" aria-label="Menu principal">
        <ul>
          {ABAS.map(([p, r]) => (
            <li key={p}>
              <button
                type="button"
                className={pathname === p ? 'active' : undefined}
                aria-current={pathname === p ? 'page' : undefined}
                onClick={() => {
                  nav(p)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                {r}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="container">
        <Routes>
          <Route path="/adicionar" element={<Adicionar c={c} />} />
          <Route path="/lista-previa" element={<ListaPrevia c={c} />} />
          <Route path="/hortifruti" element={<Hortifruti c={c} />} />
          <Route path="/carrinho" element={<Carrinho c={c} />} />
          <Route path="/historico" element={<Historico c={c} />} />
          <Route path="*" element={<Inicio c={c} />} />
        </Routes>
      </div>
      <datalist id="sugestoes-produtos">
        {unicos(entradas.map((e) => e.nome)).map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="sugestoes-marcas">
        {unicos(entradas.map((e) => e.marca).filter((m): m is string => !!m)).map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <div id="toast" role="status" className={toast.on ? 'show' : undefined}>
        {toast.msg}
      </div>
    </>
  )
}
