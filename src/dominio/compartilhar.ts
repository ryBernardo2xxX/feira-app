import { alternativasDe } from './alvo'
import { agruparPorCategoria } from './catalogo'
import { brl } from './dinheiro'
import { pesoKg } from './hortifruti'
import type { ItemLista, Produto } from './tipos'

const nomeCompleto = (p: Produto) =>
  p.unidadeBase === 'kg'
    ? `${p.nome}${p.variedade ? ` (${p.variedade})` : ''}`
    : `${p.nome}${p.marca ? ` ${p.marca}` : ''}`

// Texto da lista para WhatsApp (negrito com *…*), agrupado por categoria na ordem do mercado.
// Traz o preço-alvo ("até R$ X") e as alternativas aceitas, para quem faz a compra decidir no corredor.
export function textoLista(itens: ItemLista[], prod: Map<string, Produto>, data: Date): string {
  const linhas = itens.flatMap((it) => {
    const p = prod.get(it.produtoId)
    return p ? [{ it, p }] : []
  })
  if (!linhas.length) return ''
  const corpo = agruparPorCategoria(linhas).map(([cat, ls]) => {
    const itensTxt = [...ls]
      .sort((a, b) => a.p.nome.localeCompare(b.p.nome, 'pt-BR'))
      .map(({ it, p }) => {
        const peso = it.horti?.pesoMedioG ? ` ~${pesoKg(it.horti.pesoMedioG * it.qtd).replace('.', ',')}` : ''
        const alvo = p.precoAlvoCent
          ? ` — até ${brl(p.precoAlvoCent)}${p.unidadeBase === 'kg' ? '/kg' : ''}`
          : ''
        const alts = alternativasDe(p, prod, []).map((a) => a.rotulo)
        return `• ${it.qtd}× ${nomeCompleto(p)}${peso}${alvo}${alts.length ? ` (pode ser: ${alts.join(', ')})` : ''}`
      })
    return `*${cat}*\n${itensTxt.join('\n')}`
  })
  return `🛒 Lista de compras — ${data.toLocaleDateString('pt-BR')}\n\n${corpo.join('\n\n')}`.replace(
    /\u00a0/g,
    ' ',
  )
}

export const linkWhatsApp = (texto: string) => `https://wa.me/?text=${encodeURIComponent(texto)}`
