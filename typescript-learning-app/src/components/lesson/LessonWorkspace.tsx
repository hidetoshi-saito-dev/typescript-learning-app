'use client'

import Link from 'next/link'
import { useReducer, useCallback, useRef, useEffect } from 'react'
import type { Lesson, TypeScriptDiagnostic, JudgeResponse } from '@/types'
import { judge } from '@/lib/judge'
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
      return { ...state, diagnostics: action.diagnostics }
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

  const handleJudge = useCallback(async () => {
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

    dispatch({ type: 'JUDGE_START' })
    const result = await judge({ code, testCases: lesson.testCases })
    dispatch({ type: 'JUDGE_DONE', result })

    if (result.status === 'correct') {
      if (isGuest) {
        markComplete(lesson.id)
      } else {
        await markLessonComplete(lesson.id)
      }
    }
  }, [lesson, isGuest])

  const hasErrors = state.diagnostics.some((d) => d.severity === 'error')
  const isJudging = state.judgePhase.phase === 'judging'
  const isCorrect =
    state.judgePhase.phase === 'done' && state.judgePhase.result.status === 'correct'
  const lessonNumber = lesson.id.split('-')[0]

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ヘッダーバー */}
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-5">
        <Link
          href="/"
          className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← 一覧
        </Link>
        <span className="text-xs text-zinc-700">›</span>
        <span className="text-sm font-semibold text-zinc-100">{lesson.title}</span>
      </header>

      {/* 本体: 左右パネル */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左: 問題文 */}
        <aside className="min-w-0 flex-1 overflow-y-auto bg-white">
          <ProblemPane
            lessonNumber={lessonNumber}
            title={lesson.title}
            description={lesson.description}
            challenge={lesson.challenge}
            hint={lesson.hint}
          />
        </aside>

        {/* 仕切り線 */}
        <div className="w-px shrink-0 bg-zinc-700/50" />

        {/* 右: エディタ + 判定 */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#1e1e1e]">
          {/* Monaco エディタ（残りの高さを全部使う） */}
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              initialCode={lesson.initialCode}
              onChange={handleCodeChange}
              onDiagnosticsChange={handleDiagnosticsChange}
            />
          </div>

          {/* 型エラーパネル */}
          <ErrorPanel diagnostics={state.diagnostics} />

          {/* 答え合わせエリア */}
          <div className="border-t border-zinc-700/50 px-4 py-4">
            <JudgeButton onClick={handleJudge} disabled={hasErrors} loading={isJudging} />
            {state.judgePhase.phase === 'done' && <JudgeResult result={state.judgePhase.result} />}

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
        </div>
      </div>
    </div>
  )
}
