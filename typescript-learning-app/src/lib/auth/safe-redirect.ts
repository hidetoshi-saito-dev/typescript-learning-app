/**
 * オープンリダイレクト対策: 内部パスのみを許可する。
 *
 * 許可: "/", "/lessons/004-array-type" のようなアプリ内パス
 * 拒否: 絶対URL("https://evil.example")・プロトコル相対("//evil.example")・
 *       バックスラッシュ("/\\evil.example"。ブラウザが "//" に正規化するため)
 *
 * 検証を通らない値は既定の "/" にフォールバックする。
 */
export function safeRedirectPath(value: string | null | undefined): string {
  // 先頭が単一の "/" で、その次の文字が "/" でも "\" でもない場合のみ許可
  if (typeof value === 'string' && /^\/(?![/\\])/.test(value)) {
    return value
  }
  return '/'
}
