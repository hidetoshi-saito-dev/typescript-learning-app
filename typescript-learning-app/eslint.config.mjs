import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // 検証用 Node スクリプト（ブラウザ判定ロジックの回帰テスト。アプリのビルド対象外）
    'scripts/**',
    // self-host 用に node_modules からコピーした Monaco アセット（生成物・minified・lint対象外）
    'public/monaco/**',
  ]),
])

export default eslintConfig
