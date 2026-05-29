'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

type Props = {
  lessonNumber: string
  title: string
  description: string
  challenge: string
  hint?: string
}

// **bold** と `code` をインライン要素として解釈する
function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="rounded bg-zinc-100 px-1.5 py-px font-mono text-xs text-zinc-800">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-zinc-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function splitAtPeriod(text: string): string[] {
  return text
    .split('。')
    .filter(Boolean)
    .map((s) => s + '。')
}

export function ProblemPane({ lessonNumber, title, description, challenge, hint }: Props) {
  const [hintOpen, setHintOpen] = useState(false)

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* レッスンバッジ + タイトル */}
      <div>
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 ring-1 ring-inset ring-blue-600/20">
          Lesson {lessonNumber}
        </span>
        <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-zinc-900">
          {title}
        </h1>
      </div>

      {/* 学びセクション */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-5 py-4">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="text-sm">📘</span>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            TypeScript の基本
          </span>
        </div>
        <div className="space-y-1.5">
          {splitAtPeriod(description).map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-zinc-600">
              {renderInlineMarkdown(line)}
            </p>
          ))}
        </div>
      </div>

      {/* 課題セクション */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="text-sm">📋</span>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">課題</span>
        </div>
        <div className="space-y-2">
          {splitAtPeriod(challenge).map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-zinc-700">
              {renderInlineMarkdown(line)}
            </p>
          ))}
        </div>
      </div>

      {/* ヒント */}
      {hint && (
        <div>
          <button
            type="button"
            onClick={() => setHintOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-amber-600 transition-colors hover:text-amber-700"
          >
            <span>💡</span>
            {hintOpen ? 'ヒントを隠す' : 'ヒントを見る'}
            <span
              className={`text-xs transition-transform duration-200 ${hintOpen ? 'rotate-180' : ''}`}
            >
              ▾
            </span>
          </button>

          {hintOpen && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              {hint.split('\n\n').map((part, i) =>
                /^(function|const|let|var|type|interface|class|enum)\b/.test(part) ? (
                  <pre
                    key={i}
                    className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-amber-100 p-3 font-mono text-xs text-amber-900"
                  >
                    {part}
                  </pre>
                ) : (
                  <p key={i} className="text-sm text-amber-800">
                    {renderInlineMarkdown(part)}
                  </p>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
