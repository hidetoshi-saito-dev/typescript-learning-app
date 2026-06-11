import { defineConfig, devices } from '@playwright/test'

// E2E は本番ビルド（next start）に対して実行する。
//
// 【Supabase 非依存で安定させる設計】
// ゲスト動線（Cookie なし）のみを対象にする。セッションが無ければ supabase-js は
// ネットワークへ出ない（getUser はローカルで null を返す）ため、ダミーURLで
// 外部依存ゼロのまま「Monaco self-host 起動 → strict 診断 → 型ゲート → 判定」という
// アプリの背骨を検証できる。認証込みの動線はブラウザ実機検証で担う。
const PORT = 3210
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 30_000 }, // Monaco / TS ワーカーの起動待ちがあるため長め
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // 事前に `npm run build` が必要（CI ではビルドゲート通過後に実行される）
    command: `npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      // process.env 既存値は .env.local より優先されるため、ローカルでも決定的になる
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'ci-dummy-anon-key',
    },
  },
})
