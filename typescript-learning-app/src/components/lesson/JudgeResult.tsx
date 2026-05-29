import type { JudgeResponse } from '@/types'

type Props = {
  result: JudgeResponse
}

export function JudgeResult({ result }: Props) {
  if (result.status === 'correct') {
    return (
      <div className="mt-3 rounded-lg border border-green-700/50 bg-green-950/50 px-4 py-3 text-green-300">
        <p className="text-sm font-semibold">✓ 正解！テストケースをすべてパスしました</p>
      </div>
    )
  }

  if (result.status === 'type_error') {
    return (
      <div className="mt-3 rounded-lg border border-red-700/50 bg-red-950/50 px-4 py-3 text-red-300">
        <p className="text-sm font-semibold">
          型エラーがあります。修正してから再度試してください。
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-lg border border-orange-700/50 bg-orange-950/50 px-4 py-3 text-orange-300">
      <p className="mb-2 text-sm font-semibold">✗ 不正解</p>
      <ul className="space-y-1 text-xs text-orange-400">
        {result.failedTests.map((t, i) => (
          <li key={i}>· {t}</li>
        ))}
      </ul>
    </div>
  )
}
