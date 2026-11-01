import { expect, test } from '@playwright/test'

test('adiciona item ao carrinho e vê o total no início', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await page.getByPlaceholder('Produto').fill('Arroz')
  await page.getByPlaceholder(/^Preço/).fill('25.90')
  await page.getByRole('button', { name: /Adicionar ao carrinho/ }).click()
  await page.getByRole('button', { name: 'Carrinho', exact: true }).click()
  await expect(page.getByText('Arroz')).toBeVisible()
  await page.getByRole('button', { name: 'Início', exact: true }).click()
  await expect(page.locator('#total')).toContainText('25,90')
})
