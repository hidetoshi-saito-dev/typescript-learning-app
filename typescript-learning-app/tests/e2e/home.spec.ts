import { expect, test } from '@playwright/test'
import { getCatalogList } from '../../src/lib/lessons/catalog'

test.describe('ホーム（ゲスト）', () => {
  test('レッスン一覧（カタログ全件）と進捗UIが表示される', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 1, name: 'TypeScript 学習アプリ' }),
    ).toBeVisible()

    // カタログの全レッスンがリンクとして並ぶ（件数はカタログ駆動で将来のレッスン追加に追随）
    const lessonLinks = page.locator('a[href^="/lessons/"]')
    await expect(lessonLinks).toHaveCount(getCatalogList().length)
    await expect(lessonLinks.first()).toHaveAttribute('href', '/lessons/001-type-annotation')

    // ゲストにはログイン導線が出る
    await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible()

    // 進捗カード（ゲストは 0 / 31 から）
    await expect(page.getByText('学習進捗')).toBeVisible()
  })
})
