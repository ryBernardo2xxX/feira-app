import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../dados/db'
import { repo } from '../dados/repo'
import { botao, campo, clicar, desmontar, digitar, esperar, montar, texto } from '../testes/ui'

beforeEach(async () => {
  localStorage.clear()
  await db.delete()
  await db.open()
  await repo.iniciar()
})
afterEach(desmontar)

const arroz = { nome: 'Arroz', marca: 'Tio João', categoria: 'Mercearia', qtd: 2, precoCent: 2590 }

describe('Modo Mercado', () => {
  it('registra com 1 toque e desfaz', async () => {
    await repo.adicionarItemLista(arroz)
    await montar('/mercado')
    await esperar(() => botao('✓'))
    await clicar(botao('✓'))
    await esperar(() => texto().includes('Arroz no carrinho'))
    let d = await repo.carregar()
    expect(d.itensLista).toHaveLength(0)
    expect(d.compras[0]).toMatchObject({ qtd: 2, precoCent: 2590, foraDaLista: false })
    await clicar(botao('Desfazer'))
    await esperar(() => botao('✓'))
    d = await repo.carregar()
    expect(d.compras).toHaveLength(0)
    expect(d.itensLista).toHaveLength(1)
  })
  it('aceita outro preço digitado', async () => {
    await repo.adicionarItemLista(arroz)
    await montar('/mercado')
    await esperar(() => botao('Outro preço'))
    await clicar(botao('Outro preço'))
    await digitar(campo('Preço unitário'), '27.5')
    await clicar(botao('✓ Comprei'))
    await esperar(() => texto().includes('Arroz no carrinho'))
    expect((await repo.carregar()).compras[0].precoCent).toBe(2750)
  })
  it('tira da lista com desfazer', async () => {
    await repo.adicionarItemLista(arroz)
    await montar('/mercado')
    await esperar(() => document.querySelector('[aria-label="Tirar da lista"]'))
    await clicar(document.querySelector('[aria-label="Tirar da lista"]'))
    await esperar(() => texto().includes('Arroz saiu da lista'))
    expect((await repo.carregar()).itensLista).toHaveLength(0)
    await clicar(botao('Desfazer'))
    await esperar(() => botao('✓'))
    expect((await repo.carregar()).itensLista).toHaveLength(1)
  })
  it('adiciona item fora da lista e desfaz', async () => {
    await montar('/mercado')
    await esperar(() => campo('Produto'))
    await digitar(campo('Produto'), 'Chiclete')
    await digitar(campo('Preço'), '2.5')
    await clicar(botao('Adicionar ao carrinho'))
    await esperar(() => texto().includes('Chiclete no carrinho'))
    expect((await repo.carregar()).compras[0]).toMatchObject({ precoCent: 250, foraDaLista: true })
    await clicar(botao('Desfazer'))
    await esperar(() => !texto().includes('No carrinho'))
    expect((await repo.carregar()).compras).toHaveLength(0)
  })
  it('finaliza sem confirmação e desfaz enquanto a nova feira está vazia', async () => {
    await repo.adicionarCompra({ ...arroz, precoCent: 2590 })
    await montar('/mercado')
    await esperar(() => botao('Finalizar'))
    await clicar(botao('Finalizar'))
    await esperar(() => texto().includes('Feira finalizada'))
    let d = await repo.carregar()
    expect(d.feiras.filter((f) => f.fechadaEm)).toHaveLength(1)
    await clicar(botao('Desfazer'))
    await esperar(() => texto().includes('Desfeito'))
    d = await repo.carregar()
    const aberta = d.feiras.find((f) => !f.fechadaEm)!
    expect(d.feiras).toHaveLength(1)
    expect(d.compras.filter((c) => c.feiraId === aberta.id)).toHaveLength(1)
  })
})
