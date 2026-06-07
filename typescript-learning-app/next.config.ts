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
// - jsdelivr: Monaco 本体(js)・CSS を CDN から読み込むため script/style/connect に許可。
//   ② Monaco セルフホスト化が完了したら jsdelivr を全ディレクティブから削除する。
const contentSecurityPolicy = [
  "default-src 'self'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net",
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
