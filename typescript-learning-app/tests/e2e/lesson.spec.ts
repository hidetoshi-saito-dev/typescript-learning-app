import { expect, test } from '@playwright/test'

const LESSON_URL = '/lessons/001-type-annotation'
// verify-lessons.cjs の SOLUTIONS['001-type-annotation'] と同一の模範解答
const SOLUTION = 'function greet(name: string) {\n  return "こんにちは、" + name\n}'

test.describe('レッスン001（ゲスト）', () => {
  test('Monaco self-host 起動 → strict 診断 → 型ゲート → 判定 correct まで通る', async ({
    page,
  }) => {
    await page.goto(LESSON_URL)

    // 問題文（Server Component 部分）
    await expect(page.getByRole('heading', { name: '型注釈の基本' })).toBeVisible()

    // 既存レッスンには実践クラスのチケットカードが出ない（optional フィールド未定義の描画不変保証）
    await expect(page.locator('section[aria-label="チケット"]')).toHaveCount(0)

    // Monaco が self-host（/monaco/vs）から起動する
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 60_000 })

    // 初期コードは implicit any → strict 診断が ErrorPanel に表示される（①層）
    await expect(page.getByText('型エラー', { exact: true })).toBeVisible({ timeout: 60_000 })

    // 型ゲート: エラーがある間は判定ボタンが無効
    await expect(page.getByRole('button', { name: '型エラーを修正してください' })).toBeDisabled()

    // 模範解答へ置換（キーボード入力は Monaco の自動補完・自動閉じで不安定なため
    // グローバル monaco 経由で setValue する。onChange → 診断更新まで実経路を通る）
    await page.evaluate((code) => {
      const monaco = (window as unknown as { monaco: typeof import('monaco-editor') }).monaco
      monaco.editor.getModels()[0].setValue(code)
    }, SOLUTION)

    // 診断が消えて判定ボタンが有効化される
    const judgeButton = page.getByRole('button', { name: '答え合わせ' })
    await expect(judgeButton).toBeEnabled({ timeout: 60_000 })

    // judge worker（transpile → AsyncFunction 実行 → サニタイズ済み②③チェック）が correct を返す
    await judgeButton.click()
    await expect(page.getByText('正解！テストケースをすべてパスしました')).toBeVisible({
      timeout: 30_000,
    })
  })

  test('ゲストはレッスン004以降に入れずログインへリダイレクトされる', async ({ page }) => {
    await page.goto('/lessons/004-array-type')
    await expect(page).toHaveURL(/\/login\?redirect=%2Flessons%2F004-array-type/)
    await expect(page.getByRole('button', { name: 'GitHub でログイン' })).toBeVisible()
  })

  test('ゲストは実践レッスン（040+）にも入れずログインへリダイレクトされる', async ({ page }) => {
    // 既存の「番号 >= 4 はログイン必須」ゲートが実践クラスを自動カバーすることの固定
    await page.goto('/lessons/040-order-status-model')
    await expect(page).toHaveURL(/\/login\?redirect=%2Flessons%2F040-order-status-model/)
  })

  test('存在しないレッスンは 404 を返す', async ({ page }) => {
    // middleware は存在チェックより先に「番号 >= 4 はログインへ」をゲートするため、
    // ゲストで 404 を観測できるのは番号 < 4 の存在しない ID のみ（curl 307 ≠ 実在の意思決定ログ参照）
    const response = await page.goto('/lessons/000-not-exist')
    expect(response?.status()).toBe(404)
  })
})
