import { expect, test } from '@playwright/test'

test('submit appears in the queue and a reviewer can approve it', async ({ page }) => {
  const title = `Playwright smoke ${Date.now()}`

  await page.goto('/')

  await page.getByRole('banner').getByRole('button', { name: 'Submit item' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Description').fill('A classroom-ready worksheet for the smoke test.')
  await page.getByRole('button', { name: 'Submit', exact: true }).click()

  const row = page.getByRole('row', { name: new RegExp(title) })
  await expect(row).toBeVisible()

  await page.getByRole('button', { name: 'Close item panel' }).click()

  await page.getByTestId('persona-select').click()
  await page.getByRole('menu').getByText('Bob Smith · reviewer').click()
  await expect(page.getByTestId('persona-select')).toContainText('Bob Smith')

  await row.click()
  await page.getByRole('button', { name: 'Approve' }).click()

  await expect(row.getByText('approved', { exact: true })).toBeVisible()
})
