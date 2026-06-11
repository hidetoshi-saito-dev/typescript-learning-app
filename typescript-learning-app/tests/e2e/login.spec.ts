import { expect, test } from '@playwright/test'

test.describe('ログインページ（ゲスト）', () => {
  test('OAuth ボタンとホームへの導線が表示される', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'GitHub でログイン' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Google でログイン' })).toBeVisible()
    await expect(page.getByRole('link', { name: '← ホームに戻る' })).toBeVisible()
  })
})
