'use client'

import { useRef, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type * as MonacoNS from 'monaco-editor'
import { toJpMessage } from '@/lib/diagnostics/jp-messages'
import type { TypeScriptDiagnostic } from '@/types'

// ssr: false は Client Component 内でのみ使用可（Next.js 16 仕様）
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

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
    },
    [fetchDiagnostics],
  )

  return (
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
  )
}
