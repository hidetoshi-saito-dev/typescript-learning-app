import type { JudgeRequest, JudgeResponse, WorkerResult } from '@/types'

export function judge(request: JudgeRequest): Promise<JudgeResponse> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('../../workers/judge.worker.ts', import.meta.url))

    const timeout = setTimeout(() => {
      worker.terminate()
      resolve({
        status: 'incorrect',
        failedTests: ['タイムアウト: 無限ループが発生している可能性があります'],
      })
    }, 5000)

    worker.onmessage = (event: MessageEvent<WorkerResult>) => {
      clearTimeout(timeout)
      worker.terminate()
      resolve(event.data)
    }

    worker.onerror = (err) => {
      clearTimeout(timeout)
      worker.terminate()
      resolve({ status: 'incorrect', failedTests: [`Worker エラー: ${err.message}`] })
    }

    worker.postMessage(request)
  })
}
