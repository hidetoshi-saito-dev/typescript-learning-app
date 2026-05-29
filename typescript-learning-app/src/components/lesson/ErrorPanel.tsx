import type { TypeScriptDiagnostic } from '@/types'

type Props = {
  diagnostics: TypeScriptDiagnostic[]
}

export function ErrorPanel({ diagnostics }: Props) {
  if (diagnostics.length === 0) return null

  const hasError = diagnostics.some((d) => d.severity === 'error')

  return (
    <div
      className={`border-t border-zinc-700/60 px-4 py-3 ${hasError ? 'bg-red-950/40' : 'bg-yellow-950/40'}`}
    >
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
    </div>
  )
}
