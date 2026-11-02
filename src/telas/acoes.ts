import type { NavigateFunction } from 'react-router-dom'
import { repo } from '../dados/repo'
import type { Ctx } from '../contexto'

// Finaliza sem confirm(): o "Desfazer" reabre a feira, desde que a nova ainda esteja vazia.
export async function finalizar(c: Ctx, nav: NavigateFunction, voltar: string) {
  if (!c.dados.compras.some((x) => x.feiraId === c.feira.id))
    return void alert('Adicione itens ao carrinho antes de finalizar a feira.')
  const r = await repo.finalizarFeira()
  nav(`/feira/${r.fechadaId}`)
  c.avisar('Feira finalizada', async () => {
    const ok = await repo.reabrirFeira(r)
    if (ok) nav(voltar)
    else c.avisar('Não foi possível desfazer: a nova feira já tem itens.')
    return ok
  })
}
