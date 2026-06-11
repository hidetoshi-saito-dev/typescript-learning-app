import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { ProgressMerger } from '@/components/auth/ProgressMerger'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const SITE_TITLE = 'ts-tonari — 日本語で学ぶ TypeScript 学習アプリ'
const SITE_DESCRIPTION =
  'ブラウザで TypeScript コードを書き、その場で型チェックと自動採点。初級〜中級31レッスンを無料で学べる日本語のインタラクティブ学習アプリ。最初の3レッスンはログイン不要。'

export const metadata: Metadata = {
  // OGP 画像などの相対 URL をフル URL へ解決する基準（opengraph-image.png もこれを使う）
  metadataBase: new URL('https://ts-tonari.app'),
  title: {
    default: SITE_TITLE,
    template: '%s | ts-tonari',
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: '/',
    siteName: 'ts-tonari',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ProgressMerger />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
