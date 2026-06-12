'use client'

import Link from 'next/link'
import { useReducer, useCallback, useRef, useEffect } from 'react'
import type { Lesson, TypeScriptDiagnostic, JudgeResponse } from '@/types'
import { judge } from '@/lib/judge'
import { getLessonLevel } from '@/lib/lessons/level'
import { getScenarioInfo } from '@/lib/lessons/scenario'
import { markComplete } from '@/lib/progress/guest'
import { markLessonComplete } from '@/lib/progress/actions'
import { ProblemPane } from './ProblemPane'
import { CodeEditor } from './CodeEditor'
import { ErrorPanel } from './ErrorPanel'
import { JudgeButton } from './JudgeButton'
import { JudgeResult } from './JudgeResult'

type JudgePhase =
  | { phase: 'idle' }
  | { phase: 'judging' }
  | { phase: 'done'; result: JudgeResponse }

type WorkspaceState = {
  code: string
  diagnostics: TypeScriptDiagnostic[]
  /** TS ワーカーから初回の診断が届いたか（届くまでパネルは「準備中」表示） */
  diagnosticsReady: boolean
  judgePhase: JudgePhase
}

type Action =
  | { type: 'CODE_CHANGE'; code: string }
  | { type: 'DIAGNOSTICS_UPDATE'; diagnostics: TypeScriptDiagnostic[] }
  | { type: 'JUDGE_START' }
  | { type: 'JUDGE_DONE'; result: JudgeResponse }

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'CODE_CHANGE':
      return { ...state, code: action.code, judgePhase: { phase: 'idle' } }
    case 'DIAGNOSTICS_UPDATE':
      return { ...state, diagnostics: action.diagnostics, diagnosticsReady: true }
    case 'JUDGE_START':
      return { ...state, judgePhase: { phase: 'judging' } }
    case 'JUDGE_DONE':
      return { ...state, judgePhase: { phase: 'done', result: action.result } }
  }
}

type LessonRef = { id: string; title: string }

type Props = {
  lesson: Lesson
  prevLesson?: LessonRef
  nextLesson?: LessonRef
  isGuest?: boolean
}

export function LessonWorkspace({ lesson, prevLesson, nextLesson, isGuest = true }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    code: lesson.initialCode,
    diagnostics: [],
    diagnosticsReady: false,
    judgePhase: { phase: 'idle' },
  })

  // state の最新値を ref で保持することで handleJudge の依存配列を最小化する
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  const handleCodeChange = useCallback((code: string) => {
    dispatch({ type: 'CODE_CHANGE', code })
  }, [])

  const handleDiagnosticsChange = useCallback((diagnostics: TypeScriptDiagnostic[]) => {
    dispatch({ type: 'DIAGNOSTICS_UPDATE', diagnostics })
  }, [])

  // 同期的な実行中フラグ。judgePhase（React state）は非同期更新のため、
  // 二重クリックの極小窓で worker が多重生成されるのを防ぐ。
  const inFlightRef = useRef(false)

  const handleJudge = useCallback(async () => {
    if (inFlightRef.current) return
    const { judgePhase, diagnostics, code } = stateRef.current
    if (judgePhase.phase === 'judging') return

    const hasErrors = diagnostics.some((d) => d.severity === 'error')
    if (hasErrors) {
      dispatch({
        type: 'JUDGE_DONE',
        result: { status: 'type_error', diagnostics },
      })
      return
    }

    inFlightRef.current = true
    dispatch({ type: 'JUDGE_START' })
    try {
      const result = await judge({ code, testCases: lesson.testCases })
      dispatch({ type: 'JUDGE_DONE', result })

      if (result.status === 'correct') {
        if (isGuest) {
          markComplete(lesson.id)
        } else {
          await markLessonComplete(lesson.id)
        }
      }
    } finally {
      inFlightRef.current = false
    }
  }, [lesson, isGuest])

  const hasErrors = state.diagnostics.some((d) => d.severity === 'error')
  const isJudging = state.judgePhase.phase === 'judging'
  const isCorrect =
    state.judgePhase.phase === 'done' && state.judgePhase.result.status === 'correct'
  const lessonNumber = lesson.id.split('-')[0]
  const isPractical = getLessonLevel(lesson.id) === 'practical'

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ヘッダーバー */}
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-5">
        <Link
          href="/"
          className="text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
        >
          ← 一覧
        </Link>
        <span aria-hidden="true" className="text-xs text-zinc-600">
          ›
        </span>
        <span className="text-sm font-semibold text-zinc-100">{lesson.title}</span>
        <a
          href={`https://github.com/hidetoshi-saito-dev/typescript-learning-app/issues/new?template=02-lesson-feedback.yml&lesson=${lesson.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-zinc-400 transition-colors hover:text-zinc-200"
        >
          問題を報告
        </a>
      </header>

      {/* 本体: 左右パネル */}
      <main className="flex flex-1 overflow-hidden">
        {/* 左: 問題文 */}
        <aside aria-label="問題文" className="min-w-0 flex-1 overflow-y-auto bg-white">
          <ProblemPane
            lessonNumber={lessonNumber}
            title={lesson.title}
            description={lesson.description}
            challenge={lesson.challenge}
            hint={lesson.hint}
            scenario={lesson.scenario}
            requirements={lesson.requirements}
            // 受け入れ条件は testCases.description の事前表示（判定基準と定義上一致＝乖離バグが構造的に起きない）
            acceptanceCriteria={
              isPractical ? lesson.testCases.map((t) => t.description) : undefined
            }
            scenarioInfo={getScenarioInfo(lesson.id)}
          />
        </aside>

        {/* 仕切り線 */}
        <div className="w-px shrink-0 bg-zinc-700/50" />

        {/* 右: エディタ + 判定 */}
        <section
          aria-label="コードエディタと判定"
          className="flex min-w-0 flex-1 flex-col bg-[#1e1e1e]"
        >
          {/* Monaco エディタ（残りの高さを全部使う） */}
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              initialCode={lesson.initialCode}
              onChange={handleCodeChange}
              onDiagnosticsChange={handleDiagnosticsChange}
            />
          </div>

          {/* 型エラーパネル（常設: 挿入時のレイアウトシフトを防ぐ） */}
          <ErrorPanel diagnostics={state.diagnostics} ready={state.diagnosticsReady} />

          {/* 答え合わせエリア */}
          <div className="border-t border-zinc-700/50 px-4 py-4">
            <JudgeButton onClick={handleJudge} disabled={hasErrors} loading={isJudging} />
            <div role="status" aria-live="polite">
              {state.judgePhase.phase === 'done' && (
                <JudgeResult result={state.judgePhase.result} />
              )}
            </div>

            {/* prev / next ナビゲーション */}
            <div className="mt-4 flex items-center justify-between">
              {prevLesson ? (
                <Link
                  href={`/lessons/${prevLesson.id}`}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                >
                  ← {prevLesson.title}
                </Link>
              ) : (
                <div />
              )}
              {nextLesson ? (
                <Link
                  href={`/lessons/${nextLesson.id}`}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
                    isCorrect
                      ? 'bg-green-600 font-medium text-white hover:bg-green-500'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {nextLesson.title} →
                </Link>
              ) : (
                <div />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
