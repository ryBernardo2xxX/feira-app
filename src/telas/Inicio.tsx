import { useState, type ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { repo } from '../dados/repo'
import { sugestoes } from '../dominio/catalogo'
import { brl, lerCent } from '../dominio/dinheiro'
import { totalCompras } from '../dominio/subtotais'
import type { Ctx } from '../contexto'

function baixar(nome: string, texto: string) {
  const a = document.createElement('a')
  const u = URL.createObjectURL(new Blob([texto], { type: 'application/json' }))
  a.href = u
  a.download = nome
  a.click()
  URL.revokeObjectURL(u)
}

export default function Inicio({ c }: { c: Ctx }) {
  const { feira } = c
  const [orc, setOrc] = useState(feira.orcamentoCent ? String(feira.orcamentoCent / 100) : '')
  const pre = useLiveQuery(() => repo.backupPreMigracao())
  const carrinho = c.dados.compras.filter((x) => x.feiraId === feira.id)
  const total = totalCompras(carrinho)
  const p = feira.orcamentoCent > 0 ? (total / feira.orcamentoCent) * 100 : 0
  const presentes = new Set([...c.dados.itensLista, ...carrinho].map((i) => i.produtoId))
  const sug = sugestoes(c.catalogo, presentes)
  const ult = [...c.dados.compras, ...c.dados.itensLista, ...c.dados.feiras]
    .map((x) => x.updatedAt)
    .sort()
    .pop()

  async function salvarOrc() {
    await repo.definirOrcamento(orc.trim() === '' ? 0 : (lerCent(orc) ?? 0))
    c.avisar('Orçamento salvo')
  }
  async function finalizar() {
    if (!carrinho.length) return void alert('Adicione itens ao carrinho antes de finalizar a feira.')
    if (
      !confirm(
        'Finalizar esta feira? Os itens do carrinho vão para o histórico e o carrinho fica vazio. A lista prévia não é afetada.',
      )
    )
      return
    await repo.finalizarFeira()
    c.avisar('Feira finalizada')
  }
  async function importar(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      await repo.importarArquivo(await f.text())
      alert('Importado com sucesso!')
    } catch (err) {
      console.error(err)
      alert('Arquivo inválido')
    }
  }
  async function resetar() {
    if (!confirm('Isso vai apagar TUDO: carrinho, lista prévia, catálogo e histórico. Tem certeza?')) return
    await repo.resetar()
    setOrc('')
  }

  return (
    <section id="inicio" className="menu-secao">
      <h1>🛒 Feira Inteligente</h1>
      <p id="timestamp">Última atualização: {ult ? new Date(ult).toLocaleString('pt-BR') : '—'}</p>

      <section className="orcamento-section">
        <h2>💰 Orçamento</h2>
        <input
          type="number"
          id="orcamento"
          min="0"
          step="0.01"
          placeholder="Orçamento"
          value={orc}
          onChange={(e) => setOrc(e.target.value)}
        />
        <button type="button" onClick={salvarOrc}>
          Salvar orçamento
        </button>
        <div className="progress-bar" aria-label="Consumo do orçamento">
          <div
            id="progress"
            className={p < 70 ? 'baixo' : p < 100 ? 'medio' : 'alto'}
            style={{ width: `${Math.min(p, 100)}%` }}
          />
        </div>
        <div className="total-principal">
          Total no carrinho: <span id="total">{brl(total)}</span>
        </div>
        <p className="ajuda">Só o carrinho conta pro orçamento. A lista prévia é só planejamento.</p>
        <button type="button" className="botao-secundario" onClick={finalizar}>
          ✅ Finalizar feira
        </button>
      </section>

      <section className="ordenar_listas-section">
        <div className="secao-cabecalho">
          <h2>🔀 Ordenar listas</h2>
        </div>
        <select
          id="ordenacao"
          value={c.ordenacao}
          onChange={(e) => c.setOrdenacao(e.target.value as Ctx['ordenacao'])}
        >
          <option value="padrao">Como foi adicionado</option>
          <option value="alfabetica">Alfabética (A–Z)</option>
        </select>
        <p className="ajuda">
          Vale para a lista prévia e para o carrinho. Toque no título de uma categoria para recolher/expandir.
        </p>
      </section>

      <section className="sugestoes_rapidas-section">
        <h2>🛍️ Sugestões rápidas</h2>
        <p className="ajuda">
          Toque para mandar direto para a lista prévia (o preço vem do catálogo como estimativa).
        </p>
        <div id="sugestoesLista">
          {sug.length ? (
            sug.map((e) => (
              <button
                key={e.produtoId}
                type="button"
                className="chip"
                onClick={async () => {
                  await repo.adicionarSugestao(e.produtoId)
                  c.avisar('Adicionado à lista prévia')
                }}
              >
                + {e.nome}
                {e.marca ? ` (${e.marca})` : ''}
                <span className="chip-preco">{brl(e.ultimoPrecoCent)}</span>
              </button>
            ))
          ) : (
            <p className="vazio">Compre alguns itens 2+ vezes para ver sugestões automáticas aqui.</p>
          )}
        </div>
      </section>

      <section className="backup-section">
        <h2>💾 Backup</h2>
        <p className="ajuda">
          Exporta lista prévia, carrinho, catálogo e histórico juntos. Backups antigos (v1–v4) continuam
          funcionando.
        </p>
        <button
          type="button"
          onClick={async () => baixar('feira-backup.json', JSON.stringify(await repo.exportar(), null, 2))}
        >
          Exportar JSON
        </button>
        <input type="file" accept="application/json,.json" onChange={importar} />
        {pre && (
          <button
            type="button"
            className="botao-secundario"
            onClick={() => baixar('feira-backup-pre-migracao.json', pre)}
          >
            Baixar backup pré-migração (v0)
          </button>
        )}
      </section>

      <button type="button" className="botao-perigo" onClick={resetar}>
        🗑️ Apagar tudo (avançado)
      </button>
    </section>
  )
}
