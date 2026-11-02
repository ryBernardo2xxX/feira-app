import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

let raiz: Root | null = null
export async function montar(rota: string) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  raiz = createRoot(el)
  await act(async () =>
    raiz!.render(
      <MemoryRouter initialEntries={[rota]}>
        <App />
      </MemoryRouter>,
    ),
  )
}
export async function desmontar() {
  if (raiz) await act(async () => raiz!.unmount())
  raiz = null
  document.body.innerHTML = ''
}
export const texto = () => (document.body.textContent ?? '').replace(/\s/g, ' ')
export const botao = (t: string | RegExp) =>
  [...document.querySelectorAll('button')].find((b) =>
    typeof t === 'string' ? b.textContent!.includes(t) : t.test(b.textContent!),
  ) as HTMLButtonElement | undefined
export const campo = (placeholder: string) =>
  document.querySelector<HTMLInputElement>(`input[placeholder^="${placeholder}"]`)
export async function esperar(cond: () => unknown, ms = 4000) {
  const ini = Date.now()
  while (!cond()) {
    if (Date.now() - ini > ms) throw new Error(`tempo esgotado esperando: ${cond}\n${texto().slice(0, 600)}`)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 25))
    })
  }
}
export function clicar(el?: Element | null) {
  if (!el) throw new Error('elemento não encontrado')
  return act(async () => (el as HTMLElement).click())
}
export function digitar(el: Element | null, v: string) {
  if (!el) throw new Error('campo não encontrado')
  return act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
export function escolher(el: Element | null, v: string) {
  if (!el) throw new Error('select não encontrado')
  return act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(el, v)
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
