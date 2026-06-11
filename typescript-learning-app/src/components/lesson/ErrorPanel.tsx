import type { TypeScriptDiagnostic } from '@/types'

type Props = {
  diagnostics: TypeScriptDiagnostic[]
  /** TS ワーカーから初回診断が届いたか（届くまでは「準備中」を表示） */
  ready: boolean
}

// 常設のステータスパネル。
// 【なぜ常設＋固定高か】以前は診断がある時だけ挿入していたため、TS ワーカー起動
// （数秒後）に初めてパネルが現れてエディタ領域を押し縮め、大きなレイアウトシフト
// （CLS 0.33・Lighthouse 計測 2026-06-11）を起こしていた。先に領域を確保しておけば
// シフトは起きず、「準備中 → エラーなし/あり」の状態遷移も学習者に見える。
// aria-live でスクリーンリーダーにも診断の変化を通知する。
export function ErrorPanel({ diagnostics, ready }: Props) {
  const hasError = diagnostics.some((d) => d.severity === 'error')
  const hasAny = diagnostics.length > 0

  return (
    <div
      role="status"
      aria-live="polite"
      className={`h-28 shrink-0 overflow-y-auto border-t border-zinc-700/60 px-4 py-3 ${
        !hasAny ? 'bg-zinc-900/40' : hasError ? 'bg-red-950/40' : 'bg-yellow-950/40'
      }`}
    >
      {!ready ? (
        <p className="text-xs text-zinc-400">型チェックを準備中…</p>
      ) : !hasAny ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-green-400">
          ✓ 型エラーなし
        </p>
      ) : (
        <>
          <p
            className={`mb-2 text-xs font-semibold uppercase tracking-wider ${hasError ? 'text-red-400' : 'text-yellow-400'}`}
          >
            {hasError ? '型エラー' : '型の警告'}
          </p>
          <ul className="space-y-2">
            {diagnostics.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-xs ${
                    d.severity === 'warning'
                      ? 'bg-yellow-900/60 text-yellow-300'
                      : 'bg-red-900/60 text-red-300'
                  }`}
                >
                  TS{d.code}
                </span>
                <span className={d.severity === 'warning' ? 'text-yellow-300' : 'text-red-300'}>
                  {d.message}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
