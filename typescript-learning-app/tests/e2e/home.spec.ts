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

    // レベル別セクションヘッダー
    await expect(page.getByRole('heading', { level: 3, name: '初級' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: '中級' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: '上級' })).toBeVisible()

    // 学習のきろくパネル（未完了でもバッジは「次の目標」として見える）
    await expect(page.getByText('学習のきろく')).toBeVisible()
    await expect(page.getByText('はじめの一歩')).toBeVisible()
  })

  test('学習のきろく: 完了と活動ログからバッジ・ストリーク・復習導線が出る', async ({ page }) => {
    // ゲストの localStorage を「今日 001 を完了した」状態にシードする
    const pad = (n: number) => String(n).padStart(2, '0')
    const now = new Date()
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    await page.addInitScript(
      ([d]) => {
        localStorage.setItem('ts-learning-guest-progress', JSON.stringify(['001-type-annotation']))
        localStorage.setItem(
          'ts-learning-guest-activity-v1',
          JSON.stringify([{ id: '001-type-annotation', d }]),
        )
      },
      [today],
    )
    await page.goto('/')

    // ストリーク（今日完了 → 1 日）
    await expect(page.getByText('連続学習 1 日')).toBeVisible()
    // 復習導線に完了済みレッスンが出る
    await expect(page.getByText('復習のすすめ')).toBeVisible()
    await expect(page.getByRole('link', { name: '型注釈の基本', exact: true })).toBeVisible()
    // 進捗カードにも反映（1 / 全件）
    await expect(page.getByText('学習進捗')).toBeVisible()
  })
})
