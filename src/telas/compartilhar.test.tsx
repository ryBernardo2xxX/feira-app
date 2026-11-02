import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../dados/db'
import { repo } from '../dados/repo'
import { botao, clicar, desmontar, esperar, montar, texto } from '../testes/ui'

beforeEach(async () => {
  localStorage.clear()
  await db.delete()
  await db.open()
  await repo.iniciar()
  await repo.adicionarItemLista({
    nome: 'Arroz',
    marca: 'Tio João',
    categoria: 'Mercearia',
    qtd: 2,
    precoCent: null,
  })
})
afterEach(async () => {
  await desmontar()
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'share')
  Reflect.deleteProperty(navigator, 'clipboard')
})

describe('Compartilhar lista', () => {
  it('sem Web Share, abre o WhatsApp com o texto da lista', async () => {
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null)
    await montar('/lista-previa')
    await esperar(() => botao('Compartilhar'))
    await clicar(botao('Compartilhar'))
    expect(abrir).toHaveBeenCalledTimes(1)
    const url = abrir.mock.calls[0][0] as string
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(url.split('text=')[1])).toContain('• 2× Arroz Tio João')
  })
  it('com Web Share, usa o compartilhamento do sistema', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null)
    await montar('/lista-previa')
    await esperar(() => botao('Compartilhar'))
    await clicar(botao('Compartilhar'))
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('• 2× Arroz Tio João') }),
    )
    expect(abrir).not.toHaveBeenCalled()
  })
  it('copia o texto', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await montar('/lista-previa')
    await esperar(() => botao('Copiar texto'))
    await clicar(botao('Copiar texto'))
    await esperar(() => texto().includes('Lista copiada'))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('*Mercearia*'))
  })
  it('sem itens, não mostra os botões', async () => {
    const id = (await repo.carregar()).itensLista[0].id
    await repo.removerItemLista(id)
    await montar('/lista-previa')
    await esperar(() => texto().includes('Lista prévia vazia'))
    expect(botao('Compartilhar')).toBeUndefined()
  })
})
