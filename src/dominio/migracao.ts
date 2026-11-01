import { emCent } from './dinheiro'
import { chaveHorti, chaveProduto, limpar } from './catalogo'
import {
  VERSAO_DADOS,
  type Base,
  type Compra,
  type Dados,
  type Feira,
  type HortiRef,
  type ItemLista,
  type Produto,
} from './tipos'

export type CtxMig = { agora: string; deviceId: string; novoId: () => string }
type R = Record<string, unknown>
const arr = (v: unknown): R[] =>
  Array.isArray(v) ? v.filter((x): x is R => !!x && typeof x === 'object') : []
const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const pos = (v: unknown) => {
  const n = num(v)
  return n > 0 ? n : null
}
const txt = (v: unknown) => limpar(v) || null

export function parseDataBR(s: unknown): string | null {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(String(s ?? ''))
  if (!m) return null
  const d = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0))
  return isNaN(d.getTime()) ? null : d.toISOString()
}

// Converte backups/localStorage v1–v4 (formato da v0) para o modelo sync-ready (v5).
export function migrarBackup(raw: unknown, ctx: CtxMig): Dados {
  const d = (raw && typeof raw === 'object' ? raw : {}) as R
  const { agora, deviceId, novoId } = ctx
  const base = (criado = agora): Base => ({
    id: novoId(),
    createdAt: criado,
    updatedAt: criado,
    deletedAt: null,
    deviceId,
  })

  const produtos = new Map<string, Produto>()
  const produto = (i: R): Produto => {
    const horti = i.tipo === 'hortifruti'
    const nome = limpar(i.nome)
    const marca = horti ? null : txt(i.marca)
    const variedade = horti ? txt(i.variedade) : null
    const chave = horti ? chaveHorti(nome, variedade) : chaveProduto(nome, marca)
    const cat = txt(i.categoria)
    let p = produtos.get(chave)
    if (!p) {
      p = {
        ...base(),
        nome,
        marca,
        variedade,
        chave,
        categoria: cat ?? (horti ? 'Hortifruti' : null),
        unidadeBase: horti ? 'kg' : 'un',
        hortifrutiId: null,
      }
      produtos.set(chave, p)
    } else if (cat) p.categoria = cat
    if (horti && !p.hortifrutiId) p.hortifrutiId = txt(i.hortifrutiId)
    return p
  }
  const compra = (i: R, feiraId: string, criado: string): Compra => {
    const p = produto(i)
    const horti = p.unidadeBase === 'kg'
    const kg = horti ? pos(i.precoKg) : null
    return {
      ...base(criado),
      feiraId,
      produtoId: p.id,
      qtd: pos(i.quantidade) ?? 1,
      precoCent: horti ? 0 : emCent(num(i.preco)),
      pesoG: horti ? pos(i.pesoTotalGramas) : null,
      precoKgCent: kg ? emCent(kg) : null,
      variacaoCent: null,
      foraDaLista: false,
    }
  }

  const feiras: Feira[] = []
  const compras: Compra[] = []
  // histórico: a v0 guardava a feira mais recente primeiro; aqui entra do mais antigo ao mais novo
  arr(d.historicoFeiras)
    .reverse()
    .forEach((f) => {
      const fechada = parseDataBR(f.data) ?? agora
      const fe: Feira = {
        ...base(fechada),
        data: fechada,
        mercado: null,
        orcamentoCent: emCent(num(f.orcamento)),
        fechadaEm: fechada,
      }
      feiras.push(fe)
      arr(f.itens)
        .filter((i) => limpar(i.nome))
        .forEach((i) => compras.push(compra(i, fe.id, fechada)))
    })

  const aberta: Feira = {
    ...base(),
    data: agora,
    mercado: null,
    orcamentoCent: emCent(num(d.orcamento)),
    fechadaEm: null,
  }
  feiras.push(aberta)
  const itens = arr(d.itens)
  const v3 = Array.isArray(d.listaPrevia)
  const noCarrinho = v3 ? itens : itens.filter((i) => i.status !== 'pendente')
  const naPrevia: R[] = v3
    ? arr(d.listaPrevia)
    : itens
        .filter((i) => i.status === 'pendente')
        .map((i) => ({ ...i, precoEstimado: num(i.preco) > 0 ? i.preco : null }))
  noCarrinho.filter((i) => limpar(i.nome)).forEach((i) => compras.push(compra(i, aberta.id, agora)))

  const itensLista: ItemLista[] = naPrevia
    .filter((i) => limpar(i.nome))
    .map((i) => {
      const p = produto(i)
      const horti = p.unidadeBase === 'kg'
      const pe = pos(i.precoEstimado ?? i.preco)
      return {
        ...base(),
        produtoId: p.id,
        qtd: pos(i.quantidade) ?? 1,
        precoEstimadoCent: horti || !pe ? null : emCent(pe),
        horti: horti
          ? {
              pesoMedioG: pos(i.pesoMedioGramas),
              precoKgRefCent: pos(i.precoKgReferencia) ? emCent(num(i.precoKgReferencia)) : null,
              fonte: txt(i.fontePreco),
            }
          : null,
      }
    })

  const refs = d.hortifrutiReferencias
  const hortiRefs: HortiRef[] =
    refs && typeof refs === 'object' && !Array.isArray(refs)
      ? Object.entries(refs as R).flatMap(([id, r]) => {
          const x = (r ?? {}) as R
          const kg = pos(x.precoKg)
          return kg
            ? [
                {
                  ...base(parseDataBR(x.atualizadoEm) ?? agora),
                  id,
                  precoKgCent: emCent(kg),
                  fonte: txt(x.fonte),
                },
              ]
            : []
        })
      : []

  return { produtos: [...produtos.values()], itensLista, feiras, compras, hortiRefs }
}

// Lê um backup de qualquer versão: v1–v4 migram; v5 é aceito como está; versão futura é recusada.
export function lerBackup(raw: unknown, ctx: CtxMig): Dados {
  const d = (raw && typeof raw === 'object' ? raw : {}) as R
  const v = num(d.versaoDados)
  if (v > VERSAO_DADOS) throw new Error('Backup de uma versão mais nova que este app.')
  if (v < VERSAO_DADOS) return migrarBackup(raw, ctx)
  const x = <T>(k: string) => arr(d[k]) as unknown as T[]
  const dados: Dados = {
    produtos: x('produtos'),
    itensLista: x('itensLista'),
    feiras: x('feiras'),
    compras: x('compras'),
    hortiRefs: x('hortiRefs'),
  }
  if (!dados.feiras.some((f) => !f.fechadaEm && !f.deletedAt)) {
    dados.feiras.push({
      id: ctx.novoId(),
      createdAt: ctx.agora,
      updatedAt: ctx.agora,
      deletedAt: null,
      deviceId: ctx.deviceId,
      data: ctx.agora,
      mercado: null,
      orcamentoCent: 0,
      fechadaEm: null,
    })
  }
  return dados
}
