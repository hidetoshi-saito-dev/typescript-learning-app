import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // tsconfig の paths（"@/*" → "./src/*"）と同期させる
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // ユニットテストはソースの隣に置く（E2E は tests/e2e/ で Playwright が担当）
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
