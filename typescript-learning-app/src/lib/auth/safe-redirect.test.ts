// safe-redirect.test.ts — オープンリダイレクト対策の境界固定テスト
// なぜ重要か: login?redirect= はユーザー制御値。検証が緩いと
// 「正規ドメインのログインを装って外部サイトへ飛ばす」フィッシングに使われる。

import { describe, expect, it } from 'vitest'
import { safeRedirectPath } from './safe-redirect'

describe('safeRedirectPath: 内部パスは許可', () => {
  it.each(['/', '/lessons/004-array-type', '/login', '/a/b?c=d#e'])('%s を許可する', (path) => {
    expect(safeRedirectPath(path)).toBe(path)
  })
})

describe('safeRedirectPath: 外部誘導は "/" にフォールバック', () => {
  it.each([
    ['絶対URL', 'https://evil.example'],
    ['プロトコル相対', '//evil.example'],
    ['バックスラッシュ（ブラウザが // に正規化）', '/\\evil.example'],
    ['スキーム付き', 'javascript:alert(1)'],
    ['空文字列', ''],
    ['先頭がスラッシュでない', 'lessons/001'],
  ])('%s: %s', (_label, value) => {
    expect(safeRedirectPath(value)).toBe('/')
  })

  it('null / undefined も "/" にフォールバック', () => {
    expect(safeRedirectPath(null)).toBe('/')
    expect(safeRedirectPath(undefined)).toBe('/')
  })
})
