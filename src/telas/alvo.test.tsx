import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../dados/db'
import { repo } from '../dados/repo'
import { botao, campo, clicar, desmontar, digitar, escolher, esperar, montar, texto } from '../testes/ui'

beforeEach(async () => {
  localStorage.clear()
  await db.delete()
  await db.open()
  await repo.iniciar()
})
afterEach(desmontar)

const arroz = { nome: 'Arroz', marca: 'Tio João', categoria: 'Mercearia', qtd: 1, precoCent: 2300 }

describe('Preço-alvo e alternativas', () => {
  it('sugere a mediana, salva no produto e indica no carrinho', async () => {
    await repo.adicionarCompra({ ...arroz, precoCent: 2000 })
    await repo.finalizarFeira()
    await repo.adicionarCompra({ ...arroz, precoCent: 2200 })
    await repo.finalizarFeira()
    await repo.adicionarItemLista(arroz)
    await montar('/lista-previa')
    await esperar(() => botao('Editar'))
    await clicar(botao('Editar'))
    await esperar(() => botao('Sugerido'))
    expect(texto()).toContain('Sugerido: R$ 21,00 (mediana de 2 compras)')
    await clicar(botao('Sugerido'))
    await clicar(botao('Salvar'))
    await esperar(() => texto().includes('Alvo: R$ 21,00'))
    expect((await repo.carregar()).produtos[0].precoAlvoCent).toBe(2100)
    await clicar(botao('Ao carrinho'))
    await esperar(() => texto().includes('Item enviado'))
    await desmontar()
    await montar('/carrinho')
    await esperar(() => texto().includes('acima do alvo'))
    expect(texto()).toContain('R$ 2,00 acima do alvo (R$ 21,00)')
  })
  it('escolhe alternativas no editor e as mostra no Modo Mercado quando o preço passa do alvo', async () => {
    await repo.adicionarItemLista({ ...arroz, marca: 'Camil', precoCent: 1900 })
    const camil = (await repo.carregar()).produtos[0]
    await repo.listaParaCompra((await repo.carregar()).itensLista[0].id, { precoCent: 1900 })
    await repo.adicionarItemLista(arroz)
    await montar('/lista-previa')
    await esperar(() => botao('Editar'))
    await clicar(botao('Editar'))
    await esperar(() =>
      [...document.querySelectorAll('select option')].some((o) => o.textContent === 'Arroz Camil'),
    )
    await escolher(document.querySelector('select'), camil.id)
    await esperar(() => botao('Arroz Camil ✕'))
    await digitar(campo('Opcional'), '21')
    await clicar(botao('Salvar'))
    await esperar(() => texto().includes('aceita: Camil'))
    await desmontar()
    await montar('/mercado')
    await esperar(() => texto().includes('acima do alvo'))
    expect(texto()).toContain('R$ 2,00 acima do alvo (R$ 21,00)')
    expect(texto()).toContain('Aceita também: Camil R$ 19,00')
  })
})
