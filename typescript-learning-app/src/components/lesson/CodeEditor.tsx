'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { loader } from '@monaco-editor/react'
import type * as MonacoNS from 'monaco-editor'
import { toJpMessage } from '@/lib/diagnostics/jp-messages'
import type { TypeScriptDiagnostic } from '@/types'

// ssr: false は Client Component 内でのみ使用可（Next.js 16 仕様）
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

// Monaco 本体を self-host（public/monaco/vs）から読み込む。
// 既定の CDN(jsdelivr) 依存を解消し、CSP から jsdelivr を削除できる（サプライチェーン縮小）。
// アセットは scripts/copy-monaco.cjs が build/dev 前に node_modules からコピーする。
// loader はエディタ初期化前に設定する必要があるためモジュールスコープで一度だけ呼ぶ。
loader.config({ paths: { vs: '/monaco/vs' } })

// monaco-editor の診断レスポンス型（簡略版）
type RawDiagnostic = {
  code: number
  messageText: string | { messageText: string }
  category: number // 0=warning, 1=error
}

type Props = {
  initialCode: string
  onChange: (code: string) => void
  onDiagnosticsChange: (diagnostics: TypeScriptDiagnostic[]) => void
}

export function CodeEditor({ initialCode, onChange, onDiagnosticsChange }: Props) {
  const monacoRef = useRef<typeof MonacoNS | null>(null)
  const editorRef = useRef<MonacoNS.editor.IStandaloneCodeEditor | null>(null)
  const disposableRef = useRef<MonacoNS.IDisposable | null>(null)

  // 【FCP との競合対策】初回ペイント前に Monaco のロードを開始しない。
  // 本番 Lighthouse（2026-06-11）で、ハイドレーション直後に起動チェーン（合計 1MB 超）が
  // 走った回はスロットリング下で FCP 1.1s → 7s 台に悪化することを実測。preload の優先度
  // 調整（fetchPriority: low）では「実行開始のタイミング」自体は変えられないため、
  // double-rAF（≒最初のフレームの描画完了後）までエディタのマウントを遅延する。
  const [startEditor, setStartEditor] = useState(false)
  // 【CLS 対策】Monaco はマウント直後に内部要素（monaco-scrollable-element）の位置調整を
  // 行い、これが可視状態だと CLS に乗る（実測 0.23）。不可視要素のシフトは CLS に
  // 算入されないため、マウント完了の次フレームまで opacity-0 で覆い、その後表示する。
  const [editorSettled, setEditorSettled] = useState(false)

  useEffect(() => {
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setStartEditor(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [])

  // アンマウント時にマーカー監視を解除
  useEffect(() => {
    return () => {
      disposableRef.current?.dispose()
    }
  }, [])

  const fetchDiagnostics = useCallback(async () => {
    const monaco = monacoRef.current
    const editor = editorRef.current
    if (!monaco || !editor) return

    const model = editor.getModel()
    if (!model) return

    try {
      // Monaco 0.55+: getTypeScriptWorker はトップレベルの monaco.typescript に移動
      const getWorker = await monaco.typescript.getTypeScriptWorker()
      const client = await getWorker(model.uri)
      const uriStr = model.uri.toString()

      const [semantic, syntactic] = await Promise.all([
        client.getSemanticDiagnostics(uriStr) as Promise<RawDiagnostic[]>,
        client.getSyntacticDiagnostics(uriStr) as Promise<RawDiagnostic[]>,
      ])

      const mapped: TypeScriptDiagnostic[] = [...semantic, ...syntactic].map((d) => {
        const original =
          typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText
        return {
          code: d.code,
          message: toJpMessage(d.code, original),
          severity: d.category === 0 ? ('warning' as const) : ('error' as const),
        }
      })
      onDiagnosticsChange(mapped)
    } catch {
      // TSワーカー起動前の呼び出しは無視（次のマーカー更新で再実行）
    }
  }, [onDiagnosticsChange])

  const handleChange = useCallback(
    (value: string | undefined) => {
      onChange(value ?? '')
      // 診断は onDidChangeMarkers 経由で自動更新されるため setTimeout 不要
    },
    [onChange],
  )

  const handleMount = useCallback(
    (editor: MonacoNS.editor.IStandaloneCodeEditor, monaco: typeof MonacoNS) => {
      editorRef.current = editor
      monacoRef.current = monaco

      // 型を書くことが学習の核心。Monaco を strict 化して「型を書かない/誤った」コードを
      // 型エラーとして検出させ、LessonWorkspace の型ゲート（hasErrors）が判定をブロックする。
      // これは判定エンジン偽陽性修正(2026-06-09)の①層: ②正規表現の構造化と二重化する防御。
      // Monaco 0.55+: 型サービス設定はトップレベルの monaco.typescript に移動
      // （monaco.languages.typescript は deprecated）。
      // 【要ブラウザ実機検証】strict の効き方は Monaco TS ワーカー依存のため静的確認では確定不可。
      const tsDefaults = monaco.typescript.typescriptDefaults
      tsDefaults.setCompilerOptions({
        ...tsDefaults.getCompilerOptions(),
        strict: true,
        noImplicitAny: true,
      })

      // TSワーカーがモデルの診断を更新するたびに fetchDiagnostics を呼ぶ
      disposableRef.current = monaco.editor.onDidChangeMarkers((uris) => {
        const model = editor.getModel()
        if (!model) return
        if (uris.some((uri) => uri.toString() === model.uri.toString())) {
          fetchDiagnostics()
        }
      })

      // ワーカー初期化待ちのフォールバック（onDidChangeMarkers が発火する前の保険）
      setTimeout(fetchDiagnostics, 1500)

      // マウント直後の内部レイアウト調整が終わってから表示に切り替える。
      // rAF 1回だけでは ResizeObserver 経由の非同期レイアウトパスを取りこぼす
      // （本番計測で CLS 0.231）。さらに Lighthouse は 4x CPU スロットルで計測する
      // ため、150ms でも稀に抜けた。400ms + rAF まで広げて吸収する。
      // ※時間ベースの窓は原理的に確率対策。実ユーザーの CLS は Speed Insights
      //   （フィールドデータ）を正とする。
      window.setTimeout(() => {
        requestAnimationFrame(() => setEditorSettled(true))
      }, 400)
    },
    [fetchDiagnostics],
  )

  return (
    <div className="relative h-full">
      {/* エディタが安定するまで上に重ねる読み込み表示（下のシフトも視覚的に隠す） */}
      {!editorSettled && (
        <div
          role="status"
          className="absolute inset-0 z-10 flex items-center justify-center bg-[#1e1e1e] text-sm text-zinc-500"
        >
          エディタを読み込み中…
        </div>
      )}
      <div
        className={
          editorSettled ? 'h-full opacity-100 transition-opacity duration-150' : 'h-full opacity-0'
        }
      >
        {startEditor && (
          <MonacoEditor
            height="100%"
            defaultLanguage="typescript"
            defaultValue={initialCode}
            theme="vs-dark"
            onChange={handleChange}
            onMount={handleMount}
            options={{
              minimap: { enabled: false },
              fontSize: 16,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
          />
        )}
      </div>
    </div>
  )
}
