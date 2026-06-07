import type { NextConfig } from 'next'

// 即時適用しても無リスクなセキュリティレスポンスヘッダ
// （クリックジャッキング / MIME スニッフィング / Referer 漏れ対策）
const baseSecurityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

// CSP は Monaco エディタと judge worker が eval / new Function / blob worker を
// 必須とするため、まず Report-Only で実機検証する。
// 違反レポートが無いことを確認したらキーを 'Content-Security-Policy' に変えて強制適用する。
const contentSecurityPolicy = [
  "default-src 'self'",
  "frame-ancestors 'none'",
  // Monaco とその TS ワーカーは現状 jsdelivr から読み込む（セルフホスト化したら jsdelivr を削除可）
  "script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
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
          { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy },
        ],
      },
    ]
  },
}

export default nextConfig
