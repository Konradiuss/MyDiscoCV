import { test, expect } from '@playwright/test'

test('visits the default resume route', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/en$/)
  await expect(page.locator('h1')).toHaveText('Babii Oleksandr')
  await expect(page.getByRole('heading', { name: 'Work Experience' })).toBeVisible()
  await expect(page.getByRole('link', { name: /RU/ })).toBeVisible()
})

test('switches resume language by route', async ({ page }) => {
  await page.goto('/ru')

  await expect(page.locator('h1')).toHaveText('Бабий Александр')
  await expect(page.getByRole('heading', { name: 'Опыт работы' })).toBeVisible()
})

test('opens the Ukrainian resume route', async ({ page }) => {
  await page.goto('/ua')

  await expect(page.locator('h1')).toHaveText('Бабій Олександр')
  await expect(page.getByRole('heading', { name: 'Досвід роботи' })).toBeVisible()
})
