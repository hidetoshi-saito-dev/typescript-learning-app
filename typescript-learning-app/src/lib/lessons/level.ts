// レッスンのレベル（初級/中級/上級）をレッスン番号から導出する。
// データファイル側に level フィールドを持たせない理由:
//  - 区切りはカリキュラム設計（001-015 初級 / 016-031 中級 / 032+ 上級）の事実であり、
//    1箇所で導出すれば39ファイルの重複と将来の更新漏れを防げる
//  - このモジュールはレッスンデータを import しない純関数のみ＝Client Component から
//    安全に import できる（catalog.ts を client に import すると全レッスン本文が
//    バンドルに乗ってしまう）

export type LessonLevel = 'beginner' | 'intermediate' | 'advanced'

export const LEVEL_LABELS: Record<LessonLevel, string> = {
  beginner: '初級',
  intermediate: '中級',
  advanced: '上級',
}

export const LEVEL_ORDER: LessonLevel[] = ['beginner', 'intermediate', 'advanced']

export function getLessonLevel(lessonId: string): LessonLevel {
  const n = parseInt(lessonId, 10)
  if (n <= 15) return 'beginner'
  if (n <= 31) return 'intermediate'
  return 'advanced'
}
