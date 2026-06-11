import type { NextConfig } from 'next'

// 即時適用しても無リスクなセキュリティレスポンスヘッダ
// （クリックジャッキング / MIME スニッフィング / Referer 漏れ対策）
const baseSecurityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

// CSP（強制適用）。2026-06-07 に本番(Report-Only)で実機検証し、観測された違反を解消した上で強制適用へ移行。
// - 'unsafe-eval': Monaco の TS ワーカーと judge worker が new Function / transpile に必須
// - 'unsafe-inline'(script): Next.js のハイドレーション用 inline script に必須。
//   ※ 'unsafe-eval' が既に必要な構成のため、inline injection の追加防御は実質得られない判断（案A）。
//     base-uri / form-action / frame-ancestors / connect-src の制限は引き続き有効。
// - Monaco は self-host（public/monaco/vs・scripts/copy-monaco.cjs）に移行済みのため、
//   jsdelivr は全ディレクティブから削除済み（2026-06-11・②セルフホスト完了）。
//   Monaco 本体/CSS/ワーカーはすべて同一オリジン 'self'（worker は blob: 経由）から読み込む。
const contentSecurityPolicy = [
  "default-src 'self'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  "img-src 'self' data: https:",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          ...baseSecurityHeaders,
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        ],
      },
    ]
  },
}

export default nextConfig
