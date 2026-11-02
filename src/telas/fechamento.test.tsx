import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../dados/db'
import { repo } from '../dados/repo'
import { botao, clicar, desmontar, esperar, montar, texto } from '../testes/ui'

beforeEach(async () => {
  localStorage.clear()
  await db.delete()
  await db.open()
  await repo.iniciar()
})
afterEach(desmontar)

const arroz = { nome: 'Arroz', marca: 'Tio João', categoria: 'Mercearia', qtd: 2, precoCent: 1000 }
// valor da linha (rótulo → valor) do resumo
const valor = (rotulo: string) =>
  [...document.querySelectorAll('div')]
    .find((d) => d.children.length === 2 && d.children[0].textContent?.startsWith(rotulo))
    ?.children[1].textContent?.replace(/\s/g, ' ')

describe('Fechamento da feira', () => {
  it('finaliza, mostra o resumo com a decomposição e permite desfazer', async () => {
    await repo.adicionarCompra(arroz)
    await repo.finalizarFeira()
    await repo.adicionarItemLista({ ...arroz, qtd: 3, precoCent: 1100 })
    await repo.listaParaCompra((await repo.carregar()).itensLista[0].id, { precoCent: 1100 })
    await repo.adicionarCompra({ nome: 'Chiclete', marca: null, categoria: null, qtd: 1, precoCent: 200 })
    await montar('/')
    await esperar(() => botao('Finalizar'))
    await clicar(botao('Finalizar'))
    await esperar(() => texto().includes('Resumo da feira'))
    expect(valor('Total')).toBe('R$ 35,00')
    expect(valor('Da lista')).toBe('R$ 33,00')
    expect(valor('Fora da lista')).toBe('R$ 2,00')
    expect(valor('Diferença no total')).toBe('+R$ 15,00')
    expect(valor('Quantidade')).toBe('+R$ 10,00')
    expect(valor('Preço')).toBe('+R$ 3,00')
    expect(valor('Itens novos')).toBe('+R$ 2,00')
    expect(valor('Itens que ficaram de fora')).toBe('R$ 0,00')
    expect(texto()).toContain('R$ 10,00 → R$ 11,00')
    await clicar(botao('Desfazer'))
    await esperar(() => texto().includes('Desfeito'))
    const d = await repo.carregar()
    const aberta = d.feiras.find((f) => !f.fechadaEm)!
    expect(d.feiras.filter((f) => f.fechadaEm)).toHaveLength(1)
    expect(d.compras.filter((c) => c.feiraId === aberta.id)).toHaveLength(2)
  })
  it('abre o resumo pelo histórico; a primeira feira não tem comparação', async () => {
    await repo.adicionarCompra(arroz)
    await repo.finalizarFeira()
    await montar('/historico')
    await esperar(() => botao('Ver/ocultar'))
    await clicar(botao('Ver/ocultar'))
    await esperar(() => botao('Ver resumo'))
    await clicar(botao('Ver resumo'))
    await esperar(() => texto().includes('Resumo da feira'))
    expect(valor('Total')).toBe('R$ 20,00')
    expect(texto()).toContain('primeira feira com registros')
  })
  it('feira vinda da v0 não tem registro de origem', async () => {
    const v0 = {
      itens: [],
      historicoFeiras: [
        {
          data: '15/10/2026 10:30:00',
          total: 20,
          orcamento: 0,
          itens: [{ nome: 'Arroz', preco: 10, quantidade: 2 }],
        },
      ],
    }
    await repo.importarArquivo(JSON.stringify(v0))
    const f = (await repo.carregar()).feiras.find((x) => x.fechadaEm)!
    await montar(`/feira/${f.id}`)
    await esperar(() => texto().includes('Resumo da feira'))
    expect(texto()).toContain('Sem registro de origem')
  })
})
